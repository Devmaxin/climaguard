import {
  ArrowLeft,
  Accessibility,
  Eye,
  Keyboard,
  Layers,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Container } from '@/components/layout/container'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SectionHeading } from '@/components/ui/section-heading'
import { FoundationStatus } from '@/features/home/components/foundation-status'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useTheme } from '@/hooks/use-theme'
import { colorTokens } from '@/lib/design-tokens'

const accessibilityPrinciples = [
  {
    icon: Keyboard,
    title: 'Keyboard first',
    description:
      'A skip link, visible cyan focus rings and a logical reading order on every route.',
  },
  {
    icon: Accessibility,
    title: 'Motion with respect',
    description:
      'Animations are decorative and collapse automatically under reduced-motion preferences.',
  },
  {
    icon: Layers,
    title: 'Semantic structure',
    description:
      'Landmarks, heading hierarchy and navigation labels carry meaning before styling does.',
  },
  {
    icon: Eye,
    title: 'Contrast aware',
    description:
      'Primary and secondary text pairings are selected toward WCAG 2.2 AA on dark surfaces.',
  },
] as const

function DesignSystemPage() {
  useDocumentTitle('Design foundation')
  const { theme } = useTheme()

  return (
    <>
      <section className="border-b border-hairline pb-12 pt-12 sm:pb-16 sm:pt-16">
        <Container>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <Badge
                variant="outline"
                className="uppercase tracking-[0.16em]"
              >
                Design foundation · v0.1
              </Badge>
              <h1 className="mt-5 text-4xl leading-[1.02] sm:text-5xl">
                Foundation, made visible.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-fog sm:text-base">
                The shared language for ClimaGuard: a midnight canvas, two
                typefaces and a small set of signal colors with one job each.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="w-fit">
              <Link to="/">
                <ArrowLeft aria-hidden="true" />
                Back to overview
              </Link>
            </Button>
          </div>
        </Container>
      </section>

      <FoundationStatus />

      <section
        aria-labelledby="palette-heading"
        className="py-14 sm:py-20"
      >
        <Container>
          <SectionHeading
            id="palette-heading"
            eyebrow="Palette"
            title="Color carries the signal."
            description="Midnight and navy hold the interface steady. Cyan marks intent; lime, heat and danger are reserved for state — never decoration."
          />

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {colorTokens.map((token) => (
              <div
                key={token.token}
                className="overflow-hidden rounded-2xl border border-hairline bg-surface"
              >
                <div
                  aria-hidden="true"
                  className="h-24 w-full border-b border-hairline"
                  style={{ backgroundColor: `var(${token.token})` }}
                />
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-sm font-medium tracking-tight">
                      {token.name}
                    </h3>
                    <span className="text-[0.68rem] tabular-nums tracking-[0.08em] text-fog">
                      {theme === 'light' ? token.lightValue : token.value}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-haze">{token.role}</p>
                  <p className="mt-3 text-[0.62rem] tracking-[0.06em] text-haze">
                    var({token.token})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="type-heading"
        className="border-y border-hairline bg-surface py-14 sm:py-20"
      >
        <Container>
          <SectionHeading
            id="type-heading"
            eyebrow="Typography"
            title="Two voices, one hierarchy."
            description="Space Grotesk gives headlines a technical edge. Inter keeps longer passages and interface text effortless to read."
          />

          <div className="mt-10 divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface-strong">
            <div className="grid gap-2 p-6 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-6">
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-haze">
                  Display
                </p>
                <p className="mt-1 text-[0.6rem] text-haze/80">Space Grotesk</p>
              </div>
              <p className="font-display text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">
                Know what&apos;s coming.
              </p>
            </div>
            <div className="grid gap-2 p-6 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-6">
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-haze">
                  Heading
                </p>
                <p className="mt-1 text-[0.6rem] text-haze/80">Space Grotesk</p>
              </div>
              <p className="font-display text-xl font-medium tracking-tight">
                Clarity before conditions change.
              </p>
            </div>
            <div className="grid gap-2 p-6 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-6">
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-haze">
                  Body
                </p>
                <p className="mt-1 text-[0.6rem] text-haze/80">Inter</p>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-fog">
                A quiet, legible base for the details that matter. Body copy
                stays close to a comfortable measure and never competes with
                the signal.
              </p>
            </div>
            <div className="grid gap-2 p-6 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-6">
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-haze">
                  Metric
                </p>
                <p className="mt-1 text-[0.6rem] text-haze/80">Inter</p>
              </div>
              <div>
                <p className="text-3xl tracking-tight tabular-nums text-foreground">
                  0123456789
                </p>
                <p className="mt-1 text-xs text-haze">
                  Tabular numerals keep metric columns aligned.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="components-heading"
        className="py-14 sm:py-20"
      >
        <Container>
          <SectionHeading
            id="components-heading"
            eyebrow="Primitives"
            title="Accessible by construction."
            description="Small, composable pieces with consistent focus behavior, sizing and variants. Product modules assemble from these — they do not reinvent them."
          />

          <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="p-6">
              <h3 className="font-display text-lg font-medium tracking-tight">
                Actions
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-fog">
                One primary action per view. Everything else steps back.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button type="button">Primary</Button>
                <Button type="button" variant="secondary">
                  Secondary
                </Button>
                <Button type="button" variant="outline">
                  Outline
                </Button>
                <Button type="button" variant="signal">
                  Signal
                </Button>
                <Button type="button" variant="ghost">
                  Ghost
                </Button>
                <Button type="button" variant="danger">
                  Danger
                </Button>
                <Button type="button" disabled>
                  Disabled
                </Button>
              </div>

              <h3 className="mt-8 font-display text-lg font-medium tracking-tight">
                States
              </h3>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge>Foundation</Badge>
                <Badge variant="signal">Ready</Badge>
                <Badge variant="heat">Attention</Badge>
                <Badge variant="danger">Critical</Badge>
                <Badge variant="outline">Preview</Badge>
                <Badge variant="muted">Deferred</Badge>
              </div>
            </Card>

            <Card className="relative overflow-hidden p-6">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-20 size-48 rounded-full bg-cyan/10 blur-3xl"
              />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-medium tracking-tight">
                    Surface sample
                  </h3>
                  <Badge variant="signal">Stable</Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-fog">
                  Elevated navy surfaces use a hairline border, a soft blur and
                  restrained glow. Depth should clarify hierarchy, not demand
                  attention.
                </p>
                <div className="mt-6 rounded-xl border border-hairline bg-surface-strong p-4">
                  <p className="text-[0.62rem] uppercase tracking-[0.18em] text-haze">
                    Foundation rule
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">
                    If a number cannot be trusted or explained, it does not
                    appear on screen.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="accessibility-heading"
        className="border-t border-hairline bg-surface py-14 sm:py-20"
      >
        <Container>
          <SectionHeading
            id="accessibility-heading"
            eyebrow="Accessibility"
            title="Built in, not bolted on."
            description="These are baseline commitments for the foundation, not a claim of complete conformance. Each product module is expected to extend them."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {accessibilityPrinciples.map((principle) => {
              const Icon = principle.icon

              return (
                <div
                  key={principle.title}
                  className="flex gap-4 rounded-2xl border border-hairline bg-surface-strong p-5"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-cyan/15 bg-cyan/[0.06] text-cyan-ink">
                    <Icon
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={1.75}
                    />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-medium tracking-tight">
                      {principle.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-fog">
                      {principle.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Container>
      </section>
    </>
  )
}

export { DesignSystemPage }
