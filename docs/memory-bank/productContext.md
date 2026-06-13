# Product Context (Memory Bank)

**Full reference:** [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)

---

## One-liner

CO:FE(X) is a mobile-first coffee **exploration and engagement** platform connecting independent cafés with explorers who discover, check in, earn rewards, and share their journey.

---

## What it is

A marketplace blending:

- Discovery (Airbnb / Tripadvisor)
- Location-based matching (Uber-style proximity)
- Gamification (Pokémon Go / Duolingo progression)
- Loyalty (Starbucks Rewards-style points)

---

## What it is NOT

- Food delivery
- Coffee ordering
- Reservations
- Cryptocurrency / token project
- Discount coupon site

---

## User roles

| Role | Goal |
|------|------|
| **Explorer** | Discover cafés, check in, join campaigns, earn badges/points, climb leaderboard |
| **Partner** | List shop, run campaigns, verify redemptions, view analytics |
| **Admin** | Moderate shops/campaigns/users, view engagement KPIs and revenue |

---

## Core explorer loop (shipped)

```
Explore / Radar → Visit café → GPS check-in (200 m)
  → BadgeUnlockSheet (if new badges)
  → PostCheckInSheet (review / campaign / passport / challenges)
  → Points + passport stamps → Leaderboard rank
```

---

## Navigation model

Bottom nav (5 slots):

1. **Radar** — nearby offers, challenges, limited-time events
2. **Explore** — map + list, filters, map check-in
3. **Campaigns** — active partner campaigns
4. **Rewards ↓** — Passport · Rank · Wallet
5. **Profile** — edit profile, partner apply, legal links

---

## Development principles

Every feature must answer [six questions](../PROJECT_CONTEXT.md#development-principles):

1. Does it help explorers discover cafés?
2. Does it help partners gain visibility?
3. Does it increase engagement or retention?
4. Does it fit the gamification model?
5. Is it mobile-first?
6. Can it ship incrementally?

---

## Phase status (June 2026)

| Phase | Theme | Status |
|-------|-------|--------|
| Core explorer loop | Check-in, passport, campaigns, wallet | ✅ Shipped |
| Engagement sprint | Rank, claims, post-check-in sheet | ✅ Shipped |
| Gaps sprint | City collections, badges, seasonal, KPIs | ✅ Shipped |
| Phase 3+ | Friends rank, push, realtime, EU scale | 🔜 Deferred |
