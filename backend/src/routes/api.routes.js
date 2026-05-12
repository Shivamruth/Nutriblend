import express from "express";
import {
  createOrder,
  getMyOrders,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
} from "../controllers/order.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";

const router = express.Router();

router.post("/create-order", authMiddleware, createOrder);

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

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "API working",
    time: new Date().toISOString(),
  });
});

export default router;