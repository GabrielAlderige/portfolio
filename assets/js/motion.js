/* ============================================================
   Page motion — reveal, scrollspy, counters, nav state.
   No dependencies.
   ============================================================ */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* — Nav: solid once the hero is behind us ——————————— */
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav__toggle");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", open ? "false" : "true");
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
    });

    nav.querySelectorAll(".nav__links a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.setAttribute("data-open", "false");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* — Scroll progress rail ————————————————————————————— */
  var progress = document.querySelector(".progress");

  function onScroll() {
    if (nav) nav.setAttribute("data-stuck", window.scrollY > 24 ? "true" : "false");

    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? window.scrollY / max : 0;
      progress.style.transform = "scaleX(" + Math.min(Math.max(pct, 0), 1) + ")";
    }
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScroll();
      ticking = false;
    });
  }, { passive: true });
  onScroll();

  /* — Reveal on enter ————————————————————————————————— */
  var revealables = document.querySelectorAll("[data-reveal], [data-reveal-stagger]");

  // stagger children get their index as a custom property
  document.querySelectorAll("[data-reveal-stagger]").forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.setProperty("--i", i);
    });
  });

  if (reduced || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("is-in"); });
    fillMeters();
    document.querySelectorAll("[data-count]").forEach(function (el) {
      el.textContent = format(el, Number(el.getAttribute("data-count")));
    });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);

        if (entry.target.hasAttribute("data-count")) countUp(entry.target);
        if (entry.target.matches(".stack")) fillMeters(entry.target);
        entry.target.querySelectorAll("[data-count]").forEach(countUp);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

    revealables.forEach(function (el) { io.observe(el); });

    // meters live inside a revealed section but animate on their own cue
    document.querySelectorAll(".stack").forEach(function (el) { io.observe(el); });
  }

  /* — Counters ————————————————————————————————————————— */
  function countUp(el) {
    if (el.getAttribute("data-counted") === "true") return;
    el.setAttribute("data-counted", "true");

    var target = Number(el.getAttribute("data-count"));
    if (!isFinite(target)) return;

    var duration = 1400;
    var began = null;

    function step(now) {
      if (began === null) began = now;
      var p = Math.min((now - began) / duration, 1);
      // ease-out-quart: fast start, settles precisely on the number
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = format(el, Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function format(el, value) {
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    return prefix + value.toLocaleString("pt-BR") + suffix;
  }

  /* — Skill meters ————————————————————————————————————— */
  function fillMeters(scope) {
    (scope || document).querySelectorAll(".meter__fill").forEach(function (fill) {
      var level = fill.getAttribute("data-level") || "0";
      fill.style.width = level + "%";
    });
  }

  /* — Scrollspy —————————————————————————————————————————— */
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav__links a[href^='#']"));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.setAttribute("aria-current", a.getAttribute("href") === "#" + entry.target.id ? "true" : "false");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* — Year stamp ————————————————————————————————————————— */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
