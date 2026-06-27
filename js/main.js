/**
 * Mountain Trek — main.js
 * Phase 4: GSAP ScrollTrigger parallax (Section 1) + Lenis smooth scroll
 *
 * DEPENDENCY ORDER (scripts loaded in index.html):
 *   1. gsap.min.js           — GSAP core
 *   2. ScrollTrigger.min.js  — ScrollTrigger plugin
 *   3. lenis.min.js          — Lenis smooth scroll
 *   4. main.js               — this file
 *
 * ARCHITECTURE:
 *   ┌─────────────────────────────────────────────────────┐
 *   │  User scrolls wheel / trackpad                      │
 *   │           ↓                                         │
 *   │  Lenis intercepts → applies easing → drives         │
 *   │  window scroll position smoothly                    │
 *   │           ↓                                         │
 *   │  lenis.on('scroll', ScrollTrigger.update)           │
 *   │  → ST recalculates trigger positions each frame     │
 *   │           ↓                                         │
 *   │  gsap.ticker drives lenis.raf()                     │
 *   │  → ONE shared RAF loop, no conflicts                │
 *   │           ↓                                         │
 *   │  GSAP tweens yPercent on layers (GPU transform)     │
 *   └─────────────────────────────────────────────────────┘
 *
 * GPU PERFORMANCE NOTE:
 *   All animated properties are transform: translateY (via yPercent).
 *   CSS transforms run on the compositor thread — zero layout thrash.
 *   will-change: transform already applied in Phase 3 CSS.
 *   scrub: true + ease: 'none' = direct linear scroll↔position mapping.
 *   No requestAnimationFrame loops for parallax — GSAP handles RAF.
 */

'use strict';


/* ═══════════════════════════════════════════════════════════════
   0. CONFIG
   ─────────────────────────────────────────────────────────────
   LAYER_RANGES defines the yPercent travel for each layer type.
   These values approximate the speed ratios agreed in Phase 1:
     BG  speed ≈ 0.15  →  ±20% range  (most lag, most depth illusion)
     MG  speed ≈ 0.40  →  ±12% range  (medium)
     FG  speed ≈ 0.85  →  ±5% range   (barely lags, feels nearest)

   The fromTo tween runs from start: 'top bottom' to end: 'bottom top'
   — the full distance the section travels through the viewport.
   At the midpoint (section centered in viewport), yPercent = 0 for
   all layers, so the scene always looks correct when in focus.
═══════════════════════════════════════════════════════════════ */

const LAYER_RANGES = {
  bg: { from: -20, to:  20 },
  mg: { from: -12, to:  12 },
  fg: { from:  -5, to:   5 },
};

const ALT_MIN = 1200;   // metres at page top
const ALT_MAX = 4200;   // metres at page bottom


/* ═══════════════════════════════════════════════════════════════
   1. REDUCED MOTION
   ─────────────────────────────────────────────────────────────
   Read BEFORE any animation initialisation.
   If true: skip Lenis + GSAP parallax entirely.
   HUD still updates (useful UX), native scroll is used.
═══════════════════════════════════════════════════════════════ */

const REDUCED_MOTION = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

document.body.dataset.reducedMotion = REDUCED_MOTION ? 'true' : 'false';


/* ═══════════════════════════════════════════════════════════════
   2. GSAP PLUGIN REGISTRATION
   ─────────────────────────────────────────────────────────────
   Must be called before any ScrollTrigger usage.
   Placed after the reduced-motion check to avoid registering
   if we're going to bail on all animation anyway.
═══════════════════════════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger);


/* ═══════════════════════════════════════════════════════════════
   3. LENIS SMOOTH SCROLL
   ─────────────────────────────────────────────────────────────
   COORDINATION WITH SCROLLTRIGGER — the critical bit:

   Problem: Lenis replaces native scroll with its own eased scroll.
   ScrollTrigger reads scroll position from the window.
   Without sync, they can drift: ST calculates trigger positions
   based on raw scroll, but Lenis's scroll is delayed/eased.

   Fix 1: lenis.on('scroll', ScrollTrigger.update)
     → On every Lenis scroll frame, tell ST to recalculate all
       trigger positions using Lenis's current (smooth) position.
       ST then scrubs tweens based on this position.

   Fix 2: gsap.ticker.add((time) => lenis.raf(time * 1000))
     → GSAP's internal ticker drives Lenis's requestAnimationFrame.
       Both systems share ONE RAF loop. No two independent loops
       competing for the same scroll position.

   Fix 3: gsap.ticker.lagSmoothing(0)
     → By default GSAP compresses elapsed time when a browser tab
       is backgrounded and re-focused. This would make Lenis
       "catch up" with a single fast jump. Disabling ensures
       returning to the tab doesn't cause a scroll jank burst.

   RESULT: Smooth, eased scroll position feeds directly and
   synchronously into GSAP parallax tweens. Fast trackpad flicks
   = smooth parallax without jank, because Lenis eases the INPUT.
═══════════════════════════════════════════════════════════════ */

