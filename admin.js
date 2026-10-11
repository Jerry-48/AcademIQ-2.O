/* AcademIQ — Admin panel (notes, quizzes, logins). Loaded after app.js */
'use strict';
const $ = id => document.getElementById(id);
const SUBJ_OPTS = [['applied-maths', 'Applied Maths'], ['chemistry', 'Chemistry'], ['environment', 'Environment'], ['python', 'Python'], ['cpd', 'CPD'], ['JAVA', 'JAVA'], ['DSA', 'DSA'], ['DLD', 'DLD'], ['PEC', 'PEC'], ['CN', 'CN']];
const TYPE_OPTS = ['Notes', 'Paper', 'Assignment', 'Question Bank', 'Book', 'Tutorial'];
let admTab = 'notes', editQuiz = null;

function applyAdminUI() { document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !isAdmin)); }

async function adm(action, data = {}) {
  const r = await api({ action, token: adminToken, ...data });
  if (!r.ok) {
    if (r.error === 'auth') { forceLogout('Admin session expire ho gaya. Dobara login karo.'); }
    throw new Error(r.error || 'failed');
  }
  return r;
}
const toB64 = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.onerror = no; r.readAsDataURL(f); });

function renderAdmin() {
  if (!isAdmin) { navTo('home'); return; }
  const tabs = [['notes', '📄 Notes'], ['quizzes', '🧠 Quizzes'], ['logins', '👤 Logins']];
  const bar = $('adminTabs');
  bar.innerHTML = tabs.map(([k, l]) => `<button class="filter-btn ${k === admTab ? 'active' : ''}" data-t="${k}">${l}</button>`).join('');
  bar.onclick = e => { const b = e.target.closest('button'); if (b) { admTab = b.dataset.t; editQuiz = null; renderAdmin(); } };
  ({ notes: admNotes, quizzes: admQuizzes, logins: admLogins })[admTab]();
}

/* ── Notes ───────────────────────────────────────────── */
function admNotes() {
  const builtinOnly = NOTES.every(n => String(n.id).startsWith('b:'));
  $('adminBody').innerHTML = `
    <div class="adm-card"><h3>➕ Naya note</h3>
      <div class="adm-row"><input id="anTitle" placeholder="Title (khali = file name)">
        <select id="anSubj">${SUBJ_OPTS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
        <select id="anType">${TYPE_OPTS.map(t => `<option>${t}</option>`).join('')}</select></div>
      <div class="adm-row"><input type="file" id="anFile" accept="application/pdf"><span style="align-self:center">ya</span><input id="anLink" placeholder="Google Drive share link"></div>
      <button class="btn-primary" id="anBtn">Upload / Add</button> <span class="adm-msg" id="anMsg"></span></div>
    <div class="adm-card"><h3>Saare notes (${NOTES.length})</h3>
      ${builtinOnly ? `<p class="adm-msg">Abhi ye list site ke built-in PDFs se aa rahi hai. Delete/edit karne ke liye pehle import karo.</p><button class="btn-ghost-sm" id="anImport">Built-in PDFs Sheet me import karo</button>` : ''}
      <div class="adm-table-wrap"><table class="adm-table"><tbody>${NOTES.map(n => `<tr><td>${esc(n.title)}</td><td>${esc(n.type)}</td><td>${esc(n.subject)}</td><td>${String(n.id).startsWith('b:') ? '' : `<button class="adm-del" data-del="${esc(n.id)}">Delete</button>`}</td></tr>`).join('')}</tbody></table></div></div>`;
  const msg = t => { $('anMsg').textContent = t; };
  $('anBtn').onclick = async () => {
    const f = $('anFile').files[0], link = $('anLink').value.trim(), title = $('anTitle').value.trim();
    const subject = $('anSubj').value, type = $('anType').value;
    if (!f && !link) { msg('PDF choose karo ya Drive link do'); return; }
    $('anBtn').disabled = true; msg('Ho raha hai… (badi file me time lagta hai)');
    try {
      if (f) {
        if (f.size > 15 * 1024 * 1024) throw new Error('File 15 MB se badi hai');
        await adm('uploadPdf', { name: f.name, data: await toB64(f), title, subject, type });
      } else {
        const id = (link.match(/[-\w]{25,}/) || [])[0];
        if (!id) throw new Error('Drive link sahi nahi lag raha');
        await adm('addNote', { title: title || 'Untitled', subject, type, fileId: id });
      }
      toast('✅ Note add ho gaya'); await loadNotes(); admNotes();
    } catch (e) { msg('❌ ' + e.message); $('anBtn').disabled = false; }
  };
  const imp = $('anImport');
  if (imp) imp.onclick = async () => {
    imp.disabled = true;
    try { await adm('importNotes', { notes: builtInNotes().map(n => ({ title: n.title, subject: n.subject, type: n.type, url: n.view })) }); toast('✅ Import ho gaya'); await loadNotes(); admNotes(); }
    catch (e) { toast('❌ ' + e.message); imp.disabled = false; }
  };
  $('adminBody').onclick = async e => {
    const b = e.target.closest('[data-del]'); if (!b || !confirm('Ye note delete karna hai?')) return;
    try { await adm('deleteNote', { id: b.dataset.del }); toast('🗑 Delete ho gaya'); await loadNotes(); admNotes(); } catch (x) { toast('❌ ' + x.message); }
  };
}

