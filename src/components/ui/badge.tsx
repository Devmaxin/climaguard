import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
'inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium leading-none',
{
variants: {
variant: {
default: 'border-cyan/25 bg-cyan/10 text-cyan-ink',
signal: 'border-lime/25 bg-lime/10 text-lime-ink',
heat: 'border-heat/25 bg-heat/10 text-heat-ink',
danger: 'border-danger/25 bg-danger/10 text-danger-ink',
outline: 'border-hairline bg-transparent text-fog',
muted: 'border-line/70 bg-veil text-haze',
},
},
defaultVariants: {
variant: 'default',
},
},
)

type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps) {
return (
<span
data-slot="badge"
className={cn(badgeVariants({ variant }), className)}
{...props}
/>
)
}

export { Badge }
export type { BadgeProps }
