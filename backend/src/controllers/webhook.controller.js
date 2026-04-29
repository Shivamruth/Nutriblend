import { verifyWebhookSignature } from '../services/razorpay.service.js';
import { updateOrderStatus } from '../services/supabase.service.js';
import logger from '../utils/logger.js';
import { ApiError } from '../middleware/error.middleware.js';

export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    
    const isValid = verifyWebhookSignature(req.body, signature);

    if (!isValid) {
      logger.warn('Invalid Razorpay webhook signature');
      throw new ApiError(400, 'Invalid signature');
    }

    const event = req.body.event;
    const payload = req.body.payload.payment.entity;
    const razorpayOrderId = payload.order_id;

    logger.info(`Received Razorpay webhook event: ${event} for Order: ${razorpayOrderId}`);

    if (event === 'payment.captured') {
      await updateOrderStatus(razorpayOrderId, 'placed', 'paid');
      logger.info(`Order ${razorpayOrderId} marked as PAID via webhook`);
    } else if (event === 'payment.failed') {
      await updateOrderStatus(razorpayOrderId, 'failed', 'failed');
      logger.warn(`Order ${razorpayOrderId} marked as FAILED via webhook`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
};
