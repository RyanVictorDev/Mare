// Maré — todos os modelos 3D são gerados por código (nenhum arquivo externo).
// Formato do vértice: posição(3) normal(3) cor(3) animação(1).
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const M = root.MARE;
  const mixc = M.mixc, norm = M.norm;
  const TAU = Math.PI * 2;

  class Mesh {
    constructor() {
      this.p = [];
      this.c = [];
      this.a = [];
      this.i = [];
    }
    v(x, y, z, col, anim) {
      this.p.push(x, y, z);
      this.c.push(col[0], col[1], col[2]);
      this.a.push(anim || 0);
      return this.p.length / 3 - 1;
    }
    tri(a, b, c) {
      this.i.push(a, b, c);
    }
    quad(a, b, c, d) {
      this.i.push(a, b, c, a, c, d);
    }
    // Copia outro modelo aplicando escala, rotações (rolagem Z, inclinação X, giro Y) e posição.
    append(o, t) {
      t = t || {};
      const s = t.scale === undefined ? [1, 1, 1] : typeof t.scale === 'number' ? [t.scale, t.scale, t.scale] : t.scale;
      const pos = t.pos || [0, 0, 0];
      const cr = Math.cos(t.roll || 0), sr = Math.sin(t.roll || 0);
      const cp = Math.cos(t.pitch || 0), sp = Math.sin(t.pitch || 0);
      const cy = Math.cos(t.yaw || 0), sy = Math.sin(t.yaw || 0);
      const base = this.p.length / 3;
      for (let i = 0; i < o.p.length; i += 3) {
        let x = o.p[i] * s[0], y = o.p[i + 1] * s[1], z = o.p[i + 2] * s[2];
        const x1 = x * cr - y * sr, y1 = x * sr + y * cr;
        const y2 = y1 * cp + z * sp, z2 = -y1 * sp + z * cp;
        x = x1 * cy + z2 * sy;
        z = -x1 * sy + z2 * cy;
        this.p.push(x + pos[0], y2 + pos[1], z + pos[2]);
      }
      for (let i = 0; i < o.c.length; i++) this.c.push(o.c[i]);
      for (let i = 0; i < o.a.length; i++) this.a.push(o.a[i]);
      for (let i = 0; i < o.i.length; i++) this.i.push(o.i[i] + base);
      return this;
    }
    // flat=true: facetado (cada triângulo com sua normal). flat=false: normais suaves, unidas por posição.
    build(flat) {
      const P = this.p, C = this.c, A = this.a, I = this.i;
      const nt = I.length / 3;
      let data, index;
      const faceN = (a, b, c) => {
        const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
        const e1x = P[b * 3] - ax, e1y = P[b * 3 + 1] - ay, e1z = P[b * 3 + 2] - az;
        const e2x = P[c * 3] - ax, e2y = P[c * 3 + 1] - ay, e2z = P[c * 3 + 2] - az;
        return [e1y * e2z - e1z * e2y, e1z * e2x - e1x * e2z, e1x * e2y - e1y * e2x];
      };
      if (flat) {
        data = new Float32Array(nt * 30);
        let o = 0;
        for (let t = 0; t < nt; t++) {
          const n = norm(faceN(I[t * 3], I[t * 3 + 1], I[t * 3 + 2]));
          for (let k = 0; k < 3; k++) {
            const v = I[t * 3 + k];
            data[o++] = P[v * 3]; data[o++] = P[v * 3 + 1]; data[o++] = P[v * 3 + 2];
            data[o++] = n[0]; data[o++] = n[1]; data[o++] = n[2];
            data[o++] = C[v * 3]; data[o++] = C[v * 3 + 1]; data[o++] = C[v * 3 + 2];
            data[o++] = A[v];
          }
        }
        const nv = nt * 3;
        index = nv > 65535 ? new Uint32Array(nv) : new Uint16Array(nv);
        for (let k = 0; k < nv; k++) index[k] = k;
      } else {
        const nv = P.length / 3;
        const acc = new Map();
        const key = v => Math.round(P[v * 3] * 2000) + ',' + Math.round(P[v * 3 + 1] * 2000) + ',' + Math.round(P[v * 3 + 2] * 2000);
        const keys = new Array(nv);
        for (let v = 0; v < nv; v++) {
          keys[v] = key(v);
          if (!acc.has(keys[v])) acc.set(keys[v], [0, 0, 0]);
        }
        for (let t = 0; t < nt; t++) {
          const n = faceN(I[t * 3], I[t * 3 + 1], I[t * 3 + 2]);
          for (let k = 0; k < 3; k++) {
            const s = acc.get(keys[I[t * 3 + k]]);
            s[0] += n[0]; s[1] += n[1]; s[2] += n[2];
          }
        }
        data = new Float32Array(nv * 10);
        for (let v = 0; v < nv; v++) {
          const n = norm(acc.get(keys[v]));
          const o = v * 10;
          data[o] = P[v * 3]; data[o + 1] = P[v * 3 + 1]; data[o + 2] = P[v * 3 + 2];
          data[o + 3] = n[0]; data[o + 4] = n[1]; data[o + 5] = n[2];
          data[o + 6] = C[v * 3]; data[o + 7] = C[v * 3 + 1]; data[o + 8] = C[v * 3 + 2];
          data[o + 9] = A[v];
        }
        index = nv > 65535 ? new Uint32Array(I) : new Uint16Array(I);
      }
      return { data, index, tris: nt };
    }
  }

  // ---------- primitivas ----------

  // Tubo ao longo de um caminho. radii[i] pode ser número ou [raioU, raioV].
  function tube(m, pts, radii, sides, col, anim, opt) {
    opt = opt || {};
    const n = pts.length, rings = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const d = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
      const ref = opt.ref || (Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]);
      const u = norm([ref[1] * d[2] - ref[2] * d[1], ref[2] * d[0] - ref[0] * d[2], ref[0] * d[1] - ref[1] * d[0]]);
      const v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
      const r = radii[i], ru = typeof r === 'number' ? r : r[0], rv = typeof r === 'number' ? r : r[1];
      const ring = [], p = pts[i];
      for (let j = 0; j < sides; j++) {
        const th = (j / sides) * TAU + (opt.twist || 0), c = Math.cos(th), s = Math.sin(th);
        ring.push(
          m.v(
            p[0] + u[0] * c * ru + v[0] * s * rv,
            p[1] + u[1] * c * ru + v[1] * s * rv,
            p[2] + u[2] * c * ru + v[2] * s * rv,
            typeof col === 'function' ? col(i, j, c, s) : col,
            typeof anim === 'function' ? anim(i) : anim || 0
          )
        );
      }
      rings.push(ring);
    }
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < sides; j++) {
        if (opt.skip && opt.skip(i, j)) continue;
        const j2 = (j + 1) % sides;
        m.quad(rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j]);
      }
    }
    const cap = (ring, p, end, ccol) => {
      const c = m.v(p[0], p[1], p[2], ccol, m.a[ring[0]]);
      const dup = ring.map(v => m.v(m.p[v * 3], m.p[v * 3 + 1], m.p[v * 3 + 2], ccol, m.a[v]));
      for (let j = 0; j < sides; j++) {
        const j2 = (j + 1) % sides;
        if (end) m.tri(c, dup[j], dup[j2]);
        else m.tri(c, dup[j2], dup[j]);
      }
    };
    const capCol = k => opt.capCol || (typeof col === 'function' ? col(k, 0, 1, 0) : col);
    if (opt.capEnd) cap(rings[n - 1], pts[n - 1], true, capCol(n - 1));
    if (opt.capStart) cap(rings[0], pts[0], false, capCol(0));
    return rings;
  }

  // Esfera/elipsoide, com deformação opcional por ruído.
  function sphere(m, c, r, segs, rings, col, disp, anim, phi0, phi1) {
    phi0 = phi0 || 0;
    phi1 = phi1 === undefined ? Math.PI : phi1;
    const grid = [];
    for (let i = 0; i <= rings; i++) {
      const ph = phi0 + ((phi1 - phi0) * i) / rings, ny = Math.cos(ph), sr = Math.sin(ph), row = [];
      for (let j = 0; j <= segs; j++) {
        const th = ((j % segs) / segs) * TAU, nx = sr * Math.cos(th), nz = sr * Math.sin(th);
        const d = disp ? disp(nx, ny, nz) : 1;
        row.push(
          m.v(
            c[0] + nx * r[0] * d, c[1] + ny * r[1] * d, c[2] + nz * r[2] * d,
            typeof col === 'function' ? col(nx, ny, nz) : col,
            typeof anim === 'function' ? anim(nx, ny, nz) : anim || 0
          )
        );
      }
      grid.push(row);
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) m.quad(grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]);
    }
  }

  function box(m, c, h, yaw, col, tilt) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt || 0), st = Math.sin(tilt || 0), v = [];
    for (let k = 0; k < 8; k++) {
      let x = (k & 1 ? 1 : -1) * h[0], y = (k & 2 ? 1 : -1) * h[1];
      const z = (k & 4 ? 1 : -1) * h[2];
      const x1 = x * ct - y * st;
      y = x * st + y * ct;
      x = x1;
      v.push(m.v(c[0] + x * cy + z * sy, c[1] + y, c[2] - x * sy + z * cy, typeof col === 'function' ? col(k) : col, 0));
    }
    m.quad(v[0], v[2], v[3], v[1]); m.quad(v[4], v[5], v[7], v[6]);
    m.quad(v[0], v[1], v[5], v[4]); m.quad(v[2], v[6], v[7], v[3]);
    m.quad(v[0], v[4], v[6], v[2]); m.quad(v[1], v[3], v[7], v[5]);
  }

  // ---------- plantas ----------

  // lod=true gera a versão simples, usada só à distância.
  function kelp(lod) {
    const m = new Mesh(), R = M.rng(11), N = lod ? 6 : 13, LS = lod ? 2 : 1, pts = [];
    for (let i = 0; i <= N; i++) {
      const y = i / N;
      pts.push([Math.sin(y * 7.0) * 0.016 * y, y, Math.cos(y * 5.3) * 0.016 * y]);
    }
    const cA = [0.26, 0.22, 0.08], cB = [0.52, 0.47, 0.15], lA = [0.34, 0.36, 0.1], lB = [0.68, 0.7, 0.22];
    const an = y => Math.pow(Math.max(y, 0), 1.4);
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[i + 1], w = 0.007 * (1 - (0.5 * i) / N) * (lod ? 1.5 : 1);
      const c0 = mixc(cA, cB, i / N), c1 = mixc(cA, cB, (i + 1) / N);
      for (let k = 0; k < 2; k++) {
        const dx = k ? w : 0, dz = k ? 0 : w;
        m.quad(
          m.v(a[0] - dx, a[1], a[2] - dz, c0, an(a[1])), m.v(a[0] + dx, a[1], a[2] + dz, c0, an(a[1])),
          m.v(b[0] + dx, b[1], b[2] + dz, c1, an(b[1])), m.v(b[0] - dx, b[1], b[2] - dz, c1, an(b[1]))
        );
      }
    }
    for (let i = lod ? 1 : 2; i <= N; i++) {
      const p = pts[i], nl = i === N ? (lod ? 3 : 4) : 2;
      for (let k = 0; k < nl; k++) {
        const ang = i * 2.4 + (k * TAU) / nl + R() * 0.6, ox = Math.cos(ang), oz = Math.sin(ang);
        const L = (0.1 + R() * 0.06) * (lod ? 1.2 : 1), Wd = (0.009 + R() * 0.005) * LS, rise = 0.015 + R() * 0.03;
        const t = i / N, c0 = mixc(lA, lB, t * 0.6), c1 = mixc(lA, lB, 0.4 + t * 0.6);
        const b0 = m.v(p[0], p[1], p[2], c0, an(p[1]));
        const mx = p[0] + ox * L * 0.45, my = p[1] + rise, mz = p[2] + oz * L * 0.45;
        const m1 = m.v(mx - oz * Wd, my, mz + ox * Wd, c1, an(my)), m2 = m.v(mx + oz * Wd, my, mz - ox * Wd, c1, an(my));
        const tp = m.v(p[0] + ox * L, p[1] - rise * 0.6, p[2] + oz * L, c1, an(p[1]));
        m.tri(b0, m1, m2);
        m.tri(m1, tp, m2);
      }
    }
    return m;
  }

  function grass() {
    const m = new Mesh(), R = M.rng(23), cA = [0.1, 0.28, 0.14], cB = [0.42, 0.78, 0.3];
    for (let b = 0; b < 5; b++) {
      const ang = (b / 5) * TAU + R() * 0.7, ox = Math.cos(ang), oz = Math.sin(ang), px = -oz, pz = ox;
      const h = 0.6 + R() * 0.45, lean = 0.12 + R() * 0.3, w = 0.045 + R() * 0.02, r0 = 0.05 + R() * 0.08;
      let prev = null;
      for (let s = 0; s <= 3; s++) {
        const t = s / 3, d = r0 + lean * t * t, y = h * t, ww = w * (1 - t * 0.85), c = mixc(cA, cB, t), an = t * t;
        if (s < 3) {
          const l = m.v(ox * d - px * ww, y, oz * d - pz * ww, c, an), r = m.v(ox * d + px * ww, y, oz * d + pz * ww, c, an);
          if (prev) m.quad(prev[0], prev[1], r, l);
          prev = [l, r];
        } else {
          m.tri(prev[0], prev[1], m.v(ox * d, y, oz * d, c, an));
        }
      }
    }
    return m;
  }

  // Planta bioluminescente da fossa: haste escura com bulbos que brilham.
  function bulb() {
    const m = new Mesh(), dark = [0.05, 0.07, 0.08], lit = [1, 1, 1];
    const stalk = (pts, r) => tube(m, pts, pts.map((_, i) => r * (1 - (0.5 * i) / pts.length)), 4, dark, i => Math.pow(pts[i][1], 2));
    stalk([[0, 0, 0], [0.05, 0.35, 0], [0.02, 0.7, 0.03], [0, 0.95, 0]], 0.028);
    sphere(m, [0, 1.0, 0], [0.13, 0.15, 0.13], 7, 5, (x, y) => mixc(lit, [0.5, 0.5, 0.5], Math.max(0, -y)), null, 1);
    stalk([[0.03, 0.3, 0], [0.18, 0.5, 0.05], [0.24, 0.62, 0.06]], 0.016);
    sphere(m, [0.25, 0.66, 0.06], [0.07, 0.08, 0.07], 6, 4, lit, null, 0.45);
    stalk([[0.03, 0.5, 0.01], [-0.12, 0.66, -0.08], [-0.17, 0.78, -0.1]], 0.016);
    sphere(m, [-0.18, 0.82, -0.1], [0.06, 0.07, 0.06], 6, 4, lit, null, 0.65);
    return m;
  }

  // ---------- corais ----------

  function coralBranch() {
    const m = new Mesh(), R = M.rng(31), cBase = [0.5, 0.46, 0.46], cTip = [1.05, 1.05, 1.05];
    function br(p, d, len, rad, depth, gen) {
      const e = [p[0] + d[0] * len, p[1] + d[1] * len, p[2] + d[2] * len];
      const c0 = mixc(cBase, cTip, gen / 3), c1 = mixc(cBase, cTip, (gen + 1) / 3);
      if (depth === 0) {
        const tp = [e[0] + d[0] * rad * 1.5, e[1] + d[1] * rad * 1.5, e[2] + d[2] * rad * 1.5];
        tube(m, [p, tp], [rad, rad * 0.3], 4, i => (i ? c1 : c0));
        return;
      }
      tube(m, [p, e], [rad, rad * 0.75], 4, i => (i ? c1 : c0));
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * TAU + R() * 1.2, sp = 0.55 + R() * 0.45;
        br(e, norm([d[0] + Math.cos(a) * sp, d[1] + 0.25, d[2] + Math.sin(a) * sp]), len * (0.62 + R() * 0.2), rad * 0.72, depth - 1, gen + 1);
      }
    }
    br([0, -0.05, 0], norm([0.15, 1, 0.1]), 0.3, 0.06, 2, 0);
    br([0.03, -0.05, 0.02], norm([-0.5, 1, -0.35]), 0.24, 0.05, 2, 0);
    return m;
  }

  function coralBrain() {
    const m = new Mesh();
    sphere(
      m, [0, 0.12, 0], [0.5, 0.42, 0.5], 10, 6,
      (x, y, z) => {
        const g = Math.abs(Math.sin(M.noise3(x * 2.2 + 5, y * 2.2, z * 2.2) * 22));
        const k = 0.62 + 0.4 * g;
        return [k, k, k];
      },
      (x, y, z) => 0.85 + 0.3 * M.noise3(x * 1.6, y * 1.6 + 9, z * 1.6)
    );
    return m;
  }

  function coralTable() {
    const m = new Mesh(), cD = [0.55, 0.5, 0.48], cL = [1, 1, 1];
    tube(m, [[0, -0.05, 0], [0.02, 0.36, 0]], [0.08, 0.05], 5, cD);
    const S = 14, radii = [0.2, 0.4, 0.52];
    const c0 = m.v(0.02, 0.36, 0, cD, 0);
    let prev = null;
    for (let k = 0; k < radii.length; k++) {
      const ring = [];
      for (let j = 0; j < S; j++) {
        const th = (j / S) * TAU, r = radii[k] * (1 + (k === 2 ? 0.1 * Math.sin(th * 5) : 0));
        ring.push(m.v(0.02 + Math.cos(th) * r, 0.36 + r * r * 0.35, Math.sin(th) * r, mixc(cD, cL, (k + 1) / 3), 0));
      }
      for (let j = 0; j < S; j++) {
        const j2 = (j + 1) % S;
        if (!prev) m.tri(c0, ring[j2], ring[j]);
        else m.quad(prev[j], prev[j2], ring[j2], ring[j]);
      }
      prev = ring;
    }
    return m;
  }

  function sponge() {
    const m = new Mesh(), R = M.rng(47), cA = [0.6, 0.6, 0.6], cB = [1, 1, 1], hole = [0.12, 0.1, 0.1];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + R(), d = k ? 0.12 + R() * 0.12 : 0, h = 0.45 + R() * 0.5, r = 0.08 + R() * 0.04;
      const bx = Math.cos(a) * d, bz = Math.sin(a) * d, lx = Math.cos(a) * 0.12, lz = Math.sin(a) * 0.12;
      const pts = [[bx, -0.05, bz], [bx + lx * 0.3, h * 0.4, bz + lz * 0.3], [bx + lx * 0.7, h * 0.8, bz + lz * 0.7], [bx + lx, h, bz + lz]];
      tube(m, pts, [r * 0.7, r, r * 1.08, r * 0.92], 5, i => mixc(cA, cB, i / 3));
      // disco escuro perto da borda sugere o buraco do tubo
      const cx = bx + lx * 0.9, cy = h * 0.93, cz = bz + lz * 0.9, c0 = m.v(cx, cy, cz, hole, 0), ring = [];
      for (let j = 0; j < 5; j++) ring.push(m.v(cx + Math.cos((j / 5) * TAU) * r * 0.95, cy, cz + Math.sin((j / 5) * TAU) * r * 0.95, hole, 0));
      for (let j = 0; j < 5; j++) m.tri(c0, ring[(j + 1) % 5], ring[j]);
    }
    return m;
  }

  // Gorgônia: leque plano e ramificado.
  function fan() {
    const m = new Mesh(), R = M.rng(53), cA = [0.55, 0.5, 0.5], cB = [1.05, 1.05, 1.05];
    function br(x, y, ang, len, w, depth) {
      const ex = x + Math.sin(ang) * len, ey = y + Math.cos(ang) * len, px = Math.cos(ang), py = -Math.sin(ang);
      const z0 = Math.sin(y * 9) * 0.02, z1 = Math.sin(ey * 9) * 0.02, w1 = w * 0.7;
      const c0 = mixc(cA, cB, Math.min(1, y)), c1 = mixc(cA, cB, Math.min(1, ey));
      m.quad(
        m.v(x - px * w, y - py * w, z0, c0, y * y), m.v(x + px * w, y + py * w, z0, c0, y * y),
        m.v(ex + px * w1, ey + py * w1, z1, c1, ey * ey), m.v(ex - px * w1, ey - py * w1, z1, c1, ey * ey)
      );
      if (depth > 0) {
        const n = depth > 2 ? 3 : 2;
        for (let k = 0; k < n; k++) br(ex, ey, ang + (k / (n - 1) - 0.5) * (0.9 + R() * 0.5) + (R() - 0.5) * 0.2, len * (0.68 + R() * 0.15), w1, depth - 1);
      }
    }
    br(0, -0.05, 0, 0.26, 0.022, 4);
    return m;
  }

  function anemone() {
    const m = new Mesh(), R = M.rng(59), cA = [0.5, 0.45, 0.45], cB = [1.1, 1.1, 1.1];
    sphere(m, [0, 0.02, 0], [0.24, 0.16, 0.24], 8, 3, cA, null, 0, 0, Math.PI * 0.55);
    for (let k = 0; k < 15; k++) {
      const a = (k / 15) * TAU + R() * 0.3, rr = 0.06 + R() * 0.15, ox = Math.cos(a), oz = Math.sin(a), px = -oz, pz = ox;
      const h = 0.3 + R() * 0.25, out = 0.08 + R() * 0.18, w = 0.027;
      let prev = null;
      for (let s = 0; s <= 3; s++) {
        const t = s / 3, d = rr + out * t, y = 0.12 + h * t, ww = w * (1 - t * 0.6), c = mixc(cA, cB, t);
        const l = m.v(ox * d - px * ww, y, oz * d - pz * ww, c, t), r = m.v(ox * d + px * ww, y, oz * d + pz * ww, c, t);
        if (prev) m.quad(prev[0], prev[1], r, l);
        prev = [l, r];
      }
    }
    return m;
  }

  function starfish() {
    const m = new Mesh(), c = m.v(0, 0.14, 0, [1, 1, 1], 0), ring = [];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU, r = k % 2 ? 0.36 : 1;
      ring.push(m.v(Math.cos(a) * r, 0, Math.sin(a) * r, k % 2 ? [0.8, 0.8, 0.8] : [0.6, 0.6, 0.6], 0));
    }
    for (let k = 0; k < 10; k++) m.tri(c, ring[(k + 1) % 10], ring[k]);
    return m;
  }

  function rock(seed, sq) {
    const m = new Mesh(), cA = [0.44, 0.42, 0.4], cB = [0.27, 0.28, 0.3], cAlg = [0.3, 0.42, 0.27];
    sphere(
      m, [0, 0, 0], [1, sq, 1], 8, 5,
      (x, y, z) => mixc(mixc(cA, cB, M.noise3(x * 2 + seed, y * 2, z * 2)), cAlg, Math.max(0, y) * 0.7 * M.noise3(x * 3, y * 3 + seed, z * 3)),
      (x, y, z) => 0.62 + 0.75 * M.noise3(x * 1.3 + seed * 3.7, y * 1.3, z * 1.3)
    );
    return m;
  }

  function clam() {
    const m = new Mesh(), cA = [0.95, 0.86, 0.84], cB = [0.72, 0.6, 0.62], RIBS = 10, LV = 3;
    const half = (open, flip) => {
      const co = Math.cos(open), so = Math.sin(open), hinge = m.v(0, 0.02, -0.4, cB, 0);
      let prev = null;
      for (let l = 1; l <= LV; l++) {
        const t = l / LV, row = [];
        for (let j = 0; j <= RIBS; j++) {
          const a = (j / RIBS - 0.5) * 2.5, r = t * 0.85 * (1 + (l === LV ? 0.06 * Math.cos(j * Math.PI) : 0));
          const lx = Math.sin(a) * r, lz = Math.cos(a) * r, ly = Math.sin(t * Math.PI * 0.62) * 0.2 * flip;
          row.push(m.v(lx, 0.02 + ly * co + lz * so, -0.4 + lz * co - ly * so, mixc(j % 2 ? cA : cB, cA, t * 0.5), 0));
        }
        for (let j = 0; j < RIBS; j++) {
          if (!prev) m.tri(hinge, row[j], row[j + 1]);
          else m.quad(prev[j], row[j], row[j + 1], prev[j + 1]);
        }
        prev = row;
      }
    };
    half(0.04, -1);
    half(0.95, 1);
    return m;
  }

  function pearl() {
    const m = new Mesh();
    sphere(m, [0, 0, 0], [0.5, 0.5, 0.5], 12, 8, (x, y) => mixc([0.9, 0.86, 0.9], [1, 0.98, 0.94], y * 0.5 + 0.5));
    return m;
  }

  // ---------- criaturas (nariz em +z) ----------

  function fish(disc) {
    const m = new Mesh(), ry = disc ? 0.2 : 0.11, rx = disc ? 0.045 : 0.062;
    const zs = [0.5, 0.42, 0.24, 0.02, -0.2, -0.36], k = [0.04, 0.55, 0.95, 1, 0.62, 0.2];
    const pts = zs.map(z => [0, 0, z]), radii = k.map(v => [rx * v, ry * v]);
    tube(m, pts, radii, 6, (i, j, c, s) => {
      let b = 0.95 - 0.38 * s;
      if (disc && (i === 2 || i === 4)) b *= 0.45;
      return [b, b, b];
    });
    const f = [0.62, 0.62, 0.66];
    const T = [m.v(0, 0, -0.33, f, 0), m.v(0, ry * 1.25, -0.54, f, 0), m.v(0, 0, -0.45, f, 0), m.v(0, -ry * 1.25, -0.54, f, 0)];
    m.tri(T[0], T[1], T[2]);
    m.tri(T[0], T[2], T[3]);
    const dh = disc ? 0.16 : 0.07;
    m.tri(m.v(0, ry * 0.9, 0.16, f, 0), m.v(0, ry + dh, -0.1, f, 0), m.v(0, ry * 0.6, -0.26, f, 0));
    m.tri(m.v(0, -ry * 0.9, 0.02, f, 0), m.v(0, -ry - dh * 0.7, -0.14, f, 0), m.v(0, -ry * 0.6, -0.26, f, 0));
    for (const sd of [-1, 1]) {
      m.tri(m.v(sd * rx * 0.9, -ry * 0.25, 0.2, f, 0), m.v(sd * (rx + 0.09), -ry * 0.5, 0.04, f, 0), m.v(sd * rx * 0.9, -ry * 0.45, 0.08, f, 0));
      const e = [0.04, 0.04, 0.05], ex = sd * rx * 0.74, ey = ry * 0.22, ez = 0.385, s = 0.022;
      m.quad(m.v(ex, ey + s, ez, e, 0), m.v(ex, ey, ez + s, e, 0), m.v(ex, ey - s, ez, e, 0), m.v(ex, ey, ez - s, e, 0));
    }
    return m;
  }

  function manta() {
    const m = new Mesh(), NX = 14, rows = [0, 0.12, 0.38, 0.7, 1];
    const top = [0.11, 0.13, 0.18], topL = [0.3, 0.33, 0.4], bot = [0.93, 0.94, 0.96];
    const gT = [], gB = [];
    for (let i = 0; i <= NX; i++) {
      const x = -0.5 + i / NX, ax = Math.abs(x), sp = Math.max(0, 1 - ax * 2);
      const chord = 0.46 * Math.pow(sp, 0.75) + 0.012, zc = -ax * 0.3, cT = [], cB = [];
      for (let r = 0; r < rows.length; r++) {
        const s = rows[r], z = zc + chord * (0.5 - s);
        const th = 0.075 * Math.pow(sp, 1.3) * Math.sin(Math.PI * Math.sqrt(s));
        const sh = M.smooth(0.2, 0.05, Math.abs(ax - 0.14)) * (1 - s);
        cT.push(m.v(x, th, z, mixc(top, topL, sh), 0));
        cB.push(m.v(x, -th * 0.55, z, bot, 0));
      }
      gT.push(cT);
      gB.push(cB);
    }
    for (let i = 0; i < NX; i++) {
      for (let r = 0; r < rows.length - 1; r++) {
        m.quad(gT[i][r], gT[i + 1][r], gT[i + 1][r + 1], gT[i][r + 1]);
        m.quad(gB[i][r], gB[i][r + 1], gB[i + 1][r + 1], gB[i + 1][r]);
      }
    }
    m.tri(m.v(-0.012, 0, -0.2, top, 0), m.v(0.012, 0, -0.2, top, 0), m.v(0, 0, -0.85, top, 0));
    for (const sd of [-1, 1]) {
      m.tri(m.v(sd * 0.05, 0.01, 0.22, top, 0), m.v(sd * 0.1, 0.01, 0.2, top, 0), m.v(sd * 0.085, -0.03, 0.33, topL, 0));
    }
    return m;
  }

  function turtle() {
    const m = new Mesh(), sk = [0.5, 0.56, 0.36], skD = [0.3, 0.36, 0.24];
    sphere(m, [0, 0, 0], [0.34, 0.15, 0.42], 12, 7, (x, y, z) => {
      if (y < -0.15) return [0.86, 0.8, 0.56];
      const g = Math.abs(Math.sin(M.noise3(x * 2.5, y * 2.5 + 3, z * 2.5) * 16));
      return mixc([0.26, 0.2, 0.1], [0.56, 0.44, 0.2], g);
    });
    sphere(m, [0, 0.02, 0.5], [0.085, 0.075, 0.12], 8, 5, (x, y) => mixc(skD, sk, y * 0.5 + 0.5));
    tube(m, [[0, 0, 0.36], [0, 0.015, 0.46]], [[0.07, 0.055], [0.06, 0.05]], 6, skD);
    for (const sd of [-1, 1]) {
      const P = [[0.26, 0, 0.26, 0.13, 0], [0.5, 0.01, 0.2, 0.12, 0.35], [0.74, 0.01, 0.05, 0.085, 0.75], [0.92, 0, -0.14, 0.015, 1]];
      let prev = null;
      for (const q of P) {
        const a = m.v(sd * q[0], q[1], q[2] + q[3], mixc(skD, sk, q[4]), q[4]), b = m.v(sd * q[0], q[1], q[2] - q[3], skD, q[4]);
        if (prev) m.quad(prev[0], prev[1], b, a);
        prev = [a, b];
      }
      m.tri(m.v(sd * 0.2, -0.02, -0.3, skD, 0), m.v(sd * 0.36, -0.02, -0.6, sk, 0.3), m.v(sd * 0.12, -0.02, -0.46, skD, 0.1));
    }
    m.tri(m.v(-0.03, 0, -0.4, skD, 0), m.v(0.03, 0, -0.4, skD, 0), m.v(0, 0, -0.52, skD, 0));
    return m;
  }

  function whale() {
    const m = new Mesh(), back = [0.17, 0.22, 0.3], belly = [0.82, 0.85, 0.88];
    const zs = [0.5, 0.47, 0.4, 0.27, 0.12, -0.04, -0.2, -0.33, -0.42, -0.48];
    const rr = [[0.012, 0.012], [0.05, 0.042], [0.085, 0.075], [0.105, 0.098], [0.11, 0.106], [0.1, 0.1], [0.078, 0.084], [0.048, 0.058], [0.022, 0.032], [0.01, 0.014]];
    tube(m, zs.map(z => [0, 0, z]), rr, 12, (i, j, c, s) => {
      const groove = i < 5 && s < -0.2 ? 0.85 + 0.15 * (j % 2) : 1;
      return mixc(back, belly, M.smooth(-0.1, -0.75, s) * (i < 7 ? 1 : 0.4)).map(v => v * groove);
    });
    const fl = [m.v(0, 0, -0.45, back, 0), m.v(-0.1, 0, -0.5, back, 0), m.v(-0.2, 0, -0.6, back, 0), m.v(0, 0, -0.54, back, 0), m.v(0.2, 0, -0.6, back, 0), m.v(0.1, 0, -0.5, back, 0)];
    m.tri(fl[0], fl[1], fl[3]); m.tri(fl[1], fl[2], fl[3]); m.tri(fl[0], fl[3], fl[5]); m.tri(fl[5], fl[3], fl[4]);
    for (const sd of [-1, 1]) {
      const a = m.v(sd * 0.085, -0.05, 0.27, back, 0), b = m.v(sd * 0.09, -0.05, 0.2, back, 0);
      const c = m.v(sd * 0.3, -0.13, 0.0, belly, 0), d = m.v(sd * 0.24, -0.1, 0.13, belly, 0);
      m.quad(a, b, c, d);
    }
    m.tri(m.v(0, 0.098, -0.1, back, 0), m.v(0, 0.125, -0.17, back, 0), m.v(0, 0.088, -0.21, back, 0));
    return m;
  }

  // Golfinho pequeno: o shader da baleia mexe a cauda (que fica em z negativo).
  function dolphin() {
    const m = new Mesh(), back = [0.42, 0.52, 0.6], belly = [0.84, 0.88, 0.9], fin = [0.34, 0.44, 0.52];
    const zs = [0.52, 0.44, 0.28, 0.06, -0.16, -0.32, -0.42];
    const rr = [[0.018, 0.014], [0.05, 0.038], [0.09, 0.072], [0.1, 0.082], [0.072, 0.064], [0.04, 0.038], [0.016, 0.014]];
    tube(m, zs.map(z => [0, 0, z]), rr, 7, (i, j, c, s) => mixc(back, belly, M.smooth(0.15, -0.7, s)));
    m.tri(m.v(0, 0, -0.38, back, 0), m.v(-0.18, 0, -0.58, fin, 0), m.v(0, 0, -0.5, back, 0));
    m.tri(m.v(0, 0, -0.38, back, 0), m.v(0, 0, -0.5, back, 0), m.v(0.18, 0, -0.58, fin, 0));
    m.tri(m.v(0, 0.08, 0.02, fin, 0), m.v(0, 0.22, -0.06, fin, 0), m.v(0, 0.06, -0.16, fin, 0));
    for (const sd of [-1, 1]) {
      m.tri(m.v(sd * 0.07, -0.02, 0.14, fin, 0), m.v(sd * 0.24, -0.06, -0.02, belly, 0), m.v(sd * 0.05, -0.02, -0.02, fin, 0));
      const e = [0.06, 0.07, 0.08], ex = sd * 0.045, ey = 0.02, ez = 0.4, s = 0.012;
      m.quad(m.v(ex, ey + s, ez, e, 0), m.v(ex, ey, ez + s, e, 0), m.v(ex, ey - s, ez, e, 0), m.v(ex, ey, ez - s, e, 0));
    }
    return m;
  }

  // Gaivota: as pontas das asas têm animação 1, e o shader as faz bater.
  // A asa tem área de cima e de lado, senão de perfil ela some.
  function gull() {
    const m = new Mesh();
    const body = [0.96, 0.96, 0.97], wing = [0.9, 0.91, 0.93], tip = [0.42, 0.44, 0.48], beak = [0.95, 0.62, 0.22];
    tube(m, [[0, 0, -0.16], [0, 0.02, 0.05], [0, 0.035, 0.24], [0, 0.03, 0.36]], [[0.055, 0.05], [0.08, 0.065], [0.05, 0.045], [0.02, 0.018]], 6, body);
    for (const sd of [-1, 1]) {
      const a = m.v(sd * 0.06, 0.04, 0.14, wing, 0.12);
      const b = m.v(sd * 0.05, 0.03, -0.14, wing, 0.12);
      const c = m.v(sd * 0.5, 0.07, -0.18, wing, 0.65);
      const d = m.v(sd * 0.52, 0.08, 0.08, wing, 0.65);
      const e = m.v(sd * 0.98, 0.1, -0.02, tip, 1);
      m.quad(a, d, c, b);
      m.tri(d, e, c);
    }
    m.tri(m.v(0, 0.03, -0.14, body, 0.25), m.v(-0.13, 0.05, -0.4, tip, 0.6), m.v(0.13, 0.05, -0.4, tip, 0.6));
    m.tri(m.v(0, 0.09, 0.32, body, 0), m.v(-0.035, 0.04, 0.24, body, 0), m.v(0.035, 0.04, 0.24, body, 0));
    m.tri(m.v(-0.014, 0.045, 0.34, beak, 0), m.v(0.014, 0.045, 0.34, beak, 0), m.v(0, 0.04, 0.52, beak, 0));
    return m;
  }

  function jelly() {
    const m = new Mesh(), S = 12, K = 5, rows = [];
    for (let k = 0; k <= K; k++) {
      const ph = (k / K) * Math.PI * 0.56, r = Math.sin(ph) * 0.52, y = Math.cos(ph) * 0.42, row = [], b = 0.3 + 0.7 * Math.pow(k / K, 1.5);
      for (let j = 0; j < S; j++) {
        const th = (j / S) * TAU;
        row.push(m.v(Math.cos(th) * r, y, Math.sin(th) * r, [b, b, b], 0));
      }
      rows.push(row);
    }
    for (let k = 0; k < K; k++) {
      for (let j = 0; j < S; j++) m.quad(rows[k][j], rows[k][(j + 1) % S], rows[k + 1][(j + 1) % S], rows[k + 1][j]);
    }
    const y0 = Math.cos(Math.PI * 0.56) * 0.42;
    const ribbon = (bx, bz, len, w, bright) => {
      const a = Math.atan2(bz, bx), px = -Math.sin(a) * w, pz = Math.cos(a) * w;
      let prev = null;
      for (let s = 0; s <= 5; s++) {
        const t = s / 5, y = y0 - t * len, b = bright * (1 - t * 0.75), ww = 1 - t * 0.6;
        const l = m.v(bx - px * ww, y, bz - pz * ww, [b, b, b], 0), r = m.v(bx + px * ww, y, bz + pz * ww, [b, b, b], 0);
        if (prev) m.quad(prev[0], prev[1], r, l);
        prev = [l, r];
      }
    };
    for (let k = 0; k < 8; k++) {
      const th = (k / 8) * TAU + 0.2;
      ribbon(Math.cos(th) * 0.42, Math.sin(th) * 0.42, 1.2 + (k % 3) * 0.25, 0.014, 0.6);
    }
    for (let k = 0; k < 4; k++) {
      const th = (k / 4) * TAU;
      ribbon(Math.cos(th) * 0.1, Math.sin(th) * 0.1, 0.75, 0.05, 0.9);
    }
    return m;
  }

  // ---------- naufrágio ----------

  const WRECK_ROLL = 0.3;
  function wreck(info) {
    const R = M.rng(77), hull = new Mesh(), L = 17, NS = 22, NK = 10;
    const wood = [0.66, 0.52, 0.38], woodD = [0.4, 0.32, 0.26], alg = [0.3, 0.5, 0.36];
    const tAt = i => -1 + (2 * i) / NS;
    const bAt = t => (t > 0 ? 3.6 * Math.pow(Math.max(0, 1 - Math.pow(t, 2.2)), 0.6) + 0.12 : 3.6 * (1 - 0.5 * Math.pow(-t, 3)));
    const dAt = t => 5.2 * (1 - 0.3 * t * t) - (t > 0.6 ? (t - 0.6) * 4 : 0);
    const castle = t => (t < -0.5 ? 1.7 : 0);
    const gAt = t => 0.9 + 1.3 * t * t + castle(t);
    const deckAt = t => gAt(t) - 0.85;
    const sp = (t, k, inset) => {
      const th = (k / NK) * Math.PI, b = bAt(t) * (inset || 1), g = gAt(t), d = dAt(t) * (inset || 1);
      return [-b * Math.cos(th), g - (g + d) * Math.pow(Math.sin(th), 0.7), t * L];
    };
    const wcol = (i, k) => {
      const sh = 0.72 + 0.28 * (((k * 7 + i * 3) % 5) / 4);
      const a = M.noise2(i * 0.6, k * 0.9, 5);
      return mixc(mixc([wood[0] * sh, wood[1] * sh, wood[2] * sh], woodD, Math.sin((k / NK) * Math.PI) * 0.45), alg, a * 0.6);
    };
    const inBreach = t => t > -0.32 && t < 0.2;
    // casco
    const grid = [];
    for (let i = 0; i <= NS; i++) {
      const row = [];
      for (let k = 0; k <= NK; k++) {
        const p = sp(tAt(i), k);
        row.push(hull.v(p[0], p[1], p[2], wcol(i, k), 0));
      }
      grid.push(row);
    }
    for (let i = 0; i < NS; i++) {
      const t = tAt(i + 0.5);
      for (let k = 0; k < NK; k++) {
        const r = R();
        if (inBreach(t) && k >= 6 && k <= 8 && r > 0.15) continue;
        if ((k === 0 || k === NK - 1) && r < 0.22) continue;
        if (r < 0.035) continue;
        hull.quad(grid[i][k], grid[i][k + 1], grid[i + 1][k + 1], grid[i + 1][k]);
      }
    }
    // cavernas (costelas) à mostra no rombo
    for (let i = 0; i <= NS; i++) {
      const t = tAt(i);
      if (t < -0.36 || t > 0.24) continue;
      const pts = [];
      for (let k = 5; k <= NK; k++) pts.push(sp(t, k, 0.94));
      tube(hull, pts, pts.map(() => 0.12), 4, woodD, 0, { ref: [0, 0, 1] });
    }
    // quilha
    const kp = [];
    for (let i = 0; i <= NS; i += 2) kp.push([0, -dAt(tAt(i)) - 0.1, tAt(i) * L]);
    tube(hull, kp, kp.map(() => 0.26), 4, woodD, 0, { ref: [1, 0, 0] });
    // convés
    const spans = [];
    for (let i = 0; i < NS; i++) {
      const t0 = tAt(i), t1 = tAt(i + 1);
      if (t0 < -0.5 && t1 > -0.5) spans.push([t0, -0.5001], [-0.4999, t1]);
      else spans.push([t0, t1]);
    }
    for (let i = 0; i < spans.length; i++) {
      const t0 = spans[i][0], t1 = spans[i][1], tm = (t0 + t1) / 2;
      const b0 = bAt(t0) * 0.93, b1 = bAt(t1) * 0.93, y0 = deckAt(t0), y1 = deckAt(t1);
      for (let s = 0; s < 6; s++) {
        const r = R();
        if (r < 0.1 || (inBreach(tm) && s >= 3 && r < 0.85)) continue;
        const f0 = -1 + s / 3, f1 = -1 + (s + 1) / 3, sh = 0.75 + 0.25 * ((s + i) % 3) * 0.5;
        const c = mixc([wood[0] * sh, wood[1] * sh, wood[2] * sh], alg, M.noise2(i * 0.7, s * 1.3, 9) * 0.5);
        hull.quad(hull.v(b0 * f0, y0, t0 * L, c, 0), hull.v(b0 * f1, y0, t0 * L, c, 0), hull.v(b1 * f1, y1, t1 * L, c, 0), hull.v(b1 * f0, y1, t1 * L, c, 0));
      }
    }
    // parede do castelo de popa, com vão de porta
    {
      const t = -0.5, z = t * L, b = bAt(t) * 0.93, yl = deckAt(-0.49), yh = deckAt(-0.51);
      const wall = (x0, x1, ya, yb) => hull.quad(hull.v(x0, ya, z, wood, 0), hull.v(x1, ya, z, wood, 0), hull.v(x1, yb, z, woodD, 0), hull.v(x0, yb, z, woodD, 0));
      wall(-b, -0.7, yl, yh + 0.9);
      wall(0.7, b, yl, yh + 0.9);
      wall(-0.7, 0.7, yh - 0.1, yh + 0.9);
    }
    // espelho de popa
    {
      const g = gAt(-1), c = hull.v(0, g * 0.3 - 1.2, -L, woodD, 0);
      for (let k = 0; k < NK; k++) {
        const a = sp(-1, k), b = sp(-1, k + 1);
        hull.tri(c, hull.v(a[0], a[1], a[2], wcol(0, k), 0), hull.v(b[0], b[1], b[2], wcol(0, k + 1), 0));
      }
      hull.quad(hull.v(0, -4.6, -L - 0.1, woodD, 0), hull.v(0, -0.8, -L - 0.1, wood, 0), hull.v(0, -0.8, -L - 1.5, wood, 0), hull.v(0, -4.9, -L - 1.3, woodD, 0));
    }
    // mastros
    const mast = (x, y, z, h, lean, r, yardH, yardW) => {
      const top = [x + lean, y + h, z + lean * 0.4];
      tube(hull, [[x, y, z], top], [r, r * 0.6], 6, i => (i ? wood : woodD), 0, { capEnd: true });
      if (yardH) {
        const f = yardH / h, cx = x + lean * f, cy = y + yardH, cz = z + lean * 0.4 * f;
        tube(hull, [[cx - yardW, cy - 0.3, cz], [cx + yardW, cy + 0.3, cz]], [0.15, 0.13], 5, woodD, 0, { capEnd: true, capStart: true });
      }
    };
    mast(0, deckAt(0.1), 1.7, 17, -0.9, 0.36, 11.5, 5.5);
    tube(hull, [[-0.68, deckAt(0.1) + 13, 1.34], [-0.7, deckAt(0.1) + 13.3, 1.33]], [1.0, 1.1], 8, woodD, 0, { capEnd: true, capStart: true });
    mast(0, deckAt(-0.65), -11, 9, 0.5, 0.24, 6.5, 3.2);
    mast(0, deckAt(0.53), 9, 3.6, 0.4, 0.32, 0, 0);
    const g95 = gAt(0.93);
    tube(hull, [[0, g95 - 0.3, 15.4], [0, g95 + 2.9, 23.5]], [0.24, 0.1], 5, wood, 0, { capEnd: true });
    // caixotes no convés
    box(hull, [1.3, deckAt(0.25) + 0.5, 4.4], [0.55, 0.5, 0.55], 0.4, woodD);
    box(hull, [-1.5, deckAt(-0.2) + 0.4, -3.2], [0.45, 0.4, 0.6], 1.1, wood);
    box(hull, [0.4, deckAt(0.3) + 0.35, 5.6], [0.35, 0.35, 0.35], 0.9, wood);

    const m = new Mesh().append(hull, { roll: WRECK_ROLL });
    // mastro de proa caído no fundo, a bombordo
    tube(m, [[-5.2, -3.1, 9.5], [-17.5, -3.25, 15.5]], [0.3, 0.17], 6, i => (i ? woodD : wood), 0, { capEnd: true, capStart: true });
    tube(m, [[-12.5, -3.2, 9.6], [-9.6, -2.9, 15.6]], [0.14, 0.14], 5, woodD, 0, { capEnd: true, capStart: true });
    box(m, [8.5, -3.2, -3], [0.6, 0.5, 0.6], 0.5, woodD, 0.2);
    box(m, [10, -3.3, 6.5], [0.45, 0.45, 0.7], 2.1, wood, -0.15);

    // esferas de colisão ao longo do casco (já com a rolagem aplicada)
    const cr = Math.cos(WRECK_ROLL), sr = Math.sin(WRECK_ROLL);
    info.wreck = { spheres: [], seabed: -3.5 };
    for (let t = -0.92; t <= 0.93; t += 0.115) {
      const y = -1.7 + castle(t) * 0.5, r = bAt(t) * 0.82 + 0.35;
      info.wreck.spheres.push([-y * sr, y * cr, t * L, r]);
    }
    return m;
  }

  // ---------- ruínas ----------

  function ruins(info) {
    const R = M.rng(91), m = new Mesh(), cyls = [];
    const stone = [0.72, 0.7, 0.63], alg = [0.3, 0.46, 0.34];
    const sc = () => {
      const k = 0.78 + R() * 0.3;
      return mixc([stone[0] * k, stone[1] * k, stone[2] * k], alg, R() * 0.4);
    };
    const disc = (y0, y1, r, sides) => {
      const cs = [];
      for (let j = 0; j < sides; j++) cs.push(sc());
      tube(m, [[0, y0, 0], [0, y1, 0]], [r, r], sides, (i, j) => cs[j], 0, { capEnd: true, capCol: sc() });
      cyls.push({ x: 0, z: 0, r: r, y0: y0, y1: y1 });
    };
    disc(-2.5, 0.5, 13.5, 24);
    disc(0.5, 1.0, 11.5, 24);
    disc(1.0, 1.5, 9.5, 24);
    const column = (x, y, z, r0, h, broken) => {
      const c1 = sc(), c2 = sc();
      tube(m, [[x, y - 2.5, z], [x, y + 0.3, z]], [r0 * 1.5, r0 * 1.5], 8, c1, 0, { capEnd: true });
      tube(m, [[x, y + 0.3, z], [x, y + 0.55, z]], [r0 * 1.22, r0 * 1.22], 8, c2, 0, { capEnd: true });
      const top = broken ? y + h : y + h - 0.5, lean = broken ? (R() - 0.5) * 0.3 : 0;
      tube(m, [[x, y + 0.55, z], [x + lean * 0.4, (y + 0.55 + top) / 2, z], [x + lean, top, z + lean]], [r0, r0 * 0.93, r0 * 0.86], 10, (i, j) => (j % 2 ? c1 : c2), 0, { capEnd: true });
      if (!broken) {
        tube(m, [[x, top, z], [x, top + 0.25, z]], [r0 * 0.9, r0 * 1.3], 10, c2, 0, {});
        box(m, [x, top + 0.38, z], [r0 * 1.4, 0.13, r0 * 1.4], Math.atan2(x, z), c1);
      }
      cyls.push({ x: x, z: z, r: r0 * 1.3, y0: y - 2.5, y1: y + h });
    };
    // anel de colunas sobre a plataforma
    const NC = 10, RR = 7.7, H = 7.5, state = [0, 0, 3.4, 0, 0, -1, 0, 1.9, 0, 0], tops = [];
    for (let k = 0; k < NC; k++) {
      const a = (k / NC) * TAU + 0.31, x = Math.cos(a) * RR, z = Math.sin(a) * RR;
      tops.push([x, z]);
      if (state[k] < 0) continue;
      column(x, 1.5, z, 0.5, state[k] || H, state[k] > 0);
    }
    for (let k = 0; k < NC; k++) {
      const k2 = (k + 1) % NC;
      if (state[k] !== 0 || state[k2] !== 0 || k === 0) continue;
      const a = tops[k], b = tops[k2], dx = b[0] - a[0], dz = b[1] - a[1];
      box(m, [(a[0] + b[0]) / 2, 1.5 + H + 0.33, (a[1] + b[1]) / 2], [Math.hypot(dx, dz) / 2 + 0.75, 0.32, 0.6], Math.atan2(-dz, dx), sc());
    }
    // coluna tombada, em pedaços, fora da plataforma
    {
      const a = (5 / NC) * TAU + 0.31, ox = Math.cos(a), oz = Math.sin(a), tx = -oz, tz = ox;
      let d = -3.4;
      for (const len of [2.6, 2.1, 1.7]) {
        const x0 = ox * 15.6 + tx * d, z0 = oz * 15.6 + tz * d, c = sc();
        tube(m, [[x0, 0.25, z0], [x0 + tx * len, 0.3 + R() * 0.2, z0 + tz * len]], [0.5, 0.47], 10, c, 0, { capEnd: true, capStart: true });
        d += len + 0.5 + R() * 0.5;
      }
    }
    // altar central
    tube(m, [[0, 1.5, 0], [0, 1.9, 0]], [1.6, 1.6], 8, sc(), 0, { capEnd: true });
    tube(m, [[0, 1.9, 0], [0, 2.9, 0]], [0.85, 0.7], 8, sc(), 0, {});
    tube(m, [[0, 2.9, 0], [0, 3.1, 0]], [1.15, 1.15], 8, sc(), 0, { capEnd: true });
    cyls.push({ x: 0, z: 0, r: 1.5, y0: 1.5, y1: 3.1 });
    // alameda de colunas menores
    for (let k = 0; k < 4; k++) {
      for (const sd of [-1, 1]) {
        const br = R() < 0.45;
        column(sd * 4.6, 0, 18 + k * 7, 0.4, br ? 1.2 + R() * 3 : 5.6, br);
      }
    }
    // blocos espalhados
    for (let k = 0; k < 16; k++) {
      const a = R() * TAU, d = 15 + R() * 15, s = 0.4 + R() * 0.7;
      box(m, [Math.cos(a) * d, s * 0.3 - 0.1, Math.sin(a) * d], [s * (0.8 + R()), s * 0.6, s], R() * 3, sc(), (R() - 0.5) * 0.5);
    }
    info.ruins = { cyls: cyls, altarTop: 3.1 };
    return m;
  }

  // ---------- vida nova e o propulsor (nariz em +z, como os outros) ----------

  function shark() {
    const m = new Mesh(), back = [0.45, 0.5, 0.56], belly = [0.82, 0.84, 0.86];
    const zs = [0.55, 0.42, 0.22, 0, -0.22, -0.4, -0.52];
    const rr = [[0.02, 0.016], [0.07, 0.05], [0.1, 0.07], [0.09, 0.065], [0.06, 0.045], [0.03, 0.025], [0.012, 0.01]];
    tube(m, zs.map(z => [0, 0, z]), rr, 7, (i, j, c, s) => mixc(back, belly, M.smooth(0.2, -0.7, s)));
    m.tri(m.v(0, 0.06, 0.02, back, 0), m.v(0, 0.22, -0.08, back, 0), m.v(0, 0.05, -0.2, back, 0));
    m.tri(m.v(0, 0, -0.46, back, 0), m.v(-0.16, 0.04, -0.68, back, 0), m.v(0, 0, -0.58, back, 0));
    m.tri(m.v(0, 0, -0.46, back, 0), m.v(0, 0, -0.58, back, 0), m.v(0.16, -0.02, -0.68, belly, 0));
    for (const sd of [-1, 1]) {
      m.tri(m.v(sd * 0.06, -0.02, 0.12, back, 0), m.v(sd * 0.28, -0.04, -0.02, belly, 0), m.v(sd * 0.04, -0.02, -0.06, back, 0));
      const e = [0.08, 0.08, 0.09], ex = sd * 0.055, ey = 0.02, ez = 0.4, s = 0.012;
      m.quad(m.v(ex, ey + s, ez, e, 0), m.v(ex, ey, ez + s, e, 0), m.v(ex, ey - s, ez, e, 0), m.v(ex, ey, ez - s, e, 0));
    }
    return m;
  }

  function seahorse() {
    const m = new Mesh(), c = [0.95, 0.62, 0.22], pale = [1, 0.86, 0.55];
    const pts = [];
    for (let i = 0; i <= 7; i++) {
      const t = i / 7;
      pts.push([(t - 0.2) * 0.05, 0.42 - t * 0.78, -0.05 - t * t * 0.42]);
    }
    tube(m, pts, pts.map((_, i) => 0.045 - i * 0.004), 5, (i, j, cs, s) => mixc(c, pale, s * 0.5 + 0.5));
    tube(m, [[0.02, 0.4, -0.04], [0.16, 0.46, 0.08]], [0.03, 0.018], 5, pale);
    m.tri(m.v(0, 0.34, -0.02, c, 0), m.v(-0.08, 0.5, -0.08, c, 0), m.v(0.08, 0.5, -0.08, c, 0));
    return m;
  }

  function octopus() {
    const m = new Mesh(), skin = [0.55, 0.22, 0.28], spot = [0.85, 0.45, 0.32];
    sphere(m, [0, 0.12, 0.05], [0.22, 0.18, 0.2], 8, 6, (x, y) => mixc(skin, spot, M.smooth(-0.2, 0.6, y)));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU, cs = Math.cos(a), sn = Math.sin(a);
      const pts = [];
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        pts.push([cs * (0.12 + t * 0.28), 0.02 - t * t * 0.22, -0.05 - t * 0.55]);
      }
      tube(m, pts, [0.045, 0.04, 0.032, 0.022, 0.012], 4, skin);
    }
    for (const sd of [-1, 1]) {
      const e = [0.15, 0.08, 0.06], ex = sd * 0.08, ey = 0.16, ez = 0.16, s = 0.02;
      m.quad(m.v(ex, ey + s, ez, e, 0), m.v(ex, ey, ez + s, e, 0), m.v(ex, ey - s, ez, e, 0), m.v(ex, ey, ez - s, e, 0));
    }
    return m;
  }

  function crab() {
    const m = new Mesh(), sh = [0.78, 0.32, 0.18], leg = [0.48, 0.18, 0.1];
    sphere(m, [0, 0.06, 0], [0.26, 0.1, 0.2], 8, 5, sh);
    for (let i = 0; i < 4; i++) {
      for (const sd of [-1, 1]) {
        const z = -0.12 + i * 0.08;
        m.tri(m.v(sd * 0.16, 0.02, z, leg, 1), m.v(sd * 0.4, -0.05, z + 0.05, leg, 1), m.v(sd * 0.18, 0.04, z + 0.04, leg, 1));
      }
    }
    for (const sd of [-1, 1]) {
      m.tri(m.v(sd * 0.12, 0.04, 0.16, sh, 0), m.v(sd * 0.28, 0.06, 0.28, leg, 0.4), m.v(sd * 0.22, 0.02, 0.14, sh, 0));
    }
    return m;
  }

  function moray() {
    const m = new Mesh(), a = [0.28, 0.32, 0.2], b = [0.72, 0.62, 0.28];
    const pts = [], radii = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push([Math.sin(t * 3) * 0.08, Math.cos(t * 2) * 0.04, 0.35 - t * 1.15]);
      radii.push(0.07 * (1 - t * 0.65));
    }
    tube(m, pts, radii, 6, (i, j) => (j % 2 ? a : b));
    for (const sd of [-1, 1]) {
      const e = [0.9, 0.85, 0.4], ex = sd * 0.04, ey = 0.02, ez = 0.32, s = 0.012;
      m.quad(m.v(ex, ey + s, ez, e, 0), m.v(ex, ey, ez + s, e, 0), m.v(ex, ey - s, ez, e, 0), m.v(ex, ey, ez - s, e, 0));
    }
    return m;
  }

  function sunfish() {
    const m = new Mesh(), body = [0.55, 0.62, 0.66], fin = [0.4, 0.48, 0.52];
    sphere(m, [0, 0, 0], [0.12, 0.5, 0.38], 10, 8, (x, y) => mixc(body, [0.75, 0.78, 0.8], M.smooth(-0.2, 0.4, y)));
    m.tri(m.v(0, 0.42, -0.05, fin, 0), m.v(0, 0.78, -0.18, fin, 0), m.v(0, 0.4, -0.22, fin, 0));
    m.tri(m.v(0, -0.42, -0.02, fin, 0), m.v(0, -0.4, -0.2, fin, 0), m.v(0, -0.75, -0.12, fin, 0));
    m.tri(m.v(0, 0.08, -0.32, fin, 0), m.v(-0.02, 0, -0.62, fin, 0), m.v(0.02, -0.08, -0.32, fin, 0));
    const e = [0.12, 0.12, 0.14];
    m.quad(m.v(0.1, 0.08, 0.28, e, 0), m.v(0.1, 0.04, 0.34, e, 0), m.v(0.1, 0, 0.28, e, 0), m.v(0.1, 0.04, 0.22, e, 0));
    return m;
  }

  function angler() {
    const m = new Mesh(), body = [0.12, 0.13, 0.16], lure = [0.75, 1, 0.85];
    sphere(m, [0, 0, 0.05], [0.2, 0.16, 0.18], 8, 6, body);
    tube(m, [[0, 0, -0.05], [0, 0.02, -0.28], [0, 0, -0.42]], [[0.1, 0.08], [0.06, 0.05], [0.02, 0.016]], 6, body);
    tube(m, [[0, 0.12, 0.02], [0, 0.32, 0.08], [0, 0.26, 0.28]], [0.02, 0.015, 0.012], 4, body);
    sphere(m, [0, 0.26, 0.3], [0.045, 0.045, 0.045], 6, 4, lure);
    m.tri(m.v(-0.08, -0.02, 0.2, [0.4, 0.1, 0.12], 0), m.v(0.08, -0.02, 0.2, [0.4, 0.1, 0.12], 0), m.v(0, -0.05, 0.12, body, 0));
    return m;
  }

  function squid() {
    const m = new Mesh(), skin = [0.65, 0.45, 0.95], fin = [0.8, 0.7, 1];
    tube(m, [[0, 0, 0.35], [0, 0, 0.1], [0, 0, -0.15]], [[0.06, 0.05], [0.14, 0.1], [0.08, 0.06]], 7, (i, j, c, s) => mixc(skin, [0.9, 0.85, 1], M.smooth(0, -0.8, s)));
    m.tri(m.v(0, 0.08, 0.2, fin, 0), m.v(-0.22, 0.02, 0.02, fin, 0), m.v(0, 0.02, -0.05, fin, 0));
    m.tri(m.v(0, 0.08, 0.2, fin, 0), m.v(0, 0.02, -0.05, fin, 0), m.v(0.22, 0.02, 0.02, fin, 0));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU, cs = Math.cos(a), sn = Math.sin(a);
      tube(m, [[cs * 0.04, sn * 0.03, -0.12], [cs * 0.1, sn * 0.06 - 0.04, -0.45]], [0.02, 0.008], 3, skin);
    }
    return m;
  }

  function part() {
    const m = new Mesh(), metal = [0.78, 0.82, 0.86], core = [0.55, 0.95, 1];
    tube(m, [[0, 0, -0.06], [0, 0, 0.08]], [0.22, 0.22], 8, metal);
    sphere(m, [0, 0, 0.02], [0.1, 0.1, 0.1], 8, 5, core);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU, c = Math.cos(a), s = Math.sin(a);
      m.tri(
        m.v(c * 0.08, s * 0.08, 0, metal, 0),
        m.v(c * 0.46, s * 0.46, -0.2, core, 0),
        m.v(c * 0.12 - s * 0.1, s * 0.12 + c * 0.1, -0.04, metal, 0)
      );
    }
    return m;
  }

  M.Mesh = Mesh;
  M.buildMeshes = function () {
    const info = {};
    const out = {
      kelp: kelp(false).build(false),
      kelpLod: kelp(true).build(false),
      grass: grass().build(false),
      bulb: bulb().build(false),
      coralBranch: coralBranch().build(false),
      coralBrain: coralBrain().build(false),
      coralTable: coralTable().build(false),
      sponge: sponge().build(false),
      fan: fan().build(false),
      anemone: anemone().build(false),
      starfish: starfish().build(true),
      rockA: rock(1.3, 0.75).build(true),
      rockB: rock(7.9, 0.55).build(true),
      clam: clam().build(false),
      pearl: pearl().build(false),
      fishA: fish(false).build(false),
      fishB: fish(true).build(false),
      manta: manta().build(false),
      turtle: turtle().build(false),
      whale: whale().build(false),
      dolphin: dolphin().build(false),
      gull: gull().build(false),
      jelly: jelly().build(false),
      shark: shark().build(false),
      seahorse: seahorse().build(false),
      octopus: octopus().build(false),
      crab: crab().build(false),
      moray: moray().build(false),
      sunfish: sunfish().build(false),
      angler: angler().build(false),
      squid: squid().build(false),
      part: part().build(false),
      wreck: wreck(info).build(true),
      ruins: ruins(info).build(true),
    };
    out.info = info;
    return out;
  };
})();
