# NutriBlend

NutriBlend is a React and Vite nutrition ordering app for protein shakes, whey products, pre-workout products, saved delivery addresses, cart checkout, COD or Razorpay-style online payment flow, and an admin dashboard backed by Supabase.

## Features

- Supabase authentication with profile completion flow.
- Product listing with search, category filters, sorting, loading skeletons, and product detail pages.
- Local-storage cart with quantity updates, item removal, clear-cart support, and animated cart feedback.
- Saved address book with add, edit, delete, select, and search.
- Checkout flow for Cash on Delivery and Razorpay online payment.
- Order history page for customers.
- Admin-only dashboard with order metrics and Recharts visualizations.
- Notification bell and in-app success, error, and info messages.
- Express backend with security middleware, rate limiting, Supabase service access, and Razorpay helpers.

## Tech Stack

- Frontend: React 19, Vite, JavaScript, CSS
- Backend: Node.js, Express 5
- Database/auth: Supabase
- Payments: Razorpay
- Charts: Recharts
- Icons: lucide-react, react-icons
- Tooling: ESLint

## Project Structure

```text
nutriblend/
  backend/
    server.js
    src/
      app.js
      config/
      controllers/
      middleware/
      routes/
      services/
      utils/
  public/
    products/
  src/
    components/
    context/
    data/
    pages/
    styles/
    supabase/
    App.jsx
    App.css
    index.css
    main.jsx
```

## Prerequisites

- Node.js 18 or newer
- npm
- Supabase project
- Razorpay account and test keys, if using online payments

## Environment Variables

The backend validates these variables on startup:

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

The frontend Supabase client uses Vite variables, which must be available during the frontend build:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

`VITE_SUPABASE_KEY` is also supported for compatibility with older local `.env` files.

## Installation

Install frontend dependencies:

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

Start the backend from `backend/`:

```bash
npm run dev
```

Frontend default URL:

```text
http://localhost:5173
```

Backend default URL:

```text
http://localhost:5000
```

Health check:

```text
GET http://localhost:5000/health
```

## Available Scripts

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
```

## App Flow

1. User logs in through Supabase.
2. If the user profile is missing, the app shows the complete-profile page.
3. Authenticated users can browse products, search, filter, sort, and view product details.
4. Users add products to the cart and choose a saved delivery address.
5. Users choose COD or online payment.
6. Orders are saved and visible in the Orders page.
7. Admin users can access the dashboard after passing the admin-role check.

## Styling Notes

- `src/index.css` contains global tokens and base browser resets.
- `src/pages/Login.css` contains authentication/profile screen styles.
- `src/styles/components.css` contains shared component and page enhancements.
- `src/App.css` is organized by JSX owner comments, for example `src/components/Navbar.jsx` or `src/pages/Cart.jsx`, so each style block is easier to trace.

## Build

Create a production frontend build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deployment

The repository includes `vercel.json`, so the frontend can be deployed to Vercel. Add the frontend variables above in Vercel project settings for Production, Preview, and Development as needed, then redeploy so Vite can bake them into the built assets. The Express backend can be deployed separately or adapted to the existing backend API entry points. Make sure all required backend environment variables are configured in the deployment platform.

## Security Notes

- Do not expose Supabase service role keys in frontend code. Only use the Supabase anon or publishable key for `VITE_SUPABASE_ANON_KEY`.
- Keep Razorpay secrets only on the backend.
- Use Supabase Row Level Security policies for profiles, products, and orders.
- Restrict admin routes with authenticated sessions and role checks.

## Future Improvements

- Add automated tests for cart, checkout, and admin authorization.
- Replace hardcoded Razorpay public key in the payment page with an environment value.
- Add product management screens for admin users.
