import { expect, test } from '@playwright/test';

// Seed a single completed job directly into localStorage so the tests
// don't depend on actually running a pipeline job. useJobHistory reads
// from this key on mount, so by setting it before load we can exercise
// the UI without any backend state.
const STORAGE_KEY = 'pavi_job_history';

const TEST_JOB = {
    uuid: '11111111-2222-3333-4444-555555555555',
    status: 'completed' as const,
    submittedAt: '2026-01-01T00:00:00.000Z',
    title: 'Test seeded job',
    genes: ['TP53'],
    transcriptCount: 2,
};

async function seedHistory(page: import('@playwright/test').Page, entries: unknown[]) {
    // Must set before mount — do it on an about:blank first, then nav.
    await page.goto('');
    await page.evaluate(([key, data]) => {
        window.localStorage.setItem(key as string, JSON.stringify(data));
    }, [STORAGE_KEY, entries]);
    await page.goto('jobs');
}

test.describe('/jobs management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('');
        await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
    });

    test('seeded job appears in the table', async ({ page }) => {
        await seedHistory(page, [TEST_JOB]);
        // Full UUID shown as code (truncated to first 8 chars in the body).
        await expect(page.getByText('11111111...')).toBeVisible();
        await expect(page.getByText('TP53').first()).toBeVisible();
    });

    test('starred-only filter hides non-starred jobs', async ({ page }) => {
        await seedHistory(page, [
            { ...TEST_JOB, uuid: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', starred: true, title: 'Starred' },
            { ...TEST_JOB, uuid: '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', starred: false, title: 'Plain' },
        ]);

        // Both visible initially.
        await expect(page.getByText('11111111...')).toBeVisible();
        await expect(page.getByText('22222222...')).toBeVisible();

        await page.getByRole('button', { name: /Starred only/ }).click();

        await expect(page.getByText('11111111...')).toBeVisible();
        await expect(page.getByText('22222222...')).not.toBeVisible();
    });

    test('row expander surfaces tags editor and notes textarea', async ({ page }) => {
        await seedHistory(page, [TEST_JOB]);

        // PrimeReact row expander icon — click it to open the detail panel.
        // The button lives in the first column of the row.
        await page.locator('button.p-row-toggler').first().click();

        // Add-tag input appears.
        const tagInput = page.getByPlaceholder('Add tag…');
        await expect(tagInput).toBeVisible();
        await tagInput.fill('urgent');
        await tagInput.press('Enter');

        // Tag chip now visible (both in the expander and the Tags column).
        await expect(page.getByText('urgent').first()).toBeVisible();

        // Notes textarea
        const notes = page.getByPlaceholder(/Free-text notes/);
        await expect(notes).toBeVisible();
        await notes.fill('investigate R273H');
        await page.getByRole('button', { name: /^Save$/ }).click();

        // Verify both tag and notes landed in localStorage.
        const stored = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
        const parsed = JSON.parse(stored ?? '[]');
        expect(parsed[0].tags).toContain('urgent');
        expect(parsed[0].notes).toContain('investigate R273H');
    });

    test('tag filter appears after any tag exists and narrows the table', async ({ page }) => {
        await seedHistory(page, [
            { ...TEST_JOB, uuid: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', tags: ['urgent'] },
            { ...TEST_JOB, uuid: '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', tags: ['other'] },
            { ...TEST_JOB, uuid: '33333333-cccc-cccc-cccc-cccccccccccc' },  // no tags
        ]);

        await expect(page.getByText('11111111...')).toBeVisible();
        await expect(page.getByText('22222222...')).toBeVisible();
        await expect(page.getByText('33333333...')).toBeVisible();

        // Open the "Filter by tag" dropdown (PrimeReact Dropdown).
        await page.getByText('All Tags').click();
        await page.getByRole('option', { name: 'urgent' }).click();

        await expect(page.getByText('11111111...')).toBeVisible();
        await expect(page.getByText('22222222...')).not.toBeVisible();
        await expect(page.getByText('33333333...')).not.toBeVisible();
    });

    test('"Compare these two" button only shows for exactly 2 completed selections', async ({ page }) => {
        await seedHistory(page, [
            { ...TEST_JOB, uuid: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
            { ...TEST_JOB, uuid: '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
            { ...TEST_JOB, uuid: '33333333-cccc-cccc-cccc-cccccccccccc' },
        ]);

        const compareBtn = page.getByRole('button', { name: /Compare these two/ });
        await expect(compareBtn).not.toBeVisible();

        // Select the first row via its selection checkbox. PrimeReact
        // DataTable uses radio-group-like checkboxes in the row body.
        await page.locator('.p-datatable-tbody .p-checkbox-input').nth(0).click();
        await expect(compareBtn).not.toBeVisible();  // still 1 selected

        await page.locator('.p-datatable-tbody .p-checkbox-input').nth(1).click();
        await expect(compareBtn).toBeVisible();  // 2 selected

        await page.locator('.p-datatable-tbody .p-checkbox-input').nth(2).click();
        await expect(compareBtn).not.toBeVisible();  // 3 selected again
    });
});
