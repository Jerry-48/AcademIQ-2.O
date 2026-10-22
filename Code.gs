/* AcademIQ v3 backend — PHASE 1: enrollment register/login, sessions, scores
   Naye Google Sheet ka ID neeche daalo. Purana Sheet/Script untouched rahega. */
const SHEET_ID = ''; // Script Sheet ke andar (Extensions → Apps Script) se khola hai to KHALI chhodo. Alag script ho to Sheet ki ID quotes ke andar daalo.
const SESSION_SECS = 21600; // 6 ghante (CacheService ki max limit)
const HEADERS = {
  Users: ['enrollment', 'name', 'salt', 'hash', 'created', 'lastLogin'],
  Logins: ['time', 'enrollment', 'name', 'action', 'browser'],
  Scores: ['enrollment', 'name', 'subject', 'score', 'total', 'date'],
  Tracking: ['time', 'enrollment', 'name', 'quiz', 'score', 'total', 'percent', 'weakTopics', 'breakdown'],
  Notes: ['id', 'title', 'subject', 'type', 'fileId', 'kind', 'enrollment', 'byName', 'added', 'status']
};
const ADMIN_PASSWORD = 'CHANGE_ME_123'; // <-- badal do (sirf script me rehta hai)
const ROOT_FOLDER = 'AcademIQ PDFs';
const SUBJ_KEYS = ['applied-maths', 'chemistry', 'environment', 'python', 'cpd', 'JAVA', 'DSA', 'DLD', 'PEC', 'CN', 'communication', 'physics', 'electronics'];
const TEXTCOL = { Users: 'A:A', Logins: 'B:B', Scores: 'A:A', Notes: 'G:G', Tracking: 'B:B' }; // enrollment ko text rakhne ke liye

const json_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const cache_ = () => CacheService.getScriptCache();

function tab_(n) {
  const ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet not found. Set SHEET_ID.');
  let s = ss.getSheetByName(n);
  if (!s) { s = ss.insertSheet(n); s.getRange(TEXTCOL[n]).setNumberFormat('@'); s.appendRow(HEADERS[n]); }
  return s;
}
function setup() { Object.keys(HEADERS).forEach(tab_); } // ek baar Run karo
function hash_(salt, pw) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + pw)); }
function log_(enr, name, action, browser) { tab_('Logins').appendRow([new Date(), enr, name, action, String(browser || '').slice(0, 200)]); }
function userRow_(s, enr) {
  const n = s.getLastRow(); if (n < 2) return 0;
  const v = s.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < v.length; i++) if (String(v[i][0]) === enr) return i + 2;
  return 0;
}
function session_(enr, name) {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  const old = cache_().get('c_' + enr);                       // one active session per enrollment:
  if (old) cache_().put('r_' + old, '1', SESSION_SECS);        // mark the previous device as replaced
  cache_().put('c_' + enr, token, SESSION_SECS);
  cache_().put('s_' + token, JSON.stringify({ e: enr, n: name }), SESSION_SECS);
  return { ok: true, token, name, enrollment: enr, uid: uid_(enr) };
}
function uid_(enr) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'aq|' + enr)).slice(0, 10); } // public id (enrollment chhupa rehta hai)
function sess_(token) {
  const v = token && cache_().get('s_' + token); if (!v) return null;
  const o = JSON.parse(v), cur = cache_().get('c_' + o.e);
  return (cur && cur !== token) ? null : o;                    // a newer login invalidates this token
}

