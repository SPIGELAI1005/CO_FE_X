# CO(X) Campaign & Reward Data Model

**Last updated:** June 2026  
**Migration:** `supabase/migrations/20260621120000_campaign_reward_domain.sql`  
**TypeScript:** `src/lib/domain/campaign-reward-model.ts`, `src/lib/domain/schemas.ts`

This document maps the product spec entities to the CO:FE(X) Postgres schema. The app **extends existing tables** rather than replacing them, so all current features keep working.

---

## Entity mapping

| Spec entity | Database | Notes |
|-------------|----------|-------|
| **users / profiles** | `profiles` + `user_roles` | Role via `user_roles.role`: `explorer`, `partner` (= cafe_owner), `admin` |
| **cafés / shops** | `coffee_shops` | View: `cafe_listings` adds `has_active_campaign` |
| **campaigns** | `campaigns` + `campaign_participants` | EEFFOC slogan, reward type, hashtags, T&C |
| **check_ins** | `check_ins` | Workflow status + persisted GPS |
| **social_proofs** | `social_submissions` | View alias: `social_proofs` |
| **rewards** | `campaign_redemptions`, `catalog_redemptions` | Unified view: `explorer_rewards` |
| **badges** | `badges`, `user_badges` | Added `category`, `rarity` |
| **xp_events** | `points_ledger` | View: `xp_events` (positive deltas); `profiles.total_points` = XP |

---

## Profiles (explorers)

| Spec field | Column | Type |
|------------|--------|------|
| id | `id` | uuid PK → auth.users |
| display name | `display_name` | text |
| avatar | `avatar_url` | text |
| role | `user_roles.role` | app_role enum |
| XP | `total_points` | integer |
| level | `explorer_level` | text (auto-synced from points) |
| total check-ins | `total_check_ins` | integer |
| total rewards redeemed | `total_rewards_redeemed` | integer |
| preferred drink categories | `preferred_drink_categories` | text[] |
| privacy preferences | `privacy_preferences` | jsonb |

Level tiers (synced by trigger): `rookie` → `seeker` (50) → `hunter` (200) → `master` (500) → `nomad` (1500) → `legend` (5000).

---

## Coffee shops (cafés)

| Spec field | Column |
|------------|--------|
| owner id | `partner_id` |
| name, logo, images | `name`, `logo_url`, `cover_image_url`, `gallery_urls[]` |
| address, lat, lng | `address`, `latitude`, `longitude` |
| opening hours | `opening_hours` jsonb |
| description | `description` |
| social links | `social_links` jsonb |
| verification status | `status` (pending / approved / …) |
| campaign status | `cafe_listings.has_active_campaign` (computed) |

---

## Campaigns

| Spec field | Column |
|------------|--------|
| café id | `coffee_shop_id` |
| title | `title` |
| slogan | `slogan` (default: **We give EEFFOC!**) |
| description | `description` |
| reward type | `reward_type` (coffee, espresso, matcha, …) |
| reward quantity | `reward_quantity` |
| available quantity | `available_quantity` (also `max_participants`) |
| start / end | `starts_at`, `ends_at` |
| required social action | `social_requirements` jsonb + `fulfillment_mode` |
| hashtags | `hashtags` text[] (+ legacy `hashtag`) |
| campaign image | `cover_image_url` |
| terms | `terms_and_conditions` |
| status | `draft`, `active`, `paused`, `expired`, `completed`, `ended` |

---

## Check-ins

| Spec field | Column |
|------------|--------|
| explorer id | `user_id` |
| café / campaign | `coffee_shop_id`, `campaign_id` |
| timestamp | `created_at` |
| QR code used | `qr_code_used` |
| location confirmed | `location_confirmed` |
| status | `check_in_status` |

Statuses: `started`, `social_pending`, `reward_pending`, `redeemed`, `rejected`.

Social/hybrid campaigns set `social_pending` on check-in until proof is approved.

---

## Social proof

Table: **`social_submissions`** · View: **`social_proofs`**

| Spec field | Column |
|------------|--------|
| platform | `platform` |
| post URL / proof | `url`, `screenshot_path` |
| verification status | `status` (pending / approved / rejected) |
| reviewed by | `reviewed_by`, `reviewed_at` |

RPCs: `submit_social_proof`, `review_social_submission`.

---

## Rewards

Unified read model: **`explorer_rewards`** view.

| Source table | Use case |
|--------------|----------|
| `campaign_redemptions` | EEFFOC campaign unlock codes |
| `catalog_redemptions` | Wallet catalog redemptions |

| Spec field | Column |
|------------|--------|
| reward code / QR | `redemption_code` |
| status | `reward_status`: locked, unlocked, redeemed, expired |
| redeemed timestamp | `used_at` |

Counter `profiles.total_rewards_redeemed` increments when `used_at` is set (trigger).

---

## Badges

| Spec field | Column |
|------------|--------|
| name, description, icon | `name`, `description`, `icon_url` |
| category | `category` |
| unlock criteria | `criteria` jsonb |
| rarity | `rarity` (common → legendary) |
| user unlock | `user_badges.earned_at` |

---

## XP events

View **`xp_events`** over `points_ledger` where `delta > 0`.

| Spec field | Column |
|------------|--------|
| action type | `source` |
| XP value | `delta` |
| related id | `ref_id`, `ref_table` |
| timestamp | `created_at` |

Award path: `award_points()` RPC (used by check-in, reviews, campaigns, challenges).

---

## Validation (Zod)

| Schema | File | Used for |
|--------|------|----------|
| `campaignCreateSchema` | `schemas.ts` | Campaign wizard alignment |
| `checkInRequestSchema` | `schemas.ts` | Client check-in payloads |
| `socialProofSubmitSchema` | `schemas.ts` | Social proof forms |
| `cafeUpdateSchema` | `schemas.ts` | Partner shop profile |

Existing wizard: `CampaignWizard.tsx` has its own schema — align over time.

---

## Security

- **RLS** unchanged on base tables; views use `security_invoker = true`.
- **Mutations** remain RPC-first: `perform_check_in`, `join_campaign`, `redeem_campaign`, `verify_redemption_code`, `submit_social_proof`.
- **Private data**: `privacy_preferences` on profile; push subscriptions jsonb; social proof storage bucket is private.

---

## Apply & seed

```bash
npm run db:push
npm run db:types
```

Optional demo backfill: `supabase/seed.sql` (updates campaigns/shops/profiles in place — no auth users created).

---

## Related docs

- [PLAN_VISION_FEATURES.md](./PLAN_VISION_FEATURES.md) — feature roadmap
- [AUDIT.md](./AUDIT.md) — system audit
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — product constraints
