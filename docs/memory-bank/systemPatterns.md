# System Patterns (Memory Bank)

Conventions and data flows used across the codebase.

---

## React Query pattern

- One hook file per domain under `src/lib/queries/` (e.g. `leaderboard.ts`, `passport.ts`)
- Query keys centralized in `src/lib/queries/keys.ts`
- Stale times in `src/lib/queries/stale-times.ts`
- Invalidation graph in `src/lib/queries/invalidation.ts`

**After check-in or challenge claim, invalidate:**

`passport`, `challengeClaims`, `cityCollection`, `profile`, `leaderboard`, `radar`, `wallet`

---

## RPC-first mutations

Sensitive operations go through Postgres RPCs (RLS + server logic), not direct table writes:

| RPC | Use |
|-----|-----|
| `perform_check_in` | GPS-validated check-in, badges, points |
| `claim_explorer_challenge` | Challenge rewards |
| `award_points` | Ledger entries |
| `log_explorer_event` | Analytics persistence |
| `get_leaderboard` / `get_my_leaderboard_rank` | Rankings (optional city slug) |
| `get_city_collection_progress` | City milestone progress |
| `verify_redemption_code` | Partner counter verify (campaign + wallet catalog) |
| `partner_set_campaign_status` | Pause / resume / end campaign |
| `partner_update_campaign` | Partial campaign edit |
| `partner_delete_shop` | Delete shop (no active campaigns) |
| `issue_api_key` / `revoke_api_key` | Partner API keys |

Client wrappers: `src/lib/rpc/client.ts`  
Partner hooks: `src/lib/queries/partner.ts`

---

## Check-in pipeline

```
User taps Check in
  → ShopCheckInFlow (geolocation + perform_check_in RPC)
  → BadgeUnlockSheet (if new badges)
  → PostCheckInSheet (getPostCheckInActions())
```

Used on:

- `CoffeeShopPage.tsx` (public shop page, auth users)
- `MapShopSheet.tsx` (explore map)

Distance rule: **200 m** — `src/lib/geo.ts` (Haversine)

---

## Post-check-in actions

`src/lib/post-check-in-actions.ts` — pure function, unit-tested.

Action types: review, campaign, passport, challenge claim, city_almost_done.

Ordering prioritizes incomplete high-value CTAs.

---

## Explorer analytics

`src/lib/explorer-analytics.ts`:

- Fire-and-forget client events
- Debounced batch → `log_explorer_event` RPC
- Fail-silent (never block UX)
- DEV: `console.debug` + `CustomEvent("cofex:explorer")`

Admin reads funnel via `get_explorer_funnel_kpis` in `admin.analytics.tsx`.

---

## Navigation / layout

- Explorer layout: `src/routes/_authenticated/_explorer/route.tsx`
  - `AppHeader`, `BottomNav`, onboarding redirect, email verification banner
- Page shell: `AppPage` + `AppPageHeader` + `AppPageBody` + `AppPageSection`
- Rewards dropdown: `BottomNav.tsx` — Passport, Rank, Wallet

---

## Partner layout / verify

- Partner layout: `src/routes/_authenticated/partner.tsx` — `SideNav`, `PartnerHeader`, `PartnerBottomNav`
- Page shell: same `AppPage` components as explorer
- Verify flow: `VerifyQrScanner` → `parseVerifyCode` → `useVerifyRedemptionCode` → `verify_redemption_code` RPC
- Multi-shop: `PartnerShopSelect` + `localStorage` active shop id
- Campaign lifecycle: `useSetCampaignStatus`, `CampaignWizard` edit mode, `partner-campaign-edit.ts` validation

---

## Legal links (single source)

`LEGAL_LINK_GROUPS` in `LegalPageShell.tsx` feeds:

- `MarketingFooter` (landing, onboarding)
- `AppLegalLinks` (profile)

Do not duplicate link lists elsewhere.

---

## UI scroll rows with chips

Horizontal chip rows use `.cofex-chip-scroll-row` to prevent hover border clipping (`overflow-x-auto` + `translateY(-1px)` on `.cofex-app-chip:hover`).

---

## Testing layers

| Layer | Location | When to add |
|-------|----------|-------------|
| Unit | `src/lib/*.test.ts` | Pure helpers, action ordering |
| RPC integration | `src/lib/rpc/client.integration.test.ts` | New critical RPCs |
| Invalidation | `src/lib/queries/invalidation.test.ts` | New cache keys |
| E2E | `e2e/*.spec.ts` | Critical user journeys; partner suite: `test:e2e:partner` |

---

## Route categories

| Prefix | Guard |
|--------|-------|
| `/` public | None |
| `/auth` | Guest-oriented |
| `/coffee/$slug`, `/city/$city` | Public SSR |
| `/_authenticated/_explorer/*` | Session + onboarding |
| `/_authenticated/partner/*` | Session + partner role |
| `/_authenticated/admin/*` | Session + admin role |
