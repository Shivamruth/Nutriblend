import { supabaseAdmin, insertDeliveryTracking, auditLog } from '../services/supabase.service.js';
import { ApiError } from '../middleware/error.middleware.js';

/**
 * GET /api/delivery/my-assignments
 * Returns all orders assigned to the authenticated delivery partner.
 */
export const getMyAssignments = async (req, res, next) => {
  try {
    const partnerId = req.user?.id;
    if (!partnerId) throw new ApiError(401, 'Authentication required');

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('delivery_partner_id', partnerId)
      .not('status', 'eq', 'Delivered')
      .not('status', 'eq', 'Cancelled')
      .order('created_at', { ascending: false });

    if (error) throw new ApiError(500, error.message);

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/delivery/tracking
 * Inserts a new location record for an assigned delivery.
 * Body: { orderId, latitude, longitude, status?, notes? }
 */
export const pushDeliveryLocation = async (req, res, next) => {
  try {
    const partnerId = req.user?.id;
    if (!partnerId) throw new ApiError(401, 'Authentication required');

    const { orderId, latitude, longitude, status, notes } = req.body;

    if (!orderId || latitude == null || longitude == null) {
      throw new ApiError(400, 'orderId, latitude, and longitude are required');
    }

    // Verify the order is assigned to this partner
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, delivery_partner_id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) throw new ApiError(404, 'Order not found');
    if (order.delivery_partner_id !== partnerId && req.role !== 'admin') {
      throw new ApiError(403, 'This order is not assigned to you');
    }

    const tracking = await insertDeliveryTracking({
      order_id: Number(orderId),
      delivery_partner_id: partnerId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      status: status || 'Out for Delivery',
      notes: notes || null,
    });

    // Also update order's delivery columns for backward compat
    await supabaseAdmin
      .from('orders')
      .update({
        delivery_lat: Number(latitude),
        delivery_lng: Number(longitude),
        ...(status ? { delivery_status: status } : {}),
      })
      .eq('id', orderId);

    res.status(201).json({ success: true, data: tracking });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/delivery/assignments/:orderId/status
 * Updates the status of an assigned order (e.g. "Out for Delivery", "Delivered").
 */
export const updateAssignmentStatus = async (req, res, next) => {
  try {
    const partnerId = req.user?.id;
    const { orderId } = req.params;
    const { status } = req.body;

    const allowed = ['Out for Delivery', 'Delivered'];
    if (!allowed.includes(status)) {
      throw new ApiError(400, `status must be one of: ${allowed.join(', ')}`);
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, delivery_partner_id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) throw new ApiError(404, 'Order not found');
    if (order.delivery_partner_id !== partnerId && req.role !== 'admin') {
      throw new ApiError(403, 'This order is not assigned to you');
    }

    const oldStatus = order.status;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status,
        delivery_status: status,
        ...(status === 'Delivered' ? { delivered_at: new Date().toISOString() } : {}),
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (updateError) throw new ApiError(500, updateError.message);

    await auditLog({
      userId: partnerId,
      action: 'UPDATE_STATUS',
      tableName: 'orders',
      recordId: orderId,
      oldValues: { status: oldStatus },
      newValues: { status },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/orders/:id/assign-partner
 * Admin-only: assign a delivery partner to an order.
 */
export const assignDeliveryPartner = async (req, res, next) => {
  try {
    const adminId = req.user?.id;
    const { id: orderId } = req.params;
    const { deliveryPartnerId } = req.body;

    if (!deliveryPartnerId) throw new ApiError(400, 'deliveryPartnerId is required');

    // Verify the partner exists and has the right role
    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', deliveryPartnerId)
      .maybeSingle();

    if (partnerError || !partner) throw new ApiError(404, 'Delivery partner not found');
    if (!['delivery_partner', 'admin'].includes(partner.role)) {
      throw new ApiError(400, 'User is not a delivery partner');
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ delivery_partner_id: deliveryPartnerId })
      .eq('id', orderId)
      .select('*')
      .single();

    if (updateError) throw new ApiError(500, updateError.message);

    // Insert initial tracking record
    await insertDeliveryTracking({
      order_id: Number(orderId),
      delivery_partner_id: deliveryPartnerId,
      status: 'assigned',
    });

    await auditLog({
      userId: adminId,
      action: 'ASSIGN_DELIVERY_PARTNER',
      tableName: 'orders',
      recordId: orderId,
      newValues: { delivery_partner_id: deliveryPartnerId, partner_name: partner.full_name },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/delivery-partners
 * Admin-only: list all users with role = 'delivery_partner'.
 */
export const listDeliveryPartners = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, role')
      .eq('role', 'delivery_partner')
      .order('full_name', { ascending: true });

    if (error) throw new ApiError(500, error.message);

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
};
