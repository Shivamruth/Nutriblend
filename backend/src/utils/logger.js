import winston from 'winston';
import { env } from '../config/env.js';

const transports = [];

// Vercel serverless has a read-only filesystem, so file transports won't work.
// Always use console; only add file transports in local development.
transports.push(
  new winston.transports.Console({
    format:
      env.NODE_ENV === 'production'
        ? winston.format.combine(winston.format.timestamp(), winston.format.json())
        : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  })
);

// Add file transports only when NOT on Vercel (Vercel sets VERCEL=1)
if (!process.env.VERCEL) {
  try {
    transports.push(
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    );
  } catch { /* ignore if logs dir doesn't exist */ }
}

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'nutriblend-backend' },
  transports,
});

export default logger;
