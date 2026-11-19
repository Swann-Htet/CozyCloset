(() => {
  'use strict';
  const A = window.Art;

  /* ---------- helpers ---------- */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const icons = () => window.lucide && window.lucide.createIcons();
  const mount = (root) => A.mountIcons(root || document);
  const setIcon = (el, name) => { el.dataset.icon = name; delete el.dataset.m; mount(el.parentNode); };
  const esc = (s) => String(s).replace(/[<>&"]/g, '');
  const KEY = 'clothes-shop-save-v2';

  /* ---------- constants ---------- */
  // shop size: tile size, grid and floor rows (row ROW1 is the doorway). Expandable - see SIZES.
  const T = 24, ROW0 = 2;
  const SIZES = [
    { cols: 20, rows: 8, cost: 0, name: 'Cozy shop' },
    { cols: 24, rows: 9, cost: 600, name: 'Spacious shop' },
    { cols: 28, rows: 10, cost: 1500, name: 'Grand shop' },
  ];
  let COLS = 20, ROW1 = 10, DOORL = 9, G = A.geom(20, 8);
  let COUNTER = { x: 16, y: 2, w: 3, h: 1 };
  const CAT_KEYS = ['tshirt', 'hoodie', 'sweatshirt', 'jacket', 'shirt', 'tank'];
  const CATS = A.CATS;

  const LOCS = {
    street: { id: 'street', name: 'Street Corner', desc: 'Cozy and busy. A modest start.', icon: 'store', color: '#ff8a6b', cash: 300, wall: '#f4c7a4', wall2: '#d9976f', floor: '#d9a56f', floor2: '#cf9a63', ground: '#d9cfc2', ground2: '#d0c5b7' },
    sea: { id: 'sea', name: 'Seaside Boutique', desc: 'Breezy, bright and relaxed.', icon: 'waves', color: '#4aa3ff', cash: 400, wall: '#bfe3ee', wall2: '#7fb7cc', floor: '#ecd9ae', floor2: '#e3cd9b', ground: '#f1e3bd', ground2: '#e9d8a9' },
    mall: { id: 'mall', name: 'Mall Unit', desc: 'Sleek and polished. More funds.', icon: 'building-2', color: '#a98bff', cash: 500, wall: '#ddd2ff', wall2: '#a899e0', floor: '#efe9f7', floor2: '#e1d9f0', ground: '#e6e2f0', ground2: '#dcd7ea' },
  };

  const FURN = {
    rack: { label: 'Rack', w: 2, h: 1, cost: 40, charm: 1, display: true },
    shelf: { label: 'Shelf', w: 2, h: 1, cost: 60, charm: 1, display: true },
    table: { label: 'Table', w: 2, h: 1, cost: 45, charm: 1, display: true },
    mannequin: { label: 'Mannequin', w: 1, h: 1, cost: 50, charm: 3, display: true },
    plant: { label: 'Plant', w: 1, h: 1, cost: 15, charm: 2 },
    lamp: { label: 'Lamp', w: 1, h: 1, cost: 30, charm: 2 },
    sofa: { label: 'Sofa', w: 2, h: 1, cost: 55, charm: 2 },
    rug: { label: 'Rug', w: 3, h: 2, cost: 25, charm: 3, layer: 'floor' },
    poster: { label: 'Poster', w: 1, h: 2, cost: 10, charm: 2, layer: 'wall' },
    mirror: { label: 'Mirror', w: 1, h: 2, cost: 35, charm: 3, layer: 'wall' },
  };

  /* navigation objects that live inside the shop (click them, or use the dock) */
  const STATIONS = [
    { id: 'design', type: 'st_design', x: 19, y: 3, label: 'Design', icon: 'palette', view: 'design' },
    { id: 'stock', type: 'st_stock', x: 19, y: 5, label: 'Stock', icon: 'box', view: 'inventory' },
    { id: 'deco', type: 'st_deco', x: 19, y: 7, label: 'Decorate', icon: 'sofa', view: 'decorate' },
  ];
  const signRect = () => ({ x: G.W / 2 + 30, y: G.frontY, w: 34, h: 13 });   // the OPEN / CLOSED sign on the front wall

  /* apply the shop size for the current save: grid, counter, stations, doorway */
  function applySize() {
    const sz = SIZES[clamp(S.level || 0, 0, SIZES.length - 1)];
    COLS = sz.cols; ROW1 = ROW0 + sz.rows; DOORL = COLS / 2 - 1; G = A.geom(sz.cols, sz.rows);
    COUNTER = { x: COLS - 4, y: 2, w: 3, h: 1 };
    STATIONS.forEach((s) => { s.x = COLS - 1; });
    clerk.x = COUNTER.x * T + 24; stKey = '';
  }

  const INK = ['#261b3d', '#ffffff', '#ff8a6b', '#ffd36e', '#5fcf9f', '#a98bff', '#4aa3ff', '#ff6b9a',
    '#8a5a3b', '#5b6073', '#e63946', '#2a9d8f', '#f4a261', '#264653', '#b5e48c', '#d0c4ff'];

  /* ---------- state ---------- */
  let S = null;
  let pendingName = '', pendingLoc = 'street';

  function starterDesigns() {
    const tee = { id: 'd1', name: 'Basic Tee', cat: 'tshirt', base: '#ff8a6b', px: Array(576).fill(null), price: 15, stock: 5, sold: 0 };
    for (let y = 12; y <= 13; y++) for (let x = 6; x <= 17; x++) if (A.paintable('tshirt', y * 24 + x)) tee.px[y * 24 + x] = '#fff8f0';
    const hood = { id: 'd2', name: 'Cloud Hoodie', cat: 'hoodie', base: '#4aa3ff', px: Array(576).fill(null), price: 28, stock: 3, sold: 0 };
    return [tee, hood];
  }

  function newState(name, loc) {
    return {
      name, loc, logo: '', money: LOCS[loc].cash, day: 1, sold: 0, muted: false, vol: 0.7, level: 0,
      furniture: [
        { type: 'rack', x: 2, y: 3 }, { type: 'rack', x: 5, y: 3 }, { type: 'shelf', x: 9, y: 2 },
        { type: 'plant', x: 0, y: 2 }, { type: 'mannequin', x: 12, y: 5 }, { type: 'table', x: 3, y: 6 },
      ],
      customs: [],
      designs: starterDesigns(),
    };
  }

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(KEY + '-at', String(Date.now())); } catch (e) { /* ignore */ } };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };

  /* ---------- audio ---------- */
  let ac;
  function sfx(type) {
    if (!S || S.muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime;
      const tone = (f, d, s = 0, v = 0.06, w = 'triangle') => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = w; o.frequency.value = f;
        g.gain.setValueAtTime(v * S.vol, t + s);
        g.gain.exponentialRampToValueAtTime(0.0001, t + s + d);
        o.connect(g).connect(ac.destination);
        o.start(t + s); o.stop(t + s + d);
      };
      if (type === 'click') tone(660, 0.06);
      if (type === 'place') { tone(330, 0.08); tone(494, 0.1, 0.05); }
      if (type === 'save') { tone(523, 0.1); tone(659, 0.1, 0.08); tone(784, 0.16, 0.16); }
      if (type === 'sale') { tone(988, 0.09, 0, 0.07); tone(1319, 0.18, 0.08, 0.07); }
      if (type === 'pop') tone(880, 0.07, 0, 0.035);
      if (type === 'error') tone(180, 0.18, 0, 0.07, 'square');
      if (type === 'door') { tone(440, 0.08); tone(587, 0.12, 0.07); }
    } catch (e) { /* audio unavailable */ }
  }

  function toast(msg, err) {
    const el = document.createElement('div');
    el.className = 'toast' + (err ? ' err' : '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 2400);
  }

  /* ---------- in-game confirm dialog (instead of the browser's confirm box) ---------- */
  let confirmResolve = null;
  function askConfirm(message, opts = {}) {
    return new Promise((resolve) => {
      if (confirmResolve) confirmResolve(false);
      confirmResolve = resolve;
      $('#confirm-title').textContent = opts.title || 'Are you sure?';
      $('#confirm-msg').textContent = message;
      const yes = $('#confirm-yes');
      yes.textContent = opts.ok || 'OK'; yes.classList.toggle('danger-fill', !!opts.danger);
      $('#confirm-no').textContent = opts.cancel || 'Cancel';
      $('#confirm').hidden = false; yes.focus(); sfx('click');
    });
  }
  function closeConfirm(answer) {
    $('#confirm').hidden = true;
    const r = confirmResolve; confirmResolve = null;
    if (r) r(answer);
  }
  function initConfirm() {
    $('#confirm-yes').onclick = () => closeConfirm(true);
    $('#confirm-no').onclick = () => closeConfirm(false);
    $('#confirm').addEventListener('click', (e) => { if (e.target.id === 'confirm') closeConfirm(false); });
    // capture phase: while the dialog is open, Escape/Enter only answer the dialog and never reach other screens
    document.addEventListener('keydown', (e) => {
      if ($('#confirm').hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeConfirm(false); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); closeConfirm(document.activeElement.id !== 'confirm-no'); }
    }, true);
  }

  /* ---------- people looks ---------- */
  const SKINS = ['#f2d2b6', '#e0b08c', '#c68b62', '#8d5a3b', '#f7dcc4', '#6b4430'];
  const HAIRS = ['#2b2233', '#6b4423', '#d9a441', '#c0504d', '#5b6073', '#a98bff', '#4aa3ff', '#ff6b9a'];
  const STYLES = ['short', 'spiky', 'beanie', 'hat', 'long', 'bun'];
  const OUTFITS = ['#6fd3b1', '#4aa3ff', '#ffd36e', '#ff6b9a', '#b5e48c', '#d0c4ff', '#e5484d', '#fff8f0', '#4b3a8f'];
  const PANTS = ['#3b4a7a', '#5b6073', '#8a5a3b', '#2b2233', '#4aa9b0'];
  const SHOES = ['#fff8f0', '#2b2233', '#e5484d', '#ffd36e'];

  function randomLook() {
    return {
      skin: pick(SKINS), hair: pick(HAIRS), style: pick(STYLES), accent: pick(['#b78be8', '#ff8a6b', '#5fcf9f', '#4aa3ff']),
      outfit: { cat: pick(CAT_KEYS), col: pick(OUTFITS) }, pants: pick(PANTS), shoes: pick(SHOES),
    };
  }

  /* ---------- setup flow ---------- */
  function buildLocations() {
    $('#locations').innerHTML = Object.entries(LOCS).map(([id, l]) => `
      <button class="loc ${id === pendingLoc ? 'sel' : ''}" data-loc="${id}">
        <span class="ic" style="background:${l.color}"><i data-lucide="${l.icon}"></i></span>
        <span><b>${l.name}</b><small>${l.desc}</small></span>
        <span class="cash">$${l.cash}</span>
      </button>`).join('');
    icons();
  }

  function buildCrowd(sel) {
    const looks = [
      { skin: '#f2d2b6', hair: '#6b4423', style: 'short', outfit: { cat: 'hoodie', col: '#e5484d' }, pants: '#4aa9b0', shoes: '#2b2233' },
      { skin: '#8d5a3b', hair: '#2b2233', style: 'beanie', accent: '#b78be8', outfit: { cat: 'sweatshirt', col: '#4b3a8f' }, pants: '#5b6073', shoes: '#fff8f0' },
      { skin: '#f7dcc4', hair: '#4aa3ff', style: 'spiky', outfit: { cat: 'tshirt', col: '#fff8f0' }, pants: '#ffd36e', shoes: '#fff8f0' },
      { skin: '#f2d2b6', hair: '#6b4423', style: 'hat', outfit: { cat: 'jacket', col: '#4fb9a0' }, pants: '#8a5a3b', shoes: '#2b2233' },
    ];
    const box = $(sel);
    looks.forEach((l) => box.appendChild(A.personFrames(l)[0]));
  }

  function initSetup() {
    buildLocations(); buildCrowd('#crowd');
    $('#setup-back-menu').onclick = () => showMenu();
    $('#to-step2').onclick = () => {
      pendingName = $('#shop-name').value.trim() || 'Cozy Closet';
      $('[data-step="1"]').hidden = true; $('[data-step="2"]').hidden = false;
    };
    $('#shop-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#to-step2').click(); });
    $('#back-step1').onclick = () => { $('[data-step="2"]').hidden = true; $('[data-step="1"]').hidden = false; };
    $('#locations').onclick = (e) => { const b = e.target.closest('.loc'); if (!b) return; pendingLoc = b.dataset.loc; buildLocations(); };
    $('#start-game').onclick = () => { S = newState(pendingName, pendingLoc); S.logo = pendingLogo; save(); startGame(); sfx('door'); };
  }

  /* ---------- app shell ---------- */
  let view = 'shop';
  function showView(v) {
    view = v;
    $('#view-design').hidden = v !== 'design';
    $('#view-inventory').hidden = v !== 'inventory';
    $('#ctx-shop').hidden = v !== 'shop';
    $('#ctx-deco').hidden = v !== 'decorate';
    $('#bubbles').hidden = v !== 'shop';
    $('#stations').hidden = v !== 'shop';
    $('#world').classList.toggle('edit', v === 'decorate');
    closePicker(); shopHover = null; cv.style.cursor = '';
    $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    if (v === 'inventory') renderInv();
    if (v === 'design') { refreshChips(); renderEditor(); }
    if (v === 'decorate') buildDecoPalette();
    icons(); mount();
  }

  const charm = () => clamp(S.furniture.reduce((n, f) => n + FURN[f.type].charm, 0) - 2, 0, 40);
  function updateHud() {
    $('#st-money').textContent = '$' + Math.floor(S.money);
    $('#st-day').textContent = S.day;
    $('#st-sold').textContent = S.sold;
    $('#st-charm').textContent = charm();
    $('#t-cust').textContent = today.cust;
    $('#t-sales').textContent = today.sales;
    $('#t-rev').textContent = '$' + today.rev;
  }

  let looping = false;
  function startGame() {
    $('#mainmenu').hidden = true; $('#setup').hidden = true; $('#app').hidden = false;
    window.MenuScene.stop();
    customers = []; queue = []; bubbles.splice(0).forEach((b) => b.el.remove()); isOpen = false; dayT = 0;
    applyState();
    cars = []; spawnCar(true); spawnCar(true); spawnCar(true);
    showView('shop');
    if (panMax > 0 || panMaxY > 0) toast('Drag the shop to look around');
    if (!looping) { looping = true; requestAnimationFrame(loop); }
  }

  function syncMute() { setIcon($('#mute .pxi'), S.muted ? 'speaker-off' : 'speaker'); }

  function buildStations() {
    $('#stations').innerHTML = STATIONS.map((s) => `<button class="px st-label" data-st="${s.id}" title="${s.label}"><span class="pxi" data-icon="${s.icon}"></span><span>${s.label}</span></button>`).join('');
    mount($('#stations'));
  }
  let stKey = '';
  function placeStations() {
    const k = [ox, oy, scale].join();
    if (k === stKey) return;
    stKey = k;
    $$('#stations .st-label').forEach((el, i) => {
      const s = STATIONS[i];
      el.style.left = (ox + s.x * T - 3) * scale + 'px';
      el.style.top = (oy + s.y * T + 6) * scale + 'px';
    });
  }

  function initApp() {
    // top-left arrow: hide / show the top bar (remembered between visits)
    const navBtn = $('#nav-toggle');
    const setNav = (off) => {
      $('#app').classList.toggle('nav-off', off);
      setIcon(navBtn.querySelector('.pxi'), off ? 'chev-down' : 'chev-up');
      navBtn.title = off ? 'Show the top bar' : 'Hide the top bar';
      try { localStorage.setItem('clothes-shop-nav', off ? 'off' : 'on'); } catch (e) { /* ignore */ }
    };
    let navOff = false;
    try { navOff = localStorage.getItem('clothes-shop-nav') === 'off'; } catch (e) { /* ignore */ }
    setNav(navOff);
    navBtn.onclick = () => { setNav(!$('#app').classList.contains('nav-off')); sfx('click'); };

    // top-right button: real browser full screen
    const fullscreen = () => {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      const el = document.documentElement;
      if (!el.requestFullscreen) { toast('Full screen is not supported in this browser', true); return; }
      el.requestFullscreen().catch(() => toast('The browser blocked full screen', true));
    };
    $('#ui-toggle').onclick = () => { sfx('click'); fullscreen(); };
    document.addEventListener('fullscreenchange', () => {
      $('#ui-toggle').classList.toggle('active', !!document.fullscreenElement);
      $('#ui-toggle').title = document.fullscreenElement ? 'Exit full screen (F)' : 'Full screen (F)';
    });
    document.addEventListener('keydown', (e) => {
      if ((view === 'shop' || view === 'decorate') && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'f' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) fullscreen();
    });
    $('#stations').onclick = (e) => {
      const b = e.target.closest('[data-st]'); if (!b) return;
      sfx('click'); showView(STATIONS.find((s) => s.id === b.dataset.st).view);
    };
    $$('.nav-btn').forEach((b) => (b.onclick = () => { sfx('click'); showView(b.dataset.view); }));
    $('#mute').onclick = () => { S.muted = !S.muted; syncMute(); save(); sfx('click'); };
    $('#vol').oninput = (e) => { S.vol = e.target.value / 100; save(); };
    $('#vol').onchange = () => sfx('click');
    $('#reset').onclick = async () => {
      if (await askConfirm('This deletes your autosave and starts a brand new shop. Save slots are not touched.', { title: 'Reset your shop?', ok: 'Reset', danger: true })) { localStorage.removeItem(KEY); S = null; location.reload(); }
    };
    $('#toggle-open').onclick = toggleOpen;
    $('#expand').onclick = () => { sfx('click'); expandShop(); };
    window.addEventListener('resize', () => { if (S) layout(); });
  }

  /* ---------- world canvas + layout ---------- */
  const cv = $('#world'), ctx = cv.getContext('2d');
  let scale = 3, LW = 0, LH = 0, ox = 0, oy = 0, baseOx = 0, baseOy = 0, panMax = 0, panMaxY = 0;
  const pan = { x: 0, y: 0 };

  function layout() {
    const vw = innerWidth, vh = innerHeight, mobile = vw < 760;
    if (mobile) {
      // phones: keep the pixels big and let the player drag to look around the shop
      const top = 124, bottom = 232, availH = vh - top - bottom;
      scale = clamp(Math.floor((availH / 246) * 4) / 4, 1, 3);
      panMax = Math.max(0, ((G.W + 18) * scale - vw) / 2 / scale);
      panMaxY = Math.max(0, ((G.frontY + 22) * scale - availH) / 2 / scale);
      baseOx = vw / 2 / scale - G.W / 2;
      baseOy = (top + availH / 2) / scale - (G.frontY + 8) / 2;
    } else {
      // desktop: the shop fills the whole screen edge to edge; the HUD and dock float over it
      const wS = vw / (G.W + 16), hS = vh / (G.frontY + 40);
      scale = wS <= hS ? Math.min(Math.ceil(wS * 20) / 20, hS) : Math.floor(hS * 20) / 20;
      panMax = 0; panMaxY = 0;
      baseOx = (vw / scale - G.W) / 2;
      baseOy = 0;
    }
    pan.x = clamp(pan.x, -panMax, panMax); pan.y = clamp(pan.y, -panMaxY, panMaxY);
    LW = Math.ceil(vw / scale); LH = Math.ceil(vh / scale);
    cv.width = LW; cv.height = LH;
    cv.style.width = LW * scale + 'px'; cv.style.height = LH * scale + 'px';
    ox = Math.round(baseOx + pan.x); oy = Math.round(baseOy + pan.y);
  }

  /* drag to pan (phones) - a drag never counts as a tap */
  let drag = null, suppressClick = false;
  function initPan() {
    cv.addEventListener('pointerdown', (e) => {
      if (panMax > 0 || panMaxY > 0) { drag = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false }; cv.setPointerCapture(e.pointerId); }
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) drag.moved = true;
      if (drag.moved) {
        pan.x = clamp(drag.px + dx / scale, -panMax, panMax); pan.y = clamp(drag.py + dy / scale, -panMaxY, panMaxY);
        ox = Math.round(baseOx + pan.x); oy = Math.round(baseOy + pan.y);
      }
    });
    const end = () => { if (drag && drag.moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 60); } drag = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }

  /* ---------- pathfinding ---------- */
  let blocked = new Set();
  function rebuildBlocked() {
    blocked = new Set();
    const add = (x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) blocked.add(yy * COLS + xx); };
    S.furniture.forEach((f) => { const d = FURN[f.type]; if (d && !d.layer) add(f.x, f.y, d.w, d.h); });
    add(COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.h);
    STATIONS.forEach((s) => add(s.x, s.y, 1, 1));
  }
  const walkable = (c, r) => {
    if (c < 0 || c >= COLS) return false;
    if (r === ROW1) return c === DOORL || c === DOORL + 1;
    return r >= ROW0 && r < ROW1 && !blocked.has(r * COLS + c);
  };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function bfs(sc, sr, tc, tr) {
    const key = (c, r) => r * COLS + c, prev = new Map([[key(sc, sr), null]]), q = [[sc, sr]];
    while (q.length) {
      const [c, r] = q.shift();
      if (c === tc && r === tr) break;
      for (const [dc, dr] of DIRS) {
        const nc = c + dc, nr = r + dr;
        if (prev.has(key(nc, nr)) || !walkable(nc, nr)) continue;
        prev.set(key(nc, nr), [c, r]); q.push([nc, nr]);
      }
    }
    if (!prev.has(key(tc, tr))) return null;
    const out = []; let cur = [tc, tr];
    while (cur) { out.push(cur); cur = prev.get(key(cur[0], cur[1])); }
    out.reverse(); out.shift();
    return out;
  }

  function nearestFree(tc, tr) {
    tc = clamp(tc, 0, COLS - 1); tr = clamp(tr, ROW0, ROW1 - 1);
    if (walkable(tc, tr)) return [tc, tr];
    const seen = new Set([tr * COLS + tc]), q = [[tc, tr]];
    while (q.length) {
      const [c, r] = q.shift();
      for (const [dc, dr] of DIRS) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nc >= COLS || nr < ROW0 || nr >= ROW1 || seen.has(nr * COLS + nc)) continue;
        seen.add(nr * COLS + nc);
        if (walkable(nc, nr)) return [nc, nr];
        q.push([nc, nr]);
      }
    }
    return [DOORL + 1, ROW1 - 1];
  }

  function route(e, tc, tr, fx, fy) {
    const pts = [];
    let sc = Math.floor(e.x / T), sr = Math.floor(e.y / T);
    const dx = G.W / 2;
    if (e.y >= G.frontY + 16) {                         // on the sidewalk: walk to the door first
      if (Math.abs(e.x - dx) > 8) pts.push([dx, G.frontY + 24]);
      pts.push([dx, G.frontY + 10]); sc = DOORL + 1; sr = ROW1;
    }
    sc = clamp(sc, 0, COLS - 1); sr = clamp(sr, ROW0, ROW1);
    const path = bfs(sc, sr, tc, tr);
    const wp = (c, r) => [c * T + 12, r === ROW1 ? G.frontY + 10 : r * T + 18];
    if (path) path.forEach(([c, r]) => pts.push(wp(c, r))); else pts.push(wp(tc, tr));
    if (fx !== undefined) pts.push([fx, fy]);
    return pts;
  }

  /* ---------- speech bubbles (DOM overlay) ---------- */
  const bubbles = [];
  function placeBubble(b) {
    b.el.style.left = (ox + b.ent.x) * scale + 'px';
    b.el.style.top = (oy + b.ent.y - 36) * scale + 'px';
  }
  function say(ent, text, icon, tone, thumb) {
    const old = bubbles.findIndex((b) => b.ent === ent);
    if (old >= 0) { bubbles[old].el.remove(); bubbles.splice(old, 1); }
    const el = document.createElement('div');
    el.className = 'bubble ' + (tone || '');
    el.innerHTML = `${thumb ? `<img src="${thumb}" alt="">` : ''}<span class="bi"><span class="pxi" data-icon="${icon}"></span></span><span>${text}</span>`;
    $('#bubbles').appendChild(el); mount(el);
    const b = { el, ent, ttl: 2.8 };
    bubbles.push(b); placeBubble(b);
  }
  function thumbOf(d) {
    if (!d._url) Object.defineProperty(d, '_url', { value: A.garmentCanvas(d).toDataURL(), enumerable: false, configurable: true });
    return d._url;
  }
  function moneyPop(txt) {
    const el = document.createElement('div');
    el.className = 'money-pop'; el.textContent = txt;
    el.style.left = (ox + COUNTER.x * T + 56) * scale + 'px'; el.style.top = (oy + 34) * scale + 'px';
    $('#bubbles').appendChild(el); setTimeout(() => el.remove(), 1600);
  }
  function updateBubbles(dt) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; b.ttl -= dt;
      if (b.ttl <= 0 || b.ent.dead) {
        const el = b.el; el.classList.add('out'); setTimeout(() => el.remove(), 260); bubbles.splice(i, 1);
      } else placeBubble(b);
    }
  }

  /* ---------- customers ---------- */
  const today = { cust: 0, sales: 0, rev: 0 };
  let isOpen = false, customers = [], queue = [], spawnT = 1.5, dayT = 0, last = 0, clock = 0;
  const clerk = { x: 312, y: 55, dir: 1, frames: A.personFrames({ skin: '#f2d2b6', hair: '#c0504d', style: 'bun', outfit: { cat: 'sweatshirt', col: '#5fcf9f' }, pants: '#3b4a7a', shoes: '#fff8f0' }) };

  function renderOpenBtn() {
    const b = $('#toggle-open');
    b.classList.toggle('closed', isOpen);
    setIcon(b.querySelector('.pxi'), isOpen ? 'door-closed' : 'door-open');
    b.querySelector('span:not(.pxi)').textContent = isOpen ? 'Close shop' : 'Open shop';
  }
  function toggleOpen() {
    isOpen = !isOpen; sfx('door');
    renderOpenBtn();
    say(clerk, isOpen ? 'Welcome in!' : 'See you soon!', 'smile', 'clerk');
  }

  const displays = () => S.furniture.filter((f) => FURN[f.type].display);
  const displayDesign = (f) => (f && f.design ? S.designs.find((d) => d.id === f.design) || null : null);
  const stocked = () => S.designs.filter((d) => d.stock > 0);
  const worth = (d) => CATS[d.cat].base + d.px.filter(Boolean).length * 0.12;

  function walk(c, pts, then) { c.job = { k: 'walk', pts, then }; }
  function wait(c, t, then) { c.job = { k: 'wait', t, then }; }

  const edgeX = (side) => (side < 0 ? -ox - 26 : LW - ox + 26);

  function spawn() {
    const side = Math.random() < 0.5 ? -1 : 1;
    const c = {
      x: edgeX(side), y: G.frontY + 24, dir: -side, speed: rand(34, 44), look: randomLook(), fav: pick(CAT_KEYS), favCol: pick(INK),
      job: null, visits: Math.random() < 0.5 ? 2 : 1, want: null, payT: 0, moving: false,
    };
    c.frames = A.personFrames(c.look);
    customers.push(c); today.cust++; updateHud();
    walk(c, route(c, DOORL + 1, ROW1), () => {
      if (charm() >= 10 && Math.random() < 0.4) say(c, pick(['Love this shop!', 'So cozy in here!', 'Nice decor!']), 'heart', 'like');
      nextDisplay(c);
    });
  }

  function nextDisplay(c) {
    const ds = displays();
    let tc, tr;
    c.focus = null;
    if (ds.length) {
      const f = pick(ds), d = FURN[f.type];
      c.focus = f;
      tc = f.x + Math.floor(Math.random() * d.w); tr = f.y + d.h;
    } else { tc = 2 + Math.floor(Math.random() * (COLS - 6)); tr = 4 + Math.floor(Math.random() * (ROW1 - 5)); }
    [tc, tr] = nearestFree(tc, tr);
    walk(c, route(c, tc, tr), () => browse(c));
  }

  function evaluate(c, d) {
    const ratio = d.price / worth(d);
    let p = 0.9 - (ratio - 0.7) * 0.7 + charm() * 0.008 + (c.fav === d.cat ? 0.18 : -0.04) + (c.favCol === d.base ? 0.1 : 0);
    p = clamp(p, 0.05, 0.95);
    const like = Math.random() < p;
    return { like, reason: like ? 'like' : ratio > 1.2 ? 'price' : 'style' };
  }

  function browse(c) {
    const list = stocked();
    if (!list.length) {
      wait(c, 1.1, () => { say(c, 'Nothing in stock...', 'frown', 'meh'); wait(c, 1.6, () => leave(c)); });
      return;
    }
    // a customer looks at the design the display is set to (if it is in stock)
    const shown = displayDesign(c.focus);
    const d = shown && shown.stock > 0 ? shown : pick(list), ev = evaluate(c, d);
    wait(c, 1.0, () => {
      if (ev.like) { say(c, pick(['I like this design!', 'So cute!', 'Love the colors!', 'Wow, I want this!']), 'heart', 'like', thumbOf(d)); sfx('pop'); }
      else if (ev.reason === 'price') say(c, pick(['A bit too expensive...', 'Hmm, pricey!']), 'coin', 'price', thumbOf(d));
      else say(c, pick(['Not really my style', 'Maybe something else?']), 'meh', 'meh', thumbOf(d));
      wait(c, 2.0, () => {
        if (ev.like && d.stock > 0) { c.want = d; goCounter(c); }
        else if (--c.visits > 0) nextDisplay(c);
        else leave(c);
      });
    });
  }

  function slot(i) { return [(COUNTER.x + 1) * T + 12 - i * 18, (COUNTER.y + 1) * T + 20]; }
  function goCounter(c) {
    const i = queue.length, [sx, sy] = slot(i);
    queue.push(c);
    const [tc, tr] = nearestFree(Math.floor(sx / T), COUNTER.y + 1);
    walk(c, route(c, tc, tr, sx, sy), () => { c.job = { k: 'queued' }; c.payT = 0; });
  }

  function pay(c) {
    queue.splice(queue.indexOf(c), 1);
    const d = c.want;
    if (!d || d.stock < 1) { say(c, 'Oh, sold out!', 'frown', 'meh'); leave(c); return; }
    d.stock--; d.sold++; S.sold++; S.money += d.price; today.sales++; today.rev += d.price;
    c.look.outfit = { cat: d.cat, col: d.base }; c.frames = A.personFrames(c.look);
    say(c, 'Got it!', 'bag', 'pay'); say(clerk, 'Thank you!', 'smile', 'clerk');
    moneyPop('+$' + d.price); sfx('sale'); save(); updateHud();
    leave(c);
  }

  function leave(c) {
    const qi = queue.indexOf(c); if (qi >= 0) queue.splice(qi, 1);
    const sy = G.frontY + 24;
    walk(c, route(c, DOORL + 1, ROW1).concat([[G.W / 2, sy], [edgeX(Math.random() < 0.5 ? -1 : 1), sy]]), () => { c.dead = true; });
  }

  function stepCustomer(c, dt) {
    c.moving = false;
    const j = c.job; if (!j) return;
    if (j.k === 'walk') {
      const p = j.pts[0];
      if (!p) { c.job = null; if (j.then) j.then(c); return; }
      const dx = p[0] - c.x, dy = p[1] - c.y, d = Math.hypot(dx, dy), s = c.speed * dt;
      c.moving = true;
      if (Math.abs(dx) > 0.5) c.dir = dx > 0 ? 1 : -1;
      if (d <= s) { c.x = p[0]; c.y = p[1]; j.pts.shift(); } else { c.x += (dx / d) * s; c.y += (dy / d) * s; }
    } else if (j.k === 'wait') {
      j.t -= dt;
      if (j.t <= 0) { c.job = null; j.then(c); }
    }
  }

  function updateQueue(dt) {
    queue.forEach((c, i) => {
      if (!c.job || c.job.k !== 'queued') return;
      const [sx, sy] = slot(i), dx = sx - c.x, dy = sy - c.y, d = Math.hypot(dx, dy), s = c.speed * dt;
      if (d > 0.5) {
        c.moving = true; if (Math.abs(dx) > 0.5) c.dir = dx > 0 ? 1 : -1;
        if (d <= s) { c.x = sx; c.y = sy; } else { c.x += (dx / d) * s; c.y += (dy / d) * s; }
        c.payT = 0;
      } else if (i === 0) { c.payT += dt; if (c.payT > 0.9) pay(c); }
    });
  }

  /* ---------- luxury cars on the road ---------- */
  let cars = [], carT = 2;
  const CAR_KINDS = ['sedan', 'hatch', 'coupe', 'convertible', 'van', 'sports'];

  function lanes() {
    const roomBelow = LH - (oy + G.roadY);
    return roomBelow >= 48
      ? [{ b: G.roadY + 18, dir: 1, speed: 70 }, { b: G.roadY + 38, dir: -1, speed: 92 }]
      : [{ b: G.roadY + 18, dir: 1, speed: 70 }];
  }

  function spawnCar(anywhere) {
    const ln = pick(lanes());
    const kind = pick(CAR_KINDS), spec = A.CAR_SPEC[kind], col = pick(spec.cols);
    const lo = -ox - spec.w, hi = LW - ox + spec.w;
    const x = anywhere ? rand(lo, hi) : (ln.dir > 0 ? lo : hi);
    if (cars.some((c) => c.y === ln.b && Math.abs(c.x - x) < 110)) return;   // keep a gap in each lane
    cars.push({ x, y: ln.b, dir: ln.dir, speed: ln.speed, kind, spr: A.carSprite(kind, col), w: spec.w, t: rand(0, 6) });
  }

  function updateCars(dt) {
    carT -= dt;
    if (carT <= 0 && cars.length < 4) { spawnCar(false); carT = rand(2.5, 6); }
    cars.forEach((c) => { c.x += c.dir * c.speed * dt; });
    cars = cars.filter((c) => c.x > -ox - c.w - 10 && c.x < LW - ox + c.w + 10);
  }

  function drawCar(c) {
    const bounce = Math.sin(clock * 16 + c.t) > 0.75 ? -1 : 0;
    const x = Math.round(c.x), y = Math.round(c.y);
    ctx.fillStyle = 'rgba(38,27,61,.28)';
    ctx.fillRect(x - c.w / 2 + 2, y - 2, c.w - 4, 3);
    ctx.save(); ctx.translate(x, y - (c.spr.height - 2) + bounce);
    if (c.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(c.spr, -c.w / 2 - 1, 0);
    ctx.restore();
  }

  function update(dt) {
    clock += dt;
    updateCars(dt);
    if (isOpen) {
      spawnT -= dt;
      if (spawnT <= 0 && customers.length < 4 + Math.floor(charm() / 10)) { spawn(); spawnT = rand(3, 6) - Math.min(charm() * 0.05, 1.5); }
      dayT += dt;
      if (dayT >= 120) {
        dayT = 0; S.day++;
        toast(`Day ${S.day - 1} complete: ${today.sales} sales, $${today.rev} revenue`);
        today.cust = today.sales = today.rev = 0; save(); updateHud();
      }
    }
    customers.forEach((c) => stepCustomer(c, dt));
    updateQueue(dt);
    customers = customers.filter((c) => !c.dead);
    updateBubbles(dt);
  }

  /* ---------- rendering ---------- */
  function drawPerson(e, frame) {
    const x = Math.round(e.x), y = Math.round(e.y);
    ctx.fillStyle = 'rgba(38,27,61,.22)';
    ctx.fillRect(x - 7, y - 2, 14, 3); ctx.fillRect(x - 5, y - 3, 10, 1); ctx.fillRect(x - 5, y + 1, 10, 1);
    ctx.save(); ctx.translate(x, y - 32);
    if (e.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(e.frames[frame], -11, 0);
    ctx.restore();
  }

  function render() {
    const L = LOCS[S.loc];
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(A.backdrop(LW, LH, ox, oy, L, G), 0, 0);
    ctx.drawImage(A.roomCanvas(L, S.name, G, logoCv, logoKey()), ox - 9, oy - 7);
    ctx.save(); ctx.translate(ox, oy);
    const ds = stocked();
    // a display set to a custom design shows only that design
    const opt = (f) => { const d = displayDesign(f); return { ds: d ? [d] : ds, seed: f.x + f.y }; };
    const draw = (f) => drawItem(ctx, f.type, f.x * T, f.y * T, opt(f));

    S.furniture.filter((f) => FURN[f.type].layer === 'floor').forEach(draw);
    S.furniture.filter((f) => f.type === 'lamp').forEach((f) => A.drawGlow(ctx, f.x * T + 12, f.y * T + 14));
    S.furniture.filter((f) => FURN[f.type].layer === 'wall').forEach(draw);

    const list = S.furniture.filter((f) => !FURN[f.type].layer).map((f) => ({ y: (f.y + FURN[f.type].h) * T, fn: () => draw(f) }));
    list.push({ y: (COUNTER.y + 1) * T, fn: () => A.drawFurn(ctx, 'counter', COUNTER.x * T, COUNTER.y * T, { ds, seed: 0 }) });
    list.push({ y: clerk.y, fn: () => drawPerson(clerk, 0) });
    STATIONS.forEach((s) => list.push({ y: (s.y + 1) * T, fn: () => A.drawFurn(ctx, s.type, s.x * T, s.y * T, { ds: S.designs, seed: 0 }) }));
    cars.forEach((c) => list.push({ y: c.y, fn: () => drawCar(c) }));
    customers.forEach((c) => list.push({ y: c.y, fn: () => drawPerson(c, c.moving ? 1 + (Math.floor(clock * 6) % 2) : 0) }));
    list.sort((a, b) => a.y - b.y).forEach((q) => q.fn());

    A.drawOpenSign(ctx, isOpen, G);
    if (view === 'shop' && shopHover) drawShopHover();
    if (view === 'decorate') drawDecoOverlay();
    ctx.restore();
  }

  function loop(ts) {
    const dt = Math.min((ts - (last || ts)) / 1000, 0.1); last = ts;
    update(dt);
    if (!$('#app').hidden && (view === 'shop' || view === 'decorate')) render();
    if (view === 'shop') placeStations();
    requestAnimationFrame(loop);
  }

  /* ---------- clicking things inside the shop ---------- */
  let shopHover = null;
  const roomPoint = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale - ox, y: (e.clientY - r.top) / scale - oy }; };

  function hitShop(p) {
    const sg = signRect();
    if (p.x >= sg.x && p.x <= sg.x + sg.w && p.y >= sg.y && p.y <= sg.y + sg.h) return { kind: 'sign' };
    if (Math.abs(p.x - G.W / 2) <= 68 && p.y >= 5 && p.y <= 33) return { kind: 'brand' };   // the shop-name sign
    const s = STATIONS.find((st) => p.x >= st.x * T && p.x < (st.x + 1) * T && p.y >= st.y * T - 28 && p.y < (st.y + 1) * T);
    if (s) return { kind: 'station', s };
    const hits = S.furniture.filter((f) => {
      const d = FURN[f.type];
      return d && d.display && p.x >= f.x * T && p.x < (f.x + d.w) * T && p.y >= f.y * T - 28 && p.y < (f.y + d.h) * T;
    }).sort((a, b) => b.y - a.y);
    return hits[0] ? { kind: 'display', f: hits[0] } : null;
  }

  function drawShopHover() {
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    if (shopHover.kind === 'sign') { const sg = signRect(); ctx.fillRect(sg.x - 2, sg.y - 2, sg.w + 4, sg.h); }
    else if (shopHover.kind === 'brand') ctx.fillRect(G.W / 2 - 68, 5, 136, 28);
    else if (shopHover.kind === 'station') { const s = shopHover.s; ctx.fillRect(s.x * T, s.y * T - 26, T, T + 26); }
    else { const f = shopHover.f, d = FURN[f.type]; ctx.fillRect(f.x * T, f.y * T - 26, d.w * T, d.h * T + 26); }
  }

  function initShopClicks() {
    cv.addEventListener('pointermove', (e) => {
      if (view !== 'shop' || drag) return;
      shopHover = hitShop(roomPoint(e));
      cv.style.cursor = shopHover ? 'pointer' : '';
      cv.title = shopHover ? (shopHover.kind === 'display' ? 'Choose the design on this display' : shopHover.kind === 'sign' ? 'Open / close the shop' : shopHover.kind === 'brand' ? 'Edit your shop name and logo' : shopHover.s.label) : '';
    });
    cv.addEventListener('pointerleave', () => { shopHover = null; });
    cv.addEventListener('click', (e) => {
      if (view !== 'shop' || suppressClick) return;
      const h = hitShop(roomPoint(e));
      if (!h) return;
      if (h.kind === 'sign') toggleOpen();
      else if (h.kind === 'brand') openBrand();
      else if (h.kind === 'station') { sfx('click'); showView(h.s.view); }
      else openPicker(h.f);
    });
  }

  /* ---------- display design picker ---------- */
  let pickerFor = null;
  function openPicker(f) {
    pickerFor = f;
    $('#picker-title').textContent = FURN[f.type].label + ' display';
    renderPicker(); $('#picker').hidden = false; sfx('click');
  }
  function closePicker() { pickerFor = null; $('#picker').hidden = true; }
  function renderPicker() {
    const cur = pickerFor.design, g = $('#picker-grid');
    g.innerHTML = `<button class="pick ${cur ? '' : 'sel'}" data-id=""><span class="pxi" data-icon="star"></span><b>Auto mix</b><small>Shows what is in stock</small></button>` +
      S.designs.map((d) => `<button class="pick ${cur === d.id ? 'sel' : ''}" data-id="${d.id}"><canvas width="24" height="24"></canvas><b>${esc(d.name)}</b><small>${d.stock} in stock</small></button>`).join('');
    [...g.querySelectorAll('canvas')].forEach((c, i) => A.drawGarment(c.getContext('2d'), S.designs[i], 1));
    mount(g);
  }
  function initPicker() {
    $('#picker-grid').onclick = (e) => {
      const b = e.target.closest('.pick'); if (!b || !pickerFor) return;
      if (b.dataset.id) pickerFor.design = b.dataset.id; else delete pickerFor.design;
      save(); sfx('place'); closePicker();
    };
    $('#picker-close').onclick = closePicker;
    $('#picker').addEventListener('click', (e) => { if (e.target.id === 'picker') closePicker(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePicker(); });
  }

  /* ---------- decorate mode ---------- */
  let decoSel = 'rack', hover = null;
  const known = (t) => Object.prototype.hasOwnProperty.call(FURN, t);

  /* The player's own pixelated images work on the wall AND the floor.
     Each one registers two furniture types: c_<id> (stands on the floor) and w_<id> (hangs on the wall). */
  const customImgs = {};
  function registerCustom(cu) {
    FURN['c_' + cu.id] = { label: cu.name, w: Math.max(1, Math.ceil((cu.w + 2) / T)), h: 1, cost: 0, charm: 2, custom: cu.id };
    FURN['w_' + cu.id] = { label: cu.name, w: Math.max(1, Math.ceil((cu.w + 8) / T)), h: 2, cost: 0, charm: 2, layer: 'wall', custom: cu.id, hidden: true };
    const img = new Image();
    img.onload = () => {
      const plain = document.createElement('canvas'); plain.width = img.width; plain.height = img.height;
      plain.getContext('2d').drawImage(img, 0, 0);
      customImgs[cu.id] = { plain, outlined: window.Pixelate.outline(plain) };
      if (!$('#ctx-deco').hidden) buildDecoPalette();
    };
    img.src = cu.png;
  }
  const unregisterCustoms = () => Object.keys(FURN).forEach((k) => { if (FURN[k].custom) delete FURN[k]; });

  /* draw any furniture, including custom pixel images */
  function drawItem(c, type, x, y, o) {
    const d = FURN[type];
    if (!d.custom) { A.drawFurn(c, type, x, y, o); return; }
    const cu = S.customs.find((q) => q.id === d.custom), im = customImgs[d.custom];
    if (!cu || !im) return;
    c.imageSmoothingEnabled = false;
    if (d.layer === 'wall') {                                   // hangs on the wall in a wooden frame
      const fw = cu.w + 6, fh = cu.h + 6;
      const fx = x + Math.round((d.w * T - fw) / 2), fy = y + Math.round((48 - fh) / 2);
      A.bx(c, fx, fy, fw, fh, '#8a5a3b');
      c.drawImage(im.plain, fx + 3, fy + 3);
    } else {                                                    // stands on the floor with an outline + shadow
      const ow = im.outlined.width, oh = im.outlined.height;
      c.save(); c.translate(x, y); A.shadow(c, d.w * T, T); c.restore();
      c.drawImage(im.outlined, x + Math.round((d.w * T - ow) / 2), y + T - 3 - oh);
    }
  }

  function buildDecoPalette() {
    const el = $('#deco-palette');
    const next = SIZES[(S.level || 0) + 1];
    el.innerHTML = Object.entries(FURN).filter(([, d]) => !d.hidden).map(([id, d]) => `
      <button class="deco ${decoSel === id ? 'sel' : ''}" data-id="${id}" title="${esc(d.label)}${d.custom ? ' - click the wall to hang it, the floor to stand it' : ''}">
        <canvas data-prev="${id}"></canvas><span>${esc(d.label)}</span><small>${d.custom ? 'wall or floor' : '$' + d.cost}</small>
        ${d.custom ? `<span class="cx" data-delcustom="${d.custom}" title="Delete this decoration">&times;</span>` : ''}
      </button>`).join('') + `
      <button class="deco" data-id="upload" title="Turn any picture into a pixel decoration">
        <span class="pxi" data-icon="image"></span><span>Upload</span><small>any image</small>
      </button>
      <button class="deco ed ${decoSel === 'edit' ? 'sel' : ''}" data-id="edit" title="Click a rack, shelf, table or mannequin to choose its design">
        <span class="pxi" data-icon="palette"></span><span>Set design</span><small>per display</small>
      </button>
      <button class="deco rm ${decoSel === 'remove' ? 'sel' : ''}" data-id="remove">
        <span class="pxi" data-icon="x"></span><span>Remove</span><small>50% back</small>
      </button>
      <button class="deco" data-id="expand" title="Make the shop bigger">
        <span class="pxi" data-icon="expand"></span><span>Expand</span><small>${next ? '$' + next.cost : 'max size'}</small>
      </button>`;
    el.querySelectorAll('canvas[data-prev]').forEach((c) => {
      const id = c.dataset.prev, d = FURN[id];
      c.width = d.w * T + 16; c.height = d.h * T + 44;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      drawItem(x, id, 8, 34, { ds: stocked(), seed: 0 });
    });
    mount(el);
  }

  async function deleteCustom(id) {
    const cu = S.customs.find((q) => q.id === id); if (!cu) return;
    if (!(await askConfirm(`Copies of "${cu.name}" in your shop will be removed too.`, { title: 'Delete decoration?', ok: 'Delete', danger: true }))) return;
    S.customs = S.customs.filter((q) => q.id !== id);
    S.furniture = S.furniture.filter((f) => f.type !== 'c_' + id && f.type !== 'w_' + id);
    delete FURN['c_' + id]; delete FURN['w_' + id]; delete customImgs[id];
    if (decoSel === 'c_' + id) decoSel = 'rack';
    rebuildBlocked(); save(); sfx('place'); buildDecoPalette();
  }

  const layerOf = (type) => FURN[type].layer || 'obj';
  const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  function canPlace(type, tx, ty) {
    const d = FURN[type], rect = { x: tx, y: ty, w: d.w, h: d.h }, layer = layerOf(type);
    if (tx < 0 || tx + d.w > COLS) return false;
    if (layer === 'wall') { if (ty !== 0) return false; }
    else if (ty < ROW0 || ty + d.h > ROW1) return false;
    if (layer === 'obj') {
      if (overlaps(rect, COUNTER)) return false;
      if (STATIONS.some((s) => overlaps(rect, { x: s.x, y: s.y, w: 1, h: 1 }))) return false;
      if (overlaps(rect, { x: DOORL - 1, y: ROW1 - 2, w: 4, h: 2 })) return false;               // keep the doorway clear
      if (overlaps(rect, { x: COUNTER.x - 3, y: COUNTER.y + 1, w: 6, h: 1 })) return false;      // keep the counter queue clear
    }
    return !S.furniture.some((f) => layerOf(f.type) === layer && overlaps(rect, { x: f.x, y: f.y, w: FURN[f.type].w, h: FURN[f.type].h }));
  }

  function pointerTile(e) {
    const r = cv.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) / scale - ox) / T), y: Math.floor(((e.clientY - r.top) / scale - oy) / T) };
  }

  function ghost() {
    if (!hover || decoSel === 'remove' || decoSel === 'edit' || !known(decoSel)) return null;
    // your own images go on the wall when you point at the wall, on the floor otherwise
    let type = decoSel;
    if (FURN[decoSel].custom) type = (hover.y < ROW0 ? 'w_' : 'c_') + FURN[decoSel].custom;
    const d = FURN[type];
    const x = clamp(hover.x - Math.floor((d.w - 1) / 2), 0, COLS - d.w);
    const y = d.layer === 'wall' ? 0 : clamp(hover.y, ROW0, ROW1 - d.h);
    return { type, x, y, ok: canPlace(type, x, y) && S.money >= d.cost };
  }

  function furnAt(t) {
    const hit = S.furniture.filter((f) => { const d = FURN[f.type]; return t.x >= f.x && t.x < f.x + d.w && t.y >= f.y && t.y < f.y + d.h; });
    const rank = { obj: 0, wall: 1, floor: 2 };
    hit.sort((a, b) => rank[layerOf(a.type)] - rank[layerOf(b.type)]);
    return hit[0] || null;
  }

  function drawDecoOverlay() {
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    for (let r = ROW0; r < ROW1; r++) for (let c = 0; c < COLS; c++) {
      if ((r + c) % 2) ctx.fillRect(c * T, r * T, T, T);
    }
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let c = 0; c <= COLS; c++) ctx.fillRect(c * T, ROW0 * T, 1, (ROW1 - ROW0) * T);
    for (let r = ROW0; r <= ROW1; r++) ctx.fillRect(0, r * T, COLS * T, 1);
    if (!hover) return;
    if (decoSel === 'remove' || decoSel === 'edit') {
      const f = furnAt(hover);
      if (f && (decoSel === 'remove' || FURN[f.type].display)) {
        const d = FURN[f.type];
        ctx.fillStyle = decoSel === 'remove' ? 'rgba(230,57,70,.4)' : 'rgba(95,180,255,.45)';
        ctx.fillRect(f.x * T, f.y * T - (decoSel === 'edit' ? 26 : 0), d.w * T, d.h * T + (decoSel === 'edit' ? 26 : 0));
      }
      return;
    }
    const g = ghost(); if (!g) return;
    const d = FURN[g.type];
    ctx.globalAlpha = 0.75; drawItem(ctx, g.type, g.x * T, g.y * T, { ds: stocked(), seed: g.x + g.y }); ctx.globalAlpha = 1;
    ctx.fillStyle = g.ok ? 'rgba(95,207,159,.45)' : 'rgba(230,57,70,.45)';
    ctx.fillRect(g.x * T, g.y * T, d.w * T, d.h * T);
  }

  function initDeco() {
    $('#deco-palette').onclick = (e) => {
      const del = e.target.closest('[data-delcustom]');
      if (del) { deleteCustom(del.dataset.delcustom); return; }
      const b = e.target.closest('.deco'); if (!b) return;
      const id = b.dataset.id; sfx('click');
      if (id === 'upload') { openUpload(); return; }
      if (id === 'expand') { expandShop(); return; }
      decoSel = id; buildDecoPalette();
    };
    // the furniture bar has no scrollbar: arrow buttons, mouse wheel and drag scroll it instead
    const pal = $('#deco-palette'), prev = $('#deco-prev'), next = $('#deco-next');
    const edges = () => { prev.disabled = pal.scrollLeft < 4; next.disabled = pal.scrollLeft > pal.scrollWidth - pal.clientWidth - 4; };
    prev.onclick = () => { pal.scrollBy({ left: -pal.clientWidth * 0.8 }); sfx('click'); };
    next.onclick = () => { pal.scrollBy({ left: pal.clientWidth * 0.8 }); sfx('click'); };
    pal.addEventListener('scroll', edges);
    pal.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { pal.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    new MutationObserver(() => setTimeout(edges, 50)).observe(pal, { childList: true });
    window.addEventListener('resize', edges);
    cv.addEventListener('pointermove', (e) => { if (view === 'decorate') hover = pointerTile(e); });
    cv.addEventListener('pointerleave', () => { hover = null; });
    cv.addEventListener('click', (e) => {
      if (view !== 'decorate' || suppressClick) return;
      const t = pointerTile(e);
      if (decoSel === 'edit') {
        const f = furnAt(t);
        if (f && FURN[f.type].display) openPicker(f); else if (f) toast('Pick a rack, shelf, table or mannequin');
        return;
      }
      if (decoSel === 'remove') {
        const f = furnAt(t); if (!f) return;
        S.money += Math.floor(FURN[f.type].cost / 2);
        S.furniture.splice(S.furniture.indexOf(f), 1);
        rebuildBlocked(); sfx('place'); save(); updateHud(); return;
      }
      hover = t;
      const g = ghost(); if (!g) return;
      if (S.money < FURN[g.type].cost) { toast('Not enough money', true); sfx('error'); return; }
      if (!g.ok) { sfx('error'); return; }
      S.money -= FURN[g.type].cost; S.furniture.push({ type: g.type, x: g.x, y: g.y });
      rebuildBlocked(); sfx('place'); save(); updateHud();
    });
  }

  /* ---------- expand the shop ---------- */
  function updateExpandBtn() {
    const next = SIZES[(S.level || 0) + 1], b = $('#expand');
    $('#expand-text').textContent = next ? `Expand $${next.cost}` : 'Max size';
    b.disabled = !next;
    b.title = next ? `${next.name}: ${next.cols} x ${next.rows} tiles` : 'Your shop is as big as it gets';
  }

  async function expandShop() {
    const next = SIZES[(S.level || 0) + 1];
    if (!next) { toast('Your shop is already the biggest'); return; }
    if (S.money < next.cost) { toast(`You need $${next.cost} to expand`, true); sfx('error'); return; }
    if (!(await askConfirm(`Your shop grows to ${next.cols} x ${next.rows} tiles for $${next.cost}. Customers will walk in again after the builders leave.`, { title: `Expand to a ${next.name}?`, ok: `Pay $${next.cost}` }))) return;
    S.money -= next.cost; S.level = (S.level || 0) + 1;
    customers = []; queue = []; bubbles.splice(0).forEach((b) => b.el.remove());
    applySize(); rebuildBlocked(); layout(); updateExpandBtn(); updateHud(); save();
    if (view === 'decorate') buildDecoPalette();
    sfx('save'); toast(`Your shop grew: ${next.name}!`);
  }

  /* ---------- upload your own decoration (any image -> pixel art) ---------- */
  const up = { img: null, detail: 32, colors: 16, removeBg: false, canvas: null };

  function openUpload() {
    up.img = null; up.canvas = null;
    $('#up-body').hidden = true; $('#up-add').disabled = true; $('#upload-file').value = ''; $('#up-name').value = '';
    $('#drop-text').textContent = 'Choose an image (or drop one here)';
    $('#upload').hidden = false;
  }
  const closeUpload = () => { $('#upload').hidden = true; };

  function renderUp() {
    if (!up.img) return;
    // one pixel image works on the wall and the floor (the outline for floor use is added when drawing)
    up.canvas = window.Pixelate.run(up.img, { maxW: up.detail, maxH: up.detail, colors: up.colors, removeBg: up.removeBg, outline: false });
    const pv = $('#up-prev');
    pv.width = up.canvas.width; pv.height = up.canvas.height;
    const x = pv.getContext('2d'); x.clearRect(0, 0, pv.width, pv.height); x.drawImage(up.canvas, 0, 0);
    const k = Math.max(1, Math.floor(200 / Math.max(up.canvas.width, up.canvas.height)));
    pv.style.width = pv.width * k + 'px'; pv.style.height = pv.height * k + 'px';
  }

  async function loadUploadFile(file) {
    if (!file || !file.type.startsWith('image/')) { toast('Please choose an image file', true); return; }
    try {
      up.img = await window.Pixelate.loadFile(file);
      $('#drop-text').textContent = file.name;
      if (!$('#up-name').value) $('#up-name').value = file.name.replace(/\.[^.]+$/, '').slice(0, 18);
      $('#up-body').hidden = false; $('#up-add').disabled = false; renderUp();
    } catch (err) { toast('Could not read that image', true); }
  }

  function initUpload() {
    $('#upload-file').onchange = (e) => loadUploadFile(e.target.files[0]);
    $('#upload-close').onclick = closeUpload;
    $('#upload').addEventListener('click', (e) => { if (e.target.id === 'upload') closeUpload(); });
    const card = $('#upload .picker-card');
    ['dragenter', 'dragover'].forEach((n) => card.addEventListener(n, (e) => { e.preventDefault(); $('#drop').classList.add('over'); }));
    ['dragleave', 'drop'].forEach((n) => card.addEventListener(n, (e) => { e.preventDefault(); $('#drop').classList.remove('over'); }));
    card.addEventListener('drop', (e) => loadUploadFile(e.dataTransfer.files[0]));
    $$('#upload .seg').forEach((seg) => seg.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      up[seg.dataset.opt] = Number(b.dataset.v);
      sfx('click'); renderUp();
    }));
    $('#up-bg').onchange = (e) => { up.removeBg = e.target.checked; renderUp(); };
    $('#up-add').onclick = () => {
      if (!up.canvas) return;
      if (S.customs.length >= 12) { toast('You can keep up to 12 custom decorations', true); sfx('error'); return; }
      const name = esc($('#up-name').value.trim() || 'My decoration').slice(0, 18);
      const cu = { id: 'u' + Date.now().toString(36), name, kind: 'any', w: up.canvas.width, h: up.canvas.height, png: up.canvas.toDataURL('image/png') };
      S.customs.push(cu); registerCustom(cu); save(); sfx('save');
      decoSel = 'c_' + cu.id; closeUpload(); buildDecoPalette();
      toast(`"${name}" is ready. Click the wall to hang it or the floor to stand it`);
    };
  }

  /* ---------- shop brand: name + photo logo on the sign ---------- */
  let logoCv = null;
  const logoKey = () => (S && S.logo ? S.logo.length + ':' + S.logo.slice(-24) : '');
  function loadLogo() {
    logoCv = null; A.clearCache();
    if (!S.logo) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      logoCv = c; A.clearCache();
    };
    img.src = S.logo;
  }

  const brand = { img: null, detail: 20, colors: 16, removeBg: false, canvas: null, removed: false };
  const closeBrand = () => { $('#brand').hidden = true; };

  function brandLogo() { return brand.removed ? null : brand.canvas || logoCv; }

  function renderBrandPreview() {
    const pv = $('#brand-prev'); pv.width = 144; pv.height = 36;
    const x = pv.getContext('2d'); x.clearRect(0, 0, 144, 36);
    A.drawSign(x, 72, LOCS[S ? S.loc : pendingLoc], $('#brand-name').value.trim() || (S ? S.name : 'Your shop'), brandLogo());
    const has = !!brandLogo();
    $('#brand-remove').hidden = !has;
  }

  function renderBrandLogo() {
    if (!brand.img) return;
    brand.canvas = window.Pixelate.run(brand.img, { maxW: brand.detail, maxH: brand.detail, colors: brand.colors, removeBg: brand.removeBg, outline: false });
    brand.removed = false; renderBrandPreview();
  }

  async function loadBrandFile(file) {
    if (!file || !file.type.startsWith('image/')) { toast('Please choose an image file', true); return; }
    try {
      brand.img = await window.Pixelate.loadFile(file);
      $('#brand-drop-text').textContent = file.name; $('#brand-opts').hidden = false;
      renderBrandLogo();
    } catch (err) { toast('Could not read that image', true); }
  }

  function openBrand() {
    brand.img = null; brand.canvas = null; brand.removed = false;
    $('#brand-name').value = S.name; $('#brand-opts').hidden = true; $('#brand-file').value = '';
    $('#brand-drop-text').textContent = S.logo ? 'Change the logo photo' : 'Choose a photo for your sign';
    $('#brand').hidden = false; renderBrandPreview(); sfx('click');
  }

  function initBrand() {
    $('#brand-file').onchange = (e) => loadBrandFile(e.target.files[0]);
    $('#brand-close').onclick = closeBrand;
    $('#brand').addEventListener('click', (e) => { if (e.target.id === 'brand') closeBrand(); });
    const card = $('#brand .picker-card');
    ['dragover', 'dragenter'].forEach((n) => card.addEventListener(n, (e) => e.preventDefault()));
    card.addEventListener('drop', (e) => { e.preventDefault(); loadBrandFile(e.dataTransfer.files[0]); });
    $('#brand-name').oninput = renderBrandPreview;
    $$('#brand .seg').forEach((seg) => seg.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      brand[seg.dataset.opt] = Number(b.dataset.v); sfx('click'); renderBrandLogo();
    }));
    $('#brand-bg').onchange = (e) => { brand.removeBg = e.target.checked; renderBrandLogo(); };
    $('#brand-remove').onclick = () => { brand.removed = true; brand.canvas = null; brand.img = null; $('#brand-opts').hidden = true; renderBrandPreview(); sfx('click'); };
    $('#brand-save').onclick = () => {
      S.name = esc($('#brand-name').value.trim()).slice(0, 16) || S.name;
      if (brand.removed) S.logo = '';
      else if (brand.canvas) S.logo = brand.canvas.toDataURL('image/png');
      $('#shop-title').textContent = S.name;
      loadLogo(); save(); closeBrand(); sfx('save'); toast('Shop sign updated');
    };
    $('#plaque').onclick = openBrand;
  }

  /* logo picker on the title screen (optional) */
  let pendingLogo = '';
  function initSetupLogo() {
    $('#setup-logo').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const img = await window.Pixelate.loadFile(f);
        const cvs = window.Pixelate.run(img, { maxW: 20, maxH: 20, colors: 16, removeBg: false, outline: false });
        pendingLogo = cvs.toDataURL('image/png');
        const pv = $('#setup-logo-prev'); pv.width = cvs.width; pv.height = cvs.height;
        pv.getContext('2d').drawImage(cvs, 0, 0); pv.hidden = false;
        $('#setup-logo-text').textContent = f.name;
      } catch (err) { toast('Could not read that image', true); }
    };
  }

  /* ---------- save game: autosave, 3 slots, export / import ---------- */
  const SLOT_KEY = (i) => 'clothes-shop-slot-' + i;
  const readSlot = (i) => { try { return JSON.parse(localStorage.getItem(SLOT_KEY(i))); } catch (e) { return null; } };

  function sanitize(st) {
    if (!st || typeof st !== 'object' || typeof st.name !== 'string' || !Array.isArray(st.designs) || !Array.isArray(st.furniture)) return null;
    const hex = /^#[0-9a-f]{6}$/i;
    const designs = st.designs
      .filter((d) => d && CATS[d.cat] && typeof d.base === 'string' && hex.test(d.base) && Array.isArray(d.px) && d.px.length === 576)
      .map((d) => ({
        id: String(d.id).replace(/[^\w-]/g, ''), name: esc(d.name || 'Design').slice(0, 20), cat: d.cat, base: d.base,
        px: d.px.map((p) => (typeof p === 'string' && hex.test(p) ? p : null)),
        price: clamp(Math.floor(+d.price) || 1, 1, 999), stock: Math.max(0, Math.floor(+d.stock) || 0), sold: Math.max(0, Math.floor(+d.sold) || 0),
      }));
    const customs = (Array.isArray(st.customs) ? st.customs : [])
      .filter((c) => c && typeof c.png === 'string' && c.png.startsWith('data:image/png;base64,') && c.w > 0 && c.h > 0 && c.w <= 80 && c.h <= 60)
      .slice(0, 12)
      .map((c) => ({ id: String(c.id).replace(/[^\w]/g, ''), name: esc(c.name || 'Custom').slice(0, 18), kind: c.kind === 'wall' ? 'wall' : 'floor', w: Math.floor(c.w), h: Math.floor(c.h), png: c.png }));
    const furniture = st.furniture
      .filter((f) => f && typeof f.type === 'string' && Number.isFinite(+f.x) && Number.isFinite(+f.y))
      .map((f) => ({ type: f.type, x: Math.floor(f.x), y: Math.floor(f.y), ...(typeof f.design === 'string' ? { design: f.design.replace(/[^\w-]/g, '') } : {}) }));
    return {
      name: esc(st.name).slice(0, 16) || 'My Shop', loc: LOCS[st.loc] ? st.loc : 'street',
      logo: typeof st.logo === 'string' && st.logo.startsWith('data:image/png;base64,') && st.logo.length < 30000 ? st.logo : '', level: clamp(Math.floor(+st.level) || 0, 0, SIZES.length - 1),
      money: Number.isFinite(+st.money) ? +st.money : 0, day: Math.max(1, Math.floor(+st.day) || 1), sold: Math.max(0, Math.floor(+st.sold) || 0),
      muted: !!st.muted, vol: clamp(Number.isFinite(+st.vol) ? +st.vol : 0.7, 0, 1), designs, customs, furniture,
    };
  }

  /* (re)build everything that depends on the loaded state */
  function applyState() {
    unregisterCustoms();
    S.customs.forEach(registerCustom);
    S.furniture = S.furniture.filter((f) => known(f.type));
    applySize();
    $('#shop-title').textContent = S.name;
    $('#loc-label').textContent = LOCS[S.loc].name;
    $('#vol').value = Math.round(S.vol * 100);
    A.clearCache(); loadLogo(); mount(); syncMute(); rebuildBlocked(); layout(); buildStations(); updateExpandBtn(); renderOpenBtn(); updateHud();
  }

  function loadState(raw) {
    const st = sanitize(raw);
    if (!st) { toast('That save is not valid', true); sfx('error'); return false; }
    S = st; customers = []; queue = []; bubbles.splice(0).forEach((b) => b.el.remove());
    isOpen = false; dayT = 0; today.cust = today.sales = today.rev = 0;
    if ($('#app').hidden) startGame(); else { applyState(); showView('shop'); }
    save(); sfx('save'); toast('Game loaded');
    return true;
  }

  function openSaveMenu() {
    const inApp = !$('#app').hidden;
    $('#save-title').textContent = inApp ? 'Save game' : 'Load game';
    $('#save-sub').textContent = inApp
      ? 'Your shop saves automatically. Keep extra copies in slots, or export a backup file.'
      : 'Pick a save to keep playing. Your autosave is always the latest.';
    $('#to-menu').hidden = !inApp; $('#export-save').hidden = !S;
    renderSlots();
    $('#savemenu').hidden = false;
  }

  function quickSave() { save(); sfx('save'); toast('Game saved'); }

  function renderSlots() {
    const inApp = !$('#app').hidden, states = [];
    const when = (t) => new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const chips = (st) => `<span class="chip cat">${esc(SIZES[st.level].name)}</span><span class="chip">Day ${st.day}</span><span class="chip ok">$${Math.floor(st.money)}</span><span class="chip">${st.designs.length} designs</span>`;
    const card = ({ id, tag, st, date, btns, cls }) => {
      states.push(st);
      return `<div class="slot-card ${cls || ''} ${st ? '' : 'is-empty'}" data-slot="${id}">
        <div class="slot-thumb"><canvas width="24" height="24" data-i="${states.length - 1}"></canvas></div>
        <div class="slot-body"><span class="slot-tag">${tag}</span><b class="slot-name">${st ? esc(st.name) : 'Empty slot'}</b>
          <div class="slot-chips">${st ? chips(st) : '<span class="chip">Nothing saved here yet</span>'}</div>
          ${date ? `<small class="slot-date">Saved ${date}</small>` : ''}</div>
        <div class="slot-btns">${btns}</div></div>`;
    };
    const out = [];
    const auto = inApp ? S : sanitize(load());
    const autoAt = Number(localStorage.getItem(KEY + '-at')) || 0;
    if (auto) {
      out.push(card({
        id: 'auto', tag: 'Autosave', st: auto, cls: 'auto', date: autoAt ? when(autoAt) : '',
        btns: inApp ? '<button class="btn sm primary" data-act="save-now"><i data-lucide="save"></i> Save now</button>' : '<button class="btn sm primary" data-act="auto-load"><i data-lucide="play"></i> Load</button>',
      }));
    }
    let any = !!auto;
    [1, 2, 3].forEach((i) => {
      const sl = readSlot(i), st = sl && sanitize(sl.state);
      if (st) any = true;
      if (!st && !inApp) return;                       // when loading, only show slots that hold a save
      out.push(card({
        id: i, tag: `Slot ${i}`, st, date: st ? when(sl.savedAt) : '',
        btns: (st ? '<button class="btn sm primary" data-act="slot-load"><i data-lucide="play"></i> Load</button>' : '') +
          (inApp ? '<button class="btn sm" data-act="slot-save"><i data-lucide="save"></i> Save here</button>' : '') +
          (st ? '<button class="btn sm danger" data-act="slot-del"><i data-lucide="trash-2"></i> Delete</button>' : ''),
      }));
    });
    if (!any && !inApp) out.unshift('<div class="slot-note">No saved games yet. Start a new game to begin!</div>');
    const box = $('#slots');
    box.innerHTML = out.join('');
    box.querySelectorAll('canvas[data-i]').forEach((cv2) => {
      const st = states[cv2.dataset.i], d = st && st.designs[0];
      if (d) A.drawGarment(cv2.getContext('2d'), d, 1);
    });
    icons();
  }

  function exportSave() {
    const blob = new Blob([JSON.stringify({ game: 'clothes-shop', version: 2, savedAt: Date.now(), state: S })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `clothes-shop-${S.name.replace(/[^\w-]+/g, '_')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    toast('Save file exported');
  }

  function initSave() {
    const menu = $('#savemenu'), close = () => { menu.hidden = true; };
    $('#save-btn').onclick = () => { sfx('click'); openSaveMenu(); };
    $('#to-menu').onclick = () => { if (S) save(); close(); showMenu(); };
    $('#save-close').onclick = close;
    menu.addEventListener('click', (e) => { if (e.target === menu) close(); });
    $('#export-save').onclick = exportSave;
    $('#import-file').onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      try {
        const obj = JSON.parse(await f.text());
        if (S && !(await askConfirm('Your current shop will be replaced by the one in this file.', { title: 'Import this save?', ok: 'Import', danger: true }))) return;
        if (loadState(obj.state || obj)) close();
      } catch (err) { toast('Could not read that file', true); sfx('error'); }
    };
    $('#slots').onclick = async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const i = b.closest('.slot-card').dataset.slot, s = readSlot(i);
      if (b.dataset.act === 'save-now') { quickSave(); }
      else if (b.dataset.act === 'auto-load') { if (loadState(load())) close(); }
      else if (b.dataset.act === 'slot-save') {
        try { localStorage.setItem(SLOT_KEY(i), JSON.stringify({ savedAt: Date.now(), state: S })); sfx('save'); toast(`Saved to slot ${i}`); }
        catch (err) { toast('Not enough browser storage for this slot', true); sfx('error'); }
      } else if (b.dataset.act === 'slot-load' && s) {
        if (await askConfirm(`Your current shop is replaced by slot ${i}. It stays in autosave until you play on.`, { title: `Load slot ${i}?`, ok: 'Load' })) { if (loadState(s.state)) close(); }
      } else if (b.dataset.act === 'slot-del') {
        if (await askConfirm('This save slot will be emptied.', { title: `Delete slot ${i}?`, ok: 'Delete', danger: true })) { localStorage.removeItem(SLOT_KEY(i)); sfx('click'); }
      }
      renderSlots();
    };
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); closeUpload(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (S && !$('#app').hidden) quickSave(); }
    });
    setInterval(() => { if (S) save(); }, 15000);
    window.addEventListener('beforeunload', () => { if (S) save(); });
  }

  /* ---------- design studio ---------- */
  const ed = {
    cat: 'tshirt', tool: 'pencil', color: '#261b3d', base: '#ff8a6b', px: Array(576).fill(null),
    undo: [], redo: [], down: false, brush: 1, mirror: false, grid: true, hover: -1, last: -1, recent: [], editing: null,
  };
  const ES = 20;
  const defaultPrice = (cat) => Math.round(CATS[cat].base * 1.15);
  const edWorth = () => CATS[ed.cat].base + ed.px.filter(Boolean).length * 0.12;
  const edCost = () => Math.max(2, Math.round(CATS[ed.cat].base * 0.4));
  const edPrice = () => clamp(parseInt($('#design-price').value, 10) || defaultPrice(ed.cat), 1, 999);

  /* the cells a brush touches around cell i (square brush, optionally mirrored left/right) */
  function brushCells(i) {
    const cx = i % 24, cy = (i / 24) | 0, s = ed.tool === 'pencil' || ed.tool === 'eraser' ? ed.brush : 1, off = Math.floor((s - 1) / 2);
    const out = new Set();
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
      const x = cx - off + dx, y = cy - off + dy;
      if (x < 0 || y < 0 || x > 23 || y > 23) continue;
      out.add(y * 24 + x);
      if (ed.mirror) out.add(y * 24 + (23 - x));
    }
    return [...out];
  }

  function updateStudioInfo() {
    const worth = edWorth(), cost = edCost(), profit = edPrice() - cost;
    $('#info-worth').textContent = '$' + Math.round(worth);
    $('#info-cost').textContent = '$' + cost;
    const p = $('#info-profit');
    p.textContent = (profit >= 0 ? '+$' : '-$') + Math.abs(profit);
    p.classList.toggle('pos', profit > 0); p.classList.toggle('neg', profit < 0);
    $('#undo').disabled = !ed.undo.length; $('#redo').disabled = !ed.redo.length;
  }

  function renderEditor() {
    const c = $('#editor'), x = c.getContext('2d');
    x.clearRect(0, 0, 480, 480);
    for (let cy = 0; cy < 24; cy++) for (let cx = 0; cx < 24; cx++) {
      x.fillStyle = (cx + cy) % 2 ? '#f1eadf' : '#f8f2ea'; x.fillRect(cx * ES, cy * ES, ES, ES);
    }
    A.drawGarment(x, ed, ES);
    if (ed.grid) {
      x.strokeStyle = 'rgba(38,27,61,.10)'; x.lineWidth = 1; x.beginPath();
      for (let i = 0; i <= 24; i++) { x.moveTo(i * ES + .5, 0); x.lineTo(i * ES + .5, 480); x.moveTo(0, i * ES + .5); x.lineTo(480, i * ES + .5); }
      x.stroke();
    }
    if (ed.mirror) {                                              // mirror axis
      x.strokeStyle = 'rgba(74,163,255,.9)'; x.lineWidth = 2; x.setLineDash([6, 5]);
      x.beginPath(); x.moveTo(240, 0); x.lineTo(240, 480); x.stroke(); x.setLineDash([]);
    }
    if (ed.hover >= 0) {                                          // brush outline under the cursor
      brushCells(ed.hover).forEach((k) => {
        const ok = A.paintable(ed.cat, k) || ed.tool === 'pick';
        x.strokeStyle = ok ? '#ffffff' : 'rgba(230,57,70,.8)'; x.lineWidth = 2;
        x.strokeRect((k % 24) * ES + 1, ((k / 24) | 0) * ES + 1, ES - 2, ES - 2);
        x.strokeStyle = ok ? '#261b3d' : 'rgba(230,57,70,.8)'; x.lineWidth = 1;
        x.strokeRect((k % 24) * ES + .5, ((k / 24) | 0) * ES + .5, ES - 1, ES - 1);
      });
    }
    const p = $('#preview').getContext('2d');
    p.clearRect(0, 0, 24, 24); A.drawGarment(p, ed, 1);
    updateStudioInfo();
  }

  function refreshChips() {
    const box = $('#cat-chips');
    if (!box.children.length) {
      box.innerHTML = CAT_KEYS.map((k) => `<button class="cat" data-cat="${k}"><canvas width="24" height="24"></canvas><span>${CATS[k].label}</span></button>`).join('');
    }
    [...box.children].forEach((b) => {
      b.classList.toggle('sel', b.dataset.cat === ed.cat);
      const x = b.querySelector('canvas').getContext('2d');
      x.clearRect(0, 0, 24, 24); A.drawGarment(x, { cat: b.dataset.cat, base: ed.base, px: [] }, 1);
    });
  }

  function cellAt(e) {
    const b = $('#editor').getBoundingClientRect();
    const x = Math.floor(((e.clientX - b.left) / b.width) * 24), y = Math.floor(((e.clientY - b.top) / b.height) * 24);
    return x < 0 || y < 0 || x > 23 || y > 23 ? -1 : y * 24 + x;
  }

  function flood(i, to) {
    const from = ed.px[i] || null;
    if (from === to) return;
    const stack = [i];
    while (stack.length) {
      const k = stack.pop();
      if (k < 0 || k > 575 || !A.paintable(ed.cat, k) || (ed.px[k] || null) !== from) continue;
      ed.px[k] = to;
      const x = k % 24;
      if (x > 0) stack.push(k - 1);
      if (x < 23) stack.push(k + 1);
      stack.push(k - 24, k + 24);
    }
  }

  function addRecent(c) {
    ed.recent = [c, ...ed.recent.filter((x) => x !== c)].slice(0, 8);
    buildPalettes();
  }

  function applyAt(i) {
    if (i < 0) return;
    if (ed.tool === 'pick') {
      if (A.paintable(ed.cat, i)) { ed.color = ed.px[i] || ed.base; buildPalettes(); setTool('pencil'); }
      renderEditor(); return;
    }
    const cells = brushCells(i);
    if (ed.tool === 'fill') cells.forEach((k) => { if (A.paintable(ed.cat, k)) flood(k, ed.color); });
    else cells.forEach((k) => { if (A.paintable(ed.cat, k)) ed.px[k] = ed.tool === 'eraser' ? null : ed.color; });
    renderEditor();
  }

  /* paint along the drag so fast strokes leave no gaps */
  function strokeTo(i) {
    if (i < 0) return;
    if (ed.last < 0 || ed.tool === 'fill' || ed.tool === 'pick') { applyAt(i); ed.last = i; return; }
    const x0 = ed.last % 24, y0 = (ed.last / 24) | 0, x1 = i % 24, y1 = (i / 24) | 0;
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 1; s <= n; s++) applyAt(Math.round(y0 + ((y1 - y0) * s) / n) * 24 + Math.round(x0 + ((x1 - x0) * s) / n));
    ed.last = i;
  }

  function setTool(t) {
    ed.tool = t;
    $$('.tool[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
    renderEditor();
  }
  function pushUndo() { ed.undo.push(ed.px.slice()); if (ed.undo.length > 60) ed.undo.shift(); ed.redo.length = 0; }
  function undo() { if (!ed.undo.length) return; ed.redo.push(ed.px.slice()); ed.px = ed.undo.pop(); renderEditor(); sfx('click'); }
  function redo() { if (!ed.redo.length) return; ed.undo.push(ed.px.slice()); ed.px = ed.redo.pop(); renderEditor(); sfx('click'); }

  function buildPalettes() {
    const mk = (list, cur) => list.map((c) => `<button class="sw ${c === cur ? 'sel' : ''}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
    $('#ink-palette').innerHTML = mk(INK, ed.color);
    $('#base-palette').innerHTML = mk(INK, ed.base);
    $('#recent-colors').innerHTML = ed.recent.length ? mk(ed.recent, ed.color) : '<small class="muted">Colors you use show up here</small>';
    $('#ink-custom').value = ed.color;
  }

  /* quick art: patterns and little logos painted in the current ink color */
  const LOGOS = {
    heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
    star: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
    smile: ['.#####.', '#.....#', '#.#.#.#', '#.....#', '#.###.#', '#.....#', '.#####.'],
  };
  const CHEST_Y = { tshirt: 12, hoodie: 10, sweatshirt: 11, jacket: 12, shirt: 13, tank: 14 };

  function applyPreset(name) {
    pushUndo();
    const set = (x, y, col) => {
      if (x < 0 || y < 0 || x > 23 || y > 23) return;
      const k = y * 24 + x;
      if (A.paintable(ed.cat, k)) ed.px[k] = col || ed.color;
    };
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      if (name === 'stripes' && y % 4 < 2) set(x, y);
      else if (name === 'pin' && x % 4 === 1) set(x, y);
      else if (name === 'dots' && x % 6 < 2 && y % 6 < 2) set(x, y);
      else if (name === 'checks' && ((x >> 1) + (y >> 1)) % 2 === 0) set(x, y);
      else if (name === 'confetti' && Math.random() < 0.13) set(x, y, pick(INK));
    }
    if (LOGOS[name]) {
      const rows = LOGOS[name], x0 = 12 - Math.floor(rows[0].length / 2), y0 = (CHEST_Y[ed.cat] || 12) - Math.floor(rows.length / 2);
      rows.forEach((r, dy) => [...r].forEach((ch, dx) => { if (ch === '#') set(x0 + dx, y0 + dy); }));
    }
    addRecent(ed.color); renderEditor(); sfx('place');
  }

  /* saving, editing existing designs */
  function setEditing(d) {
    ed.editing = d ? d.id : null;
    $('#edit-banner').hidden = !d;
    $('#update-design').hidden = !d;
    $('#save-label').textContent = d ? 'Save as new' : 'Add to stock';
    if (d) $('#edit-name').textContent = d.name;
  }

  function startEdit(id) {
    const d = S.designs.find((x) => x.id === id); if (!d) return;
    ed.cat = d.cat; ed.base = d.base; ed.px = d.px.slice(); ed.undo = []; ed.redo = [];
    $('#design-name').value = d.name; $('#design-price').value = d.price;
    setEditing(d); showView('design'); buildPalettes(); refreshChips(); renderEditor();
  }

  function newDesign() {
    ed.px = Array(576).fill(null); ed.undo = []; ed.redo = [];
    $('#design-name').value = ''; $('#design-price').value = defaultPrice(ed.cat);
    setEditing(null); renderEditor(); sfx('click');
  }

  function saveDesign(asUpdate) {
    const name = esc($('#design-name').value.trim() || `${CATS[ed.cat].label} ${S.designs.length + 1}`).slice(0, 20), price = edPrice();
    const fields = { name, cat: ed.cat, base: ed.base, px: ed.px.slice(), price };
    const cur = asUpdate && ed.editing && S.designs.find((x) => x.id === ed.editing);
    if (cur) {
      Object.assign(cur, fields); delete cur._cv; delete cur._url;       // drop cached sprites of the old art
      save(); sfx('save'); toast(`"${name}" updated`); setEditing(cur);
    } else {
      S.designs.push({ id: 'd' + Date.now(), ...fields, stock: 3, sold: 0 });
      save(); sfx('save'); toast(`"${name}" added to stock (3 units)`);
      setEditing(null); $('#design-name').value = '';
    }
  }

  function initEditor() {
    buildPalettes(); $('#design-price').value = defaultPrice(ed.cat);
    const c = $('#editor');
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId); ed.down = true; ed.last = -1;
      if (ed.tool !== 'pick') { pushUndo(); if (ed.tool !== 'eraser') addRecent(ed.color); }
      strokeTo(cellAt(e));
    });
    c.addEventListener('pointermove', (e) => {
      const i = cellAt(e);
      if (ed.down) strokeTo(i);
      if (i !== ed.hover) { ed.hover = i; if (!ed.down) renderEditor(); }
    });
    const end = () => { ed.down = false; ed.last = -1; };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => { ed.hover = -1; renderEditor(); });

    $$('.tool[data-tool]').forEach((b) => (b.onclick = () => { setTool(b.dataset.tool); sfx('click'); }));
    $('#undo').onclick = undo; $('#redo').onclick = redo;
    $('#clear').onclick = () => { pushUndo(); ed.px = Array(576).fill(null); renderEditor(); sfx('click'); };
    $('#cat-chips').onclick = (e) => {
      const b = e.target.closest('.cat'); if (!b) return;
      ed.cat = b.dataset.cat; if (!ed.editing) $('#design-price').value = defaultPrice(ed.cat);
      sfx('click'); refreshChips(); renderEditor();
    };
    const pickInk = (e) => {
      const b = e.target.closest('.sw'); if (!b) return;
      ed.color = b.dataset.c; if (ed.tool === 'eraser' || ed.tool === 'pick') setTool('pencil');
      buildPalettes(); sfx('click');
    };
    $('#ink-palette').onclick = pickInk; $('#recent-colors').onclick = pickInk;
    $('#base-palette').onclick = (e) => { const b = e.target.closest('.sw'); if (!b) return; ed.base = b.dataset.c; buildPalettes(); refreshChips(); renderEditor(); sfx('click'); };
    $('#ink-custom').oninput = (e) => { ed.color = e.target.value; $$('#ink-palette .sw, #recent-colors .sw').forEach((s) => s.classList.remove('sel')); };
    $('#ink-custom').onchange = (e) => addRecent(e.target.value);
    $('#presets').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) applyPreset(b.dataset.p); };
    $('#brush-seg').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      ed.brush = Number(b.dataset.v); $$('#brush-seg button').forEach((x) => x.classList.toggle('on', x === b)); sfx('click');
    };
    const toggle = (id, key) => { ed[key] = !ed[key]; const b = $(id); b.classList.toggle('on', ed[key]); b.setAttribute('aria-pressed', ed[key]); renderEditor(); sfx('click'); };
    $('#opt-mirror').onclick = () => toggle('#opt-mirror', 'mirror');
    $('#opt-grid').onclick = () => toggle('#opt-grid', 'grid');
    $('#design-price').oninput = updateStudioInfo;
    $('#fair-price').onclick = () => { $('#design-price').value = Math.max(1, Math.round(edWorth() * 1.1)); updateStudioInfo(); sfx('click'); };
    $('#save-design').onclick = () => saveDesign(false);
    $('#update-design').onclick = () => saveDesign(true);
    $('#new-design').onclick = newDesign;

    // keyboard shortcuts while the studio is open
    document.addEventListener('keydown', (e) => {
      if (view !== 'design' || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
      const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && k === 'y') { e.preventDefault(); redo(); }
      else if (mod) return;
      else if (k === 'p') setTool('pencil');
      else if (k === 'e') setTool('eraser');
      else if (k === 'f') setTool('fill');
      else if (k === 'i') setTool('pick');
      else if (k === 'm') $('#opt-mirror').click();
      else if (k === 'g') $('#opt-grid').click();
      else if (k === '[' || k === ']') {
        ed.brush = clamp(ed.brush + (k === ']' ? 1 : -1), 1, 3);
        $$('#brush-seg button').forEach((x) => x.classList.toggle('on', Number(x.dataset.v) === ed.brush)); renderEditor();
      }
    });
  }

  /* ---------- inventory ---------- */
  const unitCost = (d) => Math.max(2, Math.round(CATS[d.cat].base * 0.4));

  function renderInv() {
    const g = $('#inv-grid');
    if (!S.designs.length) {
      g.innerHTML = '<div class="empty card"><h3>No designs yet</h3><p>Head to the Design studio and draw your first piece.</p></div>';
      return;
    }
    g.innerHTML = S.designs.map((d) => `
      <div class="card inv-card" data-id="${d.id}">
        <div class="thumb"><canvas width="24" height="24"></canvas></div>
        <h4>${d.name.replace(/[<>&"]/g, '')}</h4>
        <div class="chips">
          <span class="chip cat">${CATS[d.cat].label}</span>
          <span class="chip ${d.stock > 0 ? 'ok' : 'low'}">${d.stock} in stock</span>
          <span class="chip">${d.sold} sold</span>
          <span class="chip">Worth ~$${Math.round(worth(d))}</span>
        </div>
        <div class="inv-actions">
          <label class="price-wrap"><span>Price $</span><input class="price-in" type="number" min="1" max="999" value="${d.price}" data-act="price" aria-label="Price"></label>
          <button class="btn sm" data-act="edit" title="Open this design in the studio"><i data-lucide="pencil"></i> Edit</button>
          <button class="btn sm danger" data-act="del" title="Delete design"><i data-lucide="trash-2"></i></button>
          <button class="btn sm wide" data-act="make"><i data-lucide="plus"></i> Make 5 more for $${unitCost(d) * 5}</button>
        </div>
      </div>`).join('');
    $$('.inv-card').forEach((card) => {
      const d = S.designs.find((x) => x.id === card.dataset.id);
      A.drawGarment(card.querySelector('canvas').getContext('2d'), d, 1);
    });
    icons();
  }

  function initInv() {
    const g = $('#inv-grid');
    g.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]'); if (!b || b.dataset.act === 'price') return;
      const d = S.designs.find((x) => x.id === b.closest('.inv-card').dataset.id);
      if (!d) return;
      if (b.dataset.act === 'edit') { sfx('click'); startEdit(d.id); return; }
      if (b.dataset.act === 'make') {
        const cost = unitCost(d) * 5;
        if (S.money < cost) { toast('Not enough money', true); sfx('error'); return; }
        S.money -= cost; d.stock += 5; sfx('place');
      } else if (b.dataset.act === 'del') {
        if (!(await askConfirm('The design and its remaining stock are removed for good.', { title: `Delete "${d.name}"?`, ok: 'Delete', danger: true }))) return;
        S.designs = S.designs.filter((x) => x !== d); sfx('click');
      }
      save(); updateHud(); renderInv();
    });
    g.addEventListener('change', (e) => {
      if (e.target.dataset.act !== 'price') return;
      const d = S.designs.find((x) => x.id === e.target.closest('.inv-card').dataset.id);
      d.price = clamp(parseInt(e.target.value, 10) || 1, 1, 999); e.target.value = d.price; save(); sfx('click');
    });
  }

  /* ---------- main menu ---------- */
  function showMenu() {
    const sv = sanitize(load());
    $('#m-continue').hidden = !sv;
    if (sv) $('#m-continue-info').textContent = `${sv.name} \u00b7 Day ${sv.day} \u00b7 $${Math.floor(sv.money)}`;
    $('#app').hidden = true; $('#setup').hidden = true; $('#mainmenu').hidden = false;
    $('#savemenu').hidden = true;
    window.MenuScene.start($('#menu-scene'));
  }

  function initMenu() {
    // show your logo image if assets/logo.png is a real picture (the shipped placeholder is 1x1)
    const img = $('#menu-logo-img');
    img.onload = () => {
      if (img.naturalWidth <= 16) return;
      $('#logo-stage').hidden = false; $('#menu-logo-text').hidden = true;
      $('#logo-stage').style.setProperty('--logo', `url("${img.src}")`);     // the glint is masked to the logo shape
    };
    img.src = 'assets/logo.png?t=' + Date.now();

    $('#m-continue').onclick = () => { const sv = sanitize(load()); if (sv) { S = sv; startGame(); } };
    $('#m-new').onclick = async () => {
      if (sanitize(load()) && !(await askConfirm('Your autosave is replaced as soon as you open the new shop. Tip: keep a copy in a save slot first (Load game).', { title: 'Start a new game?', ok: 'New game' }))) return;
      $('#mainmenu').hidden = true; $('#setup').hidden = false;
      $('[data-step="2"]').hidden = true; $('[data-step="1"]').hidden = false; $('#shop-name').focus();
    };
    $('#m-load').onclick = openSaveMenu;
    $('#m-how').onclick = () => { $('#howto').hidden = false; };
    $('#howto-close').onclick = () => { $('#howto').hidden = true; };
    $('#howto').addEventListener('click', (e) => { if (e.target.id === 'howto') $('#howto').hidden = true; });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') $('#howto').hidden = true;
      if (e.key === 'Enter' && !$('#mainmenu').hidden && $('#savemenu').hidden && $('#howto').hidden && document.activeElement.tagName !== 'BUTTON') ($('#m-continue').hidden ? $('#m-new') : $('#m-continue')).click();
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    initSetup(); initApp(); initPan(); initShopClicks(); initPicker(); initDeco(); initUpload(); initBrand(); initSetupLogo(); initSave(); initMenu(); initConfirm(); initEditor(); initInv();
    icons(); mount();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => A.clearCache());
    showMenu();
  }
  boot();
})();
