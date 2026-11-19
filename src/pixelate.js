/* Turns any picture into chunky pixel art:
   downscale -> optional background removal -> limited palette (median cut) -> optional outline. */
(() => {
  'use strict';
  const OUT = [38, 27, 61];

  function loadFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
      img.src = url;
    });
  }

  function downscale(img, w, h) {
    // halve repeatedly so the result is an average of the source, not a few sampled pixels
    let cur = document.createElement('canvas'); cur.width = img.width; cur.height = img.height;
    cur.getContext('2d').drawImage(img, 0, 0);
    while (cur.width > w * 2 || cur.height > h * 2) {
      const nx = document.createElement('canvas');
      nx.width = Math.max(w, Math.ceil(cur.width / 2)); nx.height = Math.max(h, Math.ceil(cur.height / 2));
      const c = nx.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(cur, 0, 0, nx.width, nx.height); cur = nx;
    }
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const oc = out.getContext('2d'); oc.imageSmoothingEnabled = true; oc.imageSmoothingQuality = 'high';
    oc.drawImage(cur, 0, 0, w, h);
    return out;
  }

  function medianCut(colors, n) {
    const boxes = [colors];
    while (boxes.length < n) {
      let bi = -1, best = 0, ch = 0;
      boxes.forEach((b, i) => {
        if (b.length < 2) return;
        for (let k = 0; k < 3; k++) {
          let lo = 255, hi = 0;
          for (const c of b) { if (c[k] < lo) lo = c[k]; if (c[k] > hi) hi = c[k]; }
          if (hi - lo > best) { best = hi - lo; bi = i; ch = k; }
        }
      });
      if (bi < 0) break;
      const b = boxes[bi].sort((p, q) => p[ch] - q[ch]), mid = b.length >> 1;
      boxes.splice(bi, 1, b.slice(0, mid), b.slice(mid));
    }
    return boxes.map((b) => {
      const s = [0, 0, 0];
      b.forEach((c) => { s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; });
      return s.map((v) => Math.round(v / b.length));
    });
  }

  /* o = { maxW, maxH, colors, removeBg, outline } -> canvas */
  function run(img, o) {
    const ratio = Math.min(o.maxW / img.width, o.maxH / img.height, 1);
    const w = Math.max(1, Math.round(img.width * ratio)), h = Math.max(1, Math.round(img.height * ratio));
    const cv = downscale(img, w, h), ctx = cv.getContext('2d');
    const data = ctx.getImageData(0, 0, w, h), px = data.data;
    const idx = (x, y) => (y * w + x) * 4;

    // transparent pixels stay transparent
    for (let i = 0; i < px.length; i += 4) if (px[i + 3] < 128) px[i + 3] = 0; else px[i + 3] = 255;

    // plain background removal: flood from the edges through pixels close to the corner colour
    if (o.removeBg) {
      const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => [px[idx(x, y)], px[idx(x, y) + 1], px[idx(x, y) + 2]]);
      const bg = [0, 1, 2].map((k) => Math.round(corners.reduce((s, c) => s + c[k], 0) / 4));
      const near = (i) => Math.hypot(px[i] - bg[0], px[i + 1] - bg[1], px[i + 2] - bg[2]) <= 64;
      const seen = new Uint8Array(w * h), stack = [];
      const push = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h || seen[y * w + x]) return; seen[y * w + x] = 1; if (px[idx(x, y) + 3] && near(idx(x, y))) stack.push([x, y]); };
      for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
      for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
      while (stack.length) {
        const [x, y] = stack.pop();
        px[idx(x, y) + 3] = 0;
        push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
      }
    }

    // a little extra saturation so the pixel art pops, then limit the palette
    const colors = [];
    for (let i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue;
      const l = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
      for (let k = 0; k < 3; k++) px[i + k] = Math.max(0, Math.min(255, Math.round(l + (px[i + k] - l) * 1.18)));
      colors.push([px[i], px[i + 1], px[i + 2]]);
    }
    if (colors.length) {
      const pal = medianCut(colors.slice(), o.colors);
      for (let i = 0; i < px.length; i += 4) {
        if (!px[i + 3]) continue;
        let best = pal[0], bd = Infinity;
        for (const p of pal) {
          const d = (p[0] - px[i]) ** 2 + (p[1] - px[i + 1]) ** 2 + (p[2] - px[i + 2]) ** 2;
          if (d < bd) { bd = d; best = p; }
        }
        px[i] = best[0]; px[i + 1] = best[1]; px[i + 2] = best[2];
      }
    }
    ctx.putImageData(data, 0, 0);

    return o.outline ? outline(cv) : cv;
  }

  /* returns a copy with a 1px dark outline around the opaque shape (2px larger each way) */
  function outline(cv) {
    const w = cv.width, h = cv.height;
    const out = document.createElement('canvas'); out.width = w + 2; out.height = h + 2;
    const oc = out.getContext('2d');
    oc.drawImage(cv, 1, 1);
    const src = oc.getImageData(0, 0, w + 2, h + 2), d = src.data, W2 = w + 2;
    const opaque = (x, y) => x >= 0 && y >= 0 && x < W2 && y < h + 2 && d[(y * W2 + x) * 4 + 3] > 0;
    const edges = [];
    for (let y = 0; y < h + 2; y++) for (let x = 0; x < W2; x++) {
      if (!opaque(x, y) && (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1))) edges.push([x, y]);
    }
    edges.forEach(([x, y]) => { const i = (y * W2 + x) * 4; d[i] = OUT[0]; d[i + 1] = OUT[1]; d[i + 2] = OUT[2]; d[i + 3] = 255; });
    oc.putImageData(src, 0, 0);
    return out;
  }

  window.Pixelate = { loadFile, run, outline };
})();
