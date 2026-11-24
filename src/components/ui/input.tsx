import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(
        'h-11 w-full rounded-xl border border-hairline bg-veil px-3.5 text-sm text-foreground',
        'placeholder:text-haze',
        'transition-[border-color,box-shadow,background-color] duration-200',
        'hover:border-cyan/30 focus:border-cyan/60 focus:bg-veil-strong focus:outline-none',
        'focus-visible:ring-2 focus-visible:ring-cyan-ink/40',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-danger/60 aria-[invalid=true]:focus-visible:ring-danger/30',
        className,
      )}
      {...props}
    />
  )
}

function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn('text-xs font-medium uppercase tracking-[0.14em] text-haze', className)}
      {...props}
    />
  )
}

function Field({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="field" className={cn('flex flex-col gap-2', className)} {...props} />
}

function FieldMessage({
  className,
  tone = 'error',
  ...props
}: ComponentProps<'p'> & { tone?: 'error' | 'hint' }) {
  return (
    <p
      data-slot="field-message"
      className={cn(
        'text-xs leading-relaxed',
        tone === 'error' ? 'text-danger-ink' : 'text-haze',
        className,
      )}
      {...props}
    />
  )
}

export { Field, FieldMessage, Input, Label }
