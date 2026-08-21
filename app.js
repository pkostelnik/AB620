const $ = (selector) => document.querySelector(selector);
const state = {
  index: 0,
  mode: 'learn',
  answers: JSON.parse(localStorage.getItem('ab620-answers') || '{}'),
  query: '',
  topic: 'all',
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
const topics = [...new Set(questions.map((item) => item.topic))];
topics.forEach((topic) => $('#topic-filter').insertAdjacentHTML('beforeend', `<option value="${topic}">${topic}</option>`));

function save() { localStorage.setItem('ab620-answers', JSON.stringify(state.answers)); }
function currentQuestions() { return (state.mode === 'exam' || state.mode === 'review') && state.examIds.length ? state.examIds.map((id) => questions.find((item) => item.id === id)) : questions; }
function filtered() {
  const pool = currentQuestions();
  return pool.filter((item) => (state.topic === 'all' || item.topic === state.topic) && (!state.query || `${item.question} ${item.explanation} ${item.topic}`.toLowerCase().includes(state.query.toLowerCase())));
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
  card.innerHTML = `<div class="question-meta"><span>${item.topic}</span><span>${item.sourceType}</span></div><h3>${item.question}</h3>${matching || `<div class="options">${optionMarkup(item, answered)}</div>`}${answered !== undefined ? `<div class="explanation"><strong>${isCorrect(item, answered) ? 'Correct answer' : `Correct answer: ${answerText(item)}`}</strong>${item.explanation}<br /><br /><a class="source-link" href="${item.source}" target="_blank" rel="noreferrer">Read the source ↗</a><br /><small>${item.verification}</small></div>` : ''}<div class="question-footer"><button class="small-button" id="previous" type="button">← Previous</button><button class="small-button next" id="next" type="button">${state.index === items.length - 1 ? (state.mode === 'exam' ? 'Finish exam' : 'Finish') : 'Next question →'}</button></div>`;
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
  state.mode = 'exam'; state.topic = 'all'; state.query = ''; $('#topic-filter').value = 'all'; $('#search').value = '';
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
  else { state.mode = button.dataset.mode; state.topic = state.mode === 'learn' ? topics[0] : 'all'; state.query = state.mode === 'review' ? '' : state.query; $('#topic-filter').value = state.topic; state.index = 0; if (state.mode === 'review') { const review = questions.filter((item) => state.answers[item.id] === undefined || !isCorrect(item, state.answers[item.id])); state.examIds = review.map((item) => item.id); } document.querySelector('#exam').scrollIntoView({ behavior: 'smooth' }); render(); }
}));
$('#search').addEventListener('input', (event) => { state.query = event.target.value; state.mode = 'learn'; state.index = 0; render(); });
$('#topic-filter').addEventListener('change', (event) => { state.topic = event.target.value; state.mode = 'learn'; state.index = 0; render(); });
$('#reset-progress').addEventListener('click', () => { if (confirm('Reset all local progress?')) { state.answers = {}; save(); render(); } });
setInterval(renderExamStatus, 1000);
render();
