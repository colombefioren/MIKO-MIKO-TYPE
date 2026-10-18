-- Messages require an active friendship, not just an existing chat row:
-- unfriending someone stops new messages in either direction.
create function public.is_friend_chat_member(p_chat bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chats c
    where c.id = p_chat
      and auth.uid() in (c.user_a, c.user_b)
      and public.are_friends(c.user_a, c.user_b)
  );
$$;

drop policy "Members send messages" on public.messages;

create policy "Friends send messages"
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid() and public.is_friend_chat_member(chat_id));

-- Raw speed counts every typed character, so it can never be below net speed.
alter table public.game_results
  add constraint game_results_raw_at_least_net check (raw_wpm >= wpm);

-- Images must come from the owner's folder in this project's storage, so a profile or post
-- cannot embed a third-party tracking URL. The app also checks the origin before rendering.
alter table public.profiles
  add constraint profiles_avatar_in_storage check (
    avatar_url is null
    or avatar_url ~ ('^https?://[^/]+/storage/v1/object/public/avatars/' || id::text || '/[A-Za-z0-9-]+\.(png|jpg|webp|gif)$')
  );

alter table public.posts
  add constraint posts_image_in_storage check (
    image_url is null
    or image_url ~ ('^https?://[^/]+/storage/v1/object/public/post-images/' || user_id::text || '/[A-Za-z0-9-]+\.(png|jpg|webp|gif)$')
  );

-- Typing indicators use private broadcast channels named chat:<id>; only chat members may join.
create policy "Chat members receive chat broadcasts"
  on realtime.messages for select
  to authenticated
  using (
    realtime.topic() ~ '^chat:[0-9]+$'
    and public.is_chat_member(split_part(realtime.topic(), ':', 2)::bigint)
  );

create policy "Chat members send chat broadcasts"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.topic() ~ '^chat:[0-9]+$'
    and public.is_chat_member(split_part(realtime.topic(), ':', 2)::bigint)
  );
