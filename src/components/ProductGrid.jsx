import ProductCard from "./ProductCard";
import { useState } from "react";

import nutri10g from "../assets/10gNutriShake.png";
import shake10g from "../assets/10gShake.png";
import nutri20g from "../assets/20gNutriShake.png";
import pro40g from "../assets/40gProShake.png";
import basicPre from "../assets/BasicPre.png";
import standardPre from "../assets/StandardPre.png";
import premiumWork from "../assets/PremiumWork.png";
import wheyShake from "../assets/WheyShake.png";

export default function ProductGrid({ products = [] }) {
  const [selected, setSelected] = useState(null);

  console.log("PRODUCTS:", products);

  const getImage = (item) => {
    const name = item.name?.toLowerCase() || "";

    if (name.includes("10g") && name.includes("nutri")) return nutri10g;
    if (name.includes("10g")) return shake10g;
    if (name.includes("20g")) return nutri20g;
    if (name.includes("40g") || name.includes("pro")) return pro40g;
    if (name.includes("basic")) return basicPre;
    if (name.includes("standard")) return standardPre;
    if (name.includes("premium")) return premiumWork;
    if (name.includes("whey")) return wheyShake;

    return item.image;
  };

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div className="container">
      {categories.map((cat) => {
        const filteredProducts = products.filter((p) => p.category === cat);

        return (
          <div key={cat} className="section">
            <h2>{cat} Shakes</h2>

            <div className="grid">
              {filteredProducts.map((item) => {
                const fixedItem = {
                  ...item,
                  image: getImage(item),
                };

                console.log("FIXED ITEM:", fixedItem);

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
        );
      })}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>
              ✕
            </button>

            <img
              src={getImage(selected)}
              alt={selected.name}
              className="modal-img"
            />

            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
            <h3>₹{selected.price}</h3>
          </div>
        </div>
      )}
    </div>
  );
}