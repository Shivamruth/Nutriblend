# NutriBlend Updates

Current update pass: 2026-06-21.

## Completed in this pass

- Restored an admin role check inside the admin dashboard route so direct visits and stale sessions verify `profiles.role = 'admin'` before loading order data.
- Removed the stale React Hooks ESLint suppression in `NotificationContext.jsx` by making the toast notifier callback stable and using it as a dependency.
- Changed PDF invoice generation to load `jspdf` only when a customer downloads an invoice instead of bundling it into the orders route up front.
- Tightened backend CORS so configured origins are allowed explicitly and Vercel preview access is limited to `VERCEL_PROJECT_NAME` instead of every `*.vercel.app` site.
- Removed the unused frontend `razorpay` package from the root app dependencies. Razorpay remains installed in `backend/`, where the Node SDK is actually used.

## Recommended next updates

### High priority

1. Add smoke tests for checkout and admin order management.
   Cover COD order creation, Razorpay order creation, payment verification, order status updates, and unauthorized admin access.

2. Add a production environment checklist.
   Document required frontend, backend, Supabase, Razorpay, CORS, and webhook variables in one deployment checklist.

3. Verify CORS settings in Vercel.
   Set `FRONTEND_URL` to the production frontend URL. Add comma-separated extras in `CORS_ALLOWED_ORIGINS` only when needed. Set `VERCEL_PROJECT_NAME` if preview deployments should call the API.

### Medium priority

4. Add order pagination in the admin dashboard.
   The dashboard currently limits order fetches to 100. Add explicit paging or infinite loading before order volume grows.

5. Improve PDF invoice resilience.
   Show a toast if invoice generation fails and consider adding business tax/GST fields if needed for production invoices.

6. Add CI checks.
   Run root lint, backend lint, frontend build, and future tests on every pull request.

### Low priority

7. Clean mojibake characters in comments and labels.
   Several files contain garbled characters from older encoding issues. The app works, but cleaning them will make maintenance easier.

8. Review vendor chunk sizing periodically.
   The current build is split below Vite warning limits. Keep an eye on chunk sizes as dependencies are added.