'use strict';
// ---------- Effekte, Figuren, Pferd, Tiere, KI, Sprengstoff ----------
const FX = { tracers: [], puffs: [], flash: null, flashT: 0 };
(function initFX() {
  const tg = new THREE.BoxGeometry(1, 1, 1); tg.translate(0, 0, 0.5);
  for (let i = 0; i < 50; i++) {
    const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.frustumCulled = false; m.userData.life = 0; scene.add(m); FX.tracers.push(m);
  }
  const pg = new THREE.IcosahedronGeometry(0.16, 1);
  for (let i = 0; i < 280; i++) {
    const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: 0xc9a66b, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.userData = { life: 0, v: new V3(), g: 0, max: 1 }; scene.add(m); FX.puffs.push(m);
  }
  FX.flash = new THREE.PointLight(0xffb060, 0, 22, 2); scene.add(FX.flash);
})();
let _ti = 0, _pi = 0;
function spawnTracer(a, b, color = 0xffe9a0, life = 0.09) {
  const m = FX.tracers[_ti++ % FX.tracers.length];
  const len = a.distanceTo(b);
  m.position.copy(a); m.lookAt(b); m.scale.set(0.035, 0.035, len);
  m.material.color.setHex(color); m.material.opacity = 0.9; m.visible = true; m.userData.life = life; m.userData.max = life;
}
function spawnPuff(p, color, n = 5, spread = 1.5, up = 1.5, grav = 3, size = 1, life = 0) {
  for (let i = 0; i < n; i++) {
    const m = FX.puffs[_pi++ % FX.puffs.length];
    m.position.copy(p); m.material.color.setHex(color); m.material.opacity = 0.85; m.visible = true;
    m.userData.v.set(rand(-spread, spread), rand(0, up), rand(-spread, spread));
    m.userData.g = grav; m.userData.life = m.userData.max = life || rand(0.4, 0.8); m.userData.size = size; m.scale.setScalar(size);
  }
}
function muzzleFlash(p) { FX.flash.position.copy(p); FX.flash.distance = 22; FX.flash.intensity = 4; FX.flashT = 0.07; }
function explosionFX(p, r) {
  spawnPuff(p, 0xff7a18, 16, r * 0.5, r * 0.5, -1.5, 8, 0.7);
  spawnPuff(p, 0xffd060, 8, r * 0.3, r * 0.4, -1, 5, 0.5);
  spawnPuff(p, 0x4a4a4a, 18, r * 0.45, r * 0.7, -0.8, 11, 1.5);
  spawnPuff(p, 0xc9a66b, 16, r * 0.9, r * 0.35, 4, 7, 1.1);
  FX.flash.position.copy(p); FX.flash.distance = 70; FX.flash.intensity = 14; FX.flashT = 0.22;
}
function updateFX(dt) {
  for (const m of FX.tracers) if (m.visible) { m.userData.life -= dt; m.material.opacity = Math.max(0, m.userData.life / m.userData.max) * 0.9; if (m.userData.life <= 0) m.visible = false; }
  for (const m of FX.puffs) if (m.visible) {
    const u = m.userData; u.life -= dt;
    u.v.y -= u.g * dt; m.position.addScaledVector(u.v, dt); u.v.multiplyScalar(1 - dt * 0.8);
    m.material.opacity = Math.max(0, u.life / u.max) * 0.85;
    m.scale.setScalar(u.size * (1 + (1 - u.life / u.max) * 1.4));
    if (u.life <= 0) m.visible = false;
  }
  if (FX.flashT > 0) { FX.flashT -= dt; if (FX.flashT <= 0) FX.flash.intensity = 0; }
}

// ---------- Menschen-Modell (runde Formen, Gesicht, Hut, Holster) ----------
function makeHumanoid(o) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const skin = o.skin || 0xd9a877;
  const legs = [], arms = [];
  const legMat = lam(o.pants || 0x3a4a5a), bootMat = lam(0x2a1c14), shirt = lam(o.shirt || 0x8a4a3a), dark = lam(0x1a120c);
  const cyl = (rt, rb, h, seg = 9) => new THREE.CylinderGeometry(rt, rb, h, seg);
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.12, 0.93, 0); g.add(leg);
    addMesh(leg, cyl(0.105, 0.078, 0.62), legMat, 0, -0.31, 0);
    addMesh(leg, cyl(0.078, 0.07, 0.3), legMat, 0, -0.68, 0);
    addMesh(leg, cyl(0.085, 0.1, 0.32), bootMat, 0, -0.78, 0);
    addMesh(leg, new THREE.BoxGeometry(0.15, 0.1, 0.3), bootMat, 0, -0.9, 0.06);
    legs.push(leg);
  }
  let m = addMesh(g, cyl(0.235, 0.24, 0.22, 10), legMat, 0, 0.97, 0); m.scale.z = 0.75;
  m = addMesh(g, cyl(0.27, 0.235, 0.6, 10), shirt, 0, 1.3, 0); m.scale.z = 0.72;
  m = addMesh(g, cyl(0.245, 0.245, 0.07, 10), dark, 0, 1.0, 0); m.scale.z = 0.75;
  addMesh(g, new THREE.BoxGeometry(0.07, 0.06, 0.03), lam(0xd8b040), 0, 1.0, 0.185, false);
  addMesh(g, new THREE.BoxGeometry(0.09, 0.22, 0.12), lam(0x4a2e1a), 0.27, 0.86, 0.02, false);
  if (o.vest) { m = addMesh(g, cyl(0.28, 0.245, 0.48, 10), lam(o.vest), 0, 1.32, 0); m.scale.set(1, 1, 0.76); }
  if (o.coat) { m = addMesh(g, cyl(0.29, 0.4, 0.95, 10), lam(o.coat), 0, 0.82, -0.01); m.scale.z = 0.72; }
  if (o.badge) addMesh(g, new THREE.CylinderGeometry(0.05, 0.05, 0.02, 5), lam(0xe8c040), 0.15, 1.44, 0.2, false).rotation.x = Math.PI / 2;
  addMesh(g, cyl(0.055, 0.06, 0.1), lam(skin), 0, 1.62, 0, false);
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.34, 1.54, 0); g.add(arm);
    addMesh(arm, new THREE.SphereGeometry(0.085, 8, 6), shirt, 0, 0, 0, false);
    addMesh(arm, cyl(0.068, 0.052, 0.56), shirt, 0, -0.28, 0);
    addMesh(arm, new THREE.SphereGeometry(0.058, 8, 6), lam(skin), 0, -0.6, 0, false);
    arms.push(arm);
  }
  const head = addMesh(g, new THREE.SphereGeometry(0.135, 12, 10), lam(skin), 0, 1.79, 0.005); head.scale.set(1, 1.18, 1.08);
  addMesh(g, new THREE.BoxGeometry(0.03, 0.02, 0.02), dark, -0.05, 1.82, 0.135, false);
  addMesh(g, new THREE.BoxGeometry(0.03, 0.02, 0.02), dark, 0.05, 1.82, 0.135, false);
  addMesh(g, new THREE.BoxGeometry(0.03, 0.05, 0.04), lam(skin), 0, 1.78, 0.145, false);
  if (o.stache) addMesh(g, new THREE.BoxGeometry(0.11, 0.025, 0.03), lam(o.hair || 0x2a1a10), 0, 1.735, 0.14, false);
  if (o.hair !== null) { m = addMesh(g, new THREE.SphereGeometry(0.14, 10, 8), lam(o.hair || 0x3a2818), 0, 1.84, -0.03, false); m.scale.set(1, 0.9, 1); }
  if (o.scarf) addMesh(g, cyl(0.1, 0.12, 0.1), lam(o.scarf), 0, 1.66, 0.01, false);
  if (o.mask) addMesh(g, new THREE.BoxGeometry(0.25, 0.11, 0.26), lam(o.mask), 0, 1.74, 0.01, false);
  if (o.hat !== undefined && o.hat !== null) {
    const brim = addMesh(g, cyl(0.36, 0.34, 0.03, 14), lam(o.hat), 0, 1.93, 0); brim.rotation.z = 0.05;
    addMesh(g, cyl(0.16, 0.2, 0.22, 12), lam(o.hat), 0, 2.03, 0);
    addMesh(g, cyl(0.203, 0.207, 0.04, 12), lam(o.band || 0x2a1a10), 0, 1.96, 0, false);
  }
  const gun = addMesh(arms[1], new THREE.BoxGeometry(0.06, 0.16, 0.3), lam(0x2a2a2e), 0, -0.62, 0.1, false);
  const rifle = addMesh(arms[1], new THREE.BoxGeometry(0.07, 0.1, 1.0), lam(0x5a3a22), 0, -0.55, 0.4, false);
  rifle.visible = false;
  return { g, legs, arms, gun, rifle };
}
function setLongGun(m, len, color) { m.rifle.scale.z = len; m.rifle.position.z = 0.15 + 0.25 * len; m.rifle.material = lam(color || 0x5a3a22); }

