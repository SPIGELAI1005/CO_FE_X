# CO:FE(X) — Vision Features Plan

**Last updated:** June 2026  
**Status:** Waves 1–4 shipped in repo (June 2026)

Living backlog for 20 Pokémon Go–inspired feature ideas. See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for product constraints (exploration first, not ordering).

---

## Feature audit matrix

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Step counter & caffeine tracker | Wave 4 | Manual log + UI; native HealthKit deferred |
| 2 | Rare café spawns | Wave 2 | `spawn_events` + Radar/map |
| 3 | Coffee biomes / Mayor | Wave 2 | Grid-cell weekly mayor RPC |
| 4 | AR coffee cup collection | Wave 4 | Feature flag stub; WebXR deferred |
| 5 | Squad / coffee crew | Wave 3 | `crews` + shared challenges |
| 6 | Door QR + geo check-in | Wave 1 | Shop door QR + deep link |
| 7 | Post-and-scan loop | Wave 1 | Rotating verify code + wallet QR |
| 8 | NFC tap-to-redeem | Wave 4 | Documented; QR primary |
| 9 | Live queue / 5 min away | Wave 3 | `shop_arrivals` |
| 10 | Gifting & trading | Wave 3 | One-way gift credits |
| 11 | Beans / streak currency | Wave 2 | `beans_balance` + catalog |
| 12 | Multi-beverage passport | Wave 1 | `check_ins.beverage_tag` |
| 13 | Time-of-day bonuses | Wave 1 | RPC multipliers in check-in |
| 14 | Café stories | Wave 2 | `shop_stories` 24h reel |
| 15 | Mood-based discovery | Wave 1 | Explore mood chips |
| 16 | Aesthetic map themes | Wave 2 | Theme preference + CSS/tiles |
| 17 | Soundscapes | Wave 4 | Optional `soundscape_url` |
| 18 | Roastery origin stories | Wave 1 | Structured shop fields |
| 19 | Photo review challenges | Wave 1 | `reviews.media_urls` + weekly theme |
| 20 | Coffee crawls | Wave 1 | `coffee_crawls` + stops |

**Scorecard:** Waves 1–4 shipped in repo; Wave 4 platform features (HealthKit, NFC, AR) documented and deferred.

---

## Wave roadmap

### Wave 1 — Enhance existing (8–12 weeks)
Coffee crawls, multi-beverage passport, time-of-day bonuses, door QR, post-and-scan polish, mood discovery, roastery origin, photo review challenges.

### Wave 2 — Gamification & beauty
Rare spawns, territory mayor, Beans currency, café stories, map themes.

### Wave 3 — Social & arrival
Crews, gifting, live arrival, Web Push subscriptions.

### Wave 4 — Platform evaluation
Health log (manual), soundscapes URL, NFC/AR stubs and docs.

---

## Architecture

- Mutations via Postgres RPCs + RLS
- Inbox: `notifications` table + [NotificationsBell](../src/components/app/NotificationsBell.tsx)
- Check-in: `perform_check_in` with beverage + time bonus
- Partner verify: `verify_redemption_code` + rotating TOTP window

---

## Sprint A (shipped in this batch)

1. Coffee crawls + city/crawls UI  
2. Multi-beverage pick on check-in + passport tabs  
3. Time-of-day bonuses in RPC  
4. Door QR component + partner PDF  
5. Wallet QR + rotating verify display  
6. Mood chips on Explore  
7. Origin block on shop pages + partner form  
8. Photo reviews + weekly challenge  

## Sprint B (Wave 2–3 in this batch)

9. Spawn events + Radar strip  
10. Mayor grid RPC + map crown  
11. Beans balance + earn on streak milestones  
12. Shop stories upload + reel UI  
13. Map theme selector  
14. Crews + invite  
15. Gift credits  
16. Shop arrivals + partner list  
17. Push subscription hook  

## Wave 4

18. Manual health log on profile  
19. Soundscape player on shop card  
20. Platform capability docs in `docs/VISION_WAVE4_PLATFORM.md`
