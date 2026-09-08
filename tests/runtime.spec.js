const { test, expect } = require('@playwright/test');

async function open(page, stored = {}) {
  if (!process.env.AB620_LIVE_ASSETS) await page.route(/^https:\/\//, route => route.abort());
  await page.addInitScript(values => {
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  }, stored);
  await page.goto('/');
  await page.keyboard.press('Escape');
}

async function question(page, id) {
  await page.locator(`#question-list [data-id="${id}"]`).click();
}

async function start(page) {
  await page.locator('[data-mode="exam"]').click();
}

test('exam is fresh, distinct, isolated from study and hides all question hints', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    localStorage.setItem('ab620-answers', JSON.stringify(Object.fromEntries(questions.map(q => [q.id, q.matches || q.answer]))));
  });
  await page.reload();
  await page.keyboard.press('Escape');
  const study = await page.evaluate(() => localStorage.getItem('ab620-answers'));
  await start(page);
  const ids = await page.locator('#question-list button').evaluateAll(nodes => nodes.map(n => n.dataset.id));
  expect(ids).toHaveLength(20);
  expect(new Set(ids).size).toBe(20);
  expect(ids).not.toEqual([...ids].sort((a, b) => a - b));
  await expect(page.locator('#question-card .explanation, #question-card .source-row, #question-card .related-lab, #question-card a')).toHaveCount(0);
  await expect(page.locator('#question-list .done')).toHaveCount(0);
  await expect(page.locator('#question-card input:checked')).toHaveCount(0);
  await expect(page.locator('#search')).toBeDisabled();
  await expect(page.locator('#topic-filter')).toBeDisabled();
  await expect(page.locator('#question-card h3')).toBeFocused();
  await expect(page.locator('#question-card h3')).toBeInViewport();
  await page.locator('#question-list button').last().click();
  await page.locator('#next').click();
  await expect(page.locator('#exam-status')).toContainText('0/20');
  expect(await page.evaluate(() => localStorage.getItem('ab620-answers'))).toBe(study);
  await expect(page.locator('#question-card .explanation')).toBeVisible();
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.locator('#exam-status')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('ab620-answers'))).toBe(study);
});

test('multi-select exam remains ungraded until finish and submission cannot be rewritten', async ({ page }) => {
  await open(page, { 'ab620-answers': '{"1":0}' });
  await start(page);
  // A controlled draw guarantees the multi-select and matching formats are exercised.
  await page.evaluate(() => { state.examIds = [57, 60, ...questions.filter(q => ![57, 60].includes(q.id)).slice(0, 18).map(q => q.id)]; state.index = 0; render(); });
  await page.locator('.option').nth(0).click();
  await expect(page.locator('.option.correct, .option.wrong, .explanation')).toHaveCount(0);
  await page.locator('.option').nth(2).click();
  await expect(page.locator('#question-card input:checked')).toHaveCount(2);
  await question(page, 60);
  for (const [index, value] of ['A', 'B', 'C', 'D'].entries()) await page.locator(`[data-match="${index}"]`).selectOption(value);
  await expect(page.locator('.explanation')).toHaveCount(0);
  await page.locator('#question-list button').last().click();
  await page.locator('#next').click();
  await expect(page.locator('#exam-status')).toContainText('2/20');
  await expect(page.locator('#question-card input').first()).toBeDisabled();
  const submitted = await page.evaluate(() => JSON.stringify(state.examAnswers));
  await page.locator('#question-card input').first().dispatchEvent('change');
  await question(page, 60);
  await expect(page.locator('[data-match="0"]')).toBeDisabled();
  await expect(page.locator('[data-match="0"]')).toHaveValue('A');
  await page.locator('[data-match="0"]').dispatchEvent('change');
  await page.evaluate(() => finishExam());
  expect(await page.evaluate(() => JSON.stringify(state.examAnswers))).toBe(submitted);
  await expect(page.locator('#exam-status')).toContainText('2/20');
  await page.locator('#question-list button').last().click();
  await expect(page.locator('#next')).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('ab620-answers'))).toBe('{"1":0}');
  await start(page);
  await expect(page.locator('#question-card input:checked')).toHaveCount(0);
  expect(await page.evaluate(() => state.examAnswers)).toEqual({});
});

