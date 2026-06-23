# CO:FE(X) — Comprehensive Application Audit

**Audit date:** June 23, 2026  
**Scope:** brew-quest-app full stack — product, engineering, security, compliance, operations  
**Auditor:** Engineering review (codebase + docs analysis)

---

## Executive summary

CO:FE(X) is a **production-ready MVP+** for the core explorer loop and extended vision features: discover cafés → GPS check-in → earn points/badges → passport → leaderboard → campaigns/wallet, plus crawls, crews, spawns, and campaign mission flows. Recent sprints closed engagement/gaps, Partner Next Steps, **Vision Waves 1–4**, and the **campaign/reward domain model**.

| Area | Grade | Summary |
|------|-------|---------|
| Product completeness (explorer) | **A** | Core loop + vision waves shipped; push production + friends rank deferred |
| Partner / admin surfaces | **A-** | Full counter flow + lifecycle; partner.index still useEffect |
| Security & auth | **B+** | RLS + RPC pattern sound; client-side mutations rely on Supabase guards |
| Testing & CI | **A-** | 61 unit tests + 8 e2e specs (incl. 12 partner tests) + CI |
| Legal / GDPR readiness | **B** | Pages drafted; external legal review noted as pending |
| Scalability architecture | **B+** | SaaS schema designed; campaign domain views in place |
| Documentation | **A-** | Memory bank + sprint docs current; DEVELOPMENT_PLAN baseline refreshed |
| Operational readiness | **B** | Migrations in repo; production `db:push` + VAPID + Stripe/E2E CI secrets pending |

**Top recommendations:**

1. Apply vision + campaign reward migrations to production Supabase (`db:push`).
2. Configure VAPID keys + service worker handler for Web Push.
3. Add GitHub secrets for partner E2E + document required env matrix.
4. Schedule external GDPR/legal review before Sep 28, 2026 launch target.
5. Complete i18n for campaign wizard toasts and niche partner form strings.

---

## 1. Product audit

### 1.1 Vision alignment

Reference: [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)

The implementation aligns with the stated vision: **exploration and engagement**, not ordering or delivery. Gamification (points, badges, passport, leaderboard, challenges) is central. Partner growth is supported via campaigns, shop pages, and analytics.

### 1.2 Explorer features

| Feature | Status | Evidence |
|---------|--------|----------|
| Explore map + list | ✅ Shipped | `explore.tsx`, `CoffeeMap.tsx`, `ExploreFilters.tsx` |
| Radar (offers + challenges) | ✅ Shipped | `radar.tsx`, `get_coffee_radar` |
| GPS check-in (200 m) | ✅ Shipped | `ShopCheckInFlow.tsx`, `perform_check_in` |
| Post-check-in sheet | ✅ Shipped | `PostCheckInSheet.tsx`, `post-check-in-actions.ts` |
| Badge unlock moment | ✅ Shipped | `BadgeUnlockSheet.tsx` |
| Passport + stamps | ✅ Shipped | `passport.tsx` |
| City collections | ✅ Shipped | `CityCollectionCard.tsx`, city milestones RPC |
| Leaderboard (5 metrics) | ✅ Shipped | `leaderboard.tsx` |
| City-scoped leaderboard | ✅ Shipped | Global / City filter |
| Wallet + ledger | ✅ Shipped | `wallet.tsx` |
| Campaigns | ✅ Shipped | `campaigns.tsx`, `campaign.$id.tsx` |
| Profile + onboarding | ✅ Shipped | `profile.tsx`, `onboarding.tsx` |
| i18n (EN / DE) | ✅ Shipped | `src/lib/i18n/`, `LanguageToggle`; wallet/dashboard/landing localized; wizard toasts partial |
| Coffee crawls | ✅ Shipped | `/crawls`, `coffee_crawls` table |
| Campaign discovery map | ✅ Shipped | `/campaign-map`, `CampaignDiscoveryMap.tsx` |
| Campaign mission steps | ✅ Shipped | `CampaignMissionSteps.tsx`, `campaign-mission.ts` |
| Beverage passport tabs | ✅ Shipped | `BeveragePicker.tsx`, `check_ins.beverage_tag` |
| Mood-based explore | ✅ Shipped | `MoodFilterChips.tsx` |
| Spawns + mayor | ✅ Shipped | `SpawnBanner.tsx`, `MayorBadge.tsx` |
| Crews + gifts | ✅ Shipped | `/crew`, `GiftCoffeeDialog.tsx` |
| Shop arrivals | ✅ Shipped | `ArrivalButton.tsx` |
| Health log (manual) | ✅ Shipped | `HealthLogRing.tsx` (Wave 4 stub) |
| Push subscription hook | ✅ Partial | RPC + profile hook; VAPID production pending |
| Limited-time challenges | ✅ Shipped | Radar Limited section, `matcha-week` seed |
| Map check-in | ✅ Shipped | `MapShopSheet.tsx` |
| Reviews | ✅ Shipped | `ReviewSection.tsx` |
| Rank in nav | ✅ Shipped | Rewards dropdown in `BottomNav.tsx` |

