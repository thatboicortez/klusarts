/* 3D-kubus op de homepage (zelfde model, materiaal, licht en rotatie als theskill.live).
   Three.js en het model worden pas geladen als dit script draait; de pagina zelf is dan al getekend.
   Lukt WebGL niet, dan blijft het canvas gewoon onzichtbaar. */
(function () {
  "use strict";

  var cube = document.getElementById("rubikCube");
  var canvas = document.getElementById("rubikCanvas");
  if (!cube || !canvas) return;

  var modelUrl = "/models/the_impossible_rubiks_cube.glb";
  // Het model (~390 KB) alvast ophalen, parallel aan de Three.js-modules.
  var modelPromise = fetch(modelUrl).then(function (res) { return res.arrayBuffer(); });

  Promise.all([
    import("/js/vendor/three/three.module.js"),
    import("/js/vendor/three/examples/jsm/loaders/GLTFLoader.js"),
    modelPromise
  ]).then(function (parts) {
    start(parts[0], parts[1].GLTFLoader, parts[2]);
  }).catch(function (err) { /* geen kubus is beter dan een kapotte pagina */ if (window.console) console.warn("cube:", err); });

  function start(THREE, GLTFLoader, modelBuffer) {
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch (e) { return; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (THREE.ACESFilmicToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
    }

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 6.4);

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    var keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    var rimLight = new THREE.DirectionalLight(0xbfe8ff, 2.4);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);
    var fillLight = new THREE.DirectionalLight(0xffffff, 1.1);
    fillLight.position.set(-3, 2, 4);
    scene.add(fillLight);

    // Kleine studio-gradient als omgevingskaart, zodat het donkere, gepolijste
    // materiaal echte highlights heeft om te weerspiegelen.
    var envCanvas = document.createElement("canvas");
    envCanvas.width = 256;
    envCanvas.height = 128;
    var envCtx = envCanvas.getContext("2d");
    if (envCtx) {
      var gradient = envCtx.createLinearGradient(0, 0, 0, 128);
      gradient.addColorStop(0, "#0a0a0a");
      gradient.addColorStop(0.28, "#d8d8d8");
      gradient.addColorStop(0.5, "#1a1a1a");
      gradient.addColorStop(0.74, "#c2c2c2");
      gradient.addColorStop(1, "#050505");
      envCtx.fillStyle = gradient;
      envCtx.fillRect(0, 0, 256, 128);
      envCtx.fillStyle = "rgba(255,255,255,0.65)";
      envCtx.fillRect(20, 10, 70, 8);
      envCtx.fillRect(170, 78, 70, 8);
    }
    var envTexture = new THREE.CanvasTexture(envCanvas);
    if (THREE.SRGBColorSpace) envTexture.colorSpace = THREE.SRGBColorSpace;
    if (THREE.EquirectangularReflectionMapping) envTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = envTexture;

    var cubeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x060606,
      metalness: 0.88,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
      reflectivity: 1,
      envMapIntensity: 1.9
    });

    var spinGroup = new THREE.Group();
    scene.add(spinGroup);
    var mixer = null;

    new GLTFLoader().parse(modelBuffer, "", function (gltf) {
      var model = gltf.scene;
      var box = new THREE.Box3().setFromObject(model);
      var sphere = box.getBoundingSphere(new THREE.Sphere());
      var targetRadius = 1.85;
      var scale = targetRadius / (sphere.radius || 1);

      model.scale.setScalar(scale);
      model.position.sub(sphere.center.clone().multiplyScalar(scale));

      // Een bol is rotatie-invariant: de camera kadreert op deze straal, zodat elke stand in beeld blijft.
      var fov = THREE.MathUtils.degToRad(camera.fov);
      camera.position.set(0, 0, (targetRadius / Math.sin(fov / 2)) * 1.2);

      // Eigen texturen van het model weg: elk vlak krijgt hetzelfde donkere, glanzende materiaal.
      model.traverse(function (node) { if (node.isMesh) node.material = cubeMaterial; });
      spinGroup.add(model);

      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach(function (clip) { mixer.clipAction(clip).play(); });
      }
      run();
    }, function () { /* model niet te lezen: geen kubus */ });

    var renderWidth = 0;
    var renderHeight = 0;
    function resize() {
      var rect = cube.getBoundingClientRect();
      var w = Math.max(1, Math.floor(rect.width));
      var h = Math.max(1, Math.floor(rect.height));
      if (w === renderWidth && h === renderHeight) return;
      renderWidth = w;
      renderHeight = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var clock = new THREE.Clock();
    var frame = 0;
    var visible = true;

    function render() {
      frame = 0;
      resize();
      var delta = Math.min(clock.getDelta(), 0.1);
      if (!reduceMotion.matches) {
        if (mixer) mixer.update(delta);
        // De hele kubus tolt door de ruimte, los van de ingebakken draai-animatie.
        spinGroup.rotation.x += delta * 0.242;
        spinGroup.rotation.y += delta * 0.483;
        spinGroup.rotation.z += delta * 0.242;
      }
      renderer.render(scene, camera);
      canvas.classList.add("is-ready");
      if (!reduceMotion.matches && visible && !document.hidden) frame = requestAnimationFrame(render);
    }

    function run() {
      clock.getDelta();
      if (!frame) frame = requestAnimationFrame(render);
    }

    // Niet doorrekenen als de kubus uit beeld is (spaart batterij op telefoons).
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) run();
      }).observe(cube);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) run(); });
    window.addEventListener("resize", resize, { passive: true });
    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener("change", function () { if (!reduceMotion.matches) run(); });
    }
  }
})();