// ---------- Vierbeiner (Pferd, Hirsch, Kuh, Wolf) ----------
function makeQuad(o) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const body = lam(o.color), dark = lam(o.dark || 0x222222);
  const { bl, bw, bh, ll, lt = 0.16 } = o;
  const r0 = bh / 2;
  const trunkGeo = new THREE.CylinderGeometry(r0, r0 * 0.95, bl * 0.72, 12); trunkGeo.rotateX(Math.PI / 2);
  let m = addMesh(g, trunkGeo, body, 0, ll + r0, 0); m.scale.x = bw / bh;
  m = addMesh(g, new THREE.SphereGeometry(r0 * 1.02, 12, 10), body, 0, ll + r0, bl * 0.34); m.scale.x = bw / bh;
  m = addMesh(g, new THREE.SphereGeometry(r0 * 0.98, 12, 10), body, 0, ll + r0, -bl * 0.34); m.scale.x = bw / bh;
  const nl = o.nl, na = o.neckAngle === undefined ? 0.55 : o.neckAngle;
  const nb = new V3(0, ll + bh * 0.85, bl / 2 - 0.1);
  const neck = addMesh(g, new THREE.CylinderGeometry(bw * 0.2, bw * 0.3, nl, 8), body, nb.x, nb.y + nl / 2 * Math.cos(na), nb.z + nl / 2 * Math.sin(na));
  neck.rotation.x = na;
  const nt = new V3(0, nb.y + nl * Math.cos(na), nb.z + nl * Math.sin(na));
  const head = addMesh(g, new THREE.CylinderGeometry(bw * 0.17, bw * 0.24, o.hl, 8), o.headDark ? dark : body, 0, nt.y - 0.03, nt.z + o.hl * 0.34);
  head.rotation.x = Math.PI / 2 - 0.5; head.scale.x = 0.85;
  addMesh(g, new THREE.BoxGeometry(bw * 0.3, bw * 0.28, o.hl * 0.28), dark, 0, nt.y - o.hl * 0.34, nt.z + o.hl * 0.66, false);
  for (const s of [-1, 1]) {
    addMesh(g, new THREE.ConeGeometry(0.045, 0.16, 5), body, s * bw * 0.15, nt.y + bw * 0.24, nt.z + 0.02, false);
    addMesh(g, new THREE.SphereGeometry(0.03, 5, 4), lam(0x0a0a0a), s * bw * 0.2, nt.y - 0.02, nt.z + o.hl * 0.34, false);
  }
  if (o.mane) {
    const mn = addMesh(g, new THREE.BoxGeometry(0.06, nl * 0.95, 0.14), dark, 0, nb.y + nl / 2 * Math.cos(na) + 0.1, nb.z + nl / 2 * Math.sin(na) - bw * 0.22, false); mn.rotation.x = na;
  }
  if (o.antlers) for (const s of [-1, 1]) {
    const a = addMesh(g, new THREE.CylinderGeometry(0.015, 0.03, 0.7, 4), lam(0xd8cdb0), s * 0.12, nt.y + 0.4, nt.z + 0.08, false); a.rotation.z = -s * 0.45;
    const b = addMesh(g, new THREE.CylinderGeometry(0.012, 0.02, 0.4, 4), lam(0xd8cdb0), s * 0.26, nt.y + 0.55, nt.z + 0.08, false); b.rotation.z = s * 0.3;
  }
  const tl = o.tl || 0.6;
  const tail = addMesh(g, new THREE.CylinderGeometry(0.06, 0.02, tl, 6), o.tailDark ? dark : body, 0, ll + bh * 0.8 - tl / 2 * 0.8, -bl / 2 - 0.02, false);
  tail.rotation.x = -0.4;
  const legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = new THREE.Group(); leg.position.set(sx * bw * 0.34, ll + 0.05, sz * bl * 0.34); g.add(leg);
    addMesh(leg, new THREE.CylinderGeometry(lt * 0.9, lt * 0.55, ll * 0.55, 7), body, 0, -ll * 0.25, 0);
    addMesh(leg, new THREE.CylinderGeometry(lt * 0.5, lt * 0.42, ll * 0.5, 7), body, 0, -ll * 0.7, 0);
    addMesh(leg, new THREE.CylinderGeometry(lt * 0.52, lt * 0.62, ll * 0.14, 7), dark, 0, -ll * 0.98, 0.01, false);
    legs.push(leg);
  }
  if (o.patches) for (let i = 0; i < 4; i++) { const pm = addMesh(g, new THREE.SphereGeometry(r0 * 0.7, 6, 5), lam(0x222222), rand(-0.3, 0.3), ll + r0 + rand(-0.1, 0.2), rand(-bl * 0.25, bl * 0.25), false); pm.scale.set(1, 0.9, 1.2); }
  if (o.saddle) {
    addMesh(g, new THREE.BoxGeometry(bw * 1.08, 0.05, 0.7), lam(0x8a2a22), 0, ll + bh + 0.0, -0.05, false);
    addMesh(g, new THREE.BoxGeometry(bw * 0.85, 0.11, 0.5), lam(0x5b3a22), 0, ll + bh + 0.07, -0.08, false);
    addMesh(g, new THREE.BoxGeometry(0.1, 0.16, 0.1), lam(0x3a2418), 0, ll + bh + 0.18, 0.15, false);
    addMesh(g, new THREE.BoxGeometry(bw * 0.9, 0.05, 0.05), lam(0x3a2418), 0, ll + bh * 0.4, 0.15, false);
  }
  return { g, legs };
}
function animateQuad(q, ph, amp) {
  const s = Math.sin(ph) * amp;
  q.legs[0].rotation.x = s; q.legs[3].rotation.x = s;
  q.legs[1].rotation.x = -s; q.legs[2].rotation.x = -s;
}

