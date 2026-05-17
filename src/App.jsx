import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase/Client";

import Login from "./pages/Login";
import CompleteProfile from "./pages/CompleteProfile";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Address from "./pages/Address";
import Payment from "./pages/Payment";
import ReviewOrder from "./pages/ReviewOrder";
import Success from "./pages/Success";
import AdminLogin from "./pages/AdminLogin";
import ProductDetails from "./pages/ProductDetails";
import Navbar from "./components/Navbar";
import Plans from "./pages/Plans";
import AccountPage, { ACCOUNT_PAGE_CONTENT } from "./pages/AccountPage";

import "./styles/app.css";
import "./styles/cart-feedback.css";

export default function App() {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [profile, setProfile] = useState(null);

  const [page, setPage] = useState("home");
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
    const targetPage = nextPage === "login" ? "home" : nextPage;

    setPage(targetPage);

    if (!historyReadyRef.current || !window.history?.pushState) return;

    const state = { nutriblendPage: targetPage };

    if (options.replace) {
      window.history.replaceState(state, "", window.location.href);
      return;
    }

    window.history.pushState(state, "", window.location.href);
  }, []);

  useEffect(() => {
    if (loading || !user || !hasProfile) {
      historyReadyRef.current = false;
      return undefined;
    }

    historyReadyRef.current = true;
    window.history.replaceState({ nutriblendPage: page }, "", window.location.href);

    const handlePopState = (event) => {
      const previousPage = event.state?.nutriblendPage;

      if (previousPage) {
        setPage(previousPage);
        return;
      }

      setPage("home");
      window.history.replaceState(
        { nutriblendPage: "home" },
        "",
        window.location.href
      );
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasProfile, loading, page, user]);

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
    return (
      <div className="app-loading">
        <div className="app-loading-content">
          <div className="app-loading-logo">NB</div>
          <h2>NUTRIBLEND</h2>
          <div className="app-loading-bar">
            <div className="app-loading-bar-fill" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;
  if (!hasProfile) return <CompleteProfile />;

  const cartItemCount = cart.reduce(
    (sum, item) => sum + Number(item.qty || 1),
    0
  );
  const isAccountPage = Object.keys(ACCOUNT_PAGE_CONTENT).includes(page);

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
        {page === "profile" && <Profile setPage={navigatePage} />}
        {page === "plans" && <Plans setPage={navigatePage} />}

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
        {isAccountPage && <AccountPage pageId={page} setPage={navigatePage} />}
      </div>
    </div>
  );
}
