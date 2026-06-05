import { saveGymInquiry, saveContactInquiry } from '../services/supabase.service.js';
import { ApiError } from '../middleware/error.middleware.js';

/**
 * POST /api/inquiries/gym
 * Saves a gym partner inquiry to the database using the service-role key.
 * Accessible by any authenticated user.
 */
export const submitGymInquiry = async (req, res, next) => {
  try {
    const { gymName, ownerName, phone, city, expectedDailyOrders, notes } = req.body;

    if (!gymName || !ownerName || !phone || !city) {
      throw new ApiError(400, 'gymName, ownerName, phone, and city are required');
    }

    if (!/^\d{10}$/.test(String(phone).trim())) {
      throw new ApiError(400, 'Phone must be a 10-digit number');
    }

    const inquiry = await saveGymInquiry({
      gym_name: gymName.trim(),
      owner_name: ownerName.trim(),
      phone: String(phone).trim(),
      city: city.trim(),
      expected_daily_orders: expectedDailyOrders ? Number(expectedDailyOrders) : null,
      notes: notes?.trim() || null,
    });

    res.status(201).json({ success: true, data: inquiry });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/inquiries/contact
 * Saves a contact form submission to the database.
 * Accessible by any authenticated user.
 */
export const submitContactInquiry = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      throw new ApiError(400, 'name, email, and message are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ApiError(400, 'Invalid email address');
    }

    const inquiry = await saveContactInquiry({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject?.trim() || null,
      message: message.trim(),
    });

    res.status(201).json({ success: true, data: inquiry });
  } catch (err) {
    next(err);
  }
};
