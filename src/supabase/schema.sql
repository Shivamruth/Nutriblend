-- NutriBlend Supabase Schema + RLS Policies
-- Run this in Supabase SQL Editor.
-- Safe for existing projects: it uses IF NOT EXISTS / DROP POLICY IF EXISTS where possible.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. PROFILES
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  address text,
  role text not null default 'customer',
  fitness_goal text,
  fitness_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists email text;

alter table public.profiles
add column if not exists full_name text;

alter table public.profiles
add column if not exists phone text;

alter table public.profiles
add column if not exists address text;

alter table public.profiles
add column if not exists role text not null default 'customer';

alter table public.profiles
add column if not exists fitness_goal text;

alter table public.profiles
add column if not exists fitness_level text;

alter table public.profiles
add column if not exists created_at timestamptz not null default now();

alter table public.profiles
add column if not exists updated_at timestamptz not null default now();

alter table public.profiles enable row level security;

-- Helper function to avoid recursive RLS checks on profiles.
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
    and role = 'admin'
  );
$$;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
on public.profiles
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_email_idx on public.profiles(email);

-- =========================================================
-- 2. PRODUCTS
-- =========================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  protein text,
  price numeric not null default 0,
  category text,
  description text,
  image text,
  ingredients jsonb default '[]'::jsonb,
  benefits jsonb default '[]'::jsonb,
  calories text,
  quantity text,
  stock_status text not null default 'In Stock',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
add column if not exists protein text;

alter table public.products
add column if not exists category text;

alter table public.products
add column if not exists description text;

alter table public.products
add column if not exists image text;

alter table public.products
add column if not exists ingredients jsonb default '[]'::jsonb;

alter table public.products
add column if not exists benefits jsonb default '[]'::jsonb;

alter table public.products
add column if not exists calories text;

alter table public.products
add column if not exists quantity text;

alter table public.products
add column if not exists stock_status text not null default 'In Stock';

alter table public.products
add column if not exists is_active boolean not null default true;

alter table public.products
add column if not exists created_at timestamptz not null default now();

alter table public.products
add column if not exists updated_at timestamptz not null default now();

alter table public.products enable row level security;

drop policy if exists "Anyone authenticated can view active products" on public.products;
create policy "Anyone authenticated can view active products"
on public.products
for select
to authenticated
using (is_active = true or public.is_admin(auth.uid()));

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
on public.products
for insert
to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
on public.products
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
on public.products
for delete
to authenticated
using (public.is_admin(auth.uid()));

create index if not exists products_category_idx on public.products(category);
create index if not exists products_active_idx on public.products(is_active);
create index if not exists products_stock_status_idx on public.products(stock_status);

-- =========================================================
-- 3. PLANS
-- =========================================================

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  duration text,
  protein text,
  category text default 'Plans',
  description text,
  image text,
  includes jsonb default '[]'::jsonb,
  features jsonb default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans
add column if not exists duration text;

alter table public.plans
add column if not exists protein text;

alter table public.plans
add column if not exists category text default 'Plans';

alter table public.plans
add column if not exists description text;

alter table public.plans
add column if not exists image text;

alter table public.plans
add column if not exists includes jsonb default '[]'::jsonb;

alter table public.plans
add column if not exists features jsonb default '[]'::jsonb;

alter table public.plans
add column if not exists is_active boolean not null default true;

alter table public.plans
add column if not exists created_at timestamptz not null default now();

alter table public.plans
add column if not exists updated_at timestamptz not null default now();

alter table public.plans enable row level security;

drop policy if exists "Anyone authenticated can view active plans" on public.plans;
create policy "Anyone authenticated can view active plans"
on public.plans
for select
to authenticated
using (is_active = true or public.is_admin(auth.uid()));

drop policy if exists "Admins can insert plans" on public.plans;
create policy "Admins can insert plans"
on public.plans
for insert
to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can update plans" on public.plans;
create policy "Admins can update plans"
on public.plans
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete plans" on public.plans;
create policy "Admins can delete plans"
on public.plans
for delete
to authenticated
using (public.is_admin(auth.uid()));

create index if not exists plans_active_idx on public.plans(is_active);

-- =========================================================
-- 4. ADDRESSES
-- =========================================================

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  street text not null,
  landmark text,
  city text not null,
  state text not null,
  pincode text not null,
  type text not null default 'Home',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.addresses enable row level security;

drop policy if exists "Users can view own addresses" on public.addresses;
create policy "Users can view own addresses"
on public.addresses
for select
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Users can insert own addresses" on public.addresses;
create policy "Users can insert own addresses"
on public.addresses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own addresses" on public.addresses;
create policy "Users can update own addresses"
on public.addresses
for update
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Users can delete own addresses" on public.addresses;
create policy "Users can delete own addresses"
on public.addresses
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create index if not exists addresses_user_id_idx on public.addresses(user_id);
create index if not exists addresses_user_default_idx on public.addresses(user_id, is_default);