// ---------- Pferd ----------
const HORSE_COLORS = [{ c: 0x7a4a2a, d: 0x2a1a10 }, { c: 0x3a2a22, d: 0x120c08 }, { c: 0xc9a06a, d: 0xe8dcc0 }, { c: 0x9a9a9a, d: 0x3a3a3a }];
class Horse {
  constructor(x, z, col) {
    const cc = col || HORSE_COLORS[0];
    this.q = makeQuad({ bl: 1.9, bw: 0.62, bh: 0.8, ll: 1.0, lt: 0.17, nl: 0.85, hl: 0.72, color: cc.c, dark: cc.d, mane: true, tailDark: true, tl: 0.9, saddle: true });
    this.g = this.q.g; this.x = x; this.z = z; this.y = heightAt(x, z); this.yaw = rand(0, 6.28);
    this.speed = 0; this.target = 0; this.turn = 0; this.phase = 0; this.grounded = true; this.rider = false; this.calling = false;
    this.stamina = 100; this.tired = false; this.stepAcc = 0; this.pitch = 0;
    scene.add(this.g);
  }
  update(dt) {
    if (!this.rider) {
      if (this.calling) {
        const dx = player.x - this.x, dz = player.z - this.z, d = Math.hypot(dx, dz);
        if (d < 5) { this.calling = false; this.target = 0; }
        else {
          this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 3));
          this.target = d > 25 ? 15 : d > 10 ? 8 : 3;
        }
      } else { this.target = 0; this.turn = 0; }
      this.stamina = Math.min(100, this.stamina + dt * 15);
    }
    this.speed = lerp(this.speed, this.target, 1 - Math.exp(-dt * (this.target > this.speed ? 1.6 : 3.2)));
    if (this.speed < 0.05 && this.target === 0) this.speed = 0;
    const turnRate = this.rider ? (0.5 + 1.5 * (1 - clamp(Math.abs(this.speed) / 18, 0, 1))) : 1;
    this.yaw += this.turn * dt * turnRate * (Math.abs(this.speed) < 0.5 ? 0.9 : 1);
    const inWater = heightAt(this.x, this.z) < WATER_Y + 0.3;
    const sp = this.speed * (inWater ? 0.55 : 1);
    tryMove(this, Math.sin(this.yaw) * sp * dt, Math.cos(this.yaw) * sp * dt, 0.9, 1.4);
    this.y = heightAt(this.x, this.z);
    if (inWater) this.y = Math.max(this.y, WATER_Y - 0.6);
    const fx = this.x + Math.sin(this.yaw) * 1.1, fz = this.z + Math.cos(this.yaw) * 1.1;
    const bx = this.x - Math.sin(this.yaw) * 1.1, bz = this.z - Math.cos(this.yaw) * 1.1;
    this.pitch = lerp(this.pitch, -Math.atan2(heightAt(fx, fz) - heightAt(bx, bz), 2.2), 0.2);
    this.g.position.set(this.x, this.y, this.z);
    this.g.rotation.y = this.yaw; this.g.rotation.x = this.pitch;
    const moving = Math.abs(this.speed) > 0.3;
    this.phase += Math.abs(this.speed) * dt * (this.speed > 11 ? 1.05 : 1.6);
    animateQuad(this.q, this.phase * (this.speed > 11 ? 1.2 : 1) * 1.3, moving ? clamp(Math.abs(this.speed) / 9, 0.25, 1) : 0);
    if (moving) {
      this.stepAcc += Math.abs(this.speed) * dt;
      const stride = this.speed > 11 ? 3.0 : 2.2;
      if (this.stepAcc > stride) {
        this.stepAcc = 0; SFX.hoof(clamp(this.speed / 12, 0.3, 1) * (1 / (1 + Math.hypot(player.x - this.x, player.z - this.z) * 0.05)));
        if (this.speed > 6 && !inWater) spawnPuff(new V3(this.x - Math.sin(this.yaw) * 0.6, this.y + 0.1, this.z - Math.cos(this.yaw) * 0.6), 0xbfa572, this.speed > 11 ? 3 : 1, 0.6, 0.8, 1.5, 0.8, 1);
      }
    }
  }
}

