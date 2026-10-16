/* ═══════════════════════════════════════════════════════
   AcademIQ — app.js
   All site logic: Auth, Notes, Quiz, Leaderboard
═══════════════════════════════════════════════════════ */

'use strict';

/* ── Helpers ─────────────────────────────────────────── */
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let quizzesFromSheet = false;
async function api(body) {
  const r = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify(body) });
  const t = await r.text();
  try { return JSON.parse(t); } catch (e) { throw new Error('NOT_JSON: ' + t.slice(0, 80)); }
}
const pdfUrl = f => 'pdfs/' + encodeURIComponent(f); // relative path: works on any repo/site name
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3500);
}
const SUBJECTS = [
  ['applied-maths', /math/i], ['chemistry', /chem/i], ['environment', /^es[-_ ]/i], ['python', /^py[-_ ]|python/i],
  ['cpd', /^cpd/i], ['JAVA', /java/i], ['DSA', /^dsa/i], ['DLD', /^dld/i], ['PEC', /^pec/i], ['CN', /^cn[-_ ]/i]
];
const subjectOf = f => (SUBJECTS.find(([, re]) => re.test(f)) || ['other'])[0];
function typeOf(f) {
  if (/_tu\./i.test(f)) return 'Tutorial';
  if (/assign/i.test(f)) return 'Assignment';
  if (/q.?bank|[-_]qb|question/i.test(f)) return 'Question Bank';
  if (/book/i.test(f)) return 'Book';
  if (/[-_][sw]-?\d{2,4}|summer|winter|old gtu|mid/i.test(f)) return 'Paper';
  return 'Notes';
}


/* ══════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════ */


const PDF_FILES = [
  "chemistry-ch-1-notes.pdf",
  "chemistry-ch-2-notes.pdf",
  "chemistry-ch-3-notes.pdf",
  "chemistry-ch-4-notes.pdf",
  "chemistry-ch-5-notes.pdf",
  "chemistry-ch-6-notes.pdf",
  "chemistry-ch-7-notes.pdf",
  "chem_summer-2024.pdf",
  "chem_summer-2025.pdf",
  "chem_winter-2024.pdf",
  "chem_winter-2025.pdf",
  "ES QUESTION BANK.pdf",
  "Applied_mathematics_tu.1.pdf",
  "Applied_mathematics_tu.2.pdf",
  "Applied_mathematics_tu.3.pdf",
  "Applied_mathematics_unit-1-notes.pdf",
  "Applied_mathematics_unit-2-notes.pdf",
  "Applied_mathematics_unit-3-notes.pdf",
  "Applied_mathematics_unit-4-notes.pdf",
  "Applied_mathematics_unit-5-notes.pdf",
  "Applied_mathematics_assignments.pdf",
  "Applied_mathematics_important_methods.pdf",
  "PY-ASSIGNMENT-1.pdf",
  "PY-ASSIGNMENT-2.pdf",
  "PY-ASSIGNMENT-3.pdf",
  "PY-ASSIGNMENT-4.pdf",
  "PY-ASSIGNMENT-5.pdf",
  "PY-GERNAL-EXAMPLE'S.pdf",
  "PYTHON Q BANK.pdf",
  "ES-ASSIGNMENT-2.pdf",
  "ES-ASSIGNMENT-3.pdf",
  "ES-ASSIGNMENT-4.pdf",
  "ES-ASSIGNMENT-5.pdf",
  "PY-G-BOOK.pdf",
  "ES-S25.pdf",
  "ES-W25.pdf",
  "PY-S23.pdf",
  "PY-S24.pdf",
  "PY-W25.pdf",
  "CPD-Old GTU Papers-Up to S-2026.pdf",
  "JAVA-PROGRAMMING_UNIT-1_INTRODUCTION TO JAVA.pdf",
  "JAVA-PROGRAMMING_UNIT-2_Object-Oriented Programming Concepts.pdf",
  "JAVA-PROGRAMMING_UNIT-3_Inheritance, Interfaces, and Packages.pdf",
  "JAVA-PROGRAMMING_UNIT-4_Exception Handling and Multithreading.pdf",
  "JAVA-PROGRAMMING_UNIT-5_Collections & File Handling.pdf",
  "JAVA-W25.pdf",
  "JAVA-S26.pdf",
  "JAVA-UNIT2-QB-ANS.pdf",
  "JAVA-UNIT1-QB-ANS.pdf",
  "JAVA-QB.pdf",
  "JAVA-BOOK-GUJARATI.pdf",
  "JAVA(DI03032021)_MID2025-answer.pdf",
  "DLD(DI03000333).pdf",
  "DLD(DI03000111)-BOOK.pdf",
  "DLD-S26.pdf",
  "DLD-W25.pdf",
  "PEC-W25.pdf",
  "PEC-S26.pdf",
  "PEC_CH.3(ASSIGNMENT).pdf",
  "PEC_CH.2(ASSIGNMENT).pdf",
  "PEC_CH.1(ASSIGNMENT).pdf",
  "DSA-CODES.pdf",
  "DSA-MID-ANS-W2025.pdf",
  "DSA-QB.pdf",
  "DSA-REMID-ANS-W2025.pdf",
  "DSA-W25.pdf",
  "DSA-S26.pdf",
  "CN-DI03000131-Computer-Networking-AI-Content-H-D-Panchal.pdf",
  "CN-W25.pdf",
  "CN-S26.pdf",
];


