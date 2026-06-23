# Manual QA Checklist — Core CO:FE(X) Flows

**Last updated:** June 23, 2026  
**Purpose:** End-to-end validation when automated tests cannot cover device GPS, camera QR, or live Supabase RPC behavior.

Run after migrations are applied (`npm run db:push`) and with at least one **partner** café and **explorer** test account.

---

## Prerequisites

| Item | How to verify |
|------|----------------|
| Migrations applied | Latest through `20260623140000_admin_moderation.sql` |
| Partner account | Owns an approved `coffee_shops` row |
| Explorer account | Signed in on phone or narrow viewport (≤390px) |
| Active campaign | Partner created via Campaign Wizard (check-in, social, or hybrid) |

**Automated coverage:** `npm run test` (Vitest) + `npm run test:e2e` + `npm run test:e2e:partner`

---

## Explorer journey

### Campaign discovery

- [ ] Open **Campaigns** or **Campaign map** (`/campaign-map`)
- [ ] Active campaign appears with title, reward, and café name
- [ ] Expired or paused campaigns do **not** appear in discovery
- [ ] Tapping campaign opens detail with mission steps

### Join campaign

- [ ] Tap **Join** on an active campaign with remaining quantity
- [ ] Terms/disclosure shown for social/hybrid campaigns; must accept to join
- [ ] Full campaign shows “full” state and blocks new joins

### QR check-in

- [ ] From campaign detail or shop page, check in within **200 m** of café
- [ ] Check-in succeeds; post-check-in sheet appears
- [ ] Check-in **fails** when GPS is disabled or user is too far
- [ ] Participation QR (`?src=qr`) deep-links to campaign detail

### Social proof submission

- [ ] For social/hybrid campaigns, **Submit proof** opens assistant with hashtags + disclosure
- [ ] Link submission requires valid URL; screenshot upload works
- [ ] Submission moves phase to **Pending review**

### Reward unlock

- [ ] After check-in (check-in mode) or proof approval (social/hybrid), reward QR/code appears
- [ ] Rotating verify token refreshes every ~30s on reward screen
- [ ] Wallet/passport reflect new reward or stamp

### XP and badges

- [ ] Wallet ledger shows XP for check-in, proof, redemption (as applicable)
- [ ] Badge unlock sheet appears when a new badge is earned
- [ ] Profile/passport badge grid updates

---

## Partner (café) journey

### Campaign creation

- [ ] Partner opens **Campaigns** → wizard: reward type, quantity, timing, fulfillment mode
- [ ] Draft saves; publish activates campaign
- [ ] Printable participation QR PDF downloads

### Proof approval

- [ ] **Submissions** queue shows pending proofs with preview
- [ ] Approve moves explorer to reward phase; reject shows reason
- [ ] Auto-approve works when campaign flag enabled

### Reward redemption

- [ ] **Verify** → Scan tab reads explorer reward QR
- [ ] Manual entry accepts `CODE` or `CODE TOKEN`
- [ ] Successful verify shows reward details + toast
- [ ] Dashboard **Redeemed today** counter increments

### Café dashboard metrics

- [ ] Dashboard counters: active campaigns, pending proofs, redeemed today, new explorers, social reach, rewards left
- [ ] Pending proofs tile highlights when count > 0
- [ ] Rewards left decreases as explorers join

---

## Edge cases & security

### Duplicate redemption prevention

- [ ] Scan same reward code twice → **Already redeemed** warning (no double honor)
- [ ] Admin fraud dashboard lists duplicate attempts (if admin access)

### Expired / invalid campaign

- [ ] Expired campaign detail shows ended state; join/redeem blocked
- [ ] Invalid verify code → not found error
- [ ] Wrong café scans code → not yours error
- [ ] Invalid/expired rotating token → invalid token error

### Role-based access

- [ ] Explorer cannot open `/admin` or `/partner` routes (redirect to profile)
- [ ] Partner cannot open `/admin`
- [ ] Admin can access admin console

### Mobile layout

- [ ] Bottom nav visible with safe-area padding (notch/home indicator)
- [ ] Campaign detail, verify scanner, and reward QR usable at 320–390px width
- [ ] Partner dashboard counters scroll horizontally on narrow screens
- [ ] Language toggle (EN/DE) does not break layout

---

## Regression smoke (5 min)

- [ ] Explorer: Radar → Explore → check-in at shop → passport opens
- [ ] Partner: Dashboard loads KPIs → verify page loads scan + enter tabs
- [ ] Public shop page `/coffee/$slug` loads when logged out
- [ ] `npm run test` passes
- [ ] `npm run build` succeeds

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Explorer QA | | | |
| Partner QA | | | |
| Engineering | | | |
