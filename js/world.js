'use strict';
// ---------- Welt: Terrain, Himmel, Tag/Nacht, Stadt, Lager, Props, Kollisionen ----------
const WORLD = 1600, HALF = 800, TERRAIN_SEG = 320;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 2500);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
scene.fog = new THREE.FogExp2(0xcfd8e0, 0.0016);
scene.add(camera);

const TOWN = { x: 0, z: 0, r: 78, name: 'Copper Creek' };
const CAMPS = [
  { x: -250, z: -190, r: 38, name: 'Coyote Hollow', count: 5 },
  { x: 290, z: -330, r: 38, name: 'Bone Ridge', count: 6 },
  { x: -370, z: 390, r: 50, name: "Black Jack's Fort", count: 8, fort: true },
];
const HOME = { x: 270, z: 240, r: 42, name: 'Miller Farm' };
const LAKES = [{ x: 230, z: -40, r: 52, d: 12 }];
const WATER_Y = -4;
const ROADS = [
  [[0, 0], [-120, -70], [-250, -190]],
  [[0, 0], [150, -170], [290, -330]],
  [[0, 0], [-150, 210], [-370, 390]],
  [[0, 0], [130, 110], [270, 240]],
];
const ZONES = [TOWN, ...CAMPS, HOME];

function roadDist(x, z) {
  let m = 1e9;
  for (const r of ROADS) for (let i = 0; i < r.length - 1; i++) { const d = segDist(x, z, r[i], r[i + 1]); if (d < m) m = d; }
  return m;
}
function terrainBase(x, z) {
  let h = (fbm(x * 0.0035 + 11, z * 0.0035 + 7, 5) - 0.5) * 60 + 6;
  h += (fbm(x * 0.02 + 5, z * 0.02 + 9, 3) - 0.5) * 5;
  const mm = smooth(0.6, 0.67, fbm(x * 0.0022 + 40, z * 0.0022 + 90, 3));
  if (mm > 0) h += mm * smooth(15, 60, roadDist(x, z)) * 34;
  for (const l of LAKES) {
    const d = Math.hypot(x - l.x, z - l.z);
    if (d < l.r) h = lerp(h, -l.d, 1 - smooth(l.r * 0.45, l.r, d));
  }
  const e = Math.max(Math.abs(x), Math.abs(z));
  if (e > 560) h += smooth(560, 800, e) * (60 + 50 * fbm(x * 0.01, z * 0.01, 3));
  return h;
}
for (const z of ZONES) z.h = Math.max(2, terrainBase(z.x, z.z));
function heightAt(x, z) {
  let h = terrainBase(x, z);
  for (const zn of ZONES) {
    const d = Math.hypot(x - zn.x, z - zn.z);
    if (d < zn.r * 1.5) h = lerp(h, zn.h, 1 - smooth(zn.r * 0.8, zn.r * 1.5, d));
  }
  return h;
}
function nearZone(x, z, m = 1) {
  for (const zn of ZONES) if (Math.hypot(x - zn.x, z - zn.z) < zn.r * m) return true;
  return false;
}
const moist = (x, z) => fbm(x * 0.005 + 200, z * 0.005 + 300, 3);

// ---------- Kollisionen ----------
const circles = [], boxes = [], cgrid = new Map();
const CELL = 24;
function addCircle(x, z, r) {
  const c = { x, z, r };
  circles.push(c);
  const k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
  if (!cgrid.has(k)) cgrid.set(k, []);
  cgrid.get(k).push(c);
  return c;
}
function addBox(minx, maxx, minz, maxz, top) { boxes.push({ minx, maxx, minz, maxz, top }); }
function resolveCollisions(e, r) {
  const cx = Math.floor(e.x / CELL), cz = Math.floor(e.z / CELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const l = cgrid.get((cx + i) + ',' + (cz + j));
    if (!l) continue;
    for (const c of l) {
      const dx = e.x - c.x, dz = e.z - c.z, rr = r + c.r, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.001; e.x = c.x + dx / d * rr; e.z = c.z + dz / d * rr; }
    }
  }
  for (const b of boxes) {
    if (e.x < b.minx - r || e.x > b.maxx + r || e.z < b.minz - r || e.z > b.maxz + r) continue;
    const px = clamp(e.x, b.minx, b.maxx), pz = clamp(e.z, b.minz, b.maxz);
    const dx = e.x - px, dz = e.z - pz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-6) { const d = Math.sqrt(d2); e.x = px + dx / d * r; e.z = pz + dz / d * r; }
      else {
        const l = e.x - b.minx, rr = b.maxx - e.x, t = e.z - b.minz, bt = b.maxz - e.z, m = Math.min(l, rr, t, bt);
        if (m === l) e.x = b.minx - r; else if (m === rr) e.x = b.maxx + r; else if (m === t) e.z = b.minz - r; else e.z = b.maxz + r;
      }
    }
  }
  e.x = clamp(e.x, -775, 775); e.z = clamp(e.z, -775, 775);
}
// Bewegung mit Hangprüfung + Kollision. Liefert true wenn bewegt.
function tryMove(e, dx, dz, r, slopeMax = 1.25) {
  const step = Math.hypot(dx, dz);
  if (step < 1e-7) return false;
  const ox = e.x, oz = e.z, hOld = heightAt(ox, oz);
  const ok = (nx, nz) => (heightAt(nx, nz) - hOld) / step < slopeMax || !e.grounded;
  if (ok(ox + dx, oz + dz)) { e.x = ox + dx; e.z = oz + dz; }
  else if (Math.abs(dx) > 1e-6 && ok(ox + dx, oz)) { e.x = ox + dx; }
  else if (Math.abs(dz) > 1e-6 && ok(ox, oz + dz)) { e.z = oz + dz; }
  else return false;
  resolveCollisions(e, r);
  return true;
}
// Sichtlinie (Gelände + Gebäude)
function losClear(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz);
  const n = Math.min(80, Math.ceil(len / 1.6));
  for (let i = 1; i < n; i++) {
    const t = i / n, x = ax + dx * t, y = ay + dy * t, z = az + dz * t;
    if (y < heightAt(x, z) + 0.1) return false;
    for (const b of boxes) if (x > b.minx && x < b.maxx && z > b.minz && z < b.maxz && y < b.top) return false;
  }
  return true;
}
// Strahl gegen Welt: gibt Distanz bis zum ersten Treffer zurück
function worldRay(o, d, maxDist) {
  const step = 0.8;
  for (let t = 0.5; t < maxDist; t += step) {
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    if (y < heightAt(x, z)) return t;
    for (const b of boxes) if (x > b.minx && x < b.maxx && z > b.minz && z < b.maxz && y < b.top) return t;
  }
  return maxDist;
}

