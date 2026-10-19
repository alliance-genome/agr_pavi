#!/usr/bin/env node
// Live-backend smoke / checklist walker.
//
// Unlike `./e2e/*.spec.ts` (which run against the mocked webServer in
// `playwright.config.ts`), this script drives the REAL dev stack: the
// webui on $BASE (default localhost:3001) which proxies /api/* to the
// real fastapi dev backend on localhost:8001.
//
// It covers the slices that depend on live backend behaviour and can't
// run against the mock API:
//   - /result Conservation metric dropdown (entropy option)
//   - /result Alignment image (SVG) download
//   - /result Protein Domains panel (hits InterPro via Alliance mapping)
//   - /jobs Import file → row appears
//   - /result Share → /shared/<token> round-trip
//   - /submit-ortholog checkbox direct click (the regression fix)
//   - /admin Usage Stats tab (Latency + Disk usage)
//
// Prereqs:
//   - Dev stack running: API on 8001, webui on 3001
//   - At least one completed local-pipeline job in /tmp/pavi-dev/results/
//   - `npx playwright install chromium` and the system libs installed
//     (atk, cups-libs, libdrm, libxkbcommon, libX*, mesa-libgbm, pango,
//     alsa-lib, nspr, nss on Amazon Linux 2023)
//
// Usage:
//   node scripts/live-checklist.mjs
//   PAVI_BASE=http://localhost:3002 node scripts/live-checklist.mjs
//   PAVI_RESULTS_DIR=/tmp/pavi/results node scripts/live-checklist.mjs

import { chromium } from '@playwright/test';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.env.PAVI_BASE ?? 'http://localhost:3001').replace(/\/$/, '');
const RESULTS_DIR = process.env.PAVI_RESULTS_DIR ?? '/tmp/pavi-dev/results';

// List UUID subdirectories that contain a job.db. Reading the dir
// directly (no shell) avoids any command-injection surface from the
// env-provided RESULTS_DIR.
function listJobUuids() {
    if (!existsSync(RESULTS_DIR)) return [];
    return readdirSync(RESULTS_DIR).filter((name) => {
        try {
            return statSync(join(RESULTS_DIR, name)).isDirectory()
                && existsSync(join(RESULTS_DIR, name, 'job.db'));
        } catch {
            return false;
        }
    });
}

const uuids = listJobUuids();
const UUID = uuids[0] ?? null;
const UUID2 = uuids[1] ?? null;
if (!UUID) {
    console.error(`No job.db under ${RESULTS_DIR}. Run a job first.`);
    process.exit(2);
}

const results = [];
function record(name, pass, detail = '') {
    results.push({ name, pass, detail });
    console.log(`  ${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ' — ' + detail : ''}`);
}

// Each section is wrapped so a single failure doesn't abort the rest.
async function section(label, fn) {
    console.log(`\n[${label}]`);
    try {
        await fn();
    } catch (e) {
        record(`${label} — section crashed`, false, (e.message || String(e)).slice(0, 180));
    }
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const consoleErrs = [];
page.on('pageerror', (e) => consoleErrs.push(e.message));
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrs.push(msg.text()); });

