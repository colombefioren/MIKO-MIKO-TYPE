-- Copies Miko-Miko data from the `legacy` schema (see extract.py) into the Typhoon schema.
-- Run with: psql -v base_url=<SUPABASE_URL> -f transform.sql
-- Image files are uploaded afterwards from the list in legacy.uploads.

\set ON_ERROR_STOP on

begin;

select set_config('legacy.base_url', :'base_url', true);

do $$
begin
  if exists (
    select 1 from public.game_results r join legacy.profiles p on p.id::uuid = r.user_id
  ) then
    raise exception 'Legacy data is already imported into this database.';
  end if;
end;
$$;

-- Historical friendships, likes and comments must not notify anyone again.
alter table public.friendships disable trigger on_friendship_inserted;
alter table public.likes disable trigger on_like_inserted;
alter table public.comments disable trigger on_comment_inserted;

-- ---------------------------------------------------------------- Helpers

-- Copies the columns two tables share, casting text values to the target types.
create function legacy.copy_matching(source text, target text)
returns void
language plpgsql
as $$
declare
  columns text;
  selects text;
begin
  select string_agg(format('%I', t.column_name), ', ' order by t.ordinal_position),
         string_agg(format('%I::%s', t.column_name, t.udt_schema || '.' || t.udt_name), ', ' order by t.ordinal_position)
  into columns, selects
  from information_schema.columns t
  join information_schema.columns s
    on s.table_schema = 'legacy' and s.table_name = source and s.column_name = t.column_name
  where t.table_schema = split_part(target, '.', 1)
    and t.table_name = split_part(target, '.', 2)
    and t.is_generated = 'NEVER';

  execute format('insert into %s (%s) select %s from legacy.%I on conflict do nothing', target, columns, selects, source);
end;
$$;

create function legacy.clean_username(raw text, user_id uuid)
returns text
language plpgsql
as $$
declare
  base text := left(trim(both '_' from regexp_replace(coalesce(raw, ''), '[^A-Za-z0-9_.-]+', '_', 'g')), 24);
  candidate text;
begin
  if char_length(base) < 3 then
    base := 'typist_' || substr(replace(user_id::text, '-', ''), 1, 8);
  end if;
  candidate := base;
  if exists (select 1 from public.profiles p where lower(p.username) = lower(candidate) and p.id <> user_id) then
    candidate := left(base, 19) || '_' || substr(replace(user_id::text, '-', ''), 1, 4);
  end if;
  return candidate;
end;
$$;

-- Files to re-upload: old bucket and path, new bucket and owner-scoped path.
create table legacy.uploads (
  old_bucket text not null,
  old_path text not null,
  new_bucket text not null,
  new_path text not null,
  primary key (new_bucket, new_path)
);

-- Returns the new public URL for an old storage URL and queues the file for upload.
create function legacy.queue_upload(old_url text, owner uuid, new_bucket text)
returns text
language plpgsql
as $$
declare
  parts text[] := regexp_match(old_url, '/storage/v1/object/public/([^/]+)/([^?]+)');
  extension text;
  new_path text;
begin
  if parts is null then
    return null;
  end if;
  extension := lower(coalesce(substring(parts[2] from '\.([A-Za-z0-9]+)$'), 'png'));
  extension := case extension when 'jpeg' then 'jpg' else extension end;
  if extension not in ('png', 'jpg', 'webp', 'gif') then
    return null;
  end if;
  new_path := owner::text || '/' || md5(parts[1] || '/' || parts[2]) || '.' || extension;
  insert into legacy.uploads values (parts[1], parts[2], new_bucket, new_path) on conflict do nothing;
  return current_setting('legacy.base_url') || '/storage/v1/object/public/' || new_bucket || '/' || new_path;
end;
$$;

-- ---------------------------------------------------------------- Accounts

-- Password hashes are kept, so everyone logs in with their old password.
-- The signup trigger creates a placeholder profile for each user, completed below.
select legacy.copy_matching('auth_users', 'auth.users');
select legacy.copy_matching('auth_identities', 'auth.identities');

do $$
declare
  p record;
begin
  for p in
    select l.* from legacy.profiles l
    join public.profiles pr on pr.id = l.id::uuid
    order by l.created_at
  loop
    update public.profiles
    set username = legacy.clean_username(p.username, p.id::uuid),
        avatar_url = legacy.queue_upload(p.avatar_url, p.id::uuid, 'avatars'),
        bio = left(coalesce(p.bio, ''), 280),
        created_at = coalesce(p.created_at::timestamptz, created_at)
    where id = p.id::uuid;
  end loop;
end;
$$;

-- ---------------------------------------------------------------- Results

-- Each insert refreshes the owner's stats through the results trigger.
-- The old app stored no raw speed, word count or duration: raw equals net speed, and the
-- duration is estimated for a 30-word test. "normal" was the old default difficulty.
insert into public.game_results (user_id, wpm, raw_wpm, accuracy, difficulty, word_count, content_types, duration_ms, created_at)
select r.user_id::uuid,
       r.wpm::numeric,
       r.wpm::numeric,
       greatest(0, least(100, r.accuracy::numeric)),
       case when r.mode in ('easy', 'medium', 'hard') then r.mode else 'easy' end,
       30,
       '{words}',
       greatest(500, least(3600000, round(30 * 60000 / r.wpm::numeric)))::integer,
       coalesce(r.created_at::timestamptz, now())
