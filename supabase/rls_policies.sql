-- =========================================================
-- NutriBlend — Supabase Row Level Security Policies
-- File: supabase/rls_policies.sql
-- =========================================================

-- =========================================================
-- 1. PROFILES
-- =========================================================
alter table public.profiles enable row level security;

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

-- =========================================================
-- 2. PRODUCTS
-- =========================================================
alter table public.products enable row level security;

drop policy if exists "Anyone authenticated can view active products" on public.products;
create policy "Anyone authenticated can view active products"
on public.products
for select
to authenticated
using (
  (is_active = true or public.is_admin(auth.uid()))
  and deleted_at is null
);

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

-- =========================================================
-- 3. PLANS
-- =========================================================
alter table public.plans enable row level security;

drop policy if exists "Anyone authenticated can view active plans" on public.plans;
create policy "Anyone authenticated can view active plans"
on public.plans
for select
to authenticated
using (
  (is_active = true or public.is_admin(auth.uid()))
  and deleted_at is null
);

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

-- =========================================================
-- 4. ADDRESSES
-- =========================================================
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

-- =========================================================
-- 5. ORDERS
-- =========================================================
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

-- =========================================================
-- 6. MONTHLY SUBSCRIPTIONS
-- =========================================================
alter table public.monthly_subscriptions enable row level security;

drop policy if exists "Users can view own subscriptions" on public.monthly_subscriptions;
create policy "Users can view own subscriptions"
on public.monthly_subscriptions
for select
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Users can insert own subscriptions" on public.monthly_subscriptions;
create policy "Users can insert own subscriptions"
on public.monthly_subscriptions
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Users can update own subscriptions" on public.monthly_subscriptions;
create policy "Users can update own subscriptions"
on public.monthly_subscriptions
for update
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Admins can delete subscriptions" on public.monthly_subscriptions;
create policy "Admins can delete subscriptions"
on public.monthly_subscriptions
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- =========================================================
-- 7. GYM PARTNER INQUIRIES
-- =========================================================
alter table public.gym_partner_inquiries enable row level security;

drop policy if exists "Admins can view gym inquiries" on public.gym_partner_inquiries;
create policy "Admins can view gym inquiries"
on public.gym_partner_inquiries
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update gym inquiries" on public.gym_partner_inquiries;
create policy "Admins can update gym inquiries"
on public.gym_partner_inquiries
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- =========================================================
-- 8. CONTACT INQUIRIES
-- =========================================================
alter table public.contact_inquiries enable row level security;

drop policy if exists "Admins can view contact inquiries" on public.contact_inquiries;
create policy "Admins can view contact inquiries"
on public.contact_inquiries
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update contact inquiries" on public.contact_inquiries;
create policy "Admins can update contact inquiries"
on public.contact_inquiries
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- =========================================================
-- 9. NOTIFICATIONS
-- =========================================================
alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "System can insert notifications" on public.notifications;
create policy "System can insert notifications"
on public.notifications
for insert
to authenticated
with check (public.is_admin(auth.uid()) or auth.uid() = user_id);

-- =========================================================
-- 10. DELIVERY TRACKING
-- =========================================================
alter table public.delivery_tracking enable row level security;

drop policy if exists "Partners can view own tracking" on public.delivery_tracking;
create policy "Partners can view own tracking"
on public.delivery_tracking
for select
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
on public.delivery_tracking
for insert
to authenticated
with check (
  delivery_partner_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "Partners can update own tracking" on public.delivery_tracking;
create policy "Partners can update own tracking"
on public.delivery_tracking
for update
to authenticated
using (
  delivery_partner_id = auth.uid()
  or public.is_admin(auth.uid())
)
with check (
  delivery_partner_id = auth.uid()
  or public.is_admin(auth.uid())
);

-- =========================================================
-- 11. RAZORPAY WEBHOOK EVENTS
-- =========================================================
alter table public.razorpay_webhook_events enable row level security;

drop policy if exists "Admins can view webhook events" on public.razorpay_webhook_events;
create policy "Admins can view webhook events"
on public.razorpay_webhook_events
for select
to authenticated
using (public.is_admin(auth.uid()));

-- =========================================================
-- 12. AUDIT LOGS
-- =========================================================
alter table public.audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs"
on public.audit_logs
for select
to authenticated
using (public.is_admin(auth.uid()));
