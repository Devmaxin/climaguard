import { RouterProvider } from 'react-router-dom'

import { ThemeProvider } from '@/lib/theme-provider'
import { router } from '@/app/router'

type AppProps = {
  initialTheme: 'dark' | 'light'
}

function App({ initialTheme }: AppProps) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}

export default App