test('expired deadline locks answers before accepting a late change', async ({ page }) => {
  await open(page);
  await start(page);
  await page.evaluate(() => { state.examIds[0] = 57; state.index = 0; render(); state.examEndsAt = Date.now() - 1; });
  // Deadline simulation, not a real 20-minute wall-clock wait.
  await page.locator('.option').first().click();
  await expect(page.locator('#exam-status')).toContainText('0/20');
  await expect(page.locator('#question-card input').first()).toBeDisabled();
  await page.evaluate(() => finishExam());
  await expect(page.locator('#exam-status')).toContainText('0/20');
});

test('timer completes an idle exam using the Playwright clock', async ({ page }) => {
  await page.clock.install();
  await open(page);
  await start(page);
  await page.clock.fastForward(20 * 60 * 1000 + 1000);
  await expect(page.locator('#exam-status')).toContainText('0/20');
  await expect(page.locator('#question-card input, #question-card select').first()).toBeDisabled();
});

for (const path of ['learn', 'review', 'exam', 'area', 'reset']) {
  test(`active exam requires confirmation before ${path}`, async ({ page }) => {
    await open(page);
    await start(page);
    const ids = await page.locator('#question-list').textContent();
    let prompts = 0;
    const dismiss = dialog => { prompts++; return dialog.dismiss(); };
    page.on('dialog', dismiss);
    const target = path === 'area' ? '[data-area]' : path === 'reset' ? '#reset-progress' : `[data-mode="${path}"]`;
    // Area controls are hidden during exams; still guard a stale activation.
    if (path === 'area') await page.locator(target).first().dispatchEvent('click');
    else await page.locator(target).first().click();
    expect(prompts).toBe(1);
    await expect(page.locator('#exam-status')).toBeVisible();
    expect(await page.locator('#question-list').textContent()).toBe(ids);
    page.off('dialog', dismiss);
    page.on('dialog', dialog => dialog.accept());
    if (path === 'area') await page.locator(target).first().dispatchEvent('click');
    else await page.locator(target).first().click();
    if (path !== 'exam') await expect(page.locator('#exam-status')).toBeHidden();
  });
}

test('Q60 uses zero-based values, restores saved and edited selects, and is solvable', async ({ page }) => {
  await open(page, { 'ab620-answers': '{"60":{"0":"A","1":"B"}}' });
  await question(page, 60);
  await expect(page.locator('[data-match="0"]')).toHaveValue('A');
  await expect(page.locator('[data-match="1"]')).toHaveValue('B');
  await page.locator('[data-match="2"]').focus();
  await page.locator('[data-match="2"]').selectOption('C');
  await expect(page.locator('[data-match="2"]')).toBeFocused();
  await page.locator('[data-match="3"]').selectOption('D');
  await expect(page.locator('.explanation strong')).toHaveText('correct');
  expect(await page.evaluate(() => questions.find(q => q.id === 60).matches)).toEqual({ 0: 'A', 1: 'B', 2: 'C', 3: 'D' });
  await question(page, 59);
  await question(page, 60);
  await expect(page.locator('[data-match="3"]')).toHaveValue('D');
});

test('Q60 edits survive reload and wrong-answer correction uses rows 1 through 4', async ({ page }) => {
  await open(page);
  await question(page, 60);
  await page.locator('[data-match="0"]').selectOption('D');
  await expect(page.locator('.explanation strong')).toHaveText('Correct answer: 1 → A, 2 → B, 3 → C, 4 → D');
  await page.reload();
  await page.keyboard.press('Escape');
  await question(page, 60);
  await expect(page.locator('[data-match="0"]')).toHaveValue('D');
});

test('repeat Finish is a no-op even after answer-change events', async ({ page }) => {
  await open(page);
  await start(page);
  await page.locator('#question-list button').last().click();
  await page.locator('#next').click();
  const initial = await page.locator('#exam-status').textContent();
  await page.locator('#question-card input, #question-card select').first().dispatchEvent('change');
  await page.locator('#question-list button').last().click();
  await page.locator('#next').dispatchEvent('click');
  await expect(page.locator('#exam-status')).toHaveText(initial);
  expect(await page.evaluate(() => Object.isFrozen(state.examAnswers))).toBe(true);
});

test('timer completion leaves an open legal modal focused and restores its opener', async ({ page }) => {
  await page.clock.install();
  await open(page);
  await start(page);
  await page.locator('[data-legal="privacy"]').click();
  await page.locator('.modal-close').focus();
  await page.clock.fastForward(20 * 60 * 1000 + 1000);
  await expect(page.locator('.modal-close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-legal="privacy"]')).toBeFocused();
  await expect(page.locator('#exam-status')).toContainText('0/20');
});

