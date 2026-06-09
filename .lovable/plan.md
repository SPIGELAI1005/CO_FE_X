
# CO:FE(X) — Build Plan

A mobile-first coffee exploration platform connecting independent coffee shops with Explorers through discovery, campaigns, badges, and rewards. Full-vision scope, so this is broken into phases. Each phase produces a usable product.

## Phase 0 — Foundation (this turn)

1. **Generate 3 design directions** (rendered HTML previews) in the coffee brown / cream / black / accent gold palette, mobile-first, inspired by Apple, Airbnb, and Spotify. Three distinct point-of-view directions — e.g. editorial-warm, premium-minimal, playful-exploration — varying density, hierarchy, and motion. You pick one.
2. **Enable Lovable Cloud** (database, auth, storage, server functions).
3. **Set up auth**: email/password + Google sign-in via the Lovable broker. Auth route at `/auth`, protected app under `_authenticated/`.
4. **Profiles table** for Explorer data (display name, avatar, level, XP, city, bio).

## Phase 1 — Explorer MVP

The core consumer experience:

- **Discover** — list + map view of coffee shops, filters (city, vibe, open now, has campaign).
- **Shop profile** — photos, description, hours, location, menu highlights, active campaigns, badges available, reviews.
- **Check-in** — Explorers check in at a shop (location-aware), earns XP and progresses toward badges.
- **Badges** — collectible badges per shop, per city, per challenge (Pokémon Go style collection grid).
- **Profile** — Explorer level, XP bar, badge collection, check-in history, rewards wallet.
- **Reviews** — rating + short review on shop profile (Tripadvisor style).

## Phase 2 — Campaigns & Rewards

- **Campaigns** — shops create time-limited challenges ("Visit 3 espresso bars this week → free latte"). Explorers join, progress tracked, rewards unlock.
- **Rewards wallet** — redeemable codes for free coffee / discounts, with QR shown at shop.
- **Rankings** — city leaderboards, friend leaderboards, all-time Explorer levels.
- **Social campaigns** — share a check-in to social media, earn bonus XP.

## Phase 3 — Shop Owner Side

- **Shop dashboard** — claim/manage listing, edit profile, upload photos, set hours.
- **Campaign builder** — create campaigns, set reward, set duration, set goal.
- **Subscription billing** — monthly listing plan + per-campaign fees + premium promotion slots. Payment provider chosen after running the eligibility check (likely Stripe for SaaS-style subscriptions).
- **Analytics** — check-ins, campaign participation, redemption rate.

## Phase 4 — Polish & Growth

- Push/email notifications for new campaigns near you and badge unlocks.
- Onboarding flow, empty states, splash, app-icon-style PWA setup.
- SEO for city/shop pages.
- Premium promotion slots on Discover.

## Technical notes

- **Stack**: TanStack Start v1 + React 19 + Tailwind v4. Mobile-first responsive across all screens.
- **Backend**: Lovable Cloud (Supabase under the hood) — Postgres with RLS, Storage for photos, server functions for business logic (check-in validation, reward issuance, campaign progress).
- **Auth**: email/password + Google (broker-managed). Roles via separate `user_roles` table (`explorer`, `shop_owner`, `admin`) using the `has_role` security-definer pattern.
- **Key tables (Phase 1)**: `profiles`, `user_roles`, `shops`, `shop_photos`, `check_ins`, `badges`, `user_badges`, `reviews`. Phase 2 adds `campaigns`, `campaign_participants`, `rewards`, `reward_redemptions`. Phase 3 adds `shop_subscriptions`.
- **Maps**: Mapbox GL JS for the discovery map (requires a publishable Mapbox token — I'll ask when we get to Phase 1's map view).
- **Design tokens**: coffee brown, cream white, black, accent gold mapped to semantic tokens (`--background`, `--primary`, `--accent`, etc.) in `src/styles.css`.

## What I'll deliver this turn

Just Phase 0: three rendered design directions for you to pick from, plus enabling Lovable Cloud. Once you pick a direction, I'll execute Phase 1 in the next turn. Subsequent phases happen in follow-up turns so each one is reviewable.
