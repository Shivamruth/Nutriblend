import { supabase } from "../services/supabase.service.js";
import { ApiError } from "./error.middleware.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Unauthorized: Missing token");
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      throw new ApiError(401, "Unauthorized: Empty token");
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("Supabase token verification error:", error?.message);

      throw new ApiError(401, "Unauthorized: Invalid token");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};