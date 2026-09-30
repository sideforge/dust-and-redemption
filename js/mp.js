'use strict';
// Peer-to-peer Mehrspieler (WebRTC via PeerJS). Host relayt Nachrichten zwischen Clients (Stern-Topologie).
(() => {
  const PREFIX = 'dustred-';
  const COLORS = [0x9a3a2a, 0x2a5a8a, 0x3a7a3a, 0x7a4a9a, 0x9a7a2a, 0x2a7a7a];
  const remotes = new Map();
  const conns = new Map(); // nur Host: id -> DataConnection
  let peer = null, isHost = false, hostConn = null, myId = null, room = '', myName = 'Cowboy', myColor = 0, sendT = 0, active = false;

  const hud = document.createElement('div'); hud.id = 'mpHud'; document.body.appendChild(hud);
  const status = (s) => { const el = document.getElementById('mpStatus'); if (el) el.textContent = s; };
  const updateHud = () => { hud.style.display = active ? 'block' : 'none'; hud.textContent = `RAUM ${room} · ${remotes.size + 1} Spieler`; };

  function nameTag(text) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d'); g.font = '30px "Special Elite", Georgia, serif'; g.textAlign = 'center';
    g.lineWidth = 5; g.strokeStyle = '#000'; g.strokeText(text, 128, 42); g.fillStyle = '#f2e2b8'; g.fillText(text, 128, 42);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    s.scale.set(2, 0.5, 1); s.position.y = 2.6; s.renderOrder = 10; return s;
  }

  function getRemote(id, m) {
    let r = remotes.get(id);
    if (r) return r;
    const model = makeHumanoid({ shirt: COLORS[(m.c || 0) % COLORS.length], pants: 0x2f3a4a, hat: 0x3a2a1a, vest: 0x4a3020, scarf: 0xc9b060 });
    const tag = nameTag(m.n || 'Cowboy'); model.g.add(tag);
    scene.add(model.g);
    r = { id, name: m.n || 'Cowboy', model, x: m.x, y: m.y, z: m.z, yaw: m.yaw, tx: m.x, ty: m.y, tz: m.z, tyaw: m.yaw, alive: true, aim: false, pitch: 0, weapon: 'rev', mounted: false, sp: 0, phase: 0, deadT: 0 };
    remotes.set(id, r); updateHud();
    toast(`${r.name} ist beigetreten`, 2500);
    return r;
  }
  function dropRemote(id) {
    const r = remotes.get(id); if (!r) return;
    scene.remove(r.model.g); remotes.delete(id); updateHud(); toast(`${r.name} ist gegangen`, 2500);
  }

  function sendAll(msg, except) {
    if (isHost) { for (const [id, c] of conns) if (id !== except && c.open) c.send(msg); }
    else if (hostConn && hostConn.open) hostConn.send(msg);
  }

  function onMsg(m, fromId) {
    if (!m || typeof m !== 'object') return;
    if (isHost) sendAll(m, fromId); // relayen
    switch (m.t) {
      case 's': {
        if (m.id === myId) return;
        const r = getRemote(m.id, m);
        r.tx = m.x; r.ty = m.y; r.tz = m.z; r.tyaw = m.yaw; r.pitch = m.p; r.aim = !!m.aim; r.weapon = m.w; r.mounted = !!m.m; r.sp = m.sp;
        if (r.alive && !m.a) r.deadT = 0; r.alive = !!m.a; r.name = m.n || r.name;
        break;
      }
      case 'sh': {
        if (m.id === myId) return;
        const a = new V3(...m.a), b = new V3(...m.b);
        spawnTracer(a, b, 0xfff0b0, 0.07); muzzleFlash(a);
        try { SFX.shot(0, false); } catch (e) { }
        break;
      }
      case 'h': if (m.to === myId) { const was = player.alive; damagePlayer(m.d, 0, 0); if (was && !player.alive) sendAll({ t: 'k', by: m.by, byName: m.byName, victim: myName }); } break;
      case 'k': toast(`${m.byName} hat ${m.victim} erschossen`, 3500); if (m.by === myId) { player.money += 10; } break;
      case 'l': dropRemote(m.id); break;
    }
  }

  function attach(conn) {
    conn.on('data', (m) => onMsg(m, conn.peer));
    conn.on('close', () => { if (isHost) { conns.delete(conn.peer); dropRemote(conn.peer); sendAll({ t: 'l', id: conn.peer }); } else { toast('Host hat das Spiel verlassen', 5000); for (const id of [...remotes.keys()]) dropRemote(id); active = false; updateHud(); } });
  }

  function start(name, code) {
    myName = (name || '').trim() || 'Cowboy'; myColor = Math.floor(Math.random() * COLORS.length);
    if (typeof Peer === 'undefined') { status('Mehrspieler nicht verfügbar (PeerJS blockiert). Solo-Modus.'); return; }
    if (!code) {
      isHost = true; room = Math.random().toString(36).slice(2, 6).toUpperCase();
      peer = new Peer(PREFIX + room);
      peer.on('open', (id) => { myId = id; active = true; updateHud(); toast(`Raumcode: ${room} – Freunde geben ihn ein`, 8000); });
      peer.on('connection', (c) => { c.on('open', () => { conns.set(c.peer, c); attach(c); }); });
      peer.on('error', (e) => toast('Netzwerkfehler: ' + e.type, 4000));
    } else {
      room = code.trim().toUpperCase(); peer = new Peer();
      peer.on('open', (id) => {
        myId = id; hostConn = peer.connect(PREFIX + room);
        hostConn.on('open', () => { attach(hostConn); active = true; updateHud(); toast(`Raum ${room} beigetreten`, 3000); });
      });
      peer.on('error', (e) => toast(e.type === 'peer-unavailable' ? `Raum ${room} nicht gefunden` : 'Netzwerkfehler: ' + e.type, 5000));
    }
  }

  window.MP = {
    remotes,
    sendShot(a, b) { if (active) sendAll({ t: 'sh', id: myId, a: [a.x, a.y, a.z], b: [b.x, b.y, b.z] }); },
    sendHit(to, d, head) { if (!active) return; if (to === myId) return; const m = { t: 'h', to, d, by: myId, byName: myName }; if (isHost && conns.has(to)) conns.get(to).send(m); else sendAll(m); },
    tick(dt) {
      if (!active) return;
      sendT -= dt;
      if (sendT <= 0) {
        sendT = 1 / 15; const p = player;
        sendAll({ t: 's', id: myId, n: myName, c: myColor, x: p.x, y: p.y, z: p.z, yaw: p.yaw, p: p.camPitch, a: p.alive, aim: p.aiming || p.faceT > 0, w: p.weapon, m: p.mounted, sp: p.mounted ? 0 : Math.hypot(p.vx, p.vz) });
      }
      const k = 1 - Math.exp(-dt * 14);
      for (const r of remotes.values()) {
        r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; r.z += (r.tz - r.z) * k; r.yaw = lerpAngle(r.yaw, r.tyaw, k);
        const m = r.model, g = m.g;
        g.position.set(r.x, r.y, r.z); g.rotation.y = r.yaw;
        const rw = WEAPONS[r.weapon] || WEAPONS.rev; m.gun.visible = rw.type === 'pistol'; m.rifle.visible = rw.type === 'long';
        if (!r.alive) { r.deadT += dt; const f = Math.min(1, r.deadT / 0.6); g.rotation.x = -Math.PI / 2 * f * 0.98; g.position.y = r.y + 0.18 * f; continue; }
        g.rotation.x = 0;
        r.phase += r.sp * dt * 2.3;
        const amp = clamp(r.sp / 5, 0, 1) * 0.9, s = Math.sin(r.phase) * amp;
        if (r.mounted) m.legs[0].rotation.x = m.legs[1].rotation.x = -0.35; else { m.legs[0].rotation.x = s; m.legs[1].rotation.x = -s; }
        if (r.aim) { m.arms[1].rotation.x = -Math.PI / 2 - (r.pitch - 0.05); m.arms[0].rotation.x = rw.type === 'long' ? m.arms[1].rotation.x : -s * 0.5; }
        else { m.arms[1].rotation.x = r.mounted ? -0.7 : s * 0.7; m.arms[0].rotation.x = r.mounted ? -0.7 : -s * 0.7; }
      }
    },
  };

  addEventListener('beforeunload', () => { if (active) sendAll({ t: 'l', id: myId }); });
  const btn = document.getElementById('btnPlay');
  btn.addEventListener('click', () => { if (!peer) start(document.getElementById('mpName').value, document.getElementById('mpRoom').value); });
  for (const id of ['mpName', 'mpRoom']) document.getElementById(id).addEventListener('keydown', (e) => e.stopPropagation());
  // Raumcode per Link: ?room=ABCD
  const q = new URLSearchParams(location.search).get('room'); if (q) document.getElementById('mpRoom').value = q;
})();
