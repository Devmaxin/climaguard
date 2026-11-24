import {
  BellRing,
  BarChart3,
  Clock3,
  HeartPulse,
  Lightbulb,
  MapPinned,
} from 'lucide-react'

import { Container } from '@/components/layout/container'
import { SectionHeading } from '@/components/ui/section-heading'

const capabilities = [
{
icon: Clock3,
title: 'Daily climate intelligence',
description:
'A clear, readable brief for the day ahead instead of a wall of raw numbers.',
},
{
icon: BellRing,
title: 'Multi-hazard alerts',
description:
'Heat, heavy rainfall and flood-risk information presented with context and severity.',
},
{
icon: HeartPulse,
title: 'Personalized actions',
description:
'Before, during and after guidance shaped around the risks that matter to you.',
},
{
icon: Lightbulb,
title: 'Risk explanations',
description:
'Plain-language explanations of why a risk was raised and what it could affect.',
},
{
icon: MapPinned,
title: 'Location awareness',
description:
'Risk visibility for the places you care about, from a home to a portfolio of sites.',
},
{
icon: BarChart3,
title: 'Business intelligence',
description:
'Operational summaries that help teams prepare, communicate and adjust.',
},
] as const

function SolutionSection() {
  return (
    <section
      aria-labelledby="solution-heading"
      className="border-t border-hairline bg-surface py-20 sm:py-24"
    >
      <Container>
        <SectionHeading
          id="solution-heading"
          eyebrow="The solution"
          title="Intelligence you can act on."
          description="ClimaGuard connects trusted climate information to practical guidance — so preparation starts before the alert becomes urgent."
        />

        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-surface-strong p-6 transition-colors hover:bg-surface-strong motion-reduce:transition-none"
            >
              <Icon
                aria-hidden="true"
                className="size-5 text-cyan-ink"
                strokeWidth={1.75}
              />
              <h3 className="mt-5 text-base text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fog">
                {description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

export { SolutionSection }
