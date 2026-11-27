import { Building2, Check, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SectionHeading } from '@/components/ui/section-heading'

const personalActions = [
  'A daily brief for your locations',
  'Wind risk in plain language',
  'Before, during and after recommendations',
]

const businessActions = [
  'Monitor several sites from one view',
  'Operational risk summaries by location',
  'Decision references for later review',
]

function UseCasesSection() {
  return (
    <section
      id="use-cases"
      aria-labelledby="use-cases-heading"
      className="border-t border-hairline py-20 sm:py-24"
    >
      <Container>
        <SectionHeading
          id="use-cases-heading"
          eyebrow="Personal & business"
          title="One platform. Two ways to use it."
          description="The same validated climate intelligence, shaped around the decisions households and teams actually make."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <Card className="relative overflow-hidden p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-cyan/10 blur-3xl"
            />
            <div className="relative">
              <span className="inline-flex size-10 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan-ink">
                <Home
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={1.75}
                />
              </span>
              <h3 className="mt-6 text-xl text-foreground">Personal mode</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-fog">
                For individuals and households who want a clear read on the day
                ahead — without needing to interpret a forecast model.
              </p>
              <ul className="mt-6 space-y-3">
                {personalActions.map((action) => (
                  <li
                    key={action}
                    className="flex items-start gap-3 text-sm text-foreground"
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-lime-ink"
                      strokeWidth={2}
                    />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-lime/10 blur-3xl"
            />
            <div className="relative">
              <span className="inline-flex size-10 items-center justify-center rounded-xl border border-lime/20 bg-lime/10 text-lime-ink">
                <Building2
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={1.75}
                />
              </span>
              <h3 className="mt-6 text-xl text-foreground">Business mode</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-fog">
                For teams monitoring operational and location-based climate
                risk across Lagos, Metro Manila, Dhaka and beyond.
              </p>
              <ul className="mt-6 space-y-3">
                {businessActions.map((action) => (
                  <li
                    key={action}
                    className="flex items-start gap-3 text-sm text-foreground"
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-lime-ink"
                      strokeWidth={2}
                    />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        <div className="mt-8 flex justify-center">
          <Button asChild variant="secondary">
            <Link to="/system">Explore the foundation</Link>
          </Button>
        </div>
      </Container>
    </section>
  )
}

export { UseCasesSection }
