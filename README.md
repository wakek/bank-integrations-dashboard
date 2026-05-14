# WeWire Bank Integrations Dashboard

A small frontend dashboard for clients using the WeWire bank-integrations API. Surfaces:

- **Integration health** across payment rails (ACH, SEPA, FPS, SWIFT, NIBSS, GhIPSS, mobile money, USDC/USDT, etc.) with status, uptime, latency, and open-incident summaries
- **API activity log** with full-text search, status/method/environment filters, column sorting, pagination, and a per-request inspect drawer
- **Webhook delivery attempts** with status tiles, retry-dot timeline per row, sorting, pagination, and a per-delivery inspect drawer showing attempt history + payload
- **Inline endpoint docs preview** for `POST /v1/transactions/initiate-payout`, triggered from an info icon next to that endpoint's rows in the activity log

## Running the app

Prerequisites: **Node.js 20+** and **npm**.

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Open http://localhost:3000  (root redirects to /dashboard)
```

Other scripts:

```bash
npm run build   # Production build
npm run start   # Serve the production build
npm run lint    # ESLint
```

The app is fully mocked — there is no backend. All data is generated at module load from fixed seeds in `data/*`. Mock store fetches simulate **400–1300 ms** of latency and a **~10% random failure rate**, so loading and error states surface organically when you refresh. The integration health store also occasionally returns an empty subset so the empty state shows up too.

## Routes

| Path                          | What it shows                                                |
| ----------------------------- | ------------------------------------------------------------ |
| `/`                           | Redirects to `/dashboard`                                    |
| `/dashboard`                  | Overview — three summary cards (Health / Activity / Webhooks)|
| `/dashboard/integrations`     | Full rail health grid with per-rail metrics + incidents      |
| `/dashboard/activity`         | Full API activity table (filter / sort / paginate / inspect / docs) |
| `/dashboard/webhooks`         | Full webhook deliveries table with retry timelines           |

## Project layout

```
app/                    # Next App Router — routes only
  dashboard/            # Main dashboard + nested deep-dives
components/
  ui/                   # shadcn primitives + shared dashboard components
    dashboard/          # Widgets, shells, drawers, helpers
data/                   # Mock dataset + types (single source of truth)
stores/                 # Zustand stores (one per resource)
lib/                    # cn(), formatters, sort helpers
```

## Tech stack

- **Next.js** (App Router) on **React**, **TypeScript** (strict)
- **Tailwind CSS 4** for styling; **shadcn/ui** for the `Button` primitive only
- **Zustand** for the three data stores
- **Native `<dialog>`** for drawers (built-in focus trap + Esc-to-close, no extra dependency)
- **@solar-icons/react** for the few icons used

## Design choices

> - **State management**: Chose Zustand for pure simplicity (personal favorite, mind the bias) that I believe more than offers what's required. The filter/sort/page/drawer state is **component-local** (UI state) to keep the stores small and side-effect-free.
> - **One dashboard, three expandable routes**: `/dashboard` is the at-a-glance summary. Each summary card has a "View all" button that routes to a focused full-page view. I believe a monitoring dashboard should not overwhelm at first glance. A simple clean hierarchy of visuals that allows further elaboration is practical.
> - **Mock dataset shape**: With the help of Claude, modeled after WeWire's actual API surface (sub-customers, virtual accounts, crypto wallets, transactions). Real-feeling rails (NIBSS, GhIPSS, MTN MoMo, USDC/USDT) and real endpoint names (`/v1/transactions/initiate-payout`, etc.). I feel this keeps the project in-line with the requirements and allows for a cleaner assessment.
> - **Documentation preview placement**: Rendered as a side drawer triggered from a conditional info icon on the activity log, only on rows for documented endpoints. The requirements list health/activity/webhooks as the three primary objectives. The documentation preview came across as a supporting reference, so I kept it contextual instead of a peer top-level route.

## Tradeoffs

> - **Mock data vs Mock API**: Opted for mock data for simplicity in execution, and to keep me focused on the core of the assessment: front-end. Although, I'd be remiss to not acknowledge using a live API would allow more in terms of showcasing a critical part of frontend dev: consuming APIs.
> - **Zustand vs TanStack Query**: Zustand keeps the dashboard small and self-contained. In production I would opt for SWR, TanStack Query, or alternatives so cache, request dedup, and refetch-on-focus come for free instead of being re-implemented per store. The store/fetch pattern here was a deliberate choice for size, not ignorance of the alternative.
> - **Client-side pagination / filtering / sorting**: Fine for this mocked demo with a small dataset (256 activity entries, 128 webhooks). Production would push these to the server (cursor-based pagination, indexed filters) and reflect them in the URL for shareable views.
> - **Documentation preview**: As the brief requires. The info icon is conditionally rendered only on rows where docs exist; other rows look unchanged. Less discoverable outside the activity log — acceptable here because there's only one documented endpoint and reviewers will land on activity anyway.
> - **Accessibility scope**: Focused on the essentials: semantic HTML (`<table>`, `<dialog>`, `<time>`), ARIA labels and `aria-sort` / `aria-pressed`, visible focus rings, 40×40 px touch targets on close buttons, status conveyed by text + dot not color alone. Did not run a full Lighthouse report.
> - **Mobile**: Utilizing tables alone for API Activity and Webhook Deliveries means some ease-of-use is lost on smaller screens. However, considering the context (demo & a monitoring dashboard), I believe this is fine tradeoff.