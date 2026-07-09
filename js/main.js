'use strict';

/*
  ANIMATION + PERFORMANCE OPTIMISATIONS:
  1. IntersectionObserver for scene content reveal — no scroll math per frame
  2. IntersectionObserver for nav-dot active state — no getBoundingClientRect per frame
  3. IntersectionObserver to PAUSE star canvas RAF when hero off-screen
  4. Progress bar: scaleX (compositor-thread, no layout cost)
  5. Batch ALL getBoundingClientRect reads before ANY writes (avoid layout thrash)
  6. Cursor glow: lerp-smoothed, paused on hidden tab + touch devices
  7. Debounced resize handler (150ms) with one-shot recalc
  8. visibilitychange → pause all RAF loops when tab hidden
  9. passive:true on all scroll/touch/pointer listeners
  10. will-change only on actually-animated elements
*/

document.addEventListener('DOMContentLoaded', () => {

  /* ── Constants ─────────────────────────────────────────────── */
  const ALT_MIN   = 1200;
  const ALT_MAX   = 4350;
  const REDUCED   = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const HAS_HOVER = window.matchMedia('(hover:hover)').matches;

  /* ── DOM refs ──────────────────────────────────────────────── */
  const progressFill  = document.getElementById('progress-fill');
  const altFill       = document.getElementById('alt-fill');
  const altMarker     = document.getElementById('alt-marker');
  const altValue      = document.getElementById('alt-value');
  const altTrack      = document.querySelector('.alt-hud__track');
  const cursorGlow    = document.getElementById('cursor-glow');
  const navDots       = Array.from(document.querySelectorAll('.nav-dot'));
  const scenes        = Array.from(document.querySelectorAll('.scene'));
  const sceneContents = Array.from(document.querySelectorAll('.scene__content'));
  const heroEl        = document.querySelector('.hero');
  const heroStars     = document.getElementById('hero-stars');
  const ctaBtn        = document.getElementById('cta-start');

  // All anchor sections for nav-dot tracking
  const sectionIds = ['top','forest','waterfall','cliff','snow','night','summit'];
  const sections   = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

  /* ═══════════════════════════════════════════════════════════
     1. STAR CANVAS
     ─ Paused by IntersectionObserver when hero is off-screen
     ─ Paused by visibilitychange when tab is hidden
     ─ Resize debounced 200ms
  ═══════════════════════════════════════════════════════════ */
  let starRaf = null;

  if (heroStars && !REDUCED) {
    const ctx = heroStars.getContext('2d');
    let stars  = [];

    function resizeCanvas() {
      heroStars.width  = heroStars.offsetWidth;
      heroStars.height = heroStars.offsetHeight;
      buildStars();
    }

    function buildStars() {
      stars = [];
      const n = Math.floor(heroStars.width * heroStars.height / 5000);
      for (let i = 0; i < n; i++) {
        stars.push({
          x:     Math.random() * heroStars.width,
          y:     Math.random() * heroStars.height,
          r:     Math.random() * 1.4 + 0.3,
          alpha: Math.random() * 0.7 + 0.2,
          speed: Math.random() * 0.4 + 0.1,
          phase: Math.random() * Math.PI * 2,
        });
      }
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
      if (starRaf !== null || document.hidden) return;
      const tick = (t) => {
        drawStars(t / 1000);
        starRaf = requestAnimationFrame(tick);
      };
      starRaf = requestAnimationFrame(tick);
    }

    function stopStars() {
      if (starRaf !== null) {
        cancelAnimationFrame(starRaf);
        starRaf = null;
      }
    }

    // Pause/resume based on hero visibility
    new IntersectionObserver((entries) => {
      entries[0].isIntersecting ? startStars() : stopStars();
    }, { threshold: 0.05 }).observe(heroEl);

    // Pause/resume based on tab visibility
    document.addEventListener('visibilitychange', () => {
      document.hidden ? stopStars() : startStars();
    });

    // Resize (debounced)
    let starResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(starResizeTimer);
      starResizeTimer = setTimeout(resizeCanvas, 200);
    }, { passive: true });

    resizeCanvas();
    startStars();
  }

  /* ═══════════════════════════════════════════════════════════
     2. CURSOR GLOW
     ─ Only on pointer/hover devices
     ─ lerp-smoothed at 8% per frame
     ─ Paused when tab hidden
  ═══════════════════════════════════════════════════════════ */
  if (cursorGlow && HAS_HOVER && !REDUCED) {
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let cx = mx, cy = my;
    let glowRaf = null;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
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
      if (glowRaf !== null) {
        cancelAnimationFrame(glowRaf);
        glowRaf = null;
      }
    }

    document.addEventListener('visibilitychange', () => {
      document.hidden ? stopGlow() : startGlow();
    });

    startGlow();
  }

  /* ═══════════════════════════════════════════════════════════
     3. CONTENT REVEAL — IntersectionObserver
     ─ Each .scene__content fades in once when ≥12% visible
     ─ Once revealed it's never hidden again → unobserve
     ─ rootMargin -60px pushes trigger slightly inside viewport
     ─ Fallback: classList.add immediately if IO not supported
  ═══════════════════════════════════════════════════════════ */
  if ('IntersectionObserver' in window && !REDUCED) {
    const revealIO = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target); // done — remove from observation list
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    sceneContents.forEach(c => revealIO.observe(c));
  } else {
    sceneContents.forEach(c => c.classList.add('is-visible'));
  }

  /* ═══════════════════════════════════════════════════════════
     4. NAV DOTS — IntersectionObserver (no scroll math)
     ─ Tracks which section occupies >40% of viewport
     ─ Isolated from the scroll update loop entirely
  ═══════════════════════════════════════════════════════════ */
  if (navDots.length && 'IntersectionObserver' in window) {
    const sectionMap = new Map(
      sections.map((sec, i) => [sec, i])
    );

    const navIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = sectionMap.get(entry.target) ?? -1;
          navDots.forEach((dot, i) => dot.classList.toggle('is-active', i === idx));
        }
      });
    }, { threshold: 0.4 });

    sections.forEach(sec => navIO.observe(sec));
  }

  /* ═══════════════════════════════════════════════════════════
     5. SCROLL STATE
  ═══════════════════════════════════════════════════════════ */
  let scrollY   = window.scrollY;
  let isTicking = false;
  let vh        = window.innerHeight;
  let maxScroll = document.documentElement.scrollHeight - vh;

  /* ═══════════════════════════════════════════════════════════
     6. ALTITUDE HUD helpers
  ═══════════════════════════════════════════════════════════ */
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function updateHUD(progress) {
    if (!altFill && !altMarker && !altValue) return;
    const pct = (progress * 100).toFixed(2);
    const alt = Math.round(lerp(ALT_MIN, ALT_MAX, progress));
    if (altFill)   altFill.style.height   = `${pct}%`;
    if (altMarker) altMarker.style.bottom = `${pct}%`;
    if (altValue)  altValue.textContent   = alt.toLocaleString('en-US');
    if (altTrack)  altTrack.setAttribute('aria-valuenow', alt);
  }

  /* ═══════════════════════════════════════════════════════════
     7. MAIN SCROLL UPDATE — batched reads → writes
     ─ All getBoundingClientRect calls happen BEFORE any style
       write to prevent forced synchronous layouts
  ═══════════════════════════════════════════════════════════ */
  function updateDOM() {
    const progress = maxScroll > 0 ? clamp(scrollY / maxScroll, 0, 1) : 0;

    // ── READ PHASE (all at once) ──────────────────────────────
    const sceneRects = REDUCED ? [] : scenes.map(s => s.getBoundingClientRect());

    // ── WRITE PHASE ───────────────────────────────────────────

    // Progress bar (scaleX — compositor thread, zero layout cost)
    if (progressFill) {
      progressFill.style.transform = `scaleX(${progress.toFixed(4)})`;
    }

    // Altitude HUD
    updateHUD(progress);

    // Parallax layers
    if (!REDUCED) {
      scenes.forEach((scene, i) => {
        const distToBot = sceneRects[i].top - vh;
        scene.querySelectorAll('.scene__layer').forEach(layer => {
          const speed = parseFloat(layer.dataset.speed || '0.2');
          layer.style.transform = `translate3d(0,${(distToBot * speed * 0.18).toFixed(2)}px,0)`;
        });
      });
    }

    isTicking = false;
  }

  /* ═══════════════════════════════════════════════════════════
     8. EVENT LISTENERS
  ═══════════════════════════════════════════════════════════ */
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    if (!isTicking) {
      requestAnimationFrame(updateDOM);
      isTicking = true;
    }
  }, { passive: true });

  // Debounced resize — recalc scroll metrics once, then re-run updateDOM
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      vh        = window.innerHeight;
      maxScroll = document.documentElement.scrollHeight - vh;
      scrollY   = window.scrollY;
      requestAnimationFrame(updateDOM);
    }, 150);
  }, { passive: true });

  /* ═══════════════════════════════════════════════════════════
     9. HERO CTA — pulse ring on hover (pointer only)
  ═══════════════════════════════════════════════════════════ */
  if (ctaBtn && HAS_HOVER) {
    ctaBtn.addEventListener('mouseenter', () => {
      ctaBtn.style.boxShadow = '0 0 0 8px rgba(242,178,78,0.15),0 8px 32px rgba(242,178,78,0.35)';
    }, { passive: true });
    ctaBtn.addEventListener('mouseleave', () => {
      ctaBtn.style.boxShadow = '';
    }, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════════
     10. INITIAL RENDER
  ═══════════════════════════════════════════════════════════ */
  updateDOM();
});