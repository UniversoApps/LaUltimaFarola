/* La última farola — motor de juego */
(function () {
  const LF = window.LF;
  const T = LF.T, W = 480, H = 270;
  const LAMP_R = 128;
  const G = (LF.game = {});
  const I = LF.input;

  /* ---------- parámetros de control (ajustados para sentirse bien) ---------- */
  const P = {
    run: 100, accG: 1500, decG: 1900, accA: 1050, decA: 650,
    jumpV: 300, grav: 860, fallMul: 1.6, apexMul: 0.55, apexBand: 45, maxFall: 330, cut: 0.45,
    coyote: 0.1, buffer: 0.12,
    dashV: 250, dashT: 0.16,
    swimV: 78, swimUp: 95, sink: 18, leap: 375
  };
  G.P = P;

  G.mode = 'none';
  G.settings = null;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function approach(v, t, d) { return v < t ? Math.min(t, v + d) : Math.max(t, v - d); }

  /* ---------- carga de niveles ---------- */
  G.loadLevel = function (act, opts) {
    opts = opts || {};
    const def = act === 'epilogo' ? LF.epilogue : LF.levels[act];
    G.act = act; G.def = def;
    const b = def.build();
    G.w = b.w; G.h = b.h; G.map = b.g.map(r => r.slice());
    G.pal = LF.palettes[def.pal];
    G.tiles = LF.makeTiles(def.pal, def.key);
    G.bg = LF.makeBackground(def.pal, def.key);
    G.lamps = []; G.items = []; G.wisps = []; G.sparks = []; G.particles = []; G.barks = [];
    G.goal = null; G.big = null; G.orb = null;
    G.triggers = b.triggers.map(t => Object.assign({ fired: false }, t));
    G.time = 0; G.shake = 0; G.flash = 0;
    G.script = null; G.cutscene = false; G.locked = false; G.auto = null;
    G.blackout = null; G.final = null; G.dawn = 0; G.darkMul = 1; G.fogWall = null;
    G.chase = def.chase ? { started: false, fogY: 0, done: false } : null;
    G.demo = !!opts.demo;
    const actIdx = typeof act === 'number' ? act : 5;
    G.abil = { spark: actIdx > 1, water: actIdx > 2, dash: actIdx > 3 };
    let start = { x: 40, y: 100 };
    const cardsHere = LF.postcards.filter(c => c.act === actIdx);
    const pcs = [];
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
      const c = G.map[y][x]; const cx = x * T + T / 2, by = (y + 1) * T;
      if ('PLopRWVGBA'.indexOf(c) < 0) continue;
      G.map[y][x] = (G.map[y][x - 1] === 'b' || G.map[y][x + 1] === 'b') ? 'b' : ' ';
      if (c === 'P') start = { x: cx, y: by };
      else if (c === 'L') G.lamps.push({ x: cx, y: by, lit: false, tx: x, ty: y, flare: 0 });
      else if (c === 'o') G.items.push({ k: 'oil', x: cx, y: y * T + 8, ph: Math.random() * 6 });
      else if (c === 'p') pcs.push({ k: 'card', x: cx, y: y * T + 8, ph: Math.random() * 6 });
      else if (c === 'R') G.orb = { x: cx, y: y * T + 6, taken: false, ph: 0 };
      else if (c === 'W' || c === 'V') G.wisps.push({ kind: c === 'W' ? 'h' : 'v', ox: cx, oy: y * T + 8, x: cx, y: y * T + 8, ph: Math.random() * 6, alive: true, puff: 0 });
      else if (c === 'G') G.goal = { x: cx, y: by };
      else if (c === 'B') G.big = { x: cx, y: by, lit: false };
    }
    pcs.sort((a, b) => a.x - b.x || a.y - b.y);
    pcs.forEach((p, i) => { p.id = cardsHere[i] ? cardsHere[i].id : 'x' + i; if (!LF.save.cards[p.id]) G.items.push(p); });

    // Alba (prólogo)
    G.alba = null;
    if (b.alba && b.alba.length) {
      const m = b.alba.map(([x, y]) => ({ x: x * T + 8, y: (y + 1) * T }));
      G.alba = { marks: m, i: 0, x: m[0].x, y: m[0].y, tw: null, alpha: 1, dir: 1, frame: 0, show: !G.demo };
    }
    // jugadora
    G.player = {
      x: start.x, y: start.y, vx: 0, vy: 0, w: 8, h: 14, dir: 1, onGround: false, wasGround: false,
      coyote: 0, buffer: 0, cutDone: false, dashT: 0, canDash: true, inWater: false, wasWater: false,
      oil: 100, dead: false, deadT: 0, anim: 0, frame: 0, sx: 1, sy: 1, dropT: 0, sparkCD: 0, invT: 0,
      standTile: null, scarf: []
    };
    for (let i = 0; i < 7; i++) G.player.scarf.push({ x: start.x - i * 2, y: start.y - 10, px: start.x - i * 2, py: start.y - 10 });
    G.checkpoint = { x: start.x, y: start.y, lamp: -1 };
    G.fish = (actIdx >= 1 && act !== 'epilogo' && !G.demo) ? { x: start.x - 14, y: start.y - 24, dir: 1, t: 0 } : null;
    if (act === 'epilogo') G.fish = { x: start.x - 14, y: start.y - 24, dir: 1, t: 0 };

    // reanudar desde una farola
    if (opts.lamp != null && G.lamps[opts.lamp]) {
      const l = G.lamps[opts.lamp]; l.lit = true;
      G.player.x = l.x + 10; G.player.y = l.y; G.checkpoint = { x: l.x + 10, y: l.y, lamp: opts.lamp };
      for (const t of G.triggers) {
        if (t.x != null && t.x * T < l.x) t.fired = true;
        if (t.y != null && t.y * T > l.y) t.fired = true;
      }
      if (G.orb && ((def.vertical && G.orb.y > l.y - 8) || (!def.vertical && G.orb.x < l.x))) { G.orb.taken = true; grantAbility(actIdx, true); }
      if (G.alba) G.alba.show = false;
      if (G.chase && l.y < def.chase.start * T) { G.chase.started = true; G.chase.fogY = G.player.y + 170; }
    }
    if (G.demo) G.lamps.forEach(l => (l.lit = true));
    if (act === 'epilogo') { G.auto = { vx: 42 }; G.darkMul = 0.9; G.alba = { marks: [], i: 0, x: start.x - 12, y: start.y, alpha: 1, dir: 1, frame: 0, show: true, follow: true }; }

    G.cam = { x: 0, y: 0, look: 0, anchorY: G.player.y };
    snapCamera();
    G.mode = G.demo ? 'demo' : 'play';
    if (!G.demo) {
      LF.audio.playMusic(def.music); LF.audio.playAmb(def.amb);
      if (def.num && !opts.lamp) LF.ui.showTitleCard(def.num, def.name);
    }
  };

  function grantAbility(actIdx, silent) {
    const k = actIdx === 1 ? 'spark' : actIdx === 2 ? 'water' : actIdx === 3 ? 'dash' : null;
    if (!k) return null;
    G.abil[k] = true; if (!silent) LF.ui.refreshTouch(); else setTimeout(() => LF.ui.refreshTouch(), 0);
    return k;
  }

  function snapCamera() {
    const p = G.player; const c = G.cam;
    c.anchorY = p.y;
    c.x = p.x - W / 2; c.y = G.def.vertical ? p.y - 160 : p.y - H * 0.62;
    clampCam();
  }
  function clampCam() {
    const c = G.cam;
    const mw = G.w * T, mh = G.h * T;
    c.x = mw <= W ? (mw - W) / 2 : clamp(c.x, 0, mw - W);
    c.y = clamp(c.y, 0, mh - H);
  }

  /* ---------- consultas de mapa ---------- */
  function tile(tx, ty) {
    if (tx < 0 || tx >= G.w) return '#';
    if (ty < 0 || ty >= G.h) return ' ';
    return G.map[ty][tx];
  }
  G.tile = tile;
  const blocking = (c, dashing) => c === '#' || (c === 'd' && !dashing);
  const oneWay = c => c === '=' || c === 'm' || c === 'M';

  // luces activas (se recalculan en cada paso)
  G.lights = [];
  function playerLightR() { const p = G.player; return p.dead ? 0 : 26 + 64 * (p.oil / 100); }
  function lanternPos() { const p = G.player; return { x: p.x + p.dir * 6, y: p.y - 7 }; }
  function buildLights() {
    const L = []; G.lights = L;
    if (G.mode === 'play' || G.mode === 'demo') {
      const p = G.player;
      if (!p.dead && !G.demo) { const lp = lanternPos(); L.push({ x: lp.x, y: lp.y, r: playerLightR(), k: 'p', warm: 1 }); }
      for (const l of G.lamps) if (l.lit) L.push({ x: l.x, y: l.y - 25, r: LAMP_R * (1 + l.flare * 0.3), k: 'lamp', warm: 1 });
      for (const s of G.sparks) L.push({ x: s.x, y: s.y, r: 42, k: 'spark', warm: 1 });
      for (const it of G.items) if (it.k === 'oil') L.push({ x: it.x, y: it.y, r: 14, k: 'it', warm: 1 });
      if (G.orb && !G.orb.taken) L.push({ x: G.orb.x, y: G.orb.y, r: 34, k: 'orb', warm: 1 });
      if (G.goal) L.push({ x: G.goal.x, y: G.goal.y - 14, r: 34, k: 'goal', warm: 1 });
      if (G.fish) L.push({ x: G.fish.x, y: G.fish.y, r: 20, k: 'fish', warm: 0 });
      if (G.alba && G.alba.show && G.alba.alpha > 0.3 && !G.alba.follow) L.push({ x: G.alba.x + G.alba.dir * 7, y: G.alba.y - 9, r: 54 * G.alba.alpha, k: 'alba', warm: 1 });
      if (G.big) L.push({ x: G.big.x, y: G.big.y - 18, r: G.big.lit ? 600 : 30, k: 'big', warm: 1 });
      if (G.final) L.push({ x: G.big.x, y: G.big.y - 18, r: Math.min(900, G.final.t * 380), k: 'big', warm: 1 });
    }
  }
  function litAny(cx, cy, extra) {
    for (const l of G.lights) { if (l.k === 'fish' || l.k === 'it') continue; const r = l.r + (l.k === 'p' ? (extra || 0) : 0); const dx = cx - l.x, dy = cy - l.y; if (dx * dx + dy * dy < r * r) return true; }
    return false;
  }
  function litLamp(cx, cy) {
    for (const l of G.lights) { if (l.k !== 'lamp' && l.k !== 'big') continue; const dx = cx - l.x, dy = cy - l.y; if (dx * dx + dy * dy < l.r * l.r) return true; }
    return false;
  }
  function memAmount(tx, ty, c) {
    const cx = tx * T + 8, cy = ty * T + 4;
    let best = 0;
    for (const l of G.lights) {
      if (l.k === 'fish' || l.k === 'it' || l.k === 'orb' || l.k === 'goal') continue;
      if (c === 'M' && l.k !== 'lamp' && l.k !== 'big') continue;
      const d = Math.hypot(cx - l.x, cy - l.y); const a = clamp((l.r - d) / 14, 0, 1); if (a > best) best = a;
    }
    return best;
  }
  function oneWaySolid(tx, ty, c) {
    if (c === '=') return true;
    const p = G.player; const standing = p.standTile && p.standTile[0] === tx && p.standTile[1] === ty;
    const cx = tx * T + 8, cy = ty * T + 4;
    if (c === 'm') return litAny(cx, cy, standing ? 10 : 0);
    if (c === 'M') return litLamp(cx, cy);
    return false;
  }
  G.isWater = (x, y) => tile(Math.floor(x / T), Math.floor(y / T)) === 'w';

  function overlapsBlocking(x, y, w, h, dashing) {
    const x0 = Math.floor((x - w / 2 + 0.01) / T), x1 = Math.floor((x + w / 2 - 0.01) / T);
    const y0 = Math.floor((y - h + 0.01) / T), y1 = Math.floor((y - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (blocking(tile(tx, ty), dashing)) return true;
    return false;
  }

  /* ---------- física de la jugadora ---------- */
  function updatePlayer(dt) {
    const p = G.player;
    if (p.dead) { p.deadT -= dt; if (p.deadT <= 0) respawn(); return; }
    const inp = I.held, pr = I.pressed;
    let ax = 0, up = 0, down = 0, jumpP = false, jumpH = false, jumpR = false, sparkP = false, dashP = false;
    if (G.auto) { ax = 1; }
    else if (!G.cutscene && !G.locked) {
      ax = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      if (I.device === 'touch' && Math.abs(I.axisX) > 0.2 && ax) ax = I.axisX > 0 ? 1 : -1;
      up = inp.up; down = inp.down; jumpP = pr.jump; jumpH = inp.jump; jumpR = I.released.jump; sparkP = pr.spark; dashP = pr.dash;
    }
    p.prevY = p.y;
    p.wasGround = p.onGround;
    p.wasWater = p.inWater;
    p.inWater = G.isWater(p.x, p.y - 7);
    if (p.inWater && !p.wasWater && p.vy > 40) { splash(p.x, p.y - 7); LF.audio.sfx('splash'); }
    // salir nadando: si sube con salto o arriba apretado, el pez la impulsa fuera del agua
    if (!p.inWater && p.wasWater && p.vy < 0 && (jumpH || up) && G.abil.water) { p.vy = -P.leap * 0.92; splash(p.x, p.y - 4); LF.audio.sfx('splash'); p.sx = 0.75; p.sy = 1.3; }
    if (p.inWater && !G.abil.water) { if (!LF.settings.invincible) return die('agua'); }
    if (p.inWater && !G.abil.water && LF.settings.invincible) { return respawn(true); }

    p.sparkCD -= dt; p.dropT -= dt; p.invT -= dt;
    if (ax) p.dir = ax;

    // chispa
    if (sparkP && G.abil.spark && p.sparkCD <= 0) {
      if (p.oil >= 8 || LF.settings.infiniteOil) {
        const lp = lanternPos(); const aimUp = up;
        const dx = aimUp ? p.dir * 0.72 : p.dir, dy = aimUp ? -0.72 : 0;
        G.sparks.push({ x: lp.x, y: lp.y, vx: dx * 270, vy: dy * 270, life: 0.85 });
        if (!LF.settings.infiniteOil) p.oil -= 8;
        p.sparkCD = 0.3; LF.audio.sfx('spark');
      } else { p.sparkCD = 0.3; LF.audio.sfx('fizz'); }
    }
    // impulso
    if (dashP && G.abil.dash && p.canDash && p.dashT <= 0) {
      p.dashT = P.dashT; p.dashTotal = 0; p.canDash = false; p.vy = 0; p.invT = 0.25;
      LF.audio.sfx('dash'); G.shake = Math.max(G.shake, 2);
    }

    if (p.dashT > 0) {
      p.dashT -= dt; p.dashTotal += dt;
      p.vx = p.dir * P.dashV; p.vy = 0;
      if (Math.random() < 0.8) G.particles.push({ x: p.x - p.dir * 3, y: p.y - rand(3, 12), vx: -p.dir * 20, vy: rand(-10, 10), life: 0.35, max: 0.35, c: Math.random() < 0.5 ? '#9b7cd8' : '#f5c542', s: 2, glow: 1 });
      if (p.dashT <= 0 && overlapsBlocking(p.x, p.y, p.w, p.h, false) && p.dashTotal < 0.45) p.dashT = 0.02;
    } else if (p.inWater) {
      p.vx = approach(p.vx, ax * P.swimV, 700 * dt);
      const want = (up || jumpH) ? -P.swimUp : down ? P.swimUp : P.sink;
      p.vy = approach(p.vy, want, 520 * dt);
      p.canDash = true;
      if (jumpP) {
        const nearSurface = !G.isWater(p.x, p.y - p.h - 12);
        if (nearSurface) { p.vy = -P.leap; splash(p.x, p.y - 10); LF.audio.sfx('splash'); p.sx = 0.7; p.sy = 1.35; }
        else { p.vy = Math.min(p.vy, -140); LF.audio.sfx('swim'); for (let i = 0; i < 3; i++) bubble(p.x, p.y - 10); }
      }
      if (Math.random() < 0.05) bubble(p.x + p.dir * 5, p.y - 12);
    } else {
      const acc = p.onGround ? P.accG : P.accA, dec = p.onGround ? P.decG : P.decA;
      if (ax) { const boost = Math.sign(p.vx) !== ax ? 1.6 : 1; p.vx = approach(p.vx, ax * P.run * (G.auto ? G.auto.vx / P.run : 1), acc * boost * dt); }
      else p.vx = approach(p.vx, 0, dec * dt);
      let g = P.grav;
      if (p.vy > 0) g *= P.fallMul;
      else if (Math.abs(p.vy) < P.apexBand && jumpH) g *= P.apexMul;
      p.vy = Math.min(P.maxFall, p.vy + g * dt);
      if (jumpP) p.buffer = P.buffer; else p.buffer -= dt;
      if (p.onGround) p.coyote = P.coyote; else p.coyote -= dt;
      if (p.buffer > 0 && p.coyote > 0) {
        const st = p.standTile ? tile(p.standTile[0], p.standTile[1]) : '#';
        if (down && oneWay(st)) { p.dropT = 0.22; p.y += 2; p.buffer = 0; p.coyote = 0; }
        else {
          p.vy = -P.jumpV; p.coyote = 0; p.buffer = 0; p.cutDone = false; p.onGround = false;
          p.sx = 0.72; p.sy = 1.3; dust(p.x, p.y, 4); LF.audio.sfx('jump');
        }
      }
      if (jumpR && p.vy < 0 && !p.cutDone) { p.vy *= P.cut; p.cutDone = true; }
    }

    // mover en X
    p.x += p.vx * dt;
    const dashing = p.dashT > 0;
    {
      const top = p.y - p.h + 0.5, bot = p.y - 0.5;
      const y0 = Math.floor(top / T), y1 = Math.floor(bot / T);
      if (p.vx > 0) { const tx = Math.floor((p.x + p.w / 2) / T); for (let ty = y0; ty <= y1; ty++) if (blocking(tile(tx, ty), dashing)) { p.x = tx * T - p.w / 2 - 0.01; p.vx = 0; break; } }
      else if (p.vx < 0) { const tx = Math.floor((p.x - p.w / 2) / T); for (let ty = y0; ty <= y1; ty++) if (blocking(tile(tx, ty), dashing)) { p.x = (tx + 1) * T + p.w / 2 + 0.01; p.vx = 0; break; } }
    }
    // mover en Y
    p.y += p.vy * dt;
    p.onGround = false; p.standTile = p.standTile && p.vy >= 0 ? p.standTile : null;
    const x0 = Math.floor((p.x - p.w / 2 + 0.01) / T), x1 = Math.floor((p.x + p.w / 2 - 0.01) / T);
    if (p.vy >= 0) {
      const ty = Math.floor(p.y / T); const top = ty * T;
      let landed = false, landTile = null;
      for (let tx = x0; tx <= x1; tx++) {
        const c = tile(tx, ty);
        if (blocking(c, dashing) && p.prevY <= top + 6) { landed = true; landTile = [tx, ty]; }
        else if (oneWay(c) && p.dropT <= 0 && p.prevY <= top + 0.6 && oneWaySolid(tx, ty, c)) { landed = true; landTile = landTile || [tx, ty]; if (c !== '=') landTile = [tx, ty]; }
      }
      if (landed) { p.y = top; p.vy = 0; p.onGround = true; p.standTile = landTile; p.canDash = true; }
      else p.standTile = null;
    } else {
      const ty = Math.floor((p.y - p.h) / T);
      let hit = false; for (let tx = x0; tx <= x1; tx++) if (blocking(tile(tx, ty), dashing)) hit = true;
      if (hit) {
        // corrección de esquina
        let fixed = false;
        for (let s = 1; s <= 5 && !fixed; s++) for (const sg of [1, -1]) {
          if (!overlapsBlocking(p.x + s * sg, p.y, p.w, p.h, dashing)) { p.x += s * sg; fixed = true; break; }
        }
        if (!fixed) { p.y = (ty + 1) * T + p.h; p.vy = 0; }
      }
    }
    // aterrizaje
    if (p.onGround && !p.wasGround) {
      const hard = (p.prevVy || 0) > 200;
      p.sx = hard ? 1.35 : 1.18; p.sy = hard ? 0.7 : 0.85; dust(p.x, p.y, hard ? 6 : 3);
      LF.audio.sfx(hard ? 'land' : 'step');
    }
    p.prevVy = p.vy;
    p.sx += (1 - p.sx) * Math.min(1, dt * 12); p.sy += (1 - p.sy) * Math.min(1, dt * 12);

    // animación
    p.anim += dt * (Math.abs(p.vx) > 10 ? Math.abs(p.vx) / 9 : 2);
    p.frame = Math.floor(p.anim) & 3;
    if (p.onGround && Math.abs(p.vx) > 20 && (p.frame === 1) && p.lastStep !== Math.floor(p.anim)) { p.lastStep = Math.floor(p.anim); if (Math.random() < 0.5) dust(p.x - p.dir * 3, p.y, 1); }

    // aceite
    if (!LF.settings.infiniteOil && !G.auto) {
      const rate = G.act === 0 ? 0.8 : 1.5;
      p.oil = Math.max(0, p.oil - rate * dt);
    } else p.oil = 100;

    // peligros
    if (!LF.settings.invincible && p.invT <= 0) {
      const xa = Math.floor((p.x - 3) / T), xb = Math.floor((p.x + 3) / T), ya = Math.floor((p.y - p.h + 2) / T), yb = Math.floor((p.y - 1) / T);
      for (let ty = ya; ty <= yb; ty++) for (let tx = xa; tx <= xb; tx++) if (tile(tx, ty) === 'x') {
        const top = ty * T + 7; if (p.y - 1 > top && p.y - p.h + 2 < ty * T + T && p.x + 3 > tx * T + 1 && p.x - 3 < tx * T + 15) return die('espinas');
      }
    }
    if (p.y > G.h * T + 40) { if (LF.settings.invincible) return respawn(true); return die('caida'); }

    updateScarf(dt);
  }

  function updateScarf(dt) {
    const p = G.player; const s = p.scarf;
    const ax = p.x - p.dir * 1, ay = p.y - 10 + (p.sy < 1 ? 1 : 0);
    s[0].x = ax; s[0].y = ay;
    const wind = Math.sin(G.time * 2.3) * 8 - p.vx * 0.15;
    for (let i = 1; i < s.length; i++) {
      const q = s[i]; const vx = (q.x - q.px) * 0.86, vy = (q.y - q.py) * 0.86;
      q.px = q.x; q.py = q.y;
      q.x += vx + (wind - p.dir * 10) * dt * 0.6 * (p.inWater ? 0.3 : 1);
      q.y += vy + (p.inWater ? -6 : 40) * dt * dt * 60 * 0.18;
    }
    for (let k = 0; k < 3; k++) for (let i = 1; i < s.length; i++) {
      const a = s[i - 1], b = s[i]; const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; const diff = (d - 2.2) / d;
      if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; } else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
    }
  }

  function die(why) {
    const p = G.player; if (p.dead) return;
    p.dead = true; p.deadT = 0.75; p.vx = p.vy = 0;
    LF.audio.sfx('die');
    if (LF.settings.shake) G.shake = 6;
    for (let i = 0; i < 18; i++) G.particles.push({ x: p.x, y: p.y - 8, vx: rand(-90, 90), vy: rand(-140, 20), life: 0.8, max: 0.8, c: i % 3 ? '#f5c542' : '#ffd98a', s: 2, g: 300, glow: 1 });
    G.fadeTo(1, 0.45, 0.3);
  }
  function respawn(soft) {
    const p = G.player; const c = G.checkpoint;
    p.dead = false; p.x = c.x; p.y = c.y; p.vx = p.vy = 0; p.oil = Math.max(p.oil, 100); p.dashT = 0; p.invT = 0.6;
    p.inWater = false; p.standTile = null;
    for (const q of p.scarf) { q.x = q.px = p.x; q.y = q.py = p.y - 10; }
    if (G.chase && G.chase.started && !G.chase.done) G.chase.fogY = p.y + 170;
    snapCamera();
    if (!soft) G.fadeTo(0, 0.35);
  }
  G.restartFromLamp = function () { if (G.mode === 'play' && !G.player.dead) { G.player.dead = true; G.player.deadT = 0.01; } };

  /* ---------- partículas ---------- */
  function dust(x, y, n) { for (let i = 0; i < n; i++) G.particles.push({ x: x + rand(-3, 3), y: y - 1, vx: rand(-30, 30), vy: rand(-25, -5), life: 0.35, max: 0.35, c: LF.shade(G.pal.tileTop, 0.25), s: 1 }); }
  function splash(x, y) { for (let i = 0; i < 10; i++) G.particles.push({ x: x + rand(-4, 4), y, vx: rand(-50, 50), vy: rand(-120, -40), life: 0.5, max: 0.5, c: G.pal.waterTop, s: 1, g: 400 }); }
  function bubble(x, y) { G.particles.push({ x, y, vx: rand(-5, 5), vy: rand(-30, -15), life: 0.9, max: 0.9, c: '#bfe8ff', s: 1, bub: 1 }); }
  function burst(x, y, c, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = rand(20, sp || 90); G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, max: 0.7, c, s: 2, glow: 1 }); } }
  G.burst = burst;
  function updateParticles(dt) {
    const ps = G.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const q = ps[i]; q.life -= dt; if (q.life <= 0) { ps.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; if (q.g) q.vy += q.g * dt; else q.vx *= 0.96;
      if (q.bub && !G.isWater(q.x, q.y)) q.life = 0;
    }
    if (ps.length > 400) ps.splice(0, ps.length - 400);
    // motas de polvo dentro de la luz
    if (!G.demo && G.mode === 'play' && Math.random() < 0.25) {
      const lp = lanternPos(); const r = playerLightR() * 0.8; const a = Math.random() * 6.28;
      G.particles.push({ x: lp.x + Math.cos(a) * r * Math.random(), y: lp.y + Math.sin(a) * r * Math.random(), vx: rand(-4, 4), vy: rand(-8, -2), life: 1.6, max: 1.6, c: '#ffe7a8', s: 1, mote: 1 });
    }
  }

  /* ---------- entidades ---------- */
  function lightLamp(l, byPlayer) {
    l.lit = true; l.flare = 1;
    LF.audio.sfx('lamp');
    burst(l.x, l.y - 25, '#ffd98a', 14, 80);
    if (LF.settings.flashes) G.flash = 0.35;
  }
  function setCheckpoint(i) {
    const l = G.lamps[i];
    if (G.checkpoint.lamp === i) return;
    G.checkpoint = { x: l.x + (G.def.vertical ? 0 : 8), y: l.y, lamp: i };
    if (typeof G.act === 'number') { LF.save.resume = { act: G.act, lamp: i }; LF.persist(); }
  }
  function updateEntities(dt) {
    const p = G.player;
    // farolas
    G.lamps.forEach((l, i) => {
      l.flare = Math.max(0, l.flare - dt * 1.5);
      if (p.dead || G.demo) return;
      if (Math.abs(p.x - l.x) < 11 && p.y > l.y - 34 && p.y - p.h < l.y + 2) {
        if (!l.lit) { lightLamp(l, true); setCheckpoint(i); p.oil = 100; }
        else { if (G.checkpoint.lamp !== i) { LF.audio.sfx('check'); setCheckpoint(i); } if (p.oil < 100) p.oil = Math.min(100, p.oil + 60 * dt); }
      }
    });
    if (G.auto) for (const l of G.lamps) if (!l.lit && p.x > l.x - 8) { lightLamp(l, false); }
    // objetos
    for (let i = G.items.length - 1; i >= 0; i--) {
      const it = G.items[i]; it.ph += dt;
      if (p.dead || G.demo) continue;
      if (Math.abs(p.x - it.x) < 9 && Math.abs(p.y - 7 - it.y) < 12) {
        G.items.splice(i, 1);
        if (it.k === 'oil') { p.oil = Math.min(100, p.oil + 35); LF.audio.sfx('oil'); burst(it.x, it.y, '#f2b84b', 8, 50); }
        else if (it.k === 'card') { LF.save.cards[it.id] = true; LF.persist(); LF.audio.sfx('card'); burst(it.x, it.y, '#fff6e0', 14, 70); LF.ui.showCardToast(it.id); }
      }
    }
    // recuerdo
    const o = G.orb;
    if (o && !o.taken) {
      o.ph += dt;
      if (!p.dead && Math.abs(p.x - o.x) < 11 && Math.abs(p.y - 8 - o.y) < 14) {
        o.taken = true; LF.audio.sfx('memory'); burst(o.x, o.y, '#e8c895', 24, 100);
        const steps = (G.def.dialogs.R || []).map(s => s.ability ? { call: 'grant' } : s);
        runScript(steps);
      }
    }
    // niebla suelta
    for (const w of G.wisps) {
      if (!w.alive) { w.puff = Math.max(0, w.puff - dt); continue; }
      const lp = lanternPos(); const inLight = !p.dead && Math.hypot(w.x - lp.x, w.y - lp.y) < playerLightR();
      const slow = inLight ? 0.4 : 1;
      w.ph += dt * 1.5 * slow;
      if (w.kind === 'h') { w.x = w.ox + Math.sin(w.ph) * 40; w.y = w.oy + Math.sin(w.ph * 2.3) * 3; }
      else { w.y = w.oy + Math.sin(w.ph) * 28; w.x = w.ox + Math.sin(w.ph * 1.7) * 3; }
      if (!p.dead && !LF.settings.invincible && p.invT <= 0 && p.dashT <= 0 && Math.hypot(w.x - p.x, w.y - (p.y - 7)) < 10) die('niebla');
    }
    // chispas
    for (let i = G.sparks.length - 1; i >= 0; i--) {
      const s = G.sparks[i]; s.life -= dt;
      let tgt = null, best = 64;
      for (const l of G.lamps) if (!l.lit) { const d = Math.hypot(l.x - s.x, l.y - 25 - s.y); if (d < best) { best = d; tgt = { x: l.x, y: l.y - 25 }; } }
      for (const w of G.wisps) if (w.alive) { const d = Math.hypot(w.x - s.x, w.y - s.y); if (d < Math.min(best, 46)) { best = d; tgt = w; } }
      if (tgt) { const a = Math.atan2(tgt.y - s.y, tgt.x - s.x); const sp = Math.hypot(s.vx, s.vy); s.vx += (Math.cos(a) * sp - s.vx) * Math.min(1, dt * 9); s.vy += (Math.sin(a) * sp - s.vy) * Math.min(1, dt * 9); }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (Math.random() < 0.9) G.particles.push({ x: s.x, y: s.y, vx: rand(-15, 15), vy: rand(-15, 15), life: 0.3, max: 0.3, c: '#ffe7a8', s: 1, glow: 1 });
      let gone = s.life <= 0;
      if (blocking(tile(Math.floor(s.x / T), Math.floor(s.y / T)), false)) gone = true;
      for (const l of G.lamps) if (!l.lit && (Math.hypot(l.x - s.x, l.y - 25 - s.y) < 12 || (Math.abs(s.x - l.x) < 5 && s.y > l.y - 32 && s.y < l.y))) { lightLamp(l, false); gone = true; }
      for (const w of G.wisps) if (w.alive && Math.hypot(w.x - s.x, w.y - s.y) < 11) { w.alive = false; w.puff = 0.6; LF.audio.sfx('poof'); burst(w.x, w.y, G.pal.fog, 16, 70); if (LF.settings.shake) G.shake = Math.max(G.shake, 2); G.hitStop = 0.06; gone = true; }
      if (gone) { if (s.life > 0) burst(s.x, s.y, '#ffd98a', 6, 40); G.sparks.splice(i, 1); }
    }
    // pez
    const f = G.fish;
    if (f) {
      f.t += dt;
      let tx = p.x - p.dir * 16, ty = p.y - 24 + Math.sin(f.t * 2.4) * 3;
      for (const it of G.items) if (it.k === 'card' && Math.hypot(it.x - p.x, it.y - p.y) < 120) { tx = (tx + it.x * 2) / 3; ty = (ty + it.y * 2) / 3; break; }
      if (p.dead) { tx = f.x; ty = f.y; }
      const k = Math.min(1, dt * 3.2); const nx = f.x + (tx - f.x) * k;
      if (Math.abs(nx - f.x) > 0.15) f.dir = nx > f.x ? 1 : -1;
      f.x = nx; f.y += (ty - f.y) * k;
      if (Math.random() < 0.06) G.particles.push({ x: f.x - f.dir * 5, y: f.y, vx: -f.dir * 8, vy: rand(-4, 4), life: 0.6, max: 0.6, c: '#7fe0d0', s: 1, glow: 1 });
    }
    // Alba
    const a = G.alba;
    if (a && a.show) {
      if (a.follow) {
        const tx = p.x - 11; a.dir = 1; const mv = Math.abs(tx - a.x) > 0.3; a.x += (tx - a.x) * Math.min(1, dt * 8); a.y = p.y; if (mv) a.anim = (a.anim || 0) + dt * 5; a.frame = Math.floor(a.anim || 0);
      } else if (a.tw) {
        a.tw.t += dt; const k = Math.min(1, a.tw.t / a.tw.d);
        a.x = a.tw.x0 + (a.tw.x1 - a.tw.x0) * k;
        a.y = a.tw.y0 + (a.tw.y1 - a.tw.y0) * k - Math.sin(k * Math.PI) * a.tw.arc;
        a.frame = Math.floor(a.tw.t * 6);
        if (k >= 1) { a.tw = null; a.i++; }
      } else if (!G.cutscene && !G.blackout && a.i < a.marks.length - 1 && p.x > a.x - 36) {
        const m = a.marks[a.i + 1]; const d = Math.abs(m.x - a.x);
        a.tw = { t: 0, d: Math.max(0.6, d / 95), x0: a.x, y0: a.y, x1: m.x, y1: m.y, arc: Math.min(40, 10 + d * 0.08) };
        a.dir = m.x > a.x ? 1 : -1;
      } else if (!a.tw) { a.dir = p.x > a.x ? 1 : -1; }
    }
    // salida
    if (G.goal && !p.dead && !G.script && !G.completing && Math.abs(p.x - G.goal.x) < 12 && Math.abs(p.y - G.goal.y) < 20) {
      G.completing = true;
      const fin = G.def.dialogs.fin;
      if (fin === 'blackout') runScript(blackoutScript());
      else runScript((fin || []).concat([{ call: 'complete' }]));
    }
    if (G.big && !G.big.lit && !p.dead && !G.script && Math.abs(p.x - G.big.x) < 14 && Math.abs(p.y - G.big.y) < 20) {
      G.big.lit = true; runScript(endingScript());
    }
    // disparadores de diálogo
    for (const t of G.triggers) {
      if (t.fired || p.dead) continue;
      const hit = t.x != null ? p.x >= t.x * T : p.y <= t.y * T;
      if (hit) {
        t.fired = true; const steps = G.def.dialogs[t.id]; if (!steps) continue;
        if (t.id === 'persecucion' && G.chase) { G.chase.started = true; G.chase.fogY = p.y + 190; LF.audio.setIntensity(1); }
        runScript(steps);
      }
    }
    // persecución
    const ch = G.chase;
    if (ch && ch.started && !ch.done && !p.dead) {
      ch.fogY -= G.def.chase.speed * dt;
      ch.fogY = Math.min(ch.fogY, p.y + 230);
      if (p.y < G.def.chase.stop * T) { ch.done = true; LF.audio.setIntensity(0); }
      if (!LF.settings.invincible && p.y - 6 > ch.fogY) die('niebla');
    }
  }

  /* ---------- guiones (diálogos y escenas) ---------- */
  function runScript(steps) {
    const blocking = steps.some(s => s.say || s.memory);
    const sc = { steps: steps.slice(), i: -1, wait: 0, waiting: false, blocking };
    if (blocking) { if (G.script) G.queue = (G.queue || []).concat([sc]); else { G.script = sc; G.cutscene = true; nextStep(sc); } }
    else { G.barks.push(sc); nextStep(sc); }
  }
  G.runScript = runScript;
  function nextStep(sc) {
    sc.i++;
    if (sc.i >= sc.steps.length) {
      if (sc === G.script) {
        G.script = null; G.cutscene = false;
        if (G.queue && G.queue.length) { const n = G.queue.shift(); G.script = n; G.cutscene = true; nextStep(n); }
      } else { const k = G.barks.indexOf(sc); if (k >= 0) G.barks.splice(k, 1); }
      return;
    }
    const s = sc.steps[sc.i];
    if (s.say) { sc.waiting = true; LF.ui.showDialog(s.say, s.t, () => { sc.waiting = false; nextStep(sc); }); }
    else if (s.memory) { sc.waiting = true; LF.ui.showMemory(s.memory, s.t, () => { sc.waiting = false; nextStep(sc); }); }
    else if (s.bark) { LF.ui.showBark(s.bark, s.t, s.d || 3); sc.wait = s.d || 3; }
    else if (s.hint) { LF.ui.showHint(s.hint); nextStep(sc); }
    else if (s.wait) { sc.wait = s.wait; }
    else if (s.call) { const r = CALLS[s.call] && CALLS[s.call](sc); if (r !== 'hold') nextStep(sc); }
    else if (s.ability) { const k = grantAbility(G.act); if (k) LF.ui.showAbility(k); nextStep(sc); }
    else nextStep(sc);
  }
  function updateScripts(dt) {
    for (const sc of [G.script].concat(G.barks)) {
      if (!sc || sc.waiting) continue;
      if (sc.wait > 0) { sc.wait -= dt; if (sc.wait <= 0) nextStep(sc); }
    }
  }

  const CALLS = {
    grant() { const k = grantAbility(G.act); if (k) LF.ui.showAbility(k); },
    complete() { G.completeLevel(); return 'hold'; },
    song() { LF.audio.playMusic('cancion'); LF.audio.onSongEnd = () => { if (G.mode === 'play' && G.def.music) { LF.audio.playMusic(G.def.music); } }; },
    bo_start() {
      G.blackout = { t: 0 }; LF.audio.stopMusic(true); LF.audio.sfx('blackout');
      if (LF.settings.shake) G.shake = 4;
      const lit = G.lamps.filter(l => l.lit).sort((a, b) => b.x - a.x);
      lit.forEach((l, i) => setTimeout(() => { l.lit = false; burst(l.x, l.y - 25, '#6a6a80', 8, 40); LF.audio.sfx('fizz'); }, 250 + i * 320));
      G.fogWall = { x: G.cam.x - 60, target: G.alba ? G.alba.x + 18 : G.player.x - 30 };
    },
    bo_take() { G.blackout.take = true; },
    fishAppear() {
      const lp = lanternPos(); G.fish = { x: lp.x, y: lp.y, dir: 1, t: 0 };
      burst(lp.x, lp.y, '#7fe0d0', 20, 80); LF.audio.sfx('memory');
    },
    end_light() {
      G.final = { t: 0 }; LF.audio.stopMusic(true); LF.audio.sfx('bigLight'); if (LF.settings.flashes) G.flash = 0.8;
      for (const w of G.wisps) if (w.alive) { w.alive = false; w.puff = 0.6; burst(w.x, w.y, G.pal.fog, 10, 60); }
      setTimeout(() => LF.audio.playMusic('final'), 2200);
    },
    albaAppear() {
      G.alba = { marks: [], i: 0, x: G.big.x - 30, y: G.big.y, alpha: 0, dir: 1, frame: 0, show: true, fadeIn: true, sitting: true };
      G.player.dir = -1;
    },
    epilogue() { G.fadeTo(1, 1.2, 0, () => { LF.ui.hideAll(); G.loadLevel('epilogo'); G.fadeTo(0, 1.2); G.epi = { t: 0, step: 0 }; }); return 'hold'; },
    lockFace() { G.locked = true; }
  };

  function blackoutScript() {
    return [
      { call: 'lockFace' }, { call: 'bo_start' }, { wait: 2.6 },
      { say: 'alba', t: '¿Lía...? Está todo tan oscuro... No te veo.' },
      { say: 'lia', t: '¡Abuela! ¡Estoy acá!' },
      { call: 'bo_take' }, { wait: 2.0 },
      { say: 'lia', t: '¡ABUELA!' }, { wait: 0.8 },
      { call: 'fishAppear' }, { wait: 1.2 },
      { say: 'pez', t: 'Shh. No tengas miedo.' },
      { say: 'lia', t: '¿Quién sos?' },
      { say: 'pez', t: 'Vivo en el farol de tu abuela desde hace setenta inviernos. La niebla se está llevando sus recuerdos, una farola por vez.' },
      { say: 'pez', t: 'Si las volvemos a encender, quizás la encontremos. Empecemos por los tejados.' },
      { call: 'complete' }
    ];
  }
  function endingScript() {
    return [
      { call: 'lockFace' }, { call: 'end_light' }, { wait: 3.4 }, { call: 'albaAppear' }, { wait: 1.8 },
      { say: 'alba', t: 'Qué luz tan linda... ¿Sos vos la que enciende las farolas?' },
      { say: 'lia', t: 'Sí, abuela. Soy yo. Lía.' },
      { say: 'alba', t: 'Lía... Qué nombre tan lindo.' },
      { say: 'alba', t: 'Tengo una canción para vos. No sé de dónde la saqué, pero sé que es tuya.' },
      { say: 'narr', t: 'Alba tararea la canción despacio, sin equivocarse en ninguna nota.' },
      { say: 'pez', t: 'Ella no va a recordar todo. Pero vos sí.' },
      { say: 'lia', t: 'Entonces voy a recordar por las dos. Y voy a encender una farola por cada recuerdo.' },
      { call: 'epilogue' }
    ];
  }

  G.completeLevel = function () {
    if (typeof G.act !== 'number') return;
    const next = G.act + 1;
    LF.save.unlocked = Math.max(LF.save.unlocked, Math.min(next, LF.levels.length - 1));
    LF.save.resume = next < LF.levels.length ? { act: next, lamp: null } : null;
    LF.persist();
    G.fadeTo(1, 0.9, 0, () => { LF.ui.hideAll(); G.loadLevel(next); G.fadeTo(0, 0.8); });
  };

  /* ---------- epílogo ---------- */
  const EPI = [
    { x: 6, t: 'Desde esa noche, Lía enciende las farolas del puerto.' },
    { x: 30, t: 'Alba no siempre se acuerda de su nombre. Pero siempre le toma la mano.' },
    { x: 54, t: 'Y cuando alguna farola se apaga, Lía sabe qué hacer.' }
  ];
  function updateEpilogue(dt) {
    const e = G.epi; if (!e) return; e.t += dt;
    const p = G.player;
    if (e.step < EPI.length && p.x > EPI[e.step].x * T) { LF.ui.showCaption(EPI[e.step].t, 5.5); e.step++; }
    if (p.x > 76 * T && !e.end) {
      e.end = true; G.auto = null;
      LF.save.done = true; LF.save.resume = null; LF.save.unlocked = LF.levels.length - 1; LF.persist();
      setTimeout(() => LF.ui.showEnd(), 1200);
    }
  }

  /* ---------- transición ---------- */
  G.fadeA = 0;
  G.fadeTo = function (target, dur, delay, cb) { G.fadeJob = { from: G.fadeA, to: target, t: -(delay || 0), d: dur, cb }; };
  function updateFade(dt) {
    const f = G.fadeJob; if (!f) return; f.t += dt; if (f.t < 0) return;
    const k = Math.min(1, f.t / f.d); G.fadeA = f.from + (f.to - f.from) * k;
    if (k >= 1) { G.fadeJob = null; f.cb && f.cb(); }
  }

  /* ---------- actualización ---------- */
  G.update = function (dt) {
    updateFade(dt);
    if (G.mode === 'none') return;
    if (G.hitStop > 0) { G.hitStop -= dt; return; }
    G.time += dt;
    buildLights();
    if (G.mode === 'demo') {
      G.cam.x += dt * 14; if (G.cam.x > G.w * T - W - 10) G.cam.x = 0;
      G.cam.y = G.h * T - H; updateParticles(dt);
      return;
    }
    updatePlayer(dt);
    updateEntities(dt);
    updateScripts(dt);
    updateParticles(dt);
    if (G.act === 'epilogo') updateEpilogue(dt);
    // escena del apagón
    if (G.blackout) {
      G.blackout.t += dt; G.darkMul = Math.min(1.12, 1 + G.blackout.t * 0.05);
      if (G.fogWall) G.fogWall.x += (G.fogWall.target - G.fogWall.x) * Math.min(1, dt * 0.8);
      if (G.blackout.take && G.alba) { G.alba.alpha = Math.max(0, G.alba.alpha - dt * 0.7); }
    }
    if (G.final) {
      G.final.t += dt; G.dawn = Math.min(1, G.final.t / 4); G.darkMul = 1 - Math.min(0.75, G.final.t / 3);
      if (G.alba && G.alba.fadeIn) G.alba.alpha = Math.min(1, G.alba.alpha + dt * 0.6);
    }
    // cámara
    const p = G.player, c = G.cam;
    const lookT = Math.abs(p.vx) > 30 ? Math.sign(p.vx) * 30 : c.look;
    c.look += (lookT - c.look) * Math.min(1, dt * 2.2);
    let tx = p.x - W / 2 + c.look;
    let ty;
    if (G.def.vertical) ty = p.y - 160;
    else {
      if (p.onGround || p.inWater || p.y > c.anchorY + 24 || p.y < c.anchorY - 64) c.anchorY += (p.y - c.anchorY) * Math.min(1, dt * (p.onGround ? 4 : 2.5));
      ty = c.anchorY - H * 0.6;
    }
    if (G.final && G.big) { tx = G.big.x - W / 2 - 20; ty = G.big.y - H * 0.55; }
    if (!p.dead) { c.x += (tx - c.x) * Math.min(1, dt * 6); c.y += (ty - c.y) * Math.min(1, dt * (G.def.vertical ? 5 : 3.5)); }
    clampCam();
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 14);
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt);
  };

  /* ---------- render ---------- */
  let lightC, lightX, fgC, fgX;
  G.render = function (ctx) {
    if (!lightC) { [lightC, lightX] = LF.mkCanvas(W / 2, H / 2); [fgC, fgX] = LF.mkCanvas(W, H); }
    if (G.mode === 'none') { ctx.fillStyle = '#05071a'; ctx.fillRect(0, 0, W, H); return; }
    const sh = LF.settings.shake ? G.shake : 0;
    const cx = Math.round(G.cam.x + (sh ? rand(-sh, sh) : 0)), cy = Math.round(G.cam.y + (sh ? rand(-sh, sh) : 0));
    // el fondo no recibe la oscuridad: queda como siluetas bajo el cielo
    drawBackground(ctx, cx, cy);
    // el primer plano se dibuja aparte y la oscuridad solo cae sobre él
    fgX.clearRect(0, 0, W, H);
    drawTiles(fgX, cx, cy, false);
    drawEntities(fgX, cx, cy);
    drawWater(fgX, cx, cy);
    drawDarkness(fgX, cx, cy);
    ctx.drawImage(fgC, 0, 0);
    drawGlow(ctx, cx, cy);
    drawAfterDark(ctx, cx, cy);
    if (G.mode === 'play') drawHUD(ctx);
    if (G.flash > 0) { ctx.fillStyle = `rgba(255,236,190,${G.flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
    if (G.fadeA > 0) { ctx.fillStyle = `rgba(3,4,12,${G.fadeA})`; ctx.fillRect(0, 0, W, H); }
  };

  function drawBackground(ctx, cx, cy) {
    const bg = G.bg; const vert = G.def.vertical;
    const baseY = G.h * T - H;
    for (let li = 0; li < bg.layers.length; li++) {
      const L = bg.layers[li];
      if (L.f === 0) {
        ctx.drawImage(L.c, 0, 0);
        if (G.dawn > 0) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgba(70,40,90,${G.dawn * 0.85})`); g.addColorStop(0.6, `rgba(200,110,110,${G.dawn * 0.8})`); g.addColorStop(1, `rgba(250,190,120,${G.dawn * 0.9})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
        // luna
        const m = bg.moon; if (G.def.key !== 'torre') {
          const mx = Math.round(m.x - cx * 0.02), my = Math.round(m.y + (vert ? 0 : (cy - baseY) * 0.02));
          ctx.fillStyle = G.pal.moon; ctx.beginPath(); ctx.arc(mx, my, m.r, 0, 6.29); ctx.fill();
          ctx.fillStyle = G.pal.moonShade; ctx.fillRect(mx - m.r * 0.4, my - m.r * 0.3, 5, 5); ctx.fillRect(mx + m.r * 0.2, my + m.r * 0.25, 4, 4); ctx.fillRect(mx - m.r * 0.1, my + m.r * 0.5, 3, 3);
        }
        continue;
      }
      let ox = -((cx * L.f) % 512); if (ox > 0) ox -= 512;
      let oy;
      if (vert) { oy = -((cy * L.fy) % 270); if (oy > 0) oy -= 270; for (let y = oy; y < H; y += 270) for (let x = ox; x < W; x += 512) ctx.drawImage(L.c, Math.round(x), Math.round(y)); }
      else { oy = Math.round((baseY - cy) * L.fy); for (let x = ox; x < W; x += 512) ctx.drawImage(L.c, Math.round(x), oy); if (oy < 0) { /* nada */ } else { } }
    }
    // perspectiva atmosférica: el fondo se aleja
    ctx.fillStyle = G.pal.sky[1]; ctx.globalAlpha = 0.42 * (1 - G.dawn * 0.6); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    // niebla de primer plano
    ctx.fillStyle = G.pal.fog;
    for (let i = 0; i < 6; i++) {
      const x = ((i * 137 - cx * 0.6 + G.time * 6) % 640 + 640) % 640 - 80;
      const y = H - 30 + Math.sin(i * 2 + G.time * 0.3) * 6 + (vert ? 0 : (baseY - cy) * 0.5);
      ctx.globalAlpha = 0.04; ctx.beginPath(); ctx.ellipse(x, y, 90, 18, 0, 0, 6.29); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTiles(ctx, cx, cy) {
    const t0x = Math.floor(cx / T), t1x = Math.floor((cx + W) / T), t0y = Math.floor(cy / T), t1y = Math.floor((cy + H) / T);
    const tl = G.tiles;
    for (let ty = t0y; ty <= t1y; ty++) for (let tx = t0x; tx <= t1x; tx++) {
      if (tx < 0 || tx >= G.w || ty < 0 || ty >= G.h) continue;
      const c = G.map[ty][tx]; if (c === ' ' || c === 'w') continue;
      const x = tx * T - cx, y = ty * T - cy;
      if (c === 'b') { // pared interior (decorado, no choca)
        ctx.drawImage(tl.solid[(tx * 5 + ty * 3) & 3], x, y); ctx.fillStyle = 'rgba(4,4,12,0.55)'; ctx.fillRect(x, y, T, T);
        if ((tx + ty * 3) % 11 === 0) { ctx.fillStyle = '#0c0b18'; ctx.fillRect(x + 5, y + 3, 6, 9); ctx.fillStyle = '#2a2a44'; ctx.fillRect(x + 7, y + 4, 2, 7); }
        continue;
      }
      if (c === '#') {
        ctx.drawImage(tl.solid[(tx * 7 + ty * 13) & 3], x, y);
        const above = tile(tx, ty - 1);
        if (above !== '#' && ty > 0) ctx.drawImage(tl.top, x, y);
        if (tile(tx - 1, ty) !== '#' && tx > 0) { ctx.fillStyle = G.pal.tileDark; ctx.fillRect(x, y, 1, T); }
        if (tile(tx + 1, ty) !== '#' && tx < G.w - 1) { ctx.fillStyle = G.pal.tileDark; ctx.fillRect(x + T - 1, y, 1, T); }
      } else if (c === '=') ctx.drawImage(tl.plank, x, y);
      else if (c === 'm' || c === 'M') {
        const a = memAmount(tx, ty, c);
        if (a > 0.02) { ctx.globalAlpha = a; ctx.drawImage(c === 'm' ? tl.mem : tl.deep, x, y); ctx.globalAlpha = 1; }
      } else if (c === 'x') ctx.drawImage(tl.thorn, x, y);
      else if (c === 'd') {
        ctx.fillStyle = '#06050c'; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = '#2a1d4a';
        for (let k = 0; k < 4; k++) { const ph = G.time * 1.5 + k * 1.7 + tx + ty * 3; ctx.fillRect(x + ((Math.sin(ph) * 6 + 8) | 0), y + ((Math.cos(ph * 1.3) * 6 + 8) | 0), 2, 2); }
      }
    }
  }

  function drawEntities(ctx, cx, cy) {
    const t = G.time;
    // salida: arco de recuerdo
    if (G.goal) {
      const g = G.goal, x = Math.round(g.x - cx), y = Math.round(g.y - cy);
      ctx.fillStyle = '#3a2c20'; ctx.fillRect(x - 10, y - 30, 3, 30); ctx.fillRect(x + 7, y - 30, 3, 30); ctx.fillRect(x - 10, y - 32, 20, 3);
      ctx.fillStyle = `rgba(232,200,149,${0.35 + Math.sin(t * 2) * 0.1})`; ctx.fillRect(x - 7, y - 29, 14, 29);
      ctx.fillStyle = '#e8c895'; for (let k = 0; k < 3; k++) ctx.fillRect(x - 5 + ((t * 7 + k * 5) % 10), y - 4 - ((t * 15 + k * 9) % 24), 1, 1);
    }
    // farolas
    for (const l of G.lamps) LF.drawLamp(ctx, l.x - cx, l.y - cy, l.lit, t);
    if (G.big) LF.drawLamp(ctx, G.big.x - cx, G.big.y - cy, G.big.lit, t, true);
    // objetos
    for (const it of G.items) {
      const x = Math.round(it.x - cx), y = Math.round(it.y - cy + Math.sin(it.ph * 3) * 2);
      if (it.k === 'oil') { ctx.fillStyle = '#f2b84b'; ctx.fillRect(x - 2, y - 1, 4, 4); ctx.fillRect(x - 1, y - 3, 2, 2); ctx.fillStyle = '#fff1c0'; ctx.fillRect(x - 1, y, 1, 1); }
      else if (it.k === 'card') { const w = Math.max(1, Math.round(Math.abs(Math.cos(it.ph * 1.5)) * 8)); ctx.fillStyle = '#efe4cc'; ctx.fillRect(x - w / 2, y - 4, w, 7); ctx.fillStyle = '#c9a26a'; if (w > 3) { ctx.fillRect(x - w / 2 + 1, y - 3, w - 2, 1); ctx.fillRect(x - w / 2 + 1, y - 1, w - 3, 1); } }
    }
    // orbe de recuerdo
    const o = G.orb;
    if (o && !o.taken) {
      const x = Math.round(o.x - cx), y = Math.round(o.y - cy + Math.sin(o.ph * 2) * 3);
      ctx.fillStyle = 'rgba(232,200,149,0.25)'; ctx.beginPath(); ctx.arc(x, y, 10 + Math.sin(o.ph * 4), 0, 6.29); ctx.fill();
      ctx.fillStyle = '#e8c895'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#fff3d6'; ctx.fillRect(x - 2, y - 2, 2, 2);
      ctx.strokeStyle = 'rgba(232,200,149,0.6)'; ctx.beginPath(); ctx.ellipse(x, y, 11, 4, o.ph, 0, 6.29); ctx.stroke();
    }
    // Alba
    const a = G.alba;
    if (a && a.show && a.alpha > 0.01) LF.drawAlba(ctx, a.x - cx, a.y - cy, a.dir, a.frame, a.alpha, !!a.fadeIn && a.alpha < 0.95, a.sitting);
    // jugadora
    const p = G.player;
    if (!p.dead && !G.demo) {
      // bufanda (brilla según el aceite)
      const glow = p.oil / 100;
      const sc = LF.mix('#6a5a2a', '#f5c542', 0.25 + glow * 0.75);
      ctx.fillStyle = sc;
      for (let i = 1; i < p.scarf.length; i++) { const q = p.scarf[i]; ctx.fillRect(Math.round(q.x - cx) - 1, Math.round(q.y - cy) - 1, 2, 2); }
      if (glow > 0.6) { ctx.fillStyle = '#fff1b0'; const q = p.scarf[p.scarf.length - 1]; ctx.fillRect(Math.round(q.x - cx), Math.round(q.y - cy) - 1, 1, 1); }
      let pose = 'idle';
      if (p.dashT > 0) pose = 'run'; else if (p.inWater) pose = 'swim'; else if (!p.onGround) pose = p.vy < 0 ? 'jump' : 'fall'; else if (Math.abs(p.vx) > 15) pose = 'run';
      const bob = pose === 'idle' && Math.sin(t * 3) > 0.7 ? 1 : 0;
      if (p.invT > 0 && Math.floor(t * 20) % 2 && p.dashT <= 0) ctx.globalAlpha = 0.6;
      LF.drawLia(ctx, p.x - cx, p.y - cy + bob, p.dir, pose, p.frame, p.sx, p.sy, p.oil > 0 ? 1 : 0.02);
      ctx.fillStyle = sc; ctx.fillRect(Math.round(p.x - cx) - 3, Math.round(p.y - cy) - 11, 7, 2);
      ctx.globalAlpha = 1;
    }
    // partículas de tierra
    for (const q of G.particles) if (!q.glow && !q.mote) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), q.s, q.s); }
    ctx.globalAlpha = 1;
  }

  function drawWater(ctx, cx, cy) {
    const t0x = Math.floor(cx / T), t1x = Math.floor((cx + W) / T), t0y = Math.floor(cy / T), t1y = Math.floor((cy + H) / T);
    for (let ty = t0y; ty <= t1y; ty++) for (let tx = t0x; tx <= t1x; tx++) {
      if (tile(tx, ty) !== 'w') continue;
      const x = tx * T - cx, y = ty * T - cy;
      ctx.globalAlpha = 0.62; ctx.fillStyle = G.pal.water; ctx.fillRect(x, y, T, T);
      if (tile(tx, ty - 1) !== 'w') {
        ctx.globalAlpha = 0.9; ctx.fillStyle = G.pal.waterTop;
        for (let k = 0; k < T; k += 2) { const wv = Math.sin((tx * T + k) * 0.18 + G.time * 2.4) > 0.3 ? 1 : 0; ctx.fillRect(x + k, y + wv, 2, 1); }
        ctx.globalAlpha = 0.3; ctx.fillRect(x, y + 3, T, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawDarkness(ctx, cx, cy) {
    const pal = G.pal; let da = pal.darkA * G.darkMul;
    if (G.demo) da *= 0.75;
    if (da <= 0.01) return;
    const lx = lightX; const s = 0.5;
    lx.globalCompositeOperation = 'source-over';
    lx.clearRect(0, 0, W * s, H * s);
    lx.globalAlpha = Math.min(1, da); lx.fillStyle = pal.dark; lx.fillRect(0, 0, W * s, H * s);
    lx.globalAlpha = 1; lx.globalCompositeOperation = 'destination-out';
    let i = 0;
    for (const l of G.lights) {
      i++;
      let r = l.r * (1 + Math.sin(G.time * 9 + i) * 0.012);
      if (l.k === 'alba' && G.blackout) r *= Math.max(0, 1 - G.blackout.t * 0.25);
      const x = (l.x - cx) * s, y = (l.y - cy) * s, rr = r * s;
      if (rr < 1 || x + rr < 0 || y + rr < 0 || x - rr > W * s || y - rr > H * s) continue;
      const g = lx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,0.85)');
      g.addColorStop(0.7, 'rgba(0,0,0,0.85)'); g.addColorStop(0.7, 'rgba(0,0,0,0.55)'); g.addColorStop(0.86, 'rgba(0,0,0,0.55)');
      g.addColorStop(0.86, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      lx.fillStyle = g; lx.beginPath(); lx.arc(x, y, rr, 0, 6.29); lx.fill();
    }
    lx.globalCompositeOperation = 'source-over';
    ctx.globalCompositeOperation = 'source-atop';
    ctx.drawImage(lightC, 0, 0, W * s, H * s, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawGlow(ctx, cx, cy) {
    // brillo cálido aditivo
    ctx.globalCompositeOperation = 'lighter';
    for (const l of G.lights) {
      if (l.k === 'it' || l.r < 8) continue;
      const x = l.x - cx, y = l.y - cy; const r = Math.min(l.r, 300) * 0.75;
      if (x + r < 0 || y + r < 0 || x - r > W || y - r > H) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const col = l.warm ? '255,190,90' : '110,230,210'; const a0 = l.k === 'lamp' ? 0.16 : l.k === 'big' ? 0.2 : 0.13;
      g.addColorStop(0, `rgba(${col},${a0})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawAfterDark(ctx, cx, cy) {
    const t = G.time;
    const t0x = Math.floor(cx / T), t1x = Math.floor((cx + W) / T), t0y = Math.floor(cy / T), t1y = Math.floor((cy + H) / T);
    // contornos de recuerdos y peligros que se adivinan en la oscuridad
    for (let ty = t0y; ty <= t1y; ty++) for (let tx = t0x; tx <= t1x; tx++) {
      const c = tile(tx, ty); const x = tx * T - cx, y = ty * T - cy;
      if (c === 'm' || c === 'M') {
        const a = memAmount(tx, ty, c);
        if (a < 0.9) { ctx.fillStyle = c === 'm' ? 'rgba(232,200,149,0.45)' : 'rgba(190,160,230,0.5)'; for (let k = 0; k < T; k += 3) ctx.fillRect(x + k, y, 2, 1); ctx.fillRect(x, y + 3, 1, 1); ctx.fillRect(x + T - 1, y + 3, 1, 1); }
      } else if (c === 'x') { ctx.fillStyle = 'rgba(200,205,230,0.28)'; for (let k = 1; k < T; k += 4) ctx.fillRect(x + k, y + 7, 1, 1); }
      else if (c === 'd') { if (tile(tx - 1, ty) !== 'd' || tile(tx + 1, ty) !== 'd') { ctx.fillStyle = `rgba(155,124,216,${0.25 + Math.sin(t * 3 + ty) * 0.1})`; ctx.fillRect(x, y, 1, T); ctx.fillRect(x + T - 1, y, 1, T); } }
    }
    // farolas apagadas: un reflejo para encontrarlas
    for (const l of G.lamps) if (!l.lit) { ctx.fillStyle = `rgba(160,170,210,${0.35 + Math.sin(t * 2 + l.x) * 0.1})`; ctx.fillRect(Math.round(l.x - cx) - 3, Math.round(l.y - cy) - 28, 1, 6); ctx.fillRect(Math.round(l.x - cx) - 4, Math.round(l.y - cy) - 30, 9, 1); }
    // postales: destello
    for (const it of G.items) if (it.k === 'card') { const a = (Math.sin(it.ph * 2.5) + 1) / 2; ctx.fillStyle = `rgba(255,246,224,${0.25 + a * 0.5})`; const x = Math.round(it.x - cx), y = Math.round(it.y - cy); ctx.fillRect(x, y - 7, 1, 3); ctx.fillRect(x - 1, y - 6, 3, 1); }
    // niebla suelta
    for (const w of G.wisps) {
      const x = w.x - cx, y = w.y - cy;
      if (w.alive) {
        for (let k = 0; k < 4; k++) { const a = t * 3 + k * 1.6; ctx.fillStyle = G.pal.fog; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 3, y + Math.sin(a * 1.3) * 2, 5 - k * 0.6, 0, 6.29); ctx.fill(); }
        ctx.globalAlpha = 0.7; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
        ctx.globalAlpha = 0.35; ctx.strokeStyle = G.pal.fog; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(x, y, 8 + Math.sin(t * 4) * 1.5, 0, 6.29); ctx.stroke(); ctx.setLineDash([]);
      } else if (w.puff > 0) { ctx.globalAlpha = w.puff; ctx.strokeStyle = G.pal.fog; ctx.beginPath(); ctx.arc(x, y, 8 + (0.6 - w.puff) * 30, 0, 6.29); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // pez
    if (G.fish) {
      const f = G.fish; ctx.fillStyle = 'rgba(127,224,208,0.18)'; ctx.beginPath(); ctx.arc(f.x - cx, f.y - cy, 8, 0, 6.29); ctx.fill();
      LF.drawFish(ctx, f.x - cx, f.y - cy, f.dir, f.t);
    }
    // chispas
    for (const s of G.sparks) { ctx.fillStyle = '#fff6d6'; ctx.fillRect(Math.round(s.x - cx) - 1, Math.round(s.y - cy) - 1, 3, 3); ctx.fillStyle = '#ffd98a'; ctx.fillRect(Math.round(s.x - cx) - 2, Math.round(s.y - cy), 5, 1); ctx.fillRect(Math.round(s.x - cx), Math.round(s.y - cy) - 2, 1, 5); }
    // partículas brillantes y motas
    for (const q of G.particles) if (q.glow || q.mote) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5) * (q.mote ? 0.6 : 1); ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), q.s, q.s); }
    ctx.globalAlpha = 1;
    // muro de niebla del apagón
    if (G.fogWall) drawFogBand(ctx, 'left', G.fogWall.x - cx);
    // niebla que sube en la torre
    if (G.chase && G.chase.started) drawFogBand(ctx, 'bottom', G.chase.fogY - cy);
  }

  function drawFogBand(ctx, side, edge) {
    const t = G.time; const fc = G.pal.fog;
    ctx.fillStyle = fc;
    if (side === 'bottom') {
      if (edge > H + 20) return;
      ctx.globalAlpha = 0.9; ctx.fillRect(0, edge + 6, W, H - edge + 10);
      for (let x = -10; x < W + 20; x += 14) { const y = edge + Math.sin(x * 0.05 + t * 2) * 4; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(x, y + 6, 11, 0, 6.29); ctx.fill(); }
      ctx.globalAlpha = 0.5; for (let x = 0; x < W; x += 9) { const y = edge - 6 + Math.sin(x * 0.11 + t * 3) * 5; ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.29); ctx.fill(); }
      // trazos de boceto: lo que la niebla borra
      ctx.globalAlpha = 0.55; ctx.strokeStyle = LF.shade(fc, -0.35); ctx.setLineDash([4, 3]);
      for (let k = 0; k < 4; k++) { const y = edge + 20 + k * 14; if (y > H) break; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.03 + k + t) * 3); ctx.stroke(); }
      ctx.setLineDash([]);
    } else {
      if (edge < -20) return;
      ctx.globalAlpha = 0.92; ctx.fillRect(0, 0, edge - 6, H);
      for (let y = -10; y < H + 20; y += 14) { const x = edge + Math.sin(y * 0.05 + t * 2) * 5; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(x - 6, y, 12, 0, 6.29); ctx.fill(); }
      ctx.globalAlpha = 0.5; ctx.strokeStyle = LF.shade(fc, -0.35); ctx.setLineDash([4, 3]);
      for (let k = 0; k < 4; k++) { const x = edge - 24 - k * 18; ctx.beginPath(); ctx.moveTo(x, 0); for (let y = 0; y <= H; y += 30) ctx.lineTo(x + Math.sin(y * 0.04 + k + t) * 3, y); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD(ctx) {
    const p = G.player; if (G.auto) return;
    // farol: la llama crece con el aceite
    const x = 12, y = 10;
    ctx.fillStyle = 'rgba(5,7,26,0.55)'; ctx.fillRect(x - 4, y - 4, 22, 26);
    ctx.fillStyle = '#6b5a3a'; ctx.fillRect(x + 2, y, 10, 2); ctx.fillRect(x + 2, y + 16, 10, 2); ctx.fillRect(x + 6, y - 2, 2, 2);
    ctx.fillStyle = '#2a2a3a'; ctx.fillRect(x + 2, y + 2, 10, 14);
    const k = p.oil / 100; const fh = Math.max(1, Math.round(12 * k));
    ctx.fillStyle = k < 0.2 ? '#c46a4a' : '#ffd98a'; ctx.fillRect(x + 4, y + 16 - fh, 6, fh);
    if (k > 0.3) { ctx.fillStyle = '#fff3c4'; ctx.fillRect(x + 6, y + 16 - fh + 1, 2, Math.max(1, fh - 3)); }
    if (k < 0.2 && Math.floor(G.time * 3) % 2) { ctx.fillStyle = '#f2b84b'; ctx.fillRect(x - 4, y - 4, 22, 1); }
    // habilidades
    let hx = x + 22;
    const ab = [['spark', '#ffd98a'], ['water', '#4fb3ab'], ['dash', '#9b7cd8']];
    for (const [kk, col] of ab) if (G.abil[kk]) { ctx.fillStyle = 'rgba(5,7,26,0.55)'; ctx.fillRect(hx, y + 6, 8, 8); ctx.fillStyle = col; ctx.fillRect(hx + 2, y + 8, 4, 4); hx += 10; }
  }
})();
