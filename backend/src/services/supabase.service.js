import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export const saveOrderToDb = async (orderData) => {
  const { data, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateOrderStatus = async (razorpayOrderId, status, paymentStatus) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      status, 
      payment_status: paymentStatus 
    })
    .eq('razorpay_order_id', razorpayOrderId);

  if (error) throw error;
  return data;
};

export const getUserOrders = async (userId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};
