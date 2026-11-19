/* Clothes Shop - pixel art engine
   Everything is drawn procedurally: garments, characters, furniture and the room.
   Style: dark outline, top-left light, bevelled edges and soft ground shadows for a chunky 3D pixel look. */
(() => {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const OUT = '#261b3d';

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => clamp(Math.round(c + (amt < 0 ? c : 255 - c) * amt), 0, 255);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('');
  }

  /* outlined block with a lit top/left edge and a dark bottom/right edge */
  function bx(c, x, y, w, h, col, hl = 0.24, sh = -0.26) {
    c.fillStyle = OUT; c.fillRect(x - 1, y - 1, w + 2, h + 2);
    c.fillStyle = col; c.fillRect(x, y, w, h);
    if (w >= 3 && h >= 3) {
      c.fillStyle = shade(col, hl); c.fillRect(x, y, w, 1); c.fillRect(x, y, 1, h);
      c.fillStyle = shade(col, sh); c.fillRect(x, y + h - 1, w, 1); c.fillRect(x + w - 1, y, 1, h);
    }
  }
  const rect = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

  /* ================= GARMENT TEMPLATES (24 x 24) =================
     codes: o body  s sleeve  t trim (light)  i inside (dark)  d detail line  k shadow  b button  z zipper */
  const N = 24;

  function grid(fn) {
    const g = new Array(N * N).fill('.');
    const R = (x, y, w, h, c) => {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (xx >= 0 && xx < N && yy >= 0 && yy < N) g[yy * N + xx] = c;
    };
    const M = (x, y, w, h, c) => { R(x, y, w, h, c); R(N - x - w, y, w, h, c); };
    fn(R, M);
    return g;
  }

  const CATS = {
    tshirt: {
      label: 'T-Shirt', base: 12,
      build(R, M) {
        R(6, 5, 12, 16, 'o');
        M(4, 5, 2, 1, 's'); M(3, 6, 3, 1, 's'); M(2, 7, 4, 3, 's'); M(2, 10, 4, 1, 't');
        R(9, 5, 6, 2, 'i'); R(8, 5, 1, 3, 't'); R(15, 5, 1, 3, 't'); R(9, 7, 6, 1, 't');
        R(6, 20, 12, 1, 'k');
      },
    },
    hoodie: {
      label: 'Hoodie', base: 24,
      build(R, M) {
        R(8, 1, 8, 1, 't'); R(6, 2, 12, 1, 't'); R(5, 3, 14, 5, 't'); R(8, 4, 8, 4, 'i');
        R(6, 8, 12, 13, 'o'); R(6, 8, 12, 1, 'k');
        M(4, 8, 2, 1, 's'); M(3, 9, 3, 1, 's'); M(2, 10, 4, 8, 's'); M(2, 18, 4, 2, 't');
        R(6, 19, 12, 2, 't');
        R(8, 13, 8, 5, 't'); R(8, 13, 8, 1, 'd'); R(8, 13, 1, 5, 'd'); R(15, 13, 1, 5, 'd');
        R(10, 8, 1, 5, 'd'); R(13, 8, 1, 5, 'd');
      },
    },
    sweatshirt: {
      label: 'Sweatshirt', base: 20,
      build(R, M) {
        R(6, 4, 12, 17, 'o');
        M(4, 4, 2, 1, 's'); M(3, 5, 3, 1, 's'); M(2, 6, 4, 12, 's'); M(2, 18, 4, 2, 't');
        R(6, 19, 12, 2, 't');
        R(8, 4, 8, 1, 't'); R(8, 5, 1, 2, 't'); R(15, 5, 1, 2, 't'); R(9, 5, 6, 2, 'i'); R(9, 7, 6, 1, 't');
      },
    },
    jacket: {
      label: 'Jacket', base: 30,
      build(R, M) {
        R(6, 5, 12, 16, 'o');
        M(4, 5, 2, 1, 's'); M(3, 6, 3, 1, 's'); M(2, 7, 4, 11, 's'); M(2, 18, 4, 2, 't');
        R(6, 19, 12, 2, 't');
        M(7, 3, 3, 4, 't'); R(10, 3, 4, 4, 'i');
        R(11, 7, 1, 13, 'd'); R(12, 7, 1, 13, 'z');
        M(7, 14, 3, 1, 'd'); M(7, 18, 3, 1, 'd'); M(7, 14, 1, 5, 'd');
      },
    },
    shirt: {
      label: 'Shirt', base: 16,
      build(R, M) {
        R(6, 5, 12, 16, 'o');
        M(4, 5, 2, 1, 's'); M(3, 6, 3, 1, 's'); M(2, 7, 4, 3, 's'); M(2, 10, 4, 1, 't');
        M(8, 5, 3, 3, 't'); R(11, 5, 2, 3, 'i');
        R(11, 8, 2, 12, 't'); R(11, 10, 2, 1, 'b'); R(11, 13, 2, 1, 'b'); R(11, 16, 2, 1, 'b'); R(11, 19, 2, 1, 'b');
        R(14, 10, 3, 1, 'd'); R(14, 10, 1, 3, 'd'); R(16, 10, 1, 3, 'd'); R(14, 12, 3, 1, 'd');
        R(6, 20, 12, 1, 'k');
      },
    },
    tank: {
      label: 'Tank Top', base: 9,
      build(R, M) {
        R(6, 9, 12, 12, 'o');
        M(7, 2, 3, 7, 'o');
        R(10, 8, 4, 1, 't');
        R(6, 20, 12, 1, 'k'); R(6, 9, 1, 2, 'k'); R(17, 9, 1, 2, 'k');
      },
    },
  };
  Object.values(CATS).forEach((c) => { c.grid = grid(c.build); });

  const paintable = (cat, i) => { const k = CATS[cat].grid[i]; return k === 'o' || k === 's'; };

  function codeColor(code, base) {
    switch (code) {
      case 's': return shade(base, -0.08);
      case 't': return shade(base, 0.32);
      case 'i': return shade(base, -0.55);
      case 'd': return shade(base, -0.62);
      case 'k': return shade(base, -0.28);
      case 'b': return '#fff8f0';
      case 'z': return '#eee6f6';
      default: return base;
    }
  }

  /* d = { cat, base, px[576] } - draws with an automatic outline and edge bevel */
  function drawGarment(c, d, cell, ox = 0, oy = 0) {
    const g = CATS[d.cat].grid;
    const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? '.' : g[y * N + x]);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const code = g[y * N + x];
      let col;
      if (code === '.') {
        if (at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.') col = OUT; else continue;
      } else {
        const p = d.px && d.px[y * N + x];
        col = (code === 'o' || code === 's') && p ? p : codeColor(code, d.base);
        if (at(x - 1, y) === '.' || at(x, y - 1) === '.') col = shade(col, 0.16);
        else if (at(x + 1, y) === '.' || at(x, y + 1) === '.') col = shade(col, -0.2);
      }
      c.fillStyle = col; c.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    }
  }

  function garmentCanvas(d) {
    if (d._cv) return d._cv;
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    drawGarment(cv.getContext('2d'), d, 1);
    Object.defineProperty(d, '_cv', { value: cv, enumerable: false, configurable: true });
    return cv;
  }
  const gm = (c, d, x, y, w, h) => { c.imageSmoothingEnabled = false; c.drawImage(garmentCanvas(d), x, y, w, h); };

  /* ================= PEOPLE (chibi characters) ================= */
  function buildPerson(look, frame) {
    const W = 22, H = 34;
    const g = new Array(W * H).fill(null);
    const R = (x, y, w, h, c) => {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        const X = xx + 1, Y = yy + 1;
        if (X >= 0 && X < W && Y >= 0 && Y < H) g[Y * W + X] = c;
      }
    };
    const row = (y, x0, x1, c) => R(x0, y, x1 - x0 + 1, 1, c);
    const o = look.outfit, col = o.col, cat = o.cat;
    const skin = look.skin, skinD = shade(skin, -0.12), hair = look.hair;
    const pants = look.pants;

    // legs + shoes (frame 1/2 lift one foot for the walk cycle)
    const lh = frame === 1 ? 4 : 6, rh = frame === 2 ? 4 : 6;
    R(6, 23, 3, lh, pants); R(6, 23, 1, lh, shade(pants, 0.15));
    R(11, 23, 3, rh, pants); R(13, 23, 1, rh, shade(pants, -0.2));
    R(5, 23 + lh, 4, 2, look.shoes); R(5, 23 + lh, 4, 1, shade(look.shoes, 0.3));
    R(11, 23 + rh, 4, 2, look.shoes); R(11, 23 + rh, 4, 1, shade(look.shoes, 0.3));

    // torso
    const tank = cat === 'tank';
    if (tank) { R(5, 15, 10, 2, skin); R(6, 15, 2, 2, col); R(12, 15, 2, 2, col); R(5, 17, 10, 6, col); }
    else R(5, 15, 10, 8, col);
    R(5, tank ? 17 : 15, 2, tank ? 5 : 7, shade(col, 0.18));
    R(13, tank ? 17 : 15, 2, tank ? 5 : 7, shade(col, -0.2));
    R(5, 22, 10, 1, shade(col, -0.28));
    if (cat === 'hoodie') {
      R(7, 19, 6, 3, shade(col, -0.12)); R(8, 17, 1, 3, '#fff8f0'); R(11, 17, 1, 3, '#fff8f0');
    } else if (cat === 'jacket') {
      R(9, 15, 1, 8, '#eee6f6'); R(10, 15, 1, 8, shade(col, -0.3));
    } else if (cat === 'shirt') {
      R(9, 16, 2, 7, shade(col, 0.2)); R(9, 18, 2, 1, '#fff8f0'); R(9, 20, 2, 1, '#fff8f0');
    } else if (cat === 'sweatshirt') {
      R(5, 22, 10, 1, shade(col, 0.25));
    }

    // arms (swing opposite to the legs)
    const dyL = frame === 2 ? 1 : 0, dyR = frame === 1 ? 1 : 0;
    const longS = cat === 'hoodie' || cat === 'jacket' || cat === 'sweatshirt';
    const arm = (x, dy, dark) => {
      const sc = dark ? shade(col, -0.15) : shade(col, 0.1), sk = dark ? skinD : skin;
      if (tank) R(x, 16 + dy, 2, 7, sk);
      else if (longS) { R(x, 16 + dy, 2, 6, sc); R(x, 22 + dy, 2, 2, sk); }
      else { R(x, 16 + dy, 2, 3, sc); R(x, 19 + dy, 2, 4, sk); }
    };
    arm(3, dyL, false); arm(15, dyR, true);

    // hood collar sits behind the head
    if (cat === 'hoodie') R(4, 14, 12, 3, shade(col, 0.16));
    if (cat === 'jacket') { R(5, 15, 3, 2, shade(col, 0.25)); R(12, 15, 3, 2, shade(col, 0.25)); }
    if (cat === 'shirt') { R(6, 15, 3, 2, '#fff8f0'); R(11, 15, 3, 2, '#fff8f0'); }

    // head
    row(3, 5, 14, skin);
    for (let y = 4; y <= 12; y++) row(y, 3, 16, skin);
    row(13, 4, 15, skin); row(14, 6, 13, skinD);
    R(16, 4, 1, 9, skinD);
    // face
    const eye = look.eye || '#2a1f3d';
    R(6, 8, 2, 3, eye); R(12, 8, 2, 3, eye);
    R(6, 8, 1, 1, '#ffffff'); R(12, 8, 1, 1, '#ffffff');
    R(4, 11, 2, 1, '#ff9aa2'); R(14, 11, 2, 1, '#ff9aa2');
    R(9, 12, 2, 1, '#b0564f');

    // hair / hats
    const cap = () => {
      row(1, 6, 13, hair); row(2, 4, 15, hair); row(3, 3, 16, hair); row(4, 3, 16, hair);
      R(3, 5, 2, 3, hair); R(15, 5, 2, 3, hair);
      R(5, 5, 4, 1, hair); R(10, 5, 2, 1, hair); R(12, 5, 3, 1, hair);
      R(6, 2, 3, 1, shade(hair, 0.3)); R(14, 3, 2, 2, shade(hair, -0.2));
    };
    const style = look.style;
    if (style === 'short') cap();
    else if (style === 'spiky') {
      row(2, 4, 15, hair); row(3, 3, 16, hair); row(4, 3, 16, hair); R(3, 5, 2, 3, hair); R(15, 5, 2, 3, hair);
      R(4, 0, 2, 2, hair); R(8, -1, 3, 3, hair); R(12, 0, 3, 2, hair); R(6, 4, 3, 2, hair); R(11, 4, 3, 2, hair);
      R(8, -1, 1, 2, shade(hair, 0.3));
    } else if (style === 'beanie') {
      const bc = look.accent;
      R(3, 1, 14, 5, bc); R(3, 4, 14, 2, shade(bc, 0.22)); R(3, 1, 14, 1, shade(bc, 0.25)); R(8, -1, 4, 3, '#fff8f0');
      R(3, 6, 2, 2, hair); R(15, 6, 2, 2, hair);
      for (let x = 4; x < 17; x += 2) R(x, 4, 1, 2, shade(bc, 0.05));
    } else if (style === 'hat') {
      const hc = '#f3d98b';
      R(5, -1, 10, 5, hc); R(5, 3, 10, 1, '#c0504d'); R(0, 4, 20, 2, hc); R(1, 5, 18, 1, shade(hc, -0.15));
      R(6, -1, 3, 1, shade(hc, 0.3)); R(3, 6, 2, 3, hair); R(15, 6, 2, 3, hair);
    } else if (style === 'long') {
      cap(); R(2, 5, 3, 11, hair); R(15, 5, 3, 11, hair); R(2, 5, 1, 11, shade(hair, 0.2)); R(17, 5, 1, 11, shade(hair, -0.2));
    } else if (style === 'bun') {
      cap(); R(8, -1, 4, 3, hair); R(8, -1, 4, 1, shade(hair, 0.3));
    }

    // auto outline
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const has = (x, y) => x >= 0 && y >= 0 && x < W && y < H && g[y * W + x];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = g[y * W + x];
      if (v) { c.fillStyle = v; c.fillRect(x, y, 1, 1); }
      else if (has(x - 1, y) || has(x + 1, y) || has(x, y - 1) || has(x, y + 1)) { c.fillStyle = OUT; c.fillRect(x, y, 1, 1); }
    }
    return cv;
  }
  const personFrames = (look) => [0, 1, 2].map((f) => buildPerson(look, f));

  /* ================= FURNITURE ================= */
  function shadow(c, w, h) {
    c.fillStyle = 'rgba(38,27,61,.22)';
    c.fillRect(1, h - 7, w - 2, 9); c.fillRect(3, h - 9, w - 6, 2); c.fillRect(3, h + 2, w - 6, 1);
  }
  const DEF = ['#ff8a6b', '#6fd3b1', '#4aa3ff', '#ffd36e', '#a98bff', '#ff6b9a'];
  const dcol = (o, i) => (o.ds.length ? o.ds[(i + o.seed) % o.ds.length].base : DEF[(i + o.seed) % DEF.length]);

  const FURN_DRAW = {
    rack(c, o) {
      shadow(c, 48, 24);
      bx(c, 3, 19, 10, 4, '#8d84a3'); bx(c, 35, 19, 10, 4, '#8d84a3');
      bx(c, 7, -9, 3, 29, '#c9c1dc'); bx(c, 38, -9, 3, 29, '#c9c1dc');
      bx(c, 5, -10, 38, 3, '#e0d9ee');
      if (o.ds.length) for (let i = 0; i < 3; i++) gm(c, o.ds[(i + o.seed) % o.ds.length], 10 + i * 9, -6, 10, 10);
    },
    shelf(c, o) {
      shadow(c, 48, 24);
      bx(c, 0, -18, 48, 40, '#a8744a');
      rect(c, 3, -15, 42, 34, '#6e4a30'); rect(c, 3, -15, 42, 3, '#5a3b25');
      bx(c, 2, -4, 44, 3, '#c99d6e'); bx(c, 2, 7, 44, 3, '#c99d6e');
      [-11, 0, 10].forEach((ty, r) => {
        for (let i = 0; i < 3; i++) {
          const col = dcol(o, i + r);
          bx(c, 5 + i * 14, ty, 12, 6, col); rect(c, 9 + i * 14, ty + 1, 4, 1, shade(col, -0.32));
        }
      });
    },
    table(c, o) {
      shadow(c, 48, 24);
      bx(c, 4, 12, 4, 10, '#a8744a'); bx(c, 40, 12, 4, 10, '#a8744a');
      bx(c, 0, 4, 48, 10, '#b98a5e');
      bx(c, 0, -4, 48, 9, '#ecd0a8');
      for (let i = 0; i < 3; i++) {
        const col = dcol(o, i);
        bx(c, 5 + i * 14, -11, 12, 7, col); bx(c, 6 + i * 14, -15, 10, 5, dcol(o, i + 1));
      }
    },
    mannequin(c, o) {
      shadow(c, 24, 24);
      bx(c, 4, 20, 16, 3, '#5b4a6e'); bx(c, 10, 4, 4, 17, '#5b4a6e');
      bx(c, 10, -13, 4, 5, '#eadfd0');
      if (o.ds.length) gm(c, o.ds[o.seed % o.ds.length], 0, -14, 24, 24);
      else bx(c, 4, -8, 16, 18, '#eadfd0');
    },
    plant(c) {
      shadow(c, 24, 24);
      bx(c, 6, 12, 12, 11, '#d9774f'); bx(c, 4, 10, 16, 4, '#ee9468');
      bx(c, 2, -6, 9, 14, '#2f9e68'); bx(c, 13, -8, 9, 16, '#2f9e68'); bx(c, 7, -18, 10, 20, '#3fbf80');
      rect(c, 9, -16, 2, 8, '#8fe8b8'); rect(c, 4, -4, 2, 6, '#7fe0ad'); rect(c, 15, -6, 2, 8, '#7fe0ad');
    },
    lamp(c) {
      shadow(c, 24, 24);
      bx(c, 7, 20, 10, 3, '#5b4a6e'); bx(c, 11, -14, 2, 35, '#5b4a6e');
      bx(c, 5, -26, 14, 12, '#ffe08a'); rect(c, 7, -24, 4, 8, '#fff3c2');
    },
    sofa(c) {
      shadow(c, 48, 24);
      bx(c, 3, 19, 5, 4, '#5b4a6e'); bx(c, 40, 19, 5, 4, '#5b4a6e');
      bx(c, 0, -10, 48, 14, '#8f6ff0'); bx(c, 0, 4, 48, 15, '#a98bff');
      bx(c, 0, -4, 8, 23, '#7c5ce0'); bx(c, 40, -4, 8, 23, '#7c5ce0');
      rect(c, 10, 6, 28, 1, '#c8b6ff'); rect(c, 24, 5, 1, 13, '#8f6ff0');
    },
    rug(c) {
      c.fillStyle = OUT; c.fillRect(0, 0, 72, 48);
      rect(c, 1, 1, 70, 46, '#ff8a6b'); rect(c, 4, 4, 64, 40, '#ffd36e'); rect(c, 7, 7, 58, 34, '#ff8a6b');
      rect(c, 10, 10, 52, 28, '#fff8f0'); rect(c, 28, 14, 16, 20, '#a98bff'); rect(c, 31, 17, 10, 14, '#ffd36e');
      for (let y = 4; y < 46; y += 4) { rect(c, -3, y, 3, 1, '#fff8f0'); rect(c, 72, y, 3, 1, '#fff8f0'); }
    },
    poster(c) {
      bx(c, 4, 8, 16, 26, '#6b4f3a'); rect(c, 6, 10, 12, 22, '#fff8f0');
      rect(c, 10, 13, 5, 5, '#ffd36e'); rect(c, 6, 24, 12, 8, '#6fd3b1'); rect(c, 6, 27, 12, 5, '#4aa3ff');
      rect(c, 8, 20, 8, 1, '#a98bff');
    },
    mirror(c) {
      bx(c, 3, 3, 18, 42, '#e8b44a'); rect(c, 5, 5, 14, 38, '#cfeaf7');
      c.fillStyle = 'rgba(255,255,255,.75)';
      c.fillRect(7, 30, 2, 8); c.fillRect(9, 26, 2, 6); c.fillRect(11, 22, 2, 6); c.fillRect(13, 18, 2, 6);
      c.fillRect(14, 30, 2, 3);
    },
    counter(c, o) {
      shadow(c, 72, 24);
      bx(c, 0, 8, 72, 16, '#a8744a');
      for (let i = 0; i < 3; i++) { rect(c, 4 + i * 22, 12, 20, 9, '#8a5a36'); rect(c, 4 + i * 22, 12, 20, 1, '#6e4a30'); }
      bx(c, -2, -2, 76, 11, '#f0d7b2');
      bx(c, 48, -14, 16, 13, '#3b3350'); rect(c, 50, -12, 12, 5, '#6fd3b1'); rect(c, 50, -5, 12, 3, '#8a82a0');
      bx(c, 6, -9, 12, 7, dcol(o, 0)); bx(c, 7, -13, 10, 5, dcol(o, 1));
      bx(c, 28, -6, 8, 5, '#ffd36e');
    },
  };

  function drawFurn(c, type, x, y, o) {
    c.save(); c.translate(x, y);
    FURN_DRAW[type](c, o || { ds: [], seed: 0 });
    c.restore();
  }

  function drawGlow(c, x, y) {
    c.fillStyle = 'rgba(255,224,138,.10)'; c.beginPath(); c.arc(x, y, 46, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,224,138,.12)'; c.beginPath(); c.arc(x, y, 28, 0, 7); c.fill();
  }

  /* ================= ROOM (cached per location + name + size) ================= */
  function geom(cols, rows) {
    const W = cols * 24, floorH = rows * 24, frontY = 48 + floorH;
    return { cols, rows, W, floorH, frontY, roadY: frontY + 28, id: cols + 'x' + rows };
  }
  const roomCache = {};

  /* the hanging shop sign: shop name plus an optional pixelated photo logo */
  function drawSign(c, cx, L, name, logo) {
    rect(c, cx - 58, 0, 2, 5, OUT); rect(c, cx + 56, 0, 2, 5, OUT);
    bx(c, cx - 68, 5, 136, 28, '#fff8f0');
    rect(c, cx - 66, 7, 132, 3, L.color); rect(c, cx - 66, 30, 132, 1, shade('#fff8f0', -0.12));
    let tx = cx, maxW = 122;
    if (logo) {
      const k = Math.min(1, 20 / logo.width, 20 / logo.height), w = Math.max(1, Math.round(logo.width * k)), h = Math.max(1, Math.round(logo.height * k));
      rect(c, cx - 65, 11, 22, 20, shade('#fff8f0', -0.07));
      c.imageSmoothingEnabled = false;
      c.drawImage(logo, cx - 65 + Math.round((22 - w) / 2), 11 + Math.round((20 - h) / 2), w, h);
      tx = cx + 11; maxW = 98;
    }
    const text = String(name).slice(0, 16);
    c.fillStyle = OUT; c.textAlign = 'center'; c.textBaseline = 'middle';
    let size = 12; c.font = `800 ${size}px "DM Sans", sans-serif`;
    const tw = c.measureText(text).width;
    if (tw > maxW) { size = Math.max(7, Math.floor((size * maxW) / tw)); c.font = `800 ${size}px "DM Sans", sans-serif`; }
    c.fillText(text, tx, 21);
  }

  function roomCanvas(L, name, G, logo, logoKey) {
    const key = L.id + '|' + name + '|' + G.id + '|' + (logoKey || '');
    if (roomCache[key]) return roomCache[key];
    const { W, floorH, frontY } = G, cx = W / 2;
    const cv = document.createElement('canvas'); cv.width = W + 18; cv.height = frontY + 24;
    const c = cv.getContext('2d');
    c.translate(9, 7);

    // building silhouette + side walls (the diorama thickness)
    rect(c, -9, -7, W + 18, floorH + 70, OUT);
    rect(c, -8, -6, 8, floorH + 68, shade(L.wall, -0.28)); rect(c, W, -6, 8, floorH + 68, shade(L.wall, -0.28));
    rect(c, -8, -6, W + 16, 6, shade(L.wall, 0.34)); rect(c, -8, -1, W + 16, 1, shade(L.wall, 0.1));

    // back wall
    rect(c, 0, 0, W, 48, L.wall);
    for (let x = 0; x < W; x += 24) if ((x / 24) % 2) rect(c, x, 3, 24, 28, shade(L.wall, 0.07));
    rect(c, 0, 0, W, 3, shade(L.wall, 0.22));
    rect(c, 0, 30, W, 18, L.wall2); rect(c, 0, 29, W, 2, shade(L.wall2, 0.28));
    for (let x = 0; x < W; x += 24) { rect(c, x + 3, 34, 18, 10, shade(L.wall2, -0.1)); rect(c, x + 3, 34, 18, 1, shade(L.wall2, 0.18)); }
    rect(c, 0, 45, W, 3, shade(L.wall2, -0.3));

    // windows (more of them in wider shops)
    const wins = [];
    for (let x = 30; x + 52 <= cx - 84; x += 74) wins.push(x, W - x - 52);
    wins.forEach((wx) => {
      bx(c, wx, 7, 52, 24, '#f6f1e8');
      rect(c, wx + 2, 9, 48, 20, '#a9defc'); rect(c, wx + 2, 9, 48, 7, '#cdeeff');
      rect(c, wx + 25, 9, 2, 20, '#f6f1e8'); rect(c, wx + 2, 18, 48, 2, '#f6f1e8');
      rect(c, wx + 5, 11, 3, 1, '#ffffff'); rect(c, wx + 30, 12, 3, 1, '#ffffff');
    });

    drawSign(c, cx, L, name, logo);

    // floor planks
    for (let r = 0; r < floorH / 12; r++) {
      const y = 48 + r * 12, col = r % 2 ? L.floor : L.floor2;
      rect(c, 0, y, W, 12, col);
      rect(c, 0, y, W, 1, shade(col, 0.1)); rect(c, 0, y + 11, W, 1, shade(col, -0.14));
      for (let k = 0; k < Math.round(W / 77); k++) rect(c, (r * 61 + k * 83 + 17) % W, y, 1, 12, shade(col, -0.1));
    }
    // ambient occlusion + window light
    rect(c, 0, 48, W, 6, 'rgba(38,27,61,.18)'); rect(c, 0, 54, W, 3, 'rgba(38,27,61,.08)');
    rect(c, 0, 54, 5, floorH - 6, 'rgba(38,27,61,.10)'); rect(c, W - 5, 54, 5, floorH - 6, 'rgba(38,27,61,.10)');
    c.fillStyle = 'rgba(255,248,214,.15)';
    const fy = 48 + Math.min(128, floorH - 32);
    wins.forEach((wx) => {
      c.beginPath(); c.moveTo(wx + 2, 48); c.lineTo(wx + 50, 48); c.lineTo(wx + 130, fy); c.lineTo(wx + 60, fy); c.closePath(); c.fill();
    });

    // front wall with doorway
    [[0, cx - 24], [cx + 24, cx - 24]].forEach(([x, w]) => {
      rect(c, x, frontY, w, 14, L.wall2); rect(c, x, frontY, w, 3, shade(L.wall2, 0.3)); rect(c, x, frontY + 11, w, 3, shade(L.wall2, -0.3));
    });
    for (let x = 24; x + 40 <= cx - 40; x += 100) { bx(c, x, frontY + 3, 40, 6, '#a9defc'); bx(c, W - x - 40, frontY + 3, 40, 6, '#a9defc'); }
    bx(c, cx - 28, frontY - 6, 6, 20, '#8a5a3b'); bx(c, cx + 22, frontY - 6, 6, 20, '#8a5a3b');
    // welcome mat
    rect(c, cx - 22, frontY - 11, 44, 10, OUT); rect(c, cx - 21, frontY - 10, 42, 8, '#ff8a6b');
    for (let x = cx - 19; x < cx + 19; x += 6) rect(c, x, frontY - 9, 3, 6, '#ffd36e');

    roomCache[key] = cv;
    return cv;
  }

  function drawOpenSign(c, open, G) {
    const x = G.W / 2 + 32, y = G.frontY + 2;
    bx(c, x, y, 30, 9, open ? '#5fcf9f' : '#ff6b8a');
    c.fillStyle = '#ffffff'; c.font = '800 6.5px "DM Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(open ? 'OPEN' : 'CLOSED', x + 15, y + 4.8);
  }

  /* ================= BACKDROP (street around the shop) ================= */
  let bgKey = '', bgCv = null;
  function backdrop(LW, LH, ox, oy, L, G) {
    const key = [LW, LH, ox, oy, L.id, G.id].join('|');
    if (key === bgKey) return bgCv;
    bgKey = key;
    bgCv = document.createElement('canvas'); bgCv.width = LW; bgCv.height = LH;
    const c = bgCv.getContext('2d');
    rect(c, 0, 0, LW, LH, L.ground);
    c.fillStyle = L.ground2;
    for (let ty = 0; ty * 16 < LH; ty++) for (let tx = 0; tx * 16 < LW; tx++) if ((tx + ty) % 2) c.fillRect(tx * 16, ty * 16, 16, 16);
    // sidewalk + road in front of the door
    const ry = oy + G.roadY, sy = oy + G.frontY + 15;
    rect(c, 0, sy, LW, ry - sy, shade(L.ground, 0.22));
    for (let x = (ox % 16) - 16; x < LW; x += 16) rect(c, x, sy, 1, ry - sy, shade(L.ground, 0.05));
    if (LH - ry > 6) {
      rect(c, 0, ry - 3, LW, 3, '#cfc7dc'); rect(c, 0, ry, LW, LH - ry, '#5f5873');
      rect(c, 0, ry, LW, 1, '#7a7390');
      for (let x = -ox % 40; x < LW; x += 40) rect(c, x, ry + 16, 20, 2, '#ffe08a');
    }
    return bgCv;
  }

  /* ================= CARS (chunky pixel cars, side view, facing right) ================= */
  const CAR_SPEC = {
    sedan: { w: 44, cols: ['#2f6fd0', '#2f9e68', '#e5484d', '#8d84a3', '#f4f0f8'] },
    hatch: { w: 44, cols: ['#ff6b3d', '#ffd34d', '#7c5cff', '#2fd0c0', '#ff6b9a'] },
    coupe: { w: 44, cols: ['#2aa59a', '#e5484d', '#4aa3ff', '#ffa31a'] },
    convertible: { w: 44, cols: ['#ffa31a', '#ff6b9a', '#4aa3ff', '#5fcf9f'] },
    van: { w: 44, cols: ['#7c5cff', '#4aa3ff', '#f4f0f8', '#e5484d'] },
    sports: { w: 44, cols: ['#e5484d', '#ffd400', '#2b2233', '#2fd0c0'] },
  };
  const carCache = {};

  function buildCar(kind, col) {
    const w = CAR_SPEC[kind].w + 2, h = 20;
    const g = new Array(w * h).fill(null);
    const R = (x, y, ww, hh, c) => {
      for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) {
        const X = xx + 1, Y = yy + 1;
        if (X >= 0 && X < w && Y >= 0 && Y < h) g[Y * w + X] = c;
      }
    };
    const rows = (y0, spans, c) => spans.forEach(([a, b], i) => R(a, y0 + i, b - a + 1, 1, c));
    const light = shade(col, 0.38), dark = shade(col, -0.32), deep = shade(col, -0.5);
    const glass = '#9fd8ff', glassHi = '#e8f8ff', tire = '#2b2233', hub = '#b8c0d0', chrome = '#d9dee9';

    const wheel = (cx) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = dx * dx + dy * dy;
        if (d <= 18) R(cx + dx, 13 + dy, 1, 1, d <= 4 ? hub : tire);
      }
    };
    const lights = (front = 42, back = 1) => { R(front, 9, 2, 2, '#ffe58a'); R(back, 9, 2, 2, '#ff5a5a'); };
    const base = (x0 = 1, x1 = 43) => {                          // lower body with a lit top and a shaded belly
      R(x0, 8, x1 - x0, 5, col); R(x0 + 1, 7, x1 - x0 - 2, 1, col);
      R(x0 + 2, 8, x1 - x0 - 4, 1, light); R(x0, 12, x1 - x0, 1, dark);
      R(x0, 11, 4, 2, chrome); R(x1 - 4, 11, 4, 2, chrome);       // bumpers
    };

    if (kind === 'sedan') {
      base();
      rows(2, [[12, 28], [11, 30], [10, 32], [9, 33], [8, 34]], col);
      rows(3, [[13, 18], [12, 18], [11, 18]], glass); rows(3, [[22, 28], [22, 30], [22, 31]], glass);
      R(13, 3, 2, 1, glassHi); R(23, 3, 2, 1, glassHi);
      R(20, 6, 1, 6, dark); R(2, 2, 1, 1, col);
      R(11, 2, 18, 1, light);
      lights(); wheel(10); wheel(34);
    } else if (kind === 'hatch') {
      base(1, 42);
      rows(2, [[6, 26], [5, 28], [4, 30], [3, 32], [3, 34]], col);
      R(6, 3, 6, 3, glass); R(15, 3, 6, 3, glass); R(24, 3, 6, 3, glass);
      R(7, 3, 2, 1, glassHi); R(16, 3, 2, 1, glassHi); R(25, 3, 2, 1, glassHi);
      R(13, 3, 1, 4, col); R(22, 3, 1, 4, col); R(6, 2, 22, 1, light);
      R(13, 6, 1, 6, dark);
      lights(41, 1); wheel(10); wheel(33);
    } else if (kind === 'coupe') {
      base();
      rows(3, [[14, 26], [12, 29], [10, 32], [9, 34]], col);
      rows(4, [[14, 19], [12, 19]], glass); rows(4, [[22, 28], [22, 30]], glass);
      R(14, 4, 2, 1, glassHi); R(23, 4, 2, 1, glassHi); R(20, 4, 1, 3, col);
      R(14, 3, 13, 1, light);
      R(20, 6, 1, 6, dark);
      lights(); wheel(10); wheel(34);
    } else if (kind === 'convertible') {
      R(1, 7, 42, 6, col); R(3, 6, 38, 1, col); R(3, 7, 38, 1, light); R(1, 12, 42, 1, dark);
      R(1, 11, 4, 2, chrome); R(39, 11, 4, 2, chrome);
      R(8, 5, 6, 2, col); R(8, 5, 6, 1, light);                  // rear deck
      R(14, 4, 4, 3, deep);                                      // seat back
      R(15, 1, 3, 3, '#f2d2b6'); R(15, 1, 3, 1, '#6b4423');       // driver
      rows(2, [[26, 27], [25, 26], [24, 25], [23, 24]], glass); R(25, 2, 1, 1, glassHi); R(22, 6, 6, 1, dark);
      R(20, 7, 1, 5, dark);
      lights(); wheel(10); wheel(34);
    } else if (kind === 'van') {
      R(1, 8, 42, 5, col); R(1, 3, 36, 5, col); R(3, 2, 32, 1, col); R(36, 5, 7, 3, col);
      rows(3, [[3, 34]], light); R(3, 8, 38, 1, light); R(1, 12, 42, 1, dark);
      R(1, 11, 4, 2, chrome); R(39, 11, 4, 2, chrome);
      R(5, 4, 7, 4, glass); R(14, 4, 7, 4, glass); R(23, 4, 7, 4, glass);
      rows(3, [[31, 36], [31, 36], [32, 37], [33, 38]], glass); R(31, 3, 2, 1, glassHi);
      R(6, 4, 2, 1, glassHi); R(15, 4, 2, 1, glassHi); R(24, 4, 2, 1, glassHi);
      R(13, 3, 1, 9, dark); R(22, 3, 1, 9, dark); R(30, 3, 1, 9, dark);
      lights(42, 1); wheel(10); wheel(34);
    } else {                                                     // sports
      base();
      rows(4, [[15, 27], [13, 30], [11, 32], [10, 34]], col);
      rows(5, [[16, 27], [14, 29]], glass); R(17, 5, 2, 1, glassHi); R(21, 4, 1, 3, col);
      R(15, 4, 13, 1, light);
      R(1, 4, 7, 1, dark); R(2, 5, 1, 3, dark); R(6, 5, 1, 3, dark);   // spoiler
      R(9, 9, 28, 1, light); R(20, 6, 1, 6, dark);
      lights(); wheel(10); wheel(34);
    }

    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    const has = (x, y) => x >= 0 && y >= 0 && x < w && y < h && g[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = g[y * w + x];
      if (v) { c.fillStyle = v; c.fillRect(x, y, 1, 1); }
      else if (has(x - 1, y) || has(x + 1, y) || has(x, y - 1) || has(x, y + 1)) { c.fillStyle = OUT; c.fillRect(x, y, 1, 1); }
    }
    return cv;
  }

  function carSprite(kind, col) {
    const k = kind + col;
    if (!carCache[k]) carCache[k] = buildCar(kind, col);
    return carCache[k];
  }

  /* ================= IN-SHOP STATIONS (navigation objects) ================= */
  FURN_DRAW.st_design = (c, o) => {                       // drawing easel
    shadow(c, 24, 24);
    bx(c, 2, 8, 3, 15, '#8a5a3b'); bx(c, 19, 8, 3, 15, '#8a5a3b'); bx(c, 3, 17, 18, 2, '#a8744a');
    bx(c, 1, -22, 22, 30, '#fff8f0');
    bx(c, 3, -24, 18, 3, '#8a5a3b'); bx(c, 0, 6, 24, 3, '#c99d6e');
    const d = o.ds && o.ds[0];
    if (d) gm(c, d, 3, -19, 18, 18); else rect(c, 5, -17, 14, 14, '#ffd36e');
    rect(c, 4, -2, 16, 1, '#d9cfc2'); rect(c, 4, 1, 10, 1, '#d9cfc2');
    bx(c, 18, 3, 3, 3, '#ff6b9a'); rect(c, 19, 2, 1, 1, '#ffd36e');
  };
  FURN_DRAW.st_stock = (c) => {                           // stacked stock crates
    shadow(c, 24, 24);
    bx(c, 1, 10, 22, 13, '#d9a56f'); rect(c, 3, 13, 18, 1, '#b07d48'); rect(c, 3, 18, 18, 1, '#b07d48'); rect(c, 11, 10, 2, 13, '#b07d48');
    bx(c, 4, -2, 16, 12, '#e6b983'); rect(c, 4, 3, 16, 1, '#b98a5e'); rect(c, 11, -2, 2, 12, '#b98a5e');
    bx(c, 7, -12, 10, 10, '#f0c88f'); rect(c, 11, -12, 2, 10, '#fff3c2'); rect(c, 8, -6, 3, 2, '#ff6b6b');
  };
  FURN_DRAW.st_deco = (c) => {                            // toolbox + paint
    shadow(c, 24, 24);
    bx(c, 2, 12, 20, 11, '#e5484d'); rect(c, 2, 17, 20, 1, '#b8323a'); bx(c, 8, 8, 8, 3, '#8d84a3'); rect(c, 11, 14, 2, 3, '#ffd34d');
    bx(c, 4, -2, 12, 12, '#4aa3ff'); rect(c, 4, -2, 12, 3, '#ffffff'); rect(c, 6, 1, 2, 3, '#ffffff');
    bx(c, 18, -10, 3, 10, '#8a5a3b'); bx(c, 17, -14, 5, 5, '#ff6b9a');
  };

  /* ================= PIXEL ICONS (12 x 12, auto outline) ================= */
  const disc = (R, col, r = 5.4) => { for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if ((x - 5.5) ** 2 + (y - 5.5) ** 2 <= r * r) R(x, y, 1, 1, col); };
  const spans = (R, rows, col) => rows.forEach((sp, y) => sp.forEach(([a, b]) => R(a, y, b - a + 1, 1, col)));
  const ICONS = {
    coin(R) { disc(R, '#ffd34d'); R(2, 4, 1, 3, '#fff3a8'); R(3, 2, 3, 1, '#fff3a8'); R(5, 3, 2, 6, '#d9951c'); R(5, 3, 1, 6, '#f0b72f'); },
    calendar(R) {
      R(1, 2, 10, 9, '#fff8f0'); R(1, 2, 10, 3, '#ff6b6b'); R(3, 0, 1, 3, '#7c6a99'); R(8, 0, 1, 3, '#7c6a99');
      R(3, 6, 2, 1, '#8d849c'); R(6, 6, 2, 1, '#8d849c'); R(3, 8, 2, 1, '#8d849c'); R(6, 8, 2, 1, '#ff6b6b'); R(1, 10, 10, 1, '#d9cfc2');
    },
    bag(R) { R(2, 4, 8, 7, '#5fcf9f'); R(2, 4, 8, 1, '#8fe8c0'); R(2, 10, 8, 1, '#3fa97c'); R(9, 4, 1, 7, '#3fa97c'); R(4, 1, 1, 3, '#fff8f0'); R(7, 1, 1, 3, '#fff8f0'); R(4, 1, 4, 1, '#fff8f0'); },
    star(R) { [2, 2, 4, 4, 8, 12, 12, 8, 4, 4, 2, 2].forEach((w, y) => R(6 - w / 2, y, w, 1, '#b79bff')); R(5, 2, 1, 3, '#e6dcff'); R(2, 5, 3, 1, '#e6dcff'); },
    store(R) {
      for (let i = 0; i < 6; i++) R(i * 2, 1, 2, 3, i % 2 ? '#fff8f0' : '#ff6b6b');
      R(0, 3, 12, 1, '#c94a4a'); R(1, 4, 10, 7, '#ffe9cc'); R(5, 6, 3, 5, '#8a5a3b'); R(2, 6, 2, 3, '#9fd8ff'); R(9, 6, 1, 3, '#9fd8ff');
    },
    palette(R) { disc(R, '#f3c98b'); R(3, 3, 2, 2, '#ff6b6b'); R(6, 2, 2, 2, '#4aa3ff'); R(9, 4, 2, 2, '#5fcf9f'); R(3, 6, 2, 2, '#ffd34d'); R(7, 8, 3, 2, '#e9e0d0'); },
    sofa(R) {
      R(2, 1, 8, 5, '#a98bff'); R(3, 2, 6, 1, '#c8b6ff'); R(1, 5, 10, 4, '#8f6ff0'); R(0, 3, 2, 6, '#7c5ce0'); R(10, 3, 2, 6, '#7c5ce0');
      R(2, 9, 1, 2, '#5b4a6e'); R(9, 9, 1, 2, '#5b4a6e');
    },
    box(R) { R(1, 3, 10, 8, '#d9a56f'); R(1, 3, 10, 2, '#f0c88f'); R(5, 3, 2, 8, '#fff3c2'); R(1, 10, 10, 1, '#b07d48'); },
    'door-closed'(R) { R(2, 0, 8, 12, '#8a5a3b'); R(3, 1, 6, 10, '#d9a56f'); R(3, 1, 6, 1, '#f0c88f'); R(4, 3, 4, 3, '#c48b55'); R(7, 7, 1, 1, '#ffd34d'); },
    'door-open'(R) { R(2, 0, 8, 12, '#8a5a3b'); R(3, 1, 6, 10, '#3b2d5a'); R(3, 2, 2, 8, '#d9a56f'); R(3, 2, 1, 8, '#f0c88f'); },
    speaker(R) { R(1, 4, 2, 4, '#e8e8f2'); R(3, 3, 2, 6, '#e8e8f2'); R(5, 2, 2, 8, '#cfc7dc'); R(8, 4, 1, 4, '#e8e8f2'); R(10, 2, 1, 8, '#e8e8f2'); },
    'speaker-off'(R) { R(1, 4, 2, 4, '#e8e8f2'); R(3, 3, 2, 6, '#e8e8f2'); R(5, 2, 2, 8, '#cfc7dc'); R(8, 4, 1, 1, '#ff6b6b'); R(9, 5, 1, 2, '#ff6b6b'); R(10, 4, 1, 1, '#ff6b6b'); R(8, 7, 1, 1, '#ff6b6b'); R(10, 7, 1, 1, '#ff6b6b'); },
    refresh(R) {
      for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
        const d = Math.hypot(x - 5.5, y - 6.5);
        if (d <= 4.6 && d >= 2.6 && !(x > 6.5 && y < 5)) R(x, y, 1, 1, '#e8e8f2');
      }
      R(7, 1, 4, 1, '#e8e8f2'); R(10, 1, 1, 4, '#e8e8f2'); R(8, 2, 1, 1, '#e8e8f2');
    },
    fullscreen(R) { [[1, 1, 4, 1], [1, 1, 1, 4], [7, 1, 4, 1], [10, 1, 1, 4], [1, 10, 4, 1], [1, 7, 1, 4], [7, 10, 4, 1], [10, 7, 1, 4]].forEach((a) => R(...a, '#e8e8f2')); R(4, 4, 4, 4, '#ffd36e'); },
    x(R) { for (let i = 0; i < 8; i++) { R(2 + i, 2 + i, 2, 1, '#ff6b6b'); R(9 - i, 2 + i, 2, 1, '#ff6b6b'); } },
    heart(R) { spans(R, [[[2, 4], [7, 9]], [[1, 10]], [[0, 11]], [[0, 11]], [[1, 10]], [[2, 9]], [[3, 8]], [[4, 7]], [[5, 6]]], '#ff6b9a'); R(2, 1, 1, 2, '#ffc2d6'); },
    smile(R) { disc(R, '#ffd34d'); R(3, 4, 1, 2, OUT); R(8, 4, 1, 2, OUT); R(3, 7, 1, 1, OUT); R(4, 8, 4, 1, OUT); R(8, 7, 1, 1, OUT); },
    frown(R) { disc(R, '#ffd34d'); R(3, 4, 1, 2, OUT); R(8, 4, 1, 2, OUT); R(3, 8, 1, 1, OUT); R(4, 7, 4, 1, OUT); R(8, 8, 1, 1, OUT); },
    meh(R) { disc(R, '#ffd34d'); R(3, 4, 1, 2, OUT); R(8, 4, 1, 2, OUT); R(3, 8, 6, 1, OUT); },
    save(R) {
      R(1, 1, 10, 10, '#4aa3ff'); R(3, 1, 6, 4, '#e8e8f2'); R(7, 2, 1, 2, '#4aa3ff'); R(3, 7, 6, 4, '#fff8f0'); R(4, 8, 4, 1, '#8d849c'); R(4, 9, 3, 1, '#8d849c');
      R(1, 10, 10, 1, '#2f7fd0');
    },
    'chev-up'(R) { for (let i = 0; i < 5; i++) { R(1 + i, 7 - i, 2, 2, '#ffd36e'); R(9 - i, 7 - i, 2, 2, '#ffd36e'); } },
    'chev-down'(R) { for (let i = 0; i < 5; i++) { R(1 + i, 2 + i, 2, 2, '#ffd36e'); R(9 - i, 2 + i, 2, 2, '#ffd36e'); } },
    'arrow-left'(R) { for (let i = 0; i < 5; i++) R(2 + i, 5 - i, 1, 2 + 2 * i, '#ffd36e'); R(7, 1, 3, 10, '#ffd36e'); },
    'arrow-right'(R) { for (let i = 0; i < 5; i++) R(9 - i, 5 - i, 1, 2 + 2 * i, '#ffd36e'); R(2, 1, 3, 10, '#ffd36e'); },
    plus(R) { R(4, 1, 4, 10, '#5fcf9f'); R(1, 4, 10, 4, '#5fcf9f'); R(5, 2, 1, 8, '#9bf0c8'); R(2, 5, 8, 1, '#9bf0c8'); },
    image(R) { R(1, 1, 10, 10, '#fff8f0'); R(2, 2, 8, 7, '#9fd8ff'); R(7, 3, 2, 2, '#ffd34d'); R(2, 7, 8, 2, '#5fcf9f'); R(2, 6, 4, 1, '#5fcf9f'); R(2, 9, 8, 1, '#d9cfc2'); },
    expand(R) {
      R(1, 6, 10, 5, '#ffe9cc'); R(0, 4, 12, 2, '#ff6b6b'); R(5, 8, 3, 3, '#8a5a3b'); R(2, 7, 2, 2, '#9fd8ff');
      R(5, 0, 2, 3, '#5fcf9f'); R(4, 1, 4, 1, '#5fcf9f');
    },
  };
  const iconCache = {};
  function iconCanvas(name) {
    if (iconCache[name]) return iconCache[name];
    if (!ICONS[name]) return null;
    const w = 14, h = 14, g = new Array(w * h).fill(null);
    const R = (x, y, ww, hh, col) => {
      for (let yy = Math.floor(y); yy < y + hh; yy++) for (let xx = Math.floor(x); xx < x + ww; xx++) {
        const X = xx + 1, Y = yy + 1;
        if (X >= 0 && X < w && Y >= 0 && Y < h) g[Y * w + X] = col;
      }
    };
    ICONS[name](R);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    const has = (x, y) => x >= 0 && y >= 0 && x < w && y < h && g[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = g[y * w + x];
      if (v) { c.fillStyle = v; c.fillRect(x, y, 1, 1); }
      else if (has(x - 1, y) || has(x + 1, y) || has(x, y - 1) || has(x, y + 1)) { c.fillStyle = OUT; c.fillRect(x, y, 1, 1); }
    }
    return (iconCache[name] = cv);
  }
  function mountIcons(root) {
    (root || document).querySelectorAll('.pxi:not([data-m])').forEach((el) => {
      const src = iconCanvas(el.dataset.icon);
      if (!src) return;
      const cv = document.createElement('canvas'); cv.width = 14; cv.height = 14;
      cv.getContext('2d').drawImage(src, 0, 0);
      el.replaceChildren(cv); el.dataset.m = '1';
    });
  }

  window.Art = {
    N, CATS, OUT, geom, CAR_SPEC, bx, shadow, shade, drawGarment, garmentCanvas, paintable, carSprite,
    personFrames, drawFurn, drawGlow, roomCanvas, drawSign, drawOpenSign, backdrop, iconCanvas, mountIcons,
    clearCache() { Object.keys(roomCache).forEach((k) => delete roomCache[k]); bgKey = ''; },
  };
})();
