import { useState } from "react";

export default function ProductDetails({ product, setPage }) {
  const [qty, setQty] = useState(1);

  if (!product) {
    return (
      <div style={{ padding: "40px", color: "white" }}>
        <h2>Product not found</h2>
        <button onClick={() => setPage("home")}>Go Back</button>
      </div>
    );
  }

  const addToCart = () => {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ ...product, qty });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));

    alert("Added to cart ✅");
    setPage("cart");
  };

  return (
    <div className="product-details-page">
      <div className="product-details-card">

        {/* LEFT IMAGE */}
        <div className="product-image-section">
          <img src={product.image} alt={product.name} />
        </div>

        {/* RIGHT CONTENT */}
        <div className="product-info-section">

          <h2>{product.name}</h2>

          <p className="category">{product.category}</p>

          <p className="price">₹{product.price}</p>

          <p className="protein">💪 {product.protein}g Protein</p>

          <p className="desc">
            {product.description ||
              "High-quality supplement designed to boost your performance and recovery."}
          </p>

          {/* QTY SELECTOR */}
          <div className="qty-box">
            <button onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
            <span>{qty}</span>
            <button onClick={() => setQty(qty + 1)}>+</button>
          </div>

          {/* ACTION BUTTONS */}
          <div className="actions">
            <button className="add-btn" onClick={addToCart}>
              Add to Cart
            </button>

            <button className="buy-btn" onClick={() => setPage("address")}>
              Buy Now ⚡
            </button>
          </div>

          <button
            className="back-btn"
            onClick={() => setPage("home")}
          >
            ← Back to Products
          </button>

        </div>
      </div>
    </div>
  );
}