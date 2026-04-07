
-- Run this entire script in the Supabase SQL Editor to set up your database

-- 1. Create 'profiles' table
create table if not exists profiles (
  id text primary key, 
  email text unique not null,
  phone text,
  role text default 'USER', -- 'USER', 'VENDOR', 'ADMIN'
  password text default 'password123', -- Added for simple auth
  business_name text,
  service_type text,
  location text,
  description text,
  image_url text,
  image_urls text[],
  website text,
  rating numeric default 0,
  views numeric default 0, -- Added views count
  is_featured boolean default false,
  socials jsonb default '{}'::jsonb,
  services jsonb default '[]'::jsonb,
  joined_at timestamptz default now()
);

-- 2. Ensure password and views columns exist (safe update)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'password') then
    alter table profiles add column password text default 'password123';
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'views') then
    alter table profiles add column views numeric default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'phone') then
    alter table profiles add column phone text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'applications' and column_name = 'phone') then
    alter table applications add column phone text;
  end if;
end $$;

-- 3. Create 'applications' table
create table if not exists applications (
  id text primary key,
  business_name text not null,
  email text not null,
  phone text,
  service_type text,
  location text,
  description text,
  status text default 'PENDING',
  image_url text,
  image_urls text[],
  website text,
  socials jsonb default '{}'::jsonb,
  services jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 4. Enable RLS
alter table profiles enable row level security;
alter table applications enable row level security;

-- 5. Create Policies (Dropping first to ensure idempotency)
drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone" on profiles for select using (true);

drop policy if exists "Enable insert for profiles" on profiles;
create policy "Enable insert for profiles" on profiles for insert with check (true);

drop policy if exists "Enable update for profiles" on profiles;
create policy "Enable update for profiles" on profiles for update using (true);

drop policy if exists "Enable delete for profiles" on profiles;
create policy "Enable delete for profiles" on profiles for delete using (true);

drop policy if exists "Public applications are viewable by everyone" on applications;
create policy "Public applications are viewable by everyone" on applications for select using (true);

drop policy if exists "Enable insert for applications" on applications;
create policy "Enable insert for applications" on applications for insert with check (true);

drop policy if exists "Enable update for applications" on applications;
create policy "Enable update for applications" on applications for update using (true);

drop policy if exists "Enable delete for applications" on applications;
create policy "Enable delete for applications" on applications for delete using (true);

-- 6. Seed Initial Admin and Vendor Users
insert into profiles (id, email, password, role, business_name, description, location)
values 
  ('admin-1', 'admin@creative.se', 'password123', 'ADMIN', 'System Admin', 'Platform Administrator', 'Stockholm'),
  ('vendor-1', 'vendor@creative.se', 'password123', 'VENDOR', 'Demo Vendor', 'Example Vendor Account', 'Stockholm')
on conflict (email) do update 
set 
  role = excluded.role,
  password = excluded.password;