let QUIZ_DATA = []; // quizzes/index.json se load hota hai


/* ══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
let currentUser = null;
let currentSection = 'home';
let currentQuiz = null;
let currentQuestionI = 0;
let userAnswers = [];
let answeredCurrent = false;

/* ══════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════ */

const IDLE_LIMIT = 30 * 60 * 1000;      // 30 min idle (activity pe reset)
const MAX_SESSION = 6 * 60 * 60 * 1000;  // 6 ghante (server token limit)
let authMode = 'login', lastActive = Date.now();

function setAuthMode(m) {
  authMode = m;
  ['regOnly', 'regOnly2'].forEach(id => document.getElementById(id).classList.toggle('hidden', m !== 'register'));
  document.getElementById('authTitle').textContent = m === 'login' ? 'Welcome Back' : 'Create Account';
  document.getElementById('authBtn').textContent = m === 'login' ? 'Sign In →' : 'Register →';
  document.getElementById('authSwitch').innerHTML = m === 'login'
    ? 'Pehli baar? <a href="#" onclick="setAuthMode(\'register\');return false">Register karo</a>'
    : 'Already registered? <a href="#" onclick="setAuthMode(\'login\');return false">Sign in</a>';
  document.getElementById('loginError').classList.add('hidden');
}

function forceLogout(message) {
  ['iq_user', 'iq_enroll', 'iq_uid', 'iq_token', 'iq_login_time', 'iq_last'].forEach(k => localStorage.removeItem(k));
  currentUser = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('loginOverlay').classList.remove('hidden');
  ['loginPassword', 'loginPassword2'].forEach(id => document.getElementById(id).value = '');
  const errorEl = document.getElementById('loginError');
  if (errorEl && message) { errorEl.textContent = message; errorEl.classList.remove('hidden'); }
}

const quizInProgress = () => !document.getElementById('quizPlayer').classList.contains('hidden');
function sessionState() {
  const token = localStorage.getItem('iq_token'), start = Number(localStorage.getItem('iq_login_time'));
  const last = Number(localStorage.getItem('iq_last')) || start;
  if (!token || !start) return 'none';
  if (Date.now() - start > MAX_SESSION) return 'max';
  if (Date.now() - last > IDLE_LIMIT && !quizInProgress()) return 'idle';
  return 'ok';
}
function checkSessionExpiry() {
  const st = sessionState();
  if (st === 'ok') return true;
  if (st === 'max') forceLogout('Session 6 ghante ka tha. Dobara login karo.');
  else if (st === 'idle') forceLogout('30 minute idle rehne se logout ho gaya. Dobara login karo.');
  else forceLogout(localStorage.getItem('iq_user') ? 'Please login again (new enrollment login).' : '');
  return false;
}
['click', 'keydown', 'touchstart', 'scroll'].forEach(ev => window.addEventListener(ev, () => {
  const n = Date.now();
  if (n - lastActive > 15000) { lastActive = n; if (localStorage.getItem('iq_token')) localStorage.setItem('iq_last', String(n)); }
}, { passive: true }));
setInterval(() => {
  if (!localStorage.getItem('iq_token')) return;
  const st = sessionState();
  if (st === 'max' || st === 'idle') { checkSessionExpiry(); return; }
  const idle = Date.now() - (Number(localStorage.getItem('iq_last')) || 0);
  if (idle > IDLE_LIMIT - 3 * 60000 && !quizInProgress() && !window._warned) { window._warned = true; toast('⏳ 3 minute me idle logout ho jayega'); }
  if (idle < 60000) window._warned = false;
}, 30000);

