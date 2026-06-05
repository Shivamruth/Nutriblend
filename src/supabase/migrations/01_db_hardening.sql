-- ================================================================
-- NutriBlend — Production Database Hardening Migration
-- File: 01_db_hardening.sql
-- Run this in the Supabase SQL Editor (once, idempotent).
-- ================================================================

-- ============================================================
-- A. SOFT DELETES — products & plans
-- ============================================================
alter table public.products
  add column if not exists deleted_at timestamptz;

alter table public.plans
  add column if not exists deleted_at timestamptz;

-- Refresh product select policy to exclude soft-deleted rows
drop policy if exists "Anyone authenticated can view active products" on public.products;
create policy "Anyone authenticated can view active products"
  on public.products
  for select
  to authenticated
  using (
    (is_active = true or public.is_admin(auth.uid()))
    and deleted_at is null
  );

-- Refresh plan select policy to exclude soft-deleted rows
drop policy if exists "Anyone authenticated can view active plans" on public.plans;
create policy "Anyone authenticated can view active plans"
  on public.plans
  for select
  to authenticated
  using (
    (is_active = true or public.is_admin(auth.uid()))
    and deleted_at is null
  );

-- ============================================================
-- B. ADDRESSES — extend schema with full fields
-- ============================================================
alter table public.addresses
  add column if not exists full_name         text,
  add column if not exists address_line_1    text,
  add column if not exists address_line_2    text,
  add column if not exists district          text,
  add column if not exists country           text default 'India',
  add column if not exists postal_code       text,
  add column if not exists latitude          numeric,
  add column if not exists longitude         numeric,
  add column if not exists address_type      text default 'Home',
  add column if not exists delivery_time     text default 'Morning',
  add column if not exists custom_delivery_time text,
  add column if not exists order_note        text,
  add column if not exists alternate_phone   text,
  add column if not exists email             text;

-- Backfill legacy data to new columns (safe: only fills nulls)
update public.addresses
  set full_name      = name
  where full_name    is null and name is not null;

update public.addresses
  set postal_code    = pincode
  where postal_code  is null and pincode is not null;

update public.addresses
  set address_line_1 = street
  where address_line_1 is null and street is not null;

update public.addresses
  set district       = city
  where district     is null and city is not null;

-- ============================================================
-- C. ORDERS — add delivery_partner_id column
-- ============================================================
alter table public.orders
  add column if not exists delivery_partner_id uuid
    references auth.users(id) on delete set null;

create index if not exists orders_delivery_partner_id_idx
  on public.orders(delivery_partner_id);

-- Allow delivery partners to read orders assigned to them
drop policy if exists "Delivery partners can view assigned orders" on public.orders;
create policy "Delivery partners can view assigned orders"
  on public.orders
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_admin(auth.uid())
    or delivery_partner_id = auth.uid()
  );

-- Allow delivery partners to update status/location on their orders
drop policy if exists "Delivery partners can update assigned orders" on public.orders;
create policy "Delivery partners can update assigned orders"
  on public.orders
  for update
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_admin(auth.uid())
    or delivery_partner_id = auth.uid()
  )
  with check (
    auth.uid() = user_id
    or public.is_admin(auth.uid())
    or delivery_partner_id = auth.uid()
  );

-- ============================================================
-- D. ROLE HELPERS
-- ============================================================
create or replace function public.is_delivery_partner(user_id uuid)
  returns boolean
  language sql
  security definer
  set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'delivery_partner'
  );
$$;

-- ============================================================
-- E. MONTHLY SUBSCRIPTIONS
-- ============================================================
create table if not exists public.monthly_subscriptions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  plan_id        uuid references public.plans(id) on delete set null,
  plan_name      text,
  plan_price     numeric default 0,
  plan_duration  text,
  plan_protein   text,
  status         text not null default 'active',
  start_date     timestamptz not null default now(),
  end_date       timestamptz,
  order_id       bigint references public.orders(id) on delete set null,
  cancelled_at   timestamptz,
  cancel_reason  text,
  created_at     timestamptz not null default now()
);

alter table public.monthly_subscriptions enable row level security;

drop policy if exists "Users can view own subscriptions" on public.monthly_subscriptions;
create policy "Users can view own subscriptions"
  on public.monthly_subscriptions for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Users can insert own subscriptions" on public.monthly_subscriptions;
