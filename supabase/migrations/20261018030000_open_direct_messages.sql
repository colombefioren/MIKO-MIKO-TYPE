-- Anyone signed in can start a conversation, as in the original Miko-Miko app.
-- Chats stay private to their two members.

create or replace function public.get_or_create_chat(p_other uuid)
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
  if not exists (select 1 from public.profiles p where p.id = p_other) then
    raise exception 'This typist does not exist';
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

drop policy "Friends send messages" on public.messages;

create policy "Members send messages"
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid() and public.is_chat_member(chat_id));

drop policy "Friends receive chat broadcasts" on realtime.messages;
drop policy "Friends send chat broadcasts" on realtime.messages;

create policy "Members receive chat broadcasts"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() ~ '^chat:[0-9]+$'
    and public.is_chat_member(split_part(realtime.topic(), ':', 2)::bigint)
  );

create policy "Members send chat broadcasts"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() ~ '^chat:[0-9]+$'
    and public.is_chat_member(split_part(realtime.topic(), ':', 2)::bigint)
  );

drop function public.is_friend_chat_member(bigint);
