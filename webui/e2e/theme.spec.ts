import { expect, test } from '@playwright/test';

test.describe('dark mode', () => {
    test('theme toggle cycles Auto → Light → Dark and persists', async ({ page }) => {
        await page.goto('');

        // Start fresh: no persisted theme → the no-flash inline script
        // should leave data-theme unset so prefers-color-scheme applies.
        await page.evaluate(() => window.localStorage.removeItem('pavi_theme'));
        await page.reload();

        const toggle = page.getByRole('button', { name: /^Theme:/ });
        await expect(toggle).toBeVisible();

        // Cycle 1: Auto (current) → Light
        await toggle.click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        expect(await page.evaluate(() => window.localStorage.getItem('pavi_theme'))).toBe('light');

        // Cycle 2: Light → Dark
        await toggle.click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        expect(await page.evaluate(() => window.localStorage.getItem('pavi_theme'))).toBe('dark');

        // Cycle 3: Dark → Auto — data-theme resolves to the OS preference.
        // useTheme() deliberately keeps the attribute set to the resolved value
        // ('light' or 'dark') in Auto mode so CSS rules keyed off [data-theme="dark"]
        // keep firing; the user's choice is tracked separately on data-theme-mode.
        await toggle.click();
        await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'auto');
        const autoResolved = await page.locator('html').getAttribute('data-theme');
        expect(autoResolved).toMatch(/^(light|dark)$/);
        expect(await page.evaluate(() => window.localStorage.getItem('pavi_theme'))).toBe('auto');
    });

    test('dark mode survives a page reload with no flash', async ({ page }) => {
        await page.goto('');
        await page.evaluate(() => window.localStorage.setItem('pavi_theme', 'dark'));

        // Freshly load — the inline bootstrap script should apply dark
        // BEFORE React hydrates, so the first observable state is already dark.
        await page.reload();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

        // The toggle button should also now reflect 'Dark' as its state label.
        await expect(page.getByRole('button', { name: /Theme: Dark/ })).toBeVisible();
    });

    test('dark mode changes body background colour', async ({ page }) => {
        await page.goto('');

        // Light mode baseline
        await page.evaluate(() => window.localStorage.setItem('pavi_theme', 'light'));
        await page.reload();
        const lightBg = await page.evaluate(() =>
            getComputedStyle(document.body).backgroundColor
        );

        // Dark mode
        await page.evaluate(() => window.localStorage.setItem('pavi_theme', 'dark'));
        await page.reload();
        const darkBg = await page.evaluate(() =>
            getComputedStyle(document.body).backgroundColor
        );

        // Both should be defined, and they should differ.
        expect(lightBg).toBeTruthy();
        expect(darkBg).toBeTruthy();
        expect(lightBg).not.toBe(darkBg);
    });
});
