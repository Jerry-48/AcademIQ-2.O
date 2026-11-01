# Claude Code Agent Task — Finish AcademIQ 2.0 Stage 2 Hardening

You are working on the AcademIQ 2.0 repository:
https://github.com/Jerry-48/AcademIQ-2.O

Live preview: https://academiq-20.vercel.app

## Mission
Finish the remaining security and reliability work for a controlled real-student pilot. Preserve the current UI, features, data model, and intended product behaviour. Do not rebuild the application or make broad design changes. Work on the existing branch `stage-2/hardening-dummy-pilot` (or the branch currently checked out). Do not push to `main`, merge, or deploy unless the owner explicitly approves.

## Product behaviour that MUST be preserved
1. Students can submit PDF notes/resources.
2. A submitted PDF is **not public immediately**. It becomes accessible to other students only after an administrator approves it.
3. Admin-approved PDFs are intentionally shareable/viewable by all students.
4. Leaderboard intentionally shows the student's display name and only the last three enrollment digits. Keep this display. Never expose full enrollment number, email, password/hash, session token, or private profile fields through public leaderboard/API responses.
5. Existing login, registration, quiz, score, Learning Report, feedback, admin panel, PWA/offline and notes workflows must continue to work.
6. The owner is independently inspecting `resetUser`; do not modify that function unless the owner later asks.
7. Apps Script source is private and not present in this public repo. The admin password was redacted in the shared source. Do NOT report it as publicly leaked. Restrict Apps Script editor access to trusted maintainers. Moving the secret to Script Properties is recommended hardening, not proof of public exposure.

## Existing Stage 2 changes already in this branch
- Quiz option strings are rendered as text nodes instead of being injected as HTML.
- Learning-gap reporting uses threshold 40 and requires at least 4 topic questions before making a confident gap claim; low-data reports are labelled provisional/insufficient data.
- Score sync failures are surfaced to the student rather than silently swallowed.
- Service worker uses navigation-only app-shell fallback; missing non-navigation resources should not receive index.html.
- A quiz-bank structural test file exists at `tests/quiz-banks.test.mjs`.
- Read `STAGE-2-DUMMY-PILOT.md` and `tests/STAGE2-SECURITY-STATUS.md` first.

## Critical backend work
The actual Apps Script source must be obtained from the owner/private Apps Script project; it is not in this repository. Do not fabricate a replacement backend or assume you can deploy it. If the source is not available in the current workspace, complete all repository-side work and produce a precise patch/instructions for the Apps Script owner.

Audit and fix these items in the existing backend, preserving its current action names and response contracts:

### A. PDF submission and approval workflow — highest priority
- On submit, validate file size (maximum 10 MB) and verify the file content is actually PDF (not merely a client-supplied MIME type or filename; inspect the PDF signature and reject malformed/non-PDF files).
- Store new submissions in the dedicated expected Drive folder. Do not accept arbitrary existing Drive file IDs from a student and change their sharing permissions.
- Keep new submissions private and pending. Do not set `ANYONE_WITH_LINK` during submission.
- In admin approve, verify the note is pending, the file exists, is in the expected folder, and is a valid PDF before granting viewer-only link access. Make approval idempotent.
- In reject/delete, revoke any public permission created by this workflow and/or trash the owned uploaded file according to the existing product retention policy. Do not delete files the app does not own.
- Ensure public approved-note listing returns only approved records and safe fields. Never return pending file IDs/links publicly.
- Keep the intentional post-approval public PDF feature intact.

### B. Authentication and authorization
- Audit every action and enforce role checks server-side. Never trust a client-supplied `uid`, role, enrollment, or admin flag.
- Bind score submissions and user-owned data to the authenticated session identity.
- Validate session token format, expiry and server-side lookup on every protected action. CacheService eviction should fail closed and require re-login, not bypass auth.
- Add bounded per-account login throttling (and, where feasible, per-client throttling) without a single global counter that lets one user lock out everyone.
- Add admin logout/token revocation if compatible with the existing frontend; otherwise document the smallest coordinated frontend/backend change.
- Ensure admin credentials are not returned in responses or logs. Prefer Script Properties for the admin secret and restrict project editor access.
- Do not make a custom cryptographic password KDF. If current salted SHA-256 is used, clearly document the risk and recommend a reviewed, supported password-storage approach; do not silently claim it is strong password hashing.

