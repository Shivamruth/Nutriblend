/**
 * NutriBlend — Premium PDF Invoice Generator
 * Uses jsPDF to create clean, branded invoices.
 */
// ── Brand palette ────────────────────────────────────────────────────
const C = {
  primary:    [95, 122, 97],
  accent:     [201, 111, 74],
  dark:       [30, 30, 28],
  text:       [50, 50, 48],
  muted:      [120, 120, 116],
  light:      [245, 243, 239],
  white:      [255, 255, 255],
  success:    [34, 197, 94],
  divider:    [220, 218, 212],
};

const money = (v) => `Rs. ${Number(v || 0).toLocaleString("en-IN")}`;

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const safe = (v) => String(v || "").trim() || "—";

/**
 * Build address text from an address object.
 */
const addressText = (addr) => {
  if (!addr || typeof addr !== "object") return "—";
  return [addr.street, addr.landmark, addr.city, addr.state, addr.pincode]
    .filter(Boolean).join(", ") || "—";
};

/**
 * Parse items from an order.
 */
const getItems = (order) => {
  let items = order.items;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  if (!Array.isArray(items) || items.length === 0) {
    return [{
      name: order.product_name || "NutriBlend Order",
      price: Number(order.price || order.total || 0),
      qty: Number(order.qty || 1),
    }];
  }
  return items;
};

const getAddr = (order) => {
  let addr = order.address;
  if (typeof addr === "string") {
    try { addr = JSON.parse(addr); } catch { addr = {}; }
  }
  return addr && typeof addr === "object" ? addr : {};
};

const formatOrderId = (id) => {
  if (!id) return "NB-000000";
  const v = String(id);
  return /^\d+$/.test(v) ? `NB-${v.padStart(6, "0")}` : `NB-${v.slice(-8).toUpperCase()}`;
};

// ── Drawing helpers ──────────────────────────────────────────────────

function roundedRect(doc, x, y, w, h, r, fill, stroke) {
  doc.setFillColor(...fill);
  if (stroke) doc.setDrawColor(...stroke);
  doc.roundedRect(x, y, w, h, r, r, stroke ? "FD" : "F");
}

function line(doc, x1, y, x2, color = C.divider) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

/**
 * Generate and download a PDF invoice for an order.
 * @param {object} order — the full order object from Supabase
 */