test('all-correct study review is empty rather than falling back to the bank', async ({ page }) => {
  await open(page);
  await page.evaluate(() => { state.answers = Object.fromEntries(questions.map(q => [q.id, q.matches || q.answer])); render(); });
  await page.locator('[data-mode="review"]').click();
  await expect(page.locator('#question-list button')).toHaveCount(0);
  await expect(page.locator('#question-card')).toContainText('No weak spots');
  await expect(page.locator('#question-number')).toHaveText('0');
  await expect(page.locator('#question-total')).toHaveText('0');
});

for (const invalid of ['{', 'null', '[]', '{"1":99,"57":[0,0],"60":{"9":"Z"}}']) {
  test(`invalid stored answers/labs recover safely: ${invalid}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await open(page, { 'ab620-answers': invalid, 'ab620-lab-progress': invalid, 'ab620-language': 'null', 'ab620-theme': 'bad' });
    await expect(page.locator('#question-list button')).toHaveCount(90);
    await expect(page.locator('#persistence-warning')).toBeVisible();
    await expect(page.locator('#completed-count')).toHaveText('0');
    await expect(page.locator('#theme-select')).toHaveValue('auto');
    await expect(page.locator('#language-select')).toHaveValue('en');
    expect(errors).toEqual([]);
    await page.locator('.option').first().click();
    await expect(page.locator('#completed-count')).toHaveText('1');
  });
}

for (const denied of ['getItem', 'setItem', 'property']) {
  test(`denied storage ${denied} keeps study/labs/preferences usable in memory`, async ({ page }) => {
    await page.addInitScript(method => {
      if (method === 'property') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } });
      else Storage.prototype[method] = () => { throw new DOMException('Denied', 'SecurityError'); };
    }, denied);
    await open(page);
    await expect(page.locator('#question-list button')).toHaveCount(90);
    await page.locator('.option').first().click();
    await expect(page.locator('#completed-count')).toHaveText('1');
    await page.locator('#theme-select').selectOption('dark');
    await page.locator('#language-select').selectOption('de');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('.lab-open').first().click();
    await page.locator('[data-lab-step="0"]').check();
    await page.keyboard.press('Escape');
    await expect(page.locator('.lab-card').first()).toContainText('25%');
    await expect(page.locator('#persistence-warning')).toBeVisible();
  });
}

test('reset clears study and labs but preserves language and theme', async ({ page }) => {
  await open(page);
  await page.locator('.option').first().click();
  await page.locator('.lab-open[data-lab="lab-09"]').click();
  await page.locator('[data-lab-step="0"]').check();
  await page.keyboard.press('Escape');
  await page.locator('#theme-select').selectOption('dark');
  await page.locator('#language-select').selectOption('de');
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#reset-progress').click();
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.locator('#completed-count')).toHaveText('0');
  await expect(page.locator('.lab-card').filter({ has: page.locator('[data-lab="lab-09"]') })).toContainText('0%');
  await page.locator('.lab-open[data-lab="lab-09"]').click();
  await expect(page.locator('[data-lab-step="0"]')).not.toBeChecked();
  await page.keyboard.press('Escape');
  await expect(page.locator('#theme-select')).toHaveValue('dark');
  await expect(page.locator('#language-select')).toHaveValue('de');
});

test('native radio/checkbox semantics preserve keyboard focus and state', async ({ page }) => {
  await open(page);
  const radio = page.getByRole('radio').first();
  await expect(radio).toHaveAccessibleName(/^A\s*Manual authentication/);
  await radio.focus();
  await page.keyboard.press('Space');
  await expect(radio).toBeFocused();
  await expect(radio).toBeChecked();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio').nth(1)).toBeChecked();
  await expect(page.getByRole('radio').nth(1)).toBeFocused();
  await question(page, 57);
  const checkbox = page.getByRole('checkbox').first();
  await expect(checkbox).toHaveAccessibleName(/^A\s*Use least-privilege/);
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeFocused();
  await expect(checkbox).toBeChecked();
  await page.keyboard.press('Space');
  await expect(checkbox).not.toBeChecked();
  await expect(page.locator('[aria-pressed], .option[tabindex]')).toHaveCount(0);
});

test('all modal types trap focus, inert background, Escape and restore rerendered lab opener', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveAttribute('inert', '');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.modal-actions button')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.modal-close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.app-shell')).not.toHaveAttribute('inert');
  await expect(page.locator('.brand')).toBeFocused();
  for (const opener of ['[data-legal="privacy"]', '.insight-open', '.lab-open']) {
    await page.locator(opener).first().click();
    await expect(page.locator('.app-shell')).toHaveAttribute('inert', '');
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('.modal-actions button')).toBeFocused();
    if (opener === '.lab-open') await page.locator('[data-lab-step="0"]').check();
    await page.keyboard.press('Escape');
    await expect(page.locator(opener).first()).toBeFocused();
  }
  await page.locator('.lab-inline-open').click();
  await page.locator('[data-lab-step="0"]').check();
  await page.keyboard.press('Escape');
  await expect(page.locator('.lab-inline-open')).toBeFocused();
});

test('search has a meaningful label and visible keyboard focus; reduced motion disables smooth scroll', async ({ page }) => {
  await open(page);
  await expect(page.locator('#search')).toHaveAccessibleName('Search concepts');
  await page.locator('#search').focus();
  await page.keyboard.press('a');
  await expect(page.locator('#search')).toBeFocused();
  expect(await page.locator('#search').evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).scrollBehavior)).toBe('auto');
  expect(await page.locator('.mode-card').first().evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
});

for (const theme of ['light', 'dark', 'contrast', 'auto']) {
  test(`answer and active-list contrast and readable font: ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page, { 'ab620-theme': theme });
    await page.locator('.option').first().click();
    const styles = await page.evaluate(() => {
      const contrast = (fg, bg) => {
        const luminance = rgb => rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
        const a = luminance(fg), b = luminance(bg);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      };
      const option = document.querySelector('.option.correct');
      const active = document.querySelector('.list-item.active');
      return {
        answer: contrast(getComputedStyle(option.querySelector('.option-copy')).color, getComputedStyle(option).backgroundColor),
        list: contrast(getComputedStyle(active.querySelector('span')).color, getComputedStyle(active).backgroundColor),
        font: parseFloat(getComputedStyle(option.querySelector('.option-copy')).fontSize),
      };
    });
    expect(styles.answer).toBeGreaterThanOrEqual(4.5);
    expect(styles.list).toBeGreaterThanOrEqual(4.5);
    expect(styles.font).toBeGreaterThanOrEqual(16);
  });
}

