import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Alias with semantic name for admin/service-role operations
export const supabaseAdmin = supabase;

export const saveOrderToDb = async (orderData) => {
  const { data, error } = await supabase
    .from("orders")
    .insert([orderData])
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateOrderStatus = async (
  razorpayOrderId,
  status,
  paymentStatus,
  extraFields = {}
) => {
  const { data, error } = await supabase
    .from("orders")
    .update({
      status,
      payment_status: paymentStatus,
      ...extraFields,
    })
    .eq("razorpay_order_id", razorpayOrderId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const getUserOrders = async (userId) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

export const saveGymInquiry = async (inquiryData) => {
  const { data, error } = await supabase
    .from("gym_partner_inquiries")
    .insert([inquiryData])
    .select("*")
    .single();

  if (error) throw error;
  return data;
};

export const saveContactInquiry = async (inquiryData) => {
  const { data, error } = await supabase
    .from("contact_inquiries")
    .insert([inquiryData])
    .select("*")
    .single();

  if (error) throw error;
  return data;
};

export const createSubscription = async (subscriptionData) => {
  const { data, error } = await supabase
    .from("monthly_subscriptions")
    .insert([subscriptionData])
    .select("*")
    .single();

  if (error) throw error;
  return data;
};

export const insertDeliveryTracking = async (trackingData) => {
  const { data, error } = await supabase
    .from("delivery_tracking")
    .insert([trackingData])
    .select("*")
    .single();

  if (error) throw error;
  return data;
};

export const updateDeliveryTracking = async (orderId, partnerId, payload) => {
  const { data, error } = await supabase
    .from("delivery_tracking")
    .update(payload)
    .eq("order_id", orderId)
    .eq("delivery_partner_id", partnerId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const auditLog = async ({ userId, action, tableName, recordId, oldValues, newValues }) => {
  await supabase.from("audit_logs").insert([{
    user_id: userId || null,
    action,
    table_name: tableName,
    record_id: recordId ? String(recordId) : null,
    old_values: oldValues || null,
    new_values: newValues || null,
  }]);
};