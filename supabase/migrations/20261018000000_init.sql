-- Typhoon database schema.
-- Apply with `supabase db reset` locally or `supabase db push` on a linked project.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null
    check (username ~ '^[A-Za-z0-9_.-]{3,24}$'),
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 280),
  tests_count integer not null default 0,
  best_wpm numeric(6, 2) not null default 0,
  avg_wpm numeric(6, 2) not null default 0,
  best_accuracy numeric(5, 2) not null default 0,
  avg_accuracy numeric(5, 2) not null default 0,
  created_at timestamptz not null default now()
);

create unique index profiles_username_lower_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

create policy "Profiles are public"
  on public.profiles for select
  using (true);

create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Stats columns are maintained by triggers only.
revoke update on public.profiles from anon, authenticated;
grant update (username, avatar_url, bio) on public.profiles to authenticated;

-- Create a profile row for every new auth user, using the requested username
-- when it is valid and free, otherwise a generated one.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := new.raw_user_meta_data ->> 'username';
  candidate text;
begin
  if requested is null or requested !~ '^[A-Za-z0-9_.-]{3,24}$' then
    requested := 'typist_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  candidate := requested;
  if exists (select 1 from public.profiles p where lower(p.username) = lower(candidate)) then
    candidate := left(requested, 19) || '_' || substr(replace(new.id::text, '-', ''), 1, 4);
  end if;

  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Typing results
-- ---------------------------------------------------------------------------

create table public.game_results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  wpm numeric(6, 2) not null check (wpm between 0 and 350),
  raw_wpm numeric(6, 2) not null check (raw_wpm between 0 and 400),
  accuracy numeric(5, 2) not null check (accuracy between 0 and 100),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  word_count integer not null check (word_count in (15, 30, 50)),
  content_types text[] not null default '{words}',
  duration_ms integer not null check (duration_ms between 500 and 3600000),
  created_at timestamptz not null default now()
);

create index game_results_user_idx on public.game_results (user_id, created_at desc);
create index game_results_leaderboard_idx on public.game_results (difficulty, wpm desc);

alter table public.game_results enable row level security;

create policy "Results are public"
  on public.game_results for select
  using (true);

create policy "Users insert their own results"
  on public.game_results for insert
  to authenticated
  with check (user_id = auth.uid());

create function public.refresh_profile_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
  set tests_count = s.tests_count,
      best_wpm = s.best_wpm,
      avg_wpm = s.avg_wpm,
      best_accuracy = s.best_accuracy,
      avg_accuracy = s.avg_accuracy
  from (
    select count(*)::integer as tests_count,
           coalesce(max(wpm), 0) as best_wpm,
           coalesce(round(avg(wpm), 2), 0) as avg_wpm,
           coalesce(max(accuracy), 0) as best_accuracy,
           coalesce(round(avg(accuracy), 2), 0) as avg_accuracy
    from public.game_results
    where user_id = new.user_id
  ) s
  where p.id = new.user_id;
  return new;
end;
$$;

create trigger on_game_result_inserted
  after insert on public.game_results
  for each row execute function public.refresh_profile_stats();

-- Best result per user, optionally filtered by difficulty.
create function public.leaderboard(p_difficulty text default null, p_limit integer default 50)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  avatar_url text,
  wpm numeric,
  raw_wpm numeric,
  accuracy numeric,
  difficulty text,
  tests bigint
)
language sql
stable
set search_path = ''
as $$
  with best as (
    select distinct on (r.user_id)
           r.user_id, r.wpm, r.raw_wpm, r.accuracy, r.difficulty
    from public.game_results r
    where p_difficulty is null or r.difficulty = p_difficulty
    order by r.user_id, r.wpm desc, r.accuracy desc, r.created_at asc
  ),
  counts as (
    select r.user_id, count(*) as tests
    from public.game_results r
    where p_difficulty is null or r.difficulty = p_difficulty
    group by r.user_id
  )
  select rank() over (order by b.wpm desc, b.accuracy desc) as rank,
         b.user_id, p.username, p.avatar_url,
         b.wpm, b.raw_wpm, b.accuracy, b.difficulty, c.tests
  from best b
  join public.profiles p on p.id = b.user_id
  join counts c on c.user_id = b.user_id
  order by rank, p.username
  limit least(greatest(p_limit, 1), 200);
$$;

-- ---------------------------------------------------------------------------
-- Friendships
-- ---------------------------------------------------------------------------

create table public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

create unique index friendships_pair_idx on public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "Participants see their friendships"
  on public.friendships for select
  to authenticated
  using (auth.uid() in (requester_id, addressee_id));

create policy "Accepted friendships are public"
  on public.friendships for select
  using (status = 'accepted');

create policy "Users send friend requests"
  on public.friendships for insert
  to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

create policy "Addressee accepts a request"
  on public.friendships for update
  to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');

create policy "Participants remove a friendship"
  on public.friendships for delete
  to authenticated
  using (auth.uid() in (requester_id, addressee_id));

revoke update on public.friendships from anon, authenticated;
grant update (status) on public.friendships to authenticated;

create function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(a, b)
      and greatest(f.requester_id, f.addressee_id) = greatest(a, b)
  );
$$;

-- ---------------------------------------------------------------------------
-- Posts, likes, comments
-- ---------------------------------------------------------------------------

create table public.posts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content text not null default '' check (char_length(content) <= 1000),
  image_url text,
  hashtags text[] not null default '{}',
  result_id bigint references public.game_results (id) on delete set null,
  created_at timestamptz not null default now(),
  check (char_length(content) > 0 or image_url is not null or result_id is not null)
);

create index posts_created_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

create policy "Posts are public"
  on public.posts for select
  using (true);

