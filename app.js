const $ = (selector) => document.querySelector(selector);
let persistenceFailed = false;
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
function validAnswer(id, value) {
  const item = questions.find((question) => String(question.id) === id);
  if (!item) return false;
  const validOption = (entry) => Number.isInteger(entry) && entry >= 0 && entry < item.options.length;
  if (item.format === 'matching') return isRecord(value) && Object.entries(value).every(([key, entry]) => /^(0|[1-9]\d*)$/.test(key) && Number(key) < item.options.length && (entry === '' || item.matchLabels.some((label) => label[0] === entry)));
  if (item.format === 'multiple') return Array.isArray(value) && new Set(value).size === value.length && value.every(validOption);
  return validOption(value);
}
function validLabProgress(key, value) {
  const lab = labs.find((item) => key === item.id || key.startsWith(`${item.id}-`));
  if (!lab) return false;
  if (key === lab.id) return Number.isInteger(value) && value >= 0 && value <= 100;
  const step = key.slice(lab.id.length + 1);
  return /^(0|[1-9]\d*)$/.test(step) && Number(step) < lab.checklist.length && typeof value === 'boolean';
}
function readStorage(key, fallback, validate) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    if (!isRecord(fallback)) {
      if (validate(raw)) return raw;
      throw new Error('Invalid preference');
    }
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) throw new Error('Invalid progress');
    return Object.fromEntries(Object.entries(parsed).filter(([id, value]) => {
      if (validate(id, value)) return true;
      persistenceFailed = true;
      return false;
    }));
  } catch {
    persistenceFailed = true;
    return fallback;
  }
}
function showPersistenceWarning() {
  const warning = $('#persistence-warning');
  warning.hidden = !persistenceFailed;
  warning.textContent = ui('persistenceWarning');
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); }
  catch { persistenceFailed = true; }
  showPersistenceWarning();
}
const state = {
  index: 0,
  mode: 'learn',
  answers: readStorage('ab620-answers', {}, validAnswer),
  query: '',
  topic: 'all',
  areaId: 'all',
  language: readStorage('ab620-language', 'en', value => ['en', 'de'].includes(value)),
  reviewIds: [],
  examIds: [],
  examAnswers: {},
  examState: 'idle',
  examEndsAt: 0,
  examScore: null,
};

const themeSelect = $('#theme-select');
const languageSelect = $('#language-select');
languageSelect.value = state.language;
function applyLanguage(language) {
  state.language = Object.hasOwn(uiText, language) ? language : 'en';
  writeStorage('ab620-language', state.language);
  languageSelect.value = state.language;
  document.documentElement.lang = state.language;
  document.querySelectorAll('[data-ui]').forEach(element => { element.textContent = ui(element.dataset.ui); });
  document.querySelectorAll('[data-ui-aria]').forEach(element => { element.setAttribute('aria-label', ui(element.dataset.uiAria)); });
  document.querySelectorAll('[data-ui-alt]').forEach(element => { element.alt = ui(element.dataset.uiAlt); });
  document.title = ui('pageTitle');
  $('meta[name="description"]').content = ui('description');
  $('#search').placeholder = ui('searchPlaceholder');
  refreshDynamicCopy(); render(); renderLabs();
}
languageSelect.addEventListener('change', (event) => applyLanguage(event.target.value));
function applyTheme(theme) { document.documentElement.dataset.theme = theme; themeSelect.value = theme; }
applyTheme(readStorage('ab620-theme', 'auto', value => ['auto', 'light', 'dark', 'contrast'].includes(value)));
themeSelect.addEventListener('change', (event) => { writeStorage('ab620-theme', event.target.value); applyTheme(event.target.value); });

