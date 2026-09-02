(function () {
  "use strict";

  var BUSINESS = window.BUSINESS || {};
  var I18N = window.I18N || { nl: {} };
  var LANG_KEY = "zzp-lang";
  var currentLang = localStorage.getItem(LANG_KEY) || "nl";
  if (!I18N[currentLang]) currentLang = "nl";

  /* ------------------------------------------------------------------ */
  /* Business config injection                                          */
  /* ------------------------------------------------------------------ */
  function applyBusiness() {
    document.querySelectorAll("[data-biz]").forEach(function (el) {
      var key = el.getAttribute("data-biz");
      if (BUSINESS[key] !== undefined && BUSINESS[key] !== "") {
        el.textContent = BUSINESS[key];
      } else if (BUSINESS[key] !== undefined) {
        el.textContent = BUSINESS[key];
      }
    });

    document.querySelectorAll("[data-biz-tel]").forEach(function (el) {
      if (BUSINESS.phoneHref) {
        el.setAttribute("href", "tel:" + BUSINESS.phoneHref);
      } else {
        el.setAttribute("href", "#offerte");
        el.setAttribute("data-placeholder-link", "true");
      }
    });

    document.querySelectorAll("[data-biz-whatsapp]").forEach(function (el) {
      if (BUSINESS.whatsappNumber) {
        var msg = encodeURIComponent("Hallo, ik heb een vraag over een klus.");
        el.setAttribute("href", "https://wa.me/" + BUSINESS.whatsappNumber + "?text=" + msg);
      } else {
        el.setAttribute("href", "#offerte");
        el.setAttribute("data-placeholder-link", "true");
      }
    });

    document.querySelectorAll("[data-biz-email]").forEach(function (el) {
      if (BUSINESS.email && BUSINESS.email.indexOf("[") === -1) {
        el.setAttribute("href", "mailto:" + BUSINESS.email);
      } else {
        el.setAttribute("href", "#offerte");
        el.setAttribute("data-placeholder-link", "true");
      }
    });

    var chipsWrap = document.getElementById("regionChips");
    if (chipsWrap && Array.isArray(BUSINESS.regions)) {
      chipsWrap.innerHTML = "";
      BUSINESS.regions.forEach(function (region) {
        var chip = document.createElement("span");
        chip.className = "region-chip";
        chip.textContent = region;
        chipsWrap.appendChild(chip);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* i18n                                                                */
  /* ------------------------------------------------------------------ */
  function withBusinessName(str) {
    if (BUSINESS.name && BUSINESS.name.indexOf("[") === -1) {
      return str.replace(/\[[^\]]*\]/, BUSINESS.name);
    }
    return str;
  }

  function t(key) {
    var dict = I18N[currentLang] || {};
    return dict[key] !== undefined ? dict[key] : (I18N.nl[key] || key);
  }

  function applyI18n() {
    document.documentElement.setAttribute("lang", currentLang);

    var page = document.body.getAttribute("data-page") || "home";
    var titleEl = document.querySelector("title");
    if (titleEl) titleEl.textContent = withBusinessName(t("meta.title." + page));
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", withBusinessName(t("meta.description." + page)));
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", withBusinessName(t("meta.title." + page)));
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", withBusinessName(t("meta.description." + page)));

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      el.setAttribute("alt", t(el.getAttribute("data-i18n-alt")));
    });

    document.querySelectorAll(".lang-switch button").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-lang") === currentLang);
    });
  }

  function setLang(lang) {
    if (!I18N[lang]) return;
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyI18n();
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-lang]");
    if (btn) setLang(btn.getAttribute("data-lang"));
  });

  /* ------------------------------------------------------------------ */
  /* Highlight the current page in navigation                           */
  /* ------------------------------------------------------------------ */
  function markActiveNav() {
    var page = document.body.getAttribute("data-page");
    if (!page) return;
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      a.classList.toggle("is-current", a.getAttribute("data-nav") === page);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Navbar: scroll state via IntersectionObserver (no scroll listener)  */
  /* ------------------------------------------------------------------ */
  function initNavScroll() {
    var navbar = document.querySelector(".navbar");
    var sentinel = document.getElementById("scrollSentinel");
    if (!navbar || !sentinel) return;
    var io = new IntersectionObserver(
      function (entries) {
        navbar.classList.toggle("is-scrolled", !entries[0].isIntersecting);
      },
      { threshold: 0, rootMargin: "0px" }
    );
    io.observe(sentinel);
  }

  /* ------------------------------------------------------------------ */
  /* Mobile menu                                                         */
  /* ------------------------------------------------------------------ */
  function initMobileMenu() {
    var toggle = document.getElementById("navToggle");
    var menu = document.getElementById("mobileMenu");
    if (!toggle || !menu) return;

    function close() {
      toggle.classList.remove("is-open");
      menu.classList.remove("is-open");
      document.body.classList.remove("no-scroll");
      toggle.setAttribute("aria-expanded", "false");
    }
    function open() {
      toggle.classList.add("is-open");
      menu.classList.add("is-open");
      document.body.classList.add("no-scroll");
      toggle.setAttribute("aria-expanded", "true");
    }

    toggle.addEventListener("click", function () {
      var isOpen = menu.classList.contains("is-open");
      isOpen ? close() : open();
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Reveal on scroll                                                    */
  /* ------------------------------------------------------------------ */
  function initReveal() {
    var targets = document.querySelectorAll("[data-reveal], [data-reveal-stagger]");
    if (!targets.length) return;

    function revealAll() {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
    }

    if (typeof IntersectionObserver !== "function") {
      revealAll();
      return;
    }

    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    targets.forEach(function (el) { io.observe(el); });

    /* Safety net: content must never stay invisible because a scroll animation
       failed to fire (throttled background tab, unusual embed context, etc.). */
    setTimeout(revealAll, 2500);
  }

  /* ------------------------------------------------------------------ */
  /* Gallery filter + lightbox                                          */
  /* ------------------------------------------------------------------ */
  function initGallery() {
    var filterBtns = document.querySelectorAll(".filter-btn");
    var items = Array.prototype.slice.call(document.querySelectorAll(".gallery-item"));
    var lightbox = document.getElementById("lightbox");
    if (!items.length || !lightbox) return;

    var lbFigure = lightbox.querySelector(".lightbox-figure");
    var lbImg = lightbox.querySelector(".lightbox-figure img");
    var lbCaption = lightbox.querySelector(".lightbox-caption");
    var lbPair = lightbox.querySelector(".lightbox-pair");
    var lbPairFigures = lbPair ? lbPair.querySelectorAll("figure") : [];
    var closeBtn = lightbox.querySelector(".lightbox-close");
    var prevBtn = lightbox.querySelector(".lightbox-prev");
    var nextBtn = lightbox.querySelector(".lightbox-next");
    var activeIndex = 0;
    var visibleItems = items;

    function applyFilter(category) {
      items.forEach(function (item) {
        var match = category === "alle" || item.getAttribute("data-category") === category;
        item.hidden = !match;
      });
      visibleItems = items.filter(function (item) { return !item.hidden; });
    }

    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        applyFilter(btn.getAttribute("data-filter"));
      });
    });

    function openLightbox(item) {
      visibleItems = items.filter(function (i) { return !i.hidden; });
      activeIndex = visibleItems.indexOf(item);
      renderLightbox();
      lightbox.classList.add("is-open");
      document.body.classList.add("no-scroll");
      closeBtn.focus();
    }
    function renderLightbox() {
      var item = visibleItems[activeIndex];
      if (!item) return;

      var isPair = item.classList.contains("gallery-item--pair");
      if (lbPair) lbPair.classList.toggle("is-active", isPair);
      lbFigure.style.display = isPair ? "none" : "";

      if (isPair) {
        var halves = item.querySelectorAll(".pair-half img");
        halves.forEach(function (img, i) {
          var figure = lbPairFigures[i];
          if (!figure) return;
          var figImg = figure.querySelector("img");
          figImg.src = img.getAttribute("src");
          figImg.alt = img.getAttribute("alt") || "";
        });
      } else {
        var img = item.querySelector("img");
        lbImg.src = img.getAttribute("src");
        lbImg.alt = img.getAttribute("alt") || "";
        var tag = item.querySelector(".tag");
        lbCaption.textContent = tag ? tag.textContent : "";
      }
    }
    function closeLightbox() {
      lightbox.classList.remove("is-open");
      document.body.classList.remove("no-scroll");
    }
    function step(delta) {
      if (!visibleItems.length) return;
      activeIndex = (activeIndex + delta + visibleItems.length) % visibleItems.length;
      renderLightbox();
    }

    items.forEach(function (item) {
      item.addEventListener("click", function () { openLightbox(item); });
    });
    closeBtn.addEventListener("click", closeLightbox);
    prevBtn.addEventListener("click", function () { step(-1); });
    nextBtn.addEventListener("click", function () { step(1); });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Service detail modal                                                */
  /* ------------------------------------------------------------------ */
  function initServiceModal() {
    var overlay = document.getElementById("serviceModal");
    if (!overlay) return;
    var modalImg = overlay.querySelector(".modal-media img");
    var modalTitle = overlay.querySelector(".modal-body h3");
    var modalText = overlay.querySelector(".modal-body p");
    var closeBtn = overlay.querySelector(".modal-close");
    var lastTrigger = null;

    function open(card) {
      var slug = card.getAttribute("data-service");
      var img = card.querySelector(".service-media img");
      modalImg.src = img.getAttribute("src");
      modalImg.alt = img.getAttribute("alt") || "";
      modalTitle.textContent = t("services." + slug + ".title");
      modalText.textContent = t("services." + slug + ".long");
      overlay.classList.add("is-open");
      document.body.classList.add("no-scroll");
      lastTrigger = card;
      closeBtn.focus();
    }
    function close() {
      overlay.classList.remove("is-open");
      document.body.classList.remove("no-scroll");
      if (lastTrigger) lastTrigger.querySelector(".service-more").focus();
    }

    document.querySelectorAll(".service-more").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        open(btn.closest(".service-card"));
      });
    });
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Photo upload preview                                                */
  /* ------------------------------------------------------------------ */
  function initUpload() {
    var input = document.getElementById("fotoInput");
    var zone = document.getElementById("uploadZone");
    var preview = document.getElementById("uploadPreview");
    if (!input || !zone || !preview) return;

    var MAX_FILES = 5;
    var selectedFiles = [];

    function syncInputFiles() {
      var dt = new DataTransfer();
      selectedFiles.forEach(function (f) { dt.items.add(f); });
      input.files = dt.files;
    }

    function render() {
      preview.innerHTML = "";
      selectedFiles.forEach(function (file, index) {
        var reader = new FileReader();
        reader.onload = function (e) {
          var thumb = document.createElement("div");
          thumb.className = "upload-thumb";
          var img = document.createElement("img");
          img.src = e.target.result;
          img.alt = file.name;
          var removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.setAttribute("aria-label", t("form.remove_photo"));
          removeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>';
          removeBtn.addEventListener("click", function () {
            selectedFiles.splice(index, 1);
            syncInputFiles();
            render();
          });
          thumb.appendChild(img);
          thumb.appendChild(removeBtn);
          preview.appendChild(thumb);
        };
        reader.readAsDataURL(file);
      });
    }

    function addFiles(fileList) {
      Array.prototype.slice.call(fileList).forEach(function (file) {
        if (selectedFiles.length >= MAX_FILES) return;
        if (file.type.indexOf("image/") !== 0) return;
        selectedFiles.push(file);
      });
      syncInputFiles();
      render();
    }

    input.addEventListener("change", function () { addFiles(input.files); });

    ["dragenter", "dragover"].forEach(function (evt) {
      zone.addEventListener(evt, function (e) {
        e.preventDefault();
        zone.classList.add("is-drag");
      });
    });
    ["dragleave", "drop"].forEach(function (evt) {
      zone.addEventListener(evt, function (e) {
        e.preventDefault();
        zone.classList.remove("is-drag");
      });
    });
    zone.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Offerte form                                                        */
  /* ------------------------------------------------------------------ */
  function initForm() {
    var form = document.getElementById("offerteForm");
    if (!form) return;
    var status = document.getElementById("formStatus");

    function setError(field, hasError) {
      var wrap = field.closest(".field");
      if (!wrap) return;
      wrap.classList.toggle("has-error", hasError);
    }

    function isValidEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var naam = form.querySelector("#fldNaam");
      var email = form.querySelector("#fldEmail");
      var telefoon = form.querySelector("#fldTelefoon");
      var typeKlus = form.querySelector("#fldType");
      var bericht = form.querySelector("#fldBericht");

      var valid = true;
      [naam, telefoon, typeKlus, bericht].forEach(function (field) {
        var ok = field.value.trim().length > 0;
        setError(field, !ok);
        if (!ok) valid = false;
      });
      var emailOk = isValidEmail(email.value.trim());
      setError(email, !emailOk);
      if (!emailOk) valid = false;

      status.classList.remove("is-visible", "is-success", "is-error");

      if (!valid) {
        status.textContent = t("form.status.error");
        status.classList.add("is-visible", "is-error");
        return;
      }

      /*
       * TODO (site-eigenaar / ontwikkelaar): dit formulier verstuurt nu een
       * kant-en-klare e-mail via mailto:. Dat werkt overal zonder backend,
       * maar kan geen foto's meesturen. Voor automatische verzending mét
       * foto-bijlagen: koppel dit formulier aan een service als Formspree,
       * Netlify Forms, of een eigen backend-endpoint (fetch/POST).
       */
      var subject = encodeURIComponent("Offerteaanvraag via website - " + typeKlus.value);
      var bodyLines = [
        "Naam: " + naam.value,
        "E-mail: " + email.value,
        "Telefoon: " + telefoon.value,
        "Postcode: " + (form.querySelector("#fldPostcode").value || "-"),
        "Type klus: " + typeKlus.value,
        "",
        bericht.value,
      ];
      var mailTo = (BUSINESS.email && BUSINESS.email.indexOf("[") === -1) ? BUSINESS.email : "";
      var href = "mailto:" + mailTo + "?subject=" + subject + "&body=" + encodeURIComponent(bodyLines.join("\n"));
      window.location.href = href;

      status.textContent = t("form.status.success");
      status.classList.add("is-visible", "is-success");
      form.reset();
      var preview = document.getElementById("uploadPreview");
      if (preview) preview.innerHTML = "";
    });
  }

  /* ------------------------------------------------------------------ */
  /* Homepage hero: 3D model, camera orbits continuously around it       */
  /* ------------------------------------------------------------------ */
  function initHero3D() {
    var wrap = document.getElementById("hero3d");
    var viewer = document.getElementById("heroModel");
    if (!wrap || !viewer) return;

    /* Desktop-only feature (the CSS hides .hero-3d below 900px): skip
       loading the ~1MB model-viewer library and the ~2.3MB model entirely
       on phones rather than fetching them just to stay invisible. */
    if (!window.matchMedia || !window.matchMedia("(min-width: 900px)").matches) return;

    var script = document.createElement("script");
    script.type = "module";
    script.src = "/js/vendor/model-viewer.min.js?v=14";
    document.head.appendChild(script);

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    var rafId = null;
    var start = null;

    function tick(now) {
      try {
        if (start === null) start = now;
        var t = (now - start) / 1000;

        /* Orbit the CAMERA around the model instead of rotating the model's
           own geometry. camera-target defaults to "auto auto auto" - the
           model's bounding-box center, a fixed point in world space - so at
           any theta/phi the object stays fully framed. Rotating the model
           itself (via the `orientation` property) instead turned out to
           clip parts of it off-frame whenever the model's own local origin
           isn't centered on its geometry, which this sidesteps entirely. */
        var theta = (t * 22) % 360; // continuous spin around the object
        var phi = 78 + 8 * Math.sin(t * 0.37) + 4 * Math.sin(t * 0.91 + 1.1); // gentle up/down tilt wobble

        viewer.cameraOrbit = theta.toFixed(2) + "deg " + phi.toFixed(2) + "deg 155%";
      } catch (err) {
        console.error("[hero3d] rotation loop stopped:", err);
        return; // stop retrying so the error is not spammed every frame
      }
      rafId = requestAnimationFrame(tick);
    }

    function play() {
      if (rafId === null) rafId = requestAnimationFrame(tick);
    }
    function pause() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        start = null;
      }
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause();
      else play();
    });

    play();
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    applyBusiness();
    applyI18n();
    markActiveNav();
    initNavScroll();
    initMobileMenu();
    initReveal();
    initGallery();
    initServiceModal();
    initUpload();
    initForm();
    initHero3D();
  });
})();