// ---------- Menschen ----------
const humans = [], animals = [];
const KINDS = {
  outlaw: { hp: 60, speed: 4.6, acc: 0.42, dmg: [6, 10], rate: [1.1, 1.9], range: 62, near: 12, far: 30, bounty: [15, 40] },
  boss: { hp: 260, speed: 3.8, acc: 0.55, dmg: [9, 14], rate: [0.7, 1.2], range: 70, near: 14, far: 32, bounty: [400, 400] },
  lawman: { hp: 80, speed: 5.2, acc: 0.5, dmg: [7, 11], rate: [1.0, 1.6], range: 65, near: 12, far: 30, bounty: [0, 0] },
  civilian: { hp: 30, speed: 2.0, acc: 0, dmg: [0, 0], rate: [9, 9], range: 0, near: 0, far: 0, bounty: [0, 6] },
  sheriff: { hp: 130, speed: 5, acc: 0.55, dmg: [8, 12], rate: [0.9, 1.4], range: 65, near: 12, far: 30, bounty: [0, 0] },
};
const VARIANTS = {
  gun: {},
  shotgun: { hp: 85, dmg: [16, 24], rate: [1.5, 2.2], acc: 0.7, accFall: 38, near: 3, far: 13, range: 32, speed: 5.8, long: 1.0, pellets: 5, look: { coat: 0x4a3a2a, hat: 0x3a2a1a } },
  rifle: { hp: 60, dmg: [15, 21], rate: [2.0, 2.8], acc: 0.66, accFall: 260, near: 34, far: 70, range: 125, speed: 3.8, long: 1.5, look: { hat: 0x6a5a3a, band: 0xa02020 } },
  dynamiter: { hp: 65, dmg: [5, 8], rate: [2.0, 3.0], near: 14, far: 34, range: 50, dynamite: true, look: { vest: 0x7a2a1a, scarf: 0x222222 } },
  duelist: { hp: 70, dmg: [24, 32], rate: [0.6, 0.9], acc: 0.72, accFall: 500, near: 0, far: 999, range: 60, noMove: true, look: { shirt: 0xe8e0d0, pants: 0x1a1a1a, hat: 0x111111, scarf: 0xa01818, vest: 0x1a1a1a, stache: true } },
};
const OUTLAW_LOOKS = [
  { shirt: 0x5a3a2a, pants: 0x2f2a26, hat: 0x2a1c14, scarf: 0x8a1a1a, stache: true }, { shirt: 0x3a3f4a, pants: 0x3a3226, hat: 0x4a3a2a, mask: 0x777777 },
  { shirt: 0x6a5a3a, pants: 0x2a2a2a, hat: 0x1a1a1a, vest: 0x3a2a1a, stache: true }, { shirt: 0x7a2a22, pants: 0x3a3a3a, hat: 0x5a4a30, scarf: 0x222222 },
];
const CIV_LOOKS = [
  { shirt: 0xd8d0c0, pants: 0x4a4a52, hat: 0x8a7a5a, stache: true }, { shirt: 0x4a6a8a, pants: 0x3a3226, hat: 0x3a2a1a, vest: 0x5a4a3a },
  { shirt: 0xa84a4a, pants: 0x2a2a3a, hat: null, hair: 0x7a5a2a }, { shirt: 0x6a8a5a, pants: 0x5a4a3a, hat: 0xc9b48a },
  { shirt: 0xc8a0a0, pants: 0x6a4a5a, hat: 0xd8c8a8, hair: 0x5a3a20, coat: 0x8a5a6a },
];
const SKINS = [0xd9a877, 0xc48a5e, 0xe8c09a, 0x8a5a3a, 0xb07a52];
const TALK = ['Schöner Tag, Fremder.', 'Halt dich von den Coyote-Hollow-Banditen fern!', 'Der Sheriff sucht Hilfe, sagt man.', 'Im Saloon gibt es den besten Whiskey westlich vom Fluss.', 'Ohne Pferd kommt man hier nicht weit.', 'Nachts heulen die Kojoten. Und Schlimmeres.', 'Black Jack Morgan soll ein Fort im Südwesten haben.', 'Bitte keinen Ärger, Mister.', 'Am Ostende der Stadt wartet ein Revolverheld auf Herausforderer.', 'Der Waffenhändler hat neue Ware. Schrotflinten, Scharfschützengewehre…', 'Wölfe reißen bei Nacht sogar Rinder. Bleib auf der Straße.', 'Sonne, Staub und Ärger. Das ist Copper Creek.'];

