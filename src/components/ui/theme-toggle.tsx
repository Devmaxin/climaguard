import { Moon, Sun } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'

type ThemeToggleProps = {
className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
const { theme, setTheme } = useTheme()
const nextTheme = theme === 'dark' ? 'light' : 'dark'

return (
<button
type="button"
onClick={() => setTheme(nextTheme)}
aria-label={`Switch to ${nextTheme} mode`}
aria-pressed={theme === 'light'}
className={cn(
'inline-flex items-center justify-center gap-1.5 rounded-full border border-hairline bg-veil px-3 py-2 text-xs font-medium text-fog transition-colors duration-200 hover:bg-veil-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none',
className,
)}
>
{theme === 'dark' ? (
<Sun aria-hidden="true" className="size-3.5" />
) : (
<Moon aria-hidden="true" className="size-3.5" />
)}
<span className="hidden sm:inline">{nextTheme === 'light' ? 'Light' : 'Dark'}</span>
</button>
)
}
