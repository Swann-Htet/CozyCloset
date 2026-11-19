/* Cozy Closet music.
   Three built-in tracks are generated live with the Web Audio API (soft lo-fi, no audio files needed).
   Players can also load their own music file (kept in this browser) or play a YouTube video / playlist. */
(() => {
  'use strict';
  const KEY = 'cozy-closet-music';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const rand = Math.random;

  /* ---------- built-in tracks ---------- */
  const TRACKS = {
    morning: {
      name: 'Cozy Morning', mood: 'Soft lo-fi with warm jazzy chords', bpm: 76, wave: 'triangle', lead: 'triangle', swing: 0.14, drums: 1, density: 0.4, crackle: false,
      chords: [[48, [0, 4, 7, 11]], [45, [0, 3, 7, 10]], [50, [0, 3, 7, 10]], [43, [0, 4, 7, 10]]], scale: [0, 2, 4, 7, 9], base: 72,
    },
    sunny: {
      name: 'Sunny Street', mood: 'Bright, bouncy little chiptune walk', bpm: 104, wave: 'triangle', lead: 'square', swing: 0.05, drums: 1.3, density: 0.55, crackle: false,
      chords: [[41, [0, 4, 7, 11]], [43, [0, 4, 7, 10]], [40, [0, 3, 7, 10]], [45, [0, 3, 7, 10]]], scale: [0, 2, 4, 7, 9], base: 72,
    },
    night: {
      name: 'Quiet Night Shop', mood: 'Slow, dreamy and warm', bpm: 62, wave: 'sine', lead: 'sine', swing: 0.1, drums: 0.6, density: 0.28, crackle: true,
      chords: [[45, [0, 3, 7, 10]], [41, [0, 4, 7, 11]], [48, [0, 4, 7, 11]], [43, [0, 4, 7, 10]]], scale: [0, 3, 5, 7, 10], base: 69,
    },
  };

  /* ---------- settings ---------- */
  const defaults = { on: true, vol: 0.4, source: 'builtin', track: 'morning', yt: null, fileName: '' };
  let S = { ...defaults };
  try { S = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* ignore */ }
  if (!TRACKS[S.track]) S.track = 'morning';
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

  let playing = false, muted = false, onChange = () => {}, onMessage = () => {};
  const emit = () => onChange(info());
  const eff = () => (muted ? 0 : S.vol);

  /* ---------- Web Audio engine for the built-in tracks ---------- */
  let ctx = null, out = null, bus = null, send = null, echo = null, noiseBuf = null;
  let timer = 0, nextT = 0, step = 0, bar = 0, cur = TRACKS.morning, pattern = [];

  function ensureCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    out = ctx.createGain(); out.gain.value = 0; out.connect(ctx.destination);
    bus = ctx.createGain(); bus.connect(out);
    // little room reverb from a generated impulse response
    const len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 3); }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.38; conv.connect(wet); wet.connect(out);
    send = ctx.createGain(); send.gain.value = 0.5; send.connect(conv); bus.connect(send);
    // soft echo for the melody
    echo = ctx.createDelay(1); echo.delayTime.value = 0.375;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    echo.connect(lp); lp.connect(fb); fb.connect(echo); lp.connect(bus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = rand() * 2 - 1;
  }

  function tone(f, t, dur, o) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type; osc.frequency.value = f;
    if (o.lp) { const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = o.lp; osc.connect(flt); flt.connect(g); } else osc.connect(g);
    const a = o.attack || 0.01, r = o.release || 0.2, end = t + dur;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.gain, t + a);
    g.gain.setValueAtTime(o.gain, Math.max(t + a, end - r));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    g.connect(bus); if (o.melody) g.connect(echo);
    osc.start(t); osc.stop(end + 0.05);
  }

  function kick(t, gain) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(130, t); osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g); g.connect(bus); osc.start(t); osc.stop(t + 0.32);
  }

  function noise(t, gain, dur, type, freq) {
    const src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; flt.type = type; flt.frequency.value = freq;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(bus); src.start(t, rand() * 0.5); src.stop(t + dur + 0.02);
  }

  function makePattern() {                                   // 4 bars x 8 steps of scale degrees (or null)
    const p = []; let idx = 4;
    for (let i = 0; i < 32; i++) {
      const chance = cur.density * (i % 2 ? 0.55 : 1);
      if (rand() < chance) { idx = clamp(idx + [-2, -1, 0, 1, 2][Math.floor(rand() * 5)], 0, 9); p.push(idx); } else p.push(null);
    }
    return p;
  }
  function mutate() {
    pattern = pattern.map((v) => (rand() < 0.22 ? (rand() < cur.density ? Math.floor(rand() * 10) : null) : v));
  }

  function playStep(s, t, b) {
    const eighth = 60 / cur.bpm / 2, chord = cur.chords[b % 4];
    if (s === 0) {                                           // warm pad on the first beat of each bar
      chord[1].forEach((iv) => tone(mtof(chord[0] + 12 + iv), t, eighth * 7.8, { type: cur.wave, gain: 0.032, attack: 0.35, release: 0.9, lp: 1100 }));
    }
    if (s === 0 || s === 4) tone(mtof(chord[0] - 12), t, eighth * 1.9, { type: 'sine', gain: s === 0 ? 0.17 : 0.12, attack: 0.01, release: 0.18 });
    if (s === 0 || s === 4) kick(t, 0.2 * cur.drums);
    if (s === 2 || s === 6) noise(t, 0.05 * cur.drums, 0.14, 'bandpass', 1800);
    noise(t, (s % 2 ? 0.016 : 0.026) * cur.drums, 0.04, 'highpass', 7000);
    const idx = pattern[(b % 4) * 8 + s];
    if (idx != null) {
      const note = cur.base + cur.scale[idx % 5] + 12 * Math.floor(idx / 5);
      tone(mtof(note), t, eighth * (rand() < 0.3 ? 2 : 1.1), { type: cur.lead, gain: cur.lead === 'square' ? 0.04 : 0.08, attack: 0.012, release: 0.28, lp: 3200, melody: true });
    }
    if (cur.crackle) noise(t + rand() * eighth, 0.012, 0.012, 'highpass', 3000);
  }

  function schedule() {
    const eighth = 60 / cur.bpm / 2;
    while (nextT < ctx.currentTime + 0.3) {
      playStep(step, nextT + (step % 2 ? eighth * cur.swing : 0), bar);
      nextT += eighth; step++;
      if (step === 8) { step = 0; bar++; if (bar % 4 === 0) mutate(); }
    }
  }

  function startBuiltin() {
    ensureCtx(); ctx.resume();
    cur = TRACKS[S.track]; pattern = makePattern(); step = 0; bar = 0; nextT = ctx.currentTime + 0.15;
    clearInterval(timer); timer = setInterval(schedule, 40);
    out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(eff(), ctx.currentTime, 0.5);
  }
  function stopBuiltin() {
    clearInterval(timer);
    if (ctx && out) { out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(0, ctx.currentTime, 0.12); }
  }

  /* ---------- the player's own music file (stored in IndexedDB) ---------- */
  const idb = {
    open: () => new Promise((res, rej) => { const r = indexedDB.open('cozy-closet', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
    async put(k, v) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
    async get(k) { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async del(k) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
  };
  let audioEl = null, fileUrl = '';

  async function startFile() {
    let blob = null;
    try { blob = await idb.get('music-file'); } catch (e) { /* ignore */ }
    if (!blob) { playing = false; onMessage('Choose a music file first.', true); emit(); return; }
    if (!playing || S.source !== 'file') return;
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    fileUrl = URL.createObjectURL(blob);
    audioEl = audioEl || new Audio();
    audioEl.loop = true; audioEl.src = fileUrl; audioEl.volume = eff();
    audioEl.play().catch(() => { playing = false; onMessage('The browser could not play that file.', true); emit(); });
  }

  /* ---------- YouTube (IFrame player API) ---------- */
  let ytPromise = null, ytPlayer = null;
  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytPromise) return ytPromise;
    ytPromise = new Promise((res, rej) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); };
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => { ytPromise = null; rej(new Error('offline')); };
      document.head.appendChild(s);
    });
    return ytPromise;
  }

  function parseYT(text) {
    const raw = String(text || '').trim();
    if (/^[\w-]{11}$/.test(raw)) return { id: raw, list: null };
    try {
      const u = new URL(raw);
      if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(u.hostname)) return null;
      let id = null; const list = u.searchParams.get('list');
      if (u.hostname.endsWith('youtu.be')) id = u.pathname.slice(1).split('/')[0];
      else if (u.pathname === '/watch') id = u.searchParams.get('v');
      else { const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]{11})/); if (m) id = m[2]; }
      if (id && !/^[\w-]{11}$/.test(id)) id = null;
      return id || list ? { id, list: list && /^[\w-]+$/.test(list) ? list : null } : null;
    } catch (e) { return null; }
  }

  function ytHolder() {
    let h = document.getElementById('yt-holder');
    if (!h) { h = document.createElement('div'); h.id = 'yt-holder'; h.setAttribute('aria-hidden', 'true'); document.body.appendChild(h); }
    return h;
  }

  function applyYTVideo() {
    const yt = S.yt; if (!yt || !ytPlayer) return;
    ytPlayer.setVolume(Math.round(eff() * 100));
    if (yt.id) ytPlayer.loadVideoById(yt.id);
    else ytPlayer.loadPlaylist({ list: yt.list, listType: 'playlist', index: 0 });
  }

  function startYT() {
    if (!S.yt) { playing = false; onMessage('Paste a YouTube link first.', true); emit(); return; }
    loadYT().then(() => {
      if (!playing || S.source !== 'youtube') return;
      if (ytPlayer && ytPlayer.loadVideoById) { applyYTVideo(); return; }
      const holder = ytHolder(), div = document.createElement('div'); div.id = 'yt-player'; holder.appendChild(div);
      ytPlayer = new window.YT.Player('yt-player', {
        width: 320, height: 180,
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, playsinline: 1, rel: 0, origin: location.origin },
        events: {
          onReady: applyYTVideo,
          onStateChange: (e) => {
            const st = window.YT.PlayerState;
            if (e.data === st.ENDED) ytPlayer.playVideo();                       // loop
            if (e.data === st.PLAYING) {
              const d = ytPlayer.getVideoData && ytPlayer.getVideoData();
              if (d && d.title && S.yt && S.yt.title !== d.title) { S.yt.title = d.title; save(); }
              emit();
            }
          },
          onError: (e) => {
            playing = false; emit();
            onMessage(e.data === 101 || e.data === 150 ? 'That video does not allow playing outside YouTube. Try another link.' : e.data === 100 ? 'That video was not found.' : 'YouTube could not play that link.', true);
          },
        },
      });
    }).catch(() => { playing = false; emit(); onMessage('Could not reach YouTube. Check your internet connection.', true); });
  }

  /* ---------- controller ---------- */
  function stopAll() {
    stopBuiltin();
    if (audioEl) audioEl.pause();
    if (ytPlayer && ytPlayer.pauseVideo) { try { ytPlayer.pauseVideo(); } catch (e) { /* ignore */ } }
  }
  function applyVol() {
    const v = eff();
    if (ctx && out && playing && S.source === 'builtin') out.gain.setTargetAtTime(v, ctx.currentTime, 0.1);
    if (audioEl) audioEl.volume = v;
    if (ytPlayer && ytPlayer.setVolume) { try { ytPlayer.setVolume(Math.round(v * 100)); } catch (e) { /* ignore */ } }
  }

  function play() {
    stopAll(); S.on = true; playing = true; save();
    if (S.source === 'builtin') startBuiltin();
    else if (S.source === 'file') startFile();
    else startYT();
    emit();
  }
  function pause() { S.on = false; playing = false; save(); stopAll(); emit(); }

  function info() {
    let label = TRACKS[S.track].name, sub = TRACKS[S.track].mood;
    if (S.source === 'file') { label = S.fileName || 'My music'; sub = 'Your music file'; }
    if (S.source === 'youtube') { label = (S.yt && S.yt.title) || 'YouTube'; sub = 'From YouTube'; }
    return { playing, label, sub, source: S.source, track: S.track, vol: S.vol, fileName: S.fileName, yt: S.yt, muted };
  }

  window.Music = {
    TRACKS, info, parseYT,
    set onChange(f) { onChange = f; }, set onMessage(f) { onMessage = f; },
    init() {
      // browsers only allow sound after a click or key press, so start on the first one
      const go = () => {
        document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true);
        if (S.on && !playing) play();
      };
      document.addEventListener('pointerdown', go, true); document.addEventListener('keydown', go, true);
      emit();
    },
    play, pause, toggle() { if (playing) pause(); else play(); },
    setVolume(v) { S.vol = clamp(v, 0, 1); save(); applyVol(); emit(); },
    setMuted(m) { muted = !!m; applyVol(); emit(); },
    selectTrack(id) { if (!TRACKS[id]) return; S.track = id; S.source = 'builtin'; save(); play(); },
    async setFile(file) {
      if (!file) return;
      if (!/^audio\//.test(file.type) && !/\.(mp3|ogg|wav|m4a|aac|flac)$/i.test(file.name)) { onMessage('Please choose an audio file (mp3, ogg, wav, m4a).', true); return; }
      if (file.size > 30 * 1024 * 1024) { onMessage('That file is too big (max 30 MB).', true); return; }
      try { await idb.put('music-file', file); } catch (e) { onMessage('Could not keep that file in this browser.', true); return; }
      S.source = 'file'; S.fileName = file.name.slice(0, 60); save(); play();
    },
    async clearFile() {
      try { await idb.del('music-file'); } catch (e) { /* ignore */ }
      S.fileName = ''; if (S.source === 'file') { S.source = 'builtin'; if (playing) { save(); play(); return; } }
      save(); emit();
    },
    setYouTube(text) {
      const p = parseYT(text);
      if (!p) { onMessage('That does not look like a YouTube link.', true); return false; }
      S.yt = { id: p.id, list: p.list, url: String(text).trim().slice(0, 200), title: '' }; S.source = 'youtube'; save(); play();
      return true;
    },
    useSource(src) { if (['builtin', 'file', 'youtube'].includes(src)) { S.source = src; save(); if (playing) play(); else emit(); } },
  };
})();
