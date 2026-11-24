import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
{
variants: {
variant: {
default:
'bg-cyan text-on-accent shadow-[0_10px_32px_-14px_rgba(53,198,217,0.7)] hover:bg-[#55d4e3] active:translate-y-px',
secondary:
'border border-hairline bg-veil text-foreground hover:bg-veil-strong',
outline:
'border border-cyan/40 text-cyan-ink hover:border-cyan/70 hover:bg-cyan/10',
ghost: 'text-fog hover:bg-veil hover:text-foreground',
signal:
'bg-lime text-on-accent shadow-[0_10px_32px_-14px_rgba(163,230,53,0.6)] hover:bg-[#b5ee59] active:translate-y-px',
danger:
'border border-danger/30 bg-danger/10 text-danger-ink hover:bg-danger/20',
},
size: {
sm: 'h-8 px-3.5 text-xs [&_svg]:size-3.5',
default: 'h-10 px-5 text-sm [&_svg]:size-4',
lg: 'h-12 px-6 text-sm [&_svg]:size-4 sm:text-[0.9375rem]',
icon: 'size-10 [&_svg]:size-4',
},
},
defaultVariants: {
variant: 'default',
size: 'default',
},
},
)

type ButtonProps = ComponentProps<'button'> &
VariantProps<typeof buttonVariants> & {
asChild?: boolean
}

function Button({
className,
variant,
size,
asChild = false,
...props
}: ButtonProps) {
const Comp = asChild ? Slot : 'button'

return (
<Comp
data-slot="button"
className={cn(buttonVariants({ variant, size }), className)}
{...props}
/>
)
}

export { Button }
export type { ButtonProps }