create policy "Users can insert own subscriptions"
  on public.monthly_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Users can update own subscriptions" on public.monthly_subscriptions;
create policy "Users can update own subscriptions"
  on public.monthly_subscriptions for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Admins can delete subscriptions" on public.monthly_subscriptions;
create policy "Admins can delete subscriptions"
  on public.monthly_subscriptions for delete
  to authenticated
  using (public.is_admin(auth.uid()));

create index if not exists monthly_subscriptions_user_id_idx  on public.monthly_subscriptions(user_id);
create index if not exists monthly_subscriptions_status_idx   on public.monthly_subscriptions(status);

-- ============================================================
-- F. GYM PARTNER INQUIRIES
-- ============================================================
create table if not exists public.gym_partner_inquiries (
  id                    uuid primary key default gen_random_uuid(),
  gym_name              text not null,
  owner_name            text not null,
  phone                 text not null,
  city                  text not null,
  expected_daily_orders integer,
  notes                 text,
  status                text not null default 'pending',
  created_at            timestamptz not null default now()
);

alter table public.gym_partner_inquiries enable row level security;

drop policy if exists "Admins can view gym inquiries" on public.gym_partner_inquiries;
create policy "Admins can view gym inquiries"
  on public.gym_partner_inquiries for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update gym inquiries" on public.gym_partner_inquiries;
create policy "Admins can update gym inquiries"
  on public.gym_partner_inquiries for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Insert is handled via service-role key in the backend (no anon insert policy)
create index if not exists gym_inquiries_status_idx     on public.gym_partner_inquiries(status);
create index if not exists gym_inquiries_created_at_idx on public.gym_partner_inquiries(created_at desc);

-- ============================================================
-- G. CONTACT INQUIRIES
-- ============================================================
create table if not exists public.contact_inquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text,
  message    text not null,
  status     text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.contact_inquiries enable row level security;

drop policy if exists "Admins can view contact inquiries" on public.contact_inquiries;
create policy "Admins can view contact inquiries"
  on public.contact_inquiries for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update contact inquiries" on public.contact_inquiries;
create policy "Admins can update contact inquiries"
  on public.contact_inquiries for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create index if not exists contact_inquiries_created_at_idx on public.contact_inquiries(created_at desc);

-- ============================================================
-- H. NOTIFICATIONS (with notification_type)
-- ============================================================
create table if not exists public.notifications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null,
  message           text not null,
  notification_type text not null default 'general',
  is_read           boolean not null default false,
  order_id          bigint references public.orders(id) on delete set null,
  created_at        timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "System can insert notifications" on public.notifications;
create policy "System can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (public.is_admin(auth.uid()) or auth.uid() = user_id);

create index if not exists notifications_user_id_idx   on public.notifications(user_id);
create index if not exists notifications_unread_idx    on public.notifications(user_id, is_read);
create index if not exists notifications_created_idx   on public.notifications(created_at desc);

