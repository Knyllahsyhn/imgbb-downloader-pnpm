## Status

If deployments are failing, check [GitHub Status](https://www.githubstatus.com) — Pages component issues will cause timeouts. The workflow now includes an automatic check and will skip deployment if GitHub Pages is degraded.

| Component | Badge |
|-----------|-------|
| CI/Lint/Typecheck | [![CI](https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/actions/workflows/ci.yml) |
| Pages Deployment | [![GH Pages](https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/actions/workflows/deploy-pages.yml) |
| Worker Deployment | [![Cloudflare worker deployment](https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/actions/workflows/deploy-worker.yml/badge.svg)](https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/actions/workflows/deploy-worker.yml) |

# imgbb Album Downloader

Downloads entire [imgbb](https://imgbb.com) (`ibb.co`) albums as a ZIP - with
a preview grid, per-image selection, and a user-friendly UI.


## Why two parts (`apps/web`, `apps/worker`)?

imgbb album pages don't send an `Access-Control-Allow-Origin` header, so a
browser can't `fetch()` them directly from another domain (CORS). The actual
image files on `i.ibb.co`, on the other hand, do send
`Access-Control-Allow-Origin: *`.

Thus the two.part architecture:

- **`apps/worker`** - a Cloudflare Worker fetches the album page
  server-side, parses the per-image `data-object` JSON blobs embedded in the
  HTML, and also calls imgbb's own `/json` endpoint (the one behind their
  "Embed codes" tab) to get the complete, unpaginated image list — the album
  page itself only renders the first ~24-32 images and lazy-loads the rest.
  Exposes it all as a clean JSON API (`GET /api/album?url=...`) that runs for
  free on the Cloudflare free tier.
- **`apps/web`** - a static React/Vite app (GitHub Pages) that calls the
  Worker API, renders a grid, and downloads the images **directly from the
  browser**, zipping them client-side with
  [JSZip](https://stuk.github.io/jszip/). The Worker never has to pass image
  bytes through itself.

## Isn't this overkill for just downloading a few files? 
Possibly. But I'm trying to get a bit more experience with web-based stuff and this was a great learning experience. I thought I'd just run it locally somewhere but since there's only really one person who would use it (me) and there's free tier options for everything, why not?

What I like about this solution:

- It's pretty quick. Getting the links for even album with several hundreds of photos takes just a few seconds. 
- It tells you what's happening. You got a counter telling you where it's at and once that's through, you get the file. No waiting if something's gonna happen eventually- either it works or it tells you what went wrong.
- Bandwith and storage: Code itself's slim, node modules, especially *Wrangler*, can be substantial in size but I'm fine with it in GH's CI cache. Dependencies have been stripped down for things I don't need. And since everything runs client-side after fetching the album data, there's virtually no worker costs.


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

### 1. Worker -> Cloudflare Workers

```bash
cd apps/worker
pnpm exec wrangler login
pnpm deploy              # or: pnpm --filter worker deploy
```

Afterwards, set `wrangler.toml` ->  `vars.ALLOWED_ORIGIN` to your GitHub Pages
URL (e.g. `https://<user>.github.io`) so arbitrary sites can't call the API.

### 2. Web -> GitHub Pages

1. Repo settings -> **Pages** ->Source: **GitHub Actions**.
2. Repo settings -> **Secrets and variables -> Actions -> Variables** ->
   `WORKER_API_URL` = URL of the deployed worker (e.g.
   `https://imgbb-album-downloader-api.<subdomain>.workers.dev`).
3. Push to `main` -> the `deploy-pages` workflow builds & deploys
   automatically.

## CI/CD strategy

Split into three pipelines:

| Workflow            | Trigger                                  | Purpose                                                                                                                        |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`            | every PR, every push to `main`           | Format check, lint, typecheck, build both packages                                               |
| `deploy-pages.yml`  | push to `main` touching `apps/web/**`    | Checks GitHub Status, builds the web app (with the correct `BASE_PATH` for project pages) and deploys it via the official `actions/*-pages` actions. |
| `deploy-worker.yml` | push to `main` touching `apps/worker/**` | Deploys the worker via `wrangler-action`, with its own credentials (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).          |



Possible next step once more traffic is expected: rate limiting on the
worker (via cloudflare) against abuse of the
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
