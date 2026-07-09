'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ── Config ────────────────────────────────────────────────── */
  const ALT_MIN = 1200;
  const ALT_MAX = 4350;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── DOM refs ──────────────────────────────────────────────── */
  const progressFill = document.getElementById('progress-fill');
  const altFill      = document.getElementById('alt-fill');
  const altMarker    = document.getElementById('alt-marker');
  const altValue     = document.getElementById('alt-value');
  const altTrack     = document.querySelector('.alt-hud__track');
  const cursorGlow   = document.getElementById('cursor-glow');
  const navDots      = Array.from(document.querySelectorAll('.nav-dot'));
  const scenes       = Array.from(document.querySelectorAll('.scene'));
  const heroStars    = document.getElementById('hero-stars');
  const sections     = [
    document.getElementById('top'),
    document.getElementById('forest'),
    document.getElementById('waterfall'),
    document.getElementById('cliff'),
    document.getElementById('snow'),
    document.getElementById('night'),
    document.getElementById('summit'),
  ];

  /* ─────────────────────────────────────────────────────────────
     1. STAR CANVAS (hero background)
  ───────────────────────────────────────────────────────────── */
  if (heroStars && !REDUCED) {
    const ctx = heroStars.getContext('2d');
    let stars = [];

    function resizeCanvas() {
      heroStars.width  = heroStars.offsetWidth;
      heroStars.height = heroStars.offsetHeight;
      initStars();
    }

    function initStars() {
      stars = [];
      const count = Math.floor((heroStars.width * heroStars.height) / 4800);
      for (let i = 0; i < count; i++) {
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
      stars.forEach((s) => {
        const a = s.alpha * (0.65 + 0.35 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.fill();
      });
    }

    let frame;
    function animate(t) {
      drawStars(t / 1000);
      frame = requestAnimationFrame(animate);
    }

    resizeCanvas();
    animate(0);
    window.addEventListener('resize', resizeCanvas, { passive: true });
  }

  /* ─────────────────────────────────────────────────────────────
     2. CURSOR GLOW (desktop only)
  ───────────────────────────────────────────────────────────── */
  if (cursorGlow) {
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let cx = mx, cy = my;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
    });

    function animateCursor() {
      cx += (mx - cx) * 0.08;
      cy += (my - cy) * 0.08;
      cursorGlow.style.left = `${cx}px`;
      cursorGlow.style.top  = `${cy}px`;
      requestAnimationFrame(animateCursor);
    }
    if (window.matchMedia('(hover: hover)').matches) {
      animateCursor();
    }
  }

  /* ─────────────────────────────────────────────────────────────
     3. SCROLL STATE
  ───────────────────────────────────────────────────────────── */
  let scrollY    = window.scrollY;
  let isTicking  = false;
  let vh         = window.innerHeight;
  let maxScroll  = document.documentElement.scrollHeight - vh;

  /* ─────────────────────────────────────────────────────────────
     4. ALTITUDE HUD helpers
  ───────────────────────────────────────────────────────────── */
  function lerp(a, b, t)    { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fmtAlt(n)        { return Math.round(n).toLocaleString('en-US'); }

  function updateHUD(progress) {
    if (!altFill || !altMarker || !altValue) return;

    const pct = (progress * 100).toFixed(2);
    const alt = lerp(ALT_MIN, ALT_MAX, progress);

    altFill.style.height   = `${pct}%`;
    altMarker.style.bottom = `${pct}%`;
    altValue.textContent   = fmtAlt(alt);

    const pb = altTrack;
    if (pb) pb.setAttribute('aria-valuenow', Math.round(alt));
  }

  /* ─────────────────────────────────────────────────────────────
     5. NAV DOT ACTIVE STATE
  ───────────────────────────────────────────────────────────── */
  function updateNavDots() {
    let activeIndex = 0;
    sections.forEach((sec, i) => {
      if (!sec) return;
      const rect = sec.getBoundingClientRect();
      if (rect.top <= vh * 0.5) activeIndex = i;
    });
    navDots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === activeIndex);
    });
  }

  /* ─────────────────────────────────────────────────────────────
     6. MAIN UPDATE LOOP
  ───────────────────────────────────────────────────────────── */
  function updateDOM() {
    const progress = maxScroll > 0 ? clamp(scrollY / maxScroll, 0, 1) : 0;

    // Progress bar
    if (progressFill) {
      progressFill.style.width = `${(progress * 100).toFixed(2)}%`;
    }

    // Altitude HUD
    updateHUD(progress);

    // Nav dots
    updateNavDots();

    // Scene: parallax layers + content reveal
    scenes.forEach((scene) => {
      const rect       = scene.getBoundingClientRect();
      const distToBot  = rect.top - vh;             // negative once entering
      const visibility = clamp(1 - distToBot / vh, 0, 1);

      // Content fade-up reveal
      const content = scene.querySelector('.scene__content');
      if (content) {
        if (visibility > 0.15) {
          content.classList.add('is-visible');
        }
        // Subtle additional lift as scene scrolls out
        const lift = clamp((-rect.bottom) / 80, 0, 18);
        if (!REDUCED) {
          content.style.transform = `translateY(${-lift.toFixed(1)}px)`;
        }
      }

      // Parallax layers
      if (!REDUCED) {
        scene.querySelectorAll('.scene__layer').forEach((layer) => {
          const speed = parseFloat(layer.dataset.speed || '0.2');
          const y     = distToBot * speed * 0.18;
          layer.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
        });
      }
    });

    isTicking = false;
  }

  /* ─────────────────────────────────────────────────────────────
     7. EVENT LISTENERS
  ───────────────────────────────────────────────────────────── */
  function onScroll() {
    scrollY = window.scrollY;
    if (!isTicking) {
      window.requestAnimationFrame(updateDOM);
      isTicking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  window.addEventListener('resize', () => {
    vh        = window.innerHeight;
    maxScroll = document.documentElement.scrollHeight - vh;
    onScroll();
  }, { passive: true });

  /* ─────────────────────────────────────────────────────────────
     8. HERO CTA — subtle pulse ring on hover
  ───────────────────────────────────────────────────────────── */
  const cta = document.getElementById('cta-start');
  if (cta) {
    cta.addEventListener('mouseenter', () => {
      cta.style.boxShadow = '0 0 0 8px rgba(242,178,78,0.15), 0 8px 32px rgba(242,178,78,0.35)';
    });
    cta.addEventListener('mouseleave', () => {
      cta.style.boxShadow = '';
    });
  }

  /* ─────────────────────────────────────────────────────────────
     9. INITIAL RENDER
  ───────────────────────────────────────────────────────────── */
  updateDOM();
});