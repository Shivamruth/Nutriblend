import crypto from "crypto";
import { env } from "../config/env.js";
import { supabase } from "../services/supabase.service.js";
import logger from "../utils/logger.js";

const WEBHOOK_EVENTS_TO_TRACK = new Set([
  "payment.captured",
  "payment.failed",
  "order.paid",
]);

const verifyWebhookSignature = (rawBody, signature) => {
  if (!rawBody || !signature || !env.RAZORPAY_WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
};

const safeInsertWebhookLog = async ({ event, payload, signature, status }) => {
  try {
    await supabase.from("razorpay_webhook_events").insert([
      {
        event,
        payload,
        razorpay_signature: signature,
        processing_status: status,
      },
    ]);
  } catch (error) {
    logger.warn(`Webhook log insert skipped: ${error.message}`);
  }
};

const getPaymentEntity = (payload) => {
  return payload?.payload?.payment?.entity || null;
};

const getOrderEntity = (payload) => {
  return payload?.payload?.order?.entity || null;
};

const updateOrderByRazorpayOrderId = async ({
  razorpayOrderId,
  paymentStatus,
  orderStatus = "Placed",
  razorpayPaymentId = null,
  failureReason = null,
}) => {
  if (!razorpayOrderId) {
    return null;
  }

  const updatePayload = {
    payment_status: paymentStatus,
    status: orderStatus,
  };

  if (razorpayPaymentId) {
    updatePayload.razorpay_payment_id = razorpayPaymentId;
  }

  if (failureReason) {
    updatePayload.cancel_reason = failureReason;
  }

  const { data, error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("razorpay_order_id", razorpayOrderId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const rawBody = req.rawBody;

  if (!signature) {
    return res.status(400).json({
      success: false,
      message: "Missing Razorpay webhook signature",
    });
  }

  const isValid = verifyWebhookSignature(rawBody, signature);

  if (!isValid) {
    logger.warn("Invalid Razorpay webhook signature");

    return res.status(400).json({
      success: false,
      message: "Invalid Razorpay webhook signature",
    });
  }

  const payload = req.body;
  const event = payload?.event;

  if (!event) {
    return res.status(400).json({
      success: false,
      message: "Missing Razorpay webhook event",
    });
  }

  if (!WEBHOOK_EVENTS_TO_TRACK.has(event)) {
    await safeInsertWebhookLog({
      event,
      payload,
      signature,
      status: "ignored",
    });

    return res.status(200).json({
      success: true,
      message: "Webhook event ignored",
      event,
    });
  }

  try {
    const payment = getPaymentEntity(payload);
    const order = getOrderEntity(payload);

    let updatedOrder = null;

    if (event === "payment.captured") {
      updatedOrder = await updateOrderByRazorpayOrderId({
        razorpayOrderId: payment?.order_id,
        paymentStatus: "Paid",
        orderStatus: "Placed",
        razorpayPaymentId: payment?.id,
      });
    }

    if (event === "payment.failed") {
      updatedOrder = await updateOrderByRazorpayOrderId({
        razorpayOrderId: payment?.order_id,
        paymentStatus: "Failed",
        orderStatus: "Placed",
        razorpayPaymentId: payment?.id,
        failureReason:
          payment?.error_description ||
          payment?.error_reason ||
          "Payment failed",
      });
    }

    if (event === "order.paid") {
      updatedOrder = await updateOrderByRazorpayOrderId({
        razorpayOrderId: order?.id,
        paymentStatus: "Paid",
        orderStatus: "Placed",
      });
    }

    await safeInsertWebhookLog({
      event,
      payload,
      signature,
      status: "processed",
    });

    logger.info(
      `Razorpay webhook processed: ${event} / order ${
        updatedOrder?.id || "N/A"
      }`
    );

    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      event,
      orderId: updatedOrder?.id || null,
    });
  } catch (error) {
    logger.error(`Webhook processing failed: ${error.message}`);

    await safeInsertWebhookLog({
      event,
      payload,
      signature,
      status: "failed",
    });

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
      error: error.message,
    });
  }
};