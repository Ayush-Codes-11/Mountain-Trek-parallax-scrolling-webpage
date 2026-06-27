/**
 * Mountain Trek — main.js
 *
 * CURRENT PHASE (2): Static scaffold
 *   - Altitude HUD counter: updates on scroll based on page progress
 *   - HUD marker position: dot climbs the track with scroll
 *   - Scroll progress bar: gold fill at top of viewport
 *   - Reduced-motion flag: sets data attribute on <body> for Phase 4
 *
 * PHASE 4 (next): Add below this comment block:
 *   gsap.registerPlugin(ScrollTrigger);
 *   Per-section parallax: background (speed 0.15), midground (0.4),
 *   foreground (0.85) using transform: translateY() ONLY.
 *   Build on Section 1 first, replicate pattern to remaining 5.
 *
 * PHASE 5: Signature motion element
 *   Replace .altitude-hud__dot with SVG hiker silhouette.
 *   Hiker climbs with total scroll % — tied to overall page, not per-section.
 *   Altitude readout ticks from 1,200m → 4,200m on the same progress curve.
 *
 * PHASE 7: Lenis smooth scroll
 *   new Lenis({ lerp: 0.08, duration: 1.2 }) — wrap in RAF loop.
 *   Butter-smooth base scroll before GSAP kicks in.
 *   Pass Lenis time to ScrollTrigger.update() so both stay in sync.
 */

'use strict';


/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */

/** Altitude at the very top of the page (Section 1 start) */
const ALT_MIN = 1200;

/** Altitude at the very bottom of the page (Section 6 — Summit) */
const ALT_MAX = 4200;

/**
 * Per-section altitude ranges.
 * Used in Phase 5 for finer-grained altitude interpolation if needed.
 * Currently the altitude is derived from total scroll progress alone.
 */
const SECTION_ALTITUDES = {
  'scene-forest':    { start: 1200, end: 1800 },
  'scene-foothills': { start: 1800, end: 2600 },
  'scene-ascent':    { start: 2600, end: 3200 },
  'scene-clouds':    { start: 3200, end: 3800 },
  'scene-snowline':  { start: 3800, end: 4200 },
  'scene-summit':    { start: 4200, end: 4200 },
};


/* ═══════════════════════════════════════════════════════════════
   DOM REFERENCES
═══════════════════════════════════════════════════════════════ */

const altitudeValue  = document.getElementById('js-altitude-value');
const hudFill        = document.getElementById('js-hud-fill');
const hudMarker      = document.getElementById('js-hud-marker');
const altitudeHud    = document.getElementById('altitude-hud');
const progressFill   = document.getElementById('js-progress-fill');


/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

/**
 * Linear interpolation between a and b by factor t (0–1).
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Clamp val between min and max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Format a number as a locale string with comma thousands separators.
 * E.g., 3800 → "3,800"
 * @param {number} n
 * @returns {string}
 */
function formatAltitude(n) {
  return Math.round(n).toLocaleString('en-US');
}

/**
 * Returns the overall page scroll progress as a value from 0 to 1.
 * 0 = page top (forest base), 1 = page bottom (summit).
 * @returns {number}
 */
function getScrollProgress() {
  const scrollTop    = window.scrollY || document.documentElement.scrollTop;
  const docHeight    = document.documentElement.scrollHeight;
  const windowHeight = window.innerHeight;
  const scrollable   = docHeight - windowHeight;

  if (scrollable <= 0) return 0;
  return clamp(scrollTop / scrollable, 0, 1);
}


/* ═══════════════════════════════════════════════════════════════
   UPDATE FUNCTIONS
═══════════════════════════════════════════════════════════════ */

/**
 * Updates the altitude HUD:
 *   - Altitude number text (DM Mono, tabular numerals)
 *   - Track fill height (grows upward)
 *   - Marker dot position (climbs from 0% to 100% of track)
 *   - aria-valuenow for accessibility
 * @param {number} progress — scroll progress 0→1
 */
function updateHUD(progress) {
  const currentAlt = lerp(ALT_MIN, ALT_MAX, progress);
  const pct        = (progress * 100).toFixed(2);

  // Altitude numeral — DM Mono in CSS; only numerals output here
  if (altitudeValue) {
    altitudeValue.textContent = formatAltitude(currentAlt);
  }

  // Update ARIA progressbar value
  const track = altitudeHud
    ? altitudeHud.querySelector('[role="progressbar"]')
    : null;
  if (track) {
    track.setAttribute('aria-valuenow', Math.round(currentAlt));
  }

  // Gold fill grows from bottom (base) to top (summit)
  if (hudFill) {
    hudFill.style.height = `${pct}%`;
  }

  // Marker dot climbs the track
  if (hudMarker) {
    hudMarker.style.bottom = `${pct}%`;
  }
}

/**
 * Updates the top-of-viewport gold progress bar.
 * @param {number} progress — scroll progress 0→1
 */
function updateScrollProgressBar(progress) {
  if (progressFill) {
    progressFill.style.width = `${(progress * 100).toFixed(2)}%`;
  }
}


/* ═══════════════════════════════════════════════════════════════
   SCROLL HANDLER
   Using requestAnimationFrame to throttle DOM updates on scroll.
═══════════════════════════════════════════════════════════════ */

let rafPending = false;

function onScroll() {
  if (rafPending) return;
  rafPending = true;

  requestAnimationFrame(() => {
    const progress = getScrollProgress();
    updateHUD(progress);
    updateScrollProgressBar(progress);
    rafPending = false;
  });
}


/* ═══════════════════════════════════════════════════════════════
   REDUCED MOTION
   Sets data-reduced-motion attribute on <body>.
   Phase 4+: GSAP will check document.body.dataset.reducedMotion
   before registering any parallax tweens.
═══════════════════════════════════════════════════════════════ */

function applyReducedMotionFlag() {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  document.body.dataset.reducedMotion = prefersReducedMotion ? 'true' : 'false';
}


/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */

function init() {
  // Set reduced-motion flag for Phase 4 GSAP to read
  applyReducedMotionFlag();

  // Seed initial state (avoids flash of wrong altitude on page load)
  const initialProgress = getScrollProgress();
  updateHUD(initialProgress);
  updateScrollProgressBar(initialProgress);

  // Scroll listener — passive for performance
  window.addEventListener('scroll', onScroll, { passive: true });

  // Re-seed on resize (document height may change)
  window.addEventListener('resize', onScroll, { passive: true });

  /*
   * ── PHASE 4 placeholder ───────────────────────────────────
   * gsap.registerPlugin(ScrollTrigger);
   * initParallaxLayers();  // will be defined in Phase 4
   *
   * ── PHASE 5 placeholder ───────────────────────────────────
   * initHikerSilhouette(); // replaces .altitude-hud__dot
   *
   * ── PHASE 7 placeholder ───────────────────────────────────
   * const lenis = new Lenis({ lerp: 0.08, duration: 1.2 });
   * function raf(time) {
   *   lenis.raf(time);
   *   ScrollTrigger.update();
   *   requestAnimationFrame(raf);
   * }
   * requestAnimationFrame(raf);
   */
}

// Kick off after DOM is parsed
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init(); // DOM already ready (e.g. script at end of body)
}
