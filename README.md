# AB-620 Field Guide

Static, interactive AB-620 practice site for GitHub Pages. The complete question bank is also available in `AB620.md`.

The site now includes 90 practice questions, six learning outcomes, three exam areas, 20 paraphrased hands-on lab briefs, courseware insight cards, lab checklists, and links to the original external lab materials.

Courseware-derived content is attributed to the [Tertiary Courses C1760 repository](https://github.com/tertiarycourses/C1760-AB-620-Microsoft-Certified-AI-Agent-Builder-Associate). The local lab briefs are paraphrased summaries, not copied courseware.

Content integrity can be checked with `node scripts/validate-content.mjs`.

## Run locally

Because the site uses only static assets, any local web server works:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser. No build step or backend is required.

## Publish with GitHub Pages

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Select **Deploy from a branch**.
4. Select the default branch and the `/ (root)` folder.
5. Save and open the generated Pages URL.

The app stores progress and the selected theme in the visitor's browser via `localStorage`; no personal data is sent to a server. The default `Auto` theme follows the operating system's light/dark preference.
