-- UniPilot AI schema
-- Run this in the Supabase SQL editor, or with `supabase db push`.
-- University portal passwords are intentionally not stored.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  department text not null default 'Computer Science',
  university text not null default 'ABC University',
  title text not null default 'Faculty',
  avatar_initials text not null default 'AK',
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  code text not null,
  name text not null,
  semester text not null,
  section text not null,
  student_count integer not null check (student_count >= 0),
  grading jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (teacher_id, code, semester, section)
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  name text not null,
  type text not null check (type in ('Assignment', 'Quiz', 'Presentation', 'Project', 'Lab', 'Midterm', 'Final', 'Other')),
  max_marks integer not null check (max_marks > 0),
  weightage numeric,
  source text not null check (source in ('Document', 'Teacher', 'Missing', 'University')),
  confidence numeric,
  university_status text not null check (university_status in ('Exists', 'Missing')),
  created_at date not null default current_date
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  student_code text not null,
  name text not null,
  marks_status text not null check (marks_status in ('Complete', 'Partial', 'Missing')),
  completed_assessments integer not null default 0,
  total_assessments integer not null default 0,
  overall_percentage integer,
  unique (teacher_id, student_code)
);

create table public.student_marks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  score integer,
  unique (student_id, assessment_id)
);

create table public.university_connections (
  teacher_id uuid primary key references public.profiles (id) on delete cascade,
  university text not null,
  portal_name text not null,
  status text not null check (status in ('Connected', 'Disconnected', 'Session Expired', 'MFA Required', 'Authentication Required', 'Connection Failed')),
  session text not null check (session in ('Active', 'Inactive', 'Expired')),
  account_name text not null,
  last_authentication timestamptz
);

create table public.upload_jobs (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  course_code text not null,
  course_name text not null,
  title text not null,
  file_name text not null,
  status text not null check (status in ('Completed', 'Processing', 'Waiting for Weightage', 'Waiting for Approval', 'Failed', 'Needs Review')),
  progress integer not null default 0 check (progress between 0 and 100),
  student_count integer not null default 0,
  assessment_count integer not null default 0,
  detail text not null default '',
  entries_verified integer not null default 0,
  errors integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.upload_sections (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.upload_jobs (id) on delete cascade,
  name text not null,
  type text not null,
  max_marks integer not null,
  weightage numeric not null,
  university_status text not null check (university_status in ('Will Create', 'Exists'))
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  course_code text not null,
  action text not null,
  status text not null check (status in ('Success', 'Warning', 'Info', 'Failed')),
  message text not null
);

create index courses_teacher_idx on public.courses (teacher_id);
create index assessments_course_idx on public.assessments (course_id);
create index students_course_idx on public.students (course_id);
create index students_teacher_idx on public.students (teacher_id);
create index upload_jobs_teacher_idx on public.upload_jobs (teacher_id, created_at desc);
create index activity_teacher_idx on public.activity_logs (teacher_id, occurred_at desc);

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.assessments enable row level security;
alter table public.students enable row level security;
alter table public.student_marks enable row level security;
alter table public.university_connections enable row level security;
alter table public.upload_jobs enable row level security;
alter table public.upload_sections enable row level security;
alter table public.activity_logs enable row level security;

create policy "profiles self" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles update self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "courses own" on public.courses
  for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "assessments own" on public.assessments
  for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "students own" on public.students
  for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "marks own" on public.student_marks
  for all to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and s.teacher_id = auth.uid()))
  with check (exists (select 1 from public.students s where s.id = student_id and s.teacher_id = auth.uid()));
create policy "connection own" on public.university_connections
  for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "jobs own" on public.upload_jobs
  for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "sections own" on public.upload_sections
  for all to authenticated
  using (exists (select 1 from public.upload_jobs j where j.id = job_id and j.teacher_id = auth.uid()))
  with check (exists (select 1 from public.upload_jobs j where j.id = job_id and j.teacher_id = auth.uid()));
create policy "activity own" on public.activity_logs
  for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.courses to authenticated;
