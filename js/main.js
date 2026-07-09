'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ── Constants ─────────────────────────────────────────────── */
  const ALT_MIN   = 2860;
  const ALT_MAX   = 5644;
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
  const photoLayers   = Array.from(document.querySelectorAll('.scene__photo'));
  const trekkers      = Array.from(document.querySelectorAll('.scene__trekker'));
  const heroEl        = document.querySelector('.hero');
  const heroStars     = document.getElementById('hero-stars');
  const ctaBtn        = document.getElementById('cta-start');

  const sectionIds = ['top','forest','waterfall','cliff','snow','night','summit'];
  const sections   = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

  /* ═══════════════════════════════════════════════════════════
     1. STAR CANVAS (hero background)
  ═══════════════════════════════════════════════════════════ */
  let starRaf = null;

  if (heroStars && !REDUCED) {
    const ctx = heroStars.getContext('2d');
    let stars = [];

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
      for (let i = 0; i < stars.length; i++) {
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
      const tick = (t) => { drawStars(t / 1000); starRaf = requestAnimationFrame(tick); };
      starRaf = requestAnimationFrame(tick);
    }
    function stopStars() {
      if (starRaf !== null) { cancelAnimationFrame(starRaf); starRaf = null; }
    }

    new IntersectionObserver(
      (entries) => { entries[0].isIntersecting ? startStars() : stopStars(); },
      { threshold: 0.05 }
    ).observe(heroEl);

    document.addEventListener('visibilitychange', () => {
      document.hidden ? stopStars() : startStars();
    });

    let starResizeT;
    window.addEventListener('resize', () => {
      clearTimeout(starResizeT);
      starResizeT = setTimeout(resizeCanvas, 200);
    }, { passive: true });

    resizeCanvas();
    startStars();
  }

  /* ═══════════════════════════════════════════════════════════
     2. CURSOR GLOW
  ═══════════════════════════════════════════════════════════ */
  if (cursorGlow && HAS_HOVER && !REDUCED) {
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
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
  ═══════════════════════════════════════════════════════════ */
  if ('IntersectionObserver' in window && !REDUCED) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    sceneContents.forEach(c => io.observe(c));
  } else {
    sceneContents.forEach(c => c.classList.add('is-visible'));
  }

  /* ═══════════════════════════════════════════════════════════
     4. NAV DOTS — IntersectionObserver
  ═══════════════════════════════════════════════════════════ */
  if (navDots.length && 'IntersectionObserver' in window) {
    const sMap = new Map(sections.map((s, i) => [s, i]));
    new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = sMap.get(e.target) ?? -1;
          navDots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
        }
      });
    }, { threshold: 0.4 }).observe(sections.forEach ? undefined : sections[0]);

    // Correct observer setup
    const navIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = sMap.get(e.target) ?? -1;
          if (idx !== -1) {
            navDots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
          }
        }
      });
    }, { threshold: 0.4 });
    sections.forEach(s => navIO.observe(s));
  }

  /* ═══════════════════════════════════════════════════════════
     5. SCROLL STATE
  ═══════════════════════════════════════════════════════════ */
  let scrollY   = window.scrollY;
  let isTicking = false;
  let vh        = window.innerHeight;
  let maxScroll = document.documentElement.scrollHeight - vh;

  /* ═══════════════════════════════════════════════════════════
     6. UTILS
  ═══════════════════════════════════════════════════════════ */
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ═══════════════════════════════════════════════════════════
     7. ALTITUDE HUD
  ═══════════════════════════════════════════════════════════ */
  function updateHUD(progress) {
    if (!altFill || !altValue) return;
    const pct = (progress * 100).toFixed(2);
    const alt = Math.round(lerp(ALT_MIN, ALT_MAX, progress));
    if (altFill)   altFill.style.height   = `${pct}%`;
    if (altMarker) altMarker.style.bottom = `${pct}%`;
    if (altValue)  altValue.textContent   = alt.toLocaleString('en-US');
    if (altTrack)  altTrack.setAttribute('aria-valuenow', alt);
  }

  /* ═══════════════════════════════════════════════════════════
     8. TREKKER WALK LOGIC
     Each section has its own trekker. As the section scrolls
     through the viewport, the trekker moves from left (~8%)
     to right (~72%) of the scene width — so they appear to
     walk across the landscape as you scroll down.
  ═══════════════════════════════════════════════════════════ */
  function updateTrekker(trekker, sectionRect) {
    if (!trekker || REDUCED) return;

    // "progress" = how far the section has scrolled through the viewport
    // 0 = section bottom just entering from below
    // 1 = section top has just left the top
    const sectionH = sectionRect.height;
    const entered  = vh - sectionRect.top;   // pixels of section visible from top
    const progress = clamp(entered / (sectionH + vh), 0, 1);

    // Trekker walks from 8% to 68% of scene width
    const startPct = 8;
    const endPct   = 68;
    const xPct     = lerp(startPct, endPct, progress);

    trekker.style.left = `${xPct.toFixed(2)}%`;

    // Subtle vertical bob driven by scroll speed (parallax feel)
    const bobY = Math.sin(progress * Math.PI * 6) * 3;
    trekker.style.transform = `translateY(${bobY.toFixed(1)}px)`;
  }

  /* ═══════════════════════════════════════════════════════════
     9. MAIN UPDATE LOOP — batched reads → writes
  ═══════════════════════════════════════════════════════════ */
  function updateDOM() {
    const progress = maxScroll > 0 ? clamp(scrollY / maxScroll, 0, 1) : 0;

    // ── BATCH READS ──────────────────────────────────────────
    const sceneRects = scenes.map(s => s.getBoundingClientRect());

    // ── BATCH WRITES ─────────────────────────────────────────

    // Progress bar (scaleX — compositor thread)
    if (progressFill) {
      progressFill.style.transform = `scaleX(${progress.toFixed(4)})`;
    }

    // Altitude HUD
    updateHUD(progress);

    // Photo parallax + trekker walk
    scenes.forEach((scene, i) => {
      const rect      = sceneRects[i];
      const distToTop = rect.top;   // negative once scene has scrolled past top

      // Photo layer parallax (slower than scroll = depth illusion)
      if (!REDUCED && photoLayers[i]) {
        const speed = parseFloat(scene.querySelector('.scene__photo')?.dataset.speed || '0.2');
        // Move the photo upward more slowly than the page scrolls
        const offset = -distToTop * speed;
        photoLayers[i].style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      }

      // Trekker
      if (trekkers[i]) {
        updateTrekker(trekkers[i], rect);
      }
    });

    isTicking = false;
  }

  /* ═══════════════════════════════════════════════════════════
     10. EVENT LISTENERS
  ═══════════════════════════════════════════════════════════ */
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    if (!isTicking) {
      requestAnimationFrame(updateDOM);
      isTicking = true;
    }
  }, { passive: true });

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
     11. HERO CTA pulse
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
     12. INITIAL RENDER
  ═══════════════════════════════════════════════════════════ */
  updateDOM();
});