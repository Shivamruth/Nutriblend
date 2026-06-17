/**
 * Shared formatting utilities for NutriBlend.
 * Import these instead of duplicating money/date formatters in each page.
 */

/**
 * Format a numeric value as Indian Rupees.
 * @param {number|string} value
 * @param {{ symbol?: string }} options
 * @returns {string}  e.g. "₹1,250" or "Rs. 1,250"
 */
export const money = (value, { symbol = "₹" } = {}) =>
  `${symbol}${Number(value || 0).toLocaleString("en-IN")}`;

/**
 * Format a date/timestamp to a short, readable Indian locale string.
 * @param {string|Date|number} dateValue
 * @param {{ short?: boolean, timeOnly?: boolean }} options
 * @returns {string}  e.g. "12 Jun 2025, 3:45 PM" or "12 Jun"
 */
export const formatDate = (dateValue, { short = false, timeOnly = false } = {}) => {
  if (!dateValue) return "—";
  const d = new Date(dateValue);

  if (timeOnly) {
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (short) {
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  }

  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
