import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "./supabase/Client";
import { useCart } from "./context/CartContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";

import "./styles/app.css";
import "./styles/cart-feedback.css";
import "./styles/notifications.css";

const Login = lazy(() => import("./pages/Login"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const Home = lazy(() => import("./pages/Home"));
const Cart = lazy(() => import("./pages/Cart"));
const Orders = lazy(() => import("./pages/Orders"));
const Admin = lazy(() => import("./pages/Admin"));
const Profile = lazy(() => import("./pages/Profile"));
const Address = lazy(() => import("./pages/Address"));
const Payment = lazy(() => import("./pages/Payment"));
const ReviewOrder = lazy(() => import("./pages/ReviewOrder"));
const Success = lazy(() => import("./pages/Success"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const DeliveryPartner = lazy(() => import("./pages/DeliveryPartner"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Plans = lazy(() => import("./pages/Plans"));
const MonthlyPlans = lazy(() => import("./pages/MonthlyPlans"));
const GymPartner = lazy(() => import("./pages/GymPartner"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const DeliveryPolicy = lazy(() => import("./pages/DeliveryPolicy"));
const NutritionDisclaimer = lazy(() => import("./pages/NutritionDisclaimer"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter"));
const AccountPage = lazy(() => import("./pages/AccountPage"));

const ACCOUNT_PAGE_IDS = new Set([
  "customer-care",
  "invite-friends",
  "saved-cards",
  "return-demo",
  "how-to-return",
  "promotion-terms",
  "refund-policy",
  "fees-payments",
  "who-we-are",
]);

/** Maps old page-state values to URL paths */
const PAGE_TO_PATH = {
  home: "/",
  cart: "/cart",
  orders: "/orders",
  profile: "/profile",
  plans: "/plans",
  "monthly-plans": "/monthly-plans",
  "gym-partner": "/gym-partner",
  about: "/about",
  contact: "/contact",
  "privacy-policy": "/privacy-policy",
  "terms-conditions": "/terms-conditions",
  "refund-policy": "/refund-policy",
  "delivery-policy": "/delivery-policy",
  "nutrition-disclaimer": "/nutrition-disclaimer",
  notifications: "/notifications",
  "admin-login": "/admin-login",
  admin: "/admin",
  product: "/product",
  address: "/address",
  payment: "/payment",
  review: "/review",
  success: "/success",
  "delivery-partner": "/delivery-partner",
};

const LoadingScreen = () => (
  <div className="app-loading">
    <div className="app-loading-content">
      <img
        className="app-loading-logo"
        src="/nutriblend-logo.svg"
        alt="NutriBlend"
        decoding="async"
        fetchPriority="high"
        width="96"
        height="96"
      />
      <h2>NUTRIBLEND</h2>
      <div className="app-loading-bar">
        <div className="app-loading-bar-fill" />
      </div>
    </div>
  </div>
);

// ---------- TrackOrder wrapper (reads :orderId from URL) ----------
function TrackOrderRoute({ setPage }) {
  const { orderId } = useParams();
  return <TrackOrder orderId={orderId} setPage={setPage} />;
}

// ---------- ProductDetails wrapper (reads :productId from URL) ----------
function ProductRoute({ selectedProduct, setPage }) {
  const { productId } = useParams();
  return <ProductDetails product={selectedProduct} productId={productId} setPage={setPage} />;
}

// ---------- AccountPage wrapper (reads :pageId from URL) ----------
function AccountRoute({ setPage }) {
  const { pageId } = useParams();
  if (!pageId || !ACCOUNT_PAGE_IDS.has(pageId)) return <Navigate to="/" replace />;
  return <AccountPage pageId={pageId} setPage={setPage} />;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [profile, setProfile] = useState(null);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [, setAddress] = useState(null);
  const [payment, setPayment] = useState("");
  const [search, setSearch] = useState("");

  const { cartItems } = useCart();

  // Fetch profile for a given user, return profile data or null
  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      return data || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Use onAuthStateChange as the SINGLE source of truth.
    // INITIAL_SESSION fires immediately with the cached session — no network call.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setHasProfile(false);
        setProfile(null);
        setLoading(false);
        return;
      }

      // TOKEN_REFRESHED doesn't need a profile re-fetch — just update the user object
      if (event === "TOKEN_REFRESHED") {
        if (session?.user) setUser(session.user);
        return;
      }

      // INITIAL_SESSION, SIGNED_IN
      if (!session?.user) {
        setUser(null);
        setHasProfile(false);
        setProfile(null);
        setLoading(false);
        return;
      }

      const sessionUser = session.user;
      setUser(sessionUser);

      // Fetch profile (only network call needed)
      const profileData = await fetchProfile(sessionUser.id);
      if (!mounted) return;
      setHasProfile(!!profileData);
      setProfile(profileData);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  /**
   * navigatePage — backward-compatible wrapper.
   * Pages still call setPage("cart") — this converts to navigate("/cart").
   * Supports the old track-order/xxx pattern too.
   */
  const navigatePage = useCallback(
    (nextPage, options = {}) => {
      // Handle "track-order/<id>" pattern
      const trackMatch = String(nextPage || "").match(/^track-order\/(.+)/);
      if (trackMatch) {
        navigate(`/track-order/${encodeURIComponent(trackMatch[1])}`, { replace: !!options.replace });
        return;
      }

      // Handle "track-order" with orderId in options or localStorage
      if (nextPage === "track-order") {
        const trackId = options.orderId || localStorage.getItem("trackOrderId");
        if (trackId) {
          navigate(`/track-order/${encodeURIComponent(trackId)}`, { replace: !!options.replace });
        } else {
          navigate("/orders", { replace: true });
        }
        return;
      }

      // Map page name to path
      const path = PAGE_TO_PATH[nextPage];
      if (path) {
        navigate(path, { replace: !!options.replace });
        return;
      }

      // Account pages
      if (ACCOUNT_PAGE_IDS.has(nextPage)) {
        navigate(`/account/${nextPage}`, { replace: !!options.replace });
        return;
      }

      // Fallback: treat as path segment
      navigate(`/${nextPage}`, { replace: !!options.replace });
    },
    [navigate]
  );

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setHasProfile(false);
      setProfile(null);
      navigate("/", { replace: true });
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    // Allow admin-login route even when not authenticated
    if (location.pathname === "/admin-login") {
      return (
        <Suspense fallback={<LoadingScreen />}>
          <AdminLogin setPage={navigatePage} />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<LoadingScreen />}>
        <Login />
      </Suspense>
    );
  }

  if (!hasProfile) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <CompleteProfile />
      </Suspense>
    );
  }

  const cartItemCount = cartItems.reduce(
    (sum, item) => sum + Number(item.qty || 1),
    0
  );

  const currentPath = location.pathname;
  const isHome = currentPath === "/";

  return (
    <div className="app">
      <Navbar
        page={currentPath}
        setPage={navigatePage}
        cartItemCount={cartItemCount}
        logout={logout}
        search={search}
        setSearch={setSearch}
        profile={profile}
      />

      <ErrorBoundary key={currentPath}>
        <Suspense fallback={<LoadingScreen />}>
          <div className="page-container">
            <Routes>
              <Route
                path="/"
                element={
                  <Home
                    search={search}
                    setPage={navigatePage}
                    setSelectedProduct={setSelectedProduct}
                  />
                }
              />
              <Route path="/cart" element={<Cart setPage={navigatePage} />} />
              <Route path="/orders" element={<Orders setPage={navigatePage} />} />
              <Route
                path="/track-order/:orderId"
                element={<TrackOrderRoute setPage={navigatePage} />}
              />
              <Route
                path="/delivery-partner"
                element={<DeliveryPartner setPage={navigatePage} />}
              />
              <Route path="/profile" element={<Profile setPage={navigatePage} />} />
              <Route path="/plans" element={<Plans setPage={navigatePage} />} />
              <Route
                path="/monthly-plans"
                element={<MonthlyPlans setPage={navigatePage} />}
              />
              <Route path="/gym-partner" element={<GymPartner />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-conditions" element={<TermsConditions />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/delivery-policy" element={<DeliveryPolicy />} />
              <Route path="/nutrition-disclaimer" element={<NutritionDisclaimer />} />
              <Route
                path="/notifications"
                element={<NotificationCenter setPage={navigatePage} />}
              />
              <Route
                path="/admin-login"
                element={<AdminLogin setPage={navigatePage} />}
              />
              <Route path="/admin" element={<Admin setPage={navigatePage} />} />
              <Route
                path="/product/:productId"
                element={
                  <ProductRoute selectedProduct={selectedProduct} setPage={navigatePage} />
                }
              />
              {/* Legacy /product route redirects to home */}
              <Route path="/product" element={<Navigate to="/" replace />} />
              <Route
                path="/address"
                element={<Address setPage={navigatePage} setAddress={setAddress} />}
              />
              <Route
                path="/payment"
                element={<Payment setPage={navigatePage} setPayment={setPayment} />}
              />
              <Route
                path="/review"
                element={
                  <ReviewOrder
                    cart={cartItems}
                    address={JSON.parse(localStorage.getItem("selectedAddress"))}
                    payment={payment}
                    setPage={navigatePage}
                  />
                }
              />
              <Route path="/success" element={<Success setPage={navigatePage} />} />
              <Route
                path="/account/:pageId"
                element={<AccountRoute setPage={navigatePage} />}
              />
              {/* Catch-all — redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Suspense>
      </ErrorBoundary>

      {isHome && <Footer setPage={navigatePage} />}
    </div>
  );
}
