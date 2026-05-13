# NutriBlend Supabase Setup

This folder contains database setup for NutriBlend.

## Files

- `schema.sql` - Tables, columns, indexes, Row Level Security policies, and optional seed data.

## How to run

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Open `schema.sql`.
4. Copy and run the full SQL.
5. Confirm your admin user has `role = 'admin'` in the `profiles` table.

## Important

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
Use it only in backend environment variables.