### C. Input validation and Google Sheets safety
- Validate every action's required fields, type, length and allowed values on the server.
- Validate score values as finite integers with sensible bounds; validate topic breakdown arrays (bounded count, bounded topic-name length, integer correct/total, total > 0, 0 <= correct <= total).
- Prevent spreadsheet formula injection for all user-controlled text written to Sheets. Treat strings whose first non-whitespace character is =, +, -, or @ as untrusted; store safely as literal text, while preserving legitimate user text. Apply to names, feedback, titles, subjects, browser/user-agent strings and note metadata.
- Do not trust user-supplied dates, user IDs, or admin status.
- Keep sheet columns as text where appropriate and avoid changing existing column layouts without a migration plan.

### D. Error handling and abuse limits
- Return generic safe client errors; log diagnostic details server-side without passwords, tokens, full enrollment IDs, or sensitive payloads.
- Ensure daily submission/feedback limits cannot be trivially bypassed by changing client fields.
- Bound request/body sizes and reject malformed JSON/base64 before expensive operations.
- Review Drive permissions and ensure only the app's own uploaded files are modified.

## Repository/frontend work
- Review all dynamic DOM rendering. Replace unsafe HTML injection for user-controlled/API/quiz strings with `textContent`, `createTextNode`, or a carefully audited escaping function. Keep intentional static templates only.
- Check admin panel rendering and all note titles, feedback, names, subjects, quiz text, and error messages for XSS.
- Ensure API errors do not expose raw server stack traces or internal IDs to students.
- Review local/session storage: do not persist passwords; minimize session token lifetime/exposure; explain XSS implications. Do not break current login flow.
- Check service worker cache strategy: never cache authenticated/admin API responses, tokens, or private user data. Cache only static app shell/public static assets. Ensure stale caches are invalidated safely.
- Verify PWA offline behaviour does not show private cached content to a different user on a shared device.
- Check PDF links are only surfaced after approval and use safe link attributes.
- Keep the current intended leaderboard label (name + last 3 digits); add tests that no full enrollment/email/password/hash/token is returned.

## Testing requirements
1. Run the existing test suite and `node --test tests/quiz-banks.test.mjs`. If Node is unavailable, state that honestly and provide the exact command for the owner.
2. Add tests for:
   - malformed quiz bank entries and answer indexes;
   - safe rendering of HTML-like quiz options;
   - Learning Report minimum sample threshold and provisional state;
   - API score validation and topic breakdown validation (unit tests or Apps Script test harness);
   - public leaderboard field allowlist and last-three-only enrollment display;
   - note submission remains private/pending;
   - approval grants public viewer access only after validation;
   - reject/delete revokes public access and never deletes an unowned file;
   - service worker does not cache API/private responses and fallback applies only to navigations.
3. Use dummy accounts, a separate dummy spreadsheet, and a separate dummy Drive folder. Never test by changing real student rows/files.
4. Run build/lint/tests and inspect the final diff. Do not report tests as passed unless actually executed successfully.
5. Provide a concise test report with commands, pass/fail counts, and anything not testable in this environment.

## Completion and handoff
- Make focused commits on the staging branch only.
- Update `STAGE-2-DUMMY-PILOT.md` and `tests/STAGE2-SECURITY-STATUS.md` with exact implemented/tested/pending status.
- Do not merge or deploy. Leave the PR as draft until all critical backend and dummy-pilot checks pass.
- At the end, report:
  1. Files changed and why.
  2. Tests actually run and exact results.
  3. Backend items completed vs blocked by missing Apps Script access.
  4. Dummy-pilot steps the owner must perform.
  5. Any remaining release blockers.

Be conservative: correctness and student-data safety matter more than claiming completion. If a change could break existing frontend/backend contracts, inspect callers and tests before changing it.
