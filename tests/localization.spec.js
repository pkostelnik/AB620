const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\//, route => route.abort());
  await page.goto('/');
  await page.keyboard.press('Escape');
});

test('locale catalog covers every content field and preserves identity, answers and provenance', async ({ page }) => {
  expect(await page.evaluate(() => typeof localeData)).toBe('object');
  const issues = await page.evaluate(() => {
    const errors = [];
    const check = (ok, label) => { if (!ok) errors.push(label); };
    check(Object.keys(localeData.de.questions).length === 90, '90 questions');
    check(Object.keys(localeData.de.labs).length === 20, '20 labs');
    check(Object.keys(localeData.de.areas).length === 3, '3 areas');
    check(Object.keys(localeData.de.outcomes).length === 6, '6 outcomes');
    for (const language of ['en', 'de']) {
      check(Object.keys(localeData[language].insights).length === 5, `${language}: 5 insights`);
      for (const key of Object.keys(uiText.en)) check(typeof uiText[language][key] === 'string' && uiText[language][key].length > 0, `${language}: UI ${key}`);
    }
    for (const item of questions) {
      const entry = localeData.de.questions[item.id];
      for (const field of ['question', 'explanation']) check(typeof entry?.[field] === 'string' && entry[field] !== item[field] && entry[field].length > 20, `Q${item.id}: ${field}`);
      check(entry?.options?.length === item.options.length, `Q${item.id}: options`);
      const unchangedOptions = ['Fabric Data Agent.', 'MCP to GraphQL.', 'MCP zu GraphQL.', 'Azure AI Search', '3. MCP', '4. A2A', 'FTP.', 'complete', 'insufficientEvidence', 'conflict', 'success'];
      entry?.options?.forEach((option, index) => check(option.length > 0 && (option !== item.options[index] || unchangedOptions.includes(option)), `Q${item.id}: option ${index}`));
      if (item.matchLabels) check(entry?.matchLabels?.length === item.matchLabels.length && entry.matchLabels.every((label, i) => label[0] === item.matchLabels[i][0] && label !== item.matchLabels[i]), 'matching labels');
      check(Object.hasOwn(localeData.de.topics, item.topic), `topic: ${item.topic}`);
      for (const field of ['sourceType', 'verification']) check(Object.hasOwn(localeData.de.shared, item[field]), `Q${item.id}: ${field} lookup`);
      check(Object.keys(entry).every(key => ['question', 'options', 'explanation', 'matchLabels'].includes(key)), `Q${item.id}: overlay fields`);
      const localized = localizedQuestion(item, 'de');
      for (const field of ['id', 'answer', 'matches', 'format', 'source', 'coursewareSource', 'labIds']) check(JSON.stringify(localized[field]) === JSON.stringify(item[field]), `Q${item.id}: preserve ${field}`);
      check(JSON.stringify(localizedQuestion(item, 'en')) === JSON.stringify(item), `Q${item.id}: English`);
    }
    for (const lab of labs) {
      const entry = localeData.de.labs[lab.id];
      for (const field of ['title', 'summary']) check(entry?.[field]?.length > 0 && entry[field] !== lab[field], `${lab.id}: ${field}`);
      for (const field of ['checklist', 'artifacts', 'concepts']) check(entry?.[field]?.length === lab[field].length && entry[field].every(s => typeof s === 'string' && s.length > 0), `${lab.id}: ${field}`);
      check(entry?.checklist.every((s, i) => s !== lab.checklist[i]), `${lab.id}: translated steps`);
      const localized = localizedLab(lab, 'de');
      for (const field of ['id', 'number', 'day', 'sourceUrl', 'relatedQuestionIds']) check(JSON.stringify(localized[field]) === JSON.stringify(lab[field]), `${lab.id}: preserve ${field}`);
      check(JSON.stringify(localizedLab(lab, 'en')) === JSON.stringify(lab), `${lab.id}: English`);
      check(Object.keys(entry).every(key => ['title', 'summary', 'checklist', 'artifacts', 'concepts'].includes(key)), `${lab.id}: overlay fields`);
      for (const field of ['sourceType', 'verificationStatus']) check(Object.hasOwn(localeData.de.shared, lab[field]), `${lab.id}: ${field} lookup`);
    }
    for (const area of courseAreas) check(localeData.de.areas[area.id]?.title !== area.title && localeData.de.areas[area.id]?.title?.length > 0, area.id);
    learningOutcomes.forEach((outcome, i) => check(localeData.de.outcomes[`outcome-${i + 1}`]?.length > 0 && localeData.de.outcomes[`outcome-${i + 1}`] !== outcome, `outcome ${i}`));
    for (const insight of coursewareInsights) for (const language of ['en', 'de']) {
      const entry = localeData[language].insights[insight.id];
      check(entry?.title?.length > 0 && entry?.text?.length > 30 && entry?.status?.length > 0, `${language}: ${insight.id}`);
      check(localizedInsight(insight, language).source === insight.source, `${insight.id}: source`);
    }
    return errors;
  });
  expect(issues).toEqual([]);
});

