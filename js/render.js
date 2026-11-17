// Maré — renderizador WebGL2. Pensado para placas modestas:
// cena em resolução reduzida, neblina de água escondendo a distância,
// instâncias agrupadas por célula e animação feita no shader de vértices.
(function () {
  'use strict';
  const M = window.MARE;
  const Rn = (M.render = {});
  const FOV = (70 * Math.PI) / 180, NEAR = 0.12, FAR = 520;
  const SUN = M.norm([0.46, 0.8, 0.26]);

  const QUALITY = {
    low: { scale: 0.5, maxH: 540, msaa: 0, cau: 2, rays: 6, snow: 500, dist: 0.72, fog: 0.024, fish: 0.55, thin: 0.6 },
    medium: { scale: 0.75, maxH: 864, msaa: 0, cau: 3, rays: 9, snow: 1300, dist: 0.9, fog: 0.0195, fish: 0.85, thin: 0.9 },
    high: { scale: 1, maxH: 1440, msaa: 4, cau: 4, rays: 12, snow: 2600, dist: 1, fog: 0.0175, fish: 1, thin: 1 },
  };
  // Tipos que podem ser desenhados em menor quantidade nas qualidades mais leves
  // (rochas e conchas ficam de fora: têm colisão ou guardam pérolas).
  const THIN = { coralBranch: 1, coralBrain: 1, coralTable: 1, sponge: 1, starfish: 1, kelp: 1, grass: 1, fan: 1, anemone: 1, bulb: 1 };
  // Distância máxima de desenho e balanço de cada tipo de objeto.
  // big: estruturas grandes, desenhadas mesmo quando o centro delas está fora da vista.
  // lod: modelo simplificado usado nas células distantes.
  const TYPES = {
    wreck: { prog: 'static', fade: 240, big: true },
    ruins: { prog: 'static', fade: 240, big: true },
    rockA: { prog: 'static', fade: 160 },
    rockB: { prog: 'static', fade: 140 },
    coralBranch: { prog: 'static', fade: 96 },
    coralBrain: { prog: 'static', fade: 104 },
    coralTable: { prog: 'static', fade: 104 },
    sponge: { prog: 'static', fade: 92 },
    clam: { prog: 'static', fade: 80 },
    starfish: { prog: 'static', fade: 36 },
    kelp: { prog: 'sway', fade: 140, sway: 0.05, lod: 'kelpLod', lodDist: 46 },
    grass: { prog: 'sway', fade: 58, sway: 0.15 },
    fan: { prog: 'sway', fade: 88, sway: 0.035 },
    anemone: { prog: 'sway', fade: 66, sway: 0.09 },
    bulb: { prog: 'sway', fade: 120, sway: 0.07 },
  };

  // ---------------- shaders ----------------
  const COMMON = `
uniform vec3 uCam; uniform float uTime; uniform vec3 uSun; uniform vec4 uFlash;
uniform vec3 uWater; uniform float uSunK; uniform float uFog; uniform int uCauIter;
vec3 waterColor(vec3 dir){
  float up = dir.y*0.5+0.5;
  vec3 col = uWater * mix(0.32, 1.75, up*up*(3.0-2.0*up));
  float s = max(dot(dir, uSun), 0.0); s *= s; s *= s;
  return col + vec3(0.30,0.46,0.42) * s * s * uSunK * 0.7;
}
float caustic(vec2 uv, float t){
  const float TAU = 6.28318530718;
  vec2 p = mod(uv*TAU, TAU) - 250.0;
  vec2 i = p; float c = 1.0;
  for(int n=0; n<uCauIter; n++){
    float tt = t * (1.0 - (3.5/float(n+1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0/length(vec2(p.x/(sin(i.x+tt)/0.005), p.y/(cos(i.y+tt)/0.005)));
  }
  c /= float(uCauIter);
  c = 1.17 - pow(c, 1.4);
  return min(pow(abs(c), 8.0), 1.6);
}
// thin: 0 para sólidos, perto de 1 para folhas finas (a luz atravessa, então o lado de baixo não fica preto).
vec3 shade(vec3 alb, vec3 N, vec3 wp, float glow, float thin){
  float depth = max(-wp.y, 0.0);
  vec3 att = exp(-depth * vec3(0.040, 0.014, 0.009)) * (1.0 - 0.62*smoothstep(42.0, 95.0, depth));
  float ndl = dot(N, uSun);
  float diff = mix(max(ndl*0.6 + 0.4, 0.0), 0.5 + 0.35*abs(ndl), thin);
  float cau = caustic(wp.xz*0.055 + wp.y*0.021, uTime*0.55) * exp(-depth*0.045) * smoothstep(-0.25, 0.55, N.y) * 1.5;
  vec3 amb = mix(vec3(0.15,0.25,0.31), vec3(0.21,0.35,0.45), mix(N.y*0.5 + 0.5, 0.8, thin));
  vec3 col = alb * (vec3(1.0,0.97,0.88)*(diff*0.85 + cau) + amb) * att;
  vec3 toCam = uCam - wp; float dist = length(toCam); vec3 L = toCam/dist;
  float spot = smoothstep(0.78, 0.97, dot(-L, uFlash.xyz)) * uFlash.w;
  col += alb * vec3(1.0,0.95,0.82) * spot * (max(dot(N,L),0.0)*0.7+0.3) * 3.4/(1.0 + dist*0.12 + dist*dist*0.012);
  col += alb * glow;
  // Com a câmera no ar, a névoa só conta o trecho do raio que está debaixo d'água.
  float path = dist;
  if(uCam.y > 0.0) path = wp.y < 0.0 ? dist * clamp(-wp.y / max(uCam.y - wp.y, 0.001), 0.0, 1.0) : 0.0;
  col *= exp(-path*vec3(0.017,0.004,0.002));
  return mix(col, waterColor(-L), 1.0 - exp(-path*uFog));
}`;

  const VS_OBJ = `
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec3 aCol; layout(location=3) in float aAnim;
layout(location=4) in vec4 iPS; layout(location=5) in vec4 iRot; layout(location=6) in vec4 iTint;
uniform mat4 uVP; uniform vec3 uCam; uniform float uTime; uniform float uFadeDist; uniform float uSway;
out vec3 vW; out vec3 vN; out vec3 vC; out float vGlow;
void main(){
  vec3 p = aPos; vec3 n = aNor;
  float yaw = iRot.x, ph = iRot.z, pitch = 0.0;
#if defined(STATIC) || defined(SWAY)
  p.y *= iRot.y;
#else
  pitch = iRot.y; float spd = iRot.w;
#endif
#ifdef SWAY
  float q = ph + iPS.x*0.21 + iPS.z*0.17;
  p.x += (sin(uTime*0.8 + q + aPos.y*3.1) + 0.6*sin(uTime*0.31 + q*0.7)) * aAnim * uSway;
  p.z += cos(uTime*0.63 + q*1.3 + aPos.y*2.3) * aAnim * uSway;
#endif
#ifdef FISH
  float wg = clamp(0.35 - p.z, 0.0, 1.0);
  p.x += sin(uTime*10.0 + ph*3.0 - p.z*5.0) * wg*wg * 0.11 * spd;
#endif
#ifdef WHALE
  float wg = clamp(0.2 - p.z, 0.0, 1.0);
  p.y += sin(uTime*1.1 + ph + p.z*4.0) * wg*wg * 0.13;
#endif
#ifdef MANTA
  float ax = abs(p.x);
  p.y += sin(uTime*1.7 + ph - ax*3.5) * pow(ax*2.0, 1.5) * 0.17;
#endif
#ifdef TURTLE
  p.y += sin(uTime*1.9 + ph) * aAnim * 0.2; p.z += cos(uTime*1.9 + ph) * aAnim * 0.1;
#endif
#ifdef JELLY
  float pulse = sin(uTime*1.5*spd + ph);
  if(p.y >= -0.1){ p.xz *= 1.0 + pulse*0.2*(1.0 - p.y/0.42); p.y *= 1.0 - pulse*0.1; }
  else { float k = -p.y; p.x += sin(uTime*1.1 + ph + p.y*3.0)*0.09*k; p.z += cos(uTime*0.9 + ph*1.7 + p.y*2.5)*0.09*k; p.xz *= 1.0 + pulse*0.2*(1.0 - smoothstep(0.0,0.5,k)); }
#endif
#ifdef GULL
  float flap = sin(uTime * (1.6 + spd * 5.5) + ph);
  p.y += flap * aAnim * abs(p.x) * mix(0.2, 0.5, clamp(spd, 0.0, 1.0));
  float bank = iTint.a;
  float cb = cos(bank), sb = sin(bank);
  vec2 rolled = vec2(p.x*cb - p.y*sb, p.x*sb + p.y*cb);
  p.x = rolled.x; p.y = rolled.y;
  n.xy = vec2(n.x*cb - n.y*sb, n.x*sb + n.y*cb);
#endif
  p *= iPS.w * (1.0 - smoothstep(uFadeDist*0.8, uFadeDist, distance(iPS.xyz, uCam)));
  float cp = cos(pitch), sp = sin(pitch), cy = cos(yaw), sy = sin(yaw);
  p = vec3(p.x, p.y*cp + p.z*sp, -p.y*sp + p.z*cp);
  n = vec3(n.x, n.y*cp + n.z*sp, -n.y*sp + n.z*cp);
  p = vec3(p.x*cy + p.z*sy, p.y, -p.x*sy + p.z*cy);
  n = vec3(n.x*cy + n.z*sy, n.y, -n.x*sy + n.z*cy);
  vW = p + iPS.xyz; vN = n; vC = aCol * iTint.rgb;
#ifdef GULL
  vGlow = 0.0;
#else
  vGlow = iTint.a;
#endif
  gl_Position = uVP * vec4(vW, 1.0);
}`;

  const FS_OBJ = `
in vec3 vW; in vec3 vN; in vec3 vC; in float vGlow; out vec4 o;
${COMMON}
void main(){
  vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;
#ifdef JELLY
  vec3 toCam = uCam - vW; float dist = length(toCam);
  float fr = 1.0 - abs(dot(N, toCam/dist));
  o = vec4(vC * (0.18 + 0.82*fr*fr) * (0.3 + vGlow) * exp(-dist*uFog*1.3), 1.0);
#elif defined(GULL)
  vec3 sunD = normalize(vec3(0.86, 0.24, 0.45));
  float ndl = max(dot(N, sunD), 0.0);
  vec3 col = vC * (0.45 + 0.7*ndl + 0.2*max(N.y, 0.0));
  col = mix(col, vec3(0.98, 0.78, 0.55), 1.0 - exp(-distance(vW, uCam)*0.0022));
  o = vec4(col, 1.0);
#elif defined(SWAY)
  o = vec4(shade(vC, N, vW, vGlow, 0.85), 1.0);
#else
  o = vec4(shade(vC, N, vW, vGlow, 0.0), 1.0);
#endif
}`;

  const VS_TERRAIN = `
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec3 aCol; layout(location=3) in float aAnim;
uniform mat4 uVP; out vec3 vW; out vec3 vN; out vec3 vC; out float vSand;
void main(){ vW = aPos; vN = aNor; vC = aCol; vSand = aAnim; gl_Position = uVP*vec4(aPos,1.0); }`;

  const FS_TERRAIN = `
in vec3 vW; in vec3 vN; in vec3 vC; in float vSand; out vec4 o;
${COMMON}
void main(){
  vec3 N = normalize(vN);
  float near = exp(-distance(vW, uCam)*0.035) * vSand;
  float a = vW.x*1.9 + sin(vW.z*0.8)*1.6 + sin(vW.x*0.27 + vW.z*0.19)*2.5;
  N = normalize(N + vec3(cos(a), 0.0, 0.3*cos(a*0.7))*0.13*near);
  o = vec4(shade(vC * (1.0 + 0.05*sin(a)*near), N, vW, 0.0, 0.0), 1.0);
}`;

  const VS_BG = `
uniform vec3 uRight; uniform vec3 uUp; uniform vec3 uFwd; uniform vec2 uTan;
out vec3 vDir;
void main(){
  vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2))*2.0 - 1.0;
  vDir = uFwd + uRight*p.x*uTan.x + uUp*p.y*uTan.y;
  gl_Position = vec4(p, 0.0, 1.0);
}`;
  // Céu de fim de tarde e a ondulação do mar. A mesma fórmula de onda existe no jogo (seaY), para a câmera boiar junto.
  const SKY_FN = `
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float cloudF(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(hash2(i), hash2(i+vec2(1.0,0.0)), f.x), mix(hash2(i+vec2(0.0,1.0)), hash2(i+vec2(1.0,1.0)), f.x), f.y);
}
vec3 skyColor(vec3 dir){
  vec3 sunD = normalize(vec3(0.86, 0.24, 0.45));
  float h = dir.y;
  vec3 zen = vec3(0.32, 0.54, 0.86);
  vec3 midc = vec3(0.56, 0.72, 0.92);
  vec3 hor = vec3(1.0, 0.66, 0.40);
  vec3 col = mix(hor, mix(midc, zen, smoothstep(0.02, 0.55, h)), smoothstep(-0.16, 0.1, h));
  col = mix(vec3(0.05, 0.16, 0.24), col, smoothstep(-0.4, -0.08, h));
  float sun = max(dot(dir, sunD), 0.0);
  col += vec3(1.0, 0.55, 0.28) * pow(sun, 28.0) * 0.55;
  col += vec3(1.0, 0.97, 0.9) * pow(sun, 700.0);
  if(h > -0.02){
    vec2 uv = dir.xz / (h + 0.22) * 0.42 + vec2(uTime*0.004, uTime*0.0012);
    float cl = cloudF(uv)*0.65 + cloudF(uv*2.2 + 3.7)*0.35;
    cl = smoothstep(0.40, 0.68, cl) * smoothstep(-0.02, 0.12, h);
    vec3 ccol = mix(vec3(0.98, 0.62, 0.40), vec3(1.0, 0.97, 0.95), smoothstep(0.0, 0.4, h));
    ccol = mix(ccol, vec3(1.0, 0.84, 0.58), pow(sun, 3.0)*0.8);
    col = mix(col, ccol, cl*0.92);
  }
  return col;
}`;
  const WAVE_FN = `
void waves(vec2 p, float t, out float h, out vec2 g){
  h = 0.0; g = vec2(0.0);
  vec2 k; float w;
  k = vec2(0.045, 0.028); w = dot(p, k) + t*0.55; h += sin(w)*0.22; g += k*cos(w)*0.22;
  k = vec2(-0.020, 0.050); w = dot(p, k) + t*0.72; h += sin(w)*0.16; g += k*cos(w)*0.16;
  k = vec2(0.090, -0.040); w = dot(p, k) + t*1.15; h += sin(w)*0.07; g += k*cos(w)*0.07;
}`;
  const FS_BG = `
in vec3 vDir; out vec4 o;
${COMMON}
${SKY_FN}
void main(){
  vec3 dir = normalize(vDir);
  float k = smoothstep(-0.35, 0.45, uCam.y);
  o = vec4(mix(waterColor(dir), skyColor(dir), k), 1.0);
}`;

  // A superfície serve dos dois lados: por baixo, a janela de Snell com o céu da tarde; por cima, o mar aberto.
  const VS_SURF = `
layout(location=0) in vec2 aQ;
uniform mat4 uVP; uniform vec3 uCam; uniform float uTime;
out vec3 vW;
${WAVE_FN}
void main(){
  vec2 xz = uCam.xz + aQ * 300.0;
  float h; vec2 g;
  waves(xz, uTime, h, g);
  vW = vec3(xz.x, h, xz.y);
  gl_Position = uVP * vec4(vW, 1.0);
}`;
  const FS_SURF = `
in vec3 vW; out vec4 o;
${COMMON}
${SKY_FN}
${WAVE_FN}
void main(){
  vec3 toF = vW - uCam; float dist = length(toF); vec3 V = toF / dist;
  vec2 p = vW.xz; float t = uTime;
  if(uCam.y > 0.02){
    float hw; vec2 slope;
    waves(p, t, hw, slope);
    vec2 g = slope * 6.0;
    g += vec2(0.80, 0.55) * cos(dot(p, vec2(0.16, 0.11)) + t*1.1) * 0.32;
    g += vec2(-0.45, 0.80) * cos(dot(p, vec2(-0.11, 0.18)) + t*1.5) * 0.2;
    g += vec2(0.30, -0.90) * cos(dot(p, vec2(0.28, -0.16))*1.4 + t*2.1) * 0.11;
    g *= exp(-dist*0.008);
    vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
    vec3 sunD = normalize(vec3(0.86, 0.24, 0.45));
    vec3 refl = skyColor(reflect(V, N));
    float ndv = clamp(dot(N, -V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 4.0);
    vec3 body = mix(vec3(0.15, 0.55, 0.58), vec3(0.03, 0.20, 0.34), clamp(fres*0.7 + dist*0.008, 0.0, 1.0));
    float spec = pow(max(dot(reflect(-sunD, N), -V), 0.0), 160.0);
    float glint = pow(max(sin(p.x*1.15 + t*1.5) * sin(p.y*1.3 - t*1.15), 0.0), 12.0) * pow(max(dot(N, sunD), 0.0), 28.0);
    vec3 col = mix(body, refl, 0.08 + 0.84*fres);
    col += vec3(1.0, 0.9, 0.68) * spec * 1.8;
    col += vec3(1.0, 0.93, 0.75) * glint * 0.65;
    col = mix(col, vec3(0.95, 0.96, 0.97), smoothstep(0.30, 0.44, hw) * 0.28 * (1.0 - fres));
    vec3 hor = skyColor(normalize(vec3(V.x, 0.02, V.z)));
    float farK = smoothstep(110.0, 250.0, dist);
    col = mix(col, hor, farK);
    float alpha = mix(0.30, 0.92, fres);
    alpha = mix(alpha, 1.0, max(farK, smoothstep(26.0, 150.0, dist)));
    o = vec4(col, alpha);
  } else {
    vec2 g = vec2(0.0);
    g += vec2(0.8,0.6)   * cos(dot(p, vec2(0.8,0.6))*0.55 + t*1.1) * 0.5;
    g += vec2(-0.5,0.86) * cos(dot(p, vec2(-0.5,0.86))*0.93 + t*1.4) * 0.38;
    g += vec2(0.2,-0.98) * cos(dot(p, vec2(0.2,-0.98))*1.7 + t*1.9) * 0.26;
    g += vec2(-0.9,-0.4) * cos(dot(p, vec2(-0.9,-0.4))*2.9 + t*2.6) * 0.16;
    g *= exp(-dist*0.02);
    vec3 R = normalize(V + vec3(g.x, 0.0, g.y)*0.42);
    float win = smoothstep(0.60, 0.76, R.y);
    vec3 sky = skyColor(R);
    float glint = pow(max(dot(R, normalize(vec3(0.86, 0.24, 0.45))), 0.0), 90.0);
    vec3 inside = sky + vec3(1.0, 0.95, 0.8)*glint*1.1;
    vec3 outside = waterColor(vec3(R.x, -R.y*0.6 - 0.05, R.z))*1.25 + vec3(0.25,0.5,0.5)*pow(max(g.x*0.9+g.y*0.6, 0.0), 3.0)*0.5;
    vec3 col = mix(outside, inside, win);
    col *= exp(-dist*vec3(0.017,0.004,0.002));
    o = vec4(mix(col, waterColor(V), 1.0 - exp(-dist*uFog*0.8)), 1.0);
  }
}`;

  // Feixes de luz: faixas inclinadas na direção do sol, sempre viradas para a câmera.
  const VS_RAYS = `
layout(location=0) in vec2 aQ;
uniform mat4 uVP; uniform vec3 uCam; uniform vec3 uSun; uniform float uTime; uniform float uGrid;
out vec2 vQ; out float vA;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  const float CELL = 11.0;
  float id = float(gl_InstanceID);
  vec2 cc = floor(uCam.xz/CELL) + vec2(mod(id, uGrid), floor(id/uGrid)) - uGrid*0.5;
  float h1 = hash(cc), h2 = hash(cc + 17.3), h3 = hash(cc + 41.7);
  vec2 xz = (cc + vec2(h1, h2))*CELL;
  vec3 top = vec3(xz.x, 0.0, xz.y);
  float len = 20.0 + h3*30.0, width = 0.7 + h1*2.0;
  vec3 axis = -uSun;
  vec3 side = normalize(cross(axis, uCam - (top + axis*len*0.5)));
  vec3 wp = top + axis*(aQ.y*len) + side*(aQ.x*width*(1.0 + aQ.y*1.6));
  float d = distance(uCam.xz, xz + axis.xz*clamp(-uCam.y, 0.0, len));
  float reach = uGrid*CELL*0.5;
  vA = (1.0 - smoothstep(reach*0.55, reach*0.95, d)) * smoothstep(1.5, 6.0, d) * (0.5 + 0.5*sin(uTime*(0.25+h2*0.5) + h3*40.0)) * (0.35 + 0.65*h2);
  vQ = aQ;
  gl_Position = uVP*vec4(wp, 1.0);
}`;
  const FS_RAYS = `
in vec2 vQ; in float vA; uniform float uStrength; out vec4 o;
void main(){
  float a = 1.0 - vQ.x*vQ.x; a *= a;
  a *= (1.0 - vQ.y) * smoothstep(0.0, 0.06, vQ.y);
  o = vec4(mix(vec3(0.55,0.95,0.88), vec3(0.98,0.82,0.5), 0.28) * a * vA * uStrength, 1.0);
}`;

  // Partículas em suspensão ("neve marinha"), sempre numa caixa ao redor da câmera.
  const VS_SNOW = `
layout(location=0) in vec4 aSeed;
uniform mat4 uVP; uniform vec3 uCam; uniform float uTime; uniform float uPx; uniform vec4 uFlash; uniform float uBloom; uniform float uLight;
out vec3 vCol;
void main(){
  const float BOX = 28.0;
  vec3 p = aSeed.xyz*BOX;
  p.y -= uTime*0.07*(0.4 + aSeed.w);
  p.x += sin(uTime*0.25 + aSeed.w*40.0)*0.4; p.z += cos(uTime*0.21 + aSeed.w*31.0)*0.4;
  vec3 rel = mod(p - uCam, BOX) - BOX*0.5;
  float d = length(rel);
  gl_Position = uVP*vec4(uCam + rel, 1.0);
  gl_PointSize = clamp((0.035 + aSeed.w*0.06)*(1.0 + uBloom)*uPx/max(gl_Position.w, 0.1), 1.0, 16.0);
  float a = (1.0 - smoothstep(BOX*0.3, BOX*0.5, d)) * smoothstep(0.3, 1.6, d);
  float spot = smoothstep(0.86, 0.97, dot(rel/d, uFlash.xyz)) * uFlash.w * 5.0/(1.0 + d*0.3);
  float tw = 0.5 + 0.5*sin(uTime*(0.7 + aSeed.w*2.0) + aSeed.x*90.0);
  vec3 base = vec3(0.75,0.92,1.0)*(0.16*uLight + spot);
  vec3 bio = mix(vec3(0.15,0.95,0.85), vec3(0.45,0.55,1.0), fract(aSeed.w*7.0))*tw*0.9;
  vCol = (base + bio*uBloom)*a;
}`;
  const FS_SNOW = `
in vec3 vCol; out vec4 o;
void main(){ float r = length(gl_PointCoord - 0.5)*2.0; o = vec4(vCol*smoothstep(1.0, 0.15, r), 1.0); }`;

  // Bolhas e brilhos (pontos).
  const VS_SPRITE = `
layout(location=0) in vec4 aPS; layout(location=1) in vec4 aCol;
uniform mat4 uVP; uniform vec3 uCam; uniform float uPx; uniform float uFog; uniform float uMaxPx;
out vec4 vCol;
void main(){
  gl_Position = uVP*vec4(aPS.xyz, 1.0);
  gl_PointSize = clamp(aPS.w*uPx/max(gl_Position.w, 0.1), 1.5, uMaxPx);
  vCol = vec4(aCol.rgb, aCol.a*exp(-distance(aPS.xyz, uCam)*uFog));
}`;
  const FS_SPRITE = `
in vec4 vCol; uniform int uKind; out vec4 o;
void main(){
  vec2 q = gl_PointCoord - 0.5; float r = length(q)*2.0; float a;
  if(uKind == 0){ a = exp(-r*r*4.5) * (1.0 - smoothstep(0.8, 1.0, r)); }
  else { a = (1.0 - smoothstep(0.86, 1.0, r)) * (0.12 + 0.88*smoothstep(0.45, 0.95, r)) + 0.9*exp(-dot(q-vec2(-0.16,-0.18), q-vec2(-0.16,-0.18))*90.0); }
  o = vec4(vCol.rgb*vCol.a*a, 1.0);
}`;

  const VS_POST = `
out vec2 vUv;
void main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); vUv = p; gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }`;
  const FS_POST = `
in vec2 vUv; uniform sampler2D uTex; uniform float uTime; uniform float uFade; uniform float uAbove; uniform float uSplash; out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  float wob = mix(0.0011, 0.00012, uAbove);
  vec2 uv = vUv + vec2(sin(vUv.y*13.0 + uTime*0.9), cos(vUv.x*11.0 + uTime*0.7))*wob;
  vec3 c = texture(uTex, uv).rgb;
  vec2 q = vUv - 0.5;
  c *= 1.0 - dot(q, q)*mix(0.75, 0.45, uAbove);
  c = mix(c, c*c*(3.0 - 2.0*c), mix(0.3, 0.12, uAbove));
  c = mix(c, c * vec3(1.07, 0.98, 0.90) + vec3(0.015, 0.004, 0.0), uAbove * 0.55);
  c += vec3(0.75, 0.88, 0.95) * uSplash;
  c *= uFade;
  c += (hash(gl_FragCoord.xy + fract(uTime)*61.0) - 0.5)/128.0;
  o = vec4(c, 1.0);
}`;

  // ---------------- estado ----------------
  let gl, canvas, Q = QUALITY.medium, qName = 'medium';
  const prog = {}, meshes = {}, statics = [], dyn = {};
  let terrain = null, world = null, triVao, quadVao, rayVao, surfVao, surfCount = 0, snowVao, snowCount = 0;
  let glowBuf, glowVao, bubBuf, bubVao;
  let fbo = null, fboTex = null, fboDepth = null, msFbo = null, msColor = null, msDepth = null, sceneW = 0, sceneH = 0, targetKey = '';
  const P = new Float32Array(16), V = new Float32Array(16), VP = new Float32Array(16);
  const cam = [0, 0, 0], fwd = [0, 0, -1], water = [0, 0, 0];
  let frameId = 0, fT = 0, fFlash = 0, sunK = 1, fog = 0.02, cellD = null, cellN = null;
  Rn.stats = { draws: 0, tris: 0 };

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      console.error(log + '\n' + src.split('\n').map((l, i) => i + 1 + ': ' + l).join('\n'));
      throw new Error('Erro no shader: ' + log);
    }
    return s;
  }
  function program(vs, fs, defs) {
    const head = '#version 300 es\nprecision highp float;\n' + (defs || []).map(d => '#define ' + d + '\n').join('');
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, head + vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, head + fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Erro ao ligar o programa: ' + gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name;
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p, u, frame: -1 };
  }
  // Ativa o programa e envia os uniformes comuns uma vez por quadro.
  function use(pr) {
    gl.useProgram(pr.p);
    if (pr.frame === frameId) return pr;
    pr.frame = frameId;
    const u = pr.u;
    if (u.uVP) gl.uniformMatrix4fv(u.uVP, false, VP);
    if (u.uCam) gl.uniform3f(u.uCam, cam[0], cam[1], cam[2]);
    if (u.uTime) gl.uniform1f(u.uTime, fT);
    if (u.uSun) gl.uniform3f(u.uSun, SUN[0], SUN[1], SUN[2]);
    if (u.uFlash) gl.uniform4f(u.uFlash, fwd[0], fwd[1], fwd[2], fFlash);
    if (u.uWater) gl.uniform3f(u.uWater, water[0], water[1], water[2]);
    if (u.uSunK) gl.uniform1f(u.uSunK, sunK);
    if (u.uFog) gl.uniform1f(u.uFog, fog);
    if (u.uCauIter) gl.uniform1i(u.uCauIter, Q.cau);
    if (u.uPx) gl.uniform1f(u.uPx, sceneH / (2 * Math.tan(FOV / 2)));
    return pr;
  }

  function meshAttribs() {
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 40, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 40, 24);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 40, 36);
  }
  function instAttribs(offset) {
    for (let k = 0; k < 3; k++) gl.vertexAttribPointer(4 + k, 4, gl.FLOAT, false, 48, offset + k * 16);
  }
  // VAO de um modelo ligado a um buffer de instâncias.
  function instVao(mesh, ibuf) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    meshAttribs();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
    gl.bindBuffer(gl.ARRAY_BUFFER, ibuf);
    for (let k = 0; k < 3; k++) {
      gl.enableVertexAttribArray(4 + k);
      gl.vertexAttribDivisor(4 + k, 1);
    }
    instAttribs(0);
    gl.bindVertexArray(null);
    return vao;
  }
  function buildSurface() {
    const N = 64;
    const pos = new Float32Array((N + 1) * (N + 1) * 2);
    const idx = new Uint16Array(N * N * 6);
    let p = 0;
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        pos[p++] = -1 + (2 * i) / N;
        pos[p++] = -1 + (2 * j) / N;
      }
    }
    let k = 0;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i;
        idx[k++] = a;
        idx[k++] = a + 1;
        idx[k++] = a + N + 1;
        idx[k++] = a + 1;
        idx[k++] = a + N + 2;
        idx[k++] = a + N + 1;
      }
    }
    surfCount = idx.length;
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    surfVao = gl.createVertexArray();
    gl.bindVertexArray(surfVao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }
  function pointVao(buf, stride, sizes) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    let off = 0;
    sizes.forEach((s, i) => {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, s, gl.FLOAT, false, stride, off);
      off += s * 4;
    });
    gl.bindVertexArray(null);
    return vao;
  }

  Rn.init = function (cv) {
    canvas = cv;
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'default' });
    if (!gl) return false;
    Rn.gl = gl;
    prog.bg = program(VS_BG, FS_BG);
    prog.terrain = program(VS_TERRAIN, FS_TERRAIN);
    prog.static = program(VS_OBJ, FS_OBJ, ['STATIC']);
    prog.sway = program(VS_OBJ, FS_OBJ, ['SWAY']);
    prog.fish = program(VS_OBJ, FS_OBJ, ['FISH']);
    prog.whale = program(VS_OBJ, FS_OBJ, ['WHALE']);
    prog.manta = program(VS_OBJ, FS_OBJ, ['MANTA']);
    prog.turtle = program(VS_OBJ, FS_OBJ, ['TURTLE']);
    prog.jelly = program(VS_OBJ, FS_OBJ, ['JELLY']);
    prog.gull = program(VS_OBJ, FS_OBJ, ['GULL']);
    prog.surf = program(VS_SURF, FS_SURF);
    prog.rays = program(VS_RAYS, FS_RAYS);
    prog.snow = program(VS_SNOW, FS_SNOW);
    prog.sprite = program(VS_SPRITE, FS_SPRITE);
    prog.post = program(VS_POST, FS_POST);

    triVao = gl.createVertexArray();
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    quadVao = pointVao(quad, 8, [2]);
    const ray = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ray);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 0, 1, 0, 1, 1, -1, 0, 1, 1, -1, 1]), gl.STATIC_DRAW);
    rayVao = pointVao(ray, 8, [2]);
    buildSurface();

    const R = M.rng(5), seeds = new Float32Array(QUALITY.high.snow * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = R();
    const snow = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, snow);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    snowVao = pointVao(snow, 16, [4]);

    glowBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glowBuf);
    gl.bufferData(gl.ARRAY_BUFFER, 64 * 32, gl.DYNAMIC_DRAW);
    glowVao = pointVao(glowBuf, 32, [4, 4]);
    bubBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bubBuf);
    gl.bufferData(gl.ARRAY_BUFFER, 600 * 32, gl.DYNAMIC_DRAW);
    bubVao = pointVao(bubBuf, 32, [4, 4]);
    Rn.setQuality('medium');
    return true;
  };

  Rn.setQuality = function (name) {
    qName = QUALITY[name] ? name : 'medium';
    Q = QUALITY[qName];
    snowCount = Q.snow;
    if (M.creatures) M.creatures.detail = Q.fish;
    targetKey = '';
  };
  Rn.quality = () => qName;

  // Envia para a GPU os modelos, o relevo e as instâncias fixas.
  Rn.buildWorld = function (built, w) {
    world = w;
    for (const name in built) {
      if (name === 'info') continue;
      const b = built[name], m = { count: b.index.length, type: b.index instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, tris: b.tris };
      m.vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, m.vbo);
      gl.bufferData(gl.ARRAY_BUFFER, b.data, gl.STATIC_DRAW);
      m.ibo = gl.createBuffer();
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, b.index, gl.STATIC_DRAW);
      meshes[name] = m;
    }
    terrain = { vao: gl.createVertexArray(), chunks: w.terrain.chunks };
    gl.bindVertexArray(terrain.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, w.terrain.verts, gl.STATIC_DRAW);
    meshAttribs();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, w.terrain.index, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    for (const name in TYPES) {
      const src = w.inst[name];
      if (!src) continue;
      const T = Object.assign({ name: name, mesh: meshes[name], cells: src.cells }, TYPES[name]);
      T.ibuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, T.ibuf);
      gl.bufferData(gl.ARRAY_BUFFER, src.data, gl.STATIC_DRAW);
      T.vao = instVao(T.mesh, T.ibuf);
      if (T.lod) {
        T.lodMesh = meshes[T.lod];
        T.lodVao = instVao(T.lodMesh, T.ibuf);
      }
      statics.push(T);
    }
  };

  function ensureDyn(d) {
    let g = dyn[d.mesh + ':' + d.prog];
    if (!g || g.cap < d.data.byteLength) {
      g = { ibuf: gl.createBuffer(), cap: d.data.byteLength };
      gl.bindBuffer(gl.ARRAY_BUFFER, g.ibuf);
      gl.bufferData(gl.ARRAY_BUFFER, d.data.byteLength, gl.DYNAMIC_DRAW);
      g.vao = instVao(meshes[d.mesh], g.ibuf);
      dyn[d.mesh + ':' + d.prog] = g;
    }
    return g;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cw = Math.max(2, Math.round(canvas.clientWidth * dpr)), ch = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    let h = Math.round(Math.min(canvas.clientHeight * Q.scale * Math.min(window.devicePixelRatio || 1, 1.25), Q.maxH));
    h = Math.max(2, Math.min(h, ch));
    const w = Math.max(2, Math.round((h * cw) / ch));
    const samples = Math.min(Q.msaa, gl.getParameter(gl.MAX_SAMPLES));
    const key = w + 'x' + h + 'x' + samples;
    if (key === targetKey) return;
    targetKey = key;
    sceneW = w;
    sceneH = h;
    for (const t of [fboTex]) if (t) gl.deleteTexture(t);
    for (const r of [fboDepth, msColor, msDepth]) if (r) gl.deleteRenderbuffer(r);
    for (const f of [fbo, msFbo]) if (f) gl.deleteFramebuffer(f);
    fboDepth = msColor = msDepth = msFbo = null;
    fboTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
    if (samples > 0) {
      msFbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
      msColor = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, msColor);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msColor);
      msDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, msDepth);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msDepth);
    } else {
      fboDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, fboDepth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, fboDepth);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // Projeta um ponto do mundo na tela: retorna [x, y] em -1..1 e w (negativo = atrás da câmera).
  Rn.project = function (x, y, z) {
    const w = VP[3] * x + VP[7] * y + VP[11] * z + VP[15];
    const sx = VP[0] * x + VP[4] * y + VP[8] * z + VP[12], sy = VP[1] * x + VP[5] * y + VP[9] * z + VP[13];
    return [sx / Math.abs(w || 1e-6), sy / Math.abs(w || 1e-6), w];
  };

  // ---------------- quadro ----------------
  Rn.draw = function (f) {
    resize();
    frameId++;
    fT = f.time;
    fFlash = f.flash;
    cam[0] = f.pos[0]; cam[1] = f.pos[1]; cam[2] = f.pos[2];
    fwd[0] = f.fwd[0]; fwd[1] = f.fwd[1]; fwd[2] = f.fwd[2];
    const aspect = sceneW / sceneH, tanV = Math.tan(FOV / 2);
    M.mat4.perspective(P, FOV, aspect, NEAR, FAR);
    M.mat4.view(V, cam, fwd);
    M.mat4.mul(VP, P, V);
    const depth = Math.max(0, -cam[1]);
    sunK = Math.exp(-depth * 0.02);
    const sh = [0.07, 0.42, 0.56], dp = [0.004, 0.028, 0.07];
    for (let k = 0; k < 3; k++) water[k] = dp[k] + (sh[k] - dp[k]) * sunK;
    fog = Q.fog * (1 + (1 - sunK) * 0.45);
    let draws = 0, tris = 0;

    gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo || fbo);
    gl.viewport(0, 0, sceneW, sceneH);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    // fundo: gradiente da água
    let p = use(prog.bg);
    const rx = -fwd[2], rz = fwd[0], rl = Math.hypot(rx, rz) || 1, Rx = rx / rl, Rz = rz / rl;
    gl.uniform3f(p.u.uRight, Rx, 0, Rz);
    gl.uniform3f(p.u.uUp, -Rz * fwd[1], Rz * fwd[0] - Rx * fwd[2], Rx * fwd[1]);
    gl.uniform3f(p.u.uFwd, fwd[0], fwd[1], fwd[2]);
    gl.uniform2f(p.u.uTan, tanV * aspect, tanV);
    gl.bindVertexArray(triVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // visibilidade no plano: distância + ângulo de visão
    const fl = Math.hypot(fwd[0], fwd[2]) || 1, fx = fwd[0] / fl, fz = fwd[2] / fl;
    const steep = Math.abs(fwd[1]) > 0.6, hHalf = Math.atan(tanV * aspect) * (1 + Math.abs(fwd[1])) + 0.15;
    const vis = (cx, cz, rad, maxD) => {
      const dx = cx - cam[0], dz = cz - cam[2], d = Math.hypot(dx, dz);
      if (d - rad > maxD) return -1;
      if (!steep && d > rad * 1.15) {
        const ang = Math.acos(M.clamp((dx * fx + dz * fz) / d, -1, 1));
        if (ang > hHalf + Math.asin(Math.min(1, rad / d))) return -1;
      }
      return Math.max(0, d - rad);
    };

    // relevo
    gl.enable(gl.CULL_FACE);
    use(prog.terrain);
    gl.bindVertexArray(terrain.vao);
    const tMax = 215 * Q.dist;
    for (const c of terrain.chunks) {
      if (vis(c.x, c.z, c.rad, tMax) < 0) continue;
      gl.drawElements(gl.TRIANGLES, c.count, gl.UNSIGNED_INT, c.offset * 4);
      draws++;
      tris += c.count / 3;
    }
    if (Rn.debug) Rn.debug = { terrain: tris };
    gl.disable(gl.CULL_FACE);

    // objetos fixos, por célula
    const cells = world.cells;
    if (!cellD || cellD.length !== cells.length) {
      cellD = new Float32Array(cells.length);
      cellN = new Float32Array(cells.length);
    }
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      cellD[i] = vis(c.x, c.z, c.rad + 8, 260);
      cellN[i] = Math.max(0, Math.hypot(c.x - cam[0], c.z - cam[2]) - c.rad);
    }
    for (const T of statics) {
      const fade = T.fade * Q.dist, lodD = T.lod ? T.lodDist * Q.dist : 1e9, thin = THIN[T.name] ? Q.thin : 1;
      p = use(prog[T.prog]);
      gl.uniform1f(p.u.uFadeDist, fade);
      if (p.u.uSway) gl.uniform1f(p.u.uSway, T.sway || 0);
      // duas passadas quando há modelo simplificado: perto (completo) e longe (simples)
      for (let pass = 0; pass < (T.lod ? 2 : 1); pass++) {
        const mesh = pass ? T.lodMesh : T.mesh;
        gl.bindVertexArray(pass ? T.lodVao : T.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, T.ibuf);
        for (const c of T.cells) {
          const d = T.big ? cellN[c.cell] : cellD[c.cell];
          if (d < 0 || d > fade || d > lodD !== !!pass) continue;
          const n = Math.max(1, Math.round(c.count * thin));
          instAttribs(c.start * 48);
          gl.drawElementsInstanced(gl.TRIANGLES, mesh.count, mesh.type, 0, n);
          draws++;
          tris += mesh.tris * n;
          if (Rn.debug) Rn.debug[T.name] = (Rn.debug[T.name] || 0) + mesh.tris * n;
        }
      }
    }

    // criaturas e pérolas (instâncias que mudam a cada quadro)
    const drawDyn = d => {
      if (!d.count) return;
      const g = ensureDyn(d);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.ibuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, d.data, 0, d.count * 12);
      p = use(prog[d.prog]);
      gl.uniform1f(p.u.uFadeDist, 400);
      gl.bindVertexArray(g.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, meshes[d.mesh].count, meshes[d.mesh].type, 0, d.count);
      draws++;
      tris += meshes[d.mesh].tris * d.count;
    };
    for (const d of f.dyn) if (!d.additive) drawDyn(d);

    // superfície: opaca por baixo, translúcida por cima para o recife aparecer
    const above = cam[1] > 0.02;
    gl.enable(gl.CULL_FACE);
    gl.cullFace(above ? gl.FRONT : gl.BACK);
    if (above) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    use(prog.surf);
    gl.bindVertexArray(surfVao);
    gl.drawElements(gl.TRIANGLES, surfCount, gl.UNSIGNED_SHORT, 0);
    draws++;
    tris += surfCount / 3;
    gl.disable(gl.CULL_FACE);
    if (above) gl.disable(gl.BLEND);

    // transparentes (aditivos)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.depthMask(false);
    for (const d of f.dyn) if (d.additive) drawDyn(d);

    const rayK = cam[1] > 0.35 ? 0 : Math.exp(-depth * 0.035) * 0.15;
    if (rayK > 0.004) {
      p = use(prog.rays);
      gl.uniform1f(p.u.uGrid, Q.rays);
      gl.uniform1f(p.u.uStrength, rayK);
      gl.bindVertexArray(rayVao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, Q.rays * Q.rays);
      draws++;
    }
    p = use(prog.sprite);
    if (f.glows.count) {
      gl.bindBuffer(gl.ARRAY_BUFFER, glowBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, f.glows.data, 0, f.glows.count * 8);
      gl.uniform1i(p.u.uKind, 0);
      gl.uniform1f(p.u.uMaxPx, sceneH * 0.45);
      gl.bindVertexArray(glowVao);
      gl.drawArrays(gl.POINTS, 0, f.glows.count);
    }
    if (f.bubbles.count) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bubBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, f.bubbles.data, 0, f.bubbles.count * 8);
      gl.uniform1i(p.u.uKind, 1);
      gl.uniform1f(p.u.uMaxPx, sceneH * 0.026);
      gl.bindVertexArray(bubVao);
      gl.drawArrays(gl.POINTS, 0, f.bubbles.count);
    }
    if (cam[1] < 0.4) {
      p = use(prog.snow);
      gl.uniform1f(p.u.uBloom, f.bloom);
      gl.uniform1f(p.u.uLight, 0.25 + 0.75 * sunK);
      gl.bindVertexArray(snowVao);
      gl.drawArrays(gl.POINTS, 0, snowCount);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    // resolve o antisserrilhado (se houver) e leva a cena para a tela
    if (msFbo) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbo);
      gl.blitFramebuffer(0, 0, sceneW, sceneH, 0, 0, sceneW, sceneH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    p = use(prog.post);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.uniform1i(p.u.uTex, 0);
    gl.uniform1f(p.u.uFade, f.fade);
    gl.uniform1f(p.u.uAbove, f.above || 0);
    gl.uniform1f(p.u.uSplash, f.splash || 0);
    gl.bindVertexArray(triVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    Rn.stats.draws = draws;
    Rn.stats.tris = tris;
    Rn.stats.res = sceneW + '×' + sceneH;
  };
})();