grant select, insert, update, delete on public.assessments to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.student_marks to authenticated;
grant select, insert, update, delete on public.university_connections to authenticated;
grant select, insert, update, delete on public.upload_jobs to authenticated;
grant select, insert, update, delete on public.upload_sections to authenticated;
grant select, insert, update, delete on public.activity_logs to authenticated;

create or replace function public.initials(full_name text)
returns text
language sql
immutable
as $$
  select upper(
    left(split_part(coalesce(full_name, 'A'), ' ', 1), 1) ||
    left(coalesce(nullif(split_part(coalesce(full_name, 'K'), ' ', 2), ''), left(coalesce(full_name, 'K'), 1)), 1)
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, name, email, department, university, title, avatar_initials)
  values (
    new.id,
    display_name,
    new.email,
    coalesce(new.raw_user_meta_data->>'department', 'Computer Science'),
    coalesce(new.raw_user_meta_data->>'university', 'ABC University'),
    coalesce(new.raw_user_meta_data->>'title', 'Faculty'),
    public.initials(display_name)
  );
  insert into public.university_connections (teacher_id, university, portal_name, status, session, account_name, last_authentication)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'university', 'ABC University'),
    coalesce(new.raw_user_meta_data->>'university', 'ABC University') || ' Portal',
    'Disconnected',
    'Inactive',
    split_part(display_name, ' ', 1),
    null
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.seed_demo_workspace()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  course record;
  stu record;
  ass record;
  person integer := 0;
  serial integer := 1;
  prefix text;
  student_code text;
  sname text;
  status text;
  score integer;
  idx integer;
  completed integer;
  total integer;
  earned integer;
  possible integer;
  first_names text[] := array['Ahmed','Sara','Hassan','Ayesha','Bilal','Fatima','Omar','Hira','Zain','Maryam','Usman','Noor','Ali','Zara','Hamza','Iqra','Danish','Maham','Farhan','Laiba','Sana','Kamran','Hina','Imran','Rabia','Taha','Amna','Saad','Mariam','Fahad','Nida','Waleed','Anum','Shahzaib','Khadija','Haris','Mehak','Asad','Eman','Junaid'];
  last_names text[] := array['Khan','Malik','Sheikh','Raza','Hussain','Qureshi','Siddiqui','Butt','Chaudhry','Iqbal','Farooq','Akhtar','Javed','Nadeem','Abbasi','Mirza','Dar','Lone','Baig','Ansari'];
  c301 uuid;
  c305 uuid;
  se401 uuid;
  job_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  if exists (select 1 from public.courses where teacher_id = uid) then
    return;
  end if;

  insert into public.courses (teacher_id, code, name, semester, section, student_count, grading)
  values
    (uid, 'CS-301', 'Artificial Intelligence', 'BSCS 5', 'A', 42, '[{"name":"Assignment 1","weightage":5},{"name":"Assignment 2","weightage":5},{"name":"Assignment 3","weightage":5},{"name":"Project","weightage":15},{"name":"Midterm","weightage":30},{"name":"Final","weightage":40}]'::jsonb),
    (uid, 'CS-305', 'Database Systems', 'BSCS 5', 'B', 45, '[{"name":"Quiz 1","weightage":10},{"name":"Assignment 1","weightage":15},{"name":"Midterm","weightage":25},{"name":"Final","weightage":50}]'::jsonb),
    (uid, 'SE-401', 'Software Engineering', 'BSSE 7', 'A', 38, '[{"name":"Assignment 1","weightage":10},{"name":"Assignment 2","weightage":10},{"name":"Presentation","weightage":10},{"name":"Midterm","weightage":30},{"name":"Final","weightage":40}]'::jsonb),
    (uid, 'CS-410', 'Machine Learning', 'BSCS 7', 'A', 36, '[{"name":"Quiz 1","weightage":10},{"name":"Project","weightage":30},{"name":"Final","weightage":60}]'::jsonb),
    (uid, 'CS-302', 'Artificial Intelligence Lab', 'BSCS 5', 'A', 40, '[{"name":"Lab 1","weightage":20},{"name":"Lab 2","weightage":20},{"name":"Final","weightage":60}]'::jsonb),
    (uid, 'CS-401', 'Advanced Artificial Intelligence', 'BSCS 7', 'B', 47, '[{"name":"Presentation","weightage":15},{"name":"Midterm","weightage":35},{"name":"Final","weightage":50}]'::jsonb);

  insert into public.assessments (teacher_id, course_id, name, type, max_marks, weightage, source, confidence, university_status, created_at)
  select uid, c.id, a.name, a.type, a.max_marks, a.weightage, a.source, a.confidence, a.university_status, a.created_at::date
  from public.courses c
  join (values
    ('CS-301', 'Assignment 1', 'Assignment', 10, 5::numeric, 'Document', 99::numeric, 'Missing', '2026-09-12'),
    ('CS-301', 'Assignment 2', 'Assignment', 10, 5, 'Document', 99, 'Missing', '2026-09-12'),
    ('CS-301', 'Assignment 3', 'Assignment', 10, null, 'Missing', null, 'Missing', '2026-09-12'),
    ('CS-301', 'Project', 'Project', 20, 15, 'Document', 98, 'Missing', '2026-09-12'),
    ('CS-301', 'Midterm', 'Midterm', 50, 30, 'University', 100, 'Exists', '2026-09-01'),
    ('CS-301', 'Final', 'Final', 100, 40, 'University', 100, 'Exists', '2026-09-01'),
    ('CS-305', 'Quiz 1', 'Quiz', 10, 10, 'University', 100, 'Exists', '2026-09-08'),
    ('CS-305', 'Assignment 1', 'Assignment', 20, 15, 'Document', 97, 'Missing', '2026-09-18'),
    ('CS-305', 'Midterm', 'Midterm', 30, 25, 'University', 100, 'Exists', '2026-09-02'),
    ('CS-305', 'Final', 'Final', 50, 50, 'University', 100, 'Exists', '2026-09-02'),
    ('SE-401', 'Assignment 1', 'Assignment', 20, 10, 'University', 100, 'Exists', '2026-09-04'),
    ('SE-401', 'Assignment 2', 'Assignment', 20, 10, 'University', 100, 'Exists', '2026-09-20'),
    ('SE-401', 'Presentation', 'Presentation', 15, 10, 'Document', 96, 'Missing', '2026-09-21'),
    ('SE-401', 'Midterm', 'Midterm', 40, 30, 'University', 100, 'Exists', '2026-09-03'),
    ('SE-401', 'Final', 'Final', 80, 40, 'University', 100, 'Exists', '2026-09-03'),
    ('CS-410', 'Quiz 1', 'Quiz', 15, 10, 'University', 100, 'Exists', '2026-09-11'),
    ('CS-410', 'Project', 'Project', 40, 30, 'Document', 95, 'Missing', '2026-09-19'),
    ('CS-410', 'Final', 'Final', 60, 60, 'University', 100, 'Exists', '2026-09-05'),
    ('CS-302', 'Lab 1', 'Lab', 20, 20, 'University', 100, 'Exists', '2026-09-06'),
    ('CS-302', 'Lab 2', 'Lab', 20, 20, 'Document', 94, 'Missing', '2026-09-16'),
    ('CS-302', 'Final', 'Final', 40, 60, 'University', 100, 'Exists', '2026-09-06'),
    ('CS-401', 'Presentation', 'Presentation', 20, 15, 'Document', 93, 'Missing', '2026-09-22'),
    ('CS-401', 'Midterm', 'Midterm', 40, 35, 'University', 100, 'Exists', '2026-09-07'),
    ('CS-401', 'Final', 'Final', 60, 50, 'University', 100, 'Exists', '2026-09-07')
  ) as a(code, name, type, max_marks, weightage, source, confidence, university_status, created_at)
    on a.code = c.code
  where c.teacher_id = uid;

  for course in select * from public.courses where teacher_id = uid order by code loop
    for i in 1..course.student_count loop
      person := person + 1;
      if serial = 109 then serial := serial + 1; end if;
      prefix := case when course.code like 'SE%' then '2026-SE' else '2026-CS' end;
      student_code := prefix || '-' || lpad(serial::text, 3, '0');
      serial := serial + 1;
      if course.code = 'CS-301' and i = 1 then
        sname := 'Ahmed Khan';
      else
        sname := first_names[1 + ((person - 1) % array_length(first_names, 1))] || ' ' ||
                 last_names[1 + (((person - 1) / array_length(first_names, 1)) % array_length(last_names, 1))];
      end if;
      status := case when person % 17 = 0 then 'Missing' when person % 7 = 0 then 'Partial' else 'Complete' end;
      insert into public.students (teacher_id, course_id, student_code, name, marks_status, completed_assessments, total_assessments, overall_percentage)
      values (uid, course.id, student_code, sname, status, 0, 0, null)
      returning * into stu;

      completed := 0;
      total := 0;
      earned := 0;
      possible := 0;
      idx := 0;
      for ass in select * from public.assessments where course_id = course.id order by created_at, name loop
        total := total + 1;
        if status = 'Missing' or (status = 'Partial' and idx % 2 = 1) then
          score := null;
        else
          score := least(ass.max_marks, round(ass.max_marks * (0.58 + ((person * 13 + idx * 7) % 38) / 100.0))::integer);
          completed := completed + 1;
          earned := earned + score;
          possible := possible + ass.max_marks;
        end if;
        insert into public.student_marks (student_id, assessment_id, score) values (stu.id, ass.id, score);
        idx := idx + 1;
      end loop;
      update public.students
      set completed_assessments = completed,
          total_assessments = total,
          overall_percentage = case when possible = 0 then null else round(earned::numeric / possible * 100)::integer end
      where id = stu.id;
    end loop;
  end loop;

  select id into c301 from public.courses where teacher_id = uid and code = 'CS-301';
  select id into c305 from public.courses where teacher_id = uid and code = 'CS-305';
  select id into se401 from public.courses where teacher_id = uid and code = 'SE-401';

  insert into public.upload_jobs (teacher_id, course_id, course_code, course_name, title, file_name, status, progress, student_count, assessment_count, detail, entries_verified, errors, created_at, completed_at)
  values
    (uid, c301, 'CS-301', 'Artificial Intelligence', 'CS-301 Midterm Upload', 'AI_Marks.xlsx', 'Completed', 100, 42, 6, '42 student records uploaded and verified.', 252, 0, '2026-09-29 09:40:00+00', '2026-09-29 09:46:00+00')
  returning id into job_id;
  insert into public.upload_sections (job_id, name, type, max_marks, weightage, university_status) values
    (job_id, 'Assignment 1', 'Assignment', 10, 5, 'Will Create'),
    (job_id, 'Assignment 2', 'Assignment', 10, 5, 'Will Create'),
    (job_id, 'Assignment 3', 'Assignment', 10, 5, 'Will Create'),
    (job_id, 'Project', 'Project', 20, 15, 'Will Create'),
    (job_id, 'Midterm', 'Midterm', 50, 30, 'Exists'),
    (job_id, 'Final', 'Final', 100, 40, 'Exists');

  insert into public.upload_jobs (teacher_id, course_id, course_code, course_name, title, file_name, status, progress, student_count, assessment_count, detail, entries_verified, errors, created_at, completed_at)
  values
    (uid, se401, 'SE-401', 'Software Engineering', 'SE-401 Assignment 2', 'Midterm.xlsx', 'Completed', 100, 38, 1, 'Sections created and marks posted.', 38, 0, '2026-09-28 14:05:00+00', '2026-09-28 14:12:00+00'),
    (uid, c305, 'CS-305', 'Database Systems', 'CS-305 Project Marks', 'Assignments.xlsx', 'Waiting for Weightage', 55, 45, 3, 'Weightage is still missing for one section.', 0, 0, '2026-09-27 11:20:00+00', null),
    (uid, (select id from public.courses where teacher_id = uid and code = 'CS-410'), 'CS-410', 'Machine Learning', 'CS-410 Quiz Upload', 'Quiz.xlsx', 'Completed', 100, 36, 1, 'Quiz marks verified.', 36, 0, '2026-09-26 08:30:00+00', '2026-09-26 08:36:00+00'),
    (uid, (select id from public.courses where teacher_id = uid and code = 'CS-302'), 'CS-302', 'Artificial Intelligence Lab', 'CS-302 Lab Marks', 'Lab_Marks.xlsx', 'Failed', 28, 40, 2, 'The portal session ended before marks were posted.', 0, 1, '2026-09-25 16:10:00+00', null),
    (uid, se401, 'SE-401', 'Software Engineering', 'SE-401 Project Draft', 'Project.xlsx', 'Needs Review', 70, 38, 1, 'One student row could not be matched.', 0, 1, '2026-09-24 10:00:00+00', null),
    (uid, (select id from public.courses where teacher_id = uid and code = 'CS-401'), 'CS-401', 'Advanced Artificial Intelligence', 'CS-401 Presentation', 'Presentation.xlsx', 'Waiting for Approval', 80, 47, 1, 'Ready for faculty approval.', 0, 0, '2026-09-22 13:15:00+00', null),
    (uid, c305, 'CS-305', 'Database Systems', 'CS-305 Quiz Processing', 'Quiz1.xlsx', 'Processing', 64, 45, 1, 'Marks are moving to the portal.', 0, 0, '2026-09-30 07:50:00+00', null);

  insert into public.activity_logs (teacher_id, occurred_at, course_code, action, status, message) values
    (uid, '2026-09-29 09:42:00+00', 'CS-301', 'Upload started', 'Info', 'CS-301 upload started'),
    (uid, '2026-09-29 09:43:00+00', 'CS-301', 'Authentication', 'Success', 'University authentication verified'),
    (uid, '2026-09-29 09:44:00+00', 'CS-301', 'Section created', 'Success', 'Assignment 1 created'),
    (uid, '2026-09-29 09:44:30+00', 'CS-301', 'Section created', 'Success', 'Assignment 2 created'),
    (uid, '2026-09-29 09:45:00+00', 'CS-301', 'Marks uploaded', 'Success', '42 student records uploaded'),
    (uid, '2026-09-29 09:46:00+00', 'CS-301', 'Verification', 'Success', 'Verification completed'),
    (uid, '2026-09-28 14:06:00+00', 'SE-401', 'Sections created', 'Success', 'Assignment 2 section created'),
    (uid, '2026-09-28 14:12:00+00', 'SE-401', 'Upload completed', 'Success', '38 student records verified'),
    (uid, '2026-09-27 11:24:00+00', 'CS-305', 'Weightage missing', 'Warning', 'Waiting for weightage before upload'),
    (uid, '2026-09-26 08:36:00+00', 'CS-410', 'Upload completed', 'Success', 'Quiz marks posted for Machine Learning'),
    (uid, '2026-09-25 16:18:00+00', 'CS-302', 'Upload failed', 'Failed', 'Portal session ended during lab upload'),
    (uid, '2026-09-24 10:12:00+00', 'SE-401', 'Needs review', 'Warning', 'A student row needs a manual match'),
    (uid, '2026-09-22 13:20:00+00', 'CS-401', 'Awaiting approval', 'Info', 'Presentation upload is ready to approve'),
    (uid, '2026-09-30 07:55:00+00', 'CS-305', 'Processing', 'Info', 'Quiz upload is still running'),
    (uid, '2026-09-29 18:02:00+00', 'CS-301', 'Connection checked', 'Success', 'ABC University session is active');

  update public.university_connections
  set status = 'Connected',
      session = 'Active',
      last_authentication = '2026-09-29 18:02:00+00'
  where teacher_id = uid;
end;
$$;

create or replace function public.reset_demo_workspace()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from public.activity_logs where teacher_id = uid;
  delete from public.upload_jobs where teacher_id = uid;
  delete from public.courses where teacher_id = uid;
  perform public.seed_demo_workspace();
end;
$$;

revoke all on function public.seed_demo_workspace() from public;
revoke all on function public.reset_demo_workspace() from public;
grant execute on function public.seed_demo_workspace() to authenticated;
grant execute on function public.reset_demo_workspace() to authenticated;
