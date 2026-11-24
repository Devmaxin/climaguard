import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'

function FinalCtaSection() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="border-t border-hairline py-20 sm:py-24"
    >
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-hairline bg-surface-strong px-6 py-14 text-center shadow-float sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/60 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-cyan/10 blur-3xl"
          />

          <div className="relative">
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-ink">
              <Sparkles aria-hidden="true" className="size-3.5" />
              ClimaGuard
            </span>
            <h2
              id="final-cta-heading"
              className="mx-auto mt-5 max-w-2xl text-2xl leading-tight sm:text-3xl lg:text-4xl"
            >
              Know what&apos;s coming. Know what to do.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-fog sm:text-base">
              Climate intelligence should end in a better decision. Explore the
              foundation we are building toward that promise.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/#how-it-works">
                  See how it works
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/system">View the foundation</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export { FinalCtaSection }
