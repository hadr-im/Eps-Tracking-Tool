// RoleRoute (route guard that restricts access to specific user roles)
// Works as a layout route wrapper (renders <Outlet /> when allowed, redirects otherwise)

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface RoleRouteProps {
  // Roles that are allowed to access the child routes 
  allowed: string[];
  // Where to redirect if role not allowed (default: '/crm') 
  redirectTo?: string;
}

export function RoleRoute({ allowed, redirectTo = '/crm' }: RoleRouteProps) {
  const { user } = useAuth();

  if (!user) return null; // ProtectedRoute above already handles unauthenticated case

  if (!allowed.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