class Human {
  constructor(kind, x, z, o = {}) {
    this.kind = kind; this.variant = o.variant || 'gun';
    this.cfg = Object.assign({}, KINDS[kind], VARIANTS[this.variant] || {});
    this.x = x; this.z = z; this.y = heightAt(x, z);
    this.yaw = rand(0, 6.28); this.grounded = true;
    this.hp = this.maxHp = this.cfg.hp * (o.hpMul || 1); this.dead = false; this.deadT = 0; this.looted = false;
    this.state = kind === 'lawman' || kind === 'sheriff' ? 'guard' : kind === 'civilian' ? 'walk' : 'idle';
    this.camp = o.camp === undefined ? -1 : o.camp; this.home = { x, z }; this.tx = x; this.tz = z; this.wanderT = rand(0, 4);
    this.scanT = rand(0, 0.5); this.shootCd = rand(0.5, 1.5); this.clip = 6; this.reloadT = 0; this.aimT = 0; this.dynT = rand(3, 6);
    this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = rand(1, 3); this.alertDelay = 0; this.fleeT = 0; this.phase = rand(0, 6); this.speedNow = 0;
    this.spawned = !!o.spawned; this.name = o.name || ''; this.bountyName = o.bountyName || ''; this.bountyReward = o.bountyReward || 0;
    let look;
    if (kind === 'outlaw') look = Object.assign({}, pick(OUTLAW_LOOKS), this.cfg.look || {});
    else if (kind === 'boss') look = { shirt: 0x1a1a1a, pants: 0x1a1a1a, hat: 0x0a0a0a, scarf: 0xa01818, vest: 0x2a1a10, coat: 0x151515, stache: true, band: 0xc0a040 };
    else if (kind === 'lawman' || kind === 'sheriff') look = { shirt: 0x6a7a8a, pants: 0x3a3a4a, hat: 0x6a5a3a, vest: 0x3a2a1a, badge: true, stache: kind === 'sheriff' };
    else look = Object.assign({}, pick(CIV_LOOKS));
    if (this.bountyName) look.scarf = 0xc01818;
    look.skin = pick(SKINS); look.hair = look.hair === undefined ? pick([0x2a1a10, 0x4a3018, 0x7a5a2a, 0x8a8a8a, 0x1a1a1a]) : look.hair;
    this.m = makeHumanoid(look);
    this.g = this.m.g;
    const sc = kind === 'boss' ? 1.12 : kind === 'civilian' ? rand(0.94, 1.04) : rand(0.97, 1.05);
    this.g.scale.setScalar(sc);
    if (this.cfg.long) { this.m.gun.visible = false; this.m.rifle.visible = true; setLongGun(this.m, this.cfg.long, this.variant === 'shotgun' ? 0x4a3a2a : 0x5a3a22); }
    scene.add(this.g); humans.push(this);
    this.syncModel();
  }
  syncModel() { this.g.position.set(this.x, this.y, this.z); this.g.rotation.y = this.yaw; }
  get eye() { return this.y + 1.55; }
  alertNearby() {
    for (const h of humans) if (h !== this && !h.dead && h.state === 'idle' && h.kind === this.kind && Math.hypot(h.x - this.x, h.z - this.z) < 45) { h.state = 'combat'; h.alertDelay = rand(0.2, 1.2); }
  }
  enterCombat() { if (this.state === 'combat') return; this.state = 'combat'; this.alertDelay = this.alertDelay || rand(0.1, 0.5); this.alertNearby(); }
  hurt(dmg, head) {
    if (this.dead) return;
    this.hp -= dmg;
    spawnPuff(new V3(this.x, this.y + (head ? 1.85 : 1.3), this.z), 0x8a1010, head ? 10 : 5, 1.2, 2, 8, 0.7);
    SFX.hit(true);
    if (this.hp <= 0) { this.die(head); return; }
    if (this.kind === 'civilian') { this.state = 'flee'; this.fleeT = 8; }
    else if (this.state === 'idle' || this.state === 'guard' || this.state === 'duel') { this.enterCombat(); }
    this.stagger = 0.25;
  }
  die(head) {
    this.dead = true; this.state = 'dead'; this.deadT = 0; this.hp = 0;
    this.m.rifle.visible = false;
    onKill(this, head);
  }
  moveToward(tx, tz, sp, dt, face = true) {
    const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return 0;
    const s = Math.min(sp, d / dt);
    if (face) this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 10));
    tryMove(this, dx / d * s * dt, dz / d * s * dt, 0.4, 1.4);
    return s;
  }
  shoot() {
    const p = player, d = Math.hypot(p.x - this.x, p.z - this.z), c = this.cfg;
    if (!p.alive) return;
    const muzzle = new V3(this.x + Math.sin(this.yaw) * 0.6, this.y + 1.3, this.z + Math.cos(this.yaw) * 0.6);
    const tgt = new V3(p.x, p.y + 1.2, p.z);
    this.aimT = 0.4;
    this.yaw = Math.atan2(p.x - this.x, p.z - this.z);
    let chance = c.acc - d / (c.accFall || 170);
    if (p.mounted && p.horse && p.horse.speed > 7) chance *= 0.6;
    if (p.deadEyeOn) chance *= 0.5;
    chance = clamp(chance, 0.04, 0.88);
    const pellets = c.pellets || 1;
    let hits = 0;
    for (let i = 0; i < pellets; i++) {
      const hit = Math.random() < chance;
      const t2 = tgt.clone();
      if (!hit) { t2.x += rand(-1.8, 1.8); t2.y += rand(-0.8, 1.0); t2.z += rand(-1.8, 1.8); }
      else hits++;
      if (i < 3) spawnTracer(muzzle, t2, c.long ? 0xff9a60 : 0xffd890, 0.08);
    }
    muzzleFlash(muzzle);
    SFX.shot(d, !!c.long);
    if (hits) damagePlayer(rand(c.dmg[0], c.dmg[1]) * (pellets > 1 ? Math.min(1, hits / 2.5) : 1), this.x, this.z);
    else spawnPuff(new V3(tgt.x, heightAt(tgt.x, tgt.z) + 0.2, tgt.z), 0xc9a66b, 3, 1, 1.5, 4);
    this.clip--;
    if (this.clip <= 0) { this.reloadT = rand(2, 3); this.clip = 6; }
    this.shootCd = rand(c.rate[0], c.rate[1]);
  }
  throwDynamite() {
    const p = player, T = 1.35;
    const from = new V3(this.x, this.y + 1.7, this.z);
    const tx = p.x + (p.vx || 0) * T * 0.7, tz = p.z + (p.vz || 0) * T * 0.7, ty = heightAt(tx, tz) + 0.3;
    const vel = new V3((tx - from.x) / T, ((ty - from.y) + 0.5 * 18 * T * T) / T, (tz - from.z) / T);
    spawnBomb(from, vel, 2.5, false);
    this.aimT = 0.6; toast('Dynamit!', 1200);
  }
  update(dt) {
    const p = player;
    if (this.dead) {
      this.deadT += dt;
      const f = Math.min(1, this.deadT / 0.55);
      this.g.rotation.x = -Math.PI / 2 * (f * f * (3 - 2 * f)) * 0.98;
      this.y = heightAt(this.x, this.z) + 0.18 * f; this.syncModel();
      return;
    }
    if (this.stagger > 0) this.stagger -= dt;
    const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz);
    let v = 0;
    const hostile = this.kind === 'outlaw' || this.kind === 'boss' || ((this.kind === 'lawman' || this.kind === 'sheriff') && game.wanted > 0);
    if (this.kind === 'lawman' || this.kind === 'sheriff') {
      if (game.wanted > 0 && p.alive && (d < 130 || this.spawned)) { if (this.state !== 'combat') this.state = 'combat'; }
      else if (this.state === 'combat') this.state = 'guard';
    }
    if (this.kind === 'civilian') v = this.updateCivilian(dt, d);
    else if (this.state === 'duel') { this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 0.1); }
    else if (this.state === 'idle' || this.state === 'guard') {
      if (this.kind === 'outlaw' || this.kind === 'boss') {
        this.wanderT -= dt;
        if (this.wanderT <= 0) { const a = rand(0, 6.28), r = rand(0, 7); this.tx = this.home.x + Math.cos(a) * r; this.tz = this.home.z + Math.sin(a) * r; this.wanderT = rand(3, 9); if (Math.random() < 0.4) { this.tx = this.x; this.tz = this.z; } }
        v = this.moveToward(this.tx, this.tz, 1.3, dt);
      }
      this.scanT -= dt;
      if (this.scanT <= 0 && hostile) {
        this.scanT = 0.35;
        let range = 46; if (p.mounted && p.horse.speed > 8) range = 70; if (nightFactor > 0.6) range = 34; if (this.variant === 'rifle') range += 30;
        if (p.alive && d < range && losClear(this.x, this.eye, this.z, p.x, p.y + 1.5, p.z)) this.enterCombat();
      }
    } else if (this.state === 'combat') {
      const c = this.cfg;
      if (!p.alive || d > c.range * 2.2) { this.state = this.spawned ? 'combat' : (this.variant === 'duelist' ? 'duel' : 'idle'); return this.animate(dt, 0); }
      if (this.alertDelay > 0) { this.alertDelay -= dt; this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 0.2); return this.animate(dt, 0); }
      this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = -this.strafe; this.strafeT = rand(1, 3); }
      const ux = dx / d, uz = dz / d, sp = c.speed;
      let mx = 0, mz = 0;
      if (!c.noMove) {
        if (d > c.far) { mx = ux; mz = uz; }
        else if (d < c.near) { mx = -ux * 0.8; mz = -uz * 0.8; }
        else { mx = -uz * this.strafe * 0.6; mz = ux * this.strafe * 0.6; }
        if (this.kind === 'boss') { mx *= 0.7; mz *= 0.7; }
      }
      const before = { x: this.x, z: this.z };
      tryMove(this, mx * sp * dt, mz * sp * dt, 0.4, 1.4);
      v = Math.hypot(this.x - before.x, this.z - before.z) / dt;
      this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 8));
      if (c.dynamite) {
        this.dynT -= dt;
        if (this.dynT <= 0 && d > 11 && d < 40 && losClear(this.x, this.eye, this.z, p.x, p.y + 1.4, p.z)) { this.throwDynamite(); this.dynT = rand(6, 9); }
      }
      if (this.reloadT > 0) this.reloadT -= dt;
      else {
        this.shootCd -= dt;
        if (this.shootCd <= 0) {
          if (d < c.range && losClear(this.x, this.eye, this.z, p.x, p.y + 1.4, p.z)) this.shoot();
          else this.shootCd = 0.3;
        }
      }
    }
    this.animate(dt, v);
  }
  updateCivilian(dt, d) {
    let v = 0;
    if (this.state === 'flee') {
      this.fleeT -= dt;
      const ax = this.x - (this.fx !== undefined ? this.fx : player.x), az = this.z - (this.fz !== undefined ? this.fz : player.z), l = Math.hypot(ax, az) || 1;
      const before = { x: this.x, z: this.z };
      this.yaw = lerpAngle(this.yaw, Math.atan2(ax, az), 0.15);
      tryMove(this, ax / l * 5.6 * dt, az / l * 5.6 * dt, 0.4, 1.4);
      v = Math.hypot(this.x - before.x, this.z - before.z) / dt;
      if (this.fleeT <= 0) { this.state = 'walk'; this.fx = undefined; }
    } else {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.tx = clamp(this.home.x + rand(-25, 25), -60, 60); this.tz = clamp(this.home.z + rand(-3, 3), -8.5, 8.5);
        this.wanderT = rand(4, 12); if (Math.random() < 0.35) { this.tx = this.x; this.tz = this.z; }
      }
      v = this.moveToward(this.tx, this.tz, 1.6, dt);
      if (player.aiming && player.alive && d < 16 && !player.mounted) { this.state = 'flee'; this.fleeT = 5; }
    }
    return v;
  }
  animate(dt, v) {
    this.speedNow = lerp(this.speedNow, v, 0.2);
    this.y = heightAt(this.x, this.z);
    if (this.y < WATER_Y) this.y = Math.max(this.y, WATER_Y - 0.5);
    this.phase += this.speedNow * dt * 2.4;
    const amp = clamp(this.speedNow / 4.5, 0, 1) * 0.85, s = Math.sin(this.phase) * amp;
    this.m.legs[0].rotation.x = s; this.m.legs[1].rotation.x = -s;
    if (this.aimT > 0) { this.aimT -= dt; this.m.arms[1].rotation.x = -Math.PI / 2; this.m.arms[0].rotation.x = this.cfg.long ? -Math.PI / 2 : -s * 0.5; }
    else { this.m.arms[1].rotation.x = s * 0.7; this.m.arms[0].rotation.x = -s * 0.7; }
    if (this.state === 'flee') { this.m.arms[0].rotation.x = -2.4; this.m.arms[1].rotation.x = -2.4; }
    this.syncModel();
  }
}

