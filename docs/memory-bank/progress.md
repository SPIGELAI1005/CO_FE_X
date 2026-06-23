# Progress (Memory Bank)

**Last updated:** June 24, 2026

---

## Shipped ✅

### Campaign wizard & EEFFOC partner tooling (June 24, 2026)

- [x] **8-step campaign wizard** — EEFFOC templates, grouped category filters, prominent template browse CTA, publish step i18n fix
- [x] **Branded participation QR** — centered logo overlay (`qr-code-brand.ts`, `CampaignQrCode.tsx`)
- [x] **Shop door poster PDF** — A4 print poster with partner branding (`shop-door-qr-pdf.ts`, `ShopDoorQr.tsx`)
- [x] **Campaign join hardening** — `canJoinCampaign` + local calendar-day start (`campaignHasStarted`, `parseLocalDateString`)
- [x] **Join RPC fixes** — `_campaign_is_live` accepts joined rows via `to_jsonb(record)`; UTC-midnight starts backfilled to Europe/Berlin
- [x] **Partner analytics date fix** — local calendar-day filters (`local-date-range.ts`); no more midnight UTC excluding same-day activity
- [x] **Partner submissions fix** — removed broken `profiles!social_submissions_user_id_fkey` join; tab counts; auto-approved badge; load errors surfaced
- [x] **Edit campaign fix** — `parseSocialRequirements` import; full campaign fields on edit load; shop preserved
- [x] **Explorer campaign detail** — join error mapping, starts-on copy, `trackExplorerEvent` QR analytics restored

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
- [x] **Wallet ledger** — full page body, toasts, CSV export, referral block
- [x] **Partner dashboard** — KPIs, activity feed, charts, workflow steps, quick actions
- [x] **Landing** — Features, Testimonials, Download sections (EN/DE)
- [x] **German copy polish** — idiomatic DE for wallet, dashboard, landing, testimonials

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

- [x] Vitest: **143 tests** in **36 files** — core journey, campaign availability, verify redemption, partner dashboard metrics, auth roles, RPC wrappers
- [x] Manual QA checklist — [QA_CHECKLIST_CORE_FLOWS.md](../QA_CHECKLIST_CORE_FLOWS.md)
- [x] Playwright: landing, auth, public, PWA, authenticated explorer, **partner (12 tests)**
- [x] CI: lint + test + build + e2e + partner e2e on `main` / `develop`

### Vision feature plan (June 2026)

- [x] [PLAN_VISION_FEATURES.md](../PLAN_VISION_FEATURES.md) — 20-feature audit + wave roadmap
- [x] Wave 1: coffee crawls, beverage passport, time bonuses, door QR, wallet/campaign verify polish, mood explore, origin stories, photo reviews
- [x] Wave 2: spawns, mayor, Beans balance, shop stories reel, map themes
- [x] Wave 3: crews, gift credits, shop arrivals, push subscription RPC + profile hook
- [x] Wave 4: manual health log + [VISION_WAVE4_PLATFORM.md](../VISION_WAVE4_PLATFORM.md) (HealthKit/NFC/AR deferred)
- [x] Migrations `20260619120000`–`20260619150000` (apply with `db:push`)
- [x] Campaign/reward domain model — `20260621120000_campaign_reward_domain.sql`, [DATA_MODEL_CAMPAIGN_REWARD.md](../DATA_MODEL_CAMPAIGN_REWARD.md)

---

## In progress / follow-up

- [ ] CI: add GitHub repository secrets (see README) for partner E2E in Actions
- [ ] **i18n depth** — campaign wizard toasts and deep partner form strings
- [ ] Partner dashboard full React Query migration (`partner.index.tsx`, `partner.analytics.tsx` still use `useEffect`)
- [ ] Apply vision + campaign reward migrations to production Supabase + seed crawl stops with real shop IDs
- [ ] VAPID keys for Web Push (`VITE_VAPID_PUBLIC_KEY`) + service worker push handler
- [ ] Partner application notification flow (`20260618120000_partner_application_notifications.sql`)

---

## Deferred 🔜

### Phase 3+ (product)

- [ ] Friends leaderboard
- [ ] Realtime leaderboard (Supabase Realtime)
- [ ] Push notifications — infra stubbed; needs VAPID + service worker handler
- [ ] European expansion tooling
- [ ] Premium membership billing (Stripe production hardening)
- [ ] CO:FE(X) token, ordering, reservations
- [ ] Additional locales beyond EN/DE

### Engineering debt

- [ ] `BadgeUnlockSheet` / `PostCheckInSheet` component tests
- [ ] Notifications: Realtime or email instead of polling only
- [ ] Live Supabase integration tests (requires test project + service role)

---

## Test coverage snapshot

| Layer | Count | Notes |
|-------|-------|-------|
| Vitest | 36 files, 143 tests | `campaign-journey`, `campaign-availability`, `verify-redemption`, `partner-dashboard-metrics`, `auth-roles`, RPC integration |
| Playwright | 8 specs | + partner setup, routes, guest |
| Partner E2E | 12 tests | `npm run test:e2e:partner` |
| Manual QA | 1 checklist | [QA_CHECKLIST_CORE_FLOWS.md](../QA_CHECKLIST_CORE_FLOWS.md) |

---

## Migration inventory (54 total)

Latest batch (June 24, 2026):

1. `20260624010000_campaign_start_local_day.sql` — local start-of-day backfill + `_campaign_is_live` calendar logic
2. `20260624020000_fix_campaign_is_live_record.sql` — record-type overload for joined campaign rows
3. `20260624030000_drop_campaign_is_live_overload.sql` — drop strict `campaigns` composite overload
4. `20260624040000_fix_campaign_is_live_jsonb.sql` — read record fields via `to_jsonb` (join_campaign fix)

Prior engagement sprint migrations include `20260621180000` through `20260623160000` (reward lifecycle, XP, badges, trails, anti-fraud, compliance, moments, notifications, admin moderation, shop images).
