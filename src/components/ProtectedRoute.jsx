import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function ProtectedRoute({ unauthenticatedElement, roles }) {
  const { isAuthenticated, isLoadingAuth, authChecked, user } = useAuth();
  if (!authChecked || isLoadingAuth) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center" aria-label="Checking your account">
        <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return unauthenticatedElement ?? <Navigate to="/login" replace />;
  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(user?.role)) {
    const destination = user?.role === "admin"
      ? "/admin"
      : user?.role === "seller"
        ? "/seller-dashboard"
        : "/buyer-dashboard";
    return <Navigate to={destination} replace />;
  }
  return <Outlet />;
}
