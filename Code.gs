/* AcademIQ v3 backend — PHASE 1: enrollment register/login, sessions, scores
   Naye Google Sheet ka ID neeche daalo. Purana Sheet/Script untouched rahega. */
const SHEET_ID = 'PASTE_NEW_SHEET_ID_HERE';
const SESSION_SECS = 21600; // 6 ghante (CacheService ki max limit)
const HEADERS = {
  Users: ['enrollment', 'name', 'salt', 'hash', 'created', 'lastLogin'],
  Logins: ['time', 'enrollment', 'name', 'action', 'browser'],
  Scores: ['enrollment', 'name', 'subject', 'score', 'total', 'date']
};
const TEXTCOL = { Users: 'A:A', Logins: 'B:B', Scores: 'A:A' }; // enrollment ko text rakhne ke liye

const json_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const cache_ = () => CacheService.getScriptCache();

function tab_(n) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
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
  cache_().put('s_' + token, JSON.stringify({ e: enr, n: name }), SESSION_SECS);
  return { ok: true, token, name, enrollment: enr };
}
function sess_(token) { const v = token && cache_().get('s_' + token); return v ? JSON.parse(v) : null; }

function doGet(e) {
  const a = (e && e.parameter && e.parameter.action) || '';
  if (a === 'scores') {
    const v = tab_('Scores').getDataRange().getValues(); v.shift();
    return json_(v.map(r => ({ username: r[1], tag: String(r[0]).slice(-3), subject: r[2], score: r[3], total: r[4], date: r[5] })));
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
    const ss = sess_(d.token);
    if (!ss) return json_({ ok: false, error: 'auth' });
    if (a === 'me') return json_({ ok: true, name: ss.n, enrollment: ss.e });
    if (a === 'score') {
      const sc = Number(d.score), tot = Number(d.total), sub = String(d.subject || '').slice(0, 100);
      if (!(tot > 0 && tot <= 100 && sc >= 0 && sc <= tot) || !sub) return json_({ ok: false, error: 'bad score' });
      tab_('Scores').appendRow([ss.e, ss.n, sub, sc, tot, new Date()]);
      return json_({ ok: true });
    }
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) { return json_({ ok: false, error: String(err.message || err) }); }
}
