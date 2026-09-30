'use strict';
// ---------- Spiel: Eingabe, Spieler, Waffen, Inventar, Shops, Dead Eye, Missionen, HUD, Hauptschleife ----------
const $ = (id) => document.getElementById(id);
const keys = {};
const game = { started: false, paused: false, menu: null, menuArg: null, noLock: false, timeScale: 1, tsTarget: 1, wanted: 0, wantedT: 0, lawT: 4, kills: 0, quest: 0, pending: 0, sheriff: null, duelist: null, duel: null, time: 0, sheriffT: 0, questT: 0, cricketT: 3, slowT: 0, bountyDone: {} };

// ---------- Waffen ----------
const WEAPONS = {
  rev: { name: 'Cattleman-Revolver', type: 'pistol', ammo: 'pistol', mag: 6, dmg: 36, head: 140, rate: 0.3, reload: 2.4, range: 130, spread: 0.04, spreadAim: 0.006, recoil: 0.05, pellets: 1, fov: 50, len: 0, price: 0, desc: 'Zuverlässig und schnell.' },
  schof: { name: 'Schofield-Revolver', type: 'pistol', ammo: 'pistol', mag: 6, dmg: 58, head: 240, rate: 0.5, reload: 2.8, range: 140, spread: 0.035, spreadAim: 0.004, recoil: 0.08, pellets: 1, fov: 48, len: 0, price: 140, desc: 'Schwereres Kaliber, hoher Schaden.' },
  mauser: { name: 'Mauser-Pistole', type: 'pistol', ammo: 'pistol', mag: 10, dmg: 24, head: 100, rate: 0.11, reload: 2.2, range: 100, spread: 0.06, spreadAim: 0.016, recoil: 0.03, pellets: 1, auto: true, fov: 52, len: 0, price: 260, desc: 'Halbautomatisch, Dauerfeuer bei gedrückter Taste.' },
  rifle: { name: 'Repetiergewehr', type: 'long', ammo: 'rifle', mag: 6, dmg: 90, head: 320, rate: 0.8, reload: 2.9, range: 420, spread: 0.02, spreadAim: 0.0012, recoil: 0.09, pellets: 1, fov: 34, len: 1.0, heavy: true, price: 0, desc: 'Gute Reichweite und Durchschlagskraft.' },
  shotgun: { name: 'Schrotflinte', type: 'long', ammo: 'shell', mag: 2, dmg: 20, head: 45, rate: 0.55, reload: 2.6, range: 45, spread: 0.1, spreadAim: 0.07, recoil: 0.14, pellets: 8, fov: 56, len: 0.9, heavy: true, price: 180, desc: 'Verheerend auf kurze Distanz.', color: 0x4a3a2a },
  sniper: { name: 'Scharfschützengewehr', type: 'long', ammo: 'rifle', mag: 1, dmg: 240, head: 700, rate: 1.5, reload: 2.4, range: 700, spread: 0.03, spreadAim: 0.0002, recoil: 0.15, pellets: 1, fov: 12, len: 1.6, heavy: true, price: 380, desc: 'Ein Schuss, ein Treffer. Zielfernrohr mit rechter Maustaste.', color: 0x2f2f34 },
};
const ORDER = ['rev', 'schof', 'mauser', 'rifle', 'shotgun', 'sniper'];
const AMMO_NAMES = { pistol: 'Revolverkugeln', rifle: 'Gewehrpatronen', shell: 'Schrotpatronen' };
const ITEMS = {
  tonic: { name: 'Heiltonikum', desc: 'Stellt 60 Gesundheit wieder her (Taste F).', price: 14, use(p) { if (p.hp >= p.maxHp) return 'Du bist bei voller Gesundheit'; p.hp = Math.min(p.maxHp, p.hp + 60); return ''; } },
  whiskey: { name: 'Whiskey', desc: '+25 Gesundheit, +40 Dead Eye.', price: 6, use(p) { p.hp = Math.min(p.maxHp, p.hp + 25); p.deadEye = Math.min(100, p.deadEye + 40); return ''; } },
  dynamite: { name: 'Dynamit', desc: 'Mit G werfen. Zündschnur 2,6 Sekunden.', price: 8 },
  meat: { name: 'Fleisch', desc: 'Von der Jagd.', sell: 6 },
  pelt: { name: 'Fell', desc: 'Guter Preis beim Krämer.', sell: 18 },
  watch: { name: 'Taschenuhr', desc: 'Von einem Banditen.', sell: 30 },
  ring: { name: 'Goldring', desc: 'Glänzt noch.', sell: 45 },
  nugget: { name: 'Goldnugget', desc: 'Ein echter Fund.', sell: 75 },
};
const player = {
  x: 0, y: 0, z: 5, vx: 0, vz: 0, vy: 0, yaw: Math.PI, camYaw: 0, camPitch: 0.12, hp: 100, maxHp: 100, alive: true, grounded: true,
  mounted: false, horse: null, aiming: false, firing: false, weapon: 'rev', owned: ['rev', 'rifle'],
  loaded: { rev: 6, rifle: 6 }, reserve: { pistol: 48, rifle: 18, shell: 0 },
  items: { tonic: 1, whiskey: 0, dynamite: 3, meat: 0, pelt: 0, watch: 0, ring: 0, nugget: 0 },
  reloadT: 0, cd: 0, throwCd: 0, money: 25, honor: 10, deadEye: 60, deadEyeOn: false, marks: [], seq: null, faceT: 0, phase: 0, lastHurt: -99, shake: 0, hurtFlash: 0, stepAcc: 0, deadT: 0, mouseMoveT: 0,
};
const W = () => WEAPONS[player.weapon];
let pm; // Spielermodell
const _v = new V3(), _f = new V3(), _o = new V3();

// ---------- Eingabe ----------
const SENS = 0.0022;
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (!game.started) return;
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  onKey(e.code);
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; player.firing = false; player.aiming = false; });
addEventListener('mousemove', (e) => {
  if (!game.started || game.paused || game.menu || !document.pointerLockElement) return;
  const w = W(), k = player.aiming ? (w.fov < 20 ? 0.25 : w.heavy ? 0.5 : 0.7) : 1;
  player.camYaw -= e.movementX * SENS * k; player.camPitch = clamp(player.camPitch - e.movementY * SENS * k, -1.15, 1.2);
  player.mouseMoveT = 0;
});
addEventListener('mousedown', (e) => {
  if (!game.started || game.paused || game.menu || !player.alive) return;
  if (e.button === 0) { player.firing = true; if (player.deadEyeOn) markTarget(); }
  if (e.button === 2) player.aiming = true;
});
addEventListener('mouseup', (e) => { if (e.button === 0) player.firing = false; if (e.button === 2) player.aiming = false; });
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('wheel', (e) => { if (game.started && !game.paused && !game.menu) cycleWeapon(e.deltaY > 0 ? 1 : -1); });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
document.addEventListener('pointerlockchange', () => {
  if (!game.started || game.menu) return;
  if (document.pointerLockElement) setPaused(false);
  else if (!game.noLock && player.alive) setPaused(true);
});
document.addEventListener('pointerlockerror', () => { game.noLock = true; setPaused(false); toast('Maus-Sperre nicht verfügbar – Blick mit Pfeiltasten. P = Pause', 5000); });
function setPaused(v) { game.paused = v; $('pause').style.display = v ? 'flex' : 'none'; if (v) { player.firing = false; player.aiming = false; } }
function requestLock() { try { const pr = renderer.domElement.requestPointerLock(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { game.noLock = true; } }

function onKey(code) {
  const p = player;
  if (game.menu) { if (code === 'Tab' || code === 'Escape' || code === 'KeyE') closeMenu(); return; }
  if (code === 'KeyP' || (code === 'Escape' && game.noLock)) { setPaused(!game.paused); return; }
  if (game.paused || !p.alive) return;
  if (code === 'KeyE') interact();
  else if (code === 'Tab') openMenu('pack');
  else if (code === 'KeyR') reload();
  else if (code === 'KeyQ') toggleDeadEye();
  else if (code === 'KeyH') whistle();
  else if (code === 'KeyF') useItem('tonic');
  else if (code === 'KeyG') throwDynamite();
  else if (code.startsWith('Digit') && +code[5] >= 1 && +code[5] <= 6) { const w = ORDER[+code[5] - 1]; if (p.owned.includes(w)) setWeapon(w); else toast('Diese Waffe besitzt du nicht', 1300); }
  else if (code === 'KeyM') { const b = $('bigmap'); b.style.display = b.style.display === 'flex' ? 'none' : 'flex'; }
  else if (code === 'KeyN') toast(SFX.toggleMusic() ? 'Musik an' : 'Musik aus', 1500);
  if (p.deadEyeOn && code === 'Space') executeDeadEye();
}
function setWeapon(w) {
  const p = player;
  if (p.weapon === w || p.deadEyeOn || !p.owned.includes(w)) return;
  p.weapon = w; p.reloadT = 0; p.cd = 0.3; SFX.click();
  applyWeaponModel();
  toast(WEAPONS[w].name, 900);
}
function applyWeaponModel() {
  const w = W();
  pm.gun.visible = w.type === 'pistol'; pm.rifle.visible = w.type === 'long';
  if (w.type === 'long') setLongGun(pm, w.len, w.color || 0x5a3a22);
}
function cycleWeapon(dir) {
  const p = player, list = ORDER.filter((w) => p.owned.includes(w));
  const i = list.indexOf(p.weapon);
  setWeapon(list[(i + dir + list.length) % list.length]);
}

// ---------- HUD-Helfer ----------
let toastTimer = 0;
function toast(text, ms = 2600) {
  const t = $('toast'); t.textContent = text; t.style.opacity = 1;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.opacity = 0; }, ms);
}
let subTimer = 0;
function subtitle(who, text, ms = 6000) {
  const s = $('subtitle'); s.innerHTML = `<b>${who}:</b> ${text}`; s.style.opacity = 1;
  clearTimeout(subTimer); subTimer = setTimeout(() => { s.style.opacity = 0; }, ms);
}
let bannerTimer = 0;
function banner(title, sub, ms = 4500) {
  const b = $('banner'); b.innerHTML = `<div class="bt">${title}</div><div class="bs">${sub || ''}</div>`; b.style.opacity = 1;
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { b.style.opacity = 0; }, ms);
}
function addHonor(v) { player.honor = clamp(player.honor + v, -100, 100); }
function commitCrime(level) {
  const was = game.wanted;
  game.wanted = Math.min(3, Math.max(game.wanted, level)); game.wantedT = 45;
  if (game.wanted > was) toast('Du wirst gesucht!', 2400);
}

