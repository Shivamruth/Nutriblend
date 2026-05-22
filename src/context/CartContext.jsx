import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const CartContext = createContext();

export default function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  const saveCart = useCallback((items) => {
    setCartItems(items);
    localStorage.setItem("cart", JSON.stringify(items));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("cartUpdated"));
  }, []);

  const loadCart = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cart")) || [];
      setCartItems(saved);
    } catch (error) {
      console.error("Cart load error:", error);
      setCartItems([]);
      localStorage.setItem("cart", JSON.stringify([]));
    }
  }, []);

  useEffect(() => {
    loadCart();

    window.addEventListener("cartUpdated", loadCart);

    return () => {
      window.removeEventListener("cartUpdated", loadCart);
    };
  }, [loadCart]);

  const addToCart = (item) => {
    const currentCart = JSON.parse(localStorage.getItem("cart")) || [];

    const exist = currentCart.find((i) => i.id === item.id);

    let updatedCart;

    if (exist) {
      updatedCart = currentCart.map((i) =>
        i.id === item.id ? { ...i, qty: (i.qty || 1) + 1 } : i
      );
    } else {
      updatedCart = [...currentCart, { ...item, qty: 1 }];
    }

    saveCart(updatedCart);
  };

  const removeFromCart = (id) => {
    const currentCart = JSON.parse(localStorage.getItem("cart")) || [];
    const updatedCart = currentCart.filter((item) => item.id !== id);

    saveCart(updatedCart);
  };

  const updateQty = (id, qty) => {
    if (qty < 1) return;

    const currentCart = JSON.parse(localStorage.getItem("cart")) || [];

    const updatedCart = currentCart.map((item) =>
      item.id === id ? { ...item, qty } : item
    );

    saveCart(updatedCart);
  };

  const clearCart = () => {
    saveCart([]);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cart: cartItems,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
