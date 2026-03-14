-- profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  is_pro boolean default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

-- Drop policies if they already exist to avoid conflicts
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Service role can update profiles" on public.profiles;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Service role can update profiles" on public.profiles
  for all using (true) with check (true);
