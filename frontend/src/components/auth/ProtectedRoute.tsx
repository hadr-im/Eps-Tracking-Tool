import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'

// ProtectedRoute
// Any routes that require authentication are wrapped with this component
// - While the session is being restored on load: shows a full-screen spinner
// - Not authenticated: redirects to /login
// - Authenticated: renders the matched child route via <Outlet />

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
