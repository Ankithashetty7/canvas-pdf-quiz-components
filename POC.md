# Thales POC — Acquia Source (Canvas)

Code components for two proof-of-concept experiences on Acquia Source:

| Page                                       | Path                       | Components                                               |
| ------------------------------------------ | -------------------------- | -------------------------------------------------------- |
| Software Monetization Readiness Assessment | `/monetization-assessment` | `quiz` + `quiz-*` data components                        |
| PDF to Interactive Guide                   | `/pdf-to-guide`            | `pdf-guide` (uses the guide components below)            |
| HSM Buyer's Guide (hand-built)             | `/hsm-buyers-guide`        | `guide-*`, `scrolly`, `tabs`, `timeline`, `scorecard`, … |

## Setup

Requires Node.js **22.19+ (22.x)** or **24.5+** — `.nvmrc` pins 22.23.2.

```bash
nvm use
npm install
cp .env.example .env   # set CANVAS_SITE_URL and auth for your Canvas site
npm run dev            # Canvas Workbench on http://localhost:5173
```

## Push to Canvas

```bash
npx canvas login                                  # browser sign-in to the site in .env
npx canvas push --yes --include-brand-kit=false   # components, global CSS and pages
```

Pages with embedded images need `npx canvas reconcile-media` before the first
push (the site accepts png/gif/jpg only). Use `--no-pages` to push components
without overwriting pages edited in Canvas; `npx canvas pull --include-pages`
brings site edits back into `pages/`.

## Quiz (`quiz`)

- All content is authored in Canvas: questions → options (score), categories
  (benchmarks, low/mid/high tier content, priority actions), result bands (level
  labels, summary texts with `{tokens}`), and the PDF report.
- Scoring, summaries and the PDF report run in the browser; progress is kept in
  `localStorage` (lead details are never stored). "Retake assessment" resets it.
- Lead gate: set **HubSpot Region / Portal ID / Form ID** or **Marketo Base URL
  / Munchkin ID / Form ID** on the Quiz. With neither, a demo form is shown
  (sends nothing). HubSpot receives `assessment_score`, `assessment_level` and
  `weakest_category` as hidden fields when the form has those properties.

## PDF Guide (`pdf-guide`)

- Set the **PDF** field (media library document) or **PDF URL**. The PDF is read
  in the browser with pdf.js, structured by rules in
  `src/lib/pdf-guide/structure.js`, and rendered with the guide components:
  numbered chapters → scrollytelling, sequences → timeline, parallel items →
  tabs, long sub-topics → accordion, comparison tables → scorecard, stats →
  count-up rings, plus checklists, takeaways and quotes.
- Best with text-based guides/ebooks/white papers; image-only or scanned PDFs
  are not supported.

## External scripts loaded at runtime

pdf.js and pdfmake (cdnjs.cloudflare.com), HubSpot / Marketo form embeds, and
the Inter font (Google Fonts). The site's CSP must allow these origins.
