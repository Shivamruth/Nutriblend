/**
 * Centralized NutriBlend business configuration.
 * Import from here instead of hardcoding values in pages.
 */

export const BUSINESS = {
  name: "NutriBlend",
  tagline: "Fresh Protein Shakes Delivered",
  whatsapp: "919059220906",
  whatsappDisplay: "+91 90592 20906",
  supportHours: "9 AM – 9 PM",
  serviceArea: "Gandimaisamma, Hyderabad",
  serviceAreaShort: "Gandimaisamma",
  city: "Hyderabad",
  state: "Telangana",
  // PIN codes that we deliver to (Gandimaisamma and nearby areas)
  servicePincodes: [
    "500055", "500054", "500056", "500037", "500038",
    "500039", "500049", "500050", "500085", "500090",
  ],
  // Fuzzy keywords for area matching
  serviceKeywords: [
    "gandimaisamma", "gandi maisamma", "bowenpally", "balanagar",
    "kukatpally", "jeedimetla", "kompally", "alwal", "malkajgiri",
    "secunderabad", "medchal", "shamirpet",
  ],
  version: "1.0.0",
};

/**
 * Check whether a given address (city/district/pincode) falls in the service area.
 * @param {{ city?: string, district?: string, pincode?: string, state?: string }} addr
 * @returns {{ inArea: boolean, message: string }}
 */
export const checkServiceArea = (addr = {}) => {
  const pin = String(addr.pincode || addr.postal_code || "").trim();
  const city = String(addr.city || "").toLowerCase().trim();
  const district = String(addr.district || "").toLowerCase().trim();
  const state = String(addr.state || "").toLowerCase().trim();

  // Check pincode
  if (pin && BUSINESS.servicePincodes.includes(pin)) {
    return { inArea: true, message: `Delivering to ${pin} — ${BUSINESS.serviceArea}` };
  }

  // Check keywords in city/district
  const combined = `${city} ${district}`;
  const keywordMatch = BUSINESS.serviceKeywords.some((kw) => combined.includes(kw));
  if (keywordMatch) {
    return { inArea: true, message: `Delivering to ${BUSINESS.serviceArea}` };
  }

  // In Hyderabad/Telangana but outside known areas
  if (city.includes("hyderabad") || district.includes("hyderabad") || district.includes("rangareddy")) {
    return {
      inArea: false,
      message: `We're currently delivering only in ${BUSINESS.serviceArea}. Expanding soon across Hyderabad!`,
    };
  }

  // In Telangana but not Hyderabad
  if (state.includes("telangana")) {
    return {
      inArea: false,
      message: `We're starting in ${BUSINESS.serviceArea} and expanding across Telangana soon!`,
    };
  }

  // Completely outside
  if (pin || city || district) {
    return {
      inArea: false,
      message: `We currently deliver only in ${BUSINESS.serviceArea}, Hyderabad. Stay tuned for expansion!`,
    };
  }

  return { inArea: true, message: "" };
};

/**
 * Build a WhatsApp deep-link with the business number and an optional message.
 * @param {string} [message] — pre-filled message text (will be URI-encoded)
 * @returns {string} full wa.me URL
 */
export const whatsappLink = (message = "") => {
  const base = `https://wa.me/${BUSINESS.whatsapp}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
};
