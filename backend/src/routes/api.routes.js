import express from "express";
import {
  createOrder,
  getMyOrders,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
  verifyPayment,
} from "../controllers/order.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";

const router = express.Router();

router.post("/create-order", authMiddleware, createOrder);

router.post("/verify-payment", authMiddleware, verifyPayment);

router.get("/my-orders", authMiddleware, getMyOrders);

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