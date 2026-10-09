import { expect, test } from '@playwright/test';

// UUID served by the mock API (src/utils/mockData.ts).
const MOCK_JOB_UUID = '123e4567-e89b-42d3-a456-426614174000';

test.describe('webUI smoke', () => {
    test('health endpoint returns 200 and is never cached', async ({ request, page }) => {
        const response = await request.get('health');
        // Load balancer health checks expect a plain 200.
        expect(response.status()).toBe(200);

        const cacheControl = (response.headers()['cache-control'] ?? '')
            .split(/\s*,\s*/);
        expect(cacheControl.some((flag) => flag === 'no-cache' || flag === 'no-store')).toBe(true);

        await page.goto('health');
        await expect(page.locator('#response-msg')).toContainText(
            'This the web application is healthy and ready to receive!',
        );
    });

    test('home page links to job submission', async ({ page }) => {
        await page.goto('');
        await expect(page).toHaveTitle(/PAVI/);
        await expect(
            page.getByRole('heading', { level: 1, name: 'Protein Annotation and Variant Inspector' }),
        ).toBeVisible();

        await page.getByRole('link', { name: 'Start New Analysis' }).click();
        await expect(page).toHaveURL(/\/submit$/);
        await expect(page.getByRole('heading', { level: 1, name: 'Submit New Job' })).toBeVisible();
    });

    test('help page renders', async ({ page }) => {
        await page.goto('help');
        await expect(page.getByRole('heading', { level: 1, name: 'Help Center' })).toBeVisible();
    });

    test('result page without a uuid redirects to submit', async ({ page }) => {
        await page.goto('result');
        await expect(page).toHaveURL(/\/submit$/);
    });

    test('result page renders the mock alignment', async ({ page }) => {
        await page.goto(`result?uuid=${MOCK_JOB_UUID}`);
        // Sequence names from the mock Clustal output.
        await expect(page.getByText('BRCA1_HUMAN').first()).toBeVisible();
        await expect(page.getByText('BRCA1_MOUSE').first()).toBeVisible();
    });

    test('mock API proxies job status through the /api rewrite', async ({ request }) => {
        const response = await request.get(`api/pipeline-job/${MOCK_JOB_UUID}`);
        expect(response.ok()).toBe(true);
        const body = await response.json();
        expect(body.uuid).toBe(MOCK_JOB_UUID);
    });
});
