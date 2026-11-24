import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import './styles/globals.css'

import App from './app/app'

// Read saved theme before React mounts to avoid a flash of the wrong theme.
const savedTheme =
  typeof localStorage !== 'undefined'
    ? (localStorage.getItem('cg-theme') as 'dark' | 'light' | null)
    : null

const rootElement = document.getElementById('root')!

createRoot(rootElement).render(
  <StrictMode>
    <App initialTheme={savedTheme ?? 'dark'} />
  </StrictMode>,
)
