const productImageRules = [
  {
    matches: (name) => name.includes("10g") && name.includes("natural"),
    image: "/products/10gNatural.png",
  },
  {
    matches: (name) => name.includes("10g") && name.includes("whey"),
    image: "/products/WheyShake.png",
  },
  {
    matches: (name) => name.includes("20g") && name.includes("natural"),
    image: "/products/20gNaturalShake.png",
  },
  {
    matches: (name) => name.includes("20g") && name.includes("whey"),
    image: "/products/20gWhey.png",
  },
  {
    matches: (name) => name.includes("30g") && name.includes("natural"),
    image: "/products/30gNatural.png",
  },
  {
    matches: (name) => name.includes("30g") && name.includes("whey"),
    image: "/products/30gWhey.png",
  },
  {
    matches: (name) => name.includes("40g") && name.includes("protein"),
    image: "/products/40gProShake.png",
  },
  {
    matches: (name) => name.includes("50g") && name.includes("protein"),
    image: "/products/50gPro.png",
  },
  {
    matches: (name) => name.includes("basic") && name.includes("pre"),
    image: "/products/BasicPre.png",
  },
  {
    matches: (name) => name.includes("standard") && name.includes("pre"),
    image: "/products/StandardPre.png",
  },
  {
    matches: (name) => name.includes("premium") && name.includes("pre"),
    image: "/products/PremiumWork.png",
  },
];

export const fallbackProductImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%230c1a30'/%3E%3Ctext x='150' y='104' text-anchor='middle' fill='%237cff6b' font-family='Arial,sans-serif' font-size='22' font-weight='700'%3ENutriBlend%3C/text%3E%3C/svg%3E";

export function getProductImage(product) {
  const name = product?.name?.toLowerCase() || "";
  const matchedRule = productImageRules.find((rule) => rule.matches(name));

  return matchedRule?.image || product?.image || fallbackProductImage;
}

export function withProductImage(product) {
  return {
    ...product,
    image: getProductImage(product),
  };
}
