import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { PageSpinner } from '@/components/ui/Spinner';
import type { AppRole } from '@/types';

interface Props {
  children: ReactNode;
  roles: AppRole[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { session, appRole, mustChangePassword, _hydrated } = useAuthStore();
  const location = useLocation();

  if (!_hydrated) return <PageSpinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  if (appRole && !roles.includes(appRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