// ---------- Kampf ----------
function eyePos(out) { return out.set(player.x, player.y + (player.mounted ? 2.55 : 1.65), player.z); }
function camForward(out) {
  const cp = Math.cos(player.camPitch);
  return out.set(-Math.sin(player.camYaw) * cp, Math.sin(player.camPitch), -Math.cos(player.camYaw) * cp);
}
function raySphere(o, d, c, r, minT) {
  const ox = c.x - o.x, oy = c.y - o.y, oz = c.z - o.z;
  const tca = ox * d.x + oy * d.y + oz * d.z;
  const d2 = ox * ox + oy * oy + oz * oz - tca * tca;
  if (d2 > r * r) return -1;
  const thc = Math.sqrt(r * r - d2);
  let t = tca - thc; if (t < minT) t = tca + thc;
  return t < minT ? -1 : t;
}
const _c = new V3();
function castRay(o, d, maxD, minT = 0) {
  let best = { t: worldRay(o, d, maxD), kind: 'world', ent: null };
  for (const h of humans) {
    if (h.dead) continue;
    if (Math.abs(h.x - o.x) > maxD || Math.abs(h.z - o.z) > maxD) continue;
    let t = raySphere(o, d, _c.set(h.x, h.y + 1.86, h.z), 0.27, minT);
    if (t > 0 && t < best.t) best = { t, kind: 'head', ent: h };
    t = raySphere(o, d, _c.set(h.x, h.y + 1.3, h.z), 0.42, minT);
    if (t > 0 && t < best.t) best = { t, kind: 'body', ent: h };
    t = raySphere(o, d, _c.set(h.x, h.y + 0.6, h.z), 0.38, minT);
    if (t > 0 && t < best.t) best = { t, kind: 'body', ent: h };
  }
  if (window.MP) for (const r of MP.remotes.values()) {
    if (!r.alive) continue;
    let t = raySphere(o, d, _c.set(r.x, r.y + 1.86, r.z), 0.27, minT);
    if (t > 0 && t < best.t) best = { t, kind: 'pvp', head: true, ent: r };
    t = raySphere(o, d, _c.set(r.x, r.y + 1.3, r.z), 0.42, minT);
    if (t > 0 && t < best.t) best = { t, kind: 'pvp', head: false, ent: r };
    t = raySphere(o, d, _c.set(r.x, r.y + 0.6, r.z), 0.38, minT);
    if (t > 0 && t < best.t) best = { t, kind: 'pvp', head: false, ent: r };
  }
  for (const a of animals) {
    if (a.dead) continue;
    const t = raySphere(o, d, _c.set(a.x, a.y + 0.95, a.z), a.type === 'cow' ? 0.9 : a.type === 'wolf' ? 0.55 : 0.75, minT);
    if (t > 0 && t < best.t) best = { t, kind: 'animal', ent: a };
  }
  for (const e of explosives) {
    if (e.dead) continue;
    const t = raySphere(o, d, _c.set(e.x, e.y + 0.5, e.z), 0.62, minT);
    if (t > 0 && t < best.t) best = { t, kind: 'explosive', ent: e };
  }
  return best;
}
function muzzlePos(out) {
  const p = player, y = p.mounted ? p.horse.yaw : p.yaw;
  return out.set(p.x + Math.sin(y) * 0.7 + Math.cos(y) * 0.2, p.y + (p.mounted ? 2.5 : 1.42), p.z + Math.cos(y) * 0.7 - Math.sin(y) * 0.2);
}
function assist(o, d) {
  let best = null, bc = Math.cos(0.05);
  for (const h of humans) {
    if (h.dead || h.kind === 'civilian') continue;
    const dx = h.x - o.x, dy = h.y + 1.35 - o.y, dz = h.z - o.z, l = Math.hypot(dx, dy, dz);
    if (l > 90 || l < 3) continue;
    const c = (dx * d.x + dy * d.y + dz * d.z) / l;
    if (c > bc && losClear(o.x, o.y, o.z, h.x, h.y + 1.4, h.z)) { bc = c; best = { dx: dx / l, dy: dy / l, dz: dz / l }; }
  }
  if (best) { d.x = lerp(d.x, best.dx, 0.55); d.y = lerp(d.y, best.dy, 0.55); d.z = lerp(d.z, best.dz, 0.55); d.normalize(); }
}
function processHit(hit, w, end, falloff = 1) {
  const e = hit.ent;
  if (hit.kind === 'head' || hit.kind === 'body') {
    const head = hit.kind === 'head';
    if (e.kind === 'civilian' || e.kind === 'lawman' || e.kind === 'sheriff') { if (!(e.kind !== 'civilian' && game.wanted > 0)) commitCrime(e.kind === 'civilian' ? 1 : 2); }
    e.hurt((head ? w.head : w.dmg) * falloff, head);
    if (!e.dead) player.deadEye = Math.min(100, player.deadEye + (head ? 3 : 1.2));
    hitMarker(e.dead);
    if (head && !e.dead && w.pellets === 1) toast('Kopftreffer!', 900);
  } else if (hit.kind === 'pvp') {
    MP.sendHit(e.id, (hit.head ? w.head : w.dmg) * falloff, hit.head); hitMarker(false);
    if (hit.head && w.pellets === 1) toast('Kopftreffer!', 900);
  } else if (hit.kind === 'animal') {
    e.hurt((w.dmg + (w.heavy ? 40 : 0)) * falloff, false); hitMarker(e.dead);
  } else if (hit.kind === 'explosive') {
    explodeBarrel(e, true); hitMarker(true);
  } else {
    spawnPuff(end, 0xc9a66b, 3, 1.2, 1.8, 5);
    SFX.hit(false);
  }
}
let hmT = 0;
function hitMarker(kill) { const h = $('hitm'); h.className = kill ? 'kill' : 'on'; hmT = 0.18; }
function fire() {
  const p = player, w = W();
  if (!p.alive || p.reloadT > 0 || p.cd > 0 || p.deadEyeOn || game.menu) return;
  if (p.loaded[p.weapon] <= 0) {
    SFX.click(); p.cd = 0.3;
    if (p.reserve[w.ammo] > 0) reload(); else toast('Keine ' + AMMO_NAMES[w.ammo] + ' mehr!', 1200);
    return;
  }
  p.loaded[p.weapon]--; p.cd = w.rate;
  eyePos(_v); camForward(_f);
  const camDist = camera.position.distanceTo(_v);
  const sp = (p.aiming ? w.spreadAim : w.spread) * (p.mounted ? (1 + p.horse.speed / 6) : 1) * (Math.hypot(p.vx, p.vz) > 4 ? 1.6 : 1);
  const mz = muzzlePos(new V3());
  for (let i = 0; i < w.pellets; i++) {
    const d = _f.clone(); if (p.aiming && i === 0) assist(camera.position, d);
    d.x += rand(-sp, sp); d.y += rand(-sp, sp); d.z += rand(-sp, sp); d.normalize();
    const hit = castRay(camera.position, d, w.range, camDist);
    const end = camera.position.clone().addScaledVector(d, hit.t);
    if (i < 4) { spawnTracer(mz, end, 0xfff0b0, 0.07); if (window.MP) MP.sendShot(mz, end); }
    processHit(hit, w, end, w.pellets > 1 ? clamp(1 - hit.t / w.range, 0.12, 1) : 1);
  }
  muzzleFlash(mz);
  SFX.shot(0, w.heavy);
  p.camPitch += w.recoil * (p.aiming ? 0.6 : 1); p.shake = Math.max(p.shake, w.heavy ? 0.08 : 0.04);
  p.faceT = 1.4; game.lastShot = performance.now();
  if (game.duel && game.duel.state === 'count') {
    game.duel.state = 'cheat'; addHonor(-6); const d = game.duelist; d.state = 'combat'; d.alertDelay = 0.25; toast('Unehrenhaft! Ehre −6', 2200);
  }
  alarm(p.x, p.z, 85);
  if (Math.hypot(p.x - TOWN.x, p.z - TOWN.z) < TOWN.r - 10 && game.wanted === 0 && !game.duel) {
    for (const h of humans) if (!h.dead && (h.kind === 'civilian' || h.kind === 'lawman') && Math.hypot(h.x - p.x, h.z - p.z) < 45 && losClear(h.x, h.eye, h.z, p.x, p.y + 1.5, p.z)) { commitCrime(1); break; }
  }
}
function reload() {
  const p = player, w = W();
  if (p.reloadT > 0 || p.loaded[p.weapon] >= w.mag || p.reserve[w.ammo] <= 0 || p.deadEyeOn) return;
  p.reloadT = w.reload; SFX.reload();
}
function finishReload() {
  const p = player, w = W(), n = Math.min(w.mag - p.loaded[p.weapon], p.reserve[w.ammo]);
  p.loaded[p.weapon] += n; p.reserve[w.ammo] -= n;
}
function useItem(id) {
  const p = player, it = ITEMS[id];
  if (!p.items[id]) { toast('Kein ' + it.name + ' im Rucksack', 1300); return false; }
  const err = it.use(p);
  if (err) { toast(err, 1500); return false; }
  p.items[id]--; toast(it.name + ' benutzt', 1300); SFX.coin();
  return true;
}
function throwDynamite() {
  const p = player;
  if (p.throwCd > 0 || p.deadEyeOn) return;
  if (p.items.dynamite <= 0) { toast('Kein Dynamit im Rucksack', 1300); return; }
  p.items.dynamite--; p.throwCd = 1.0;
  camForward(_f);
  const from = muzzlePos(new V3()); from.y += 0.25;
  const vel = _f.clone().multiplyScalar(19); vel.y += 4.5;
  if (p.mounted) { vel.x += Math.sin(p.horse.yaw) * p.horse.speed * 0.8; vel.z += Math.cos(p.horse.yaw) * p.horse.speed * 0.8; }
  spawnBomb(from, vel, 2.6, true);
  p.faceT = 1.0; SFX.click();
}
function damagePlayer(d, fx, fz) {
  const p = player;
  if (!p.alive) return;
  p.hp -= d; p.lastHurt = game.time; p.hurtFlash = Math.min(1, p.hurtFlash + 0.4); p.shake = Math.max(p.shake, 0.09);
  if (game.time - (damagePlayer.last || -9) > 0.35) { SFX.hurt(); damagePlayer.last = game.time; }
  if (p.hp <= 0) killPlayer();
}
function killPlayer() {
  const p = player;
  p.alive = false; p.hp = 0; p.deadT = 0; p.firing = false; p.aiming = false;
  if (p.deadEyeOn) endDeadEye();
  if (p.mounted) dismount(true);
  if (game.menu) closeMenu();
  $('dead').style.display = 'flex';
  SFX.setCombat(false);
}
function respawn() {
  const p = player;
  p.alive = true; p.hp = p.maxHp; p.x = 2; p.z = 5; p.y = heightAt(2, 5); p.vx = p.vz = 0; p.grounded = true;
  const lost = Math.floor(p.money * 0.1); p.money -= lost;
  game.wanted = 0; p.reserve.pistol = Math.max(p.reserve.pistol, 24);
  p.loaded[p.weapon] = Math.max(p.loaded[p.weapon], 1);
  playerHorse.x = 11; playerHorse.z = 4; playerHorse.speed = 0; playerHorse.calling = false;
  if (game.duel) { game.duel = null; const d = game.duelist; if (d && !d.dead) { d.hp = d.maxHp; d.state = 'duel'; } }
  $('dead').style.display = 'none'; toast(`Der Doktor hat dich zusammengeflickt (−$${lost})`, 3500);
  p.camYaw = 0;
}

