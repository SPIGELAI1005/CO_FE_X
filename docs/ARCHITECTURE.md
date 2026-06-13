# CO:FE(X) — Production Architecture

Target capacity: **100,000 explorers · 10,000 coffee shops · Europe-wide**.
This document is the single source of truth for backend structure, scaling
strategy, and follow-up work. The accompanying migration
(`20260612_saas_foundation.sql`) implements every schema element described
here.

---

## 1. Stack overview

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | TanStack Start v1 + React 19 + Tailwind v4 | Mobile-first, SSR on public routes |
| Edge runtime | Cloudflare Workers (via Lovable Cloud) | Stateless, ~50ms cold start, global PoPs |
| Database | Supabase Postgres 15 (EU region) | RLS enforced, `pg_cron` for rollups |
| Storage | Supabase Storage `shop-images` | Signed URLs (1y TTL), private bucket |
| Auth | Supabase Auth + Lovable broker (Google) | Roles in `user_roles` table |
| Payments | Stripe via Lovable Payments | Subscription billing for partners (next turn) |
| AI | Lovable AI Gateway | Future: review summarization, badge suggestions |

## 2. Geography (multi-country / multi-city)

Normalized hierarchy: `countries` → `regions` (optional) → `cities`.
Coffee shops carry both `country_code` + `city_id` FKs **and** the legacy
text fields (for SEO slugs and free-form imports).

```text
countries (30 seeded)        cities (~110 seeded, expandable)
─────────                    ──────
code PK (ISO-2)              id, country_code, region_id, name, slug
name, currency, locale       lat, lng, timezone, population
default_timezone, vat_rate   featured (bool), active
flag_emoji, active
```

Currency + VAT travel with `country_code`, so Stripe prices and reward
catalog amounts can be displayed in local currency without hard-coding.

**Discover query pattern** (constant-time at any scale):
```sql
SELECT * FROM coffee_shops
 WHERE status='approved' AND country_code='DE' AND city_id=$1
 ORDER BY featured DESC, created_at DESC LIMIT 24;
-- backed by coffee_shops_status_country_idx + coffee_shops_city_idx
```

## 3. Subscription billing

Provider-agnostic schema — `stripe_*` columns are nullable placeholders
that the Stripe webhook will populate.

| Plan | €/mo | Shops | Campaigns/mo | Analytics | API |
|------|------|-------|--------------|-----------|-----|
| Starter | 0 | 1 | 1 | Basic | — |
| Growth | 29 | 3 | 10 | Full + CSV | Read |
| Pro | 99 | 25 | ∞ | Full + CSV | Read + Write + Webhooks |

- Every partner gets a Starter `subscription` row automatically on role
  grant (via `ensure_starter_subscription` trigger on `user_roles`).
- Entitlements resolved through `has_plan_feature(uid, 'feature')` — checks
  the partner's currently-active subscription against `plans.features`.
- `partner_can(uid, action)` composes role + plan checks; existing partner
  RPCs (campaign create, shop create, API key issuance) call it.

## 4. Public REST API

