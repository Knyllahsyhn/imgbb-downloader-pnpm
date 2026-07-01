

# imgbb Album Downloader
[![CI](https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/actions/workflows/ci.yml)
[![GH Pages](https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/actions/workflows/deploy-pages.yml)
[![Cloudflare worker deployment](https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/actions/workflows/deploy-worker.yml/badge.svg)](https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/actions/workflows/deploy-worker.yml)

Downloads entire [imgbb](https://imgbb.com) (`ibb.co`) albums as a ZIP — with
a preview grid, per-image selection, and a UI that doesn't look like it's
from 2012.

## Why two parts (`apps/web`, `apps/worker`)?

imgbb album pages don't send an `Access-Control-Allow-Origin` header, so a
browser can't `fetch()` them directly from another domain (CORS). The actual
image files on `i.ibb.co`, on the other hand, do send
`Access-Control-Allow-Origin: *`.

That shapes the architecture:

- **`apps/worker`** — a Cloudflare Worker that fetches the album page
  server-side, parses the per-image `data-object` JSON blobs embedded in the
  HTML, and also calls imgbb's own `/json` endpoint (the one behind their
  "Embed codes" tab) to get the complete, unpaginated image list — the album
  page itself only renders the first ~24-32 images and lazy-loads the rest.
  Exposes it all as a clean JSON API (`GET /api/album?url=...`). Runs for
  free on the Cloudflare free tier.
- **`apps/web`** — a static React/Vite app (GitHub Pages) that calls the
  Worker API, renders a grid, and downloads the images **directly from the
  browser**, zipping them client-side with
  [JSZip](https://stuk.github.io/jszip/). The Worker never has to pass image
  bytes through itself.

## Setup

```bash
corepack enable        # or: npm install -g pnpm
pnpm install
```

### Run the worker locally

```bash
pnpm dev:worker         # http://127.0.0.1:8787
```

### Run the web app locally

```bash
cp apps/web/.env.example apps/web/.env.local
pnpm dev:web             # http://localhost:5173
```

## Deployment

### 1. Worker → Cloudflare Workers

```bash
cd apps/worker
pnpm exec wrangler login
pnpm deploy              # or: pnpm --filter worker deploy
```

Afterwards, set `wrangler.toml` → `vars.ALLOWED_ORIGIN` to your GitHub Pages
URL (e.g. `https://<user>.github.io`) so arbitrary sites can't call the API.

### 2. Web → GitHub Pages

1. Repo settings → **Pages** → Source: **GitHub Actions**.
2. Repo settings → **Secrets and variables → Actions → Variables** →
   `WORKER_API_URL` = URL of the deployed worker (e.g.
   `https://imgbb-album-downloader-api.<subdomain>.workers.dev`).
3. Push to `main` → the `deploy-pages` workflow builds & deploys
   automatically.

## CI/CD strategy

Three separate, lean workflows instead of one monolithic pipeline:

| Workflow            | Trigger                                  | Purpose                                                                                                                        |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`            | every PR, every push to `main`           | Format check, lint, typecheck, build both packages — fast feedback, no deploy.                                                 |
| `deploy-pages.yml`  | push to `main` touching `apps/web/**`    | Builds the web app (with the correct `BASE_PATH` for project pages) and deploys it via the official `actions/*-pages` actions. |
| `deploy-worker.yml` | push to `main` touching `apps/worker/**` | Deploys the worker via `wrangler-action`, with its own credentials (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).          |

Principles behind this:

- **Path filters instead of building the whole monorepo**: a change to only
  `apps/web` doesn't trigger a needless worker redeploy (and vice versa) —
  shorter feedback loops, fewer pointless deploys.
- **CI gates, deploy follows separately**: `ci.yml` runs on every PR and must
  pass before merging (set it as a required check in branch protection
  rules). The deploy workflows only run on `main`, after the code has already
  been checked.
- **`--frozen-lockfile`** everywhere, so CI never silently installs different
  versions than what was tested locally.
- **Secrets only in the worker deploy**: the web app needs no Cloudflare
  credentials, just the public worker URL as a build variable
  (`WORKER_API_URL`, not a secret — it ends up in the client bundle anyway).
- **Dependabot** (`.github/dependabot.yml`) keeps npm and Action versions
  current weekly, grouping dev dependencies into a single PR instead of ten
  separate ones.

Possible next step once more traffic is expected: rate limiting on the
worker (e.g. Cloudflare Rate Limiting Rules) against abuse of the
`/api/album` route.

## Project structure

```
apps/
  web/       React + Vite + TypeScript + Tailwind (GitHub Pages)
  worker/    Cloudflare Worker, scrapes imgbb server-side (CORS workaround)
.github/
  workflows/ CI + separate deploy pipelines
```

## Tech stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, JSZip, file-saver
- **Backend**: Cloudflare Workers, TypeScript
- **Tooling**: pnpm workspaces, ESLint, Prettier
- **CI/CD**: GitHub Actions, GitHub Pages, Cloudflare Wrangler

## License

MIT, see [LICENSE](./LICENSE).