let lenis;

function initLenis() {
  if (REDUCED_MOTION) return;

  lenis = new Lenis({
    duration:           1.2,
    easing:             (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation:        'vertical',
    gestureOrientation: 'vertical',
    smoothWheel:        true,
    touchMultiplier:    2.0,
    infinite:           false,
  });

  // Fix 1: every Lenis update feeds into ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  // Fix 2: GSAP ticker drives Lenis (shared RAF)
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  // Fix 3: prevent lag-smoothing jank on tab-switch
  gsap.ticker.lagSmoothing(0);
}


/* ═══════════════════════════════════════════════════════════════
   4. PARALLAX UTILITY FUNCTION
   ─────────────────────────────────────────────────────────────
   Creates one scrubbed fromTo tween for a single layer element.

   trigger: the section element — ST uses its bounds to set
            start/end scroll positions.
   start: 'top bottom'  — tween begins as section-top enters viewport
   end:   'bottom top'  — tween ends as section-bottom leaves viewport
   scrub: true          — yPercent is a DIRECT function of scroll
                          position, not duration. No async delay.
   ease: 'none'         — linear mapping. Lenis handles the easing
                          on the input side; the tween itself is linear.
   invalidateOnRefresh  — recalculate trigger positions on resize.

   GPU check: yPercent → transform: translateY(x%)
   Compositor-thread only. No layout, no paint.
═══════════════════════════════════════════════════════════════ */

function parallaxLayer(el, from, to, trigger) {
  if (!el) return;

  gsap.fromTo(
    el,
    { yPercent: from },
    {
      yPercent: to,
      ease: 'none',
      scrollTrigger: {
        trigger,
        start:              'top bottom',
        end:                'bottom top',
        scrub:              true,
        invalidateOnRefresh: true,
      },
    }
  );
}


/* ═══════════════════════════════════════════════════════════════
   5. SECTION 1 — FOREST BASE — PARALLAX
   ─────────────────────────────────────────────────────────────
   Phase 4, Section 1 only.
   Awaiting user approval before replicating to Sections 2-6.

   Three layers, three different yPercent ranges:
     BG (±20): large range → lots of movement relative to section
               → appears to lag far behind → reads as DISTANT
     MG (±12): medium range → moderate lag → mid-distance
     FG (±5):  small range → barely lags → reads as NEAR

   At rest (section centered in viewport), all layers at yPercent 0
   — this ensures the scene composition is correct when in focus.
   CSS overflow: hidden on the section clips any edge bleeding.
═══════════════════════════════════════════════════════════════ */

function initSection1Parallax() {
  const section = document.getElementById('scene-forest');
  if (!section) return;

  parallaxLayer(
    section.querySelector('.layer--bg'),
    LAYER_RANGES.bg.from, LAYER_RANGES.bg.to,
    section
  );

  parallaxLayer(
    section.querySelector('.layer--mg'),
    LAYER_RANGES.mg.from, LAYER_RANGES.mg.to,
    section
  );

  parallaxLayer(
    section.querySelector('.layer--fg'),
    LAYER_RANGES.fg.from, LAYER_RANGES.fg.to,
    section
  );
}


/* ═══════════════════════════════════════════════════════════════
   6. COLOR BLEEDS — Section boundary crossfades
   ─────────────────────────────────────────────────────────────
   Each .scene__bleed div sits at the bottom of its section and
   contains a gradient pointing toward the next section's top color.

   GSAP scrubs its opacity 0 → 1 as the NEXT section enters the
   viewport, creating a smooth color handoff at the boundary.

   Section 1 → 2 implemented here (Phase 4, Section 1 only).
   Sections 2-5 bleeds activated in Phase 4.2 after approval.

   Trigger explanation:
     trigger: '#scene-foothills'   — watch Section 2
     start: 'top 80%'              — bleed starts when S2 is 80%
                                     down from viewport top
     end: 'top top'                — fully opaque when S2's top
                                     reaches viewport top
     scrub: true                   — opacity directly follows scroll
═══════════════════════════════════════════════════════════════ */

function initColorBleeds() {
  // ── Section 1 → Section 2 ──
  const bleed1 = document.querySelector('#scene-forest .scene__bleed');
  if (bleed1) {
    gsap.fromTo(bleed1,
      { opacity: 0 },
      {
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger:            '#scene-foothills',
          start:              'top 60%',   // recalibrated for 200vh sections
          end:                'top top',
          scrub:              true,
          invalidateOnRefresh: true,
        },
      }
    );
  }

  // ── Sections 2-5 bleeds (Phase 4.2 — after Section 1 approval) ──
  // Uncomment each block and add .scene__bleed divs to HTML:

  // const bleed2 = document.querySelector('#scene-foothills .scene__bleed');
  // if (bleed2) { gsap.fromTo(bleed2, { opacity: 0 }, { opacity: 1, ease: 'none',
  //   scrollTrigger: { trigger: '#scene-ascent', start: 'top 80%',
  //   end: 'top top', scrub: true, invalidateOnRefresh: true }}) }

  // const bleed3 = document.querySelector('#scene-ascent .scene__bleed');
  // if (bleed3) { gsap.fromTo(bleed3, { opacity: 0 }, { opacity: 1, ease: 'none',
  //   scrollTrigger: { trigger: '#scene-clouds', start: 'top 80%',
  //   end: 'top top', scrub: true, invalidateOnRefresh: true }}) }

  // const bleed4 = document.querySelector('#scene-clouds .scene__bleed');
  // if (bleed4) { gsap.fromTo(bleed4, { opacity: 0 }, { opacity: 1, ease: 'none',
  //   scrollTrigger: { trigger: '#scene-snowline', start: 'top 80%',
  //   end: 'top top', scrub: true, invalidateOnRefresh: true }}) }

  // const bleed5 = document.querySelector('#scene-snowline .scene__bleed');
  // if (bleed5) { gsap.fromTo(bleed5, { opacity: 0 }, { opacity: 1, ease: 'none',
  //   scrollTrigger: { trigger: '#scene-summit', start: 'top 80%',
  //   end: 'top top', scrub: true, invalidateOnRefresh: true }}) }
}