/* ── Quizzes ─────────────────────────────────────────── */
function admQuizzes() {
  if (editQuiz) return admQuizEditor();
  const el = $('adminBody');
  if (!quizzesFromSheet) {
    el.innerHTML = `<div class="adm-card"><p class="adm-msg">Quizzes abhi code se aa rahe hain. Edit karne ke liye pehle Sheet me import karo (ek baar).</p><button class="btn-primary" id="aqImport">Built-in quizzes import karo</button></div>`;
    $('aqImport').onclick = async () => {
      try { for (const q of QUIZ_DATA) await adm('saveQuiz', { quiz: q }); toast('✅ Import ho gaya'); await loadQuizzes(); admQuizzes(); } catch (e) { toast('❌ ' + e.message); }
    };
    return;
  }
  el.innerHTML = `<div class="adm-card"><button class="btn-primary" id="aqNew">➕ Naya quiz</button></div>` +
    QUIZ_DATA.map((q, i) => `<div class="adm-card"><div class="adm-row" style="justify-content:space-between;align-items:center"><strong>${esc(q.icon)} ${esc(q.title)} <span class="adm-msg">(${q.questions.length} questions)</span></strong><span><button class="btn-ghost-sm" data-edit="${i}">✏️ Edit</button> <button class="adm-del" data-qdel="${i}">Delete</button></span></div></div>`).join('');
  $('aqNew').onclick = () => { editQuiz = { id: 'q-' + Date.now().toString(36), title: '', icon: '📘', color: '#f59e0b', desc: '', questions: [] }; admQuizzes(); };
  el.onclick = async e => {
    const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-qdel]');
    if (ed) { editQuiz = JSON.parse(JSON.stringify(QUIZ_DATA[+ed.dataset.edit])); admQuizzes(); }
    if (dl && confirm('Ye quiz delete karna hai?')) {
      try { await adm('deleteQuiz', { id: QUIZ_DATA[+dl.dataset.qdel].id }); await loadQuizzes(); admQuizzes(); } catch (x) { toast('❌ ' + x.message); }
    }
  };
}

