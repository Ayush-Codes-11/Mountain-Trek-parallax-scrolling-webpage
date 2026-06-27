# Mountain Trek — Parallax Scrolling Website

An immersive, scroll-driven single-page experience — a visual journey through six stages of elevation, from forest base (1,200m) to alpine summit (4,200m). Every design decision is derived from the subject matter, not generic AI aesthetic defaults.

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Markup | Plain HTML5 | Semantic `<section>` per scene; no framework overhead |
| Styling | Plain CSS3 + custom properties | Full control over bespoke palette/type/spacing tokens |
| Visuals | Inline SVG silhouettes | Crisp at any size, recoloured per section via CSS tokens |
| Scroll/Motion | GSAP 3 + ScrollTrigger (CDN) | Reliable, controllable per-layer scroll-speed differences |
| Smooth scroll | Lenis (CDN) | Buttery base scroll feel before GSAP activates |
| Build tooling | None | Open `index.html` directly — no npm, no bundler |
| Hosting | Vercel (GitHub auto-deploy) | Free, clean URL, redeployes on every push |

## Typography

Three-font system, each strictly scoped by role:

| Face | Role | Scope |
|---|---|---|
| **Fraunces** (variable, display) | Leads visually | Section headings only — always the largest element on screen |
| **Alegreya** (humanist serif) | Supports quietly | Subheadings and body paragraphs — legible, warm, not competing |
| **DM Mono** (monospaced) | Stays incidental | Altitude readout, elevation labels, numerical data only — never headline size |

## Palette — Elevation Arc

| Token | Hex | Represents |
|---|---|---|
| `forest-floor` | `#2D4A22` | Deep conifer green — Section 1 |
| `warm-bark` | `#8B5E3C` | Trail dirt, bark — Sections 1–2 accents |
| `earth-stone` | `#7A6652` | Foothills rock/earth — Section 2 |
| `cliff-grey` | `#5C5C6B` | Rocky ascent — Section 3 |
| `alpine-mist` | `#C8CDD6` | Cloud layer light — Section 4 |
| `snowline-blue` | `#A8C0D6` | Snow-capped ridges — Section 5 |
| `void-sky` | `#1A2B3C` | Deep alpine sky — Sections 5–6 |
| `summit-gold` | `#E8A84C` | **Reserved: summit sunrise only** — Section 6 payoff |

## Sections

| # | Scene | Elevation | Mood |
|---|---|---|---|
| 1 | Forest Base | 1,200m | Deep greens, warm amber light |
| 2 | Foothills | 1,800m | Olive/earth tones, first view of range |
| 3 | Rocky Ascent | 2,600m | Grey-brown, harsher light |
| 4 | Cloud Layer | 3,200m | Soft white-grey, diffused |
| 5 | Snowline | 3,800m | Cool blues/whites, alpine cold |
| 6 | Summit | 4,200m | Gold, pink, triumphant |

## Signature Motion Element

A hiker silhouette (SVG) pinned to the right edge of the viewport climbs the full page height as you scroll, accompanied by an altitude counter (DM Mono) ticking from 1,200m → 4,200m — tied to total scroll progress, not per-section.

## Running Locally

No build step needed. Open `index.html` in any modern browser.

## File Structure

```
/index.html       — 6 semantic scene sections
/css/style.css    — design tokens, typography, scene themes
/js/main.js       — scroll logic (Phase 2); GSAP/Lenis added in Phases 4/7
/README.md        — this file
```

## Build Phases

- **Phase 2** (current): Static HTML/CSS scaffold — all sections, typography, colour arc  
- **Phase 3**: SVG silhouette layers (bg/midground/foreground) per section, static  
- **Phase 4**: GSAP ScrollTrigger parallax mechanics  
- **Phase 5**: Hiker silhouette + altitude counter signature motion  
- **Phase 6**: Polish — type scale, section crossfades, hover details  
- **Phase 7**: Performance pass — Lenis, reduced-motion, GPU-only properties  
- **Phase 8**: Responsive pass  
- **Phase 9**: Cross-browser QA (Chrome, Firefox, iOS Safari)  
- **Phase 10**: Vercel deploy
