-- Chạy trong Supabase Dashboard > SQL Editor (một lần duy nhất khi tạo project).

create table if not exists public.journal_backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.journal_backups enable row level security;

create policy "Users manage own backup"
  on public.journal_backups
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
