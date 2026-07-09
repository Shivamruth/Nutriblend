import dotenv from 'dotenv';
import { z } from 'zod';

// dotenv.config() is a no-op on Vercel (no .env file deployed),
// but works locally for development.
try { dotenv.config(); } catch { /* ignore */ }

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  VERCEL_PROJECT_NAME: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  // Throw instead of process.exit() so Vercel can report the error
  throw new Error('Missing required environment variables. Check Vercel dashboard → Settings → Environment Variables.');
}

export const env = parsedEnv.data;
