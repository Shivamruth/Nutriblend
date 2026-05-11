import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";
import "../styles/cart.css";

const fallbackProductImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%230c1a30'/%3E%3Ctext x='30' y='37' text-anchor='middle' fill='%237cff6b' font-family='Arial,sans-serif' font-size='24' font-weight='700'%3EN%3C/text%3E%3C/svg%3E";

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

export default function Cart({ setPage }) {
  const [cart, setCart] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadCart();

    window.addEventListener("cartUpdated", loadCart);
    window.addEventListener("storage", loadCart);

    return () => {
      window.removeEventListener("cartUpdated", loadCart);
      window.removeEventListener("storage", loadCart);
    };
  }, []);

  const loadCart = async () => {
    const localCart = JSON.parse(localStorage.getItem("cart")) || [];

    if (localCart.length === 0) {
      setCart([]);
      return;
    }

    const productIds = localCart
      .filter((item) => !item.isPlan && item.id)
      .map((item) => item.id);

    if (productIds.length === 0) {
      setCart(localCart);
      return;
    }

    setSyncing(true);

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, protein, price, category, image, description, stock_status, is_active, calories, quantity, benefits, ingredients"
      )
      .in("id", productIds);

    if (error) {
      console.error("Cart live sync error:", error);
      setCart(localCart);
      setSyncing(false);
      return;
    }

    const liveProductMap = new Map(
      (data || []).map((product) => [product.id, product])
    );

    const syncedCart = localCart.map((item) => {
      if (item.isPlan) return item;

      const liveProduct = liveProductMap.get(item.id);

      if (!liveProduct) {
        return {
          ...item,
          stock_status: "Out of Stock",
          is_active: false,
          sync_warning: "Product no longer exists",
        };
      }

      const oldPrice = Number(item.price || 0);
      const newPrice = Number(liveProduct.price || 0);

      return {
        ...item,

        // latest product data from Supabase
        name: liveProduct.name || item.name,
        product_name: liveProduct.name || item.product_name || item.name,
        protein: liveProduct.protein || item.protein,
        price: newPrice,
        category: liveProduct.category || item.category,
        image: liveProduct.image || item.image,
        description: liveProduct.description || item.description,
        stock_status: normalizeStockStatus(liveProduct.stock_status),
        is_active: liveProduct.is_active !== false,
        calories: liveProduct.calories || item.calories,
        quantity: liveProduct.quantity || item.quantity,
        benefits: liveProduct.benefits || item.benefits,
        ingredients: liveProduct.ingredients || item.ingredients,

        price_changed: oldPrice !== newPrice,
        old_price: oldPrice !== newPrice ? oldPrice : item.old_price || null,
      };
    });

    setCart(syncedCart);
    localStorage.setItem("cart", JSON.stringify(syncedCart));
    setSyncing(false);
  };

  const updateStorage = (updated) => {
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdated"));
    window.dispatchEvent(new Event("storage"));
  };

  const getItemStockStatus = (item) => {
    if (item.isPlan) return "In Stock";
    return normalizeStockStatus(item.stock_status);
  };

  const isOutOfStock = (item) => {
    if (item.isPlan) return false;

    const stockStatus = getItemStockStatus(item);
    const isHidden = item.is_active === false;

    return stockStatus === "Out of Stock" || isHidden;
  };

  const isLimitedStock = (item) => {
    if (item.isPlan) return false;
    return getItemStockStatus(item) === "Limited Stock";
  };

  const updateQty = (id, change) => {
    const currentItem = cart.find((item) => item.id === id);

    if (currentItem && isOutOfStock(currentItem)) {
      alert("This product is out of stock. Please remove it from cart.");
      return;
    }

    const updated = cart
      .map((item) =>
        item.id === id
          ? { ...item, qty: Number(item.qty || 1) + change }
          : item
      )
      .filter((item) => Number(item.qty || 1) > 0);

    updateStorage(updated);
  };

  const removeItem = (id) => {
    const updated = cart.filter((item) => item.id !== id);
    updateStorage(updated);
  };

  const removeUnavailableItems = () => {
    const updated = cart.filter((item) => !isOutOfStock(item));
    updateStorage(updated);
  };

  const clearCart = () => {
    const confirmClear = window.confirm("Are you sure you want to clear cart?");
    if (!confirmClear) return;

    localStorage.removeItem("cart");
    setCart([]);
    window.dispatchEvent(new Event("cartUpdated"));
    window.dispatchEvent(new Event("storage"));
  };

  const getItemName = (item) => {
    return item.name || item.product_name || "NutriBlend Item";
  };

  const getItemSubtotal = (item) => {
    return Number(item.price || 0) * Number(item.qty || 1);
  };

  const cartStats = useMemo(() => {
    const unavailableItems = cart.filter((item) => isOutOfStock(item));
    const limitedItems = cart.filter((item) => isLimitedStock(item));
    const priceChangedItems = cart.filter((item) => item.price_changed);

    const total = cart.reduce((sum, item) => sum + getItemSubtotal(item), 0);

    return {
      unavailableItems,
      limitedItems,
      priceChangedItems,
      unavailableCount: unavailableItems.length,
      limitedCount: limitedItems.length,
      priceChangedCount: priceChangedItems.length,
      hasUnavailable: unavailableItems.length > 0,
      hasPriceChanges: priceChangedItems.length > 0,
      total,
    };
  }, [cart]);

  const total = cartStats.total;

  const itemCount = cart.reduce(
    (sum, item) => sum + Number(item.qty || 1),
    0
  );

  const productCount = cart.filter((item) => !item.isPlan).length;
  const planCount = cart.filter((item) => item.isPlan).length;

  const proceedToCheckout = async () => {
    await loadCart();

    const latestCart = JSON.parse(localStorage.getItem("cart")) || [];
    const hasUnavailable = latestCart.some((item) => {
      if (item.isPlan) return false;

      const stock = normalizeStockStatus(item.stock_status);
      return stock === "Out of Stock" || item.is_active === false;
    });

    if (hasUnavailable) {
      alert("Please remove Out of Stock or hidden items before checkout.");
      return;
    }

    setPage("address");
  };

  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <span className="cart-empty-icon">🛒</span>
        <h2>Your Cart is Empty</h2>
        <p className="cart-empty-subtitle">
          Looks like you haven&apos;t added any products or plans yet. Browse
          our protein-packed collection!
        </p>

        <button className="buy-btn" onClick={() => setPage("home")}>
          Start Shopping →
        </button>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <div>
          <p className="cart-eyebrow">Checkout Bag</p>
          <h2>Your Cart</h2>
          <p className="cart-item-count">
            {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
          </p>
          {syncing && <p className="cart-sync-text">Syncing latest prices...</p>}
        </div>

        <button className="cart-clear-btn" onClick={clearCart}>
          Clear All
        </button>
      </div>

      {cartStats.hasUnavailable && (
        <div className="cart-stock-warning">
          <div>
            <strong>Some items are unavailable</strong>
            <p>
              Product stock changed after you added it. Remove unavailable items
              before checkout.
            </p>
          </div>

          <button onClick={removeUnavailableItems}>
            Remove Unavailable Items
          </button>
        </div>
      )}

      {cartStats.hasPriceChanges && (
        <div className="cart-price-warning">
          <strong>Price updated:</strong> Some product prices changed. Your cart
          now shows the latest price.
        </div>
      )}

      {cartStats.limitedCount > 0 && !cartStats.hasUnavailable && (
        <div className="cart-limited-warning">
          <strong>Limited stock notice:</strong> Some items have limited stock.
          Checkout soon to avoid missing them.
        </div>
      )}

      <div className="cart-stats">
        <div className="cart-stat-card">
          <span>🥤</span>
          <div>
            <h3>{productCount}</h3>
            <p>Products</p>
          </div>
        </div>

        <div className="cart-stat-card">
          <span>📅</span>
          <div>
            <h3>{planCount}</h3>
            <p>Plans</p>
          </div>
        </div>

        <div className="cart-stat-card">
          <span>💰</span>
          <div>
            <h3>₹{total.toLocaleString("en-IN")}</h3>
            <p>Total</p>
          </div>
        </div>
      </div>

      <div className="cart-layout">
        <div className="cart-items">
          {cart.map((item, index) => {
            const isPlan = item.isPlan;
            const stockStatus = getItemStockStatus(item);
            const itemOutOfStock = isOutOfStock(item);
            const itemLimitedStock = isLimitedStock(item);

            return (
              <div
                key={item.id}
                className={`cart-card ${isPlan ? "cart-plan-card" : ""} ${
                  itemOutOfStock ? "cart-out-of-stock-card" : ""
                }`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="cart-item-info">
                  {isPlan ? (
                    <div className="cart-plan-icon">{item.image || "📅"}</div>
                  ) : (
                    <div className="cart-img-wrap">
                      <img
                        src={item.image || fallbackProductImage}
                        alt={getItemName(item)}
                        className="cart-item-img"
                        onError={(e) => {
                          e.currentTarget.src = fallbackProductImage;
                        }}
                      />
                    </div>
                  )}

                  <div className="cart-item-main">
                    <div className="cart-item-title-row">
                      <h3>{getItemName(item)}</h3>

                      {isPlan ? (
                        <span className="cart-plan-badge">Plan</span>
                      ) : (
                        <span className="cart-product-badge">Product</span>
                      )}

                      {!isPlan && stockStatus !== "In Stock" && (
                        <span
                          className={`cart-stock-badge ${getStockClass(
                            stockStatus
                          )}`}
                        >
                          {stockStatus}
                        </span>
                      )}

                      {!isPlan && item.is_active === false && (
                        <span className="cart-stock-badge out-of-stock">
                          Hidden
                        </span>
                      )}
                    </div>

                    {item.price_changed && (
                      <p className="cart-price-change-message">
                        Price updated from ₹{Number(item.old_price || 0)} to ₹
                        {Number(item.price || 0)}
                      </p>
                    )}

                    {itemOutOfStock && (
                      <p className="cart-stock-message">
                        This product is currently unavailable. Please remove it
                        before checkout.
                      </p>
                    )}

                    {itemLimitedStock && (
                      <p className="cart-limited-message">
                        Limited stock available. Checkout soon.
                      </p>
                    )}

                    {isPlan ? (
                      <div className="cart-plan-details">
                        <p>
                          <strong>Duration:</strong>{" "}
                          {item.duration || item.plan_duration || "N/A"}
                        </p>
                        <p>
                          <strong>Protein:</strong> {item.protein || "N/A"}
                        </p>
                        <p>
                          <strong>Best for:</strong>{" "}
                          {item.bestFor || item.plan_best_for || "Fitness users"}
                        </p>

                        {Array.isArray(item.includes || item.plan_includes) &&
                          (item.includes || item.plan_includes).length > 0 && (
                            <div className="cart-plan-includes">
                              {(item.includes || item.plan_includes)
                                .slice(0, 4)
                                .map((point) => (
                                  <span key={point}>✓ {point}</span>
                                ))}
                            </div>
                          )}
                      </div>
                    ) : (
                      <div className="cart-product-details">
                        <p className="cart-item-price">₹{item.price} each</p>

                        {item.protein && (
                          <p className="cart-item-protein">
                            💪 {item.protein}
                            {String(item.protein).toLowerCase().includes("g")
                              ? ""
                              : "g"}{" "}
                            protein
                          </p>
                        )}

                        {item.category && (
                          <p className="cart-item-category">{item.category}</p>
                        )}
                      </div>
                    )}

                    <p className="cart-item-subtotal">
                      Subtotal:{" "}
                      <strong>
                        ₹{getItemSubtotal(item).toLocaleString("en-IN")}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="cart-controls">
                  <div className="qty-controls">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      disabled={itemOutOfStock}
                    >
                      −
                    </button>
                    <span>{item.qty || 1}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      disabled={itemOutOfStock}
                    >
                      +
                    </button>
                  </div>

                  <button
                    className="cart-remove-btn"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${getItemName(item)}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="cart-summary">
          <h3>Order Summary</h3>

          <div className="cart-summary-row">
            <span>Total Items</span>
            <span>{itemCount}</span>
          </div>

          <div className="cart-summary-row">
            <span>Products</span>
            <span>{productCount}</span>
          </div>

          <div className="cart-summary-row">
            <span>Plans</span>
            <span>{planCount}</span>
          </div>

          <div className="cart-summary-row">
            <span>Subtotal</span>
            <span>₹{total.toLocaleString("en-IN")}</span>
          </div>

          {cartStats.hasUnavailable && (
            <div className="cart-summary-row cart-unavailable-row">
              <span>Unavailable Items</span>
              <span>{cartStats.unavailableCount}</span>
            </div>
          )}

          {cartStats.hasPriceChanges && (
            <div className="cart-summary-row cart-price-update-row">
              <span>Price Updates</span>
              <span>{cartStats.priceChangedCount}</span>
            </div>
          )}

          <div className="cart-summary-row">
            <span>Delivery</span>
            <span className="cart-free-badge">FREE</span>
          </div>

          <div className="cart-summary-divider" />

          <div className="cart-summary-row cart-summary-total">
            <span>Total</span>
            <span>₹{total.toLocaleString("en-IN")}</span>
          </div>

          {cartStats.hasUnavailable && (
            <p className="cart-checkout-error">
              Remove Out of Stock or hidden items to continue checkout.
            </p>
          )}

          <button
            className="buy-btn"
            onClick={proceedToCheckout}
            disabled={cartStats.hasUnavailable || syncing}
          >
            {cartStats.hasUnavailable
              ? "Checkout Blocked"
              : syncing
              ? "Checking..."
              : "Proceed to Checkout →"}
          </button>

          <button className="cart-continue-btn" onClick={() => setPage("home")}>
            Continue Shopping
          </button>
        </aside>
      </div>
    </div>
  );
}