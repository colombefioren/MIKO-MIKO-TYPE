-- Typing indicators follow the same rule as messages: only current friends in the chat.
drop policy "Chat members receive chat broadcasts" on realtime.messages;
drop policy "Chat members send chat broadcasts" on realtime.messages;

create policy "Friends receive chat broadcasts"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() ~ '^chat:[0-9]+$'
    and public.is_friend_chat_member(split_part(realtime.topic(), ':', 2)::bigint)
  );

create policy "Friends send chat broadcasts"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() ~ '^chat:[0-9]+$'
    and public.is_friend_chat_member(split_part(realtime.topic(), ':', 2)::bigint)
  );
