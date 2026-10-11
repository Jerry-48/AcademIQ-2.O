/* AcademIQ backend — Google Apps Script. Old login logger still works. */
const SHEET_ID = '1B-dXjgAWb77Xg4FVGBA-Eeu-VCbgaiBQ0WFeh8xzgRU';
const ADMIN_PASSWORD = 'CHANGE_ME_123';      // <-- badal do! Ye sirf script me rehta hai, site me nahi.
const FOLDER_NAME = 'AcademIQ PDFs';
const HEADERS = {
  Notes: ['id', 'title', 'subject', 'type', 'url', 'fileId', 'added', 'addedBy'],
  Scores: ['username', 'subject', 'score', 'total', 'date'],
  Quizzes: ['id', 'title', 'icon', 'color', 'desc', 'questions']
};
const json_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
function tab_(n) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let s = ss.getSheetByName(n);
  if (!s) { s = ss.insertSheet(n); if (HEADERS[n]) s.appendRow(HEADERS[n]); }
  return s;
}
function rows_(n) {
  const v = tab_(n).getDataRange().getValues(); const h = v.shift();
  return v.map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])));
}
function folder_() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}
function rowOf_(sheet, id) {
  const v = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === String(id)) return i + 1;
  return 0;
}
function setup() { tab_('Notes'); tab_('Scores'); tab_('Quizzes'); folder_(); } // ek baar Run karo (permissions ke liye)

function doGet(e) {
  const a = (e && e.parameter && e.parameter.action) || '';
  if (a === 'notes') return json_(rows_('Notes'));
  if (a === 'scores') return json_(rows_('Scores'));
  if (a === 'quizzes') return json_(rows_('Quizzes').map(r => ({ ...r, questions: JSON.parse(r.questions || '[]') })));
  return ContentService.createTextOutput('AcademIQ logger is working');
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents); const a = d.action;
    if (a === 'adminLogin') {
      if (d.password !== ADMIN_PASSWORD) return json_({ ok: false, error: 'password' });
      const t = Utilities.getUuid();
      CacheService.getScriptCache().put('t_' + t, '1', 21600); // 6 ghante
      return json_({ ok: true, token: t });
    }
    if (a === 'score') {
      const sc = Number(d.score), tot = Number(d.total);
      if (!(tot > 0 && tot <= 50 && sc >= 0 && sc <= tot) || !d.username || !d.subject) return json_({ ok: false, error: 'bad score' });
      tab_('Scores').appendRow([String(d.username).slice(0, 40), String(d.subject).slice(0, 100), sc, tot, new Date()]);
      return json_({ ok: true });
    }
    if (['uploadPdf', 'addNote', 'deleteNote', 'importNotes', 'saveQuiz', 'deleteQuiz', 'logins'].includes(a)) {
      if (!CacheService.getScriptCache().get('t_' + d.token)) return json_({ ok: false, error: 'auth' });
      return json_(admin_(a, d));
    }
    // purana behaviour: login log
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Logins');
    if (!sheet) throw new Error('Sheet tab "Logins" not found.');
    sheet.appendRow([new Date(), d.name || '', d.email || '', d.uid || '', d.action || 'login', d.browser || '']);
    return ContentService.createTextOutput('Data saved successfully');
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function noteRow_(title, subject, type, url, fileId, by) {
  return [Utilities.getUuid().slice(0, 8), title, subject, type, url, fileId, new Date(), by];
}
function admin_(a, d) {
  if (a === 'logins') {
    const v = tab_('Logins').getDataRange().getValues().slice(-100).reverse();
    return { ok: true, rows: v.map(r => [r[0], r[1], r[4], r[5]]) };
  }
  if (a === 'uploadPdf') {
    const f = folder_().createFile(Utilities.newBlob(Utilities.base64Decode(d.data), 'application/pdf', d.name));
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    tab_('Notes').appendRow(noteRow_(d.title || d.name.replace(/\.pdf$/i, ''), d.subject, d.type, '', f.getId(), 'admin-upload'));
    return { ok: true };
  }
  if (a === 'addNote') {
    try { DriveApp.getFileById(d.fileId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (x) { }
    tab_('Notes').appendRow(noteRow_(d.title, d.subject, d.type, '', d.fileId, 'admin-link'));
    return { ok: true };
  }
  if (a === 'importNotes') {
    const s = tab_('Notes');
    const rows = d.notes.map(n => noteRow_(n.title, n.subject, n.type, n.url, '', 'import'));
    if (rows.length) s.getRange(s.getLastRow() + 1, 1, rows.length, 8).setValues(rows);
    return { ok: true };
  }
  if (a === 'deleteNote') {
    const s = tab_('Notes'), r = rowOf_(s, d.id);
    if (!r) return { ok: false, error: 'not found' };
    const row = s.getRange(r, 1, 1, 8).getValues()[0];
    if (row[7] === 'admin-upload' && row[5]) { try { DriveApp.getFileById(row[5]).setTrashed(true); } catch (x) { } }
    s.deleteRow(r);
    return { ok: true };
  }
  if (a === 'saveQuiz') {
    const q = d.quiz, s = tab_('Quizzes'), r = rowOf_(s, q.id);
    const row = [q.id, q.title, q.icon, q.color, q.desc, JSON.stringify(q.questions)];
    if (r) s.getRange(r, 1, 1, 6).setValues([row]); else s.appendRow(row);
    return { ok: true };
  }
  if (a === 'deleteQuiz') {
    const s = tab_('Quizzes'), r = rowOf_(s, d.id);
    if (r) s.deleteRow(r);
    return { ok: true };
  }
}
