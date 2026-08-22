const $ = (selector) => document.querySelector(selector);
const state = {
  index: 0,
  mode: 'learn',
  answers: JSON.parse(localStorage.getItem('ab620-answers') || '{}'),
  query: '',
  topic: 'all',
  areaId: 'all',
  examIds: [],
  examStarted: false,
  examEndsAt: 0,
  examResult: '',
};

const themeSelect = $('#theme-select');
function applyTheme(theme) { document.documentElement.dataset.theme = theme; themeSelect.value = theme; }
applyTheme(localStorage.getItem('ab620-theme') || 'auto');
themeSelect.addEventListener('change', (event) => { localStorage.setItem('ab620-theme', event.target.value); applyTheme(event.target.value); });

const list = $('#question-list');
const card = $('#question-card');
const labProgress = JSON.parse(localStorage.getItem('ab620-lab-progress') || '{}');
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
const legalContent = {
  disclaimer: {
    title: 'Disclaimer',
    html: `<p><strong>Unofficial study project.</strong> This website is an independent, unofficial exam-preparation project.</p><p>It has no affiliation, partnership, authorization, sponsorship, or endorsement from Microsoft, Microsoft Corporation, DumpsBase, or The Data Community. Microsoft, Copilot Studio, and AB-620 are trademarks of their respective owners.</p><p>Some content comes from third-party sources and has been checked against Microsoft Learn to the best of our ability. <strong>No guarantee</strong> is given for accuracy, completeness, currency, availability, error-free operation, or exam success.</p><p>This content is not legal, tax, privacy, professional, or other expert advice. Use this website at your own risk. Verify information independently before relying on it for any binding or public purpose.</p>`
  },
  privacy: {
    title: 'Privacy Notice',
    html: `<p><strong>Controller:</strong> [Operator name or entity placeholder]. This project is a static GitHub Pages website.</p><p>The application stores only the following data locally in your browser:</p><ul><li>your study progress using <code>localStorage</code></li><li>your theme selection using <code>localStorage</code></li></ul><p>The application does not create accounts, transmit answers to an own server, or use its own analytics or tracking services. Local data can be deleted with “Reset progress” or through your browser settings.</p><p>Loading the external Google Fonts stylesheet may connect your browser to Google. External links may open Microsoft Learn, GitHub, and other source websites. Their own privacy notices apply to processing on those services.</p><p>This short notice is not a complete, individualized privacy policy. Review hosting, fonts, logs, and any additional services before public publication.</p>`
  },
  imprint: {
    title: 'Legal Notice',
    html: `<p class="placeholder-notice"><strong>Placeholder: Complete before public publication.</strong></p><p><strong>Provider information under Section 5 DDG</strong></p><p>[Provider name or entity]<br />[Full service address]<br />[Email address]</p><p>This legal notice is a placeholder and is not a complete provider identification. No VAT ID, commercial register details, or profession-specific information have been provided for this draft. Replace all placeholders and obtain an appropriate legal review before publication.</p>`
  }
};
function openLegalModal(type) { const content = legalContent[type] || legalContent.disclaimer; lastFocusedElement = document.activeElement; modalTitle.textContent = content.title; modalContent.innerHTML = content.html; legalModal.hidden = false; document.body.classList.add('modal-open'); modalPanel.focus(); }
function closeLegalModal() { legalModal.hidden = true; document.body.classList.remove('modal-open'); lastFocusedElement?.focus(); }
document.querySelectorAll('[data-legal]').forEach((button) => button.addEventListener('click', () => openLegalModal(button.dataset.legal)));
legalModal.querySelectorAll('[data-modal-close]').forEach((button) => button.addEventListener('click', closeLegalModal));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !legalModal.hidden) closeLegalModal(); });
// Show the disclaimer immediately on every page load so it cannot be missed.
openLegalModal('disclaimer');
labFilter.addEventListener('change', renderLabs);
const topics = [...new Set(questions.map((item) => item.topic))];
topics.forEach((topic) => $('#topic-filter').insertAdjacentHTML('beforeend', `<option value="${topic}">${topic}</option>`));
courseAreas.forEach((area) => areaGrid.insertAdjacentHTML('beforeend', `<article class="area-card"><span class="area-weight">${area.weight}</span><h3>${area.title}</h3><p>${area.labs.length} connected labs</p><button class="text-button" data-area="${area.id}" type="button">Study this area ↗</button></article>`));
learningOutcomes.forEach((outcome, index) => outcomesStrip.insertAdjacentHTML('beforeend', `<div><b>0${index + 1}</b><span>${outcome}</span></div>`));
for (let day = 1; day <= 5; day += 1) labFilter.insertAdjacentHTML('beforeend', `<option value="${day}">Day ${day}</option>`);
coursewareInsights.forEach((insight) => insightsGrid.insertAdjacentHTML('beforeend', `<article class="insight-card"><span class="insight-status">${insight.status}</span><h4>${insight.title}</h4><p>${insight.text}</p><button class="text-button insight-open" data-insight="${insight.id}" type="button">Read insight ↗</button></article>`));
document.querySelectorAll('[data-area]').forEach((button) => button.addEventListener('click', () => { state.areaId = button.dataset.area; state.mode = 'learn'; state.topic = 'all'; state.query = ''; $('#topic-filter').value = 'all'; $('#search').value = ''; document.querySelector('#exam').scrollIntoView({ behavior: 'smooth' }); render(); }));
document.querySelectorAll('.insight-open').forEach((button) => button.addEventListener('click', () => openInsight(button.dataset.insight)));

