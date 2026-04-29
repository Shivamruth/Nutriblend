import { createRazorpayOrder } from '../services/razorpay.service.js';
import { saveOrderToDb, getUserOrders, supabase } from '../services/supabase.service.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';

export const createOrder = async (req, res, next) => {
  try {
    const { amount, items, address, userId, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      throw new ApiError(400, 'Invalid amount');
    }

    if (!paymentMethod || !['Online', 'COD'].includes(paymentMethod)) {
      throw new ApiError(400, 'Invalid payment method');
    }

    let rzpOrder = null;
    let orderData = {
      user_id: userId,
      items,
      address,
      payment_method: paymentMethod,
      total: amount,
      status: 'pending',
      payment_status: 'pending',
    };

    if (paymentMethod === 'Online') {
      const receipt = `receipt_${Date.now()}`;
      rzpOrder = await createRazorpayOrder(amount, receipt);
      orderData.razorpay_order_id = rzpOrder.id;
    } else {
      orderData.status = 'placed'; // COD is placed immediately
    }

    const dbOrder = await saveOrderToDb(orderData);

    logger.info(`Order created: ${dbOrder.id} for user ${userId} via ${paymentMethod}`);
    
    res.status(201).json({
      success: true,
      data: {
        ...rzpOrder,
        db_order_id: dbOrder.id
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await getUserOrders(req.user.id);
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllOrdersAdmin = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
