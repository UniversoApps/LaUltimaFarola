/* La última farola — arte procedural en pixel art */
(function () {
  const LF = window.LF;
  const T = LF.T;

  LF.palettes = [
    { // 0 puerto: azul noche, ámbar
      sky: ['#0a0e20', '#0e1329', '#121832', '#161d3c', '#1b2346'],
      stars: '#cfd6ff', moon: '#d9dcf0', moonShade: '#c3c7e0',
      far: '#1f2750', mid: '#262e5c', near: '#2d3668', winLit: '#f2b84b', winDark: '#151a35',
      tile: '#2a3160', tileTop: '#3e4880', tileDark: '#1d2346', tileLine: '#232a55',
      plank: '#5a4a5e', plankTop: '#7a6476', water: '#0f1d44', waterTop: '#3a5ea8',
      dark: '#05071a', darkA: 0.84, fog: '#c7cbe0', accent: '#f2b84b'
    },
    { // 1 tejados: azul profundo, luna grande
      sky: ['#060a20', '#09102c', '#0d1638', '#121d46', '#182656'],
      stars: '#e3e8ff', moon: '#e8e6d8', moonShade: '#cfccbc',
      far: '#18224f', mid: '#1f2b5f', near: '#26336c', winLit: '#f2b84b', winDark: '#10163a',
      tile: '#2b3566', tileTop: '#4a56a0', tileDark: '#1a2048', tileLine: '#222b5a',
      plank: '#6a5052', plankTop: '#8c6a62', water: '#0b1640', waterTop: '#3456a0',
      dark: '#040616', darkA: 0.83, fog: '#d0d4ea', accent: '#f2b84b'
    },
    { // 2 mercado: verde agua
      sky: ['#04121a', '#061820', '#081e26', '#0b252c', '#0f2d34'],
      stars: '#bfeee6', moon: '#cfe8e0', moonShade: '#b4d2c8',
      far: '#0f3036', mid: '#143a40', near: '#1a454a', winLit: '#f2b84b', winDark: '#0a2025',
      tile: '#24464a', tileTop: '#3f7470', tileDark: '#163033', tileLine: '#1c3a3d',
      plank: '#5e5040', plankTop: '#807058', water: '#0d3a42', waterTop: '#4fb3ab',
      dark: '#020d10', darkA: 0.84, fog: '#cfe2dc', accent: '#f2b84b'
    },
    { // 3 torre: gris violeta
      sky: ['#0e0c16', '#13101d', '#181424', '#1d192c', '#231e34'],
      stars: '#d6d0ea', moon: '#d6d0ea', moonShade: '#bbb4d2',
      far: '#241f36', mid: '#2b2540', near: '#332c4b', winLit: '#e6a948', winDark: '#16121f',
      tile: '#3a3450', tileTop: '#5c5378', tileDark: '#29243a', tileLine: '#2f2a42',
      plank: '#5b4a4a', plankTop: '#7c6464', water: '#1a1830', waterTop: '#6a62a0',
      dark: '#07050d', darkA: 0.87, fog: '#d8d4e8', accent: '#f2b84b'
    },
    { // 4 faro: casi negro con mar
      sky: ['#07070f', '#0b0b17', '#10101f', '#161528', '#1d1a32'],
      stars: '#e6e2ff', moon: '#e8e4f0', moonShade: '#ccc8d8',
      far: '#1a1a2c', mid: '#212034', near: '#28263c', winLit: '#f2b84b', winDark: '#121222',
      tile: '#2c2a3a', tileTop: '#4c4862', tileDark: '#1e1c2a', tileLine: '#24222f',
      plank: '#5a4a4e', plankTop: '#7a6468', water: '#0d1630', waterTop: '#4a6aa8',
      dark: '#04040b', darkA: 0.85, fog: '#d6d6ea', accent: '#f2b84b'
    },
    { // 5 epílogo: atardecer
      sky: ['#2a1d3e', '#4a2a4e', '#7a3c52', '#b85e58', '#e8a05e'],
      stars: '#fff0d8', moon: '#fff2d6', moonShade: '#f0dcb8',
      far: '#3a2a48', mid: '#46304e', near: '#523656', winLit: '#ffd27a', winDark: '#2a1a30',
      tile: '#4a3550', tileTop: '#7a5870', tileDark: '#33243a', tileLine: '#3d2c44',
      plank: '#6a5052', plankTop: '#8c6a62', water: '#2a2a50', waterTop: '#c88a78',
      dark: '#1a0f20', darkA: 0.25, fog: '#f0dce0', accent: '#ffd27a'
    }
  ];

  // generador pseudoaleatorio con semilla
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
  LF.rng = rng;

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  LF.mkCanvas = mk;

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  LF.shade = shade;
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = ((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t;
    const g = ((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t;
    const bl = (pa & 255) * (1 - t) + (pb & 255) * t;
    return '#' + [r, g, bl].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  }
  LF.mix = mix;

  /* ---------- Tiles ---------- */
  LF.makeTiles = function (pi, styleKey) {
    const p = LF.palettes[pi];
    const tiles = {};
    const r = rng(77 + pi * 13);
    // 4 variantes de bloque sólido según el estilo del acto
    tiles.solid = [];
    for (let v = 0; v < 4; v++) {
      const [c, x] = mk(T, T);
      x.fillStyle = p.tile; x.fillRect(0, 0, T, T);
      x.fillStyle = p.tileLine;
      if (styleKey === 'tejados') { // tejas de pizarra
        for (let yy = 0; yy < T; yy += 4) {
          x.fillRect(0, yy + 3, T, 1);
          const off = (yy / 4) % 2 ? 4 : 0;
          for (let xx = off; xx < T; xx += 8) x.fillRect(xx, yy, 1, 3);
        }
      } else if (styleKey === 'torre' || styleKey === 'epilogo') { // ladrillo
        for (let yy = 0; yy < T; yy += 5) {
          x.fillRect(0, yy + 4, T, 1);
          const off = (yy / 5) % 2 ? 4 : 0;
          for (let xx = off; xx < T; xx += 8) x.fillRect(xx, yy, 1, 4);
        }
      } else if (styleKey === 'faro') { // roca irregular
        for (let i = 0; i < 5; i++) { x.fillRect((r() * 14) | 0, (r() * 14) | 0, 2 + ((r() * 3) | 0), 1); }
        x.fillStyle = shade(p.tile, 0.08); for (let i = 0; i < 4; i++) x.fillRect((r() * 14) | 0, (r() * 14) | 0, 2, 2);
      } else if (styleKey === 'mercado') { // baldosas húmedas
        x.fillRect(0, 7, T, 1); x.fillRect(7, 0, 1, T);
        x.fillStyle = shade(p.tile, 0.1); x.fillRect(1 + v, 1, 2, 1); x.fillRect(9, 9 + (v % 3), 2, 1);
      } else { // puerto: sillares de piedra
        x.fillRect(0, 7, T, 1); x.fillRect(0, 15, T, 1);
        x.fillRect(v % 2 ? 4 : 10, 0, 1, 7); x.fillRect(v % 2 ? 12 : 6, 8, 1, 7);
      }
      x.fillStyle = p.tileDark;
      for (let i = 0; i < 3; i++) x.fillRect((r() * 15) | 0, (r() * 15) | 0, 1, 1);
      tiles.solid.push(c);
    }
    // borde superior
    { const [c, x] = mk(T, 5);
      x.fillStyle = p.tileTop; x.fillRect(0, 0, T, 3);
      x.fillStyle = shade(p.tileTop, 0.18); x.fillRect(0, 0, T, 1);
      x.fillStyle = p.tileDark; x.fillRect(0, 3, T, 1);
      if (styleKey === 'faro' || styleKey === 'mercado') { x.fillStyle = shade(p.tileTop, 0.25); x.fillRect(3, 0, 2, 1); x.fillRect(11, 1, 1, 1); }
      tiles.top = c; }
    // tabla
    { const [c, x] = mk(T, 6);
      x.fillStyle = p.plank; x.fillRect(0, 0, T, 4);
      x.fillStyle = p.plankTop; x.fillRect(0, 0, T, 1);
      x.fillStyle = shade(p.plank, -0.3); x.fillRect(0, 4, T, 1); x.fillRect(7, 1, 1, 3);
      x.fillStyle = shade(p.plank, -0.45); x.fillRect(2, 4, 2, 2); x.fillRect(12, 4, 2, 2);
      tiles.plank = c; }
    // tabla-recuerdo (sepia) y recuerdo profundo
    for (const [k, col, top] of [['mem', '#c9a26a', '#ecd2a0'], ['deep', '#a98fb8', '#e2d2ee']]) {
      const [c, x] = mk(T, 6);
      x.fillStyle = col; x.fillRect(0, 0, T, 4);
      x.fillStyle = top; x.fillRect(0, 0, T, 1);
      x.fillStyle = shade(col, -0.25); x.fillRect(0, 4, T, 1); x.fillRect(5, 1, 1, 3); x.fillRect(11, 1, 1, 3);
      tiles[k] = c;
    }
    // espinas de niebla
    { const [c, x] = mk(T, T);
      x.fillStyle = shade(p.fog, -0.35);
      for (let i = 0; i < 4; i++) { const bx = i * 4; x.fillRect(bx, 12, 4, 4); x.fillRect(bx + 1, 9, 2, 3); x.fillRect(bx + 1, 7, 1, 2); }
      x.fillStyle = p.fog; for (let i = 0; i < 4; i++) { x.fillRect(i * 4 + 1, 7, 1, 1); x.fillRect(i * 4 + 2, 10, 1, 1); }
      tiles.thorn = c; }
    return tiles;
  };

  /* ---------- Fondos con parallax ---------- */
  // Cada capa es un canvas de 512 px que se repite en horizontal.
  LF.makeBackground = function (pi, key) {
    const p = LF.palettes[pi];
    const W = 512, H = 270;
    const r = rng(1000 + pi * 31);
    const layers = [];

    // cielo con bandas (y estrellas) — fijo
    const [sky, sx] = mk(W, H);
    const bands = p.sky;
    for (let i = 0; i < H; i++) {
      const t = i / H; const bi = Math.min(bands.length - 1, Math.floor(t * bands.length));
      sx.fillStyle = bands[bi]; sx.fillRect(0, i, W, 1);
      // tramado entre bandas
      const local = t * bands.length - bi;
      if (bi < bands.length - 1 && local > 0.8) { sx.fillStyle = bands[bi + 1]; for (let xx = (i % 2); xx < W; xx += 2) sx.fillRect(xx, i, 1, 1); }
    }
    sx.fillStyle = p.stars;
    for (let i = 0; i < 90; i++) { const x = (r() * W) | 0, y = (r() * H * 0.55) | 0; sx.globalAlpha = 0.4 + r() * 0.6; sx.fillRect(x, y, 1, 1); if (r() < 0.08) { sx.fillRect(x - 1, y, 3, 1); sx.fillRect(x, y - 1, 1, 3); } }
    sx.globalAlpha = 1;
    layers.push({ c: sky, f: 0, fy: 0, y: 0, stars: true });

    // luna
    const moon = { x: key === 'tejados' ? 330 : 360, y: key === 'tejados' ? 60 : 52, r: key === 'tejados' ? 34 : 22 };

    function silhouette(color, base, fn, f, fy) {
      const [c, x] = mk(W, H); x.fillStyle = color; fn(x, base); layers.push({ c, f, fy: fy == null ? f * 0.4 : fy, y: 0 });
      return x;
    }

    if (key === 'puerto' || key === 'epilogo') {
      silhouette(p.far, 180, (x, base) => {
        let xx = 0;
        while (xx < W) { const w = 18 + ((r() * 40) | 0), h = 20 + ((r() * 60) | 0); x.fillRect(xx, base - h, w, H); if (r() < 0.3) { x.fillRect(xx + w / 2 - 2, base - h - 12, 4, 12); } xx += w; }
        // grúas
        for (const gx of [80, 300]) { x.fillRect(gx, base - 110, 5, 110); x.fillRect(gx, base - 110, 70, 4); x.fillRect(gx + 60, base - 106, 2, 30); x.fillRect(gx - 20, base - 110, 20, 3); }
        // faro lejano
        x.fillRect(450, base - 90, 12, 90); x.fillRect(446, base - 96, 20, 6); x.fillRect(452, base - 106, 8, 10);
      }, 0.15);
      silhouette(p.mid, 220, (x, base) => {
        let xx = 0;
        while (xx < W) {
          const w = 30 + ((r() * 40) | 0), h = 40 + ((r() * 50) | 0); x.fillRect(xx, base - h, w, H);
          x.beginPath(); x.moveTo(xx - 2, base - h); x.lineTo(xx + w / 2, base - h - 14); x.lineTo(xx + w + 2, base - h); x.fill();
          for (let wy = base - h + 8; wy < base - 8; wy += 14) for (let wx = xx + 6; wx < xx + w - 8; wx += 12) {
            x.fillStyle = r() < 0.18 ? p.winLit : p.winDark; x.fillRect(wx, wy, 5, 7); x.fillStyle = p.mid;
          }
          xx += w + ((r() * 10) | 0);
        }
      }, 0.35);
    } else if (key === 'tejados') {
      silhouette(p.far, 190, (x, base) => {
        let xx = 0;
        while (xx < W) { const w = 20 + ((r() * 30) | 0), h = 30 + ((r() * 50) | 0); x.fillRect(xx, base - h, w, H); xx += w; if (r() < 0.4) { x.fillRect(xx - 6, base - h - 10, 3, 10); } }
        // cúpula y torre del reloj lejana
        x.beginPath(); x.arc(200, base - 70, 22, Math.PI, 0); x.fill(); x.fillRect(178, base - 70, 44, 70);
        x.fillRect(400, base - 130, 22, 130); x.fillRect(396, base - 136, 30, 6);
        x.fillStyle = '#e6c27a'; x.fillRect(406, base - 120, 10, 10); x.fillStyle = p.far; x.fillRect(410, base - 118, 1, 5); x.fillRect(410, base - 114, 4, 1);
      }, 0.12);
      silhouette(p.mid, 230, (x, base) => {
        let xx = 0;
        while (xx < W) {
          const w = 40 + ((r() * 30) | 0), h = 30 + ((r() * 40) | 0);
          x.beginPath(); x.moveTo(xx, base - h); x.lineTo(xx + w / 2, base - h - 18); x.lineTo(xx + w, base - h); x.lineTo(xx + w, H); x.lineTo(xx, H); x.fill();
          x.fillRect(xx + 8, base - h - 22, 5, 14); // chimenea
          if (r() < 0.5) { x.fillRect(xx + w - 10, base - h - 30, 1, 20); x.fillRect(xx + w - 14, base - h - 30, 9, 1); } // antena
          for (let wy = base - h + 10; wy < base; wy += 16) for (let wx = xx + 8; wx < xx + w - 8; wx += 14) { x.fillStyle = r() < 0.15 ? p.winLit : p.winDark; x.fillRect(wx, wy, 4, 6); x.fillStyle = p.mid; }
          xx += w + 4;
        }
        // ropa tendida
        x.fillStyle = shade(p.mid, 0.25);
        for (let i = 0; i < 4; i++) { const lx = 40 + i * 120; x.fillRect(lx, base - 60, 60, 1); for (let k = 0; k < 4; k++) x.fillRect(lx + 6 + k * 13, base - 59, 7, 9 + ((r() * 5) | 0)); x.fillStyle = shade(p.mid, 0.25); }
      }, 0.33);
    } else if (key === 'mercado') {
      silhouette(p.far, 170, (x, base) => {
        // arcos del mercado
        for (let ax = 0; ax < W; ax += 64) { x.fillRect(ax, base - 80, 10, H); x.beginPath(); x.arc(ax + 37, base - 80, 27, Math.PI, 0); x.lineTo(ax + 64, base - 80); x.lineTo(ax + 64, base - 112); x.lineTo(ax, base - 112); x.fill(); }
        x.fillRect(0, base - 130, W, 20);
      }, 0.15);
      silhouette(p.mid, 230, (x, base) => {
        for (let sx2 = 0; sx2 < W; sx2 += 70) {
          const w = 50; x.fillRect(sx2 + 6, base - 50, 4, 60); x.fillRect(sx2 + w - 4, base - 50, 4, 60);
          // toldo a rayas
          for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? shade(p.mid, 0.12) : p.mid; x.fillRect(sx2 + k * 9, base - 58, 9, 10); }
          x.fillStyle = p.mid; x.fillRect(sx2 + 4, base - 30, w - 4, 8);
          // farolito colgante
          x.fillRect(sx2 + 28, base - 48, 1, 8); x.fillStyle = r() < 0.5 ? p.winLit : p.winDark; x.fillRect(sx2 + 26, base - 40, 5, 5); x.fillStyle = p.mid;
        }
      }, 0.35);
    } else if (key === 'torre') {
      silhouette(p.far, 0, (x) => {
        for (let yy = 0; yy < H; yy += 10) for (let xx = (yy / 10) % 2 ? 0 : 12; xx < W; xx += 24) { x.fillStyle = shade(p.far, (r() - 0.5) * 0.12); x.fillRect(xx, yy, 23, 9); }
        x.fillStyle = shade(p.far, -0.2);
        for (const [gx, gy, gr] of [[120, 90, 46], [380, 200, 60]]) {
          x.beginPath(); x.arc(gx, gy, gr, 0, Math.PI * 2); x.fill();
          for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; x.fillRect(gx + Math.cos(a) * (gr + 4) - 4, gy + Math.sin(a) * (gr + 4) - 4, 8, 8); }
          x.fillStyle = p.far; x.beginPath(); x.arc(gx, gy, gr * 0.35, 0, Math.PI * 2); x.fill(); x.fillStyle = shade(p.far, -0.2);
        }
      }, 0.15, 0.15);
      silhouette(p.mid, 0, (x) => {
        // esfera del reloj
        x.beginPath(); x.arc(256, 130, 70, 0, Math.PI * 2); x.fill();
        x.fillStyle = shade(p.mid, 0.12); x.beginPath(); x.arc(256, 130, 62, 0, Math.PI * 2); x.fill();
        x.fillStyle = p.mid; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; x.fillRect(256 + Math.cos(a) * 52 - 2, 130 + Math.sin(a) * 52 - 2, 4, 4); }
        x.fillRect(255, 80, 3, 52); x.fillRect(256, 128, 34, 3);
        // vigas
        x.fillRect(0, 20, 120, 6); x.fillRect(400, 240, 112, 6); x.fillRect(30, 20, 6, 250);
      }, 0.35, 0.3);
    } else if (key === 'faro') {
      silhouette(p.far, 200, (x, base) => {
        // horizonte y barcos
        x.fillRect(0, base, W, H);
        for (const bx of [60, 260, 420]) { x.fillRect(bx, base - 8, 30, 8); x.fillRect(bx + 12, base - 30, 2, 22); x.beginPath(); x.moveTo(bx + 14, base - 30); x.lineTo(bx + 28, base - 12); x.lineTo(bx + 14, base - 12); x.fill(); }
      }, 0.1);
      silhouette(p.mid, 225, (x, base) => {
        let xx = 0; while (xx < W) { const w = 20 + ((r() * 30) | 0), h = 6 + ((r() * 20) | 0); x.beginPath(); x.moveTo(xx, base); x.lineTo(xx + w * 0.3, base - h); x.lineTo(xx + w * 0.7, base - h + 4); x.lineTo(xx + w, base); x.fill(); xx += w; }
        x.fillRect(0, base, W, H);
      }, 0.3);
    }
    return { layers, moon, key };
  };

  /* ---------- Dibujo de personajes (coordenadas = pies, centro) ---------- */
  function px(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  // Lía. pose: 'idle'|'run'|'jump'|'fall'|'swim'|'dash'. frame: 0..3
  LF.drawLia = function (ctx, x, y, dir, pose, frame, sx, sy, lanternGlow) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(dir * (sx || 1), sy || 1);
    const coat = '#2b3a7a', coatD = '#1f2a5c', skin = '#f0c7a4', hat = '#8a3d52', hatD = '#6a2c40', boot = '#151a33', hair = '#4a2a22';
    // piernas
    let l1 = 0, l2 = 0;
    if (pose === 'run') { const k = [0, 1, 0, -1][frame & 3]; l1 = k; l2 = -k; }
    if (pose === 'jump') { l1 = -1; l2 = 1; }
    if (pose === 'swim') { l1 = frame & 1 ? 1 : -1; l2 = -l1; }
    px(ctx, boot, -3 + l1, -3, 2, 3); px(ctx, boot, 1 + l2, -3, 2, 3);
    // abrigo
    px(ctx, coat, -4, -11, 8, 8); px(ctx, coat, -5, -6, 10, 3);
    px(ctx, coatD, -5, -4, 10, 1); px(ctx, coatD, -1, -10, 1, 6);
    px(ctx, '#d8b04a', 1, -8, 1, 1); px(ctx, '#d8b04a', 1, -6, 1, 1);
    // cabeza
    px(ctx, skin, -3, -15, 6, 5);
    px(ctx, hair, -4, -14, 1, 4); px(ctx, hair, -3, -11, 1, 1);
    px(ctx, '#141a33', 1, -13, 1, 1);
    px(ctx, '#e8a090', 0, -12, 1, 1);
    // gorro
    px(ctx, hat, -4, -18, 8, 3); px(ctx, hatD, -4, -16, 8, 1); px(ctx, '#d86a80', -1, -19, 2, 1);
    // brazo + farol
    const armY = pose === 'swim' ? -10 : -9;
    px(ctx, coat, 2, armY, 3, 2);
    const ly = armY + 1;
    px(ctx, '#6b5a3a', 4, ly, 4, 1);
    px(ctx, lanternGlow > 0.05 ? '#ffd98a' : '#6a6050', 4, ly + 1, 4, 4);
    if (lanternGlow > 0.05) px(ctx, '#fff3c4', 5, ly + 2, 2, 2);
    px(ctx, '#6b5a3a', 4, ly + 5, 4, 1);
    ctx.restore();
  };

  // Alba (más alta, chal oscuro, rodete gris)
  LF.drawAlba = function (ctx, x, y, dir, frame, alpha, sepia, sitting) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(Math.round(x), Math.round(y)); ctx.scale(dir, 1);
    const shawl = sepia ? '#8a6a48' : '#4a3b5a', skirt = sepia ? '#6a5038' : '#2e2846', skin = sepia ? '#e0c094' : '#e8bfa0', hairC = sepia ? '#d8c8a8' : '#cfcfdc';
    if (sitting) { ctx.translate(0, 4); }
    const k = (frame & 1);
    px(ctx, '#1a1626', -3 + k, -2, 2, 2); px(ctx, '#1a1626', 1 - k, -2, 2, 2);
    px(ctx, skirt, -5, -9, 10, 7); px(ctx, shade(skirt, -0.2), -5, -3, 10, 1);
    px(ctx, shawl, -5, -14, 10, 6); px(ctx, shade(shawl, 0.15), -4, -14, 8, 1);
    px(ctx, skin, -3, -19, 6, 5);
    px(ctx, hairC, -4, -20, 8, 2); px(ctx, hairC, -4, -18, 1, 3); px(ctx, hairC, -6, -21, 3, 3);
    px(ctx, '#2a2030', 1, -17, 1, 1);
    px(ctx, shawl, 3, -12, 3, 2);
    px(ctx, '#6b5a3a', 5, -11, 4, 1); px(ctx, '#ffd98a', 5, -10, 4, 5); px(ctx, '#6b5a3a', 5, -5, 4, 1);
    ctx.restore();
  };

  // Pez Lámpara
  LF.drawFish = function (ctx, x, y, dir, t) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(dir, 1);
    const tail = Math.sin(t * 10) > 0 ? 1 : 0;
    px(ctx, '#4fb3a8', -6, -2 + tail, 2, 3); px(ctx, '#4fb3a8', -7, -3 + tail, 1, 2); px(ctx, '#4fb3a8', -7, 1 - tail, 1, 1);
    px(ctx, '#7fe0d0', -4, -2, 7, 4); px(ctx, '#b8f4ea', -3, -2, 5, 1);
    px(ctx, '#f5c542', -1, -1, 2, 2);
    px(ctx, '#0a2a28', 2, -1, 1, 1);
    px(ctx, '#7fe0d0', 1, -4, 1, 2); px(ctx, '#fff3c4', 1, -5, 1, 1);
    ctx.restore();
  };

  // Farola: base en (x,y) pies.
  LF.drawLamp = function (ctx, x, y, lit, t, big) {
    x = Math.round(x); y = Math.round(y);
    const post = '#141826', postL = '#2a3048';
    if (big) {
      px(ctx, post, x - 10, y - 6, 20, 6); px(ctx, postL, x - 9, y - 6, 18, 1);
      px(ctx, post, x - 8, y - 26, 16, 20);
      px(ctx, lit ? '#ffe7a8' : '#3a3a4a', x - 7, y - 25, 14, 18);
      if (lit) px(ctx, '#fff8e0', x - 3, y - 21, 6, 10);
      px(ctx, post, x - 10, y - 30, 20, 4); px(ctx, post, x - 2, y - 34, 4, 4);
      return;
    }
    px(ctx, post, x - 1, y - 22, 3, 22);
    px(ctx, post, x - 3, y - 2, 7, 2);
    px(ctx, postL, x, y - 21, 1, 19);
    px(ctx, post, x - 4, y - 30, 9, 2);
    const f = lit ? (Math.sin(t * 13) > 0.6 ? '#ffe7a8' : '#ffd98a') : '#30364f';
    px(ctx, f, x - 3, y - 28, 7, 6);
    if (lit) px(ctx, '#fff6d6', x - 1, y - 27, 3, 3); else px(ctx, '#454c6a', x - 3, y - 28, 1, 6);
    px(ctx, post, x - 4, y - 22, 9, 1);
    px(ctx, post, x - 1, y - 32, 3, 2);
  };

  LF.lampHead = (l) => ({ x: l.x, y: l.y - 25 });
})();
