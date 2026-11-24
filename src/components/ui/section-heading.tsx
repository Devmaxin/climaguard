import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SectionHeadingProps = {
eyebrow: string
title: ReactNode
description: ReactNode
id: string
className?: string
}

export function SectionHeading({
eyebrow,
title,
description,
id,
className,
}: SectionHeadingProps) {
return (
<div className={cn('max-w-2xl', className)}>
<p className="eyebrow">{eyebrow}</p>
<h2 id={id} className="mt-3 text-2xl leading-tight sm:text-3xl">
{title}
</h2>
<p className="mt-3 text-sm leading-relaxed text-fog sm:text-base">
{description}
</p>
</div>
)
}
