import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { auth } from "../utils/auth.js";

/**
 * Universal Authenticate Middleware
 * Dynamically supports:
 * 1. Better Auth session (via cookies or Bearer session token)
 * 2. Better Auth JWT token (Authorization: Bearer <token>)
 * 3. Legacy JWT token (cookies.token)
 */
export const authenticate = async (req, res, next) => {
  try {
    // 1. Check Better Auth Session
    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (session?.user) {
        if (session.user.isBanned) {
          return res.status(403).json({
            success: false,
            message: "Your account has been suspended. Please contact support.",
          });
        }

        req.user = {
          id: session.user.id,
          role: session.user.role || "student",
          email: session.user.email,
          name: session.user.name,
        };

        return next();
      }
    } catch (sessionErr) {
      // Continue to token check if session check fails
    }

    // 2. Extract Token from Cookies or Authorization Header
    let token = req.cookies?.token;
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login.",
      });
    }

    // 3. Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_super_secret_jwt_key_at_least_32_chars",
    );
    const userId = decoded.id || decoded.sub;

    // Check if user is still active and not banned
    const user = await User.findById(userId).select("isBanned role");
    if (user) {
      if (user.isBanned) {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended. Please contact support.",
        });
      }

      req.user = {
        id: user._id.toString(),
        role: user.role,
      };
      return next();
    }

    // Fallback if user is in Better Auth database collection
    req.user = {
      id: userId,
      role: decoded.role || "student",
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token. Please login again.",
    });
  }
};
