import { Search } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function Navbar({ page, setPage, cartItemCount, logout, search, setSearch }) {
  return (
    <nav className="navbar">
      <div className="logo" onClick={() => setPage("home")}>
        🥤 NUTRIBLEND
      </div>

      <div className="nav-links">
        <button
          className={page === "home" ? "nav-active" : ""}
          onClick={() => setPage("home")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
            <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          Home
        </button>

        <button
          id="cart-icon"
          className={page === "cart" ? "nav-active" : ""}
          onClick={() => setPage("cart")}
        >
          🛒 Cart
          {cartItemCount > 0 && (
            <span className="nav-cart-badge">{cartItemCount}</span>
          )}
        </button>

        <button
          className={page === "orders" ? "nav-active" : ""}
          onClick={() => setPage("orders")}
        >
          📋 Orders
        </button>

        <button
          className={page === "admin-login" || page === "admin" ? "nav-active" : ""}
          onClick={() => setPage("admin-login")}
        >
          🛡️ Admin
        </button>
      </div>

      <div className="right-section">
        {/* Search Input */}
        <div className="nav-search-container">
          <Search size={18} className="nav-search-icon" />
          <input
            type="text"
            className="nav-search-input"
            placeholder="Search protein..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <NotificationBell />

        <div
          className={`profile-icon ${page === "profile" ? "profile-icon-active" : ""}`}
          onClick={() => setPage("profile")}
        >
          👤
        </div>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
}