import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

export const createRazorpayOrder = async (amount, receipt) => {
  return await razorpay.orders.create({
    amount: amount * 100, // in paise
    currency: 'INR',
    receipt,
  });
};

export const verifyWebhookSignature = (rawBody, signature) => {
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return expectedSignature === signature;
};
