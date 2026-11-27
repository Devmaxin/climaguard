# ClimaGuard

**Know what's coming. Know what to do.**

ClimaGuard is a climate intelligence and daily action companion. This repository
contains the frontend foundation: a premium, accessible application shell, a
shared design system, and the first placeholder routes.

This is intentionally **not** the finished product. ECMWF Open Data ingestion,
Supabase authentication and persistence, and the deterministic Daily Brief are
in place; frontend and Edge Function deployment automation, and blockchain
functionality, are not.

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4 via `@tailwindcss/vite`
- shadcn/ui-style primitives (Radix Slot, CVA, Tailwind Merge)
- React Router 7 (data router)
- Lucide icons
- Self-hosted Inter and Space Grotesk variable fonts via Fontsource (OFL)
- Oxlint for linting

The core application has no paid runtime dependency. Supabase and GitHub
Actions are hosted services used by this project, and the optional AI brief uses
a Groq key when one is configured; without it the deterministic brief is used.

## Getting started

Requirements: Node.js 22.18+ or Node 24 LTS, and npm. The test suite runs
TypeScript directly through `node --test`, which needs the type stripping
enabled by default from Node 22.18 onwards.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

### Scripts

| Command             | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the Vite development server            |
| `npm run build`     | Type-check and create a production build      |
| `npm run preview`   | Preview the production build locally          |
| `npm run typecheck` | Run TypeScript project checks only            |
| `npm run lint`      | Run Oxlint                                    |
| `npm run check`     | Run lint and a full production build          |
| `npm test`          | Run the risk engine, brief and contract tests |

## Daily Brief edge function

`supabase/functions/daily-brief` assembles the signed-in user's brief. The
deterministic risk engine decides every classification; an optional AI model may
only restate that assessment in prose. That reply is checked before it is shown:
its figures must match the evidence the engine measured, a storm tier it names
must not exceed the tier the engine classified, and emergency, medical, flooding
and certainty claims are refused. A reply that fails any of those checks is
discarded in favour of the deterministic text.

These checks are pattern-based, so they describe what the function always tries
to enforce rather than a guarantee of exhaustiveness: when the model wording
falls outside the patterns, the check finds nothing to reject, and the worst
case is a reply that restates the assessment in different words. Every
classification and every figure still comes from the engine, never from the
model.

Deployment prerequisites — none of these are deployed by this repository:

- `APP_ORIGIN` — the exact browser origin allowed by CORS (for example, the
  production site URL). When it is unset the function falls back to `*`, which
  is for local development only and must never be relied on in production.
- `GROQ_API_KEY` and `GROQ_MODEL` — **optional**. With either missing, the
  function returns the deterministic brief and labels it as such; there is no
  degraded mode and nothing is paid for.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` — supplied by the Supabase runtime. The
  service-role key is never used by this function and must not be given to it.

```bash
supabase secrets set APP_ORIGIN=https://your-origin.example
supabase secrets set GROQ_API_KEY=... GROQ_MODEL=...
supabase functions deploy daily-brief
```

## Routes

| Route        | Purpose                                                        |
| ------------ | -------------------------------------------------------------- |
| `/`          | Landing page: promise, build status, principles                 |
| `/system`    | Design foundation reference: palette, typography, primitives    |
| `/app`       | Signed-in dashboard with forecast and Daily Brief               |
| `/onboarding`| Signed-in primary-location and hazard-preference setup          |
| `/login`     | Sign-in page                                                    |
| `/signup`    | Account creation page                                           |
| `*`          | Branded 404 page                                                |

Routing uses `createBrowserRouter`. When deploying later, configure the host to
serve `index.html` for unknown paths so client-side routes resolve correctly.

## Project structure

```text
src/
├─ app/                     # App root and router
├─ components/
│  ├─ brand/                # ClimaGuard mark and lockup
│  ├─ layout/               # App shell, header, footer, container
│  └─ ui/                   # Reusable accessible primitives
├─ features/                # Route-level feature modules
│  ├─ app/                  # Signed-in dashboard
│  ├─ auth/                 # Sign-in, sign-up and route guards
│  ├─ onboarding/           # Location and hazard preferences
│  ├─ home/
│  ├─ design-system/
│  ├─ not-found/
│  └─ errors/
├─ hooks/                   # Shared hooks
├─ lib/                     # Utilities, navigation and data access
│  ├─ brief/                # Daily Brief contract and request client
│  ├─ climate/              # Forecast query, freshness and snapshot helpers
│  ├─ risk/                 # Browser-facing risk types
│  └─ supabase/             # Generated database types and client
├─ styles/globals.css       # Tailwind entry, theme tokens, base layer
└─ main.tsx                 # Application entry point
```

Feature modules own their page composition. Shared visual language lives in
`components/ui` and `styles/globals.css`; product features should compose these
instead of duplicating them.

## Design foundation

All tokens live in `src/styles/globals.css` and are exposed as Tailwind utilities
through `@theme inline`. The reference page at `/system` renders the palette,
type scale and component states.

| Token          | Value     | Role                |
| -------------- | --------- | ------------------- |
| `--cg-midnight`| `#101827` | Primary canvas      |
| `--cg-navy`    | `#172C40` | Elevated surfaces   |
| `--cg-cyan`    | `#35C6D9` | Primary signal      |
| `--cg-lime`    | `#A3E635` | Positive status     |
| `--cg-heat`    | `#FF9F43` | Attention state     |
| `--cg-danger`  | `#F05D65` | Critical state      |
| `--cg-foreground` | `#EEF4FA` | Primary text     |
| `--cg-fog`     | `#9FB2C4` | Secondary text      |
| `--cg-haze`    | `#8297AB` | Tertiary labels     |

Typography:

- **Space Grotesk** — display headings and product wordmark
- **Inter** — body, interface copy and controls
- **Tabular numerals** — available through Tailwind's `tabular-nums` for metrics

Motion is deliberately restrained: short reveals, slow orbital accents and no
motion that carries meaning. `prefers-reduced-motion` disables all animation and
smooth scrolling.

## Accessibility baseline

- Semantic header, navigation, main and footer landmarks
- Skip-to-content link and visible cyan focus indicators
- Keyboard-safe buttons, links and navigation states
- Decorative SVGs hidden from assistive technology
- Reduced-motion support and a dark `color-scheme`
- Contrast-aware text palette, including tertiary labels

This is a baseline, not a declaration of full WCAG conformance. Every future
module must preserve and extend it.

## Deliberately deferred

- Additional climate variables and any hazard beyond wind consultancy
- Heat and flood thresholds pending a cited standard and the inputs they need
- Cloudflare or other deployment configuration
- Blockchain functionality
- Hosted-AI features beyond the optional brief prose (no paid dependency)

No placeholder metrics are rendered. If a value cannot be trusted or explained,
it does not appear on screen.
