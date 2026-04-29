import { supabase } from '../services/supabase.service.js';
import { ApiError } from './error.middleware.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Unauthorized: No token provided');
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new ApiError(401, 'Unauthorized: Invalid token');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
