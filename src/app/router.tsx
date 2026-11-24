import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
import { AppHomePage } from '@/features/app/app-home-page'
import { AuthLayout } from '@/features/auth/auth-layout'
import { LoginPage } from '@/features/auth/login-page'
import { RedirectIfAuthenticated, RequireAuth } from '@/features/auth/route-guards'
import { SignUpPage } from '@/features/auth/signup-page'
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
            path: 'app',
            element: <AppHomePage />,
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
