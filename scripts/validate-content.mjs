import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadContent, root } from './load-content.mjs';
import { generateStudyGuide } from './generate-study-guide.mjs';

const upstream = JSON.parse(fs.readFileSync(new URL('scripts/upstream-files.json', root), 'utf8'));
const text = value => typeof value === 'string' && value.trim().length > 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Pure validation: callers may mutate an in-memory snapshot without changing repository files.
export function validateContent(data, { markdown } = {}) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  const { questions, labs, resources, areas, insights, outcomes, localeData, uiText } = data;
  const collections = { questions, labs, resources, areas, insights };
  for (const [name, entries] of Object.entries(collections)) {
    if (!Array.isArray(entries) || entries.some(entry => !record(entry))) errors.push(`${name}: expected array of records`);
  }
  if (errors.length) return errors;
  check(questions.length === 90, 'Expected 90 questions');
  check(labs.length === 20, 'Expected 20 labs');
  check(areas.length === 3, 'Expected 3 areas');
  check(insights.length === 5, 'Expected 5 insights');
  const requiredResources = {
    adr: 'architecture-decision-record.md', card: 'adaptive-card.json', openapi: 'ticket-api.openapi.yaml',
    kql: 'application-insights-queries.kql', 'test-set': 'contoso-test-set.csv', 'test-design': 'contoso-test-design.csv',
    release: 'deployment-checklist.md', evidence: 'foundry-evidence-fixtures.json',
  };
  for (const [id, file] of Object.entries(requiredResources)) {
    check(resources.some(r => r.id === id && r.url === `https://github.com/${upstream.repository}/blob/${upstream.commit}/labs/resources/${file}`), `Required resource coverage: ${id} must link to ${file}`);
  }
  check(Array.isArray(outcomes) && outcomes.length === 6 && outcomes.every(text), 'Expected six outcomes');
  for (const [name, entries] of Object.entries(collections)) {
    check(new Set(entries.map(e => e.id)).size === entries.length, `${name}: duplicate IDs; IDs must be unique`);
    check(entries.every(e => name === 'questions' ? Number.isInteger(e.id) && e.id >= 1 && e.id <= 90 : text(e.id)), `${name}: invalid ID`);
  }
  check(new Set(questions.map(q => q.question)).size === questions.length, 'Duplicate question text');
  const labIds = new Set(labs.map(l => l.id));
  const references = (values, allowed, label) => {
    check(Array.isArray(values) && values.length > 0 && new Set(values).size === values.length && values.every(id => allowed.has(id)), `${label}: invalid or missing references`);
  };
  const url = (value, hosts, label) => {
    try {
      const parsed = new URL(value);
      check(parsed.protocol === 'https:' && hosts.includes(parsed.hostname) && !parsed.username && !parsed.password && !parsed.port && !/[\s<>"']/.test(value), `${label}: invalid HTTPS URL or host`);
      return parsed;
    } catch { errors.push(`${label}: invalid URL`); return null; }
  };
  const learnUrl = (value, label) => {
    const parsed = url(value, ['learn.microsoft.com'], label);
    check(parsed && /^\/(?:en-us\/)?(?:microsoft-copilot-studio|power-platform|power-apps|power-automate|azure|credentials|microsoft-365|training|troubleshoot)\/.+/.test(parsed.pathname), `${label}: expected documentation path, not community Q&A or a host-only link`);
  };
  const upstreamUrl = (value, label, prefix) => {
    const parsed = url(value, ['github.com'], label);
    const base = `/${upstream.repository}/blob/${upstream.commit}/`;
    const path = parsed?.pathname.startsWith(base) ? parsed.pathname.slice(base.length) : '';
    check(upstream.files.includes(path) && path.startsWith(prefix) && !parsed?.search && !parsed?.hash, `${label}: missing or unpinned upstream file`);
    return path;
  };
  const originLabs = [4, 4, 8, 13, 14, 12, 10, 10, 15, 16, 18, 20];
  for (const q of questions) {
    const label = `Q${q.id}`;
    for (const key of ['question', 'explanation', 'topic', 'sourceType', 'verification', 'verificationNote']) check(text(q[key]), `${label}: missing ${key}`);
    check(Array.isArray(q.options) && q.options.length >= 2 && q.options.every(text) && new Set(q.options).size === q.options.length, `${label}: invalid options`);
    const validOption = value => Number.isInteger(value) && value >= 0 && value < (q.options?.length || 0);
    check(['single', 'multiple', 'matching'].includes(q.format), `${label}: invalid format`);
    if (q.format === 'single') check(validOption(q.answer), `${label}: invalid single answer`);
    if (q.format === 'multiple') check(Array.isArray(q.answer) && q.answer.length >= 2 && q.answer.every(validOption) && new Set(q.answer).size === q.answer.length, `${label}: invalid multiple answer`);
    if (q.format === 'matching') {
      const labels = Array.isArray(q.matchLabels) ? q.matchLabels : [];
      check(labels.length === q.options?.length && labels.every(l => typeof l === 'string' && /^[A-Z]\. .+/.test(l)) && new Set(labels.map(l => l?.[0])).size === labels.length, `${label}: invalid matching labels`);
      const rows = Array.from({ length: q.options?.length || 0 }, (_, i) => String(i));
      check(record(q.matches) && same(Object.keys(q.matches).sort(), rows.sort()) && Object.values(q.matches).every(v => labels.some(l => l?.[0] === v)), `${label}: invalid matching rows or values`);
      check(validOption(q.answer), `${label}: invalid legacy matching answer placeholder`);
    } else check(q.matches === undefined && q.matchLabels === undefined, `${label}: matching data on non-matching format`);
    references(q.labIds, labIds, label);
    const classification = q.id <= 45 ? 'DumpsBase practice' : q.id <= 54 ? 'Microsoft Learn' : q.id <= 78 ? 'The Data Community practice' : 'Courseware-derived';
    check(q.sourceType === classification, `${label}: source classification/split must remain 45/9/24/12`);
    check(q.official === (q.id >= 46 && q.id <= 54), `${label}: invalid official alignment flag`);
    learnUrl(q.verificationSource, `${label} verificationSource`);
    if (q.id >= 79) {
      const path = upstreamUrl(q.originalSource, `${label} originalSource`, 'labs/lab-');
      check(path.startsWith(`labs/lab-${String(originLabs[q.id - 79]).padStart(2, '0')}-`), `${label}: wrong originalSource lab attribution`);
    } else if (q.id >= 55) {
      const parsed = url(q.originalSource, ['thedatacommunity.org'], `${label} originalSource`);
      check(parsed?.pathname === '/' && /^\d+$/.test(parsed.searchParams.get('p')), `${label}: originalSource must address community post`);
    } else if (q.id >= 46) learnUrl(q.originalSource, `${label} originalSource`);
    else url(q.originalSource, ['www.dumpsbase.com'], `${label} originalSource`);
    check(['confirmed', 'partial', 'unreviewed'].includes(q.verificationStatus), `${label}: invalid verificationStatus`);
    const verificationText = { confirmed: 'Supported by the reviewed documentation', partial: 'Partially supported; see scope note', unreviewed: 'Not individually reviewed in this source audit' };
    check(q.verification === verificationText[q.verificationStatus], `${label}: verification label/status mismatch`);
    if (q.id >= 54) check(['confirmed', 'partial'].includes(q.verificationStatus) && /^\d{4}-\d{2}-\d{2}$/.test(q.verifiedOn) && Number.isFinite(Date.parse(q.verifiedOn)) && new Date(q.verifiedOn).toISOString().startsWith(q.verifiedOn), `${label}: required review coverage/date`);
    else check(q.verificationStatus === 'unreviewed' && q.verifiedOn === null, `${label}: legacy source not individually reviewed`);
  }
  check(questions.find(q => q.id === 54)?.verificationSource === 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ab-620', 'Q54 verificationSource: expected exam study guide');
  for (const lab of labs) {
    const path = upstreamUrl(lab.sourceUrl, lab.id, 'labs/lab-');
    check(path.startsWith(`labs/${lab.id}-`), `${lab.id}: upstream file does not match lab ID`);
    check(text(lab.id) && /^lab-\d{2}$/.test(lab.id) && lab.number === Number(lab.id.slice(4)) && Number.isInteger(lab.day) && lab.day >= 1 && lab.day <= 5, `${lab.id}: invalid ID/number/day`);
    for (const key of ['title', 'summary', 'verificationStatus', 'sourceType']) check(text(lab[key]), `${lab.id}: missing ${key}`);
    for (const key of ['checklist', 'artifacts', 'concepts']) check(Array.isArray(lab[key]) && lab[key].length > 0 && lab[key].every(text), `${lab.id}: invalid ${key}`);
    check(same(lab.relatedQuestionIds, questions.filter(q => Array.isArray(q.labIds) && q.labIds.includes(lab.id)).map(q => q.id)), `${lab.id}: reverse question references differ from current labIds`);
  }
  for (const r of resources) {
    references(r.labs, labIds, r.id);
    upstreamUrl(r.url, r.id, 'labs/resources/');
    check(text(r.title) && text(r.type), `${r.id}: resource title/type missing`);
  }
  for (const area of areas) {
    references(area.labs, labIds, area.id);
    check(text(area.title) && text(area.weight), `${area.id}: title/weight missing`);
    check(Array.isArray(area.sources) && area.sources.length > 0, `${area.id}: sources missing`);
    for (const source of Array.isArray(area.sources) ? area.sources : []) learnUrl(source, area.id);
  }
  for (const insight of insights) { references(insight.labs, labIds, insight.id); learnUrl(insight.source, insight.id); }
  if (!record(localeData) || !record(uiText)) return [...errors, 'Missing locale/UI catalogs'];
  check(same(Object.keys(localeData).sort(), ['de', 'en']) && same(Object.keys(uiText).sort(), ['de', 'en']), 'Expected en/de locale and UI catalogs');
  const groups = {
    questions: [questions, ['question', 'options', 'explanation', 'matchLabels']],
    labs: [labs, ['title', 'summary', 'checklist', 'artifacts', 'concepts']],
    areas: [areas, ['title']],
    insights: [insights, ['title', 'text', 'status']],
    resources: [resources, ['title']],
  };
  for (const language of ['en', 'de']) {
    const locale = localeData[language] || {};
    check(record(uiText[language]) && same(Object.keys(uiText[language]).sort(), Object.keys(uiText.en || {}).sort()) && Object.values(uiText[language]).every(text), `${language}: missing or invalid UI keys`);
    for (const key of ['originalSource', 'verificationSource', 'resources', 'relatedQuestions', 'reviewedOn']) check(text(uiText[language]?.[key]), `${language}: required UI ${key}`);
    check(Object.keys(locale).every(k => [...Object.keys(groups), 'shared', 'topics', 'outcomes', 'evidenceNotes'].includes(k)), `${language}: unknown locale group`);
    for (const [group, [entries, fields]] of Object.entries(groups)) {
      const overlays = locale[group] || {};
      const required = language === 'de' || group === 'insights';
      check(record(overlays), `${language}.${group}: locale must be a map`);
      for (const id of Object.keys(overlays)) check(entries.some(e => String(e.id) === id), `${language}.${group}.${id}: unknown locale ID`);
      for (const entry of entries) {
        const overlay = overlays[entry.id];
        if (!required && overlay === undefined) continue;
        const label = `${language}.${group}.${entry.id} locale`;
        if (!record(overlay)) { errors.push(`${label}: missing record`); continue; }
        check(Object.keys(overlay).every(k => fields.includes(k)), `${label}: protected data overwrite`);
        for (const field of fields) {
          if (field === 'matchLabels' && entry.format !== 'matching') { check(overlay[field] === undefined, `${label}: unexpected matching labels`); continue; }
          if (!required && overlay[field] === undefined) continue;
          if (Array.isArray(entry[field])) {
            check(Array.isArray(overlay[field]) && overlay[field].length === entry[field].length && overlay[field].every(text), `${label}: invalid ${field} array`);
            if (field === 'matchLabels') check(Array.isArray(overlay[field]) && overlay[field].every((l, i) => l?.[0] === entry[field][i]?.[0]), `${label}: matching label identity changed`);
          } else check(text(overlay[field]), `${label}: missing ${field}`);
        }
      }
    }
    for (const key of ['shared', 'topics', 'outcomes', 'evidenceNotes']) {
      if (locale[key] !== undefined) check(record(locale[key]) && Object.values(locale[key]).every(text), `${language}: invalid locale ${key}`);
    }
    for (const id of Object.keys(locale.evidenceNotes || {})) check(questions.some(q => String(q.id) === id), `${language}: unknown evidence locale ID`);
    for (const id of Object.keys(locale.outcomes || {})) check(/^outcome-[1-6]$/.test(id), `${language}: unknown outcome locale ID`);
    for (const topic of Object.keys(locale.topics || {})) check(questions.some(q => q.topic === topic), `${language}: unknown topic locale key`);
    if (language === 'de') {
      for (const q of questions) {
        check(text(locale.topics?.[q.topic]), `Q${q.id}: missing topic locale`);
        for (const key of ['sourceType', 'verification']) check(text(locale.shared?.[q[key]]), `Q${q.id}: missing ${key} locale`);
        check(q.verifiedOn ? text(locale.evidenceNotes?.[q.id]) : text(locale.shared?.[q.verificationNote]), `Q${q.id}: missing evidence locale`);
      }
      for (const lab of labs) for (const key of ['sourceType', 'verificationStatus']) check(text(locale.shared?.[lab[key]]), `${lab.id}: missing ${key} locale`);
      check(same(Object.keys(locale.outcomes || {}).sort(), Array.from({ length: 6 }, (_, i) => `outcome-${i + 1}`)), 'de: outcome locale coverage');
    }
  }
  if (markdown !== undefined && !errors.length) check(markdown === generateStudyGuide(data), 'AB620.md differs from generated Markdown; run npm run docs:generate');
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const data = loadContent();
  const errors = validateContent(data, { markdown: fs.readFileSync(new URL('AB620.md', root), 'utf8') });
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Content validation passed: ${data.questions.length} questions, ${data.labs.length} labs, ${data.resources.length} resources; 45/9/24/12 source split, locale integrity and Markdown parity`);
}
