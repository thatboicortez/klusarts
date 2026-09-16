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
  /* Homepage hero: a custom "construction cube" - a 3x3x3 Rubik's-style */
  /* puzzle built from scratch with Three.js (no premade .glb model),    */
  /* six real-material finishes instead of the classic sticker colours.  */
  /* The whole thing floats via the CSS animation on #hero3d; this only  */
  /* drives the cube's own slow spin and its individual slice turns.     */
  /* ------------------------------------------------------------------ */
  function initHeroCube() {
    var wrap = document.getElementById("hero3d");
    var canvas = document.getElementById("heroCube");
    if (!wrap || !canvas) return;

    /* Desktop-only feature (the CSS hides .hero-3d below 900px): skip
       fetching the ~670KB Three.js build entirely on phones rather than
       loading it just to stay invisible. */
    if (!window.matchMedia || !window.matchMedia("(min-width: 900px)").matches) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    import("/js/vendor/three.module.min.js?v=29").then(function (THREE) {
      /* Six finishes standing in for the classic sticker colours, one per
         face of the solved cube - tuned to read as real materials rather
         than plastic. */
      var FACES = {
        right:  { color: 0x4a7fb8, metalness: 0.55, roughness: 0.35 }, // brushed steel
        left:   { color: 0xb5551c, metalness: 0.08, roughness: 0.75 }, // rusted / safety orange
        top:    { color: 0xc7ccd1, metalness: 0.04, roughness: 0.9  }, // concrete
        bottom: { color: 0x33363c, metalness: 0.1,  roughness: 0.8  }, // graphite
        front:  { color: 0x7a5230, metalness: 0,    roughness: 0.95 }, // timber
        back:   { color: 0xc9a227, metalness: 0.2,  roughness: 0.6  }  // brass / hazard yellow
      };
      var innerMat = new THREE.MeshStandardMaterial({ color: 0x101214, roughness: 1 });

      function faceMaterial(spec) {
        return new THREE.MeshStandardMaterial({
          color: spec.color,
          metalness: spec.metalness,
          roughness: spec.roughness
        });
      }

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      camera.position.set(4.1, 3.2, 5.05);
      camera.lookAt(0, 0, 0);

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      var key = new THREE.DirectionalLight(0xffffff, 1.05);
      key.position.set(4, 6, 5);
      scene.add(key);
      var fill = new THREE.DirectionalLight(0xbcd4f0, 0.35);
      fill.position.set(-5, -2, -4);
      scene.add(fill);

      var root = new THREE.Group(); // slow continuous spin + tilt wobble
      var cubeGroup = new THREE.Group(); // holds the 27 cubies + turn pivots
      root.add(cubeGroup);
      scene.add(root);

      var GAP = 1.02;
      var SIZE = 0.94;
      var cubies = [];

      [-1, 0, 1].forEach(function (xi) {
        [-1, 0, 1].forEach(function (yi) {
          [-1, 0, 1].forEach(function (zi) {
            var geo = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
            var mats = [
              xi === 1 ? faceMaterial(FACES.right) : innerMat,
              xi === -1 ? faceMaterial(FACES.left) : innerMat,
              yi === 1 ? faceMaterial(FACES.top) : innerMat,
              yi === -1 ? faceMaterial(FACES.bottom) : innerMat,
              zi === 1 ? faceMaterial(FACES.front) : innerMat,
              zi === -1 ? faceMaterial(FACES.back) : innerMat
            ];
            var cubie = new THREE.Mesh(geo, mats);
            cubie.position.set(xi * GAP, yi * GAP, zi * GAP);
            cubeGroup.add(cubie);
            cubies.push(cubie);
          });
        });
      });

      var baseTiltX = -0.34;
      root.rotation.x = baseTiltX;
      root.rotation.y = 0.68;

      /* ---- slice-turn engine ----------------------------------------
         Reparent the 9 cubies of a random layer onto a pivot, animate the
         pivot 90 degrees on that axis, then bake the result back into each
         cubie's own transform. Object3D#attach() preserves world transforms
         across reparenting, so nothing jumps at either end of a turn. */
      var turning = false;

      function snap(obj) {
        // After many 90-degree turns, floating-point drift creeps into the
        // rotation matrix; since every turn is an exact axis-aligned
        // quarter-turn, every element of the rotation part must be -1, 0
        // or 1 - rounding them (and the position) removes the drift.
        obj.updateMatrix();
        var e = obj.matrix.elements.slice();
        [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14].forEach(function (i) {
          e[i] = Math.round(e[i]);
        });
        obj.matrix.fromArray(e);
        obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
      }

      function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

      function turnRandomSlice() {
        if (turning || document.hidden) return;
        turning = true;

        var axis = ["x", "y", "z"][Math.floor(Math.random() * 3)];
        var layer = Math.floor(Math.random() * 3) - 1; // -1, 0 or 1
        var dir = Math.random() < 0.5 ? 1 : -1;

        var pivot = new THREE.Group();
        cubeGroup.add(pivot);
        var affected = cubies.filter(function (c) {
          return Math.round(c.position[axis] / GAP) === layer;
        });
        affected.forEach(function (c) { pivot.attach(c); });

        var target = dir * Math.PI / 2;
        var duration = 480;
        var startTime = null;

        function step(now) {
          if (startTime === null) startTime = now;
          var t = Math.min((now - startTime) / duration, 1);
          pivot.rotation[axis] = target * ease(t);
          if (t < 1) {
            requestAnimationFrame(step);
            return;
          }
          affected.forEach(function (c) {
            cubeGroup.attach(c);
            snap(c);
          });
          cubeGroup.remove(pivot);
          turning = false;
        }
        requestAnimationFrame(step);
      }

      var turnTimer = null;
      function scheduleTurn() {
        turnTimer = window.setTimeout(function () {
          turnRandomSlice();
          scheduleTurn();
        }, 900 + Math.random() * 900);
      }

      function resize() {
        var w = wrap.clientWidth || 1;
        var h = wrap.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();
      if (window.ResizeObserver) {
        new ResizeObserver(resize).observe(wrap);
      } else {
        window.addEventListener("resize", resize);
      }

      renderer.render(scene, camera); // first paint immediately, even if reduced-motion stops here

      if (reduceMotion) return;

      var rafId = null;
      var t0 = null;
      function frame(now) {
        if (t0 === null) t0 = now;
        var t = (now - t0) / 1000;
        root.rotation.y += 0.0028;
        root.rotation.x = baseTiltX + Math.sin(t * 0.35) * 0.06;
        renderer.render(scene, camera);
        rafId = requestAnimationFrame(frame);
      }
      function play() {
        if (rafId === null) rafId = requestAnimationFrame(frame);
        if (turnTimer === null) scheduleTurn();
      }
      function pause() {
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
        if (turnTimer !== null) { clearTimeout(turnTimer); turnTimer = null; }
      }

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) pause();
        else play();
      });

      play();
    }).catch(function (err) {
      console.error("[hero3d] failed to load the 3D cube:", err);
    });
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
    initHeroCube();
  });
})();
