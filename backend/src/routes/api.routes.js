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
import { deliveryPartnerMiddleware } from "../middleware/delivery.middleware.js";
import { submitGymInquiry, submitContactInquiry } from "../controllers/inquiry.controller.js";
import {
  getMyAssignments,
  pushDeliveryLocation,
  updateAssignmentStatus,
  assignDeliveryPartner,
  listDeliveryPartners,
} from "../controllers/delivery.controller.js";

const router = express.Router();

// ─── Payments ────────────────────────────────────────────────────────────────
router.post("/create-order", authMiddleware, createOrder);
router.post("/verify-payment", authMiddleware, verifyPayment);
router.post("/webhook", handleRazorpayWebhook);

// ─── Customer orders ──────────────────────────────────────────────────────────
router.get("/my-orders", authMiddleware, getMyOrders);

// ─── Inquiries (authenticated users) ─────────────────────────────────────────
router.post("/inquiries/gym", authMiddleware, submitGymInquiry);
router.post("/inquiries/contact", authMiddleware, submitContactInquiry);

// ─── Delivery partner routes ──────────────────────────────────────────────────
router.get("/delivery/my-assignments", authMiddleware, deliveryPartnerMiddleware, getMyAssignments);
router.post("/delivery/tracking", authMiddleware, deliveryPartnerMiddleware, pushDeliveryLocation);
router.patch("/delivery/assignments/:orderId/status", authMiddleware, deliveryPartnerMiddleware, updateAssignmentStatus);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get("/admin/orders", authMiddleware, adminMiddleware, getAllOrdersAdmin);
router.patch("/admin/orders/:id/status", authMiddleware, adminMiddleware, updateOrderStatusAdmin);
router.patch("/admin/orders/:id/assign-partner", authMiddleware, adminMiddleware, assignDeliveryPartner);
router.get("/admin/delivery-partners", authMiddleware, adminMiddleware, listDeliveryPartners);

export default router;