-- =========================================================
-- 5. ORDERS
-- =========================================================

create table if not exists public.orders (
  id bigint generated by default as identity primary key,
  product_name text,
  price integer,
  created_at timestamp without time zone default now(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  qty integer default 1,
  total numeric default 0,
  subtotal numeric default 0,
  delivery_fee numeric default 0,
  delivery_option text,
  payment_status text default 'Pending',
  payment_method text default 'COD',
  upi_id text,
  status text default 'Placed',
  address jsonb,
  items jsonb default '[]'::jsonb,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  cancel_reason text,
  cancelled_at timestamp without time zone
);

-- Safe column upgrades for existing orders table.
alter table public.orders
add column if not exists product_name text;

alter table public.orders
add column if not exists price integer;

alter table public.orders
add column if not exists created_at timestamp without time zone default now();

alter table public.orders
add column if not exists user_id uuid;

alter table public.orders
add column if not exists email text;

alter table public.orders
add column if not exists qty integer default 1;

alter table public.orders
add column if not exists total numeric default 0;

alter table public.orders
add column if not exists subtotal numeric default 0;

alter table public.orders
add column if not exists delivery_fee numeric default 0;

alter table public.orders
add column if not exists delivery_option text;

alter table public.orders
add column if not exists payment_status text default 'Pending';

alter table public.orders
add column if not exists payment_method text default 'COD';

alter table public.orders
add column if not exists upi_id text;

alter table public.orders
add column if not exists status text default 'Placed';

alter table public.orders
add column if not exists items jsonb default '[]'::jsonb;

alter table public.orders
add column if not exists razorpay_order_id text;

alter table public.orders
add column if not exists razorpay_payment_id text;

alter table public.orders
add column if not exists razorpay_signature text;

alter table public.orders
add column if not exists cancel_reason text;

alter table public.orders
add column if not exists cancelled_at timestamp without time zone;

-- Convert address from text to jsonb if needed.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'address'
      and data_type <> 'jsonb'
  ) then
    alter table public.orders
    alter column address type jsonb
    using
      case
        when address is null then null
        when address::text = '' then null
        else to_jsonb(address)
      end;
  end if;
end $$;

alter table public.orders enable row level security;

drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders"
on public.orders
for select
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders"
on public.orders
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Users can update own cancellable orders" on public.orders;
create policy "Users can update own cancellable orders"
on public.orders
for update
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Admins can delete orders" on public.orders;
create policy "Admins can delete orders"
on public.orders
for delete
to authenticated
using (public.is_admin(auth.uid()));

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_payment_method_idx on public.orders(payment_method);
create index if not exists orders_razorpay_order_id_idx on public.orders(razorpay_order_id);

-- =========================================================
-- 6. OPTIONAL SEED DATA
-- =========================================================

insert into public.products (
  name,
  protein,
  price,
  category,
  description,
  image,
  ingredients,
  benefits,
  calories,
  quantity,
  stock_status,
  is_active
)
values
(
  '10g Natural Shake',
  '10g',
  59,
  'Natural',
  'Budget-friendly natural protein shake for students and beginners.',
  '/products/natural-10g.png',
  '[{"name":"Milk","qty":"250ml"},{"name":"Banana","qty":"1"},{"name":"Peanut Butter","qty":"1 tsp"}]'::jsonb,
  '["Budget friendly","Good for beginners","Easy daily protein"]'::jsonb,
  '250 kcal',
  '300ml',
  'In Stock',
  true
),
(
  '30g Whey Shake',
  '30g',
  129,
  'Whey',
  'High-protein whey shake for gym-focused users.',
  '/products/whey-30g.png',
  '[{"name":"Milk","qty":"300ml"},{"name":"Whey","qty":"1 scoop"},{"name":"Oats","qty":"20g"}]'::jsonb,
  '["Muscle recovery","High protein","Gym friendly"]'::jsonb,
  '360 kcal',
  '350ml',
  'In Stock',
  true
)
on conflict do nothing;

insert into public.plans (
  name,
  price,
  duration,
  protein,
  category,
  description,
  image,
  includes,
  features,
  is_active
)
values
(
  'Weekly Natural Plan',
  399,
  '7 Days',
  '10g - 20g',
  'Plans',
  'Budget-friendly weekly plan for students and daily protein users.',
  '📅',
  '["7 shakes","Natural protein options","Budget friendly"]'::jsonb,
  '["Good for hostelers","Daily protein support","Affordable"]'::jsonb,
  true
),
(
  'Monthly Premium Plan',
  2499,
  '30 Days',
  '30g - 50g',
  'Plans',
  'Premium monthly plan for serious gym and transformation users.',
  '🔥',
  '["30 shakes","Whey + natural options","Priority preparation"]'::jsonb,
  '["High protein","Best for gym users","Premium support"]'::jsonb,
  true
)
on conflict do nothing;
