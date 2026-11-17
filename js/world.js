// Maré — geração do mundo: relevo, zonas, vegetação, colisores e pérolas.
// Eixos: x = leste, -z = norte, y = para cima. A superfície do mar fica em y = 0.
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const M = root.MARE;
  const W = (M.world = {});
  const lerp = M.lerp, smooth = M.smooth, clamp = M.clamp, mixc = M.mixc;

  const SIZE = 330, N = 264, CELL = (SIZE * 2) / N, NV = N + 1;
  const CHUNKS = 8, CH = N / CHUNKS;
  const ICELL = 33, IGRID = 20;
  const TAU = Math.PI * 2;

  W.SIZE = SIZE;
  W.ICELL = ICELL;
  W.zones = [
    { id: 'recife', name: 'Recife de Coral', x: 0, z: 40, r: 85 },
    { id: 'pradaria', name: 'Pradaria Marinha', x: -95, z: 125, r: 66 },
    { id: 'algas', name: 'Floresta de Algas', x: 150, z: -45, r: 82 },
    { id: 'naufragio', name: 'Naufrágio do Aurora', x: -55, z: -165, r: 55 },
    { id: 'ruinas', name: 'Ruínas Submersas', x: -175, z: 15, r: 56 },
    { id: 'fossa', name: 'Fossa Abissal', x: 60, z: 195, r: 92, rz: 44 },
  ];
  const Z = {};
  W.zones.forEach(z => (Z[z.id] = z));
  const zw = (x, z, zone, inner) => 1 - smooth(zone.r * inner, zone.r, Math.hypot(x - zone.x, z - zone.z));
  const abyssW = (x, z) => {
    const ax = (x - Z.fossa.x) / Z.fossa.r, az = (z - Z.fossa.z) / Z.fossa.rz;
    return Math.exp(-(ax * ax + az * az) * 1.6);
  };

  function hRaw(x, z) {
    const n1 = M.fbm2(x * 0.0075 + 3.1, z * 0.0075 - 1.7, 4, 1);
    const n2 = M.fbm2(x * 0.035, z * 0.035, 3, 7);
    const n3 = M.noise2(x * 0.21, z * 0.21, 13);
    let h = -25 + (n1 - 0.5) * 26 + (n2 - 0.5) * 5 + (n3 - 0.5) * 0.7;
    h = lerp(h, -11.5 + (n2 - 0.5) * 6 + (n3 - 0.5) * 0.6, zw(x, z, Z.recife, 0.5));
    h = lerp(h, -17 + (n2 - 0.5) * 2.5 + (n3 - 0.5) * 0.3, zw(x, z, Z.pradaria, 0.5) * 0.9);
    h = lerp(h, -24 + (n2 - 0.5) * 4, zw(x, z, Z.algas, 0.5) * 0.8);
    h = lerp(h, -33 + (n2 - 0.5) * 1.5, zw(x, z, Z.naufragio, 0.55));
    h = lerp(h, -27 + (n2 - 0.5) * 1.0, zw(x, z, Z.ruinas, 0.55));
    const aw = abyssW(x, z);
    h -= aw * 62;
    h += (n2 - 0.5) * 30 * aw * (1 - aw) * 4;
    // a borda sobe, mas fica debaixo d'água: vista de cima, o mar segue até o horizonte
    h = lerp(h, -5.5, smooth(250, 320, Math.hypot(x, z)));
    return h;
  }

  let H = null;
  W.heightAt = function (x, z) {
    const gx = clamp((x + SIZE) / CELL, 0, N - 0.001), gz = clamp((z + SIZE) / CELL, 0, N - 0.001);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz, i = iz * NV + ix;
    const a = H[i], b = H[i + 1], c = H[i + NV], d = H[i + NV + 1];
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  };
  // 0 = plano, 1 = parede.
  W.slopeAt = function (x, z) {
    const e = 1.5, dx = W.heightAt(x + e, z) - W.heightAt(x - e, z), dz = W.heightAt(x, z + e) - W.heightAt(x, z - e);
    return 1 - (2 * e) / Math.hypot(dx, 2 * e, dz);
  };
  W.zoneAt = function (x, y, z) {
    for (const zn of W.zones) {
      if (zn.id === 'fossa') {
        const ax = (x - zn.x) / zn.r, az = (z - zn.z) / zn.rz;
        if (ax * ax + az * az < 1 && y < -40) return zn;
      } else if (Math.hypot(x - zn.x, z - zn.z) < zn.r * 0.8) return zn;
    }
    return null;
  };

  W.generate = function (info) {
    const R = M.rng(2026);

    // ---------- relevo ----------
    H = new Float32Array(NV * NV);
    for (let iz = 0; iz < NV; iz++) {
      for (let ix = 0; ix < NV; ix++) H[iz * NV + ix] = hRaw(-SIZE + ix * CELL, -SIZE + iz * CELL);
    }
    const verts = new Float32Array(NV * NV * 10);
    const sand = [0.82, 0.74, 0.56], sandD = [0.6, 0.55, 0.45], rockC = [0.36, 0.35, 0.36], algae = [0.3, 0.44, 0.28];
    const deepC = [0.3, 0.34, 0.42], reefSand = [0.95, 0.88, 0.72], mead = [0.5, 0.6, 0.38];
    for (let iz = 0; iz < NV; iz++) {
      for (let ix = 0; ix < NV; ix++) {
        const i = iz * NV + ix, o = i * 10, x = -SIZE + ix * CELL, z = -SIZE + iz * CELL, h = H[i];
        const hl = H[iz * NV + Math.max(ix - 1, 0)], hr = H[iz * NV + Math.min(ix + 1, N)];
        const hd = H[Math.max(iz - 1, 0) * NV + ix], hu = H[Math.min(iz + 1, N) * NV + ix];
        let nx = hl - hr, ny = 2 * CELL, nz = hd - hu;
        const nl = Math.hypot(nx, ny, nz);
        nx /= nl; ny /= nl; nz /= nl;
        const slope = 1 - ny, depth = -h;
        const n2 = M.fbm2(x * 0.035, z * 0.035, 3, 7), np = M.fbm2(x * 0.02 + 40, z * 0.02, 3, 23);
        let c = mixc(sand, sandD, clamp(n2 * 1.4 - 0.2, 0, 1));
        c = mixc(c, reefSand, zw(x, z, Z.recife, 0.4) * 0.7);
        c = mixc(c, mead, zw(x, z, Z.pradaria, 0.4) * 0.55);
        c = mixc(c, algae, smooth(0.5, 0.75, np) * smooth(45, 25, depth) * 0.55);
        c = mixc(c, deepC, smooth(34, 62, depth));
        const rk = smooth(0.07, 0.24, slope);
        c = mixc(c, mixc(rockC, [0.25, 0.26, 0.3], n2), rk);
        verts[o] = x; verts[o + 1] = h; verts[o + 2] = z;
        verts[o + 3] = nx; verts[o + 4] = ny; verts[o + 5] = nz;
        verts[o + 6] = c[0]; verts[o + 7] = c[1]; verts[o + 8] = c[2];
        verts[o + 9] = 1 - rk;
      }
    }
    const index = new Uint32Array(N * N * 6), chunks = [];
    let io = 0;
    for (let cz = 0; cz < CHUNKS; cz++) {
      for (let cx = 0; cx < CHUNKS; cx++) {
        const start = io;
        for (let iz = cz * CH; iz < (cz + 1) * CH; iz++) {
          for (let ix = cx * CH; ix < (cx + 1) * CH; ix++) {
            const a = iz * NV + ix, b = a + NV, c = a + 1, d = b + 1;
            index[io++] = a; index[io++] = b; index[io++] = c;
            index[io++] = c; index[io++] = b; index[io++] = d;
          }
        }
        chunks.push({ x: -SIZE + (cx + 0.5) * CH * CELL, z: -SIZE + (cz + 0.5) * CH * CELL, rad: CH * CELL * 0.7072, offset: start, count: io - start });
      }
    }
    W.terrain = { verts, index, chunks };

    // ---------- colisores ----------
    // Elipsoides {x,y,z,r,ry} e cilindros verticais {x,z,r,y0,y1}, em uma grade para busca rápida.
    const CG = 24, grid = new Map();
    const put = c => {
      const x0 = Math.floor((c.x - c.r - 1) / CG), x1 = Math.floor((c.x + c.r + 1) / CG);
      const z0 = Math.floor((c.z - c.r - 1) / CG), z1 = Math.floor((c.z + c.r + 1) / CG);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gz = z0; gz <= z1; gz++) {
          const k = gx + ',' + gz;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(c);
        }
      }
    };
    W.collidersNear = (x, z) => grid.get(Math.floor(x / CG) + ',' + Math.floor(z / CG));

    // ---------- estruturas ----------
    const WR = { x: Z.naufragio.x, z: Z.naufragio.z, yaw: 0.7 }, RU = { x: Z.ruinas.x, z: Z.ruinas.z, yaw: 0.4 };
    WR.y = W.heightAt(WR.x, WR.z) - info.wreck.seabed;
    RU.y = W.heightAt(RU.x, RU.z) - 0.3;
    const toWorld = (S, lx, lz) => {
      const c = Math.cos(S.yaw), s = Math.sin(S.yaw);
      return [S.x + lx * c + lz * s, S.z - lx * s + lz * c];
    };
    const toLocal = (S, x, z) => {
      const c = Math.cos(S.yaw), s = Math.sin(S.yaw), dx = x - S.x, dz = z - S.z;
      return [dx * c - dz * s, dx * s + dz * c];
    };
    for (const sp of info.wreck.spheres) {
      const p = toWorld(WR, sp[0], sp[2]);
      put({ x: p[0], y: WR.y + sp[1], z: p[1], r: sp[3], ry: sp[3] });
    }
    for (const c of info.ruins.cyls) {
      const p = toWorld(RU, c.x, c.z);
      put({ cyl: true, x: p[0], z: p[1], r: c.r, y0: RU.y + c.y0, y1: RU.y + c.y1 });
    }
    const blocked = (x, z, pad) => {
      const w = toLocal(WR, x, z);
      if (Math.abs(w[0]) < 6 + pad && Math.abs(w[1]) < 21 + pad) return true;
      const r = toLocal(RU, x, z);
      if (Math.hypot(r[0], r[1]) < 14.5 + pad) return true;
      return Math.abs(r[0]) < 6.5 + pad && r[1] > 0 && r[1] < 44;
    };

    // ---------- instâncias ----------
    const inst = {};
    const add = (type, x, y, z, scale, yaw, hs, phase, r, g, b, glow) => {
      (inst[type] || (inst[type] = [])).push([x, y, z, scale, yaw, hs, phase, 0, r, g, b, glow || 0]);
    };
    add('wreck', WR.x, WR.y, WR.z, 1, WR.yaw, 1, 0, 1, 1, 1, 0);
    add('ruins', RU.x, RU.y, RU.z, 1, RU.yaw, 1, 0, 1, 1, 1, 0);

    // pérolas (cada uma dentro de uma concha)
    const pearls = [];
    const pearlAt = (x, z, y) => {
      const h = y === undefined ? W.heightAt(x, z) : y;
      pearls.push({ x: x, y: h + 0.3, z: z });
      add('clam', x, h + 0.1, z, 1.1, R() * TAU, 1, 0, 1, 1, 1, 0);
    };
    pearlAt(6, 34);
    pearlAt(-42, 12);
    pearlAt(-82, 118);
    pearlAt(-122, 140);
    pearlAt(148, -42);
    pearlAt(188, -78);
    let p = toWorld(WR, 8, 3);
    pearlAt(p[0], p[1]);
    p = toWorld(WR, -9.5, -13);
    pearlAt(p[0], p[1]);
    pearlAt(RU.x, RU.z, RU.y + info.ruins.altarTop);
    p = toWorld(RU, 0, 49);
    pearlAt(p[0], p[1]);
    pearlAt(60, 195);
    pearlAt(118, 178);
    W.pearls = pearls;
    const nearPearl = (x, z, d) => {
      for (const q of pearls) if (Math.abs(q.x - x) < d && Math.abs(q.z - z) < d) return true;
      return false;
    };

    const scatter = (n, cx, cz, r, fn) => {
      for (let i = 0; i < n; i++) {
        const a = R() * TAU, d = Math.sqrt(R()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (Math.hypot(x, z) > 288) continue;
        const h = W.heightAt(x, z);
        if (h > -3.5) continue;
        fn(x, z, h, W.slopeAt(x, z));
      }
    };
    const jit = (c, k) => {
      const b = 1 - k + R() * k * 2;
      return [c[0] * b, c[1] * b, c[2] * b];
    };

    // algas gigantes
    const kelpAt = (x, z, h) => {
      const maxH = -h - 2.5;
      if (maxH < 4) return;
      add('kelp', x, h - 0.2, z, Math.min(maxH, 6 + R() * 11), R() * TAU, 1, R() * TAU, 0.85 + R() * 0.3, 0.9 + R() * 0.2, 0.7 + R() * 0.5);
    };
    scatter(3400, Z.algas.x, Z.algas.z, 84, (x, z, h, s) => {
      if (s > 0.2 || blocked(x, z, 2) || nearPearl(x, z, 5)) return;
      if (M.noise2(x * 0.045, z * 0.045, 31) < 0.4) return;
      kelpAt(x, z, h);
    });
    scatter(2200, 0, 0, 285, (x, z, h, s) => {
      if (s > 0.2 || h > -14 || h < -42 || blocked(x, z, 3) || nearPearl(x, z, 5)) return;
      if (zw(x, z, Z.recife, 0.6) > 0.3 || zw(x, z, Z.naufragio, 0.85) > 0 || zw(x, z, Z.ruinas, 0.75) > 0) return;
      if (M.noise2(x * 0.03, z * 0.03, 37) < 0.64) return;
      kelpAt(x, z, h);
    });

    // capim-marinho
    const grassAt = (x, z, h) => add('grass', x, h - 0.05, z, 0.6 + R() * 0.9, R() * TAU, 0.8 + R() * 0.5, R() * TAU, 0.75 + R() * 0.4, 0.85 + R() * 0.3, 0.7 + R() * 0.4);
    scatter(7500, Z.pradaria.x, Z.pradaria.z, 72, (x, z, h, s) => {
      if (s < 0.15 && M.noise2(x * 0.06, z * 0.06, 43) > 0.3) grassAt(x, z, h);
    });
    scatter(1600, Z.recife.x, Z.recife.z, 88, (x, z, h, s) => {
      if (s < 0.15 && M.noise2(x * 0.07, z * 0.07, 43) > 0.55) grassAt(x, z, h);
    });
    scatter(3500, 0, 0, 285, (x, z, h, s) => {
      if (s < 0.15 && h > -36 && !blocked(x, z, 0) && M.noise2(x * 0.04, z * 0.04, 47) > 0.6) grassAt(x, z, h);
    });

    // corais
    const PAL = [[1, 0.42, 0.3], [1, 0.38, 0.58], [0.95, 0.3, 0.75], [0.62, 0.38, 0.95], [1, 0.82, 0.28], [0.3, 0.85, 0.78], [0.55, 0.9, 0.35], [1, 0.55, 0.2], [0.88, 0.9, 1], [0.35, 0.6, 1]];
    const coralAt = (x, z, h, k) => {
      const c = jit(PAL[(R() * PAL.length) | 0], 0.15), r = R(), yaw = R() * TAU, ph = R() * TAU;
      if (r < 0.24) add('coralBranch', x, h, z, (1.2 + R() * 2) * k, yaw, 0.85 + R() * 0.4, ph, c[0], c[1], c[2]);
      else if (r < 0.44) add('coralBrain', x, h, z, (0.7 + R() * 1.6) * k, yaw, 0.7 + R() * 0.5, ph, c[0], c[1], c[2]);
      else if (r < 0.58) add('coralTable', x, h, z, (1.2 + R() * 1.6) * k, yaw, 0.8 + R() * 0.6, ph, c[0], c[1], c[2]);
      else if (r < 0.74) add('sponge', x, h, z, (0.9 + R() * 1.1) * k, yaw, 0.9 + R() * 0.6, ph, c[0], c[1], c[2]);
      else if (r < 0.88) add('fan', x, h, z, (1.1 + R() * 1.5) * k, yaw, 1, ph, c[0], c[1], c[2]);
      else add('anemone', x, h, z, (0.7 + R() * 0.8) * k, yaw, 1, ph, c[0], c[1], c[2]);
    };
    scatter(2800, Z.recife.x, Z.recife.z, 88, (x, z, h, s) => {
      if (s > 0.3 || nearPearl(x, z, 2.5) || M.fbm2(x * 0.05, z * 0.05, 2, 41) < 0.45) return;
      coralAt(x, z, h, 1);
    });
    scatter(220, WR.x, WR.z, 34, (x, z, h, s) => {
      if (s < 0.3 && !blocked(x, z, 0.5) && !nearPearl(x, z, 2.5)) coralAt(x, z, h, 0.8);
    });
    scatter(240, RU.x, RU.z, 42, (x, z, h, s) => {
      if (s < 0.3 && !blocked(x, z, 0.5) && !nearPearl(x, z, 2.5)) coralAt(x, z, h, 0.8);
    });
    scatter(1200, 0, 0, 285, (x, z, h, s) => {
      if (s < 0.3 && h > -36 && !blocked(x, z, 1) && !nearPearl(x, z, 2.5) && M.fbm2(x * 0.04, z * 0.04, 2, 53) > 0.6) coralAt(x, z, h, 0.9);
    });

    // rochas
    const rockAt = (x, z, h, sc, hs) => {
      const t = 0.75 + R() * 0.4, w = (R() - 0.5) * 0.12, y = h - sc * 0.2;
      add(R() < 0.5 ? 'rockA' : 'rockB', x, y, z, sc, R() * TAU, hs, 0, t + w, t, t - w);
      if (sc > 1.6) put({ x: x, y: y, z: z, r: sc * 0.82, ry: sc * 0.55 * hs });
    };
    scatter(1700, 0, 0, 290, (x, z, h, s) => {
      if (blocked(x, z, 3) || nearPearl(x, z, 4)) return;
      if (M.noise2(x * 0.03, z * 0.03, 51) < 0.5 && s < 0.2) return;
      rockAt(x, z, h, 0.5 + R() * R() * 3.4, 0.8 + R() * 0.5);
    });
    scatter(600, Z.recife.x, Z.recife.z, 88, (x, z, h) => {
      if (!nearPearl(x, z, 1.5)) rockAt(x, z, h, 0.2 + R() * 0.5, 0.8 + R() * 0.4);
    });
    // pináculos
    const pinnacle = (x, z, h) => {
      if (blocked(x, z, 6) || nearPearl(x, z, 8)) return;
      const sc = 3 + R() * 3.5, hs = Math.min(2 + R() * 2.4, (-h - 3) / (sc * 1.25));
      if (hs < 1.2) return;
      const t = 0.7 + R() * 0.3, y = h + 0.3 * hs * sc * 0.7;
      add('rockA', x, y, z, sc, R() * TAU, hs, 0, t, t, t * 1.05);
      put({ x: x, y: y, z: z, r: sc * 0.85, ry: sc * 0.62 * hs });
    };
    for (let i = 0; i < 70; i++) {
      const a = R() * TAU, f = 0.95 + R() * 0.7, x = Z.fossa.x + Math.cos(a) * Z.fossa.r * f * 0.8, z = Z.fossa.z + Math.sin(a) * Z.fossa.rz * f;
      if (Math.hypot(x, z) < 280) pinnacle(x, z, W.heightAt(x, z));
    }
    scatter(45, 100, 30, 42, pinnacle);
    scatter(50, 0, 0, 270, (x, z, h) => {
      if (h < -20 && zw(x, z, Z.naufragio, 0.8) < 0.1) pinnacle(x, z, h);
    });

    // estrelas-do-mar
    const SPAL = [[1, 0.5, 0.2], [0.95, 0.25, 0.25], [0.7, 0.4, 0.95], [0.3, 0.55, 1], [1, 0.75, 0.3]];
    const starAt = (x, z, h, s) => {
      if (s > 0.1 || blocked(x, z, 0)) return;
      const c = SPAL[(R() * SPAL.length) | 0];
      add('starfish', x, h + 0.02, z, 0.22 + R() * 0.25, R() * TAU, 1, 0, c[0], c[1], c[2]);
    };
    scatter(800, Z.recife.x, Z.recife.z, 90, starAt);
    scatter(400, Z.pradaria.x, Z.pradaria.z, 70, starAt);
    scatter(700, 0, 0, 280, starAt);

    // plantas luminosas da fossa
    const GPAL = [[0.2, 0.9, 1], [0.6, 0.4, 1], [0.3, 1, 0.6], [0.2, 0.6, 1]];
    scatter(1500, Z.fossa.x, Z.fossa.z, 105, (x, z, h, s) => {
      if (h > -44 || s > 0.45 || nearPearl(x, z, 2)) return;
      const c = GPAL[(R() * GPAL.length) | 0];
      add('bulb', x, h - 0.05, z, 0.9 + R() * 2.4, R() * TAU, 1, R() * TAU, c[0], c[1], c[2], 1.3 + R() * 0.8);
    });

    // organiza por células para desenhar só o que está por perto
    W.inst = {};
    W.cells = [];
    for (let cz = 0; cz < IGRID; cz++) {
      for (let cx = 0; cx < IGRID; cx++) W.cells.push({ x: -SIZE + (cx + 0.5) * ICELL, z: -SIZE + (cz + 0.5) * ICELL, rad: ICELL * 0.7072 });
    }
    for (const type in inst) {
      const list = inst[type], buckets = [];
      for (const it of list) {
        const cx = clamp(Math.floor((it[0] + SIZE) / ICELL), 0, IGRID - 1), cz = clamp(Math.floor((it[2] + SIZE) / ICELL), 0, IGRID - 1);
        (buckets[cz * IGRID + cx] || (buckets[cz * IGRID + cx] = [])).push(it);
      }
      const data = new Float32Array(list.length * 12), cells = [];
      let o = 0;
      for (let c = 0; c < IGRID * IGRID; c++) {
        if (!buckets[c]) continue;
        cells.push({ cell: c, start: o / 12, count: buckets[c].length });
        for (const it of buckets[c]) {
          data.set(it, o);
          o += 12;
        }
      }
      W.inst[type] = { data, cells, total: list.length };
    }

    // fontes de bolhas no fundo
    W.vents = [[22, 22], [-70, 100], [160, -20], [-40, -150], [-150, 35], [50, 200], [92, 186]].map(v => ({ x: v[0], y: W.heightAt(v[0], v[1]) + 0.2, z: v[1] }));
    W.wreck = WR;
    W.ruins = RU;
    W.spawn = { x: 0, y: W.heightAt(0, 62) + 5, z: 62 };
  };
})();