function drawQs() {
  $('aeQs').innerHTML = editQuiz.questions.map((x, i) => `<div class="adm-q"><div class="adm-row"><input class="qq" value="${esc(x.q)}" placeholder="Question ${i + 1}"><button class="adm-del" data-del="${i}">✕</button></div>${[0, 1, 2, 3].map(j => `<div class="adm-row"><label style="align-self:center;white-space:nowrap"><input type="radio" name="r${i}" value="${j}" ${x.ans === j ? 'checked' : ''}> ${'ABCD'[j]}</label><input class="qo" value="${esc(x.opts[j] || '')}"></div>`).join('')}</div>`).join('') || '<p class="empty">Koi question nahi. ➕ dabao.</p>';
}
function syncQs() {
  editQuiz.title = $('aeTitle').value.trim(); editQuiz.icon = $('aeIcon').value.trim() || '📘'; editQuiz.color = $('aeColor').value; editQuiz.desc = $('aeDesc').value.trim();
  editQuiz.questions = [...$('aeQs').querySelectorAll('.adm-q')].map(d => ({
    q: d.querySelector('.qq').value.trim(), opts: [...d.querySelectorAll('.qo')].map(i => i.value.trim()),
    ans: +(d.querySelector('input[type=radio]:checked')?.value ?? 0)
  }));
}
function parseBulk(t) {
  return t.split(/\n\s*\n/).map(b => {
    const L = b.trim().split('\n').map(s => s.trim()).filter(Boolean);
    const ansL = L.find(l => /^(ans|answer)\s*[:=]/i.test(l));
    const optL = L.filter(l => /^[A-D][).:]\s*/i.test(l));
    const qText = L.filter(l => l !== ansL && !optL.includes(l)).join(' ');
    if (!ansL || optL.length !== 4 || !qText) return null;
    return { q: qText, opts: optL.map(l => l.replace(/^[A-D][).:]\s*/i, '')), ans: 'ABCD'.indexOf(ansL.split(/[:=]/)[1].trim()[0].toUpperCase()) };
  }).filter(x => x && x.ans >= 0);
}
function admQuizEditor() {
  const q = editQuiz;
  $('adminBody').onclick = null;
  $('adminBody').innerHTML = `
    <div class="adm-card"><div class="adm-row"><input id="aeTitle" value="${esc(q.title)}" placeholder="Quiz title"><input id="aeIcon" value="${esc(q.icon)}" style="max-width:90px"><input id="aeColor" type="color" value="${esc(q.color)}" style="max-width:70px;padding:0"></div>
      <div class="adm-row"><input id="aeDesc" value="${esc(q.desc)}" placeholder="Short description"></div></div>
    <div id="aeQs"></div>
    <div class="adm-card"><button class="btn-ghost-sm" id="aeAdd">➕ Question</button> <button class="btn-ghost-sm" id="aeBulk">📋 Bulk paste</button>
      <div id="aeBulkBox" class="hidden" style="margin-top:.8rem"><textarea id="aeBulkTxt" rows="9" placeholder="Question text?\nA) option 1\nB) option 2\nC) option 3\nD) option 4\nAnswer: B\n\n(question ke beech me ek khaali line)"></textarea><br><button class="btn-primary" id="aeBulkGo" style="margin-top:.6rem">Add karo</button></div></div>
    <button class="btn-primary" id="aeSave">💾 Save quiz</button> <button class="btn-ghost-sm" id="aeBack">← Back</button> <span class="adm-msg" id="aeMsg"></span>`;
  drawQs();
  $('aeQs').onclick = e => { const b = e.target.closest('[data-del]'); if (b) { syncQs(); editQuiz.questions.splice(+b.dataset.del, 1); drawQs(); } };
  $('aeAdd').onclick = () => { syncQs(); editQuiz.questions.push({ q: '', opts: ['', '', '', ''], ans: 0 }); drawQs(); };
  $('aeBulk').onclick = () => $('aeBulkBox').classList.toggle('hidden');
  $('aeBulkGo').onclick = () => {
    const add = parseBulk($('aeBulkTxt').value);
    if (!add.length) { $('aeMsg').textContent = '❌ Format samajh nahi aaya (4 options + Answer chahiye)'; return; }
    syncQs(); editQuiz.questions.push(...add); drawQs(); $('aeBulkTxt').value = ''; $('aeBulkBox').classList.add('hidden'); $('aeMsg').textContent = add.length + ' questions add hue';
  };
  $('aeBack').onclick = () => { editQuiz = null; admQuizzes(); };
  $('aeSave').onclick = async () => {
    syncQs();
    if (!editQuiz.title) { $('aeMsg').textContent = '❌ Title likho'; return; }
    if (!editQuiz.questions.length) { $('aeMsg').textContent = '❌ Kam se kam 1 question chahiye'; return; }
    const bad = editQuiz.questions.findIndex(x => !x.q || x.opts.some(o => !o));
    if (bad >= 0) { $('aeMsg').textContent = `❌ Question ${bad + 1} me question ya koi option khaali hai`; return; }
    $('aeSave').disabled = true;
    try { await adm('saveQuiz', { quiz: editQuiz }); toast('✅ Quiz save ho gaya'); await loadQuizzes(); editQuiz = null; admQuizzes(); }
    catch (e) { $('aeMsg').textContent = '❌ ' + e.message; $('aeSave').disabled = false; }
  };
}

/* ── Logins ──────────────────────────────────────────── */
async function admLogins() {
  $('adminBody').onclick = null;
  $('adminBody').innerHTML = '<div class="adm-card"><p class="adm-msg">Load ho raha hai…</p></div>';
  try {
    const r = await adm('logins');
    $('adminBody').innerHTML = `<div class="adm-card"><h3>Last ${r.rows.length} logins</h3><div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Browser</th></tr></thead><tbody>${r.rows.map(x => `<tr><td>${esc(new Date(x[0]).toLocaleString())}</td><td>${esc(x[1])}</td><td>${esc(x[2])}</td><td>${esc(String(x[3]).slice(0, 60))}</td></tr>`).join('')}</tbody></table></div></div>`;
  } catch (e) { $('adminBody').innerHTML = `<div class="adm-card"><p class="adm-msg">❌ ${esc(e.message)}</p></div>`; }
}