/* ═══════════════════════════════════════════════════════════════
   7. SECTIONS 2-6 — PARALLAX SCAFFOLD (Phase 4.2)
   ─────────────────────────────────────────────────────────────
   Exact same pattern as initSection1Parallax().
   Activate each function call in init() after user approval.
═══════════════════════════════════════════════════════════════ */

function initSection2Parallax() {
  const section = document.getElementById('scene-foothills');
  if (!section) return;
  parallaxLayer(section.querySelector('.layer--bg'), LAYER_RANGES.bg.from, LAYER_RANGES.bg.to, section);
  parallaxLayer(section.querySelector('.layer--mg'), LAYER_RANGES.mg.from, LAYER_RANGES.mg.to, section);
  parallaxLayer(section.querySelector('.layer--fg'), LAYER_RANGES.fg.from, LAYER_RANGES.fg.to, section);
}

function initSection3Parallax() {
  const section = document.getElementById('scene-ascent');
  if (!section) return;
  parallaxLayer(section.querySelector('.layer--bg'), LAYER_RANGES.bg.from, LAYER_RANGES.bg.to, section);
  parallaxLayer(section.querySelector('.layer--mg'), LAYER_RANGES.mg.from, LAYER_RANGES.mg.to, section);
  parallaxLayer(section.querySelector('.layer--fg'), LAYER_RANGES.fg.from, LAYER_RANGES.fg.to, section);
}

