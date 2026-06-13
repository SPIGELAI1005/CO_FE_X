# Memory Bank — CO:FE(X)

Persistent context for AI agents and team members working on the brew-quest-app codebase.

**Last updated:** June 11, 2026  
**Repository:** [github.com/SPIGELAI1005/CO_FE_X](https://github.com/SPIGELAI1005/CO_FE_X)

---

## What this is

The memory bank is a set of small, focused documents that capture **what the product is**, **how it is built**, **what was recently done**, and **what to do next**. Read these before starting non-trivial work so you do not re-discover architecture or repeat completed sprints.

---

## Files

| File | Read when… |
|------|------------|
| [productContext.md](./productContext.md) | You need product vision, roles, or “what CO:FE(X) is NOT” |
| [techContext.md](./techContext.md) | You need stack, scripts, env, folder layout |
| [systemPatterns.md](./systemPatterns.md) | You need conventions: queries, RPCs, check-in flow, nav |
| [activeContext.md](./activeContext.md) | You need current focus, recent decisions, open questions |
| [progress.md](./progress.md) | You need shipped vs in-progress vs deferred features |

---

## Long-form docs (outside memory bank)

| Doc | Purpose |
|-----|---------|
| [../PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) | Full product philosophy (authoritative) |
| [../LATEST_CHANGES.md](../LATEST_CHANGES.md) | Changelog of recent sprints |
| [../AUDIT.md](../AUDIT.md) | Comprehensive app audit |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Scale / SaaS architecture |
| [../DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md) | 12-week engineering roadmap |
| [../ARCHITECTURE_EXPLORER_ENGAGEMENT.md](../ARCHITECTURE_EXPLORER_ENGAGEMENT.md) | Engagement sprint architecture |
| [../SPRINT_EXPLORER_ENGAGEMENT.md](../SPRINT_EXPLORER_ENGAGEMENT.md) | Engagement sprint plan & outcomes |
| [../PLAN_EEFFOC_SOCIAL_FLOW.md](../PLAN_EEFFOC_SOCIAL_FLOW.md) | EEFFOC social QR + proof flow |
| [../PLAN_EXPLORER_GAPS.md](../PLAN_EXPLORER_GAPS.md) | Gaps sprint detail |
| [../PLAN_PARTNER_NEXT_STEPS.md](../PLAN_PARTNER_NEXT_STEPS.md) | Partner sprint (implemented June 2026) |

---

## Maintenance rules

1. Update **activeContext.md** when sprint focus or key decisions change.
2. Update **progress.md** when epics ship or new debt is identified.
3. Append to **LATEST_CHANGES.md** after each meaningful release batch.
4. Refresh **AUDIT.md** quarterly or before major fundraising / launch milestones.
5. Do not duplicate full product copy — link to `PROJECT_CONTEXT.md` instead.

---

## Quick facts

- **Product:** Coffee exploration marketplace (not ordering / delivery).
- **Users:** Explorers, Partners (cafés), Admins.
- **Stack:** TanStack Start + React 19 + Supabase + Tailwind v4.
- **Explorer nav:** Radar · Explore · Campaigns · Rewards↓ · Profile.
- **Partner nav:** Dashboard · Shop · Campaigns · Submissions · Verify · Rewards · Analytics · Billing · Settings.
- **Core explorer loop:** Discover → check-in (GPS) → sheet → challenges → passport → rank.
- **Core partner loop:** Shop → EEFFOC campaign → social/check-in → verify at counter → analytics.
