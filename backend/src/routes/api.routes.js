import express from 'express';
import { createOrder, getMyOrders, getAllOrdersAdmin } from '../controllers/order.controller.js';
import { handleRazorpayWebhook } from '../controllers/webhook.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

const router = express.Router();

router.post('/create-order', createOrder);
router.post('/webhook', handleRazorpayWebhook);

// Protected routes
router.get('/my-orders', authMiddleware, getMyOrders);

// Admin routes
router.get('/admin/orders', authMiddleware, adminMiddleware, getAllOrdersAdmin);

export default router;
