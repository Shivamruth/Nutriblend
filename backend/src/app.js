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

// Main API Routes
app.use("/api", apiRoutes);

// Error Handling
app.use(errorHandler);

export default app;
