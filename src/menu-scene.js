/* Animated pixel town behind the main menu:
   a dithered sky, drifting clouds, twinkling sparkles, little shops, floating clothes,
   customers walking the sidewalk and cars driving past. */
(() => {
  'use strict';
  const A = window.Art;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  let cv, ctx, raf = 0, running = false, last = 0, clock = 0;
  let W = 0, H = 0, PS = 4, groundY = 0, walkY = 0, roadY = 0;
  let skyCv = null, townCv = null;
  let clouds = [], sparks = [], floaters = [], walkers = [], cars = [];

  const SKIN = ['#f2d2b6', '#e0b08c', '#c68b62', '#8d5a3b', '#f7dcc4'];
  const HAIR = ['#2b2233', '#6b4423', '#d9a441', '#c0504d', '#a98bff', '#4aa3ff', '#ff6b9a'];
  const STYLE = ['short', 'spiky', 'beanie', 'hat', 'long', 'bun'];
  const OUTFIT = ['#6fd3b1', '#4aa3ff', '#ffd36e', '#ff6b9a', '#b5e48c', '#d0c4ff', '#e5484d', '#fff8f0'];
  const CATS = ['tshirt', 'hoodie', 'sweatshirt', 'jacket', 'shirt', 'tank'];
  const CAR_KINDS = ['sedan', 'hatch', 'coupe', 'convertible', 'van', 'sports'];

  const rect = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const hex = (n) => '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s) => ((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t;
    return hex((ch(16) << 16) | (ch(8) << 8) | ch(0));
  };

  /* ---------- static layers ---------- */
  function buildSky() {
    skyCv = document.createElement('canvas'); skyCv.width = W; skyCv.height = H;
    const c = skyCv.getContext('2d');
    const stops = ['#cdbdff', '#ffc4b0', '#ffe3c8', '#fff3e0'];
    const bands = 12, bh = Math.ceil(groundY / bands);
    const colorAt = (i) => {
      const t = (i / (bands - 1)) * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(t));
      return mix(stops[k], stops[k + 1], t - k);
    };
    for (let i = 0; i < bands; i++) {
      rect(c, 0, i * bh, W, bh + 1, colorAt(i));
      if (i < bands - 1) {                                        // dithered seam between bands
        c.fillStyle = colorAt(i + 1);
        for (let x = 0; x < W; x += 2) c.fillRect(x, (i + 1) * bh - 2, 1, 1), c.fillRect(x + 1, (i + 1) * bh - 1, 1, 1);
      }
    }
    rect(c, 0, groundY, W, H - groundY, '#fff3e0');
  }

  function shop(c, x, base, w, h, col, awn) {
    const dark = mix(col, '#261b3d', 0.25), light = mix(col, '#ffffff', 0.35);
    rect(c, x - 1, base - h - 1, w + 2, h + 1, '#261b3d');
    rect(c, x, base - h, w, h, col);
    rect(c, x, base - h, w, 2, light); rect(c, x + w - 3, base - h + 2, 3, h - 2, dark);   // lit roof edge, shaded side
    rect(c, x - 2, base - h - 4, w + 4, 4, '#261b3d'); rect(c, x - 1, base - h - 3, w + 2, 2, mix(col, '#261b3d', 0.15));
    // sign board with a tiny shirt
    rect(c, x + 4, base - h + 5, w - 8, 9, '#261b3d'); rect(c, x + 5, base - h + 6, w - 10, 7, '#fff8f0');
    rect(c, x + w / 2 - 3, base - h + 7, 6, 4, awn); rect(c, x + w / 2 - 5, base - h + 7, 2, 2, awn); rect(c, x + w / 2 + 3, base - h + 7, 2, 2, awn);
    // windows
    const rows = Math.max(1, Math.floor((h - 34) / 14));
    for (let r = 0; r < rows; r++) for (let k = 0; k < Math.max(1, Math.floor((w - 8) / 14)); k++) {
      const wx = x + 5 + k * 14, wy = base - h + 18 + r * 14;
      rect(c, wx - 1, wy - 1, 11, 10, '#261b3d'); rect(c, wx, wy, 9, 8, Math.random() < 0.4 ? '#ffe9a8' : '#bfe6ff');
      rect(c, wx + 1, wy + 1, 2, 1, '#ffffff'); rect(c, wx + 4, wy, 1, 8, '#261b3d');
    }
    // awning + door
    for (let i = 0; i < w; i += 4) rect(c, x + i, base - 22, 4, 6, (i / 4) % 2 ? '#fff8f0' : awn);
    rect(c, x, base - 17, w, 2, '#261b3d');
    rect(c, x + w / 2 - 6, base - 16, 12, 16, '#261b3d'); rect(c, x + w / 2 - 5, base - 15, 10, 15, '#8a5a3b');
    rect(c, x + w / 2 - 4, base - 14, 3, 6, '#b88a5a'); rect(c, x + w / 2 + 1, base - 14, 3, 6, '#b88a5a'); rect(c, x + w / 2 + 3, base - 7, 1, 1, '#ffd34d');
  }

  function buildTown() {
    townCv = document.createElement('canvas'); townCv.width = W; townCv.height = H;
    const c = townCv.getContext('2d');
    const cols = ['#ffb8a1', '#ffd98a', '#a9e8cf', '#cdb8ff', '#9fd0ff', '#ffc2d9'], awns = ['#ff6b6b', '#4aa3ff', '#5fcf9f', '#ffa31a', '#a98bff'];
    let x = -6, i = 0;
    while (x < W) {
      const w = Math.round(rand(46, 66)), h = Math.round(rand(70, 108));
      shop(c, x, groundY, w, h, cols[i % cols.length], awns[(i * 2) % awns.length]);
      x += w + Math.round(rand(2, 8)); i++;
    }
    // sidewalk
    rect(c, 0, groundY, W, walkY - groundY + 14, '#e9dccb');
    for (let px = 0; px < W; px += 12) rect(c, px, groundY + 1, 1, walkY - groundY + 13, '#d8c9b4');
    rect(c, 0, groundY, W, 2, '#f7efe3');
    // curb + road
    rect(c, 0, roadY - 4, W, 4, '#c9bfd6'); rect(c, 0, roadY - 4, W, 1, '#f2edf7');
    rect(c, 0, roadY, W, H - roadY, '#5f5873'); rect(c, 0, roadY, W, 1, '#7a7390');
    for (let px = 0; px < W; px += 36) rect(c, px, roadY + Math.round((H - roadY) / 2) - 1, 18, 2, '#ffe08a');
  }

  /* ---------- moving things ---------- */
  function newCloud(anywhere) {
    const w = Math.round(rand(26, 56)), h = Math.round(w * 0.42);
    const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
    const c = cvs.getContext('2d');
    rect(c, 4, h - 6, w - 8, 6, '#ffffff'); rect(c, 0, h - 4, w, 4, '#ffffff');
    rect(c, 6, h - 11, Math.round(w * 0.35), 6, '#ffffff'); rect(c, Math.round(w * 0.38), h - h + 1, Math.round(w * 0.34), h - 4, '#ffffff');
    rect(c, 0, h - 2, w, 2, '#efe4f7'); rect(c, 4, h - 6, w - 8, 1, '#f8f2fb');
    return { cvs, x: anywhere ? rand(-20, W) : -w - 4, y: rand(6, groundY * 0.55), v: rand(2.5, 7) };
  }

  function newSpark() { return { x: rand(4, W - 4), y: rand(4, groundY * 0.7), ph: rand(0, 6.28), sp: rand(1.2, 2.6), big: Math.random() < 0.3, col: pick(['#fff3a8', '#ffffff', '#ffd36e']) }; }

  function newFloater(anywhere) {
    const base = pick(['#ff8a6b', '#4aa3ff', '#a98bff', '#5fcf9f', '#ffd36e', '#ff6b9a']);
    const cvs = document.createElement('canvas'); cvs.width = cvs.height = 24;
    A.drawGarment(cvs.getContext('2d'), { cat: pick(CATS), base, px: [] }, 1);
    return { cvs, x: rand(6, W - 30), y: anywhere ? rand(0, groundY) : groundY + 4, v: rand(5, 11), sway: rand(3, 7), ph: rand(0, 6.28) };
  }

  function newWalker(anywhere) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const look = {
      skin: pick(SKIN), hair: pick(HAIR), style: pick(STYLE), accent: pick(['#b78be8', '#ff8a6b', '#5fcf9f']),
      outfit: { cat: pick(CATS), col: pick(OUTFIT) }, pants: pick(['#3b4a7a', '#5b6073', '#8a5a3b', '#2b2233']), shoes: pick(['#fff8f0', '#2b2233', '#e5484d']),
    };
    return { frames: A.personFrames(look), dir, x: anywhere ? rand(0, W) : (dir > 0 ? -16 : W + 16), y: walkY + Math.round(rand(2, 9)), v: rand(16, 28), t: rand(0, 3) };
  }

  function newCar(anywhere) {
    const kind = pick(CAR_KINDS), spec = A.CAR_SPEC[kind], near = Math.random() < 0.5;
    const dir = near ? 1 : -1;
    return { spr: A.carSprite(kind, pick(spec.cols)), w: spec.w, dir, near, x: anywhere ? rand(0, W) : (dir > 0 ? -spec.w : W + spec.w), y: near ? H - 4 : H - 15, v: near ? rand(34, 52) : rand(24, 38), t: rand(0, 6) };
  }

  function seed() {
    clouds = Array.from({ length: Math.max(3, Math.round(W / 90)) }, () => newCloud(true));
    sparks = Array.from({ length: Math.max(14, Math.round(W / 14)) }, newSpark);
    floaters = Array.from({ length: Math.max(3, Math.round(W / 90)) }, () => newFloater(true));
    walkers = Array.from({ length: Math.max(4, Math.round(W / 70)) }, () => newWalker(true));
    cars = Array.from({ length: 2 }, () => newCar(true));
  }

  /* ---------- loop ---------- */
  function resize() {
    if (!cv) return;
    const vw = innerWidth, vh = innerHeight;
    PS = vw < 700 ? 3 : vw > 1500 ? 5 : 4;
    W = Math.ceil(vw / PS); H = Math.ceil(vh / PS);
    cv.width = W; cv.height = H; cv.style.width = W * PS + 'px'; cv.style.height = H * PS + 'px';
    roadY = H - 24; walkY = roadY - 18; groundY = walkY - 12;
    buildSky(); buildTown(); seed();
    if (!running) draw(0);
  }

  function drawPerson(w, frame) {
    const x = Math.round(w.x), y = Math.round(w.y);
    ctx.fillStyle = 'rgba(38,27,61,.2)'; ctx.fillRect(x - 7, y - 2, 14, 3);
    ctx.save(); ctx.translate(x, y - 32);
    if (w.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(w.frames[frame], -11, 0);
    ctx.restore();
  }

  function drawCar(c) {
    const x = Math.round(c.x), bounce = Math.sin(clock * 16 + c.t) > 0.75 ? -1 : 0;
    ctx.fillStyle = 'rgba(38,27,61,.3)'; ctx.fillRect(x - c.w / 2 + 2, c.y - 2, c.w - 4, 3);
    ctx.save(); ctx.translate(x, c.y - (c.spr.height - 2) + bounce);
    if (c.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(c.spr, -c.w / 2 - 1, 0);
    ctx.restore();
  }

  function update(dt) {
    clock += dt;
    clouds.forEach((c, i) => { c.x += c.v * dt; if (c.x > W + 4) clouds[i] = newCloud(false); });
    floaters.forEach((f, i) => { f.y -= f.v * dt; if (f.y < -26) floaters[i] = newFloater(false); });
    walkers.forEach((w, i) => { w.x += w.dir * w.v * dt; w.t += dt; if ((w.dir > 0 && w.x > W + 20) || (w.dir < 0 && w.x < -20)) walkers[i] = newWalker(false); });
    cars.forEach((c, i) => { c.x += c.dir * c.v * dt; if ((c.dir > 0 && c.x > W + c.w) || (c.dir < 0 && c.x < -c.w)) cars[i] = newCar(false); });
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(skyCv, 0, 0);
    clouds.forEach((c) => ctx.drawImage(c.cvs, Math.round(c.x), Math.round(c.y)));
    sparks.forEach((s) => {                                           // twinkling 4-point sparkles
      const a = Math.sin(clock * s.sp + s.ph);
      if (a < -0.2) return;
      ctx.fillStyle = s.col;
      const x = Math.round(s.x), y = Math.round(s.y);
      ctx.fillRect(x, y, 1, 1);
      if (a > 0.3) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
      if (a > 0.75 && s.big) { ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x, y - 2, 1, 5); }
    });
    ctx.drawImage(townCv, 0, 0);
    floaters.forEach((f) => ctx.drawImage(f.cvs, Math.round(f.x + Math.sin(clock * 0.9 + f.ph) * f.sway), Math.round(f.y)));
    cars.filter((c) => !c.near).forEach(drawCar);
    [...walkers].sort((a, b) => a.y - b.y).forEach((w) => drawPerson(w, Math.floor(w.t * 5) % 2 ? 1 : 2));
    cars.filter((c) => c.near).forEach(drawCar);
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min((ts - (last || ts)) / 1000, 0.1); last = ts;
    update(dt); draw();
    raf = requestAnimationFrame(loop);
  }

  window.MenuScene = {
    start(canvas) {
      cv = canvas; ctx = cv.getContext('2d');
      cv.hidden = false;
      if (!skyCv || W !== Math.ceil(innerWidth / PS)) resize();
      if (running) return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { draw(); return; }
      running = true; last = 0; raf = requestAnimationFrame(loop);
    },
    stop() { running = false; cancelAnimationFrame(raf); if (cv) cv.hidden = true; },
  };
  window.addEventListener('resize', () => { if (cv && !cv.hidden) resize(); });
})();
