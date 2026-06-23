# Latest Changes — CO:FE(X)

**Last updated:** June 23, 2026  
**Status:** Core flow tests + QA checklist; vision waves + campaign domain shipped; committed to [CO_FE_X](https://github.com/SPIGELAI1005/CO_FE_X).

This document summarizes the most recent product and engineering work. For sprint-level detail, see [SPRINT_EXPLORER_ENGAGEMENT.md](./SPRINT_EXPLORER_ENGAGEMENT.md), [PLAN_EXPLORER_GAPS.md](./PLAN_EXPLORER_GAPS.md), and [PLAN_PARTNER_NEXT_STEPS.md](./PLAN_PARTNER_NEXT_STEPS.md). For a full system review, see [AUDIT.md](./AUDIT.md).

---

## Summary (June 2026 — latest)

| Batch | Scope |
|-------|--------|
| **Core flow tests & QA** | 143 Vitest tests; manual checklist for explorer/partner journeys — [QA_CHECKLIST_CORE_FLOWS.md](./QA_CHECKLIST_CORE_FLOWS.md) |
| **Campaign/reward domain** | Spec-aligned schema extensions, Zod schemas, mission steps UI, campaign discovery map — [DATA_MODEL_CAMPAIGN_REWARD.md](./DATA_MODEL_CAMPAIGN_REWARD.md) |
| **Vision plan (Waves 1–4)** | 20-feature audit doc + migrations + UI: crawls, beverage passport, time bonuses, door QR, wallet/campaign rotating verify, mood explore, origin stories, photo reviews, spawns, mayor, Beans, stories, map themes, crews, gifts, arrivals, push hook, health log stub — see [PLAN_VISION_FEATURES.md](./PLAN_VISION_FEATURES.md) |
| **i18n (EN / DE)** | `i18next` + `react-i18next`; locale files; `LanguageToggle` (EN/DE) in headers; auth bridge for `cofex-auth.js`; page headers, nav, explore filters/sort, passport, radar, partner routes |
| **Mobile / phone pass** | Safe-area insets, viewport-fit, explore default list view, radar 2×2 stats, responsive page shells, partner nav icon-only labels, landing/auth sizing |
| **Partner Next Steps** | QR verify scanner, multi-shop, campaign lifecycle, settings (API keys/referrals), printable QR PDF, auto-approve social, catalog verify UI, shop delete |
| **Partner UI refresh** | `AppPage` shell, `PartnerHeader`, `PartnerBottomNav`, all 8 partner routes aligned with explorer design language |
| **Explorer Engagement** | Leaderboard in Rewards menu, challenge claims, post-check-in sheet, analytics hooks |
| **Explorer Gaps** | City collections, badge moments, seasonal challenges, KPI persistence, discovery polish |
| **EEFFOC social flow** | Participation QR, social proof submissions, hybrid fulfillment |
| **Legal & polish** | 9 public legal routes, em-dash cleanup in user-facing copy, filter chip scroll-row fix |

---

## Core flow tests & QA (June 23, 2026)

**Checklist:** [QA_CHECKLIST_CORE_FLOWS.md](./QA_CHECKLIST_CORE_FLOWS.md)

| Area | Automated coverage |
|------|-------------------|
| Campaign creation | `campaign-wizard.test.ts`, `domain/schemas.test.ts` |
| Campaign discovery | `campaign-availability.test.ts`, `campaign-journey.test.ts` |
| QR check-in | `check-in.test.ts`, `parse-verify-code.test.ts`, RPC integration |
| Social proof submission | `social-post-assistant.test.ts`, `campaign-compliance.test.ts`, schemas |
| Café proof approval | `campaign-fulfillment.test.ts`, `campaign-mission.test.ts` |
| Reward unlock / redemption | `shop-door.test.ts`, `verify-redemption.test.ts`, RPC integration |
| XP / badges | `xp-system.test.ts`, `badges.test.ts` |
| Passport stamps | `passport-stamps.test.ts` |
| Café dashboard metrics | `partner-dashboard-metrics.test.ts` |
| Role-based access | `auth-roles.test.ts` |
| Expired / full campaigns | `campaign-availability.test.ts` |
| Duplicate redemption | `verify-redemption.test.ts`, `anti-fraud.test.ts` |

**New pure modules:** `campaign-availability.ts`, `verify-redemption.ts`, `partner-dashboard-metrics.ts`, `auth-roles.ts`, `campaign-journey.test.ts`

**Run:** `npm run test` (143 tests, 36 files)

---

**Libraries:** `i18next`, `react-i18next`  
**Locale storage:** `localStorage` key `cofex-locale` (`en` \| `de`); synced to `<html lang>`

| Item | Files |
|------|-------|
| Init + provider | `src/lib/i18n/index.ts`, `src/components/app/I18nProvider.tsx` |
| Locale JSON | `src/lib/i18n/locales/en.json`, `de.json` |
| Language toggle | `src/components/app/LanguageToggle.tsx` — **EN** / **DE** label in `AppHeader`, `PartnerHeader`, landing nav, 404 |
| Filter/sort labels | `src/lib/i18n/use-filter-labels.ts`; wired in `ExploreFilters.tsx`, `ExploreSortSelect.tsx` |
| Auth (vanilla JS) | `AuthLocaleBridge.tsx` + `public/cofex-auth.js` uses `window.cofexAuthStrings` |
| Explorer levels | `explorer-levels.ts` keys + `levelDisplayName()` for localized rank/profile |
| Query defaults | `QueryBoundary.tsx` uses `query.*` keys |

**Wired routes/components:** Explorer (explore, radar, campaigns, passport, wallet, profile, leaderboard), all partner page headers, landing nav/hero, auth, bottom nav, notifications, notFound, error boundary.

**Partial / follow-up:** Campaign wizard toasts, deep partner form strings — keys exist or remain English in niche UI.

---

## Campaign & reward domain model

**Doc:** [DATA_MODEL_CAMPAIGN_REWARD.md](./DATA_MODEL_CAMPAIGN_REWARD.md)  
**Migration:** `20260621120000_campaign_reward_domain.sql`

| Item | Detail |
|------|--------|
| Schema extensions | `profiles` (explorer_level, preferred_drink_categories), `campaigns` (slogan, reward_type, hashtags, T&C), `coffee_shops` (opening_hours, social_links) |
| Views | `cafe_listings`, `explorer_rewards`, `social_proofs`, `xp_events` |
| TypeScript | `src/lib/domain/campaign-reward-model.ts`, `schemas.ts` + unit tests |
| Mission UI | `CampaignMissionSteps.tsx`, `CampaignMissionInfo.tsx`, `src/lib/campaign-mission.ts` |
| Discovery map | `/campaign-map`, `CampaignDiscoveryMap.tsx`, `lib/queries/campaign-map.ts` |
| Verify polish | `RotatingVerifyDisplay.tsx`, `WalletRewardQr.tsx`, `CampaignRewardQr.tsx` |

---

## Vision feature plan (Waves 1–4)

**Doc:** [PLAN_VISION_FEATURES.md](./PLAN_VISION_FEATURES.md) · **Wave 4 eval:** [VISION_WAVE4_PLATFORM.md](./VISION_WAVE4_PLATFORM.md)

| Wave | Highlights |
|------|------------|
| **1** | `coffee_crawls` + `/crawls`; beverage pick on check-in + passport tabs; time-of-day multipliers in `perform_check_in`; door QR (`?door=1`); wallet QR + rotating verify; mood chips on explore; origin block on shop/partner form; photo reviews + weekly challenge banner on radar |
| **2** | `spawn_events`, `shop_stories`, `beans_balance`, `map_theme`; Radar spawn banner; mayor badge; soundscape player |
| **3** | `crews`, `gift_credits`, `shop_arrivals`, `push_subscription`; `/crew`, gift dialog, arrival button, partner arrivals list, push enable on profile |
| **4** | `explorer_health_logs` + manual `HealthLogRing`; platform evaluation doc (HealthKit, NFC, AR deferred) |

**Migrations:** `20260619120000_vision_wave1.sql` … `20260619150000_vision_wave4.sql` — run `npm run db:push` + `npm run db:types` on linked Supabase.

---

## Mobile / phone responsiveness

| Item | Detail |
|------|--------|
| Viewport | `viewport-fit=cover` in root meta for notched devices / PWA |
| Safe areas | `cofex-safe-top`, `cofex-app-chrome-pb` (bottom nav + home indicator) in `styles.css` |
| Explore | Default view **list** on phones; split hidden `< sm`; flex layout replaces fixed `100dvh` calc; tighter padding |
| Page shell | `AppPageHeader` / `AppPageSection` stack on mobile; smaller heading scale |
| Radar | Stats `grid-cols-2 sm:grid-cols-4`; hero stacks on narrow screens |
| Partner nav | Icon-only inactive labels below 360px (matches explorer `BottomNav`) |
| Landing | Fluid hero type (`clamp`), compact nav CTA, testimonial padding, shorter mockup on mobile |
| Auth | `p-5 sm:p-8`, safe-area bottom padding |
| Notifications | Popover width `min(20rem, calc(100vw - 2rem))` |

---

## Partner Next Steps Sprint (Epics 0–3 + extras)

**Plan:** [PLAN_PARTNER_NEXT_STEPS.md](./PLAN_PARTNER_NEXT_STEPS.md)  
**Migration:** `20260617120000_partner_next_steps.sql` (pushed)

### Epic 0 — Shared partner queries

| Item | Files |
|------|-------|
| Partner React Query hooks | `src/lib/queries/partner.ts` |
| Query keys | `src/lib/queries/keys.ts` — `partnerShops`, `partnerVerifyAudit`, `partnerApiKeys`, `partnerReferrals` |
| Active shop persistence | `getStoredPartnerShopId` / `setStoredPartnerShopId` in localStorage |

### Epic 1 — QR scanner on Verify

| Item | Files |
|------|-------|
| Code parser (URL or raw) | `src/lib/parse-verify-code.ts` + unit tests |
| Camera scanner | `src/components/app/partner/VerifyQrScanner.tsx` (`html5-qrcode`) |
| Scan / Enter tabs | `partner.verify.tsx` |
| Catalog reward UI | Verify result card shows `kind: wallet` badge + points spent |
| Hooks | `useVerifyRedemptionCode`, `usePartnerVerifyAudit` |

### Epic 2 — Multi-shop

| Item | Files |
|------|-------|
| Shop switcher | `PartnerShopSelect.tsx` |
| Load all locations | `partner.shop.tsx` refactored (no `.limit(1)`) |
| Add location | Pro / first-shop flow |
| Delete shop | `partner_delete_shop` RPC + danger zone UI |

### Epic 3 — Campaign lifecycle

| Item | Files |
|------|-------|
| Pause / resume / end | `partner_set_campaign_status` RPC + buttons on `partner.campaigns.tsx` |
| Edit campaign | `CampaignWizard` edit mode + `partner_update_campaign` RPC |
| Edit rules (client) | `src/lib/partner-campaign-edit.ts` + unit tests |
| Auto-approve social | `campaigns.auto_approve_social` column + wizard toggle + `_approve_social_submission_internal` |

### Extras (same sprint)

| Feature | Detail |
|---------|--------|
| **Printable QR PDF** | `downloadParticipationQrPdf()` in `participation-qr-pdf.ts`; button on `CampaignParticipationQr.tsx` |
| **Partner settings** | `/partner/settings` — API keys (`issue_api_key` / `revoke_api_key`), referral code + signup link |
| **Nav** | Settings in side nav + mobile More menu |
| **Billing fix** | Zod search schema on `/partner/billing`; lazy Stripe server-fn imports; `useNavigate` from path |

### Partner UI refresh (prerequisite)

| Component | Purpose |
|-----------|---------|
| `AppPageShell` | Shared page chrome for partner routes |
| `PartnerHeader` | Top bar + sign out |
| `PartnerBottomNav` | Mobile primary nav (Home, Campaigns, Verify, Posts, More) |
| `PartnerShell.tsx` | KPI cards, status pills, empty states, shared button styles |

---

## EEFFOC social flow

**Plan:** [PLAN_EEFFOC_SOCIAL_FLOW.md](./PLAN_EEFFOC_SOCIAL_FLOW.md)  
**Migration:** `20260616120000_eeffoc_social_flow.sql`

| Item | Files |
|------|-------|
| Fulfillment modes | `check_in`, `social_proof`, `hybrid` — `campaign-fulfillment.ts` |
| Participation QR | `CampaignParticipationQr.tsx`, `CampaignQrCode.tsx` |
| Explorer reward QR | `CampaignRewardQr.tsx` |
| Social proof submit | `SocialProofSubmit.tsx` |
| Partner review queue | `partner.submissions.tsx` |

---

## Explorer Engagement Sprint

### Navigation

| Change | Detail |
|--------|--------|
| Rank in Rewards menu | Removed standalone Rank tab; **Passport · Rank · Wallet** under **Rewards** dropdown in `BottomNav.tsx` |
| Rewards dropdown | Radix `DropdownMenu`, opens upward; active sub-route highlighted |
| Profile rank card | Live rank shortcut linking to `/leaderboard` |

### Leaderboard

| Change | Detail |
|--------|--------|
| React Query migration | `useLeaderboard`, `useMyLeaderboardRank` in `src/lib/queries/leaderboard.ts` |
| Design system alignment | `cofex-app-chip`, `cofex-app-card`, Lucide level icons via `explorer-levels.ts` |
| Metric filters | Points, cafés visited, reviews, campaigns, social posts |
| Personal rank card | Shown when user is outside top 50 |

**Migrations:** `20260614120000_explorer_challenge_claims.sql`, `20260614140000_engagement_followup.sql`

### Challenge claims

| Change | Detail |
|--------|--------|
| DB-backed definitions | `explorer_challenge_defs` table |
| Claim RPC | `claim_explorer_challenge` — server-verified, awards `challenge_reward` ledger entries |
| Radar UI | Claim CTA + celebration on `radar.tsx` |
| Client lib | `src/lib/explorer-challenges.ts` + unit tests |

### Post-check-in experience

| Change | Detail |
|--------|--------|
| `PostCheckInSheet` | Bottom sheet after every successful check-in |
| `post-check-in-actions.ts` | Testable CTA ordering (review, campaign, passport, challenges) |
| `ShopCheckInFlow` | Unified check-in pipeline on shop page and explore map |
| Analytics | `explorer-analytics.ts` — client events for sheet, claims, leaderboard |

---

## Explorer Gaps Sprint (Epics 0–5)

### Epic 0 — Quality & CI

- RPC integration tests (`client.integration.test.ts`)
- `post-check-in-actions.test.ts` — action ordering
- E2E: Rewards → Rank, check-in → passport CTA (`e2e/authenticated.spec.ts`)
- CI: `.github/workflows/ci.yml` — lint, Vitest, build, Playwright

### Epic 1 — City collections

| Item | Files |
|------|-------|
| Milestones RPC | `get_city_collection_progress`, `get_user_city_collections` |
| Query hooks | `src/lib/queries/city-collections.ts` |
| UI | `CityCollectionCard.tsx` |
| Migration | `20260615120000_explorer_gaps.sql` |

### Epic 2 — Badge moments

| Item | Files |
|------|-------|
| Unlock celebration | `BadgeUnlockSheet.tsx` |
| Check-in wiring | `ShopCheckInFlow.tsx` |
| Profile / passport | Recent badges sections |

### Epic 3 — Seasonal challenges

Time windows on `explorer_challenge_defs`; Matcha Week seed; radar “Limited” section.

### Epic 4 — KPI analytics

`explorer_events` + `log_explorer_event`; admin funnel KPIs on `admin.analytics.tsx`.

### Epic 5 — Discovery polish

Map check-in via `MapShopSheet.tsx`; city scope on leaderboard; radar claim nudge.

---

## Legal & compliance pages

Nine public legal routes with shared `LegalPageShell.tsx`:

`/terms`, `/privacy`, `/impressum`, `/cookies`, `/accessibility`, `/community`, `/rewards`, `/partners`, `/data-processing`

**In-app:** `AppLegalLinks.tsx` on profile; footer on landing and onboarding.

---

## UI / UX polish

| Change | Detail |
|--------|--------|
| Em dash cleanup | User-facing `—` replaced with `·`, punctuation, or `-` across routes/components |
| Filter chip clipping | `.cofex-chip-scroll-row` in `styles.css` |
| App shell | `AppPageShell`, `AppHeader`, `CofexMotionBootstrap` |
| Explore filters | `ExploreFilters.tsx`, `ExploreSortSelect.tsx`, `explore-filters.ts` |

---

## E2E tests

| Spec | Coverage |
|------|----------|
| `e2e/partner.auth.setup.ts` | Provisions partner test user (service role); saves auth state |
| `e2e/partner-routes.spec.ts` | All 9 partner routes + side nav (authenticated) |
| `e2e/partner-guest.spec.ts` | Unauthenticated redirect to `/auth` |
| `npm run test:e2e:partner` | Runs setup + guest + authenticated partner tests (12 tests) |

Optional env: `E2E_PARTNER_EMAIL`, `E2E_PARTNER_PASSWORD` (defaults to `e2e-partner@cofex.test`).

---

## Database migrations (recent)

| Migration | Purpose |
|-----------|---------|
| `20260617120000_partner_next_steps.sql` | Campaign lifecycle RPCs, auto-approve, shop delete |
| `20260618120000_partner_application_notifications.sql` | Partner application inbox notifications |
| `20260619120000_vision_wave1.sql` | Crawls, beverage tags, time bonuses, door QR, mood, origin, photo reviews |
| `20260619130000_vision_wave2.sql` | Spawns, mayor, Beans, shop stories, map themes |
| `20260619140000_vision_wave3.sql` | Crews, gift credits, shop arrivals, push subscriptions |
| `20260619150000_vision_wave4.sql` | Health logs, soundscapes |
| `20260621120000_campaign_reward_domain.sql` | Campaign/reward spec alignment, views, mission RPCs |

Run `npm run db:push` then `npm run db:types` after pulling.

---

## Verification status (local)

| Check | Result |
|-------|--------|
| Unit tests (`npm test`) | 143 passing (36 files) |
| Build (`npm run build`) | Passing |
| Partner E2E (`npm run test:e2e:partner`) | 12 passing |
| Migrations in repo | Through `20260621120000_campaign_reward_domain.sql` |
| Types regenerated | `src/integrations/supabase/types.ts` |

---

## New / notable files

```
src/lib/domain/
  campaign-reward-model.ts, schemas.ts, schemas.test.ts
src/lib/
  campaign-mission.ts, campaign-mission.test.ts
  mood-discovery.ts, map-themes.ts, beverage-tags.ts
  notification-display.ts, qr-check-in.ts, shop-door.ts
  queries/campaign-map.ts, queries/vision.ts, queries/campaigns.ts

src/components/app/
  CampaignMissionSteps.tsx, CampaignMissionInfo.tsx
  CampaignDiscoveryMap.tsx (map/), MapCampaignSheet.tsx
  BeveragePicker.tsx, MoodFilterChips.tsx, OriginStoryBlock.tsx
  SpawnBanner.tsx, MayorBadge.tsx, ShopStoriesReel.tsx
  GiftCoffeeDialog.tsx, ArrivalButton.tsx, HealthLogRing.tsx
  RotatingVerifyDisplay.tsx, WalletRewardQr.tsx, ShopDoorQr.tsx
  SoundscapePlayer.tsx, MapThemeToggle.tsx

src/routes/_authenticated/_explorer/
  crawls.tsx, crew.tsx, campaign-map.tsx

supabase/migrations/
  20260618120000_partner_application_notifications.sql
  20260619120000_vision_wave1.sql … 20260619150000_vision_wave4.sql
  20260621120000_campaign_reward_domain.sql
```

---

## Deferred (Phase 3+)

- Push notifications (native / PWA)
- Realtime leaderboard
- Friends leaderboard
- CO:FE(X) token, ordering, reservations
- Campaign duplicate from template

---

## Related documentation

| Doc | Purpose |
|-----|---------|
| [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) | Product vision and principles |
| [PLAN_PARTNER_NEXT_STEPS.md](./PLAN_PARTNER_NEXT_STEPS.md) | Partner sprint plan (implemented) |
| [PLAN_EEFFOC_SOCIAL_FLOW.md](./PLAN_EEFFOC_SOCIAL_FLOW.md) | EEFFOC QR + social proof |
| [ARCHITECTURE_EXPLORER_ENGAGEMENT.md](./ARCHITECTURE_EXPLORER_ENGAGEMENT.md) | Engagement architecture |
| [DATA_MODEL_CAMPAIGN_REWARD.md](./DATA_MODEL_CAMPAIGN_REWARD.md) | Campaign/reward domain spec mapping |
| [PLAN_VISION_FEATURES.md](./PLAN_VISION_FEATURES.md) | Vision feature waves (shipped) |
| [VISION_WAVE4_PLATFORM.md](./VISION_WAVE4_PLATFORM.md) | Platform capability evaluation |
| [memory-bank/](./memory-bank/) | Agent / team memory bank |
