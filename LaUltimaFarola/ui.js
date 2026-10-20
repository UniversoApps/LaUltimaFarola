/* La última farola — interfaz: menús, diálogos, avisos */
(function () {
  const LF = window.LF;
  const U = (LF.ui = {});
  const I = LF.input;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  U.stack = [];
  U.paused = false;

  /* ---------- diálogos ---------- */
  const dlg = { el: null, open: false, full: '', shown: 0, cb: null, openT: 0, who: '' };
  function hideTitleCard() { const el = $('#titlecard'); el.classList.remove('show'); el.hidden = true; clearTimeout(U._tc); }
  U.showDialog = function (who, text, cb) {
    hideTitleCard();
    const sp = LF.speakers[who] || LF.speakers.narr;
    const el = $('#dialog');
    el.classList.toggle('narr', who === 'narr');
    el.querySelector('.who').textContent = sp.name; el.querySelector('.who').style.color = sp.color;
    el.querySelector('.who').hidden = !sp.name;
    dlg.full = text; dlg.shown = 0; dlg.cb = cb; dlg.open = true; dlg.openT = 0; dlg.who = who;
    el.querySelector('.text').textContent = '';
    el.querySelector('.more').classList.remove('on');
    el.hidden = false; requestAnimationFrame(() => el.classList.add('show'));
  };
  function closeDialog() {
    const el = $('#dialog'); dlg.open = false; el.classList.remove('show'); el.hidden = true;
    const cb = dlg.cb; dlg.cb = null; cb && cb();
  }
  function advanceDialog() {
    if (!dlg.open || dlg.openT < 0.18) return;
    if (dlg.shown < dlg.full.length) { dlg.shown = dlg.full.length; $('#dialog .text').textContent = dlg.full; $('#dialog .more').classList.add('on'); }
    else { LF.audio.sfx('blip'); closeDialog(); }
    I.clear();
  }

  /* ---------- recuerdos ---------- */
  const mem = { open: false, cb: null, t: 0 };
  U.showMemory = function (title, text, cb) {
    hideTitleCard();
    const el = $('#memory');
    el.querySelector('h3').textContent = title; el.querySelector('p').textContent = text;
    mem.open = true; mem.cb = cb; mem.t = 0;
    drawSketch(el.querySelector('canvas'), title);
    el.hidden = false; requestAnimationFrame(() => el.classList.add('show'));
  };
  function closeMemory() { I.clear(); const el = $('#memory'); el.classList.remove('show'); mem.open = false; setTimeout(() => { if (!mem.open) el.hidden = true; }, 400); const cb = mem.cb; mem.cb = null; cb && cb(); }
  function drawSketch(c, title) {
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = '#e9dcc0'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#d7c49e'; for (let i = 0; i < 40; i++) x.fillRect((Math.random() * c.width) | 0, (Math.random() * c.height) | 0, 2, 1);
    x.fillStyle = '#c4ab7e'; x.fillRect(0, 50, c.width, 14);
    if (/inund/i.test(title)) { x.fillStyle = '#b89e70'; for (let k = 0; k < c.width; k += 6) x.fillRect(k, 46 + ((k / 6) % 2), 4, 1); }
    if (/miedo/i.test(title)) { x.fillStyle = '#b8a07a'; x.fillRect(70, 38, 22, 10); x.fillRect(70, 34, 6, 4); }
    LF.drawAlba(x, 44, 52, 1, 0, 1, true);
    LF.drawLamp(x, 100, 52, true, 0);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(160,120,70,0.25)'; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'source-over';
    x.strokeStyle = '#8a6a48'; x.strokeRect(0.5, 0.5, c.width - 1, c.height - 1);
  }

  /* ---------- avisos breves ---------- */
  let hintT = 0, barkT = 0, toastT = 0, capT = 0, cardT = 0;
  U.showHint = function (key) {
    const texts = {
      move: () => `Moverse: ${I.label('move')}`,
      jump: () => `Saltar: ${I.label('jump')}. Mantenelo para saltar más alto.`,
      lamp: () => 'Las farolas encendidas guardan tu camino y recargan el farol.',
      spark: () => `Chispa: ${I.label('spark')}`,
      aim: () => `Para apuntar hacia arriba, ${I.label('aim')}.`,
      swim: () => `Nadar: ${I.label('swim')}. Cerca de la superficie, saltá para salir.`,
      dash: () => `Impulso: ${I.label('dash')}. Cruza las sombras violetas.`,
      down: () => `Bajar de una tabla: ${I.label('down')}`
    };
    const f = texts[key]; if (!f) return;
    const el = $('#hint'); el.textContent = f(); el.hidden = false; el.classList.add('show'); hintT = 6;
  };
  U.showBark = function (who, text, d) {
    const sp = LF.speakers[who] || LF.speakers.narr; const el = $('#bark');
    el.querySelector('b').textContent = sp.name; el.querySelector('b').style.color = sp.color; el.querySelector('span').textContent = text;
    el.classList.toggle('fog', who === 'niebla');
    el.hidden = false; el.classList.add('show'); barkT = d;
  };
  U.showAbility = function (k) {
    const a = LF.abilityText[k]; const el = $('#toast');
    el.innerHTML = ''; const h = document.createElement('b'); h.textContent = 'Nueva habilidad: ' + a.name; const s = document.createElement('span'); s.textContent = a.d;
    el.append(h, s); el.hidden = false; el.classList.add('show'); toastT = 5;
    U.refreshTouch();
  };
  U.showCardToast = function (id) {
    const c = LF.postcards.find(p => p.id === id); if (!c) return;
    const el = $('#cardtoast'); el.querySelector('b').textContent = 'Postal encontrada'; el.querySelector('span').textContent = c.title;
    el.hidden = false; el.classList.add('show'); cardT = 3.2;
  };
  U.showTitleCard = function (num, name) {
    const el = $('#titlecard'); el.querySelector('.num').textContent = num; el.querySelector('.name').textContent = name;
    el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(U._tc); U._tc = setTimeout(() => { el.classList.remove('show'); setTimeout(() => (el.hidden = true), 900); }, 3200);
  };
  U.showCaption = function (text, d) { const el = $('#caption'); el.textContent = text; el.hidden = false; el.classList.add('show'); capT = d; };
  U.hideAll = function () {
    for (const id of ['#hint', '#bark', '#toast', '#caption', '#cardtoast']) { const el = $(id); el.classList.remove('show'); el.hidden = true; }
    if (dlg.open) { $('#dialog').hidden = true; dlg.open = false; dlg.cb = null; }
    if (mem.open) { $('#memory').hidden = true; mem.open = false; mem.cb = null; }
  };
  function tickTimer(t, id, dt) { if (t > 0) { t -= dt; if (t <= 0) { const el = $(id); el.classList.remove('show'); setTimeout(() => { if (!el.classList.contains('show')) el.hidden = true; }, 400); } } return t; }

  /* ---------- pantallas ---------- */
  function show(id) {
    $$('#menus .screen').forEach(s => (s.hidden = true));
    if (!id) { $('#menus').hidden = true; U.refreshTouch(); return; }
    $('#menus').hidden = false;
    const s = $('#' + id); s.hidden = false;
    focusFirst(s);
    U.refreshTouch();
  }
  U.open = function (id) { U.stack.push(id); show(id); U.renderScreen(id); };
  U.back = function () {
    U.stack.pop();
    const top = U.stack[U.stack.length - 1];
    if (top) { show(top); U.renderScreen(top); } else { show(null); if (U.paused) U.resume(); }
  };
  U.closeAll = function () { U.stack = []; show(null); };
  function focusFirst(s) { const b = Array.from(s.querySelectorAll('.mi:not([disabled])')).find(x => !x.hidden && x.offsetParent !== null); if (b) b.focus({ preventScroll: true }); }

  U.renderScreen = function (id) {
    if (id === 'm-title') renderTitle();
    if (id === 'm-chapters') renderChapters();
    if (id === 'm-album') renderAlbum();
    if (id === 'm-options') renderOptions();
    if (id === 'm-pause') renderPause();
  };

  function renderTitle() {
    const has = !!LF.save.resume || LF.save.unlocked > 0;
    $('#b-continue').hidden = !LF.save.resume;
    $('#b-new').textContent = has ? 'Nueva partida' : 'Comenzar';
    $('#b-chapters').hidden = !(LF.save.unlocked > 0 || LF.save.done);
    $('#b-install').hidden = !U.canInstall();
    const n = Object.keys(LF.save.cards).length;
    $('#b-album').textContent = `Álbum de postales (${n}/${LF.postcards.length})`;
    focusFirst($('#m-title'));
  }
  function renderChapters() {
    const list = $('#chapter-list'); list.innerHTML = '';
    LF.levels.forEach((lv, i) => {
      const b = document.createElement('button'); b.className = 'mi chapter';
      const locked = i > LF.save.unlocked && !LF.save.done;
      b.disabled = locked;
      const n = document.createElement('span'); n.className = 'cnum'; n.textContent = lv.num;
      const t = document.createElement('span'); t.className = 'cname'; t.textContent = locked ? 'Todavía apagado' : lv.name;
      const got = LF.postcards.filter(p => p.act === i); const have = got.filter(p => LF.save.cards[p.id]).length;
      const c = document.createElement('span'); c.className = 'ccards'; c.textContent = locked ? '' : `${have}/${got.length} postales`;
      b.append(n, t, c);
      b.onclick = () => { U.closeAll(); U.startGame(i, null); };
      list.appendChild(b);
    });
    focusFirst($('#m-chapters'));
  }
  function renderAlbum() {
    const grid = $('#album-grid'); grid.innerHTML = '';
    const det = $('#album-detail'); det.querySelector('h4').textContent = 'Elegí una postal'; det.querySelector('p').textContent = 'Las postales se esconden en los rincones de cada acto. El Pez Lámpara se acerca cuando hay una cerca.';
    LF.postcards.forEach(pc => {
      const b = document.createElement('button'); b.className = 'mi card' + (LF.save.cards[pc.id] ? ' got' : '');
      b.textContent = LF.save.cards[pc.id] ? pc.title : '?';
      b.setAttribute('aria-label', LF.save.cards[pc.id] ? pc.title : 'Postal sin encontrar');
      const f = () => {
        if (LF.save.cards[pc.id]) { det.querySelector('h4').textContent = pc.title; det.querySelector('p').textContent = pc.t; }
        else { det.querySelector('h4').textContent = 'Sin encontrar'; det.querySelector('p').textContent = `Está escondida en «${LF.levels[pc.act].name}».`; }
      };
      b.onclick = f; b.onfocus = f;
      grid.appendChild(b);
    });
    const back = document.createElement('button'); back.className = 'mi wide'; back.textContent = 'Volver'; back.onclick = () => U.back();
    grid.appendChild(back);
    focusFirst($('#m-album'));
  }
  const OPTS = [
    { k: 'speed', label: 'Velocidad del juego', vals: [1, 0.8, 0.6], fmt: v => Math.round(v * 100) + '%' },
    { k: 'invincible', label: 'Invencible', vals: [false, true], fmt: v => (v ? 'Sí' : 'No') },
    { k: 'infiniteOil', label: 'Aceite infinito', vals: [false, true], fmt: v => (v ? 'Sí' : 'No') },
    { k: 'shake', label: 'Temblor de pantalla', vals: [true, false], fmt: v => (v ? 'Sí' : 'No') },
    { k: 'flashes', label: 'Destellos de luz', vals: [true, false], fmt: v => (v ? 'Sí' : 'Suaves') },
    { k: 'music', label: 'Música', vals: [0, 0.2, 0.4, 0.6, 0.8, 1], fmt: v => Math.round(v * 100) + '%' },
    { k: 'sfx', label: 'Efectos', vals: [0, 0.2, 0.4, 0.6, 0.8, 1], fmt: v => Math.round(v * 100) + '%' },
    { k: 'touchSize', label: 'Botones táctiles', vals: ['normal', 'grande'], fmt: v => (v === 'grande' ? 'Grandes' : 'Normales') },
    { k: 'touchMode', label: 'Mostrar controles táctiles', vals: ['auto', 'siempre', 'nunca'], fmt: v => ({ auto: 'Automático', siempre: 'Siempre', nunca: 'Nunca' })[v] },
    { k: 'vibrate', label: 'Vibración', vals: [true, false], fmt: v => (v ? 'Sí' : 'No') }
  ];
  function renderOptions() {
    const list = $('#options-list'); list.innerHTML = '';
    OPTS.forEach(o => {
      const b = document.createElement('button'); b.className = 'mi opt'; b.id = 'opt-' + o.k;
      const l = document.createElement('span'); l.textContent = o.label; const v = document.createElement('span'); v.className = 'val';
      const upd = () => (v.textContent = o.fmt(LF.settings[o.k]));
      upd(); b.append(l, v);
      b.onclick = () => {
        const i = o.vals.findIndex(x => x === LF.settings[o.k]); LF.settings[o.k] = o.vals[(i + 1) % o.vals.length];
        upd(); LF.applySettings(); LF.persist(); LF.audio.sfx('select');
      };
      list.appendChild(b);
    });
    const note = document.createElement('p'); note.className = 'note';
    note.textContent = 'El juego está pensado para ser difícil, pero cada persona juega distinto. Estas opciones no bloquean ningún final ni postal.';
    list.appendChild(note);
    const back = document.createElement('button'); back.className = 'mi wide'; back.textContent = 'Volver'; back.onclick = () => U.back();
    list.appendChild(back);
    focusFirst($('#m-options'));
  }
  function renderPause() {
    const n = Object.keys(LF.save.cards).length;
    $('#pause-info').textContent = `${typeof LF.game.act === 'number' ? LF.game.def.num + ' · ' + LF.game.def.name : 'Epílogo'} — Postales: ${n}/${LF.postcards.length}`;
    $('#pause-keys').textContent = `Saltar: ${I.label('jump')} · Chispa: ${I.label('spark')} · Impulso: ${I.label('dash')}`;
  }

  U.pause = function () {
    if (U.paused || LF.game.mode !== 'play') return;
    U.paused = true; LF.audio.suspend(true); U.open('m-pause');
  };
  U.resume = function () { U.paused = false; U.closeAll(); LF.audio.suspend(false); I.clear(); };

  U.startGame = function (act, lamp) {
    U.closeAll(); U.paused = false; U.hideAll(); LF.audio.suspend(false);
    $('#title-logo').hidden = true;
    LF.game.fadeTo(1, 0.5, 0, () => { LF.game.loadLevel(act, { lamp }); LF.game.fadeTo(0, 0.8); U.refreshTouch(); });
    tryFullscreen();
  };
  U.toTitle = function () {
    U.paused = false; U.hideAll(); LF.audio.suspend(false);
    LF.game.fadeTo(1, 0.4, 0, () => {
      LF.game.loadLevel(0, { demo: true }); LF.audio.playMusic('titulo'); LF.audio.playAmb('olas');
      $('#title-logo').hidden = false; U.stack = []; U.open('m-title'); LF.game.fadeTo(0, 0.6);
    });
  };
  U.showEnd = function () {
    const n = Object.keys(LF.save.cards).length;
    $('#end-cards').textContent = `Encontraste ${n} de ${LF.postcards.length} postales.`;
    U.hideAll(); LF.game.mode = 'none';
    U.stack = []; U.open('m-end');
  };

  /* ---------- instalación y pantalla completa ---------- */
  U.deferredPrompt = null;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
  U.canInstall = () => !standalone() && (!!U.deferredPrompt || isIOS || I.touchActive);
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); U.deferredPrompt = e; if (U.stack[U.stack.length - 1] === 'm-title') renderTitle(); });
  window.addEventListener('appinstalled', () => { U.deferredPrompt = null; if (U.stack[U.stack.length - 1] === 'm-title') renderTitle(); });
  U.install = async function () {
    if (U.deferredPrompt) { U.deferredPrompt.prompt(); try { await U.deferredPrompt.userChoice; } catch (e) {} U.deferredPrompt = null; renderTitle(); return; }
    $('#install-text').textContent = isIOS
      ? 'En iPhone o iPad, abrí el juego en Safari, tocá el botón Compartir (el cuadrado con una flecha hacia arriba) y elegí «Agregar a inicio». El juego queda como una app y funciona sin conexión.'
      : 'En Android, abrí el menú del navegador (los tres puntos) y elegí «Instalar app» o «Agregar a la pantalla principal». El juego queda como una app y funciona sin conexión.';
    U.open('m-install');
  };
  function tryFullscreen() {
    if (!I.touchActive || standalone() || isIOS) return;
    const el = document.documentElement;
    try { const r = el.requestFullscreen && el.requestFullscreen({ navigationUI: 'hide' }); if (r && r.then) r.then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {}); } catch (e) {}
  }

  /* ---------- controles táctiles ---------- */
  U.onTouchDetected = function () { if (U.stack[U.stack.length - 1] === 'm-title') renderTitle(); U.refreshTouch(); };
  U.refreshTouch = function () {
    const s = LF.settings; if (!s) return;
    const show = s.touchMode === 'siempre' || (s.touchMode === 'auto' && I.touchActive);
    const playing = LF.game.mode === 'play' && !U.stack.length;
    const tc = $('#touch');
    tc.hidden = !(show && playing);
    tc.classList.toggle('big', s.touchSize === 'grande');
    const ab = LF.game.abil || {};
    $('#t-spark').hidden = !ab.spark; $('#t-dash').hidden = !ab.dash;
    document.body.classList.toggle('touch-ui', show);
  };

  /* ---------- actualización por frame ---------- */
  U.update = function (dt) {
    // diálogos
    if (dlg.open) {
      dlg.openT += dt;
      if (dlg.shown < dlg.full.length) {
        const before = Math.floor(dlg.shown); dlg.shown = Math.min(dlg.full.length, dlg.shown + dt * 48);
        const now = Math.floor(dlg.shown);
        if (now !== before) { $('#dialog .text').textContent = dlg.full.slice(0, now); if (now % 3 === 0 && dlg.full[now - 1] !== ' ') LF.audio.sfx('type', dlg.who === 'alba' ? 420 : dlg.who === 'pez' ? 760 : dlg.who === 'niebla' ? 300 : 560); }
        if (dlg.shown >= dlg.full.length) $('#dialog .more').classList.add('on');
      }
      if (!U.paused && (I.pressed.confirm || I.pressed.jump || I.pressed.spark)) advanceDialog();
    }
    if (mem.open) { mem.t += dt; if (mem.t > 0.6 && (I.pressed.confirm || I.pressed.jump)) closeMemory(); $('#memory .more').classList.toggle('on', mem.t > 0.6); }
    hintT = tickTimer(hintT, '#hint', dt); barkT = tickTimer(barkT, '#bark', dt); toastT = tickTimer(toastT, '#toast', dt);
    capT = tickTimer(capT, '#caption', dt); cardT = tickTimer(cardT, '#cardtoast', dt);

    // pausa
    if (I.pressed.pause && LF.game.mode === 'play' && !U.stack.length) { U.pause(); I.clear(); return; }

    // navegación de menús con teclado/gamepad
    if (U.stack.length) {
      const scr = $('#' + U.stack[U.stack.length - 1]);
      const items = Array.from(scr.querySelectorAll('.mi')).filter(b => !b.disabled && !b.hidden && b.offsetParent !== null);
      let idx = items.indexOf(document.activeElement);
      const grid = scr.querySelector('.grid');
      const cols = grid ? Math.max(1, Math.round(grid.clientWidth / ((items[0] && items[0].offsetWidth) || 1))) : 1;
      if (I.pressed.down) { idx = idx < 0 ? 0 : Math.min(items.length - 1, idx + (grid && document.activeElement && document.activeElement.classList.contains('card') ? cols : 1)); items[idx] && items[idx].focus(); LF.audio.sfx('blip'); }
      if (I.pressed.up) { idx = idx < 0 ? 0 : Math.max(0, idx - (grid && document.activeElement && document.activeElement.classList.contains('card') ? cols : 1)); items[idx] && items[idx].focus(); LF.audio.sfx('blip'); }
      if (grid && (I.pressed.left || I.pressed.right)) { idx = Math.max(0, Math.min(items.length - 1, idx + (I.pressed.right ? 1 : -1))); items[idx] && items[idx].focus(); LF.audio.sfx('blip'); }
      // Enter activa el botón de forma nativa; Espacio/Z y el botón A del mando pasan por acá
      const act = (I.device === 'pad' && I.pressed.confirm) || (I.device === 'kb' && I.pressed.jump);
      if (act && document.activeElement && document.activeElement.classList.contains('mi')) document.activeElement.click();
      if (I.pressed.back || (I.pressed.pause && U.stack.length)) {
        const top = U.stack[U.stack.length - 1];
        if (top === 'm-pause') U.resume(); else if (top !== 'm-title' && top !== 'm-end') { U.back(); }
        I.clear();
      }
    }
  };

  /* ---------- enlaces de botones ---------- */
  U.init = function () {
    $('#b-continue').onclick = () => { const r = LF.save.resume; if (r) U.startGame(r.act, r.lamp); };
    $('#b-new').onclick = () => U.startGame(0, null);
    $('#b-chapters').onclick = () => U.open('m-chapters');
    $('#b-album').onclick = () => U.open('m-album');
    $('#b-options').onclick = () => U.open('m-options');
    $('#b-install').onclick = () => U.install();
    $('#b-chap-back').onclick = () => U.back();
    $('#b-install-back').onclick = () => U.back();
    $('#p-resume').onclick = () => U.resume();
    $('#p-lamp').onclick = () => { U.resume(); LF.game.restartFromLamp(); };
    $('#p-options').onclick = () => U.open('m-options');
    $('#p-album').onclick = () => U.open('m-album');
    $('#p-title').onclick = () => U.toTitle();
    $('#e-album').onclick = () => U.open('m-album');
    $('#e-title').onclick = () => U.toTitle();
    $('#t-pause').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); U.pause(); });
    $('#dialog').addEventListener('pointerdown', e => { e.preventDefault(); advanceDialog(); });
    $('#memory').addEventListener('pointerdown', e => { e.preventDefault(); if (mem.t > 0.6) closeMemory(); });
    $$('#menus .mi').forEach(b => b.addEventListener('pointerenter', () => { if (b.matches(':not([disabled])')) b.focus({ preventScroll: true }); }));
    document.addEventListener('focusin', e => { if (e.target.classList && e.target.classList.contains('mi')) e.target.scrollIntoView({ block: 'nearest' }); });
  };
})();
