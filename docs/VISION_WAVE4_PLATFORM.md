# Vision Wave 4 — Platform Capabilities

**Status:** Partial implementation; native integrations deferred.

## Implemented in app

| Feature | Approach |
|---------|----------|
| Health / steps / caffeine | Manual daily log via `explorer_health_logs` + Profile UI ring |
| Soundscapes | Optional `soundscape_url` on shop; opt-in player on shop page |
| Map themes | Profile `map_theme` + Explore map CSS filters |
| NFC tap-to-redeem | **Not implemented** — QR remains primary; Web NFC is Android-only |
| AR cup collection | **Not implemented** — badge unlock sheet remains 2D; WebXR deferred |

## Native roadmap (when wrapping PWA)

1. **HealthKit / Google Fit** — Capacitor plugin sync into `upsert_health_log`
2. **Web NFC** — Fallback to QR on iOS; document in partner kit
3. **WebXR** — Optional “scan cup” mode after native app shell exists
4. **Background geo-fence** — Requires native permissions; door QR covers MVP

## Privacy

- Health data stored per-user with RLS; not shared with partners
- Push subscriptions stored on `profiles.push_subscription` only

## Partner hardware kit (recommended)

- Door QR (PDF) + counter participation QR + optional NFC sticker linking to same URL
