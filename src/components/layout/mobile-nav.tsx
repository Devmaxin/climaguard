import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { productNavigation } from '@/lib/navigation'
import { cn } from '@/lib/utils'

function MobileNav() {
const [open, setOpen] = useState(false)
const buttonRef = useRef<HTMLButtonElement>(null)
const panelRef = useRef<HTMLDivElement>(null)

useEffect(() => {
if (!open) return

const onKeyDown = (event: KeyboardEvent) => {
if (event.key === 'Escape') {
setOpen(false)
buttonRef.current?.focus()
}
}

document.addEventListener('keydown', onKeyDown)
return () => document.removeEventListener('keydown', onKeyDown)
}, [open])

return (
<div className="md:hidden">
<button
ref={buttonRef}
type="button"
aria-label={open ? 'Close navigation' : 'Open navigation'}
aria-expanded={open}
aria-controls="mobile-navigation"
onClick={() => setOpen((current) => !current)}
className="inline-flex size-10 items-center justify-center rounded-full border border-hairline bg-veil text-fog transition-colors hover:bg-veil-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
>
{open ? (
<X aria-hidden="true" className="size-4" />
) : (
<Menu aria-hidden="true" className="size-4" />
)}
</button>

<div
ref={panelRef}
id="mobile-navigation"
hidden={!open}
className="absolute inset-x-0 top-full border-b border-hairline bg-surface-strong px-5 py-4 shadow-float backdrop-blur-xl"
>
<nav aria-label="Mobile">
<ul className="flex flex-col gap-1">
{productNavigation.map((item) => (
<li key={item.to}>
<Link
to={item.to}
onClick={() => setOpen(false)}
className={cn(
'block rounded-xl px-3 py-2.5 text-sm text-fog',
'transition-colors hover:bg-veil hover:text-foreground',
)}
>
{item.label}
</Link>
</li>
))}
</ul>
</nav>
</div>
</div>
)
}

export { MobileNav }
