# NepalRepublic Production Operations Checklist

Date: 2026-04-10

## Goal

Lock down the operating environment so production is not only deployable, but supportable.

## Required Environment

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SCRAPE_SECRET`
- `CRON_SECRET`
- `JWT_SECRET`
- `ENABLE_LEGACY_ADMIN_SECRET=false`

## Strongly Recommended Environment

- `SERVICE_OPS_WORKER_SECRET`
  Use a separate secret for `/api/ops/ai/worker` if you do not want to rely only on `CRON_SECRET`.
- `OWNER_EMAIL` or `OWNER_USER_ID`
  This turns on owner lock for admin/dashboard access and protects the configured owner account from deletion or demotion.
- `OPS_ALERT_WEBHOOK_URL`
  Sends failures from intelligence and ops pipelines to Slack or another webhook receiver.

## Production Cron Inventory

Configured in `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/vercel.json`:

- `/api/intelligence/sweep?mode=full`
- `/api/intelligence/worker?limit=10&batchSize=10&translationBatchSize=20`
- `/api/ops/ai/worker?limit=10`
- `/api/ministers/refresh`
- `/api/daily-brief?generate=1&noaudio=1`
- `/api/daily-brief?audioonly=1`
- `/api/daily-brief?videoonly=1`
- `/api/vault/reminders/tick`
- `/api/inbox/generate`
- `/api/digest/weekly`
- `/api/scoreboard/generate`
- `/api/me/reminders`

## Owner Lock

What it does:

- only configured owner identities can enter owner-protected admin surfaces
- configured owner accounts cannot be demoted or deleted through the user-management API

Recommended setup:

1. Set `OWNER_EMAIL` before first prod deploy.
2. After the permanent owner account exists, also set `OWNER_USER_ID`.
3. Keep `ENABLE_LEGACY_ADMIN_SECRET=false`.

## Ops Alerts

Alert delivery uses:

- `INTELLIGENCE_ALERT_WEBHOOK_URL`, or
- `OPS_ALERT_WEBHOOK_URL`

Manual verification route:

- `POST /api/admin/ops-alert/test`

This route requires admin auth and sends a low-severity test alert so webhook setup can be validated before launch.

## Release Gate

Before deploy, run:

1. `node scripts/launch-preflight.js`
2. `npx tsc -p tsconfig.json --noEmit`
3. `npm run build`
4. `npx tsx scripts/test-real-world.ts`

Shortcut:

- `npm run release:check`

## Current Status

As of 2026-04-10:

- full TypeScript check passes
- production build passes
- real-world smoke suite passes at 144 / 144
- service-ops AI worker is schedulable and protected
- owner lock and webhook setup still depend on environment configuration at deploy time

## Deploy Commands

From `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web`:

- Preview deploy:
  `npm run deploy:preview`
- Production deploy:
  `npm run deploy:prod`

Notes:

- This workspace is already linked to the Vercel project `admin-web`.
- `npx vercel whoami` currently resolves successfully on this machine.
- Do not deploy from a dirty tree unless you intentionally want all included changes shipped.
