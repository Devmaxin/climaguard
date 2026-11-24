import { Outlet } from 'react-router-dom'

import { ScrollToTop } from '@/components/layout/scroll-to-top'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'

function AppShell() {
  return (
    <div className="relative isolate flex min-h-svh flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-grid opacity-60"
      />

      <a
        href="#main-content"
        className="absolute left-4 top-3 z-[100] -translate-y-24 rounded-full bg-cyan px-4 py-2 text-sm font-semibold text-on-accent shadow-lg transition-transform duration-200 focus:translate-y-0"
      >
        Skip to content
      </a>

      <ScrollToTop />
      <SiteHeader />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1"
      >
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  )
}

export { AppShell }
