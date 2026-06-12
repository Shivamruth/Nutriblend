# NutriBlend

NutriBlend is a React, Vite, Supabase, Express, and Razorpay nutrition ordering app. It supports customer authentication, profile completion, product and plan browsing, cart checkout, saved delivery addresses, Cash on Delivery, online Razorpay payment flow, order tracking, invoices, and an admin dashboard for managing orders, products, plans, and stock.

## Project Status

Latest local audit:

- Frontend lint passes with `npm run lint`.
- Backend lint can be run from `backend/` with `npm run lint`.
- Production frontend build passes with `npm run build`.
- Local frontend responds at `http://127.0.0.1:5173`.
- Live deployment: `https://nutriblend-1ur614igw-aipo-shivamruth.vercel.app/`.
- Full browser checkout testing still requires valid Supabase users, database tables, and Razorpay test credentials.

## What Was Updated

- Fixed Razorpay amount handling.
  Razorpay expects the order amount in paise. The backend now converts the rupee total to paise before creating a Razorpay order.

- Added the missing payment verification controller.
  The backend route `/api/verify-payment` was already registered, but the controller export was missing. The endpoint now verifies Razorpay signatures and marks matching orders as paid.

- Connected frontend online payment verification.
  After Razorpay success, the frontend now calls `/api/verify-payment` before showing the success page.

- Moved Razorpay public key to environment support.
  The payment page now reads `VITE_RAZORPAY_KEY_ID` and keeps the existing test key only as a fallback for older local setups.

- Fixed cart hook declaration and lint issues.
  The cart loader is now declared before it is used by effects, callback dependencies are stable, and unused backend imports were removed.

- Cleaned project lint configuration for this app structure.
  Provider files in this project export both providers and hooks, which is a common React pattern. ESLint now allows that pattern.

- Rebuilt this README from start to end.
  The README now documents setup, scripts, environment variables, flows, API routes, database expectations, deployment, and verification.

## Tech Stack

- Frontend: React 19, Vite, JavaScript, CSS
- Backend: Node.js, Express 5
- Auth and database: Supabase
- Payments: Razorpay
- Charts: Recharts
- PDF invoices: jsPDF
- Icons: lucide-react, react-icons, emoji labels
- Tooling: ESLint, npm
- Deployment config: Vercel

## Main Features

- Supabase email authentication.
- Profile completion before customers enter the store.
- Product listing from Supabase with search, filtering, sorting, stock badges, and product detail pages.
- Subscription plans shown alongside normal products.
- Local-storage cart with quantity updates, item removal, clear cart, stock synchronization, price-change checks, and checkout blocking for unavailable items.
- Saved address book with add, edit, delete, default address, search, and selected-address persistence.
- Checkout flow with delivery options, instructions, COD, and Razorpay online payment.
- Order success page with order tracking reference.
- Customer order history with filters, search, reorder, cancellation before preparation, and PDF invoice download.
- Admin login and admin dashboard with revenue/order analytics, filters, CSV export, status updates, product management, plan management, stock control, and active/hidden toggles.
- Express backend with Helmet, CORS, Morgan logging, rate limiting, auth middleware, admin middleware, Razorpay helper service, and Supabase service access.
- Lazy-loaded app pages with Vite vendor chunk splitting for smaller production route bundles.

## Project Structure

```text
nutriblend/
  backend/
    api/
      index.js
    src/
      app.js
      config/
      controllers/
      middleware/
      routes/
      services/
      utils/
    package.json
    server.js
  public/
    products/
      README.md
    favicon.svg
    icons.svg
  src/
    components/
    context/
    data/
    pages/
    styles/
    supabase/
    utils/
    App.jsx
    index.css
    main.jsx
  supabase/
    schema.sql
    rls_policies.sql
    seed.sql
  dist/
  index.html
  package.json
  vite.config.js
  vercel.json
```

## Prerequisites

- Node.js 18 or newer
- npm
- A Supabase project
- Razorpay test keys for online payment testing
- Vercel account if deploying with the included `vercel.json`

## Environment Variables

Create a root `.env` file for the frontend:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

`VITE_SUPABASE_KEY` is still supported as a fallback for older local files, but `VITE_SUPABASE_ANON_KEY` is preferred.

Create `backend/.env` for the backend:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, or `RAZORPAY_WEBHOOK_SECRET` in frontend code.

## Installation

Install frontend dependencies from the project root:

```bash
npm install
```

Install backend dependencies:

```bash
cd backend
npm install
```

## Running Locally

Start the frontend from the project root:

```bash
npm run dev
```

Frontend default URL:

```text
http://localhost:5173
```

Start the backend from `backend/`:

```bash
npm run dev
```

Backend default URL:

```text
http://localhost:5000
```

Backend health check:

```text
GET http://localhost:5000/health
```

The Vite dev server proxies `/api` to `http://localhost:5000`.

## Scripts

Frontend scripts from the project root:

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

Backend scripts from `backend/`:

```bash
npm start
npm run dev
npm run lint
```

## Frontend Flow

1. App starts and checks the Supabase auth user.
2. If no user exists, `Login` is shown.
3. If a user exists but has no profile row, `CompleteProfile` is shown.
4. Authenticated users enter the store.
5. Customers browse Home, filter products/plans, search, sort, view details, and add items to cart.
6. Cart syncs live product price, stock status, and active status from Supabase.
7. Checkout moves through Cart, Address, Payment, and Success.
8. Orders can be viewed, filtered, cancelled while still placed, reordered, and exported as invoices.
9. Admin users can open the admin dashboard and manage orders, products, plans, and stock.

## Backend API

