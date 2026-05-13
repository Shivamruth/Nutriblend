import express from "express";
import {
  createOrder,
  getMyOrders,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
  verifyPayment,
} from "../controllers/order.controller.js";

import { handleRazorpayWebhook } from "../controllers/webhook.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";

const router = express.Router();

// Create COD / Razorpay order
router.post("/create-order", authMiddleware, createOrder);

// Verify Razorpay Standard Checkout payment from frontend success handler
router.post("/verify-payment", authMiddleware, verifyPayment);

// Razorpay server-to-server webhook.
// Do NOT add authMiddleware here because Razorpay will not send your app auth token.
router.post("/webhook", handleRazorpayWebhook);

// Customer orders
router.get("/my-orders", authMiddleware, getMyOrders);

// Admin routes
router.get(
  "/admin/orders",
  authMiddleware,
  adminMiddleware,
  getAllOrdersAdmin
);

router.patch(
  "/admin/orders/:id/status",
  authMiddleware,
  adminMiddleware,
  updateOrderStatusAdmin
);

export default router;