const list = $('#question-list');
const card = $('#question-card');
const labProgress = readStorage('ab620-lab-progress', {}, validLabProgress);
const labsGrid = $('#labs-grid');
const labFilter = $('#lab-filter');
const outcomesStrip = $('#outcomes-strip');
const areaGrid = $('#area-grid');
const insightsGrid = $('#insights-grid');
const legalModal = $('#legal-modal');
const modalPanel = legalModal.querySelector('.modal-panel');
const modalTitle = $('#modal-title');
const modalContent = $('#modal-content');
let lastFocusedElement;
let lastLabOpener;
const legalContent = {
  disclaimer: {
    title: 'Disclaimer',
    html: `<p><strong>Unofficial study project.</strong> This website is an independent, unofficial exam-preparation project.</p><p>It has no affiliation, partnership, authorization, sponsorship, or endorsement from Microsoft, Microsoft Corporation, DumpsBase, or The Data Community. Microsoft, Copilot Studio, and AB-620 are trademarks of their respective owners.</p><p>Some content comes from third-party sources and has been checked against Microsoft Learn to the best of our ability. <strong>No guarantee</strong> is given for accuracy, completeness, currency, availability, error-free operation, or exam success.</p><p>This content is not legal, tax, privacy, professional, or other expert advice. Use this website at your own risk. Verify information independently before relying on it for any binding or public purpose.</p>`
  },
  privacy: {
    title: 'Privacy Notice',
    html: `<p><strong>Controller:</strong> [Operator name or entity placeholder]. This project is a static GitHub Pages website.</p><p>The application uses four <code>localStorage</code> keys in your browser:</p><ul><li><code>ab620-answers</code>: study answers and progress</li><li><code>ab620-lab-progress</code>: lab checklist progress</li><li><code>ab620-language</code>: language preference</li><li><code>ab620-theme</code>: theme preference</li></ul><p>Exam questions, answers, timer and results exist only in this tab's memory, not in persistent storage. A reload or closing the tab discards the exam. Reset progress clears study and lab progress and discards the exam, but keeps language and theme preferences. Browser site-data settings can remove all four keys.</p><p>The application has no accounts, answer-upload endpoint or application analytics. However, loading this site makes HTTP requests to its host. Google Fonts CSS and font files (fonts.googleapis.com and fonts.gstatic.com) and the Microsoft badge (learn.microsoft.com) are requested automatically, without clicking an external link. These requests can disclose your IP address and browser/request metadata to the host and those providers, subject to browser settings and caching. Clicking source and resource links connects to the destination websites, whose privacy notices apply.</p><p>This notice and the operator details are placeholders, not a complete individualized privacy policy. Review hosting logs, external assets, legal obligations and any additional services before public publication.</p>`
  },
  imprint: {
    title: 'Legal Notice',
    html: `<p class="placeholder-notice"><strong>Placeholder: Complete before public publication.</strong></p><p><strong>Provider information under Section 5 DDG</strong></p><p>[Provider name or entity]<br />[Full service address]<br />[Email address]</p><p>This legal notice is a placeholder and is not a complete provider identification. No VAT ID, commercial register details, or profession-specific information have been provided for this draft. Replace all placeholders and obtain an appropriate legal review before publication.</p>`
  }
};
function openModal(title, html, kind = 'labBrief') {
  lastFocusedElement = document.activeElement === document.body ? null : document.activeElement;
  lastLabOpener = lastFocusedElement?.dataset.lab ? { id: lastFocusedElement.dataset.lab, inline: lastFocusedElement.classList.contains('lab-inline-open') } : null;
  modalTitle.textContent = title;
  modalContent.innerHTML = html;
  const language = kind === 'legalNotes' ? 'en' : state.language;
  modalPanel.lang = language;
  modalPanel.querySelector('.eyebrow').textContent = ui(kind, language);
  modalPanel.querySelector('.modal-actions button').textContent = ui('close', language);
  modalPanel.querySelector('.modal-close').setAttribute('aria-label', ui('closeDialog', language));
  legalModal.hidden = false;
  $('.app-shell').inert = true;
  document.body.classList.add('modal-open');
  modalPanel.focus();
}
function openLegalModal(type) { const content = legalContent[type] || legalContent.disclaimer; openModal(content.title, content.html, 'legalNotes'); }
function closeLegalModal() {
  legalModal.hidden = true;
  $('.app-shell').inert = false;
  document.body.classList.remove('modal-open');
  const opener = lastFocusedElement?.isConnected ? lastFocusedElement : lastLabOpener && $(`.${lastLabOpener.inline ? 'lab-inline-open' : 'lab-open'}[data-lab="${lastLabOpener.id}"]`);
  (opener || $('.brand')).focus();
}
// WebKit does not focus pointer-activated buttons; record the actual modal opener.
document.querySelectorAll('[data-legal]').forEach((button) => button.addEventListener('click', () => { button.focus({ preventScroll: true }); openLegalModal(button.dataset.legal); }));
legalModal.querySelectorAll('[data-modal-close]').forEach((button) => button.addEventListener('click', closeLegalModal));
document.addEventListener('keydown', (event) => {
  if (legalModal.hidden) return;
  if (event.key === 'Escape') { event.preventDefault(); closeLegalModal(); }
  if (event.key === 'Tab') {
    const controls = [...modalPanel.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')].filter(element => !element.disabled && !element.hidden);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === modalPanel)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
// Show the disclaimer immediately on every page load so it cannot be missed.
openLegalModal('disclaimer');
labFilter.addEventListener('change', renderLabs);
const topics = [...new Set(questions.map((item) => item.topic))];
topics.forEach((topic) => $('#topic-filter').insertAdjacentHTML('beforeend', `<option value="${topic}">${topic}</option>`));
courseAreas.forEach((area) => areaGrid.insertAdjacentHTML('beforeend', `<article class="area-card"><span class="area-weight">${area.weight}</span><h3></h3><p></p><button class="text-button" data-area="${area.id}" type="button"></button></article>`));
learningOutcomes.forEach((outcome, index) => outcomesStrip.insertAdjacentHTML('beforeend', `<div><b>0${index + 1}</b><span></span></div>`));
for (let day = 1; day <= 5; day += 1) labFilter.insertAdjacentHTML('beforeend', `<option value="${day}">Day ${day}</option>`);
coursewareInsights.forEach((insight) => insightsGrid.insertAdjacentHTML('beforeend', `<article class="insight-card"><span class="insight-status"></span><h4></h4><p></p><button class="text-button insight-open" data-insight="${insight.id}" type="button"></button></article>`));
function refreshDynamicCopy() {
  document.querySelectorAll('.area-card').forEach((element, index) => {
    const area = localizedArea(courseAreas[index]);
    element.querySelector('h3').textContent = area.title;
    element.querySelector('p').textContent = `${area.labs.length} ${ui('connectedLabs')}`;
    element.querySelector('button').textContent = `${ui('studyArea')} ↗`;
  });
  document.querySelectorAll('.outcomes-strip span').forEach((element, index) => { element.textContent = localizedOutcome(learningOutcomes[index], index); });
  document.querySelectorAll('.insight-card').forEach((element, index) => {
    const insight = localizedInsight(coursewareInsights[index]);
    element.querySelector('h4').textContent = insight.title;
    element.querySelector('p').textContent = insight.text;
    element.querySelector('.insight-status').textContent = insight.status;
    element.querySelector('button').textContent = `${ui('readInsight')} ↗`;
  });
  [...$('#topic-filter').options].forEach(option => { option.textContent = option.value === 'all' ? ui('allTopics') : localizedTopic(option.value); });
  [...labFilter.options].forEach(option => { option.textContent = option.value === 'all' ? ui('allDays') : `${ui('day')} ${option.value}`; });
}
document.querySelectorAll('[data-area]').forEach((button) => button.addEventListener('click', () => { if (!leaveExam()) return; state.areaId = button.dataset.area; state.mode = 'learn'; state.index = 0; state.topic = 'all'; state.query = ''; $('#topic-filter').value = 'all'; $('#search').value = ''; render(); focusQuestion(); }));
document.querySelectorAll('.insight-open').forEach((button) => button.addEventListener('click', () => { button.focus({ preventScroll: true }); openInsight(button.dataset.insight); }));

function save() { writeStorage('ab620-answers', state.answers); }
function saveLabs() { writeStorage('ab620-lab-progress', labProgress); }
function renderLabs() { const visible = labs.filter((lab) => labFilter.value === 'all' || String(lab.day) === labFilter.value).map(lab => localizedLab(lab)); labsGrid.innerHTML = visible.map((lab) => `<article class="lab-card"><div class="lab-top"><span>${ui('lab')} ${String(lab.number).padStart(2, '0')} · ${ui('day')} ${lab.day}</span><span>${labProgress[lab.id] || 0}%</span></div><h3>${lab.title}</h3><p>${lab.summary}</p><div class="lab-tags">${lab.concepts.slice(0, 3).map((concept) => `<span>${concept}</span>`).join('')}</div><button class="text-button lab-open" data-lab="${lab.id}" type="button">${ui('openLab')} ↗</button></article>`).join(''); labsGrid.querySelectorAll('.lab-open').forEach((button) => button.addEventListener('click', () => { button.focus({ preventScroll: true }); openLab(button.dataset.lab); })); }
function openLab(id) {
  if (state.examState === 'active') return;
  const lab = localizedLab(labs.find((item) => item.id === id));
  const relatedResources = resources.filter(resource => resource.labs.includes(id)).map(resource => localizedResource(resource));
  openModal(`${ui('lab')} ${String(lab.number).padStart(2, '0')} · ${lab.title}`, `<p>${lab.summary}</p><h4>${ui('checklist')}</h4><div class="lab-checklist">${lab.checklist.map((step, index) => `<label><input type="checkbox" data-lab-step="${index}" ${labProgress[`${lab.id}-${index}`] ? 'checked' : ''} />${step}</label>`).join('')}</div><h4>${ui('artifacts')}</h4><p>${lab.artifacts.join(' · ')}</p><p class="verification-note">${lab.verificationStatus}</p><a class="source-link" href="${lab.sourceUrl}" target="_blank" rel="noreferrer">${ui('originalLab')} ↗</a>${relatedResources.length ? `<h4>${ui('resources')}</h4><ul>${relatedResources.map(resource => `<li><a class="source-link" href="${resource.url}" target="_blank" rel="noreferrer">${resource.title} ↗</a></li>`).join('')}</ul>` : ''}<h4>${ui('relatedQuestions')}</h4><div>${lab.relatedQuestionIds.map(questionId => `<button class="text-button" data-question="${questionId}" type="button">${ui('question')} ${questionId}</button>`).join(' · ')}</div>`);
  modalContent.querySelectorAll('[data-lab-step]').forEach((input) => input.addEventListener('change', () => { labProgress[`${lab.id}-${input.dataset.labStep}`] = input.checked; labProgress[lab.id] = Math.round(Object.keys(labProgress).filter((key) => key.startsWith(`${lab.id}-`) && labProgress[key]).length / lab.checklist.length * 100); saveLabs(); renderLabs(); }));
  modalContent.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => {
    if (state.examState === 'active') return;
    closeLegalModal(); leaveExam(); state.mode = 'learn'; state.areaId = 'all'; state.topic = 'all'; state.query = '';
    $('#topic-filter').value = 'all'; $('#search').value = '';
    state.index = questions.findIndex(question => question.id === Number(button.dataset.question));
    render(); focusQuestion();
  }));
}
function openInsight(id) {
  if (state.examState === 'active') return;
  const insight = localizedInsight(coursewareInsights.find((item) => item.id === id)); openModal(insight.title, `<p>${insight.text}</p><p><strong>${ui('status')}:</strong> ${insight.status}</p><a class="source-link" href="${insight.source}" target="_blank" rel="noreferrer">${ui('learnSource')} ↗</a>`, 'courseware');
}
function currentQuestions() { return state.mode === 'exam' || state.mode === 'review' ? (state.mode === 'exam' ? state.examIds : state.reviewIds).map((id) => questions.find((item) => item.id === id)) : questions; }
function filtered() {
  const pool = currentQuestions();
  if (state.mode === 'exam') return pool;
  return pool.filter((item) => {
    const localized = localizedQuestion(item);
    const searchText = [localized.question, ...localized.options, localized.explanation, localized.topic, ...(localized.matchLabels || [])].join(' ');
    return (state.areaId === 'all' || item.labIds.some((labId) => courseAreas.find((area) => area.id === state.areaId)?.labs.includes(labId))) && (state.topic === 'all' || item.topic === state.topic) && (!state.query || searchText.toLocaleLowerCase(state.language).includes(state.query.toLocaleLowerCase(state.language)));
  });
}
function isCorrect(item, value) {
  if (item.format === 'matching') return value && Object.entries(item.matches).every(([key, expected]) => value[key] === expected);
  return Array.isArray(item.answer) ? Array.isArray(value) && value.length === item.answer.length && value.every((entry) => item.answer.includes(entry)) : value === item.answer;
}
function updateProgress() {
  const completed = Object.keys(state.answers).length;
  const percent = Math.round((completed / questions.length) * 100);
  $('#completed-count').textContent = completed;
  $('#total-count').textContent = questions.length;
  $('#question-total').textContent = filtered().length;
  $('#progress-percent').textContent = `${percent}%`;
  $('#progress-ring').style.setProperty('--progress', percent);
  $('#progress-ring').setAttribute('aria-valuenow', percent);
}
function renderTopicLinks(item) { const targets = labs.filter(lab => item.labIds.includes(lab.id)); return targets.length ? `<div class="related-lab"><strong>${ui('related')}</strong>${targets.map(target => `<button class="text-button lab-inline-open" data-lab="${target.id}" type="button">${localizedLab(target).title} ↗</button>`).join('')}</div>` : ''; }
function renderList(items) {
  const answers = state.mode === 'exam' ? state.examAnswers : state.answers;
  list.innerHTML = items.map((item) => `<button class="list-item ${item.id === items[state.index]?.id ? 'active' : ''} ${answers[item.id] !== undefined ? 'done' : ''}" ${item.id === items[state.index]?.id ? 'aria-current="true"' : ''} data-id="${item.id}" type="button" aria-label="${ui('question')} ${item.id}: ${localizedTopic(item.topic)}"><span>Q${String(item.id).padStart(2, '0')}</span><span>${localizedTopic(item.topic)}</span></button>`).join('');
  list.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => { state.index = filtered().findIndex((item) => item.id === Number(button.dataset.id)); render(); focusQuestion(); }));
}
function answerText(item) {
  if (item.format === 'matching') return Object.entries(item.matches).map(([key, value]) => `${Number(key) + 1} → ${value}`).join(', ');
  return Array.isArray(item.answer) ? item.answer.map((entry) => String.fromCharCode(65 + entry)).join(', ') : String.fromCharCode(65 + item.answer);
}
function optionMarkup(item, answered, showFeedback, locked) {
  const selected = Array.isArray(answered) ? answered : answered === undefined ? [] : [answered];
  return item.options.map((option, index) => {
    const right = Array.isArray(item.answer) ? item.answer.includes(index) : index === item.answer;
    const cls = !showFeedback ? '' : right ? 'correct' : selected.includes(index) ? 'wrong' : '';
    return `<label class="option ${cls}"><input type="${item.format === 'multiple' ? 'checkbox' : 'radio'}" name="answer-${item.id}" data-option="${index}" ${selected.includes(index) ? 'checked' : ''} ${locked ? 'disabled' : ''} /><span class="option-letter">${String.fromCharCode(65 + index)}</span> <span class="option-copy">${option}</span></label>`;
  }).join('');
}
function renderCard() {
  const items = filtered();
  if (!items[state.index]) return;
  const item = localizedQuestion(items[state.index]);
  const answers = state.mode === 'exam' ? state.examAnswers : state.answers;
  const answered = answers[item.id];
  const active = state.mode === 'exam' && state.examState === 'active';
  const locked = state.mode === 'exam' && state.examState === 'completed';
  const showFeedback = !active && (locked || answered !== undefined);
  const matching = item.format === 'matching' ? `<div class="matching-list">${item.options.map((option, index) => `<label>${option}<select data-match="${index}" ${locked ? 'disabled' : ''}><option value="">${ui('chooseMatch')}</option>${item.matchLabels.map((label) => `<option value="${label[0]}" ${answered?.[index] === label[0] ? 'selected' : ''}>${label}</option>`).join('')}</select></label>`).join('')}</div>` : '';
  card.innerHTML = `<div class="question-meta"><span>${item.topic}</span>${!active ? `<span>${item.sourceType}</span>` : ''}</div><h3 id="question-prompt" tabindex="-1">${item.question}</h3><div role="group" aria-labelledby="question-prompt">${matching || `<div class="options">${optionMarkup(item, answered, showFeedback, locked)}</div>`}</div>${!active ? `<div class="source-row"><strong>${ui('source')}:</strong> ${item.sourceType} · <a class="source-link" href="${item.originalSource}" target="_blank" rel="noreferrer">${ui('originalSource')} ↗</a></div>` : ''}${showFeedback ? `<div class="explanation"><strong>${isCorrect(item, answered) ? ui('correct') : `${ui('correctAnswer')}: ${answerText(item)}`}</strong>${item.explanation}<br /><br /><a class="source-link" href="${item.verificationSource}" target="_blank" rel="noreferrer">${ui('verificationSource')} ↗</a><br /><small>${item.verification}${item.verifiedOn ? ` · ${ui('reviewedOn')}: ${item.verifiedOn}` : ''}<br />${item.verificationNote}</small></div>` : ''}${!active ? renderTopicLinks(item) : ''}<div class="question-footer"><button class="small-button" id="previous" type="button" ${state.index === 0 ? 'disabled' : ''}>← ${ui('previous')}</button><button class="small-button next" id="next" type="button" ${locked && state.index === items.length - 1 ? 'disabled' : ''}>${state.index === items.length - 1 ? ui(state.mode === 'learn' ? 'backToFirst' : 'finish') : `${ui('next')} →`}</button></div>`;
  card.querySelectorAll('[data-option], [data-match]').forEach((control) => control.addEventListener('change', () => {
    if (state.mode === 'exam') {
      if (state.examState !== 'active') return;
      if (Date.now() >= state.examEndsAt) { finishExam(); return; }
    }
    if (control.dataset.match !== undefined) answers[item.id] = { ...(answers[item.id] || {}), [control.dataset.match]: control.value };
    else if (item.format === 'multiple') answers[item.id] = [...card.querySelectorAll('[data-option]:checked')].map(input => Number(input.dataset.option));
    else answers[item.id] = Number(control.dataset.option);
    if (state.mode !== 'exam') save();
    // Preserve the changed control through rerender, including pointer input in WebKit.
    control.focus({ preventScroll: true });
    render();
  }));
  card.querySelectorAll('.lab-inline-open').forEach((button) => button.addEventListener('click', () => { button.focus({ preventScroll: true }); openLab(button.dataset.lab); }));
  $('#previous').addEventListener('click', () => { state.index = Math.max(0, state.index - 1); render(); focusQuestion(); });
  $('#next').addEventListener('click', () => {
    if (state.index === items.length - 1) {
      if (state.mode === 'exam') { finishExam(); return; }
      // Keep review feedback visible until Finish, then refresh the remaining set.
      if (state.mode === 'review') state.reviewIds = questions.filter(item => !isCorrect(item, state.answers[item.id])).map(item => item.id);
      state.index = 0;
    } else state.index += 1;
    render(); focusQuestion();
  });
  $('#question-number').textContent = state.index + 1;
}
function renderExamStatus() {
  const status = $('#exam-status');
  const hidden = state.mode !== 'exam' || state.examState === 'idle';
  if (status.hidden !== hidden) status.hidden = hidden;
  if (hidden) return;
  const remaining = Math.max(0, state.examEndsAt - Date.now());
  if (state.examState === 'active' && remaining <= 0) { finishExam(); return; }
  const text = state.examState === 'completed'
    ? `${ui('complete')} · ${state.examScore}/${state.examIds.length} ${ui('correct')} (${Math.round(state.examScore / state.examIds.length * 100)}%)`
    : `${ui('exam')} · ${Math.ceil(remaining / 60000)} ${ui('minutes')}`;
  if (status.textContent !== text) status.textContent = text;
}
function finishExam() {
  if (state.examState !== 'active') return;
  const examItems = state.examIds.map((id) => questions.find((item) => item.id === id));
  // Freeze a detached submission, including nested multi-select and matching answers.
  state.examAnswers = Object.freeze(Object.fromEntries(Object.entries(state.examAnswers).map(([id, value]) => [id, typeof value === 'object' ? Object.freeze(Array.isArray(value) ? [...value] : { ...value }) : value])));
  state.examScore = examItems.filter((item) => isCorrect(item, state.examAnswers[item.id])).length;
  state.examState = 'completed';
  state.index = 0;
  render();
  if (legalModal.hidden) focusQuestion();
}
function leaveExam() {
  if (state.examState === 'active' && !confirm(ui('abortExam'))) return false;
  state.examState = 'idle'; state.examAnswers = {}; state.examIds = []; state.examScore = null; state.examEndsAt = 0;
  return true;
}
function focusQuestion() {
  const target = $('#question-prompt') || $('#question-title');
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}
function startExam() {
  if (!leaveExam()) return;
  state.mode = 'exam'; state.areaId = 'all'; state.topic = 'all'; state.query = ''; $('#topic-filter').value = 'all'; $('#search').value = '';
  const shuffled = questions.map(item => item.id);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  state.examIds = shuffled.slice(0, 20);
  state.examState = 'active'; state.examEndsAt = Date.now() + 20 * 60 * 1000; state.index = 0; render(); focusQuestion();
}
function render() {
  document.body.classList.toggle('exam-active', state.examState === 'active');
  const focused = document.activeElement;
  const focusSelector = focused?.id ? `#${focused.id}` : focused?.dataset.option !== undefined ? `[data-option="${focused.dataset.option}"]` : focused?.dataset.match !== undefined ? `[data-match="${focused.dataset.match}"]` : null;
  $('#search').disabled = state.mode === 'exam';
  $('#topic-filter').disabled = state.mode === 'exam';
  const items = filtered();
  if (!items.length) { list.innerHTML = `<p class="empty-state">${ui(state.mode === 'review' ? 'noWeakSpots' : 'noMatch')}</p>`; card.innerHTML = `<div class="explanation"><strong>${ui(state.mode === 'review' ? 'noWeakSpots' : 'nothing')}</strong>${ui(state.mode === 'review' ? 'reviewComplete' : 'tryAgain')}</div>`; $('#question-number').textContent = '0'; updateProgress(); renderExamStatus(); return; }
  if (state.index >= items.length) state.index = 0;
  renderList(items); renderCard(); updateProgress(); renderExamStatus();
  if (focusSelector && !focused.isConnected) $(focusSelector)?.focus({ preventScroll: true });
}
document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => {
  if (button.dataset.mode === 'exam') startExam();
  else { if (!leaveExam()) return; state.mode = button.dataset.mode; state.areaId = 'all'; state.topic = state.mode === 'learn' ? topics[0] : 'all'; state.query = ''; $('#search').value = ''; $('#topic-filter').value = state.topic; state.index = 0; if (state.mode === 'review') { const review = questions.filter((item) => state.answers[item.id] === undefined || !isCorrect(item, state.answers[item.id])); state.reviewIds = review.map((item) => item.id); } render(); focusQuestion(); }
}));
$('#search').addEventListener('input', (event) => { if (state.mode === 'exam') return; state.query = event.target.value; state.areaId = 'all'; state.mode = 'learn'; state.index = 0; render(); });
$('#topic-filter').addEventListener('change', (event) => { if (state.mode === 'exam') return; state.topic = event.target.value; state.areaId = 'all'; state.mode = 'learn'; state.index = 0; render(); });
$('#reset-progress').addEventListener('click', () => {
  if (!confirm(ui(state.examState === 'active' ? 'resetActiveExam' : 'resetConfirm'))) return;
  state.examState = 'idle'; leaveExam(); state.answers = {}; state.reviewIds = []; state.mode = 'learn'; state.index = 0; state.areaId = 'all'; state.topic = 'all'; state.query = '';
  $('#search').value = ''; $('#topic-filter').value = 'all';
  Object.keys(labProgress).forEach(key => delete labProgress[key]);
  save(); saveLabs(); render(); renderLabs();
});
setInterval(renderExamStatus, 1000);
applyLanguage(state.language);
