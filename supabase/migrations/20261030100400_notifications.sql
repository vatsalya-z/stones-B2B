-- =============================================================================
-- Migration 5: notifications
-- Users read and mark-read their own rows only. Rows are created by trusted
-- server code (service role / future SECURITY DEFINER functions), never by clients.
-- =============================================================================

create table public.notifications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 200),
  message           text not null check (char_length(message) <= 2000),
  notification_type text not null check (notification_type in (
                      'enquiry_received', 'enquiry_viewed', 'quotation_received', 'quotation_accepted',
                      'quotation_rejected', 'message_received', 'seller_verification',
                      'product_moderation', 'account_status', 'system')),
  reference_id      uuid,
  is_read           boolean not null default false,
  created_at        timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;
revoke all on table public.notifications from public, anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_own on public.notifications
  for delete to authenticated using (user_id = auth.uid());

