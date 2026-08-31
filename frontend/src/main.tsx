import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import { AuthProvider }       from './context/AuthContext.tsx'
import { ProtectedRoute }     from './components/auth/ProtectedRoute.tsx'
import { AppLayout }          from './layouts/AppLayout.tsx'

// Pages: authenticated
import MyCrmPage              from './pages/MyCrmPage.tsx'
import MyDashboardPage        from './pages/MyDashboardPage.tsx'
import TeamCrmPage            from './pages/TeamCrmPage.tsx'
import TeamDashboardPage      from './pages/TeamDashboardPage.tsx'

// Pages: public 
import SignupPage             from './pages/SignupPage.tsx'
import LoginPage              from './pages/LoginPage.tsx'
import ForgotPasswordPage     from './pages/ForgotPasswordPage.tsx'
import VerifyOtpPage          from './pages/VerifyOtpPage.tsx'
import ResetPasswordPage      from './pages/ResetPasswordPage.tsx'
import OAuthCallbackPage      from './pages/OAuthCallbackPage.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* AuthProvider is inside BrowserRouter so it can call useNavigate() */}
        <AuthProvider>
          <Routes>

            {/* Authenticated routes (sidebar layout)  */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* Redirect root to CRM */}
                <Route index element={<Navigate to="/crm" replace />} />
                <Route path="/crm"            element={<MyCrmPage />} />
                <Route path="/dashboard"      element={<MyDashboardPage />} />
                <Route path="/team/crm"       element={<TeamCrmPage />} />
                <Route path="/team/dashboard" element={<TeamDashboardPage />} />
                {/* Stub routes: pages to be built in future iterations */}
                <Route path="/dispatch"  element={<div className="p-8 text-muted-foreground">Dispatch — coming soon</div>} />
                <Route path="/settings"  element={<div className="p-8 text-muted-foreground">Settings — coming soon</div>} />
              </Route>
            </Route>

            {/*  Public routes (auth flow)  */}
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/signup"          element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-otp"      element={<VerifyOtpPage />} />
            <Route path="/reset-password"  element={<ResetPasswordPage />} />
            <Route path="/oauth/callback"  element={<OAuthCallbackPage />} />

          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)