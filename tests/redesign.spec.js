const { test, expect } = require('@playwright/test');

async function open(page, language = 'en', theme = 'light') {
  if (!process.env.AB620_LIVE_ASSETS) await page.route(/^https:\/\//, route => route.abort());
  await page.addInitScript(({ language, theme }) => {
    localStorage.setItem('ab620-language', language);
    localStorage.setItem('ab620-theme', theme);
  }, { language, theme });
  await page.goto('/');
  await page.keyboard.press('Escape');
  if (process.env.AB620_LIVE_ASSETS) {
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('600 16px "Space Grotesk"'))).toBe(true);
    expect(await page.evaluate(() => document.fonts.check('400 16px "DM Sans"'))).toBe(true);
  }
}

test('practice workspace precedes the course path, labs and sources', async ({ page }) => {
  await open(page);
  expect(await page.locator('main > section').evaluateAll(nodes => nodes.map(n => n.className))).toEqual([
    'hero', 'dashboard', 'question-area', 'course-path', 'labs-section', 'sources-section',
  ]);
});

test('course summary counts come from the full runtime arrays, not filters or literals', async ({ page }) => {
  await open(page);
  for (const [id, count] of [['summary-question-count', 90], ['summary-lab-count', 20], ['summary-area-count', 3]]) {
    await expect(page.locator(`#${id}`)).toHaveText(String(count));
  }
  await page.locator('#search').fill('authentication');
  await page.locator('#lab-filter').selectOption('1');
  await expect(page.locator('#summary-question-count')).toHaveText('90');
  await expect(page.locator('#summary-lab-count')).toHaveText('20');
  // Change only the in-memory fixtures to prove updateProgress reads each array.
  await page.evaluate(() => { questions.push({ ...questions[0], id: 999 }); labs.push({ ...labs[0], id: 'lab-test' }); courseAreas.push({ ...courseAreas[0], id: 'area-test' }); updateProgress(); });
  await expect(page.locator('#summary-question-count')).toHaveText('91');
  await expect(page.locator('#summary-lab-count')).toHaveText('21');
  await expect(page.locator('#summary-area-count')).toHaveText('4');
});

for (const language of ['en', 'de']) {
  test(`native completion progress counts study answers, never accuracy or exam submissions (${language})`, async ({ page }) => {
    await open(page, language);
    const progress = page.locator('#progress-ring');
    await expect(page.locator('progress#progress-ring')).toHaveCount(1);
    await expect(progress).toHaveAccessibleName(language === 'en' ? 'Study completion' : 'Bearbeitungsfortschritt');
    await expect(progress).toHaveAttribute('max', '100');
    await expect(progress).toHaveAttribute('value', '0');
    await page.locator('[data-id="2"]').click();
    await page.getByRole('radio').nth(1).check(); // Deliberately wrong; still an answered study question.
    await expect(page.locator('#completed-count')).toHaveText('1');
    await expect(page.locator('#total-count')).toHaveText('90');
    await expect(progress).toHaveAttribute('value', '1');
    await expect(progress).toHaveAttribute('aria-valuenow', '1');
    await expect(page.locator('#progress-percent')).toHaveText('1%');
    await expect(page.locator('.hero-stat')).not.toContainText(/mastery|accuracy/i);
    await page.reload();
    await page.keyboard.press('Escape');
    await expect(progress).toHaveAttribute('value', '1');
    await page.locator('[data-mode="exam"]').click();
    await page.evaluate(() => { state.examIds = questions.slice(0, 20).map(q => q.id); state.index = 0; render(); });
    await page.getByRole('radio').first().check();
    await page.locator('#question-list button').last().click();
    await page.locator('#next').click();
    await expect(progress).toHaveAttribute('value', '1');
    await expect(page.locator('#completed-count')).toHaveText('1');
    page.on('dialog', dialog => dialog.accept());
    await page.locator('#reset-progress').click();
    await expect(progress).toHaveAttribute('value', '0');
  });

  for (const exit of ['finish', 'abort']) test(`labs and source navigation stay unavailable during exams until ${exit} (${language})`, async ({ page }) => {
    await open(page, language);
    const hints = page.locator('.top-nav a[href="#labs"], .top-nav a[href="#sources"], .hero-stat a');
    await expect(page.locator('.top-nav a[href="#labs"]')).toBeVisible();
    await page.locator('[data-mode="exam"]').click();
    for (const hint of await hints.all()) await expect(hint).toBeHidden();
    if (exit === 'finish') {
      await page.locator('#question-list button').last().click();
      await page.locator('#next').click();
    } else {
      page.on('dialog', dialog => dialog.accept());
      await page.locator('[data-mode="learn"]').click();
    }
    for (const hint of await hints.all()) await expect(hint).toBeVisible();
  });
}

