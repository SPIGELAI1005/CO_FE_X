# Active Context (Memory Bank)

**Last updated:** June 11, 2026

---

## Current focus

**Partner Next Steps sprint is complete** (Epics 0–3 + extras). Explorer Engagement and Gaps sprints are also complete.

Recent ship batch includes:

- Partner QR verify scanner, multi-shop, campaign edit/pause/end, settings (API keys/referrals)
- Printable participation QR PDF, auto-approve social submissions, catalog verify UI, shop delete
- Partner UI refresh (`AppPage` shell, mobile nav, 8 routes)
- EEFFOC social flow (participation QR, submissions, hybrid fulfillment)
- Partner E2E suite (12 tests via `npm run test:e2e:partner`)
- Billing route fix (search param validation + lazy Stripe imports)

**Next likely work:** Phase 3 product items (push, realtime leaderboard, friends) or production hardening (CI E2E secrets, Stripe env, legal review).

---

## Recent decisions

| Decision | Rationale |
|----------|-----------|
| Rank under Rewards dropdown, not standalone tab | Avoid 6-item nav crowding on small phones |
| `LEGAL_LINK_GROUPS` single source | Footer + profile stay in sync |
| `explorer_events` table for KPIs | Admin funnel without third-party analytics |
| Partner verify via camera + manual tabs | Fast counter UX; `html5-qrcode` + `parseVerifyCode` |
| Campaign edit rules in RPC + client validator | Block fulfillment mode change after joiners |
| Partner E2E auto-provisions test user | Service role setup; no manual E2E secrets required locally |
| Lazy import Stripe server fns on billing | Prevent client bundle crash on `/partner/billing` |
| Em dash removed from user-facing copy | Consistent typography with explorer landing |

---

## Git / release state

Large batch committed to [CO_FE_X](https://github.com/SPIGELAI1005/CO_FE_X) on `main` (June 2026).

Migrations through `20260617120000_partner_next_steps.sql` applied to linked Supabase project.

---

## Open questions

1. **Launch cities** — Which cities get featured city-collection milestones first?
2. **Legal review** — Privacy policy notes “final legal review before Sep 28, 2026”
3. **CI E2E secrets** — GitHub Actions needs `SUPABASE_SERVICE_ROLE_KEY` for partner setup job (optional: `E2E_PARTNER_*`)
4. **Stripe production** — `VITE_FEATURE_STRIPE=true` + webhook validation for partner billing

---

## Do not regress

- Check-in must stay GPS-validated (200 m) via `perform_check_in`
- Challenge claims must stay server-verified (`claim_explorer_challenge`)
- Rank must remain under Rewards menu (not re-added as top-level tab without explicit decision)
- Legal links on profile must use `LEGAL_LINK_GROUPS`
- Partner verify must support both scan and manual entry
- Campaign fulfillment mode must not change after explorers have joined

---

## Key files to touch for common tasks

| Task | Start here |
|------|------------|
| New explorer page | `src/routes/_authenticated/_explorer/`, `AppPageShell.tsx` |
| Check-in UX | `ShopCheckInFlow.tsx`, `PostCheckInSheet.tsx` |
| Partner verify | `partner.verify.tsx`, `VerifyQrScanner.tsx`, `lib/queries/partner.ts` |
| Partner campaigns | `partner.campaigns.tsx`, `CampaignWizard.tsx`, `partner-campaign-edit.ts` |
| Partner multi-shop | `partner.shop.tsx`, `PartnerShopSelect.tsx` |
| Partner settings | `partner.settings.tsx`, `usePartnerApiKeys` |
| EEFFOC / social | `PLAN_EEFFOC_SOCIAL_FLOW.md`, `partner.submissions.tsx` |
| New migration | `supabase/migrations/`, then `db:push` + `db:types` |
