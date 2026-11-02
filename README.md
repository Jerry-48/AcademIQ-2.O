# AcademIQ 2.0

A free study hub for students: organised notes, MCQ quizzes, a learning-gap report that points you back to the right notes, and a live leaderboard. Built by a student, for students.

**Live site:** https://jerry-48.github.io/AcademIQ-2.O/

---

## Features

**For students**
- **Enrollment-based accounts.** Register with a 12-digit enrollment number, name and password. One active session per account (signing in on a second device signs out the first). Sessions last up to 6 hours, with a 30-minute idle timeout.
- **Study notes.** Browse by subject, search, sort, read PDFs in the page or download them.
- **Share notes.** Upload a PDF (max 10 MB) or paste a Google Drive link. Every submission waits for admin approval. Limit: 5 per day.
- **Quizzes.** Choose a subject and 10 to 100 questions. Questions and options are shuffled on every attempt.
- **Learning Report.** After each quiz you see accuracy per topic with a status tag (Needs revision, Getting there, Strong), plus links to the notes that cover your weak topics. A topic counts as a gap when you score below 50% on at least 2 of its questions.
- **Leaderboard.** Overall Top 10, Subject Top 10 and participant count. Only quizzes with 20 or more questions count.
- **Feedback.** An in-app form with star rating, category and message (5 per day).
- **User manual.** A "How to Use / User Manual" button on the login page and in the footer.

**For the admin** (`admin.html`)
- Approve, reject or delete submitted notes
- View registered students and reset a registration
- See the most common weak topics and recent quiz attempts
- Read feedback with average rating and distribution
- See recent login activity
- **Cleanup tool** to delete test data safely (preview, then confirm with the admin password and `DELETE`)

---

## Tech stack

| Layer | Technology |
|---|---|
| Front end | Plain HTML, CSS and JavaScript (no framework, no build step) |
| Hosting | Static hosting (GitHub Pages) |
| Backend | Google Apps Script web app |
| Database | Google Sheets (Users, Logins, Scores, Tracking, Feedback, Notes) |
| File storage | Google Drive (uploaded PDFs) |
| Offline / caching | Service worker (`sw.js`) |

---

## Project structure

```
AcademIQ-2.O/
├── index.html      # Student app: login, notes, quizzes, leaderboard
├── app.js          # App logic: auth, notes, quiz engine, learning report
├── style.css       # Styles (dark theme, responsive)
├── feedback.js     # In-app feedback button and form
├── admin.html      # Admin panel (single file)
├── config.js       # Holds GOOGLE_SCRIPT_URL (your deployed web app URL)
├── sw.js           # Service worker
├── quizzes/        # Question banks (JSON) and topics.json
└── Code.gs         # Backend source for Google Apps Script (see Security)
```

---

## Setup

### 1. Backend (Google Sheets and Apps Script)
1. Create a new Google Sheet.
2. Open **Extensions → Apps Script** and paste the contents of `Code.gs`.
3. Run the `setup()` function once. It creates the sheets with the right headers. Approve the permission prompts.
4. Open **Project Settings → Script Properties** and add `ADMIN_PASSWORD` with a strong password (12+ characters). The password is never stored in the code.
5. Click **Deploy → New deployment → Web app**. Run as *Me*, access *Anyone*. Copy the web app URL.
6. After any later edit to `Code.gs`, use **Deploy → Manage deployments → New version**. Otherwise the live site keeps running the old code.

### 2. Front end
1. Put the web app URL in `config.js`:
   ```js
   const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/XXXX/exec';
   ```
2. Serve the folder with any static host. For local testing:
   ```bash
   python3 -m http.server 8000
   ```
   then open http://localhost:8000.

### 3. Add quiz questions
Each question in a quiz file needs a `q` (question text), exactly four `opts`, and `ans` as a number from 0 to 3 (the index of the correct option). Questions that do not match this are skipped, and a warning appears in the browser console. Add a quiz to `quizzes/` and map its topics to notes in `quizzes/topics.json` so the Learning Report can recommend revision material.

### 4. Admin panel
Open `/admin.html` and sign in with the `ADMIN_PASSWORD` you set. Use the **Cleanup** tab to remove test accounts and quiz results before a real launch (copy your Sheet first).

---

## Security notes

- **Never commit the admin password.** It belongs in Script Properties only. If a password was ever committed, change it, because Git history keeps old versions.
- Consider keeping `Code.gs` out of the public repo and pasting it directly into Apps Script.
- The public scores endpoint shows names and the last 3 digits of enrollment numbers on the leaderboard.
- Passwords are stored as salted hashes. Admin and student logins lock for 10 minutes after 5 failed attempts.
- Text saved to the Sheet that starts with `=`, `+`, `-` or `@` is stored as plain text, so it cannot run as a spreadsheet formula.

---

## Contributing and feedback

Found a bug or want a subject added? Use the in-app **💬 Feedback** button, open a GitHub issue, or email **sujalkalena35@gmail.com**.

---

## Disclaimer

Educational materials on this site belong to their respective owners. Some study materials come from publicly available educational resources and are shared with attribution for educational purposes. If you are a copyright owner and want content removed or updated, please get in touch and the request will be handled promptly.

---

## Author

**Sujal Kalena** (ICT student), creator of AcademIQ.
GitHub: [@Jerry-48](https://github.com/Jerry-48)
