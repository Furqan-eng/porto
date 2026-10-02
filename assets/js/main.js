/* ==========================================================================
   FURQAN — main.js
   Progressive enhancement: content stays usable if this file or CDNs fail.
   ========================================================================== */
(function () {
  "use strict";

  var body = document.body;

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  var canHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;

  var nav = document.getElementById("nav");
  var navToggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("mobile-menu");
  var localTimeEl = document.getElementById("local-time");
  var footerTimeEl = document.getElementById("footer-time");
  var yearEl = document.getElementById("year");
  var cursor = document.querySelector(".cursor");
  var cursorText = document.querySelector(".cursor__text");
  var marquee = document.querySelector("[data-marquee]");
  var progressBar = document.querySelector(".scroll-progress__bar");
  var railSection = document.querySelector("[data-rail-section]");
  var railYears = document.querySelectorAll("[data-rail-year]");
  var sections = document.querySelectorAll("[data-section]");

  /* ---------------------------------------------------------------------- */
  /* Utilities                                                              */
  /* ---------------------------------------------------------------------- */
  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call(
      (scope || document).querySelectorAll(selector)
    );
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /* ---------------------------------------------------------------------- */
  /* Year + local time (WIB / Asia/Jakarta)                                 */
  /* ---------------------------------------------------------------------- */
  var currentYear = String(new Date().getFullYear());

  if (yearEl) {
    yearEl.textContent = currentYear;
  }

  railYears.forEach(function (el) {
    el.textContent = currentYear;
  });

  function formatTime() {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
    } catch (err) {
      return "--:--";
    }
  }

  function updateTime() {
    var t = formatTime();
    if (localTimeEl) localTimeEl.textContent = t;
    if (footerTimeEl) footerTimeEl.textContent = t;
  }

  updateTime();
  window.setInterval(updateTime, 30000);

  /* ---------------------------------------------------------------------- */
  /* Mobile menu                                                            */
  /* ---------------------------------------------------------------------- */
  var menuOpen = false;

  function setMenu(open) {
    if (!nav || !menu || !navToggle) return;
    menuOpen = open;
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    body.style.overflow = open ? "hidden" : "";

    if (lenis) {
      if (open && typeof lenis.stop === "function") lenis.stop();
      if (!open && typeof lenis.start === "function") lenis.start();
    }

    if (open) {
      menu.removeAttribute("hidden");
    } else {
      window.setTimeout(function () {
        if (!menuOpen) menu.setAttribute("hidden", "");
      }, 400);
    }
  }

  if (navToggle) {
    navToggle.addEventListener("click", function () {
      setMenu(!menuOpen);
    });
  }

  qsa("a[href^='#']").forEach(function (anchor) {
    anchor.addEventListener("click", function () {
      if (menuOpen) setMenu(false);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Nav show/hide + scrolled + progress + section rail                     */
  /* ---------------------------------------------------------------------- */
  var lastScrollY = window.scrollY || 0;
  var scrollTicking = false;

  function updateScrollUI() {
    scrollTicking = false;
    var y = window.scrollY || 0;
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    var pct = clamp((y / max) * 100, 0, 100);

    if (progressBar) {
      progressBar.style.height = pct + "%";
    }

    if (nav) {
      nav.classList.toggle("is-scrolled", y > 24);
      if (!menuOpen) {
        if (y > lastScrollY && y > 160) {
          nav.classList.add("is-hidden");
        } else {
          nav.classList.remove("is-hidden");
        }
      } else {
        nav.classList.remove("is-hidden");
      }
    }

    /* Active section for side rail */
    if (railSection && sections.length) {
      var active = sections[0];
      var marker = y + window.innerHeight * 0.35;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= marker) {
          active = sections[i];
        }
      }
      var label = active.getAttribute("data-section");
      if (label && railSection.textContent !== label) {
        railSection.textContent = label;
      }
    }

    lastScrollY = y;
  }

  function onScroll() {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(updateScrollUI);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener(
    "resize",
    function () {
      onScroll();
    },
    { passive: true }
  );
  updateScrollUI();

  /* ---------------------------------------------------------------------- */
  /* Smooth scroll — Lenis when available, native fallback                  */
  /* ---------------------------------------------------------------------- */
  var lenis = null;
  var hasGsap = typeof window.gsap !== "undefined";
  var hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

  function initLenis() {
    if (prefersReducedMotion) return null;
    if (typeof window.Lenis !== "function") return null;

    var instance = new window.Lenis({
      duration: 1.15,
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      smoothWheel: true,
      touchMultiplier: 1.4,
    });

    if (hasGsap && hasScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      instance.on("scroll", window.ScrollTrigger.update);
      window.gsap.ticker.add(function (time) {
        instance.raf(time * 1000);
      });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) {
        instance.raf(time);
        window.requestAnimationFrame(raf);
      }
      window.requestAnimationFrame(raf);
    }

    return instance;
  }

  function scrollToTarget(target, offset) {
    offset = typeof offset === "number" ? offset : 0;

    if (lenis && typeof lenis.scrollTo === "function") {
      lenis.scrollTo(target, {
        offset: -offset,
        duration: 1.2,
      });
      return;
    }

    var top =
      typeof target === "number"
        ? target
        : target.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  lenis = initLenis();

  qsa('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      var href = anchor.getAttribute("href");
      if (!href || href === "#") return;

      var id = href.slice(1);
      var target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      var offset = id === "home" ? 0 : 72;
      scrollToTarget(target, offset);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Custom cursor (desktop / fine pointer only)                            */
  /* ---------------------------------------------------------------------- */
  function initCursor() {
    if (!cursor || !canHover || prefersReducedMotion) return;

    body.classList.add("has-cursor");

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var currX = mouseX;
    var currY = mouseY;

    cursor.classList.add("is-active");

    document.addEventListener(
      "mousemove",
      function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
      },
      { passive: true }
    );

    document.addEventListener("mousedown", function () {
      cursor.classList.add("is-down");
    });
    document.addEventListener("mouseup", function () {
      cursor.classList.remove("is-down");
    });

    document.addEventListener("mouseleave", function () {
      cursor.classList.remove("is-active");
    });
    document.addEventListener("mouseenter", function () {
      cursor.classList.add("is-active");
    });

    function tickCursor() {
      currX += (mouseX - currX) * 0.22;
      currY += (mouseY - currY) * 0.22;
      cursor.style.transform =
        "translate3d(" + currX + "px," + currY + "px,0)";
      window.requestAnimationFrame(tickCursor);
    }
    window.requestAnimationFrame(tickCursor);

    function setHover(on, label) {
      cursor.classList.toggle("is-hover", on);
      if (cursorText && label) {
        cursorText.textContent = label;
      }
    }

    function bindCursorTargets(root) {
      qsa(
        "a, button, [data-cursor], .project, .play-card, .capability, .principle, .system-row",
        root || document
      ).forEach(function (el) {
        if (el.__cursorBound) return;
        el.__cursorBound = true;

        el.addEventListener("mouseenter", function () {
          var label =
            el.getAttribute("data-cursor") ||
            (el.tagName === "A" ? "Open" : "View");
          setHover(true, label);
        });
        el.addEventListener("mouseleave", function () {
          setHover(false, "View");
        });
      });
    }

    bindCursorTargets(document);
  }

  initCursor();

  /* ---------------------------------------------------------------------- */
  /* Project images — ensure fallback if broken                             */
  /* ---------------------------------------------------------------------- */
  qsa("[data-project-visual] img").forEach(function (img) {
    function fail() {
      var wrap = img.closest(".project__media-visual");
      if (wrap) wrap.classList.add("is-fallback");
      var media = img.closest(".project__media");
      if (media) media.classList.remove("is-ready");
    }
    function ok() {
      var wrap = img.closest(".project__media-visual");
      if (wrap) wrap.classList.remove("is-fallback");
      var media = img.closest(".project__media");
      if (media) media.classList.add("is-ready");
    }
    if (img.complete) {
      if (img.naturalWidth === 0) fail();
      else ok();
    } else {
      img.addEventListener("load", ok);
      img.addEventListener("error", fail);
    }
  });

  /* ---------------------------------------------------------------------- */
  /* Marquee — pause when tab hidden                                        */
  /* ---------------------------------------------------------------------- */
  if (marquee) {
    document.addEventListener("visibilitychange", function () {
      marquee.classList.toggle("is-paused", document.hidden);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Magnetic elements (subtle) — bound once                               */
  /* ---------------------------------------------------------------------- */
  var magneticBound = false;

  function initMagnetic() {
    if (magneticBound) return;
    if (!canHover || prefersReducedMotion) return;
    magneticBound = true;

    qsa("[data-magnetic]").forEach(function (el) {
      var strength = 12;

      el.addEventListener("mousemove", function (e) {
        var rect = el.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        el.style.transform =
          "translate(" +
          clamp(x / strength, -1, 1) * strength +
          "px," +
          clamp(y / strength, -1, 1) * strength * 0.6 +
          "px)";
      });

      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* GSAP motion                                                            */
  /* ---------------------------------------------------------------------- */
  function initMotion() {
    if (!hasGsap) return;

    var gsap = window.gsap;

    if (hasScrollTrigger) {
      gsap.registerPlugin(window.ScrollTrigger);
    }

    if (prefersReducedMotion) {
      return;
    }

    /* Hero entrance */
    var heroLine = qs("[data-hero-line] > span");
    var heroReveals = qsa(".hero [data-reveal]");
    var portraitFrame = qs(".hero__portrait-frame");
    var navEl = nav;

    var tl = gsap.timeline({
      defaults: { ease: "power3.out" },
    });

    if (heroLine) {
      gsap.set(heroLine, { yPercent: 115 });
      tl.to(heroLine, { yPercent: 0, duration: 1.05 }, 0.05);
    }

    if (heroReveals.length) {
      gsap.set(heroReveals, { autoAlpha: 0, y: 28 });
      tl.to(
        heroReveals,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.85,
          stagger: 0.07,
        },
        0.28
      );
    }

    if (portraitFrame) {
      gsap.set(portraitFrame, {
        clipPath: "inset(100% 0 0 0)",
      });
      gsap.set(".hero__portrait-img", { scale: 1.12, autoAlpha: 0 });
      tl.to(
        portraitFrame,
        { clipPath: "inset(0% 0 0 0)", duration: 1.15, ease: "power4.inOut" },
        0.2
      );
      tl.to(
        ".hero__portrait-img",
        { scale: 1.04, autoAlpha: 1, duration: 1.2, ease: "power3.out" },
        0.35
      );
    }

    if (navEl) {
      gsap.set(navEl, { y: -24, autoAlpha: 0 });
      tl.to(navEl, { y: 0, autoAlpha: 1, duration: 0.7 }, 0.55);
    }

    /* Scroll reveals */
    if (hasScrollTrigger) {
      qsa("[data-reveal]").forEach(function (el) {
        if (el.closest(".hero")) return;

        gsap.from(el, {
          autoAlpha: 0,
          y: 36,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      });

      /* Project media slight parallax */
      qsa(".project__media-visual img").forEach(function (img) {
        gsap.fromTo(
          img,
          { yPercent: -4 },
          {
            yPercent: 4,
            ease: "none",
            scrollTrigger: {
              trigger: img.closest(".project"),
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      });

      /* Slow background typography parallax */
      qsa("[data-bg-type]").forEach(function (el) {
        gsap.fromTo(
          el,
          { y: -30 },
          {
            y: 30,
            ease: "none",
            scrollTrigger: {
              trigger: el.parentElement,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      });

      /* Section titles subtle rise */
      qsa(
        ".section__title, .about__statement-title, .contact__cta, .currently__title"
      ).forEach(function (el) {
        gsap.from(el, {
          y: 48,
          autoAlpha: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            toggleActions: "play none none none",
          },
        });
      });

      /* Project index subtle scrub */
      qsa(".project__index").forEach(function (el) {
        gsap.from(el, {
          x: -20,
          autoAlpha: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            toggleActions: "play none none none",
          },
        });
      });
    }

    initPortraitParallax(gsap);
  }

  function initPortraitParallax(gsap) {
    if (!canHover || prefersReducedMotion) return;

    var portrait = qs("[data-portrait]");
    var img = qs(".hero__portrait-img");
    if (!portrait || !img) return;

    var rect = null;
    var targetX = 0;
    var targetY = 0;
    var currentX = 0;
    var currentY = 0;
    var active = false;

    function measure() {
      rect = portrait.getBoundingClientRect();
    }

    measure();
    window.addEventListener(
      "resize",
      function () {
        measure();
      },
      { passive: true }
    );

    portrait.addEventListener("mouseenter", function () {
      active = true;
      measure();
    });

    portrait.addEventListener("mouseleave", function () {
      active = false;
      targetX = 0;
      targetY = 0;
    });

    portrait.addEventListener(
      "mousemove",
      function (e) {
        if (!rect) measure();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        targetX = x * 16;
        targetY = y * 12;
      },
      { passive: true }
    );

    function tick() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      if (Math.abs(currentX) > 0.05 || Math.abs(currentY) > 0.05 || active) {
        gsap.set(img, {
          x: currentX,
          y: currentY,
          scale: 1.06,
        });
      }

      window.requestAnimationFrame(tick);
    }

    window.requestAnimationFrame(tick);
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  onReady(function () {
    window.requestAnimationFrame(function () {
      hasGsap = typeof window.gsap !== "undefined";
      hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";
      if (!lenis) lenis = initLenis();
      initMotion();
      initMagnetic();
      updateScrollUI();
    });
  });
})();
