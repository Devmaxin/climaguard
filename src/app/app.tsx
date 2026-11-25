import { RouterProvider } from 'react-router-dom'

import { AccountProvider } from '@/lib/account/account-provider'
import { AuthProvider } from '@/lib/auth/auth-provider'
import { ThemeProvider } from '@/lib/theme-provider'
import { router } from '@/app/router'

type AppProps = {
  initialTheme: 'dark' | 'light'
}

function App({ initialTheme }: AppProps) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <AuthProvider>
        <AccountProvider>
          <RouterProvider router={router} />
        </AccountProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
