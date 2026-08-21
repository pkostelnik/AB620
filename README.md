# AB-620 Field Guide

Static, interactive AB-620 practice site for GitHub Pages. The complete question bank is also available in `AB620.md`.

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
