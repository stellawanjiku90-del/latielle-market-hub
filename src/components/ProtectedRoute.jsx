import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function ProtectedRoute({ unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked } = useAuth();
  if (!authChecked || isLoadingAuth) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center" aria-label="Checking your account">
        <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return unauthenticatedElement ?? <Navigate to="/login" replace />;
  return <Outlet />;
}