// ---------- Dead Eye ----------
function toggleDeadEye() {
  const p = player;
  if (p.deadEyeOn) { executeDeadEye(); return; }
  if (p.deadEye < 12 || p.reloadT > 0) { toast('Dead Eye nicht bereit', 1200); return; }
  p.deadEyeOn = true; p.marks = []; game.tsTarget = 0.22; SFX.deadEye(true);
  renderer.domElement.style.filter = 'grayscale(0.75) sepia(0.4) contrast(1.15) brightness(1.05)';
  $('deo').style.opacity = 1;
}
function markTarget() {
  const p = player, w = W();
  if (p.seq || p.marks.length >= p.loaded[p.weapon]) { if (!p.seq) toast('Keine Kugeln mehr zum Markieren', 1000); return; }
  camForward(_f); const d = _f.clone(); assist(camera.position, d);
  const hit = castRay(camera.position, d, w.range, 2);
  if (['head', 'body', 'animal', 'explosive'].includes(hit.kind) && !p.marks.includes(hit.ent)) { p.marks.push(hit.ent); SFX.click(); }
}
function executeDeadEye() {
  const p = player;
  if (p.seq) return;
  if (!p.marks.length) { endDeadEye(); return; }
  p.seq = { i: 0, t: 0 }; game.tsTarget = 0.35;
}
function endDeadEye() {
  const p = player;
  p.deadEyeOn = false; p.marks = []; p.seq = null; game.tsTarget = 1;
  renderer.domElement.style.filter = ''; $('deo').style.opacity = 0; SFX.deadEye(false);
}
function updateDeadEye(rdt) {
  const p = player;
  if (!p.deadEyeOn) return;
  if (!p.seq) { p.deadEye -= 6 * rdt; if (p.deadEye <= 0) { p.deadEye = 0; executeDeadEye(); } return; }
  p.seq.t -= rdt;
  if (p.seq.t <= 0) {
    if (p.seq.i >= p.marks.length) { endDeadEye(); return; }
    const e = p.marks[p.seq.i++];
    if (e && !e.dead && p.loaded[p.weapon] > 0) {
      const w = W();
      const isH = e.kind !== undefined, tgt = new V3(e.x, e.y + (isH ? 1.8 : 0.8), e.z);
      const mz = muzzlePos(new V3());
      spawnTracer(mz, tgt, 0xff5030, 0.25); muzzleFlash(mz); SFX.shot(0, w.heavy);
      p.loaded[p.weapon]--;
      if (e.kind === 'civilian' || e.kind === 'lawman') commitCrime(2);
      if (e.hurt) e.hurt(9999, true); else explodeBarrel(e, true);
      hitMarker(true); p.shake = 0.06;
      p.yaw = Math.atan2(e.x - p.x, e.z - p.z); p.faceT = 1;
    }
    p.seq.t = 0.28;
  }
}

