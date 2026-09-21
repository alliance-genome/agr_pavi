# Vercel & Percy Setup for PAVI Visual Testing

This guide explains how to deploy PAVI UI to Vercel with mock API and run Percy visual regression tests.

## Overview

- **Vercel**: Free static hosting for the PAVI UI with mock API responses
- **Percy**: Visual regression testing with 5000 free screenshots/month
- **Mock Mode**: Full UI functionality without backend dependency

## Architecture

```
User → Vercel (PAVI UI) → Mock API (Next.js API Routes) → Mock Data
```

When `MOCK_API=true`, all `/api/*` requests are redirected to `/api/mock/*` which returns mock responses for:
- Job submission
- Job status (pending, running, completed, failed)
- Alignment results
- Sequence metadata
- Job logs

## Setup Steps

### 1. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New" → "Project"
3. Import your GitHub repository: `https://github.com/nuin/agr_pavi`
4. Configure:
   - **Root Directory**: `webui`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install --strict-peer-deps`
5. Add Environment Variable:
   - Name: `MOCK_API`
   - Value: `true`
6. Click "Deploy"

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from webui directory
cd webui
vercel

# Set environment variable
vercel env add MOCK_API true production

# Deploy to production
vercel --prod
```

### 2. Configure Percy

1. Sign up at [percy.io](https://percy.io)
2. Create a new project called "PAVI"
3. Get your PERCY_TOKEN from project settings
4. Add Percy token to your environment:

```bash
export PERCY_TOKEN=your_percy_token_here
```

### 3. Run Percy Visual Tests

#### Test Locally (with Mock API)

```bash
# Start dev server with mock API
npm run dev:mock

# In another terminal, run Percy snapshots
PERCY_TOKEN=your_token npm run percy:local
```

#### Test on Vercel Deployment

```bash
# Replace with your Vercel URL
BASE_URL=https://your-app.vercel.app PERCY_TOKEN=your_token npm run percy
```

## Pages Tested

Percy captures snapshots of these pages at multiple viewport sizes:

| Page | URL | Widths | Purpose |
|------|-----|--------|---------|
| Home | `/` | 375, 768, 1280, 1920 | Landing page |
| Submit (Empty) | `/submit` | 375, 768, 1280, 1920 | Empty form |
| Submit (Data) | `/submit?loadExample=brca1` | 768, 1280, 1920 | Form with data |
| Progress (Pending) | `/progress?uuid=...&mockStatus=pending` | 768, 1280 | Job pending state |
| Progress (Running) | `/progress?uuid=...&mockStatus=running` | 768, 1280 | Job running state |
| Progress (Complete) | `/progress?uuid=...&mockStatus=completed` | 768, 1280 | Job completed |
| Results | `/result?uuid=...` | 1280, 1920 | Alignment results |
| Jobs List | `/jobs` | 768, 1280 | Job history |
| Help | `/help` | 768, 1280 | Help page |

**Total**: 9 pages × ~3 viewports = ~27 snapshots per run

## Mock Data

Mock data is defined in `src/utils/mockData.ts` and includes:
- BRCA1 Human/Mouse alignment
- Job statuses (pending, running, completed, failed)
- Sequence metadata
- Job logs

To modify mock data, edit `src/utils/mockData.ts` and redeploy.

## Testing Different States

Use query parameters to test different UI states:

```
# Test different job statuses
/progress?uuid=test&mockStatus=pending
/progress?uuid=test&mockStatus=running
/progress?uuid=test&mockStatus=completed
/progress?uuid=test&mockStatus=failed

# Load example data
/submit?loadExample=brca1
```

## CI/CD Integration

### GitHub Actions (Example)

```yaml
name: Percy Visual Tests

on: [push, pull_request]

jobs:
  percy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '24'
      - name: Install dependencies
        run: cd webui && npm install --strict-peer-deps
      - name: Build
        run: cd webui && MOCK_API=true npm run build
      - name: Run Percy snapshots
        run: cd webui && BASE_URL=http://localhost:3000 npm run percy
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

## Viewing Results

After running Percy:
1. Go to https://percy.io
2. Select your "PAVI" project
3. View the build with visual diffs
4. Approve or reject changes

## Cost

- **Vercel**: Free tier (100 GB bandwidth/month, unlimited deployments)
- **Percy**: Free tier (5000 screenshots/month)
- **Estimate**: ~27 snapshots × 30 runs/month = ~810 screenshots/month (well within free tier)

## Troubleshooting

### Build fails on Vercel

Check:
- `MOCK_API=true` environment variable is set
- Build logs for errors
- Node version is 24 (set in `package.json` engines)

### Percy snapshots fail

Check:
- `PERCY_TOKEN` is valid and not expired
- Base URL is accessible
- Pages load without errors (check browser console)

### Mock API not working

Check:
- `MOCK_API=true` in environment
- Middleware is redirecting to `/api/mock/*`
- Mock data exists in `src/lib/mockData.ts`

## Local Development with Mock Mode

```bash
# Start with mock API
npm run dev:mock

# Test in browser
open http://localhost:3000/submit
```

All API calls will return mock data - perfect for UI development without running the backend!

## Files Created

- `vercel.json` - Vercel deployment configuration
- `.env.production` - Production environment variables
- `.percy.yml` - Percy configuration
- `percy-snapshots.js` - Percy snapshot script
- `src/utils/mockData.ts` - Mock API responses
- `src/app/api/mock/[...path]/route.ts` - Mock API route handler
- `src/middleware.ts` - Updated to support mock mode
- `next.config.mjs` - Removed `output: standalone` for Vercel compatibility
- `package.json` - Added `dev:mock`, `percy`, and `percy:local` scripts

## Next Steps

1. Deploy to Vercel
2. Set up Percy project
3. Run initial snapshot baseline
4. Set up CI/CD (optional)
5. Test responsive fixes across all viewports
