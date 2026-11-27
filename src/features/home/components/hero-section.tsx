import {
  Accessibility,
  ArrowRight,
  CloudSun,
  Smartphone,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Container } from '@/components/layout/container'
import { HeroVisual } from '@/features/home/components/hero-visual'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const heroNotes = [
  { icon: Accessibility, label: 'Accessible by default' },
  { icon: Smartphone, label: 'Mobile-first' },
  { icon: CloudSun, label: 'Live ECMWF forecast data' },
] as const

function HeroSection() {
  return (
    <section aria-labelledby="hero-heading" className="relative">
      <Container className="grid gap-14 pb-20 pt-14 sm:pb-24 sm:pt-20 xl:grid-cols-[1.2fr_0.8fr] xl:items-center xl:gap-12 xl:pb-28 xl:pt-24">
        <div className="max-w-2xl animate-rise">
          <Badge className="max-w-full gap-2 whitespace-normal text-[0.6rem] uppercase tracking-[0.16em]">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-cyan"
            />
            Climate intelligence · Live forecast data
          </Badge>

          <h1
            id="hero-heading"
            className="mt-6 text-[clamp(2rem,8.5vw,4rem)] leading-[0.98] tracking-[-0.045em]"
          >
            <span className="block">Know what&apos;s coming.</span>
            <span className="block">
              Know what to <span className="text-climate-gradient">do.</span>
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-fog sm:text-lg">
            ClimaGuard turns climate and weather information into clear risks,
            practical actions and daily intelligence for the places you care
            about. Understand what matters, who it affects and what to do next.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <a href="#use-cases">
                Get Started
                <ArrowRight aria-hidden="true" />
              </a>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/#how-it-works">How it works</Link>
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-hairline pt-6 text-xs text-fog">
            {heroNotes.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon
                  aria-hidden="true"
                  className="size-3.5 text-haze"
                  strokeWidth={1.75}
                />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <HeroVisual />
      </Container>
    </section>
  )
}

export { HeroSection }
