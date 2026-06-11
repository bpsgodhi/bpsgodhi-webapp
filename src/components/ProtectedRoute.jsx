import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AUTH_ENABLED } from '../config';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuthStore();
  if (AUTH_ENABLED && !user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