// ---------- Pferd / Interaktion ----------
function mount() {
  const p = player, h = playerHorse;
  p.mounted = true; p.horse = h; h.rider = true; h.calling = false; h.speed = 0;
  pm.legs[0].rotation.z = -0.35; pm.legs[1].rotation.z = 0.35;
  SFX.whinny();
}
function dismount() {
  const p = player, h = p.horse;
  if (!h) return;
  p.mounted = false; h.rider = false; h.target = 0; h.turn = 0;
  p.x = h.x + Math.cos(h.yaw) * 1.4; p.z = h.z - Math.sin(h.yaw) * 1.4; p.y = heightAt(p.x, p.z); p.vx = p.vz = 0;
  p.yaw = h.yaw; pm.legs[0].rotation.z = 0; pm.legs[1].rotation.z = 0;
}
function whistle() {
  if (player.mounted) return;
  SFX.whistle(); playerHorse.calling = true; setTimeout(() => SFX.whinny(), 900);
  toast('Du pfeifst nach deinem Pferd', 1600);
}
let interactTarget = null;
function findInteract() {
  const p = player; let best = null, bd = 1e9;
  const cons = (x, z, r, label, fn) => { const d = Math.hypot(p.x - x, p.z - z); if (d < r && d < bd) { bd = d; best = { label, fn }; } };
  if (p.mounted) { cons(p.x, p.z, 99, 'Absteigen', () => dismount()); return best; }
  const h = playerHorse;
  cons(h.x, h.z, 3.4, 'Aufsitzen', mount);
  for (const c of humans) {
    if (c.dead && !c.looted) cons(c.x, c.z, 2.2, 'Plündern', () => loot(c));
    else if (!c.dead && c.kind === 'sheriff') cons(c.x, c.z, 3.6, 'Mit Sheriff Cole sprechen', talkSheriff);
    else if (!c.dead && c.duelist && !game.duel) cons(c.x, c.z, 4, 'Jack Riley zum Duell herausfordern', startDuel);
    else if (!c.dead && c.kind === 'civilian' && c.state !== 'flee') cons(c.x, c.z, 2.6, 'Ansprechen', () => { subtitle('Bürger', pick(TALK), 4000); c.yaw = Math.atan2(p.x - c.x, p.z - c.z); });
  }
  for (const a of animals) if (a.dead && !a.skinned && a.cfg.drops) cons(a.x, a.z, 2.6, `${a.cfg.name} abhäuten`, () => skin(a));
  for (const poi of POIS) {
    if (poi.type === 'store') cons(poi.x, poi.z, 3.8, 'Kramladen betreten', () => openMenu('shop', 'store'));
    if (poi.type === 'saloon') cons(poi.x, poi.z, 3.8, 'Saloon betreten', () => openMenu('shop', 'saloon'));
    if (poi.type === 'gunsmith') cons(poi.x, poi.z, 3.8, 'Waffenhändler betreten', () => openMenu('shop', 'gunsmith'));
  }
  return best;
}
function interact() { const t = findInteract(); if (t) t.fn(); }
function skin(a) {
  a.skinned = true; a.g.scale.set(1, 0.6, 1);
  const txt = [];
  for (const k in a.cfg.drops) { player.items[k] += a.cfg.drops[k]; txt.push(`${a.cfg.drops[k]}× ${ITEMS[k].name}`); }
  toast('Erhalten: ' + txt.join(', '), 2200); SFX.coin();
}
function loot(c) {
  c.looted = true; const p = player, txt = [];
  const m = c.kind === 'boss' ? 400 : Math.round(rand(KINDS[c.kind].bounty[0], KINDS[c.kind].bounty[1]));
  if (m) { p.money += m; txt.push('$' + m); }
  if (c.kind !== 'civilian') {
    const v = c.variant;
    if (v === 'shotgun') { const n = irand(3, 6); p.reserve.shell += n; txt.push(n + ' Schrotpatronen'); }
    else if (v === 'rifle') { const n = irand(3, 6); p.reserve.rifle += n; txt.push(n + ' Gewehrpatronen'); }
    else { const n = irand(4, 10); p.reserve.pistol += n; txt.push(n + ' Kugeln'); }
    if (v === 'dynamiter') { p.items.dynamite++; txt.push('1 Dynamit'); }
    if (Math.random() < 0.15) { p.items.tonic++; txt.push('Heiltonikum'); }
    if (Math.random() < 0.3) { p.items.watch++; txt.push('Taschenuhr'); }
    if (Math.random() < 0.15) { p.items.ring++; txt.push('Goldring'); }
    if (c.kind === 'boss') { p.items.nugget += 3; txt.push('3 Goldnuggets'); }
  }
  toast('Geplündert: ' + txt.join(', '), 2800); SFX.coin();
}

