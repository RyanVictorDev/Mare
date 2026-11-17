// Maré — vida marinha: cardumes, arraias, tartarugas, golfinhos, a baleia, águas-vivas e gaivotas.
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
  ];
  const MANTAS = [
    { x: 0, z: 45, R: 46, y: -5.5, size: 5.2 },
    { x: -62, z: 92, R: 50, y: -7.5, size: 4.4 },
    { x: -150, z: 30, R: 42, y: -14, size: 5.6 },
    { x: 110, z: -20, R: 56, y: -8, size: 4.8 },
  ];
  const TURTLES = [
    { x: 14, z: 56, R: 18, y: -7, size: 1.5 },
    { x: 140, z: -30, R: 26, y: -12, size: 1.7 },
    { x: -90, z: 120, R: 22, y: -10, size: 1.4 },
  ];
  const NJELLY = 84;
  const DOLPHINS = [
    { x: 28, z: -12, R: 30, y: -3.2, size: 2.7, w: 0.22 },
    { x: -28, z: 92, R: 26, y: -3.5, size: 2.35, w: 0.2 },
    { x: 98, z: 48, R: 32, y: -4.0, size: 2.9, w: 0.18 },
  ];
  const FLOCKS = [
    { x: 8, z: 36, R: 52, n: 7, h: 13, w: 0.1 },
    { x: 145, z: -42, R: 44, n: 5, h: 11, w: -0.12 },
    { x: -95, z: 115, R: 48, n: 5, h: 16, w: 0.085 },
  ];

  let fish = null, schoolState = null, jellies = null, gulls = null;
  const tmp = [0, 0, 0];

  Cr.detail = 1;
  Cr.whale = { x: 0, y: -18, z: 0, dist: 999 };
  Cr.nearManta = 999;
  Cr.nearTurtle = 999;
  Cr.nearJelly = 999;

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
      } else {
        const a = R() * TAU, d = Math.sqrt(R()) * 60;
        x = 150 + Math.cos(a) * d;
        z = -45 + Math.sin(a) * d;
        y = -6 - R() * 9;
      }
      const c = JP[(R() * JP.length) | 0];
      jellies.push({ x: x, y: y, z: z, ph: R() * TAU, size: 0.6 + R() * 1.1, c: c, glow: i < 70 ? 1.2 : 0.25, sp: 0.6 + R() * 0.6 });
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

  Cr.update = function (t, dt, cam) {
    const B = Cr.buf, px = cam[0], py = cam[1], pz = cam[2];
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
        // foge do mergulhador
        const dx = x - px, dy = y - py, dz = z - pz, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 30 && d2 > 0.0001) {
          const d = Math.sqrt(d2), f = ((5.5 - d) * 7 * dt) / d;
          fish[o + 13] += dx * f; fish[o + 14] += dy * f * 0.5; fish[o + 15] += dz * f;
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
      const x = m.x + Math.cos(a) * m.R, z = m.z + Math.sin(a) * m.R * 0.75, y = m.y + Math.sin(a * 2) * 1.6;
      const vx = -Math.sin(a) * m.R, vz = Math.cos(a) * m.R * 0.75, vy = Math.cos(a * 2) * 3.2;
      put(B.manta.data, i * 12, x, y, z, m.size, Math.atan2(vx, vz), Math.atan2(vy, Math.hypot(vx, vz)), i * 1.7, 1, 1, 1, 1, 0);
      near = Math.min(near, Math.hypot(x - px, y - py, z - pz));
    }
    B.manta.count = MANTAS.length;
    Cr.nearManta = near;
    near = 999;
    for (let i = 0; i < TURTLES.length; i++) {
      const m = TURTLES[i], a = (t * 0.9) / m.R + i * 3.3;
      const x = m.x + Math.cos(a) * m.R + Math.sin(a * 2.3) * m.R * 0.3, z = m.z + Math.sin(a * 1.3) * m.R * 0.8, y = m.y + Math.sin(a * 3.1) * 1.4;
      const vx = -Math.sin(a) * m.R + Math.cos(a * 2.3) * 2.3 * m.R * 0.3, vz = Math.cos(a * 1.3) * 1.3 * m.R * 0.8, vy = Math.cos(a * 3.1) * 3.1 * 1.4;
      put(B.turtle.data, i * 12, x, y, z, m.size, Math.atan2(vx, vz), Math.atan2(vy, Math.hypot(vx, vz)) * 0.7, i * 2.9, 1, 1, 1, 1, 0);
      near = Math.min(near, Math.hypot(x - px, y - py, z - pz));
    }
    B.turtle.count = TURTLES.length;
    Cr.nearTurtle = near;

    // ----- baleia: dá a volta no mundo todo, devagar -----
    {
      const wh = Cr.whale, a = t * 0.0155 + 1.15, r = 182 + 24 * Math.sin(a * 3);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const a2 = a + 0.01, r2 = 182 + 24 * Math.sin(a2 * 3), vx = Math.cos(a2) * r2 - x, vz = Math.sin(a2) * r2 - z;
      const target = M.clamp(Math.max(-17 + 5 * Math.sin(a * 5), W.heightAt(x, z) + 8), -45, -6);
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
      put(B.jelly.data, nj++ * 12, x, y, z, j.size, j.ph, Math.sin(t * 0.2 + j.ph) * 0.18, j.ph, j.sp, j.c[0], j.c[1], j.c[2], j.glow);
      if (j.glow > 1) near = Math.min(near, Math.hypot(x - px, y - py, z - pz));
    }
    B.jelly.count = nj;
    Cr.nearJelly = near;

    // ----- golfinhos: arcos perto da superfície -----
    for (let i = 0; i < DOLPHINS.length; i++) {
      const m = DOLPHINS[i], a = t * m.w + i * 2.2;
      const x = m.x + Math.cos(a) * m.R, z = m.z + Math.sin(a * 0.9) * m.R * 0.75;
      let y = m.y + Math.sin(a * 2.2) * 1.7;
      y = Math.max(y, W.heightAt(x, z) + 1.4);
      if (y > -1.15) y = -1.15;
      const vx = -Math.sin(a) * m.R, vz = Math.cos(a * 0.9) * m.R * 0.75 * 0.9, vy = Math.cos(a * 2.2) * 1.7 * 2.2;
      put(B.dolphin.data, i * 12, x, y, z, m.size, Math.atan2(vx, vz), Math.atan2(vy, Math.hypot(vx, vz)) * 0.6, i * 1.3, 1, 1, 1, 1, 0);
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
  };
})();