function save() { localStorage.setItem('ab620-answers', JSON.stringify(state.answers)); }
function saveLabs() { localStorage.setItem('ab620-lab-progress', JSON.stringify(labProgress)); }
function renderLabs() { const visible = labs.filter((lab) => labFilter.value === 'all' || String(lab.day) === labFilter.value); labsGrid.innerHTML = visible.map((lab) => `<article class="lab-card"><div class="lab-top"><span>LAB ${String(lab.number).padStart(2, '0')} · DAY ${lab.day}</span><span>${labProgress[lab.id] || 0}%</span></div><h3>${lab.title}</h3><p>${lab.summary}</p><div class="lab-tags">${lab.concepts.slice(0, 3).map((concept) => `<span>${concept}</span>`).join('')}</div><button class="text-button lab-open" data-lab="${lab.id}" type="button">Open lab brief ↗</button></article>`).join(''); labsGrid.querySelectorAll('.lab-open').forEach((button) => button.addEventListener('click', () => openLab(button.dataset.lab))); }
function openLab(id) { const lab = labs.find((item) => item.id === id); lastFocusedElement = document.activeElement; modalTitle.textContent = `Lab ${String(lab.number).padStart(2, '0')} · ${lab.title}`; modalContent.innerHTML = `<p>${lab.summary}</p><h4>Checklist</h4><div class="lab-checklist">${lab.checklist.map((step, index) => `<label><input type="checkbox" data-lab-step="${index}" ${labProgress[`${lab.id}-${index}`] ? 'checked' : ''} />${step}</label>`).join('')}</div><h4>Artifacts</h4><p>${lab.artifacts.join(' · ')}</p><p class="verification-note">${lab.verificationStatus}</p><a class="source-link" href="${lab.sourceUrl}" target="_blank" rel="noreferrer">Open original lab ↗</a>`; legalModal.hidden = false; document.body.classList.add('modal-open'); modalPanel.focus(); modalContent.querySelectorAll('[data-lab-step]').forEach((input) => input.addEventListener('change', () => { labProgress[`${lab.id}-${input.dataset.labStep}`] = input.checked; labProgress[lab.id] = Math.round(Object.keys(labProgress).filter((key) => key.startsWith(`${lab.id}-`) && labProgress[key]).length / lab.checklist.length * 100); saveLabs(); renderLabs(); })); }
function openInsight(id) { const insight = coursewareInsights.find((item) => item.id === id); lastFocusedElement = document.activeElement; modalTitle.textContent = insight.title; modalContent.innerHTML = `<p>${insight.text}</p><p><strong>Status:</strong> ${insight.status}</p><a class="source-link" href="${insight.source}" target="_blank" rel="noreferrer">Read Microsoft Learn source ↗</a>`; legalModal.hidden = false; document.body.classList.add('modal-open'); modalPanel.focus(); }
function currentQuestions() { return (state.mode === 'exam' || state.mode === 'review') && state.examIds.length ? state.examIds.map((id) => questions.find((item) => item.id === id)) : questions; }
function filtered() {
  const pool = currentQuestions();
  return pool.filter((item) => (state.areaId === 'all' || item.labIds.some((labId) => courseAreas.find((area) => area.id === state.areaId)?.labs.includes(labId))) && (state.topic === 'all' || item.topic === state.topic) && (!state.query || `${item.question} ${item.explanation} ${item.topic}`.toLowerCase().includes(state.query.toLowerCase())));
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
  $('#question-total').textContent = state.mode === 'exam' ? state.examIds.length : questions.length;
  $('#progress-percent').textContent = `${percent}%`;
  $('#progress-ring').style.setProperty('--progress', percent);
  $('#progress-ring').setAttribute('aria-valuenow', percent);
}
function renderTopicLinks(item) { const target = labs.find((lab) => item.labIds?.includes(lab.id)); const sourceLink = item.coursewareSource ? `<a class="source-link" href="${item.coursewareSource}" target="_blank" rel="noreferrer">Original Courseware source ↗</a>` : ''; return target || sourceLink ? `<div class="related-lab">${target ? `<strong>Related lab</strong><button class="text-button lab-inline-open" data-lab="${target.id}" type="button">${target.title} ↗</button>` : ''}${sourceLink}</div>` : ''; }
function renderList(items) {
  list.innerHTML = items.map((item) => `<button class="list-item ${item.id === filtered()[state.index]?.id ? 'active' : ''} ${state.answers[item.id] !== undefined ? 'done' : ''}" data-id="${item.id}" type="button"><span>Q${String(item.id).padStart(2, '0')}</span><span>${item.topic.split(' ')[0]}</span></button>`).join('');
  list.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => { state.index = filtered().findIndex((item) => item.id === Number(button.dataset.id)); render(); }));
}
function answerText(item) {
  if (item.format === 'matching') return Object.entries(item.matches).map(([key, value]) => `${Number(key) + 1} → ${value}`).join(', ');
  return Array.isArray(item.answer) ? item.answer.map((entry) => String.fromCharCode(65 + entry)).join(', ') : String.fromCharCode(65 + item.answer);
}
function optionMarkup(item, answered) {
  const selected = Array.isArray(answered) ? answered : answered === undefined ? [] : [answered];
  return item.options.map((option, index) => {
    const right = Array.isArray(item.answer) ? item.answer.includes(index) : index === item.answer;
    const cls = answered === undefined ? '' : right ? 'correct' : selected.includes(index) ? 'wrong' : '';
    const control = item.format === 'multiple' ? `<input type="checkbox" ${selected.includes(index) ? 'checked' : ''} aria-label="Select option ${String.fromCharCode(65 + index)}" />` : '';
    return `<div class="option ${cls}" data-option="${index}" role="${item.format === 'multiple' ? 'checkbox' : 'button'}" tabindex="0" aria-pressed="${selected.includes(index)}"><span>${String.fromCharCode(65 + index)}</span>${control}<span class="option-copy">${option}</span></div>`;
  }).join('');
}
function renderCard() {
  const items = filtered();
  const item = items[state.index];
  if (!item) return;
  const answered = state.answers[item.id];
  const matching = item.format === 'matching' ? `<div class="matching-list">${item.options.map((option, index) => `<label>${option}<select data-match="${index}"><option value="">Choose</option>${item.matchLabels.map((label) => `<option value="${label[0]}">${label}</option>`).join('')}</select></label>`).join('')}</div>` : '';
  card.innerHTML = `<div class="question-meta"><span>${item.topic}</span><span>${item.sourceType}</span></div><h3>${item.question}</h3>${matching || `<div class="options">${optionMarkup(item, answered)}</div>`}<div class="source-row"><strong>Source:</strong> ${item.sourceType}${item.coursewareSource ? ` · <a class="source-link" href="${item.coursewareSource}" target="_blank" rel="noreferrer">Original Courseware ↗</a>` : ''}</div>${answered !== undefined ? `<div class="explanation"><strong>${isCorrect(item, answered) ? 'Correct answer' : `Correct answer: ${answerText(item)}`}</strong>${item.explanation}<br /><br /><a class="source-link" href="${item.source}" target="_blank" rel="noreferrer">Read the verification source ↗</a><br /><small>${item.verification}</small></div>` : ''}${renderTopicLinks(item)}<div class="question-footer"><button class="small-button" id="previous" type="button">← Previous</button><button class="small-button next" id="next" type="button">${state.index === items.length - 1 ? (state.mode === 'exam' ? 'Finish exam' : 'Finish') : 'Next question →'}</button></div>`;
  card.querySelectorAll('.option').forEach((option) => {
    const choose = () => {
      const value = Number(option.dataset.option);
      if (item.format === 'multiple') { const current = Array.isArray(state.answers[item.id]) ? [...state.answers[item.id]] : []; state.answers[item.id] = current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value].sort(); }
      else state.answers[item.id] = value;
      save(); render();
    };
    option.addEventListener('click', choose);
    option.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); } });
  });
  card.querySelectorAll('[data-match]').forEach((select) => select.addEventListener('change', () => { state.answers[item.id] = { ...(state.answers[item.id] || {}), [select.dataset.match]: select.value }; save(); render(); }));
  card.querySelectorAll('.lab-inline-open').forEach((button) => button.addEventListener('click', () => openLab(button.dataset.lab)));
  $('#previous').addEventListener('click', () => { state.index = Math.max(0, state.index - 1); render(); });
  $('#next').addEventListener('click', () => { if (state.index === items.length - 1 && state.mode === 'exam') finishExam(); else { state.index = Math.min(items.length - 1, state.index + 1); render(); } });
  $('#question-number').textContent = state.index + 1;
}
function renderExamStatus() {
  const status = $('#exam-status');
  if (state.mode !== 'exam' || (!state.examStarted && !state.examResult)) { status.hidden = true; return; }
  if (!state.examStarted) { status.hidden = false; status.textContent = state.examResult; return; }
  status.hidden = false;
  const remaining = Math.max(0, state.examEndsAt - Date.now());
  status.textContent = `Exam mode · ${Math.ceil(remaining / 60000)} min left`;
  if (remaining <= 0) finishExam();
}
function finishExam() {
  const examItems = state.examIds.map((id) => questions.find((item) => item.id === id));
  const score = examItems.filter((item) => isCorrect(item, state.answers[item.id])).length;
  state.examStarted = false;
  state.examResult = `Exam complete · ${score}/${examItems.length} correct (${Math.round(score / examItems.length * 100)}%)`;
  $('#exam-status').hidden = false;
  $('#exam-status').textContent = state.examResult;
  state.index = 0;
  render();
}
function startExam() {
  state.mode = 'exam'; state.areaId = 'all'; state.topic = 'all'; state.query = ''; $('#topic-filter').value = 'all'; $('#search').value = '';
  state.examIds = [...questions].sort(() => Math.random() - .5).slice(0, 20).map((item) => item.id);
  state.examStarted = true; state.examResult = ''; state.examEndsAt = Date.now() + 20 * 60 * 1000; state.index = 0; render();
}
function render() {
  const items = filtered();
  if (!items.length) { list.innerHTML = '<p class="empty-state">No questions match this search.</p>'; card.innerHTML = '<div class="explanation"><strong>Nothing found</strong>Try a different keyword or reset the topic filter.</div>'; updateProgress(); return; }
  if (state.index >= items.length) state.index = 0;
  renderList(items); renderCard(); updateProgress(); renderExamStatus();
}
document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => {
  if (button.dataset.mode === 'exam') startExam();
  else { state.mode = button.dataset.mode; state.areaId = 'all'; state.topic = state.mode === 'learn' ? topics[0] : 'all'; state.query = state.mode === 'review' ? '' : state.query; $('#topic-filter').value = state.topic; state.index = 0; if (state.mode === 'review') { const review = questions.filter((item) => state.answers[item.id] === undefined || !isCorrect(item, state.answers[item.id])); state.examIds = review.map((item) => item.id); } document.querySelector('#exam').scrollIntoView({ behavior: 'smooth' }); render(); }
}));
$('#search').addEventListener('input', (event) => { state.query = event.target.value; state.areaId = 'all'; state.mode = 'learn'; state.index = 0; render(); });
$('#topic-filter').addEventListener('change', (event) => { state.topic = event.target.value; state.areaId = 'all'; state.mode = 'learn'; state.index = 0; render(); });
$('#reset-progress').addEventListener('click', () => { if (confirm('Reset all local progress?')) { state.answers = {}; save(); render(); } });
setInterval(renderExamStatus, 1000);
render();
renderLabs();
