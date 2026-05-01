import { useCallback, useEffect, useState } from "react";
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

import "./App.css";

export default function App() {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [page, setPage] = useState("home");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [, setAddress] = useState(null);
  const [payment, setPayment] = useState("");
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");

  const loadCart = useCallback(() => {
    const data = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(data);
  }, []);

  const checkUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      if (error) {
        await supabase.auth.signOut();
      }

      setUser(null);
      setLoading(false);
      return;
    }

    setUser(data.user);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    setHasProfile(!!profile);
    setLoading(false);
  }, []);

  useEffect(() => {
    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [checkUser]);

  useEffect(() => {
    loadCart();

    window.addEventListener("storage", loadCart);

    return () => {
      window.removeEventListener("storage", loadCart);
    };
  }, [loadCart]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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

  const cartItemCount = cart.reduce((sum, item) => sum + (item.qty || 1), 0);

  return (
    <div className="app">
      <Navbar
        page={page}
        setPage={setPage}
        cartItemCount={cartItemCount}
        logout={logout}
        search={search}
        setSearch={setSearch}
      />

      <div className="page-container" key={page}>
        {page === "home" && (
          <Home search={search} setPage={setPage} setSelectedProduct={setSelectedProduct} />
        )}

        {page === "cart" && <Cart setPage={setPage} />}
        {page === "orders" && <Orders />}
        {page === "profile" && <Profile />}
        {page === "admin-login" && <AdminLogin setPage={setPage} />}
        {page === "admin" && <Admin setPage={setPage} />}

        {page === "product" && (
          <ProductDetails
            product={selectedProduct}
            setPage={setPage}
          />
        )}

        {page === "address" && (
          <Address setPage={setPage} setAddress={setAddress} />
        )}

        {page === "payment" && (
          <Payment
            setPage={setPage}
            setPayment={setPayment}
          />
        )}

        {page === "review" && (
          <ReviewOrder
            cart={cart}
            address={JSON.parse(localStorage.getItem("selectedAddress"))}
            payment={payment}
            setPage={setPage}
          />
        )}

        {page === "success" && <Success setPage={setPage} />}
      </div>
    </div>
  );
}