for (const language of ['en', 'de']) for (const theme of ['light', 'dark', 'contrast', 'auto']) for (const width of [320, 560, 561, 740, 900, 1440]) {
  test(`redesign layout ${language} ${theme} ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page, language, theme);
    for (const href of ['learn', 'exam', 'labs', 'sources']) {
      const link = page.locator(`.top-nav a[href="#${href}"]`);
      await expect(link).toBeVisible();
      await link.focus();
      await expect(link).toBeFocused();
    }
    await expect(page.locator('#hero-title')).toHaveText(language === 'en' ? 'Prepare for AB-620' : 'Bereite dich auf AB-620 vor');
    const metrics = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect();
      const css = selector => getComputedStyle(document.querySelector(selector));
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        clipped: [...document.querySelectorAll('.topbar a, .topbar select, .hero-stat, .mode-card, .mode-link, .question-card, .lab-card')].some(el => {
          const r = el.getBoundingClientRect();
          return r.left < 0 || r.right > innerWidth || el.scrollWidth > el.clientWidth + 1;
        }),
        heroHeight: rect('.hero').height,
        heroFont: parseFloat(css('#hero-title').fontSize),
        questionFont: parseFloat(css('#question-prompt').fontSize),
        answerFont: parseFloat(css('.option-copy').fontSize),
        headingFamilies: [...document.querySelectorAll('h1, h2, h3, h4, .section-caption')].map(el => getComputedStyle(el).fontFamily),
        progress: { width: rect('#progress-ring').width, height: rect('#progress-ring').height },
        modeFlow: [...document.querySelectorAll('.mode-card')].every(el => {
          const p = el.querySelector('p').getBoundingClientRect(), cta = el.querySelector('.mode-link').getBoundingClientRect();
          return cta.top >= p.bottom && getComputedStyle(el.querySelector('.mode-link')).position === 'static';
        }),
        modeHeight: Math.max(...[...document.querySelectorAll('.mode-card')].map(el => el.getBoundingClientRect().height)),
        summaryWordsFit: [...document.querySelectorAll('.summary-counts dt')].every(el => {
          const canvas = document.createElement('canvas').getContext('2d');
          canvas.font = getComputedStyle(el).font;
          return el.textContent.split(/\s+/).every(word => canvas.measureText(word).width <= el.clientWidth);
        }),
        summaryNumbersAligned: [...document.querySelectorAll('.summary-counts div')].every((el, i, nodes) =>
          i === 0 || Math.abs(el.getBoundingClientRect().top - nodes[i - 1].getBoundingClientRect().top) > 1 ||
          Math.abs(el.querySelector('dd').getBoundingClientRect().top - nodes[i - 1].querySelector('dd').getBoundingClientRect().top) < 1),
        questionTop: rect('#exam').top + scrollY,
        labColumns: css('.labs-grid').gridTemplateColumns.split(' ').length,
        questionColumns: css('.question-layout').gridTemplateColumns.split(' ').length,
        shadow: css('.question-card').boxShadow,
      };
    });
    expect(metrics.overflow).toBe(false);
    expect(metrics.clipped).toBe(false);
    expect(metrics.headingFamilies.every(font => !/Georgia|Times|(?:^|,\s*)serif(?:,|$)/i.test(font))).toBe(true);
    expect(metrics.heroFont).toBeLessThanOrEqual(48);
    expect(metrics.questionFont).toBeLessThanOrEqual(26);
    expect(metrics.answerFont).toBeGreaterThanOrEqual(16);
    expect(metrics.progress.width).toBeGreaterThan(metrics.progress.height * 5);
    expect(metrics.modeFlow).toBe(true);
    expect(metrics.summaryWordsFit).toBe(true);
    expect(metrics.summaryNumbersAligned).toBe(true);
    if (width === 1440) {
      expect(metrics.heroHeight).toBeLessThanOrEqual(360);
      expect(metrics.modeHeight).toBeLessThanOrEqual(250);
      expect(metrics.questionTop).toBeLessThan(900);
    }
    if (width >= 561 && width <= 900) { expect(metrics.labColumns).toBe(2); expect(metrics.questionColumns).toBe(2); }
    if (width <= 560) { expect(metrics.labColumns).toBe(1); expect(metrics.questionColumns).toBe(1); }
    if (theme === 'contrast') expect(metrics.shadow).toBe('none');
    if ([320, 1440].includes(width)) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath('redesign.png') });
    }
  });
}
