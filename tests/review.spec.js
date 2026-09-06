const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\//, route => route.abort());
  await page.clock.install();
  await page.goto('/');
  await page.keyboard.press('Escape');
});

test('answer letters map accessible radio and checkbox labels to correction feedback', async ({ page }) => {
  for (const [id, role, correction] of [[2, 'radio', 'C'], [57, 'checkbox', 'A, C']]) {
    await page.locator(`#question-list [data-id="${id}"]`).click();
    for (const [index, letter] of ['A', 'B', 'C', 'D'].entries()) {
      await expect(page.getByRole(role).nth(index)).toHaveAccessibleName(new RegExp(`^${letter}\\s+\\S`));
    }
    await page.getByRole(role).nth(1).check();
    expect(await page.locator('.explanation').ariaSnapshot()).toContain(`Correct answer: ${correction}`);
    await expect(page.getByRole(role).nth(1)).toBeFocused();
  }
});

async function observeStatus(page) {
  await page.evaluate(() => {
    window.statusMutations = 0;
    new MutationObserver(records => { window.statusMutations += records.length; })
      .observe(document.querySelector('#exam-status'), { childList: true, characterData: true, subtree: true, attributes: true });
  });
}

test('stable exam minute has zero status mutations; minute change has one', async ({ page }) => {
  await page.locator('[data-mode="exam"]').click();
  await observeStatus(page);
  await page.clock.runFor(10000);
  expect(await page.evaluate(() => window.statusMutations)).toBe(0);
  await page.clock.runFor(51000);
  await expect(page.locator('#exam-status')).toContainText('19 min left');
  expect(await page.evaluate(() => window.statusMutations)).toBe(1);
});

test('finished result has zero redundant status mutations after ticks and rerenders', async ({ page }) => {
  await page.locator('[data-mode="exam"]').click();
  await page.locator('#question-list button').last().click();
  await observeStatus(page);
  await page.locator('#next').click();
  await expect(page.locator('#exam-status')).toContainText('Exam complete');
  expect(await page.evaluate(() => window.statusMutations)).toBe(1);
  await page.evaluate(() => { window.statusMutations = 0; });
  await page.clock.runFor(65000);
  await page.locator('#question-list button').last().click();
  await page.locator('#next').dispatchEvent('click');
  expect(await page.evaluate(() => window.statusMutations)).toBe(0);
  await page.locator('#language-select').selectOption('de');
  await expect(page.locator('#exam-status')).toContainText('Prüfung abgeschlossen');
  expect(await page.evaluate(() => window.statusMutations)).toBe(1);
});

for (const exit of ['finish', 'abort']) {
  test(`global hints and source navigation hidden until ${exit}`, async ({ page }) => {
    const hints = ['.course-path', '.labs-section', '.sources-section', '.top-nav a[href="#sources"]'];
    await page.locator('[data-mode="exam"]').click();
    for (const selector of hints) await expect(page.locator(selector)).toBeHidden();
    await expect(page.getByRole('button', { name: /Open lab brief/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Read insight/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Official exam study guide/ })).toHaveCount(0);
    await page.locator('#language-select').selectOption('de');
    for (const selector of hints) await expect(page.locator(selector)).toBeHidden();
    if (exit === 'finish') {
      await page.locator('#question-list button').last().click();
      await page.locator('#next').click();
    } else {
      page.on('dialog', dialog => dialog.accept());
      await page.locator('[data-mode="learn"]').click();
    }
    for (const selector of hints) await expect(page.locator(selector)).toBeVisible();
    await page.locator('.lab-open').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
}

test('active exam refuses lab and insight openers while legal modals remain accessible', async ({ page }) => {
  await page.locator('[data-mode="exam"]').click();
  for (const selector of ['.lab-open', '.insight-open']) {
    // Stale/programmatic activation must not bypass the hidden content policy.
    await page.locator(selector).first().dispatchEvent('click');
    await expect(page.getByRole('dialog')).toBeHidden();
  }
  await page.locator('[data-legal="disclaimer"]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-legal="disclaimer"]')).toBeFocused();
});

for (const language of ['en', 'de']) test(`single weak answer keeps feedback until Finish then completes (${language})`, async ({ page }) => {
  await page.evaluate(() => {
    state.answers = Object.fromEntries(questions.map(q => [q.id, q.matches || q.answer]));
    state.answers[2] = 1;
  });
  await page.locator('#language-select').selectOption(language);
  await page.locator('[data-mode="review"]').click();
  await expect(page.locator('#question-list button')).toHaveCount(1);
  await page.getByRole('radio').nth(2).check();
  await expect(page.locator('.explanation strong')).toHaveText(language === 'en' ? 'correct' : 'richtig');
  await expect(page.locator('#question-list button')).toHaveCount(1);
  await page.locator('#next').click();
  await expect(page.locator('#question-list button')).toHaveCount(0);
  await expect(page.locator('#question-card')).toContainText(language === 'en' ? 'No weak spots' : 'Keine Schwachstellen');
  await expect(page.locator('#question-number')).toHaveText('0');
  await expect(page.locator('#question-total')).toHaveText('0');
  await expect(page.locator('#question-title')).toBeFocused();
  await expect(page.locator('#next')).toHaveCount(0);
});

test('review Finish retains wrong and unanswered questions but removes corrected ones', async ({ page }) => {
  await page.evaluate(() => {
    state.answers = Object.fromEntries(questions.map(q => [q.id, q.matches || q.answer]));
    state.answers[1] = (questions[0].answer + 1) % questions[0].options.length;
    delete state.answers[2];
    state.answers[3] = (questions[2].answer + 1) % questions[2].options.length;
  });
  await page.locator('[data-mode="review"]').click();
  await expect(page.locator('#question-list button')).toHaveCount(3);
  await page.locator('#question-list button').last().click();
  const answer = await page.evaluate(() => questions[2].answer);
  await page.getByRole('radio').nth(answer).check();
  await expect(page.locator('.explanation strong')).toHaveText('correct');
  await page.locator('#next').click();
  await expect(page.locator('#question-list button')).toHaveCount(2);
  expect(await page.locator('#question-list button').evaluateAll(nodes => nodes.map(n => n.dataset.id))).toEqual(['1', '2']);
  await expect(page.locator('[data-id="1"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('.explanation strong')).toContainText('Correct answer');
  await expect(page.locator('#question-prompt')).toBeFocused();
});

for (const language of ['en', 'de']) test(`Learn last action returns to first filtered question without clearing answers (${language})`, async ({ page }) => {
  await page.locator('#language-select').selectOption(language);
  await page.locator('[data-mode="learn"]').click();
  const first = await page.locator('#question-list button').first().getAttribute('data-id');
  await page.locator('#question-list button').last().click();
  await page.getByRole('radio').first().check();
  const saved = await page.evaluate(() => localStorage.getItem('ab620-answers'));
  await expect(page.locator('#next')).toHaveText(language === 'en' ? 'Back to first question' : 'Zur ersten Frage');
  await page.locator('#next').click();
  await expect(page.locator(`[data-id="${first}"]`)).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#question-number')).toHaveText('1');
  await expect(page.locator('#question-prompt')).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('ab620-answers'))).toBe(saved);
});
