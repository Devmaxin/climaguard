import { ArrowLeft, CloudSun, MapPin, ShieldCheck } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

import { BrandLockup } from '@/components/brand/brand'
import { Container } from '@/components/layout/container'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const highlights = [
  {
    icon: MapPin,
    title: 'Three cities, one briefing',
    body: 'Lagos, Metro Manila and Dhaka — tracked together, not one at a time.',
  },
  {
    icon: CloudSun,
    title: 'Built for the decision',
    body: 'Hazard signals turned into what to do today, not another dashboard to read.',
  },
  {
    icon: ShieldCheck,
    title: 'Your locations stay yours',
    body: 'Every row is scoped to your account at the database level, not just in the UI.',
  },
]

/**
 * The account surface sits outside the marketing shell on purpose: signing in
 * should feel like stepping into the product, not scrolling the landing page.
 */
function AuthLayout() {
  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-grid opacity-60"
      />

      <div className="flex items-center justify-between px-5 pt-5 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg p-1 text-xs font-medium text-fog transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Back to site
        </Link>
        <ThemeToggle />
      </div>

      <Container className="flex flex-1 items-center py-10 sm:py-14">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_minmax(0,25rem)] lg:gap-20">
          <section className="hidden lg:block">
            <BrandLockup markClassName="size-9" wordmarkClassName="text-lg" />

            <h1 className="mt-8 max-w-xl font-display text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-balance text-foreground">
              Know what the climate is doing{' '}
              <span className="text-climate-gradient">before it costs you a day.</span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-fog">
              ClimaGuard watches the hazards that actually disrupt life in West
              Africa and South Asia, and turns them into a short list of things
              worth doing today.
            </p>

            <ul className="mt-10 flex flex-col gap-5">
              {highlights.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-hairline bg-veil text-cyan-ink">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-fog">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="mx-auto w-full max-w-md">
            <div className="mb-7 flex items-center justify-between lg:hidden">
              <BrandLockup markClassName="size-8" wordmarkClassName="text-base" />
            </div>
            <Outlet />
          </section>
        </div>
      </Container>
    </div>
  )
}

export { AuthLayout }
