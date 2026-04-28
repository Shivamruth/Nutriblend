import { useState } from "react";
import { useCart } from "../context/CartContext";

export default function ProductCard({ item, onView }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const flyToCart = (imgElement) => {
  const cart = document.getElementById("cart-icon");

  if (!cart) {
    alert("Cart icon not found. Add id='cart-icon' in Navbar cart button.");
    return;
  }

  if (!imgElement) {
    alert("Product image not found.");
    return;
  }

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
    const img = e.currentTarget
      .closest(".card")
      .querySelector(".product-img");

    flyToCart(img);
    addToCart(item);

    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 1500);
    console.log("CLICKED");
  };

  return (
    <div className="card">
      <div className="card-image-wrap">
        <img src={item.image} alt={item.name} className="product-img" />
        <div className="card-badge">{item.protein}</div>
        <div className="card-overlay"></div>
      </div>

      <div className="card-content">
        <h3>{item.name}</h3>

        <p className="card-desc">{item.description}</p>

        <div className="card-info">
          <span className="price">₹{item.price}</span>

          <div className="card-actions">
            <button
              className={`cart-btn ${added ? "added" : ""}`}
              onClick={handleAdd}
            >
              {added ? "✔ Added" : "+ Cart"}
            </button>

            <button onClick={() => onView(item)}>View</button>
          </div>
        </div>
      </div>
    </div>
  );
}