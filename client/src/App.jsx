import React, { Suspense, useEffect } from "react";
import Navbar from "./components/Navbar";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import { useAuthInit } from "./hooks/useAuthInit";
import { useAdSenseInit } from "./hooks/useAdSenseInit";
import { Loader2 } from "lucide-react";
import { useDispatch } from "react-redux";
import { fetchPlatformSettings } from "./store/slices/settingsSlice";

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
  </div>
);

const App = () => {
  const { isLoading } = useAuthInit();
  useAdSenseInit();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchPlatformSettings());
  }, [dispatch]);

  const location = useLocation();
  const isAdminPath = location.pathname.startsWith("/admin");
  const isCourseProgressPath = location.pathname.startsWith("/course-progress");

  const hideNavbarFooter = isAdminPath || isCourseProgressPath;

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {!hideNavbarFooter && <Navbar />}
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      {!hideNavbarFooter && <Footer />}
    </div>
  );
};

export default App;
