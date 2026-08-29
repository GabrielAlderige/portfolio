/* ============================================================
   Hero scene — a network graph in blue phosphor.

   An icosahedral wireframe core, a shell of drifting nodes, and
   edges that light up only while two nodes are close enough to
   "reach" each other. Ambient rotation, pointer parallax, and a
   scroll-driven dispersal that scatters the graph as the page
   moves past the hero.

   Depends on the global THREE (r128 UMD, loaded from cdnjs).
   ============================================================ */

(function () {
  "use strict";

  var mount = document.getElementById("hero-canvas");
  if (!mount) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof THREE === "undefined" || !hasWebGL()) {
    mount.setAttribute("data-fallback", "true");
    return;
  }

  /* — Palette (mirrors the CSS tokens) ————————————————— */
  var PULSE = new THREE.Color(0x4d8dff);
  var GLOW = new THREE.Color(0x7fd4ff);
  var DEEP = new THREE.Color(0x1b3f7a);

  var NODE_COUNT = 96;
  var DUST_COUNT = 1100;
  var LINK_DIST = 1.05;
  var MAX_LINKS = 900;

  /* — Renderer ————————————————————————————————————— */
  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 0, 6.4);

  var world = new THREE.Group();
  scene.add(world);

  /* — Core: icosahedral wireframe ——————————————————— */
  var coreGeo = new THREE.IcosahedronGeometry(1.18, 1);
  var core = new THREE.LineSegments(
    new THREE.WireframeGeometry(coreGeo),
    new THREE.LineBasicMaterial({
      color: PULSE,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  world.add(core);

  var shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.14, 2),
    new THREE.MeshBasicMaterial({
      color: DEEP,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  world.add(shell);

  /* — Nodes: the graph vertices ——————————————————————— */
  var base = new Float32Array(NODE_COUNT * 3);
  var live = new Float32Array(NODE_COUNT * 3);
  var phase = new Float32Array(NODE_COUNT);
  var speed = new Float32Array(NODE_COUNT);
  var nodeColors = new Float32Array(NODE_COUNT * 3);

  fibonacciShell(base, NODE_COUNT, 2.05, 0.5);

  var tmpColor = new THREE.Color();
  for (var i = 0; i < NODE_COUNT; i++) {
    phase[i] = Math.random() * Math.PI * 2;
    speed[i] = 0.24 + Math.random() * 0.5;
    tmpColor.copy(PULSE).lerp(GLOW, Math.random() * 0.85);
    nodeColors[i * 3] = tmpColor.r;
    nodeColors[i * 3 + 1] = tmpColor.g;
    nodeColors[i * 3 + 2] = tmpColor.b;
  }

  var nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(live, 3));
  nodeGeo.setAttribute("color", new THREE.BufferAttribute(nodeColors, 3));

  var sprite = makeGlowSprite();

  var nodes = new THREE.Points(
    nodeGeo,
    new THREE.PointsMaterial({
      size: 0.085,
      map: sprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })
  );
  world.add(nodes);

  /* — Dust: the far field ————————————————————————————— */
  var dustPos = new Float32Array(DUST_COUNT * 3);
  var dustCol = new Float32Array(DUST_COUNT * 3);
  fibonacciShell(dustPos, DUST_COUNT, 4.6, 2.6);
  for (var d = 0; d < DUST_COUNT; d++) {
    tmpColor.copy(DEEP).lerp(GLOW, Math.pow(Math.random(), 2.2));
    dustCol[d * 3] = tmpColor.r;
    dustCol[d * 3 + 1] = tmpColor.g;
    dustCol[d * 3 + 2] = tmpColor.b;
  }

  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("color", new THREE.BufferAttribute(dustCol, 3));

  var dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      size: 0.032,
      map: sprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })
  );
  world.add(dust);

  /* — Links: rebuilt every frame from node proximity ——— */
  var linkPos = new Float32Array(MAX_LINKS * 6);
  var linkCol = new Float32Array(MAX_LINKS * 6);
  var linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
  linkGeo.setAttribute("color", new THREE.BufferAttribute(linkCol, 3));

  var links = new THREE.LineSegments(
    linkGeo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  world.add(links);

  /* — Input state ————————————————————————————————————— */
  var pointer = { x: 0, y: 0 };
  var eased = { x: 0, y: 0 };
  var scrollT = 0;
  var visible = true;

  window.addEventListener("pointermove", function (e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  window.addEventListener("scroll", function () {
    var h = mount.offsetHeight || window.innerHeight;
    scrollT = Math.min(Math.max(window.scrollY / h, 0), 1);
  }, { passive: true });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(mount);
  }

  /* — Resize ——————————————————————————————————————————— */
  function resize() {
    var w = mount.clientWidth || window.innerWidth;
    var h = mount.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // pull the camera back on narrow screens so the graph still fits
    camera.position.z = w < 760 ? 8.6 : 6.4;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  /* — Frame ———————————————————————————————————————————— */
  var clock = new THREE.Clock();

  function frame(t) {
    var dt = clock.getDelta();

    // dispersal: the graph flies apart and dims as the hero scrolls away
    var spread = 1 + scrollT * 1.25;
    var fade = 1 - scrollT * 0.9;

    for (var i = 0; i < NODE_COUNT; i++) {
      var k = i * 3;
      var breathe = 1 + Math.sin(t * speed[i] + phase[i]) * 0.075;
      var s = breathe * spread;
      live[k] = base[k] * s;
      live[k + 1] = base[k + 1] * s;
      live[k + 2] = base[k + 2] * s;
    }
    nodeGeo.attributes.position.needsUpdate = true;

    buildLinks(fade);

    // pointer parallax, eased
    eased.x += (pointer.x - eased.x) * Math.min(dt * 2.4, 1);
    eased.y += (pointer.y - eased.y) * Math.min(dt * 2.4, 1);

    world.rotation.y = t * 0.06 + eased.x * 0.42;
    world.rotation.x = Math.sin(t * 0.04) * 0.12 + eased.y * 0.26;
    world.scale.setScalar(1 - scrollT * 0.28);

    core.material.opacity = 0.34 * fade;
    shell.material.opacity = 0.16 * fade;
    nodes.material.opacity = 0.95 * fade;
    dust.material.opacity = 0.55 * fade;
    links.material.opacity = 0.7 * fade;

    dust.rotation.y = -t * 0.018;

    renderer.render(scene, camera);
  }

  function buildLinks(fade) {
    var count = 0;
    for (var a = 0; a < NODE_COUNT && count < MAX_LINKS; a++) {
      var ax = live[a * 3], ay = live[a * 3 + 1], az = live[a * 3 + 2];
      for (var b = a + 1; b < NODE_COUNT && count < MAX_LINKS; b++) {
        var dx = ax - live[b * 3];
        var dy = ay - live[b * 3 + 1];
        var dz = az - live[b * 3 + 2];
        var dist2 = dx * dx + dy * dy + dz * dz;
        if (dist2 > LINK_DIST * LINK_DIST) continue;

        // near edges burn bright, distant ones trail off to nothing
        var strength = (1 - Math.sqrt(dist2) / LINK_DIST) * fade;
        var o = count * 6;

        linkPos[o] = ax; linkPos[o + 1] = ay; linkPos[o + 2] = az;
        linkPos[o + 3] = live[b * 3]; linkPos[o + 4] = live[b * 3 + 1]; linkPos[o + 5] = live[b * 3 + 2];

        linkCol[o] = PULSE.r * strength;
        linkCol[o + 1] = PULSE.g * strength;
        linkCol[o + 2] = PULSE.b * strength;
        linkCol[o + 3] = GLOW.r * strength;
        linkCol[o + 4] = GLOW.g * strength;
        linkCol[o + 5] = GLOW.b * strength;

        count++;
      }
    }

    linkGeo.attributes.position.needsUpdate = true;
    linkGeo.attributes.color.needsUpdate = true;
    linkGeo.setDrawRange(0, count * 2);
  }

  if (reduced) {
    // one composed still frame, no loop
    resize();
    frame(0);
  } else {
    var start = performance.now();
    (function loop(now) {
      requestAnimationFrame(loop);
      if (!visible) { clock.getDelta(); return; }
      frame((now - start) / 1000);
    })(start);
  }

  /* — Helpers ————————————————————————————————————————— */

  // Evenly distributed points on a spherical shell, jittered in radius
  // so the field reads as organic rather than as a lattice.
  function fibonacciShell(target, count, radius, jitter) {
    var golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < count; i++) {
      var y = 1 - (i / (count - 1)) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var theta = golden * i;
      var rad = radius + (Math.random() - 0.5) * jitter;
      target[i * 3] = Math.cos(theta) * r * rad;
      target[i * 3 + 1] = y * rad;
      target[i * 3 + 2] = Math.sin(theta) * r * rad;
    }
  }

  // A soft radial dot, drawn once to a canvas — cheaper and sharper
  // than a bloom pass for points this small.
  function makeGlowSprite() {
    var size = 64;
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.85)");
    g.addColorStop(0.55, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) {
      return false;
    }
  }
})();