const clean_ = (s, n) => String(s || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, n);
function folder_(name) {
  const it0 = DriveApp.getFoldersByName(ROOT_FOLDER), root = it0.hasNext() ? it0.next() : DriveApp.createFolder(ROOT_FOLDER);
  const it = root.getFoldersByName(name); return it.hasNext() ? it.next() : root.createFolder(name);
}
function rowById_(s, id) {
  const n = s.getLastRow(); if (n < 2) return 0;
  const v = s.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < v.length; i++) if (String(v[i][0]) === String(id)) return i + 2;
  return 0;
}
function notes_(status) {
  const v = tab_('Notes').getDataRange().getValues(); v.shift();
  return v.filter(r => r[9] === status).map(r => ({ id: r[0], title: r[1], subject: r[2], type: r[3], fileId: r[4], kind: r[5], enrollment: r[6], by: r[7], added: r[8] }));
}
function adminAct_(a, d) {
  if (a === 'gaps') {
    const v = tab_('Tracking').getDataRange().getValues(); v.shift();
    return { ok: true, rows: v.slice(-500).reverse().map(r => ({ time: r[0], enrollment: r[1], name: r[2], quiz: r[3], score: r[4], total: r[5], pct: r[6], weak: r[7] })) };
  }
  const s = tab_('Notes');
  if (a === 'pending' || a === 'approved') return { ok: true, rows: notes_(a) };
  if (a === 'approve') { const r = rowById_(s, d.id); if (!r) return { ok: false, error: 'not found' }; s.getRange(r, 10).setValue('approved'); return { ok: true }; }
  if (a === 'reject' || a === 'deleteNote') {
    const r = rowById_(s, d.id); if (!r) return { ok: false, error: 'not found' };
    const row = s.getRange(r, 1, 1, 10).getValues()[0];
    if (row[5] === 'upload' && row[4]) { try { DriveApp.getFileById(row[4]).setTrashed(true); } catch (x) { } }
    s.deleteRow(r); return { ok: true };
  }
  if (a === 'users') { const v = tab_('Users').getDataRange().getValues(); v.shift(); return { ok: true, rows: v.map(r => ({ enrollment: r[0], name: r[1], created: r[4], lastLogin: r[5] })) }; }
  if (a === 'resetUser') { const u = tab_('Users'), r = userRow_(u, String(d.enrollment)); if (r) u.deleteRow(r); return { ok: true }; }
  if (a === 'logins') { const v = tab_('Logins').getDataRange().getValues().slice(-100).reverse(); return { ok: true, rows: v }; }
}