### 1.3 Partner features

| Feature | Status | Notes |
|---------|--------|-------|
| Shop management | ✅ | Multi-shop switcher, add/delete — `partner.shop.tsx` |
| Campaign CRUD | ✅ | Create, edit, pause, resume, end — `partner.campaigns.tsx` |
| Redemption verify | ✅ | Scan + manual + catalog wallet — `partner.verify.tsx` |
| Submissions | ✅ | Social proof review + auto-approve option |
| Rewards catalog | ✅ | `partner.rewards.tsx` |
| Analytics | ✅ | `partner.analytics.tsx` |
| Settings | ✅ | API keys, referrals — `/partner/settings` |
| Participation QR PDF | ✅ | `participation-qr-pdf.ts` |
| Billing / Stripe | ⚠️ Partial | Env-dependent; billing search schema fixed; lazy Stripe imports |
| Mobile verify flow | ✅ | QR scanner via `html5-qrcode` on Verify page |

### 1.4 Admin features

| Feature | Status | Notes |
|---------|--------|-------|
| Partner moderation | ✅ | `admin.partners.tsx` |
| Campaign moderation | ✅ | `admin.campaigns.tsx` |
| User management | ✅ | `admin.users.tsx` |
| Engagement analytics | ✅ | `get_admin_engagement`, funnel KPIs |
| Revenue / Stripe | ⚠️ Partial | Requires Stripe secrets |
| Explorer funnel KPIs | ✅ | `get_explorer_funnel_kpis`, 7d/30d toggle |

### 1.5 Public / SEO

| Surface | Status | Notes |
|---------|--------|-------|
| Landing page | ✅ | `index.tsx` + `MarketingFooter` |
| Shop pages `/coffee/$slug` | ✅ | SSR, guest + auth |
| City hubs `/city/$city` | ✅ | Explorer progress CTA |
| PWA | ✅ | manifest + service worker |
| Legal pages (9) | ✅ | Shared `LegalPageShell` |

### 1.6 Explicitly out of scope

- Food delivery, ordering, reservations
- CO:FE(X) token / cryptocurrency
- Friends leaderboard
- Push notifications
- Realtime leaderboard
- Full European expansion ops tooling

---

## 2. Technical architecture audit

Reference: [ARCHITECTURE.md](./ARCHITECTURE.md)

### 2.1 Stack

| Layer | Choice | Assessment |
|-------|--------|------------|
| Frontend | TanStack Start + React 19 | Modern, SSR-capable, appropriate |
| Router | TanStack Router | File-based, type-safe route tree |
| State | TanStack Query | Dominant pattern; partner.index exception |
| UI | Tailwind v4 + shadcn + Radix | Consistent design system |
| Backend | Supabase Postgres + Auth | RLS-first, EU-friendly |
| Maps | Leaflet + OSM | No API key cost; adequate for MVP |
| Edge | Cloudflare Workers (target) | Documented; deployment path clear |

### 2.2 Data layer patterns

**Strengths:**

- Mutations via Postgres RPCs (`perform_check_in`, `claim_explorer_challenge`, etc.)
- Centralized query keys and invalidation graph
- Generated TypeScript types from schema

**Weaknesses:**

- Some routes still use raw `useEffect` fetch (partner dashboard)
- Most logic invoked from browser client (acceptable with RLS, but limits server-side auditing)
- No GraphQL or BFF — direct Supabase client everywhere

