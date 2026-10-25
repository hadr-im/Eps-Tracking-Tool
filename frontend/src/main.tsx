import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import { Toaster }            from './components/ui/sonner'
import { AuthProvider }       from './context/AuthContext.tsx'
import { ProtectedRoute }     from './components/auth/ProtectedRoute.tsx'
import { RoleRoute }          from './components/auth/RoleRoute.tsx'
import { AppLayout }          from './layouts/AppLayout.tsx'
import { RouteFallback }      from './components/layout/RouteFallback.tsx'

/*
  Every page below is split into its own chunk and fetched the first time its
  route is visited. Imported normally they all landed in one bundle, so a
  member opening the login screen was made to download the VP dashboards and
  their charting library before anything could render.

  LoginPage is the exception and stays eager: it is the first screen for anyone
  not signed in, and splitting it would only add a network round-trip in front
  of the thing people are waiting for.
*/

// Pages: authenticated
const MyCrmPage              = lazy(() => import('./pages/MyCrmPage.tsx'))
const MyDashboardPage        = lazy(() => import('./pages/MyDashboardPage.tsx'))
const TeamCrmPage            = lazy(() => import('./pages/TeamCrmPage.tsx'))
const TeamDashboardPage      = lazy(() => import('./pages/TeamDashboardPage.tsx'))
const LeadsPage              = lazy(() => import('./pages/LeadsPage.tsx'))
const ManualLeadsPage        = lazy(() => import('./pages/ManualLeadsPage.tsx'))
const ApprovedEpsPage        = lazy(() => import('./pages/ApprovedEpsPage.tsx'))
const EpsUnderProcessPage    = lazy(() => import('./pages/EpsUnderProcessPage.tsx'))
const GlobalDashboardPage    = lazy(() => import('./pages/GlobalDashboardPage.tsx'))
const ProfilePage            = lazy(() => import('./pages/ProfilePage.tsx'))
const TransitionedEpsPage    = lazy(() => import('./pages/TransitionedEpsPage.tsx'))
const ApprovalsPage          = lazy(() => import('./pages/ApprovalsPage.tsx'))
const MembersPage            = lazy(() => import('./pages/MembersPage.tsx'))

// Pages: public
import LoginPage             from './pages/LoginPage.tsx'

const SignupPage             = lazy(() => import('./pages/SignupPage.tsx'))
const CompleteGoogleSignupPage = lazy(() => import('./pages/CompleteGoogleSignupPage.tsx'))
const ForgotPasswordPage     = lazy(() => import('./pages/ForgotPasswordPage.tsx'))
const VerifyOtpPage          = lazy(() => import('./pages/VerifyOtpPage.tsx'))
const ResetPasswordPage      = lazy(() => import('./pages/ResetPasswordPage.tsx'))
const OAuthCallbackPage      = lazy(() => import('./pages/OAuthCallbackPage.tsx'))

/*
  Defaults matter more than they look here. Without them every query is stale
  the moment it resolves, so each navigation between CRM, Dispatch and the
  dashboards refires the whole page's requests even when the user is just
  moving back and forth.

  The two times do different jobs and the difference is what people feel when
  they navigate:

  - staleTime is how long a cached result is served with no request at all.
  - gcTime is how long an unused result is KEPT. Navigating away unmounts the
    page, its queries go inactive, and when gcTime elapses the data is thrown
    out. Come back after that and there is nothing to show, so the page loads
    from scratch.

  Past staleTime but inside gcTime is the good case: the cached rows render
  immediately and a refetch runs behind them. So gcTime is the setting that
  decides whether returning to a page is instant, and the 5-minute default was
  far too short for how this app is used — people bounce between CRM, Dispatch
  and a dashboard over a whole session. 30 minutes costs a few hundred KB of
  JSON and removes almost every reload.

  Refetch on reconnect stays on — coming back from a dropped connection is
  exactly when the screen is most likely to be wrong. Refetch on window focus
  is off: members leave this open beside EXPA all day and every tab-back was
  firing a fresh round of queries for data that had not moved.
*/
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <BrowserRouter>
        {/* AuthProvider is inside BrowserRouter so it can call useNavigate() */}
        <AuthProvider>
          {/*
            Covers the public auth pages. Authenticated routes have their own
            boundary inside AppLayout so the shell survives navigation.
          */}
          <Suspense fallback={<RouteFallback />}>
          <Routes>

            {/* Authenticated routes (sidebar layout)  */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* Redirect root to CRM */}
                <Route index element={<Navigate to="/crm" replace />} />

                {/* All-roles routes */}
                <Route path="/crm"       element={<MyCrmPage />} />
                <Route path="/dashboard" element={<MyDashboardPage />} />

                {/* TL + VP routes */}
                <Route element={<RoleRoute allowed={['TEAM_LEADER', 'VP']} />}>
                  <Route path="/team/crm"           element={<TeamCrmPage />} />
                  <Route path="/team/dashboard"     element={<TeamDashboardPage />} />
                  <Route path="/dispatch"           element={<LeadsPage />} />
                  <Route path="/manual-leads"       element={<ManualLeadsPage />} />
                  <Route path="/team/approved-eps"  element={<ApprovedEpsPage />} />
                  <Route path="/team/under-process" element={<EpsUnderProcessPage />} />
                  <Route path="/team/transitioned-eps" element={<TransitionedEpsPage />} />
                </Route>

                {/* VP-only routes */}
                <Route element={<RoleRoute allowed={['VP']} />}>
                  <Route path="/global-dashboard" element={<GlobalDashboardPage />} />
                  <Route path="/approvals"        element={<ApprovalsPage />} />
                  <Route path="/members"          element={<MembersPage />} />
                </Route>
                <Route path="/settings"  element={<ProfilePage />} />
              </Route>
            </Route>

            {/*  Public routes (auth flow)  */}
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/signup"          element={<SignupPage />} />
            {/* Step 2 of the Google flow */}
            <Route path="/signup/complete" element={<CompleteGoogleSignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-otp"      element={<VerifyOtpPage />} />
            <Route path="/reset-password"  element={<ResetPasswordPage />} />
            <Route path="/oauth/callback"  element={<OAuthCallbackPage />} />

          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)