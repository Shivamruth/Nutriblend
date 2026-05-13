import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "../config/env.js";

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

export const createRazorpayOrder = async ({ amount, currency = "INR", receipt }) => {
  const amountInPaise = Number(amount);

  if (!amountInPaise || amountInPaise < 100) {
    throw new Error("Minimum Razorpay amount is 100 paise");
  }

  return razorpay.orders.create({
    amount: amountInPaise,
    currency,
    receipt,
  });
};

export const verifyRazorpaySignature = ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return expectedSignature === razorpay_signature;
};