/* المشهد العلوي: المجموعة الشمسية كاملة تدور حول الشمس، مع حزام كويكبات ونيازك وشهب.
   خامات الكواكب ودرب التبانة: Solar System Scope (CC BY 4.0) — assets/img/solar/
   الصخور والنيزك والشهاب وتاج الشمس: صور حقيقية مرخّصة مقصوصة — assets/img/solar/sprites/CREDITS.txt */
import * as THREE from "../vendor/three.module.min.js";

const canvas = document.getElementById("globe");
const fallback = document.querySelector(".hero-fallback");
const root = document.documentElement;

function ok() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }

if (canvas && ok()) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);

  const tl = new THREE.TextureLoader();
  const B = "assets/img/solar/";
  const tex = (f, srgb = true) => { const t = tl.load(B + f); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const sprite = (f) => tex("sprites/" + f);

  /* ---------- درب التبانة في الخلفية ---------- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 64, 32),
    new THREE.MeshBasicMaterial({ map: tex("stars_milky_way.jpg"), side: THREE.BackSide, color: 0x9aa3b8, depthWrite: false }));
  sky.rotation.set(.5, 0, .35);
  scene.add(sky);

  /* ---------- النظام ---------- */
  const sys = new THREE.Group();               // يُحرَّك ويُكبَّر حسب الشاشة
  const tilt = new THREE.Group();              // ميل مستوى المدارات
  tilt.rotation.x = THREE.MathUtils.degToRad(14);
  tilt.rotation.z = THREE.MathUtils.degToRad(-8);
  sys.add(tilt); scene.add(sys);

  // الشمس: سطح يتموّج ببطء + هالات توهّج
  const sunMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex("sun.jpg") }, t: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D map; uniform float t; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vec3 a=texture2D(map,vUv+vec2(t*.004,0.)).rgb; vec3 b=texture2D(map,vUv*1.7+vec2(-t*.003,t*.001)).rgb;
        vec3 c=mix(a,b,.35)*1.35; float limb=pow(max(dot(vN,vV),0.),.45); c*=mix(.55,1.15,limb); c+=vec3(1.,.55,.15)*pow(1.-limb,2.)*.6;
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`
  });
  const SUN_R = .85;
  const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 96, 96), sunMat);
  tilt.add(sun);
  const glowMap = sprite("corona.jpg");
  const halo = (s, c, o) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.set(s, s, 1); tilt.add(m); return m; };
  const halos = [halo(2.95, 0xfff0d0, 1), halo(3.5, 0xffa040, .45), halo(4.1, 0xffc530, .18)];
  halos[1].material.rotation = .8; halos[2].material.rotation = 2.1;

  const sunW = { value: new THREE.Vector3() };
  // إضاءة الكواكب من موضع الشمس
  const planetMat = (map, extra = {}) => new THREE.ShaderMaterial({
    uniforms: { sunW, map: { value: map }, ambient: { value: extra.ambient ?? .045 }, rim: { value: new THREE.Color(extra.rim ?? 0x6a8cff) }, rimK: { value: extra.rimK ?? .25 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 wp=modelMatrix*vec4(position,1.); vP=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform sampler2D map; uniform float ambient,rimK; uniform vec3 rim; uniform vec3 sunW; varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      void main(){ vec3 L=normalize(sunW-vP); float l=dot(normalize(vN),L);
        vec3 c=texture2D(map,vUv).rgb*(ambient+1.25*max(l,0.));
        vec3 v=normalize(cameraPosition-vP); float r=pow(1.-max(dot(normalize(vN),v),0.),3.);
        c+=rim*r*rimK*smoothstep(-.3,.6,l);
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`
  });

  // الأرض: نهار وليل وغيوم
  const earthMat = new THREE.ShaderMaterial({
    uniforms: { day: { value: tex("earth_daymap.jpg") }, night: { value: tex("earth_nightmap.jpg") }, clouds: { value: tex("earth_clouds.jpg", false) }, sunW, shift: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 wp=modelMatrix*vec4(position,1.); vP=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform sampler2D day,night,clouds; uniform vec3 sunW; uniform float shift; varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      void main(){ vec3 L=normalize(sunW-vP); float l=dot(normalize(vN),L); float dm=smoothstep(-.15,.25,l);
        float cl=texture2D(clouds,vUv+vec2(shift,0.)).r;
        vec3 d=texture2D(day,vUv).rgb*(.05+1.3*max(l,0.)); d=mix(d,vec3(1.)*(.08+max(l,0.)),cl*.75);
        vec3 n=texture2D(night,vUv).rgb*(1.-cl)*1.5;
        vec3 c=mix(n,d,dm); vec3 v=normalize(cameraPosition-vP); float r=pow(1.-max(dot(normalize(vN),v),0.),2.5);
        c+=vec3(.35,.6,1.)*r*(.1+.8*max(l+.1,0.));
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`
  });

  // [الاسم، الخامة، نصف القطر، بُعد المدار، السرعة الزاوية، ميل المحور]
  const P = [
    ["mercury", "mercury.jpg", .07, 1.55, 1.6, 0],
    ["venus", "venus_atmosphere.jpg", .13, 2.05, 1.18, 3],
    ["earth", null, .14, 2.65, 1, 23],
    ["mars", "mars.jpg", .1, 3.2, .8, 25],
    ["jupiter", "jupiter.jpg", .44, 4.75, .43, 3],
    ["saturn", "saturn.jpg", .37, 6.05, .32, 27],
    ["uranus", "uranus.jpg", .23, 7.15, .22, 82],
    ["neptune", "neptune.jpg", .22, 8.05, .18, 28],
  ];
  const planets = [];
  const orbitMat = new THREE.LineBasicMaterial({ color: 0xFFC530, transparent: true, opacity: .13, depthWrite: false });
  P.forEach(([name, file, r, d, w, axial], i) => {
    const pivot = new THREE.Group(); tilt.add(pivot);
    const body = new THREE.Group(); body.position.x = d; pivot.add(body);
    body.rotation.z = THREE.MathUtils.degToRad(axial);
    const mat = name === "earth" ? earthMat : planetMat(tex(file), name === "venus" ? { rim: 0xffd9a0 } : name === "neptune" || name === "uranus" ? { rim: 0x9fe6ff, rimK: .35 } : {});
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 64), mat); body.add(mesh);
    // خط المدار
    const pts = []; for (let k = 0; k <= 256; k++) { const a = k / 256 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d)); }
    tilt.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat));
    pivot.rotation.y = i * 1.37 + .6;
    planets.push({ name, pivot, mesh, w, spin: name === "venus" ? -.2 : 1.2 / Math.sqrt(r + .2) });
    if (name === "earth") {
      const moonPivot = new THREE.Group(); body.add(moonPivot);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(.038, 32, 32), planetMat(tex("moon.jpg"), { rimK: .1 }));
      moon.position.x = .3; moonPivot.add(moon); planets.at(-1).moon = moonPivot;
    }
    if (name === "saturn") {
      const g = new THREE.RingGeometry(r * 1.25, r * 2.3, 160, 1);
      const pos = g.attributes.position, uv = g.attributes.uv, v = new THREE.Vector3();
      for (let k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k); uv.setXY(k, (v.length() - r * 1.25) / (r * 1.05), .5); }
      const ring = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex("saturn_ring_alpha.png"), transparent: true, side: THREE.DoubleSide, depthWrite: false, color: 0xd8ccb0 }));
      ring.rotation.x = Math.PI / 2; body.add(ring);
    }
  });

  /* ---------- حزام الكويكبات: صخور مرسومة في Krita ---------- */
  const rocks = ["rock1.png", "rock2.png", "rock3.png", "rock4.png"].map(sprite);
  const belt = new THREE.Group(); tilt.add(belt);
  const rnd = (() => { let s = 20261122; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  rocks.forEach((map, k) => {
    const n = 190, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = rnd() * 6.283, rr = 3.6 + (rnd() + rnd()) * .42, y = (rnd() - .5) * .22; arr.set([Math.cos(a) * rr, y, Math.sin(a) * rr], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    belt.add(new THREE.Points(g, new THREE.PointsMaterial({ map, size: .085 + k * .012, transparent: true, alphaTest: .25, depthWrite: false, color: 0xcfc4b4 })));
  });

  // صخور قريبة من العدسة تعبر ببطء وتدور (عمق سينمائي)
  const near = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: rocks[i % 4], transparent: true, depthWrite: false, color: 0x5f5850 }));
    const s = .35 + rnd() * .55; m.scale.set(s, s, 1);
    m.userData = { x: (rnd() - .5) * 14, y: (rnd() - .5) * 6, z: 3 + rnd() * 4, vx: (rnd() - .5) * .18, vy: (rnd() - .5) * .06, vr: (rnd() - .5) * .4 };
    scene.add(m); near.push(m);
  }

  /* ---------- طبقة النيازك والشهب (إحداثيات الشاشة) ---------- */
  const fx = new THREE.Scene();
  const ortho = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
  const meteorMap = sprite("meteor.jpg"), streakMap = sprite("streak.jpg");
  // في الرسمتين: الرأس على اليمين والذيل إلى اليسار
  const shots = Array.from({ length: 6 }, (_, i) => {
    const big = i < 2;
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: big ? meteorMap : streakMap, color: big ? 0xffe7b8 : 0xcfe6ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    fx.add(m); return { m, big, life: 0, dur: 1, next: 1.5 + i * 2.2 + rnd() * 3 };
  });
  function launch(s, W, H) {
    const ang = THREE.MathUtils.degToRad(s.big ? 200 + rnd() * 25 : 195 + rnd() * 40); // نحو اليسار وإلى الأسفل
    const speed = s.big ? W * (.28 + rnd() * .12) : W * (.9 + rnd() * .6);
    s.vx = Math.cos(ang) * speed; s.vy = Math.sin(ang) * speed;
    s.x = W * (.35 + rnd() * .75); s.y = H * (.62 + rnd() * .45);
    s.dur = s.big ? 3.2 + rnd() * 2 : .55 + rnd() * .5; s.life = 0;
    const len = s.big ? Math.min(W, H) * (.32 + rnd() * .18) : W * (.1 + rnd() * .1);
    s.m.scale.set(len, len * (s.big ? .25 : .0625), 1);
    s.m.material.rotation = Math.atan2(s.vy, s.vx);
  }

  /* ---------- التخطيط ---------- */
  const base = { x: 0, y: 0, s: 1 };
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    ortho.right = w; ortho.top = h; ortho.updateProjectionMatrix();
    const mobile = w < 860;
    // الحاسوب: الشمس في اليسار والنص العربي على اليمين. الجوال: النظام في الأعلى.
    base.x = mobile ? 0 : -Math.min(5.2, 2.6 * camera.aspect);
    base.y = mobile ? 3.1 : .1;
    base.s = mobile ? .45 : Math.min(1.05, .7 + camera.aspect * .14);
    sys.position.set(base.x, base.y, 0); sys.scale.setScalar(base.s);
  }
  addEventListener("resize", layout); layout();

  /* ---------- التفاعل ---------- */
  let dragging = false, lastX = 0, vel = 0, spin = 0, mx = 0, my = 0;
  canvas.style.touchAction = "pan-y"; canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; });
  canvas.addEventListener("pointerup", () => { dragging = false; canvas.style.cursor = "grab"; });
  canvas.addEventListener("pointermove", (e) => { if (!dragging) return; vel = (e.clientX - lastX) * .004; spin += vel; lastX = e.clientX; });
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  const clock = new THREE.Clock(); let t = 0, intro = 0;
  const camPos = new THREE.Vector3(), look = new THREE.Vector3();
  function tick() {
    requestAnimationFrame(tick);
    if (!visible || document.hidden) return;
    const dt = Math.min(clock.getDelta(), .05);
    const still = root.dataset.motion === "reduce" || root.dataset.motion === "off";
    if (!still) t += dt;
    intro = still ? 1 : Math.min(1, intro + dt / 4.5);
    const ei = 1 - Math.pow(1 - intro, 3);
    if (!dragging) { vel *= .94; spin += vel; }

    tilt.rotation.y = spin + t * .01;
    planets.forEach((p) => { p.pivot.rotation.y += still ? 0 : dt * p.w * .16; p.mesh.rotation.y += still ? 0 : dt * p.spin * .25; if (p.moon) p.moon.rotation.y += still ? 0 : dt * .9; });
    belt.rotation.y += still ? 0 : dt * .012;
    sunMat.uniforms.t.value = t; earthMat.uniforms.shift.value = t * .002;
    sun.rotation.y = t * .02;
    halos[0].material.opacity = .9 + Math.sin(t * 1.3) * .08; halos[1].scale.setScalar(3.5 + Math.sin(t * .7) * .08); halos[2].material.rotation += dt * .01;
    sun.getWorldPosition(sunW.value);

    // حركة كاميرا سينمائية: اقتراب افتتاحي ثم تمايل خفيف يتبع المؤشر
    camPos.set(mx * 1.2 + Math.sin(t * .05) * .4, 3.4 + (1 - ei) * 5 - my * .8, 14.5 + (1 - ei) * 10);
    camera.position.lerp(camPos, intro < 1 ? 1 : .03);
    look.set(base.x * .55, canvas.clientWidth < 860 ? 0 : base.y * .6, 0); camera.lookAt(look);
    sky.rotation.y = t * .004;
    near.forEach((m) => { const u = m.userData; if (!still) { u.x += u.vx * dt; u.y += u.vy * dt; } if (u.x > 8) u.x = -8; if (u.x < -8) u.x = 8; m.position.set(u.x, u.y, u.z); m.material.rotation += still ? 0 : u.vr * dt; });

    renderer.autoClear = true; renderer.render(scene, camera);
    if (!still) {
      const W = canvas.clientWidth, H = canvas.clientHeight;
      shots.forEach((s) => {
        if (s.life <= 0) { s.next -= dt; if (s.next <= 0) { launch(s, W, H); s.life = 1e-4; } s.m.visible = false; return; }
        s.life += dt; const k = s.life / s.dur; s.m.visible = true;
        s.x += s.vx * dt; s.y += s.vy * dt; s.m.position.set(s.x, s.y, 0);
        s.m.material.opacity = Math.sin(Math.min(k, 1) * Math.PI) * (s.big ? .95 : .8);
        if (k >= 1) { s.life = 0; s.next = s.big ? 7 + rnd() * 9 : 2 + rnd() * 5; }
      });
      renderer.autoClear = false; renderer.render(fx, ortho);
    }
  }
  tick();
  fallback?.remove();
  canvas.classList.add("ready");
}