async function handleLogin() {
  const enroll = document.getElementById('loginEnroll').value.trim();
  const password = document.getElementById('loginPassword').value;
  const err = m => { const e = document.getElementById('loginError'); e.textContent = m; e.classList.remove('hidden'); };
  if (!/^\d{12}$/.test(enroll)) return err('Enrollment number 12 digit ka hona chahiye.');
  if (password.length < 6) return err('Password kam se kam 6 characters ka hona chahiye.');
  let name = '';
  if (authMode === 'register') {
    name = document.getElementById('loginName').value.trim();
    if (name.length < 2) return err('Apna naam likho.');
    if (password !== document.getElementById('loginPassword2').value) return err('Dono password match nahi hue.');
  }
  const btn = document.getElementById('authBtn'), label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Please wait…';
  let res = null, ex = '';
  try { res = await api({ action: authMode, enrollment: enroll, name, password, browser: navigator.userAgent }); } catch (e) { ex = e.message; console.error(e); }
  btn.disabled = false; btn.textContent = label;
  if (!res) return err(ex.startsWith('NOT_JSON') ? 'Server ne galat reply diya. config.js ka URL aur Apps Script deployment check karo. [Reply: ' + ex.slice(10).replace(/\s+/g, ' ').slice(0, 70) + ']' : 'Server se connect nahi hua. Internet ya Apps Script deployment (access: Anyone) check karo.');
  if (!res.ok) {
    return err({
      exists: '⚠️ Ye enrollment number already registered hai. Sign in karo. Agar tumne register nahi kiya, to admin ko batao.',
      notfound: 'Ye enrollment registered nahi hai. Pehle Register karo.',
      bad: 'Password galat hai.',
      locked: 'Bahut zyada galat try. 10 minute baad dobara try karo.',
      format: 'Enrollment number 12 digit ka hona chahiye.',
      invalid: 'Naam (min 2) aur password (min 6) check karo.'
    }[res.error] || 'Error: ' + res.error);
  }
  localStorage.setItem('iq_user', res.name);
  localStorage.setItem('iq_enroll', res.enrollment);
  localStorage.setItem('iq_uid', res.uid || '');
  localStorage.setItem('iq_token', res.token);
  localStorage.setItem('iq_login_time', String(Date.now()));
  localStorage.setItem('iq_last', String(Date.now()));
  document.getElementById('loginError').classList.add('hidden');
  initApp();
}

function handleLogout() { forceLogout(''); }

document.getElementById('loginEnroll').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 12); });
['loginEnroll', 'loginPassword', 'loginPassword2', 'loginName'].forEach(id =>
  document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); }));

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
function initApp() {
  const sessionIsValid =
    checkSessionExpiry();

  if (!sessionIsValid) {
    return;
  }

  const saved =
    localStorage.getItem('iq_user');

  currentUser = saved;

  document
    .getElementById('loginOverlay')
    .classList.add('hidden');

  document
    .getElementById('app')
    .classList.remove('hidden');

  document
    .getElementById('headerUsername')
    .textContent = '👤 ' + saved;

  loadScores();
  renderNotes('all');
  renderQuizSubjects();
  renderLeaderboard();
  updateHomeScore();
  renderLbFilters();
  loadNotes(); loadQuizzes();
  api({ action: 'me', token: localStorage.getItem('iq_token') }).then(r => { if (!r.ok && r.error === 'auth') forceLogout('Session khatam ho gaya. Dobara login karo.'); else if (r.ok && r.uid) { localStorage.setItem('iq_uid', r.uid); renderLeaderboard(); } }).catch(() => { });
  document.getElementById('statQuiz').textContent = QUIZ_DATA.length;
  const hsh = location.hash.slice(1);
  if (['notes', 'quiz', 'leaderboard'].includes(hsh)) navTo(hsh);
}

