import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useNotification } from "../context/NotificationContext";
import { fallbackProductImage } from "../utils/productImages";
import "../styles/product-card.css";

const normalizeStockStatus = (status) => {
  const value = String(status || "In Stock")
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();

  if (value === "out of stock") return "Out of Stock";
  if (value === "limited stock") return "Limited Stock";
  return "In Stock";
};

const getStockClass = (status) =>
  normalizeStockStatus(status).toLowerCase().replaceAll(" ", "-");

export default function ProductCard({ item, onView }) {
  const { addToCart } = useCart();
  const { notify } = useNotification();
  const [added, setAdded] = useState(false);

  const stockStatus = normalizeStockStatus(item.stock_status);
  const isOutOfStock = stockStatus === "Out of Stock";

  const flyToCart = (imgElement) => {
    const cart = document.getElementById("cart-icon");

    if (!cart || !imgElement) return;

    const imgRect = imgElement.getBoundingClientRect();
    const cartRect = cart.getBoundingClientRect();

    const clone = imgElement.cloneNode(true);
    clone.classList.add("fly-img");

    clone.style.position = "fixed";
    clone.style.left = `${imgRect.left}px`;
    clone.style.top = `${imgRect.top}px`;
    clone.style.width = `${imgRect.width}px`;
    clone.style.height = `${imgRect.height}px`;
    clone.style.objectFit = "cover";
    clone.style.borderRadius = "18px";
    clone.style.zIndex = "999999";
    clone.style.pointerEvents = "none";
    clone.style.opacity = "1";
    clone.style.boxShadow = "0 20px 50px rgba(0,0,0,0.4)";
    clone.style.transition =
      "left 0.9s ease-in-out, top 0.9s ease-in-out, width 0.9s ease-in-out, height 0.9s ease-in-out, opacity 0.9s ease-in-out, transform 0.9s ease-in-out";

    document.documentElement.appendChild(clone);

    requestAnimationFrame(() => {
      clone.style.left = `${cartRect.left + cartRect.width / 2 - 20}px`;
      clone.style.top = `${cartRect.top + cartRect.height / 2 - 20}px`;
      clone.style.width = "40px";
      clone.style.height = "40px";
      clone.style.opacity = "0";
      clone.style.transform = "scale(0.2) rotate(360deg)";
    });

    setTimeout(() => {
      clone.remove();
      cart.classList.add("bump");

      setTimeout(() => {
        cart.classList.remove("bump");
      }, 400);
    }, 950);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) {
      notify("This product is currently out of stock", "error");
      return;
    }

    const img = e.currentTarget.closest(".card")?.querySelector(".product-img");

    flyToCart(img);
    addToCart(item);

    setAdded(true);
    notify("Added to cart", "success");

    setTimeout(() => {
      setAdded(false);
    }, 1500);
  };

  return (
    <div className={`card ${isOutOfStock ? "out-of-stock-card" : ""}`}>
      <div className="card-image-wrap">
        <img
          src={item.image || fallbackProductImage}
          alt={item.name}
          className="product-img"
          onError={(e) => {
            e.currentTarget.src = fallbackProductImage;
          }}
        />

        <div className="card-badge">{item.protein}</div>

        <div className={`stock-badge ${getStockClass(stockStatus)}`}>
          {stockStatus}
        </div>

        {isOutOfStock && (
          <div className="out-of-stock-overlay">
            <span>Currently Unavailable</span>
          </div>
        )}

        <div className="card-overlay"></div>
      </div>

      <div className="card-content">
        <h3>{item.name}</h3>

        <p className="card-desc">{item.description}</p>

        <div className="card-info">
          <span className="price">₹{item.price}</span>

          <div className="card-actions">
            <button
              type="button"
              className={`cart-btn ${added ? "added" : ""}`}
              onClick={handleAdd}
              disabled={isOutOfStock}
              title={isOutOfStock ? "This product is currently out of stock" : ""}
            >
              {isOutOfStock ? "Out of Stock" : added ? "✔ Added" : "+ Cart"}
            </button>

            <button type="button" onClick={() => onView(item)}>View</button>
          </div>
        </div>
      </div>
    </div>
  );
}