Endpoints live under `src/routes/api/public/v1/*` (this prefix bypasses
Lovable's auth gate). API keys authenticate with
`Authorization: Bearer cofx_live_<hex>` — server route hashes the key with
`sha256` and calls `verify_api_key()`.

```text
GET  /api/public/v1/shops             ?country=DE&city=berlin
GET  /api/public/v1/shops/:id
GET  /api/public/v1/campaigns         ?shop_id=...
GET  /api/public/v1/redemptions       (write-scope, partner-owned only)
POST /api/public/v1/check-ins         (write scope)
POST /api/public/v1/webhooks/subscribe
```

Rate limit (token bucket in Postgres):
- Growth read-only: **60 rpm/key**
- Pro read+write: **600 rpm/key**
- Enforced by `consume_api_quota(api_key_id)`; returns `429` + `Retry-After`.

Security guarantees:
- Plaintext key returned **once** at `issue_api_key()`, never again.
- `key_hash` excluded from `authenticated` column grants — partners can't
  read their own hash via PostgREST.
- Per-request logging in `api_request_log` (BRIN index on `created_at`
  keeps it cheap; rolling 30-day retention via `pg_cron`).
- Edge cache on read endpoints: `Cache-Control: s-maxage=60, stale-while-revalidate=300`.

## 5. Referrals

**Explorer referrals** (existing): `profiles.referral_code` + `claim_referral`
RPC, 50 pts referee / 100 pts referrer.

**Partner referrals** (new): `partner_referrals` table.
- Referrer partner shares their account-level code; new partner enters it
  during onboarding.
- Status flow: `pending` → `qualified` (referee's first paid invoice
  clears) → `paid` (free month credit applied).
- Default reward: €50 credit (configurable per row).

## 6. Analytics rollup layer

Per-request aggregation over raw events doesn't scale to 100k users / 10k
shops. Three rollup tables refreshed by `pg_cron`:

```text
shop_daily_stats     (shop_id, day) PK
partner_daily_stats  (partner_id, day) PK
platform_daily_stats (day, country_code) PK
```

All BRIN-indexed on `day` (cheap range scans). Refresh cadence:
- **Hourly** — recompute today (`UPSERT WHERE day = current_date`)
- **Nightly 02:00 UTC** — recompute yesterday (corrects late-arriving events)

Partner dashboard reads rollups instead of raw `check_ins`/`reviews`
joins, making dashboard load O(days requested) instead of O(events).

## 7. Permissions model

| Role | Source | Powers |
|------|--------|--------|
| `explorer` | auto-assigned at signup | Check in, redeem, review, refer |
| `partner` | granted on partner-application approval | Manage own shops, campaigns, rewards, submissions |
| `admin` | granted manually | Everything, plus platform analytics |
| `franchise_owner` | reserved | Manage a brand group of shops (future) |

All checks go through `has_role(uid, role)` (SECURITY DEFINER, immutable
search_path). RLS is enabled on every table with default-deny.
Direct writes from the client to billing/api-key/referral/rollup tables
are blocked — they only happen through validated SECURITY DEFINER RPCs
or service-role (server functions).

## 8. Deployment & scaling strategy

### Edge runtime (Cloudflare Workers)
- Stateless — never store request state in module scope.
- Public API GETs cached at the edge (60s s-maxage + SWR).
- Heavy admin/server functions use `requireSupabaseAuth` middleware →
  per-request `supabase` client (RLS as user).

### Database scaling milestones
| MAU | Action |
|-----|--------|
| < 25k | Single Supabase instance, default plan |
| 25k–50k | Upgrade compute tier; enable PgBouncer transaction pooling |
| 50k+ | Add read replica; route rollup reads + leaderboard to replica |
| 100k+ | Partition `check_ins` and `points_ledger` by month |

### Critical indexes (verify on production)
```sql
check_ins (user_id, created_at DESC)
check_ins (coffee_shop_id, created_at DESC)
points_ledger (user_id, created_at DESC)
social_submissions (coffee_shop_id) WHERE status='approved'
coffee_shops (status, country_code) WHERE status='approved'
shop_daily_stats USING brin (day)
partner_daily_stats USING brin (day)
```

### Storage & media
- `shop-images` bucket private, partner-scoped folder
  (`(storage.foldername(name))[1] = auth.uid()::text`).
- Signed URLs cached on client; consider Cloudflare Images origin
  transform at 1M+ images for automatic AVIF/WebP + resizing.

### Background jobs (`pg_cron`)
| Job | Schedule | Purpose |
|-----|----------|---------|
| `rollup_today` | `*/15 * * * *` | Refresh today's stats |
| `rollup_yesterday` | `15 2 * * *` | Backfill prior day |
| `expire_points` | `0 3 * * *` | Mark expired `points_ledger` rows |
| `purge_api_log` | `30 3 * * *` | Delete `api_request_log` older than 30d |
| `qualify_referrals` | `45 3 * * *` | Flip `partner_referrals` to `qualified` |

Heavy work (Stripe reconciliation, weekly digests) lives in server routes
under `/api/public/cron/*`, secured with a shared bearer token, invoked
by an external scheduler.

### Observability
- Server functions log structured JSON (request id, user id, latency).
- Supabase logs + Workers Analytics give p50/p95/p99 per endpoint.
- Future: pipe `api_request_log` aggregates to admin dashboard.

### GDPR / EU compliance
- Database region: EU (Frankfurt).
- Data export RPC: `export_user_data(uid)` returns a JSON bundle.
- Hard delete: `DELETE FROM auth.users` cascades through every FK.
- Cookie banner + privacy policy needed before public launch.

### Capacity sizing
| Resource | Year-1 estimate | Headroom |
|----------|-----------------|----------|
| `check_ins` rows | ~5M/yr | Single node fine; partition at 50M |
| `points_ledger` rows | ~20M/yr | BRIN on `created_at` keeps scans cheap |
| API peak | 1k Pro keys · 10 rps avg = 10k rps | ≥80% absorbed by edge cache |
| Storage | 10k shops · 10 images · 500KB = ~50 GB | Negligible cost |

## 9. Follow-up roadmap (NOT in this turn)

| # | Task | Why |
|---|------|-----|
| 1 | Enable Stripe via `enable_stripe_payments` + checkout/portal/webhook | Activates real billing |
| 2 | Partner onboarding wizard UI | Claim shop → pick plan → Stripe checkout |
| 3 | `/api/public/v1/*` route handlers + Zod validation | Ship the API surface |
| 4 | Partner API-key management UI | Issue/revoke keys with one-time reveal |
| 5 | Analytics dashboard rewrite | Read from rollup tables (constant-time) |
| 6 | City/country pickers on Discover + admin city curation | UX for geo |
| 7 | `pg_cron` job definitions | Requires confirming pg_cron is enabled |
| 8 | Franchise/brand-group entity | Multi-shop ownership with sub-managers |
| 9 | Stripe webhook → referral qualification | Closes the partner-referral loop |

## 10. Mermaid: high-level data flow

```text
   ┌────────┐  REST   ┌───────────────┐
   │External│────────▶│ /api/public/v1│──┐
   └────────┘          └──────┬────────┘  │ verify_api_key
                              │           │ consume_api_quota
                              ▼           ▼
   ┌────────┐  TanStack ┌──────────────────────┐
   │Browser │──────────▶│ createServerFn +     │
   │ React  │           │ requireSupabaseAuth  │
   └────────┘           └─────────┬────────────┘
                                  │ RLS as user
                                  ▼
                       ┌──────────────────────┐
                       │ Postgres (Supabase)  │
                       │ ├── geo: countries/  │
                       │ │   regions/cities   │
                       │ ├── domain: shops,   │
                       │ │   check_ins, etc.  │
                       │ ├── billing: plans,  │
                       │ │   subscriptions    │
                       │ ├── api: keys, logs  │
                       │ └── rollups (cron)   │
                       └──────────────────────┘
```
