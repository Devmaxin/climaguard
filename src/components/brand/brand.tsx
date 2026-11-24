import { useId } from 'react'

import { cn } from '@/lib/utils'

type BrandMarkProps = {
  className?: string
}

/**
 * ClimaGuard's shield-and-signal mark. Purely decorative; pair it with a
 * visible or screen-reader-only "ClimaGuard" label.
 */
function BrandMark({ className }: BrandMarkProps) {
  const gradientId = `cg-brand-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('size-8', className)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="5"
          y1="4"
          x2="27"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8CEBF5" />
          <stop offset="0.55" stopColor="#35C6D9" />
          <stop offset="1" stopColor="#1B8AA2" />
        </linearGradient>
      </defs>
      <path
        d="M16 3.6 27 7.9v7.2c0 6.1-4.5 11.1-11 12.5-6.5-1.4-11-6.4-11-12.5V7.9L16 3.6Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M16 3.6 27 7.9v7.2c0 6.1-4.5 11.1-11 12.5-6.5-1.4-11-6.4-11-12.5V7.9L16 3.6Z"
        stroke="currentColor"
opacity="0.35"
        strokeWidth="0.75"
      />
      <path
        d="M10 16.1h3.1l1.7-3.7 2.4 7.2 1.6-3.5H22"
        stroke="#0A1622"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type BrandLockupProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
}

function BrandLockup({
  className,
  markClassName,
  wordmarkClassName,
}: BrandLockupProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BrandMark className={markClassName} />
      <span
        className={cn(
          'font-display text-[1.05rem] font-semibold tracking-[-0.03em] text-foreground',
          wordmarkClassName,
        )}
      >
        ClimaGuard
      </span>
    </span>
  )
}

export { BrandLockup, BrandMark }
