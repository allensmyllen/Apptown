import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// ProtectedRoute and AdminRoute simply redirect to home if not authenticated.
// The auth:unauthorized event from api.js will open the login modal when needed.

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return children;
}

export function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
