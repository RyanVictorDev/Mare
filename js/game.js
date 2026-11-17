// Maré — o jogo em si: controles, mergulhador, pérolas, descobertas, HUD e laço principal.
(function () {
  'use strict';
  const M = window.MARE, W = M.world, Rn = M.render, Cr = M.creatures, A = M.audio;
  const $ = id => document.getElementById(id);
  const SAVE_KEY = 'mare-save-v1', SET_KEY = 'mare-config-v1';
  const NP = 12, NPART = 3, PR = 0.6, TAU = Math.PI * 2;

  const JOURNAL = [
    { id: 'recife', t: 'Recife de Coral', d: 'Um jardim raso e colorido, onde a luz do sol dança sobre a areia.', h: 'Onde todo mergulho começa.' },
    { id: 'superficie', t: 'A Superfície', d: 'Fim de tarde. O mar aberto, o céu dourado e gaivotas sem pressa nenhuma.', h: 'Suba até romper a água.' },
    { id: 'pradaria', t: 'Pradaria Marinha', d: 'Campos de capim-marinho ondulando com a corrente, berçário de muita vida.', h: 'A sudoeste do recife, o fundo fica verde.' },
    { id: 'algas', t: 'Floresta de Algas', d: 'Algas gigantes sobem do fundo até quase tocar a superfície, como uma catedral.', h: 'A leste do recife, a água escurece entre colunas vivas.' },
    { id: 'naufragio', t: 'Naufrágio do Aurora', d: 'Um veleiro antigo descansa de lado na areia. Hoje é lar de cardumes.', h: 'Ao norte, depois da planície de areia, algo grande dorme no fundo.' },
    { id: 'ruinas', t: 'Ruínas Submersas', d: 'Colunas de um templo esquecido. No altar, alguém deixou um presente.', h: 'A oeste, pedras que não foram feitas pelo mar.' },
    { id: 'fossa', t: 'Fossa Abissal', d: 'Lá embaixo o sol não chega. A luz que existe é a dos próprios seres.', h: 'Ao sul, o chão desaparece. Leve a lanterna.' },
    { id: 'anemonas', t: 'Jardim de Anêmonas', d: 'Um anel de corrente lenta, e anêmonas que abrem quando você chega perto.', h: 'A nordeste do recife, a água começa a girar.' },
    { id: 'poco', t: 'Poço das Sombras', d: 'Um segundo abismo, menor e mais quieto. Lulas descem até onde a lanterna mal alcança.', h: 'A sudoeste, depois do naufrágio, o fundo se abre de novo.' },
    { id: 'arraia', t: 'Arraia-manta', d: 'Voa em vez de nadar. Gira em círculos largos, sem pressa nenhuma.', h: 'Olhe para cima no recife e na pradaria.' },
    { id: 'tartaruga', t: 'Tartaruga-marinha', d: 'Viajante antiga, passeia entre os corais como quem conhece o caminho.', h: 'Costuma rondar o recife e a floresta de algas.' },
    { id: 'baleia', t: 'Baleia-jubarte', d: 'Vinte e três metros de calma. O canto dela atravessa o oceano inteiro.', h: 'Siga o canto. Ela dá a volta no mundo, perto das bordas.' },
    { id: 'aguaviva', t: 'Águas-vivas luminosas', d: 'Lanternas vivas pulsando no escuro, subindo e descendo devagar.', h: 'Só brilham onde a luz do sol não alcança.' },
    { id: 'tubarao', t: 'Tubarão-de-recife', d: 'Passa largo, sem pressa e sem fome. Se você chega perto, ele só abre espaço.', h: 'Cruza o recife e a borda da floresta de algas.' },
    { id: 'polvo', t: 'Polvo', d: 'Muda de cor se você chega devagar. Se chega rápido, a tinta responde por ele.', h: 'Um no naufrágio, outro no jardim de anêmonas.' },
    { id: 'cavalo', t: 'Cavalo-marinho', d: 'Segura a alga com a cauda. A luz da lanterna faz ele virar o focinho.', h: 'No meio da floresta de algas, bem pequeno.' },
    { id: 'peixelua', t: 'Peixe-lua', d: 'Um disco enorme e lento. Se você para, ele vem ver quem é.', h: 'Perto da superfície, no mar aberto a leste.' },
    { id: 'tamboril', t: 'Peixe-pescador', d: 'A luz na frente da boca não é um convite. Chegue perto e ele avança, depois se esconde.', h: 'No fundo da fossa, onde as outras luzes são plantas.' },
    { id: 'lula', t: 'Lula-de-vidro', d: 'Pulsa no escuro. Se você se aproxima, ela dispara para trás num jato.', h: 'Na fossa e no poço das sombras.' },
    { id: 'leviata', t: 'Sombra da Fossa', d: 'Maior que a baleia, e sem canto. Só o deslocamento da água quando ela passa.', h: 'Desça até o fundo da fossa e espere.' },
    { id: 'propulsor', t: 'Propulsor das Marés', d: 'As três peças encaixaram. A água abre caminho, e o nado fica bem mais rápido.', h: 'Hélice no naufrágio, núcleo nas ruínas, carcaça no poço a sudoeste.' },
    { id: 'coracao', t: 'Coração do Mar', d: 'As doze pérolas reunidas. O plâncton acendeu, e o oceano inteiro agradece.', h: 'Reúna as doze pérolas.' },
  ];

  // ---------- estado ----------
  let settings = { quality: 'auto', volume: 0.8, music: true, sens: 1, invert: false, fps: false };
  let save = null;
  let mode = 'loading', time = 0, last = 0;
  const pl = { x: 0, y: -6, z: 60, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0 };
  const keys = {};
  let locked = false, dragMode = false, journalOpen = false;
  const touchQuery = window.matchMedia('(hover: none), (pointer: coarse), (max-width: 860px)');
  let touchOn = touchQuery.matches;
  const stick = { x: 0, y: 0 };
  let flash = false, flashK = 0, bloom = 0, fade = 0, fadeTarget = 1;
  let breathT = 0, exhaleLeft = 0, exhaleAcc = 0, ventAcc = 0;
  let checkT = 0, saveT = 0, curZone = null, zoneTimer = 0;
  let sonar = { on: false, t: 0, i: -1, cool: 0, kind: 'pearl' };
  let fpsEma = 60, slowT = 0, fastT = 0, autoLevel = 1, ceiling = 2, fpsShowT = 0;
  const LEVELS = ['low', 'medium', 'high'];
  const bubbles = [], bursts = [], toasts = [], hints = [];
  let toastT = 0, hintT = 0, darkHint = false, currentNoted = false;
  let aboveSm = 0, splashK = 0, wasAir = false;
  const bubData = new Float32Array(600 * 8), glowData = new Float32Array(64 * 8), pearlData = new Float32Array(NP * 12);
  const pearlDyn = { mesh: 'pearl', prog: 'static', data: pearlData, count: NP };
  const partData = new Float32Array(NPART * 12);
  const partDyn = { mesh: 'part', prog: 'fish', data: partData, count: NPART };
  const PART_TINT = [[0.95, 0.62, 0.28], [0.45, 0.95, 1], [0.8, 0.86, 0.92]];
  const camPos = [0, 0, 0], camFwd = [0, 0, -1];
  const frame = { pos: camPos, fwd: camFwd, time: 0, flash: 0, bloom: 0, fade: 1, above: 0, splash: 0, dyn: [], glows: { data: glowData, count: 0 }, bubbles: { data: bubData, count: 0 } };

  // ---------- armazenamento ----------
  const store = {
    get(k) {
      try {
        return JSON.parse(localStorage.getItem(k));
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) { /* sem armazenamento: o jogo segue, só não guarda o progresso */ }
    },
  };
  const freshSave = () => ({ pearls: new Array(NP).fill(false), parts: [false, false, false], seen: {}, pos: null, yaw: 0, pitch: 0, done: false, hinted: false });
  function loadAll() {
    const s = store.get(SET_KEY);
    if (s && typeof s === 'object') settings = Object.assign(settings, s);
    const g = store.get(SAVE_KEY);
    save = g && Array.isArray(g.pearls) && g.pearls.length === NP ? Object.assign(freshSave(), g) : freshSave();
    if (!Array.isArray(save.parts) || save.parts.length !== NPART) save.parts = [false, false, false];
  }
  function saveGame() {
    if (mode === 'play' || mode === 'pause') {
      save.pos = [pl.x, pl.y, pl.z];
      save.yaw = pl.yaw;
      save.pitch = pl.pitch;
    }
    store.set(SAVE_KEY, save);
  }
  const saveSettings = () => store.set(SET_KEY, settings);
  const pearlCount = () => save.pearls.filter(Boolean).length;
  const partCount = () => save.parts.filter(Boolean).length;
  const hasProgress = () => pearlCount() > 0 || partCount() > 0 || Object.keys(save.seen).length > 1;

  // ---------- interface ----------
  function show(id, on) {
    $(id).classList.toggle('hidden', !on);
  }
  function toast(title, text) {
    toasts.push([title, text]);
  }
  function hint(text, delay) {
    hints.push({ at: time + (delay || 0), text: text });
  }
  function renderJournal() {
    const list = $('j-list');
    list.innerHTML = '';
    let n = 0;
    for (const e of JOURNAL) {
      const seen = !!save.seen[e.id], li = document.createElement('li'), b = document.createElement('b'), s = document.createElement('span');
      if (seen) n++;
      li.className = seen ? 'seen' : '';
      b.textContent = seen ? e.t : '· · ·';
      s.textContent = seen ? e.d : e.h;
      if (e.id === 'propulsor' && seen && partCount() < NPART) s.textContent = 'Peça ' + partCount() + ' de 3. O nado já está mais leve.';
      li.append(b, s);
      list.append(li);
    }
    $('j-count').textContent = n;
    $('j-total').textContent = JOURNAL.length;
    $('j-pearls').textContent = pearlCount();
    $('pearl-n').textContent = pearlCount();
    $('part-n').textContent = partCount();
  }
  function discover(id) {
    if (save.seen[id]) return;
    save.seen[id] = true;
    const e = JOURNAL.find(j => j.id === id);
    toast('Descoberta — ' + e.t, e.d);
    A.discover();
    renderJournal();
    saveGame();
  }
  function setJournal(on) {
    journalOpen = on;
    show('journal', on);
    syncTouch();
  }
  function syncTouch() {
    document.body.classList.toggle('touch', touchOn);
    show('touch', touchOn && mode === 'play' && !journalOpen);
    const lab = $('sens-label');
    if (lab) lab.textContent = touchOn ? 'Sensibilidade do olhar' : 'Sensibilidade do mouse';
    const lampBtn = document.querySelector('#touch-actions [data-tap="lamp"]');
    if (lampBtn) lampBtn.classList.toggle('on', flash);
  }
  function applyQuality() {
    const q = settings.quality === 'auto' ? LEVELS[autoLevel] : settings.quality;
    if (Rn.quality() !== q) Rn.setQuality(q);
    Cr.detail = { low: 0.55, medium: 0.85, high: 1 }[q];
    document.querySelectorAll('#quality button').forEach(b => b.classList.toggle('on', b.dataset.q === settings.quality));
  }
  function syncSettingsUI() {
    $('vol').value = settings.volume;
    $('sens').value = settings.sens;
    $('music').checked = settings.music;
    $('invert').checked = settings.invert;
    $('showfps').checked = settings.fps;
    show('fps', settings.fps);
    applyQuality();
  }
  function buildCompass() {
    const names = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'], box = $('compass');
    names.forEach((n, i) => {
      const s = document.createElement('span');
      s.textContent = n;
      if (i % 2 === 0) s.className = 'main';
      s.dataset.a = (i * Math.PI) / 4;
      box.append(s);
    });
  }
  const wrap = a => {
    a = (a + Math.PI) % TAU;
    if (a < 0) a += TAU;
    return a - Math.PI;
  };

  // ---------- modos ----------
  function lockPointer() {
    if (touchOn) {
      dragMode = true;
      return;
    }
    const cv = $('gl');
    if (!cv.requestPointerLock) {
      dragMode = true;
      return;
    }
    try {
      const r = cv.requestPointerLock();
      if (r && r.catch) r.catch(() => (dragMode = true));
    } catch (e) {
      dragMode = true;
    }
  }
  function startDive(fresh) {
    if (fresh) {
      save = freshSave();
      bloom = 0;
    }
    A.init();
    A.setVolume(settings.volume);
    A.setMusic(settings.music);
    A.setDuck(1);
    const sp = W.spawn;
    if (save.pos && !fresh) {
      pl.x = save.pos[0]; pl.y = save.pos[1]; pl.z = save.pos[2];
      pl.yaw = save.yaw || 0;
      pl.pitch = save.pitch || 0;
    } else {
      pl.x = sp.x; pl.y = sp.y; pl.z = sp.z;
      pl.yaw = 0.12;
      pl.pitch = -0.1;
    }
    pl.vx = pl.vy = pl.vz = 0;
    wasAir = pl.y > seaY(pl.x, pl.z, time) + 0.25;
    curZone = null;
    mode = 'play';
    fade = 0;
    fadeTarget = 1;
    breathT = 1.5;
    show('menu', false);
    show('pause', false);
    show('hud', true);
    hints.length = 0;
    if (!save.hinted) {
      if (touchOn) {
        hint('Arraste na tela para olhar', 2.5);
        hint('O círculo da esquerda nada · subir e descer ficam à direita', 10);
        hint('Aquele brilho logo à frente é uma pérola. Chegue perto para pegá-la.', 18);
        hint('Sonar aponta a pérola mais próxima', 27);
        hint('Segure subir até romper a água', 36);
        hint('Há peças de um propulsor no naufrágio, nas ruínas e no poço a sudoeste', 48);
      } else {
        hint('W A S D para nadar · mouse para olhar', 2.5);
        hint('Espaço sobe · C desce · Shift nada mais rápido', 10);
        hint('Aquele brilho logo à frente é uma pérola. Chegue perto para pegá-la.', 18);
        hint('E solta o sonar, que aponta a pérola mais próxima', 27);
        hint('Tab abre o diário de mergulho', 36);
        hint('Segure Espaço para subir até a superfície', 46);
        hint('Há peças de um propulsor no naufrágio, nas ruínas e no poço a sudoeste', 58);
      }
      save.hinted = true;
    }
    syncTouch();
    discover('recife');
    renderJournal();
    lockPointer();
    saveGame();
  }
  function pause() {
    if (mode !== 'play') return;
    mode = 'pause';
    for (const k in keys) keys[k] = false;
    stick.x = stick.y = 0;
    setJournal(false);
    show('pause', true);
    A.setDuck(0.35);
    saveGame();
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function resume() {
    if (mode !== 'pause') return;
    mode = 'play';
    show('pause', false);
    setJournal(false);
    A.init();
    A.setDuck(1);
    syncTouch();
    lockPointer();
  }

  // ---------- entrada ----------
  function bindInput() {
    const cv = $('gl');
    document.addEventListener('pointerlockchange', () => {
      locked = document.pointerLockElement === cv;
      if (locked) dragMode = false;
      else if (mode === 'play' && !dragMode && !touchOn) pause();
    });
    document.addEventListener('pointerlockerror', () => (dragMode = true));
    document.addEventListener('mousemove', e => {
      if (mode !== 'play') return;
      if (!locked && !(dragMode && e.buttons & 1)) return;
      const k = 0.0022 * settings.sens;
      pl.yaw += e.movementX * k;
      pl.pitch = M.clamp(pl.pitch - e.movementY * k * (settings.invert ? -1 : 1), -1.5, 1.5);
    });
    cv.addEventListener('mousedown', () => {
      if (touchOn || mode !== 'play' || locked) return;
      lockPointer();
    });
    bindTouch(cv);
    window.addEventListener('keydown', e => {
      const c = e.code;
      if (mode === 'play' || mode === 'pause') {
        if (c === 'Tab' || c === 'Space' || c.startsWith('Arrow')) e.preventDefault();
      }
      if (e.repeat) return;
      if (c === 'Escape') {
        if (journalOpen) setJournal(false);
        else if (mode === 'play') pause();
        else if (mode === 'pause') resume();
        return;
      }
      if (c === 'Tab' || c === 'KeyJ') {
        if (mode === 'play' || mode === 'pause') setJournal(!journalOpen);
        return;
      }
      if (mode !== 'play') return;
      keys[c] = true;
      if (c === 'KeyE') ping();
      if (c === 'KeyF') {
        flash = !flash;
        $('lamp').classList.toggle('show', flash);
        syncTouch();
      }
    });
    window.addEventListener('keyup', e => (keys[e.code] = false));
    window.addEventListener('blur', () => {
      for (const k in keys) keys[k] = false;
      stick.x = stick.y = 0;
    });
    const applyTouch = () => {
      touchOn = touchQuery.matches;
      if (touchOn) dragMode = true;
      syncTouch();
    };
    if (touchQuery.addEventListener) touchQuery.addEventListener('change', applyTouch);
    applyTouch();
    window.addEventListener('beforeunload', saveGame);

    $('btn-dive').onclick = () => startDive(false);
    $('btn-new').onclick = () => startDive(true);
    $('btn-resume').onclick = resume;
    $('btn-journal').onclick = () => setJournal(true);
    $('journal').onclick = () => setJournal(false);
    const reset = $('btn-reset');
    reset.onclick = () => {
      if (!reset.classList.contains('warn')) {
        reset.classList.add('warn');
        reset.textContent = 'Apagar o progresso? Clique de novo';
        setTimeout(() => {
          reset.classList.remove('warn');
          reset.textContent = 'Recomeçar do zero';
        }, 4000);
        return;
      }
      reset.classList.remove('warn');
      reset.textContent = 'Recomeçar do zero';
      startDive(true);
    };
    document.querySelectorAll('#quality button').forEach(b => {
      b.onclick = () => {
        settings.quality = b.dataset.q;
        if (settings.quality === 'auto') {
          autoLevel = 1;
          ceiling = 2;
          slowT = fastT = 0;
        }
        applyQuality();
        saveSettings();
      };
    });
    $('vol').oninput = e => {
      settings.volume = +e.target.value;
      A.setVolume(settings.volume);
      saveSettings();
    };
    $('sens').oninput = e => {
      settings.sens = +e.target.value;
      saveSettings();
    };
    $('music').onchange = e => {
      settings.music = e.target.checked;
      A.setMusic(settings.music);
      saveSettings();
    };
    $('invert').onchange = e => {
      settings.invert = e.target.checked;
      saveSettings();
    };
    $('showfps').onchange = e => {
      settings.fps = e.target.checked;
      show('fps', settings.fps);
      saveSettings();
    };
  }

  function bindTouch(cv) {
    const looks = new Map();
    cv.addEventListener('pointerdown', e => {
      if (!touchOn || e.pointerType === 'mouse' || mode !== 'play' || journalOpen) return;
      looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* o dedo saiu da tela */ }
    });
    cv.addEventListener('pointermove', e => {
      const prev = looks.get(e.pointerId);
      if (!prev || mode !== 'play') return;
      const s = 0.005 * settings.sens;
      pl.yaw += (e.clientX - prev.x) * s;
      pl.pitch = M.clamp(pl.pitch - (e.clientY - prev.y) * s * (settings.invert ? -1 : 1), -1.5, 1.5);
      prev.x = e.clientX;
      prev.y = e.clientY;
    });
    const endLook = e => looks.delete(e.pointerId);
    cv.addEventListener('pointerup', endLook);
    cv.addEventListener('pointercancel', endLook);
    cv.addEventListener('contextmenu', e => e.preventDefault());

    const base = $('stick'), knob = base.querySelector('i');
    let stickId = null, origin = null;
    const reach = 42;
    const moveStick = e => {
      let dx = e.clientX - origin.x, dy = e.clientY - origin.y;
      const mag = Math.hypot(dx, dy) || 1, lim = Math.min(reach, mag);
      dx = (dx / mag) * lim;
      dy = (dy / mag) * lim;
      stick.x = dx / reach;
      stick.y = -dy / reach;
      knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
    };
    base.addEventListener('pointerdown', e => {
      e.preventDefault();
      stickId = e.pointerId;
      const b = base.getBoundingClientRect();
      origin = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      try { base.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      moveStick(e);
    }, { passive: false });
    base.addEventListener('pointermove', e => {
      if (e.pointerId === stickId) moveStick(e);
    });
    const endStick = e => {
      if (e.pointerId !== stickId) return;
      stickId = null;
      stick.x = stick.y = 0;
      knob.style.transform = '';
    };
    base.addEventListener('pointerup', endStick);
    base.addEventListener('pointercancel', endStick);

    const held = new Map();
    document.querySelectorAll('#touch-actions button').forEach(btn => {
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        if (btn.dataset.hold && mode === 'play') {
          keys[btn.dataset.hold] = true;
          held.set(e.pointerId, btn.dataset.hold);
          btn.classList.add('on');
        }
      }, { passive: false });
      const release = e => {
        const code = held.get(e.pointerId);
        if (code) {
          keys[code] = false;
          held.delete(e.pointerId);
        }
        if (btn.dataset.hold) btn.classList.remove('on');
        if (e.type !== 'pointerup' || !btn.dataset.tap || mode !== 'play') return;
        const tap = btn.dataset.tap;
        if (tap === 'sonar') ping();
        else if (tap === 'lamp') {
          flash = !flash;
          $('lamp').classList.toggle('show', flash);
          btn.classList.toggle('on', flash);
        } else if (tap === 'journal') setJournal(true);
        else if (tap === 'pause') pause();
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
    });
  }

  // ---------- mergulhador ----------
  function collide() {
    const list = W.collidersNear(pl.x, pl.z);
    if (!list) return;
    for (const c of list) {
      if (c.cyl) {
        const dx = pl.x - c.x, dz = pl.z - c.z, d = Math.hypot(dx, dz), rr = c.r + PR;
        if (d >= rr || pl.y <= c.y0 - PR || pl.y >= c.y1 + PR) continue;
        const side = rr - d, top = c.y1 + PR - pl.y;
        if (top < side) {
          pl.y = c.y1 + PR;
          if (pl.vy < 0) pl.vy = 0;
        } else if (d > 1e-4) {
          const nx = dx / d, nz = dz / d, vn = pl.vx * nx + pl.vz * nz;
          pl.x = c.x + nx * rr;
          pl.z = c.z + nz * rr;
          if (vn < 0) {
            pl.vx -= nx * vn;
            pl.vz -= nz * vn;
          }
        }
      } else {
        const k = c.r / c.ry, dx = pl.x - c.x, dy = (pl.y - c.y) * k, dz = pl.z - c.z, d = Math.hypot(dx, dy, dz), rr = c.r + PR;
        if (d >= rr || d < 1e-4) continue;
        const nx = dx / d, ny = dy / d, nz = dz / d, vn = pl.vx * nx + pl.vy * ny + pl.vz * nz;
        pl.x = c.x + nx * rr;
        pl.y = c.y + (ny * rr) / k;
        pl.z = c.z + nz * rr;
        if (vn < 0) {
          pl.vx -= nx * vn;
          pl.vy -= ny * vn;
          pl.vz -= nz * vn;
        }
      }
    }
  }
  function updatePlayer(dt) {
    const k = keys;
    pl.yaw += ((k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0)) * 1.7 * dt;
    pl.pitch = M.clamp(pl.pitch + ((k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0)) * 1.3 * dt, -1.5, 1.5);
    const cp = Math.cos(pl.pitch), fx = Math.sin(pl.yaw) * cp, fy = Math.sin(pl.pitch), fz = -Math.cos(pl.yaw) * cp;
    const rx = Math.cos(pl.yaw), rz = Math.sin(pl.yaw);
    const mz = M.clamp((k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0) + stick.y, -1, 1);
    const mx = M.clamp((k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0) + stick.x, -1, 1);
    const my = (k.Space ? 1 : 0) - (k.KeyC || k.KeyQ ? 1 : 0);
    let ax = fx * mz + rx * mx, ay = fy * mz + my, az = fz * mz + rz * mx;
    const al = Math.hypot(ax, ay, az);
    const boost = 1 + partCount() * 0.22;
    if (al > 0.001) {
      const acc = ((k.ShiftLeft || k.ShiftRight ? 13 : 7.5) * boost) / al;
      pl.vx += ax * acc * dt;
      pl.vy += ay * acc * dt;
      pl.vz += az * acc * dt;
    }
    const flow = W.current(pl.x, pl.z);
    if (flow) {
      pl.vx += flow[0] * dt;
      pl.vz += flow[1] * dt;
    }
    if (Cr.wake) {
      pl.vx += Cr.wake[0] * dt;
      pl.vz += Cr.wake[1] * dt;
      Cr.wake = null;
    }
    if (Cr.nudge) {
      pl.vx += Cr.nudge[0];
      pl.vy += Cr.nudge[1];
      pl.vz += Cr.nudge[2];
      Cr.nudge = null;
    }
    const drag = Math.exp(-1.7 * dt);
    pl.vx *= drag; pl.vy *= drag; pl.vz *= drag;

    // movimento horizontal: não deixa sair do mar nem subir nas bordas do mapa
    const ok = (x, z) => Math.hypot(x, z) < 348 && W.heightAt(x, z) < -1.5;
    let nx = pl.x + pl.vx * dt, nz = pl.z + pl.vz * dt;
    if (!ok(nx, nz)) {
      if (ok(nx, pl.z)) {
        nz = pl.z;
        pl.vz = 0;
      } else if (ok(pl.x, nz)) {
        nx = pl.x;
        pl.vx = 0;
      } else {
        nx = pl.x;
        nz = pl.z;
        pl.vx = pl.vz = 0;
      }
    }
    pl.x = nx;
    pl.z = nz;
    pl.y += pl.vy * dt;
    collide();
    const floor = W.heightAt(pl.x, pl.z) + 1.1;
    if (pl.y < floor) {
      pl.y = floor;
      if (pl.vy < 0) pl.vy = 0;
    }
    // boia na superfície, acompanhando a onda. C mergulha de volta.
    const wy = seaY(pl.x, pl.z, time);
    // perto da superfície, a água te empurra para fora. Segurar C continua o mergulho.
    if (pl.y > wy - 0.7 && !(k.KeyC || k.KeyQ)) {
      pl.y += (wy + 0.9 - pl.y) * Math.min(1, dt * 2.4);
      pl.vy *= Math.exp(-2.2 * dt);
    }
    if (pl.y > wy + 1.45) {
      pl.y = wy + 1.45;
      if (pl.vy > 0) pl.vy = 0;
    }
    if (pl.y > wy + 0.15) {
      const air = Math.exp(-0.7 * dt);
      pl.vx *= air;
      pl.vz *= air;
    }
  }
  // A mesma ondulação do shader da superfície (js/render.js, waves).
  function seaY(x, z, t) {
    return Math.sin(x * 0.045 + z * 0.028 + t * 0.55) * 0.22 + Math.sin(x * -0.02 + z * 0.05 + t * 0.72) * 0.16 + Math.sin(x * 0.09 + z * -0.04 + t * 1.15) * 0.07;
  }
  function menuCam(t) {
    const a = t * 0.035 + 0.6, cx = 0, cz = 40, x = cx + Math.cos(a) * 21, z = cz + Math.sin(a) * 21;
    pl.x = x;
    pl.z = z;
    pl.y = Math.max(W.heightAt(x, z) + 3.4, -8);
    pl.yaw = Math.atan2(cx - x, z - cz) + 0.45;
    pl.pitch = -0.1;
  }

  // ---------- bolhas ----------
  function spawnBubble(x, y, z, s, life, vy, col) {
    if (bubbles.length < 560) bubbles.push({ x: x, y: y, z: z, s: s, life: life, max: life, vy: vy, ph: Math.random() * TAU, c: col || null });
  }
  function updateBubbles(dt) {
    if (mode === 'play' && pl.y < 0.05) {
      breathT += dt;
      if (breathT > 6.4) {
        breathT = 0;
        A.inhale();
      } else if (breathT > 2.5 && breathT - dt <= 2.5) {
        A.exhale();
        exhaleLeft = 1.4;
      }
      if (exhaleLeft > 0) {
        exhaleLeft -= dt;
        exhaleAcc += dt * 11;
        while (exhaleAcc > 1) {
          exhaleAcc--;
          const r = Math.random;
          spawnBubble(pl.x + camFwd[0] * 0.7 + (r() - 0.5) * 0.5, pl.y - 0.45 + (r() - 0.5) * 0.15, pl.z + camFwd[2] * 0.7 + (r() - 0.5) * 0.5, 0.02 + r() * 0.04, 3.5, 1.0 + r() * 0.9);
        }
      }
    }
    ventAcc += dt * 9;
    const nv = Math.floor(ventAcc);
    ventAcc -= nv;
    if (nv > 0) {
      for (const v of W.vents) {
        if (Math.abs(v.x - pl.x) > 75 || Math.abs(v.z - pl.z) > 75) continue;
        for (let i = 0; i < nv; i++) {
          const r = Math.random;
          spawnBubble(v.x + (r() - 0.5) * 0.7, v.y, v.z + (r() - 0.5) * 0.7, 0.05 + r() * 0.1, 9, 2.3 + r() * 1.2);
        }
      }
    }
    let n = 0;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.life -= dt;
      b.y += b.vy * dt;
      b.x += Math.sin(time * 3.1 + b.ph) * 0.3 * dt;
      b.z += Math.cos(time * 2.7 + b.ph) * 0.3 * dt;
      if (b.life <= 0 || b.y > -0.2) {
        bubbles[i] = bubbles[bubbles.length - 1];
        bubbles.pop();
        continue;
      }
      const o = n++ * 8, age = 1 - b.life / b.max;
      bubData[o] = b.x; bubData[o + 1] = b.y; bubData[o + 2] = b.z; bubData[o + 3] = b.s * (1 + age * 0.7);
      const bc = b.c || [0.75, 0.95, 1];
      bubData[o + 4] = bc[0]; bubData[o + 5] = bc[1]; bubData[o + 6] = bc[2];
      bubData[o + 7] = Math.min(1, b.life * 2) * Math.min(1, age * 12) * 0.6;
    }
    frame.bubbles.count = n;
  }

  // ---------- pérolas, sonar e descobertas ----------
  function collect(i) {
    save.pearls[i] = true;
    const q = W.pearls[i], n = pearlCount();
    bursts.push({ x: q.x, y: q.y, z: q.z, t: 0 });
    A.chime();
    if (sonar.i === i) sonar.on = false;
    if (n === NP) {
      save.done = true;
      A.finale();
      discover('coracao');
      toast('Doze pérolas', 'O mar inteiro se acende ao seu redor. Obrigado por mergulhar.');
    } else {
      toast('Pérola ' + n + ' de ' + NP, n === 1 ? 'Há outras espalhadas pelo oceano. O sonar (E) ajuda a achar.' : NP - n === 1 ? 'Falta só uma.' : 'Faltam ' + (NP - n) + '.');
    }
    renderJournal();
    saveGame();
  }
  function collectPart(i) {
    save.parts[i] = true;
    const q = W.parts[i], n = partCount();
    bursts.push({ x: q.x, y: q.y, z: q.z, t: 0 });
    A.chime();
    if (sonar.kind === 'part' && sonar.i === i) sonar.on = false;
    if (n === 1) discover('propulsor');
    const left = NPART - n;
    toast(
      q.name,
      n === NPART
        ? 'As três peças encaixaram. Você corta a água bem mais rápido.'
        : 'Peça ' + n + ' de 3. O nado ficou mais leve.' + (left === 1 ? ' Falta uma.' : ' Faltam ' + left + '.')
    );
    renderJournal();
    saveGame();
  }
  function ping() {
    if (sonar.cool > 0) return;
    sonar.cool = 1.6;
    A.ping();
    let best = -1, bd = 1e9, kind = 'pearl';
    for (let i = 0; i < NP; i++) {
      if (save.pearls[i]) continue;
      const q = W.pearls[i], d = Math.hypot(q.x - pl.x, q.y - pl.y, q.z - pl.z);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    if (best < 0) {
      kind = 'part';
      for (let i = 0; i < NPART; i++) {
        if (save.parts[i]) continue;
        const q = W.parts[i], d = Math.hypot(q.x - pl.x, q.y - pl.y, q.z - pl.z);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
    }
    if (best < 0) {
      hint('O sonar volta em silêncio. Não há mais nada para achar.');
      return;
    }
    sonar.kind = kind;
    const q = kind === 'part' ? W.parts[best] : W.pearls[best], pan = M.clamp(((q.x - pl.x) * Math.cos(pl.yaw) + (q.z - pl.z) * Math.sin(pl.yaw)) / (bd || 1), -1, 1);
    A.pingEcho(Math.min(2.2, 0.25 + bd / 160), pan);
    sonar.on = true;
    sonar.t = 9;
    sonar.i = best;
  }
  function updateSonar(dt) {
    const el = $('sonar');
    sonar.cool -= dt;
    sonar.t -= dt;
    if (!sonar.on || sonar.t <= 0 || mode !== 'play') {
      sonar.on = false;
      el.classList.remove('show');
      return;
    }
    const q = (sonar.kind === 'part' ? W.parts : W.pearls)[sonar.i], pr = Rn.project(q.x, q.y, q.z), w = window.innerWidth, h = window.innerHeight;
    let sx = pr[0], sy = pr[1];
    const m = Math.max(Math.abs(sx) / 0.9, Math.abs(sy) / 0.84), off = pr[2] <= 0 || m > 1;
    if (off) {
      const s = 1 / Math.max(m, 1e-4);
      sx *= s;
      sy *= s;
    }
    el.classList.add('show');
    el.classList.toggle('off', off);
    el.style.transform = 'translate(' + ((sx * 0.5 + 0.5) * w - 10).toFixed(1) + 'px,' + ((-sy * 0.5 + 0.5) * h - 10).toFixed(1) + 'px)';
    el.firstElementChild.style.transform = off ? 'rotate(' + Math.atan2(-sy, sx).toFixed(3) + 'rad)' : '';
    el.lastElementChild.textContent = Math.round(Math.hypot(q.x - pl.x, q.y - pl.y, q.z - pl.z)) + ' m';
  }
  function checks() {
    for (let i = 0; i < NP; i++) {
      if (save.pearls[i]) continue;
      const q = W.pearls[i];
      if (Math.abs(q.x - pl.x) < 2.3 && Math.hypot(q.x - pl.x, q.y - pl.y, q.z - pl.z) < 2.3) collect(i);
    }
    for (let i = 0; i < NPART; i++) {
      if (save.parts[i]) continue;
      const q = W.parts[i];
      if (Math.abs(q.x - pl.x) < 2.4 && Math.hypot(q.x - pl.x, q.y - pl.y, q.z - pl.z) < 2.4) collectPart(i);
    }
    const z = W.zoneAt(pl.x, pl.y, pl.z);
    if (z && z !== curZone) {
      const el = $('zone');
      el.textContent = z.name;
      el.classList.add('show');
      zoneTimer = 4.5;
      discover(z.id);
    }
    if (z) curZone = z;
    else if (curZone && Math.hypot(pl.x - curZone.x, pl.z - curZone.z) > curZone.r * 1.1) curZone = null;
    if (Cr.nearManta < 15) discover('arraia');
    if (Cr.nearTurtle < 7) discover('tartaruga');
    if (Cr.whale.dist < 48) discover('baleia');
    if (Cr.nearJelly < 12) discover('aguaviva');
    if (Cr.nearShark < 14) discover('tubarao');
    if (Cr.nearOctopus < 8) discover('polvo');
    if (Cr.nearSeahorse < 6) discover('cavalo');
    if (Cr.nearSunfish < 16) discover('peixelua');
    if (Cr.nearAngler < 16) discover('tamboril');
    if (Cr.nearSquid < 16) discover('lula');
    if (Cr.nearLeviathan < 46 && pl.y < -40) discover('leviata');
    if (!currentNoted && W.current(pl.x, pl.z)) {
      currentNoted = true;
      toast('Corrente', 'A água aqui gira devagar. Deixe-se levar, ou nade contra ela.');
    }
    if (!darkHint && pl.y < -46 && !flash) {
      darkHint = true;
      hint('Está escuro aqui embaixo. F acende a lanterna.');
    }
  }
  function updateHud(dt) {
    const onTop = pl.y > -0.15;
    $('depth').textContent = onTop ? '0' : Math.round(-pl.y);
    $('depth-unit').textContent = onTop ? '' : 'm';
    $('depth-label').textContent = onTop ? 'superfície' : 'profundidade';
    $('part-n').textContent = partCount();
    const spans = $('compass').children;
    for (let i = 0; i < spans.length; i++) {
      const d = wrap(+spans[i].dataset.a - pl.yaw), s = spans[i].style;
      s.transform = 'translateX(' + (d * 150).toFixed(1) + 'px)';
      s.opacity = Math.max(0, 1 - Math.abs(d) / 1.15).toFixed(2);
    }
    if (zoneTimer > 0) {
      zoneTimer -= dt;
      if (zoneTimer <= 0) $('zone').classList.remove('show');
    }
    const te = $('toast');
    toastT -= dt;
    if (toastT <= 0 && te.classList.contains('show')) {
      te.classList.remove('show');
      toastT = 0.8;
    } else if (toastT <= 0 && toasts.length) {
      const t = toasts.shift();
      te.innerHTML = '';
      const b = document.createElement('b');
      b.textContent = t[0];
      te.append(b, t[1]);
      te.classList.add('show');
      toastT = 5.5;
    }
    const he = $('hint');
    hintT -= dt;
    if (hintT <= 0 && he.classList.contains('show')) {
      he.classList.remove('show');
      hintT = 1;
    } else if (hintT <= 0 && hints.length && hints[0].at <= time) {
      he.textContent = hints.shift().text;
      he.classList.add('show');
      hintT = 6.5;
    }
  }

  // ---------- brilhos e pérolas (dados para o renderizador) ----------
  function fillSprites(dt) {
    let n = 0;
    for (let i = 0; i < NP; i++) {
      const q = W.pearls[i], o = i * 12, got = save.pearls[i], pulse = 0.5 + 0.5 * Math.sin(time * 2.2 + i * 1.7);
      pearlData[o] = q.x; pearlData[o + 1] = q.y + (got ? 0 : Math.sin(time * 1.3 + i) * 0.04); pearlData[o + 2] = q.z;
      pearlData[o + 3] = got ? 0 : 0.44;
      pearlData[o + 4] = 0; pearlData[o + 5] = 1; pearlData[o + 6] = 0; pearlData[o + 7] = 0;
      pearlData[o + 8] = 1; pearlData[o + 9] = 0.97; pearlData[o + 10] = 0.9; pearlData[o + 11] = 0.55 + pulse * 0.5;
      if (got || Math.abs(q.x - pl.x) > 150 || Math.abs(q.z - pl.z) > 150) continue;
      const g = n++ * 8, tgt = sonar.on && sonar.kind !== 'part' && sonar.i === i ? 1.6 : 1;
      glowData[g] = q.x; glowData[g + 1] = q.y + 0.1; glowData[g + 2] = q.z; glowData[g + 3] = (2.6 + pulse * 0.8) * tgt;
      glowData[g + 4] = 1; glowData[g + 5] = 0.9; glowData[g + 6] = 0.68; glowData[g + 7] = 0.5 * tgt;
    }
    for (let i = 0; i < NPART; i++) {
      const q = W.parts[i], o = i * 12, got = save.parts[i], pulse = 0.5 + 0.5 * Math.sin(time * 2.4 + i);
      const tint = PART_TINT[i];
      partData[o] = q.x; partData[o + 1] = q.y + (got ? 0 : Math.sin(time * 1.1 + i) * 0.08); partData[o + 2] = q.z;
      partData[o + 3] = got ? 0 : 0.85;
      partData[o + 4] = time * 0.6; partData[o + 5] = 0; partData[o + 6] = i; partData[o + 7] = 0.8;
      partData[o + 8] = tint[0]; partData[o + 9] = tint[1]; partData[o + 10] = tint[2]; partData[o + 11] = got ? 0 : 0.7 + pulse * 0.4;
      if (got || n >= 60 || Math.abs(q.x - pl.x) > 150 || Math.abs(q.z - pl.z) > 150) continue;
      const g = n++ * 8, tgt = sonar.on && sonar.kind === 'part' && sonar.i === i ? 1.5 : 1;
      glowData[g] = q.x; glowData[g + 1] = q.y + 0.2; glowData[g + 2] = q.z; glowData[g + 3] = (2.2 + pulse) * tgt;
      glowData[g + 4] = tint[0]; glowData[g + 5] = tint[1]; glowData[g + 6] = tint[2]; glowData[g + 7] = 0.55;
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.t += dt;
      if (b.t > 1.4) {
        bursts.splice(i, 1);
        continue;
      }
      if (n >= 60) continue;
      const g = n++ * 8, k = b.t / 1.4;
      glowData[g] = b.x; glowData[g + 1] = b.y + k * 1.2; glowData[g + 2] = b.z; glowData[g + 3] = 2 + k * 9;
      glowData[g + 4] = 1; glowData[g + 5] = 0.95; glowData[g + 6] = 0.8; glowData[g + 7] = (1 - k) * (1 - k) * 0.9;
    }
    frame.glows.count = n;
  }

  // ---------- desempenho ----------
  function autoQuality(rawDt, dt) {
    if (rawDt > 0 && rawDt < 0.25) fpsEma += (1 / rawDt - fpsEma) * 0.05;
    if (settings.quality === 'auto' && mode === 'play' && time > 3) {
      slowT = fpsEma < 42 ? slowT + dt : Math.max(0, slowT - dt);
      fastT = fpsEma > 57 ? fastT + dt : 0;
      if (slowT > 2.5 && autoLevel > 0) {
        autoLevel--;
        ceiling = autoLevel;
        slowT = fastT = 0;
        applyQuality();
      } else if (fastT > 8 && autoLevel < ceiling) {
        autoLevel++;
        slowT = fastT = 0;
        applyQuality();
      }
    }
    if (settings.fps) {
      fpsShowT -= dt;
      if (fpsShowT <= 0) {
        fpsShowT = 0.5;
        const names = { low: 'leve', medium: 'média', high: 'alta' };
        $('fps').textContent = Math.round(fpsEma) + ' fps\n' + names[Rn.quality()] + (settings.quality === 'auto' ? ' (auto)' : '') + ' · ' + Rn.stats.res + '\n' + Math.round(Rn.stats.tris / 1000) + ' mil triângulos · ' + Rn.stats.draws + ' chamadas';
      }
    }
  }

  // ---------- laço principal ----------
  function tick(now) {
    requestAnimationFrame(tick);
    const rawDt = (now - last) / 1000, dt = Math.min(Math.max(rawDt, 0), 0.05);
    last = now;
    time += dt;
    if (mode === 'play') updatePlayer(dt);
    else if (mode === 'menu') menuCam(time);

    const cp = Math.cos(pl.pitch);
    camFwd[0] = Math.sin(pl.yaw) * cp; camFwd[1] = Math.sin(pl.pitch); camFwd[2] = -Math.cos(pl.yaw) * cp;
    camPos[0] = pl.x; camPos[1] = pl.y + Math.sin(time * 0.9) * (pl.y > 0.2 ? 0.025 : 0.05); camPos[2] = pl.z;
    const air = pl.y > seaY(pl.x, pl.z, time) + 0.25;
    if (mode === 'play' && air !== wasAir) {
      A.splash();
      splashK = 1;
      for (let i = 0; i < 16; i++) {
        const r = Math.random, ang = r() * TAU;
        spawnBubble(pl.x + Math.cos(ang) * r() * 1.4, -0.3, pl.z + Math.sin(ang) * r() * 1.4, 0.04 + r() * 0.06, 2.2, 0.6 + r() * 0.8);
      }
      if (air) discover('superficie');
      wasAir = air;
    }
    aboveSm += ((air ? 1 : 0) - aboveSm) * Math.min(1, dt * 1.5);
    splashK *= Math.exp(-dt * 3.2);

    const swim = Math.hypot(pl.vx, pl.vy, pl.vz);
    Cr.update(time, dt, camPos, { speed: swim, flash: flashK, yaw: pl.yaw });
    while (Cr.pending.length) {
      const n = Cr.pending.shift();
      toast(n[0], n[1]);
    }
    if (Cr.ink) {
      const ink = Cr.ink;
      for (let i = 0; i < 22; i++) {
        const r = Math.random;
        spawnBubble(ink.x + (r() - 0.5) * 1.6, ink.y + (r() - 0.5) * 1.2, ink.z + (r() - 0.5) * 1.6, 0.12 + r() * 0.22, 3.5, 0.3 + r() * 0.5, [0.12, 0.08, 0.16]);
      }
      Cr.ink = null;
    }
    updateBubbles(dt);
    if (mode === 'play') {
      checkT -= dt;
      if (checkT <= 0) {
        checkT = 0.15;
        checks();
      }
      saveT += dt;
      if (saveT > 15) {
        saveT = 0;
        saveGame();
      }
      updateHud(dt);
    }
    updateSonar(dt);
    fillSprites(dt);

    flashK += ((flash && mode !== 'menu' ? 1 : 0) - flashK) * Math.min(1, dt * 8);
    bloom += ((save.done ? 1 : 0) - bloom) * Math.min(1, dt * 0.35);
    fade += (fadeTarget - fade) * Math.min(1, dt * 1.1);
    frame.time = time;
    frame.flash = flashK;
    frame.bloom = bloom;
    frame.fade = Math.min(1, fade * 1.05);
    frame.above = aboveSm;
    frame.splash = splashK;
    Rn.draw(frame);

    if (A.ready) {
      const wh = Cr.whale, d = wh.dist || 1;
      A.update({
        depth: Math.max(0, -pl.y),
        above: aboveSm,
        speed: mode === 'play' ? Math.hypot(pl.vx, pl.vy, pl.vz) : 0,
        whaleDist: wh.dist,
        whalePan: M.clamp(((wh.x - pl.x) * Math.cos(pl.yaw) + (wh.z - pl.z) * Math.sin(pl.yaw)) / d, -1, 1),
      });
    }
    autoQuality(rawDt, dt);
  }

  // ---------- início ----------
  function fail(msg) {
    show('loading', false);
    show('menu', false);
    $('error-msg').textContent = msg;
    show('error', true);
  }
  function boot() {
    try {
      if (!Rn.init($('gl'))) {
        fail('Seu navegador não liberou o WebGL2, que o jogo usa para desenhar o oceano. Tente abrir no Chrome, Edge ou Firefox atualizados.');
        return;
      }
      const built = M.buildMeshes();
      W.generate(built.info);
      Rn.buildWorld(built, W);
      Cr.init();
      loadAll();
      if (touchOn && settings.quality === 'auto') autoLevel = 0;
      const B = Cr.buf;
      frame.dyn = [B.fishA, B.fishB, B.shark, B.seahorse, B.octopus, B.crab, B.moray, B.sunfish, B.angler, B.squid, B.manta, B.turtle, B.whale, B.leviathan, B.dolphin, B.gull, pearlDyn, partDyn, B.jelly];
      buildCompass();
      bindInput();
      syncSettingsUI();
      renderJournal();
      if (hasProgress()) {
        $('btn-dive').textContent = 'Continuar mergulho';
        show('btn-new', true);
      }
      bloom = save.done ? 1 : 0;
      mode = 'menu';
      fade = 0;
      show('loading', false);
      show('menu', true);
      last = performance.now();
      requestAnimationFrame(tick);
    } catch (e) {
      console.error(e);
      fail('Algo deu errado ao preparar o oceano: ' + (e && e.message ? e.message : e));
    }
  }
  M.game = {
    player: pl,
    get save() { return save; },
    get mode() { return mode; },
    get fps() { return fpsEma; },
    start: fresh => startDive(fresh),
    goto(x, y, z, yaw, pitch) {
      pl.x = x; pl.y = y; pl.z = z;
      if (yaw !== undefined) pl.yaw = yaw;
      if (pitch !== undefined) pl.pitch = pitch;
      pl.vx = pl.vy = pl.vz = 0;
    },
  };
  // deixa a tela de "preparando" aparecer antes de gerar o mundo
  setTimeout(boot, 30);
})();
