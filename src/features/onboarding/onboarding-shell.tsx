import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

import { BrandLockup } from '@/components/brand/brand'
import { Container } from '@/components/layout/container'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { stepOrder, type OnboardingStep } from '@/features/onboarding/draft'
import { cn } from '@/lib/utils'

const stepLabels: Record<OnboardingStep, { label: string; hint: string }> = {
  mode: { label: 'Account mode', hint: 'Personal or business' },
  profile: { label: 'Your details', hint: 'Name and business' },
  location: { label: 'Locations', hint: 'Where you follow' },
  preferences: { label: 'Preferences', hint: 'Hazards and updates' },
  review: { label: 'Finish', hint: 'Confirm your setup' },
}

function stepPosition(step: OnboardingStep): number {
  return stepOrder.indexOf(step) + 1
}

function OnboardingProgress({ current }: { current: OnboardingStep }) {
  const position = stepPosition(current)

  return (
    <nav aria-label="Onboarding progress">
      {/* Desktop: a vertical rail that reads like a checklist. */}
      <ol className="hidden flex-col gap-1 lg:flex">
        {stepOrder.map((step, index) => {
          const number = index + 1
          const done = number < position
          const active = step === current

          return (
            <li key={step}>
              <div
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-start gap-3 rounded-2xl border px-3.5 py-3 transition-colors duration-300',
                  active
                    ? 'border-cyan/35 bg-cyan/[0.07]'
                    : 'border-transparent bg-transparent',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.68rem] font-semibold',
                    done && 'border-lime/45 bg-lime/15 text-lime-ink',
                    active && !done && 'border-cyan/50 bg-cyan/15 text-cyan-ink',
                    !done && !active && 'border-hairline bg-veil text-haze',
                  )}
                >
                  {done ? <Check aria-hidden="true" className="size-3.5" /> : number}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block text-sm font-medium',
                      active ? 'text-foreground' : 'text-fog',
                    )}
                  >
                    {stepLabels[step].label}
                  </span>
                  <span className="mt-0.5 block text-xs text-haze">{stepLabels[step].hint}</span>
                </span>
                <span className="sr-only">
                  {done ? 'Completed' : active ? 'Current step' : 'Not started'}
                </span>
              </div>
            </li>
          )
        })}
      </ol>

      {/* Mobile: a segmented bar with the step count spelled out. */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-haze">
            Step {position} of {stepOrder.length}
          </p>
          <p className="text-xs text-fog">{stepLabels[current].label}</p>
        </div>
        <ol className="mt-3 flex gap-1.5" aria-hidden="true">
          {stepOrder.map((step, index) => (
            <li
              key={step}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                index + 1 < position && 'bg-lime/70',
                index + 1 === position && 'bg-cyan',
                index + 1 > position && 'bg-hairline',
              )}
            />
          ))}
        </ol>
      </div>
    </nav>
  )
}

type OnboardingShellProps = {
  current: OnboardingStep
  eyebrow: string
  title: string
  description: ReactNode
  children: ReactNode
}

function OnboardingShell({
  current,
  eyebrow,
  title,
  description,
  children,
}: OnboardingShellProps) {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_15%_-10%,rgba(53,198,217,0.16),transparent_55%),radial-gradient(90%_60%_at_100%_0%,rgba(163,230,53,0.10),transparent_60%)]"
      />

      <div className="relative">
        <Container className="flex h-16 items-center justify-between gap-4">
          <BrandLockup />
          <ThemeToggle />
        </Container>

        <Container className="pb-16 pt-6 sm:pt-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-14">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <OnboardingProgress current={current} />
            </div>

            <div className="min-w-0">
              <div key={current} className="animate-rise motion-reduce:animate-none">
                <p className="eyebrow">{eyebrow}</p>
                <h1 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[2rem]">
                  {title}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-fog">{description}</p>

                <div className="mt-8">{children}</div>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </div>
  )
}

export { OnboardingShell }