test('all authored German content renders in cards, feedback and dialogs without mutating source data', async ({ page }) => {
  await page.locator('#language-select').selectOption('de');
  const issues = await page.evaluate(() => {
    const errors = [];
    const baseline = JSON.stringify({ questions, labs, courseAreas, learningOutcomes, coursewareInsights });
    for (const item of questions) {
      state.index = questions.indexOf(item);
      state.answers[item.id] = item.matches || item.answer;
      render();
      const entry = localeData.de.questions[item.id];
      if (document.querySelector('#question-prompt').textContent !== entry.question) errors.push(`Q${item.id}: prompt`);
      if (!document.querySelector('.explanation').textContent.includes(entry.explanation)) errors.push(`Q${item.id}: explanation`);
      if (document.querySelector('.explanation strong').textContent !== 'richtig') errors.push(`Q${item.id}: answer key`);
      const options = [...document.querySelectorAll('.option-copy')].map(el => el.textContent);
      if (item.format !== 'matching' && JSON.stringify(options) !== JSON.stringify(entry.options)) errors.push(`Q${item.id}: options`);
      if (item.format === 'matching') {
        const labels = [...document.querySelector('[data-match="0"]').options].slice(1).map(el => el.textContent);
        if (JSON.stringify(labels) !== JSON.stringify(entry.matchLabels)) errors.push(`Q${item.id}: matching labels`);
      }
    }
    for (const lab of labs) {
      openLab(lab.id);
      const entry = localeData.de.labs[lab.id];
      const text = document.querySelector('#modal-content').textContent;
      for (const value of [entry.summary, ...entry.checklist, ...entry.artifacts]) if (!text.includes(value)) errors.push(`${lab.id}: ${value}`);
      if (!document.querySelector('#modal-title').textContent.includes(entry.title)) errors.push(`${lab.id}: title`);
      closeLegalModal();
    }
    for (const insight of coursewareInsights) {
      openInsight(insight.id);
      if (!document.querySelector('#modal-content').textContent.includes(localeData.de.insights[insight.id].text)) errors.push(insight.id);
      closeLegalModal();
    }
    if (baseline !== JSON.stringify({ questions, labs, courseAreas, learningOutcomes, coursewareInsights })) errors.push('source mutation');
    return errors;
  });
  expect(issues).toEqual([]);
});

test('every static UI key and accessibility attribute follows the selected locale', async ({ page }) => {
  for (const language of ['de', 'en']) {
    await page.locator('#language-select').selectOption(language);
    expect(await page.evaluate(language => {
      const errors = [];
      for (const [attribute, target] of [['data-ui', null], ['data-ui-aria', 'aria-label'], ['data-ui-alt', 'alt']]) {
        for (const el of document.querySelectorAll(`[${attribute}]`)) {
          const key = el.getAttribute(attribute);
          if (!uiText[language][key] || (target ? el.getAttribute(target) : el.textContent) !== uiText[language][key]) errors.push(key);
        }
      }
      return errors;
    }, language)).toEqual([]);
  }
});

test('German matching values and code-state tokens remain unchanged across locale switches', async ({ page }) => {
  await page.locator('#language-select').selectOption('de');
  await page.locator('[data-id="60"]').click();
  for (const [index, value] of ['A', 'B', 'C', 'D'].entries()) await page.locator(`[data-match="${index}"]`).selectOption(value);
  await expect(page.locator('.explanation strong')).toHaveText('richtig');
  await page.locator('#language-select').selectOption('en');
  await expect(page.locator('[data-match="0"]')).toHaveValue('A');
  await expect(page.locator('.explanation strong')).toHaveText('correct');
  await page.locator('#language-select').selectOption('de');
  await page.locator('[data-id="82"]').click();
  await expect(page.locator('.option-copy')).toHaveText(['complete', 'insufficientEvidence', 'conflict', 'success']);
  await page.getByRole('radio').nth(2).check();
  await expect(page.locator('.explanation strong')).toHaveText('richtig');
});