### 2.3 Geography model

Normalized `countries` → `regions` → `cities` with shop FKs. Supports multi-country scale. City slugs power hub pages and city leaderboard filter.

### 2.4 Billing / SaaS foundation

Plans, subscriptions, `partner_can`, API keys schema exist per `20260612_saas_foundation` family migrations. Stripe integration bridge present; production webhook + entitlement enforcement needs env validation.

### 2.5 Folder hygiene

```
src/routes/           — Thin route composers ✅
src/lib/queries/      — Domain hooks ✅
src/components/app/   — Product components ✅
src/lib/rpc/          — RPC wrappers ✅
```

Unused: `PlaceholderPage.tsx` (orphaned).

---

## 3. Security audit

### 3.1 Authentication

| Control | Status |
|---------|--------|
| Supabase Auth session | ✅ PKCE, `/_authenticated` guard |
| OAuth (Google) | ✅ Documented redirect URLs |
| Password reset | ✅ `auth.forgot`, `auth.reset` |
| Role separation | ✅ `user_roles` + layout guards |
| Onboarding gate | ✅ `onboarding_completed_at` |

### 3.2 Authorization

| Control | Status |
|---------|--------|
| Row Level Security | ✅ On core tables |
| RPC `SECURITY DEFINER` with checks | ✅ Check-in, claims, admin fns |
| Admin route guard | ✅ Client-side role check + RLS |
| Partner route guard | ✅ Same pattern |
| API keys (public REST) | ⚠️ Schema exists; verify production hardening |

### 3.3 Data protection

| Topic | Status | Notes |
|-------|--------|-------|
| Anon key in client | ✅ Expected for Supabase |
| Service role in client | ✅ Not present |
| `.env` in git | ⚠️ `.env` modified locally — must stay gitignored |
| GPS data | ✅ Used for check-in validation only |
| Analytics events | ✅ `explorer_events` — review PII in payloads |
| Review gate | ✅ Phase 6 migration encourages check-in before review |

### 3.4 Abuse / fraud

| Control | Status |
|---------|--------|
| GPS distance check (200 m) | ✅ Server-side in RPC |
| Check-in deduplication | ✅ DB constraints |
| Challenge claim server verify | ✅ RPC |
| Points ledger audit trail | ✅ `points_ledger` |
| Rate limiting | ❌ Not implemented at edge |

**Risk:** Client-side geolocation can be spoofed; server validates distance but not device attestation. Acceptable for MVP; consider device integrity APIs later.

---

## 4. Database audit

### 4.1 Migration health

- **25 migrations** in `supabase/migrations/`
- Chronological naming mostly consistent (`YYYYMMDDHHMMSS_description.sql`)
- Latest: `20260615120000_explorer_gaps.sql`

**Action:** Ensure all environments (staging, prod) have identical migration history before release.

### 4.2 Key tables

| Domain | Tables |
|--------|--------|
| Users | `profiles`, `user_roles` |
| Shops | `coffee_shops`, geo hierarchy |
| Engagement | `check_ins`, `badges`, `user_badges`, `points_ledger` |
| Campaigns | `campaigns`, `campaign_participants`, `campaign_redemptions` |
| Challenges | `explorer_challenge_defs`, `user_challenge_claims` |
| Collections | `city_collection_milestones` |
| Analytics | `explorer_events` |
| Commerce | `plans`, `subscriptions`, `billing_invoices`, `shop_subscriptions` |

### 4.3 Critical RPCs

| RPC | Risk if broken |
|-----|----------------|
| `perform_check_in` | Core product loop |
| `claim_explorer_challenge` | Points economy integrity |
| `award_points` | Ledger accuracy |
| `get_leaderboard` | Trust in rankings |
| `log_explorer_event` | KPI blindness |

Integration tests cover check-in and claim paths; expand for edge cases (expired limited challenges).

---

## 5. Frontend / UX audit

### 5.1 Design system

- `cofex-*` CSS tokens in `styles.css`
- `AppPageShell` standardizes explorer pages
- `cofex-app-card`, `cofex-app-chip` used consistently on explorer surfaces
- Leaderboard and explore filters use `cofex-chip-scroll-row` for hover clipping fix

### 5.2 Navigation

