const { test, expect } = require('@playwright/test');

test('answer rerender preserves focus without moving the next pointer target on blur', async ({ page }) => {
  await page.route(/^https:\/\//, route => route.abort());
  await page.clock.install();
  await page.goto('/');
  await page.keyboard.press('Escape');
  await page.locator('[data-id="2"]').click();
  await page.getByRole('radio').nth(1).check();
  await expect(page.getByRole('radio').nth(1)).toBeFocused();
  await expect(page.locator('.explanation strong')).toHaveText('Correct answer: C');

  const destination = page.locator('[data-id="57"]');
  await destination.scrollIntoViewIfNeeded();
  const box = await destination.boundingBox();
  const scrollBefore = await page.evaluate(() => scrollY);
  expect(scrollBefore).toBeGreaterThan(0);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // Blurring the restored radio must not move the page before pointer release.
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  await page.mouse.up();
  await expect(destination).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('checkbox')).toHaveCount(4);
  await expect(page.locator('#question-prompt')).toBeFocused();
});
