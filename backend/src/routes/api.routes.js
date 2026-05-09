import express from 'express';
import {
  createOrder,
  getMyOrders,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
} from '../controllers/order.controller.js';

import { handleRazorpayWebhook } from '../controllers/webhook.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

const router = express.Router();

// Order creation
router.post('/create-order', authMiddleware, createOrder);

// Razorpay webhook
router.post('/webhook', handleRazorpayWebhook);

// Customer protected routes
router.get('/my-orders', authMiddleware, getMyOrders);

// Admin protected routes
router.get('/admin/orders', authMiddleware, adminMiddleware, getAllOrdersAdmin);

router.patch(
  '/admin/orders/:id/status',
  authMiddleware,
  adminMiddleware,
  updateOrderStatusAdmin
);

export default router;