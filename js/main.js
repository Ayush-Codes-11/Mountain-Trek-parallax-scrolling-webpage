/**
 * Mountain Trek — main.js
 * Phase 4 (all 6 sections): Height-ratio parallax + Lenis + GSAP ScrollTrigger
 *
 * DEPENDENCY ORDER (scripts in index.html):
 *   1. gsap.min.js           — GSAP core
 *   2. ScrollTrigger.min.js  — ScrollTrigger plugin
 *   3. lenis.min.js          — Lenis smooth scroll
 *   4. main.js               — this file
 *
 * SCROLL STACK:
 *   wheel/trackpad → Lenis (eased input) → ScrollTrigger.update → GSAP scrub
 *   All parallax via transform: translateY (GPU compositor, zero layout cost)
 */

'use strict';


/* ═══════════════════════════════════════════════════════════════
   0. CONFIG
═══════════════════════════════════════════════════════════════ */

/*
  BASE yPercent ranges — calibrated on Section 1, approved Phase 4.
  These are the values used when a section is EXACTLY the reference height.
  The height-ratio formula scales them for sections that differ.

  BG ±20 → speed ≈ 0.15, furthest from viewer (most lag)
  MG ±12 → speed ≈ 0.40, mid-distance
  FG ±5  → speed ≈ 0.85, nearest (barely lags)
*/
const BASE_RANGES = {
  bg: { from: -20, to:  20 },
  mg: { from: -12, to:  12 },
  fg: { from:  -5, to:   5 },
};

// All 6 section IDs in narrative order
const SECTION_IDS = [
  'scene-forest',
  'scene-foothills',
  'scene-ascent',
  'scene-clouds',
  'scene-snowline',
  'scene-summit',
];

const ALT_MIN = 1200;
const ALT_MAX = 4200;


/* ═══════════════════════════════════════════════════════════════
   1. REDUCED MOTION
═══════════════════════════════════════════════════════════════ */

const REDUCED_MOTION = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

document.body.dataset.reducedMotion = REDUCED_MOTION ? 'true' : 'false';


/* ═══════════════════════════════════════════════════════════════
   2. GSAP PLUGIN REGISTRATION
   Must precede any ScrollTrigger usage.
═══════════════════════════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger);


/* ═══════════════════════════════════════════════════════════════
   3. LENIS SMOOTH SCROLL

   Coordination strategy with ScrollTrigger:
   • lenis.on('scroll', ScrollTrigger.update)
       → every Lenis frame tells ST to recalculate trigger positions
         using Lenis's current (smoothed) scroll position
   • gsap.ticker drives lenis.raf()
       → one shared RAF loop; Lenis and GSAP never fight
   • gsap.ticker.lagSmoothing(0)
       → prevents GSAP from time-compressing on tab-switch,
         which would make Lenis "catch up" with a jank burst
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

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}


/* ═══════════════════════════════════════════════════════════════
   4. HEIGHT-RATIO PARALLAX FORMULA
   ─────────────────────────────────────────────────────────────

   PROBLEM BEING SOLVED:
   Fixed yPercent values (±20/±12/±5) produce a consistent APPARENT
   SPEED only when all sections are exactly the same height. If any
   section renders taller or shorter (due to text wrapping, font
   scaling, accessibility text-size, responsive breakpoints), that
   section's layers move at a different rate per pixel scrolled.

   THE FORMULA (applied at runtime, recalculated on resize):

     refHeight  = Section 1's getBoundingClientRect().height
                  (the already-approved reference)

     thisHeight = this section's getBoundingClientRect().height

     ratio      = thisHeight / refHeight

     BG range   = BASE ±20  ×  ratio
     MG range   = BASE ±12  ×  ratio
     FG range   = BASE ±5   ×  ratio

   WHY IT WORKS:
   yPercent is a % of the ELEMENT's height. Since .layer fills 100%
   of its section, 1% yPercent = 1% of section height in absolute px.

     Layer movement (px) = range × sectionHeight / 100
                         = (base × ratio) × sectionHeight / 100
                         = base × (thisHeight / refHeight) × thisHeight / 100

     Scroll distance     = sectionHeight + viewportHeight

     Apparent speed      ≈ base × thisHeight / refHeight / (thisHeight + vH)

   When sections are close in height (all min-height: 200vh, so
   heights differ only by content overflow), thisHeight ≈ refHeight,
   ratio ≈ 1.0, and apparent speed is virtually identical.
   The formula gracefully absorbs small differences without requiring
   every section to be exactly the same pixel height forever.

   SECTION 1 UNCHANGED:
   ratio = refHeight / refHeight = 1.0 → ranges = ±20/±12/±5 exactly.
   Section 1 feels identical to the Phase 4 approved version.

   RESIZE HANDLING:
   Heights are re-measured after every resize (debounced 200ms).
   All parallax ScrollTriggers are killed and recreated with fresh
   ratio values. ScrollTrigger.refresh() repositions all triggers.
═══════════════════════════════════════════════════════════════ */

// Module-level registry of active parallax ScrollTriggers.
// Killed and repopulated on resize.
const parallaxTriggers = [];

/**
 * Build the three-layer parallax tweens for one section.
 * @param {HTMLElement} section  — the section element
 * @param {number}      refHeight — Section 1's measured height in px
 */
