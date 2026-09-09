# AB-620 Learning Platform

## Approved direction

A friendlier, practice-first learning platform inspired by Whizlabs' clear course structure, not its orange identity. AB-620 keeps its own blue palette, Microsoft badge reference and independent-project status. This is a presentation redesign, not a change to the course's factual claims or runtime behavior.

## Hierarchy

1. Compact introduction: Prepare for AB-620, with an approximately 320px desktop hero and a course-summary card on the right.
2. Three compact study-mode cards: topic learning, timed exam simulation, weak-spot review. CTAs stay in normal flex flow below their descriptions.
3. Question workspace at `#exam`, before the long course material.
4. Course outcomes, exam areas and courseware insights.
5. Hands-on labs with existing filters and checklists.
6. Source cards, then the unchanged English legal links and dialogs.

## Visual system

- Navy `#172b4d` for light-mode headings and body text; muted `#52637a` for supporting text.
- Primary blue `#0969da`, pale blue `#edf4ff`, paper `#f6f8fc`, and white cards.
- Dark paper `#101722`, cards `#182231`, pale surfaces `#1d2c43`, and light blue accents `#91b4ff`. Avoid large saturated navy panels.
- High contrast uses black, white, yellow and cyan. No card or dialog shadows in dark or high-contrast modes.
- Existing Space Grotesk headings, DM Sans body, and DM Mono utility labels. No serif, dramatic italic hero, new fonts or new providers.
- Headings top out at 48px, question prompts at 26px, and answer text stays at least 16px.
- Cards use 12-20px radii, controls 8-12px. Light shadows are modest. Hover movement is limited to 2px on mode cards and disabled with reduced motion.

## Signature summary

The AB-620 course code, array-derived question/lab/area counts, and horizontal native `progress` element form one course-summary card. Count values are populated only in the existing `updateProgress()` function. Preserve `progress-ring`, `progress-percent`, `completed-count` and `total-count` IDs.

Completion counts saved study-answer entries, including wrong answers and partially answered matching/multiple-choice entries, exactly as before. It does not claim accuracy, mastery or readiness. Exams remain independent and volatile. Narrow summary cards use label/value rows to avoid splitting German words; wider cards align the three numbers above their labels.

## Responsive and accessible behavior

- Header badge and brand stay left. Learning, exam, labs and sources navigation can wrap but must remain reachable on mobile.
- New lab navigation, existing source navigation and any future summary links are hidden during active exams, along with the existing hint sections.
- At 561-900px, labs and question workspace retain two columns. At 560px and below, labs, question layout and matching controls stack; question navigation becomes a horizontal scroll list.
- Card content grows naturally with German copy. No fixed-height text clipping, absolute CTAs or squeezed minimum widths.
- Native answer controls, focus visibility, modal focus restoration, inert backgrounds and reduced-motion behavior remain intact.

## Scope and verification

No changes to canonical questions, IDs, answer keys, course translations, source classifications, source URLs, review claims, storage keys, exam scoring or legal copy. The existing external badge and Google Fonts requests keep their documented privacy semantics.

Runtime release tag: `2026-09-08-learning-platform`, shared by every local script and stylesheet URL, including locales. Generated study documentation changes only if canonical data or generated metadata changes.

`tests/redesign.spec.js` covers section order, dynamic counts, native study-only progress, exam-safe navigation, sans-serif typography, compact desktop layout, CTA flow and responsive geometry in both languages and all themes. Existing tests remain unchanged. Screenshots and traces go into ignored `test-results/` directories.

```bash
npm test
npm run test:all-browsers
AB620_LIVE_ASSETS=1 npx playwright test tests/redesign.spec.js tests/runtime.spec.js --project=chromium --grep 'redesign|layout'
npm run docs:check
```

### Verified result

The final full run passed 624 tests (208 cases per Chromium, Firefox and WebKit, including data tests). Markdown parity, content validation and `git diff --check` passed. Independent review approved the redesign and the focused WebKit correction.

The full regression run exposed a WebKit focus lifecycle issue after replacing an answered card: the next question's mouse-down could scroll the page to the top before mouse-up. The card now blurs its focused descendant and settles layout before replacing it, while preserving the existing focus restoration. `tests/focus-navigation.spec.js` covers real mouse-down/up navigation without retries or JavaScript clicks. This is a browser-interaction correction, not a change to scoring or stored answers.

Visual comparison covered English and German at 1440, 740 and 390px with live external assets, plus dark and high-contrast question states. No document overflow was observed. Physical devices, actual screen-reader speech and the deployed GitHub Pages version were not tested. No commit or push was performed as part of this redesign.
