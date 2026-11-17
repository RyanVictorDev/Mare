// Maré — todo o som é sintetizado na hora com a Web Audio API (nenhum arquivo de áudio).
(function () {
  'use strict';
  const M = window.MARE;
  const A = (M.audio = { ready: false });
  let ctx, master, comp, reverb, revIn, ambBus, musicBus, airBus, sfxBus;
  let rumbleLP, rumbleGain, flowBP, flowGain, droneGain, windGain, white;
  let musicOn = true, volume = 0.8, duck = 1;
  let nextChord = 0, chordIdx = 0, airIdx = 0, nextBell = 0, nextBubble = 0, nextWhale = 0, nextGull = 0, curChord = null, curAir = null;

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const CHORDS = [
    [50, 57, 65, 69, 76], // Ré menor com nona
    [46, 53, 62, 65, 72], // Si bemol maior
    [41, 48, 57, 64, 67], // Fá maior com sétima
    [48, 55, 64, 67, 74], // Dó com nona
    [50, 57, 65, 69, 76],
    [45, 52, 60, 64, 71], // Lá menor com nona
    [46, 53, 62, 65, 72],
    [43, 50, 58, 62, 69], // Sol menor com nona
  ];
  // Em cima da água: acordes maiores, mais altos e mais abertos.
  const AIR = [
    [64, 67, 71, 74, 79],
    [60, 64, 67, 71, 76],
    [65, 69, 72, 76, 81],
    [62, 67, 71, 74, 79],
    [67, 71, 74, 79, 83],
    [64, 69, 72, 76, 81],
  ];

  function noiseBuffer(seconds, brown) {
    const n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        if (brown) {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        } else d[i] = w;
      }
      // emenda suave para repetir sem estalo
      const f = Math.floor(ctx.sampleRate * 0.05);
      for (let i = 0; i < f; i++) {
        const k = i / f;
        d[i] = d[i] * k + d[n - f + i] * (1 - k);
      }
    }
    return buf;
  }
  function impulse(seconds) {
    const n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        lp += (Math.random() * 2 - 1 - lp) * (0.5 - 0.4 * t);
        d[i] = lp * Math.pow(1 - t, 2.6);
      }
    }
    return buf;
  }
  const loop = buf => {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.loopEnd = buf.duration - 0.05;
    s.start();
    return s;
  };
  const gain = (v, dest) => {
    const g = ctx.createGain();
    g.gain.value = v;
    if (dest) g.connect(dest);
    return g;
  };
  const filter = (type, freq, q, dest) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    if (dest) f.connect(dest);
    return f;
  };
  const panner = (pan, dest) => {
    if (!ctx.createStereoPanner) return dest;
    const p = ctx.createStereoPanner();
    p.pan.value = M.clamp(pan, -1, 1);
    p.connect(dest);
    return p;
  };

  A.init = function () {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    master = gain(0, comp);
    reverb = ctx.createConvolver();
    reverb.buffer = impulse(3.2);
    reverb.connect(gain(0.8, master));
    revIn = gain(1, reverb);
    ambBus = gain(1, master);
    musicBus = gain(musicOn ? 1 : 0, master);
    const mSend = gain(0.75, revIn);
    musicBus.connect(mSend);
    airBus = gain(0, master);
    airBus.connect(gain(0.4, revIn));
    sfxBus = gain(1, master);
    const sSend = gain(0.45, revIn);
    sfxBus.connect(sSend);

    // ronco grave do oceano
    const brown = noiseBuffer(7, true);
    white = noiseBuffer(3, false);
    rumbleGain = gain(0.5, ambBus);
    rumbleLP = filter('lowpass', 260, 0.3, rumbleGain);
    loop(brown).connect(rumbleLP);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    lfo.connect(gain(0.14, rumbleGain.gain));
    lfo.start();
    // água passando pelos ouvidos (cresce com a velocidade)
    flowGain = gain(0, ambBus);
    flowBP = filter('bandpass', 420, 0.5, flowGain);
    loop(white).connect(flowBP);
    // zumbido das profundezas
    droneGain = gain(0, ambBus);
    windGain = gain(0, ambBus);
    loop(white).connect(filter('bandpass', 780, 0.45, windGain));
    for (const f of [49, 49.35, 73.6]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      o.connect(droneGain);
      o.start();
    }
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(volume, t, 1.2);
    nextChord = t + 1.5;
    nextBell = t + 9;
    nextBubble = t + 2;
    nextWhale = t + 14;
    nextGull = t + 6;
    A.ready = true;
  };

  A.setVolume = function (v) {
    volume = v;
    if (ctx) master.gain.setTargetAtTime(volume * duck, ctx.currentTime, 0.15);
  };
  A.setMusic = function (on) {
    musicOn = on;
  };
  // Abafa o som quando o jogo está pausado.
  A.setDuck = function (d) {
    duck = d;
    if (ctx) master.gain.setTargetAtTime(volume * duck, ctx.currentTime, 0.3);
  };

  // Nota simples com ataque e queda.
  function tone(freq, t, attack, decay, vol, dest, type, pan) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g);
    g.connect(pan ? panner(pan, dest) : dest);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
    return o;
  }

  function bubble(t, vol, pan) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f0 = rnd(280, 1100), d = rnd(0.05, 0.11);
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * rnd(1.4, 2.1), t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.03);
    o.connect(g);
    g.connect(panner(pan, sfxBus));
    o.start(t);
    o.stop(t + d + 0.06);
  }
  function hiss(t, dur, freq, vol) {
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = white;
    s.loop = true;
    const f = filter('bandpass', freq, 0.9, g);
    s.connect(f);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(vol * 0.7, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    g.connect(sfxBus);
    s.start(t, Math.random() * 2);
    s.stop(t + dur + 0.05);
  }
  A.inhale = function () {
    if (A.ready) hiss(ctx.currentTime, 1.7, 1900, 0.012);
  };
  A.exhale = function () {
    if (!A.ready) return;
    const t = ctx.currentTime;
    hiss(t, 1.9, 700, 0.022);
    for (let i = 0; i < 12; i++) bubble(t + rnd(0.05, 1.5), rnd(0.02, 0.05), rnd(-0.5, 0.5));
  };

  function chord(t) {
    const notes = CHORDS[chordIdx % CHORDS.length];
    chordIdx++;
    curChord = notes;
    const hold = 15, att = 5, rel = 7;
    const lp = filter('lowpass', 1100, 0.2, musicBus);
    notes.forEach((n, i) => {
      const f = midi(n), g = ctx.createGain(), peak = (i === 0 ? 0.06 : 0.04) * (1 - i * 0.07);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + att + i * 0.4);
      g.gain.setValueAtTime(peak, t + hold);
      g.gain.linearRampToValueAtTime(0.0001, t + hold + rel);
      g.connect(lp);
      for (const [type, det, v] of [['sine', 1, 1], ['triangle', 1.004, 0.35], ['sine', 0.4985, 0.5]]) {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = type;
        o.frequency.value = f * det;
        og.gain.value = v;
        o.connect(og);
        og.connect(g);
        o.start(t);
        o.stop(t + hold + rel + 0.1);
      }
    });
    nextChord = t + hold - 1;
  }
  function airChord(t) {
    const notes = AIR[airIdx % AIR.length];
    airIdx++;
    curAir = notes;
    const hold = 11, att = 3.5, rel = 5;
    const lp = filter('lowpass', 2200, 0.2, airBus);
    notes.forEach((n, i) => {
      const f = midi(n + 12), g = ctx.createGain(), peak = (i === 0 ? 0.045 : 0.03) * (1 - i * 0.08);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + att + i * 0.25);
      g.gain.setValueAtTime(peak, t + hold);
      g.gain.linearRampToValueAtTime(0.0001, t + hold + rel);
      g.connect(lp);
      for (const [type, det, v] of [['triangle', 1, 0.7], ['sine', 1.003, 0.8], ['sine', 2.002, 0.18]]) {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = type;
        o.frequency.value = f * det;
        og.gain.value = v;
        o.connect(og);
        og.connect(g);
        o.start(t);
        o.stop(t + hold + rel + 0.1);
      }
    });
    nextChord = t + hold - 1.5;
  }
  function bell(t, air) {
    const notes = air ? curAir : curChord;
    if (!notes) return;
    const bus = air ? airBus : musicBus;
    const n = notes[1 + ((Math.random() * 4) | 0)] + (air ? 12 : Math.random() < 0.6 ? 12 : 24), f = midi(n), pan = rnd(-0.7, 0.7), v = rnd(0.016, 0.035);
    tone(f, t, 0.03, rnd(3, 5), v, bus, 'sine', pan);
    tone(f * 2.001, t, 0.02, 1.6, v * 0.22, bus, 'sine', pan);
    if (Math.random() < 0.35) tone(midi(n + 7), t + rnd(0.5, 1.1), 0.03, 3.2, v * 0.6, bus, 'sine', -pan);
  }
  function gullCry(t, pan) {
    const base = rnd(1500, 2100);
    for (let i = 0; i < 3; i++) {
      const f = base * (1 - i * 0.07);
      tone(f, t + i * 0.14, 0.015, 0.16, 0.022, sfxBus, 'triangle', pan);
      tone(f * 1.5, t + i * 0.14, 0.01, 0.1, 0.008, sfxBus, 'sine', pan);
    }
  }

  // Canto da baleia: lamentos que sobem e descem, com vibrato e muito eco.
  function whaleCall(t, vol, pan) {
    const out = gain(1, panner(pan, sfxBus));
    out.connect(gain(1.6, revIn));
    const phrases = [[150, 290, 210, 2.6], [260, 130, 150, 2.2], [320, 470, 190, 3.0], [110, 180, 95, 2.8], [400, 520, 300, 1.8]];
    let at = t;
    const count = 2 + ((Math.random() * 3) | 0);
    for (let k = 0; k < count; k++) {
      const ph = phrases[(Math.random() * phrases.length) | 0], dur = ph[3] * rnd(0.85, 1.2);
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = filter('lowpass', 900, 2, g);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(ph[0], at);
      o.frequency.exponentialRampToValueAtTime(ph[1], at + dur * 0.55);
      o.frequency.exponentialRampToValueAtTime(ph[2], at + dur);
      const vib = ctx.createOscillator();
      vib.frequency.value = rnd(4, 6.5);
      vib.connect(gain(ph[0] * 0.025, o.frequency));
      vib.start(at);
      vib.stop(at + dur + 0.1);
      o.connect(lp);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(vol * 0.5, at + dur * 0.3);
      g.gain.linearRampToValueAtTime(vol * 0.35, at + dur * 0.75);
      g.gain.linearRampToValueAtTime(0.0001, at + dur);
      g.connect(out);
      o.start(at);
      o.stop(at + dur + 0.1);
      at += dur + rnd(0.3, 1.2);
    }
  }

  A.chime = function () {
    if (!A.ready) return;
    const t = ctx.currentTime;
    [74, 81, 86, 90, 93].forEach((n, i) => tone(midi(n), t + i * 0.085, 0.01, 2.0, 0.085, sfxBus, 'sine', (i - 2) * 0.2));
  };
  A.discover = function () {
    if (!A.ready) return;
    const t = ctx.currentTime;
    tone(midi(69), t, 0.25, 2.6, 0.06, sfxBus, 'triangle');
    tone(midi(76), t + 0.35, 0.25, 3.0, 0.06, sfxBus, 'triangle');
    tone(midi(81), t + 0.7, 0.25, 3.4, 0.045, sfxBus, 'sine');
  };
  A.ping = function () {
    if (!A.ready) return;
    const t = ctx.currentTime;
    tone(1046, t, 0.005, 0.9, 0.11, sfxBus, 'sine');
    tone(1046 * 2, t, 0.005, 0.3, 0.03, sfxBus, 'sine');
  };
  A.pingEcho = function (delay, pan) {
    if (!A.ready) return;
    const t = ctx.currentTime + delay;
    tone(1568, t, 0.005, 1.1, 0.07, sfxBus, 'sine', pan);
    tone(2093, t + 0.09, 0.005, 0.9, 0.04, sfxBus, 'sine', pan);
  };
  A.splash = function () {
    if (!A.ready) return;
    const t = ctx.currentTime;
    hiss(t, 0.4, 520, 0.08);
    hiss(t, 0.22, 1500, 0.035);
    for (let i = 0; i < 7; i++) bubble(t + rnd(0, 0.3), rnd(0.025, 0.06), rnd(-0.6, 0.6));
  };
  A.finale = function () {
    if (!A.ready) return;
    const t = ctx.currentTime;
    [50, 57, 62, 66, 69, 74, 78, 81, 86].forEach((n, i) => tone(midi(n), t + i * 0.16, 0.05, 6 - i * 0.2, 0.07, sfxBus, i % 2 ? 'sine' : 'triangle', ((i % 3) - 1) * 0.5));
  };

  // Chamado a cada quadro: s = { depth, speed, above, whaleDist, whalePan }.
  A.update = function (s) {
    if (!A.ready) return;
    const t = ctx.currentTime, deep = M.clamp(s.depth / 80, 0, 1), a = M.clamp(s.above || 0, 0, 1);
    rumbleLP.frequency.setTargetAtTime(M.lerp(300 - deep * 170, 520, a), t, 0.5);
    rumbleGain.gain.setTargetAtTime((0.42 + deep * 0.25) * (1 - a * 0.7) + a * 0.16, t, 0.5);
    droneGain.gain.setTargetAtTime((0.012 + deep * 0.07) * (1 - a), t, 0.8);
    windGain.gain.setTargetAtTime(a * 0.04, t, 0.6);
    flowGain.gain.setTargetAtTime(Math.min(0.11, s.speed * 0.013) * (1 - a * 0.65), t, 0.25);
    flowBP.frequency.setTargetAtTime(330 + s.speed * 70, t, 0.25);
    const music = musicOn ? 1 : 0;
    musicBus.gain.setTargetAtTime(music * (1 - a), t, 0.7);
    airBus.gain.setTargetAtTime(music * a, t, 0.7);
    if (t >= nextChord) {
      if (a > 0.55) airChord(t + 0.05);
      else chord(t + 0.05);
    }
    if (t >= nextBell) {
      bell(t + 0.05, a > 0.55);
      nextBell = t + (a > 0.55 ? rnd(2.4, 6.5) : rnd(3.5, 10));
    }
    if (t >= nextBubble && a < 0.4) {
      bubble(t + 0.02, rnd(0.006, 0.02), rnd(-1, 1));
      nextBubble = t + rnd(0.6, 3.5);
    } else if (a >= 0.4) nextBubble = t + 1.5;
    if (t >= nextGull && a > 0.6) {
      gullCry(t + 0.05, rnd(-0.8, 0.8));
      nextGull = t + rnd(7, 16);
    }
    if (t >= nextWhale) {
      const v = M.clamp(1.15 - s.whaleDist / 260, 0.05, 1);
      whaleCall(t + 0.1, v * 0.16, s.whalePan);
      nextWhale = t + (s.whaleDist < 90 ? rnd(12, 20) : rnd(24, 48));
    }
  };
})();