function initSection4Parallax() {
  const section = document.getElementById('scene-clouds');
  if (!section) return;
  parallaxLayer(section.querySelector('.layer--bg'), LAYER_RANGES.bg.from, LAYER_RANGES.bg.to, section);
  parallaxLayer(section.querySelector('.layer--mg'), LAYER_RANGES.mg.from, LAYER_RANGES.mg.to, section);
  parallaxLayer(section.querySelector('.layer--fg'), LAYER_RANGES.fg.from, LAYER_RANGES.fg.to, section);
}

function initSection5Parallax() {
  const section = document.getElementById('scene-snowline');
  if (!section) return;
  parallaxLayer(section.querySelector('.layer--bg'), LAYER_RANGES.bg.from, LAYER_RANGES.bg.to, section);
  parallaxLayer(section.querySelector('.layer--mg'), LAYER_RANGES.mg.from, LAYER_RANGES.mg.to, section);
  parallaxLayer(section.querySelector('.layer--fg'), LAYER_RANGES.fg.from, LAYER_RANGES.fg.to, section);
}

function initSection6Parallax() {
  const section = document.getElementById('scene-summit');
  if (!section) return;
  parallaxLayer(section.querySelector('.layer--bg'), LAYER_RANGES.bg.from, LAYER_RANGES.bg.to, section);
  parallaxLayer(section.querySelector('.layer--mg'), LAYER_RANGES.mg.from, LAYER_RANGES.mg.to, section);
  parallaxLayer(section.querySelector('.layer--fg'), LAYER_RANGES.fg.from, LAYER_RANGES.fg.to, section);
}


/* ═══════════════════════════════════════════════════════════════
   8. ALTITUDE HUD + SCROLL PROGRESS BAR
   ─────────────────────────────────────────────────────────────
   Carried over from Phase 2, unchanged.
   RAF-throttled scroll listener.
   HUD reads window.scrollY (Lenis still updates window.scrollY
   so this continues to work correctly).
═══════════════════════════════════════════════════════════════ */

const elAltValue  = document.getElementById('js-altitude-value');
const elHudFill   = document.getElementById('js-hud-fill');
const elHudMarker = document.getElementById('js-hud-marker');
const elAltHud    = document.getElementById('altitude-hud');
const elProgress  = document.getElementById('js-progress-fill');

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function fmtAlt(n) { return Math.round(n).toLocaleString('en-US'); }

function getPageProgress() {
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const maxScroll =
    document.documentElement.scrollHeight - window.innerHeight;
  return maxScroll > 0 ? clamp(scrollY / maxScroll, 0, 1) : 0;
}

function refreshHUD() {
  const p   = getPageProgress();
  const alt = lerp(ALT_MIN, ALT_MAX, p);
  const pct = (p * 100).toFixed(2);

  if (elAltValue)  elAltValue.textContent = fmtAlt(alt);
  if (elHudFill)   elHudFill.style.height  = `${pct}%`;
  if (elHudMarker) elHudMarker.style.bottom = `${pct}%`;

  const pb = elAltHud?.querySelector('[role="progressbar"]');
  if (pb) pb.setAttribute('aria-valuenow', Math.round(alt));

  if (elProgress) elProgress.style.width = `${pct}%`;
}

let hudRafPending = false;
function onScroll() {
  if (hudRafPending) return;
  hudRafPending = true;
  requestAnimationFrame(() => {
    refreshHUD();
    hudRafPending = false;
  });
}


/* ═══════════════════════════════════════════════════════════════
   9. INIT
═══════════════════════════════════════════════════════════════ */

function init() {
  // ── Step 1: Smooth scroll (Lenis) — must run before any ST tweens
  initLenis();

  if (!REDUCED_MOTION) {

    // ── Step 2: Section 1 parallax (Phase 4 — approved scope)
    initSection1Parallax();

    // ── Step 3: Color bleed at Section 1→2 boundary
    initColorBleeds();

    // ── Phase 4.2: Activate after Section 1 approval ──────────
    // initSection2Parallax();
    // initSection3Parallax();
    // initSection4Parallax();
    // initSection5Parallax();
    // initSection6Parallax();
    // ──────────────────────────────────────────────────────────

    // Phase 5: initHikerSilhouette() — goes here
  }

  // ── Step 4: HUD (runs regardless of reduced-motion)
  refreshHUD();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
}

// Robust DOM-ready handling
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
