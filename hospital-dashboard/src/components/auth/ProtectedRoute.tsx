import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { currentHospital } = useAuth();
  const location = useLocation();
  if (!currentHospital) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
