import ProductCard from "./ProductCard";
import { useState } from "react";

export default function ProductGrid({ products = [] }) {
  const [selected, setSelected] = useState(null);

  const getImage = (item) => {
    const name = item.name?.toLowerCase() || "";

    if (name.includes("10g") && name.includes("nutri")) return "/products/10gNutriShake.png";
    if (name.includes("10g")) return "/products/10gShake.png";
    if (name.includes("20g")) return "/products/20gNutriShake.png";
    if (name.includes("40g") || name.includes("pro")) return "/products/40gProShake.png";
    if (name.includes("basic")) return "/products/BasicPre.png";
    if (name.includes("standard")) return "/products/StandardPre.png";
    if (name.includes("premium")) return "/products/PremiumWork.png";
    if (name.includes("whey")) return "/products/WheyShake.png";

    return item.image;
  };

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
                const fixedItem = { ...item, image: getImage(item) };

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

            <img src={getImage(selected)} alt={selected.name} className="modal-img" />

            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
            <h3>₹{selected.price}</h3>
          </div>
        </div>
      )}
    </div>
  );
}