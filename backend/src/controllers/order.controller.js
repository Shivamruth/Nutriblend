import { createRazorpayOrder } from "../services/razorpay.service.js";
import {
  saveOrderToDb,
  getUserOrders,
  supabase,
} from "../services/supabase.service.js";
import { ApiError } from "../middleware/error.middleware.js";
import logger from "../utils/logger.js";

const ALLOWED_PAYMENT_METHODS = ["Online", "COD"];

const ORDER_STATUSES = [
  "Placed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const normalizeItems = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    id: item.id || null,
    name: item.name || item.product_name || "NutriBlend Item",
    product_name: item.product_name || item.name || "NutriBlend Item",
    price: Number(item.price || 0),
    qty: Number(item.qty || 1),
    protein: item.protein || "",
    category: item.category || "",
    image: item.image || "",
    isPlan: Boolean(item.isPlan),
    duration: item.duration || item.plan_duration || "",
  }));
};

const normalizeAddress = (address = {}) => {
  if (!address || typeof address !== "object") {
    return {};
  }

  return {
    id: address.id || null,
    name: address.name || "",
    phone: address.phone || "",
    street: address.street || "",
    landmark: address.landmark || "",
    city: address.city || "",
    state: address.state || "",
    pincode: address.pincode || "",
    type: address.type || "Address",
    delivery_instruction: address.delivery_instruction || "",
  };
};

const getFirstProductName = (items) => {
  if (!items.length) return "NutriBlend Order";

  if (items.length === 1) {
    return items[0].name || items[0].product_name || "NutriBlend Order";
  }

  return `${items.length} items order`;
};

export const createOrder = async (req, res, next) => {
  try {
    const {
      amount,
      subtotal,
      deliveryFee,
      deliveryOption,
      items,
      address,
      userId,
      paymentMethod,
    } = req.body;

    const finalAmount = Number(amount || 0);
    const finalSubtotal = Number(subtotal || amount || 0);
    const finalDeliveryFee = Number(deliveryFee || 0);
    const normalizedItems = normalizeItems(items);
    const normalizedAddress = normalizeAddress(address);

    if (!finalAmount || finalAmount <= 0) {
      throw new ApiError(400, "Invalid amount");
    }

    if (!userId) {
      throw new ApiError(400, "User ID is required");
    }

    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new ApiError(400, "Invalid payment method");
    }

    if (!normalizedItems.length) {
      throw new ApiError(400, "Order items are required");
    }

    if (!normalizedAddress.name || !normalizedAddress.phone) {
      throw new ApiError(400, "Delivery address is required");
    }

    let rzpOrder = null;

    const firstItem = normalizedItems[0];
    const totalQty = normalizedItems.reduce(
      (sum, item) => sum + Number(item.qty || 1),
      0
    );

    const orderData = {
      user_id: userId,
      email: req.user?.email || req.body.email || null,

      product_name: getFirstProductName(normalizedItems),
      price: Number(firstItem?.price || 0),
      qty: totalQty,
      total: finalAmount,

      subtotal: finalSubtotal,
      delivery_fee: finalDeliveryFee,
      delivery_option: deliveryOption || "Standard Delivery",

      items: normalizedItems,
      address: normalizedAddress,

      payment_method: paymentMethod,
      payment_status: paymentMethod === "COD" ? "Pending" : "Pending",
      status: "Placed",
    };

    if (paymentMethod === "Online") {
      const receipt = `receipt_${Date.now()}`;
      rzpOrder = await createRazorpayOrder(finalAmount, receipt);
      orderData.razorpay_order_id = rzpOrder.id;
      orderData.status = "Placed";
    }

    let dbOrder = null;

    try {
      dbOrder = await saveOrderToDb(orderData);

      logger.info(
        `Order saved to DB: ${dbOrder.id} for user ${userId} via ${paymentMethod}`
      );
    } catch (dbError) {
      logger.warn(`DB save failed: ${dbError.message}`);

      if (paymentMethod === "COD") {
        return res.status(500).json({
          success: false,
          message: "Failed to save COD order",
          error: dbError.message,
        });
      }

      return res.status(201).json({
        success: true,
        orderId: null,
        data: {
          ...rzpOrder,
          db_saved: false,
          db_order_id: null,
        },
        message:
          "Razorpay order created, but database save failed. Client can retry saving.",
      });
    }

    return res.status(201).json({
      success: true,
      orderId: dbOrder?.id || null,
      order_id: dbOrder?.id || null,
      data: {
        ...rzpOrder,
        db_saved: true,
        db_order_id: dbOrder?.id || null,
        order: dbOrder,
      },
      message: "Order created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await getUserOrders(req.user.id);

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllOrdersAdmin = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
        allowedStatuses: ORDER_STATUSES,
      });
    }

    const orderId = Number(id);

    if (Number.isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select("*")
      .single();

    if (error) {
      console.error("Supabase status update error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update order status",
        error: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data,
    });
  } catch (err) {
    console.error("Server error while updating order status:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};