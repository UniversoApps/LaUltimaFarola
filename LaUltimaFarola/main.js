/* La última farola — arranque, guardado y bucle principal */
(function () {
  const LF = window.LF;
  const KEY = 'ultima-farola-v1';
  const DEF_SETTINGS = { speed: 1, invincible: false, infiniteOil: false, shake: true, flashes: true, music: 0.6, sfx: 0.8, touchSize: 'normal', touchMode: 'auto', vibrate: true };

  function load() {
    let d = null; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    d = d || {};
    LF.save = { unlocked: d.unlocked || 0, cards: d.cards || {}, resume: d.resume || null, done: !!d.done };
    LF.settings = Object.assign({}, DEF_SETTINGS, d.settings || {});
  }
  LF.persist = function () {
    try { localStorage.setItem(KEY, JSON.stringify(Object.assign({}, LF.save, { settings: LF.settings }))); } catch (e) {}
  };
  LF.applySettings = function () { LF.audio.setVolumes(LF.settings.music, LF.settings.sfx); LF.ui.refreshTouch(); };

  // escalado: el juego vive en 480x270 y se agranda manteniendo la proporción
  function resize() {
    const frame = document.getElementById('frame');
    const vw = window.innerWidth, vh = window.innerHeight;
    const s = Math.min(vw / 480, vh / 270);
    const w = Math.floor(480 * s), h = Math.floor(270 * s);
    frame.style.width = w + 'px'; frame.style.height = h + 'px';
    frame.style.left = Math.floor((vw - w) / 2) + 'px'; frame.style.top = Math.floor((vh - h) / 2) + 'px';
    document.documentElement.style.setProperty('--u', s + 'px');
    const portrait = vh > vw && (LF.input.touchActive || matchMedia('(pointer: coarse)').matches);
    document.getElementById('rotate').hidden = !portrait;
  }

  function boot() {
    load();
    LF.input.initTouch();
    LF.ui.init();
    const canvas = document.getElementById('screen');
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 200));
    resize();
    LF.applySettings();
    // primer gesto: habilita el audio
    const unlock = () => { LF.audio.unlock(); LF.applySettings(); };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (LF.game.mode === 'play') LF.ui.pause(); LF.audio.suspend(true); } else if (!LF.ui.paused) LF.audio.suspend(false); });

    LF.game.loadLevel(0, { demo: true });
    LF.audio.playMusic('titulo'); LF.audio.playAmb('olas');
    LF.ui.open('m-title');

    let last = performance.now(), acc = 0; const STEP = 1 / 60;
    function frame(now) {
      let dt = Math.min(0.1, (now - last) / 1000); last = now;
      LF.input.update();
      LF.ui.update(dt);
      if (LF.ui.paused || LF.ui.stack.length) LF.input.clear();
      const portrait = !document.getElementById('rotate').hidden;
      if (!LF.ui.paused && !portrait) {
        acc += dt * (LF.game.mode === 'play' ? LF.settings.speed : 1);
        let n = 0;
        while (acc >= STEP && n < 5) { LF.game.update(STEP); acc -= STEP; n++; LF.input.clear(); }
        if (n >= 5) acc = 0;
      }
      LF.audio.update();
      LF.game.render(ctx);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // app instalable y sin conexión
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      try { navigator.serviceWorker.register('../sw.js').catch(() => {}); } catch (e) {}
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