-- ============================================================
-- I. DELIVERY TRACKING (dedicated table)
-- ============================================================
create table if not exists public.delivery_tracking (
  id                  uuid primary key default gen_random_uuid(),
  order_id            bigint not null references public.orders(id) on delete cascade,
  delivery_partner_id uuid references auth.users(id) on delete set null,
  latitude            numeric,
  longitude           numeric,
  status              text default 'assigned',
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.delivery_tracking enable row level security;

drop policy if exists "Partners can view own tracking" on public.delivery_tracking;
create policy "Partners can view own tracking"
  on public.delivery_tracking for select
  to authenticated
  using (
    delivery_partner_id = auth.uid()
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "Partners can insert tracking" on public.delivery_tracking;
create policy "Partners can insert tracking"
  on public.delivery_tracking for insert
  to authenticated
  with check (
    delivery_partner_id = auth.uid()
    or public.is_admin(auth.uid())
  );

drop policy if exists "Partners can update own tracking" on public.delivery_tracking;
create policy "Partners can update own tracking"
  on public.delivery_tracking for update
  to authenticated
  using (
    delivery_partner_id = auth.uid()
    or public.is_admin(auth.uid())
  )
  with check (
    delivery_partner_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create index if not exists delivery_tracking_order_id_idx   on public.delivery_tracking(order_id);
create index if not exists delivery_tracking_partner_id_idx on public.delivery_tracking(delivery_partner_id);
create index if not exists delivery_tracking_updated_idx    on public.delivery_tracking(updated_at desc);

-- Auto-update updated_at
create or replace function public.update_delivery_tracking_timestamp()
  returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists delivery_tracking_updated_at on public.delivery_tracking;
create trigger delivery_tracking_updated_at
  before update on public.delivery_tracking
  for each row execute function public.update_delivery_tracking_timestamp();

-- ============================================================
-- J. AUDIT LOGS
-- ============================================================
create table if not exists public.audit_logs (
  id          bigint generated by default as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  action      text not null,
  table_name  text not null,
  record_id   text,
  old_values  jsonb,
  new_values  jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs"
  on public.audit_logs for select
  to authenticated
  using (public.is_admin(auth.uid()));

create index if not exists audit_logs_user_id_idx    on public.audit_logs(user_id);
create index if not exists audit_logs_table_idx      on public.audit_logs(table_name);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

-- ============================================================
-- K. DB TRIGGERS — Automatic notifications on order events
-- ============================================================

-- Trigger function: notify on order status change
create or replace function public.notify_on_order_status_change()
  returns trigger language plpgsql security definer as $$
declare
  v_title   text;
  v_message text;
  v_type    text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  case new.status
    when 'Placed' then
      v_title   := 'Order Placed!';
      v_message := 'Your NutriBlend order has been placed successfully.';
      v_type    := 'order_placed';
    when 'Preparing' then
      v_title   := 'Order Being Prepared';
      v_message := 'Your order is now being freshly prepared for you.';
      v_type    := 'order_preparing';
    when 'Ready for Pickup' then
      v_title   := 'Order Ready!';
      v_message := 'Your order is ready and will be dispatched shortly.';
      v_type    := 'order_ready';
    when 'Out for Delivery' then
      v_title   := 'Out for Delivery!';
      v_message := 'Your order is on the way. Track it live from your orders.';
      v_type    := 'out_for_delivery';
    when 'Delivered' then
      v_title   := 'Order Delivered!';
      v_message := 'Your NutriBlend order has been delivered. Enjoy!';
      v_type    := 'delivered';
    when 'Cancelled' then
      v_title   := 'Order Cancelled';
      v_message := 'Your order has been cancelled. Contact us if needed.';
      v_type    := 'order_cancelled';
    else
      return new;
  end case;

  if new.user_id is not null then
    insert into public.notifications (user_id, title, message, notification_type, order_id)
    values (new.user_id, v_title, v_message, v_type, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_order_status_notification on public.orders;
create trigger trg_order_status_notification
  after update of status on public.orders
  for each row execute function public.notify_on_order_status_change();

-- Trigger function: notify on payment confirmed
create or replace function public.notify_on_payment_confirmed()
  returns trigger language plpgsql security definer as $$
begin
  if new.payment_status is not distinct from old.payment_status then
    return new;
  end if;

  if new.payment_status = 'Paid' and new.user_id is not null then
    insert into public.notifications (user_id, title, message, notification_type, order_id)
    values (
      new.user_id,
      'Payment Confirmed!',
      'Your payment was successful and your order is being processed.',
      'payment_success',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payment_notification on public.orders;
create trigger trg_payment_notification
  after update of payment_status on public.orders
  for each row execute function public.notify_on_payment_confirmed();

-- Trigger function: notify on new order
create or replace function public.notify_on_new_order()
  returns trigger language plpgsql security definer as $$
begin
  if new.user_id is not null then
    insert into public.notifications (user_id, title, message, notification_type, order_id)
    values (
      new.user_id,
      'Order Received!',
      'Thank you for ordering from NutriBlend. Your order is being confirmed.',
      'order_placed',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_new_order_notification on public.orders;
create trigger trg_new_order_notification
  after insert on public.orders
  for each row execute function public.notify_on_new_order();

-- ============================================================
-- L. ENABLE REALTIME for notifications and delivery_tracking
-- ============================================================
-- Run from Supabase Dashboard > Database > Replication if not done via SQL:
-- alter publication supabase_realtime add table public.notifications;
-- alter publication supabase_realtime add table public.delivery_tracking;