function doGet(e) {
  const a = (e && e.parameter && e.parameter.action) || '';
  if (a === 'notes') return json_(notes_('approved').map(n => ({ id: n.id, title: n.title, subject: n.subject, type: n.type, fileId: n.fileId, by: n.by, added: n.added })));
  if (a === 'scores') {
    const v = tab_('Scores').getDataRange().getValues(); v.shift();
    return json_(v.map(r => ({ uid: uid_(String(r[0])), username: r[1], tag: String(r[0]).slice(-3), subject: r[2], score: r[3], total: r[4], date: r[5] })));
  }
  return ContentService.createTextOutput('AcademIQ v3 backend is working');
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents), a = d.action, enr = String(d.enrollment || '').trim();
    if (a === 'register') {
      if (!/^\d{12}$/.test(enr)) return json_({ ok: false, error: 'format' });
      const name = String(d.name || '').trim().slice(0, 40), pw = String(d.password || '');
      if (name.length < 2 || pw.length < 6 || pw.length > 64) return json_({ ok: false, error: 'invalid' });
      const lock = LockService.getScriptLock(); lock.waitLock(10000);
      try {
        const s = tab_('Users');
        if (userRow_(s, enr)) { log_(enr, name, 'register-duplicate', d.browser); return json_({ ok: false, error: 'exists' }); }
        const salt = Utilities.getUuid();
        s.appendRow([enr, name, salt, hash_(salt, pw), new Date(), new Date()]);
      } finally { lock.releaseLock(); }
      log_(enr, name, 'register', d.browser);
      return json_(session_(enr, name));
    }
    if (a === 'login') {
      if (!/^\d{12}$/.test(enr)) return json_({ ok: false, error: 'format' });
      const fk = 'f_' + enr, fails = Number(cache_().get(fk) || 0);
      if (fails >= 5) return json_({ ok: false, error: 'locked' });
      const s = tab_('Users'), r = userRow_(s, enr);
      if (!r) return json_({ ok: false, error: 'notfound' });
      const row = s.getRange(r, 1, 1, 6).getValues()[0];
      if (hash_(row[2], String(d.password || '')) !== row[3]) {
        cache_().put(fk, String(fails + 1), 600); log_(enr, row[1], 'login-fail', d.browser);
        return json_({ ok: false, error: 'bad' });
      }
      cache_().remove(fk); s.getRange(r, 6).setValue(new Date()); log_(enr, row[1], 'login', d.browser);
      return json_(session_(enr, row[1]));
    }
    if (a === 'adminLogin') {
      const fk = 'af', fails = Number(cache_().get(fk) || 0);
      if (fails >= 5) return json_({ ok: false, error: 'locked' });
      if (d.password !== ADMIN_PASSWORD) { cache_().put(fk, String(fails + 1), 600); return json_({ ok: false, error: 'bad' }); }
      const t = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
      cache_().put('a_' + t, '1', 21600); return json_({ ok: true, token: t });
    }
    if (['pending', 'approved', 'approve', 'reject', 'deleteNote', 'users', 'resetUser', 'logins', 'gaps'].includes(a)) {
      if (!cache_().get('a_' + d.token)) return json_({ ok: false, error: 'auth' });
      return json_(adminAct_(a, d));
    }
    const ss = sess_(d.token);
    if (!ss) return json_({ ok: false, error: cache_().get('r_' + d.token) ? 'replaced' : 'auth' });
    if (a === 'me') return json_({ ok: true, name: ss.n, enrollment: ss.e, uid: uid_(ss.e) });
    if (a === 'score') {
      const sc = Number(d.score), tot = Number(d.total), sub = String(d.subject || '').slice(0, 100);
      if (!(tot > 0 && tot <= 100 && sc >= 0 && sc <= tot) || !sub) return json_({ ok: false, error: 'bad score' });
      tab_('Scores').appendRow([ss.e, ss.n, sub, sc, tot, new Date()]);
      // Teacher tracking: [student, score, weak topics] + topic breakdown
      const weak = (Array.isArray(d.weak) ? d.weak : []).slice(0, 10).map(x => clean_(x, 60)).filter(Boolean);
      const bd = (Array.isArray(d.topics) ? d.topics : []).slice(0, 20).map(x => ({ t: clean_(x && x.t, 60), c: Number(x && x.c) || 0, n: Number(x && x.n) || 0 }));
      tab_('Tracking').appendRow([new Date(), ss.e, ss.n, sub, sc, tot, Math.round(sc / tot * 100), weak.join(', '), JSON.stringify(bd)]);
      return json_({ ok: true });
    }
    if (a === 'submitNote') {
      const subj = clean_(d.subject, 45), type = clean_(d.type, 20), title = clean_(d.title, 80);
      if (!(SUBJ_KEYS.includes(subj) || (/^f:/.test(subj) && subj.length > 3))) return json_({ ok: false, error: 'subject' });
      const nv = tab_('Notes').getDataRange().getValues(); nv.shift();
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (nv.filter(r => String(r[6]) === ss.e && new Date(r[8]) >= today).length >= 5) return json_({ ok: false, error: 'limit' });
      let fileId = '', kind = 'link', ttl = title;
      if (d.data) {
        const bytes = Utilities.base64Decode(d.data);
        if (bytes.length > 10 * 1024 * 1024) return json_({ ok: false, error: 'size' });
        if (!(bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70)) return json_({ ok: false, error: 'notpdf' });
        const fname = clean_(d.name, 100) || 'note.pdf';
        const f = folder_(subj.startsWith('f:') ? clean_(subj.slice(2), 40) : subj).createFile(Utilities.newBlob(bytes, 'application/pdf', fname));
        f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileId = f.getId(); kind = 'upload'; ttl = ttl || fname.replace(/\.pdf$/i, '');
      } else {
        fileId = String(d.fileId || '');
        if (!/^[\w-]{20,80}$/.test(fileId)) return json_({ ok: false, error: 'link' });
        try { DriveApp.getFileById(fileId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (x) { }
      }
      tab_('Notes').appendRow([Utilities.getUuid().slice(0, 8), ttl || 'Untitled', subj, type, fileId, kind, ss.e, ss.n, new Date(), 'pending']);
      return json_({ ok: true });
    }
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) { return json_({ ok: false, error: String(err.message || err) }); }
}