// ---------- Menüs: Rucksack & Shops ----------
const SHOPS = {
  store: {
    title: 'Kramladen', intro: 'Munition, Vorräte und Ankauf von Beute.', sell: true,
    rows: [
      { name: 'Revolverkugeln ×24', price: 8, fn: (p) => { p.reserve.pistol += 24; } },
      { name: 'Gewehrpatronen ×12', price: 9, fn: (p) => { p.reserve.rifle += 12; } },
      { name: 'Schrotpatronen ×10', price: 9, fn: (p) => { p.reserve.shell += 10; } },
      { name: 'Heiltonikum', price: 14, fn: (p) => { p.items.tonic++; } },
      { name: 'Dynamit ×2', price: 16, fn: (p) => { p.items.dynamite += 2; } },
      { name: 'Whiskey-Flasche', price: 6, fn: (p) => { p.items.whiskey++; } },
    ],
  },
  gunsmith: {
    title: 'Waffenhändler', intro: 'Neue Eisen für harte Zeiten.',
    rows: ['schof', 'mauser', 'shotgun', 'sniper'].map((k) => ({ weapon: k, name: WEAPONS[k].name, desc: WEAPONS[k].desc, price: WEAPONS[k].price })).concat([
      { name: 'Revolverkugeln ×24', price: 10, fn: (p) => { p.reserve.pistol += 24; } },
      { name: 'Gewehrpatronen ×12', price: 12, fn: (p) => { p.reserve.rifle += 12; } },
      { name: 'Schrotpatronen ×10', price: 12, fn: (p) => { p.reserve.shell += 10; } },
    ]),
  },
  saloon: {
    title: 'Saloon', intro: 'Ein kühler Whiskey und die neuesten Gerüchte.',
    rows: [
      { name: 'Whiskey trinken', desc: '+25 Gesundheit, +40 Dead Eye', price: 5, fn: (p) => { ITEMS.whiskey.use(p); } },
      { name: 'Gerücht hören', desc: 'Der Barkeeper flüstert…', price: 2, fn: () => { subtitle('Barkeeper', pick(['Am Ostende der Stadt steht Jack Riley. Der zieht schneller als sein Schatten.', 'Auf den Straßen lauern Banditen mit Kopfgeld. Schau in den Rucksack unter Journal.', 'Explosive Fässer in den Lagern? Ein Schuss reicht.', 'Wölfe streifen nachts durch die Ebene. Bleib in der Nähe von Lagerfeuern.', 'Im Fort von Black Jack kannst du mit Dynamit die Wachen ausräuchern.']), 7000); } },
      { name: 'Whiskey-Flasche mitnehmen', price: 6, fn: (p) => { p.items.whiskey++; } },
    ],
  },
};
function openMenu(kind, arg) {
  game.menu = kind; game.menuArg = arg; player.firing = false; player.aiming = false;
  try { document.exitPointerLock(); } catch (e) { /* egal */ }
  $('menu').style.display = 'flex'; renderMenu();
}
function closeMenu() {
  game.menu = null; $('menu').style.display = 'none';
  if (!game.noLock) requestLock();
}
function lootValue() { let v = 0; for (const k in ITEMS) if (ITEMS[k].sell) v += ITEMS[k].sell * player.items[k]; return v; }
function renderMenu() {
  const p = player, m = $('menubody');
  if (game.menu === 'pack') {
    const wRows = ORDER.filter((k) => p.owned.includes(k)).map((k) => {
      const w = WEAPONS[k];
      return `<div class="row ${p.weapon === k ? 'act' : ''}"><div class="rn"><b>${w.name}</b><small>Schaden ${w.dmg}${w.pellets > 1 ? '×' + w.pellets : ''} · ${p.loaded[k]}/${w.mag} geladen</small></div><button data-act="equip" data-id="${k}">${p.weapon === k ? 'Aktiv' : 'Ausrüsten'}</button></div>`;
    }).join('');
    const supply = ['tonic', 'whiskey', 'dynamite'].map((k) => `<div class="row"><div class="rn"><b>${ITEMS[k].name}</b><small>${ITEMS[k].desc}</small></div><span class="cnt">×${p.items[k]}</span>${ITEMS[k].use ? `<button data-act="use" data-id="${k}">Benutzen</button>` : ''}</div>`).join('')
      + Object.keys(AMMO_NAMES).map((k) => `<div class="row"><div class="rn"><b>${AMMO_NAMES[k]}</b></div><span class="cnt">${p.reserve[k]}</span></div>`).join('');
    const loot = ['meat', 'pelt', 'watch', 'ring', 'nugget'].map((k) => `<div class="row"><div class="rn"><b>${ITEMS[k].name}</b><small>${ITEMS[k].sell} $ pro Stück</small></div><span class="cnt">×${p.items[k]}</span></div>`).join('');
    const bnt = BOUNTY_TARGETS.map((b) => `<div class="row ${game.bountyDone[b.name] ? 'done' : ''}"><div class="rn"><b>${b.name}</b><small>Kopfgeld $${b.reward}</small></div><span class="cnt">${game.bountyDone[b.name] ? 'erledigt' : 'gesucht'}</span></div>`).join('');
    const q = QUEST[game.quest];
    m.innerHTML = `<div class="mh"><h2>RUCKSACK</h2><div class="mmoney">$${p.money}</div></div>
      <div class="cols">
        <div class="col"><h3>Waffen</h3>${wRows}</div>
        <div class="col"><h3>Vorräte &amp; Munition</h3>${supply}</div>
        <div class="col"><h3>Beute <small>(Wert $${lootValue()})</small></h3>${loot}<h3>Journal</h3><div class="row"><div class="rn"><b>Auftrag</b><small>${q.t}</small></div></div>${bnt}</div>
      </div><div class="mf">Tab / Esc = schließen · Beute verkaufst du im Kramladen</div>`;
  } else {
    const sh = SHOPS[game.menuArg];
    const rows = sh.rows.map((r, i) => {
      const owned = r.weapon && p.owned.includes(r.weapon);
      const can = p.money >= r.price && !owned;
      return `<div class="row"><div class="rn"><b>${r.name}</b><small>${r.desc || ''}</small></div><span class="cnt">${owned ? 'im Besitz' : '$' + r.price}</span><button data-act="buy" data-id="${i}" ${can ? '' : 'disabled'}>Kaufen</button></div>`;
    }).join('');
    const sell = sh.sell ? `<div class="row sellrow"><div class="rn"><b>Beute verkaufen</b><small>Fleisch, Felle, Schmuck, Nuggets</small></div><span class="cnt">$${lootValue()}</span><button data-act="sell" ${lootValue() > 0 ? '' : 'disabled'}>Alles verkaufen</button></div>` : '';
    m.innerHTML = `<div class="mh"><h2>${sh.title.toUpperCase()}</h2><div class="mmoney">$${p.money}</div></div><p class="intro">${sh.intro}</p><div class="col wide">${rows}${sell}</div><div class="mf">E / Esc = verlassen</div>`;
  }
}
function menuClick(e) {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  const p = player, id = b.dataset.id;
  if (b.dataset.act === 'equip') { p.weapon = id; p.reloadT = 0; applyWeaponModel(); }
  else if (b.dataset.act === 'use') useItem(id);
  else if (b.dataset.act === 'sell') { const v = lootValue(); p.money += v; for (const k in ITEMS) if (ITEMS[k].sell) p.items[k] = 0; toast(`Beute verkauft: $${v}`, 2000); SFX.coin(); }
  else if (b.dataset.act === 'buy') {
    const r = SHOPS[game.menuArg].rows[+id];
    if (p.money < r.price) return;
    p.money -= r.price;
    if (r.weapon) { p.owned.push(r.weapon); p.loaded[r.weapon] = WEAPONS[r.weapon].mag; p.reserve[WEAPONS[r.weapon].ammo] += WEAPONS[r.weapon].mag * 2; toast(WEAPONS[r.weapon].name + ' gekauft', 1800); }
    else r.fn(p);
    SFX.coin();
  }
  renderMenu();
}

// ---------- Duell ----------
function startDuel() {
  const d = game.duelist;
  if (!d || d.dead || game.duel) return;
  d.hp = d.maxHp; d.state = 'duel'; d.alertDelay = 0;
  game.duel = { state: 'count', t: rand(3, 6) };
  banner('DUELL', 'Warte auf das Glockenzeichen – dann zieh!', 3800);
  subtitle('Jack Riley', 'Wenn die Glocke läutet, ziehen wir. Nicht früher, Fremder.', 5000);
}
function updateDuel(rdt) {
  const D = game.duel, d = game.duelist;
  if (!D || d.dead) return;
  if (Math.hypot(player.x - d.x, player.z - d.z) > 28) { game.duel = null; d.state = 'duel'; toast('Duell abgebrochen', 2000); return; }
  if (D.state === 'count') {
    D.t -= rdt;
    if (D.t <= 0) { D.state = 'draw'; SFX.bell(); banner('ZIEH!', '', 1400); d.state = 'combat'; d.alertDelay = rand(0.42, 0.68); d.shootCd = 0; }
  }
}
// ---------- Missionen ----------
const QUEST = [
  { t: 'Sprich mit Sheriff Cole in Copper Creek', kind: 'talk' },
  { t: 'Vertreibe die Banditen aus Coyote Hollow (Nordwesten)', kind: 'clear', camp: 0, reward: 120, done: 'COYOTE HOLLOW GERÄUMT' },
  { t: 'Kehre zu Sheriff Cole zurück', kind: 'talk' },
  { t: 'Zerschlage das Lager Bone Ridge (Nordosten)', kind: 'clear', camp: 1, reward: 200, done: 'BONE RIDGE ZERSCHLAGEN' },
  { t: 'Melde dich bei Sheriff Cole', kind: 'talk' },
  { t: 'Stürme Black Jacks Fort (Südwesten) und erledige ihn', kind: 'clear', camp: 2, reward: 500, done: 'BLACK JACK IST TOT' },
  { t: 'Kehre zu Sheriff Cole nach Copper Creek zurück', kind: 'talk' },
  { t: 'Mission erfüllt – jage Kopfgelder, fordere Jack Riley heraus oder erkunde die Welt!', kind: 'done' },
];
const SHERIFF_LINES = {
  0: 'Willkommen in Copper Creek, Fremder. Die Coyote-Hollow-Bande überfällt unsere Kutschen. Räum ihr Lager im Nordwesten aus – ich zahle gut. Dein Pferd steht auf der Straße. Im Rucksack (Tab) findest du dein Dynamit.',
  2: 'Gute Arbeit! Hier ist dein Lohn. Aber im Nordosten, bei Bone Ridge, sitzt der Rest der Bande. Die haben Scharfschützen und Dynamit. Kauf dir beim Waffenhändler etwas Stärkeres.',
  4: 'Das hat gesessen. Jetzt fehlt nur noch der Kopf der Schlange: Black Jack Morgan, im Fort im Südwesten. Er hat viele Männer und Sprengstoff.',
  6: 'Es ist vorbei. Copper Creek ist frei. Du bist ein guter Mann, Fremder. Es laufen noch Banditen mit Kopfgeld herum, falls dir langweilig wird.',
};
function campAlive(i) { let n = 0; for (const h of humans) if (!h.dead && h.camp === i && (h.kind === 'outlaw' || h.kind === 'boss')) n++; return n; }
function campTotal(i) { return CAMPS[i].count + (CAMPS[i].fort ? 1 : 0); }
function talkSheriff() {
  const q = QUEST[game.quest];
  if (q.kind === 'talk') {
    subtitle('Sheriff Cole', SHERIFF_LINES[game.quest], 10000);
    if (game.pending > 0) { player.money += game.pending; toast(`Belohnung: $${game.pending}`, 3000); SFX.coin(); game.pending = 0; }
    game.quest++;
    if (QUEST[game.quest].kind === 'done') banner('SPIEL DURCHGESPIELT', 'Erkunde weiter, jage Kopfgelder oder genieße den Sonnenuntergang.', 8000);
  } else if (q.kind === 'clear') subtitle('Sheriff Cole', 'Worauf wartest du noch? ' + q.t + '.', 5000);
  else subtitle('Sheriff Cole', 'Copper Creek schläft ruhig, dank dir.', 4000);
}
function updateQuest() {
  const q = QUEST[game.quest];
  if (q.kind === 'clear' && campAlive(q.camp) === 0) {
    game.pending = q.reward; banner('MISSION ABGESCHLOSSEN', q.done + ' – Belohnung beim Sheriff abholen'); SFX.fanfare(); game.quest++;
  }
  if (game.sheriff && game.sheriff.dead) {
    game.sheriffT += 0.4;
    if (game.sheriffT > 40) { game.sheriffT = 0; game.sheriff = new Human('sheriff', -8.5, -9.4, { name: 'Sheriff Cole' }); }
  }
}
function questTarget() {
  const q = QUEST[game.quest];
  if (q.kind === 'talk') return game.sheriff && !game.sheriff.dead ? { x: game.sheriff.x, z: game.sheriff.z } : { x: -8.5, z: -9 };
  if (q.kind === 'clear') return { x: CAMPS[q.camp].x, z: CAMPS[q.camp].z };
  return null;
}
// ---------- Kills ----------
function onKill(h, head) {
  const p = player;
  game.kills++;
  if (h.kind === 'civilian') { addHonor(-12); commitCrime(2); toast('Unschuldiger getötet! Ehre −12', 2600); }
  else if (h.kind === 'lawman' || h.kind === 'sheriff') { addHonor(-8); game.wanted = Math.min(3, Math.max(game.wanted, 2) + (game.wanted >= 2 ? 1 : 0)); game.wantedT = 45; }
  else { addHonor(1.5); p.deadEye = Math.min(100, p.deadEye + (head ? 16 : 9)); }
  if (h.kind === 'boss') banner('BLACK JACK MORGAN', 'Der Anführer ist gefallen');
  if (h.bountyName) {
    game.bountyDone[h.bountyName] = true; p.money += h.bountyReward; addHonor(3);
    banner('KOPFGELD KASSIERT', `${h.bountyName} – $${h.bountyReward}`, 4500); SFX.fanfare();
  }
  if (h.duelist) {
    game.duel = null; p.money += 150; addHonor(6);
    banner('DUELL GEWONNEN', 'Jack Riley war schnell – du warst schneller. +$150', 5000); SFX.fanfare();
  }
  if (h.kind === 'boss' || (h.camp >= 0 && campAlive(h.camp) === 0) || h.duelist || (head && Math.random() < 0.18)) game.slowT = 1.0;
}

