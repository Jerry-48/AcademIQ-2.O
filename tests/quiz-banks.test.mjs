import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(await readFile(resolve(root, 'quizzes/index.json'), 'utf8'));

test('quiz index references readable JSON banks', async () => {
  assert.ok(Array.isArray(index) && index.length > 0);
  for (const meta of index) {
    assert.ok(meta.id && meta.title && meta.file, 'quiz metadata must include id, title and file');
    const bank = JSON.parse(await readFile(resolve(root, 'quizzes', meta.file), 'utf8'));
    assert.ok(Array.isArray(bank), meta.file + ' must contain an array');
    assert.ok(bank.length > 0, meta.file + ' must not be empty');
    for (const [i, q] of bank.entries()) {
      assert.ok(q && typeof q.q === 'string' && q.q.trim(), meta.file + ' question ' + (i + 1) + ': missing question');
      assert.ok(Array.isArray(q.opts) && q.opts.length === 4, meta.file + ' question ' + (i + 1) + ': expected four options');
      assert.ok(q.opts.every(x => typeof x === 'string'), meta.file + ' question ' + (i + 1) + ': options must be strings');
      assert.ok(Number.isInteger(q.ans) && q.ans >= 0 && q.ans < 4, meta.file + ' question ' + (i + 1) + ': invalid answer index');
    }
  }
});

test('all quiz question text is rendered as text, not interpreted as HTML', async () => {
  const app = await readFile(resolve(root, 'app.js'), 'utf8');
  assert.match(app, /document\.createTextNode\(' ' \+ String\(opt\)\)/);
  assert.doesNotMatch(app, /btn\.innerHTML\s*=\s*`<span class="option-letter">\$\{letters\[i\]\}<\/span> \$\{opt\}`/);
});

test('learning-gap decisions require at least four questions', async () => {
  const app = await readFile(resolve(root, 'app.js'), 'utf8');
  assert.match(app, /const GAP_THRESHOLD = 40/);
  assert.match(app, /const MIN_TOPIC_Q = 4/);
});
