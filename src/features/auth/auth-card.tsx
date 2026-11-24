import type { ReactNode } from 'react'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type AuthCardProps = {
  eyebrow: string
  title: string
  description: ReactNode
  children: ReactNode
  className?: string
}

function AuthCard({ eyebrow, title, description, children, className }: AuthCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-3xl border-hairline bg-surface-strong/85 shadow-float backdrop-blur-xl',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan/60 to-transparent"
      />

      <div className="p-6 sm:p-8">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fog">{description}</p>

        <div className="mt-7">{children}</div>
      </div>
    </Card>
  )
}

function AuthNotice({
  tone,
  title,
  children,
}: {
  tone: 'error' | 'info' | 'success'
  title: string
  children: ReactNode
}) {
  const toneClasses = {
    error: 'border-danger/35 bg-danger/10 text-danger-ink',
    info: 'border-cyan/30 bg-cyan/10 text-cyan-ink',
    success: 'border-lime/30 bg-lime/10 text-lime-ink',
  } as const

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-xl border px-3.5 py-3 text-xs leading-relaxed', toneClasses[tone])}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-fog">{children}</p>
    </div>
  )
}

export { AuthCard, AuthNotice }
