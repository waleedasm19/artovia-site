/* كوكب المعرفة: كرة ثلاثية الأبعاد بخامات مرسومة إجرائيًّا (tools/planet.py)
   أضواء الجانب المظلم ترمز إلى المعرفة التي تنتشر في الأرض. */
import * as THREE from "../vendor/three.module.min.js";

const canvas = document.getElementById("globe");
const fallback = document.querySelector(".hero-fallback");
const root = document.documentElement;

function ok() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }

if (canvas && ok()) {
  fallback?.remove();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const tl = new THREE.TextureLoader();
  const base = "assets/img/planet/";
  const load = (f, srgb = true) => { const t = tl.load(base + f); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const day = load("day.jpg"), night = load("night.jpg"), clouds = load("clouds.png", false), spec = load("spec.png", false);

  const sun = new THREE.Vector3(-1.0, 0.32, 0.42).normalize();
  const group = new THREE.Group();
  group.rotation.z = THREE.MathUtils.degToRad(-18);
  scene.add(group);

  const planetMat = new THREE.ShaderMaterial({
    uniforms: { day: { value: day }, night: { value: night }, spec: { value: spec }, clouds: { value: clouds }, sun: { value: sun }, cloudShift: { value: 0 } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal);
        vec4 wp=modelMatrix*vec4(position,1.); vView=normalize(cameraPosition-wp.xyz);
        gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `
      uniform sampler2D day,night,spec,clouds; uniform vec3 sun; uniform float cloudShift;
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main(){
        float l=dot(normalize(vN),sun);
        float dayMix=smoothstep(-0.18,0.28,l);
        vec3 d=texture2D(day,vUv).rgb;
        float cl=smoothstep(0.3,0.95,texture2D(clouds,vUv+vec2(cloudShift,0.)).r);
        float cs=smoothstep(0.3,0.95,texture2D(clouds,vUv+vec2(cloudShift-0.004,0.003)).r);
        vec3 lit=d*(0.06+1.3*max(l,0.))*(1.0-cs*0.35);
        vec3 h=normalize(sun+vView); float s=pow(max(dot(normalize(vN),h),0.),60.)*texture2D(spec,vUv).r;
        lit+=vec3(1.0,0.92,0.75)*s*0.3*dayMix;
        lit=mix(lit,vec3(1.)*(0.12+max(l,0.)*1.05),cl*0.88);
        vec3 n=texture2D(night,vUv).rgb*(1.0-cl*0.85)*1.6;
        vec3 col=mix(n+d*0.025,lit,dayMix);
        float rim=pow(1.0-max(dot(normalize(vN),vView),0.),3.0);
        col+=vec3(0.32,0.55,1.0)*rim*(0.08+0.7*max(l+0.15,0.));
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1.6, 128, 128), planetMat);
  group.add(planet);

  // الغلاف الجوي المتوهّج
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.6 * 1.13, 96, 96), new THREE.ShaderMaterial({
    uniforms: { sun: { value: sun } }, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 wp=modelMatrix*vec4(position,1.); vP=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 sun; varying vec3 vN; varying vec3 vP;
      void main(){ vec3 v=normalize(cameraPosition-vP); float i=pow(clamp(0.66-dot(vN,v),0.,1.),3.2);
        float lit=0.05+1.1*max(dot(vN,sun)+0.25,0.); gl_FragColor=vec4(vec3(0.35,0.6,1.0)*i*lit*1.1,i*0.8); }`
  }));
  scene.add(atmo);

  // حلقة مدارية ذهبية رقيقة بلون الهوية
  const ringGeo = new THREE.RingGeometry(2.25, 2.252, 256);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xE9B949, transparent: true, opacity: .35, side: THREE.DoubleSide }));
  ring.rotation.x = THREE.MathUtils.degToRad(74); ring.rotation.y = THREE.MathUtils.degToRad(-12);
  scene.add(ring);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 32, 32), new THREE.MeshBasicMaterial({ color: 0xF2C230 }));
  scene.add(moon);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xF2C230, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, map: glowTex() }));
  moonGlow.scale.set(.6, .6, 1); scene.add(moonGlow);
  function glowTex() { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }

  // التخطيط: الكوكب في الجهة اليسرى (النص عربي على اليمين)
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const mobile = w < 860;
    const x = mobile ? 0 : -Math.min(2.25, 1.15 * camera.aspect);
    const y = mobile ? 1.45 : 0;
    const s = mobile ? .6 : Math.min(1.1, .75 + camera.aspect * .14);
    [group, atmo].forEach((o) => { o.position.set(x, y, 0); o.scale.setScalar(s); });
    ring.position.set(x, y, 0); ring.scale.setScalar(s);
    target.base = { x, y, s };
  }
  const target = { rx: 0, ry: 0, base: { x: 0, y: 0, s: 1 } };
  addEventListener("resize", layout); layout();

  // السحب للتدوير، وتتبّع المؤشر
  let dragging = false, lastX = 0, lastY = 0, vel = 0, spin = 0, tiltX = 0;
  canvas.style.touchAction = "pan-y";
  canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; });
  canvas.addEventListener("pointerup", () => { dragging = false; canvas.style.cursor = "grab"; });
  canvas.addEventListener("pointermove", (e) => { if (!dragging) return; vel = (e.clientX - lastX) * .005; spin += vel; tiltX = THREE.MathUtils.clamp(tiltX + (e.clientY - lastY) * .003, -.5, .5); lastX = e.clientX; lastY = e.clientY; });
  canvas.style.cursor = "grab";
  addEventListener("pointermove", (e) => { target.rx = (e.clientY / innerHeight - .5) * .12; target.ry = (e.clientX / innerWidth - .5) * .2; }, { passive: true });

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  const clock = new THREE.Clock(); let t = 0;
  function tick() {
    requestAnimationFrame(tick);
    if (!visible || document.hidden) return;
    const dt = Math.min(clock.getDelta(), .05);
    const still = root.dataset.motion === "reduce";
    if (!still) t += dt;
    if (!dragging) { vel *= .95; spin += vel; }
    planet.rotation.y = (still ? 0 : t * .045) + spin + 2.2;
    planet.rotation.x = tiltX * .6;
    planetMat.uniforms.cloudShift.value = still ? 0 : t * .0035;
    group.rotation.x += (target.rx - group.rotation.x) * .04;
    camera.position.x += (target.ry * 1.2 - camera.position.x) * .03;
    camera.lookAt(0, 0, 0);
    const a = t * .25, b = target.base;
    const p = new THREE.Vector3(Math.cos(a) * 2.25, 0, Math.sin(a) * 2.25).applyEuler(ring.rotation).multiplyScalar(b.s).add(new THREE.Vector3(b.x, b.y, 0));
    moon.position.copy(p); moonGlow.position.copy(p);
    renderer.render(scene, camera);
  }
  tick();
  canvas.classList.add("ready");
}