// ---------- Tiere ----------
const ANIMAL = {
  deer: { hp: 40, opts: { bl: 1.25, bw: 0.42, bh: 0.55, ll: 0.75, lt: 0.09, nl: 0.55, hl: 0.4, color: 0x9a6a3a, dark: 0x3a2a1a, antlers: true, tl: 0.25, neckAngle: 0.5 }, drops: { meat: 1, pelt: 1 }, name: 'Hirsch' },
  cow: { hp: 120, opts: { bl: 1.7, bw: 0.7, bh: 0.75, ll: 0.6, lt: 0.14, nl: 0.4, hl: 0.5, color: 0xf0ece0, dark: 0x2a2a2a, patches: true, tl: 0.7, neckAngle: 0.25 }, drops: { meat: 2 }, name: 'Kuh' },
  wolf: { hp: 45, opts: { bl: 1.15, bw: 0.32, bh: 0.44, ll: 0.5, lt: 0.075, nl: 0.3, hl: 0.4, color: 0x6a6a68, dark: 0x2a2a2a, tl: 0.55, neckAngle: 0.3, tailDark: true }, drops: { pelt: 1 }, name: 'Wolf', hostile: true },
};
class Animal {
  constructor(type, x, z) {
    this.type = type; this.cfg = ANIMAL[type]; this.q = makeQuad(this.cfg.opts); this.g = this.q.g;
    this.x = x; this.z = z; this.y = heightAt(x, z); this.yaw = rand(0, 6.28); this.hp = this.cfg.hp; this.dead = false; this.skinned = false;
    this.home = { x, z }; this.state = 'wander'; this.tx = x; this.tz = z; this.wanderT = rand(0, 5); this.phase = 0; this.fleeT = 0; this.grounded = true; this.deadT = 0; this.speed = 0; this.biteT = 0; this.angry = false;
    scene.add(this.g); animals.push(this);
  }
  scare(fx, fz) { if (this.type === 'deer' && !this.dead) { this.state = 'flee'; this.fleeT = 6; this.fx = fx; this.fz = fz; } }
  hurt(dmg) {
    if (this.dead) return;
    this.hp -= dmg; spawnPuff(new V3(this.x, this.y + 1, this.z), 0x8a1010, 4, 1, 2, 8, 0.6); SFX.hit(true);
    if (this.hp <= 0) { this.dead = true; this.deadT = 0; if (this.type === 'cow') addHonor(-3); }
    else if (this.type === 'wolf') this.angry = true; else this.scare(player.x, player.z);
  }
  update(dt) {
    if (this.dead) { this.deadT += dt; const f = Math.min(1, this.deadT / 0.5); this.g.rotation.z = Math.PI / 2 * f; this.g.position.set(this.x, this.y + 0.35 * f, this.z); return; }
    const d = Math.hypot(player.x - this.x, player.z - this.z);
    if (this.type === 'deer' && this.state === 'wander' && d < 24 && (player.mounted ? player.horse.speed > 1 : Math.hypot(player.vx || 0, player.vz || 0) > 2)) this.scare(player.x, player.z);
    let v = 0;
    if (this.type === 'wolf') {
      const aggro = 28 + nightFactor * 35;
      if (player.alive && (d < aggro || (this.angry && d < 110))) {
        if (!this.angry) { this.angry = true; for (const a of animals) if (a.type === 'wolf' && !a.dead && Math.hypot(a.x - this.x, a.z - this.z) < 30) a.angry = true; }
        this.yaw = lerpAngle(this.yaw, Math.atan2(player.x - this.x, player.z - this.z), 1 - Math.exp(-dt * 8));
        if (d > 1.7) { const b = { x: this.x, z: this.z }; tryMove(this, Math.sin(this.yaw) * 8.8 * dt, Math.cos(this.yaw) * 8.8 * dt, 0.5, 1.6); v = Math.hypot(this.x - b.x, this.z - b.z) / dt; }
        else { this.biteT -= dt; if (this.biteT <= 0) { damagePlayer(rand(6, 10), this.x, this.z); this.biteT = 0.9; } }
      } else {
        this.angry = false;
        this.wanderT -= dt;
        if (this.wanderT <= 0) { const a = rand(0, 6.28), r = rand(2, 22); this.tx = this.home.x + Math.cos(a) * r; this.tz = this.home.z + Math.sin(a) * r; this.wanderT = rand(4, 9); }
        const dx = this.tx - this.x, dz = this.tz - this.z, dd = Math.hypot(dx, dz);
        if (dd > 0.5) { this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 0.08); const b = { x: this.x, z: this.z }; tryMove(this, Math.sin(this.yaw) * 1.6 * dt, Math.cos(this.yaw) * 1.6 * dt, 0.5, 1.5); v = Math.hypot(this.x - b.x, this.z - b.z) / dt; }
      }
    } else if (this.state === 'flee') {
      this.fleeT -= dt;
      const ax = this.x - this.fx, az = this.z - this.fz;
      this.yaw = lerpAngle(this.yaw, Math.atan2(ax, az), 0.12);
      const b = { x: this.x, z: this.z };
      tryMove(this, Math.sin(this.yaw) * 11 * dt, Math.cos(this.yaw) * 11 * dt, 0.6, 1.5);
      v = Math.hypot(this.x - b.x, this.z - b.z) / dt;
      if (this.fleeT <= 0) this.state = 'wander';
    } else {
      this.wanderT -= dt;
      if (this.wanderT <= 0) { const a = rand(0, 6.28), r = rand(2, this.type === 'cow' ? 14 : 30); this.tx = this.home.x + Math.cos(a) * r; this.tz = this.home.z + Math.sin(a) * r; this.wanderT = rand(4, 10); if (Math.random() < 0.5) { this.tx = this.x; this.tz = this.z; } }
      const dx = this.tx - this.x, dz = this.tz - this.z, dd = Math.hypot(dx, dz);
      if (dd > 0.5) { this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 0.08); const b = { x: this.x, z: this.z }; tryMove(this, Math.sin(this.yaw) * 1.3 * dt, Math.cos(this.yaw) * 1.3 * dt, 0.6, 1.5); v = Math.hypot(this.x - b.x, this.z - b.z) / dt; }
    }
    this.y = heightAt(this.x, this.z);
    this.phase += v * dt * 2.2;
    animateQuad(this.q, this.phase, v > 0.1 ? clamp(v / 6, 0.2, 0.9) : 0);
    this.g.position.set(this.x, this.y, this.z); this.g.rotation.y = this.yaw;
  }
}

