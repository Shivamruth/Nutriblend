import { Search } from "lucide-react"; // install if not: npm i lucide-react
import { useCart } from "../context/CartContext";

export default function Navbar({ setPage }) {
  const { cart } = useCart();

  return (
  <div className="navbar">
    {/* LEFT */}
    <div className="logo" onClick={() => setPage("home")}>
      🥤 NUTRIBLEND
    </div>

    {/* CENTER */}
    <div className="nav-links">
      <button onClick={() => setPage("home")}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-house"
        >
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
        Home
      </button>

      <button id="cart-icon" onClick={() => setPage("cart")}>
        🛒 Cart ({cart.length})
      </button>

      <button onClick={() => setPage("orders")}>
        Orders
      </button>
    </div>

    {/* RIGHT */}
    <div className="right-section">
      <div className="profile-icon">
        <Search size={18} />
      </div>

      <div className="profile-icon">👤</div>

      <button className="logout-btn">Logout</button>
    </div>
  </div>
);
}