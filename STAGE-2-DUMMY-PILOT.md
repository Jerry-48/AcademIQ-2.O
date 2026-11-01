# Stage 2 — Dummy pilot hardening

This branch is an isolated implementation candidate. It is not deployed and must not be merged into `main` until the backend work and pilot checks below pass.

## Changes made

- Quiz option labels and option content are built with DOM text nodes. Quiz text containing HTML-like characters is displayed literally.
- Topic-level learning gaps now require at least four answered questions and use a provisional threshold below 40%.
- Learning reports explicitly say when there is insufficient topic data instead of claiming that no gaps were found.
- Score synchronization failures are surfaced to the student; the local result remains available.
- Service-worker offline fallback now returns the app shell only for navigation requests. Missing JSON/JS/CSS resources return an explicit 503 instead of receiving `index.html`.
- Service-worker cache version incremented to `academiq-v2`.

## Backend work still required before dummy pilot

The Phase 1 Apps Script source was supplied in chat, but it is not present in the public repository. Do not deploy this branch as a complete release until a reviewed, versioned backend source is added and deployed to a separate test spreadsheet.

Required backend changes:
1. Public `?action=scores` must not return student names, enrollment fragments, or stable enrollment-derived identifiers. Use random public display IDs / aliases and expose only the minimum leaderboard fields.
2. `submitNote` must not change sharing permissions on arbitrary Drive file IDs. Accept uploads into a dedicated test folder; treat external Drive links as references without changing their permissions.
3. `resetUser` must revoke the active session and ensure a deleted/reset enrollment cannot continue using an old token. Check user existence on authenticated actions or maintain a revocation/version mechanism.
4. Replace fast SHA-256 password hashing with a password-storage design suitable for Apps Script; do not claim that a plain SHA-256 digest is password-hardening.
5. Protect all user-controlled text written to Sheets from formula interpretation. Preserve the original text safely.
6. Add admin action audit records and an explicit admin token revocation/logout mechanism.
7. Validate score topic counts and breakdown fields server-side; constrain topic count, labels, and numeric ranges.
8. Do not expose raw exception messages to unauthenticated clients. Log diagnostic details privately and return generic errors.
9. Add a test-only configuration guard so the dummy pilot cannot accidentally write to the production spreadsheet or Drive folder.

## Test status

- Quiz bank JSON was read from the branch and structurally inspected: 9 active banks, 345 questions total, valid JSON arrays, four options per question, and valid answer indexes.
- All 40 questions in `q-foe.json` currently lack topic tags. Learning-gap reports for that bank will therefore group them under the fallback topic; do not interpret this as detailed topic-level diagnosis.
- Automated Node tests were added in `tests/quiz-banks.test.mjs`, but have not been executed in a Node runtime in this session.
- Browser integration, Apps Script deployment, Google Sheets, Drive permission, and multi-device session tests have not been run.

## Dummy pilot acceptance checklist

Use a separate test spreadsheet and a dedicated test Drive folder. Never use real student accounts or production data during this phase.

- [ ] Create two dummy student accounts and one admin test account.
- [ ] Register, login, wrong-password lockout, logout, and re-login.
- [ ] Login from a second device and confirm the first session is invalidated.
- [ ] Reset a dummy account and confirm every previous token is rejected.
- [ ] Submit scores at boundary values (0, total, invalid negative, over-total, total 0, total >100).
- [ ] Confirm private student data cannot be retrieved from the public leaderboard.
- [ ] Submit a PDF and confirm its sharing policy matches the intended pilot policy.
- [ ] Submit a Drive file ID that belongs to a dummy private file and confirm its sharing permissions are unchanged.
- [ ] Submit feedback and verify it appears in the admin panel.
- [ ] Submit, approve, reject, and delete dummy notes.
- [ ] Test offline navigation and confirm unavailable JSON files do not receive HTML fallback.
- [ ] Test quiz option text containing `<tag>`, ampersands, quotes, and comment-like text.
- [ ] Confirm reports show insufficient data for topics with fewer than four questions.
- [ ] Confirm score-sync failure is visible and does not falsely claim server save.
- [ ] Verify no real enrollment numbers, names, marks, or private files were used.

## Release rule

A green checklist is not a substitute for review of the deployed Apps Script source. Keep this branch isolated until backend changes are implemented and tested. Merge and deploy only after explicit approval.
