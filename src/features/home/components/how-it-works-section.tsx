import { Activity, BellRing, Cpu, Database, ShieldCheck } from 'lucide-react'

import { Container } from '@/components/layout/container'
import { Badge } from '@/components/ui/badge'
import { SectionHeading } from '@/components/ui/section-heading'

const steps = [
{
icon: Database,
title: 'Trusted climate data',
description:
'Public climate and weather sources, with source and timestamp kept alongside every record.',
},
{
icon: ShieldCheck,
title: 'Validation & freshness',
description:
'Incoming information is checked for completeness and staleness before it is used.',
},
{
icon: Activity,
title: 'Deterministic risk rules',
description:
'Defined thresholds grade wind risk on the Beaufort scale — not a language model.',
},
{
icon: Cpu,
title: 'TapeOut policy evaluation',
description:
'A circuit evaluates the policy decision, creating a verifiable check on the rule outcome.',
},
{
icon: BellRing,
title: 'Actions & transparency',
description:
'Clear guidance for people, plus decision references that can be inspected later.',
},
] as const

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="border-t border-hairline py-20 sm:py-24"
    >
      <Container>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            id="how-it-works-heading"
            eyebrow="How it works"
            title="From raw signal to useful action."
            description="A deliberate pipeline keeps numerical risk decisions deterministic, with every explanation traceable to the same rules."
          />
          <Badge variant="muted" className="w-fit">
            Wind risk live · other hazards pending
          </Badge>
        </div>

        <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <li
              key={title}
              className="relative rounded-2xl border border-hairline bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <Icon
                  aria-hidden="true"
                  className="size-5 text-cyan-ink"
                  strokeWidth={1.75}
                />
                <span className="text-[0.65rem] font-medium tabular-nums tracking-[0.2em] text-haze">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-6 text-sm text-foreground">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-fog">
                {description}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-xs leading-relaxed text-haze">
          This is the intended pipeline. Live ECMWF forecast data and
          deterministic wind-risk assessment are connected today. Policy circuit
          evaluation and on-chain records are not yet enabled, and other hazards
          are left unassessed rather than estimated.
        </p>
      </Container>
    </section>
  )
}

export { HowItWorksSection }
