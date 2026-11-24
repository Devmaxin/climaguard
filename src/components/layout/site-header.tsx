import { Link, NavLink } from 'react-router-dom'

import { BrandLockup } from '@/components/brand/brand'
import { Container } from '@/components/layout/container'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuth } from '@/hooks/use-auth'
import { productNavigation } from '@/lib/navigation'
import { cn } from '@/lib/utils'

function SiteHeader() {
const { status } = useAuth()
const signedIn = status === 'authenticated'

return (
<header className="sticky top-0 z-50 border-b border-hairline bg-surface-strong backdrop-blur-xl">
<Container className="relative flex h-16 items-center justify-between gap-4">
<Link
to="/"
aria-label="ClimaGuard home"
className="group inline-flex shrink-0 items-center rounded-lg p-1"
>
<BrandLockup
markClassName="size-8 transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none"
wordmarkClassName="hidden text-base sm:inline"
/>
</Link>

<nav
aria-label="Primary"
className="hidden items-center gap-1 md:flex"
>
{productNavigation.map((item) => (
<NavLink
key={item.to}
to={item.to}
className={({ isActive }) =>
cn(
'rounded-full px-3 py-2 text-xs font-medium transition-colors',
'text-fog hover:bg-veil hover:text-foreground',
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-ink',
isActive && 'text-foreground',
)
}
>
{item.label}
</NavLink>
))}
</nav>

<div className="flex shrink-0 items-center gap-2">
<span className="hidden rounded-full border border-hairline bg-veil px-3 py-1.5 text-[0.6rem] font-medium uppercase tracking-[0.16em] text-haze lg:inline-flex">
Preview build
</span>
<ThemeToggle />
{signedIn ? (
<Button asChild variant="default" size="sm">
<Link to="/app">Open app</Link>
</Button>
) : (
<Button asChild variant="secondary" size="sm">
<Link to="/login">Sign in</Link>
</Button>
)}
<MobileNav />
</div>
</Container>
</header>
)
}

export { SiteHeader }
