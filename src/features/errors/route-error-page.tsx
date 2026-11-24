import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react'
import {
  isRouteErrorResponse,
  useRouteError,
  Link,
} from 'react-router-dom'

import { BrandLockup } from '@/components/brand/brand'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/use-document-title'

function RouteErrorPage() {
  useDocumentTitle('Something went wrong')
  const error = useRouteError()
  const isNotFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <div className="relative isolate flex min-h-svh flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-grid opacity-60"
      />

      <header className="border-b border-hairline">
        <Container className="flex h-16 items-center">
          <Link
            to="/"
            aria-label="ClimaGuard home"
            className="rounded-lg p-1"
          >
            <BrandLockup markClassName="size-8" wordmarkClassName="text-base" />
          </Link>
        </Container>
      </header>

      <main
        id="main-content"
        className="flex flex-1 items-center py-20"
      >
        <Container className="flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-2xl border border-danger/20 bg-danger/10 text-danger-ink">
            <AlertTriangle
              aria-hidden="true"
              className="size-6"
              strokeWidth={1.5}
            />
          </span>
          <p className="mt-6 text-[0.62rem] uppercase tracking-[0.2em] text-fog">
            {isNotFound ? '404 · route not found' : 'Unexpected error'}
          </p>
          <h1 className="mt-4 max-w-lg text-4xl leading-tight sm:text-5xl">
            {isNotFound
              ? 'This route is off the map.'
              : 'Something interrupted the signal.'}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-fog sm:text-base">
            The application could not render this page. Return to the overview
            or try the route again.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/">
                <ArrowLeft aria-hidden="true" />
                Back to overview
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <a href={window.location.href}>
                <RotateCcw aria-hidden="true" />
                Try again
              </a>
            </Button>
          </div>
        </Container>
      </main>
    </div>
  )
}

export { RouteErrorPage }
