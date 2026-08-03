/* ============================================================
   CREATIVE DOODLER — Main JS
   Preloader → Cursor → GSAP/ScrollTrigger → Lenis → Haptics
   Zero external plugin dependencies beyond GSAP core + ScrollTrigger
   ============================================================ */
(() => {
  'use strict';

  // ---- Feature flags ----
  const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (REDUCED_MOTION) {
    document.body.classList.remove('loading');
    if (window.lucide) lucide.createIcons();
    return;
  }

  // ---- Helpers ----
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  function vibrate(ms) {
    if ('vibrate' in navigator && IS_TOUCH) {
      try { navigator.vibrate(ms); } catch (_) {}
    }
  }

  function scrollTo(target, lenis) {
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, { offset: 0, duration: 1.2 });
    } else {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ---- Custom text split (no SplitText plugin needed) ----
  // Returns array of inner <span> elements, each inside an overflow:hidden wrapper.
  function splitChars(el) {
    const text = el.textContent;
    el.innerHTML = '';
    return text.split('').map(c => {
      const outer = document.createElement('span');
      outer.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top';
      const inner = document.createElement('span');
      inner.style.cssText = 'display:inline-block';
      inner.textContent = c === ' ' ? '\u00A0' : c;
      outer.appendChild(inner);
      el.appendChild(outer);
      return inner;
    });
  }

  // Splits text into words, wrapping each in overflow:hidden + inner span.
  // Preserves spaces between words.
  function splitWords(el) {
    const words = el.textContent.match(/\S+|\s+/g) || [];
    el.innerHTML = '';
    return words.map(w => {
      if (/^\s+$/.test(w)) {
        const sp = document.createElement('span');
        sp.style.whiteSpace = 'pre';
        sp.textContent = w;
        el.appendChild(sp);
        return sp;
      }
      const outer = document.createElement('span');
      outer.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top';
      const inner = document.createElement('span');
      inner.style.cssText = 'display:inline-block';
      inner.textContent = w;
      outer.appendChild(inner);
      el.appendChild(outer);
      return inner;
    });
  }

  // ---- Wait for CDN libs (with safety timeout) ----
  const MAX_WAIT = 8000;
  const startWait = performance.now();

  function checkReady() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined' ||
        typeof Lenis === 'undefined' || typeof lucide === 'undefined') {
      if (performance.now() - startWait > MAX_WAIT) {
        // One or more CDNs failed — show the page anyway, just no animations
        console.warn('CDN timeout — rendering site without animations');
        document.body.classList.remove('loading');
        if (window.lucide) lucide.createIcons();
        return;
      }
      return setTimeout(checkReady, 80);
    }
    boot();
  }

  // ---- Boot sequence ----
  function boot() {
    gsap.registerPlugin(ScrollTrigger);
    lucide.createIcons();

    // ---- 1. PRELOADER ----
    const preloader = $('#preloader');
    const preloaderBar = $('.preloader-bar');
    const preloaderCounter = $('.preloader-counter');
    const preloaderStatus = $('.preloader-status');
    const statusWords = (preloaderStatus.dataset.words || 'loading').split(',');

    let statusIdx = 0;
    const statusInterval = setInterval(() => {
      statusIdx = (statusIdx + 1) % statusWords.length;
      gsap.to(preloaderStatus, {
        duration: 0.3, y: -20, opacity: 0, ease: 'power2.in',
        onComplete: () => {
          preloaderStatus.textContent = statusWords[statusIdx];
          gsap.fromTo(preloaderStatus, { y: 20, opacity: 0 }, { duration: 0.3, y: 0, opacity: 1, ease: 'power2.out' });
        }
      });
    }, 700);

    const counterObj = { val: 0 };
    const preloaderTL = gsap.timeline({
      onComplete: () => { clearInterval(statusInterval); exitPreloader(); }
    });

    preloaderTL
      .to(preloaderBar, { scaleX: 1, duration: 1.8, ease: 'power3.inOut' }, 0)
      .to(counterObj, {
        val: 100, duration: 1.8, ease: 'power3.inOut',
        onUpdate: () => { preloaderCounter.textContent = Math.round(counterObj.val); }
      }, 0)
      .to(preloader, { duration: 0.3 }, '+=0.3');

    function exitPreloader() {
      vibrate(10);
      gsap.to(preloader, {
        duration: 0.8, yPercent: -100, ease: 'power4.inOut',
        onComplete: () => {
          preloader.remove();
          document.body.classList.remove('loading');
          initEverything();
        }
      });
    }
  }

  // ---- 2. INIT EVERYTHING AFTER PRELOADER ----
  function initEverything() {
    // ---- 2a. Lenis smooth scroll ----
    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 0.7,
      smoothWheel: true,
      smoothTouch: false
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // ---- 2b. Custom cursor ----
    if (!IS_TOUCH) {
      const dot = $('.cursor-dot');
      const ring = $('.cursor-ring');
      const label = $('.cursor-label');

      gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });
      const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const mouse = { x: pos.x, y: pos.y };

      const xTo = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power2.out' });
      const yTo = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power2.out' });
      const rxTo = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' });
      const ryTo = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' });

      window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

      (function updateCursor() {
        pos.x += (mouse.x - pos.x) * 0.5;
        pos.y += (mouse.y - pos.y) * 0.5;
        xTo(mouse.x); yTo(mouse.y);
        rxTo(pos.x); ryTo(pos.y);
        if (!document.hidden) requestAnimationFrame(updateCursor);
      })();

      $$('a, button, .work-row, .magnetic, [data-cursor-label]').forEach(el => {
        el.addEventListener('mouseenter', () => {
          dot.classList.add('active');
          ring.classList.add('active');
          label.textContent = el.dataset.cursorLabel || '';
        });
        el.addEventListener('mouseleave', () => {
          dot.classList.remove('active');
          ring.classList.remove('active');
          label.textContent = '';
        });
      });
    }

    // ---- 2c. Nav scroll glass ----
    const nav = $('#nav');
    ScrollTrigger.create({
      start: 60,
      onUpdate: (self) => {
        if (self.direction === 1 && self.progress > 0) nav.classList.add('scrolled');
        else if (self.direction === -1 && self.progress <= 0) nav.classList.remove('scrolled');
      },
      onLeave: () => nav.classList.add('scrolled'),
      onEnterBack: () => nav.classList.remove('scrolled')
    });

    // ---- 2d. Mobile menu ----
    const menuToggle = $('.nav-toggle');
    const menuOverlay = $('#menu-overlay');
    let menuOpen = false;

    function toggleMenu() {
      menuOpen = !menuOpen;
      menuOverlay.classList.toggle('open', menuOpen);
      document.body.classList.toggle('menu-open', menuOpen);
      menuToggle.setAttribute('aria-expanded', String(menuOpen));
      vibrate(menuOpen ? 30 : 15);
    }

    menuToggle.addEventListener('click', toggleMenu);

    $$('[data-menu-link]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMenu(); // close
        const target = $(link.hash);
        setTimeout(() => scrollTo(target, lenis), 400);
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOpen) toggleMenu();
    });

    // ---- 2e. Smooth scroll for all hash links ----
    $$('a[href^="#"]').forEach(link => {
      if (link.hasAttribute('data-menu-link')) return;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        scrollTo($(link.hash), lenis);
      });
    });

    // ---- 2f. Scroll progress bar ----
    const progressFill = $('.scroll-progress-fill');
    window.addEventListener('scroll', () => {
      const s = window.pageYOffset || document.documentElement.scrollTop;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (progressFill) progressFill.style.transform = `scaleX(${h > 0 ? s / h : 0})`;
    }, { passive: true });

    // ---- 2g. Back to top ----
    const backBtn = $('.back-to-top');
    window.addEventListener('scroll', () => {
      const sy = window.pageYOffset || document.documentElement.scrollTop;
      backBtn.classList.toggle('visible', sy > window.innerHeight * 0.5);
    }, { passive: true });
    backBtn.addEventListener('click', () => { vibrate(10); lenis.scrollTo(0, { duration: 1.2 }); });

    // ---- 2h. Hero reveal ----
    const heroTL = gsap.timeline({ defaultEase: 'power4.out' });

    heroTL.fromTo('.hero-badge', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 });

    // Headline chars (custom split)
    $$('.hero-title .split-line').forEach((line, i) => {
      const spans = splitChars(line);
      heroTL.fromTo(spans,
        { yPercent: 110 },
        { yPercent: 0, stagger: 0.03, duration: 0.8 },
        i === 0 ? '-=0.2' : '-=0.4'
      );
    });

    heroTL.fromTo('.hero-desc', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.3');
    heroTL.fromTo('.hero-scroll', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.2');
    heroTL.fromTo('.hero-doodle', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, stagger: 0.1, duration: 0.6 }, '-=0.4');

    // Doodle float
    $$('.hero-doodle').forEach(d => {
      const speed = parseFloat(d.dataset.speed) || 0.3;
      gsap.to(d, {
        y: gsap.utils.random(10, 25), rotation: gsap.utils.random(-8, 8),
        duration: 2 + speed * 5, repeat: -1, yoyo: true, ease: 'sine.inOut',
        delay: gsap.utils.random(0, 2)
      });
    });

    // Mouse parallax on doodles
    if (!IS_TOUCH) {
      window.addEventListener('mousemove', e => {
        const mx = (e.clientX / window.innerWidth - 0.5) * 2;
        const my = (e.clientY / window.innerHeight - 0.5) * 2;
        $$('.hero-doodle').forEach(d => {
          gsap.to(d, { x: mx * 20 * parseFloat(d.dataset.speed), y: my * 20 * parseFloat(d.dataset.speed), duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
        });
      });
    }

    $('.hero-scroll').addEventListener('click', () => scrollTo($('.section-work'), lenis));

    // ---- 2i. Marquee infinite loops ----
    const marqueeTLs = $$('.marquee-content').map(c => {
      const rev = c.classList.contains('marquee-content--reverse');
      return gsap.to(c, { xPercent: -33.33, ease: 'none', duration: rev ? 30 : 25, repeat: -1 });
    });
    $$('.marquee').forEach(s => {
      s.addEventListener('mouseenter', () => marqueeTLs.forEach(tl => tl.pause()));
      s.addEventListener('mouseleave', () => marqueeTLs.forEach(tl => tl.play()));
    });

    // ---- 2j. Work rows: scroll reveal + hover ----
    $$('.work-row').forEach((row, i) => {
      ScrollTrigger.create({
        trigger: row, start: 'top bottom-=50px',
        onEnter: () => gsap.fromTo(row, { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: i * 0.1 }),
        once: true
      });

      const titleEl = $('.work-title', row);
      if (!titleEl) return;
      let charSpans = null;

      row.addEventListener('mouseenter', () => {
        if (!charSpans) charSpans = splitChars(titleEl);
        gsap.to(charSpans, { y: -8, stagger: { each: 0.015, from: 'random' }, duration: 0.3, ease: 'power2.out' });
      });
      row.addEventListener('mouseleave', () => {
        if (charSpans) gsap.to(charSpans, { y: 0, stagger: { each: 0.01 }, duration: 0.3, ease: 'power2.in' });
      });
    });

    // Section heading scroll reveals
    $$('.section-header .split-line').forEach((line, i) => {
      ScrollTrigger.create({
        trigger: line.closest('section') || line,
        start: 'top bottom-=80px',
        onEnter: () => {
          const spans = splitChars(line);
          gsap.fromTo(spans, { yPercent: 110 }, { yPercent: 0, stagger: 0.02, duration: 0.7, ease: 'power3.out' });
        },
        once: true
      });
    });

    // ---- 2k. About: word reveal + stats count-up ----
    const aboutText = $('.about-text.split-line');
    if (aboutText) {
      ScrollTrigger.create({
        trigger: aboutText, start: 'top bottom-=60px',
        onEnter: () => {
          const words = splitWords(aboutText);
          gsap.fromTo(words, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.04, duration: 0.6, ease: 'power3.out' });
        },
        once: true
      });
    }

    // Stats count-up
    const statsSection = $('.about-stats');
    if (statsSection) {
      ScrollTrigger.create({
        trigger: statsSection, start: 'top bottom-=40px',
        onEnter: () => {
          $$('.stat', statsSection).forEach((stat, idx) => {
            const target = parseInt(stat.dataset.stat, 10);
            const valueEl = $('.stat-value', stat);
            if (!valueEl || isNaN(target)) return;
            const obj = { val: 0 };
            gsap.to(obj, { val: target, duration: 1.5, ease: 'power2.out', delay: idx * 0.1,
              onUpdate: () => { valueEl.textContent = Math.round(obj.val); } });
          });
          vibrate(10);
        },
        once: true
      });
    }

    // About heading reveal
    $$('.about-content .section-heading').forEach((h, i) => {
      ScrollTrigger.create({
        trigger: h, start: 'top bottom-=60px',
        onEnter: () => gsap.fromTo(h, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, delay: i * 0.15, ease: 'power3.out' }),
        once: true
      });
    });

    // ---- 2l. Footer ----
    const footerTitle = $('.footer-title');
    if (footerTitle) {
      ScrollTrigger.create({
        trigger: footerTitle, start: 'top bottom-=60px',
        onEnter: () => gsap.fromTo(footerTitle, { opacity: 0, y: 60, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power4.out' }),
        once: true
      });
    }

    // Magnetic CTA
    const magneticBtn = $('.footer-cta.magnetic');
    if (magneticBtn && !IS_TOUCH) {
      magneticBtn.addEventListener('mousemove', (e) => {
        const r = magneticBtn.getBoundingClientRect();
        gsap.to(magneticBtn, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      });
      magneticBtn.addEventListener('mouseleave', () => {
        gsap.to(magneticBtn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
      });
    }

    // Footer title letter hover
    if (footerTitle && !IS_TOUCH) {
      const fchars = splitChars(footerTitle);
      footerTitle.addEventListener('mouseenter', () => {
        gsap.to(fchars, { y: gsap.utils.random(-20, -10), rotation: gsap.utils.random(-5, 5), stagger: { each: 0.02, from: 'random' }, duration: 0.35, ease: 'power2.out' });
      });
      footerTitle.addEventListener('mouseleave', () => {
        gsap.to(fchars, { y: 0, rotation: 0, stagger: { each: 0.01 }, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
      });
    }

    // ---- 2m. Haptics (delegated tap handler) ----
    document.body.addEventListener('click', (e) => {
      const t = e.target.closest('[data-haptic]');
      if (t) vibrate(parseInt(t.dataset.haptic, 10) || 10);
    });

    // ---- 2n. Generic fade-up reveals ----
    $$('[data-reveal]').forEach(el => {
      if (el.closest('.about-text, .about-stats, .section-header, .section-footer, .footer-title')) return;
      ScrollTrigger.create({
        trigger: el, start: 'top bottom-=60px',
        onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }),
        once: true
      });
    });

    // ---- 2o. Resize handler ----
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { ScrollTrigger.refresh(); lucide.createIcons(); }, 200);
    });

    setTimeout(() => ScrollTrigger.refresh(), 100);
  }

  // ---- Start ----
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkReady);
  else checkReady();
})();
