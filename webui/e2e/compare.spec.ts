import { expect, test } from '@playwright/test';

test.describe('/compare routing', () => {
    test('missing uuids redirect to /jobs with an error flag', async ({ page }) => {
        await page.goto('compare');
        await expect(page).toHaveURL(/\/jobs\?error=compare-missing-uuid/);
    });

    test('non-uuid params 404', async ({ page }) => {
        const response = await page.goto('compare?a=not-a-uuid&b=also-garbage');
        expect(response?.status()).toBe(404);
    });

    test('identical uuids redirect to the single-job /result view', async ({ page }) => {
        const u = '11111111-2222-3333-4444-555555555555';
        await page.goto(`compare?a=${u}&b=${u}`);
        await expect(page).toHaveURL(new RegExp(`/result\\?uuid=${u}`));
    });

    test('two distinct uuids render the comparison page shell', async ({ page }) => {
        const a = '11111111-2222-3333-4444-555555555555';
        const b = '66666666-7777-8888-9999-aaaaaaaaaaaa';
        await page.goto(`compare?a=${a}&b=${b}`);
        await expect(page.getByRole('heading', { name: 'Compare Alignments' })).toBeVisible();
        // Both side labels present (SIDE A / SIDE B).
        await expect(page.getByText('SIDE A')).toBeVisible();
        await expect(page.getByText('SIDE B')).toBeVisible();
    });
});
