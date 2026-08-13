import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/services/apiClient'
import { Loader2 } from 'lucide-react'
import type { AuthUser } from '@/types/auth'

// OAuthCallbackPage
//
// The backend redirects here after a successful Google login: /oauth/callback?accessToken=eyJ...
//
// This page:
//   1. Reads the accessToken from the URL search param
//   2. Fetches the user profile using that token (GET /auth/me) so we have a proper AuthUser to store in context
//   3. Calls login() to persist the token and user
//   4. Redirects to the app home
//   5. On any error : redirects to /login
//
// The accessToken is removed from the URL immediately by using replace: true on navigate, so it never stays in browser history

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')

    if (!accessToken) {
      navigate('/login', { replace: true })
      return
    }

    // Fetch the user profile using the token from the URL
    // it's passed manually in the header since AuthContext hasn't stored it yet
    apiClient
      .get<AuthUser>('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then(({ data }) => {
        login({ accessToken, user: data })
        navigate('/', { replace: true })
      })
      .catch(() => {
        navigate('/login?error=oauth_failed', { replace: true })
      })
  // Runs once on mount, searchParams and navigate are stable refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
      <Loader2 size={24} className="animate-spin" />
      <p className="text-sm">Completing sign-in…</p>
    </div>
  )
}
