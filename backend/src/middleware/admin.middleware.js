import { supabase } from '../services/supabase.service.js';
import { ApiError } from './error.middleware.js';

export const adminMiddleware = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized: Login required');
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new ApiError(403, 'Forbidden: Unable to verify admin role');
    }

    if (profile.role !== 'admin') {
      throw new ApiError(403, 'Forbidden: Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};