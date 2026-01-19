# GitHub Pages Deployment Guide

Deploy PAVI UI to GitHub Pages for free hosting with mock API support for Percy visual testing.

## Overview

- **Hosting**: GitHub Pages (free, unlimited bandwidth)
- **Mock API**: Client-side service worker intercepts API calls
- **Percy Testing**: Test across multiple browsers and devices via BrowserStack
- **Build**: Static HTML export from Next.js

## Quick Setup

### 1. Enable GitHub Pages

1. Go to your repository: https://github.com/nuin/agr_pavi
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - Source: **GitHub Actions**
   - Click **Save**

### 2. Push to Main Branch

The GitHub Actions workflow (`.github/workflows/deploy-github-pages.yml`) will automatically:
- Build the Next.js app with static export
- Register the mock service worker
- Deploy to GitHub Pages

```bash
git push origin main
```

### 3. Wait for Deployment

- Go to **Actions** tab in GitHub
- Watch the "Deploy to GitHub Pages" workflow
- Takes ~3-5 minutes

### 4. Access Your Site

Your site will be available at:
```
https://nuin.github.io/agr_pavi/
```

## How It Works

### Static Export

Next.js generates static HTML files:
```bash
GITHUB_PAGES=true NEXT_PUBLIC_MOCK_API=true npm run build
```

Output: `webui/out/` directory with static files

### Mock API via Service Worker

The service worker (`public/mock-sw.js`) intercepts fetch requests to `/api/*` and returns mock data:

- Job submission: `/api/pipeline-job/`
- Job status: `/api/pipeline-job/{uuid}`
- Alignment results: `/api/pipeline-job/{uuid}/result/alignment`
- Sequence info: `/api/pipeline-job/{uuid}/result/seq-info`
- Job logs: `/api/pipeline-job/{uuid}/logs`

### Different Job States

Test different UI states with query parameters:
```
# Job progress states
/progress?uuid=test&mockStatus=pending
/progress?uuid=test&mockStatus=running
/progress?uuid=test&mockStatus=completed
/progress?uuid=test&mockStatus=failed

# Load example data
/submit?loadExample=brca1
```

## Percy Visual Testing

Once deployed, run Percy tests against your GitHub Pages URL:

```bash
cd webui
BASE_URL=https://nuin.github.io/agr_pavi PERCY_TOKEN=your_token npm run percy
```

Percy will:
- ✅ Test across multiple browsers (Chrome, Firefox, Safari, Edge)
- ✅ Test multiple viewport sizes (375, 768, 1280, 1920px)
- ✅ Test on real devices via BrowserStack
- ✅ Capture 27 snapshots across 9 pages

## Pages Tested

| Page | URL | Purpose |
|------|-----|---------|
| Home | `/` | Landing page |
| Submit (Empty) | `/submit` | Empty form |
| Submit (Data) | `/submit?loadExample=brca1` | Form with data |
| Progress (Pending) | `/progress?uuid=test&mockStatus=pending` | Job pending |
| Progress (Running) | `/progress?uuid=test&mockStatus=running` | Job running |
| Progress (Complete) | `/progress?uuid=test&mockStatus=completed` | Job completed |
| Results | `/result?uuid=test` | Alignment results |
| Jobs List | `/jobs` | Job history |
| Help | `/help` | Help page |

## Local Testing

Test the GitHub Pages build locally:

```bash
cd webui

# Build for GitHub Pages
GITHUB_PAGES=true NEXT_PUBLIC_MOCK_API=true npm run build

# Serve the static files
npx serve out

# Visit http://localhost:3000
```

## Troubleshooting

### Build Fails

Check:
- Node version is 24 (see `.nvmrc`)
- All dependencies installed: `npm ci --strict-peer-deps`
- Environment variables set: `GITHUB_PAGES=true` and `NEXT_PUBLIC_MOCK_API=true`

### Service Worker Not Working

Check browser console for:
```
[PAVI] Mock Service Worker registered: /mock-sw.js
```

If missing:
- Verify `NEXT_PUBLIC_MOCK_API=true` is set during build
- Check browser supports service workers (HTTPS required)
- Clear browser cache and reload

### 404 Errors

GitHub Pages URLs must include the repository name:
- ✅ Correct: `https://nuin.github.io/agr_pavi/`
- ❌ Wrong: `https://nuin.github.io/`

If you see 404s, update the `basePath` in `next.config.mjs`:
```javascript
basePath: process.env.GITHUB_PAGES === 'true' ? '/agr_pavi' : '',
```

## Cost

- **GitHub Pages**: Free (1GB storage, unlimited bandwidth for public repos)
- **Percy**: Free tier (5000 screenshots/month)
- **Total**: $0 per month

## Files Created

- `.github/workflows/deploy-github-pages.yml` - GitHub Actions workflow
- `public/mock-sw.js` - Service worker for mock API
- `src/app/components/MockServiceWorker.tsx` - SW registration component
- `next.config.mjs` - Updated with static export config
- `.env.production` - Production environment variables

## Next Steps

1. ✅ Push to main to trigger deployment
2. ✅ Verify site loads at https://nuin.github.io/agr_pavi
3. ✅ Test mock API (check browser console)
4. ✅ Run Percy visual tests
5. ✅ Review Percy dashboard for visual diffs
