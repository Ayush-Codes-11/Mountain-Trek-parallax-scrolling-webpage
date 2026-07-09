# 🏔️ Everest Base Camp Trek — Parallax Scrolling Webpage

An immersive, award-winning parallax scrolling experience that takes you through **six stages** of the Everest Base Camp Trek in Nepal's Khumbu Valley.

![Site Preview](screenshots/preview.png)

---

## ✨ Features

- **True photo parallax** — six photorealistic Himalayan scene photos, each moving at a different speed from the foreground card, creating genuine depth
- **Live altitude HUD** — amber tracker on the left counts from 2,860 m to 5,644 m as you scroll
- **Smooth 60 fps animations** — all scroll updates run in a single `requestAnimationFrame` loop; only compositor-layer `transform` properties are written
- **Glassmorphism info cards** — `backdrop-filter` blur panels with scene-specific light/dark variants
- **Section navigation dots** — fixed right-side dots powered by `IntersectionObserver`
- **Star canvas hero** — animated star-field on the intro screen; paused when off-screen
- **Cursor glow** — radial gradient that lazily follows the mouse (hover devices only)
- **Fully responsive** — fluid `clamp()` typography, 3-tier mobile breakpoints
- **Accessible** — `prefers-reduced-motion` respected, `aria-*` on all interactive elements

---

## 🗺️ The Six Stages

| Stage | Location | Altitude |
|-------|----------|----------|
| 01 | Khumbu Valley Forest · Phakding | 2,860 m |
| 02 | Dudh Kosi Canyon · Namche Bazaar | 3,440 m |
| 03 | Tengboche · Ama Dablam | 3,867 m |
| 04 | Lobuche · Khumbu Glacier Moraine | 4,940 m |
| 05 | Everest Base Camp · Night | 5,364 m |
| 06 | Kala Patthar · Sunrise | 5,644 m |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | Semantic HTML5 |
| Styling | Vanilla CSS — `clamp()`, `backdrop-filter`, CSS custom properties |
| Animations | Vanilla JS — `requestAnimationFrame`, `IntersectionObserver`, `ResizeObserver` |
| Fonts | Google Fonts — Fraunces (display), Inter (body), DM Mono (mono) |
| Images | AI-generated photorealistic Himalayan scenes |
| Hosting | GitHub Pages |

No frameworks. No build step. No dependencies.

---

## 🚀 Run Locally

```bash
# Clone the repo
git clone https://github.com/Ayush-Codes-11/Mountain-Trek-parallax-scrolling-webpage.git
cd Mountain-Trek-parallax-scrolling-webpage

# Serve with Python (or any static server)
python -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

---

## 📁 Project Structure

```
├── index.html          # Page structure — hero + 6 scene sections
├── css/
│   └── style.css       # Design tokens, parallax layout, cards, responsive
├── js/
│   └── main.js         # RAF scroll loop, altitude HUD, star canvas, nav dots
├── img/
│   ├── s1-forest.jpg   # Khumbu Valley rhododendron forest
│   ├── s2-canyon.jpg   # Dudh Kosi river gorge
│   ├── s3-tengboche.jpg# Ama Dablam alpine meadow
│   ├── s4-moraine.jpg  # Khumbu glacier moraine
│   ├── s5-night.jpg    # Everest Base Camp night sky
│   └── s6-sunrise.jpg  # Kala Patthar sunrise
└── screenshots/
    └── preview.png
```

---

## 🔗 Live Demo

> **[https://ayush-codes-11.github.io/Mountain-Trek-parallax-scrolling-webpage/](https://ayush-codes-11.github.io/Mountain-Trek-parallax-scrolling-webpage/)**

---

*Inspired by the Everest Base Camp Trek, Khumbu Valley, Nepal.*
