import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Container } from '@/components/layout/container'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/use-document-title'

function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <section className="flex min-h-[70svh] items-center py-20">
      <Container className="flex flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-2xl border border-cyan/15 bg-cyan/[0.06] text-cyan-ink">
          <Compass
            aria-hidden="true"
            className="size-6"
            strokeWidth={1.5}
          />
        </span>
        <Badge
          variant="outline"
          className="mt-6 uppercase tracking-[0.16em]"
        >
          404 · off the map
        </Badge>
        <h1 className="mt-5 max-w-lg text-4xl leading-tight sm:text-5xl">
          This forecast is clear.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-fog sm:text-base">
          The page you are looking for does not exist in this build. Head back
          to the overview, or review the design foundation.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/">
              <ArrowLeft aria-hidden="true" />
              Back to overview
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/system">View the foundation</Link>
          </Button>
        </div>
      </Container>
    </section>
  )
}

export { NotFoundPage }