// ---------- Spielerbewegung ----------
function updatePlayerMotion(dt, rdt) {
  const p = player;
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const shift = keys.ShiftLeft || keys.ShiftRight;
  const lk = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0), lu = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
  if (lk || lu) { p.camYaw += lk * 1.8 * rdt; p.camPitch = clamp(p.camPitch + lu * 1.2 * rdt, -1.15, 1.2); }
  p.mouseMoveT += rdt;
  if (p.mounted) {
    const h = p.horse; h.rider = true;
    let target = 0;
    if (f > 0) {
      if (shift && !h.tired && h.stamina > 0) target = 17; else target = keys.ControlLeft ? 3.2 : 8;
    } else if (f < 0) target = h.speed > 1 ? 0 : -1.6;
    if (target > 12) { h.stamina -= 16 * dt; if (h.stamina <= 0) { h.stamina = 0; h.tired = true; } }
    else h.stamina = Math.min(100, h.stamina + 9 * dt);
    if (h.tired && h.stamina > 30) h.tired = false;
    h.target = target; h.turn = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
    p.x = h.x - Math.sin(h.yaw) * 0.1; p.z = h.z - Math.cos(h.yaw) * 0.1; p.y = h.y + 0.86; p.grounded = true;
    p.vx = Math.sin(h.yaw) * h.speed; p.vz = Math.cos(h.yaw) * h.speed;
    if (h.speed > 2 && p.mouseMoveT > 1.2 && !p.aiming) p.camYaw = lerpAngle(p.camYaw, h.yaw + Math.PI, 1 - Math.exp(-rdt * 1.5));
    p.yaw = h.yaw;
    return;
  }
  const sy = Math.sin(p.camYaw), cy = Math.cos(p.camYaw);
  let wx = -sy * f + cy * r, wz = -cy * f - sy * r;
  const wl = Math.hypot(wx, wz); if (wl > 0) { wx /= wl; wz /= wl; }
  let sp = shift ? 8.4 : 4.9;
  if (keys.ControlLeft) sp = 2.3;
  if (p.aiming) sp = Math.min(sp, 2.4);
  const inWater = p.y < WATER_Y + 0.8; if (inWater) sp *= 0.55;
  const a = 1 - Math.exp(-dt * 11);
  p.vx = lerp(p.vx, wx * sp, a); p.vz = lerp(p.vz, wz * sp, a);
  tryMove(p, p.vx * dt, p.vz * dt, 0.4, 1.4);
  const gh = heightAt(p.x, p.z);
  if (p.grounded && keys.Space && !p.deadEyeOn) { p.vy = 6.6; p.grounded = false; }
  if (!p.grounded) { p.vy -= 20 * dt; p.y += p.vy * dt; if (p.y <= gh) { p.y = gh; p.vy = 0; p.grounded = true; } }
  else if (p.y - gh > 0.6) p.grounded = false; else p.y = gh;
  if (inWater && p.grounded) p.y = Math.max(p.y, gh);
  if (p.faceT > 0) { p.faceT -= rdt; p.yaw = lerpAngle(p.yaw, p.camYaw + Math.PI, 1 - Math.exp(-rdt * 14)); }
  else if (wl > 0) p.yaw = lerpAngle(p.yaw, Math.atan2(wx, wz), 1 - Math.exp(-dt * 12));
  const spd = Math.hypot(p.vx, p.vz);
  p.phase += spd * dt * 2.3;
  p.stepAcc += spd * dt;
  if (p.stepAcc > 1.9 && p.grounded) { p.stepAcc = 0; SFX.step(clamp(spd / 6, 0.3, 1)); if (spd > 7) spawnPuff(new V3(p.x, p.y + 0.1, p.z), 0xbfa572, 1, 0.5, 0.6, 1, 1.2, 0.7); }
}
function animatePlayerModel() {
  const p = player, g = pm.g;
  g.position.set(p.x, p.y, p.z); g.rotation.y = p.yaw;
  if (!p.alive) { const f = Math.min(1, p.deadT / 0.6); g.rotation.x = -Math.PI / 2 * f * 0.98; g.position.y = p.y + 0.18 * f; return; }
  g.rotation.x = 0;
  const spd = p.mounted ? 0 : Math.hypot(p.vx, p.vz), amp = clamp(spd / 5, 0, 1) * 0.9, s = Math.sin(p.phase) * amp;
  if (!p.mounted) { pm.legs[0].rotation.x = s; pm.legs[1].rotation.x = -s; pm.legs[0].rotation.z = pm.legs[1].rotation.z = 0; }
  else { pm.legs[0].rotation.x = pm.legs[1].rotation.x = -0.35; }
  const armed = p.aiming || p.faceT > 0 || p.deadEyeOn, w = W();
  if (armed) {
    pm.arms[1].rotation.x = -Math.PI / 2 - (p.camPitch - 0.05);
    pm.arms[0].rotation.x = w.type === 'long' ? -Math.PI / 2 - (p.camPitch - 0.05) : -s * 0.5;
  } else if (p.reloadT > 0) { pm.arms[1].rotation.x = -1.0; pm.arms[0].rotation.x = -0.9; }
  else { pm.arms[1].rotation.x = s * 0.7; pm.arms[0].rotation.x = -s * 0.7; if (p.mounted) { pm.arms[0].rotation.x = pm.arms[1].rotation.x = -0.7; } }
}
// ---------- Kamera ----------
let camFov = 64;
function updateCamera(rdt) {
  const p = player, aim = p.aiming || p.deadEyeOn, w = W();
  const scoped = p.aiming && w.fov < 20;
  const dist = lerp(camera.userData.dist || 4.4, p.mounted ? (aim ? 3.6 : 6.4) : (aim ? (scoped ? 1.2 : 2.6) : 4.4), 1 - Math.exp(-rdt * 8)); camera.userData.dist = dist;
  const shoulder = lerp(camera.userData.sh || 0.3, aim ? (scoped ? 0.1 : 0.75) : 0.3, 1 - Math.exp(-rdt * 8)); camera.userData.sh = shoulder;
  let fovT = 64 + (p.mounted ? clamp(p.horse.speed - 8, 0, 9) * 0.7 : (keys.ShiftLeft && Math.hypot(p.vx, p.vz) > 6 ? 6 : 0));
  if (p.aiming) fovT = w.fov;
  camFov = lerp(camFov, fovT, 1 - Math.exp(-rdt * 9));
  if (Math.abs(camera.fov - camFov) > 0.05) { camera.fov = camFov; camera.updateProjectionMatrix(); }
  $('scope').style.display = scoped && camFov < 24 ? 'block' : 'none';
  eyePos(_v); camForward(_f);
  const rx = Math.cos(p.camYaw), rz = -Math.sin(p.camYaw);
  _o.set(_v.x - _f.x * dist + rx * shoulder, _v.y - _f.y * dist + 0.25, _v.z - _f.z * dist + rz * shoulder);
  _f.set(_o.x - _v.x, _o.y - _v.y, _o.z - _v.z); const l = _f.length(); _f.divideScalar(l);
  const t = worldRay(_v, _f, l);
  if (t < l) _o.copy(_v).addScaledVector(_f, Math.max(0.6, t - 0.4));
  _o.y = Math.max(_o.y, heightAt(_o.x, _o.z) + 0.5);
  if (p.shake > 0) { _o.x += rand(-1, 1) * p.shake; _o.y += rand(-1, 1) * p.shake; p.shake = Math.max(0, p.shake - rdt * 0.4); }
  camera.position.copy(_o);
  camera.rotation.set(p.camPitch, p.camYaw, 0);
  camera.updateMatrixWorld();
}
// ---------- Karte ----------
let mapCanvas;
function buildMapImage() {
  const seg = TERRAIN_SEG, n = seg + 1;
  mapCanvas = document.createElement('canvas'); mapCanvas.width = mapCanvas.height = n;
  const g = mapCanvas.getContext('2d'), im = g.createImageData(n, n);
  const col = terrainMesh.geometry.attributes.color.array, pos = terrainMesh.geometry.attributes.position.array;
  for (let i = 0; i < n * n; i++) {
    let r = col[i * 3], gg = col[i * 3 + 1], b = col[i * 3 + 2];
    const y = pos[i * 3 + 1];
    if (y < WATER_Y) { r = 0.25; gg = 0.5; b = 0.62; }
    const sh = 0.75 + clamp(y / 90, 0, 0.4);
    im.data[i * 4] = clamp(r * sh * 255 * 1.02 + 20, 0, 255); im.data[i * 4 + 1] = clamp(gg * sh * 255 + 12, 0, 255); im.data[i * 4 + 2] = clamp(b * sh * 255, 0, 255); im.data[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
}
function drawMarkers(ctx, s) {
  const p = player;
  for (const poi of POIS) {
    if (poi.type === 'store' || poi.type === 'saloon' || poi.type === 'sheriff' || poi.type === 'gunsmith') continue;
    ctx.fillStyle = poi.type === 'camp' ? '#c03020' : poi.type === 'town' ? '#f2d9a0' : '#e8c060';
    ctx.beginPath(); ctx.arc(poi.x, poi.z, 6 / s, 0, 7); ctx.fill();
  }
  for (const h of humans) {
    if (h.dead) continue;
    if (h.bountyName) { ctx.strokeStyle = '#ff9a20'; ctx.lineWidth = 2 / s; ctx.beginPath(); ctx.arc(h.x, h.z, 4.5 / s, 0, 7); ctx.stroke(); continue; }
    if (h.duelist) { ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(h.x, h.z, 3 / s, 0, 7); ctx.fill(); continue; }
    if (h.kind === 'outlaw' || h.kind === 'boss') { if (h.state !== 'combat' && Math.hypot(h.x - p.x, h.z - p.z) > 60) continue; ctx.fillStyle = '#e02818'; }
    else if (h.kind === 'lawman' || h.kind === 'sheriff') ctx.fillStyle = '#4a8ae0';
    else continue;
    ctx.beginPath(); ctx.arc(h.x, h.z, 2.6 / s, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#7a4a2a'; ctx.beginPath(); ctx.arc(playerHorse.x, playerHorse.z, 3 / s, 0, 7); ctx.fill();
  const qt = questTarget();
  if (qt) {
    ctx.save(); ctx.translate(qt.x, qt.z); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#ffd040'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5 / s;
    ctx.fillRect(-5 / s, -5 / s, 10 / s, 10 / s); ctx.strokeRect(-5 / s, -5 / s, 10 / s, 10 / s); ctx.restore();
  }
}
function drawMinimap() {
  const c = $('mini'), ctx = c.getContext('2d'), R = c.width / 2, p = player;
  const s = 0.72;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.save(); ctx.beginPath(); ctx.arc(R, R, R - 3, 0, 7); ctx.clip();
  ctx.fillStyle = '#2a2018'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.translate(R, R); ctx.rotate(p.camYaw); ctx.scale(s, s); ctx.translate(-p.x, -p.z);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(mapCanvas, -HALF, -HALF, WORLD, WORLD);
  drawMarkers(ctx, s);
  ctx.restore();
  const na = p.camYaw; ctx.fillStyle = '#f2d9a0'; ctx.font = 'bold 13px Georgia'; ctx.textAlign = 'center';
  ctx.fillText('N', R + Math.sin(na) * (R - 12), R - Math.cos(na) * (R - 12) + 5);
  ctx.save(); ctx.translate(R, R); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  const qt = questTarget();
  if (qt) {
    const dx = qt.x - p.x, dz = qt.z - p.z, d = Math.hypot(dx, dz);
    if (d * s > R - 10) {
      const ang = Math.atan2(dx, -dz) + p.camYaw;
      ctx.save(); ctx.translate(R + Math.sin(ang) * (R - 8), R - Math.cos(ang) * (R - 8)); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#ffd040'; ctx.fillRect(-5, -5, 10, 10); ctx.restore();
    }
  }
}
function drawBigMap() {
  const c = $('bigcanvas'), ctx = c.getContext('2d'), p = player;
  const sz = c.width, s = sz / WORLD;
  ctx.clearRect(0, 0, sz, sz);
  ctx.save(); ctx.scale(s, s); ctx.translate(HALF, HALF);
  ctx.drawImage(mapCanvas, -HALF, -HALF, WORLD, WORLD);
  drawMarkers(ctx, s * 1.4);
  ctx.restore();
  ctx.save(); ctx.translate((p.x + HALF) * s, (p.z + HALF) * s); ctx.rotate(-p.camYaw); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 9); ctx.lineTo(0, 4); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.font = 'bold 14px Georgia'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.textAlign = 'center';
  for (const poi of POIS) if (poi.type === 'camp' || poi.type === 'town' || poi.type === 'farm') { const x = (poi.x + HALF) * s, y = (poi.z + HALF) * s - 12; ctx.strokeText(poi.name, x, y); ctx.fillText(poi.name, x, y); }
}

// ---------- HUD ----------
const marksEls = [];
function updateHUD(rdt) {
  const p = player, w = W();
  $('hpfill').style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%';
  $('defill').style.width = clamp(p.deadEye, 0, 100) + '%';
  $('hp').classList.toggle('low', p.hp < 30);
  $('stam').style.display = p.mounted ? 'block' : 'none';
  if (p.mounted) { $('stfill').style.width = p.horse.stamina + '%'; $('stfill').style.background = p.horse.tired ? '#a03020' : '#c9a040'; }
  $('wname').textContent = w.name;
  $('ammo').textContent = p.reloadT > 0 ? 'Nachladen…' : `${p.loaded[p.weapon]} / ${p.reserve[w.ammo]}`;
  $('money').textContent = '$' + p.money;
  $('items').textContent = `Tonikum [F] ${p.items.tonic}   Dynamit [G] ${p.items.dynamite}`;
  $('stars').textContent = game.wanted > 0 ? '★'.repeat(game.wanted) + '☆'.repeat(3 - game.wanted) : '';
  $('honor').style.left = (50 + p.honor / 2) + '%';
  const q = QUEST[game.quest];
  let ot = q.t;
  if (q.kind === 'clear') ot += `  [${campTotal(q.camp) - campAlive(q.camp)}/${campTotal(q.camp)}]`;
  $('objective').textContent = ot;
  const hh = Math.floor(gameHours), mm = Math.floor((gameHours % 1) * 60);
  $('clock').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` + (rain > 0.3 ? '  Regen' : '');
  let loc = 'Wildnis';
  for (const z of ZONES) if (Math.hypot(p.x - z.x, p.z - z.z) < z.r) loc = z.name;
  $('loc').textContent = loc;
  interactTarget = p.alive && !game.paused && !game.menu ? findInteract() : null;
  const pr = $('prompt');
  if (interactTarget) { pr.textContent = '[E] ' + interactTarget.label; pr.style.opacity = 1; } else pr.style.opacity = 0;
  if (hmT > 0) { hmT -= rdt; if (hmT <= 0) $('hitm').className = ''; }
  const cross = $('cross');
  cross.classList.toggle('aim', p.aiming || p.deadEyeOn);
  if (p.aiming || p.deadEyeOn) {
    camForward(_f);
    const hit = castRay(camera.position, _f, 150, 2);
    cross.classList.toggle('enemy', ((hit.kind === 'head' || hit.kind === 'body') && hit.ent.kind !== 'civilian') || hit.kind === 'explosive');
  } else cross.classList.remove('enemy');
  while (marksEls.length < p.marks.length) { const d = document.createElement('div'); d.className = 'mark'; d.textContent = '✕'; $('marks').appendChild(d); marksEls.push(d); }
  marksEls.forEach((el, i) => {
    const e = p.marks[i];
    if (!e) { el.style.display = 'none'; return; }
    _v.set(e.x, e.y + (e.kind !== undefined ? 1.7 : 0.9), e.z).project(camera);
    if (_v.z > 1) { el.style.display = 'none'; return; }
    el.style.display = 'block'; el.style.left = (_v.x * 0.5 + 0.5) * innerWidth + 'px'; el.style.top = (-_v.y * 0.5 + 0.5) * innerHeight + 'px';
  });
  p.hurtFlash = Math.max(0, p.hurtFlash - rdt * 0.6);
  const lowH = p.hp < 35 ? (35 - p.hp) / 35 * 0.5 : 0;
  $('vig').style.opacity = Math.min(1, p.hurtFlash + lowH);
}
function updateCombatMusic() {
  let near = false;
  for (const h of humans) if (!h.dead && h.state === 'combat' && Math.hypot(h.x - player.x, h.z - player.z) < 70) { near = true; break; }
  SFX.setCombat(near);
}

// ---------- Hauptschleife ----------
let last = performance.now(), frameN = 0, titleT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.05, (now - last) / 1000); last = now;
  frameN++;
  const p = player;
  if (!game.started) {
    titleT += rdt; gameHours += rdt / 90;
    const cx = Math.cos(titleT * 0.12) * 55, cz = Math.sin(titleT * 0.12) * 55 + 5;
    camera.position.set(cx, Math.max(heightAt(cx, cz), TOWN.h) + 12 + Math.sin(titleT * 0.2) * 3, cz);
    camera.lookAt(0, TOWN.h + 5, 0); camera.updateMatrixWorld();
    updateEnv(gameHours, { x: 0, y: 0, z: 0 });
    updateWeather(rdt);
    updateGrassPatch(0, 10);
    updateEntities(rdt * 0.5, titleT); updateFX(rdt);
    for (const u of updatables) u(rdt, titleT);
    renderer.render(scene, camera);
    return;
  }
  if (!game.paused && !game.menu) {
    game.time += rdt;
    if (game.slowT > 0) { game.slowT -= rdt; if (!p.deadEyeOn) game.tsTarget = game.slowT > 0 ? 0.28 : 1; }
    game.timeScale += (game.tsTarget - game.timeScale) * Math.min(1, rdt * 6);
    const dt = rdt * game.timeScale;
    gameHours = (gameHours + rdt / 60) % 24;
    if (p.alive) {
      if (p.cd > 0) p.cd -= dt;
      if (p.throwCd > 0) p.throwCd -= dt;
      if (p.reloadT > 0) { p.reloadT -= dt; if (p.reloadT <= 0) finishReload(); }
      updatePlayerMotion(dt, rdt);
      if (p.firing && !p.deadEyeOn) fire();
      if (game.time - p.lastHurt > 6 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 4 * dt);
      p.deadEye = Math.min(100, p.deadEye + (p.deadEyeOn ? 0 : 0.25 * dt));
      updateDeadEye(rdt);
      updateDuel(rdt);
    } else {
      p.deadT += rdt;
      if (p.deadT > 4.5) respawn();
    }
    updateEntities(dt, game.time);
    for (const u of updatables) u(dt, game.time);
    updateFX(rdt);
    updateWeather(rdt);
    updateGrassPatch(p.x, p.z);
    if (game.wanted > 0) {
      let seen = false;
      for (const h of humans) if (!h.dead && (h.kind === 'lawman' || h.kind === 'sheriff') && Math.hypot(h.x - p.x, h.z - p.z) < 50) { seen = true; break; }
      game.wantedT -= seen ? 0 : dt;
      if (seen) game.wantedT = Math.max(game.wantedT, 20);
      if (game.wantedT <= 0) { game.wanted--; game.wantedT = 25; if (game.wanted === 0) toast('Du bist nicht mehr gesucht', 2500); }
      game.lawT -= dt;
      const spawned = humans.filter((h) => h.spawned && !h.dead).length;
      if (game.lawT <= 0 && spawned < 2 * game.wanted + 1 && p.alive) {
        const a = rand(0, 6.28), d = rand(65, 90), x = clamp(p.x + Math.cos(a) * d, -700, 700), z = clamp(p.z + Math.sin(a) * d, -700, 700);
        if (heightAt(x, z) > WATER_Y + 1) { const l = new Human('lawman', x, z, { spawned: true, variant: Math.random() < 0.35 ? 'shotgun' : 'gun' }); l.state = 'combat'; l.alertDelay = 1; }
        game.lawT = 6;
      }
    } else {
      for (const h of humans) if (h.spawned && !h.dead && Math.hypot(h.x - p.x, h.z - p.z) > 45 && !h.removeT) h.removeT = 1;
      for (let i = humans.length - 1; i >= 0; i--) if (humans[i].removeT) { scene.remove(humans[i].g); humans.splice(i, 1); }
    }
    game.questT += rdt; if (game.questT > 0.4) { game.questT = 0; updateQuest(); updateCombatMusic(); }
    game.cricketT -= rdt;
    if (game.cricketT <= 0) { game.cricketT = rand(0.4, 1.4); if (nightFactor > 0.5 && rain < 0.3) SFX.cricket(); else if (Math.random() < 0.02) SFX.coyote(); }
    SFX.setWind(p.mounted ? clamp(p.horse.speed / 17, 0, 1) : 0.1);
  }
  animatePlayerModel();
  if (window.MP) MP.tick(rdt);
  updateCamera(rdt);
  updateEnv(gameHours, { x: p.x, y: p.y, z: p.z });
  updateHUD(rdt);
  if (frameN % 2 === 0) drawMinimap();
  if ($('bigmap').style.display === 'flex' && frameN % 6 === 0) drawBigMap();
  renderer.render(scene, camera);
}

// ---------- Start ----------
function init() {
  const loading = $('loading');
  $('menubody').addEventListener('click', menuClick);
  $('menuclose').addEventListener('click', closeMenu);
  setTimeout(() => {
    try {
      buildWorld();
      populate();
      buildMapImage();
      pm = makeHumanoid({ shirt: 0x3a5a8a, pants: 0x2f2a26, hat: 0x5a3a22, vest: 0x4a3020, scarf: 0xb02020, coat: 0x6b4a2e, stache: true, band: 0x1a1a1a, hair: 0x3a2818 });
      scene.add(pm.g);
      applyWeaponModel();
      player.y = heightAt(player.x, player.z);
      camera.position.set(40, 20, 40);
      loading.style.display = 'none'; $('title').style.display = 'flex';
      requestAnimationFrame(frame);
    } catch (e) { loading.textContent = 'Fehler beim Laden: ' + e.message; console.error(e); }
  }, 50);
  $('btnPlay').addEventListener('click', () => {
    SFX.init();
    game.started = true; $('title').style.display = 'none'; $('hud').style.display = 'block';
    player.camYaw = 0; player.firing = false;
    requestLock();
    setTimeout(() => { if (!document.pointerLockElement && !game.noLock) { game.noLock = true; toast('Blick mit Pfeiltasten (oder Maus, wenn gesperrt). P = Pause', 5000); } }, 600);
    toast('Willkommen in Copper Creek. Sprich mit dem Sheriff!', 4500);
  });
  $('pause').addEventListener('click', () => {
    if (game.noLock) { setPaused(false); return; }
    requestLock();
  });
}
window.addEventListener('DOMContentLoaded', init);
