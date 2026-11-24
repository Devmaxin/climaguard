# ClimaGuard

**Know what's coming. Know what to do.**

ClimaGuard is a climate intelligence and daily action companion. This repository
contains the frontend foundation: a premium, accessible application shell, a
shared design system, and the first placeholder routes.

This is intentionally **not** the finished product. Live climate data, backend
services, AI features, deployment infrastructure and blockchain functionality
are not connected yet.

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4 via `@tailwindcss/vite`
- shadcn/ui-style primitives (Radix Slot, CVA, Tailwind Merge)
- React Router 7 (data router)
- Lucide icons
- Self-hosted Inter and Space Grotesk variable fonts via Fontsource (OFL)
- Oxlint for linting

No paid APIs, hosted services or runtime subscriptions are used.

## Getting started

Requirements: Node.js 20.19+ (or 22.12+) and npm.

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

## Routes

| Route    | Purpose                                                        |
| -------- | -------------------------------------------------------------- |
| `/`      | Foundation placeholder: promise, build status, principles      |
| `/system`| Design foundation reference: palette, typography, primitives   |
| `*`      | Branded 404 page                                                |

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
│  ├─ home/
│  ├─ design-system/
│  ├─ not-found/
│  └─ errors/
├─ hooks/                   # Shared hooks
├─ lib/                     # Utilities, navigation, token metadata
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

- Live climate data sources and any derived readings
- Supabase, authentication and persistence
- Cloudflare or other deployment configuration
- Blockchain functionality
- AI runtime integration (reserved for later; not part of this foundation)

No placeholder metrics are rendered. If a value cannot be trusted or explained,
it does not appear on screen.