Bottom nav: **Radar · Explore · Campaigns · Rewards↓ · Profile**

Rewards submenu: Passport · Rank · Wallet — reduces crowding vs 6 top-level tabs.

Narrow screens (<360px): inactive tab labels hidden via `sr-only`.

### 5.3 Accessibility

| Item | Status |
|------|--------|
| Accessibility Statement page | ✅ `/accessibility` |
| Radix primitives (a11y baseline) | ✅ |
| Focus states on chips | ⚠️ Review systematically |
| Color contrast on pastel cards | ⚠️ Spot-check recommended |
| Screen reader on map | ⚠️ Map UX inherently limited |

### 5.4 Mobile-first

Layout, bottom nav, sheets (`PostCheckInSheet`, `BadgeUnlockSheet`), and horizontal scroll chip rows are mobile-oriented. **June 2026 phone pass:** safe-area insets (`cofex-safe-top`, `cofex-app-chrome-pb`), `viewport-fit=cover`, explore list-first on phones (split hidden `< sm`), responsive `AppPageShell`, radar 2×2 stat grid, partner nav icon-only labels below 360px. Partner/admin tables may still need responsive pass on small tablets.

### 5.5 Empty / error states

`EmptyState`, `QueryBoundary`, `NotFoundPage` exist. Coverage is good on main explorer routes; audit partner tables for consistent empty states.

---

## 6. Testing audit

### 6.1 Unit / integration (Vitest)

**36 test files, 143 tests passing**

| Area | Covered |
|------|---------|
| Geo / haversine | ✅ |
| Check-in client validation | ✅ |
| Post-check-in action ordering | ✅ |
| Explorer challenges | ✅ |
| RPC integration (check-in, join, redeem, verify, claim) | ✅ |
| Campaign journey (discovery → reward) | ✅ |
| Campaign availability (expired, full) | ✅ |
| Verify redemption / duplicate blocking | ✅ |
| Partner dashboard metrics | ✅ |
| Auth role helpers | ✅ |
| Social proof / compliance / wizard | ✅ |
| XP, badges, passport stamps | ✅ |
| Cache invalidation | ✅ |
| Billing plans | ✅ |
| Auth errors | ✅ |

**Manual QA:** [QA_CHECKLIST_CORE_FLOWS.md](./QA_CHECKLIST_CORE_FLOWS.md)

| Gap | Priority |
|-----|----------|
| `BadgeUnlockSheet` component test | Medium |
| `PostCheckInSheet` component test | Medium |
| Live Supabase integration tests (service role) | Low |
| City collection progress helpers | Low |

### 6.2 E2E (Playwright)

**8 specs:** landing, auth, public routes, PWA, authenticated explorer, partner setup/routes/guest

