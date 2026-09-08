# AB-620 Field Guide

Static, interactive AB-620 practice site for GitHub Pages. The complete question bank is also available in `AB620.md`.

![Microsoft Certified Associate badge](https://learn.microsoft.com/en-us/media/learn/certification/badges/microsoft-certified-associate-badge.svg)

The page uses the official Microsoft Certified Associate badge as a visual reference only. This project is independent and is not affiliated with, sponsored by, or endorsed by Microsoft.

The site now includes 90 practice questions, six learning outcomes, three exam areas, 20 paraphrased hands-on lab briefs, courseware insight cards, lab checklists, and links to the original external lab materials.

The interface supports English and German. English is the default language, and the selected language is stored locally in the browser. The site also supports Auto, Light, Dark, and High contrast themes.

Courseware-derived content is attributed to the [Tertiary Courses C1760 repository](https://github.com/tertiarycourses/C1760-AB-620-Microsoft-Certified-AI-Agent-Builder-Associate). The local lab briefs are paraphrased summaries, not copied courseware.

## Source model

Every question separates `originalSource` (attribution), `verificationSource` (Microsoft Learn evidence), and `labIds` (related exercises, not origins). No question is represented as an authenticated Microsoft exam question. The historical `official` flag means one of nine Learn-aligned additions, not Microsoft authorship.

The source split remains 45 DumpsBase / 9 Learn-aligned / 24 community / 12 courseware. Q54 and all 36 community/courseware entries have individual documentation reviews dated 2026-09-06. `confirmed` means the reviewed documentation supports the answer and explanation within the scope note; `partial` identifies inference, instructional vocabulary or platform-dependent details. The other 53 questions retain topic-level references with `unreviewed` status. See [SOURCE-EVIDENCE.md](SOURCE-EVIDENCE.md) for evidence and limitations, not a blanket accuracy claim.

Insight cards are separate editorial summaries. Their inherited confirmation labels lacked per-claim evidence in this audit; cards, dialogs and generated docs now explicitly state that they were not individually reviewed as of 2026-09-06. Their reference links are not blanket verification.

Labs and eight resource files link to upstream commit `941360e11dfa677914a00281a8255404e8c848e0`. Lab dialogs show relevant resources and related-question navigation. `relatedQuestionIds` is derived from current question `labIds`, never maintained as a second list. Opening a related question returns to unfiltered study mode. Lab/resource hints and source links remain unavailable during active exams.

## Tests and docs

Use Node.js 20+ and Python 3 for the local Playwright web server. There are no runtime dependencies or framework. Playwright is a development dependency only.

```bash
npm ci
npx playwright install chromium
npm test
npx playwright install firefox webkit
npm run test:all-browsers
npm run test:content
npm run docs:check
```

`npm test` includes browser regressions and in-memory malformed-content tests on Chromium. `npm run test:all-browsers` runs the same suite on Chromium, Firefox and WebKit. Test setup/browser installation may need internet, but test runs do not check external reachability; browser tests block external requests. The validator checks IDs, formats and answer bounds, matching rows/labels, source classification/hosts, forward/reverse references, exact required resource ID-to-file associations, upstream file paths, locale coverage/protected fields, and exact generated Markdown parity. Regenerating Markdown cannot hide incorrect resource coverage. This is structural validation, not factual certification or a substitute for browser tests.

`AB620.md` is generated from the static content and `locale-data.js`. It includes all 90 questions in EN/DE with answers and explanations, matching mappings, course scope, terminology cautions, outcomes, lab briefs, resource links and insight summaries. After editing canonical content:

```bash
npm run docs:generate
npm run test:content
```

Network checks are separate and explicitly opt-in:

```bash
npm run check:links
node scripts/check-links.mjs --network --reviewed
```

The checker sends HEAD requests, falls back to GET for unsupported/blocked HEAD, reports final URLs and failures, and exits nonzero on failures. A 200 response is not evidence that an answer is correct. Upstream path validation uses the checked-in GitHub tree inventory in `scripts/upstream-files.json`, so default tests do not depend on network availability.

## Practice behavior

Study answers and lab checklists persist locally. Review includes unanswered and incorrect study questions and shows an empty/completed state when there are none. Search follows the displayed language, including options and explanations. English is the fallback for missing translations; validation requires complete German content.

Review holds its question set and feedback until Finish, then recalculates remaining weak spots. Corrected questions disappear; incorrect and unanswered questions remain for another pass. If none remain, the completed empty state is shown. Learn's final action is **Back to first question**, which returns to the start of the current filtered set without clearing answers.

Each exam draws 20 distinct questions for 20 minutes and starts with its own empty answer set. Feedback and study hints are hidden until completion or timeout. Completion freezes the submission and score; later study edits cannot rewrite that result. Exam answers never enter study progress. Exams and results are memory-only and disappear on reload or closing the tab. Leaving an active exam through a mode/area change requires confirmation. Search and topic filters are disabled in exam mode.

Reset asks for confirmation, clears study answers and lab checklists, and discards any exam. It **keeps language and theme preferences**. Corrupt or unavailable storage is handled with a warning and in-memory operation.

## Run locally

Because the site uses only static assets, any local web server works:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser. No build step or backend is required.

## Publish with GitHub Pages

All local runtime scripts and `styles.css` use the same release query version in `index.html` (`2026-09-06-qa-final`). Bump every local runtime URL together for future releases, including `locale-data.js`, so fresh HTML cannot reuse an older release's URL-keyed data or styles. The cache regression serves assets from pre-fix `HEAD` (`4ca70d3cacfbb7b77796e0a10492ea1bc4904a80`) only for their original URLs and requires zero hits from this release. Keep that commit available when running tests in a shallow checkout. This does not force an already cached HTML document to refresh.

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Select **Deploy from a branch**.
4. Select the default branch and the `/ (root)` folder.
5. Save and open the generated Pages URL.

## Privacy and publication

The app stores progress, lab checklist state, language, and theme in the visitor's browser via `localStorage`. It has no accounts, answer-upload endpoint or application analytics. This does **not** mean no personal data reaches a server: the host receives HTTP requests, and Google Fonts CSS/font files and the Microsoft badge are requested automatically. IP addresses and browser/request metadata can reach the host, `fonts.googleapis.com`, `fonts.gstatic.com`, and `learn.microsoft.com`, subject to browser settings and caching. Opening source/resource links contacts those destinations. Provider privacy notices apply.

Exam state exists only in tab memory, not `localStorage` or `sessionStorage`. Reset retains preferences; browser site-data settings can remove all four keys. The default `Auto` theme follows the operating system's light/dark preference. Legal/privacy dialogs intentionally remain English. Operator and legal-notice fields remain placeholders; complete them and obtain appropriate review before publishing. No legal-compliance claim is made.

Local storage keys:

- `ab620-answers`: study answers
- `ab620-lab-progress`: lab checklist progress
- `ab620-language`: language preference
- `ab620-theme`: theme preference
