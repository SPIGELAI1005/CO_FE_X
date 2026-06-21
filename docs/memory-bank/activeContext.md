# Active Context (Memory Bank)

**Last updated:** June 21, 2026

---

## Current focus

**Latest ship batch:** Vision Waves 1–4 + campaign/reward domain model + deep i18n (wallet, partner dashboard, landing).

Recent work includes:

- **Vision Waves 1–4:** crawls, beverage passport, time bonuses, door QR, mood explore, origin stories, photo reviews, spawns, mayor, Beans, shop stories, map themes, crews, gifts, arrivals, push hook, health log stub — see [PLAN_VISION_FEATURES.md](../PLAN_VISION_FEATURES.md)
- **Campaign/reward domain:** `20260621120000_campaign_reward_domain.sql`, Zod schemas, mission steps UI, campaign discovery map — see [DATA_MODEL_CAMPAIGN_REWARD.md](../DATA_MODEL_CAMPAIGN_REWARD.md)
- **i18n depth:** wallet ledger/referrals, partner dashboard KPIs/charts/activity, landing Features/Testimonials/Download
- **CI:** `e2e-partner` job in GitHub Actions; secrets documented in README / `.env.example`
- **DE copy:** natural German for new strings and landing testimonials

**Next likely work:** Apply vision + campaign migrations to production Supabase; VAPID keys for Web Push; i18n for campaign wizard toasts; production hardening (CI E2E secrets, Stripe env).

---

## Recent decisions

| Decision | Rationale |
|----------|-----------|
| `i18next` over paraglide (for now) | Fast ship EN/DE; JSON locale files; can migrate later per DEVELOPMENT_PLAN |
| EN/DE text toggle (not globe icon) | Clear locale indicator on small phone headers |
| Auth via `AuthLocaleBridge` + `cofex-auth.js` | Keep vanilla auth script; avoid full React rewrite |
| Explore default view `list` on mobile | Split map/list unusable at 320px width |
| Crawls under Rewards dropdown | Passport · Crawls · Rank · Wallet — keeps 5-slot bottom nav |
| Rank under Rewards dropdown, not standalone tab | Avoid 6-item nav crowding on small phones |
| Partner verify via camera + manual tabs | Fast counter UX; `html5-qrcode` + `parseVerifyCode` |
| Lazy import Stripe server fns on billing | Prevent client bundle crash on `/partner/billing` |
| Extend existing tables for campaign domain | Backward-compatible spec mapping; views for `cafe_listings`, `explorer_rewards` |
| HealthKit / NFC / AR deferred to Wave 4 doc | Web-first ship; platform stubs documented in VISION_WAVE4_PLATFORM.md |

---

## Git / release state

Committed to [CO_FE_X](https://github.com/SPIGELAI1005/CO_FE_X) on `main` (June 2026).

Latest batch: Vision Waves 1–4, campaign reward domain, i18n + mobile pass.

Migrations through `20260621120000_campaign_reward_domain.sql` (apply with `db:push` + `db:types`).

---

## Open questions

1. **Launch cities** — Which cities get featured city-collection milestones and crawl routes first?
2. **Legal review** — Privacy policy notes “final legal review before Sep 28, 2026”
3. **CI E2E secrets** — GitHub Actions needs `SUPABASE_SERVICE_ROLE_KEY` for partner setup job
4. **Stripe production** — `VITE_FEATURE_STRIPE=true` + webhook validation for partner billing
5. **VAPID / Web Push** — `VITE_VAPID_PUBLIC_KEY` + service worker handler for production push
6. **i18n QA** — Native speaker review of DE copy; E2E selectors if auth button text varies by locale

---

## Do not regress

- Check-in must stay GPS-validated (200 m) via `perform_check_in`
- Challenge claims must stay server-verified (`claim_explorer_challenge`)
- Rank must remain under Rewards menu (not re-added as top-level tab without explicit decision)
- Legal links on profile must use `LEGAL_LINK_GROUPS`
- Partner verify must support both scan and manual entry
- Campaign fulfillment mode must not change after explorers have joined
- `I18nProvider` must wrap app routes (including 404/error boundaries that use `t()`)
- Mobile: bottom nav content must respect safe-area padding (`cofex-app-chrome-pb`)
- Rotating verify codes must use server-side TOTP window validation

---

## Key files to touch for common tasks

| Task | Start here |
|------|------------|
| Add / edit translations | `src/lib/i18n/locales/en.json`, `de.json` |
| Language toggle | `LanguageToggle.tsx`, `src/lib/i18n/index.ts` |
| Auth copy (OAuth form) | `AuthLocaleBridge.tsx`, `public/cofex-auth.js` |
| Mobile layout | `styles.css` (`cofex-safe-top`, `cofex-app-chrome-pb`), `AppPageShell.tsx` |
| New explorer page | `src/routes/_authenticated/_explorer/`, `AppPageShell.tsx` |
| Campaign mission UI | `CampaignMissionSteps.tsx`, `src/lib/campaign-mission.ts` |
| Campaign discovery map | `campaign-map.tsx`, `CampaignDiscoveryMap.tsx`, `lib/queries/campaign-map.ts` |
| Vision features | `src/lib/queries/vision.ts`, wave migrations `20260619120000`–`20260619150000` |
| Partner verify | `partner.verify.tsx`, `VerifyQrScanner.tsx`, `lib/queries/partner.ts` |
| Domain schemas | `src/lib/domain/schemas.ts`, `campaign-reward-model.ts` |
| New migration | `supabase/migrations/`, then `db:push` + `db:types` |
