# Local Cron — run sweep / worker / brief from your laptop, push to Supabase

This replaces the Vercel-side cron jobs with launchd plists running on your
laptop. Vercel still hosts the website (it reads from Supabase). All AI work
runs locally against LM Studio (or any OpenAI-compatible local server).

## Why

Cost. The Vercel-cron path called paid AI APIs every 4–8 hours. The local-cron
path uses your local model (Gemma / Qwen via LM Studio) at $0.

## Architecture

```
  ┌──────────────────┐    cron schedule     ┌────────────────────┐
  │ launchd plists   │ ──────────────────▶  │ next start :3030   │
  │ (your laptop)    │   curl + secret      │ (your laptop)      │
  └──────────────────┘                      └─────────┬──────────┘
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │  LM Studio   │
                                              │  Gemma 26B   │
                                              │  :1234       │
                                              └──────────────┘
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │   Supabase   │     ◀─ Vercel website
                                              │   (cloud)    │        reads from here
                                              └──────────────┘
```

## Schedule

| Task | When (NPT) | Endpoint |
|------|------------|----------|
| Full sweep | 07:15, 19:15 | `/api/intelligence/sweep?mode=full` |
| Worker | every hour at :30 | `/api/intelligence/worker?limit=15&batchSize=12&translationBatchSize=25` |
| Daily brief (text) | 07:45, 19:45 | `/api/daily-brief?generate=1&noaudio=1` |
| Daily brief (audio) | 08:00, 20:00 | `/api/daily-brief?audioonly=1` |

## Prereqs

1. **`.env.local`** in `apps/admin-web/` must have:
   - `CRON_SECRET=...` (used to authenticate cron calls)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `AI_BASE_URL=http://localhost:1234/v1` (LM Studio default)
   - `AI_API_KEY=lm-studio` (any non-empty value)
   - `AI_MODEL=google/gemma-4-26b-a4b` (or whatever you've loaded)
   - `OPENCLAW_DISABLED=true` (skip the OpenClaw CLI path)
   - `INTELLIGENCE_INLINE_ANALYSIS_WORKER=true` (run brain inline during sweep)

2. **LM Studio** running with a model loaded **at 8192+ context length**.

   ⚠️ **Important:** the tier-1 classification prompt sends a catalog of all
   ~121 commitments (~5000 tokens). LM Studio defaults to 4096 — that's too
   small. When you load the model, set **Context Length = 8192** (or higher)
   in the load options.

   If context is too small, the AI router silently falls back to OpenAI
   (paid) — your laptop is up but you're still spending. Verify with:
   ```bash
   curl http://localhost:1234/v1/models  # confirm model loaded
   tail -f ~/Library/Logs/nepal-republic/cron-worker.log | grep "AI Router"
   # If you see "n_keep > n_ctx" errors → reload model with bigger context.
   ```

3. **Production build**:
   ```bash
   cd ~/Desktop/nepal-progress/apps/admin-web && npm run build
   ```

## Install

```bash
bash ~/Desktop/nepal-progress/apps/admin-web/scripts/local-cron/install.sh
```

This loads 5 launchd jobs into `~/Library/LaunchAgents/`:
- `com.nepalrepublic.next-server` — keeps `next start` running on :3030
- `com.nepalrepublic.cron-sweep`
- `com.nepalrepublic.cron-worker`
- `com.nepalrepublic.cron-daily-brief`
- `com.nepalrepublic.cron-daily-brief-audio`

Logs land in `~/Library/Logs/nepal-republic/`.

## Verify

```bash
# server reachable?
curl -s http://127.0.0.1:3030/api/health | head

# manually fire a task
launchctl start com.nepalrepublic.cron-worker

# tail logs
tail -f ~/Library/Logs/nepal-republic/cron-worker.log

# list loaded jobs
launchctl list | grep nepalrepublic
```

## Uninstall

```bash
bash ~/Desktop/nepal-progress/apps/admin-web/scripts/local-cron/uninstall.sh
```

## Troubleshooting

- **Server not reachable on :3030** — check `~/Library/Logs/nepal-republic/next-server.log`. If port is busy, kill the offender (`lsof -i :3030`) or change `LOCAL_CRON_PORT` (env var on each cron plist) and the `--port` arg in `com.nepalrepublic.next-server.plist`.
- **LM Studio errors out** — open LM Studio, verify a model is loaded, then `launchctl start com.nepalrepublic.cron-worker` to retry.
- **Laptop sleeps and crons miss** — `caffeinate -s` is set on `next-server` to keep the machine awake while the server runs. If you close the lid, you may want to plug in.
- **Want the dev server back** — `launchctl unload ~/Library/LaunchAgents/com.nepalrepublic.next-server.plist`, run `npm run dev`. Reload the plist when done.

## What about Vercel?

The matching crons in `apps/admin-web/vercel.json` are commented out / removed
when this is installed. Vercel keeps serving the website (read-only from
Supabase). If you want to roll back, restore those crons and uninstall here.
