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

    // For Online payments, create Razorpay order first
    if (paymentMethod === 'Online') {
      const receipt = `receipt_${Date.now()}`;
      rzpOrder = await createRazorpayOrder(amount, receipt);
      orderData.razorpay_order_id = rzpOrder.id;
    } else {
      orderData.status = 'placed'; // COD is placed immediately
    }

    // Try saving to DB, but don't let DB failure block Razorpay payments
    let dbOrder = null;
    try {
      dbOrder = await saveOrderToDb(orderData);
      logger.info(`Order saved to DB: ${dbOrder.id} for user ${userId} via ${paymentMethod}`);
    } catch (dbError) {
      logger.warn(`DB save failed (order will be saved client-side): ${dbError.message}`);
      // For COD without DB, we still need to return success so frontend can save client-side
      if (paymentMethod === 'COD') {
        return res.status(201).json({
          success: true,
          data: { db_saved: false },
          message: 'Order created but DB save deferred to client',
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        ...rzpOrder,
        db_order_id: dbOrder?.id || null,
        db_saved: !!dbOrder,
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

export const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      'Placed',
      'Preparing',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
    ];

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status',
        allowedStatuses,
      });
    }

    const orderId = Number(id);

    if (Number.isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select('*');

    if (error) {
      console.error('Supabase status update error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to update order status',
        error: error.message,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: data[0],
    });
  } catch (err) {
    console.error('Server error while updating order status:', err);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message,
    });
  }
};
