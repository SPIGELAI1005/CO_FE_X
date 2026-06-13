# Active Context (Memory Bank)

**Last updated:** June 11, 2026

---

## Current focus

**Latest ship batch:** English/German i18n + mobile phone responsiveness pass, on top of completed Partner Next Steps and Explorer Engagement/Gaps sprints.

Recent work includes:

- **i18n:** `i18next` stack, `en.json` / `de.json`, EN/DE toggle in headers, auth locale bridge, localized nav + page headers + explore filters
- **Mobile:** Safe-area insets, explore list-first on phones, responsive page shells, radar 2×2 stats, partner nav icon-only labels
- Partner QR verify, multi-shop, campaign lifecycle, settings, EEFFOC social flow (prior commits)
- Partner E2E suite (12 tests)

**Next likely work:** Complete i18n for wallet/partner dashboard deep copy; Phase 3 (push, realtime leaderboard); production hardening (CI E2E secrets, Stripe env).

---

## Recent decisions

| Decision | Rationale |
|----------|-----------|
| `i18next` over paraglide (for now) | Fast ship EN/DE; JSON locale files; can migrate later per DEVELOPMENT_PLAN |
| EN/DE text toggle (not globe icon) | Clear locale indicator on small phone headers |
| Auth via `AuthLocaleBridge` + `cofex-auth.js` | Keep vanilla auth script; avoid full React rewrite |
| Explore default view `list` on mobile | Split map/list unusable at 320px width |
| Rank under Rewards dropdown, not standalone tab | Avoid 6-item nav crowding on small phones |
| Partner verify via camera + manual tabs | Fast counter UX; `html5-qrcode` + `parseVerifyCode` |
| Lazy import Stripe server fns on billing | Prevent client bundle crash on `/partner/billing` |

---

## Git / release state

Committed to [CO_FE_X](https://github.com/SPIGELAI1005/CO_FE_X) on `main` (June 2026).

Prior commit: Partner Next Steps (`3b97ca2`). Latest adds i18n + mobile pass.

Migrations through `20260617120000_partner_next_steps.sql` applied to linked Supabase project.

---

## Open questions

1. **Launch cities** — Which cities get featured city-collection milestones first?
2. **Legal review** — Privacy policy notes “final legal review before Sep 28, 2026”
3. **CI E2E secrets** — GitHub Actions needs `SUPABASE_SERVICE_ROLE_KEY` for partner setup job
4. **Stripe production** — `VITE_FEATURE_STRIPE=true` + webhook validation for partner billing
5. **i18n QA** — Native speaker review of DE copy; E2E selectors if auth button text varies by locale

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

---

## Key files to touch for common tasks

| Task | Start here |
|------|------------|
| Add / edit translations | `src/lib/i18n/locales/en.json`, `de.json` |
| Language toggle | `LanguageToggle.tsx`, `src/lib/i18n/index.ts` |
| Auth copy (OAuth form) | `AuthLocaleBridge.tsx`, `public/cofex-auth.js` |
| Mobile layout | `styles.css` (`cofex-safe-top`, `cofex-app-chrome-pb`), `AppPageShell.tsx` |
| New explorer page | `src/routes/_authenticated/_explorer/`, `AppPageShell.tsx` |
| Partner verify | `partner.verify.tsx`, `VerifyQrScanner.tsx`, `lib/queries/partner.ts` |
| New migration | `supabase/migrations/`, then `db:push` + `db:types` |