from legacy.game_results r
join public.profiles p on p.id = r.user_id::uuid
where r.wpm::numeric > 0 and r.wpm::numeric <= 350
order by r.created_at;

-- ---------------------------------------------------------------- Friends

insert into public.friendships (requester_id, addressee_id, status, created_at, responded_at)
select distinct on (least(a, b), greatest(a, b))
       a, b, status, created, case when status = 'accepted' then created end
from (
  select f.user1_id::uuid as a, f.user2_id::uuid as b, f.status, coalesce(f.created_at::timestamptz, now()) as created
  from legacy.friends f
  join public.profiles pa on pa.id = f.user1_id::uuid
  join public.profiles pb on pb.id = f.user2_id::uuid
  where f.user1_id <> f.user2_id and f.status in ('pending', 'accepted')
) s
order by least(a, b), greatest(a, b), (status = 'accepted') desc, created;

-- Only requests that are still open are worth a notification.
insert into public.notifications (recipient_id, actor_id, type, created_at)
select f.addressee_id, f.requester_id, 'friend_request', f.created_at
from public.friendships f
join legacy.profiles l on l.id::uuid = f.requester_id
where f.status = 'pending';

-- ---------------------------------------------------------------- Posts, likes, comments

create table legacy.post_ids (old_id uuid primary key, new_id bigint not null);

do $$
declare
  p record;
  body text;
  image text;
  new_id bigint;
begin
  for p in
    select l.* from legacy.posts l
    join public.profiles pr on pr.id = l.user_id::uuid
    order by l.created_at
  loop
    body := left(trim(concat_ws(E'\n\n', nullif(trim(p.title), ''), nullif(trim(p.content), ''))), 1000);
    image := legacy.queue_upload(p.image_url, p.user_id::uuid, 'post-images');
    continue when body = '' and image is null;

    insert into public.posts (user_id, content, image_url, hashtags, created_at)
    values (
      p.user_id::uuid,
      body,
      image,
      coalesce((select array_agg(lower(tag)) from unnest(p.hashtags::text[]) tag where tag <> ''), '{}'),
      coalesce(p.created_at::timestamptz, now())
    )
    returning id into new_id;
    insert into legacy.post_ids values (p.id::uuid, new_id);
  end loop;
end;
$$;

insert into public.likes (post_id, user_id, created_at)
select distinct on (m.new_id, l.user_id) m.new_id, l.user_id::uuid, coalesce(l.created_at::timestamptz, now())
from legacy.likes l
join legacy.post_ids m on m.old_id = l.post_id::uuid
join public.profiles p on p.id = l.user_id::uuid
order by m.new_id, l.user_id;

insert into public.comments (post_id, user_id, content, created_at)
select m.new_id, c.user_id::uuid, left(trim(c.content), 500), coalesce(c.created_at::timestamptz, now())
from legacy.comments c
join legacy.post_ids m on m.old_id = c.post_id::uuid
join public.profiles p on p.id = c.user_id::uuid
where trim(coalesce(c.content, '')) <> ''
order by c.created_at;

-- ---------------------------------------------------------------- Chats and messages

insert into public.chats (user_a, user_b, created_at, last_message_at)
select least(a, b), greatest(a, b), min(created), max(coalesce(last_message, created))
from (
  select c.user1_id::uuid as a, c.user2_id::uuid as b,
         coalesce(c.created_at::timestamptz, now()) as created,
         (select max(m.created_at::timestamptz) from legacy.messages m where m.chat_id = c.id) as last_message
  from legacy.chats c
  join public.profiles pa on pa.id = c.user1_id::uuid
  join public.profiles pb on pb.id = c.user2_id::uuid
  where c.user1_id <> c.user2_id
) s
group by least(a, b), greatest(a, b)
on conflict (user_a, user_b) do nothing;

insert into public.messages (chat_id, sender_id, content, created_at, read_at)
select nc.id, m.sender_id::uuid, left(m.content, 2000),
       coalesce(m.created_at::timestamptz, now()),
       case when m.read::boolean then coalesce(m.created_at::timestamptz, now()) end
from legacy.messages m
join legacy.chats c on c.id = m.chat_id
join public.chats nc
  on nc.user_a = least(c.user1_id::uuid, c.user2_id::uuid)
 and nc.user_b = greatest(c.user1_id::uuid, c.user2_id::uuid)
where trim(coalesce(m.content, '')) <> ''
  and m.sender_id::uuid in (nc.user_a, nc.user_b)
order by m.created_at;

alter table public.friendships enable trigger on_friendship_inserted;
alter table public.likes enable trigger on_like_inserted;
alter table public.comments enable trigger on_comment_inserted;

commit;

select 'profiles' as imported, count(*) from public.profiles
union all select 'game_results', count(*) from public.game_results
union all select 'friendships', count(*) from public.friendships
union all select 'posts', count(*) from public.posts
union all select 'likes', count(*) from public.likes
union all select 'comments', count(*) from public.comments
union all select 'chats', count(*) from public.chats
union all select 'messages', count(*) from public.messages
union all select 'files to upload', count(*) from legacy.uploads;