create policy "Users create their own posts"
  on public.posts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      result_id is null
      or exists (select 1 from public.game_results r where r.id = result_id and r.user_id = auth.uid())
    )
  );

create policy "Users delete their own posts"
  on public.posts for delete
  to authenticated
  using (user_id = auth.uid());

create table public.likes (
  post_id bigint not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.likes enable row level security;

create policy "Likes are public"
  on public.likes for select
  using (true);

create policy "Users like as themselves"
  on public.likes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users remove their own likes"
  on public.likes for delete
  to authenticated
  using (user_id = auth.uid());

create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index comments_post_idx on public.comments (post_id, created_at);

alter table public.comments enable row level security;

create policy "Comments are public"
  on public.comments for select
  using (true);

create policy "Users comment as themselves"
  on public.comments for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users delete their own comments"
  on public.comments for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Direct messages
-- ---------------------------------------------------------------------------

create table public.chats (
  id bigint generated always as identity primary key,
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

alter table public.chats enable row level security;

create policy "Participants see their chats"
  on public.chats for select
  to authenticated
  using (auth.uid() in (user_a, user_b));

create table public.messages (
  id bigint generated always as identity primary key,
  chat_id bigint not null references public.chats (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_chat_idx on public.messages (chat_id, created_at);

alter table public.messages enable row level security;

create function public.is_chat_member(p_chat bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chats c
    where c.id = p_chat and auth.uid() in (c.user_a, c.user_b)
  );
$$;

create policy "Members read messages"
  on public.messages for select
  to authenticated
  using (public.is_chat_member(chat_id));

create policy "Members send messages"
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid() and public.is_chat_member(chat_id));

create policy "Recipients mark messages read"
  on public.messages for update
  to authenticated
  using (public.is_chat_member(chat_id) and sender_id <> auth.uid())
  with check (public.is_chat_member(chat_id) and sender_id <> auth.uid());

revoke update on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;

create function public.touch_chat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chats set last_message_at = new.created_at where id = new.chat_id;
  return new;
end;
$$;

create trigger on_message_inserted
  after insert on public.messages
  for each row execute function public.touch_chat();

-- Returns the chat between the caller and another user, creating it if needed.
-- Only friends can open a conversation.
create function public.get_or_create_chat(p_other uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  chat_id bigint;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;
  if p_other = me then
    raise exception 'You cannot message yourself';
  end if;
  if not public.are_friends(me, p_other) then
    raise exception 'You can only message friends';
  end if;

  insert into public.chats (user_a, user_b)
  values (least(me, p_other), greatest(me, p_other))
  on conflict (user_a, user_b) do nothing;

  select c.id into chat_id
  from public.chats c
  where c.user_a = least(me, p_other) and c.user_b = greatest(me, p_other);

  return chat_id;
end;
$$;

-- Chat list for the caller with the other participant, last message and unread count.
create function public.chat_list()
returns table (
  chat_id bigint,
  other_id uuid,
  other_username text,
  other_avatar_url text,
  last_message text,
  last_sender_id uuid,
  last_message_at timestamptz,
  unread_count bigint
)
language sql
stable
set search_path = ''
as $$
  select c.id,
         p.id, p.username, p.avatar_url,
         lm.content, lm.sender_id, c.last_message_at,
         (select count(*) from public.messages m
           where m.chat_id = c.id and m.sender_id <> auth.uid() and m.read_at is null)
  from public.chats c
  join public.profiles p
    on p.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  left join lateral (
    select m.content, m.sender_id from public.messages m
    where m.chat_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where auth.uid() in (c.user_a, c.user_b)
  order by c.last_message_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Notifications (written by triggers only)
-- ---------------------------------------------------------------------------

create table public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  type text not null check (type in ('friend_request', 'friend_accepted', 'post_liked', 'post_commented')),
  post_id bigint references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users read their notifications"
  on public.notifications for select
  to authenticated
  using (recipient_id = auth.uid());

create policy "Users mark their notifications read"
  on public.notifications for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "Users clear their notifications"
  on public.notifications for delete
  to authenticated
  using (recipient_id = auth.uid());

revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create function public.notify_friendship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (recipient_id, actor_id, type)
    values (new.addressee_id, new.requester_id, 'friend_request');
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    new.responded_at := now();
    insert into public.notifications (recipient_id, actor_id, type)
    values (new.requester_id, new.addressee_id, 'friend_accepted');
    delete from public.notifications
    where recipient_id = new.addressee_id and actor_id = new.requester_id and type = 'friend_request';
  end if;
  return new;
end;
$$;

create trigger on_friendship_inserted
  after insert on public.friendships
  for each row execute function public.notify_friendship();

create trigger on_friendship_updated
  before update on public.friendships
  for each row execute function public.notify_friendship();

create function public.notify_post_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  select p.user_id into owner from public.posts p where p.id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (owner, new.user_id, case when tg_table_name = 'likes' then 'post_liked' else 'post_commented' end, new.post_id);
  end if;
  return new;
end;
$$;

create trigger on_like_inserted
  after insert on public.likes
  for each row execute function public.notify_post_activity();

create trigger on_comment_inserted
  after insert on public.comments
  for each row execute function public.notify_post_activity();

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table
  public.game_results,
  public.friendships,
  public.posts,
  public.likes,
  public.comments,
  public.messages,
  public.notifications;

-- ---------------------------------------------------------------------------
-- Storage: avatars and post images, each user writes inside their own folder
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('post-images', 'post-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "App images are public"
  on storage.objects for select
  using (bucket_id in ('avatars', 'post-images'));

create policy "Users upload into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('avatars', 'post-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users replace their own files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('avatars', 'post-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete their own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('avatars', 'post-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
