-- Local UniPilot Agent metadata.
-- University passwords, MFA codes, cookies, and browser profiles are not stored.

alter table public.university_connections
  add column if not exists connection_method text,
  add column if not exists adapter_key text,
  add column if not exists portal_url text,
  add column if not exists device_id uuid,
  add column if not exists last_verified_at timestamptz;

update public.university_connections
set connection_method = 'deprecated_simulated'
where connection_method is null;

alter table public.university_connections
  alter column connection_method set default 'local_agent_browser';

create table if not exists public.unipilot_devices (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  device_name text not null,
  device_public_id text not null unique,
  secret_hash text not null,
  status text not null default 'paired' check (status in ('paired', 'revoked')),
  paired_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.university_connections
  drop constraint if exists university_connections_device_id_fkey;

alter table public.university_connections
  add constraint university_connections_device_id_fkey
  foreign key (device_id) references public.unipilot_devices (id) on delete set null;

create table if not exists public.agent_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_command_tickets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.unipilot_devices (id) on delete cascade,
  action text not null,
  adapter_key text not null,
  ticket_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists unipilot_devices_teacher_idx on public.unipilot_devices (teacher_id);
create index if not exists agent_pairing_hash_idx on public.agent_pairing_codes (code_hash);
create index if not exists agent_tickets_hash_idx on public.agent_command_tickets (ticket_hash);

alter table public.unipilot_devices enable row level security;
alter table public.agent_pairing_codes enable row level security;
alter table public.agent_command_tickets enable row level security;

-- No policies for the browser role. The server secret key writes these rows.
-- Device secrets are stored only as hashes.
