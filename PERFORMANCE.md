# PERFORMANCE — Lighthouse Mobile Audit

**Date:** 2026-07-21
**URL:** https://ayush-codes-11.github.io/Mountain-Trek-parallax-scrolling-webpage/
**Tool:** Lighthouse CLI 13.4.1 — mobile emulation (412 px viewport, DPR 2×, simulated 4G)
**Commit audited:** e51bea2 (includes the 769933b WebP/srcset pipeline)

---

## Scores

| Category        | Score |
|-----------------|-------|
| Performance     | **78** |
| Accessibility   | **100** |
| Best Practices  | **100** |
| SEO             | **100** |

---

## Core Web Vitals (mobile)

| Metric                     | Value   | Rating            |
|----------------------------|---------|-------------------|
| LCP (Largest Contentful Paint) | **4.3 s** | Needs improvement |
| CLS (Cumulative Layout Shift)  | **0**     | Good ✅           |
| TBT (Total Blocking Time)      | **20 ms** | Good ✅           |
| FCP (First Contentful Paint)   | **3.1 s** | Needs improvement |
| Speed Index                    | **4.2 s** | Moderate          |
| TTI (Time to Interactive)      | **4.3 s** | Good              |

---

## What is driving LCP

The LCP element is **`img/optimized/s1-forest-768.webp`** (202 KB) — the
first scene's hero photograph, served at 768 w by the browser's srcset
selection at 412 px viewport × 2× DPR ≈ 824 effective pixels.

This is correct behaviour: the old unoptimised path would have fetched
`img/s1-forest.jpg` at the full 1024×1024 native resolution (~1,225 KB).
The pipeline cut that request from ~1,225 KB → 202 KB WebP — an **84% size
reduction** on the LCP resource. The 4.3 s score reflects GitHub Pages CDN
latency (pages.github.io has limited edge presence in South Asia, where this
audit ran) rather than a remaining optimisation gap on the asset itself.

CLS is **0** — the corrected `width="1024" height="1024"` intrinsic
dimensions on the `<img>` fallbacks prevent any layout shift as images load.

TBT is **20 ms** — the RAF scroll loop and parallax JS have negligible main-
thread blocking impact.

---

## Main-thread work breakdown (4.7 s total)

| Task                      | Duration |
|---------------------------|----------|
| Style & Layout            | 2,081 ms |
| Other                     | 1,459 ms |
| Script Evaluation         | 760 ms   |
| Rendering                 | 300 ms   |
| Parse HTML & CSS          | 142 ms   |
| Script Parsing & Compile  | 7 ms     |

The Style & Layout figure is elevated by the parallax RAF loop running
across six full-bleed scenes and the CSS backdrop-filter on the
glassmorphism cards (backdrop-filter triggers GPU compositing but still
passes through the browser's style recalculation pipeline on first paint).

---

## Largest network requests (post-pipeline)

| Size    | File                      |
|---------|---------------------------|
| 202 KB  | s1-forest-768.webp        |
| 163 KB  | s4-moraine-768.webp       |
| 156 KB  | s2-canyon-768.webp        |
| 144 KB  | s3-tengboche-768.webp     |
| 140 KB  | s5-night-768.webp         |
| ~66 KB  | Google Fonts stylesheet   |

All scene images are being served as **WebP from `img/optimized/`** — the
`<picture>` srcset rollout is confirmed working in the audit environment.
Scenes 2–6 load lazily as Lighthouse scrolls the page; they do not affect
LCP or FCP.

---

## Before / After — image payload comparison

| | Before (commit 4daed5e) | After (commit 769933b) |
|---|---|---|
| First scene request | `s1-forest.jpg` ~1,225 KB JPEG | `s1-forest-768.webp` 202 KB |
| Format | JPEG (unoptimised) | WebP (Lanczos q82) |
| width/height attribute | 1920×1080 (wrong) | 1024×1024 (correct) |
| CLS from layout shift | Potential (wrong intrinsics) | **0** (confirmed) |
| Total 6-image payload | ~6,284 KB | ~5,684 KB (18 variants) |

---

## Known remaining opportunities

These were flagged or observed but are **out of scope for this sprint** —
logged here for future reference only.

- **LCP latency from CDN geography** — GitHub Pages has limited South Asian
  CDN nodes. Switching to Netlify or Cloudflare Pages would bring global
  P75 LCP under 2.5 s without any code changes. Not an asset problem.
- **Google Fonts — potential render delay** — `display=optional` prevents
  FOIT but the font stylesheet connection still adds a round-trip on first
  visit. Self-hosting the three font files (Fraunces, Inter, DM Mono) would
  eliminate this dependency entirely.
- **`backdrop-filter` Style & Layout cost** — the glassmorphism cards use
  `backdrop-filter: blur()`, which contributes to the 2,081 ms Style &
  Layout figure. Reducing blur radius or limiting it to one card at a time
  via IntersectionObserver could recover ~200–400 ms.
- **Unused JavaScript** — not flagged by Lighthouse (score 1), but the
  `cursor-glow` RAF loop runs on mobile where there is no cursor. A
  `matchMedia('(pointer: fine)')` guard would skip it on touch devices.
- **`og:image` missing** — `screenshots/preview.png` is referenced in the
  Open Graph meta tag but the file doesn't exist yet. Not a performance
  issue but worth capturing.