export async function downloadInvoice(order) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 16;
  const contentW = W - margin * 2;
  let y = 0;

  const items = getItems(order);
  const addr = getAddr(order);
  const orderId = formatOrderId(order.id);
  const orderDate = fmtDateTime(order.created_at);
  const total = Number(order.total || order.price || 0);
  const paymentMethod = safe(order.payment_method);
  const paymentStatus = safe(order.payment_status);
  const customerName = safe(addr.name || order.customer_name || order.user_email);
  const customerPhone = safe(addr.phone || order.customer_phone);
  const customerEmail = safe(order.user_email || addr.email);

  // ── Header bar ──────────────────────────────────────────────────
  roundedRect(doc, 0, 0, W, 42, 0, C.primary);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...C.white);
  doc.text("NUTRIBLEND", margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 230, 220);
  doc.text("Fresh Protein Shakes Delivered", margin, 25);
  doc.text("Gandimaisamma, Hyderabad · +91 90592 20906", margin, 31);

  // Right side — INVOICE tag
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...C.white);
  doc.text("INVOICE", W - margin, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(orderId, W - margin, 25, { align: "right" });
  doc.text(fmtDate(order.created_at), W - margin, 31, { align: "right" });

  y = 50;

  // ── Customer & Order info cards ──────────────────────────────────
  const halfW = (contentW - 6) / 2;

  // Customer card
  roundedRect(doc, margin, y, halfW, 36, 3, C.light);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text("BILL TO", margin + 5, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.text);
  doc.text(customerName, margin + 5, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  const addrLines = doc.splitTextToSize(addressText(addr), halfW - 10);
  doc.text(addrLines.slice(0, 2), margin + 5, y + 20);
  doc.text(`${customerPhone} · ${customerEmail}`, margin + 5, y + 32);

  // Order info card
  const rightX = margin + halfW + 6;
  roundedRect(doc, rightX, y, halfW, 36, 3, C.light);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text("ORDER DETAILS", rightX + 5, y + 7);

  const infoRows = [
    ["Order Date", orderDate],
    ["Payment", `${paymentMethod} — ${paymentStatus}`],
    ["Status", safe(order.status)],
  ];

  doc.setFontSize(8.5);
  infoRows.forEach(([label, value], i) => {
    const rowY = y + 14 + i * 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text(label, rightX + 5, rowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.text);
    doc.text(value, rightX + halfW - 5, rowY, { align: "right" });
  });

  y += 44;

  // ── Items table ──────────────────────────────────────────────────
  // Header
  roundedRect(doc, margin, y, contentW, 9, 2, C.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text("ITEM", margin + 5, y + 6.2);
  doc.text("QTY", margin + contentW * 0.6, y + 6.2, { align: "center" });
  doc.text("PRICE", margin + contentW * 0.75, y + 6.2, { align: "right" });
  doc.text("TOTAL", margin + contentW - 5, y + 6.2, { align: "right" });
  y += 11;

  // Rows
  let subtotal = 0;
  items.forEach((item, idx) => {
    const name = item.name || item.product_name || item.title || "Item";
    const qty = Number(item.qty || item.quantity || 1);
    const price = Number(item.price || item.amount || 0);
    const lineTotal = qty * price;
    subtotal += lineTotal;

    const rowH = 10;
    const bgColor = idx % 2 === 0 ? C.white : [250, 248, 244];
    roundedRect(doc, margin, y, contentW, rowH, 0, bgColor);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.text);

    // Truncate long names
    const displayName = name.length > 42 ? name.slice(0, 40) + "…" : name;
    doc.text(displayName, margin + 5, y + 6.5);
    doc.text(String(qty), margin + contentW * 0.6, y + 6.5, { align: "center" });
    doc.text(money(price), margin + contentW * 0.75, y + 6.5, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text(money(lineTotal), margin + contentW - 5, y + 6.5, { align: "right" });

    y += rowH;
  });

  y += 2;
  line(doc, margin, y, margin + contentW);
  y += 4;

  // ── Totals section ──────────────────────────────────────────────
  const totalsX = margin + contentW * 0.55;
  const totalsW = contentW * 0.45;

  const drawTotalLine = (label, value, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 8.5);
    doc.setTextColor(...(bold ? C.dark : C.muted));
    doc.text(label, totalsX, y);
    doc.setTextColor(...(bold ? C.primary : C.text));
    doc.text(value, totalsX + totalsW, y, { align: "right" });
    y += bold ? 8 : 6;
  };

  drawTotalLine("Subtotal", money(subtotal));
  drawTotalLine("Delivery Fee", "FREE");

  if (order.discount && Number(order.discount) > 0) {
    drawTotalLine("Discount", `- ${money(order.discount)}`);
  }

  y += 1;
  line(doc, totalsX, y, totalsX + totalsW, C.primary);
  y += 5;

  // Grand total with accent background
  roundedRect(doc, totalsX - 3, y - 4, totalsW + 6, 12, 3, C.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.text("TOTAL", totalsX + 2, y + 3);
  doc.text(money(total), totalsX + totalsW, y + 3, { align: "right" });
  y += 16;

  // ── Footer ──────────────────────────────────────────────────────
  line(doc, margin, y, margin + contentW, C.divider);
  y += 6;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text("Thank you for choosing NutriBlend!", margin, y);
  y += 5;
  doc.text("For support, WhatsApp +91 90592 20906 or visit our app.", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("This is a computer-generated invoice and does not require a signature.", margin, y);

  // ── Save ────────────────────────────────────────────────────────
  doc.save(`NutriBlend-Invoice-${orderId}.pdf`);
}
