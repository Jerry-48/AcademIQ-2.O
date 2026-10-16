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


// --- Quiz Data ---
// --- Updated Quiz Data (4 Subjects, 10 Questions Each) ---
const QUIZ_DATA = [
  {
    id: 'q-maths',
    title: 'Applied Mathematics',
    icon: '📐',
    color: '#f59e0b',
    desc: 'Matrices, Derivatives & Integration',
    questions: [
      { q: 'એકમ શ્રેણિક (Identity Matrix) I ના વિકર્ણ (Diagonal) ઘટકો કયા હોય છે?', opts: ['0', '1', 'ગમે તે સંખ્યા', '-1'], ans: 1 },
      { q: 'શ્રેણિક A = [[2, 3], [1, 5]] નો નિશ્ચાયક (Determinant) શોધો.', opts: ['13', '7', '10', '11'], ans: 1 }, // (2*5 - 3*1 = 10-3 = 7)
      { q: 'Jo y = x^n hoy to dy/dx shu thay?', opts: ['nx^(n-1)', 'x^(n+1)', 'nx^n', '0'], ans: 0 },
      { q: 'જો A એ 2x3 શ્રેણિક હોય અને B એ 3x2 શ્રેણિક હોય, તો AB શ્રેણિકનો ક્રમ (Order) શું થાય?', opts: ['3x3', '2x2', '3x2', '2x3'], ans: 1 },
      { q: 'Triangle ma trijo khuno ketlo thashe jo be khuna 60° ane 60° hoy?', opts: ['90°', '60°', '45°', '180°'], ans: 1 },
      { q: 'sin²θ + cos²θ barabar ketla thay?', opts: ['0', '1', '2', 'tan²θ'], ans: 1 },
      { q: '2x + 5 = 15 hoy to x ni value shu thashe?', opts: ['10', '5', '20', '2'], ans: 1 },
      { q: 'Circle no area find karva nu sutra shu chhe?', opts: ['2πr', 'πr²', 'πd', '1/2 bh'], ans: 1 },
      { q: 'Prime number (Avibhajya sankhya) niche na mathi kai chhe?', opts: ['4', '7', '9', '10'], ans: 1 },
      { q: 'સિમેટ્રિક શ્રેણિક (Symmetric Matrix) માટે કઈ શરત સાચી છે?', opts: ['A = -A', 'A = Aᵀ', 'A = 0', 'A = I'], ans: 1 }
    ]
  },
  {
    id: 'q-chem',
    title: 'Engineering Chemistry',
    icon: '⚗️',
    color: '#0ea5e9',
    desc: 'Corrosion, Fuels, Lubricants & Polymers',
    questions: [
      { q: 'Corrosion (Kat) rokva mate kai padhdhati vapray chhe?', opts: ['Galvanizing', 'Oxidation', 'Heating', 'Cooling'], ans: 0 },
      { q: 'Electrochemical cell ma Oxidation kaya pole par thay?', opts: ['Cathode', 'Anode', 'Electrolyte', 'Salt bridge'], ans: 1 },
      { q: 'Lignite ane Anthracite niche na mathi kona prakar chhe?', opts: ['Petroleum', 'Coal', 'Natural Gas', 'Biogas'], ans: 1 },
      { q: 'Niche na mathi kayo Good Conductor chhe?', opts: ['Glass', 'Copper', 'Rubber', 'Wood'], ans: 1 },
      { q: 'LPG ma mukhya ghatak (main component) kayo hoy chhe?', opts: ['Methane', 'Butane', 'Hydrogen', 'Carbon'], ans: 1 },
      { q: 'Lubricant no mukhya upyog shu chhe?', opts: ['To increase friction', 'To reduce friction', 'To increase weight', 'To stop machine'], ans: 1 },
      { q: 'Cement ma Gypsum kem umerava ma ave chhe?', opts: ['Increase strength', 'Retard setting time', 'Give color', 'Reduce cost'], ans: 1 },
      { q: 'Hard water ne soft banavva mate kai process vapray?', opts: ['Zeolite Process', 'Filtration', 'Chlorination', 'Heating'], ans: 0 },
      { q: 'Niche na mathi kai Alloy (Mishra-dhatu) chhe?', opts: ['Iron', 'Brass', 'Gold', 'Oxygen'], ans: 1 },
      { q: 'Polymerisation process mathi shu bane chhe?', opts: ['Glass', 'Plastic', 'Steel', 'Acid'], ans: 1 }
    ]
  },
  {
    id: 'q-py',
    title: 'Python Programming',
    icon: '🐍',
    color: '#3776ab',
    desc: 'Basics, Data Types, Loops & Strings',
    questions: [
      { q: 'Python ma data print karva mate kayo function vapray?', opts: ['echo()', 'print()', 'output()', 'printf()'], ans: 1 },
      { q: 'Python ma immutable data type kayo chhe?', opts: ['List', 'Tuple', 'Dictionary', 'Set'], ans: 1 },
      { q: 'Python files nu extension shu hoy chhe?', opts: ['.py', '.python', '.pt', '.exe'], ans: 0 },
      { q: 'List mathi last element remove karva kai method vapray?', opts: ['remove()', 'pop()', 'delete()', 'clear()'], ans: 1 },
      { q: "Output of '10' + '20' in Python?", opts: ['30', '1020', 'Error', 'NaN'], ans: 1 },
      { q: 'Loop ne stop karva mate kayo keyword vapray?', opts: ['continue', 'break', 'stop', 'return'], ans: 1 },
      { q: 'List ma new item add karva mate kai method vapray?', opts: ['add()', 'append()', 'insert_last()', 'extend_one()'], ans: 1 },
      { q: 'Dictionary mate kaya bracket vapray chhe?', opts: ['[ ]', '{ }', '( )', '< >'], ans: 1 },
      { q: "len('Jerry') ni value ketli thashe?", opts: ['4', '5', '6', '0'], ans: 1 },
      { q: 'Python ma comment karva mate kayo symbol vapray?', opts: ['//', '#', '/* */', '<!-- -->'], ans: 1 }
    ]
  },
  {
    id: 'q-env',
    title: 'પર્યાવરણ અને ટકાઉપણું',
    icon: '🌍',
    color: '#10b981',
    desc: 'પરિસ્થિતિકી, પ્રદૂષણ અને પુનઃપ્રાપ્ય ઉર્જા વિશે ૧૦ પ્રશ્નો',
    questions: [
      { q: 'ઇકોલોજી (Ecology) નીચેનામાંથી કોનો અભ્યાસ છે?', opts: ['તારાઓનો', 'સજીવો અને પર્યાવરણ વચ્ચેના સંબંધોનો', 'રસાયણોનો', 'ઇતિહાસનો'], ans: 1 },
      { q: 'નીચેનામાંથી કયો અજૈવિક (Abiotic) ઘટક છે?', opts: ['વનસ્પતિ', 'પ્રાણીઓ', 'સૂર્યપ્રકાશ', 'બેક્ટેરિયા'], ans: 2 },
      { q: 'નિવસનતંત્રમાં ઉત્પાદકો (Producers) કોને કહેવાય?', opts: ['લીલી વનસ્પતિ', 'મનુષ્યો', 'સિંહ', 'મશરૂમ'], ans: 0 },
      { q: 'ઓઝોન સ્તર વાતાવરણના કયા સ્તરમાં હોય છે?', opts: ['ટ્રોપોસ્ફિયર', 'સ્ટ્રેટોસ્ફિયર', 'મેસોસ્ફિયર', 'એક્ઝોસ્ફિયર'], ans: 1 },
      { q: 'એસિડ વર્ષા માટે કયા વાયુઓ જવાબદાર છે?', opts: ['O2 અને N2', 'SO2 અને NOx', 'CO2 અને મિથેન', 'આર્ગોન અને નિયોન'], ans: 1 },
      { q: 'નીચેનામાંથી કયો કચરો કુદરતી રીતે સડતો નથી (Non-Biodegradable)?', opts: ['કાગળ', 'ફળોની છાલ', 'પ્લાસ્ટિકની બોટલ', 'લાકડું'], ans: 2 },
      { q: 'ટકાઉ વિકાસ (Sustainable Development) એટલે શું?', opts: ['માત્ર વર્તમાનનો વિકાસ', 'ભવિષ્યની જરૂરિયાતોને નુકસાન કર્યા વગરનો વિકાસ', 'ઝડપી ઔદ્યોગિક વિકાસ', 'બધી ફેક્ટરીઓ બંધ કરવી'], ans: 1 },
      { q: 'વિશ્વ પર્યાવરણ દિવસ ક્યારે ઉજવવામાં આવે છે?', opts: ['૨૬ જાન્યુઆરી', '૫ જૂન', '૧૫ ઓગસ્ટ', '૨ ઓક્ટોબર'], ans: 1 },
      { q: 'જંગલો કાપવા (Deforestation) ની મુખ્ય અસર કઈ છે?', opts: ['જમીનનું ધોવાણ', 'વધારે વરસાદ', 'ઓક્સિજનમાં વધારો', 'ઠંડુ વાતાવરણ'], ans: 0 },
      { q: 'સૌર ઉર્જા અને પવન ઉર્જા કેવા પ્રકારના સ્ત્રોત છે?', opts: ['પરંપરાગત', 'બિન-નવીનીકરણીય', 'પુનઃપ્રાપ્ય (Renewable)', 'પ્રદૂષણકારી'], ans: 2 }
    ]
  }
];


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
  ['iq_user', 'iq_enroll', 'iq_token', 'iq_login_time', 'iq_last'].forEach(k => localStorage.removeItem(k));
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
  if (!res) return err(ex.startsWith('NOT_JSON') ? 'Server ne galat reply diya. config.js ka URL aur Apps Script deployment check karo.' : 'Server se connect nahi hua. Internet ya Apps Script deployment (access: Anyone) check karo.');
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
  renderLeaderboard('all');
  updateHomeScore();
  renderLbFilters();
  loadNotes(); loadQuizzes();
  api({ action: 'me', token: localStorage.getItem('iq_token') }).then(r => { if (!r.ok && r.error === 'auth') forceLogout('Session khatam ho gaya. Dobara login karo.'); }).catch(() => { });
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
    const rows = await (await fetch(GOOGLE_SCRIPT_URL + '?action=quizzes')).json();
    if (Array.isArray(rows) && rows.length) { QUIZ_DATA.splice(0, QUIZ_DATA.length, ...rows); quizzesFromSheet = true; }
  } catch (e) { }
  document.getElementById('statQuiz').textContent = QUIZ_DATA.length;
  renderQuizSubjects(); renderLbFilters();
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
function renderQuizSubjects() {
  const grid = document.getElementById('quizSubjectGrid');
  grid.innerHTML = '';
  QUIZ_DATA.forEach(quiz => {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.innerHTML = `
      <div class="subject-card-icon">${quiz.icon}</div>
      <h3>${quiz.title}</h3>
      <p>${quiz.desc}</p>
      <span class="subject-count">${quiz.questions.length} Questions</span>
    `;
    card.style.setProperty('--accent', quiz.color);
    card.addEventListener('click', () => startQuiz(quiz.id));
    grid.appendChild(card);
  });
}