/* ══════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════ */
function navTo(sectionId) {
  // Hide all
  document.querySelectorAll('.section').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('active');
  });
  // Show target
  const el = document.getElementById(sectionId);
  if (el) {
    el.classList.remove('hidden');
    el.classList.add('active');
  }
  // Update nav links
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.section === sectionId);
  });
  currentSection = sectionId;
  history.replaceState(null, '', '#' + sectionId);
  // Close mobile menu
  document.getElementById('mobileMenu').classList.add('hidden');
  // Scroll top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Nav links
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navTo(link.dataset.section);
  });
});

function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('hidden');
}

/* ══════════════════════════════════════════════════════
   NOTES
══════════════════════════════════════════════════════ */
const driveView = id => `https://drive.google.com/file/d/${id}/preview`;
const driveDl = id => `https://drive.google.com/uc?export=download&id=${id}`;
const builtInNotes = () => PDF_FILES.map(f => ({ id: 'b:' + f, title: f.replace(/\.pdf$/i, ''), subject: subjectOf(f), type: typeOf(f), view: pdfUrl(f), dl: pdfUrl(f) }));
let NOTES = builtInNotes();
let notesFilter = 'all';

async function loadNotes() {
  try {
    const rows = await (await fetch(GOOGLE_SCRIPT_URL + '?action=notes')).json();
    if (Array.isArray(rows) && rows.length) NOTES = rows.map(r => ({ id: r.id, title: r.title, subject: r.subject, type: r.type, fileId: r.fileId, view: r.fileId ? driveView(r.fileId) : r.url, dl: r.fileId ? driveDl(r.fileId) : r.url }));
  } catch (e) { /* offline: built-in list stays */ }
  renderNotes();
}
async function loadQuizzes() {
  try {
    const r = await fetch('quizzes/index.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('quizzes/index.json nahi mili (HTTP ' + r.status + ')');
    QUIZ_DATA = await r.json();
  } catch (e) {
    QUIZ_DATA = [];
    console.error('loadQuizzes failed:', e);
    document.getElementById('quizSubjectGrid').innerHTML = `<p class="empty">⚠️ Quiz list load nahi hui.<br><small>${esc(e.message)}<br>Check karo: repo me <b>quizzes/</b> folder upload hua? (index.json + q-*.json + ddcet.json)</small></p>`;
    return;
  }
  await Promise.all(QUIZ_DATA.map(q => loadBank(q.id).catch(() => [])));
  document.getElementById('statQuiz').textContent = QUIZ_DATA.length;
  renderQuizSubjects(); renderLbFilters(); renderLeaderboard();
}

function renderNotes(filter = notesFilter) {
  notesFilter = filter;
  const q = (document.getElementById('notesSearch')?.value || '').trim().toLowerCase();
  const list = NOTES.filter(n => (filter === 'all' || n.subject === filter) && n.title.toLowerCase().includes(q));
  document.getElementById('notesCount').textContent = list.length + ' files';
  document.getElementById('statNotes').textContent = NOTES.length;
  document.getElementById('notesGrid').innerHTML = list.length ? list.map(n => `
    <div class="note-card">
      <div class="note-card-top">
        <div class="note-type-icon pdf">📄</div>
        <div>
          <div class="note-title">${esc(n.title)}</div>
          <div class="note-meta"><span class="note-chip">${esc(n.type)}</span>PDF</div>
        </div>
      </div>
      <div class="note-actions">
        <button class="note-btn view" data-act="view" data-id="${esc(n.id)}">👁 View</button>
        <a class="note-btn download" href="${esc(n.dl)}" target="_blank" rel="noopener">⬇ Download</a>
      </div>
    </div>`).join('') : '<p class="empty">Koi file nahi mili 🔍</p>';
}
document.getElementById('notesGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-act="view"]');
  if (b) viewNote(b.dataset.id);
});

