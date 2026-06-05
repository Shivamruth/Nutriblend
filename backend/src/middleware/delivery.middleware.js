import { supabaseAdmin } from '../services/supabase.service.js';
import { ApiError } from './error.middleware.js';

/**
 * Middleware that ensures the authenticated user has the 'delivery_partner' role.
 * Must be used after authMiddleware.
 */
export const deliveryPartnerMiddleware = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, 'Authentication required');

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw new ApiError(500, 'Could not verify role');

    const role = profile?.role;
    if (role !== 'delivery_partner' && role !== 'admin') {
      throw new ApiError(403, 'Delivery partner access required');
    }

    req.role = role;
    next();
  } catch (err) {
    next(err);
  }
};
