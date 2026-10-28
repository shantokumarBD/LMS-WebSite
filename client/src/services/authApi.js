import api from "../lib/api";
import { authClient } from "../lib/auth-client";

export const registerUser = async (userData) => {
  // Better Auth Sign Up with additional fields
  const { data, error } = await authClient.signUp.email({
    email: userData.email,
    password: userData.password,
    name: userData.name,
    role: userData.role || "student",
  });

  if (error) {
    throw new Error(error.message || "Registration failed");
  }

  // Fetch JWT token using Better Auth JWT plugin
  let jwtToken = null;
  try {
    const tokenRes = await authClient.token();
    if (tokenRes?.data?.token) {
      jwtToken = tokenRes.data.token;
      localStorage.setItem("auth_jwt_token", jwtToken);
    }
  } catch (e) {
    console.warn("Could not retrieve Better Auth JWT token:", e);
  }

  return {
    success: true,
    message: "Account created successfully!",
    token: jwtToken,
    user: data?.user || {
      name: userData.name,
      email: userData.email,
      role: userData.role || "student",
    },
  };
};

export const loginUser = async (userData) => {
  let user = null;
  let jwtToken = null;

  // 1. Attempt Better Auth Sign In
  const res = await authClient.signIn.email({
    email: userData.email,
    password: userData.password,
  });

  if (!res.error && res.data) {
    user = res.data.user;
    try {
      const tokenRes = await authClient.token();
      if (tokenRes?.data?.token) {
        jwtToken = tokenRes.data.token;
        localStorage.setItem("auth_jwt_token", jwtToken);
      }
    } catch (e) {
      console.warn("Could not retrieve Better Auth JWT token:", e);
    }

    return {
      success: true,
      message: "Login successful",
      token: jwtToken,
      user,
    };
  }

  // 2. Fallback to server /api/v1/users/login for legacy/seeded accounts (e.g. create-admin.js)
  try {
    const legacyRes = await api.post("/users/login", userData);
    if (legacyRes.data?.success) {
      return legacyRes.data;
    }
  } catch (legacyErr) {
    const errorMsg =
      res.error?.message ||
      legacyErr.response?.data?.message ||
      "Incorrect email or password";
    throw new Error(errorMsg);
  }

  throw new Error(res.error?.message || "Login failed");
};

export const forgotPassword = async (email) => {
  const response = await api.post("/users/forgot-password", { email });
  return response.data;
};

export const resetPassword = async ({ token, password }) => {
  const response = await api.post(`/users/reset-password/${token}`, {
    password,
  });
  return response.data;
};

export const logoutUser = async () => {
  try {
    await authClient.signOut();
  } catch (e) {
    console.warn("Better auth signOut error:", e);
  }
  localStorage.removeItem("auth_jwt_token");
  const response = await api.post("/users/logout");
  return response.data;
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get("/users/me");
    if (response.data?.user) {
      return response.data;
    }
  } catch (apiErr) {
    // Fallback to Better Auth session if /users/me fails
    try {
      const sessionRes = await authClient.getSession();
      if (sessionRes?.data?.user) {
        return {
          success: true,
          user: sessionRes.data.user,
        };
      }
    } catch (e) {}
    throw apiErr;
  }
};

export const updateProfile = async (userData) => {
  const headers = {};

  // Check if userData is FormData
  const isFormData = userData instanceof FormData;

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await api.put("/users/update-profile", userData, {
    headers,
  });
  return response.data;
};

export const getAllUsersService = async () => {
  const response = await api.get("/users");
  return response.data;
};

export const getEnrolledCourses = async () => {
  const response = await api.get("/users/enrolled-courses");
  return response.data;
};

export const getWishlist = async () => {
  const response = await api.get("/users/wishlist");
  return response.data;
};
