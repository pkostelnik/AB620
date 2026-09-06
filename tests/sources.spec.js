const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\//, route => route.abort());
  await page.goto('/');
  await page.keyboard.press('Escape');
});

test('question origin and verification links are distinct and partial evidence is honest in both locales', async ({ page }) => {
  for (const language of ['en', 'de']) {
    await page.locator('#language-select').selectOption(language);
    await page.locator('[data-id="82"]').click();
    await expect(page.locator('.source-row a')).toHaveAttribute('href', /\/lab-13-use-azure-search-evidence/);
    await page.getByRole('radio').nth(2).check();
    await expect(page.locator('.explanation a').first()).toHaveAttribute('href', /^https:\/\/learn\.microsoft\.com\//);
    await expect(page.locator('.explanation')).toContainText(language === 'en' ? 'Partially supported' : 'Teilweise belegt');
    await expect(page.locator('.explanation')).toContainText('conflict');
  }
});

test('lab modal exposes exact resources and reverse question navigation clears filters and focuses prompt', async ({ page }) => {
  await page.locator('#language-select').selectOption('de');
  await page.locator('#search').fill('Administratorkonto');
  await page.locator('.lab-open[data-lab="lab-06"]').click();
  await expect(page.locator('#modal-content')).toContainText('Ressourcen');
  await expect(page.locator('#modal-content a[href$="/adaptive-card.json"]')).toBeVisible();
  await page.locator('#modal-content [data-question="64"]').click();
  await expect(page.locator('#legal-modal')).toBeHidden();
  await expect(page.locator('#search')).toHaveValue('');
  await expect(page.locator('#topic-filter')).toHaveValue('all');
  await expect(page.locator('#question-prompt')).toBeFocused();
  await expect(page.locator('[data-id="64"]')).toHaveAttribute('aria-current', 'true');
});

test('active exams expose no source/resource/reverse-navigation hints, including direct modal calls', async ({ page }) => {
  await page.locator('[data-mode="exam"]').click();
  await expect(page.locator('#question-card a, #question-card .related-lab')).toHaveCount(0);
  await page.evaluate(() => openLab('lab-06'));
  await expect(page.locator('#legal-modal')).toBeHidden();
  await expect(page.locator('[data-question]:visible')).toHaveCount(0);
});

test('privacy names four keys, volatile exams, retained preferences and automatic external requests', async ({ page }) => {
  await page.locator('[data-legal="privacy"]').click();
  const content = page.locator('#modal-content');
  for (const key of ['ab620-answers', 'ab620-lab-progress', 'ab620-language', 'ab620-theme']) await expect(content).toContainText(key);
  for (const text of ['memory', 'reload', 'keeps', 'Google Fonts', 'Microsoft badge', 'automatically', 'IP address']) await expect(content).toContainText(text);
  await expect(content).toContainText('[Operator name or entity placeholder]');
});

for (const language of ['en', 'de']) test(`source feedback and resource dialogs fit a narrow viewport (${language})`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.locator('#language-select').selectOption(language);
  await page.locator('[data-id="89"]').click();
  await page.getByRole('radio').nth(1).check();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: test.info().outputPath('source-feedback.png') });
  await page.locator('.lab-open[data-lab="lab-15"]').click();
  await expect(page.locator('#modal-content a[href$="/contoso-test-set.csv"]')).toBeVisible();
  await expect(page.locator('#modal-content a[href$="/contoso-test-design.csv"]')).toBeVisible();
  expect(await page.locator('.modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('resources.png') });
});

test('every insight card and dialog shows its dated unreviewed limitation in both locales', async ({ page }) => {
  for (const language of ['en', 'de']) {
    await page.locator('#language-select').selectOption(language);
    const status = language === 'en' ? 'Not individually reviewed as of 2026-09-06' : 'Stand 2026-09-06: nicht einzeln geprüft';
    await expect(page.locator('.insight-status')).toHaveText(Array(5).fill(status));
    for (const opener of await page.locator('.insight-open').all()) {
      await opener.click();
      await expect(page.locator('#modal-content')).toContainText(status);
      await page.keyboard.press('Escape');
    }
  }
});