- Explorer authenticated: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_SHOP_SLUG`
- Partner: auto-provision via `SUPABASE_SERVICE_ROLE_KEY`; optional `E2E_PARTNER_EMAIL` / `E2E_PARTNER_PASSWORD`
- Run partner suite: `npm run test:e2e:partner` (12 tests)

**Gap:** CI e2e needs Supabase + service role secret for partner setup job.

### 6.3 CI pipeline

`.github/workflows/ci.yml`:

- Job `verify`: lint → test → build
- Job `e2e`: build with Supabase env → Playwright

Triggers: `main`, `develop` push/PR.

**Recommendation:** Make e2e required only when secrets present, or use dedicated test project.

---

## 7. Analytics & observability audit

### 7.1 Product analytics

| Component | Status |
|-----------|--------|
| Client event SDK | ✅ `explorer-analytics.ts` |
| Persistence | ✅ `explorer_events` + `log_explorer_event` |
| Admin funnel KPIs | ✅ 7d/30d in `admin.analytics.tsx` |
| Event catalog | 7 event types documented in LATEST_CHANGES |

**Gap:** No third-party analytics (PostHog, etc.) — intentional for GDPR; revisit with consent banner if added.

### 7.2 Error reporting

`src/lib/error-reporting.ts` + tests exist. Verify production sink (Sentry or similar) is wired in deployment config.

### 7.3 Logging

Server-side logging minimal (edge/worker). Supabase dashboard for DB logs. No centralized APM documented.

---

## 8. Legal & compliance audit

### 8.1 Published policies

| Document | Route | Status |
|----------|-------|--------|
| Terms & Conditions | `/terms` | Draft content |
| Privacy Policy | `/privacy` | Draft; notes GDPR, pending legal review |
| Impressum | `/impressum` | DE legal notice |
| Cookie Policy | `/cookies` | Draft |
| Accessibility Statement | `/accessibility` | Draft |
| Community Guidelines | `/community` | Draft |
| Rewards & Campaign Rules | `/rewards` | Draft |
| Partner Terms | `/partners` | Draft |
| Data Processing | `/data-processing` | Draft |

### 8.2 In-app access

- Landing footer: `MarketingFooter`
- Onboarding footer: same
- Profile: `AppLegalLinks` via `LEGAL_LINK_GROUPS`

### 8.3 GDPR checklist

| Requirement | Status |
|-------------|--------|
| Privacy policy | ⚠️ Draft — external review pending |
| Lawful basis documented | ⚠️ In policy text |
| Data subject rights contact | ✅ Email in impressum/privacy |
| Cookie consent mechanism | ❌ Not implemented (policy exists) |
| DPA for processors (Supabase, Stripe) | ⚠️ Document in data-processing page; verify contracts |
| Analytics minimization | ✅ First-party events only |
| EU data residency | ✅ Supabase EU region (per ARCHITECTURE) |

**Launch blocker (soft):** External legal sign-off before public EU marketing push.

---

## 9. Performance audit

### 9.1 Frontend

| Technique | Status |
|-----------|--------|
| React Query caching | ✅ |
| Lazy map sheet | ✅ `MapShopSheet` lazy in explore |
| Image lazy loading | ✅ Shop cards |
| Code splitting (router) | ✅ TanStack Router default |
| Bundle analysis | ❌ Not documented — run `build` analyzer periodically |

### 9.2 Database

Indexes on `coffee_shops` status/country/city documented in ARCHITECTURE. Leaderboard RPC should be monitored at 100k users — may need materialized views or rollups.

### 9.3 Maps

Leaflet tile loading is the main LCP risk on explore. Consider tile CDN caching and marker clustering at scale.

---

## 10. Operations & DevOps audit

### 10.1 Environment matrix

| Env var | Required for | Documented |
|---------|--------------|------------|
| `VITE_SUPABASE_URL` | All | ✅ README |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | All | ✅ README |
| Stripe keys | Billing | ⚠️ Partial |
| E2E credentials | Playwright auth tests | ⚠️ Needs CI doc |

### 10.2 Database ops

Scripts: `db:link`, `db:push`, `db:types` — documented in README.

**Risk:** Direct `db:push` to production without staging review. Recommend staging project + migration review checklist.

### 10.3 Release state

**Committed** to [CO_FE_X](https://github.com/SPIGELAI1005/CO_FE_X) on `main` (June 2026). Latest batch: Vision Waves 1–4, campaign/reward domain model, i18n (EN/DE), mobile pass. Migrations through `20260621120000_campaign_reward_domain.sql`.

### 10.4 Monitoring (production)

Not configured in repo. Recommend:

- Supabase alerts (CPU, connections)
- Uptime check on `/` and `/auth`
- Stripe webhook failure alerts
- Error rate on `perform_check_in` RPC

---

## 11. Documentation audit

| Document | Quality | Notes |
|----------|---------|-------|
| `PROJECT_CONTEXT.md` | Excellent | Authoritative product reference |
| `SPRINT_EXPLORER_ENGAGEMENT.md` | Excellent | Complete sprint record |
| `PLAN_EXPLORER_GAPS.md` | Excellent | Deliverables all [x] |
| `ARCHITECTURE.md` | Excellent | Scale target documented |
| `DEVELOPMENT_PLAN.md` | Good | Baseline refreshed June 2026 |
| `README.md` | Good | Links to vision + campaign domain docs |
| `LATEST_CHANGES.md` | Excellent | Changelog through June 21, 2026 |
| `PLAN_VISION_FEATURES.md` | Excellent | Waves 1–4 shipped |
| `DATA_MODEL_CAMPAIGN_REWARD.md` | Excellent | Domain spec mapping |
| `AUDIT.md` | Good | This document |
| `memory-bank/` | Excellent | Agent/team context current |

---

## 12. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R1 | Uncommitted work lost or diverged | Medium | High | Commit + PR immediately |
| R2 | GDPR non-compliance at launch | Medium | High | External legal review + cookie consent |
| R3 | Points/challenge exploit | Low | High | RPC tests + monitor ledger anomalies |
| R4 | CI e2e flaky without secrets | Medium | Medium | Document secrets; optional job |
| R5 | Leaderboard perf at scale | Medium | Medium | Rollup tables / caching |
| R6 | Doc drift causes wrong assumptions | Medium | Low | Refresh DEVELOPMENT_PLAN; maintain memory bank |
| R7 | Stripe webhook misconfiguration | Medium | Medium | Staging webhook tests |
| R8 | GPS spoofing | Medium | Low | Accept MVP risk; plan integrity checks |

---

## 13. Roadmap recommendations

### Immediate (1–2 weeks)

1. ~~Commit engagement + gaps + partner sprints~~ ✅
2. ~~Vision Waves 1–4 + campaign domain~~ ✅
3. Apply migrations to production Supabase (`db:push` + `db:types`)
4. Configure CI secrets for e2e (incl. `SUPABASE_SERVICE_ROLE_KEY`)
5. Staging deploy + smoke test full explorer + partner loops

### Short term (1 month)

1. Component tests for sheets
2. Partner dashboard React Query migration
3. Cookie consent banner (if any non-essential cookies added)
4. External legal review

### Medium term (Phase 3)

1. Push notification infrastructure
2. Supabase Realtime for leaderboard
3. Friends leaderboard scope
4. Materialized leaderboard / stats rollups

---

## 14. Audit checklist summary

| Domain | Items reviewed | Pass | Partial | Fail |
|--------|----------------|------|---------|------|
| Product (explorer) | 16 | 16 | 0 | 0 |
| Product (partner/admin) | 12 | 9 | 2 | 1 |
| Security | 14 | 11 | 2 | 1 |
| Database | 8 | 8 | 0 | 0 |
| UX / a11y | 10 | 6 | 4 | 0 |
| Testing | 8 | 5 | 3 | 0 |
| Analytics | 5 | 4 | 1 | 0 |
| Legal / GDPR | 9 | 3 | 5 | 1 |
| Performance | 6 | 4 | 0 | 2 |
| Operations | 7 | 3 | 3 | 1 |
| Documentation | 9 | 8 | 1 | 0 |

---

## Appendix A — Route inventory

### Public

`/`, `/auth`, `/auth/forgot`, `/auth/reset`, `/coffee/$slug`, `/city/$city`, `/list` (redirect)

### Legal

`/terms`, `/privacy`, `/impressum`, `/cookies`, `/accessibility`, `/community`, `/rewards`, `/partners`, `/data-processing`

### Explorer (authenticated)

`/explore`, `/radar`, `/campaigns`, `/campaign/$id`, `/passport`, `/leaderboard`, `/wallet`, `/profile`, `/onboarding`

### Partner

`/partner`, `/partner/shop`, `/partner/campaigns`, `/partner/verify`, `/partner/submissions`, `/partner/rewards`, `/partner/analytics`, `/partner/billing`, `/partner/settings`

### Admin

`/admin`, `/admin/partners`, `/admin/campaigns`, `/admin/users`, `/admin/analytics`, `/admin/revenue`

### API

`/api/stripe/webhook`

---

## Appendix B — Key file index

| Concern | Path |
|---------|------|
| Check-in flow | `src/components/app/ShopCheckInFlow.tsx` |
| Post-check-in | `src/components/app/PostCheckInSheet.tsx` |
| Badges | `src/components/app/BadgeUnlockSheet.tsx` |
| Nav | `src/components/app/BottomNav.tsx` |
| Analytics | `src/lib/explorer-analytics.ts` |
| Challenges | `src/lib/explorer-challenges.ts` |
| Legal links | `src/components/marketing/LegalPageShell.tsx` |
| Profile legal | `src/components/app/AppLegalLinks.tsx` |
| RPC client | `src/lib/rpc/client.ts` |
| CI | `.github/workflows/ci.yml` |
| Types | `src/integrations/supabase/types.ts` |

---

*This audit should be refreshed after major releases or at least quarterly.*
