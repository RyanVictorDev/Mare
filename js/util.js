// Maré — utilidades: matemática, ruído e números aleatórios com semente.
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const M = (root.MARE = root.MARE || {});

  M.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  M.lerp = (a, b, t) => a + (b - a) * t;
  M.smooth = (a, b, x) => {
    let t = (x - a) / (b - a);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t * t * (3 - 2 * t);
  };
  M.mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  M.norm = v => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  };

  // Gerador determinístico (mulberry32): o mesmo oceano em todo mergulho.
  M.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  function hash(ix, iy, iz) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 1440662683)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // Ruído de valor 2D em [0,1].
  M.noise2 = function (x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed);
    const c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  M.fbm2 = function (x, y, oct, seed) {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) {
      s += a * M.noise2(x * f, y * f, seed + i * 17);
      n += a;
      a *= 0.5;
      f *= 2.03;
    }
    return s / n;
  };

  // Ruído de valor 3D em [0,1].
  M.noise3 = function (x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const l = (a, b, t) => a + (b - a) * t;
    const z0 = l(l(hash(ix, iy, iz), hash(ix + 1, iy, iz), u), l(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), u), v);
    const z1 = l(l(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), u), l(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), u), v);
    return l(z0, z1, w);
  };

  // Matrizes 4x4 em ordem de colunas (padrão do WebGL).
  M.mat4 = {
    perspective(out, fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2);
      out.fill(0);
      out[0] = f / aspect;
      out[5] = f;
      out[10] = (far + near) / (near - far);
      out[11] = -1;
      out[14] = (2 * far * near) / (near - far);
    },
    // Matriz de visão a partir da posição e da direção do olhar.
    view(out, eye, f) {
      let sx = -f[2], sz = f[0];
      const sl = Math.hypot(sx, sz) || 1;
      sx /= sl;
      sz /= sl;
      const ux = -sz * f[1], uy = sz * f[0] - sx * f[2], uz = sx * f[1];
      out[0] = sx; out[1] = ux; out[2] = -f[0]; out[3] = 0;
      out[4] = 0; out[5] = uy; out[6] = -f[1]; out[7] = 0;
      out[8] = sz; out[9] = uz; out[10] = -f[2]; out[11] = 0;
      out[12] = -(sx * eye[0] + sz * eye[2]);
      out[13] = -(ux * eye[0] + uy * eye[1] + uz * eye[2]);
      out[14] = f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2];
      out[15] = 1;
    },
    mul(out, a, b) {
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
          out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
        }
      }
    },
  };
})();