// ---------- Geier ----------
const vultures = [];
function makeVulture(cx, cz) {
  const g = new THREE.Group();
  const bodyM = lam(0x1a1a1a);
  addMesh(g, new THREE.BoxGeometry(0.3, 0.2, 0.7), bodyM, 0, 0, 0, false);
  const wings = [];
  for (const s of [-1, 1]) { const w = new THREE.Group(); g.add(w); addMesh(w, new THREE.BoxGeometry(1.4, 0.04, 0.5), bodyM, s * 0.7, 0, 0, false); wings.push(w); }
  scene.add(g);
  vultures.push({ g, wings, cx, cz, a: rand(0, 6.28), r: rand(20, 40), h: rand(35, 55), s: rand(0.15, 0.25) });
}
function updateVultures(dt, t) {
  for (const v of vultures) {
    v.a += v.s * dt;
    const x = v.cx + Math.cos(v.a) * v.r, z = v.cz + Math.sin(v.a) * v.r;
    v.g.position.set(x, heightAt(v.cx, v.cz) + v.h + Math.sin(t + v.a * 3) * 2, z);
    v.g.rotation.y = -v.a; v.g.rotation.z = 0.25;
    v.wings[0].rotation.z = Math.sin(t * 2 + v.a) * 0.25; v.wings[1].rotation.z = -Math.sin(t * 2 + v.a) * 0.25;
  }
}

// ---------- Sprengstoff: Fässer, Dynamit, Explosionen ----------
const explosives = [], bombs = [], pendingBooms = [];
function makeExplosiveBarrel(x, z) {
  const y = heightAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  addMesh(g, new THREE.CylinderGeometry(0.42, 0.38, 0.95, 10), lam(0xb02a18), 0, 0.48, 0);
  for (const by of [0.2, 0.76]) addMesh(g, new THREE.CylinderGeometry(0.435, 0.435, 0.06, 10), lam(0x2a2a2a), 0, by, 0, false);
  addMesh(g, new THREE.BoxGeometry(0.3, 0.3, 0.02), lam(0xf0d040), 0, 0.5, 0.41, false);
  scene.add(g);
  const c = addCircle(x, z, 0.5);
  explosives.push({ x, y, z, g, c, dead: false });
}
function spawnBomb(from, vel, fuse, fromPlayer) {
  const g = new THREE.Group();
  addMesh(g, new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), lam(0xc02818), 0, 0, 0, false).rotation.z = Math.PI / 2;
  const spark = addMesh(g, new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffa030 }), 0.17, 0.04, 0, false);
  g.position.copy(from); scene.add(g);
  bombs.push({ g, spark, v: vel.clone(), t: fuse, fromPlayer, sparkT: 0 });
}
function queueExplosion(x, y, z, r, dmg, fromPlayer, delay) { pendingBooms.push({ x, y, z, r, dmg, fromPlayer, t: delay }); }
function explode(x, y, z, r, dmg, fromPlayer) {
  const pos = new V3(x, y, z);
  explosionFX(pos, r);
  const dP = Math.hypot(player.x - x, player.y + 1 - y, player.z - z);
  SFX.explosion(dP);
  if (dP < 50) player.shake = Math.max(player.shake, 0.3 * (1 - dP / 50));
  for (const h of humans) {
    if (h.dead) continue;
    const d = Math.hypot(h.x - x, h.y + 1 - y, h.z - z);
    if (d < r) {
      const dm = dmg * (1 - d / r);
      if (fromPlayer && (h.kind === 'civilian' || h.kind === 'lawman' || h.kind === 'sheriff')) commitCrime(h.kind === 'civilian' ? 1 : 2);
      h.hurt(dm, false);
      if (!h.dead && h.state !== 'combat' && h.kind !== 'civilian') h.enterCombat();
    }
  }
  for (const a of animals) if (!a.dead && Math.hypot(a.x - x, a.z - z) < r) a.hurt(dmg * (1 - Math.hypot(a.x - x, a.z - z) / r));
  if (player.alive && dP < r) damagePlayer(dmg * (1 - dP / r) * 0.75, x, z);
  for (const e of explosives) if (!e.dead && Math.hypot(e.x - x, e.z - z) < r * 0.9) { e.dead = true; queueExplosion(e.x, e.y + 0.5, e.z, 7, 120, fromPlayer, 0.18); scene.remove(e.g); e.c.x = 1e6; }
  for (const b of bombs) if (b.t > 0.2 && b.g.position.distanceTo(pos) < r * 0.8) b.t = 0.12;
  alarm(x, z, 130);
  if (fromPlayer) game.lastShot = performance.now();
}
function explodeBarrel(e, fromPlayer) {
  if (e.dead) return;
  e.dead = true; scene.remove(e.g); e.c.x = 1e6;
  explode(e.x, e.y + 0.5, e.z, 7, 120, fromPlayer);
}
function updateBombs(dt) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i], p = b.g.position;
    b.t -= dt; b.sparkT += dt;
    const gh = heightAt(p.x, p.z) + 0.1;
    if (p.y > gh + 0.01 || b.v.y > 0) {
      b.v.y -= 18 * dt; p.addScaledVector(b.v, dt);
      if (p.y < gh) { p.y = gh; b.v.y = -b.v.y * 0.25; b.v.x *= 0.5; b.v.z *= 0.5; if (Math.abs(b.v.y) < 0.8) b.v.set(0, 0, 0); }
      b.g.rotation.x += dt * 8; b.g.rotation.z += dt * 5;
    }
    if (b.sparkT > 0.06) { b.sparkT = 0; spawnPuff(p, 0xffa030, 1, 0.3, 0.6, 0, 0.5, 0.25); }
    if (b.t <= 0) { scene.remove(b.g); bombs.splice(i, 1); explode(p.x, p.y, p.z, 9, 150, b.fromPlayer); }
  }
  for (let i = pendingBooms.length - 1; i >= 0; i--) {
    const e = pendingBooms[i]; e.t -= dt;
    if (e.t <= 0) { pendingBooms.splice(i, 1); explode(e.x, e.y, e.z, e.r, e.dmg, e.fromPlayer); }
  }
}

