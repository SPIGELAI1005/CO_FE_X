# CO:FE(X) — Coffee Explorer Network

Mobile-first platform for discovering independent coffee shops, joining campaigns, earning points, and collecting badges.

## Stack

- **Frontend:** TanStack Start, React 19, TanStack Router, TanStack Query, Tailwind CSS v4, shadcn/ui
- **i18n:** i18next + react-i18next (English + German; toggle in app header)
- **Backend:** Supabase (Postgres + RLS + RPC functions)
- **Maps:** Leaflet + OpenStreetMap

## Getting started

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Add your Supabase project URL and anon key to `.env` (see [Supabase dashboard](https://supabase.com/dashboard)).

3. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

4. Apply database migrations (if using local Supabase CLI):

   ```bash
   supabase db push
   ```

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start development server |
| `npm run build`| Production build         |
| `npm run test` | Run unit tests (Vitest, 51 tests) |
| `npm run test:e2e` | Run all Playwright smoke tests |
| `npm run test:e2e:partner` | Partner routes E2E (12 tests) |
| `npm run lint` | ESLint                   |
| `npm run db:push` | Apply Supabase migrations |
| `npm run db:types` | Regenerate Supabase types |

## Project structure

```
src/
  routes/           File-based TanStack Router pages
  components/app/   Product UI (maps, nav, wizards)
  components/ui/    shadcn primitives
  lib/queries/      React Query hooks
  lib/i18n/         i18next locales (en.json, de.json)
  lib/geo.ts        Check-in distance helpers
  integrations/supabase/
supabase/migrations/ Postgres schema, RLS, RPC functions
docs/               Roadmaps and architecture notes
```

## Development plan

See **[docs/DEVELOPMENT_PLAN.md](./docs/DEVELOPMENT_PLAN.md)** for the full 12-week roadmap: phases, acceptance criteria, architecture targets, and usability standards for new features.

## Documentation

| Doc | Purpose |
| --- | --- |
| [docs/PROJECT_CONTEXT.md](./docs/PROJECT_CONTEXT.md) | Product vision, roles, development principles |
| [docs/LATEST_CHANGES.md](./docs/LATEST_CHANGES.md) | Recent changelog (i18n, mobile, partner, EEFFOC) |
| [docs/AUDIT.md](./docs/AUDIT.md) | Comprehensive app audit (product, security, compliance, ops) |
| [docs/memory-bank/](./docs/memory-bank/) | Agent/team memory bank (active context, patterns, progress) |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Production architecture and scale targets |
| [docs/PLAN_PARTNER_NEXT_STEPS.md](./docs/PLAN_PARTNER_NEXT_STEPS.md) | Partner sprint: QR verify, multi-shop, campaign lifecycle (shipped) |
| [docs/PLAN_EEFFOC_SOCIAL_FLOW.md](./docs/PLAN_EEFFOC_SOCIAL_FLOW.md) | EEFFOC social campaigns: QR, proof, reward flow |
| [docs/SPRINT_EXPLORER_ENGAGEMENT.md](./docs/SPRINT_EXPLORER_ENGAGEMENT.md) | Engagement sprint plan & outcomes |
| [docs/PLAN_EXPLORER_GAPS.md](./docs/PLAN_EXPLORER_GAPS.md) | Gaps sprint plan and deliverables |

## Roles

- **Explorer** — discover cafés, check in (GPS required within 200 m), earn rewards
- **Partner** — manage shop listings, EEFFOC campaigns, verify rewards at counter (QR scan), review social submissions, API keys
- **Admin** — approve partners, moderate shops/campaigns, manage user roles

## Security notes

- **Never commit `.env`** — it is gitignored; use `.env.example` as a template
- Check-ins require geolocation and are validated server-side in `perform_check_in`
- Business rules live in Postgres RPC functions with RLS

## Social sign-in (Google & Apple)

The auth page uses Supabase OAuth (`signInWithOAuth`). **Google covers most Android users** — there is no separate "Android account" provider; Android devices typically sign in with a Google account.

### 1. Supabase URL configuration

In [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **URL Configuration**:

| Setting | Dev example | Production |
|---------|-------------|------------|
| **Site URL** | `http://localhost:3000` | `https://yourdomain.com` |
| **Redirect URLs** | `http://localhost:3000/**` | `https://yourdomain.com/**` |

Add every port you use locally (e.g. `3001` if 3000 is taken).

### 2. Google

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials** → Create **OAuth client ID** (Web application).
2. **Authorized redirect URI** (required):
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   Use your project ref from `VITE_SUPABASE_URL`.
3. Supabase → **Authentication** → **Providers** → **Google** → Enable, paste Client ID and Client Secret.
4. Click **Continue with Google** on `/auth` to test.

### 3. Apple (Sign in with Apple)

Required if you ship an iOS app that offers other social logins (App Store rule).

1. [Apple Developer](https://developer.apple.com/account) → **Identifiers** → create a **Services ID** with Sign in with Apple enabled.
2. **Domains:** your production domain (and `<your-project-ref>.supabase.co` for the Supabase callback).
3. **Return URL:**
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
4. Create a **Key** with Sign in with Apple enabled; note Key ID and Team ID.
5. Supabase → **Providers** → **Apple** → Enable with Services ID, secret key (`.p8`), Key ID, Team ID.
6. Apple only sends the user's name on the **first** sign-in — store it in a profile trigger if needed.

### 4. Android / PWA

- **Web PWA on Android:** same Google OAuth button; the browser opens Google's consent screen and returns to your app.
- **Native Android app (future):** use Supabase mobile SDK with Google Sign-In; still one Google provider in Supabase.

### Troubleshooting

- `redirect_uri_mismatch` → redirect URI in Google/Apple must exactly match Supabase callback URL.
- User lands on site but is not signed in → add your post-login URL (`/explore`, etc.) to Supabase Redirect URLs.
- Provider disabled → enable it in Supabase Providers and save credentials.

## License

Private — CO_FE_X
