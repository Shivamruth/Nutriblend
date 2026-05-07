import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { supabase } from "./config/supabase.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import apiRoutes from "./routes/api.routes.js";
import logger from "./utils/logger.js";

const app = express();

// Security Middlewares
app.use(helmet());

// Allow CORS from the configured frontend URL and any Vercel preview URLs
const allowedOrigins = [env.FRONTEND_URL];

if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin: mobile apps, Postman, curl, etc.
      if (!origin) return cb(null, true);

      // Allow configured origins and any *.vercel.app preview URLs
      if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        return cb(null, true);
      }

      cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Request Logging
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Body Parsers
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: true }));

// Rate Limiting
app.use("/api", apiLimiter);

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// ✅ UPDATE ORDER STATUS - ADMIN
// Keep this BEFORE app.use("/api", apiRoutes)
app.patch("/api/admin/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    logger.info(`Status update request: order ${id} -> ${status}`);

    const allowedStatuses = [
      "Placed",
      "Preparing",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
    ];

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
        allowedStatuses,
      });
    }

    const orderId = Number(id);

    if (Number.isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select("*");

    if (error) {
      logger.error("Supabase status update error:");
      logger.error(error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to update order status",
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    logger.info(`Order ${orderId} status updated to ${status}`);

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: data[0],
    });
  } catch (err) {
    logger.error("Server error while updating order status:");
    logger.error(err.message);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// Main API Routes
app.use("/api", apiRoutes);

// Error Handling
app.use(errorHandler);

export default app;