function buildSectionParallax(section, refHeight) {
  const thisHeight = section.getBoundingClientRect().height;
  const ratio = refHeight > 0 ? thisHeight / refHeight : 1;

  const layerDefs = [
    { selector: '.layer--bg', base: BASE_RANGES.bg },
    { selector: '.layer--mg', base: BASE_RANGES.mg },
    { selector: '.layer--fg', base: BASE_RANGES.fg },
  ];

  layerDefs.forEach(({ selector, base }) => {
    const el = section.querySelector(selector);
    if (!el) return;

    const scaledFrom = base.from * ratio;
    const scaledTo   = base.to   * ratio;

    const tween = gsap.fromTo(
      el,
      { yPercent: scaledFrom },
      {
        yPercent: scaledTo,
        ease: 'none',              // linear: Lenis handles input easing
        scrollTrigger: {
          trigger:             section,
          start:               'top bottom', // enters viewport bottom
          end:                 'bottom top', // exits viewport top
          scrub:               true,         // direct position↔scroll mapping
          invalidateOnRefresh: true,         // recalc on ST's own refresh
        },
      }
    );

    // Register for cleanup on resize
    if (tween.scrollTrigger) parallaxTriggers.push(tween.scrollTrigger);
  });
}

/**
 * Kill all existing parallax triggers, remeasure every section,
 * and rebuild with fresh ratio values.
 * Called on: initial load + every debounced resize.
 */
function initAllParallax() {
  // 1. Destroy previous ScrollTrigger instances
  parallaxTriggers.forEach(st => st.kill());
  parallaxTriggers.length = 0;

  // 2. Measure reference section (Section 1 = approved baseline)
  const refSection = document.getElementById(SECTION_IDS[0]);
  if (!refSection) return;
  const refHeight = refSection.getBoundingClientRect().height;

  // 3. Build parallax for all 6 sections
  SECTION_IDS.forEach(id => {
    const section = document.getElementById(id);
    if (section) buildSectionParallax(section, refHeight);
  });

  // 4. Recalculate all ST trigger positions (including color bleeds)
  ScrollTrigger.refresh();
}


/* ═══════════════════════════════════════════════════════════════
   5. COLOR BLEEDS — section-boundary crossfades
   ─────────────────────────────────────────────────────────────
   Section 1→2 active. Sections 2-5 bleeds require .scene__bleed
   divs to be added to HTML first (Phase 4.2 / Phase 6 polish).
═══════════════════════════════════════════════════════════════ */

function initColorBleeds() {
  const bleed1 = document.querySelector('#scene-forest .scene__bleed');
  if (bleed1) {
    gsap.fromTo(bleed1,
      { opacity: 0 },
      {
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger:             '#scene-foothills',
          start:               'top 60%',
          end:                 'top top',
          scrub:               true,
          invalidateOnRefresh: true,
        },
      }
    );
  }
}


/* ═══════════════════════════════════════════════════════════════
   6. ALTITUDE HUD + SCROLL PROGRESS BAR
═══════════════════════════════════════════════════════════════ */

const elAltValue  = document.getElementById('js-altitude-value');
const elHudFill   = document.getElementById('js-hud-fill');
const elHudMarker = document.getElementById('js-hud-marker');
const elAltHud    = document.getElementById('altitude-hud');
const elProgress  = document.getElementById('js-progress-fill');

function lerp(a, b, t)    { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function fmtAlt(n)        { return Math.round(n).toLocaleString('en-US'); }

function getPageProgress() {
  const scrollY   = window.scrollY || document.documentElement.scrollTop;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  return maxScroll > 0 ? clamp(scrollY / maxScroll, 0, 1) : 0;
}

function refreshHUD() {
  const p   = getPageProgress();
  const alt = lerp(ALT_MIN, ALT_MAX, p);
  const pct = (p * 100).toFixed(2);

  if (elAltValue)  elAltValue.textContent   = fmtAlt(alt);
  if (elHudFill)   elHudFill.style.height   = `${pct}%`;
  if (elHudMarker) elHudMarker.style.bottom = `${pct}%`;

  const pb = elAltHud?.querySelector('[role="progressbar"]');
  if (pb) pb.setAttribute('aria-valuenow', Math.round(alt));

  if (elProgress) elProgress.style.width = `${pct}%`;
}

let hudRafPending = false;
function onScroll() {
  if (hudRafPending) return;
  hudRafPending = true;
  requestAnimationFrame(() => { refreshHUD(); hudRafPending = false; });
}


/* ═══════════════════════════════════════════════════════════════
   7. RESIZE HANDLER
   ─────────────────────────────────────────────────────────────
   Debounced 200ms — avoids thrashing during continuous resize drag.
   Kills + recreates all parallax with freshly measured heights.
   initAllParallax() already calls ScrollTrigger.refresh() internally.
═══════════════════════════════════════════════════════════════ */

let resizeTimeout;
function onResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    initAllParallax(); // remeasures, rebuilds, refreshes
    refreshHUD();
  }, 200);
}


/* ═══════════════════════════════════════════════════════════════
   8. INIT
═══════════════════════════════════════════════════════════════ */

function init() {
  // Step 1: smooth scroll (must precede all ST tweens)
  initLenis();

  if (!REDUCED_MOTION) {
    // Step 2: all 6 sections — height-ratio formula
    initAllParallax();

    // Step 3: section boundary color bleeds
    initColorBleeds();
  }

  // Step 4: HUD (always runs, motion-agnostic)
  refreshHUD();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  // Phase 5: initHikerSilhouette() goes here
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