All main API routes are mounted under `/api`.

**Payments & Webhooks:**
```text
POST  /api/create-order     - Create new COD or online Razorpay payment order
POST  /api/verify-payment   - Verify signature of successful Razorpay payments
POST  /api/webhook          - Server-to-server Razorpay webhook listener
```

**Customer Orders & Inquiries:**
```text
GET   /api/my-orders        - List order history for the current user
POST  /api/inquiries/gym    - Submit gym partner collaboration inquiry
POST  /api/inquiries/contact- Submit customer service inquiry
```

**Delivery Partner Routes:**
```text
GET   /api/delivery/my-assignments              - List delivery assignments
POST  /api/delivery/tracking                   - Push current GPS coordinates
PATCH /api/delivery/assignments/:orderId/status - Update delivery status
```

**Admin Control Panel:**
```text
GET   /api/admin/orders                         - List all orders
PATCH /api/admin/orders/:id/status              - Update preparation/delivery status
PATCH /api/admin/orders/:id/assign-partner      - Assign delivery partner to order
GET   /api/admin/delivery-partners              - List registered delivery partners
```

**Health check:**
```text
GET /health
```

Authenticated routes require a Supabase access token in the `Authorization` header:

```text
Authorization: Bearer <supabase_access_token>
```

Admin and delivery partner routes also require the authenticated user's profile role to match `admin` or `delivery_partner` respectively.

## Database Setup & Expectations

The root-level `supabase/` directory contains all SQL scripts required to instantiate and populate the Supabase database instance:

1. **`supabase/schema.sql`**: Creates the 12 tables used by the application, setups indexes, and attaches real-time event triggers for customer notifications.
2. **`supabase/rls_policies.sql`**: Hardens access control. Customers can only read/write their own records, delivery partners can view/update assigned orders, and admins hold full CRUD privileges.
3. **`supabase/seed.sql`**: Loads default products and subscription plans matching public images and tags.

To apply these scripts:
- Open your Supabase Dashboard.
- Navigate to the **SQL Editor** tab.
- Copy and run the contents of `supabase/schema.sql`, `supabase/rls_policies.sql`, and `supabase/seed.sql` in that order.

## Payment Flow

COD:

1. Frontend validates cart, address, user, and stock.
2. Frontend calls `/api/create-order`.
3. If the backend is unavailable, the frontend falls back to direct Supabase insert for COD.
4. Cart is cleared and the Success page is shown.

Online payment:

1. Frontend validates cart, address, user, and stock.
2. Frontend calls `/api/create-order`.
3. Backend creates a Razorpay order and saves the pending order when possible.
4. Razorpay checkout opens.
5. On successful payment, frontend calls `/api/verify-payment`.
6. Backend verifies the Razorpay signature and updates payment status to `Paid`.
7. Cart is cleared and the Success page is shown.

## Admin Flow

Admins are detected through the `profiles.role` value.

Admin features:

- View dashboard metrics.
- Filter dashboard by date ranges.
- Search and filter orders.
- Update order status.
- Export filtered orders as CSV.
- View detailed order modal.
- Manage products.
- Manage subscription plans.
- Toggle product visibility.
- Update stock status.

## Product Images

Product images live in `public/products/`. The helper `src/utils/productImages.js` maps product names to local image files and falls back to an embedded NutriBlend SVG if no image matches.

Use public paths such as:

```text
/products/20gWhey.webp
/products/BasicPre.webp
```

## Styling

Global and page-specific styles are organized under `src/styles/`.

Important files:

- `src/index.css`: global CSS variables and resets
- `src/styles/app.css`: app shell and loading screen
- `src/styles/home.css`: store home and product sections
- `src/styles/cart.css`: cart and checkout bag
- `src/styles/address.css`: address book
- `src/styles/payment.css`: checkout payment page
- `src/styles/orders.css`: order history
- `src/styles/admin.css`: admin dashboard
- `src/pages/Login.css`: login and profile screens

## Build

Create a production frontend build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Current build note:

- The build succeeds.
- Production pages are lazy-loaded and vendor libraries are split into dedicated chunks for React, Supabase, charts, PDFs, maps, and icons.

## Deployment

The repository includes `vercel.json`.

Live URL:

```text
https://nutriblend-1ur614igw-aipo-shivamruth.vercel.app/
```

The frontend is built as a static Vite app:

```text
dist/
```

The backend API entry is:

```text
backend/api/index.js
```

Vercel rewrites:

```text
/api/(.*) -> /backend/api/index.js
/(.*)     -> /index.html
```

For deployment, configure all frontend and backend environment variables in the deployment platform. Rebuild after changing frontend `VITE_*` variables because Vite bakes them into the client bundle.

## Verification Checklist

Run before deploying:

```bash
npm run lint
npm run build
```

Then start both servers and test:

- Login and logout
- Profile completion
- Product loading
- Product detail page
- Add product to cart
- Add plan to cart
- Quantity updates
- Stock blocking
- Address add/edit/delete/default
- COD order placement
- Razorpay test payment
- Payment verification
- Success page
- Orders page
- Invoice download
- Order cancellation while status is `Placed`
- Admin login
- Admin order status update
- Product and plan management

## Known Follow-Ups

- Add automated tests for cart, checkout, payment verification, and admin authorization.
- Add backend test scripts.

## Security Notes

- Keep service role keys and payment secrets only on the backend.
- Use Supabase RLS policies for all customer-owned data.
- Confirm admin access through profile role checks.
- Use Razorpay test keys only for development.
- Configure production CORS with the deployed frontend domain.
- Do not commit real `.env` secrets.
