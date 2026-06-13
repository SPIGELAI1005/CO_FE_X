# Latest Changes — CO:FE(X)

**Last updated:** June 11, 2026  
**Status:** i18n (EN/DE) + mobile phone pass shipped; committed to [CO_FE_X](https://github.com/SPIGELAI1005/CO_FE_X).

This document summarizes the most recent product and engineering work. For sprint-level detail, see [SPRINT_EXPLORER_ENGAGEMENT.md](./SPRINT_EXPLORER_ENGAGEMENT.md), [PLAN_EXPLORER_GAPS.md](./PLAN_EXPLORER_GAPS.md), and [PLAN_PARTNER_NEXT_STEPS.md](./PLAN_PARTNER_NEXT_STEPS.md). For a full system review, see [AUDIT.md](./AUDIT.md).

---

## Summary (June 2026 — latest)

| Batch | Scope |
|-------|--------|
| **i18n (EN / DE)** | `i18next` + `react-i18next`; locale files; `LanguageToggle` (EN/DE) in headers; auth bridge for `cofex-auth.js`; page headers, nav, explore filters/sort, passport, radar, partner routes |
| **Mobile / phone pass** | Safe-area insets, viewport-fit, explore default list view, radar 2×2 stats, responsive page shells, partner nav icon-only labels, landing/auth sizing |
| **Partner Next Steps** | QR verify scanner, multi-shop, campaign lifecycle, settings (API keys/referrals), printable QR PDF, auto-approve social, catalog verify UI, shop delete |
| **Partner UI refresh** | `AppPage` shell, `PartnerHeader`, `PartnerBottomNav`, all 8 partner routes aligned with explorer design language |
| **Explorer Engagement** | Leaderboard in Rewards menu, challenge claims, post-check-in sheet, analytics hooks |
| **Explorer Gaps** | City collections, badge moments, seasonal challenges, KPI persistence, discovery polish |
| **EEFFOC social flow** | Participation QR, social proof submissions, hybrid fulfillment |
| **Legal & polish** | 9 public legal routes, em-dash cleanup in user-facing copy, filter chip scroll-row fix |

---

## Internationalization (EN / DE)

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

**Partial / follow-up:** Wallet body copy, partner dashboard KPIs, landing Features/Testimonials sections, campaign wizard toasts — keys exist or remain English in deep UI.

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
| `20260614120000_explorer_challenge_claims.sql` | Challenge claims |
| `20260614140000_engagement_followup.sql` | Challenge defs, leaderboard rank |
| `20260615120000_explorer_gaps.sql` | City collections, events, funnel KPIs |
| `20260616120000_eeffoc_social_flow.sql` | Social proof, fulfillment modes, participation tokens |
| `20260617120000_partner_next_steps.sql` | Campaign lifecycle RPCs, auto-approve, shop delete |

Run `npm run db:push` then `npm run db:types` after pulling.

---

## Verification status (local)

| Check | Result |
|-------|--------|
| Unit tests (`npm test`) | 51 passing |
| Build (`npm run build`) | Passing |
| Partner E2E (`npm run test:e2e:partner`) | 12 passing |
| Migrations pushed | Through `20260617120000_partner_next_steps.sql` |
| Types regenerated | `src/integrations/supabase/types.ts` |

---

## New / notable files

```
src/lib/i18n/
  index.ts, locales/en.json, locales/de.json, use-filter-labels.ts
src/components/app/
  I18nProvider.tsx, LanguageToggle.tsx
src/components/auth/
  AuthLocaleBridge.tsx

src/components/app/partner/
  VerifyQrScanner.tsx, PartnerShopSelect.tsx, PartnerShell.tsx, …

src/lib/
  parse-verify-code.ts, participation-qr-pdf.ts, partner-campaign-edit.ts
  campaign-fulfillment.ts, queries/partner.ts

e2e/
  partner.auth.setup.ts, partner-routes.spec.ts, partner-guest.spec.ts

supabase/migrations/
  20260616120000_eeffoc_social_flow.sql
  20260617120000_partner_next_steps.sql
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
| [memory-bank/](./memory-bank/) | Agent / team memory bank |
