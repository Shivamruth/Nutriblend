import ProductCard from "./ProductCard";
import { useState } from "react";
import { getProductImage, withProductImage } from "../utils/productImages";

export default function ProductGrid({ products = [] }) {
  const [selected, setSelected] = useState(null);

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div className="container">
      {categories.map((cat) => (
        <div key={cat} className="section">
          <h2>{cat} Shakes</h2>

          <div className="grid">
            {products
              .filter((p) => p.category === cat)
              .map((item) => {
                const fixedItem = withProductImage(item);

                return (
                  <ProductCard
                    key={item.id}
                    item={fixedItem}
                    onView={setSelected}
                  />
                );
              })}
          </div>
        </div>
      ))}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>
              ✕
            </button>

            <img src={getProductImage(selected)} alt={selected.name} className="modal-img" />

            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
            <h3>₹{selected.price}</h3>
          </div>
        </div>
      )}
    </div>
  );
}
