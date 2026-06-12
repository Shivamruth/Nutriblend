# NutriBlend Updates Needed

This file lists recommended next updates after the latest project audit. The app currently lints, builds, and runs locally, but these improvements will make it more production-ready, easier to maintain, and safer for real orders.

## High Priority

### 1. Add Supabase schema or migration files

The project depends on Supabase tables such as `profiles`, `products`, `plans`, `addresses`, and `orders`, but the repository does not include SQL schema or migration files.

Recommended update:

- Add a `supabase/schema.sql` or `supabase/migrations/` folder.
- Document required columns, indexes, default values, and Row Level Security policies.
- Include seed data for products and plans.

Why it matters:

New deployments and future fixes will be much easier because the database structure will be versioned with the code.

### 2. Add Row Level Security policy documentation

Customer data like addresses and orders must be protected through Supabase RLS.

Recommended update:

- Customers should only read/write their own profiles, addresses, and orders.
- Admin users should access admin dashboard data only when `profiles.role = 'admin'`.
- Product and plan reads can be public to authenticated users, while product/plan writes should be admin-only.

Why it matters:

Frontend checks alone are not enough for security. Database-level policies protect data even if someone calls Supabase directly.

### 3. Replace browser alerts with app notifications

Some pages still use `alert()` and `window.confirm()`.

Recommended update:

- Use the existing notification context for success/error messages.
- Add a reusable confirm modal for delete, cancel order, and clear cart actions.

Why it matters:

The app will feel more polished and consistent, especially on mobile.

### 4. Add backend payment reconciliation

The payment flow now verifies Razorpay success from the frontend, but production apps should also support server-side webhook reconciliation.

Recommended update:

- Add a Razorpay webhook endpoint.
- Verify webhook signatures.
- Update order payment status from trusted server-to-server events.
- Log webhook events for debugging.

Why it matters:

If a customer closes the browser after payment, a webhook can still update the order correctly.

## Medium Priority

### 5. Add automated tests

The project currently relies on manual verification.

Recommended update:

- Add frontend tests for cart, checkout validation, address forms, and order views.
- Add backend tests for order creation, payment verification, auth middleware, and admin routes.
- Add at least one end-to-end checkout smoke test.

Why it matters:

Tests will catch regressions before deployment.

### 6. Split large production chunks

The build passes, but Vite reports a large JavaScript chunk warning.

Recommended update:

- Dynamically import heavier pages such as Admin, Orders, and Profile.
- Lazy-load `jspdf`, Recharts, and admin-only components.
- Use route/page-level code splitting.

Why it matters:

Smaller initial bundles improve first load speed, especially on mobile networks.

### 7. Add backend lint script

The root lint command works, but the backend package itself has no lint script.

Recommended update:

- Add a backend lint script or rely only on root lint and document that clearly.
- Consider adding backend-specific ESLint config if backend rules diverge later.

Why it matters:

Makes backend verification clearer for contributors and deployment checks.

### 8. Move static plan data fully into Supabase

Plans exist in Supabase-powered Home flow, but `src/pages/Plans.jsx` still contains hardcoded plan data.

Recommended update:

- Fetch plans from Supabase in `Plans.jsx`.
- Reuse the same plan formatting used on Home.
- Keep one source of truth for prices, names, and plan details.

Why it matters:

Admin plan updates should affect every plan view without code changes.

## Low Priority

### 9. Improve checkout loading and failure states

Checkout has validation and notifications, but some failure states could be clearer.

Recommended update:

- Add clearer retry UI when backend order creation fails.
- Show payment verification progress after Razorpay success.
- Add better messages for expired sessions.

Why it matters:

Checkout is the most sensitive user flow. Clear state messaging reduces confusion.

### 10. Add an error boundary

React errors currently can break the visible app screen.

Recommended update:

- Add a reusable `ErrorBoundary` component around the app shell.
- Show a friendly fallback with a refresh button.

Why it matters:

Users get a recoverable screen instead of a blank or crashed page.

### 11. Add image and asset guidelines

Product images are stored in `public/products/`, but there is no asset guide.

Recommended update:

- Document recommended dimensions, file naming, and compression.
- Add fallback rules for missing product images.

Why it matters:

Keeps the store visually consistent as products are added.

### 12. Improve README with real deployment URL

The README explains local and Vercel deployment, but it does not include the live website URL.

Recommended update:

- Add the production website link once final deployment is confirmed.
- Add backend API deployment URL if separate from frontend.

Why it matters:

Anyone opening the repository can quickly find and test the live app.

## Resolved Updates Summary & Status

| Step | Recommendation | Status | Notes |
|:---:|:---|:---:|:---|
| 1 | Supabase schema / migrations | **Completed** | Scripts placed under root `supabase/schema.sql` and `supabase/seed.sql` |
| 2 | RLS policy documentation | **Completed** | Policies documented and scripted under root `supabase/rls_policies.sql` |
| 3 | Replace alerts/confirms | **Completed** | Custom `ConfirmModal` used across customer and admin views |
| 4 | Backend payment reconciliation | **Completed** | Webhook controller and route fully implemented in the backend |
| 5 | Automated tests | **Pending** | Skipped for separate testing efforts |
| 6 | Split large production chunks | **Completed** | Rollup manualChunks configuration and route-level lazy loading implemented |
| 7 | Backend lint script | **Completed** | ESLint script added in `backend/package.json` |
| 8 | Move plans data to Supabase | **Completed** | `Plans.jsx` and `MonthlyPlans.jsx` fetch active plans dynamically |
| 9 | Checkout loading/failure states | **Completed** | Polished with loading overlays and clear failure states |
| 10 | Error boundary | **Completed** | React `ErrorBoundary` wrapper wrapped around main page container |
| 11 | Image & asset guidelines | **Completed** | Asset specification created at `public/products/README.md` |
| 12 | README with live URL | **Completed** | Main project README updated with the Vercel deployment URL |

---

## Additional Resolved Issues

### Missing Auth Headers on Inquiries
- **Issue**: The `Contact.jsx` and `GymPartner.jsx` forms were failing with 401 Unauthorized errors because they called routes protected by `authMiddleware` without sending the `Authorization: Bearer <token>` header.
- **Resolution**: Updated both components to retrieve the active session token using the Supabase client and append it to the fetch headers.