function prepareQuiz(quiz) { // random question + option order, so "always B" doesn't work
  return { ...quiz, questions: shuffle(quiz.questions).map(q => { const right = q.opts[q.ans]; const opts = shuffle(q.opts); return { q: q.q, opts, ans: opts.indexOf(right) }; }) };
}
function renderLbFilters() {
  const bar = document.getElementById('lbFilters');
  bar.innerHTML = '<button class="filter-btn active" data-s="all">All Subjects</button>' + QUIZ_DATA.map(q => `<button class="filter-btn" data-s="${esc(q.title)}">${esc(q.title)}</button>`).join('');
  bar.onclick = e => { const b = e.target.closest('button'); if (b) renderLeaderboard(b.dataset.s, b); };
}

function startQuiz(quizId) {
  currentQuiz = prepareQuiz(QUIZ_DATA.find(q => q.id === quizId));
  currentQuestionI = 0;
  userAnswers = [];
  answeredCurrent = false;

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
        <div class="breakdown-q">${q.q}</div>
        <div class="breakdown-a">
          ${ok
        ? `Correct: ${q.opts[a.correct]}`
        : `Your answer: ${q.opts[a.selected]} · Correct: ${q.opts[a.correct]}`}
        </div>
      </div>
    `;
    breakdown.appendChild(item);
  });

  // Save score
  saveScore(score, total);
  updateHomeScore();
  renderLeaderboard('all');
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
  updateHomeScore(); renderLeaderboard(currentLbFilter);
}
function saveScore(score, total) {
  if (!currentUser) return;
  const row = { username: currentUser, subject: currentQuiz.title, score, total, date: new Date().toLocaleDateString() };
  const local = JSON.parse(localStorage.getItem('iq_scores') || '[]'); local.push(row);
  localStorage.setItem('iq_scores', JSON.stringify(local));
  scoresCache.push(row);
  api({ action: 'score', token: localStorage.getItem('iq_token'), subject: row.subject, score, total }).then(() => setTimeout(loadScores, 1500)).catch(() => { });
}
function updateHomeScore() {
  if (!currentUser) return;
  const mine = scoresCache.filter(s => s.username === currentUser);
  document.getElementById('homeUserScore').textContent = mine.length ? Math.max(...mine.map(s => Math.round((s.score / s.total) * 100))) + '%' : '—';
}

let currentLbFilter = 'all';
function renderLeaderboard(filter, btn) {
  currentLbFilter = filter;
  if (btn) {
    document.querySelectorAll('#lbFilters .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  const scores = scoresCache;
  // Best score per username+subject
  const bestMap = {};
  scores.forEach(s => {
    const key = s.username + '|' + s.subject;
    if (!bestMap[key] || s.score > bestMap[key].score) bestMap[key] = s;
  });
  let entries = Object.values(bestMap);
  if (filter !== 'all') {
    entries = entries.filter(e => e.subject === filter);
  }
  // Sort by percentage desc
  entries.sort((a, b) => (b.score / b.total) - (a.score / a.total));

  // Podium (top 3)
  const podiumRow = document.getElementById('podiumRow');
  podiumRow.innerHTML = '';
  const medals = ['🥇', '🥈', '🥉'];
  const classes = ['p1', 'p2', 'p3'];
  entries.slice(0, 3).forEach((e, i) => {
    const card = document.createElement('div');
    card.className = `podium-card ${classes[i]}`;
    card.innerHTML = `
      <div class="podium-medal">${medals[i]}</div>
      <div class="podium-name">${esc(e.username)}</div>
      <div class="podium-score">${e.score}/${e.total}</div>
      <div class="podium-subject">${esc(e.subject)}</div>
    `;
    podiumRow.appendChild(card);
  });

  // Table
  const tbody = document.getElementById('leaderboardBody');
  tbody.innerHTML = '';
  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:2rem">No scores yet. Take a quiz!</td></tr>`;
    return;
  }

  entries.forEach((e, i) => {
    const pct = Math.round((e.score / e.total) * 100);
    const rank = i + 1;
    const rClass = rank <= 3 ? `r${rank}` : 'rn';
    const row = document.createElement('tr');
    // Highlight current user
    if (currentUser && e.username === currentUser) {
      row.style.background = 'rgba(245,158,11,0.05)';
    }
    row.innerHTML = `
      <td><span class="rank-badge ${rClass}">${rank}</span></td>
      <td>
        ${esc(e.username)}
        ${currentUser && e.username === currentUser ? '<span style="font-size:.7rem;color:var(--amber);margin-left:.4rem">(you)</span>' : ''}
      </td>
      <td>${esc(e.subject)}</td>
      <td style="font-family:var(--font-mono)">${e.score} / ${e.total}</td>
      <td>
        <div class="score-bar-wrap">
          <div class="score-bar-bg">
            <div class="score-bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="score-pct-text">${pct}%</span>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
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