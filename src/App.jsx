import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase/Client";

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

const getInitialRoute = () => {
  const trackMatch = window.location.pathname.match(/^\/track-order\/([^/]+)/);

  if (trackMatch?.[1]) {
    return {
      page: "track-order",
      orderId: decodeURIComponent(trackMatch[1]),
    };
  }

  if (window.location.pathname === "/delivery-partner") {
    return { page: "delivery-partner", orderId: "" };
  }

  return { page: "home", orderId: "" };
};

export default function App() {
  const initialRoute = getInitialRoute();
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [profile, setProfile] = useState(null);

  const [page, setPage] = useState(initialRoute.page);
  const [trackOrderId, setTrackOrderId] = useState(initialRoute.orderId);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [, setAddress] = useState(null);
  const [payment, setPayment] = useState("");
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const historyReadyRef = useRef(false);

  const loadCart = useCallback(() => {
    try {
      const data = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(data);
    } catch (error) {
      console.error("Cart load error:", error);
      setCart([]);
    }
  }, []);

  const checkUser = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        console.error("Auth user error:", error?.message);
        setUser(null);
        setHasProfile(false);
        setProfile(null);
        return;
      }

      setUser(data.user);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError.message);
        setHasProfile(false);
        setProfile(null);
        return;
      }

      setHasProfile(!!profileData);
      setProfile(profileData || null);
    } catch (err) {
      console.error("checkUser failed:", err);
      setUser(null);
      setHasProfile(false);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkUser]);

  useEffect(() => {
    loadCart();

    window.addEventListener("cartUpdated", loadCart);
    window.addEventListener("storage", loadCart);

    return () => {
      window.removeEventListener("cartUpdated", loadCart);
      window.removeEventListener("storage", loadCart);
    };
  }, [loadCart]);

  const navigatePage = useCallback((nextPage, options = {}) => {
    const routeMatch = String(nextPage || "").match(/^track-order\/(.+)/);
    const targetPage = routeMatch ? "track-order" : nextPage === "login" ? "home" : nextPage;
    const nextOrderId = options.orderId || routeMatch?.[1] || "";

    setPage(targetPage);
    setTrackOrderId(targetPage === "track-order" ? String(nextOrderId) : "");

    if (!historyReadyRef.current || !window.history?.pushState) return;

    const state = {
      nutriblendPage: targetPage,
      orderId: targetPage === "track-order" ? String(nextOrderId) : "",
    };
    const url =
      targetPage === "track-order" && nextOrderId
        ? `/track-order/${encodeURIComponent(nextOrderId)}`
        : targetPage === "delivery-partner"
          ? "/delivery-partner"
        : "/";

    if (options.replace) {
      window.history.replaceState(state, "", url);
      return;
    }

    window.history.pushState(state, "", url);
  }, []);

  useEffect(() => {
    if (loading || !user || !hasProfile) {
      historyReadyRef.current = false;
      return undefined;
    }

    historyReadyRef.current = true;
    const currentUrl =
      page === "track-order" && trackOrderId
        ? `/track-order/${encodeURIComponent(trackOrderId)}`
        : page === "delivery-partner"
          ? "/delivery-partner"
        : window.location.pathname;

    window.history.replaceState(
      { nutriblendPage: page, orderId: trackOrderId },
      "",
      currentUrl
    );

    const handlePopState = (event) => {
      const previousPage = event.state?.nutriblendPage;

      if (previousPage) {
        setPage(previousPage);
        setTrackOrderId(
          previousPage === "track-order" ? String(event.state?.orderId || "") : ""
        );
        return;
      }

      setPage("home");
      setTrackOrderId("");
      window.history.replaceState(
        { nutriblendPage: "home", orderId: "" },
        "",
        "/"
      );
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasProfile, loading, page, trackOrderId, user]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setHasProfile(false);
      setProfile(null);
      navigatePage("home", { replace: true });
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
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

  const cartItemCount = cart.reduce(
    (sum, item) => sum + Number(item.qty || 1),
    0
  );
  const isAccountPage = ACCOUNT_PAGE_IDS.has(page);

  return (
    <div className="app">
      <Navbar
        page={page}
        setPage={navigatePage}
        cartItemCount={cartItemCount}
        logout={logout}
        search={search}
        setSearch={setSearch}
        profile={profile}
      />

      <ErrorBoundary key={page}>
        <Suspense fallback={<LoadingScreen />}>
          <div className="page-container" key={page}>
            {page === "home" && (
              <Home
                search={search}
                setPage={navigatePage}
                setSelectedProduct={setSelectedProduct}
              />
            )}

            {page === "cart" && <Cart setPage={navigatePage} />}
            {page === "orders" && <Orders setPage={navigatePage} />}
            {page === "track-order" && (
              <TrackOrder orderId={trackOrderId} setPage={navigatePage} />
            )}
            {page === "delivery-partner" && <DeliveryPartner setPage={navigatePage} />}
            {page === "profile" && <Profile setPage={navigatePage} />}
            {page === "plans" && <Plans setPage={navigatePage} />}
            {page === "monthly-plans" && <MonthlyPlans setPage={navigatePage} />}
            {page === "gym-partner" && <GymPartner />}
            {page === "about" && <About />}
            {page === "contact" && <Contact />}
            {page === "privacy-policy" && <PrivacyPolicy />}
            {page === "terms-conditions" && <TermsConditions />}
            {page === "refund-policy" && <RefundPolicy />}
            {page === "delivery-policy" && <DeliveryPolicy />}
            {page === "nutrition-disclaimer" && <NutritionDisclaimer />}
            {page === "notifications" && <NotificationCenter setPage={navigatePage} />}

            {page === "admin-login" && <AdminLogin setPage={navigatePage} />}
            {page === "admin" && <Admin setPage={navigatePage} />}

            {page === "product" && (
              <ProductDetails product={selectedProduct} setPage={navigatePage} />
            )}

            {page === "address" && (
              <Address setPage={navigatePage} setAddress={setAddress} />
            )}

            {page === "payment" && (
              <Payment setPage={navigatePage} setPayment={setPayment} />
            )}

            {page === "review" && (
              <ReviewOrder
                cart={cart}
                address={JSON.parse(localStorage.getItem("selectedAddress"))}
                payment={payment}
                setPage={navigatePage}
              />
            )}

            {page === "success" && <Success setPage={navigatePage} />}
            {isAccountPage && page !== "notifications" && (
              <AccountPage pageId={page} setPage={navigatePage} />
            )}
          </div>
        </Suspense>
      </ErrorBoundary>

      {page === "home" && <Footer setPage={navigatePage} />}
    </div>
  );
}
