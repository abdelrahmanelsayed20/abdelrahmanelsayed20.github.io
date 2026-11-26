# abdelrahmanelsayed20.github.io

Personal portfolio of **Abdelrahman Elsayed**, Machine Learning & Data Science.
Live at **https://abdelrahmanelsayed20.github.io/**

Hand-built with plain HTML, CSS and JavaScript: no framework, no build step, no tracking.

## Highlights

- **fig. 01, the Optimizer Lab.** An interactive 3D loss landscape where Adam, SGD with momentum, RMSProp and AdaGrad race to the minimum using their real update rules. Drag to orbit, click to drop a new starting point. (`assets/js/lab.js`)
- **BM25 project search.** The project grid is ranked live in the browser with the same scoring function used in the NutriQuest search engine.
- **Case studies** in native `<dialog>` pop-ups, deep-linkable (for example `/#case-neuroquant`).
- **Command palette** (`Ctrl K` / `⌘K` or `/`), dark and light themes, and full support for `prefers-reduced-motion`.
- **Recruiter-ready plumbing:** Open Graph preview image, JSON-LD `Person` data, sitemap, custom 404 page.

## Structure

```
index.html                     the whole site (sections, case studies, inline SVG charts)
404.html                       custom not-found page
assets/css/style.css           design system and components
assets/js/lab.js               fig. 01: loss landscape + optimizers (math core is unit-testable in Node)
assets/js/main.js              theme, navigation, reveals, search, case studies, command palette
assets/img/                    favicon, touch icon, social preview image
assets/Abdelrahman-Elsayed-CV.pdf
robots.txt, sitemap.xml
```

## Updating

- **CV:** replace `assets/Abdelrahman-Elsayed-CV.pdf` and keep the same file name.
- **Photo:** save it as `assets/img/portrait.jpg`, then uncomment the `<img>` line in the model card (search `index.html` for `portrait.jpg`).
- **Projects:** each card is an `<article class="project">` in `index.html`. Its `data-cat` attribute sets the filter categories and `data-search` adds search keywords. Case studies are the `<dialog class="cs">` elements near the end of the file.
- **Social preview:** `assets/img/og-image.png` (1200 × 630) is what LinkedIn and WhatsApp show when the link is shared.

## Run locally

```bash
python -m http.server 8000
# then open http://localhost:8000
```
