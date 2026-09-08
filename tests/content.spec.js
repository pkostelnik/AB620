const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const vm = require('node:vm');

function currentData() {
  const context = vm.createContext({});
  for (const file of ['course.js', 'resources.js', 'courseware-insights.js', 'labs.js', 'questions.js', 'locale-data.js', 'i18n.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return JSON.parse(vm.runInContext('JSON.stringify({questions, labs, resources, areas: courseAreas, insights: coursewareInsights, outcomes: learningOutcomes, localeData, uiText})', context));
}

test('all 36 extension questions separate origin from reviewed Learn evidence', () => {
  for (const q of currentData().questions.slice(54)) {
    expect(q.originalSource, `Q${q.id} origin`).toMatch(/^https:\/\/(thedatacommunity\.org|github\.com)\//);
    expect(q.verificationSource, `Q${q.id} verification`).toMatch(/^https:\/\/learn\.microsoft\.com\//);
    expect(['confirmed', 'partial']).toContain(q.verificationStatus);
    expect(q.verifiedOn).toBe('2026-09-06');
    expect(q.verificationNote.length).toBeGreaterThan(25);
  }
});

test('courseware origins use the actual source rather than the first related lab; Q54 cites exam policy', () => {
  const { questions } = currentData();
  const origins = [4, 4, 8, 13, 14, 12, 10, 10, 15, 16, 18, 20];
  origins.forEach((lab, i) => expect(questions[78 + i].originalSource).toContain(`/941360e11dfa677914a00281a8255404e8c848e0/labs/lab-${String(lab).padStart(2, '0')}-`));
  expect(questions[53].verificationSource).toMatch(/\/study-guides\/ab-620$/);
  for (const id of [80, 82, 83, 86, 87, 90]) expect(questions[id - 1].verificationStatus).toBe('partial');
});

test('resources address files and lab reverse references equal current forward references', () => {
  const { questions, labs, resources } = currentData();
  for (const r of resources) expect(r.url).toMatch(/\/blob\/941360e11dfa677914a00281a8255404e8c848e0\/labs\/resources\/[^/]+\.(md|json|yaml|csv|kql)$/);
  for (const lab of labs) expect(lab.relatedQuestionIds).toEqual(questions.filter(q => q.labIds.includes(lab.id)).map(q => q.id));
});

test('validator exposes a side-effect-free in-memory validation API', async () => {
  const validator = await import('../scripts/validate-content.mjs');
  expect(typeof validator.validateContent).toBe('function');
  expect(validator.validateContent(currentData())).toEqual([]);
});

const mutations = [
  ['answer range', d => { d.questions[0].answer = 99; }, /answer/],
  ['answer type', d => { d.questions[0].answer = '0'; }, /answer/],
  ['multiple duplicates', d => { d.questions[56].answer = [0, 0]; }, /answer/],
  ['empty multiple', d => { d.questions[56].answer = []; }, /answer/],
  ['format', d => { d.questions[0].format = 'essay'; }, /format/],
  ['matching row', d => { delete d.questions[59].matches[0]; }, /match/],
  ['matching value', d => { d.questions[59].matches[0] = 'Z'; }, /match/],
  ['matching labels', d => { d.questions[59].matchLabels[1] = 'A. Duplicate'; }, /match/],
  ['duplicate question ID', d => { d.questions[1].id = 1; }, /unique|duplicate/],
  ['duplicate lab ID', d => { d.labs[1].id = d.labs[0].id; }, /unique|duplicate/],
  ['duplicate resource ID', d => { d.resources[1].id = d.resources[0].id; }, /unique|duplicate/],
  ['duplicate area ID', d => { d.areas[1].id = d.areas[0].id; }, /unique|duplicate/],
  ['duplicate insight ID', d => { d.insights[1].id = d.insights[0].id; }, /unique|duplicate/],
  ['question lab', d => { d.questions[0].labIds = ['lab-99']; }, /reference/],
  ['reverse question', d => { d.labs[0].relatedQuestionIds = [999]; }, /reverse|reference/],
  ['missing reverse', d => { d.labs[0].relatedQuestionIds = []; }, /reverse/],
  ['resource lab', d => { d.resources[0].labs = ['lab-99']; }, /reference/],
  ['area lab', d => { d.areas[0].labs = ['lab-99']; }, /reference/],
  ['insight lab', d => { d.insights[0].labs = ['lab-99']; }, /reference/],
  ['empty origin', d => { d.questions[54].originalSource = ''; }, /originalSource/],
  ['wrong verification host', d => { d.questions[54].verificationSource = 'https://thedatacommunity.org/?p=9592'; }, /verificationSource/],
  ['spoofed host', d => { d.questions[54].verificationSource = 'https://learn.microsoft.com.evil.test/article'; }, /verificationSource/],
  ['community on Learn host', d => { d.questions[54].originalSource = d.questions[54].verificationSource; }, /originalSource/],
  ['missing upstream lab', d => { d.labs[0].sourceUrl = d.labs[0].sourceUrl.replace(/lab-01-[^/]+$/, 'lab-01-invented.md'); }, /upstream/],
  ['missing upstream resource', d => { d.resources[0].url = d.resources[0].url.replace(/[^/]+$/, 'invented.md'); }, /upstream/],
  ['resource directory', d => { d.resources[0].url = d.resources[0].url.replace(/\/[^/]+$/, ''); }, /upstream/],
  ['source classification', d => { d.questions[78].sourceType = 'DumpsBase practice'; }, /classification|split/],
  ['missing question', d => { d.questions.pop(); }, /90|coverage/],
  ['missing verification note', d => { d.questions[54].verificationNote = ''; }, /verificationNote/],
  ['missing UI key', d => { delete d.uiText.de.relatedQuestions; }, /UI/],
  ['missing German question', d => { delete d.localeData.de.questions[1]; }, /locale/],
  ['short locale options', d => { d.localeData.de.questions[1].options.pop(); }, /locale/],
  ['locale answer overwrite', d => { d.localeData.de.questions[1].answer = 3; }, /protected/],
  ['English source overwrite', d => { d.localeData.en.questions = { 1: { originalSource: 'https://evil.test' } }; }, /protected/],
  ['locale lab URL overwrite', d => { d.localeData.de.labs['lab-01'].sourceUrl = 'https://evil.test'; }, /protected/],
  ['locale area refs overwrite', d => { d.localeData.de.areas['plan-configure'].labs = []; }, /protected/],
  ['locale insight URL overwrite', d => { d.localeData.en.insights['flow-contracts'].source = 'https://evil.test'; }, /protected/],
  ['locale checklist length', d => { d.localeData.de.labs['lab-01'].checklist.pop(); }, /locale/],
  ['locale matching label key', d => { d.localeData.de.questions[60].matchLabels[0] = 'Z. Wrong'; }, /locale/],
  ['unknown locale question', d => { d.localeData.de.questions[999] = d.localeData.de.questions[1]; }, /locale/],
  ['missing resource locale', d => { delete d.localeData.de.resources.card; }, /locale/],
  ['resource URL overlay', d => { d.localeData.de.resources.card.url = 'https://evil.test'; }, /protected/],
  ['invalid locale array type', d => { d.localeData.de.questions[1].options = 'not an array'; }, /locale/],
  ['invalid matching locale array type', d => { d.localeData.de.questions[60].matchLabels = 'not an array'; }, /locale/],
  ['unknown outcome locale', d => { d.localeData.en.outcomes = { 'outcome-99': 'Unknown outcome' }; }, /locale/],
  ['unknown topic locale', d => { d.localeData.en.topics = { 'Unknown topic': 'Unknown topic' }; }, /locale/],
  ['unsupported review claim', d => { d.questions[81].verificationStatus = 'confirmed'; }, /verification/],
  ['null matching label', d => { d.questions[59].matchLabels[0] = null; }, /match/],
  ['malformed encoded upstream path', d => { d.resources[0].url = d.resources[0].url.replace(/[^/]+$/, '%zz.md'); }, /upstream/],
  ['invalid lab ID type', d => { d.labs[0].id = 17; }, /ID/],
  ['invalid question refs type', d => { d.questions[0].labIds = {}; }, /reference/],
  ['invalid area sources type', d => { d.areas[0].sources = {}; }, /sources/],
  ['invalid review date', d => { d.questions[54].verifiedOn = '2026-99-99'; }, /date/],
];
for (const [name, mutate, diagnostic] of mutations) test(`validator rejects ${name}`, async () => {
  const validator = await import('../scripts/validate-content.mjs');
  expect(typeof validator.validateContent).toBe('function');
  const data = currentData();
  mutate(data);
  expect(validator.validateContent(data).join('\n')).toMatch(diagnostic);
});

test('Markdown is reproducible from canonical data and both locales, including matching mappings', async () => {
  expect(fs.existsSync('scripts/generate-study-guide.mjs')).toBe(true);
  const { generateStudyGuide } = await import('../scripts/generate-study-guide.mjs');
  const data = currentData();
  const markdown = generateStudyGuide(data);
  expect(fs.readFileSync('AB620.md', 'utf8')).toBe(markdown);
  expect(markdown.match(/^### Question \d+$/gm)).toHaveLength(90);
  expect(markdown).toContain('1 -> A, 2 -> B, 3 -> C, 4 -> D');
  for (const q of data.questions) {
    expect(markdown).toContain(q.explanation);
    expect(markdown).toContain(data.localeData.de.questions[q.id].explanation);
  }
  data.questions[0].explanation = 'Changed canonical explanation';
  expect(generateStudyGuide(data)).not.toBe(markdown);
  const { validateContent } = await import('../scripts/validate-content.mjs');
  expect(validateContent(data, { markdown }).join('\n')).toMatch(/Markdown/);
});

test('reverse references follow edited question associations instead of a second hard-coded list', () => {
  const context = vm.createContext({});
  for (const file of ['resources.js', 'labs.js', 'questions.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  expect(JSON.parse(vm.runInContext("questions[0].labIds = ['lab-01']; JSON.stringify([labs[0].relatedQuestionIds.includes(1), labs[1].relatedQuestionIds.includes(1)])", context))).toEqual([true, false]);
});

test('network checker is explicitly opt-in and reports failures, redirects and HEAD fallback', async () => {
  expect(fs.existsSync('scripts/check-links.mjs')).toBe(true);
  const { spawnSync } = require('node:child_process');
  const command = spawnSync(process.execPath, ['scripts/check-links.mjs'], { encoding: 'utf8' });
  expect(command.status).toBe(2);
  expect(command.stderr).toContain('--network');
  const { checkLinks } = await import('../scripts/check-links.mjs');
  const calls = [];
  const results = await checkLinks(['https://learn.microsoft.com/good', 'https://learn.microsoft.com/missing', 'https://learn.microsoft.com/head', 'https://learn.microsoft.com/timeout'], async (url, options) => {
    calls.push([url, options.method]);
    if (url.endsWith('/timeout')) throw new Error('timeout');
    return { ok: url.endsWith('/good') || (url.endsWith('/head') && options.method === 'GET'), status: url.endsWith('/missing') ? 404 : url.endsWith('/head') && options.method === 'HEAD' ? 405 : 200, url: url.endsWith('/good') ? `${url}/redirected` : url, body: null };
  });
  expect(results.map(r => r.ok)).toEqual([true, false, true, false]);
  expect(results[0].finalUrl).toContain('/redirected');
  expect(results[3].error).toBe('timeout');
  expect(calls).toContainEqual(['https://learn.microsoft.com/head', 'GET']);
});

const requiredResources = {
  adr: 'architecture-decision-record.md', card: 'adaptive-card.json', openapi: 'ticket-api.openapi.yaml',
  kql: 'application-insights-queries.kql', 'test-set': 'contoso-test-set.csv', 'test-design': 'contoso-test-design.csv',
  release: 'deployment-checklist.md', evidence: 'foundry-evidence-fixtures.json',
};
for (const [id, file] of Object.entries(requiredResources)) test(`resource coverage requires ${id} to address ${file} even after docs regeneration`, async () => {
  const { validateContent } = await import('../scripts/validate-content.mjs');
  const { generateStudyGuide } = await import('../scripts/generate-study-guide.mjs');
  const data = currentData();
  const resource = data.resources.find(r => r.id === id);
  expect(resource.url).toContain(`/labs/resources/${file}`);
  resource.url = data.resources.find(r => r.id !== id).url;
  expect(validateContent(data, { markdown: generateStudyGuide(data) }).join('\n')).toMatch(/resource coverage/i);
});

for (const [name, mutate] of [
  ['all eight point at ADR', d => { d.resources.forEach(r => { r.url = d.resources[0].url; }); }],
  ['swapped files', d => { [d.resources[1].url, d.resources[2].url] = [d.resources[2].url, d.resources[1].url]; }],
  ['required ID replaced', d => {
    d.resources[1].id = 'other-card';
    d.localeData.de.resources['other-card'] = d.localeData.de.resources.card;
    delete d.localeData.de.resources.card;
  }],
]) test(`resource coverage rejects ${name} despite regenerated Markdown parity`, async () => {
  const { validateContent } = await import('../scripts/validate-content.mjs');
  const { generateStudyGuide } = await import('../scripts/generate-study-guide.mjs');
  const data = currentData();
  mutate(data);
  expect(validateContent(data, { markdown: generateStudyGuide(data) }).join('\n')).toMatch(/resource coverage/i);
});

test('inherited insight statuses explicitly disclose dated review limits in data and generated docs', async () => {
  const data = currentData();
  const { generateStudyGuide } = await import('../scripts/generate-study-guide.mjs');
  const markdown = generateStudyGuide(data);
  for (const insight of data.insights) {
    expect(insight.status).toBe('Not individually reviewed as of 2026-09-06');
    for (const language of ['en', 'de']) {
      const status = data.localeData[language].insights[insight.id].status;
      expect(status).toBe(language === 'en' ? insight.status : 'Stand 2026-09-06: nicht einzeln geprüft');
      expect(markdown).toContain(`**Status (${language}):** ${status}`);
    }
  }
});

test('generated study instructions document review Finish and Learn restart behavior', async () => {
  const { generateStudyGuide } = await import('../scripts/generate-study-guide.mjs');
  const markdown = generateStudyGuide(currentData());
  expect(markdown).toContain('Finish recalculates remaining weak spots');
  expect(markdown).toContain('Back to first question');
  expect(fs.readFileSync('AB620.md', 'utf8')).toBe(markdown);
});
