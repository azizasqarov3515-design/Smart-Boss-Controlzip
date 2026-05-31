---
name: EXPO_PUBLIC_* in standalone EAS builds
description: Why the smartboss APK can't reach the API (login "JSON Parse error") while Expo Go works, and how to fix it.
---

# EXPO_PUBLIC_DOMAIN must be embedded into EAS builds

The smartboss app derives its API base URL from `process.env.EXPO_PUBLIC_DOMAIN`
(`BASE_URL = https://${EXPO_PUBLIC_DOMAIN}`) across its auth/api screens.

`EXPO_PUBLIC_*` vars are inlined at **bundle/build time**, not read at runtime.

- **Expo Go (dev):** the `dev` script sets `EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN`, so it's
  embedded and the app works.
- **Standalone APK/AAB (EAS):** the build runs on Expo's cloud where `REPLIT_DEV_DOMAIN` does
  NOT exist, so `EXPO_PUBLIC_DOMAIN` is `undefined` → `BASE_URL = ""` → every fetch hits an
  empty URL and gets HTML/nothing back → **"JSON Parse error: Unexpected character"** on
  login/register, and the whole app can't reach the API.

**Fix:** add `EXPO_PUBLIC_DOMAIN` to each build profile's `env` block in eas.json (both
`artifacts/smartboss/eas.json` — the one used when building from that dir — and the repo-root
`eas.json`, kept in sync). EAS embeds profile `env` values at build time.

**Why / tradeoff:** if you embed the **dev domain** (`*.replit.dev`) the APK is free but only
works while the Replit workspace's api-server workflow is running (dev domain sleeps when the
workspace is idle). For an always-on APK you must deploy the api-server to a stable
`*.replit.app` domain and embed THAT instead — but that requires a paid deployment.

**How to apply:** any new screen that calls the API must keep using `EXPO_PUBLIC_DOMAIN`; never
hardcode localhost. After changing the embedded domain, a NEW EAS build is required (env is
baked in at build time) — EAS free tier has limited build credits, so get it right in one go.
