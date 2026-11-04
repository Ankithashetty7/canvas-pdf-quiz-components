# Canvas Components: Interactive PDF Reader & Questionnaire Builder

**Jira:** DF-3546
**Project:** canvas-quiz (Nebula/Canvas code component repo)
**Remote target:** [questionnairesdemo.acquia.site](https://questionnairesdemo.acquia.site)
**Date:** November 2026

---

## Overview

This document covers the two Canvas Code Component kits built as part of the Thales US POC to migrate questionnaires, calculators, and interactive PDF guides from static GCP-hosted files into Acquia Source CMS.

| Kit | Live URL | Source page spec |
|-----|----------|-----------------|
| **Quiz Kit** | [/monetization-assessment](https://questionnairesdemo.acquia.site/monetization-assessment) | `pages/monetization-assessment.json` |
| **PDF-to-Guide Kit** | [/pdf-to-guide](https://questionnairesdemo.acquia.site/pdf-to-guide) | `pages/pdf-to-guide.json` |

---

## 1. Quiz Kit

Recreates the [Thales Software Monetization Readiness Assessment](https://www3.thalesgroup.com/qa/monetization-assessment/) end-to-end as a fully CMS-authored, multi-step scored questionnaire with a downloadable PDF report.

### Screenshot / Demo

> **[Attach screenshot or screen recording here]**
>
> _Suggested: full-page screenshot of `/monetization-assessment` showing the intro, a question step, and the results report screen. A short Loom or MP4 of a complete run is ideal._

---

### Component Reference

#### `quiz` — Quiz (wrapper)

The root container for a scored questionnaire. Controls branding, scoring thresholds, and the overall layout shell.

| Prop | Type | Description |
|------|------|-------------|
| `heading` | string | Main heading of the quiz |
| `headingAccent` | string | Part of heading to highlight in the accent colour |
| `description` | string | Intro copy shown before the first question |
| `logo` | image | Brand logo displayed in the header |
| `lowTierMax` | integer | Score % ceiling for the "low" band |
| `midTierMax` | integer | Score % ceiling for the "mid" band |

**Slots:** `categories`, `questions`, `options`, `resultBands`, `report`

---

#### `quiz-category` — Quiz Category

Groups questions under a named category. The `name` value is referenced by each `quiz-question`.

| Prop | Description |
|------|-------------|
| `name` | Category label (e.g. "Portfolio Structure") |

---

#### `quiz-question` — Quiz Question

An individual scored question. Belongs to a named category.

| Prop | Description |
|------|-------------|
| `category` | Must match a `quiz-category` name |
| `question` | The question text |

---

#### `quiz-option` — Quiz Option

An answer choice for a question. Each option carries a numeric score contribution.

| Prop | Description |
|------|-------------|
| `label` | Short answer label |
| `description` | Optional expanded explanation of the option |
| `value` | Numeric score value for this choice |

---

#### `quiz-category-tier` — Quiz Category Tier

Per-category feedback copy shown in the results report, keyed to a score band (low / mid / high).

| Prop | Description |
|------|-------------|
| `category` | Matches a `quiz-category` name |
| `tier` | Which band this content applies to (`low` / `mid` / `high`) |
| `heading` | Section heading for this tier/category result |
| `body` | Feedback copy |

---

#### `quiz-result-band` — Quiz Result Band

Defines the overall score band boundaries and associated messaging.

| Prop | Description |
|------|-------------|
| `minPercent` | Lower bound (inclusive) |
| `maxPercent` | Upper bound (inclusive) |
| `overallLevel` | Label shown on the results screen (e.g. "Foundational") |

---

#### `quiz-report` — Quiz Report

The PDF-style results page rendered after quiz completion. Includes cover, per-category scores, and next steps.

| Prop | Description |
|------|-------------|
| `reportTitle` | First line of the cover title |
| `reportTitleAccent` | Second line, rendered in the accent colour |
| `tagline` | Short strapline under the title |

**Slots:** `categoryTiers`, `nextSteps`

---

#### `quiz-next-step` — Quiz Next Step

A recommended action card shown on the report, conditionally displayed based on the user's score.

| Prop | Description |
|------|-------------|
| `title` | Card heading (e.g. "Share This Report") |
| `appliesWhen` | Score band that triggers this step (`below_benchmark`, etc.) |
| `action` | CTA label / URL |

---

#### `quiz-action` — Quiz Action

A generic CTA block attached to the quiz (e.g. "Book a demo", "Download whitepaper").

| Prop | Description |
|------|-------------|
| `appliesWhen` | Score band condition |
| `action` | CTA label / URL |

---

## 2. PDF-to-Guide Kit

Converts a static PDF into a scrollable, themed interactive guide — no manual authoring of each section required. The `pdf-guide` component does the heavy lifting client-side; the rest of the kit provides the page chrome and rich content blocks used in fully hand-authored guides.

### Screenshot / Demo

> **[Attach screenshot or screen recording here]**
>
> _Suggested: screenshot of `/pdf-to-guide` showing the auto-converted guide sections with the navigation sidebar. A before/after (PDF viewer vs. guide view) comparison is very effective here._

---

### Component Reference

#### `pdf-guide` — PDF Guide

The core conversion component. Fetches a PDF from the Drupal media library (or a direct URL), parses it, and renders each page as a guide section with optional "View original page" toggles.

| Prop | Type | Description |
|------|------|-------------|
| `pdf` | media (document) | PDF chosen from the Drupal media library |
| `pdfUrl` | string (URI) | Fallback direct URL when no media entity is selected |
| `brandName` | string | Brand label applied to the guide chrome |
| `showOriginalPages` | boolean | Adds a "View original page" button to each converted section |

---

#### `guide-shell` — Guide Shell

Top-level wrapper for a hand-authored interactive guide. Sets the page title, brand identity, and provides the scroll-spy navigation shell.

| Prop | Description |
|------|-------------|
| `title` | Guide title (e.g. "HSM Buyer's Guide") |
| `brandName` | Brand name shown in the nav |
| `description` | Short summary / intro |

**Slots:** `hero`, `sections`

---

#### `guide-hero` — Guide Hero

Full-width hero section at the top of a guide.

| Prop | Description |
|------|-------------|
| `eyebrow` | Small label above the heading (e.g. "Buyer's Guide") |
| `heading` | Main heading |
| `headingAccent` | Highlighted portion of the heading |

---

#### `guide-section` — Guide Section

A themed content section within a guide. Supports light, mist, dark, deep, and gradient themes.

| Prop | Description |
|------|-------------|
| `theme` | `light` \| `mist` \| `dark` \| `deep` \| `gradient` |

**Slots:** `content` (accepts any content block components)

---

### Supporting Content Block Components

These components are used inside `guide-section` slots to build rich guide content. They are also available independently on any Canvas page.

| Component | `machineName` | Purpose |
|-----------|---------------|---------|
| Accordion | `accordion` | Expandable FAQ / detail panels (with `accordion-item` children) |
| Callout | `callout` | Highlighted pull-out box |
| Checklist | `checklist` | Bulleted checklist block |
| Feature Card | `feature-card` | Icon + headline + body card |
| Figure | `figure` | Image with caption |
| Grid | `grid` | Multi-column layout container |
| Pull Quote | `pull-quote` | Large-format highlighted quote |
| Rich Text | `rich-text` | Free-form HTML/Markdown body copy |
| Scorecard | `scorecard` | Comparison table with vendor rows (`scorecard-row` children) |
| Scrolly | `scrolly` | Scroll-triggered step animation (`scrolly-step` children) |
| Stat Counter | `stat-counter` | Animated numeric stat |
| Tabs | `tabs` | Horizontal or vertical tab interface (`tab-panel` children) |
| Timeline | `timeline` | Vertical step timeline (`timeline-item` children) |
| Lead Form | `lead-form` | Embeds a Marketo or HubSpot form (IDs authored in CMS); falls back to a built-in demo form when no IDs are set |

---

## Architecture Notes

- All components are **Canvas Code Components** — authored as React + Tailwind, registered via `component.yml`, and pushed to Drupal Canvas.
- Props and slots are defined in `component.yml`; Drupal editors configure them in the Canvas layout builder without writing code.
- The remote CMS target is **Acquia Source** (`questionnairesdemo.cms.acquia.site`). Page specs are published via **Source MCP**, not `canvas push`.
- Branding tokens (colour palette, typography) are set in `src/global.css` as Tailwind 4 `@theme` variables. No Thales brand assets are committed; placeholders are used in the demo.
- The quiz scoring engine is entirely client-side — no backend or third-party service required.
- The PDF parser in `pdf-guide` runs in the browser (pdf.js); it requires the PDF to be served from the same origin or a CORS-enabled host.

---

## Open Items / Known Limitations

- **Lead Form:** Supports both **Marketo** (Base URL + Munchkin ID + Form ID) and **HubSpot** (Region + Portal ID + Form ID). Neither set of IDs is committed to the repo — a built-in placeholder form is shown in the demo. Real IDs must be authored per page in the CMS.
- **OAuth / push:** At POC time, OAuth client credentials were returning 401 on direct `canvas push`. Use Source MCP for page publishing.
- **PDF CORS:** External PDFs (e.g. `www3.thalesgroup.com`) will be blocked by CORS in the browser. PDFs must be uploaded to the Drupal media library or hosted on a CORS-enabled CDN.

---

*Generated from source: `canvas-quiz` repo · `src/components/` · `pages/`*
