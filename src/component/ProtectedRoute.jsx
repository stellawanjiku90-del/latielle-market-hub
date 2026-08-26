import { Outlet, Navigate } from 'react-router-dom';
import { getSession } from '@/lib/auth';

export default function ProtectedRoute({ unauthenticatedElement }) {
  // Read synchronously from localStorage — no async gap
  const session = getSession();
  if (!session) {
    return unauthenticatedElement ?? <Navigate to="/login" replace />;
  }
  return <Outlet />;
}