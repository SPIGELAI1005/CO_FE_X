# Tech Context (Memory Bank)

---

## Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start v1, React 19 |
| Routing | TanStack Router (file-based, `src/routes/`) |
| Data fetching | TanStack Query v5 |
| Styling | Tailwind CSS v4, shadcn/ui, Radix primitives |
| i18n | i18next + react-i18next (`src/lib/i18n/`, locales `en` / `de`) |
| Backend | Supabase Postgres 15 + Auth + Storage |
| Maps | Leaflet + OpenStreetMap (`react-leaflet`) |
| Payments | Stripe (partner billing, partial) |
| Tests | Vitest (unit/integration), Playwright (e2e) |
| CI | GitHub Actions — `.github/workflows/ci.yml` |

---

## Environment

Copy `.env.example` → `.env`. Required:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Optional / feature-specific: Stripe keys, E2E credentials:

- Explorer: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_SHOP_SLUG`
- Partner E2E: `E2E_PARTNER_EMAIL`, `E2E_PARTNER_PASSWORD` (optional; defaults to auto-provisioned `e2e-partner@cofex.test`)
- Partner E2E setup requires `SUPABASE_SERVICE_ROLE_KEY` in `.env` for user provisioning

**Never commit** `.env` or service role keys.

---

## Scripts

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run test         # Vitest (51 tests)
npm run test:e2e     # Playwright smoke (all projects)
npm run test:e2e:partner  # Partner routes only (12 tests)
npm run lint         # ESLint
npm run db:push      # Apply Supabase migrations
npm run db:types     # Regenerate src/integrations/supabase/types.ts
```

---

## Folder layout

```
src/
  routes/                    # Pages (TanStack Router)
  components/app/            # Product UI
  components/ui/             # shadcn primitives
  components/marketing/      # Legal shell, footer
  lib/queries/               # React Query hooks (one file per domain)
  lib/i18n/                  # i18next init, en/de JSON, filter label hooks
  lib/rpc/                   # Supabase RPC wrappers
  integrations/supabase/     # Client + generated types
supabase/migrations/         # SQL migrations (apply in order)
e2e/                         # Playwright specs (incl. partner.auth.setup, partner-routes)
docs/                        # Plans, audit, memory bank
```

---

## Database workflow

1. Add migration in `supabase/migrations/YYYYMMDDHHMMSS_name.sql`
2. `npm run db:push`
3. `npm run db:types`
4. Add RPC wrapper in `src/lib/rpc/client.ts` if needed
5. Add query hook in `src/lib/queries/`
6. Integration test in `src/lib/rpc/client.integration.test.ts` for critical RPCs

---

## Auth

- Supabase Auth (PKCE, localStorage session)
- `/_authenticated` layout requires session
- Roles in `user_roles`: `explorer` | `partner` | `admin`
- Explorer onboarding gate: `profiles.onboarding_completed_at`
- Admin/partner layouts check role and redirect non-members

---

## Design tokens

CSS variables in `src/styles.css`:

- `--cofex-cyan`, `--cofex-coffee-deep`, `--cofex-pastel-blue`, etc.
- Utility classes: `cofex-app-page`, `cofex-app-card`, `cofex-app-chip`, `cofex-chip-scroll-row`
- Mobile: `cofex-safe-top`, `cofex-app-chrome-pb`, explore panel `@media (max-width: 639px)` rules

---

## Internationalization

- **Library:** `i18next` + `react-i18next`
- **Provider:** `I18nProvider` wraps app in `__root.tsx`
- **Locales:** `src/lib/i18n/locales/en.json`, `de.json`
- **Persistence:** `localStorage` key `cofex-locale`; `setAppLocale()` updates `document.documentElement.lang`
- **Auth:** `AuthLocaleBridge` exposes `window.cofexAuthStrings` for `public/cofex-auth.js`
- **Usage:** `useTranslation()` + `t('key')` in components; filter options via `useExploreFilterLabels()`

---

## Deployment notes

- Target: Cloudflare Workers via Lovable Cloud (see ARCHITECTURE.md)
- Public shop/city pages support SSR for SEO
- PWA: `public/manifest.webmanifest`, `public/sw.js`
