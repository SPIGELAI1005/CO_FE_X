# CO:FE(X) — Coffee Explorer Network

Mobile-first platform for discovering independent coffee shops, joining campaigns, earning points, and collecting badges.

## Stack

- **Frontend:** TanStack Start, React 19, TanStack Router, TanStack Query, Tailwind CSS v4, shadcn/ui
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
| `npm run test` | Run unit tests (Vitest)  |
| `npm run test:e2e` | Run Playwright smoke tests |
| `npm run lint` | ESLint                   |

## Project structure

```
src/
  routes/           File-based TanStack Router pages
  components/app/   Product UI (maps, nav, wizards)
  components/ui/    shadcn primitives
  lib/queries/      React Query hooks
  lib/geo.ts        Check-in distance helpers
  integrations/supabase/
supabase/migrations/ Postgres schema, RLS, RPC functions
docs/               Roadmaps and architecture notes
```

## Development plan

See **[docs/DEVELOPMENT_PLAN.md](./docs/DEVELOPMENT_PLAN.md)** for the full 12-week roadmap: phases, acceptance criteria, architecture targets, and usability standards for new features.

## Roles

- **Explorer** — discover cafés, check in (GPS required within 200 m), earn rewards
- **Partner** — manage shop listing and campaigns
- **Admin** — approve partners, moderate shops/campaigns, manage user roles

## Security notes

- **Never commit `.env`** — it is gitignored; use `.env.example` as a template
- Check-ins require geolocation and are validated server-side in `perform_check_in`
- Business rules live in Postgres RPC functions with RLS

## Google sign-in

Enable the Google provider in your Supabase project (Authentication → Providers) and add your site URL to redirect allow-list.

## License

Private — CO_FE_X