for (const language of ['en', 'de']) for (const width of [320, 375, 390, 560, 561, 740, 900, 1024, 1440]) {
  test(`layout ${language} ${width}px keeps controls visible without overflow`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, { 'ab620-language': language });
    if (process.env.AB620_LIVE_ASSETS) {
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.fonts.check('600 16px "Space Grotesk"'))).toBe(true);
    }
    await question(page, 60);
    const geometry = await page.evaluate(() => {
      const selectors = ['.brand', '#theme-select', '#language-select', '#reset-progress'];
      const number = document.querySelector('.list-item.active span');
      const range = document.createRange();
      range.selectNodeContents(number);
      const theme = document.querySelector('#theme-select');
      const canvas = document.createElement('canvas').getContext('2d');
      canvas.font = getComputedStyle(theme).font;
      return {
        width: document.documentElement.scrollWidth,
        numberLines: range.getClientRects().length,
        themeWidth: theme.clientWidth,
        themeTextWidth: canvas.measureText(theme.selectedOptions[0].textContent).width,
        header: selectors.map(s => { const r = document.querySelector(s).getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }),
        columns: getComputedStyle(document.querySelector('.labs-grid')).gridTemplateColumns.split(' ').length,
        questionColumns: getComputedStyle(document.querySelector('.question-layout')).gridTemplateColumns.split(' ').length,
        matchingColumns: getComputedStyle(document.querySelector('.matching-list label')).gridTemplateColumns.split(' ').length,
      };
    });
    expect(geometry.width).toBeLessThanOrEqual(width);
    expect(geometry.numberLines).toBe(1);
    expect(geometry.themeWidth).toBeGreaterThanOrEqual(geometry.themeTextWidth + 30);
    for (const rect of geometry.header) { expect(rect.left).toBeGreaterThanOrEqual(0); expect(rect.right).toBeLessThanOrEqual(width); }
    for (let i = 0; i < geometry.header.length; i++) for (let j = i + 1; j < geometry.header.length; j++) {
      const a = geometry.header[i], b = geometry.header[j];
      expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top).toBeTruthy();
    }
    if (width >= 561 && width <= 900) { expect(geometry.columns).toBe(2); expect(geometry.questionColumns).toBe(2); }
    if (width <= 560) expect(geometry.matchingColumns).toBe(1);
    if ([320, 740, 1440].includes(width)) {
      await page.screenshot({ path: testInfo.outputPath('question.png') });
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath('header.png') });
    }
  });
}
