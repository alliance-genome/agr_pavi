# Deploying Under a Base Path (e.g. `alliancegenome.org/pavi`)

The WebUI can be served either at the root of a domain (the default, e.g.
`dev-pavi.alliancegenome.org/`) or under a URL prefix (e.g.
`alliancegenome.org/pavi`). This is controlled by a single build-time
environment variable.

## The switch: `NEXT_PUBLIC_BASE_PATH`

| Value | Result |
|-------|--------|
| unset / empty (default) | App served at root. **No behavior change** — existing deploys and Vercel previews are unaffected. |
| `/pavi` | App served under `/pavi`. All routes, static assets, `_next/*`, API routes, and links live under the prefix. |

It **must be set at build time** — Next.js bakes `basePath` into the client
bundle, so setting it only at runtime (`next start`) has no effect.

```bash
# Build for /pavi
NEXT_PUBLIC_BASE_PATH=/pavi PAVI_API_BASE_URL=https://api.pavi.alliancegenome.org npm run build
NEXT_PUBLIC_BASE_PATH=/pavi npm run start
```

## How it works

`next.config.mjs` applies `basePath` only when the variable is set, so the
default build is untouched. Next.js then auto-prefixes everything it
controls: `<Link>`, `useRouter().push()`, `redirect()`, `next/image` (the
optimizer endpoint), API route paths, and `_next/*` assets.

**The reverse proxy / load balancer routes but does not rewrite.** Whatever
fronts the shared domain (an AWS ALB listener rule, CloudFront behavior, or
Caddy) forwards `/pavi/*` to the PAVI server **with the prefix intact** — it
does not strip it. The app expects the prefix because it was built with
`basePath`. Do **not** configure a path-rewrite that strips `/pavi`; that
would desync the app's asset URLs.

- **AWS ALB (production):** add a listener rule — condition `Path is
  /pavi/*` → forward to PAVI's target group. ALB has no URL-rewrite action,
  which is exactly what we want here.
- **Caddy (single-host / EC2):** `handle /pavi/* { reverse_proxy localhost:PORT }`,
  ordered before the root handlers.

## Writing code that survives a base path

Next.js auto-prefixes the framework primitives above, but **not raw
strings**. When a base path is set, a bare `/api/...` or `/foo` string will
point at the domain root, outside the app. Use the helper for these:

```ts
import { withBasePath } from '@/utils/basePath';

fetch(withBasePath('/api/pipeline-job/123'));        // client fetch()
window.location.href = withBasePath('/api/.../export'); // location assignment
<Image src={withBasePath('/guide/shot.jpg')} ... />  // next/image with a STRING src
```

`withBasePath()` is a no-op when no base path is set, so it is always safe.

Rules of thumb:
- **Internal navigation:** use `next/link` / `router.push()` / `redirect()` — never a raw `<a href="/…">`.
- **Client `fetch()` / `window.location` to an app path:** wrap in `withBasePath()`.
- **`next/image`:** a static import needs nothing; a **string** `src` to a
  `public/` asset must be wrapped in `withBasePath()` (otherwise the image
  optimizer 400s under a base path).
- **Server-side calls to the backend** (`${PAVI_API_BASE_URL}/api/...`) need
  **no** change — they address the backend directly, which has no base path.
- **Middleware** (`src/middleware.ts`) proxies `/api/*`; its mock-mode
  rewrite is base-path-aware via `request.nextUrl.basePath`.

## Testing a base-path build alongside a root build

A `NEXT_PUBLIC_BASE_PATH=/pavi` build and a root build cannot share one
`.next` output. To run both on one host, use a second working copy:

```bash
git worktree add ../agr_pavi-pavi main
cd ../agr_pavi-pavi/webui && npm ci --strict-peer-deps --engine-strict=false
NEXT_PUBLIC_BASE_PATH=/pavi PAVI_API_BASE_URL=http://localhost:8000 npm run build
NEXT_PUBLIC_BASE_PATH=/pavi PAVI_API_BASE_URL=http://localhost:8000 npx next start -p 3100
```

Then route `/pavi/*` to `:3100` (Caddy or an ALB test rule). The current
root instance keeps serving unchanged.

**Quick sanity checks:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/pavi/            # 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/                 # 404 (base path active)
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3100/pavi/_next/image?url=%2Fpavi%2Fguide%2F01-submit.jpg&w=828&q=75"  # 200 image/jpeg
```
