# Active Context (Memory Bank)

**Last updated:** June 24, 2026

---

## Current focus

**Latest ship batch:** Partner/campaign flow hardening — join eligibility, analytics date filters, submissions query fix, branded QR + door poster, wizard polish.

Recent work includes:

- **Campaign join & timing:** Local calendar-day semantics for custom dates; `_campaign_is_live` RPC fixes for `join_campaign`; explorer UI shows “Starts {date}” when scheduled
- **Partner analytics:** `local-date-range.ts` — partner KPIs no longer drop activity after local midnight (UTC date bug)
- **Partner submissions:** Fixed Supabase query (invalid profiles FK hint); tab counts; auto-approved badge; error state instead of silent empty
- **Campaign wizard:** EEFFOC template renames/categories, publish step i18n, edit campaign crash fix, branded QR + door PDF
- **Prior batch:** Core flow tests (143 Vitest), vision waves 1–4, campaign reward domain, EN/DE i18n, mobile pass — see [LATEST_CHANGES.md](../LATEST_CHANGES.md)

**Next likely work:** Partner pages React Query migration; i18n for remaining wizard toasts; VAPID/Web Push; CI E2E secrets; native speaker DE QA.

---

## Recent decisions

| Decision | Rationale |
|----------|-----------|
| Local calendar day for campaign starts | Custom “June 24” must mean local midnight, not UTC midnight (CEST users blocked until 02:00 otherwise) |
| `_campaign_is_live` via `to_jsonb(record)` | `join_campaign` passes `c.*` + shop columns; composite `campaigns` type cast fails |
| Profiles fetched separately for submissions | No FK from `social_submissions.user_id` → `profiles`; nested PostgREST hint was breaking the whole query |
| Partner analytics uses local date strings | `toISOString().slice(0,10)` is UTC — wrong “today” for EU partners after midnight |
| Auto-approve social skips pending tab | Submissions page defaults to Pending; counts + hint direct partners to Approved |
| Branded QR level H + ~33% logo | Scannable with centered CO:FE(X) icon on participation/door materials |
| `i18next` over paraglide (for now) | Fast ship EN/DE; JSON locale files; can migrate later per DEVELOPMENT_PLAN |
| Explore default view `list` on mobile | Split map/list unusable at 320px width |
| Partner verify via camera + manual tabs | Fast counter UX; `html5-qrcode` + `parseVerifyCode` |

---

## Git / release state

Committed to [CO_FE_X](https://github.com/SPIGELAI1005/CO_FE_X) on `main` (June 2026).

Latest batch: Campaign/partner hardening, June 24 migrations (`20260624010000`–`20260624040000`).

Migrations through `20260623160000` + June 24 `_campaign_is_live` fixes (apply with `db:push` + `db:types`).

Production Supabase project **CO_FE_X** (`knstohnnpkllirovqrvz`) — June 24 migrations pushed during hardening session.

---

## Open questions

1. **Launch cities** — Which cities get featured city-collection milestones and crawl routes first?
2. **Legal review** — Privacy policy notes “final legal review before Sep 28, 2026”
3. **CI E2E secrets** — GitHub Actions needs `SUPABASE_SERVICE_ROLE_KEY` for partner setup job
4. **Stripe production** — `VITE_FEATURE_STRIPE=true` + webhook validation for partner billing
5. **VAPID / Web Push** — `VITE_VAPID_PUBLIC_KEY` + service worker handler for production push
6. **i18n QA** — Native speaker review of DE copy; E2E selectors if auth button text varies by locale
7. **Timezone for multi-country** — Campaign start/end currently assumes Europe/Berlin in SQL backfill; may need shop timezone column later

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
- Partner submissions query must not use non-existent PostgREST FK hints to `profiles`
- `_campaign_is_live` must accept joined records from `join_campaign` (not only bare `campaigns` rows)

---

## Key files to touch for common tasks

| Task | Start here |
|------|------------|
| Add / edit translations | `src/lib/i18n/locales/en.json`, `de.json` |
| Campaign join eligibility | `src/lib/campaign-availability.ts`, `campaign.$id.tsx` |
| Campaign wizard / EEFFOC templates | `CampaignWizard.tsx`, `src/lib/campaign-wizard.ts`, `eeffoc-templates.ts` |
| Partner analytics date range | `partner.analytics.tsx`, `src/lib/local-date-range.ts` |
| Partner submissions | `partner-submissions.ts`, `partner.submissions.tsx`, `SocialProofReviewCard.tsx` |
| Branded / door QR | `qr-code-brand.ts`, `shop-door-qr-pdf.ts`, `ShopDoorQr.tsx` |
| Campaign mission UI | `CampaignMissionSteps.tsx`, `src/lib/campaign-mission.ts` |
| `_campaign_is_live` SQL | `supabase/migrations/202606240*.sql` |
| New migration | `supabase/migrations/`, then `db:push` + `db:types` |
| Core flow QA | [QA_CHECKLIST_CORE_FLOWS.md](../QA_CHECKLIST_CORE_FLOWS.md) |
