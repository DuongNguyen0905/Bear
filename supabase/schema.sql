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

-- Ảnh nhật ký được lưu riêng ở Storage (không nhúng base64 vào cột jsonb ở trên
-- nữa) — dữ liệu nhiều ảnh độ phân giải cao từng làm câu lệnh ghi vào
-- journal_backups bị Postgres huỷ do "statement timeout" (đã kiểm chứng thực tế
-- ở khoảng 50MB/lần). Mỗi người dùng chỉ đọc/ghi được ảnh trong thư mục của
-- chính mình (tiền tố tên file là user_id).
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "Users manage own photos"
  on storage.objects
  for all
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