function filterNotes(filter, btn) {
  document.querySelectorAll('#notes .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderNotes(filter);
}

function viewNote(id) {
  const n = NOTES.find(x => String(x.id) === String(id)); if (!n) return;
  const isDrive = !!n.fileId;
  if (!isDrive && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { window.open(n.view, '_blank', 'noopener'); return; }
  document.getElementById('modalTitle').textContent = n.title;
  document.getElementById('modalBody').innerHTML =
    `<iframe class="pdf-frame" src="${esc(n.view)}${isDrive ? '' : '#view=FitH'}" title="${esc(n.title)}" allow="autoplay"></iframe>
     <p class="pdf-fallback">PDF nahi dikh rahi? <a href="${esc(n.view)}" target="_blank" rel="noopener">New tab me kholo ↗</a></p>`;
  document.getElementById('noteModal').classList.remove('hidden');
}
function closeNoteModalBtn() {
  document.getElementById('noteModal').classList.add('hidden');
  document.getElementById('modalBody').innerHTML = '';
}
function closeNoteModal(e) { if (e.target === document.getElementById('noteModal')) closeNoteModalBtn(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNoteModalBtn(); });

/* ══════════════════════════════════════════════════════
   QUIZ
══════════════════════════════════════════════════════ */
const bankCache = {};
const validQ = q => q && q.q && Array.isArray(q.opts) && q.opts.length === 4 && Number.isInteger(q.ans) && q.ans >= 0 && q.ans < 4;
async function loadBank(id) {
  if (bankCache[id]) return bankCache[id];
  const meta = QUIZ_DATA.find(q => q.id === id);
  const arr = await (await fetch('quizzes/' + meta.file, { cache: 'no-cache' })).json();
  return (bankCache[id] = arr.filter(validQ));
}
function renderQuizSubjects() {
  const grid = document.getElementById('quizSubjectGrid');
  grid.innerHTML = '';
  QUIZ_DATA.forEach(quiz => {
    const n = (bankCache[quiz.id] || []).length;
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.innerHTML = `
      <div class="subject-card-icon">${esc(quiz.icon)}</div>
      <h3>${esc(quiz.title)}</h3>
      <p>${esc(quiz.desc)}</p>
      <span class="subject-count">${n ? n + ' Questions' : 'Coming soon'}</span>`;
    card.style.setProperty('--accent', quiz.color);
    if (!n) card.style.opacity = '.55';
    card.addEventListener('click', () => startQuiz(quiz.id));
    grid.appendChild(card);
  });
}

async function startQuiz(quizId) {
  const meta = QUIZ_DATA.find(q => q.id === quizId);
  let bank = [];
  try { bank = await loadBank(quizId); } catch (e) { }
  if (!bank.length) { toast('Is quiz me abhi questions nahi hain'); return; }
  const opts = [];
  for (let n = 10; n <= Math.min(100, bank.length); n += 10) opts.push(n);
  if (bank.length < 100 && !opts.includes(bank.length)) opts.push(bank.length);
  let m = document.getElementById('countModal'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'countModal'; m.className = 'modal-overlay';
  m.onclick = e => { if (e.target === m) m.remove(); };
  m.innerHTML = `<div class="modal-card" style="max-width:460px">
    <div class="modal-header"><h3>${esc(meta.title)}</h3><button class="modal-close" id="cmClose">✕</button></div>
    <div class="modal-body"><p style="margin-bottom:1rem">Kitne questions ka quiz dena hai? <span class="adm-msg">(Bank: ${bank.length})</span></p>
    <div class="count-grid">${opts.map(n => `<button class="filter-btn" data-n="${n}">${n}</button>`).join('')}</div>
    <p class="count-note">⚠️ Leaderboard me sirf ${MIN_LB}+ questions wale quiz count hote hain. Usse chhota practice hai.</p></div></div>`;
  document.body.appendChild(m);
  m.querySelector('#cmClose').onclick = () => m.remove();
  m.querySelector('.count-grid').onclick = e => { const b = e.target.closest('button'); if (b) { m.remove(); beginQuiz(meta, bank, +b.dataset.n); } };
}

function beginQuiz(meta, bank, n) { // random questions + random option order
  currentQuiz = {
    id: meta.id, title: meta.title,
    questions: shuffle(bank).slice(0, n).map(q => { const right = q.opts[q.ans]; const opts = shuffle(q.opts); return { q: q.q, opts, ans: opts.indexOf(right), exp: q.exp }; })
  };
  currentQuestionI = 0; userAnswers = []; answeredCurrent = false;
  document.getElementById('quizHome').classList.add('hidden');
  document.getElementById('quizResults').classList.add('hidden');
  document.getElementById('quizPlayer').classList.remove('hidden');
  document.getElementById('quizSubjectLabel').textContent = currentQuiz.title;
  renderQuestion();
}

function renderQuestion() {
  const q = currentQuiz.questions[currentQuestionI];
  const tot = currentQuiz.questions.length;

  document.getElementById('questionNum').textContent = `Question ${currentQuestionI + 1} of ${tot}`;
  document.getElementById('questionText').textContent = q.q;
  document.getElementById('quizProgressLabel').textContent = `${currentQuestionI + 1} / ${tot}`;
  document.getElementById('quizProgressFill').style.width = `${((currentQuestionI + 1) / tot) * 100}%`;

  const nextBtn = document.getElementById('nextBtn');
  nextBtn.textContent = currentQuestionI === tot - 1 ? 'Finish ✓' : 'Next →';
  nextBtn.disabled = true;
  answeredCurrent = false;

  const optsGrid = document.getElementById('optionsGrid');
  optsGrid.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="option-letter">${letters[i]}</span> ${opt}`;
    btn.addEventListener('click', () => selectAnswer(i));
    optsGrid.appendChild(btn);
  });
}

function selectAnswer(optIdx) {
  if (answeredCurrent) return;
  answeredCurrent = true;

  const q = currentQuiz.questions[currentQuestionI];
  const correct = q.ans;
  userAnswers.push({ selected: optIdx, correct });

  const btns = document.querySelectorAll('.option-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct) btn.classList.add('correct');
    else if (i === optIdx && i !== correct) btn.classList.add('wrong');
    else if (i === optIdx) btn.classList.add('selected');
  });

  document.getElementById('nextBtn').disabled = false;
}

function nextQuestion() {
  if (!answeredCurrent) return;
  currentQuestionI++;
  if (currentQuestionI >= currentQuiz.questions.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

function showResults() {
  document.getElementById('quizPlayer').classList.add('hidden');
  document.getElementById('quizResults').classList.remove('hidden');

  const score = userAnswers.filter(a => a.selected === a.correct).length;
  const total = currentQuiz.questions.length;
  const pct = Math.round((score / total) * 100);

  // Emoji + title
  let icon, title;
  if (pct >= 90) { icon = '🏆'; title = 'Outstanding!'; }
  else if (pct >= 70) { icon = '🎉'; title = 'Great Job!'; }
  else if (pct >= 50) { icon = '📚'; title = 'Keep Studying!'; }
  else { icon = '💪'; title = 'Don\'t Give Up!'; }

  document.getElementById('resultsIcon').textContent = icon;
  document.getElementById('resultsTitle').textContent = title;
  document.getElementById('scoreBig').textContent = score;
  document.getElementById('scoreDenom').textContent = `/ ${total}`;
  document.getElementById('scorePercent').textContent = `${pct}% Correct`;

  // Breakdown
  const breakdown = document.getElementById('resultsBreakdown');
  breakdown.innerHTML = '';
  userAnswers.forEach((a, i) => {
    const q = currentQuiz.questions[i];
    const ok = a.selected === a.correct;
    const item = document.createElement('div');
    item.className = `breakdown-item ${ok ? 'correct' : 'wrong'}`;
    item.innerHTML = `
      <span class="breakdown-icon">${ok ? '✓' : '✗'}</span>
      <div>
        <div class="breakdown-q">${esc(q.q)}</div>
        <div class="breakdown-a">
          ${ok
        ? `Correct: ${esc(q.opts[a.correct])}`
        : `Your answer: ${esc(q.opts[a.selected])} · Correct: ${esc(q.opts[a.correct])}`}
        </div>
      </div>
    `;
    breakdown.appendChild(item);
  });

  // Save score
  saveScore(score, total);
  updateHomeScore();
  renderLeaderboard();
}

function retryQuiz() {
  startQuiz(currentQuiz.id);
}

function exitQuiz() {
  document.getElementById('quizPlayer').classList.add('hidden');
  document.getElementById('quizResults').classList.add('hidden');
  document.getElementById('quizHome').classList.remove('hidden');
}

/* ══════════════════════════════════════════════════════
   LEADERBOARD & SCORES
══════════════════════════════════════════════════════ */
let scoresCache = [];
async function loadScores() {
  try { scoresCache = await (await fetch(GOOGLE_SCRIPT_URL + '?action=scores')).json(); }
  catch (e) { scoresCache = JSON.parse(localStorage.getItem('iq_scores') || '[]'); }
  updateHomeScore(); renderLeaderboard();
}
function saveScore(score, total) {
  if (!currentUser) return;
  const row = { uid: localStorage.getItem('iq_uid') || '', tag: (localStorage.getItem('iq_enroll') || '').slice(-3), username: currentUser, subject: currentQuiz.title, score, total, date: new Date().toLocaleDateString() };
  const local = JSON.parse(localStorage.getItem('iq_scores') || '[]'); local.push(row);
  localStorage.setItem('iq_scores', JSON.stringify(local));
  scoresCache.push(row);
  api({ action: 'score', token: localStorage.getItem('iq_token'), subject: row.subject, score, total }).then(() => setTimeout(loadScores, 1500)).catch(() => { });
}
function updateHomeScore() {
  if (!currentUser) return;
  const mine = scoresCache.filter(s => (myKey() ? meKey(s) === myKey() : s.username === currentUser));
  document.getElementById('homeUserScore').textContent = mine.length ? Math.max(...mine.map(s => Math.round((s.score / s.total) * 100))) + '%' : '—';
}

const MIN_LB = 20;
let lbTab = 'overall', lbSubject = '';
const meKey = s => s.uid || (s.username + '|' + (s.tag || ''));
const myKey = () => localStorage.getItem('iq_uid') || '';
const pctOf = s => s.score / s.total;
const whoHtml = s => esc(s.username) + (s.tag ? `<span class="lb-tag"> ··${esc(s.tag)}</span>` : '');

// pure function: (tab, subject, scores) -> Top 10 rows
function lbRows(tab, subject, scores) {
  const m = {};
  scores.forEach(s => {
    if (!(s.total >= MIN_LB)) return; // 20 se kam = practice
    const k = meKey(s) + '|' + s.subject, b = m[k];
    if (!b || pctOf(s) > pctOf(b) || (pctOf(s) === pctOf(b) && s.total > b.total)) m[k] = s;
  });
  const best = Object.values(m);
  if (tab === 'subject') {
    return best.filter(s => s.subject === subject).sort((a, b) => pctOf(b) - pctOf(a) || b.total - a.total).slice(0, 10)
      .map(s => ({ s, cells: [`${s.score} / ${s.total}`], pct: Math.round(pctOf(s) * 100), big: `${s.score}/${s.total}`, sub: s.subject }));
  }
  const g = {};
  best.forEach(s => { const k = meKey(s); (g[k] ||= { s, n: 0, sum: 0 }); g[k].n++; g[k].sum += pctOf(s) * 100; });
  return Object.values(g).map(x => ({ s: x.s, n: x.n, points: Math.round(x.sum), avg: Math.round(x.sum / x.n) }))
    .sort((a, b) => b.points - a.points || b.avg - a.avg).slice(0, 10)
    .map(x => ({ s: x.s, cells: [x.n, x.points], pct: x.avg, big: x.points + ' pts', sub: x.n + ' subject' + (x.n > 1 ? 's' : '') }));
}

function renderLbTabs() {
  const bar = document.getElementById('lbTabs');
  bar.innerHTML = [['overall', '🌍 Overall Top 10'], ['subject', '📚 Subject Top 10'], ['people', '👥 Participants']]
    .map(([k, l]) => `<button class="filter-btn ${k === lbTab ? 'active' : ''}" data-t="${k}">${l}</button>`).join('');
  bar.onclick = e => { const b = e.target.closest('button'); if (b) { lbTab = b.dataset.t; renderLeaderboard(); } };
}
function renderLbFilters() {
  const bar = document.getElementById('lbFilters');
  if (!QUIZ_DATA.some(q => q.title === lbSubject)) lbSubject = QUIZ_DATA[0]?.title || '';
  bar.innerHTML = QUIZ_DATA.map(q => `<button class="filter-btn ${q.title === lbSubject ? 'active' : ''}" data-s="${esc(q.title)}">${esc(q.title)}</button>`).join('');
  bar.onclick = e => { const b = e.target.closest('button'); if (b) { lbSubject = b.dataset.s; renderLbFilters(); renderLeaderboard(); } };
}

function renderLeaderboard() {
  renderLbTabs();
  document.getElementById('lbFilters').classList.toggle('hidden', lbTab !== 'subject');
  document.getElementById('lbPanelRank').classList.toggle('hidden', lbTab === 'people');
  document.getElementById('lbPanelPeople').classList.toggle('hidden', lbTab !== 'people');
  if (lbTab === 'people') return renderPeople();

  const rows = lbRows(lbTab, lbSubject, scoresCache);
  document.getElementById('lbHead').innerHTML = lbTab === 'subject'
    ? '<tr><th>Rank</th><th>Student</th><th>Score</th><th>Percentage</th></tr>'
    : '<tr><th>Rank</th><th>Student</th><th>Subjects</th><th>Points</th><th>Average</th></tr>';
  const podium = document.getElementById('podiumRow'); podium.innerHTML = '';
  const medals = ['🥇', '🥈', '🥉'];
  rows.slice(0, 3).forEach((r, i) => {
    const card = document.createElement('div');
    card.className = `podium-card p${i + 1}`;
    card.innerHTML = `<div class="podium-medal">${medals[i]}</div><div class="podium-name">${esc(r.s.username)}</div><div class="podium-score">${r.big}</div><div class="podium-subject">${esc(r.sub)}</div>`;
    podium.appendChild(card);
  });
  const tbody = document.getElementById('leaderboardBody');
  if (!rows.length) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:2rem">Abhi koi score nahi (${MIN_LB}+ questions ka quiz do) 🎯</td></tr>`; return; }
  tbody.innerHTML = rows.map((r, i) => {
    const me = myKey() && meKey(r.s) === myKey();
    return `<tr ${me ? 'style="background:rgba(245,158,11,0.05)"' : ''}>
      <td><span class="rank-badge ${i < 3 ? 'r' + (i + 1) : 'rn'}">${i + 1}</span></td>
      <td>${whoHtml(r.s)}${me ? '<span style="font-size:.7rem;color:var(--amber);margin-left:.4rem">(you)</span>' : ''}</td>
      ${r.cells.map(c => `<td style="font-family:var(--font-mono)">${c}</td>`).join('')}
      <td><div class="score-bar-wrap"><div class="score-bar-bg"><div class="score-bar-fill" style="width:${r.pct}%"></div></div><span class="score-pct-text">${r.pct}%</span></div></td></tr>`;
  }).join('');
}

function renderPeople() {
  const p = {};
  scoresCache.forEach(s => { const k = meKey(s); (p[k] ||= { s, subs: new Set(), n: 0, best: 0 }); p[k].subs.add(s.subject); p[k].n++; p[k].best = Math.max(p[k].best, pctOf(s)); });
  const list = Object.values(p).sort((a, b) => b.n - a.n || b.best - a.best);
  document.getElementById('peopleStats').innerHTML = `<span>👥 <b>${list.length}</b> students ne quiz diya</span><span>📝 <b>${scoresCache.length}</b> total attempts</span><span>📚 <b>${QUIZ_DATA.length}</b> quizzes</span>`;
  document.getElementById('peopleBody').innerHTML = list.length ? list.map((x, i) => `<tr>
    <td>${i + 1}</td><td>${whoHtml(x.s)}${myKey() && meKey(x.s) === myKey() ? ' <span style="font-size:.7rem;color:var(--amber)">(you)</span>' : ''}</td>
    <td>${[...x.subs].map(t => `<span class="subj-chip">${esc(t)}</span>`).join('')}</td><td>${x.n}</td><td>${Math.round(x.best * 100)}%</td></tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:2rem">Abhi kisi ne quiz nahi diya.</td></tr>';
}

/* ══════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════ */

window.addEventListener('DOMContentLoaded', () => {
  const saved =
    localStorage.getItem('iq_user');

  if (saved) {
    currentUser = saved;
    initApp();
  } else {
    loadScores();
  }
});