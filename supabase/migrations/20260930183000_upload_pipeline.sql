-- Upload pipeline for private marks files, extracted data, and teacher approval.
-- Run once in the Supabase SQL editor after 20260930120000_initial.sql.
-- Does not store university passwords or browser sessions.

alter table public.upload_jobs drop constraint if exists upload_jobs_status_check;
alter table public.upload_jobs add constraint upload_jobs_status_check
  check (status in (
    'Completed',
    'Processing',
    'Waiting for Weightage',
    'Waiting for Approval',
    'Failed',
    'Needs Review',
    'Approved'
  ));

alter table public.upload_jobs
  add column if not exists storage_path text,
  add column if not exists pipeline_status text not null default 'uploaded',
  add column if not exists extracted_data jsonb,
  add column if not exists confirmed_data jsonb,
  add column if not exists approval_hash text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles (id);

alter table public.upload_jobs drop constraint if exists upload_jobs_pipeline_status_check;
alter table public.upload_jobs add constraint upload_jobs_pipeline_status_check
  check (pipeline_status in (
    'uploaded',
    'parsing',
    'analyzing',
    'subject_matching',
    'waiting_for_subject',
    'assessment_review',
    'waiting_for_weightage',
    'validation_failed',
    'waiting_for_approval',
    'approved',
    'queued',
    'connecting_university',
    'reading_portal',
    'creating_assessments',
    'uploading_marks',
    'verifying',
    'completed',
    'partially_completed',
    'failed',
    'cancelled'
  ));

alter table public.activity_logs
  add column if not exists upload_job_id uuid references public.upload_jobs (id) on delete set null;

create table if not exists public.approval_records (
  id uuid primary key default gen_random_uuid(),
  upload_job_id uuid not null references public.upload_jobs (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  payload_hash text not null,
  approved_at timestamptz not null default now()
);

create table if not exists public.upload_operations (
  id uuid primary key default gen_random_uuid(),
  upload_job_id uuid not null references public.upload_jobs (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  operation_type text not null,
  operation_key text not null,
  status text not null check (status in ('pending', 'completed', 'failed', 'skipped')),
  attempts integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  unique (upload_job_id, operation_key)
);

alter table public.approval_records enable row level security;
alter table public.upload_operations enable row level security;

drop policy if exists "approvals own" on public.approval_records;
create policy "approvals own" on public.approval_records
  for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "operations own" on public.upload_operations;
create policy "operations own" on public.upload_operations
  for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

grant select, insert on public.approval_records to authenticated;
grant select, insert, update on public.upload_operations to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('marks-files', 'marks-files', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists "marks files read own" on storage.objects;
create policy "marks files read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'marks-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "marks files insert own" on storage.objects;
create policy "marks files insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'marks-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "marks files delete own" on storage.objects;
create policy "marks files delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'marks-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