try {
    await section('/result conservation metric dropdown', async () => {
        await page.goto(`${BASE}/result?uuid=${UUID}`);
        await page.waitForLoadState('networkidle', { timeout: 30_000 });
        const consLabel = page.locator('label', { hasText: 'Conservation' }).first();
        await consLabel.scrollIntoViewIfNeeded();
        await consLabel.getByRole('checkbox').check();
        const metric = page.locator('select[aria-label="Conservation metric"]');
        await metric.waitFor({ timeout: 5_000 });
        record('Conservation toggle shows metric dropdown', true);
        await metric.selectOption('entropy');
        const sel = await metric.inputValue();
        record('Metric switches to entropy', sel === 'entropy', `value=${sel}`);
    });

    await section('/result SVG export', async () => {
        const exportBtn = page.getByRole('button', { name: /^Export/ }).first();
        await exportBtn.click();
        const svgItem = page.getByText('Alignment image (SVG)');
        await svgItem.waitFor({ timeout: 5_000 });
        record('Download menu has "Alignment image (SVG)"', true);
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            svgItem.click(),
        ]);
        const dlName = download.suggestedFilename();
        record('SVG download fires', dlName.endsWith('.svg'), `filename=${dlName}`);
    });

    await section('/result protein domains', async () => {
        await page.goto(`${BASE}/result?uuid=${UUID}`);
        await page.waitForLoadState('networkidle', { timeout: 30_000 });
        const domLabel = page.locator('label', { hasText: 'Protein Domains' }).first();
        await domLabel.scrollIntoViewIfNeeded();
        await domLabel.getByRole('checkbox').check();
        // Panel header can be below the fold; wait for attached (DOM-only),
        // then scroll to it before asserting.
        const header = page.getByText('Protein Domains (InterPro)').first();
        await header.waitFor({ state: 'attached', timeout: 10_000 });
        await header.scrollIntoViewIfNeeded();
        record('Protein Domains panel renders header', true);
        // Any sequence status row (ok, no-uniprot, no-gene-id, error) attached.
        const statusRow = page.getByText(/UniProt \w|no UniProt mapping|no gene id/).first();
        try {
            await statusRow.waitFor({ state: 'attached', timeout: 15_000 });
            const txt = (await statusRow.textContent()) ?? '';
            record('Panel shows per-sequence status', true, txt.slice(0, 60));
        } catch {
            record('Panel shows per-sequence status', false);
        }
    });

    await section('/jobs Import file', async () => {
        await page.goto(`${BASE}/jobs`);
        await page.waitForLoadState('networkidle');
        const importBtn = page.getByRole('button', { name: /Import file/ });
        record('Import file button present', await importBtn.isVisible());
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            importBtn.click(),
        ]);
        await fileChooser.setFiles(`${RESULTS_DIR}/${UUID}/job.db`);
        const banner = page.getByText(/Imported .* as /);
        try {
            await banner.waitFor({ timeout: 15_000 });
            const txt = await banner.textContent();
            record('Import success banner appears', true, (txt || '').slice(0, 60));
        } catch {
            record('Import success banner appears', false);
        }
    });

    await section('/result share token round-trip', async () => {
        await page.goto(`${BASE}/result?uuid=${UUID}`);
        await page.waitForLoadState('networkidle', { timeout: 30_000 });
        // Capture whatever handleShare copies to clipboard. Stubbed
        // navigator.clipboard.writeText records the argument instead of
        // trying to touch a non-existent system clipboard in headless mode.
        await page.evaluate(() => {
            window.__copied = null;
            Object.defineProperty(navigator, 'clipboard', { value: {
                writeText: async (t) => { window.__copied = t; },
            }, configurable: true });
        });
        page.on('dialog', (d) => d.accept());
        // ResultsSummary is wrapped in a <details> that starts CLOSED.
        // The share button is in the DOM but inside a collapsed region;
        // clicks don't actuate until details.open=true.
        await page.locator('details').first().evaluate(d => d.open = true);
        const shareBtn = page.locator('button:has(.pi-share-alt)').first();
        try {
            await shareBtn.waitFor({ state: 'attached', timeout: 10_000 });
            await shareBtn.scrollIntoViewIfNeeded();
        } catch {
            record('Share button present on /result', false, 'icon button not found');
            return;
        }
        // Force past the actionability check — hover overlays sometimes
        // intercept the pointer transiently as the summary rerenders.
        await shareBtn.click({ force: true, timeout: 10_000 });
        // handleShare is async (POST → json → clipboard → alert). Poll
        // for the stub's capture rather than relying on alert timing.
        for (let i = 0; i < 25; i++) {
            const c = await page.evaluate(() => window.__copied);
            if (c) break;
            await page.waitForTimeout(400);
        }
        const copied = await page.evaluate(() => window.__copied);
        const looksLikeToken = typeof copied === 'string' && /\/shared\/[A-Za-z0-9_-]{20,}$/.test(copied);
        record('Share button mints a /shared/<token> URL', looksLikeToken, copied || '(nothing copied)');
        if (looksLikeToken) {
            // Private-window simulation: fresh context has no cookies / storage.
            const ctx2 = await browser.newContext();
            const page2 = await ctx2.newPage();
            const resp = await page2.goto(copied);
            const status = resp?.status() ?? 0;
            const bodyHasBreadcrumb = (await page2.content()).includes('Shared Result');
            record('/shared/<token> loads with "Shared Result" breadcrumb', status === 200 && bodyHasBreadcrumb);
            await ctx2.close();
        }
    });

    await section('/submit-ortholog checkbox direct click', async () => {
        await page.goto(`${BASE}/submit-ortholog`);
        await page.waitForLoadState('networkidle', { timeout: 10_000 });
        const search = page.getByRole('combobox').first();
        const hasSearch = await search.isVisible().catch(() => false);
        if (!hasSearch) { record('Gene search field present', false); return; }
        await search.fill('TP53');
        await page.waitForTimeout(3000);
        const firstOpt = page.getByRole('option').first();
        const anyOpt = await firstOpt.isVisible().catch(() => false);
        if (!anyOpt) { record('TP53 gene suggestion appears', false); return; }
        await firstOpt.click();
        await page.getByText('Stringency:', { exact: false }).waitFor({ timeout: 20_000 });
        record('Stringency selector appears after gene load', true);
        // PrimeReact Checkbox: .p-highlight is on the OUTER .p-checkbox
        // (not .p-checkbox-box). Give the list a moment to settle its
        // default selections before snapshotting.
        await page.waitForTimeout(2000);
        const beforeCount = await page.locator('.p-checkbox.p-highlight').count();
        // nth(1) because index 0 is the source-gene toggle.
        const firstBox = page.locator('.p-checkbox-box').nth(1);
        await firstBox.waitFor({ timeout: 10_000 });
        await firstBox.scrollIntoViewIfNeeded();
        await firstBox.click({ force: true });
        await page.waitForTimeout(500);
        const afterCount = await page.locator('.p-checkbox.p-highlight').count();
        record('Checkbox direct-click changes state (not just label)',
            Math.abs(afterCount - beforeCount) === 1,
            `before=${beforeCount} after=${afterCount}`);
    });

    await section('/admin Usage Stats tab', async () => {
        await page.goto(`${BASE}/admin`);
        const pwInput = page.locator('input[type="password"]').first();
        await pwInput.waitFor({ timeout: 5_000 });
        await pwInput.fill(process.env.PAVI_ADMIN_PASSWORD ?? 'pavi-admin-2025');
        await page.getByRole('button', { name: /Login/ }).click();
        await page.getByRole('tab', { name: /Usage Stats/ }).click();
        await page.getByText('Latency').first().waitFor({ timeout: 10_000 });
        record('Usage Stats tab opens; Latency card renders', true);
        await page.getByText(/Disk usage/).waitFor({ timeout: 5_000 });
        record('Disk usage card renders', true);
        const todayVal = await page.locator('text=Today').first().locator('..').textContent();
        record('Totals cards show numbers', /\d/.test(todayVal ?? ''), (todayVal ?? '').slice(0, 40));
    });

} finally {
    await browser.close();
    console.log('\n============================================');
    console.log(`=  Live checklist: ${results.filter(r => r.pass).length}/${results.length} PASS`);
    console.log('============================================');
    const failures = results.filter(r => !r.pass);
    if (failures.length > 0) {
        console.log('Failures:');
        for (const f of failures) console.log(`  - ${f.name}${f.detail ? ' — ' + f.detail : ''}`);
    }
    if (consoleErrs.length > 0) {
        console.log(`\n${consoleErrs.length} console/page errors captured during run:`);
        for (const e of consoleErrs.slice(0, 10)) console.log(`  ${e.slice(0, 200)}`);
    }
    process.exit(failures.length > 0 ? 1 : 0);
}
