import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function GuestOnlyRoute() {
  const { user, isLoadingAuth, authChecked, dashboardFor } = useAuth();

  if (!authChecked || isLoadingAuth) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center" aria-label="Loading">
        <div className="h-7 w-7 rounded-full border-2 border-border border-t-primary animate-spin" />
      </div>
    );
  }

  return user ? <Navigate to={dashboardFor(user)} replace /> : <Outlet />;
}
