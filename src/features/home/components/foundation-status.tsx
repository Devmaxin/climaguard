import {
  Database,
  LayoutDashboard,
  Palette,
  Route,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/layout/container'

const foundationItems = [
  {
    icon: Palette,
    title: 'Design foundation',
    description: 'Color, type, spacing and motion tokens in one place.',
    status: 'Ready',
    state: 'ready',
  },
  {
    icon: LayoutDashboard,
    title: 'App shell',
    description: 'Header, footer, skip link and responsive page layout.',
    status: 'Ready',
    state: 'ready',
  },
  {
    icon: Route,
    title: 'Routing',
    description: 'Home, foundation reference and a considered 404 route.',
    status: 'Ready',
    state: 'ready',
  },
  {
    icon: Database,
    title: 'Climate data',
    description: 'Deferred until a trustworthy, free source is selected.',
    status: 'Deferred',
    state: 'deferred',
  },
] as const

function FoundationStatus() {
  return (
    <section
      id="status"
      aria-labelledby="status-heading"
      className="scroll-mt-24 border-y border-hairline bg-surface py-16 sm:py-20"
    >
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">Build status</p>
            <h2
              id="status-heading"
              className="mt-3 text-3xl leading-tight sm:text-4xl"
            >
              The foundation is in place.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-fog sm:text-base">
              Every layer that follows inherits from this base. Data and
              services stay intentionally disconnected until they can be added
              without inventing certainty.
            </p>
          </div>
          <Badge variant="outline" className="uppercase tracking-[0.14em]">
            v0.1.0 · foundation
          </Badge>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-line sm:grid-cols-2 lg:grid-cols-4">
          {foundationItems.map((item) => {
            const Icon = item.icon
            const isReady = item.state === 'ready'

            return (
              <div key={item.title} className="bg-surface-strong p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-xl border border-hairline bg-veil text-cyan-ink">
                    <Icon
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-fog">
                    <span
                      aria-hidden="true"
                      className={`size-1.5 rounded-full ${
                        isReady ? 'bg-lime' : 'bg-heat'
                      }`}
                    />
                    {item.status}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-base font-medium tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-haze">
                  {item.description}
                </p>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

export { FoundationStatus }
