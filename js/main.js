'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ── Constants ─────────────────────────────────────────────── */
  const ALT_MIN   = 2860;
  const ALT_MAX   = 5644;
  const REDUCED   = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const HAS_HOVER = window.matchMedia('(hover:hover)').matches;

  /* ── DOM refs (cached once at startup) ─────────────────────── */
  const progressFill  = document.getElementById('progress-fill');
  const altFill       = document.getElementById('alt-fill');
  const altMarker     = document.getElementById('alt-marker');
  const altValue      = document.getElementById('alt-value');
  const altTrack      = document.querySelector('.alt-hud__track');
  const hudMobileValue = document.getElementById('hud-mobile-value'); // mobile pill
  const cursorGlow    = document.getElementById('cursor-glow');
  const heroEl        = document.querySelector('.hero');
  const heroStars     = document.getElementById('hero-stars');
  const ctaBtn        = document.getElementById('cta-start');

  const navDots       = Array.from(document.querySelectorAll('.nav-dot'));
  const scenes        = Array.from(document.querySelectorAll('.scene'));
  const sceneContents = Array.from(document.querySelectorAll('.scene__content'));
  const trekkers      = [];

  // Cache photo layer refs AND their data-speed values once — avoid
  // repeated querySelector + parseFloat inside the hot scroll loop.
  const photoLayers = Array.from(document.querySelectorAll('.scene__photo'));
  const photoSpeeds = photoLayers.map(el => parseFloat(el.dataset.speed) || 0.2);

  // Section IDs used for nav dot tracking (includes hero)
  const sectionEls = ['top','forest','waterfall','cliff','snow','night','summit']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  /* ═══════════════════════════════════════════════════════════
     1. HERO STAR CANVAS
     Paused by IntersectionObserver when hero leaves viewport.
     Paused by visibilitychange when tab is hidden.
  ═══════════════════════════════════════════════════════════ */
  let starRaf = null;

  if (heroStars && !REDUCED) {
    const ctx  = heroStars.getContext('2d');
    let stars  = [];
    let heroVisible = true;

    function resizeCanvas() {
      heroStars.width  = heroStars.offsetWidth;
      heroStars.height = heroStars.offsetHeight;
      buildStars();
    }

    function buildStars() {
      const n = Math.floor(heroStars.width * heroStars.height / 5000);
      stars = Array.from({ length: n }, () => ({
        x:     Math.random() * heroStars.width,
        y:     Math.random() * heroStars.height,
        r:     Math.random() * 1.4 + 0.3,
        alpha: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.4 + 0.1,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function drawStars(t) {
      ctx.clearRect(0, 0, heroStars.width, heroStars.height);
      const len = stars.length;
      for (let i = 0; i < len; i++) {
        const s = stars[i];
        const a = s.alpha * (0.65 + 0.35 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.fill();
      }
    }

    function startStars() {
      if (starRaf !== null || document.hidden || !heroVisible) return;
      const tick = (t) => { drawStars(t / 1000); starRaf = requestAnimationFrame(tick); };
      starRaf = requestAnimationFrame(tick);
    }
    function stopStars() {
      if (starRaf !== null) { cancelAnimationFrame(starRaf); starRaf = null; }
    }

    new IntersectionObserver((entries) => {
      heroVisible = entries[0].isIntersecting;
      heroVisible ? startStars() : stopStars();
    }, { threshold: 0.05 }).observe(heroEl);

    document.addEventListener('visibilitychange', () => {
      document.hidden ? stopStars() : startStars();
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeCanvas, 200);
    }, { passive: true });

    resizeCanvas();
    startStars();
  }

  /* ═══════════════════════════════════════════════════════════
     2. CURSOR GLOW (desktop hover only)
     Single RAF loop; paused when tab hidden.
  ═══════════════════════════════════════════════════════════ */
  if (cursorGlow && HAS_HOVER && !REDUCED) {
    let mx = window.innerWidth  / 2;
    let my = window.innerHeight / 2;
    let cx = mx, cy = my;
    let glowRaf = null;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
    }, { passive: true });

    function startGlow() {
      if (glowRaf !== null || document.hidden) return;
      const tick = () => {
        cx += (mx - cx) * 0.08;
        cy += (my - cy) * 0.08;
        cursorGlow.style.left = `${cx.toFixed(1)}px`;
        cursorGlow.style.top  = `${cy.toFixed(1)}px`;
        glowRaf = requestAnimationFrame(tick);
      };
      glowRaf = requestAnimationFrame(tick);
    }
    function stopGlow() {
      if (glowRaf !== null) { cancelAnimationFrame(glowRaf); glowRaf = null; }
    }

    document.addEventListener('visibilitychange', () => {
      document.hidden ? stopGlow() : startGlow();
    });
    startGlow();
  }

  /* ═══════════════════════════════════════════════════════════
     3. CONTENT REVEAL — IntersectionObserver
     Fires once per element; unobserves immediately after.
  ═══════════════════════════════════════════════════════════ */
  if ('IntersectionObserver' in window && !REDUCED) {
    const revealIO = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    sceneContents.forEach(el => revealIO.observe(el));
  } else {
    // Fallback: show everything immediately (no-IO or reduced-motion)
    sceneContents.forEach(el => el.classList.add('is-visible'));
  }

  /* ═══════════════════════════════════════════════════════════
     4. NAV DOTS — IntersectionObserver
     Single observer for all sections; updates active dot class.
  ═══════════════════════════════════════════════════════════ */
  if (navDots.length && 'IntersectionObserver' in window) {
    const sectionMap = new Map(sectionEls.map((el, i) => [el, i]));

    const navIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const idx = sectionMap.get(entry.target) ?? -1;
        if (idx === -1) return;
        navDots.forEach((dot, i) => dot.classList.toggle('is-active', i === idx));
      });
    }, { threshold: 0.4 });

    sectionEls.forEach(el => navIO.observe(el));
  }

  /* ═══════════════════════════════════════════════════════════
     5. SCROLL STATE
  ═══════════════════════════════════════════════════════════ */
  let scrollY   = window.scrollY;
  let isTicking = false;
  let vh        = window.innerHeight;
  let maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);

  /** Recompute viewport + scroll metrics — called on load, resize, and
   *  whenever the document changes height (e.g. lazy images finishing). */
  function recalcMetrics() {
    vh        = window.innerHeight;
    maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    scrollY   = window.scrollY;
  }

  /* ═══════════════════════════════════════════════════════════
     6. UTILITIES
  ═══════════════════════════════════════════════════════════ */
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ═══════════════════════════════════════════════════════════
     7. ALTITUDE HUD
     Guard on altFill only (all HUD elements exist together).
  ═══════════════════════════════════════════════════════════ */
  function updateHUD(progress) {
    if (!altFill) return;
    const pct = progress * 100;
    const alt = Math.round(lerp(ALT_MIN, ALT_MAX, progress));

    altFill.style.height   = `${pct.toFixed(2)}%`;
    altMarker.style.bottom = `${pct.toFixed(2)}%`;
    altValue.textContent   = alt.toLocaleString('en-US');
    altTrack.setAttribute('aria-valuenow', alt);

    // Mobile pill — same alt, no separate math; only updates if element exists
    if (hudMobileValue) hudMobileValue.textContent = alt.toLocaleString('en-US');
  }

  /* ═══════════════════════════════════════════════════════════
     8. MAIN UPDATE — one rAF per scroll event
     All reads happen before all writes to avoid forced layouts.
     progress = 0 when page hasn't scrolled (or maxScroll = 0);
     clamped to [0,1] so HUD always shows a valid altitude.
  ═══════════════════════════════════════════════════════════ */
  function updateDOM() {
    const progress = maxScroll > 0 ? clamp(scrollY / maxScroll, 0, 1) : 0;

    // ── BATCH READS (getBoundingClientRect for all scenes at once) ──
    const rects = scenes.map(s => s.getBoundingClientRect());

    // ── BATCH WRITES ────────────────────────────────────────────────

    // Progress bar — scaleX lives on compositor thread
    if (progressFill) {
      progressFill.style.transform = `scaleX(${progress.toFixed(4)})`;
    }

    // Altitude HUD
    updateHUD(progress);

    // Per-scene: photo parallax + trekker walk
    for (let i = 0; i < scenes.length; i++) {
      const { top, height } = rects[i];

      // Photo parallax: photo moves at a fraction of scroll speed.
      // translate3d keeps it on the compositor thread.
      if (!REDUCED && photoLayers[i]) {
        photoLayers[i].style.transform =
          `translate3d(0, ${(-top * photoSpeeds[i]).toFixed(2)}px, 0)`;
      }
    }

    isTicking = false;
  }

  /* ═══════════════════════════════════════════════════════════
     10. EVENT LISTENERS
  ═══════════════════════════════════════════════════════════ */

  // Scroll — throttled to one rAF per event burst
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    if (!isTicking) {
      requestAnimationFrame(updateDOM);
      isTicking = true;
    }
  }, { passive: true });

  // Resize — debounced 150 ms
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      recalcMetrics();
      requestAnimationFrame(updateDOM);
    }, 150);
  }, { passive: true });

  // Image load-error fallback — if a scene photo 404s or fails to decode,
  // fade it out so the CSS gradient fallback on .scene__photo shows instead
  // of a broken-image icon spanning the full viewport.
  document.querySelectorAll('.scene__photo img').forEach(img => {
    img.addEventListener('error', () => {
      img.style.opacity = '0';
    }, { once: true });
  });

  // Window load — fires AFTER all images (including lazy ones) have loaded
  // and the browser has computed the final document height.
  // This is the primary fix for maxScroll being 0 at DOMContentLoaded.
  window.addEventListener('load', () => {
    recalcMetrics();
    requestAnimationFrame(updateDOM);
  });

  // ResizeObserver on documentElement — catches any future height changes
  // (e.g. web-fonts shifting layout, images loading out-of-order).
  if ('ResizeObserver' in window) {
    let roTimer;
    const pageRO = new ResizeObserver(() => {
      clearTimeout(roTimer);
      roTimer = setTimeout(() => {
        recalcMetrics();
        // No rAF here — just update metrics; next scroll event will redraw.
      }, 100);
    });
    pageRO.observe(document.documentElement);
  }

  /* ═══════════════════════════════════════════════════════════
     11. CTA HOVER PULSE (pointer devices only)
  ═══════════════════════════════════════════════════════════ */
  if (ctaBtn && HAS_HOVER) {
    ctaBtn.addEventListener('mouseenter', () => {
      ctaBtn.style.boxShadow =
        '0 0 0 8px rgba(242,178,78,0.15), 0 8px 32px rgba(242,178,78,0.35)';
    }, { passive: true });
    ctaBtn.addEventListener('mouseleave', () => {
      ctaBtn.style.boxShadow = '';
    }, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════════
     12. INITIAL RENDER
  ═══════════════════════════════════════════════════════════ */
  updateDOM();

  // Remove will-change from hero title lines after their animation completes
  // (will-change should not be left on forever)
  const titleLines = document.querySelectorAll('.hero__title-line');
  setTimeout(() => {
    titleLines.forEach(el => { el.style.willChange = 'auto'; });
  }, 1800);  // after the longest animation delay (0.7s) + duration (0.9s) + buffer
});