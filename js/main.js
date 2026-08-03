/* ============================================================
   CREATIVE DOODLER — Main JS
   Preloader → Cursor → GSAP/ScrollTrigger → Lenis → Haptics
   ============================================================ */
(() => {
  'use strict';

  // ---- Feature flags ----
  const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // If reduced motion, bail early — no animations
  if (REDUCED_MOTION) {
    document.body.classList.remove('loading');
    if (window.lucide) lucide.createIcons();
    return;
  }

  // ---- Wait for all libs ----
  const checkReady = () => {
    if (typeof gsap === 'undefined') return setTimeout(checkReady, 50);
    if (typeof ScrollTrigger === 'undefined') return setTimeout(checkReady, 50);
    if (typeof SplitText === 'undefined') return setTimeout(checkReady, 50);
    if (typeof Lenis === 'undefined') return setTimeout(checkReady, 50);
    if (typeof lucide === 'undefined') return setTimeout(checkReady, 50);
    boot();
  };

  // ---- Helpers ----
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function vibrate(ms) {
    if ('vibrate' in navigator && IS_TOUCH) {
      try { navigator.vibrate(ms); } catch (_) {}
    }
  }

  // Smooth-scroll to an element using Lenis
  function scrollTo(target, lenis) {
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, { offset: 0, duration: 1.2 });
    } else {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ---- SplitText char reveal wrapper ----
  function prepareSplitChars(selector) {
    const el = $(selector);
    if (!el) return null;
    const st = new SplitText(el, { type: 'chars', charsClass: 'char' });
    st.chars.forEach(c => {
      c.style.overflow = 'hidden';
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      span.textContent = c.textContent;
      c.textContent = '';
      c.appendChild(span);
    });
    const spans = $$('.char span', el);
    return { st, spans };
  }

  function prepareSplitLines(selector) {
    const els = $$(selector);
    const results = [];
    els.forEach(el => {
      const st = new SplitText(el, { type: 'lines', linesClass: 'split-line' });
      results.push({ el, st });
    });
    return results;
  }

  // ---- Boot sequence ----
  function boot() {
    // Register GSAP plugins
    gsap.registerPlugin(ScrollTrigger, SplitText);

    // Render Lucide icons first
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
        duration: 0.3,
        y: -20,
        opacity: 0,
        ease: 'power2.in',
        onComplete: () => {
          preloaderStatus.textContent = statusWords[statusIdx];
          gsap.fromTo(preloaderStatus, { y: 20, opacity: 0 }, { duration: 0.3, y: 0, opacity: 1, ease: 'power2.out' });
        }
      });
    }, 700);

    const counterObj = { val: 0 };
    const preloaderTL = gsap.timeline({
      onComplete: () => {
        clearInterval(statusInterval);
        exitPreloader();
      }
    });

    preloaderTL
      .to(preloaderBar, { scaleX: 1, duration: 1.8, ease: 'power3.inOut' }, 0)
      .to(counterObj, {
        val: 100,
        duration: 1.8,
        ease: 'power3.inOut',
        onUpdate: () => { preloaderCounter.textContent = Math.round(counterObj.val); }
      }, 0)
      .to(preloader, { duration: 0.3 }, '+=0.3');

    function exitPreloader() {
      vibrate(10);
      gsap.to(preloader, {
        duration: 0.8,
        yPercent: -100,
        ease: 'power4.inOut',
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

    // Sync with ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);
    // Also sync GSAP ticker as a fallback
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // ---- 2b. Custom cursor ----
    if (!IS_TOUCH) {
      const dot = $('.cursor-dot');
      const ring = $('.cursor-ring');
      const label = $('.cursor-label');

      const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

      gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

      const xTo = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power2.out' });
      const yTo = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power2.out' });
      const rxTo = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' });
      const ryTo = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' });

      window.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      });

      function updateCursor() {
        pos.x += (mouse.x - pos.x) * 0.5;
        pos.y += (mouse.y - pos.y) * 0.5;
        xTo(mouse.x);
        yTo(mouse.y);
        rxTo(pos.x);
        ryTo(pos.y);
        if (!document.hidden) requestAnimationFrame(updateCursor);
      }
      updateCursor();

      // Hover targets
      const hoverTargets = $$('a, button, .work-row, .magnetic, [data-cursor-label]');
      hoverTargets.forEach(el => {
        el.addEventListener('mouseenter', () => {
          dot.classList.add('active');
          ring.classList.add('active');
          const labelText = el.dataset.cursorLabel || '';
          label.textContent = labelText;
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
        if (self.direction === 1 && self.progress > 0) {
          nav.classList.add('scrolled');
        } else if (self.direction === -1 && self.progress <= 0) {
          nav.classList.remove('scrolled');
        }
      },
      onLeave: () => nav.classList.add('scrolled'),
      onEnterBack: () => nav.classList.remove('scrolled')
    });

    // ---- 2d. Mobile menu ----
    const menuToggle = $('.nav-toggle');
    const menuOverlay = $('#menu-overlay');
    const body = document.body;
    let menuOpen = false;

    function openMenu() {
      menuOpen = true;
      menuOverlay.classList.add('open');
      body.classList.add('menu-open');
      menuToggle.setAttribute('aria-expanded', 'true');
      vibrate(30);
    }

    function closeMenu() {
      menuOpen = false;
      menuOverlay.classList.remove('open');
      body.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      vibrate(15);
    }

    menuToggle.addEventListener('click', () => menuOpen ? closeMenu() : openMenu());

    // Close menu on link click
    $$('[data-menu-link]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        closeMenu();
        const target = $(link.hash);
        // Allow menu to close before scrolling
        setTimeout(() => scrollTo(target, lenis), 400);
      });
    });

    // Close on escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOpen) closeMenu();
    });

    // ---- 2e. Smooth scroll for all hash links ----
    $$('a[href^="#"]').forEach(link => {
      if (link.hasAttribute('data-menu-link')) return; // handled above
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = $(link.hash);
        scrollTo(target, lenis);
      });
    });

    // ---- 2f. Scroll progress bar ----
    const progressFill = $('.scroll-progress-fill');
    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? scrollTop / docHeight : 0;
      if (progressFill) progressFill.style.transform = `scaleX(${pct})`;
    }, { passive: true });

    // ---- 2g. Back to top ----
    const backToTopBtn = $('.back-to-top');
    window.addEventListener('scroll', () => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      backToTopBtn.classList.toggle('visible', scrollY > window.innerHeight * 0.5);
    }, { passive: true });

    backToTopBtn.addEventListener('click', () => {
      vibrate(10);
      lenis.scrollTo(0, { duration: 1.2 });
    });

    // ---- 2h. Hero reveal (after preloader) ----
    const heroTL = gsap.timeline({ defaultEase: 'power4.out' });

    // Badge
    heroTL.fromTo('.hero-badge',
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6 }
    );

    // Headline chars
    const heroLines = $$('.hero-title .split-line');
    heroLines.forEach((line, i) => {
      const prep = prepareSplitChars(`.hero-title .split-line:nth-child(${i + 1})`);
      if (prep && prep.spans.length) {
        heroTL.fromTo(prep.spans,
          { yPercent: 110 },
          { yPercent: 0, stagger: 0.03, duration: 0.8 },
          i === 0 ? '-=0.2' : '-=0.4'
        );
      }
    });

    // Description
    heroTL.fromTo('.hero-desc',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7 },
      '-=0.3'
    );

    // Scroll indicator
    heroTL.fromTo('.hero-scroll',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5 },
      '-=0.2'
    );

    // Doodles
    heroTL.fromTo('.hero-doodle',
      { opacity: 0, scale: 0.6 },
      { opacity: 1, scale: 1, stagger: 0.1, duration: 0.6 },
      '-=0.4'
    );

    // Doodle float animation
    $$('.hero-doodle').forEach(doodle => {
      const speed = parseFloat(doodle.dataset.speed) || 0.3;
      gsap.to(doodle, {
        y: gsap.utils.random(10, 25),
        rotation: gsap.utils.random(-8, 8),
        duration: 2 + speed * 5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: gsap.utils.random(0, 2)
      });
    });

    // Mouse parallax on doodles
    if (!IS_TOUCH) {
      window.addEventListener('mousemove', e => {
        const mx = (e.clientX / window.innerWidth - 0.5) * 2;
        const my = (e.clientY / window.innerHeight - 0.5) * 2;
        $$('.hero-doodle').forEach(doodle => {
          const speed = parseFloat(doodle.dataset.speed) || 0.3;
          gsap.to(doodle, {
            x: mx * 20 * speed,
            y: my * 20 * speed,
            duration: 0.8,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        });
      });
    }

    // Hero scroll indicator click
    $('.hero-scroll').addEventListener('click', () => {
      const marquee = $('.section-work');
      if (marquee) scrollTo(marquee, lenis);
    });

    // ---- 2i. Marquee infinite loops ----
    const marqueeTLs = $$('.marquee-content').map((content) => {
      const isReverse = content.classList.contains('marquee-content--reverse');
      const speed = isReverse ? 30 : 25;
      return gsap.to(content, {
        xPercent: -33.33,
        ease: 'none',
        duration: speed,
        repeat: -1
      });
    });

    // Pause marquees on hover
    $$('.marquee').forEach(strip => {
      strip.addEventListener('mouseenter', () => {
        marqueeTLs.forEach(tl => tl.pause());
      });
      strip.addEventListener('mouseleave', () => {
        marqueeTLs.forEach(tl => tl.play());
      });
    });

    // ---- 2j. Work rows: scroll reveal + hover ----
    $$('.work-row').forEach((row, i) => {
      // Scroll reveal
      ScrollTrigger.create({
        trigger: row,
        start: 'top bottom-=50px',
        onEnter: () => {
          gsap.fromTo(row, { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: i * 0.1 });
        },
        once: true
      });

      // Hover: title char animation
      const titleEl = $('.work-title', row);
      if (!titleEl) return;

      let charSpans = null;
      row.addEventListener('mouseenter', () => {
        if (!charSpans) {
          const st = new SplitText(titleEl, { type: 'chars', charsClass: 'wchar' });
          st.chars.forEach(c => {
            c.style.display = 'inline-block';
          });
          charSpans = st.chars;
        }
        gsap.to(charSpans, {
          y: -8,
          stagger: { each: 0.015, from: 'random' },
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      row.addEventListener('mouseleave', () => {
        if (charSpans) {
          gsap.to(charSpans, {
            y: 0,
            stagger: { each: 0.01 },
            duration: 0.3,
            ease: 'power2.in'
          });
        }
      });
    });

    // Section heading reveals
    $$('.section-heading .split-line, .section-header[data-reveal] .split-line').forEach((line, i) => {
      const prep = prepareSplitChars(`.section-heading .split-line:nth-child(${i + 1})`);
      if (prep && prep.spans.length) {
        ScrollTrigger.create({
          trigger: line.closest('section') || line,
          start: 'top bottom-=80px',
          onEnter: () => {
            gsap.fromTo(prep.spans,
              { yPercent: 110 },
              { yPercent: 0, stagger: 0.02, duration: 0.7, ease: 'power3.out' }
            );
          },
          once: true
        });
      }
    });

    // ---- 2k. About: line reveal + stats count-up ----
    const aboutLines = prepareSplitLines('.about-text.split-line');
    if (aboutLines.length) {
      aboutLines.forEach(({ el, st }) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top bottom-=60px',
          onEnter: () => {
            gsap.fromTo(st.lines,
              { yPercent: 100, opacity: 0 },
              { yPercent: 0, opacity: 1, stagger: 0.1, duration: 0.7, ease: 'power3.out' }
            );
          },
          once: true
        });
      });
    }

    // Stats count-up
    const statsSection = $('.about-stats');
    if (statsSection) {
      ScrollTrigger.create({
        trigger: statsSection,
        start: 'top bottom-=40px',
        onEnter: () => {
          $$('.stat', statsSection).forEach(stat => {
            const target = parseInt(stat.dataset.stat, 10);
            const valueEl = $('.stat-value', stat);
            if (!valueEl || isNaN(target)) return;
            const obj = { val: 0 };
            gsap.to(obj, {
              val: target,
              duration: 1.5,
              ease: 'power2.out',
              delay: 0.2,
              onUpdate: () => { valueEl.textContent = Math.round(obj.val); }
            });
          });
          vibrate(10);
        },
        once: true
      });
    }

    // About heading reveal
    $$('.about-content .section-heading').forEach((heading, i) => {
      ScrollTrigger.create({
        trigger: heading,
        start: 'top bottom-=60px',
        onEnter: () => {
          gsap.fromTo(heading, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, delay: i * 0.15, ease: 'power3.out' });
        },
        once: true
      });
    });

    // ---- 2l. Footer: heading reveal + magnetic button + letter hover ----
    // Heading reveal
    const footerTitle = $('.footer-title');
    if (footerTitle) {
      ScrollTrigger.create({
        trigger: footerTitle,
        start: 'top bottom-=60px',
        onEnter: () => {
          gsap.fromTo(footerTitle,
            { opacity: 0, y: 60, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power4.out' }
          );
        },
        once: true
      });
    }

    // Magnetic CTA button
    const magneticBtn = $('.footer-cta.magnetic');
    if (magneticBtn && !IS_TOUCH) {
      magneticBtn.addEventListener('mousemove', (e) => {
        const rect = magneticBtn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(magneticBtn, {
          x: x * 0.3,
          y: y * 0.3,
          duration: 0.4,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      });

      magneticBtn.addEventListener('mouseleave', () => {
        gsap.to(magneticBtn, {
          x: 0, y: 0,
          duration: 0.7,
          ease: 'elastic.out(1, 0.4)',
          overwrite: 'auto'
        });
      });
    }

    // Letter hover on footer title
    if (footerTitle && !IS_TOUCH) {
      const fst = new SplitText(footerTitle, { type: 'chars', charsClass: 'fchar' });
      fst.chars.forEach(c => { c.style.display = 'inline-block'; });

      footerTitle.addEventListener('mouseenter', () => {
        gsap.to(fst.chars, {
          y: gsap.utils.random(-20, -10),
          rotation: gsap.utils.random(-5, 5),
          stagger: { each: 0.02, from: 'random' },
          duration: 0.35,
          ease: 'power2.out'
        });
      });

      footerTitle.addEventListener('mouseleave', () => {
        gsap.to(fst.chars, {
          y: 0, rotation: 0,
          stagger: { each: 0.01 },
          duration: 0.4,
          ease: 'elastic.out(1, 0.5)'
        });
      });
    }

    // ---- 2m. Haptics (delegated tap handler) ----
    document.body.addEventListener('click', (e) => {
      const target = e.target.closest('[data-haptic]');
      if (target) {
        const ms = parseInt(target.dataset.haptic, 10) || 10;
        vibrate(ms);
      }
    });

    // ---- 2n. Scroll-triggered fade-up reveals ----
    $$('[data-reveal]').forEach(el => {
      // Skip elements already handled by custom scroll triggers
      if (el.closest('.about-text, .about-stats, .section-header, .section-footer, .footer-title')) return;

      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom-=60px',
        onEnter: () => {
          gsap.to(el, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' });
        },
        once: true
      });
    });

    // ---- 2o. Resize handler (re-split text, cursor state) ----
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        ScrollTrigger.refresh();
        // Re-render Lucide in case any got lost
        lucide.createIcons();
      }, 200);
    });

    // Force initial scroll refresh after all triggers are registered
    setTimeout(() => ScrollTrigger.refresh(), 100);
  }

  // ---- Start the engine ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkReady);
  } else {
    checkReady();
  }
})();
