import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Search,
  Shield,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import "../styles/navbar.css";

export default function Navbar({
  page,
  setPage,
  cartItemCount,
  logout,
  search,
  setSearch,
  profile,
}) {
  const isAdmin = profile?.role === "admin";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  const navigateTo = (nextPage) => {
    setPage(nextPage);
    setDrawerOpen(false);
    setAccountOpen(false);
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    setAccountOpen(false);
    logout();
  };

  return (
    <>
      <nav className="navbar">
        <button
          type="button"
          className="nav-icon-btn nav-menu-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={24} />
        </button>

        <button
          type="button"
          className="logo"
          onClick={() => navigateTo("home")}
          aria-label="Go to home"
        >
          <img src="/nutriblend-logo.svg" alt="" className="nav-brand-mark" />
          <span>NUTRIBLEND</span>
        </button>

        <button
          type="button"
          className="nav-icon-btn nav-search-toggle"
          onClick={() => setSearchOpen((open) => !open)}
          aria-label="Search products"
          aria-expanded={searchOpen}
        >
          <Search size={22} />
        </button>
      </nav>

      <div className={`nav-search-panel ${searchOpen ? "search-open" : ""}`}>
        <div className="nav-search-container">
          <Search size={18} className="nav-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="nav-search-input"
            placeholder="Search protein, plans, shakes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="nav-clear-search"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {drawerOpen && (
        <button
          type="button"
          className="nav-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      <aside className={`nav-drawer ${drawerOpen ? "drawer-open" : ""}`}>
        <div className="nav-drawer-header">
          <div className="nav-drawer-brand">
            <img src="/nutriblend-logo.svg" alt="" className="nav-drawer-logo" />
            <span className="nav-drawer-eyebrow">Menu</span>
            <strong>NutriBlend</strong>
          </div>
          <button
            type="button"
            className="nav-icon-btn"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={22} />
          </button>
        </div>

        <div className="nav-drawer-links">
          <button
            type="button"
            className={page === "home" ? "nav-active" : ""}
            onClick={() => navigateTo("home")}
          >
            <Home size={20} />
            <span>Home</span>
          </button>

          <button
            type="button"
            id="cart-icon"
            className={page === "cart" ? "nav-active" : ""}
            onClick={() => navigateTo("cart")}
          >
            <ShoppingCart size={20} />
            <span>Cart</span>
            {cartItemCount > 0 && (
              <span className="nav-cart-badge">{cartItemCount}</span>
            )}
          </button>

          <button
            type="button"
            className={page === "orders" ? "nav-active" : ""}
            onClick={() => navigateTo("orders")}
          >
            <ClipboardList size={20} />
            <span>Orders</span>
          </button>

          <div className="nav-account">
            <button
              type="button"
              className={`nav-account-toggle ${accountOpen ? "account-open" : ""}`}
              onClick={() => setAccountOpen((open) => !open)}
              aria-expanded={accountOpen}
            >
              <User size={20} />
              <span>My Account</span>
              <ChevronDown size={18} />
            </button>

            <div className={`nav-account-menu ${accountOpen ? "account-open" : ""}`}>
              <button type="button" onClick={() => navigateTo("profile")}>
                <User size={18} />
                <span>Profile</span>
              </button>
              <button type="button" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              className={page === "admin-login" || page === "admin" ? "nav-active" : ""}
              onClick={() => navigateTo("admin-login")}
            >
              <Shield size={20} />
              <span>Admin</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
