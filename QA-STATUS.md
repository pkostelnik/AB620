# Korrekturstatus AB-620

Stand: 2026-09-06. Ausgangspunkt: `4ca70d3`. Arbeitsbranch: `fix/qa-corrections`.
Die Korrekturen sind lokal umgesetzt. Dieser Bericht dokumentiert keine Veröffentlichung.

## Audit-Abgleich

| Befund | Ergebnis | Regressionen |
| --- | --- | --- |
| F01/F02 Prüfungsisolation und Abschluss | Eigene leere Prüfungsantworten; Hinweise verborgen; Ergebnis und Antworten nach Abschluss unveränderlich | `tests/runtime.spec.js`, `tests/review.spec.js` |
| F03 Matching Q60 | Einheitliche nullbasierte Schlüssel, erhaltene Auswahl, richtige Zuordnung in beiden Sprachen und Markdown | `tests/runtime.spec.js`, `tests/content.spec.js` |
| F04/F08 Kontrast und Antwortschrift | Lesbare Antworttexte, korrigierte Erfolgs- und aktive Listenfarben | `tests/runtime.spec.js` |
| F05/F06 Tastatur und Dialoge | Native Antwortcontrols, zugängliche Antwortbuchstaben, Fokusbegrenzung, inaktiver Hintergrund, Fokusrückgabe | `tests/runtime.spec.js`, `tests/review.spec.js` |
| F07 Responsive Layout | EN/DE-Matrix von 320 bis 1440 CSS-Pixeln; zweispaltiger Zwischenbereich erhalten | `tests/runtime.spec.js`, `tests/localization.spec.js` |
| F09 Übersetzung und Suche | Explizite Sprachfassungen aller 90 Fragen und Kursinhalte; Suche in sichtbarer Sprache | `tests/localization.spec.js` |
| F10 Prüfungsnavigation | Filter gesperrt, Abbruchbestätigung, Fokus auf Frage, keine wiederholten unveränderten Statusmeldungen | `tests/runtime.spec.js`, `tests/review.spec.js` |
| F11/F12 Reset und Speicher | Fragen-/Lab-Fortschritt wird zurückgesetzt; Präferenzen bleiben; Fehler führen zu Warnung statt Startabbruch | `tests/runtime.spec.js` |
| F13 Quellen | Herkunft, Verifikation und verwandte Labs getrennt; sieben Lab-Herkünfte und Q54 korrigiert | `tests/content.spec.js`, `tests/sources.spec.js` |
| F14 Validator | Antwortschema, IDs, Referenzen, Quellen, Sprachabdeckung und generiertes Markdown geprüft; Negativtests | `tests/content.spec.js` |
| F15 Ressourcen | Acht konkrete Ressourcendateien und abgeleitete Rückverweise in Lab-Dialogen | `tests/content.spec.js`, `tests/sources.spec.js` |
| F16 Wiederholung | Leerer Zustand sowie Abschluss einer laufenden Wiederholung funktionieren | `tests/runtime.spec.js`, `tests/review.spec.js` |
| F17 Privacy | Speicherumfang, Reset-Grenzen und automatische externe Abrufe beschrieben; keine erfundenen Betreiberangaben | `tests/sources.spec.js` |

Im Abschlussreview zusätzlich korrigiert: einheitliche Cache-Version für alle lokalen Laufzeitdateien, wirksamer Abschluss der Wiederholung, exakte Ressourcen-ID/Datei-Prüfung und WebKit-spezifische Fokusprobleme.

## Verifikation

- `npm run test:all-browsers`: **453 bestanden**, keine Fehler (151 Testfälle je Chromium, Firefox und WebKit; reine Datentests werden ebenfalls je Projekt ausgeführt).
- `npm run docs:check`: `AB620.md` stimmt exakt mit Daten und Sprachfassungen überein.
- `node scripts/validate-content.mjs`: 90 Fragen, 20 Labs, 8 Ressourcen; Quellenaufteilung 45/9/24/12, Sprachintegrität und Markdown-Parität bestanden.
- `git diff --check`: bestanden.
- Separater Netzwerkprüflauf während der Quellenkorrektur: 74/74 Inhaltslinks erreichbar. Erreichbarkeit allein bestätigt keine fachliche Aussage.
- Visuelle Schlusskontrolle mit echten externen Assets: Deutsch bei 390, 740 und 1440 px ohne Dokumentüberlauf; richtige Antwort im Hochkontrastmodus schwarz auf gelb; keine JavaScript-Ausnahme im geprüften Ablauf.
- Unabhängige Reviews: Laufzeit, Übersetzungen, Gesamtänderungen und Gegenprüfung der Abschlusskorrekturen. Abschließendes Urteil: APPROVE.

## Grenzen

- Q54 und 36 Erweiterungsfragen wurden gegen Dokumentation geprüft: 22 gestützt, 15 teilweise gestützt. Die übrigen 53 Fragen sind ausdrücklich nicht einzeln nachverifiziert. Details stehen in `SOURCE-EVIDENCE.md`.
- Die fünf Insight-Zusammenfassungen tragen einen datierten Hinweis auf fehlende Einzelprüfung statt unbelegter Bestätigung.
- Keine vollständige WCAG-Zertifizierung, kein echter Screenreader-/Gerätetest und keine Prüfung in einem produktiven Copilot-Studio-Tenant. Playwright WebKit ist kein Safari-Gerätetest.
- Timeout-Tests verwenden kontrollierte Uhren beziehungsweise Deadlines, keinen 20-minütigen Echtzeitlauf.
- Rechtliche Platzhalter bleiben offen. Keine Rechtskonformitätszusage.
- Keine produktive Bereitstellung geprüft. Neue Asset-URLs verhindern alte Daten bei frischem HTML, erzwingen aber keine Aktualisierung bereits gecachten HTMLs.
- Der Cache-Regressionstest benötigt den in der README genannten Ausgangscommit im lokalen Git-Verlauf.

Commit und Push wurden nicht ausgeführt.