test('German question 57 is fully translated including options and feedback', async ({ page }) => {
  await page.locator('#language-select').selectOption('de');
  await page.locator('[data-id="57"]').click();
  await expect(page.locator('#question-prompt')).toHaveText('Welche ZWEI Vorgehensweisen verbessern die Identitätsstrategie eines Unternehmens?');
  await expect(page.locator('.option-copy')).toHaveText([
    'Berechtigungen nach dem Prinzip der geringsten Rechte vergeben.',
    'Ein Administratorkonto für alle Agenten gemeinsam nutzen.',
    'Bei benutzergesteuerten Zugriffen gegebenenfalls delegierte Berechtigungen verwenden.',
    'API-Schlüssel fest in Themen hinterlegen.',
  ]);
  await page.getByRole('checkbox').first().check();
  await expect(page.locator('.explanation')).toContainText('Das Prinzip der geringsten Rechte');
  await expect(page.locator('.related-lab')).toContainText('Identität, Kanäle und Governance-Kontrollen');
});

test('search indexes displayed German prompts, options, explanations and topics', async ({ page }) => {
  await page.locator('#language-select').selectOption('de');
  await page.locator('#search').fill('Welche');
  expect(await page.locator('#question-list button').count()).toBeGreaterThan(30);
  for (const [query, id] of [['Administratorkonto', 57], ['Schadensumfang', 57], ['Identitätsstrategie', 57], ['Computer Use', 86]]) {
    await page.locator('#search').fill(query);
    await expect(page.locator(`#question-list [data-id="${id}"]`)).toBeVisible();
  }
  await page.locator('#search').fill('');
  await page.locator('[data-id="86"]').click();
  await expect(page.locator('#question-prompt')).toContainText('Computer Use');
  await page.locator('#topic-filter').selectOption('Identity strategy');
  await expect(page.locator('#topic-filter option:checked')).toHaveText('Identitätsstrategie');
  await expect(page.locator('#question-list')).toContainText('Identitätsstrategie');
});

test('insights, labs and modal chrome follow locale; legal subtree remains English', async ({ page }) => {
  await page.locator('[data-insight="flow-contracts"]').click();
  await expect(page.locator('#modal-content')).toContainText('Define typed inputs and outputs.');
  await expect(page.locator('#modal-content')).not.toContainText('Definiere');
  await page.keyboard.press('Escape');
  await page.locator('#language-select').selectOption('de');
  await page.locator('[data-insight="flow-contracts"]').click();
  await expect(page.locator('#modal-title')).toHaveText('Flow-Verträge');
  await expect(page.locator('.modal-panel')).toHaveAttribute('lang', 'de');
  await expect(page.locator('.modal-panel .eyebrow')).toHaveText('Kurswissen');
  await expect(page.locator('.modal-actions button')).toHaveText('Schließen');
  await page.keyboard.press('Escape');
  await page.locator('#lab-filter').selectOption('3');
  await expect(page.locator('#lab-filter option:checked')).toHaveText('Tag 3');
  await page.locator('.lab-open[data-lab="lab-10"]').click();
  await expect(page.locator('#modal-title')).toContainText('Computer Use absichern');
  await expect(page.locator('[data-lab-step="0"]').locator('..')).toContainText('Lies');
  await expect(page.locator('.modal-close')).toHaveAccessibleName('Dialog schließen');
  await page.keyboard.press('Escape');
  await page.locator('[data-legal="privacy"]').click();
  await expect(page.locator('.modal-panel')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#modal-title')).toHaveText('Privacy Notice');
  await expect(page.locator('.modal-actions button')).toHaveText('Close');
});

test('locale preference survives reload and missing entries fall back to English without substitutions', async ({ page }) => {
  await page.locator('#language-select').selectOption('de');
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.locator('#search')).toHaveAccessibleName('Konzepte suchen');
  expect(await page.evaluate(() => {
    const unknown = { id: 999, question: 'Which Computer Use capability?', options: ['Use tools.'], explanation: 'Only a fallback.' };
    return [localizedQuestion(unknown, 'de'), localizedQuestion(questions[0], 'fr'), t('Use Computer Use and tools'), ui('learn', 'fr')];
  })).toEqual([{ id: 999, question: 'Which Computer Use capability?', options: ['Use tools.'], explanation: 'Only a fallback.' }, await page.evaluate(() => questions[0]), 'Use Computer Use and tools', 'Learn']);
});

for (const width of [320, 740, 1440]) test(`German lab and insight dialogs do not overflow at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.locator('#language-select').selectOption('de');
  for (const opener of ['.lab-open[data-lab="lab-18"]', '[data-insight="release-recovery"]']) {
    await page.locator(opener).click();
    expect(await page.locator('.modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
  }
});
