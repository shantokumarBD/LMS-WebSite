import AdminSideBar from "@/components/AdminSideBar";
import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";

const AdminDashboard = () => {
  return (
    <div className="flex w-full min-h-screen bg-[#0f172a]">
      <AdminSideBar />
      <div className="flex-1 w-full overflow-y-auto">
        <div className="p-4 md:p-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
