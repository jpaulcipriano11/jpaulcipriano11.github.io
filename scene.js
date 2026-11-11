/* ============================================================
   PAUL — GPU SCENE ENGINE
   Literal RTX-5090-class graphics card · Three.js core only
   Multi-CDN race · no import map · fans + airflow driven live
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
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

  function setBadge(text, warn) {
    if (!badge) return;
    badge.textContent = text;
    badge.classList.toggle('warn', !!warn);
  }
  function fail(reason) {
    window.__sceneFailed = true;
    if (fallback) {
      fallback.hidden = false;
      const p = fallback.querySelector('p');
      if (p) p.textContent = reason;
    }
    canvas.style.display = 'none';
    setBadge('STATIC PREVIEW', true);
    if (live) live.textContent = 'FALLBACK MODE';
    console.warn('[scene]', reason);
  }
  function webglOK() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  setBadge('LOADING GPU…');
  if (!webglOK()) { fail('WEBGL IS NOT AVAILABLE IN THIS BROWSER'); return; }

  const CDNS = [
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
    'https://unpkg.com/three@0.160.0/build/three.module.js',
    'https://esm.sh/three@0.160.0'
  ];
  const attempt = url => Promise.race([
    import(url),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 7000))
  ]);
  const loadThree = () => Promise.any
    ? Promise.any(CDNS.map(attempt))
    : CDNS.reduce((p, u) => p.catch(() => attempt(u)), Promise.reject(new Error('start')));

  let THREE;
  loadThree()
    .then(mod => {
      if (!mod || !mod.WebGLRenderer) throw new Error('bad module');
      THREE = mod;
      boot();
    })
    .catch(() => fail('3D ENGINE COULD NOT LOAD — CHECK NETWORK / CDN ACCESS'));

  function boot() {
    /* ---------- renderer ---------- */
    const renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: true
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    const cssVar = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    const bgColor = () => cssVar('--bg-2') || '#0D1120';
    scene.background = new THREE.Color(bgColor());
    scene.fog = new THREE.FogExp2(bgColor(), 0.045);

    /* ---------- damped orbit ---------- */
    const target = new THREE.Vector3(0, -0.1, 0);
    const orbit = { theta: 0.7, phi: 1.12, dist: 5.2, thetaT: 0.7, phiT: 1.12, distT: 5.2 };
    function updateCamera() {
      orbit.theta += (orbit.thetaT - orbit.theta) * 0.085;
      orbit.phi += (orbit.phiT - orbit.phi) * 0.085;
      orbit.dist += (orbit.distT - orbit.dist) * 0.085;
      const sp = Math.sin(orbit.phi);
      camera.position.set(
        target.x + orbit.dist * sp * Math.sin(orbit.theta),
        target.y + orbit.dist * Math.cos(orbit.phi),
        target.z + orbit.dist * sp * Math.cos(orbit.theta)
      );
      camera.lookAt(target);
    }

    /* ---------- baked studio environment ---------- */
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(
      new THREE.BoxGeometry(14, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0x10131b, side: THREE.BackSide })
    ));
    function envPanel(w, h, color, boost, x, y, z, rx, ry) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(boost), side: THREE.DoubleSide })
      );
      m.position.set(x, y, z); m.rotation.set(rx, ry, 0);
      envScene.add(m);
    }
    envPanel(7, 4, 0xffffff, 3.2, 0, 5.4, 0, -Math.PI / 2, 0);
    envPanel(5, 5, 0xffd7a8, 2.4, -5.6, 1.2, 0, 0, Math.PI / 2);
    envPanel(5, 5, 0x5b8cff, 2.8, 5.6, 0.4, -1, 0, -Math.PI / 2);
    envPanel(6, 2, 0xffb224, 1.6, 0, -2.4, -5.6, 0, 0);
    envPanel(6, 3, 0x22c8e8, 1.4, 0, 1.4, 5.6, 0, Math.PI);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
    envScene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });

    /* ---------- procedural textures ---------- */
    function canvasTexture(size, draw, srgb) {
      const c = document.createElement('canvas'); c.width = c.height = size;
      draw(c.getContext('2d'), size);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }
    const brushed = canvasTexture(256, (x, s) => {
      x.fillStyle = '#808080'; x.fillRect(0, 0, s, s);
      for (let i = 0; i < 900; i++) {
        const y = Math.random() * s;
        x.strokeStyle = `rgba(${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},${0.05 + Math.random() * 0.12})`;
        x.beginPath(); x.moveTo(0, y); x.lineTo(s, y + (Math.random() - .5) * 3); x.stroke();
      }
    });
    brushed.repeat.set(4, 1);
    const finTex = canvasTexture(128, (x, s) => {
      x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, s, s);
      for (let i = 0; i < s; i += 4) { x.fillStyle = i % 8 ? '#7a7a7a' : '#b5b5b5'; x.fillRect(i, 0, 2, s); }
    });
    finTex.repeat.set(1, 6);
    const contactShadow = canvasTexture(256, (x, s) => {
      const g = x.createRadialGradient(s / 2, s / 2, 8, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(0,0,0,0.62)'); g.addColorStop(0.55, 'rgba(0,0,0,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, s, s);
    }, true);
    const glowTex = canvasTexture(128, (x, s) => {
      const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, s, s);
    }, true);
    function labelTexture(text, sub) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 160;
      const x = c.getContext('2d');
      x.clearRect(0, 0, 512, 160);
      x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '700 74px "Space Grotesk", sans-serif';
      x.fillText(text, 256, 66);
      if (sub) { x.font = '500 26px "JetBrains Mono", monospace'; x.fillText(sub, 256, 124); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }
    const badgeTex = labelTexture('RTX 5090', 'PAUL // LAB');
    const powerTex = labelTexture('12V-2x6', '');
    const backTex = canvasTexture(512, (x, s) => {
      x.fillStyle = '#171a21'; x.fillRect(0, 0, s, s);
      x.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < s; i += 5) { x.beginPath(); x.moveTo(0, i); x.lineTo(s, i); x.stroke(); }
      x.fillStyle = '#0b0d12';
      for (let i = 0; i < 9; i++) {
        x.save(); x.translate(330 + i * 16, 150); x.rotate(-0.5);
        x.fillRect(-4, -70, 8, 140); x.restore();
      }
      x.fillStyle = '#e8ecf5'; x.textAlign = 'left'; x.textBaseline = 'middle';
      x.font = '700 44px "Space Grotesk", sans-serif'; x.fillText('PAUL // LAB', 40, 210);
      x.font = '500 22px "JetBrains Mono", monospace'; x.fillStyle = '#8b95ac';
      x.fillText('RTX 5090 CLASS · 32GB GDDR7', 40, 256);
      x.fillStyle = '#0b0d12';
      [[40, 40], [472, 40], [40, 472], [472, 472]].forEach(p => { x.beginPath(); x.arc(p[0], p[1], 9, 0, 6.29); x.fill(); });
    }, true);

    /* ---------- materials ---------- */
    const accent = new THREE.Color('#5b8cff');
    const matShroud = new THREE.MeshPhysicalMaterial({ color: 0x1b1f27, metalness: 0.85, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.25, envMapIntensity: 1.2, roughnessMap: brushed });
    const matFins = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.95, roughness: 0.32, envMapIntensity: 1.1, roughnessMap: finTex });
    const matFan = new THREE.MeshStandardMaterial({ color: 0x14161c, metalness: 0.15, roughness: 0.55 });
    const matBack = new THREE.MeshStandardMaterial({ color: 0x1a1d24, metalness: 0.9, roughness: 0.38, envMapIntensity: 1.1, roughnessMap: brushed });
    const matBackDecal = new THREE.MeshStandardMaterial({ map: backTex, metalness: 0.6, roughness: 0.5 });
    const matPCB = new THREE.MeshStandardMaterial({ color: 0x0a2a1e, metalness: 0.1, roughness: 0.6 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 1, roughness: 0.25, envMapIntensity: 1.3 });
    const matCopper = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 1, roughness: 0.3, envMapIntensity: 1.2 });
    const matBracket = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 0.9, roughness: 0.35 });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x0b0c0f, metalness: 0.3, roughness: 0.7 });
    const matLED = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 2.4, roughness: 0.4 });
    const matBadge = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: accent.clone(), emissiveMap: badgeTex, emissiveIntensity: 2.2, map: badgeTex, transparent: true, depthWrite: false, roughness: 0.4 });
    const matPower = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x8b95ac, emissiveMap: powerTex, emissiveIntensity: 0.8, map: powerTex, transparent: true, depthWrite: false });
    const matPedestal = new THREE.MeshPhysicalMaterial({ color: 0x0c0e12, metalness: 0.85, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.4 });
    const allMats = [matShroud, matFins, matFan, matBack, matBackDecal, matPCB, matGold, matCopper, matBracket, matDark, matLED, matBadge, matPower, matPedestal];

    /* ---------- glow sprites ---------- */
    const glowSprites = [];
    function addGlow(parent, x, y, z, scale, opacity) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: accent.clone(), transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      sp.position.set(x, y, z); sp.scale.setScalar(scale);
      sp.userData.base = opacity;
      parent.add(sp); glowSprites.push(sp);
      return sp;
    }

    /* ---------- helpers ---------- */
    const gpu = new THREE.Group();
    const add = (geo, mat, parent = gpu) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true; m.receiveShadow = true;
      parent.add(m); return m;
    };
    function roundedRect(w, h, r) {
      const s = new THREE.Shape();
      const x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }

    /* ---------- shroud with three fan cutouts ---------- */
    const fanXs = [-1.12, 0, 1.12];
    const shroudShape = roundedRect(3.4, 1.35, 0.14);
    fanXs.forEach(fx => {
      const hole = new THREE.Path();
      hole.absarc(fx, 0, 0.535, 0, Math.PI * 2, true);
      shroudShape.holes.push(hole);
    });
    const shroudGeo = new THREE.ExtrudeGeometry(shroudShape, {
      depth: 0.14, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 48
    });
    shroudGeo.translate(0, 0, -0.07);
    const shroud = add(shroudGeo, matShroud); shroud.position.z = 0.30;

    /* ---------- heatsink fin stack (instanced) ---------- */
    const finGeo = new THREE.BoxGeometry(0.016, 1.12, 0.44);
    const fins = new THREE.InstancedMesh(finGeo, matFins, 48);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 48; i++) { m4.makeTranslation(-1.62 + i * (3.24 / 47), 0, 0.02); fins.setMatrixAt(i, m4); }
    fins.instanceMatrix.needsUpdate = true; fins.castShadow = true; fins.receiveShadow = true;
    gpu.add(fins);

    /* ---------- copper heatpipes ---------- */
    [-0.12, 0, 0.12].forEach(off => {
      const curve = new THREE.CatmullRomCurve3([
        v3(-1.55, 0.40 + off, 0.05), v3(-0.5, 0.54 + off, 0.12),
        v3(0.5, 0.54 + off, 0.12), v3(1.55, 0.40 + off, 0.05)
      ]);
      add(new THREE.TubeGeometry(curve, 40, 0.032, 10), matCopper);
    });

    /* ---------- fans ---------- */
    const fanGroups = [];
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0.13, -0.03);
    bladeShape.quadraticCurveTo(0.30, -0.10, 0.47, -0.02);
    bladeShape.lineTo(0.47, 0.05);
    bladeShape.quadraticCurveTo(0.30, 0.02, 0.13, 0.04);
    bladeShape.closePath();
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 12 });
    bladeGeo.translate(0, 0, -0.009);
    const hubGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.07, 32);
    const ringGeo = new THREE.TorusGeometry(0.50, 0.014, 12, 96);
    const capGeo = new THREE.SphereGeometry(0.035, 16, 12);
    fanXs.forEach(fx => {
      const fan = new THREE.Group();
      fan.position.set(fx, 0, 0.27);
      gpu.add(fan); fanGroups.push(fan);
      const hub = add(hubGeo, matFan, fan); hub.rotation.x = Math.PI / 2;
      for (let i = 0; i < 9; i++) {
        const blade = add(bladeGeo, matFan, fan);
        blade.rotation.set(0.32, 0, i * Math.PI * 2 / 9);
      }
      const ring = add(ringGeo, matLED, fan); ring.position.z = 0.06; ring.castShadow = false;
      const cap = add(capGeo, matLED, fan); cap.position.z = 0.05; cap.castShadow = false;
      addGlow(fan, 0, 0, 0.09, 1.15, 0.22);
    });

    /* ---------- backplate + PCB ---------- */
    const back = add(new THREE.BoxGeometry(3.4, 1.35, 0.05), matBack); back.position.z = -0.32;
    const backDecal = add(new THREE.PlaneGeometry(3.2, 1.15), matBackDecal);
    backDecal.position.z = -0.351; backDecal.rotation.y = Math.PI; backDecal.castShadow = false;
    const pcb = add(new THREE.BoxGeometry(3.3, 1.25, 0.04), matPCB); pcb.position.z = -0.12;

    /* ---------- PCIe gold fingers ---------- */
    const tongue = add(new THREE.BoxGeometry(2.35, 0.12, 0.07), matDark); tongue.position.set(0.1, -0.74, -0.05);
    const padXs = [];
    for (let i = 0; i < 44; i++) { if (i >= 18 && i <= 20) continue; padXs.push(-1.05 + i * 0.052); }
    const pads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.038, 0.05, 0.014), matGold, padXs.length);
    padXs.forEach((x, i) => { m4.makeTranslation(x, -0.745, -0.008); pads.setMatrixAt(i, m4); });
    pads.instanceMatrix.needsUpdate = true; pads.castShadow = true;
    gpu.add(pads);

    /* ---------- I/O bracket + display outputs ---------- */
    const bracket = add(new THREE.BoxGeometry(0.05, 1.35, 0.62), matBracket); bracket.position.x = -1.74;
    [0.42, 0.14, -0.14].forEach(y => {
      const dp = add(new THREE.BoxGeometry(0.02, 0.17, 0.14), matDark); dp.position.set(-1.775, y, 0);
    });
    const hdmi = add(new THREE.BoxGeometry(0.02, 0.13, 0.18), matDark); hdmi.position.set(-1.775, -0.42, 0);
    [-0.6, 0.6].forEach(y => {
      const screw = add(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), matDark);
      screw.rotation.z = Math.PI / 2; screw.position.set(-1.775, y, 0);
    });

    /* ---------- 12V-2x6 power connector ---------- */
    const power = add(new THREE.BoxGeometry(0.55, 0.13, 0.22), matDark); power.position.set(0.95, 0.72, 0.05);
    const powerLabel = add(new THREE.PlaneGeometry(0.5, 0.1), matPower);
    powerLabel.position.set(0.95, 0.79, 0.05); powerLabel.rotation.x = -Math.PI / 2; powerLabel.castShadow = false;

    /* ---------- RGB strips + top badge ---------- */
    const topStrip = add(new THREE.BoxGeometry(3.0, 0.035, 0.03), matLED); topStrip.position.set(0, 0.665, 0.30); topStrip.castShadow = false;
    const bottomStrip = add(new THREE.BoxGeometry(3.0, 0.03, 0.03), matLED); bottomStrip.position.set(0, -0.665, 0.28); bottomStrip.castShadow = false;
    const topBadge = add(new THREE.PlaneGeometry(1.0, 0.18), matBadge);
    topBadge.position.set(0.55, 0.705, 0.10); topBadge.rotation.x = -Math.PI / 2 + 0.4; topBadge.castShadow = false;
    addGlow(gpu, 0, 0.70, 0.30, 2.8, 0.12);
    addGlow(gpu, -0.9, -0.82, 0.10, 1.7, 0.18);
    addGlow(gpu, 0.9, -0.82, 0.10, 1.7, 0.18);
    addGlow(gpu, 0.55, 0.74, 0.12, 1.2, 0.16);

    gpu.rotation.set(-0.06, 0, 0.02);
    gpu.position.y = 0.1;
    scene.add(gpu);

    /* ---------- pedestal + contact shadow + grid ---------- */
    const pedestal = add(new THREE.CylinderGeometry(1.5, 1.62, 0.12, 96), matPedestal, scene);
    pedestal.position.y = -1.70; pedestal.castShadow = false;
    const pedRim = add(new THREE.TorusGeometry(1.52, 0.012, 8, 128), matLED, scene);
    pedRim.rotation.x = Math.PI / 2; pedRim.position.y = -1.635; pedRim.castShadow = false;
    addGlow(scene, 0, -1.60, 0, 3.4, 0.12);
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 4.4),
      new THREE.MeshBasicMaterial({ map: contactShadow, transparent: true, depthWrite: false })
    );
    shadowPlane.rotation.x = -Math.PI / 2; shadowPlane.position.y = -1.635;
    scene.add(shadowPlane);

    let grid = null;
    function makeGrid() {
      if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
      const light = document.documentElement.getAttribute('data-theme') === 'light';
      grid = new THREE.GridHelper(9, 24, light ? 0x2f5bea : 0x5b8cff, light ? 0xb9b4a6 : 0x2a3350);
      grid.position.y = -1.78;
      grid.material.transparent = true;
      grid.material.opacity = light ? 0.5 : 0.35;
      grid.visible = S.grid;
      scene.add(grid);
    }

    /* ---------- lights ---------- */
    const key = new THREE.DirectionalLight(0xffe7c4, 3.0);
    key.position.set(3, 4, 2.5); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = key.shadow.camera.bottom = -3;
    key.shadow.camera.right = key.shadow.camera.top = 3;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
    key.shadow.bias = -0.0004; key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(accent, 2.2); rim.position.set(-2.5, 2, -3); scene.add(rim);
    const fill = new THREE.DirectionalLight(0x8fb7ff, 0.7); fill.position.set(-3, 0.5, 2); scene.add(fill);
    const under = new THREE.PointLight(accent, 8, 6, 2); under.position.set(0, -1.2, 0); scene.add(under);
    scene.add(new THREE.AmbientLight(0xffffff, 0.18));

    /* ---------- airflow particles (pulled through the fans) ---------- */
    const P_COUNT = 170;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(P_COUNT * 3);
    const pCol = new Float32Array(P_COUNT * 3);
    for (let i = 0; i < P_COUNT; i++) {
      pPos[i * 3] = Math.random() * 3.4 - 1.7;
      pPos[i * 3 + 1] = Math.random() * 1.3 - 0.65;
      pPos[i * 3 + 2] = Math.random() * 3.4 - 1.7;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.03, vertexColors: true, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    scene.add(new THREE.Points(pGeo, pMat));
    const cyan = new THREE.Color('#22c8e8'), amber = new THREE.Color('#ffb224'), tmpC = new THREE.Color();
    function recolorParticles() {
      for (let i = 0; i < P_COUNT; i++) {
        tmpC.copy(i % 5 === 0 ? amber : (i % 3 === 0 ? cyan : accent));
        pCol[i * 3] = tmpC.r; pCol[i * 3 + 1] = tmpC.g; pCol[i * 3 + 2] = tmpC.b;
      }
      pGeo.attributes.color.needsUpdate = true;
    }
    recolorParticles();

    /* ---------- state + UI ---------- */
    const DEF = {
      quality: 'ultra', speed: 0.6, dist: 5.2, fan: 65, bloom: 0.55, light: 1,
      finish: 0.35, accent: '#5b8cff', grid: true, glow: true, wire: false
    };
    const S = { ...DEF };
    const ui = {
      quality: el('ctlQuality'), speed: el('ctlSpeed'), zoom: el('ctlZoom'), fan: el('ctlFan'),
      bloom: el('ctlBloom'), light: el('ctlLight'), finish: el('ctlFinish'), accent: el('ctlAccent'),
      grid: el('ctlGrid'), glow: el('ctlGlow'), wire: el('modeWire'), render: el('modeRender'),
      random: el('ctlRandom'), reset: el('ctlReset'), export: el('ctlExport')
    };

    let W = 1, H = 1;
    function resize() {
      W = Math.max(1, stage.clientWidth); H = Math.max(1, stage.clientHeight);
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
    }
    function applyQuality() {
      const dpr = window.devicePixelRatio || 1;
      const q = S.quality;
      const pr = q === 'low' ? 1 : q === 'medium' ? Math.min(dpr, 1.5) : q === 'high' ? Math.min(dpr, 1.75) : Math.min(dpr, 2);
      renderer.setPixelRatio(pr);
      const shadows = q !== 'low';
      renderer.shadowMap.enabled = shadows; key.castShadow = shadows;
      const ms = q === 'ultra' || q === 'high' ? 2048 : 1024;
      if (key.shadow.mapSize.x !== ms) {
        key.shadow.mapSize.set(ms, ms);
        if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
      }
      renderer.shadowMap.needsUpdate = true;
      resize();
    }
    function applyAccent() {
      accent.set(S.accent);
      matLED.color.copy(accent); matLED.emissive.copy(accent);
      matBadge.emissive.copy(accent);
      rim.color.copy(accent); under.color.copy(accent);
      glowSprites.forEach(sp => sp.material.color.copy(accent));
      recolorParticles();
    }
    function applyFinish() {
      matShroud.roughness = 0.12 + S.finish * 0.6;
      matShroud.clearcoat = 1 - S.finish * 0.7;
      matBack.roughness = 0.2 + S.finish * 0.5;
      matFins.roughness = 0.2 + S.finish * 0.3;
    }
    function applyLight() {
      key.intensity = 3.0 * S.light; rim.intensity = 2.2 * S.light;
      fill.intensity = 0.7 * S.light; under.intensity = 8 * S.light;
    }
    function applyGlow() {
      glowSprites.forEach(sp => {
        sp.visible = S.glow;
        sp.material.opacity = sp.userData.base * S.bloom;
      });
      matLED.emissiveIntensity = (S.glow ? 2.4 : 0.5) * (0.5 + S.bloom);
      matBadge.emissiveIntensity = (S.glow ? 2.2 : 0.5) * (0.5 + S.bloom);
    }
    function applyWire() {
      allMats.forEach(m => { m.wireframe = S.wire; });
      shadowPlane.visible = !S.wire;
      ui.wire.classList.toggle('is-on', S.wire); ui.wire.setAttribute('aria-pressed', String(S.wire));
      ui.render.classList.toggle('is-on', !S.wire); ui.render.setAttribute('aria-pressed', String(!S.wire));
    }
    function applyAll() {
      orbit.distT = S.dist;
      applyQuality(); applyAccent(); applyFinish(); applyLight(); applyGlow(); applyWire();
    }
    function syncUI() {
      ui.quality.value = S.quality; ui.speed.value = S.speed; ui.zoom.value = S.dist;
      ui.fan.value = S.fan; ui.bloom.value = S.bloom; ui.light.value = S.light;
      ui.finish.value = S.finish; ui.accent.value = S.accent;
      ui.grid.checked = S.grid; ui.glow.checked = S.glow;
      applyWire();
    }

    ui.quality.addEventListener('change', () => { S.quality = ui.quality.value; applyQuality(); });
    ui.speed.addEventListener('input', () => { S.speed = +ui.speed.value; });
    ui.zoom.addEventListener('input', () => { S.dist = +ui.zoom.value; orbit.distT = S.dist; });
    ui.fan.addEventListener('input', () => { S.fan = +ui.fan.value; });
    ui.bloom.addEventListener('input', () => { S.bloom = +ui.bloom.value; applyGlow(); });
    ui.light.addEventListener('input', () => { S.light = +ui.light.value; applyLight(); });
    ui.finish.addEventListener('input', () => { S.finish = +ui.finish.value; applyFinish(); });
    ui.accent.addEventListener('input', () => { S.accent = ui.accent.value; applyAccent(); });
    ui.grid.addEventListener('change', () => { S.grid = ui.grid.checked; if (grid) grid.visible = S.grid; });
    ui.glow.addEventListener('change', () => { S.glow = ui.glow.checked; applyGlow(); });
    ui.wire.addEventListener('click', () => { S.wire = true; applyWire(); });
    ui.render.addEventListener('click', () => { S.wire = false; applyWire(); });
    canvas.addEventListener('dblclick', () => { S.wire = !S.wire; applyWire(); });

    function toastScene(msg) {
      const t = el('toast'); if (!t) return;
      t.textContent = msg; t.classList.add('show');
      clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2000);
    }
    ui.reset.addEventListener('click', () => {
      Object.assign(S, DEF);
      orbit.thetaT = 0.7; orbit.phiT = 1.12; orbit.distT = DEF.dist;
      makeGrid(); applyAll(); syncUI(); toastScene('SCENE RESET ⟲');
    });
    ui.random.addEventListener('click', () => {
      S.accent = '#' + new THREE.Color().setHSL(Math.random(), 0.85, 0.6).getHexString();
      S.finish = +(0.1 + Math.random() * 0.7).toFixed(2);
      S.bloom = +(0.3 + Math.random() * 0.8).toFixed(2);
      S.speed = +(0.2 + Math.random() * 1.2).toFixed(2);
      S.fan = 30 + Math.floor(Math.random() * 70);
      orbit.thetaT = Math.random() * Math.PI * 2;
      orbit.phiT = 0.6 + Math.random() * 0.7;
      applyAll(); syncUI(); toastScene('SCENE RANDOMIZED ⚄');
    });
    ui.export.addEventListener('click', () => {
      renderer.render(scene, camera);
      const a = document.createElement('a');
      a.download = 'paul-rtx5090-scene.png';
      a.href = canvas.toDataURL('image/png');
      a.click(); toastScene('FRAME EXPORTED ↓');
    });

    /* ---------- pointer / wheel / keyboard ---------- */
    let dragging = false, px = 0, py = 0;
    canvas.addEventListener('pointerdown', e => {
      dragging = true; px = e.clientX; py = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      orbit.thetaT += (e.clientX - px) * 0.006;
      orbit.phiT = clamp(orbit.phiT - (e.clientY - py) * 0.005, 0.35, 1.45);
      px = e.clientX; py = e.clientY;
    });
    ['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, () => { dragging = false; }));
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      orbit.distT = clamp(orbit.distT * (e.deltaY > 0 ? 1.08 : 0.92), 2.6, 6.5);
      S.dist = +orbit.distT.toFixed(2); ui.zoom.value = S.dist;
    }, { passive: false });
    canvas.addEventListener('keydown', e => {
      let used = true;
      if (e.key === 'ArrowLeft') orbit.thetaT -= 0.15;
      else if (e.key === 'ArrowRight') orbit.thetaT += 0.15;
      else if (e.key === 'ArrowUp') orbit.phiT = clamp(orbit.phiT - 0.1, 0.35, 1.45);
      else if (e.key === 'ArrowDown') orbit.phiT = clamp(orbit.phiT + 0.1, 0.35, 1.45);
      else if (e.key === ' ' || e.key === 'Enter') { S.wire = !S.wire; applyWire(); }
      else used = false;
      if (used) e.preventDefault();
    });

    /* ---------- theme ---------- */
    function applyTheme() {
      const bg = bgColor();
      scene.background.set(bg); scene.fog.color.set(bg);
      const light = document.documentElement.getAttribute('data-theme') === 'light';
      matPedestal.color.set(light ? 0xc9c4b6 : 0x0c0e12);
      matShroud.color.set(light ? 0x3a4050 : 0x1b1f27);
      matBack.color.set(light ? 0x4a5164 : 0x1a1d24);
      matFins.color.set(light ? 0xd0d4dc : 0xb8bcc4);
      key.color.set(light ? 0xffffff : 0xffe7c4);
      makeGrid();
      renderer.shadowMap.needsUpdate = true;
    }
    document.addEventListener('themechange', applyTheme);
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); fail('GPU CONTEXT LOST — RELOAD TO RESTORE'); });

    /* ---------- lifecycle ---------- */
    let running = true, frames = 0, fpsT = performance.now(), last = fpsT;
    new IntersectionObserver(es => es.forEach(en => { running = en.isIntersecting; }), { threshold: 0 }).observe(stage);
    new ResizeObserver(resize).observe(stage);
    document.addEventListener('visibilitychange', () => { last = performance.now(); fpsT = last; frames = 0; });

    if ((navigator.hardwareConcurrency || 4) < 4) S.quality = 'high';
    makeGrid(); applyAll(); syncUI(); applyTheme(); resize(); updateCamera();
    renderer.shadowMap.needsUpdate = true;
    if (live) live.innerHTML = '<i class="dot dot-green pulse"></i> GPU · LIVE';

    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (!running || document.hidden) return;
      if (!dragging && !reduced) orbit.thetaT += dt * S.speed * 0.35;
      updateCamera();

      const fanN = S.fan / 100;
      if (!reduced) {
        const rad = fanN * 16;
        fanGroups.forEach((f, i) => { f.rotation.z += (i === 1 ? -1 : 1) * rad * dt; });
        const pos = pGeo.attributes.position.array;
        const airSpeed = 0.25 + fanN * 2.2;
        for (let i = 0; i < P_COUNT; i++) {
          pos[i * 3 + 2] -= airSpeed * dt * (0.7 + (i % 7) / 10);
          pos[i * 3] += Math.sin(now * 0.0012 + i) * 0.0015;
          pos[i * 3 + 1] += Math.cos(now * 0.001 + i * 1.7) * 0.0012;
          if (pos[i * 3 + 2] < -1.75) {
            pos[i * 3 + 2] = 1.75;
            pos[i * 3] = Math.random() * 3.4 - 1.7;
            pos[i * 3 + 1] = Math.random() * 1.3 - 0.65;
          }
        }
        pGeo.attributes.position.needsUpdate = true;
        matLED.emissiveIntensity = (S.glow ? 2.4 : 0.5) * (0.5 + S.bloom) * (1 + 0.18 * Math.sin(now * 0.002));
        matBadge.emissiveIntensity = (S.glow ? 2.2 : 0.5) * (0.5 + S.bloom) * (1 + 0.18 * Math.sin(now * 0.002 + 1));
      }

      renderer.render(scene, camera);
      window.__sceneReady = true;
      frames++;
      const t = performance.now();
      if (t - fpsT > 500) {
        const fps = Math.round(frames * 1000 / (t - fpsT));
        setBadge(`${S.quality.toUpperCase()} · ${fps} FPS · ${Math.round(fanN * 3200)} RPM`);
        frames = 0; fpsT = t;
      }
    }
    requestAnimationFrame(frame);
  }
})();