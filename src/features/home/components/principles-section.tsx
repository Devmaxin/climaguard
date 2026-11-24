import { ListChecks, Radar, ShieldCheck } from 'lucide-react'

import { Container } from '@/components/layout/container'
import { Card } from '@/components/ui/card'

const principles = [
  {
    icon: Radar,
    title: 'Foresight, not noise',
    description:
      'Surface the signal early, then keep everything else quiet until it matters.',
  },
  {
    icon: ListChecks,
    title: 'Action, not alarm',
    description:
      'Every warning should arrive with a clear, proportionate next step attached.',
  },
  {
    icon: ShieldCheck,
    title: 'Calm under pressure',
    description:
      'Readable hierarchy and restrained motion, even when conditions change quickly.',
  },
] as const

function PrinciplesSection() {
  return (
    <section aria-labelledby="principles-heading" className="py-16 sm:py-24">
      <Container>
        <div className="max-w-2xl">
          <p className="eyebrow">Product principles</p>
          <h2
            id="principles-heading"
            className="mt-3 text-3xl leading-tight sm:text-4xl"
          >
            Designed for the moments that matter.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fog sm:text-base">
            The product will grow, but these constraints stay fixed. They decide
            what earns a place on the screen.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {principles.map((principle, index) => {
            const Icon = principle.icon

            return (
              <Card
                key={principle.title}
                className="group p-6 transition-colors duration-300 hover:border-cyan/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-10 place-items-center rounded-xl border border-cyan/15 bg-cyan/[0.06] text-cyan-ink transition-colors duration-300 group-hover:border-cyan/30 group-hover:bg-cyan/10">
                    <Icon
                      aria-hidden="true"
                      className="size-4.5"
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="text-[0.65rem] tabular-nums tracking-[0.18em] text-haze">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-8 font-display text-lg font-medium tracking-tight">
                  {principle.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-fog">
                  {principle.description}
                </p>
              </Card>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

export { PrinciplesSection }
