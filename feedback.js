/* AcademIQ: in-site feedback. Load AFTER app.js:  <script src="feedback.js"></script> */
(() => {
  const css = `.fb-fab{position:fixed;right:1rem;bottom:calc(1rem + env(safe-area-inset-bottom,0px));z-index:900;padding:.7rem 1.1rem;border:0;border-radius:999px;background:var(--amber,#f59e0b);color:#1a1200;font:600 .9rem system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.4)}
.fb-stars{display:flex;gap:.3rem;margin-bottom:.8rem}.fb-stars button{font-size:1.9rem;line-height:1;background:none;border:0;cursor:pointer;opacity:.3;padding:.1rem}.fb-stars button.on{opacity:1}
@media(max-width:768px){.fb-fab{padding:.6rem .9rem;font-size:.85rem}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const CATS = ['Suggestion', 'Bug', 'Content request', 'Praise', 'Other'];
  const context = () => { try { return quizInProgress() ? 'Quiz: ' + currentQuiz.title : (currentSection || 'home'); } catch (e) { return ''; } };

  function syncFab() { // show the button only while a student is signed in
    let b = document.getElementById('fbFab');
    if (!b) { b = document.createElement('button'); b.id = 'fbFab'; b.className = 'fb-fab'; b.textContent = '💬 Feedback'; b.onclick = openFeedback; document.body.appendChild(b); }
    const app = document.getElementById('app');
    b.style.display = (localStorage.getItem('iq_token') && app && !app.classList.contains('hidden')) ? '' : 'none';
  }
  setInterval(syncFab, 1000); syncFab();

  function openFeedback() {
    let m = document.getElementById('feedbackModal'); if (m) m.remove();
    let rating = 0;
    m = document.createElement('div'); m.id = 'feedbackModal'; m.className = 'modal-overlay';
    m.onclick = e => { if (e.target === m) m.remove(); };
    m.innerHTML = `<div class="modal-card" style="max-width:480px"><div class="modal-header"><h3>💬 Send feedback</h3><button class="modal-close" id="fbX">✕</button></div>
      <div class="modal-body adm-card" style="border:0;margin:0"><p class="adm-msg" style="margin-bottom:.8rem">Tell us what works and what does not. The admin reads every message.</p>
      <div class="fb-stars" id="fbStars">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n} star">⭐</button>`).join('')}</div>
      <div class="adm-row"><select id="fbCat">${CATS.map(c => `<option>${c}</option>`).join('')}</select></div>
      <div class="adm-row"><textarea id="fbMsg" rows="4" maxlength="500" placeholder="Write your feedback (max 500 characters)"></textarea></div>
      <button class="btn-primary" id="fbGo">Send</button> <span class="adm-msg" id="fbOut"></span></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#fbX').onclick = () => m.remove();
    m.querySelector('#fbStars').onclick = e => {
      const b = e.target.closest('button'); if (!b) return; rating = +b.dataset.n;
      m.querySelectorAll('#fbStars button').forEach(x => x.classList.toggle('on', +x.dataset.n <= rating));
    };
    m.querySelector('#fbGo').onclick = async () => {
      const out = m.querySelector('#fbOut'), go = m.querySelector('#fbGo'), message = m.querySelector('#fbMsg').value.trim();
      if (!rating) { out.textContent = 'Please choose a star rating.'; return; }
      if (message.length < 3) { out.textContent = 'Please write a short message.'; return; }
      go.disabled = true; out.textContent = 'Sending…';
      try {
        const r = await api({ action: 'feedback', token: localStorage.getItem('iq_token'), rating, category: m.querySelector('#fbCat').value, message, context: context() });
        if (!r.ok) throw new Error({ invalid: 'Please choose a rating and write at least 3 characters.', limit: "You have reached today's limit of 5 feedback messages.", auth: 'Your session has expired. Please sign in again.' }[r.error] || 'Something went wrong. Please try again.');
        m.remove(); toast('✅ Thank you for your feedback!');
      } catch (e) { out.textContent = '❌ ' + e.message; go.disabled = false; }
    };
  }
  window.openFeedback = openFeedback;
})();
