import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import App from './App.tsx'
import Home from './pages/Home.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { ProtectedRoute } from './components/auth/ProtectedRoute.tsx'
import SignupPage from './pages/SignupPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx'
import VerifyOtpPage from './pages/VerifyOtpPage.tsx'
import ResetPasswordPage from './pages/ResetPasswordPage.tsx'
import OAuthCallbackPage from './pages/OAuthCallbackPage.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* AuthProvider is inside BrowserRouter so it can call useNavigate() */}
        <AuthProvider>
          <Routes>
            {/* Protected routes (redirect to /login if not authenticated) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<App />} />
              <Route path="/home" element={<Home />} />
            </Route>

            {/* Public routes (accessible without authentication) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)