// ---------- Himmel, Sonne, Sterne, Wolken ----------
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(0x3d7bd6) }, hor: { value: new THREE.Color(0xbcd6f0) }, sunDir: { value: new V3(0, 1, 0) }, sunCol: { value: new THREE.Color(0xfff2c0) }, sunAmt: { value: 1 } },
  vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunAmt;
    void main(){ vec3 d=normalize(vP); float h=clamp(d.y,0.0,1.0);
      vec3 c=mix(hor,top,pow(h,0.55));
      if(d.y<0.0) c=hor;
      float s=max(dot(d,normalize(sunDir)),0.0);
      c+=sunCol*(pow(s,600.0)*2.0+pow(s,8.0)*0.25)*sunAmt;
      gl_FragColor=vec4(c,1.0); }`,
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), skyMat);
skyDome.frustumCulled = false; skyDome.renderOrder = -10;
scene.add(skyDome);

const starGeo = new THREE.BufferGeometry();
{
  const p = [];
  for (let i = 0; i < 1600; i++) {
    const u = Math.random() * Math.PI * 2, v = Math.random() * 0.98 + 0.02;
    const r = Math.sqrt(1 - v * v);
    p.push(Math.cos(u) * r * 1100, v * 1100, Math.sin(u) * r * 1100);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
}
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
const stars = new THREE.Points(starGeo, starMat);
stars.frustumCulled = false; scene.add(stars);

const clouds = [];
{
  const tex = cloudTexture();
  for (let i = 0; i < 26; i++) {
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9, fog: false, depthWrite: false });
    const s = new THREE.Sprite(m);
    const a = Math.random() * Math.PI * 2, r = 200 + Math.random() * 800;
    s.position.set(Math.cos(a) * r, 220 + Math.random() * 120, Math.sin(a) * r);
    s.scale.set(320 + Math.random() * 300, 120 + Math.random() * 80, 1);
    s.userData.v = 2 + Math.random() * 3;
    scene.add(s); clouds.push(s);
  }
}

const hemi = new THREE.HemisphereLight(0xbcd6f0, 0x8a6a45, 0.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d0, 1.1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -55; sun.shadow.camera.right = 55; sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 260;
sun.shadow.bias = -0.0006;
scene.add(sun); scene.add(sun.target);

let nightFactor = 0, daylight = 1, gameHours = 8.5;
let rain = 0, rainTarget = 0, weatherT = 150, lightning = 0, lightningT = 6;
const _gr1 = new THREE.Color(0x565c66), _gr2 = new THREE.Color(0x7a8088), _white = new THREE.Color(0xffffff);
// Sonnenglanz
const sunGlow = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.15, 'rgba(255,220,150,0.55)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
  sp.scale.set(420, 420, 1); sp.renderOrder = -5; sp.frustumCulled = false; scene.add(sp); return sp;
})();
// Regen
const RAIN_N = 2200;
const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAIN_N * 6), 3));
const rainLines = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xb8c4d8, transparent: true, opacity: 0, fog: false, depthWrite: false }));
rainLines.frustumCulled = false; rainLines.visible = false; scene.add(rainLines);
const rainPos = rainGeo.attributes.position.array;
for (let i = 0; i < RAIN_N; i++) { const b = i * 6; rainPos[b] = rand(-28, 28); rainPos[b + 1] = rand(-4, 22); rainPos[b + 2] = rand(-28, 28); }
function updateWeather(dt) {
  weatherT -= dt;
  if (weatherT <= 0) { rainTarget = rainTarget > 0 ? 0 : (Math.random() < 0.5 ? 1 : 0); weatherT = rand(120, 260); if (rainTarget && game.started) toast('Dunkle Wolken ziehen auf…', 3000); }
  rain += (rainTarget - rain) * Math.min(1, dt * 0.25);
  lightning = Math.max(0, lightning - dt * 3.5);
  if (rain > 0.7) { lightningT -= dt; if (lightningT <= 0) { lightningT = rand(6, 16); lightning = 1; SFX.thunder(rand(0.4, 2.5)); } }
  rainLines.visible = rain > 0.03;
  rainLines.material.opacity = 0.42 * rain;
  SFX.setRain(rain);
  if (!rainLines.visible) return;
  const fall = 34 * dt;
  for (let i = 0; i < RAIN_N; i++) {
    const b = i * 6;
    rainPos[b + 1] -= fall; rainPos[b] -= 3 * dt;
    if (rainPos[b + 1] < -6) { rainPos[b] = rand(-28, 28); rainPos[b + 1] = rand(14, 24); rainPos[b + 2] = rand(-28, 28); }
    rainPos[b + 3] = rainPos[b] + 0.05; rainPos[b + 4] = rainPos[b + 1] + 0.75; rainPos[b + 5] = rainPos[b + 2];
  }
  rainLines.position.copy(camera.position);
  rainGeo.attributes.position.needsUpdate = true;
}
const sunVec = new V3();
const C = { nTop: new THREE.Color(0x03050f), nHor: new THREE.Color(0x0e1830), dTop: new THREE.Color(0x3a76d0), dHor: new THREE.Color(0xbcd6ee), twTop: new THREE.Color(0x4a4a8a), twHor: new THREE.Color(0xff8a48) };
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
const WINDOW_MAT = new THREE.MeshBasicMaterial({ color: 0x1c2733 });
const WINDOW_DAY = new THREE.Color(0x1c2733), WINDOW_NIGHT = new THREE.Color(0xffc266);
function updateEnv(hours, focus) {
  const a = (hours - 6) / 12 * Math.PI;
  sunVec.set(Math.cos(a), Math.sin(a), 0.35).normalize();
  const s = sunVec.y;
  const day = smooth(-0.05, 0.35, s);
  daylight = day;
  nightFactor = 1 - smooth(-0.25, 0.05, s);
  _c1.copy(C.nTop).lerp(C.dTop, day);
  _c2.copy(C.nHor).lerp(C.dHor, day);
  const tw = Math.max(0, 1 - Math.abs(s - 0.02) / 0.28);
  _c2.lerp(C.twHor, tw * 0.75); _c1.lerp(C.twTop, tw * 0.35);
  if (rain > 0.01) { _c1.lerp(_gr1, rain * 0.75); _c2.lerp(_gr2, rain * 0.8); }
  if (lightning > 0.01) { _c1.lerp(_white, lightning * 0.6); _c2.lerp(_white, lightning * 0.6); }
  skyMat.uniforms.top.value.copy(_c1); skyMat.uniforms.hor.value.copy(_c2);
  skyMat.uniforms.sunDir.value.copy(sunVec);
  skyMat.uniforms.sunAmt.value = smooth(-0.1, 0.05, s);
  scene.fog.color.copy(_c2);
  scene.fog.density = lerp(0.0022, 0.0015, day) * (1 + rain * 1.6);
  starMat.opacity = nightFactor * (1 - rain);
  hemi.intensity = (0.16 + 0.55 * day) * (1 - 0.3 * rain) + lightning * 1.6;
  hemi.color.copy(_c1).lerp(_c2, 0.5).lerp(new THREE.Color(0xffffff), 0.35);
  const dirV = s >= 0 ? sunVec : sunVec.clone().negate();
  sun.position.set(focus.x + dirV.x * 120, focus.y + dirV.y * 120 + 10, focus.z + dirV.z * 120);
  sun.target.position.set(focus.x, focus.y, focus.z);
  sun.intensity = (smooth(-0.02, 0.3, s) * 1.15 + smooth(-0.02, -0.3, s) * 0.28) * (1 - 0.7 * rain);
  if (s >= 0) sun.color.setRGB(1, lerp(0.6, 0.96, smooth(0, 0.4, s)), lerp(0.35, 0.82, smooth(0, 0.4, s)));
  else sun.color.setRGB(0.5, 0.6, 1);
  WINDOW_MAT.color.copy(WINDOW_DAY).lerp(WINDOW_NIGHT, smooth(0.3, 0.8, nightFactor));
  const cl = 0.25 + 0.75 * day;
  for (const c of clouds) c.material.color.setRGB(cl, cl * (0.9 + 0.1 * day), cl * (0.85 + 0.15 * day) + (1 - day) * 0.1);
  skyDome.position.copy(camera.position); stars.position.copy(camera.position);
  sunGlow.position.copy(camera.position).addScaledVector(sunVec, 1000);
  sunGlow.material.opacity = smooth(-0.06, 0.2, s) * (1 - rain) * 0.9;
  if (waterMesh) waterMesh.material.map.offset.x += 0.00015;
}

// ---------- Terrain ----------
const GRIT = makeGritTexture();
const WOOD = makeWoodTexture();
let terrainMesh, waterMesh;
function terrainColor(x, z, h, ny, out) {
  const m = moist(x, z), n = noise2(x * 0.08, z * 0.08);
  let r = 0.80, g = 0.63, b = 0.40;
  const gr = smooth(0.5, 0.62, m) * (1 - smooth(12, 30, h));
  r = lerp(r, 0.44, gr); g = lerp(g, 0.50, gr); b = lerp(b, 0.24, gr);
  const dk = smooth(0.45, 0.3, m) * 0.5;
  r = lerp(r, 0.74, dk); g = lerp(g, 0.50, dk); b = lerp(b, 0.32, dk);
  const rock = smooth(0.93, 0.72, ny);
  const band = 0.5 + 0.5 * Math.sin(h * 0.9 + noise2(x * 0.03, z * 0.03) * 4);
  r = lerp(r, 0.60 + band * 0.18, rock); g = lerp(g, 0.31 + band * 0.10, rock); b = lerp(b, 0.19 + band * 0.06, rock);
  const road = (1 - smooth(2.4, 4.4, roadDist(x, z))) * 0.8;
  r = lerp(r, 0.66, road); g = lerp(g, 0.54, road); b = lerp(b, 0.38, road);
  for (const zn of ZONES) {
    const w = (1 - smooth(zn.r * 0.6, zn.r * 1.05, Math.hypot(x - zn.x, z - zn.z))) * 0.65;
    if (w > 0) { r = lerp(r, 0.72, w); g = lerp(g, 0.58, w); b = lerp(b, 0.40, w); }
  }
  if (h < WATER_Y + 1.5) { const w = smooth(WATER_Y + 1.5, WATER_Y - 2, h); r = lerp(r, 0.32, w); g = lerp(g, 0.30, w); b = lerp(b, 0.25, w); }
  const e = Math.max(Math.abs(x), Math.abs(z));
  if (e > 600) { const w = smooth(600, 800, e) * 0.5; r = lerp(r, 0.5, w); g = lerp(g, 0.33, w); b = lerp(b, 0.25, w); }
  const v = 0.9 + n * 0.2;
  out.setRGB(r * v, g * v, b * v);
}
function buildTerrain() {
  const seg = TERRAIN_SEG;
  const geo = new THREE.PlaneGeometry(WORLD, WORLD, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, n = pos.count;
  for (let i = 0; i < n; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const nor = geo.attributes.normal, cols = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    terrainColor(pos.getX(i), pos.getZ(i), pos.getY(i), nor.getY(i), c);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  GRIT.repeat.set(360, 360);
  terrainMesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: GRIT }));
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);
  const wc = document.createElement('canvas'); wc.width = wc.height = 128;
  const wg = wc.getContext('2d'); wg.fillStyle = '#fff'; wg.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 90; i++) { wg.strokeStyle = 'rgba(150,190,210,' + (0.15 + Math.random() * 0.3) + ')'; wg.lineWidth = 1 + Math.random(); const x = Math.random() * 128, y = Math.random() * 128; wg.beginPath(); wg.moveTo(x, y); wg.lineTo(x + 6 + Math.random() * 14, y + Math.random() * 2 - 1); wg.stroke(); }
  const wt = new THREE.CanvasTexture(wc); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(300, 300);
  waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), new THREE.MeshPhongMaterial({ color: 0x3a7a94, map: wt, transparent: true, opacity: 0.8, shininess: 110, specular: 0xffffff }));
  waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.y = WATER_Y;
  scene.add(waterMesh);
}

// ---------- Instanzierte Props ----------
function instanced(geo, mat, items, castShadow) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const d = new THREE.Object3D(), c = new THREE.Color();
  items.forEach((it, i) => {
    d.position.set(it.x, it.y, it.z);
    d.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
    d.scale.set(it.sx || it.s || 1, it.sy || it.s || 1, it.sz || it.s || 1);
    d.updateMatrix(); m.setMatrixAt(i, d.matrix);
    if (it.color !== undefined) { c.setHex(it.color); m.setColorAt(i, c); }
  });
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = !!castShadow; m.receiveShadow = true; m.frustumCulled = false;
  scene.add(m);
  return m;
}
function scatter(n, test) {
  const out = []; let guard = 0;
  while (out.length < n && guard < n * 30) {
    guard++;
    const x = rand(-770, 770), z = rand(-770, 770), h = heightAt(x, z);
    if (test(x, z, h)) out.push({ x, z, h });
  }
  return out;
}
const offRoad = (x, z) => roadDist(x, z) > 7;
const gray = () => { const v = irand(0xb8, 0xff); return (v << 16) | (v << 8) | v; };

function buildNature() {
  // Saguaro-Kakteen
  const cg = mergeParts([
    { geo: new THREE.CylinderGeometry(0.28, 0.34, 5, 8), m: MX(0, 2.5, 0), color: 0x3f6b35 },
    { geo: new THREE.SphereGeometry(0.28, 8, 6), m: MX(0, 5, 0), color: 0x4c7a3d },
    { geo: new THREE.CylinderGeometry(0.2, 0.2, 1.3, 7), m: MX(0.8, 2.6, 0, 0, 0, Math.PI / 2), color: 0x3f6b35 },
    { geo: new THREE.CylinderGeometry(0.18, 0.2, 1.7, 7), m: MX(1.4, 3.4, 0), color: 0x3f6b35 },
    { geo: new THREE.SphereGeometry(0.18, 7, 5), m: MX(1.4, 4.25, 0), color: 0x4c7a3d },
    { geo: new THREE.CylinderGeometry(0.2, 0.2, 1.0, 7), m: MX(-0.65, 3.3, 0, 0, 0, Math.PI / 2), color: 0x3f6b35 },
    { geo: new THREE.CylinderGeometry(0.17, 0.2, 1.3, 7), m: MX(-1.15, 3.9, 0), color: 0x3f6b35 },
    { geo: new THREE.SphereGeometry(0.17, 7, 5), m: MX(-1.15, 4.55, 0), color: 0x4c7a3d },
  ]);
  const cact = scatter(260, (x, z, h) => h > WATER_Y + 1 && h < 40 && moist(x, z) < 0.52 && !nearZone(x, z, 1.1) && offRoad(x, z)).map((p) => ({ x: p.x, y: p.h - 0.1, z: p.z, ry: rand(0, 6.28), s: rand(0.7, 1.4), color: gray() }));
  instanced(cg, new THREE.MeshLambertMaterial({ vertexColors: true }), cact, true);
  cact.forEach((c) => addCircle(c.x, c.z, 0.6 * c.s));

  // Tote Bäume
  const dg = mergeParts([
    { geo: new THREE.CylinderGeometry(0.16, 0.34, 4.2, 6), m: MX(0, 2.1, 0), color: 0x5e4d3d },
    { geo: new THREE.CylinderGeometry(0.07, 0.12, 2.2, 5), m: MX(0.8, 3.6, 0, 0, 0, -0.9), color: 0x5e4d3d },
    { geo: new THREE.CylinderGeometry(0.06, 0.1, 1.9, 5), m: MX(-0.7, 3.2, 0.2, 0.2, 0, 1.0), color: 0x54463a },
    { geo: new THREE.CylinderGeometry(0.05, 0.09, 1.5, 5), m: MX(0.1, 4.2, -0.5, -0.9, 0, 0.1), color: 0x54463a },
  ]);
  const dead = scatter(110, (x, z, h) => h > WATER_Y + 1 && moist(x, z) < 0.55 && !nearZone(x, z, 1.1) && offRoad(x, z)).map((p) => ({ x: p.x, y: p.h - 0.1, z: p.z, ry: rand(0, 6.28), s: rand(0.8, 1.5), color: gray() }));
  instanced(dg, new THREE.MeshLambertMaterial({ vertexColors: true }), dead, true);
  dead.forEach((c) => addCircle(c.x, c.z, 0.4 * c.s));

  // Grüne Bäume (Pappeln) in feuchten Gebieten
  const tg = mergeParts([
    { geo: new THREE.CylinderGeometry(0.3, 0.5, 4, 6), m: MX(0, 2, 0), color: 0x5a4632 },
    { geo: new THREE.IcosahedronGeometry(2.6, 1), m: MX(0, 5.6, 0, 0, 0, 0, 1, 0.9, 1), color: 0x5d7a2e },
    { geo: new THREE.IcosahedronGeometry(1.9, 1), m: MX(1.6, 4.6, 0.6), color: 0x6c8b36 },
    { geo: new THREE.IcosahedronGeometry(1.8, 1), m: MX(-1.4, 4.9, -0.7), color: 0x527028 },
  ]);
  const trees = scatter(200, (x, z, h) => h > WATER_Y + 0.5 && h < 26 && moist(x, z) > 0.53 && !nearZone(x, z, 1.05) && offRoad(x, z)).map((p) => ({ x: p.x, y: p.h - 0.2, z: p.z, ry: rand(0, 6.28), s: rand(0.9, 1.6), color: gray() }));
  const trees2 = scatter(50, (x, z, h) => h > WATER_Y + 0.5 && Math.hypot(x - LAKES[0].x, z - LAKES[0].z) < 85 && Math.hypot(x - LAKES[0].x, z - LAKES[0].z) > 50 && h < 14).map((p) => ({ x: p.x, y: p.h - 0.2, z: p.z, ry: rand(0, 6.28), s: rand(1, 1.6), color: gray() }));
  const allTrees = trees.concat(trees2);
  instanced(tg, new THREE.MeshLambertMaterial({ vertexColors: true }), allTrees, true);
  allTrees.forEach((c) => addCircle(c.x, c.z, 0.55 * c.s));

  // Felsen
  const rocks = scatter(420, (x, z, h) => h > WATER_Y - 1 && !nearZone(x, z, 1.0) && (offRoad(x, z) || Math.random() < 0.1)).map((p) => {
    const s = Math.random() < 0.12 ? rand(2.5, 6) : rand(0.5, 1.8);
    const v = irand(0x70, 0xb0), warm = irand(0, 30);
    return { x: p.x, y: p.h + s * 0.15, z: p.z, rx: rand(0, 3), ry: rand(0, 6), rz: rand(0, 3), sx: s * rand(0.8, 1.4), sy: s * rand(0.5, 1), sz: s * rand(0.8, 1.4), color: ((v + warm) << 16) | ((v - 10 + warm / 2) << 8) | (v - 25), r: s };
  });
  instanced(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), rocks, true);
  rocks.forEach((r) => { if (r.r > 1.4) addCircle(r.x, r.z, r.r * 0.85); });

  // Büsche
  const bushes = scatter(700, (x, z, h) => h > WATER_Y + 0.5 && !nearZone(x, z, 0.8)).map((p) => {
    const g = Math.random() < 0.5;
    return { x: p.x, y: p.h + 0.15, z: p.z, ry: rand(0, 6), sx: rand(0.7, 1.5), sy: rand(0.5, 1), sz: rand(0.7, 1.5), color: g ? 0x6d7d3d : 0x9a7a4a };
  });
  instanced(new THREE.IcosahedronGeometry(0.6, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), bushes, false);

  // Grasbüschel
  const blades = [];
  for (let i = 0; i < 4; i++) blades.push({ geo: new THREE.ConeGeometry(0.06, rand(0.5, 0.9), 3, 1, true), m: MX(rand(-0.2, 0.2), 0.35, rand(-0.2, 0.2), rand(-0.3, 0.3), 0, rand(-0.3, 0.3)), color: 0xffffff });
  const tuft = mergeParts(blades);
  const tufts = scatter(4500, (x, z, h) => h > WATER_Y + 0.4 && moist(x, z) > 0.42 && roadDist(x, z) > 3 && !nearZone(x, z, 0.55)).map((p) => {
    const m = moist(p.x, p.z), gg = m > 0.55;
    return { x: p.x, y: p.h, z: p.z, ry: rand(0, 6), s: rand(0.7, 1.7), color: gg ? (Math.random() < 0.5 ? 0x7d9a3c : 0x8aa646) : (Math.random() < 0.5 ? 0xb69a5a : 0xa88a4c) };
  });
  instanced(tuft, new THREE.MeshLambertMaterial({ vertexColors: true }), tufts, false);
}

// ---------- Dichtes Gras um den Spieler (wird laufend nachgeführt) ----------
const GP = { N: 4600, mesh: null, cx: 1e9, cz: 1e9, job: null, CELL: 1.5, R: 46 };
function hash2(a, b) { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function initGrassPatch() {
  const blades = [];
  for (let i = 0; i < 5; i++) blades.push({ geo: new THREE.ConeGeometry(0.055, 0.75 + (i % 3) * 0.15, 3, 1, true), m: MX((i - 2) * 0.09, 0.4, ((i * 7) % 5 - 2) * 0.07, ((i * 3) % 5 - 2) * 0.12, i, ((i * 5) % 5 - 2) * 0.12), color: 0xffffff });
  GP.mesh = new THREE.InstancedMesh(mergeParts(blades), new THREE.MeshLambertMaterial({ vertexColors: true }), GP.N);
  GP.mesh.frustumCulled = false; GP.mesh.receiveShadow = true;
  const d = new THREE.Object3D(); d.scale.setScalar(0); d.updateMatrix();
  for (let i = 0; i < GP.N; i++) GP.mesh.setMatrixAt(i, d.matrix);
  GP.mesh.setColorAt(0, new THREE.Color(0x7d9a3c));
  scene.add(GP.mesh);
  GP.d = d; GP.c = new THREE.Color();
}
function updateGrassPatch(px, pz) {
  if (!GP.mesh) return;
  if (!GP.job && Math.hypot(px - GP.cx, pz - GP.cz) > 14) {
    GP.job = { cx: px, cz: pz, i: 0, k: 0, n: Math.ceil(GP.R * 2 / GP.CELL), ox: Math.floor((px - GP.R) / GP.CELL), oz: Math.floor((pz - GP.R) / GP.CELL) };
  }
  const j = GP.job; if (!j) return;
  const total = j.n * j.n, end = Math.min(total, j.i + 650);
  for (; j.i < end && j.k < GP.N; j.i++) {
    const ix = j.ox + (j.i % j.n), iz = j.oz + Math.floor(j.i / j.n);
    const h1 = hash2(ix, iz), h2 = hash2(iz + 17, ix - 31);
    const x = (ix + h1) * GP.CELL, z = (iz + h2) * GP.CELL;
    if (Math.hypot(x - j.cx, z - j.cz) > GP.R) continue;
    const m = moist(x, z);
    if (m < 0.36 + h1 * 0.1) continue;
    const y = heightAt(x, z);
    if (y < WATER_Y + 0.4 || roadDist(x, z) < 2.6 || nearZone(x, z, 0.62)) continue;
    const s = 0.42 + h2 * 0.5;
    GP.d.position.set(x, y, z); GP.d.rotation.set(0, h1 * 6.28, 0); GP.d.scale.set(s, s * (0.8 + h1 * 0.6), s); GP.d.updateMatrix();
    GP.mesh.setMatrixAt(j.k, GP.d.matrix);
    const g = m > 0.55; GP.c.setHex(g ? (h1 < 0.5 ? 0x86a542 : 0x6f8e34) : (h1 < 0.5 ? 0xbea25c : 0xa98b4d)); GP.mesh.setColorAt(j.k, GP.c);
    j.k++;
  }
  GP.mesh.instanceMatrix.needsUpdate = true; GP.mesh.instanceColor.needsUpdate = true;
  if (j.i >= total) {
    GP.d.scale.setScalar(0); GP.d.updateMatrix();
    for (let k = j.k; k < GP.N; k++) GP.mesh.setMatrixAt(k, GP.d.matrix);
    GP.cx = j.cx; GP.cz = j.cz; GP.job = null;
  }
}

// ---------- Gebäude & Requisiten ----------
const updatables = [];
const POIS = [];
function woodMat(c) { return new THREE.MeshLambertMaterial({ color: c, map: WOOD }); }
function addMesh(parent, geo, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  parent.add(m); return m;
}
function buildStorefront(o) {
  const g = new THREE.Group();
  const y0 = heightAt(o.x, o.z);
  g.position.set(o.x, y0, o.z); g.rotation.y = o.rot || 0;
  const w = o.w, d = o.d, h = o.h;
  const mat = woodMat(o.color);
  addMesh(g, boxGeo(w, h, d), mat, 0, h / 2, 0);
  addMesh(g, boxGeo(w + 0.3, h + 1.9, 0.35), mat, 0, (h + 1.9) / 2, d / 2 + 0.12);
  addMesh(g, new THREE.BoxGeometry(w + 0.7, 0.28, d + 0.6), lam(0x4a3a2c), 0, h + 0.12, 0);
  const sw = Math.min(w - 1, 8);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw * 0.16 + 0.4), new THREE.MeshLambertMaterial({ map: signTex(o.sign, o.signBg, o.signFg) }));
  sign.position.set(0, h + 0.9, d / 2 + 0.31); g.add(sign);
  // Veranda
  const pd = 2.6;
  addMesh(g, new THREE.BoxGeometry(w, 0.3, pd), woodMat(0x7a5c3c), 0, 0.15, d / 2 + pd / 2);
  for (const px of [-w / 2 + 0.25, w / 2 - 0.25, -w / 6, w / 6]) addMesh(g, new THREE.CylinderGeometry(0.1, 0.12, 3.6, 6), lam(0x5b4330), px, 2.1, d / 2 + pd - 0.2);
  const pr = addMesh(g, new THREE.BoxGeometry(w + 0.3, 0.16, pd + 0.4), lam(0x4a3a2c), 0, 3.85, d / 2 + pd / 2);
  pr.rotation.x = 0.06;
  // Tür und Fenster
  addMesh(g, new THREE.BoxGeometry(1.3, 2.5, 0.12), lam(0x2b1d12), 0, 1.4, d / 2 + 0.05, false);
  const winPos = w > 9 ? [-w / 3, w / 3] : [-w / 3.2, w / 3.2];
  for (const wx of winPos) {
    addMesh(g, new THREE.BoxGeometry(1.5, 1.6, 0.12), WINDOW_MAT, wx, 1.9, d / 2 + 0.05, false);
    addMesh(g, new THREE.BoxGeometry(1.7, 0.12, 0.16), lam(0x2b1d12), wx, 1.06, d / 2 + 0.08, false);
  }
  if (o.floors === 2) {
    for (const wx of [-w / 3, 0, w / 3]) addMesh(g, new THREE.BoxGeometry(1.2, 1.6, 0.12), WINDOW_MAT, wx, h - 1.9, d / 2 + 0.05, false);
    addMesh(g, new THREE.BoxGeometry(w * 0.9, 0.12, 1.6), woodMat(0x6d5233), 0, h - 3.3, d / 2 + 0.9);
    for (let i = -4; i <= 4; i++) addMesh(g, new THREE.BoxGeometry(0.07, 0.8, 0.07), lam(0x3a2a1b), i * w * 0.1, h - 2.85, d / 2 + 1.65, false);
  }
  scene.add(g);
  addBox(o.x - w / 2, o.x + w / 2, o.z - d / 2, o.z + d / 2, y0 + h + 2);
  return g;
}
function buildGableHouse(o) {
  const g = new THREE.Group();
  const y0 = heightAt(o.x, o.z);
  g.position.set(o.x, y0, o.z); g.rotation.y = o.rot || 0;
  const { w, d, h } = o;
  addMesh(g, boxGeo(w, h, d), woodMat(o.color), 0, h / 2, 0);
  const rh = o.roofH || 2.4, sy = rh / 1.5, sx = (w + 1.2) / 1.732;
  const rg = new THREE.CylinderGeometry(1, 1, d + 1, 3); rg.rotateX(-Math.PI / 2);
  const roof = addMesh(g, rg, lam(o.roofColor || 0x5b3a2a), 0, h + 0.5 * sy - 0.05, 0);
  roof.scale.set(sx, sy, 1);
  addMesh(g, new THREE.BoxGeometry(1.2, 2.3, 0.12), lam(0x2b1d12), 0, 1.2, d / 2 + 0.03, false);
  for (const wx of [-w / 3, w / 3]) addMesh(g, new THREE.BoxGeometry(1.2, 1.2, 0.12), WINDOW_MAT, wx, 1.9, d / 2 + 0.03, false);
  addMesh(g, new THREE.BoxGeometry(0.7, 2.6, 0.7), lam(0x6b5a4c), w / 3, h + 1.4, -d / 4);
  scene.add(g);
  addBox(o.x - (o.rot ? d : w) / 2, o.x + (o.rot ? d : w) / 2, o.z - (o.rot ? w : d) / 2, o.z + (o.rot ? w : d) / 2, y0 + h + 2);
}
function buildBarrel(x, z, s = 1) {
  const y = heightAt(x, z);
  const m = addMesh(scene, new THREE.CylinderGeometry(0.42 * s, 0.38 * s, 0.9 * s, 10), woodMat(0x7a5232), x, y + 0.45 * s, z);
  addMesh(scene, new THREE.CylinderGeometry(0.435 * s, 0.435 * s, 0.06, 10), lam(0x2e2a26), x, y + 0.2 * s, z, false);
  addMesh(scene, new THREE.CylinderGeometry(0.435 * s, 0.435 * s, 0.06, 10), lam(0x2e2a26), x, y + 0.7 * s, z, false);
  addCircle(x, z, 0.45 * s); return m;
}
function buildCrate(x, z, s = 1, rot = 0) {
  const y = heightAt(x, z);
  const m = addMesh(scene, boxGeo(0.9 * s, 0.9 * s, 0.9 * s, 1.5), woodMat(0x8a6a44), x, y + 0.45 * s, z);
  m.rotation.y = rot; addCircle(x, z, 0.6 * s); return m;
}
function buildHitchPost(x, z, rot = 0) {
  const y = heightAt(x, z), g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = rot;
  for (const px of [-1.6, 1.6]) addMesh(g, new THREE.CylinderGeometry(0.09, 0.11, 1.4, 6), lam(0x4d3a28), px, 0.7, 0);
  addMesh(g, new THREE.BoxGeometry(3.4, 0.12, 0.12), lam(0x4d3a28), 0, 1.25, 0);
  scene.add(g);
}
function buildTrough(x, z, rot = 0) {
  const y = heightAt(x, z);
  const m = addMesh(scene, boxGeo(2.6, 0.7, 0.8, 1.5), woodMat(0x6b4c30), x, y + 0.35, z);
  m.rotation.y = rot; addCircle(x, z, 0.9);
  const w = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.55), new THREE.MeshPhongMaterial({ color: 0x3a6a80 }));
  w.rotation.x = -Math.PI / 2; w.position.set(x, y + 0.66, z); w.rotation.z = rot; scene.add(w);
}
function buildLamp(x, z) {
  const y = heightAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  addMesh(g, new THREE.CylinderGeometry(0.07, 0.1, 3.4, 6), lam(0x222222), 0, 1.7, 0);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0x555544 });
  addMesh(g, new THREE.BoxGeometry(0.34, 0.44, 0.34), lampMat, 0, 3.5, 0, false);
  updatables.push(() => lampMat.color.setRGB(lerp(0.25, 1, nightFactor), lerp(0.22, 0.75, nightFactor), lerp(0.18, 0.35, nightFactor)));
  scene.add(g); addCircle(x, z, 0.15);
}
function buildFence(ax, az, bx, bz, color = 0x6b5039) {
  const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 2.4));
  const parts = [], ang = Math.atan2(bx - ax, bz - az);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = heightAt(x, z);
    parts.push({ geo: new THREE.BoxGeometry(0.14, 1.3, 0.14), m: MX(x, y + 0.65, z), color });
    if (i < n) {
      const mx = ax + (bx - ax) * (t + 0.5 / n), mz = az + (bz - az) * (t + 0.5 / n), my = heightAt(mx, mz);
      for (const hy of [0.45, 0.95]) parts.push({ geo: new THREE.BoxGeometry(0.06, 0.1, len / n), m: MX(mx, my + hy, mz, 0, ang), color });
    }
    addCircle(x, z, 0.3);
    if (i < n) addCircle(ax + (bx - ax) * (t + 0.5 / n), az + (bz - az) * (t + 0.5 / n), 0.3);
  }
  const m = new THREE.Mesh(mergeParts(parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.castShadow = true; m.receiveShadow = true; scene.add(m);
}
function buildWindmill(x, z) {
  const y = heightAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  addMesh(g, new THREE.CylinderGeometry(0.7, 1.4, 12, 6), woodMat(0x8a7a66), 0, 6, 0);
  addMesh(g, new THREE.BoxGeometry(1.2, 1.2, 2), lam(0x4a4a4a), 0, 12.3, 0.5);
  const rotor = new THREE.Group(); rotor.position.set(0, 12.3, 1.6); g.add(rotor);
  for (let i = 0; i < 8; i++) {
    const b = addMesh(rotor, new THREE.BoxGeometry(0.5, 3.6, 0.05), lam(i % 2 ? 0xc9c0b0 : 0xa89e8e), 0, 0, 0, false);
    b.geometry.translate(0, 2.1, 0); b.rotation.z = i * Math.PI / 4;
  }
  updatables.push((dt) => { rotor.rotation.z += dt * (0.8 + 0.5 * Math.sin(performance.now() * 0.0003)); });
  scene.add(g); addCircle(x, z, 1.5);
}
function buildWaterTower(x, z) {
  const y = heightAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) addMesh(g, new THREE.CylinderGeometry(0.15, 0.2, 9, 6), lam(0x4d3a28), dx, 4.5, dz);
  addMesh(g, new THREE.BoxGeometry(5, 0.3, 5), woodMat(0x5b4330), 0, 9, 0);
  addMesh(g, new THREE.CylinderGeometry(2.2, 2.2, 3.4, 12), woodMat(0x6b4c30), 0, 10.9, 0);
  addMesh(g, new THREE.ConeGeometry(2.5, 1.4, 12), lam(0x3a2c20), 0, 13.3, 0);
  scene.add(g); addCircle(x, z, 3);
}
function buildChurch(x, z, rot) {
  buildStorefront({ x, z, rot, w: 10, d: 15, h: 6, color: 0xe6dcc6, sign: 'KIRCHE', signBg: '#e6dcc6', signFg: '#5a3a1a', floors: 1 });
  const g = new THREE.Group(); g.position.set(x, heightAt(x, z), z); g.rotation.y = rot;
  addMesh(g, boxGeo(3.2, 5, 3.2), woodMat(0xe6dcc6), 0, 8.5, 0);
  addMesh(g, new THREE.ConeGeometry(2.4, 4.5, 4), lam(0x4a3a2c), 0, 13.2, 0).rotation.y = Math.PI / 4;
  addMesh(g, new THREE.BoxGeometry(0.15, 1.8, 0.15), lam(0x2b1d12), 0, 16.4, 0);
  addMesh(g, new THREE.BoxGeometry(1, 0.15, 0.15), lam(0x2b1d12), 0, 16.7, 0);
  scene.add(g);
}
function buildGallows(x, z) {
  const y = heightAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  addMesh(g, new THREE.BoxGeometry(5, 0.8, 3), woodMat(0x6b4c30), 0, 0.4, 0);
  addMesh(g, new THREE.BoxGeometry(0.3, 4.4, 0.3), lam(0x4d3a28), -2, 3, 0);
  addMesh(g, new THREE.BoxGeometry(4.6, 0.3, 0.3), lam(0x4d3a28), 0, 5.1, 0);
  addMesh(g, new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4), lam(0x9a8a60), 1.4, 4.2, 0);
  scene.add(g); addBox(x - 2.5, x + 2.5, z - 1.5, z + 1.5, y + 5);
}
function buildTent(x, z, rot, color) {
  const y = heightAt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const geo = new THREE.CylinderGeometry(1, 1, 4.2, 3); geo.rotateX(-Math.PI / 2);
  const t = addMesh(g, geo, lam(color), 0, 0.95, 0); t.scale.set(1.7, 1.2, 1);
  scene.add(g); addCircle(x, z, 2.1);
}
function buildCampfire(x, z) {
  const y = heightAt(x, z);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, m = addMesh(scene, new THREE.CylinderGeometry(0.09, 0.09, 1.1, 5), lam(0x3a2a1b), x + Math.cos(a) * 0.35, y + 0.3, z + Math.sin(a) * 0.35);
    m.rotation.z = Math.cos(a) * 0.9; m.rotation.x = Math.sin(a) * 0.9;
  }
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; addMesh(scene, new THREE.DodecahedronGeometry(0.2, 0), lam(0x6a6a6a), x + Math.cos(a) * 0.85, y + 0.1, z + Math.sin(a) * 0.85, false); }
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: 0.9 });
  const flame = addMesh(scene, new THREE.ConeGeometry(0.34, 1.0, 7), flameMat, x, y + 0.7, z, false);
  const flame2 = addMesh(scene, new THREE.ConeGeometry(0.2, 0.7, 6), new THREE.MeshBasicMaterial({ color: 0xffe07a }), x, y + 0.55, z, false);
  const light = new THREE.PointLight(0xff8a30, 1.4, 34, 1.6);
  light.position.set(x, y + 1.4, z); scene.add(light);
  addCircle(x, z, 0.9);
  updatables.push(() => {
    const f = 0.85 + Math.random() * 0.3;
    flame.scale.set(f, 0.8 + Math.random() * 0.5, f); flame2.scale.set(f, 0.8 + Math.random() * 0.5, f);
    light.intensity = (0.6 + nightFactor * 1.2) * f;
  });
}
function buildWatchtower(x, z) {
  const y = heightAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) addMesh(g, new THREE.CylinderGeometry(0.2, 0.25, 8, 6), lam(0x5a4632), dx, 4, dz);
  addMesh(g, boxGeo(4.4, 0.3, 4.4), woodMat(0x6b4c30), 0, 8, 0);
  addMesh(g, boxGeo(4.4, 1.1, 0.2), woodMat(0x6b4c30), 0, 8.7, 2.1);
  addMesh(g, boxGeo(4.4, 1.1, 0.2), woodMat(0x6b4c30), 0, 8.7, -2.1);
  addMesh(g, new THREE.ConeGeometry(3.4, 1.8, 4), lam(0x3a2c20), 0, 11, 0).rotation.y = Math.PI / 4;
  for (const [dx, dz] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) addMesh(g, new THREE.CylinderGeometry(0.1, 0.1, 2.2, 5), lam(0x5a4632), dx, 9.2, dz);
  scene.add(g); addCircle(x, z, 2.4);
}
function buildPalisade(c) {
  const half = 26, items = [];
  const gate = (x, z) => z > c.z + half - 1 && Math.abs(x - c.x) < 5;
  for (let s = -half; s <= half; s += 1.6) {
    for (const [x, z] of [[c.x + s, c.z - half], [c.x + s, c.z + half], [c.x - half, c.z + s], [c.x + half, c.z + s]]) {
      if (gate(x, z)) continue;
      const y = heightAt(x, z), h = rand(4.6, 5.6);
      items.push({ x, y: y + h / 2 - 0.4, z, sy: h, ry: rand(0, 3) });
      addCircle(x, z, 0.62);
    }
  }
  const g = new THREE.CylinderGeometry(0.42, 0.5, 1, 7);
  instanced(g, new THREE.MeshLambertMaterial({ color: 0x7a5c3c, map: WOOD }), items.map((i) => Object.assign(i, { color: irand(0xb0, 0xff) * 0x010101 })), true);
  instanced(new THREE.ConeGeometry(0.42, 0.9, 7), lam(0x6a4e30), items.map((i) => ({ x: i.x, y: i.y + i.sy / 2 + 0.3, z: i.z })), true);
  buildWatchtower(c.x - half + 1, c.z - half + 1);
  buildWatchtower(c.x + half - 1, c.z - half + 1);
  buildWatchtower(c.x - half + 1, c.z + half - 1);
  buildWatchtower(c.x + half - 1, c.z + half - 1);
  buildGableHouse({ x: c.x, z: c.z - 12, rot: 0, w: 12, d: 8, h: 4.2, color: 0x6d4f36, roofColor: 0x3a2c20, roofH: 3 });
}
function buildCamp(c, idx) {
  buildCampfire(c.x, c.z);
  const colors = [0xb8a67c, 0x9a8a68, 0x8a7a5a, 0xc0b08a];
  const nt = c.fort ? 5 : 4;
  for (let i = 0; i < nt; i++) {
    const a = i / nt * Math.PI * 2 + 0.4, r = c.fort ? 15 : 12;
    const tx = c.x + Math.cos(a) * r, tz = c.z + Math.sin(a) * r;
    if (c.fort && Math.abs(tx - c.x) < 8 && tz < c.z - 4) continue;
    buildTent(tx, tz, -a + Math.PI / 2, colors[i % colors.length]);
  }
  for (let i = 0; i < 6; i++) { const a = rand(0, 6.28), r = rand(4, 9); (i % 2 ? buildBarrel : buildCrate)(c.x + Math.cos(a) * r, c.z + Math.sin(a) * r); }
  // Bänke (Baumstämme) um das Feuer
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.5, lx = c.x + Math.cos(a) * 3.2, lz = c.z + Math.sin(a) * 3.2;
    const m = addMesh(scene, new THREE.CylinderGeometry(0.28, 0.28, 2.2, 7), lam(0x5a4632), lx, heightAt(lx, lz) + 0.28, lz);
    m.rotation.z = Math.PI / 2; m.rotation.y = -a + Math.PI / 2;
  }
  if (c.fort) buildPalisade(c);
  POIS.push({ type: 'camp', x: c.x, z: c.z, name: c.name });
}
function buildHomestead() {
  const h = HOME;
  buildGableHouse({ x: h.x, z: h.z, rot: 0.3, w: 9, d: 7, h: 3.6, color: 0xc9b48a, roofColor: 0x5b3a2a });
  buildGableHouse({ x: h.x + 22, z: h.z - 6, rot: -0.5, w: 13, d: 9, h: 5.5, color: 0x8f3b2c, roofColor: 0x3a2c20, roofH: 3.6 });
  buildWindmill(h.x - 16, h.z + 8);
  buildFence(h.x - 30, h.z - 22, h.x + 40, h.z - 22);
  buildFence(h.x + 40, h.z - 22, h.x + 40, h.z + 26);
  buildFence(h.x + 40, h.z + 26, h.x - 30, h.z + 26);
  buildFence(h.x - 30, h.z + 26, h.x - 30, h.z - 22);
  for (let i = 0; i < 4; i++) { const hx = h.x + 8 + i * 3.4, hz = h.z + 14; addMesh(scene, new THREE.ConeGeometry(1.5, 2.6, 8), lam(0xd8b850), hx, heightAt(hx, hz) + 1.3, hz); addCircle(hx, hz, 1.4); }
  buildTrough(h.x + 6, h.z - 8, 0.4);
  POIS.push({ type: 'farm', x: h.x, z: h.z, name: HOME.name });
}
function buildTown() {
  const st = (o) => buildStorefront(o);
  // Nordseite (Front zeigt nach +z)
  st({ x: -36, z: -16.6, rot: 0, w: 14, d: 11, h: 7.6, color: 0xa8683a, sign: 'SALOON', signBg: '#4a1a12', signFg: '#f2d9a0', floors: 2 });
  st({ x: -20.5, z: -16, rot: 0, w: 11, d: 10, h: 5.6, color: 0x9a7a52, sign: 'KRAMLADEN', signBg: '#2d4a2a', signFg: '#f0e6b0' });
  st({ x: -8.5, z: -16, rot: 0, w: 9, d: 10, h: 5.4, color: 0x7d6a55, sign: 'SHERIFF', signBg: '#2b2b2b', signFg: '#e8c76a' });
  st({ x: 3.5, z: -16.4, rot: 0, w: 10, d: 10, h: 6.4, color: 0xb59a76, sign: 'BANK', signBg: '#1f3a2a', signFg: '#e8d69a' });
  st({ x: 15.5, z: -16, rot: 0, w: 9, d: 10, h: 5.4, color: 0x8a6d58, sign: 'DOKTOR', signBg: '#e8e0cc', signFg: '#5a1a1a' });
  st({ x: 31, z: -16.8, rot: 0, w: 14, d: 11, h: 7.8, color: 0xb0956e, sign: 'HOTEL', signBg: '#3a2a4a', signFg: '#f0e0b0', floors: 2 });
  // Südseite (Front zeigt nach -z)
  st({ x: -36, z: 17, rot: Math.PI, w: 16, d: 12, h: 6.2, color: 0x8a5a3a, sign: 'MIETSTALL', signBg: '#3a2a18', signFg: '#e8d69a' });
  st({ x: -22, z: 16, rot: Math.PI, w: 9, d: 10, h: 5.2, color: 0x9a8064, sign: 'BARBIER', signBg: '#1a2f4a', signFg: '#f0e6d0' });
  st({ x: -11, z: 16, rot: Math.PI, w: 9, d: 10, h: 5.2, color: 0x6d5a48, sign: 'BESTATTER', signBg: '#111111', signFg: '#cccccc' });
  st({ x: 0, z: 16, rot: Math.PI, w: 9, d: 10, h: 5.4, color: 0xa08a68, sign: 'TELEGRAF', signBg: '#3a3a1a', signFg: '#f0e6b0' });
  st({ x: 11.5, z: 16.4, rot: Math.PI, w: 10, d: 10, h: 5.8, color: 0x8f4a32, sign: 'WAFFEN', signBg: '#2a1a1a', signFg: '#e8c76a' });
  buildChurch(38, 30, Math.PI);
  buildGallows(50, -6);
  buildWaterTower(-58, -22);
  // Wohnhäuser am Stadtrand
  buildGableHouse({ x: -62, z: 12, rot: 1.4, w: 8, d: 6, h: 3.4, color: 0xb59a76 });
  buildGableHouse({ x: -60, z: 28, rot: 1.7, w: 7, d: 6, h: 3.4, color: 0x9a8064 });
  buildGableHouse({ x: 60, z: 16, rot: -1.5, w: 8, d: 7, h: 3.6, color: 0xa08a68 });
  buildGableHouse({ x: 62, z: -28, rot: -1.6, w: 7, d: 6, h: 3.4, color: 0x8f6d50 });
  // Straßenmöbel
  for (let x = -40; x <= 40; x += 20) { buildLamp(x, -9.3); buildLamp(x + 10, 9.3); }
  for (const x of [-32, -16, -4, 8, 20, 34]) buildHitchPost(x, -7.6, 0);
  for (const x of [-30, -16, -5, 6, 16]) buildHitchPost(x, 7.6, 0);
  buildTrough(-27, -7.2); buildTrough(12, 7.4);
  for (const [x, z] of [[-45, -10.5], [-44, -9.5], [22, -10.6], [-25, 10.5], [5, 10.6], [24, 10.6]]) buildBarrel(x, z);
  for (const [x, z] of [[-13, -10.5], [-12.4, -10.6], [-26, -10.4]]) buildCrate(x, z, 1, rand(0, 3));
  // Brunnen
  const wy = heightAt(0, 0);
  addMesh(scene, new THREE.CylinderGeometry(1.4, 1.5, 1.0, 12), lam(0x8a8a86), 0, wy + 0.5, 0);
  addMesh(scene, new THREE.CylinderGeometry(1.15, 1.15, 0.05, 12), new THREE.MeshPhongMaterial({ color: 0x2a5a70 }), 0, wy + 0.95, 0, false);
  for (const sx of [-1.2, 1.2]) addMesh(scene, new THREE.BoxGeometry(0.16, 2.6, 0.16), lam(0x4d3a28), sx, wy + 2.2, 0);
  addMesh(scene, new THREE.BoxGeometry(3, 0.16, 0.16), lam(0x4d3a28), 0, wy + 3.4, 0);
  addCircle(0, 0, 1.6);
  // Zaun am Ortsrand
  buildFence(-70, -30, -70, 40); buildFence(-56, 42, -20, 46);
  // Friedhof
  const crosses = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) crosses.push({ x: 48 + i * 3.5, y: heightAt(48 + i * 3.5, 40 + j * 3.5) + 0.7, z: 40 + j * 3.5, ry: rand(-0.2, 0.2) });
  instanced(mergeParts([{ geo: new THREE.BoxGeometry(0.14, 1.4, 0.14), color: 0x6b5a48 }, { geo: new THREE.BoxGeometry(0.7, 0.14, 0.14), m: MX(0, 0.3, 0), color: 0x6b5a48 }]), new THREE.MeshLambertMaterial({ vertexColors: true }), crosses, true);
  POIS.push({ type: 'town', x: 0, z: 0, name: TOWN.name });
  POIS.push({ type: 'store', x: -20.5, z: -9.6, name: 'Kramladen' });
  POIS.push({ type: 'saloon', x: -36, z: -10.2, name: 'Saloon' });
  POIS.push({ type: 'gunsmith', x: 11.5, z: 9.4, name: 'Waffenhändler' });
  makeExplosiveBarrel(-47, -10); makeExplosiveBarrel(47, 9);
  POIS.push({ type: 'sheriff', x: -8.5, z: -9.6, name: 'Sheriff' });
}

// ---------- Tumbleweeds ----------
const tumble = [];
function buildTumbleweeds() {
  const geo = new THREE.IcosahedronGeometry(0.6, 1);
  const mat = new THREE.MeshBasicMaterial({ color: 0x8a6a3a, wireframe: true });
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.userData = { x: rand(-90, 90), z: rand(-60, 60), v: rand(2, 5) };
    scene.add(m); tumble.push(m);
  }
  updatables.push((dt) => {
    for (const t of tumble) {
      const u = t.userData;
      u.x += u.v * dt; u.z += Math.sin(u.x * 0.1) * dt * 1.2;
      if (u.x > 110) u.x = -110;
      t.position.set(u.x, heightAt(u.x, u.z) + 0.65 + Math.abs(Math.sin(u.x * 0.5)) * 0.25, u.z);
      t.rotation.z -= u.v * dt / 0.6; t.rotation.x += dt;
    }
  });
}

function buildWorld() {
  buildTerrain();
  buildNature();
  buildTown();
  CAMPS.forEach(buildCamp);
  buildHomestead();
  buildTumbleweeds();
  initGrassPatch();
}
