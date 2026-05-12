import { supabase } from "../services/supabase.service.js";
import { ApiError } from "./error.middleware.js";

export const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw new ApiError(401, "Unauthorized: User missing");
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", req.user.id)
      .single();

    if (error) {
      console.error("Admin profile check error:", error.message);
      throw new ApiError(403, "Admin access check failed");
    }

    if (profile?.role !== "admin") {
      throw new ApiError(403, "Forbidden: Admin only");
    }

    next();
  } catch (error) {
    next(error);
  }
};