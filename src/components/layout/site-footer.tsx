import { Link } from 'react-router-dom'

import { BrandLockup } from '@/components/brand/brand'
import { Container } from '@/components/layout/container'
import { productNavigation, utilityNavigation } from '@/lib/navigation'

const CURRENT_YEAR = new Date().getFullYear()

function SiteFooter() {
return (
<footer className="border-t border-hairline py-10">
<Container className="flex flex-col gap-8">
<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
<Link
to="/"
aria-label="ClimaGuard home"
className="w-fit rounded-lg p-1"
>
<BrandLockup markClassName="size-7" wordmarkClassName="text-sm" />
</Link>

<div className="flex flex-wrap gap-x-8 gap-y-3">
<nav aria-label="Product">
<ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
{productNavigation.map((item) => (
<li key={item.to}>
<Link
to={item.to}
className="rounded text-fog transition-colors hover:text-foreground"
>
{item.label}
</Link>
</li>
))}
</ul>
</nav>
<nav aria-label="Footer">
<ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
{utilityNavigation.map((item) => (
<li key={item.to}>
<Link
to={item.to}
className="rounded text-fog transition-colors hover:text-foreground"
>
{item.label}
</Link>
</li>
))}
</ul>
</nav>
</div>
</div>

<div className="flex flex-col gap-2 border-t border-hairline pt-6 text-xs leading-relaxed text-haze sm:flex-row sm:items-center sm:justify-between">
<p>
© {CURRENT_YEAR} ClimaGuard. Forecast data from ECMWF Open Data (CC BY 4.0).
Wind risk assessed; other hazards not yet covered.
</p>
<p className="text-fog">
Know what&apos;s coming. Know what to do.
</p>
</div>
</Container>
</footer>
)
}

export { SiteFooter }
