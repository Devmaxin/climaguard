import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
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
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])

export { router }
