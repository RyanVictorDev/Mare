// Maré — vida marinha: cardumes, arraias, tartarugas, golfinhos, a baleia, águas-vivas,
// gaivotas, e os bichos que reagem ao mergulhador.
// Tudo é simulado com contas baratas na CPU e desenhado em poucas chamadas.
(function () {
  'use strict';
  const M = window.MARE, W = M.world;
  const Cr = (M.creatures = {});
  const TAU = Math.PI * 2;

  const SCHOOLS = [
    // recife
    { x: 0, z: 45, alt: 4, R: 22, n: 40, k: 1, size: 0.4, tint: [1, 0.85, 0.2] },
    { x: -25, z: 30, alt: 3, R: 18, n: 45, k: 0, size: 0.3, tint: [0.25, 0.6, 1] },
    { x: 25, z: 60, alt: 3.5, R: 20, n: 36, k: 0, size: 0.34, tint: [1, 0.5, 0.2] },
    { x: -10, z: 75, alt: 5, R: 24, n: 28, k: 1, size: 0.48, tint: [0.95, 0.95, 1] },
    { x: 35, z: 20, alt: 2.5, R: 15, n: 30, k: 0, size: 0.27, tint: [1, 0.35, 0.55] },
    { x: 5, z: 12, alt: 6, R: 30, n: 70, k: 0, size: 0.32, tint: [0.75, 0.85, 0.95], spread: 4 },
    // logo abaixo da superfície, visíveis de cima
    { x: 12, z: 48, alt: 2, R: 20, n: 34, k: 0, size: 0.24, tint: [0.95, 0.96, 1], spread: 1.5, surface: true },
    { x: -88, z: 118, alt: 2, R: 24, n: 28, k: 0, size: 0.3, tint: [0.7, 0.95, 0.65], spread: 1.8, surface: true },
    { x: 70, z: 10, alt: 2, R: 30, n: 40, k: 1, size: 0.34, tint: [1, 0.72, 0.32], spread: 2, surface: true },
    // pradaria
    { x: -95, z: 125, alt: 3, R: 25, n: 40, k: 0, size: 0.32, tint: [0.6, 0.9, 0.5] },
    { x: -70, z: 105, alt: 4, R: 20, n: 25, k: 1, size: 0.52, tint: [0.95, 0.75, 0.4] },
    // floresta de algas
    { x: 150, z: -45, alt: 8, R: 35, n: 50, k: 0, size: 0.38, tint: [1, 0.6, 0.15] },
    { x: 125, z: -20, alt: 5, R: 20, n: 35, k: 0, size: 0.42, tint: [0.7, 0.78, 0.6] },
    { x: 175, z: -70, alt: 10, R: 25, n: 40, k: 1, size: 0.42, tint: [0.5, 0.7, 0.95] },
    // naufrágio
    { x: -55, z: -165, alt: 8, R: 18, n: 60, k: 0, size: 0.32, tint: [0.8, 0.86, 0.95], spread: 3.5 },
    { x: -45, z: -150, alt: 5, R: 12, n: 25, k: 1, size: 0.52, tint: [0.92, 0.8, 0.5] },
    // ruínas
    { x: -175, z: 15, alt: 7, R: 16, n: 45, k: 0, size: 0.3, tint: [0.5, 0.95, 0.85] },
    { x: -160, z: 40, alt: 4, R: 14, n: 25, k: 1, size: 0.44, tint: [0.85, 0.5, 0.95] },
    // fossa (peixes luminosos)
    { x: 40, z: 190, alt: 14, R: 30, n: 45, k: 0, size: 0.24, tint: [0.3, 1, 0.9], glow: 1.6 },
    { x: 85, z: 200, alt: 24, R: 28, n: 40, k: 0, size: 0.22, tint: [0.7, 0.5, 1], glow: 1.6 },
    // mar aberto
    { x: 60, z: -110, alt: 9, R: 45, n: 80, k: 0, size: 0.34, tint: [0.7, 0.8, 0.95], spread: 4.5 },
    { x: -110, z: -60, alt: 8, R: 40, n: 60, k: 0, size: 0.36, tint: [0.65, 0.8, 0.9], spread: 4 },
    // jardim de anêmonas e o caminho até lá
    { x: 248, z: 138, alt: 4, R: 22, n: 36, k: 0, size: 0.32, tint: [1, 0.45, 0.55] },
    { x: 230, z: 118, alt: 2, R: 18, n: 24, k: 1, size: 0.28, tint: [1, 0.8, 0.55], surface: true },
    { x: 160, z: 70, alt: 6, R: 26, n: 32, k: 0, size: 0.36, tint: [0.4, 0.75, 1] },
    // fossa mais funda e o poço
    { x: 70, z: 205, alt: 22, R: 22, n: 30, k: 0, size: 0.22, tint: [0.4, 1, 0.7], glow: 1.8 },
    { x: -248, z: -148, alt: 16, R: 24, n: 34, k: 0, size: 0.24, tint: [0.55, 0.4, 1], glow: 1.7 },
  ];
  const MANTAS = [
    { x: 0, z: 45, R: 46, y: -5.5, size: 5.2 },
    { x: -62, z: 92, R: 50, y: -7.5, size: 4.4 },
    { x: -150, z: 30, R: 42, y: -14, size: 5.6 },
    { x: 110, z: -20, R: 56, y: -8, size: 4.8 },
    { x: 248, z: 130, R: 36, y: -6.5, size: 4.2 },
  ];
  const TURTLES = [
    { x: 14, z: 56, R: 18, y: -7, size: 1.5 },
    { x: 140, z: -30, R: 26, y: -12, size: 1.7 },
    { x: -90, z: 120, R: 22, y: -10, size: 1.4 },
    { x: 236, z: 150, R: 20, y: -9, size: 1.45 },
    { x: 70, z: -40, R: 24, y: -8, size: 1.6 },
  ];
  const NJELLY = 108;
  const DOLPHINS = [
    { x: 28, z: -12, R: 30, y: -3.2, size: 2.7, w: 0.22 },
    { x: -28, z: 92, R: 26, y: -3.5, size: 2.35, w: 0.2 },
    { x: 98, z: 48, R: 32, y: -4.0, size: 2.9, w: 0.18 },
    { x: 210, z: 90, R: 28, y: -3.6, size: 2.5, w: 0.2 },
  ];
  const SHARKS = [
    { x: 8, z: 48, R: 38, y: -8, size: 2.5, w: 0.28 },
    { x: 130, z: -18, R: 32, y: -11, size: 2.7, w: 0.24 },
    { x: 40, z: -80, R: 46, y: -9, size: 2.9, w: 0.2 },
    { x: 250, z: 145, R: 26, y: -8, size: 2.3, w: 0.26 },
  ];
  const SEAHORSES = [
    { x: 142, z: -38, y: 7 }, { x: 158, z: -52, y: 9 }, { x: 168, z: -30, y: 6 },
    { x: 134, z: -60, y: 11 }, { x: 176, z: -64, y: 8 }, { x: 150, z: -18, y: 5 },
    { x: 186, z: -48, y: 10 }, { x: 124, z: -44, y: 8 },
  ];
  const OCTOPUS = [
    { x: -64, z: -152 },
    { x: 262, z: 128 },
  ];
  const CRABS = [
    { x: -48, z: -158 }, { x: -60, z: -172 }, { x: -38, z: -166 },
    { x: -70, z: -156 }, { x: -52, z: -178 }, { x: -30, z: -154 },
  ];
  const MORAYS = [
    { x: -168, z: 22 }, { x: -186, z: 8 }, { x: -160, z: 36 }, { x: -178, z: 48 },
  ];
  const SUNFISH = { x: 168, z: 24, y: -3.4 };
  const ANGLERS = [
    { x: 52, z: 188 }, { x: 74, z: 206 }, { x: 40, z: 210 }, { x: 88, z: 186 },
  ];
  const SQUIDS = [
    { x: 48, z: 198 }, { x: 78, z: 214 }, { x: 30, z: 176 }, { x: 96, z: 196 },
    { x: -236, z: -140 }, { x: -260, z: -162 },
  ];
  const FLOCKS = [
    { x: 8, z: 36, R: 52, n: 7, h: 13, w: 0.1 },
    { x: 145, z: -42, R: 44, n: 5, h: 11, w: -0.12 },
    { x: -95, z: 115, R: 48, n: 5, h: 16, w: 0.085 },
    { x: 248, z: 138, R: 40, n: 5, h: 14, w: 0.09 },
  ];

  let fish = null, schoolState = null, jellies = null, gulls = null;
  const tmp = [0, 0, 0];

  Cr.detail = 1;
  Cr.whale = { x: 0, y: -18, z: 0, dist: 999 };
  Cr.nearManta = 999;
  Cr.nearTurtle = 999;
  Cr.nearJelly = 999;
  Cr.nearShark = 999;
  Cr.nearOctopus = 999;
  Cr.nearSeahorse = 999;
  Cr.nearSunfish = 999;
  Cr.nearAngler = 999;
  Cr.nearSquid = 999;
  Cr.nearLeviathan = 999;
  Cr.pending = [];
  Cr.nudge = null;
  Cr.wake = null;
  Cr.ink = null;
  const told = {};
  function note(id, title, text) {
    if (told[id]) return;
    told[id] = true;
    Cr.pending.push([title, text]);
  }

  Cr.init = function () {
    const R = M.rng(909);
    let total = 0;
    schoolState = SCHOOLS.map(s => {
      const st = { s: s, start: total, p0: R() * TAU, p1: R() * TAU, p2: R() * TAU, w: (1.6 + R() * 0.9) / s.R, spread: s.spread || 2.2 };
      total += s.n;
      return st;
    });
    // por peixe: atraso, deslocamento fixo (3), frequências (3), fase, anterior (3), giro, inclinação, susto (3), variação de cor
    fish = new Float32Array(total * 17);
    for (let i = 0; i < total; i++) {
      const o = i * 17;
      fish[o] = R() * 2.6;
      fish[o + 1] = R() - 0.5; fish[o + 2] = (R() - 0.5) * 0.6; fish[o + 3] = R() - 0.5;
      fish[o + 4] = 0.4 + R() * 0.7; fish[o + 5] = 0.3 + R() * 0.6; fish[o + 6] = 0.4 + R() * 0.7;
      fish[o + 7] = R() * TAU;
      fish[o + 8] = 1e9;
      fish[o + 16] = 0.8 + R() * 0.4;
    }
    const cap = { fishA: 0, fishB: 0 };
    SCHOOLS.forEach(s => (cap[s.k ? 'fishB' : 'fishA'] += s.n));
    jellies = [];
    const JP = [[0.3, 0.9, 1], [0.7, 0.45, 1], [1, 0.5, 0.8], [0.4, 1, 0.7]];
    for (let i = 0; i < NJELLY; i++) {
      let x, z, y;
      if (i < 70) {
        const a = R() * TAU, d = Math.sqrt(R());
        x = 60 + Math.cos(a) * d * 85;
        z = 195 + Math.sin(a) * d * 38;
        y = Math.min(-30, W.heightAt(x, z) + 4 + R() * 34);
      } else if (i < 92) {
        const a = R() * TAU, d = Math.sqrt(R()) * 60;
        x = 150 + Math.cos(a) * d;
        z = -45 + Math.sin(a) * d;
        y = -6 - R() * 9;
      } else {
        const a = R() * TAU, d = Math.sqrt(R());
        x = -248 + Math.cos(a) * d * 48;
        z = -148 + Math.sin(a) * d * 32;
        y = Math.min(-32, W.heightAt(x, z) + 3 + R() * 22);
      }
      const c = JP[(R() * JP.length) | 0];
      jellies.push({ x: x, y: y, z: z, ph: R() * TAU, size: 0.6 + R() * 1.1, c: c, glow: i < 70 || i >= 92 ? 1.2 : 0.25, sp: 0.6 + R() * 0.6 });
    }
    Cr.buf = {
      fishA: { mesh: 'fishA', prog: 'fish', data: new Float32Array(cap.fishA * 12), count: 0 },
      fishB: { mesh: 'fishB', prog: 'fish', data: new Float32Array(cap.fishB * 12), count: 0 },
      manta: { mesh: 'manta', prog: 'manta', data: new Float32Array(MANTAS.length * 12), count: 0 },
      turtle: { mesh: 'turtle', prog: 'turtle', data: new Float32Array(TURTLES.length * 12), count: 0 },
      whale: { mesh: 'whale', prog: 'whale', data: new Float32Array(12), count: 0 },
      jelly: { mesh: 'jelly', prog: 'jelly', data: new Float32Array(NJELLY * 12), count: 0, additive: true },
      dolphin: { mesh: 'dolphin', prog: 'whale', data: new Float32Array(DOLPHINS.length * 12), count: 0 },
      gull: { mesh: 'gull', prog: 'gull', data: new Float32Array(FLOCKS.reduce((n, f) => n + f.n, 0) * 12), count: 0 },
      shark: { mesh: 'shark', prog: 'fish', data: new Float32Array(SHARKS.length * 12), count: 0 },
      seahorse: { mesh: 'seahorse', prog: 'fish', data: new Float32Array(SEAHORSES.length * 12), count: 0 },
      octopus: { mesh: 'octopus', prog: 'fish', data: new Float32Array(OCTOPUS.length * 12), count: 0 },
      crab: { mesh: 'crab', prog: 'turtle', data: new Float32Array(CRABS.length * 12), count: 0 },
      moray: { mesh: 'moray', prog: 'fish', data: new Float32Array(MORAYS.length * 12), count: 0 },
      sunfish: { mesh: 'sunfish', prog: 'fish', data: new Float32Array(12), count: 0 },
      angler: { mesh: 'angler', prog: 'fish', data: new Float32Array(ANGLERS.length * 12), count: 0 },
      squid: { mesh: 'squid', prog: 'fish', data: new Float32Array(SQUIDS.length * 12), count: 0 },
      leviathan: { mesh: 'whale', prog: 'whale', data: new Float32Array(12), count: 0 },
    };
    gulls = [];
    FLOCKS.forEach(f => {
      for (let i = 0; i < f.n; i++) {
        gulls.push({ f: f, a: R() * TAU, rad: f.R * (0.45 + R() * 0.7), h: f.h + (R() - 0.5) * 7, ph: R() * TAU, flap: R() * TAU });
      }
    });
    Cr.whale.y = -18;
  };

  function centre(st, t, out) {
    const s = st.s, a = t * st.w + st.p0;
    out[0] = s.x + Math.sin(a) * s.R + Math.sin(a * 2.7 + st.p1) * s.R * 0.25;
    out[2] = s.z + Math.cos(a * 0.83 + st.p2) * s.R * 0.8 + Math.cos(a * 1.9 + st.p1) * s.R * 0.2;
    out[1] = Math.sin(a * 1.3 + st.p2) * s.alt * 0.35;
  }
  const wrap = a => {
    while (a > Math.PI) a -= TAU;
    while (a < -Math.PI) a += TAU;
    return a;
  };
  const put = (d, o, x, y, z, size, yaw, pitch, ph, sp, r, g, b, glow) => {
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = size;
    d[o + 4] = yaw; d[o + 5] = pitch; d[o + 6] = ph; d[o + 7] = sp;
    d[o + 8] = r; d[o + 9] = g; d[o + 10] = b; d[o + 11] = glow;
  };

  Cr.update = function (t, dt, cam, extra) {
    const B = Cr.buf, px = cam[0], py = cam[1], pz = cam[2];
    const swim = extra ? extra.speed : 0, flash = extra ? extra.flash : 0, face = extra ? extra.yaw : 0;
    const kTurn = Math.min(1, dt * 7), decay = Math.exp(-0.9 * dt);

    // ----- cardumes -----
    let nA = 0, nB = 0;
    for (const st of schoolState) {
      const s = st.s;
      if (Math.hypot(s.x - px, s.z - pz) > 135 + s.R) continue;
      const data = s.k ? B.fishB.data : B.fishA.data, n = Math.max(6, Math.round(s.n * Cr.detail)), glow = s.glow || 0;
      for (let i = 0; i < n; i++) {
        const o = (st.start + i) * 17;
        centre(st, t - fish[o], tmp);
        const ph = fish[o + 7], sp = st.spread;
        let x = tmp[0] + (fish[o + 1] * 2 + Math.sin(t * fish[o + 4] + ph) * 0.5) * sp + fish[o + 13];
        let z = tmp[2] + (fish[o + 3] * 2 + Math.cos(t * fish[o + 6] + ph * 1.7) * 0.5) * sp + fish[o + 15];
        const ground = W.heightAt(x, z);
        let y;
        if (s.surface) y = -1.45 + Math.sin(t * 0.45 + ph) * 0.3 + fish[o + 2] * 0.4 + fish[o + 14];
        else y = ground + s.alt + tmp[1] + (fish[o + 2] * 2 + Math.sin(t * fish[o + 5] + ph * 2.3) * 0.3) * sp + fish[o + 14];
        if (y < ground + 0.7) y = ground + 0.7;
        if (y > -1.05) y = -1.05;
        // foge se você chega rápido; chega perto se você fica parado
        const dx = x - px, dy = y - py, dz = z - pz, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 36 && d2 > 0.0001 && swim > 1.15) {
          const d = Math.sqrt(d2), f = ((5.5 - d) * 7 * dt) / d;
          fish[o + 13] += dx * f; fish[o + 14] += dy * f * 0.5; fish[o + 15] += dz * f;
        } else if (d2 < 70 && d2 > 2.5 && swim < 0.6) {
          const d = Math.sqrt(d2), f = (1.5 * dt) / d;
          fish[o + 13] -= dx * f; fish[o + 14] -= dy * f * 0.35; fish[o + 15] -= dz * f;
          if (d < 4.2) note('curious', 'Curiosidade', 'Parado, o cardume chega mais perto em vez de fugir.');
        }
        fish[o + 13] *= decay; fish[o + 14] *= decay; fish[o + 15] *= decay;
        // direção a partir do deslocamento real
        let yaw = fish[o + 11], pitch = fish[o + 12], speed = 1;
        if (fish[o + 8] < 1e8 && dt > 0) {
          const vx = x - fish[o + 8], vy = y - fish[o + 9], vz = z - fish[o + 10], h = Math.hypot(vx, vz);
          if (h > 1e-4) {
            yaw += wrap(Math.atan2(vx, vz) - yaw) * kTurn;
            pitch += (Math.atan2(vy, h) * 0.8 - pitch) * kTurn;
          }
          speed = Math.min(2.6, 0.6 + (h / dt) * 0.35);
        } else {
          yaw = ph;
        }
        fish[o + 8] = x; fish[o + 9] = y; fish[o + 10] = z; fish[o + 11] = yaw; fish[o + 12] = pitch;
        const v = fish[o + 16];
        put(data, (s.k ? nB++ : nA++) * 12, x, y, z, s.size * (0.8 + v * 0.25), yaw, pitch, ph, speed, s.tint[0] * v, s.tint[1] * v, s.tint[2] * v, glow);
      }
    }
    B.fishA.count = nA;
    B.fishB.count = nB;

    // ----- arraias e tartarugas -----
    let near = 999;
    for (let i = 0; i < MANTAS.length; i++) {
      const m = MANTAS[i], a = (t * 2.3) / m.R + i * 2.1;
      const x = m.x + Math.cos(a) * m.R, z = m.z + Math.sin(a) * m.R * 0.75;
      let y = m.y + Math.sin(a * 2) * 1.6;
      const horiz = Math.hypot(x - px, z - pz);
      m.watch = M.clamp((m.watch || 0) + (horiz < 12 && py < y && y - py < 10 && swim < 0.85 ? dt : -dt * 0.6), 0, 3);
      if (m.watch > 0.5) y -= Math.min(2.6, m.watch);
      if (m.watch > 1.6) note('manta', 'Visita', 'A arraia desceu um pouco, só para passar mais perto.');
      const vx = -Math.sin(a) * m.R, vz = Math.cos(a) * m.R * 0.75, vy = Math.cos(a * 2) * 3.2;
      put(B.manta.data, i * 12, x, y, z, m.size, Math.atan2(vx, vz), Math.atan2(vy, Math.hypot(vx, vz)), i * 1.7, 1, 1, 1, 1, 0);
      near = Math.min(near, Math.hypot(x - px, y - py, z - pz));
    }
    B.manta.count = MANTAS.length;
    Cr.nearManta = near;
    near = 999;
    for (let i = 0; i < TURTLES.length; i++) {
      const m = TURTLES[i];
      const pred = m.x + Math.cos(((t - (m.bias || 0)) * 0.9) / m.R + i * 3.3) * m.R;
      const predZ = m.z + Math.sin(((t - (m.bias || 0)) * 1.3) / m.R + i * 3.3) * m.R * 0.8;
      const dist0 = Math.hypot(pred - px, predZ - pz);
      if (dist0 < 6 && swim < 1.05) {
        m.bias = (m.bias || 0) + dt;
        if (m.bias > 0.45) note('turtle', 'Olhar', 'Ela parou e virou o rosto para você.');
      }
      const a = ((t - (m.bias || 0)) * 0.9) / m.R + i * 3.3;
      const x = m.x + Math.cos(a) * m.R + Math.sin(a * 2.3) * m.R * 0.3, z = m.z + Math.sin(a * 1.3) * m.R * 0.8, y = m.y + Math.sin(a * 3.1) * 1.4;
      const vx = -Math.sin(a) * m.R + Math.cos(a * 2.3) * 2.3 * m.R * 0.3, vz = Math.cos(a * 1.3) * 1.3 * m.R * 0.8, vy = Math.cos(a * 3.1) * 3.1 * 1.4;
      const greet = dist0 < 6 && swim < 1.05;
      const yaw = greet ? Math.atan2(px - x, pz - z) : Math.atan2(vx, vz);
      put(B.turtle.data, i * 12, x, y, z, m.size, yaw, greet ? 0 : Math.atan2(vy, Math.hypot(vx, vz)) * 0.7, i * 2.9, 1, 1, 1, 1, 0);
      near = Math.min(near, Math.hypot(x - px, y - py, z - pz));
    }
    B.turtle.count = TURTLES.length;
    Cr.nearTurtle = near;

    // ----- baleia: dá a volta no mar aberto, por fora da fossa e do poço -----
    {
      const wh = Cr.whale, a = t * 0.0155 + 1.15;
      const clearOf = (x, z, cx, cz, rx, rz) => {
        const ax = (x - cx) / rx, az = (z - cz) / rz;
        return ax * ax + az * az;
      };
      const whaleR = ang => {
        let r = 200 + 16 * Math.sin(ang * 2);
        for (let n = 0; n < 6; n++) {
          const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
          const fossa = clearOf(x, z, 60, 195, 120, 74);
          const poco = clearOf(x, z, -248, -148, 102, 80);
          if (fossa < 1) r += (1 - fossa) * 90 + 16;
          else if (poco < 1) r -= (1 - poco) * 80 + 16;
          else break;
        }
        return M.clamp(r, 150, 300);
      };
      const r = whaleR(a);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const a2 = a + 0.01, r2 = whaleR(a2), vx = Math.cos(a2) * r2 - x, vz = Math.sin(a2) * r2 - z;
      const floor = W.heightAt(x, z);
      const shallow = -16 + 4 * Math.sin(a * 5);
      const target = floor < -38 ? shallow : M.clamp(Math.max(shallow, floor + 8), -28, -6);
      const prevY = wh.y;
      wh.y += (target - wh.y) * Math.min(1, dt * 0.25);
      const pitch = dt > 0 ? M.clamp(((wh.y - prevY) / dt) * 0.3, -0.3, 0.3) : 0;
      wh.pitch = (wh.pitch || 0) + (pitch - (wh.pitch || 0)) * Math.min(1, dt * 0.5);
      wh.x = x;
      wh.z = z;
      wh.dist = Math.hypot(x - px, wh.y - py, z - pz);
      put(B.whale.data, 0, x, wh.y, z, 23, Math.atan2(vx, vz), wh.pitch, 0, 1, 1, 1, 1, 0);
      B.whale.count = 1;
    }

    // ----- águas-vivas -----
    near = 999;
    let nj = 0;
    for (let i = 0; i < jellies.length; i++) {
      const j = jellies[i];
      if (Math.abs(j.x - px) > 150 || Math.abs(j.z - pz) > 150) continue;
      const x = j.x + Math.sin(t * 0.07 + j.ph) * 3, z = j.z + Math.cos(t * 0.06 + j.ph * 1.4) * 3, y = j.y + Math.sin(t * 0.16 + j.ph) * 2.5;
      const jd = Math.hypot(x - px, y - py, z - pz);
      if (j.cool > 0) j.cool -= dt;
      if (jd < 1.7 && j.cool <= 0 && jd > 0.05) {
        j.cool = 1.5;
        const s = 2.4 / jd;
        Cr.nudge = [(x - px) * s, (y - py) * s * 0.35, (z - pz) * s];
        note('jelly', 'Formigamento', 'O toque dela empurra de leve. Passa logo, sem fazer mal.');
      }
      put(B.jelly.data, nj++ * 12, x, y, z, j.size, j.ph, Math.sin(t * 0.2 + j.ph) * 0.18, j.ph, j.sp, j.c[0], j.c[1], j.c[2], j.glow);
      if (j.glow > 1) near = Math.min(near, jd);
    }
    B.jelly.count = nj;
    Cr.nearJelly = near;

    // ----- golfinhos: arcos perto da superfície; um pode vir nadar ao lado -----
    let escortTaken = false;
    for (let i = 0; i < DOLPHINS.length; i++) {
      const m = DOLPHINS[i], a = t * m.w + i * 2.2;
      const ox = m.x + Math.cos(a) * m.R, oz = m.z + Math.sin(a * 0.9) * m.R * 0.75;
      let oy = m.y + Math.sin(a * 2.2) * 1.7;
      oy = Math.max(oy, W.heightAt(ox, oz) + 1.4);
      if (oy > -1.2) oy = -1.2;
      const ovx = -Math.sin(a) * m.R, ovz = Math.cos(a * 0.9) * m.R * 0.75 * 0.9, ovy = Math.cos(a * 2.2) * 1.7 * 2.2;
      const oyaw = Math.atan2(ovx, ovz), opitch = Math.atan2(ovy, Math.hypot(ovx, ovz)) * 0.6;
      const orbitD = Math.hypot(ox - px, oy - py, oz - pz);
      if (!escortTaken && (m.escort || 0) <= 0 && (m.cool || 0) <= 0 && orbitD < 12 && swim > 1.8 && py > -16) {
        m.escort = 6;
        note('dolphin', 'Companhia', 'Um golfinho pegou o seu ritmo e nada ao lado.');
      } else if ((m.escort || 0) <= 0 && (m.cool || 0) > 0) m.cool -= dt;
      let tx = ox, ty = oy, tz = oz, tyaw = oyaw, tpitch = opitch;
      if ((m.escort || 0) > 0) {
        escortTaken = true;
        m.escort -= dt;
        if (m.escort <= 0) {
          m.escort = 0;
          m.cool = 14;
        }
        const side = i % 2 ? 1 : -1;
        const fy = Math.sin(face), fz = -Math.cos(face), rx = Math.cos(face), rz = Math.sin(face);
        tx = px + fy * 3.2 + rx * side * 2.2;
        tz = pz + fz * 3.2 + rz * side * 2.2;
        ty = Math.min(-1.35, Math.max(-6, py));
        ty = Math.max(ty, W.heightAt(tx, tz) + 1.3);
        if (ty > -1.2) ty = -1.2;
        tyaw = Math.atan2(fy, fz);
        tpitch = 0;
      }
      if (m.sx === undefined) {
        m.sx = ox; m.sy = oy; m.sz = oz; m.syaw = oyaw;
      }
      const follow = (m.escort || 0) > 0;
      const k = 1 - Math.exp(-dt * (follow ? 2.4 : 1.4));
      m.sx += (tx - m.sx) * k;
      m.sy += (ty - m.sy) * k;
      m.sz += (tz - m.sz) * k;
      m.syaw += wrap(tyaw - m.syaw) * k;
      put(B.dolphin.data, i * 12, m.sx, m.sy, m.sz, m.size, m.syaw, follow ? tpitch : opitch, i * 1.3, 1, 1, 1, 1, 0);
    }
    B.dolphin.count = DOLPHINS.length;

    // ----- gaivotas -----
    let ng = 0;
    if (py > -28) {
      for (let i = 0; i < gulls.length; i++) {
        if (Cr.detail < 0.7 && i % 2 === 1) continue;
        if (Cr.detail < 0.95 && i % 5 === 4) continue;
        const g = gulls[i], f = g.f;
        g.a += f.w * dt * (f.R / g.rad);
        const x = f.x + Math.cos(g.a) * g.rad, z = f.z + Math.sin(g.a) * g.rad * 0.8;
        if (Math.hypot(x - px, z - pz) > 230) continue;
        const y = g.h + Math.sin(t * 0.33 + g.ph) * 2.2 + Math.sin(t * 0.9 + g.ph * 2.0) * 0.45;
        const vx = -Math.sin(g.a) * g.rad * f.w, vz = Math.cos(g.a) * g.rad * 0.8 * f.w;
        const glide = 0.5 + 0.5 * Math.sin(t * 0.55 + g.flap);
        const amp = glide > 0.42 ? 0.9 : 0.1;
        put(B.gull.data, ng++ * 12, x, y, z, 1.15, Math.atan2(vx, vz), Math.sin(t * 0.4 + g.ph) * 0.06, g.ph, amp, 1, 1, 1, M.clamp(-f.w * 6.5, -0.7, 0.7));
      }
    }
    B.gull.count = ng;

    // ----- tubarões: abrem caminho, não perseguem -----
    near = 999;
    for (let i = 0; i < SHARKS.length; i++) {
      const m = SHARKS[i], a = t * m.w + i * 1.7;
      const shy = (m.shy || 0) * Math.exp(-0.7 * dt);
      let rad = m.R + shy;
      const x = m.x + Math.cos(a) * rad, z = m.z + Math.sin(a * 0.85) * rad * 0.8;
      let y = m.y + Math.sin(a * 1.4) * 1.2;
      y = Math.max(y, W.heightAt(x, z) + 1.6);
      if (y > -1.4) y = -1.4;
      const d = Math.hypot(x - px, y - py, z - pz);
      m.shy = d < 9 ? Math.min(16, shy + dt * 12) : shy;
      if (m.shy > 3) note('shark', 'Passagem', 'O tubarão abriu caminho. Ele não tem pressa, nem fome.');
      const vx = -Math.sin(a) * rad, vz = Math.cos(a * 0.85) * rad * 0.8;
      put(B.shark.data, i * 12, x, y, z, m.size, Math.atan2(vx, vz), 0, i, 1.1, 1, 1, 1, 0);
      near = Math.min(near, d);
    }
    B.shark.count = SHARKS.length;
    Cr.nearShark = near;

    // ----- cavalos-marinhos: a lanterna vira o focinho deles -----
    near = 999;
    let ns = 0;
    for (let i = 0; i < SEAHORSES.length; i++) {
      if (Cr.detail < 0.7 && i % 2) continue;
      const m = SEAHORSES[i];
      const ground = W.heightAt(m.x, m.z);
      const y = Math.min(-1.6, ground + m.y);
      if (Math.hypot(m.x - px, m.z - pz) > 70) continue;
      const d = Math.hypot(m.x - px, y - py, m.z - pz);
      const yaw = flash > 0.45 && d < 14 ? Math.atan2(px - m.x, pz - m.z) : Math.sin(t * 0.3 + i) * 0.6;
      if (flash > 0.45 && d < 11) note('seahorse', 'Focinho', 'Os cavalos-marinhos viraram para a lanterna.');
      put(B.seahorse.data, ns++ * 12, m.x, y + Math.sin(t * 0.8 + i) * 0.15, m.z, 0.85, yaw, 0.2, i, 0.35, 1, 1, 1, 0);
      near = Math.min(near, d);
    }
    B.seahorse.count = ns;
    Cr.nearSeahorse = near;

    // ----- polvos -----
    near = 999;
    for (let i = 0; i < OCTOPUS.length; i++) {
      const m = OCTOPUS[i];
      if (!m.hx) { m.hx = m.x; m.hz = m.z; }
      if ((m.flee || 0) > 0) {
        m.flee -= dt;
        m.x += (m.hx - m.x) * Math.min(1, dt * 0.4);
        m.z += (m.hz - m.z) * Math.min(1, dt * 0.4);
      }
      const ground = W.heightAt(m.x, m.z);
      const y = ground + 0.85;
      const d = Math.hypot(m.x - px, y - py, m.z - pz);
      let tint = [0.85, 0.7, 0.65], yaw = Math.sin(t * 0.2 + i) * 0.4;
      if (d < 8 && swim < 1.15 && (m.flee || 0) <= 0) {
        tint = [1, 0.85, 0.45];
        yaw = Math.atan2(px - m.x, pz - m.z);
        note('octopus', 'Cores', 'Devagar, ele trocou de cor. É um cumprimento.');
      } else if (d < 4.2 && swim > 2.3 && (m.flee || 0) <= 0) {
        m.flee = 4;
        const len = d || 1;
        m.x += ((m.x - px) / len) * 7;
        m.z += ((m.z - pz) / len) * 7;
        Cr.ink = { x: m.x, y: y + 0.4, z: m.z };
        note('ink', 'Tinta', 'Rápido demais. A nuvem escura ficou, e ele já não está ali.');
      }
      put(B.octopus.data, i * 12, m.x, y, m.z, 1.7, yaw, 0, i * 1.3, 0.85, tint[0], tint[1], tint[2], 0);
      near = Math.min(near, d);
    }
    B.octopus.count = OCTOPUS.length;
    Cr.nearOctopus = near;

    // ----- caranguejos no casco -----
    let nc = 0;
    if (Math.hypot(-55 - px, -165 - pz) < 80) {
      for (let i = 0; i < CRABS.length; i++) {
        const m = CRABS[i];
        m.off = (m.off || 0) * Math.exp(-1.4 * dt);
        const d = Math.hypot(m.x - px, m.z - pz);
        if (d < 5) {
          m.off = Math.min(3.5, m.off + dt * 6);
          note('crab', 'Passagem', 'Os caranguejos saíram de lado para você passar.');
        }
        const side = i % 2 ? 1 : -1;
        const x = m.x + Math.cos(t * 0.6 + i) * 0.8 + side * m.off;
        const z = m.z + Math.sin(t * 0.5 + i) * 0.6;
        const y = W.heightAt(x, z) + 0.12;
        put(B.crab.data, nc++ * 12, x, y, z, 0.7, Math.atan2(side, 0.2), 0, i, 1, 1, 1, 1, 0);
      }
    }
    B.crab.count = nc;

    // ----- moreias nas ruínas -----
    let nm = 0;
    if (Math.hypot(-175 - px, 15 - pz) < 70) {
      for (let i = 0; i < MORAYS.length; i++) {
        const m = MORAYS[i];
        const ground = W.heightAt(m.x, m.z);
        const d = Math.hypot(m.x - px, ground - py, m.z - pz);
        m.hide = M.clamp((m.hide || 0) + (d < 3.6 ? dt : -dt * 0.5), 0, 1);
        if (m.hide > 0.65) note('moray', 'Esconderijo', 'A moreia recolheu o corpo para dentro da pedra.');
        const y = ground + 0.9 - m.hide * 0.7;
        const yaw = Math.atan2(px - m.x, pz - m.z);
        put(B.moray.data, nm++ * 12, m.x, y, m.z, 1.35, yaw, 0, i, 0.7, 1, 1, 1, 0);
      }
    }
    B.moray.count = nm;

    // ----- peixe-lua: vem ver quem ficou parado -----
    {
      const m = SUNFISH;
      if (!m.hx) { m.hx = m.x; m.hz = m.z; }
      const dx = px - m.x, dz = pz - m.z, dist = Math.hypot(dx, m.y - py, dz) || 1;
      m.watch = M.clamp((m.watch || 0) + (swim < 0.75 && dist < 24 ? dt : -dt * 0.4), 0, 5);
      if (m.watch < 0.4) {
        m.x += (m.hx - m.x) * Math.min(1, dt * 0.12);
        m.z += (m.hz - m.z) * Math.min(1, dt * 0.12);
      } else if (m.watch > 1.7 && dist > 7) {
        m.x += (dx / dist) * dt * 1.15;
        m.z += (dz / dist) * dt * 1.15;
      }
      if (dist < 10 && m.watch > 1.7) note('sunfish', 'Visita lenta', 'O peixe-lua veio até você. Não tinha pressa nenhuma.');
      const y = Math.max(W.heightAt(m.x, m.z) + 3, Math.min(-2.2, m.y));
      const yaw = dist < 30 ? Math.atan2(dx, dz) : Math.sin(t * 0.05);
      if (Math.hypot(m.x - px, m.z - pz) < 160) put(B.sunfish.data, 0, m.x, y, m.z, 5.6, yaw, 0, 0, 0.45, 1, 1, 1, 0);
      B.sunfish.count = Math.hypot(m.x - px, m.z - pz) < 160 ? 1 : 0;
      Cr.nearSunfish = dist;
    }

    // ----- pescadores da fossa: a luz avança, depois se esconde -----
    near = 999;
    let na = 0;
    for (let i = 0; i < ANGLERS.length; i++) {
      const m = ANGLERS[i];
      if (!m.hx) { m.hx = m.x; m.hz = m.z; }
      if ((m.cool || 0) > 0) m.cool -= dt;
      if ((m.lunge || 0) > 0) {
        m.lunge -= dt;
        m.x += (m.tx - m.x) * Math.min(1, dt * 7);
        m.z += (m.tz - m.z) * Math.min(1, dt * 7);
        if (m.lunge <= 0) m.cool = 4.5;
      } else if ((m.cool || 0) > 1.5) {
        m.x += (m.hx - m.x) * Math.min(1, dt * 1.2);
        m.z += (m.hz - m.z) * Math.min(1, dt * 1.2);
      }
      const ground = W.heightAt(m.x, m.z);
      const y = Math.max(ground + 2.2, Math.min(-36, ground + 8));
      const d = Math.hypot(m.x - px, y - py, m.z - pz);
      if (d < 8 && (m.cool || 0) <= 0 && (m.lunge || 0) <= 0 && py < -30) {
        m.tx = px; m.tz = pz; m.lunge = 0.42;
        note('angler', 'Anzol', 'A luz avançou. Era uma boca, e ela já voltou para o escuro.');
      }
      if (Math.hypot(m.hx - px, m.hz - pz) > 120) continue;
      const yaw = Math.atan2(px - m.x, pz - m.z);
      put(B.angler.data, na++ * 12, m.x, y, m.z, 1.55, yaw, 0.1, i, 0.4, 0.55, 0.85, 0.7, (m.lunge || 0) > 0 ? 1.6 : 0.9);
      near = Math.min(near, d);
    }
    B.angler.count = na;
    Cr.nearAngler = near;

    // ----- lulas: um jato para trás -----
    near = 999;
    let nq = 0;
    for (let i = 0; i < SQUIDS.length; i++) {
      const m = SQUIDS[i];
      if (!m.hx) { m.hx = m.x; m.hz = m.z; m.hy = -50; }
      if ((m.cool || 0) > 0) m.cool -= dt;
      if ((m.cool || 0) > 2.4) {
        m.x += m.jx * dt;
        m.z += m.jz * dt;
      } else {
        m.x += (m.hx - m.x) * Math.min(1, dt * 0.25);
        m.z += (m.hz - m.z) * Math.min(1, dt * 0.25);
      }
      const ground = W.heightAt(m.x, m.z);
      const y = Math.max(ground + 3, Math.min(-8, ground + 14 + Math.sin(t * 0.4 + i) * 2));
      const d = Math.hypot(m.x - px, y - py, m.z - pz);
      if (d < 7 && (m.cool || 0) <= 0) {
        const len = d || 1;
        m.jx = ((m.x - px) / len) * 9;
        m.jz = ((m.z - pz) / len) * 9;
        m.cool = 3.4;
        note('squid', 'Jato', 'A lula disparou para trás e sumiu num pulso de luz.');
      }
      if (Math.hypot(m.x - px, m.z - pz) > 130) continue;
      const yaw = Math.atan2(m.jx || px - m.x, m.jz || pz - m.z);
      put(B.squid.data, nq++ * 12, m.x, y, m.z, 2.3, yaw, 0, i, 1.2, 1, 1, 1, (m.cool || 0) > 2 ? 1.5 : 0.85);
      near = Math.min(near, d);
    }
    B.squid.count = nq;
    Cr.nearSquid = near;

    // ----- a sombra da fossa, maior que a baleia -----
    Cr.wake = null;
    {
      const a = t * 0.045 + 0.6;
      const x = 62 + Math.cos(a) * 24, z = 198 + Math.sin(a) * 14;
      const a2 = a + 0.02;
      const vx = 62 + Math.cos(a2) * 24 - x, vz = 198 + Math.sin(a2) * 14 - z;
      const floor = W.heightAt(x, z);
      const y = Math.max(floor + 12, Math.min(-46, floor + 18));
      const dist = Math.hypot(x - px, y - py, z - pz);
      if (dist < 28) {
        const h = Math.hypot(vx, vz) || 1;
        const s = (28 - dist) * 0.45;
        Cr.wake = [(vx / h) * s, (vz / h) * s];
        note('leviathan', 'Esteira', 'Algo enorme passou. A água inteira se mexeu com ela.');
      }
      if (dist < 220 && py < -24) put(B.leviathan.data, 0, x, y, z, 40, Math.atan2(vx, vz), 0, 0, 0.7, 0.28, 0.4, 0.62, 0.45);
      B.leviathan.count = dist < 220 && py < -24 ? 1 : 0;
      Cr.nearLeviathan = dist;
    }
  };
})();
