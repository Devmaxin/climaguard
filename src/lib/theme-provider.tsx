import React from 'react'

import { ThemeContext, type Theme } from '@/lib/theme-context'

const THEME_COLOR: Record<Theme, string> = {
dark: '#101827',
light: '#f6f8fa',
}

function applyTheme(theme: Theme) {
const root = document.documentElement

root.classList.remove('light', 'dark')
root.classList.add(theme)
root.setAttribute('data-theme', theme)

const colorMeta = document.querySelector('meta[name="theme-color"]')
colorMeta?.setAttribute('content', THEME_COLOR[theme])
}

export function ThemeProvider({
children,
initialTheme,
}: {
children: React.ReactNode
initialTheme: Theme
}) {
const [theme, setThemeState] = React.useState<Theme>(initialTheme)

const setTheme = (newTheme: Theme) => {
applyTheme(newTheme)

try {
localStorage.setItem('cg-theme', newTheme)
} catch {
// localStorage may be unavailable or blocked
}

setThemeState(newTheme)
}

React.useEffect(() => {
applyTheme(theme)
}, [theme])

return (
<ThemeContext.Provider value={{ theme, setTheme }}>
{children}
</ThemeContext.Provider>
)
}
