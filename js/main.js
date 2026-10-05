(function () {
  "use strict";

  var BUSINESS = window.BUSINESS || {};
  var I18N = window.I18N || { nl: {} };
  var LANG_KEY = "zzp-lang";
  var doc = document.documentElement;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { /* privémodus / geblokkeerde opslag: gewoon doorgaan */ }
    return null;
  }

  var currentLang = store(LANG_KEY) || "nl";
  if (!I18N[currentLang]) currentLang = "nl";

  /* ------------------------------------------------------------------ */
  /* Scroll lock (menu + lightbox delen één teller)                      */
  /* ------------------------------------------------------------------ */
  var lockCount = 0;
  var lockY = 0;
  function lockScroll() {
    if (lockCount++ > 0) return;
    lockY = window.pageYOffset || doc.scrollTop || 0;
    doc.classList.add("is-locked");
    document.body.style.top = -lockY + "px";
  }
  function unlockScroll() {
    if (lockCount === 0 || --lockCount > 0) return;
    doc.classList.remove("is-locked");
    document.body.style.top = "";
    var y = lockY;
    function restore() {
      try { window.scrollTo({ top: y, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); }
    }
    restore();
    /* de terugknop laat de browser zelf nog een scrollpositie terugzetten; die overschrijven we */
    requestAnimationFrame(restore);
    setTimeout(restore, 80);
  }

  /* Achtergrond onbereikbaar maken voor toetsenbord/screenreader zolang een overlay open is */
  function setInert(on, except) {
    ["main", ".footer"].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el && el !== except) {
        if (on) el.setAttribute("inert", ""); else el.removeAttribute("inert");
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Bedrijfsgegevens                                                    */
  /* ------------------------------------------------------------------ */
  function hasValue(v) { return typeof v === "string" && v !== "" && v.indexOf("[") === -1; }

  function applyBusiness() {
    document.querySelectorAll("[data-biz]").forEach(function (el) {
      var key = el.getAttribute("data-biz");
      if (BUSINESS[key] !== undefined) el.textContent = BUSINESS[key];
    });

    document.querySelectorAll("[data-biz-tel]").forEach(function (el) {
      if (hasValue(BUSINESS.phoneHref)) el.setAttribute("href", "tel:" + BUSINESS.phoneHref);
      else el.hidden = true;
    });

    document.querySelectorAll("[data-biz-whatsapp]").forEach(function (el) {
      if (hasValue(BUSINESS.whatsappNumber)) {
        var msg = encodeURIComponent("Hallo, ik heb een vraag over een klus.");
        el.setAttribute("href", "https://wa.me/" + BUSINESS.whatsappNumber + "?text=" + msg);
      } else el.hidden = true;
    });

    document.querySelectorAll("[data-biz-email]").forEach(function (el) {
      if (hasValue(BUSINESS.email)) el.setAttribute("href", "mailto:" + BUSINESS.email);
      else el.hidden = true;
    });

    var chips = document.getElementById("regionChips");
    if (chips && Array.isArray(BUSINESS.regions)) {
      chips.innerHTML = "";
      BUSINESS.regions.forEach(function (region) {
        var chip = document.createElement("span");
        chip.className = "chip";
        chip.innerHTML = '<svg aria-hidden="true"><use href="#icon-pin"/></svg>';
        chip.appendChild(document.createTextNode(region));
        chips.appendChild(chip);
      });
    }

    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ------------------------------------------------------------------ */
  /* i18n                                                                */
  /* ------------------------------------------------------------------ */
  function withBusinessName(str) {
    return hasValue(BUSINESS.name) ? str.replace(/\[[^\]]*\]/, BUSINESS.name) : str;
  }

  function t(key) {
    var dict = I18N[currentLang] || {};
    return dict[key] !== undefined ? dict[key] : (I18N.nl[key] !== undefined ? I18N.nl[key] : key);
  }

  function applyI18n() {
    doc.setAttribute("lang", currentLang);

    var page = document.body.getAttribute("data-page") || "home";
    var title = document.querySelector("title");
    if (title) title.textContent = withBusinessName(t("meta.title." + page));
    [["meta[name='description']", "meta.description."], ["meta[property='og:title']", "meta.title."], ["meta[property='og:description']", "meta.description."]]
      .forEach(function (pair) {
        var el = document.querySelector(pair[0]);
        if (el) el.setAttribute("content", withBusinessName(t(pair[1] + page)));
      });

    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder"))); });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) { el.setAttribute("alt", t(el.getAttribute("data-i18n-alt"))); });

    document.querySelectorAll(".lang button").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === currentLang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  function setLang(lang) {
    if (!I18N[lang] || lang === currentLang) return;
    currentLang = lang;
    store(LANG_KEY, lang);
    applyI18n();
    document.dispatchEvent(new CustomEvent("langchange"));
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-lang]");
    if (btn) setLang(btn.getAttribute("data-lang"));
  });

  function markActiveNav() {
    var page = document.body.getAttribute("data-page");
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      var on = a.getAttribute("data-nav") === page;
      a.classList.toggle("is-current", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Mobiel menu                                                         */
  /* ------------------------------------------------------------------ */
  var closeMenu = function () {};
  function initMobileMenu() {
    var toggle = document.getElementById("menuBtn");
    var menu = document.getElementById("mobileMenu");
    if (!toggle || !menu) return;
    var isOpen = false;

    function setOpen(open) {
      if (open === isOpen) return;
      isOpen = open;
      menu.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", t(open ? "nav.close" : "nav.open"));
      setInert(open);
      if (open) lockScroll(); else unlockScroll();
    }
    closeMenu = function () { setOpen(false); };

    toggle.addEventListener("click", function () { setOpen(!isOpen); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    window.matchMedia("(min-width: 901px)").addEventListener("change", function (m) { if (m.matches) setOpen(false); });
    document.addEventListener("langchange", function () {
      toggle.setAttribute("aria-label", t(isOpen ? "nav.close" : "nav.open"));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Reveal bij scrollen                                                 */
  /* ------------------------------------------------------------------ */
  function initReveal() {
    var targets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal], [data-stagger]"));
    if (!targets.length) return;

    document.querySelectorAll("[data-stagger]").forEach(function (parent) {
      Array.prototype.forEach.call(parent.children, function (child, i) {
        child.style.setProperty("--d", Math.min(i, 8) * 70 + "ms");
      });
    });
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      var d = el.getAttribute("data-reveal");
      if (d) el.style.setProperty("--d", parseInt(d, 10) + "ms");
    });

    if (typeof IntersectionObserver !== "function") {
      targets.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        /* ook wat al boven het scherm ligt (bv. na een ankersprong) meteen tonen */
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          entry.target.classList.add("is-in");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------ */
  /* Galerij: filters + lightbox                                         */
  /* ------------------------------------------------------------------ */
  function initGallery() {
    var gallery = document.getElementById("gallery");
    if (!gallery) return;

    var items = Array.prototype.slice.call(gallery.querySelectorAll(".g-item"));
    var filterBar = document.querySelector(".filters");
    var filters = Array.prototype.slice.call(document.querySelectorAll(".filter"));

    /* --- filters --- */
    function applyFilter(cat, fromUser) {
      var n = 0;
      items.forEach(function (item) {
        var show = cat === "alle" || item.getAttribute("data-category") === cat;
        item.hidden = !show;
        if (show) item.style.animationDelay = Math.min(n++, 12) * 35 + "ms";
      });
      filters.forEach(function (b) {
        var on = b.getAttribute("data-filter") === cat;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
        if (on && fromUser && filterBar && filterBar.scrollWidth > filterBar.clientWidth) {
          b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
        }
      });
      if (fromUser) {
        try { history.replaceState(history.state, "", cat === "alle" ? location.pathname : "#" + cat); } catch (e) { /* ignore */ }
      }
    }
    filters.forEach(function (btn) {
      btn.addEventListener("click", function () { applyFilter(btn.getAttribute("data-filter"), true); });
    });
    var initial = decodeURIComponent((location.hash || "").slice(1));
    if (initial && filters.some(function (b) { return b.getAttribute("data-filter") === initial; })) applyFilter(initial, false);

    /* --- lightbox --- */
    var lb = document.getElementById("lightbox");
    if (!lb) return;
    var stage = lb.querySelector(".lb-stage");
    var img = lb.querySelector(".lb-img");
    var count = lb.querySelector(".lb-count");
    var caption = lb.querySelector(".lb-caption");
    var closeBtn = lb.querySelector(".lb-close");
    var prevBtn = lb.querySelector(".lb-prev");
    var nextBtn = lb.querySelector(".lb-next");

    var slides = [];
    var index = 0;
    var isOpen = false;
    var opener = null;
    var token = 0;
    var cache = {};

    function slideFrom(el) {
      var item = el.closest(".g-item");
      var label = el.querySelector(".g-label");
      var cat = item.getAttribute("data-category");
      var pic = el.querySelector("img");
      return {
        full: pic.getAttribute("data-full") || pic.getAttribute("src"),
        alt: pic.getAttribute("alt") || "",
        cat: cat,
        pair: label ? label.getAttribute("data-i18n") : null,
        el: el
      };
    }

    function collectSlides() {
      slides = [];
      items.forEach(function (item) {
        if (item.hidden) return;
        var triggers = item.classList.contains("g-item--pair") ? item.querySelectorAll(".g-half") : [item];
        Array.prototype.forEach.call(triggers, function (el) { slides.push(slideFrom(el)); });
      });
    }

    function preload(src) {
      if (cache[src]) return cache[src];
      var im = new Image();
      im.decoding = "async";
      im.src = src;
      cache[src] = im;
      return im;
    }

    function render(dir) {
      var s = slides[index];
      var myToken = ++token;
      count.textContent = (index + 1) + " / " + slides.length;
      var catLabel = t("projects.filter." + s.cat);
      caption.innerHTML = "";
      var strong = document.createElement("strong");
      strong.textContent = s.pair ? t(s.pair) + " · " + catLabel : catLabel;
      caption.appendChild(strong);
      caption.appendChild(document.createTextNode(s.alt));

      var next = preload(s.full);
      var started = Date.now();
      var d = dir || 0;
      if (isOpen && d) {
        img.classList.add("is-out");
        img.style.transform = "translateX(" + (-d * 40) + "px)";
      }
      function swap() {
        if (myToken !== token) return;
        img.classList.add("is-dragging");
        img.style.transform = d ? "translateX(" + (d * 40) + "px)" : "";
        img.src = s.full;
        img.alt = s.alt;
        void img.offsetWidth;
        img.classList.remove("is-dragging");
        img.classList.remove("is-out");
        img.style.transform = "";
      }
      function ready() {
        var wait = d ? Math.max(0, 140 - (Date.now() - started)) : 0;
        setTimeout(swap, wait);
      }
      if (next.complete && next.naturalWidth) ready();
      else { next.addEventListener("load", ready, { once: true }); next.addEventListener("error", ready, { once: true }); }

      if (slides.length > 1) {
        preload(slides[(index + 1) % slides.length].full);
        preload(slides[(index - 1 + slides.length) % slides.length].full);
      }
      prevBtn.hidden = nextBtn.hidden = slides.length < 2;
    }

    function step(delta) {
      if (slides.length < 2) return;
      index = (index + delta + slides.length) % slides.length;
      render(delta > 0 ? 1 : -1);
    }

    function openAt(el) {
      collectSlides();
      var i = slides.findIndex(function (s) { return s.el === el; });
      if (i < 0) return;
      index = i;
      opener = el;
      isOpen = true;
      img.removeAttribute("src");
      render(0);
      /* eerst de historie (met de echte scrollpositie), dan pas het scrollen vergrendelen */
      try { history.pushState({ lb: 1 }, ""); } catch (e) { /* ignore */ }
      lb.classList.add("is-open");
      lb.removeAttribute("aria-hidden");
      lockScroll();
      setInert(true);
      var header = document.querySelector(".header");
      if (header) header.setAttribute("inert", "");
      closeBtn.focus({ preventScroll: true });
    }

    function doClose() {
      if (!isOpen) return;
      isOpen = false;
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      var header = document.querySelector(".header");
      if (header) header.removeAttribute("inert");
      setInert(false);
      unlockScroll();
      if (opener) opener.focus({ preventScroll: true });
    }

    /* Terugknop (Android/iOS-swipe) sluit eerst de lightbox, niet de pagina */
    function requestClose() {
      if (history.state && history.state.lb) history.back();
      else doClose();
    }
    window.addEventListener("popstate", function () { if (isOpen) doClose(); });

    gallery.addEventListener("click", function (e) {
      var el = e.target.closest(".g-half, .g-item:not(.g-item--pair)");
      if (el && gallery.contains(el)) openAt(el);
    });
    closeBtn.addEventListener("click", requestClose);
    prevBtn.addEventListener("click", function () { step(-1); });
    nextBtn.addEventListener("click", function () { step(1); });

    document.addEventListener("keydown", function (e) {
      if (!isOpen) return;
      if (e.key === "Escape") requestClose();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") {
        var f = Array.prototype.filter.call(lb.querySelectorAll("button"), function (b) { return !b.hidden; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!lb.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
    });

    /* Swipe: links/rechts = vorige/volgende, omlaag = sluiten, tik naast de foto = sluiten */
    var sx = 0, sy = 0, dx = 0, dy = 0, dragging = false;
    stage.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true; sx = e.clientX; sy = e.clientY; dx = dy = 0;
      img.classList.add("is-dragging");
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    stage.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      if (Math.abs(dx) >= Math.abs(dy)) img.style.transform = "translateX(" + dx + "px)";
      else img.style.transform = "translateY(" + Math.max(dy, 0) + "px)";
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      img.classList.remove("is-dragging");
      var ax = Math.abs(dx), ay = Math.abs(dy);
      img.style.transform = "";
      if (ax < 6 && ay < 6) {
        if (e && e.type === "pointerup" && e.target === stage) requestClose();
      } else if (ax > 60 && ax > ay) step(dx < 0 ? 1 : -1);
      else if (dy > 100 && ay > ax) requestClose();
    }
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("dragstart", function (e) { e.preventDefault(); });
  }

  /* ------------------------------------------------------------------ */
  /* Offerteformulier                                                    */
  /* ------------------------------------------------------------------ */
  function initForm() {
    var form = document.getElementById("offerteForm");
    if (!form) return;
    var status = document.getElementById("formStatus");
    var typeSel = form.querySelector("#fldType");
    var channel = "wa";

    var pre = new URLSearchParams(location.search).get("klus");
    if (pre && typeSel.querySelector('option[value="' + pre + '"]')) typeSel.value = pre;

    form.querySelectorAll("button[type=submit]").forEach(function (b) {
      b.addEventListener("click", function () { channel = b.getAttribute("data-channel"); });
    });

    function setError(field, bad) {
      var wrap = field.closest(".field");
      if (wrap) wrap.classList.toggle("has-error", bad);
    }
    form.addEventListener("input", function (e) { if (e.target.closest(".field")) setError(e.target, false); });

    function show(msg, kind) {
      status.textContent = msg;
      status.className = "form-status is-visible is-" + kind;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (e.submitter && e.submitter.getAttribute("data-channel")) channel = e.submitter.getAttribute("data-channel");

      var f = {
        naam: form.querySelector("#fldNaam"),
        email: form.querySelector("#fldEmail"),
        tel: form.querySelector("#fldTelefoon"),
        postcode: form.querySelector("#fldPostcode"),
        type: typeSel,
        bericht: form.querySelector("#fldBericht")
      };
      var valid = true;
      [f.naam, f.tel, f.type, f.bericht].forEach(function (el) {
        var ok = el.value.trim().length > 0;
        setError(el, !ok);
        if (!ok) valid = false;
      });
      var emailVal = f.email.value.trim();
      var emailOk = emailVal === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
      setError(f.email, !emailOk);
      if (!emailOk) valid = false;

      if (!valid) {
        show(t("form.status.error"), "error");
        var firstBad = form.querySelector(".has-error input, .has-error select, .has-error textarea");
        if (firstBad) firstBad.focus();
        return;
      }

      /* De berichttekst is altijd Nederlands: dat leest de ontvanger. */
      var typeLabel = (I18N.nl["form.type_klus." + f.type.value]) || f.type.value;
      var lines = [
        "Offerteaanvraag via de website",
        "",
        "Naam: " + f.naam.value.trim(),
        "Telefoon: " + f.tel.value.trim(),
        emailVal ? "E-mail: " + emailVal : null,
        f.postcode.value.trim() ? "Postcode: " + f.postcode.value.trim() : null,
        "Type klus: " + typeLabel,
        "",
        f.bericht.value.trim()
      ].filter(function (l) { return l !== null; });
      var body = lines.join("\n");

      if (channel === "wa" && hasValue(BUSINESS.whatsappNumber)) {
        var url = "https://wa.me/" + BUSINESS.whatsappNumber + "?text=" + encodeURIComponent(body);
        var w = window.open(url, "_blank", "noopener");
        if (!w) window.location.href = url;
      } else if (hasValue(BUSINESS.email)) {
        window.location.href = "mailto:" + BUSINESS.email +
          "?subject=" + encodeURIComponent("Offerteaanvraag via website - " + typeLabel) +
          "&body=" + encodeURIComponent(body);
      }
      show(t("form.status.success"), "success");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Init (scripts staan onderaan <body>: de DOM is klaar)                */
  /* ------------------------------------------------------------------ */
  applyBusiness();
  applyI18n();
  markActiveNav();
  initMobileMenu();
  initGallery();
  initForm();
  initReveal();

  window.addEventListener("pageshow", function (e) { if (e.persisted) closeMenu(); });
})();
