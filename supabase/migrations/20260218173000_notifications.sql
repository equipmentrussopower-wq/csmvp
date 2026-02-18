-- Notifications table
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,  -- null = broadcast to all
  title         text not null,
  body          text not null,
  type          text not null default 'info',   -- info | success | warning | alert
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

-- RLS
alter table public.notifications enable row level security;

-- Users can only see their own notifications OR broadcast ones (user_id is null)
create policy "Users read own or broadcast notifications"
  on public.notifications for select
  using (user_id = auth.uid() or user_id is null);

-- Users can mark their own (or broadcast) as read
create policy "Users update read status"
  on public.notifications for update
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);

-- Only service_role / admin can insert
create policy "Admin insert notifications"
  on public.notifications for insert
  with check (true);  -- enforced at app level via admin check
