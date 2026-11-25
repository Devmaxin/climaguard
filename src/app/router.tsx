import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
import { AppHomePage } from '@/features/app/app-home-page'
import { AuthLayout } from '@/features/auth/auth-layout'
import { LoginPage } from '@/features/auth/login-page'
import {
  OnboardingRoute,
  RedirectIfAuthenticated,
  RequireAuth,
  RequireOnboarded,
} from '@/features/auth/route-guards'
import { SignUpPage } from '@/features/auth/signup-page'
import { OnboardingPage } from '@/features/onboarding/onboarding-page'
import { DesignSystemPage } from '@/features/design-system/design-system-page'
import { RouteErrorPage } from '@/features/errors/route-error-page'
import { HomePage } from '@/features/home/home-page'
import { NotFoundPage } from '@/features/not-found/not-found-page'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'system',
        element: <DesignSystemPage />,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <RequireOnboarded />,
            children: [
              {
                path: 'app',
                element: <AppHomePage />,
              },
            ],
          },
          {
            element: <OnboardingRoute />,
            children: [
              {
                path: 'onboarding',
                element: <OnboardingPage />,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <RedirectIfAuthenticated />,
        children: [
          {
            path: '/login',
            element: <LoginPage />,
          },
          {
            path: '/signup',
            element: <SignUpPage />,
          },
        ],
      },
    ],
  },
])

export { router }
