import { Cpu, Fingerprint, Link2, ShieldCheck } from 'lucide-react'

import { Container } from '@/components/layout/container'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

const principles = [
{
icon: Fingerprint,
title: 'No private data on-chain',
description:
'Only hashes, policy versions, timestamps and references are appropriate for a public record.',
},
{
icon: ShieldCheck,
title: 'Warnings never wait',
description:
'Official alerts and risk actions never depend on a circuit call or a blockchain transaction.',
},
] as const

function TechnologySection() {
  return (
    <section
      id="technology"
      aria-labelledby="technology-heading"
      className="border-t border-hairline bg-surface py-20 sm:py-24"
    >
      <Container>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Technology</p>
            <h2
              id="technology-heading"
              className="mt-3 text-2xl leading-tight sm:text-3xl lg:text-4xl"
            >
              Built with TapeOut. Secured by X Layer.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-fog sm:text-base">
              TapeOut circuit evaluation and X Layer testnet records add a
              verifiable layer to climate policy decisions. Risk thresholds are
              decided deterministically first; the circuit checks the policy
              outcome, and the chain can hold a reference to that decision.
            </p>
          </div>
          <Badge variant="muted" className="w-fit shrink-0">
            Integration in progress
          </Badge>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-2">
          <Card className="p-6">
            <span className="inline-flex size-10 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan-ink">
              <Cpu aria-hidden="true" className="size-5" strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 text-lg text-foreground">
              TapeOut: policy as a circuit
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-fog">
              TapeOut circuits use NAND and LATCH elements to evaluate Boolean
              policy logic. Our approach is to inspect existing deployed
              processors and use read-only evaluation where it genuinely fits —
              never to invent a forecast or declare an emergency.
            </p>
          </Card>

          <Card className="p-6">
            <span className="inline-flex size-10 items-center justify-center rounded-xl border border-lime/20 bg-lime/10 text-lime-ink">
              <Link2 aria-hidden="true" className="size-5" strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 text-lg text-foreground">
              X Layer: inspectable decisions
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-fog">
              X Layer testnet can hold a small decision reference: what policy
              version ran, when it ran and a hash of the validated inputs.
              Nothing here is required to receive an ordinary ClimaGuard
              warning.
            </p>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {principles.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex gap-4 rounded-2xl border border-hairline px-5 py-4"
            >
              <Icon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-haze"
                strokeWidth={1.75}
              />
              <div>
                <h3 className="text-sm text-foreground">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-fog">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

export { TechnologySection }
