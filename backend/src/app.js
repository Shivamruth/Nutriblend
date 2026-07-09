import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import apiRoutes from "./routes/api.routes.js";
import logger from "./utils/logger.js";

const app = express();

// Security Middlewares
app.use(helmet());

// Allow CORS from configured frontend URLs and this project's Vercel previews.
const allowedOrigins = new Set(
  [env.FRONTEND_URL, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null]
    .concat((env.CORS_ALLOWED_ORIGINS || "").split(","))
    .map((origin) => origin?.trim())
    .filter(Boolean)
);

const getHostname = (origin) => {
  try {
    return new URL(origin).hostname;
  } catch {
    return "";
  }
};

const isAllowedVercelPreview = (origin) => {
  if (!env.VERCEL_PROJECT_NAME) return false;

  const hostname = getHostname(origin);
  return (
    hostname === `${env.VERCEL_PROJECT_NAME}.vercel.app` ||
    (hostname.startsWith(`${env.VERCEL_PROJECT_NAME}-`) && hostname.endsWith(".vercel.app"))
  );
};

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin: mobile apps, Postman, curl, etc.
      if (!origin) return cb(null, true);

      // Allow configured origins and previews for the configured Vercel project only.
      if (allowedOrigins.has(origin) || isAllowedVercelPreview(origin)) {
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

// Main API Routes
app.use("/api", apiRoutes);

// Error Handling
app.use(errorHandler);

export default app;
