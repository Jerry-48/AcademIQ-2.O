# Stage 2 security review status

The frontend hardening changes in this branch are proposed changes only. They have not been merged or deployed to production.

The Apps Script backend source is not present in this public repository. The owner has clarified that the Apps Script project is private and its admin password was redacted in the shared conversation. Therefore, this review does **not** claim that the admin password was publicly exposed. Keep Apps Script editor access restricted to trusted maintainers; moving the admin secret to Script Properties is a recommended hardening improvement, not evidence of a public leak.

Community PDF sharing is an intentional product feature: submissions should become viewable by students only after explicit admin approval. The security requirement is to keep every submission private/pending until approval, verify the uploaded file is a genuine PDF and belongs to the expected submission workflow, and revoke or remove access on rejection/deletion.

The leaderboard intentionally displays a student's name and only the last three enrollment digits. Preserve that design. Verify that public responses do not disclose full enrollment numbers, email addresses, password hashes, session tokens, or other private account fields.

The owner is separately reviewing resetUser/session invalidation; do not change that function as part of this task unless asked.

No production spreadsheet, Drive file, Apps Script deployment, or live student data was accessed or changed during this review. Backend integration, Google Sheets/Drive permissions, deployment configuration, and real-world access controls remain unverified. Do not claim production readiness until the isolated dummy-data pilot and acceptance checks in the accompanying Claude-agent task have passed.
