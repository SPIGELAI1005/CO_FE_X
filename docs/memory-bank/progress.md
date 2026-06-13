# Progress (Memory Bank)

**Last updated:** June 11, 2026

---

## Shipped ✅

### Core platform

- [x] Auth (email, Google/Apple OAuth, forgot/reset password)
- [x] Explorer onboarding
- [x] Explore map + list + filters
- [x] GPS check-in (200 m) + passport stamps
- [x] Campaigns join + redeem
- [x] Wallet + points ledger
- [x] Public shop pages (`/coffee/$slug`) with SSR
- [x] City hub pages (`/city/$city`)
- [x] Reviews on shop pages
- [x] Admin console (partners, campaigns, users, analytics, revenue)
- [x] PWA manifest + service worker

### Internationalization

- [x] **English + German** via `i18next` / `react-i18next`
- [x] Locale persistence (`cofex-locale` in localStorage)
- [x] **EN / DE toggle** in explorer + partner headers (next to notifications)
- [x] Localized nav, page headers, explore filters/sort, auth form (bridge + `cofex-auth.js`)
- [x] Explorer level names localized; `QueryBoundary` default strings

### Mobile / phone UX

- [x] Safe-area top/bottom (notch + home indicator)
- [x] `viewport-fit=cover` for PWA
- [x] Explore: list-first on phones, split hidden on small screens
- [x] Responsive `AppPageShell` (stacked headers on mobile)
- [x] Radar stat grid 2×2 on phones
- [x] Partner bottom nav icon-only pattern on narrow screens
- [x] Landing + auth sizing pass

### Partner portal

- [x] Partner UI refresh (AppPage shell, header, bottom nav, 8 routes)
- [x] Dashboard, shop profile, campaigns, verify, submissions, rewards, analytics, billing
- [x] **Partner settings** — API keys, referrals (`/partner/settings`)
- [x] **QR verify scanner** — Scan + Enter tabs, catalog reward display
- [x] **Multi-shop** — switcher, add location, delete shop (RPC)
- [x] **Campaign lifecycle** — edit, pause, resume, end
- [x] **Auto-approve social** submissions (campaign flag + RPC)
- [x] **Printable participation QR PDF**
- [x] Shared partner queries (`lib/queries/partner.ts`)

### EEFFOC social flow

- [x] Fulfillment modes: check_in, social_proof, hybrid
- [x] Participation QR for campaigns
- [x] Explorer reward QR + partner verify (campaign + wallet catalog codes)
- [x] Social proof submit + partner review queue

### Explorer Engagement Sprint

- [x] Rank in Rewards dropdown (Passport · Rank · Wallet)
- [x] Leaderboard page (metrics, podium, personal rank card)
- [x] Challenge claims (`claim_explorer_challenge`)
- [x] Post-check-in sheet + action ordering
- [x] Profile rank shortcut
- [x] Client analytics hooks

### Explorer Gaps Sprint

- [x] Epic 0: Tests + CI
- [x] Epic 1: City collection milestones + UI
- [x] Epic 2: Badge unlock sheet + profile/passport badges
- [x] Epic 3: Limited-time challenges (Matcha Week)
- [x] Epic 4: `explorer_events` + admin funnel KPIs
- [x] Epic 5: Map check-in, city leaderboard, radar claim nudge

### Legal & polish

- [x] 9 legal/compliance public pages
- [x] Marketing footer + profile legal links
- [x] Filter chip scroll-row fix
- [x] Em dash cleanup in user-facing strings

### Testing

- [x] Vitest: 51 tests (geo, check-in, challenges, parse-verify-code, partner-campaign-edit, RPC)
- [x] Playwright: landing, auth, public, PWA, authenticated explorer, **partner (12 tests)**
- [x] CI: lint + test + build + e2e on `main` / `develop`

---

## In progress / follow-up

- [ ] **i18n depth** — wallet ledger, partner dashboard KPIs, landing Features/Testimonials, campaign wizard toasts
- [ ] CI: add `SUPABASE_SERVICE_ROLE_KEY` for partner E2E in GitHub Actions
- [ ] `DEVELOPMENT_PLAN.md` refresh (some sections stale vs shipped features)
- [ ] Partner dashboard full React Query migration (`partner.index.tsx` still uses `useEffect`)

---

## Deferred 🔜

### Phase 3+ (product)

- [ ] Friends leaderboard
- [ ] Realtime leaderboard (Supabase Realtime)
- [ ] Push notifications (native / PWA)
- [ ] European expansion tooling
- [ ] Premium membership billing (Stripe production hardening)
- [ ] CO:FE(X) token, ordering, reservations
- [ ] Additional locales beyond EN/DE

### Engineering debt

- [ ] `BadgeUnlockSheet` / `PostCheckInSheet` component tests
- [ ] Notifications: Realtime or email instead of polling only
- [ ] Campaign duplicate from existing template

---

## Test coverage snapshot

| Layer | Count | Notes |
|-------|-------|-------|
| Vitest | 14 files, 51 tests | Includes partner parse-verify + campaign edit rules |
| Playwright | 8 specs | + partner setup, routes, guest |
| Partner E2E | 12 tests | `npm run test:e2e:partner` |

---

## Migration inventory (28+ total)

Latest five:

1. `20260614120000_explorer_challenge_claims.sql`
2. `20260614140000_engagement_followup.sql`
3. `20260615120000_explorer_gaps.sql`
4. `20260616120000_eeffoc_social_flow.sql`
5. `20260617120000_partner_next_steps.sql`
