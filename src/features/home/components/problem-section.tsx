import { CircleHelp, CloudRain, ListFilter } from 'lucide-react'

import { Container } from '@/components/layout/container'
import { Card } from '@/components/ui/card'
import { SectionHeading } from '@/components/ui/section-heading'

const problems = [
{
icon: CloudRain,
title: 'Signals without meaning',
description:
'Forecasts, warnings and headlines arrive constantly. Knowing the number is not the same as knowing what it means for your day.',
},
{
icon: CircleHelp,
title: 'Risk without priority',
description:
'When several hazards overlap, it is hard to tell what needs attention now and what can wait.',
},
{
icon: ListFilter,
title: 'Information without action',
description:
'Most climate information stops at the alert. The useful question — what should I do? — is left unanswered.',
},
] as const

function ProblemSection() {
  return (
    <section
      aria-labelledby="problem-heading"
      className="border-t border-hairline py-20 sm:py-24"
    >
      <Container className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <SectionHeading
          id="problem-heading"
          eyebrow="The problem"
          title="Weather data is everywhere. Clarity isn't."
          description="The gap is not access to information. It is turning that information into a decision you can actually make."
        />

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
          {problems.map(({ icon: Icon, title, description }, index) => (
            <Card key={title} className="flex flex-col p-5">
              <span className="inline-flex size-9 items-center justify-center rounded-xl border border-cyan/15 bg-cyan/10 text-cyan-ink">
                <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </span>
              <p className="mt-5 text-[0.65rem] font-medium tabular-nums tracking-[0.2em] text-haze">
                0{index + 1}
              </p>
              <h3 className="mt-1 text-base text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fog">
                {description}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  )
}

export { ProblemSection }
