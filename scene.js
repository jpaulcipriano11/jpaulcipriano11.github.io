/* ============================================================
   PAUL — GPU SCENE ENGINE
   Photo-matched dual showcase: GIGABYTE Windforce triple-fan
   + NVIDIA RTX 2080 Super Founders Edition. Three.js core.
   ============================================================ */
(function () {
  'use strict';
  const canvas = document.getElementById('sceneCanvas');
  const stage = canvas && canvas.parentElement;
  const fallback = document.getElementById('sceneFallback');
  const badge = document.getElementById('fpsBadge');
  const live = document.getElementById('sceneLive');
  if (!canvas || !stage) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const el = id => document.getElementById(id);
  const setBadge = (t, w) => { if (badge) { badge.textContent = t; badge.classList.toggle('warn', !!w); } };
  function fail(reason) {
    window.__sceneFailed = true;
    if (fallback) { fallback.hidden = false; const p = fallback.querySelector('p'); if (p) p.textContent = reason; }
    canvas.style.display = 'none'; setBadge('STATIC PREVIEW', true);
    if (live) live.textContent = 'FALLBACK MODE';
    console.warn('[scene]', reason);
  }
  function webglOK() {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
    catch (e) { return false; }
  }
  setBadge('LOADING GPU…');
  if (!webglOK()) { fail('WEBGL IS NOT AVAILABLE IN THIS BROWSER'); return; }

  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
  async function loadEngine() {
    try {
      const T = await withTimeout(import('https://esm.sh/three@0.160.0'), 9000);
      let GLTFLoader = null, DRACOLoader = null;
      try {
        const g = await withTimeout(import('https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'), 9000);
        GLTFLoader = g.GLTFLoader;
        try { const d = await withTimeout(import('https://esm.sh/three@0.160.0/examples/jsm/loaders/DRACOLoader.js'), 7000); DRACOLoader = d.DRACOLoader; } catch (e) {}
      } catch (e) {}
      return { THREE: T, GLTFLoader, DRACOLoader };
    } catch (e) {}
    const CDNS = ['https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', 'https://unpkg.com/three@0.160.0/build/three.module.js'];
    const attempt = u => withTimeout(import(u), 8000);
    const T = await (Promise.any ? Promise.any(CDNS.map(attempt)) : CDNS.reduce((p, u) => p.catch(() => attempt(u)), Promise.reject(new Error('start'))));
    return { THREE: T, GLTFLoader: null, DRACOLoader: null };
  }

  let THREE, GLTFLoader, DRACOLoader;
  loadEngine().then(e => {
    if (!e.THREE || !e.THREE.WebGLRenderer) throw new Error('bad module');
    THREE = e.THREE; GLTFLoader = e.GLTFLoader; DRACOLoader = e.DRACOLoader; boot();
  }).catch(() => fail('3D ENGINE COULD NOT LOAD — CHECK NETWORK / CDN ACCESS'));

  function boot() {
    const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
    const cssVar = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    const bgColor = () => cssVar('--bg-2') || '#0D1120';
    scene.background = new THREE.Color(bgColor());
    scene.fog = new THREE.FogExp2(bgColor(), 0.03);

    const DEF = { card: 'both', quality: 'ultra', speed: 0.5, dist: 7.4, fan: 65, bloom: 0.55, light: 1, finish: 0.35, accent: '#5b8cff', grid: true, glow: true, wire: false };
    const S = { ...DEF };
    const orbit = { theta: 0.5, phi: 1.15, dist: 7.4, thetaT: 0.5, phiT: 1.15, distT: 7.4 };
    const target = new THREE.Vector3(0, 0, 0);
    const targetT = new THREE.Vector3(0, 0, 0);
    function updateCamera() {
      orbit.theta += (orbit.thetaT - orbit.theta) * 0.085;
      orbit.phi += (orbit.phiT - orbit.phi) * 0.085;
      orbit.dist += (orbit.distT - orbit.dist) * 0.085;
      target.lerp(targetT, 0.07);
      const sp = Math.sin(orbit.phi);
      camera.position.set(target.x + orbit.dist * sp * Math.sin(orbit.theta), target.y + orbit.dist * Math.cos(orbit.phi), target.z + orbit.dist * sp * Math.cos(orbit.theta));
      camera.lookAt(target);
    }

    /* ---------- textures ---------- */
    function makeCanvas(w, h, draw, srgb) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }
    const brushTex = makeCanvas(256, 256, (x, w, h) => {
      x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { const y = Math.random() * h; x.strokeStyle = `rgba(${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},${.05 + Math.random() * .1})`; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + (Math.random() - .5) * 2); x.stroke(); }
    });
    brushTex.wrapS = brushTex.wrapT = THREE.RepeatWrapping; brushTex.repeat.set(3, 1);
    const glowTex = makeCanvas(128, 128, (x, w, h) => {
      const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }, true);
    const shadowTex = makeCanvas(256, 256, (x, w, h) => {
      const g = x.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(.6, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }, true);
    const gbHubTex = makeCanvas(256, 256, (x, w, h) => {
      const g = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
      g.addColorStop(0, '#e8e8e8'); g.addColorStop(.7, '#b9b9b9'); g.addColorStop(1, '#8a8a8a');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#2b2b2b'; x.font = '700 34px "Space Grotesk",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2); x.fillText('GIGABYTE', 0, 0); x.restore();
    }, true);
    const feHubTex = makeCanvas(256, 256, (x, w, h) => {
      const g = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, '#f5f5f5'); g.addColorStop(.5, '#c9c9c9'); g.addColorStop(1, '#909090');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      for (let r = 6; r < w / 2; r += 3) { x.strokeStyle = r % 6 ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.25)'; x.beginPath(); x.arc(w / 2, h / 2, r, 0, 6.29); x.stroke(); }
    }, true);
    const feLabelTex = makeCanvas(512, 256, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#2f2f2f'; x.font = '700 74px "Space Grotesk",sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle';
      x.fillText('RTX 2080', 20, 110);
      x.save(); x.translate(330, 60); x.transform(1, 0, -0.25, 1, 0, 0);
      x.fillStyle = '#76b900'; x.fillRect(0, 0, 150, 62); x.restore();
      x.fillStyle = '#fff'; x.font = '700 44px "Space Grotesk",sans-serif'; x.fillText('super', 345, 92);
    }, true);
    const gbEdgeTex = makeCanvas(512, 96, (x, w, h) => {
      x.clearRect(0, 0, w, h); x.fillStyle = '#e8ecf5'; x.font = '700 52px "Space Grotesk",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('GIGABYTE', w / 2, h / 2);
    }, true);

    /* ---------- materials ---------- */
    const accent = new THREE.Color(S.accent);
    const M = {
      gbShroud: new THREE.MeshPhysicalMaterial({ color: 0x171a20, metalness: .8, roughness: .45, clearcoat: .4, clearcoatRoughness: .3, envMapIntensity: 1.1, roughnessMap: brushTex }),
      gbFan: new THREE.MeshStandardMaterial({ color: 0x101216, metalness: .2, roughness: .6 }),
      gbHub: new THREE.MeshStandardMaterial({ map: gbHubTex, metalness: .7, roughness: .35 }),
      gbStrip: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.6, roughness: .4 }),
      feBody: new THREE.MeshPhysicalMaterial({ color: 0xc9c9cf, metalness: 1, roughness: .34, clearcoat: .3, clearcoatRoughness: .2, envMapIntensity: 1.4, roughnessMap: brushTex }),
      feFan: new THREE.MeshStandardMaterial({ color: 0x15171c, metalness: .25, roughness: .55 }),
      feHub: new THREE.MeshStandardMaterial({ map: feHubTex, metalness: .95, roughness: .25 }),
      feLabel: new THREE.MeshStandardMaterial({ map: feLabelTex, transparent: true, metalness: .4, roughness: .5 }),
      fins: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: .95, roughness: .35 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 1, roughness: .25 }),
      copper: new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 1, roughness: .3 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x0b0c0f, metalness: .3, roughness: .7 }),
      bracket: new THREE.MeshStandardMaterial({ color: 0x8a8f98, metalness: .9, roughness: .4 }),
      pcb: new THREE.MeshStandardMaterial({ color: 0x0a2a1e, metalness: .1, roughness: .6 }),
      pedestal: new THREE.MeshPhysicalMaterial({ color: 0x0c0e12, metalness: .85, roughness: .22, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: 1.4 })
    };
    const allMats = Object.values(M);

    /* ---------- helpers ---------- */
    const fans = [];
    const glowSprites = [];
    function addGlow(parent, x, y, z, scale, opacity) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: accent.clone(), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
      sp.position.set(x, y, z); sp.scale.setScalar(scale); sp.userData.base = opacity;
      parent.add(sp); glowSprites.push(sp); return sp;
    }
    const add = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    function roundedRect(w, h, r) {
      const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
    }
    function bladeGeo(inner, outer, width) {
      const s = new THREE.Shape();
      s.moveTo(inner, -width * .4); s.quadraticCurveTo((inner + outer) / 2, -width, outer, -width * .15);
      s.lineTo(outer, width * .35); s.quadraticCurveTo((inner + outer) / 2, width * .2, inner, width * .5); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: .015, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 1, curveSegments: 10 });
      g.translate(0, 0, -.0075); return g;
    }
    function buildFan(parent, x, y, z, r, count, bladeMat, hubMat, dir) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
      const bg = bladeGeo(r * .3, r * .96, r * .42);
      for (let i = 0; i < count; i++) { const b = add(bg, bladeMat, g); b.rotation.set(.3, 0, i * Math.PI * 2 / count); }
      const hub = add(new THREE.CylinderGeometry(r * .3, r * .3, .06, 32), bladeMat, g); hub.rotation.x = Math.PI / 2;
      const cap = add(new THREE.CircleGeometry(r * .28, 32), hubMat, g); cap.position.z = .035;
      fans.push({ g, dir }); return g;
    }
    function pcieFingers(parent, len, y, z) {
      const tongue = add(new THREE.BoxGeometry(len, .1, .06), M.dark, parent); tongue.position.set(0, y, z);
      const n = Math.floor(len / .055); const pads = new THREE.InstancedMesh(new THREE.BoxGeometry(.036, .045, .012), M.gold, n);
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { m4.makeTranslation(-len / 2 + .05 + i * .055, y, z + .035); pads.setMatrixAt(i, m4); }
      pads.instanceMatrix.needsUpdate = true; pads.castShadow = true; parent.add(pads);
    }
    function bracketIO(parent, x, h, t) {
      const b = add(new THREE.BoxGeometry(.05, h, t), M.bracket, parent); b.position.x = x;
      [-.3, 0, .3].forEach(dy => { const p = add(new THREE.BoxGeometry(.02, .14, .13), M.dark, parent); p.position.set(x - .03, dy, 0); });
    }

    /* ---------- GIGABYTE Windforce ---------- */
    function buildGB() {
      const g = new THREE.Group();
      const shape = roundedRect(3.2, 1.25, .12);
      [-1.05, 0, 1.05].forEach(fx => { const hole = new THREE.Path(); hole.absarc(fx, 0, .42, 0, Math.PI * 2, true); shape.holes.push(hole); });
      const sg = new THREE.ExtrudeGeometry(shape, { depth: .12, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: 40 });
      sg.translate(0, 0, -.06);
      const shroud = add(sg, M.gbShroud, g); shroud.position.z = .28;
      // angular vent slashes
      [[-1.5, .45], [.55, .45], [-.55, -.45], [1.5, -.45]].forEach(([vx, vy]) => {
        for (let i = 0; i < 3; i++) { const s = add(new THREE.BoxGeometry(.3, .02, .02), M.dark, g); s.position.set(vx + i * .06, vy - i * .05, .35); s.rotation.z = -.6; }
      });
      // heatsink
      const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(.014, 1.05, .4), M.fins, 44);
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < 44; i++) { m4.makeTranslation(-1.5 + i * (3 / 43), 0, .02); fins.setMatrixAt(i, m4); }
      fins.instanceMatrix.needsUpdate = true; fins.castShadow = true; g.add(fins);
      // fans (alternating rotation like Windforce)
      buildFan(g, -1.05, 0, .26, .4, 11, M.gbFan, M.gbHub, 1);
      buildFan(g, 0, 0, .26, .4, 11, M.gbFan, M.gbHub, -1);
      buildFan(g, 1.05, 0, .26, .4, 11, M.gbFan, M.gbHub, 1);
      [-1.05, 0, 1.05].forEach(fx => { const ring = add(new THREE.TorusGeometry(.42, .015, 10, 64), M.gbShroud, g); ring.position.set(fx, 0, .3); });
      // backplate + pcb
      const back = add(new THREE.BoxGeometry(3.2, 1.25, .04), M.gbShroud, g); back.position.z = -.3;
      const pcb = add(new THREE.BoxGeometry(3.1, 1.15, .03), M.pcb, g); pcb.position.z = -.12;
      // edge RGB strip + logo
      const strip = add(new THREE.BoxGeometry(3.0, .03, .03), M.gbStrip, g); strip.position.set(0, .64, .28);
      const edge = add(new THREE.PlaneGeometry(1.4, .16), new THREE.MeshStandardMaterial({ map: gbEdgeTex, transparent: true, emissive: 0xffffff, emissiveMap: gbEdgeTex, emissiveIntensity: .8 }), g);
      edge.position.set(0, .66, .1); edge.rotation.x = -Math.PI / 2 + .3;
      addGlow(g, 0, .66, .28, 2.4, .12);
      pcieFingers(g, 2.2, -.7, -.05);
      bracketIO(g, -1.64, 1.25, .55);
      return g;
    }

    /* ---------- RTX 2080 Super FE ---------- */
    function buildFE() {
      const g = new THREE.Group();
      const body = add(new THREE.ExtrudeGeometry(roundedRect(2.7, 1.15, .1), { depth: .4, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 3, curveSegments: 40 }), M.feBody, g);
      body.geometry.translate(0, 0, -.2);
      // raised middle plate
      const mid = add(new THREE.BoxGeometry(1.0, 1.0, .06), M.feBody, g); mid.position.z = .22;
      // fan recess rims
      [-.85, .85].forEach(fx => {
        const rim = add(new THREE.TorusGeometry(.44, .025, 12, 72), M.feHub, g); rim.position.set(fx, 0, .21);
        const recess = add(new THREE.CylinderGeometry(.43, .43, .05, 48), M.dark, g); recess.rotation.x = Math.PI / 2; recess.position.set(fx, 0, .18);
        buildFan(g, fx, 0, .24, .42, 13, M.feFan, M.feHub, fx < 0 ? 1 : -1);
      });
      // label
      const label = add(new THREE.PlaneGeometry(1.05, .5), M.feLabel, g); label.position.set(0, 0, .26);
      // torx screws
      [[-1.2, .45], [1.2, .45], [-1.2, -.45], [1.2, -.45]].forEach(([sx, sy]) => {
        const s = add(new THREE.CylinderGeometry(.035, .035, .02, 16), M.feHub, g); s.rotation.x = Math.PI / 2; s.position.set(sx, sy, .22);
        const slot = add(new THREE.BoxGeometry(.04, .008, .005), M.dark, g); slot.position.set(sx, sy, .235);
      });
      pcieFingers(g, 1.9, -.62, -.05);
      bracketIO(g, -1.39, 1.15, .45);
      return g;
    }

    const gb = buildGB(); gb.position.set(-1.75, 0, 0); gb.rotation.set(.08, .3, .5); scene.add(gb);
    const fe = buildFE(); fe.position.set(1.75, 0, .1); fe.rotation.set(.05, -.3, -.35); scene.add(fe);
    const cards = { gb: { g: gb, presence: 1, target: 1 }, fe: { g: fe, presence: 1, target: 1 } };

    /* ---------- platform / shadow / grid ---------- */
    const platform = add(new THREE.BoxGeometry(7.6, .12, 2.6), M.pedestal, scene); platform.position.y = -1.5; platform.castShadow = false;
    const rim = add(new THREE.BoxGeometry(7.6, .02, 2.6), M.gbStrip, scene); rim.position.y = -1.43; rim.castShadow = false;
    addGlow(scene, 0, -1.4, 0, 5, .1);
    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 3.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadowPlane.rotation.x = -Math.PI / 2; shadowPlane.position.y = -1.42; scene.add(shadowPlane);
    let grid = null;
    function makeGrid() {
      if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
      const light = document.documentElement.getAttribute('data-theme') === 'light';
      grid = new THREE.GridHelper(12, 30, light ? 0x2f5bea : 0x5b8cff, light ? 0xb9b4a6 : 0x2a3350);
      grid.position.y = -1.58; grid.material.transparent = true; grid.material.opacity = light ? .5 : .35; grid.visible = S.grid; scene.add(grid);
    }

    /* ---------- lights ---------- */
    const key = new THREE.DirectionalLight(0xffe7c4, 3); key.position.set(3, 4, 2.5); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = key.shadow.camera.bottom = -5; key.shadow.camera.right = key.shadow.camera.top = 5; key.shadow.camera.near = .5; key.shadow.camera.far = 15; key.shadow.bias = -.0004; key.shadow.radius = 4; scene.add(key);
    const rimL = new THREE.DirectionalLight(accent, 2.2); rimL.position.set(-2.5, 2, -3); scene.add(rimL);
    const fill = new THREE.DirectionalLight(0x8fb7ff, .7); fill.position.set(-3, .5, 2); scene.add(fill);
    const under = new THREE.PointLight(accent, 8, 8, 2); under.position.set(0, -1.1, 0); scene.add(under);
    scene.add(new THREE.AmbientLight(0xffffff, .18));

    /* ---------- environment ---------- */
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.BoxGeometry(16, 16, 16), new THREE.MeshBasicMaterial({ color: 0x10131b, side: THREE.BackSide })));
    function envPanel(w, h, c, b, x, y, z, rx, ry) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(b), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); envScene.add(m); }
    envPanel(8, 4, 0xffffff, 3.2, 0, 6, 0, -Math.PI / 2, 0);
    envPanel(5, 5, 0xffd7a8, 2.4, -6, 1, 0, 0, Math.PI / 2);
    envPanel(5, 5, 0x5b8cff, 2.8, 6, .4, -1, 0, -Math.PI / 2);
    envPanel(6, 2, 0xffb224, 1.6, 0, -2.5, -6, 0, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, .04).texture; pmrem.dispose();
    envScene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });

    /* ---------- particles ---------- */
    const P = 170, pGeo = new THREE.BufferGeometry(), pPos = new Float32Array(P * 3), pCol = new Float32Array(P * 3);
    for (let i = 0; i < P; i++) { pPos[i * 3] = Math.random() * 7 - 3.5; pPos[i * 3 + 1] = Math.random() * 2.4 - 1.2; pPos[i * 3 + 2] = Math.random() * 3.4 - 1.7; }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ size: .03, vertexColors: true, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })));
    const cyan = new THREE.Color('#22c8e8'), amber = new THREE.Color('#ffb224'), tmpC = new THREE.Color();
    function recolor() { for (let i = 0; i < P; i++) { tmpC.copy(i % 5 === 0 ? amber : i % 3 === 0 ? cyan : accent); pCol[i * 3] = tmpC.r; pCol[i * 3 + 1] = tmpC.g; pCol[i * 3 + 2] = tmpC.b; } pGeo.attributes.color.needsUpdate = true; }
    recolor();

    /* ---------- UI ---------- */
    const ui = { card: el('ctlCard'), quality: el('ctlQuality'), speed: el('ctlSpeed'), zoom: el('ctlZoom'), fan: el('ctlFan'), bloom: el('ctlBloom'), light: el('ctlLight'), finish: el('ctlFinish'), accent: el('ctlAccent'), grid: el('ctlGrid'), glow: el('ctlGlow'), wire: el('modeWire'), render: el('modeRender'), random: el('ctlRandom'), reset: el('ctlReset'), export: el('ctlExport'), photoBtn: el('ctlPhotoBtn'), photo: el('ctlPhoto') };
    let W = 1, H = 1;
    function resize() { W = Math.max(1, stage.clientWidth); H = Math.max(1, stage.clientHeight); camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H, false); }
    function applyQuality() {
      const dpr = devicePixelRatio || 1, q = S.quality;
      renderer.setPixelRatio(q === 'low' ? 1 : q === 'medium' ? Math.min(dpr, 1.5) : q === 'high' ? Math.min(dpr, 1.75) : Math.min(dpr, 2));
      renderer.shadowMap.enabled = q !== 'low'; key.castShadow = q !== 'low';
      const ms = q === 'ultra' || q === 'high' ? 2048 : 1024;
      if (key.shadow.mapSize.x !== ms) { key.shadow.mapSize.set(ms, ms); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } }
      renderer.shadowMap.needsUpdate = true; resize();
    }
    function applyAccent() { accent.set(S.accent); M.gbStrip.color.copy(accent); M.gbStrip.emissive.copy(accent); rimL.color.copy(accent); under.color.copy(accent); glowSprites.forEach(s => s.material.color.copy(accent)); recolor(); }
    function applyFinish() { M.gbShroud.roughness = .15 + S.finish * .6; M.gbShroud.clearcoat = 1 - S.finish * .7; M.feBody.roughness = .15 + S.finish * .5; M.feBody.clearcoat = 1 - S.finish * .6; }
    function applyLight() { key.intensity = 3 * S.light; rimL.intensity = 2.2 * S.light; fill.intensity = .7 * S.light; under.intensity = 8 * S.light; }
    function applyGlow() { glowSprites.forEach(s => { s.visible = S.glow; s.material.opacity = s.userData.base * S.bloom; }); M.gbStrip.emissiveIntensity = (S.glow ? 1.8 : .4) * (.5 + S.bloom); }
    function applyWire() { allMats.forEach(m => m.wireframe = S.wire); shadowPlane.visible = !S.wire; ui.wire.classList.toggle('is-on', S.wire); ui.wire.setAttribute('aria-pressed', S.wire); ui.render.classList.toggle('is-on', !S.wire); ui.render.setAttribute('aria-pressed', !S.wire); }
    function setFocus(f) {
      S.card = f; ui.card.value = f;
      cards.gb.target = f === 'fe' ? 0 : 1; cards.fe.target = f === 'gb' ? 0 : 1;
      if (f === 'gb') { targetT.set(-1.75, 0, 0); orbit.distT = 4.6; }
      else if (f === 'fe') { targetT.set(1.75, 0, .1); orbit.distT = 4.4; }
      else { targetT.set(0, 0, 0); orbit.distT = 7.4; }
      S.dist = orbit.distT; ui.zoom.value = S.dist;
    }
    function applyAll() { applyQuality(); applyAccent(); applyFinish(); applyLight(); applyGlow(); applyWire(); }
    function syncUI() { ui.card.value = S.card; ui.quality.value = S.quality; ui.speed.value = S.speed; ui.zoom.value = S.dist; ui.fan.value = S.fan; ui.bloom.value = S.bloom; ui.light.value = S.light; ui.finish.value = S.finish; ui.accent.value = S.accent; ui.grid.checked = S.grid; ui.glow.checked = S.glow; applyWire(); }
    function toastScene(m) { const t = el('toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2000); }

    ui.card.addEventListener('change', () => setFocus(ui.card.value));
    ui.quality.addEventListener('change', () => { S.quality = ui.quality.value; applyQuality(); });
    ui.speed.addEventListener('input', () => S.speed = +ui.speed.value);
    ui.zoom.addEventListener('input', () => { S.dist = +ui.zoom.value; orbit.distT = S.dist; });
    ui.fan.addEventListener('input', () => S.fan = +ui.fan.value);
    ui.bloom.addEventListener('input', () => { S.bloom = +ui.bloom.value; applyGlow(); });
    ui.light.addEventListener('input', () => { S.light = +ui.light.value; applyLight(); });
    ui.finish.addEventListener('input', () => { S.finish = +ui.finish.value; applyFinish(); });
    ui.accent.addEventListener('input', () => { S.accent = ui.accent.value; applyAccent(); });
    ui.grid.addEventListener('change', () => { S.grid = ui.grid.checked; if (grid) grid.visible = S.grid; });
    ui.glow.addEventListener('change', () => { S.glow = ui.glow.checked; applyGlow(); });
    ui.wire.addEventListener('click', () => { S.wire = true; applyWire(); });
    ui.render.addEventListener('click', () => { S.wire = false; applyWire(); });
    canvas.addEventListener('dblclick', () => { S.wire = !S.wire; applyWire(); });
    ui.reset.addEventListener('click', () => { Object.assign(S, DEF); setFocus('both'); orbit.thetaT = .5; orbit.phiT = 1.15; makeGrid(); applyAll(); syncUI(); toastScene('SCENE RESET ⟲'); });
    ui.random.addEventListener('click', () => {
      S.accent = '#' + new THREE.Color().setHSL(Math.random(), .85, .6).getHexString();
      S.finish = +(.1 + Math.random() * .7).toFixed(2); S.bloom = +(.3 + Math.random() * .8).toFixed(2);
      S.speed = +(.2 + Math.random() * 1.2).toFixed(2); S.fan = 30 + Math.floor(Math.random() * 70);
      orbit.thetaT = Math.random() * Math.PI * 2; orbit.phiT = .6 + Math.random() * .7;
      applyAll(); syncUI(); toastScene('SCENE RANDOMIZED ⚄');
    });
    ui.export.addEventListener('click', () => { renderer.render(scene, camera); const a = document.createElement('a'); a.download = 'paul-dual-gpu.png'; a.href = canvas.toDataURL('image/png'); a.click(); toastScene('FRAME EXPORTED ↓'); });

    /* photo intake */
    function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
    function coverCanvas(img, w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const s = Math.max(w / img.width, h / img.height); x.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s); return c; }
    let photoPanel = null, photoTex = null;
    function paletteFrom(img) {
      const d = coverCanvas(img, 64, 64).getContext('2d').getImageData(0, 0, 64, 64).data;
      let dr = 0, dg = 0, db = 0, dn = 0, best = null, bs = 0;
      for (let i = 0; i < d.length; i += 4) { const R = d[i], G = d[i + 1], B = d[i + 2]; const l = (R * .299 + G * .587 + B * .114) / 255; if (l < .4) { dr += R; dg += G; db += B; dn++; } const mx = Math.max(R, G, B), mn = Math.min(R, G, B); const sc = mx ? (mx - mn) / mx * (mx / 255) : 0; if (sc > bs && (mx - mn) / mx > .35) { bs = sc; best = [R, G, B]; } }
      return { dark: dn ? [dr / dn, dg / dn, db / dn] : [40, 40, 40], accent: best };
    }
    function applyPhoto(img, label) {
      const p = paletteFrom(img);
      const body = new THREE.Color(p.dark[0] / 255, p.dark[1] / 255, p.dark[2] / 255).offsetHSL(0, 0, .05);
      M.gbShroud.color.copy(body); M.gbFan.color.copy(body.clone().offsetHSL(0, 0, -.03));
      if (p.accent) { S.accent = '#' + new THREE.Color(p.accent[0] / 255, p.accent[1] / 255, p.accent[2] / 255).getHexString(); ui.accent.value = S.accent; applyAccent(); }
      if (photoPanel) { scene.remove(photoPanel); photoPanel.traverse(o => { if (o.isSprite) { const i = glowSprites.indexOf(o); if (i > -1) glowSprites.splice(i, 1); o.material.dispose(); } if (o.isMesh) { o.geometry.dispose(); if (o.material !== M.dark) o.material.dispose(); } }); }
      if (photoTex) photoTex.dispose();
      photoTex = new THREE.CanvasTexture(coverCanvas(img, 768, 512)); photoTex.colorSpace = THREE.SRGBColorSpace;
      photoPanel = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false })); frame.position.z = -.01;
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.7), new THREE.MeshBasicMaterial({ map: photoTex, toneMapped: false })); pic.position.z = .01;
      photoPanel.add(frame, pic); photoPanel.position.set(0, 1.6, -2.2); scene.add(photoPanel);
      addGlow(photoPanel, 0, 0, -.05, 3, .1);
      toastScene('PHOTO THEME APPLIED ✓ — ' + (label || 'REFERENCE'));
    }
    if (ui.photoBtn && ui.photo) {
      ui.photoBtn.addEventListener('click', () => ui.photo.click());
      ui.photo.addEventListener('change', () => { const f = ui.photo.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => loadImg(r.result).then(i => applyPhoto(i, f.name)).catch(() => toastScene('PHOTO COULD NOT BE READ')); r.readAsDataURL(f); ui.photo.value = ''; });
    }
    loadImg('./gpu-front.jpg').then(i => applyPhoto(i, 'gpu-front.jpg')).catch(() => {});

    /* pointer / wheel / keys */
    let dragging = false, px = 0, py = 0;
    canvas.addEventListener('pointerdown', e => { dragging = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => { if (!dragging) return; orbit.thetaT += (e.clientX - px) * .006; orbit.phiT = clamp(orbit.phiT - (e.clientY - py) * .005, .35, 1.45); px = e.clientX; py = e.clientY; });
    ['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, () => dragging = false));
    canvas.addEventListener('wheel', e => { e.preventDefault(); orbit.distT = clamp(orbit.distT * (e.deltaY > 0 ? 1.08 : .92), 2.6, 9); S.dist = +orbit.distT.toFixed(2); ui.zoom.value = S.dist; }, { passive: false });
    canvas.addEventListener('keydown', e => {
      let u = true;
      if (e.key === 'ArrowLeft') orbit.thetaT -= .15; else if (e.key === 'ArrowRight') orbit.thetaT += .15;
      else if (e.key === 'ArrowUp') orbit.phiT = clamp(orbit.phiT - .1, .35, 1.45); else if (e.key === 'ArrowDown') orbit.phiT = clamp(orbit.phiT + .1, .35, 1.45);
      else if (e.key === ' ' || e.key === 'Enter') { S.wire = !S.wire; applyWire(); } else u = false;
      if (u) e.preventDefault();
    });

    function applyTheme() {
      const bg = bgColor(); scene.background.set(bg); scene.fog.color.set(bg);
      const light = document.documentElement.getAttribute('data-theme') === 'light';
      M.pedestal.color.set(light ? 0xc9c4b6 : 0x0c0e12); key.color.set(light ? 0xffffff : 0xffe7c4);
      makeGrid(); renderer.shadowMap.needsUpdate = true;
    }
    document.addEventListener('themechange', applyTheme);
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); fail('GPU CONTEXT LOST — RELOAD TO RESTORE'); });

    /* optional GLB hot-swap */
    async function tryLoadGLB() {
      if (!GLTFLoader) return;
      const loader = new GLTFLoader();
      if (DRACOLoader) { const d = new DRACOLoader(); d.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/'); loader.setDRACOLoader(d); }
      for (const path of ['./gpu.glb', './models/gpu.glb']) {
        try {
          const res = await fetch(path, { cache: 'no-cache' }); if (!res.ok) continue;
          const gltf = await new Promise((r, j) => loader.parse(await res.arrayBuffer(), '', r, j));
          const wrap = new THREE.Group(); wrap.add(gltf.scene);
          const box = new THREE.Box3().setFromObject(wrap); const c = box.getCenter(new THREE.Vector3()); gltf.scene.position.sub(c);
          const size = new THREE.Box3().setFromObject(wrap).getSize(new THREE.Vector3());
          wrap.scale.setScalar(3.4 / (Math.max(size.x, size.y, size.z) || 1)); wrap.position.y = .1; scene.add(wrap);
          gb.visible = fe.visible = false; targetT.set(0, 0, 0); orbit.distT = 5; S.dist = 5; ui.zoom.value = 5;
          gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
          renderer.shadowMap.needsUpdate = true; toastScene('HIGH-DETAIL GLB LOADED ✓'); return;
        } catch (e) {}
      }
    }

    /* lifecycle */
    let running = true, frames = 0, fpsT = performance.now(), last = fpsT;
    new IntersectionObserver(es => es.forEach(en => running = en.isIntersecting), { threshold: 0 }).observe(stage);
    new ResizeObserver(resize).observe(stage);
    document.addEventListener('visibilitychange', () => { last = performance.now(); fpsT = last; frames = 0; });
    if ((navigator.hardwareConcurrency || 4) < 4) S.quality = 'high';
    makeGrid(); applyAll(); syncUI(); applyTheme(); resize(); updateCamera(); setFocus('both');
    renderer.shadowMap.needsUpdate = true;
    if (live) live.innerHTML = '<i class="dot dot-green pulse"></i> GPU · LIVE';
    tryLoadGLB();

    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, .05); last = now;
      if (!running || document.hidden) return;
      if (!dragging && !reduced) orbit.thetaT += dt * S.speed * .35;
      updateCamera();
      for (const k in cards) { const c = cards[k]; c.presence += (c.target - c.presence) * .08; c.g.visible = c.presence > .02; c.g.scale.setScalar(Math.max(.001, c.presence)); }
      const fanN = S.fan / 100;
      if (!reduced) {
        fans.forEach(f => f.g.rotation.z += f.dir * fanN * 16 * dt);
        const pos = pGeo.attributes.position.array, air = .25 + fanN * 2.2;
        for (let i = 0; i < P; i++) {
          pos[i * 3 + 2] -= air * dt * (.7 + (i % 7) / 10);
          pos[i * 3] += Math.sin(now * .0012 + i) * .0015; pos[i * 3 + 1] += Math.cos(now * .001 + i * 1.7) * .0012;
          if (pos[i * 3 + 2] < -1.75) { pos[i * 3 + 2] = 1.75; pos[i * 3] = Math.random() * 7 - 3.5; pos[i * 3 + 1] = Math.random() * 2.4 - 1.2; }
        }
        pGeo.attributes.position.needsUpdate = true;
        M.gbStrip.emissiveIntensity = (S.glow ? 1.8 : .4) * (.5 + S.bloom) * (1 + .18 * Math.sin(now * .002));
      }
      renderer.render(scene, camera);
      window.__sceneReady = true; frames++;
      const t = performance.now();
      if (t - fpsT > 500) { const fps = Math.round(frames * 1000 / (t - fpsT)); setBadge(`${S.card.toUpperCase()} · ${S.quality.toUpperCase()} · ${fps} FPS · ${Math.round(fanN * 3200)} RPM`, fps < 45); frames = 0; fpsT = t; }
    }
    requestAnimationFrame(frame);
  }
})();