// ---------- Bevölkerung ----------
let playerHorse;
const CAMP_VARIANTS = [
  ['gun', 'gun', 'gun', 'gun', 'shotgun'],
  ['gun', 'gun', 'gun', 'shotgun', 'rifle', 'dynamiter'],
  ['gun', 'gun', 'gun', 'shotgun', 'shotgun', 'rifle', 'rifle', 'dynamiter'],
];
const BOUNTY_TARGETS = [
  { name: 'Slim Hollis', reward: 120 }, { name: 'Mad Dog McCall', reward: 180 }, { name: 'Einäugiger Rufus', reward: 150 }, { name: 'Diego „El Gato“ Vargas', reward: 220 },
];
function populate() {
  CAMPS.forEach((c, i) => {
    for (let k = 0; k < c.count; k++) {
      const a = rand(0, 6.28), r = rand(5, c.fort ? 18 : 14);
      new Human('outlaw', c.x + Math.cos(a) * r, c.z + Math.sin(a) * r, { camp: i, variant: CAMP_VARIANTS[i][k % CAMP_VARIANTS[i].length] });
    }
    for (let k = 0; k < 3; k++) makeVulture(c.x, c.z);
    for (let k = 0; k < 3; k++) { const a = rand(0, 6.28), r = rand(5, 9); makeExplosiveBarrel(c.x + Math.cos(a) * r, c.z + Math.sin(a) * r); }
    if (c.fort) { const b = new Human('boss', c.x, c.z - 3, { camp: i, name: 'Black Jack Morgan', variant: 'shotgun' }); b.home = { x: c.x, z: c.z - 3 }; b.cfg.near = 8; b.cfg.far = 24; }
  });
  // Hinterhalte an den Straßen, jeweils mit Kopfgeld-Anführer
  const amb = [[-80, -40], [160, -130], [-90, 190], [140, 110]];
  amb.forEach((a, i) => {
    const n = 2 + (i % 2);
    for (let k = 0; k < n; k++) new Human('outlaw', a[0] + rand(-12, 12), a[1] + rand(-12, 12), { camp: -1, variant: k === 1 ? 'shotgun' : 'gun' });
    const t = BOUNTY_TARGETS[i];
    const l = new Human('outlaw', a[0], a[1], { camp: -1, variant: 'rifle', bountyName: t.name, bountyReward: t.reward, hpMul: 1.5 });
    l.name = t.name;
  });
  // Stadt
  for (let i = 0; i < 12; i++) { const c = new Human('civilian', rand(-50, 50), rand(-5, 5)); c.home = { x: c.x, z: c.z }; }
  const sh = new Human('sheriff', -8.5, -9.4, { name: 'Sheriff Cole' }); sh.yaw = 0.3; game.sheriff = sh;
  new Human('lawman', -3, -9.4).yaw = 0.2;
  new Human('lawman', 5, 9.2).yaw = Math.PI;
  const du = new Human('outlaw', 38, 2, { camp: -2, variant: 'duelist', name: 'Revolverheld Jack Riley' });
  du.state = 'duel'; du.duelist = true; du.yaw = -Math.PI / 2; game.duelist = du;
  // Tiere
  scatter(16, (x, z, h) => h > 0 && !nearZone(x, z, 1.3) && Math.abs(x) < 700 && Math.abs(z) < 700).forEach((p) => new Animal('deer', p.x, p.z));
  for (let i = 0; i < 6; i++) new Animal('cow', HOME.x + rand(-18, 26), HOME.z + rand(-14, 20));
  for (let i = 0; i < 4; i++) {
    const s = scatter(1, (x, z, h) => h > 0 && Math.hypot(x, z) > 170 && !nearZone(x, z, 1.3) && Math.abs(x) < 700 && Math.abs(z) < 700)[0];
    if (s) for (let k = 0; k < 3; k++) new Animal('wolf', s.x + rand(-6, 6), s.z + rand(-6, 6));
  }
  playerHorse = new Horse(11, 4, HORSE_COLORS[0]);
}
function updateEntities(dt, t) {
  for (const h of humans) h.update(dt);
  for (const a of animals) a.update(dt);
  if (playerHorse) playerHorse.update(dt);
  updateVultures(dt, t);
  updateBombs(dt);
  for (let i = humans.length - 1; i >= 0; i--) {
    const h = humans[i];
    if (h.dead && h.deadT > 90 + (h.looted ? -60 : 0)) { scene.remove(h.g); humans.splice(i, 1); }
  }
}
// Schuss- / Lärm-Alarm
function alarm(x, z, r) {
  for (const h of humans) {
    if (h.dead) continue;
    const d = Math.hypot(h.x - x, h.z - z);
    if (h.kind === 'civilian' && d < r * 0.7) { h.state = 'flee'; h.fleeT = 7; h.fx = x; h.fz = z; }
    else if ((h.kind === 'outlaw' || h.kind === 'boss') && h.state === 'idle' && d < r) h.enterCombat();
  }
  for (const a of animals) if (a.type === 'deer' && Math.hypot(a.x - x, a.z - z) < r * 0.9) a.scare(x, z);
}
