import { BrandMark } from '@/components/brand/brand'

const previewStatus = [
  { label: 'Shell', value: 'Ready', tone: 'bg-lime' },
  { label: 'Routes', value: 'Ready', tone: 'bg-lime' },
  { label: 'Data', value: 'In app', tone: 'bg-lime' },
] as const

/**
 * A deliberately abstract representation of the product surface. It shows the
 * shape of the app without inventing climate readings or locations.
 */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[27rem] animate-rise [animation-delay:160ms] motion-reduce:animate-none">
      <div
        aria-hidden="true"
        className="absolute inset-12 rounded-full bg-cyan/15 blur-[90px]"
      />

      <div className="relative overflow-hidden rounded-[2rem] border border-hairline bg-surface p-4 shadow-[0_40px_120px_-50px_rgba(53,198,217,0.5)] backdrop-blur-md sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-fog">
            Atmospheric snapshot
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-veil px-2.5 py-1 text-[0.58rem] font-medium uppercase tracking-[0.14em] text-haze">
            <span aria-hidden="true" className="size-1 rounded-full bg-cyan" />
            Illustrative
          </span>
        </div>

        <div className="relative mt-5 aspect-square">
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-hairline"
          />
          <div
            aria-hidden="true"
            className="absolute inset-[11%] rounded-full border border-cyan/15"
          />
          <div
            aria-hidden="true"
            className="absolute inset-[22%] rounded-full border border-dashed border-hairline"
          />
          <div
            aria-hidden="true"
            className="absolute inset-[34%] rounded-full border border-lime/10"
          />
          <div
            aria-hidden="true"
            className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle_at_center,rgba(53,198,217,0.09),transparent_66%)]"
          />

          <div
            aria-hidden="true"
            className="absolute inset-[6%] animate-orbit rounded-full border border-cyan/15 border-t-cyan/45 motion-reduce:animate-none"
          >
            <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan shadow-[0_0_18px_4px_rgba(53,198,217,0.5)]" />
          </div>

          <div
            aria-hidden="true"
            className="absolute inset-[27%] animate-orbit-reverse rounded-full border border-lime/10 border-b-lime/30 motion-reduce:animate-none"
          >
            <span className="absolute left-1/2 top-0 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime/80 shadow-[0_0_12px_3px_rgba(163,230,53,0.35)]" />
          </div>

          <span
            aria-hidden="true"
            className="absolute left-[7%] top-[12%] text-[0.55rem] uppercase tracking-[0.2em] text-haze"
          >
            Signal
          </span>
          <span
            aria-hidden="true"
            className="absolute bottom-[14%] right-[7%] text-[0.55rem] uppercase tracking-[0.2em] text-haze"
          >
            Guidance
          </span>

          <div className="absolute inset-0 grid place-items-center">
            <div className="w-[64%] min-w-[10.5rem] max-w-[15rem] rounded-2xl border border-hairline bg-surface-strong px-4 py-5 text-center shadow-float backdrop-blur-md sm:px-5">
              <BrandMark className="mx-auto size-10" />
              <p className="mt-3 font-display text-lg font-medium leading-none tracking-tight">
                ClimaGuard
              </p>
              <p className="mt-2 text-[0.6rem] uppercase tracking-[0.2em] text-haze">
                Intelligence layer
              </p>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-[0.65rem] text-fog">
                <span
                  aria-hidden="true"
                  className="size-1.5 animate-pulse-soft rounded-full bg-lime motion-reduce:animate-none"
                />
                Foundation online
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-hairline rounded-xl border border-hairline bg-surface-strong">
          {previewStatus.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-1.5 px-2 py-3"
            >
              <span className="text-[0.55rem] uppercase tracking-[0.16em] text-haze">
                {item.label}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-fog">
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${item.tone}`}
                />
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { HeroVisual }
