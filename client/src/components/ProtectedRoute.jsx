import React from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles, roles }) => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  const acceptedRoles = allowedRoles || roles;

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (acceptedRoles && !acceptedRoles.includes(user.role)) {
    // Redirect to home if user role is not allowed
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
