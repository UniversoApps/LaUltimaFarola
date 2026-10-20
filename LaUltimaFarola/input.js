/* La última farola — teclado, gamepad y controles táctiles */
(function () {
  const LF = window.LF;
  const I = (LF.input = {
    held: { left: 0, right: 0, up: 0, down: 0, jump: 0, spark: 0, dash: 0 },
    pressed: {}, released: {},
    device: 'kb', touchActive: false, axisX: 0
  });
  const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'spark', 'dash', 'pause', 'confirm', 'back'];
  const src = { kb: {}, pad: {}, touch: {} };
  const tap = {}; // toques más rápidos que un cuadro también cuentan
  ACTIONS.forEach(a => { src.kb[a] = 0; src.pad[a] = 0; src.touch[a] = 0; });
  const prev = {};

  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'jump', KeyZ: 'jump',
    KeyX: 'spark', KeyJ: 'spark',
    KeyC: 'dash', KeyK: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash',
    Escape: 'pause', KeyP: 'pause', Enter: 'confirm', Backspace: 'back'
  };
  window.addEventListener('keydown', e => {
    const a = KEYMAP[e.code]; if (!a) return;
    if (e.target && (e.target.tagName === 'INPUT')) return;
    I.device = 'kb'; LF.audio && LF.audio.unlock();
    if (!e.repeat) { tap[a] = 1; if (a === 'jump') tap.confirm = 1; if (a === 'pause') tap.back = 1; }
    src.kb[a] = 1;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (a === 'jump') src.kb.confirm = 1;
    if (a === 'pause') src.kb.back = 1;
  });
  window.addEventListener('keyup', e => {
    const a = KEYMAP[e.code]; if (!a) return;
    src.kb[a] = 0;
    if (a === 'jump') src.kb.confirm = 0;
    if (a === 'pause') src.kb.back = 0;
  });
  window.addEventListener('blur', () => { ACTIONS.forEach(a => { src.kb[a] = 0; src.touch[a] = 0; }); });

  /* ---------- gamepad ---------- */
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null; for (const p of pads) if (p && p.connected) { gp = p; break; }
    ACTIONS.forEach(a => (src.pad[a] = 0));
    if (!gp) return;
    const b = i => gp.buttons[i] && gp.buttons[i].pressed ? 1 : 0;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    src.pad.left = b(14) || ax < -0.35 ? 1 : 0;
    src.pad.right = b(15) || ax > 0.35 ? 1 : 0;
    src.pad.up = b(12) || ay < -0.45 ? 1 : 0;
    src.pad.down = b(13) || ay > 0.55 ? 1 : 0;
    src.pad.jump = b(0);
    src.pad.dash = b(1) || b(5) || b(7);
    src.pad.spark = b(2) || b(3) || b(4) || b(6);
    src.pad.pause = b(9);
    src.pad.confirm = b(0);
    src.pad.back = b(1) || b(8);
    const any = gp.buttons.some(x => x.pressed) || Math.abs(ax) > 0.35 || Math.abs(ay) > 0.45;
    if (any) { I.device = 'pad'; LF.audio && LF.audio.unlock(); }
  }

  /* ---------- táctil ---------- */
  const touch = { stickId: null, sx: 0, sy: 0, x: 0, y: 0, buttons: new Map() };
  let tc = null, stickBase, stickKnob;
  I.initTouch = function () {
    tc = document.getElementById('touch');
    stickBase = document.getElementById('stick-base'); stickKnob = document.getElementById('stick-knob');
    const zone = document.getElementById('stick-zone');
    const opts = { passive: false };
    zone.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      e.preventDefault(); I.device = 'touch'; LF.audio && LF.audio.unlock();
      if (touch.stickId !== null) return;
      touch.stickId = e.pointerId; touch.sx = e.clientX; touch.sy = e.clientY; touch.x = e.clientX; touch.y = e.clientY;
      try { zone.setPointerCapture(e.pointerId); } catch (er) {}
      stickBase.style.left = e.clientX + 'px'; stickBase.style.top = e.clientY + 'px'; stickBase.classList.add('on');
      updateStick();
    }, opts);
    zone.addEventListener('pointermove', e => { if (e.pointerId !== touch.stickId) return; e.preventDefault(); touch.x = e.clientX; touch.y = e.clientY; updateStick(); }, opts);
    const end = e => { if (e.pointerId !== touch.stickId) return; touch.stickId = null; src.touch.left = src.touch.right = src.touch.up = src.touch.down = 0; I.axisX = 0; stickBase.classList.remove('on'); stickKnob.style.transform = 'translate(-50%,-50%)'; };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);

    document.querySelectorAll('#touch .tbtn').forEach(btn => {
      const act = btn.dataset.act;
      btn.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && !I.touchActive) return;
        e.preventDefault(); e.stopPropagation(); I.device = 'touch'; LF.audio && LF.audio.unlock();
        try { btn.setPointerCapture(e.pointerId); } catch (er) {}
        src.touch[act] = 1; tap[act] = 1; if (act === 'jump') { src.touch.confirm = 1; tap.confirm = 1; } btn.classList.add('down');
        if (navigator.vibrate && LF.settings && LF.settings.vibrate) try { navigator.vibrate(8); } catch (er) {}
      }, opts);
      const up = e => { e.preventDefault(); src.touch[act] = 0; if (act === 'jump') src.touch.confirm = 0; btn.classList.remove('down'); };
      btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up); btn.addEventListener('lostpointercapture', up);
    });
    window.addEventListener('touchstart', () => { const first = !I.touchActive; I.touchActive = true; I.device = 'touch'; document.body.classList.add('has-touch'); if (first && LF.ui) LF.ui.onTouchDetected(); }, { passive: true });
    window.addEventListener('touchend', () => { LF.audio && LF.audio.unlock(); }, { passive: true });
  };
  function updateStick() {
    const dx = touch.x - touch.sx, dy = touch.y - touch.sy;
    const max = 44; const len = Math.hypot(dx, dy) || 1; const k = Math.min(1, max / len);
    stickKnob.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
    const dz = 12;
    src.touch.left = dx < -dz ? 1 : 0; src.touch.right = dx > dz ? 1 : 0;
    src.touch.up = dy < -26 ? 1 : 0; src.touch.down = dy > 26 ? 1 : 0;
    I.axisX = Math.max(-1, Math.min(1, dx / 36));
  }

  I.update = function () {
    pollPad();
    for (const a of ACTIONS) {
      const v = src.kb[a] || src.pad[a] || src.touch[a] ? 1 : 0;
      // los toques quedan registrados hasta que alguien los consume (pantallas de 120 Hz)
      I.pressed[a] = I.pressed[a] || (v && !prev[a]) || !!tap[a];
      I.released[a] = I.released[a] || (!v && prev[a]) || (!!tap[a] && !v);
      tap[a] = 0;
      I.held[a] = v; prev[a] = v;
    }
  };
  I.clear = function () { for (const a of ACTIONS) { I.pressed[a] = false; I.released[a] = false; } };

  I.label = function (what) {
    const d = I.device;
    const L = {
      move: { kb: '← → o A D', pad: 'stick izquierdo o cruceta', touch: 'joystick de la izquierda' },
      jump: { kb: 'Espacio o Z', pad: 'botón A', touch: 'botón Saltar' },
      spark: { kb: 'X o J', pad: 'botón X', touch: 'botón Chispa' },
      aim: { kb: 'mantené ↑ al tirar la chispa', pad: 'mantené arriba al tirar la chispa', touch: 'llevá el joystick arriba al tirar la chispa' },
      dash: { kb: 'C, K o Shift', pad: 'botón B o RB', touch: 'botón Impulso' },
      down: { kb: '↓ + Espacio', pad: 'abajo + A', touch: 'joystick abajo + Saltar' },
      swim: { kb: 'Espacio o ↑ para subir', pad: 'A o arriba para subir', touch: 'Saltar o joystick arriba para subir' },
      pause: { kb: 'Esc', pad: 'Start', touch: 'botón ❚❚' }
    };
    return (L[what] && L[what][d]) || '';
  };
})();
