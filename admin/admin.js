/* LH Cars admin – upload and manage car listings from the iPad.
   Writes to GitHub through the REST API with a short-lived GitHub App user token (Sign in with GitHub).
   Every action is ONE commit made through the Git Data API (blobs → tree → commit → update ref). */
(function () {
  'use strict';

  /* ==================================================================================
     CONFIG – the only values to change.
     WORKER_URL: the address of the sign-in Worker once it is deployed
                 (see admin-worker/SETUP.md, step 5). Keep it without a trailing slash.
     ================================================================================== */
  var CONFIG = {
    WORKER_URL: 'https://lh-cars-admin.lhcars.workers.dev',   // <-- REPLACE after deploying the Worker
    OWNER: 'Skywalking-Luke',
    REPO: 'lh-cars',
    BRANCH: 'main',
    ALLOWED_LOGIN: 'Skywalking-Luke',
    SITE: 'https://lhcars.my',
    API: 'https://api.github.com'
  };
  // Local test harness only (never honoured on the live site).
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && window.LH_ADMIN_TEST_CONFIG) {
    for (var k in window.LH_ADMIN_TEST_CONFIG) CONFIG[k] = window.LH_ADMIN_TEST_CONFIG[k];
  }
  var G = window.LHGen, KNOWN = window.LH_KNOWN || { captions: {}, features: {}, colours: {} };
  var AUTH_KEY = 'lh_admin_auth', NONCE_KEY = 'lh_admin_nonce';
  var BODY_TYPES = ['SUV', 'Coupe', 'Sedan', 'Hatchback', 'MPV', 'Convertible', 'Sports', 'Classic'];
  var MAKE_FILTER = { 'Mercedes-AMG': 'Mercedes-Benz', 'Mercedes-Maybach': 'Mercedes-Benz', 'Range Rover': 'Land Rover' };
  var BUILTIN_TR = { cap_photo: { ms: 'Foto', zh: '照片', ta: 'புகைப்படம்' } };
  var MAX_PX = 1600, JPEG_Q = 0.85;

  function $(id) { return document.getElementById(id); }
  function el(tag, props, kids) { var e = document.createElement(tag); if (props) for (var p in props) { if (p === 'class') e.className = props[p]; else if (p === 'text') e.textContent = props[p]; else if (p.indexOf('on') === 0) e.addEventListener(p.slice(2), props[p]); else e.setAttribute(p, props[p]); } (kids || []).forEach(function (k) { if (k) e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); }); return e; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function msg(id, t, ok) { var m = $(id); m.textContent = t || ''; m.classList.toggle('ok', !!ok); }

  /* ---------------- auth ---------------- */
  var auth = null;
  function loadAuth() { try { auth = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { auth = null; } if (auth && auth.exp < Date.now() + 30000) { auth = null; sessionStorage.removeItem(AUTH_KEY); } return auth; }
  function workerReady() { return CONFIG.WORKER_URL && CONFIG.WORKER_URL.indexOf('REPLACE-ME') < 0; }
  function randomId() { var a = new Uint8Array(24); crypto.getRandomValues(a); return btoa(String.fromCharCode.apply(null, a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function readFragment() {
    if (!location.hash || location.hash.length < 2) return null;
    var h = new URLSearchParams(location.hash.slice(1));
    // remove the token from the address bar and history straight away
    history.replaceState(null, '', location.pathname + location.search);
    if (h.get('error')) return { error: h.get('error') };
    var tok = h.get('access_token'); if (!tok) return null;
    var nonce = sessionStorage.getItem(NONCE_KEY) || localStorage.getItem(NONCE_KEY); sessionStorage.removeItem(NONCE_KEY); localStorage.removeItem(NONCE_KEY);
    if (!nonce || h.get('n') !== nonce) return { error: 'state' };
    return { token: tok, login: h.get('login') || '', exp: Date.now() + (parseInt(h.get('expires_in'), 10) || 28800) * 1000 };
  }
  function signIn() {
    if (!workerReady()) { msg('signMsg', 'Sign-in is not set up yet: the Worker address still needs to be added to admin.js (see admin-worker/SETUP.md).'); return; }
    var n = randomId(); sessionStorage.setItem(NONCE_KEY, n); localStorage.setItem(NONCE_KEY, n); // nonce only, never the token
    location.assign(CONFIG.WORKER_URL + '/login?n=' + encodeURIComponent(n));
  }
  function signOut(reason) {
    var t = auth && auth.token; auth = null; sessionStorage.removeItem(AUTH_KEY);
    if (t && workerReady()) fetch(CONFIG.WORKER_URL + '/revoke', { method: 'POST', headers: { Authorization: 'Bearer ' + t }, mode: 'cors', credentials: 'omit', keepalive: true }).catch(function () {});
    showSignin(reason || 'You are signed out.');
  }
  var expTimer = null;
  function showSignin(m) { $('vApp').hidden = true; $('who').hidden = true; $('vSignin').hidden = false; msg('signMsg', m || ''); }
  function showApp() {
    $('vSignin').hidden = true; $('vApp').hidden = false; $('who').hidden = false; $('whoTxt').textContent = 'Signed in as ' + auth.login;
    clearTimeout(expTimer); expTimer = setTimeout(function () { signOut('Your sign-in expired after 8 hours. Please sign in again.'); }, Math.max(0, auth.exp - Date.now()));
  }

  /* ---------------- GitHub API ---------------- */
  function AuthError(m) { this.message = m; } AuthError.prototype = Object.create(Error.prototype);
  async function api(method, path, body, opt) {
    opt = opt || {};
    if (!auth || auth.exp < Date.now()) { signOut('Your sign-in expired. Please sign in again.'); throw new AuthError('expired'); }
    for (var attempt = 0; ; attempt++) {
      var r;
      try {
        r = await fetch(CONFIG.API + path, { method: method, cache: 'no-store', headers: Object.assign({ Authorization: 'Bearer ' + auth.token, Accept: opt.raw ? 'application/vnd.github.raw' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
      } catch (e) { if (attempt < 3) { await sleep(1500 * (attempt + 1)); continue; } throw new Error('Network problem. Check the internet connection and try again.'); }
      if (r.status === 401) { signOut('Your sign-in expired. Please sign in again.'); throw new AuthError('401'); }
      var limited = (r.status === 403 || r.status === 429) && (r.headers.get('retry-after') || r.headers.get('x-ratelimit-remaining') === '0' || /rate limit/i.test(await r.clone().text()));
      if ((limited || r.status >= 500) && attempt < 4) {
        var ra = parseInt(r.headers.get('retry-after'), 10), reset = parseInt(r.headers.get('x-ratelimit-reset'), 10);
        var wait = ra ? ra * 1000 : (reset ? Math.min(60000, reset * 1000 - Date.now()) : 0) || 5000 * (attempt + 1);
        busy(null, null, 'GitHub asked us to slow down. Waiting ' + Math.ceil(wait / 1000) + ' s…'); await sleep(wait); continue;
      }
      if (opt.allow && opt.allow.indexOf(r.status) >= 0) return { status: r.status, data: null };
      if (!r.ok) { var t = await r.text(); var e = new Error('GitHub error ' + r.status + ': ' + (t.slice(0, 200))); e.status = r.status; throw e; }
      if (r.status === 204) return { status: 204, data: null };
      return { status: r.status, data: opt.raw ? await r.text() : await r.json() };
    }
  }
  var R = function () { return '/repos/' + CONFIG.OWNER + '/' + CONFIG.REPO; };
  async function verify() {
    var u = (await api('GET', '/user')).data;
    if (!u || u.login.toLowerCase() !== CONFIG.ALLOWED_LOGIN.toLowerCase()) throw new Error('This GitHub account (' + (u && u.login) + ') is not allowed to manage the site.');
    auth.login = u.login;
    var repo = (await api('GET', R())).data;
    if (!repo.permissions || !repo.permissions.push) throw new Error('This account cannot change ' + CONFIG.OWNER + '/' + CONFIG.REPO + '.');
    var ins = await api('GET', '/user/installations', null, { allow: [403, 404] });
    if (ins.data) {
      var ok = (ins.data.installations || []).some(function (i) { return i.account && i.account.login.toLowerCase() === CONFIG.OWNER.toLowerCase() && i.permissions && i.permissions.contents === 'write'; });
      if (!ok) throw new Error('The LH Cars Admin app is not installed on the lh-cars repository with "Contents: Read and write". See SETUP.md step 3.');
    }
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }

  /* ---------------- commits (one per action) ---------------- */
  function b64(blob) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).split(',')[1]); }; fr.onerror = rej; fr.readAsDataURL(blob); }); }
  var blobCache = new WeakMap(); var lastBlobAt = 0;
  async function uploadBlob(blob) {
    if (blobCache.has(blob)) return blobCache.get(blob);
    var gap = Date.now() - lastBlobAt; if (gap < 800) await sleep(800 - gap); // stay under ~75 content-creating requests a minute
    lastBlobAt = Date.now();
    var sha = (await api('POST', R() + '/git/blobs', { content: await b64(blob), encoding: 'base64' })).data.sha;
    blobCache.set(blob, sha); return sha;
  }
  /* plan(ctx) returns {message, files:{path: string | Blob | {sha} | null(delete)}} ; ctx.read(path), ctx.list(dir) read at the head commit */
  async function commit(plan) {
    for (var round = 0; round < 3; round++) {
      busy('Publishing…', 5, 'Checking the latest version of the site…');
      var ref = (await api('GET', R() + '/git/ref/heads/' + CONFIG.BRANCH)).data, head = ref.object.sha;
      var hc = (await api('GET', R() + '/git/commits/' + head)).data;
      var cache = {};
      var ctx = {
        head: head,
        read: async function (p) { if (!(p in cache)) { var x = await api('GET', R() + '/contents/' + encodeURI(p) + '?ref=' + head, null, { raw: true, allow: [404] }); cache[p] = x.data; } return cache[p]; },
        list: async function (d) { var x = await api('GET', R() + '/contents/' + encodeURI(d) + '?ref=' + head, null, { allow: [404] }); return Array.isArray(x.data) ? x.data : []; }
      };
      var pl = await plan(ctx);
      var paths = Object.keys(pl.files), blobs = paths.filter(function (p) { return pl.files[p] instanceof Blob; }), done = 0;
      var tree = [];
      for (var i = 0; i < paths.length; i++) {
        var p = paths[i], v = pl.files[p];
        if (v === null) tree.push({ path: p, mode: '100644', type: 'blob', sha: null });
        else if (typeof v === 'string') tree.push({ path: p, mode: '100644', type: 'blob', content: v });
        else if (v instanceof Blob) { busy(null, 10 + 75 * done / Math.max(1, blobs.length), 'Uploading photo ' + (done + 1) + ' of ' + blobs.length + '…'); tree.push({ path: p, mode: '100644', type: 'blob', sha: await uploadBlob(v) }); done++; }
        else tree.push({ path: p, mode: '100644', type: 'blob', sha: v.sha });
      }
      busy(null, 88, 'Saving everything as one update…');
      var t = (await api('POST', R() + '/git/trees', { base_tree: hc.tree.sha, tree: tree })).data;
      var c = (await api('POST', R() + '/git/commits', { message: pl.message, tree: t.sha, parents: [head] })).data;
      var up = await api('PATCH', R() + '/git/refs/heads/' + CONFIG.BRANCH, { sha: c.sha, force: false }, { allow: [409, 422] });
      if (up.status === 200 || up.status === 201) { busy(null, 100, 'Done'); return c.sha; }
      busy(null, 5, 'Someone else updated the site at the same moment. Trying again…'); await sleep(1500);
    }
    throw new Error('The site kept changing while publishing. Please try again in a minute.');
  }

  /* ---------------- UI helpers ---------------- */
  function busy(title, pct, m) { var b = $('busy'); if (title === false) { b.hidden = true; return; } b.hidden = false; if (title) $('busyT').textContent = title; if (pct !== null && pct !== undefined) $('busyBar').style.width = pct + '%'; if (m) $('busyM').textContent = m; }
  function dialog(nodeOrHtml, buttons) {
    return new Promise(function (resolve) {
      var body = $('dlgBody'); body.innerHTML = ''; if (typeof nodeOrHtml === 'string') body.appendChild(el('p', { text: nodeOrHtml })); else body.appendChild(nodeOrHtml);
      var bt = $('dlgBtns'); bt.innerHTML = '';
      var prev = document.activeElement;
      function close(v) { $('dlg').hidden = true; document.removeEventListener('keydown', key, true); if (prev && prev.focus) try { prev.focus(); } catch (e) {} resolve(v); }
      function key(e) { if (e.key === 'Escape') { e.preventDefault(); close(buttons[0].value); } }
      buttons.forEach(function (b) { bt.appendChild(el('button', { type: 'button', class: 'btn btn-sm ' + (b.cls || 'btn-ghost'), text: b.label, onclick: function () { close(b.value); } })); });
      document.addEventListener('keydown', key, true);
      $('dlg').hidden = false; var last = bt.lastChild; var inp = body.querySelector('input'); (inp || last).focus();
    });
  }
  async function fail(e) { busy(false); if (e instanceof AuthError) return; console.error(e); await dialog(el('div', {}, [el('h3', { text: 'That did not work' }), el('p', { text: e.message || String(e) }), el('p', { class: 'muted', text: 'Nothing was half-published: an update only goes live when every part of it is saved.' })]), [{ label: 'OK', value: 1, cls: 'btn-red' }]); }
  function liveLink(slug) { return CONFIG.SITE + '/cars/' + slug + '/'; }
  async function doneDialog(title, slug) {
    busy(false);
    var box = el('div', {}, [el('h3', { text: title }), el('p', { class: 'muted', text: 'It appears on the website in about a minute.' })]);
    if (slug) box.appendChild(el('p', {}, [el('a', { href: liveLink(slug), target: '_blank', rel: 'noopener', class: 'btn btn-red btn-sm', text: 'Open ' + liveLink(slug).replace('https://', '') })]));
    await dialog(box, [{ label: 'OK', value: 1 }]);
  }

  /* ---------------- site data ---------------- */
  var site = { cards: [], D: null };
  async function loadSite() {
    var cars = (await api('GET', R() + '/contents/cars.html?ref=' + CONFIG.BRANCH, null, { raw: true })).data;
    site.cards = G.readGrid(cars, G.CARS_MARK).filter(function (c) { return !c.fixed; });
    var colours = {}; Object.keys(KNOWN.colours).forEach(function (k) { colours[KNOWN.colours[k]] = k; });
    var re = /data-i18n="(c_[^"]+)">([^<]+)</g, m; while ((m = re.exec(cars))) colours[G.unesc(m[2])] = m[1];
    site.colours = colours;
    var makes = {}; site.cards.forEach(function (c) { makes[c.make] = 1; }); G.KNOWN_MAKES.forEach(function (k) { makes[k] = 1; });
    $('makeList').innerHTML = ''; Object.keys(makes).sort().forEach(function (k) { $('makeList').appendChild(el('option', { value: k })); });
    $('colourList').innerHTML = ''; Object.keys(colours).sort().forEach(function (k) { $('colourList').appendChild(el('option', { value: k })); });
    site.D = null; await loadD();
    renderManage();
  }

  /* ---------------- form ---------------- */
  var photos = []; // {id, blob|null, url, caption, sha|null, file|null(remote name), w,h}
  var editing = null; // {slug, car, card, files:[{name,sha}]}
  var pid = 0;
  BODY_TYPES.forEach(function (b) { $('fBody').appendChild(el('label', {}, [el('input', { type: 'checkbox', value: b }), b])); });
  function bodyVal() { return [].slice.call($('fBody').querySelectorAll('input:checked')).map(function (i) { return i.value; }).join(' '); }
  function setBody(v) { var parts = (v || '').split(/\s+/); [].slice.call($('fBody').querySelectorAll('input')).forEach(function (i) { i.checked = parts.indexOf(i.value) >= 0; }); }
  function canonFeature(f) { var k = G.fkey(f); return KNOWN.features[k] || f; }
  function autoSlug() {
    if (editing || $('fSlug').dataset.touched) return;
    var ref = $('fRef').value.replace(/^#/, '').trim(), yr = $('fYear').value.trim();
    $('fSlug').value = G.slugUrl([$('fMake').value, $('fModel').value, ref || yr].join(' '));
  }
  ['fMake', 'fModel', 'fRef', 'fYear'].forEach(function (id) { $(id).addEventListener('input', autoSlug); });
  $('fSlug').addEventListener('input', function () { $('fSlug').dataset.touched = 1; });
  $('fPoa').addEventListener('change', function () { $('fPrice').disabled = $('fPoa').checked; });
  $('fPrice').addEventListener('blur', function () { var n = G.parsePrice('RM' + $('fPrice').value); if (n) $('fPrice').value = n.toLocaleString('en-US'); });
  $('fMileage').addEventListener('blur', function () { var v = $('fMileage').value.trim(); if (/^[0-9][0-9,.]*\+?$/.test(v)) $('fMileage').value = parseInt(v.replace(/[,.+]/g, ''), 10).toLocaleString('en-US') + (/\+$/.test(v) ? '+' : ''); });

  $('fillBtn').addEventListener('click', function () {
    var p = G.parseWhatsApp($('paste').value), set = [];
    function put(id, v) { if (v !== undefined && v !== null && v !== '') { $(id).value = v; set.push(id); } }
    put('fRef', p.ref); put('fMake', p.make); put('fModel', p.model); put('fYear', p.year); put('fMileage', p.mileage); if (p.unit) $('fUnit').value = p.unit;
    put('fGrade', p.grade); put('fColour', p.colour);
    if (p.poa) { $('fPoa').checked = true; $('fPrice').disabled = true; } else if (p.price) { $('fPoa').checked = false; $('fPrice').disabled = false; put('fPrice', p.price.toLocaleString('en-US')); }
    if (p.feats.length) $('fFeats').value = p.feats.map(canonFeature).join('\n');
    autoSlug();
    var miss = []; if (!p.colour) miss.push('exterior colour'); if (!p.price && !p.poa) miss.push('price');
    msg('fillMsg', 'Filled ' + (set.length + (p.feats.length ? 1 : 0)) + ' fields' + (p.feats.length ? ' and ' + p.feats.length + ' features' : '') + '.' + (miss.length ? ' Please add: ' + miss.join(', ') + '.' : '') + (p.unused.length ? ' Not used: "' + p.unused.join('", "') + '"' : ''), !miss.length);
  });

  function readForm() {
    var errs = [], ref = $('fRef').value.replace(/^#/, '').trim(), make = $('fMake').value.trim().replace(/\s+/g, ' '), model = $('fModel').value.trim().replace(/\s+/g, ' ');
    var year = parseInt($('fYear').value, 10), mileage = $('fMileage').value.trim(), colour = $('fColour').value.trim(), grade = $('fGrade').value.trim();
    var poa = $('fPoa').checked, price = poa ? null : G.parsePrice('RM' + $('fPrice').value), slug = G.slugUrl($('fSlug').value);
    var sold = !!(editing && editing.car.sold);
    if (!make) errs.push('make'); if (!model) errs.push('model'); if (!(year >= 1900 && year <= new Date().getFullYear() + 1)) errs.push('year');
    if (!mileage) errs.push('mileage'); if (!colour) errs.push('exterior colour'); if (!poa && !price && !sold) errs.push('asking price (or tick Enquire for price)');
    if (!slug) errs.push('web address'); if (!photos.length) errs.push('at least one photo');
    if (ref && !/^[A-Za-z0-9-]+$/.test(ref)) errs.push('stock number (letters and numbers only)');
    var featText = $('fFeats').value, fgroups = null, feats;
    if (/^\s*##\s+/m.test(featText)) { // optional "## Group" headings (used by the Rolls-Royce page)
      fgroups = []; featText.split('\n').forEach(function (l) { var h = /^\s*##\s+(.+)$/.exec(l); if (h) { var gk = (editing && editing.car.fgroups || []).filter(function (g) { return g[1] === h[1].trim(); })[0]; fgroups.push([gk ? gk[0] : 'fg_' + G.slugKey(h[1]), h[1].trim(), []]); } else if (fgroups.length) G.parseFeatures(l).forEach(function (f) { fgroups[fgroups.length - 1][2].push(f); }); });
      feats = [].concat.apply([], fgroups.map(function (g) { return g[2]; }));
    } else feats = G.parseFeatures(featText).map(canonFeature);
    var hit = Object.keys(site.colours).filter(function (k) { return k.toLowerCase() === colour.toLowerCase(); })[0];
    var colourPair = hit ? [site.colours[hit], hit] : [freeColourKey(colour), colour];
    var base = editing ? editing.car : {};
    var c = {
      slug: editing ? editing.slug : slug, make: make, model: model, name: make + ' ' + model, ref: ref || null, year: year, mileage: mileage, unit: $('fUnit').value,
      colour: colourPair,
      price: price, sold: sold, grade: grade || null, extra: base.extra || [], feats: feats, fgroups: fgroups, notes: $('fNotes').value.trim(),
      photos: photos.map(function (p) { return p.caption.trim() || 'Photo'; }),
      body: bodyVal(), fmake: MAKE_FILTER[make] || (editing && editing.card ? editing.card.make : undefined)
    };
    if (sold && !price && base.price) c.price = base.price;
    if (c.fmake === c.make) c.fmake = undefined;
    // keep the original name when editing if make/model are unchanged (e.g. "Mercedes-AMG G63 Manufaktur")
    if (editing && base.make === make && base.model === model) c.name = base.name;
    return { car: c, errs: errs };
  }

  function freeColourKey(en) { // new colour key that does not clash with an existing one (e.g. c_red is "Tartan Red")
    var taken = {}; Object.keys(site.colours).forEach(function (k) { taken[site.colours[k]] = 1; }); if (site.D) Object.keys(site.D.ms).forEach(function (k) { taken[k] = 1; });
    var base = 'c_' + G.slugKey(en), k = base, n = 2; while (taken[k]) k = base + '_' + (n++); return k;
  }
  function fillForm(c, card) {
    $('fRef').value = c.ref || ''; $('fMake').value = c.make; $('fModel').value = c.model; $('fYear').value = c.year; $('fMileage').value = c.mileage; $('fUnit').value = c.unit;
    $('fColour').value = c.colour[1]; $('fGrade').value = c.grade || ''; $('fPoa').checked = !c.sold && c.price === null; $('fPrice').disabled = $('fPoa').checked;
    $('fPrice').value = c.price ? c.price.toLocaleString('en-US') : '';
    $('fFeats').value = c.fgroups ? c.fgroups.map(function (g) { return '## ' + g[1] + '\n' + g[2].join('\n'); }).join('\n') : c.feats.join('\n');
    $('fNotes').value = c.notes || ''; $('fSlug').value = c.slug; setBody(card ? card.body : '');
    $('soldNote').hidden = !c.sold;
  }
  function resetForm() {
    editing = null; $('carForm').reset(); $('paste').value = ''; delete $('fSlug').dataset.touched; $('fSlug').disabled = false; $('fPrice').disabled = false;
    photos.forEach(function (p) { if (p.blob) URL.revokeObjectURL(p.url); }); photos = []; renderPhotos();
    $('editBanner').hidden = true; $('pasteCard').hidden = false; $('soldNote').hidden = true; $('publishBtn').textContent = 'Publish'; msg('formMsg', ''); msg('fillMsg', '');
  }
  $('cancelEdit').addEventListener('click', resetForm);

  /* ---------------- photos ---------------- */
  function loadImage(src) { return new Promise(function (res, rej) { var i = new Image(); i.decoding = 'async'; i.onload = function () { res(i); }; i.onerror = function () { rej(new Error('This photo could not be opened.')); }; i.src = src; }); }
  function toBlob(cv, q) { return new Promise(function (res) { cv.toBlob(res, 'image/jpeg', q); }); }
  async function resizeToJpeg(src) {
    var img = await loadImage(src), w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, MAX_PX / Math.max(w, h));
    var cv = document.createElement('canvas'); cv.width = Math.round(w * s); cv.height = Math.round(h * s);
    var cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, 0, 0, cv.width, cv.height);
    var b = await toBlob(cv, JPEG_Q); cv.width = cv.height = 0; return b;
  }
  async function shareJpeg(blob) { // 1200x630 centre crop, same as the existing share.jpg files
    var url = URL.createObjectURL(blob), img = await loadImage(url); URL.revokeObjectURL(url);
    var W = 1200, H = 630, s = Math.max(W / img.naturalWidth, H / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); return toBlob(cv, JPEG_Q);
  }
  /* JPEG metadata check: 0 = JPEG without any EXIF block, 100+n = EXIF present (n = orientation, 0 if unset), -1 = not a JPEG */
  async function jpegOrientation(file) {
    try {
      var v = new DataView(await file.slice(0, 131072).arrayBuffer());
      if (v.getUint16(0) !== 0xFFD8) return -1; // not a JPEG
      var o = 2;
      while (o + 4 < v.byteLength) {
        var mk = v.getUint16(o), len = v.getUint16(o + 2);
        if (mk === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) {
          var t = o + 10, le = v.getUint16(t) === 0x4949, ifd = t + v.getUint32(t + 4, le), n = v.getUint16(ifd, le);
          for (var i = 0; i < n; i++) { var e = ifd + 2 + i * 12; if (v.getUint16(e, le) === 0x0112) return 100 + v.getUint16(e + 8, le); }
          return 100;
        }
        if ((mk & 0xFF00) !== 0xFF00 || mk === 0xFFDA) break; o += 2 + len;
      }
      return 0;
    } catch (e) { return -1; }
  }
  function isHeic(f) { return /hei[cf]/i.test(f.type) || /\.(heic|heif)$/i.test(f.name || ''); }
  function isImageFile(f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i.test(f.name || ''); }
  // HEIC decoding happens in a sandboxed frame (admin/heic.html): the decoder needs eval, which this page's CSP forbids.
  var heicFrame = null, heicReady = null, heicJobs = {}, heicId = 0;
  window.addEventListener('message', function (e) {
    if (!heicFrame || e.source !== heicFrame.contentWindow) return;
    var d = e.data || {};
    if (d.type === 'heic-ready' && heicReady) heicReady.resolve();
    if (d.type === 'heic-done' && heicJobs[d.id]) { var j = heicJobs[d.id]; delete heicJobs[d.id]; d.error ? j.rej(new Error(d.error)) : j.res(new Blob([d.buf], { type: 'image/jpeg' })); }
  });
  function heicToJpeg(file) {
    if (!heicFrame) {
      var r = {}; heicReady = r; r.p = new Promise(function (res) { r.resolve = res; });
      heicFrame = el('iframe', { sandbox: 'allow-scripts', src: 'heic.html', title: 'HEIC converter', style: 'display:none' }); document.body.appendChild(heicFrame);
    }
    return Promise.race([heicReady.p, sleep(20000).then(function () { throw new Error('The HEIC converter did not start.'); })]).then(function () {
      return file.arrayBuffer().then(function (buf) {
        return new Promise(function (res, rej) { var id = ++heicId; heicJobs[id] = { res: res, rej: rej }; heicFrame.contentWindow.postMessage({ type: 'heic', id: id, buf: buf }, '*', [buf]); setTimeout(function () { if (heicJobs[id]) { delete heicJobs[id]; rej(new Error('timeout')); } }, 90000); });
      });
    });
  }
  /* One photo -> JPEG blob for the site. WhatsApp JPEGs that are already ≤1600px and upright are kept byte-for-byte
     (no second compression, never upscaled); everything else is resized to 1600px on the long side at 85% JPEG. */
  async function prepare(file) {
    var src = URL.createObjectURL(file), img = null;
    try {
      try { img = await loadImage(src); } catch (e) { img = null; }
      if (!img && isHeic(file)) { // Chrome/Edge on Windows and Android cannot open HEIC; convert it here
        var conv;
        try { conv = await heicToJpeg(file); } catch (e) { throw new Error('This HEIC photo could not be converted here. Save it as JPEG first (on iPhone/iPad: Settings › Camera › Formats › Most Compatible, or share it through WhatsApp), then add it again.'); }
        URL.revokeObjectURL(src); src = URL.createObjectURL(conv); img = await loadImage(src);
        return await resizeImg(img);
      }
      if (!img) throw new Error('This file is not a photo this browser can open.');
      var ori = await jpegOrientation(file);
      // keep the original bytes only for a plain JPEG with no EXIF at all (no rotation needed, no GPS/camera data to leak)
      if (ori === 0 && Math.max(img.naturalWidth, img.naturalHeight) <= MAX_PX && file.size < 4e6) return file.slice(0, file.size, 'image/jpeg');
      return await resizeImg(img);
    } finally { URL.revokeObjectURL(src); }
  }
  async function resizeImg(img) {
    var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, MAX_PX / Math.max(w, h)); // browsers apply EXIF orientation when drawing
    var cv = document.createElement('canvas'); cv.width = Math.round(w * s); cv.height = Math.round(h * s);
    var cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, 0, 0, cv.width, cv.height);
    var b = await toBlob(cv, JPEG_Q); cv.width = cv.height = 0; return b;
  }
  var adding = Promise.resolve();
  function addFiles(list) {
    var files = [].slice.call(list || []).filter(isImageFile), skipped = (list ? list.length : 0) - files.length;
    if (!files.length) { msg('photoMsg', skipped ? 'Those files are not photos.' : ''); return adding; }
    adding = adding.then(async function () {
      var bad = [];
      for (var i = 0; i < files.length; i++) {
        msg('photoMsg', 'Preparing photo ' + (i + 1) + ' of ' + files.length + '…', true);
        try { var b = await prepare(files[i]); photos.push({ id: ++pid, blob: b, url: URL.createObjectURL(b), caption: '', sha: null }); renderPhotos(); }
        catch (err) { bad.push((files[i].name || 'photo') + ': ' + err.message); }
      }
      msg('photoMsg', photos.length + ' photo' + (photos.length === 1 ? '' : 's') + ' ready.' + (skipped ? ' ' + skipped + ' non-photo file(s) skipped.' : '') + (bad.length ? ' Not added: ' + bad.join(' | ') : ''), !bad.length);
    });
    return adding;
  }
  $('fFiles').addEventListener('change', function (e) { var f = [].slice.call(e.target.files || []); e.target.value = ''; addFiles(f); });
  $('fDir').addEventListener('change', function (e) { var f = [].slice.call(e.target.files || []).sort(function (a, b) { return (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, { numeric: true }); }); e.target.value = ''; addFiles(f); });
  // drop zone: files or whole folders (Chrome/Edge/Safari desktop)
  function readEntry(entry) {
    return new Promise(function (res) {
      if (entry.isFile) return entry.file(function (f) { res([f]); }, function () { res([]); });
      if (!entry.isDirectory) return res([]);
      var rd = entry.createReader(), all = [];
      (function more() { rd.readEntries(async function (ents) { if (!ents.length) { var out = []; for (var i = 0; i < all.length; i++) out = out.concat(await readEntry(all[i])); res(out); } else { all = all.concat(ents); more(); } }, function () { res([]); }); })();
    });
  }
  (function () {
    var dz = $('drop');
    dz.addEventListener('click', function (e) { if (!e.target.closest('label')) $('fFiles').click(); });
    dz.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fFiles').click(); } });
    ['dragenter', 'dragover'].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; dz.classList.add('over'); }); });
    ['dragleave', 'dragend'].forEach(function (t) { dz.addEventListener(t, function () { dz.classList.remove('over'); }); });
    dz.addEventListener('drop', async function (e) {
      e.preventDefault(); dz.classList.remove('over');
      var items = [].slice.call(e.dataTransfer.items || []), files = [];
      var entries = items.map(function (it) { return it.webkitGetAsEntry && it.webkitGetAsEntry(); }).filter(Boolean);
      if (entries.length) { for (var i = 0; i < entries.length; i++) files = files.concat(await readEntry(entries[i])); if (entries.some(function (x) { return x.isDirectory; })) files.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); }); }
      else files = [].slice.call(e.dataTransfer.files || []);
      addFiles(files);
    });
    // stop a photo dropped next to the zone from opening in the tab
    window.addEventListener('dragover', function (e) { e.preventDefault(); }); window.addEventListener('drop', function (e) { if (!e.target.closest('#drop')) e.preventDefault(); });
  })();
  var CAPS = Object.keys(KNOWN.captions).map(function (k) { return KNOWN.captions[k]; }).sort();
  function move(i, j) { if (j < 0 || j >= photos.length) return; var x = photos.splice(i, 1)[0]; photos.splice(j, 0, x); renderPhotos(); }
  function renderPhotos() {
    var ol = $('photos'); ol.innerHTML = '';
    photos.forEach(function (p, i) {
      var sel = el('select', { 'aria-label': 'Caption' }); sel.appendChild(el('option', { value: '', text: 'Caption…' }));
      CAPS.forEach(function (c) { sel.appendChild(el('option', { value: c, text: c })); }); sel.appendChild(el('option', { value: '__other', text: 'Other (type below)…' }));
      var txt = el('input', { placeholder: 'Caption, e.g. Front', value: p.caption });
      if (CAPS.indexOf(p.caption) >= 0) { sel.value = p.caption; txt.hidden = true; } else if (p.caption) sel.value = '__other';
      sel.addEventListener('change', function () { if (sel.value === '__other') { txt.hidden = false; txt.value = ''; p.caption = ''; txt.focus(); } else { txt.hidden = !!sel.value; p.caption = sel.value; } });
      txt.addEventListener('input', function () { p.caption = txt.value; });
      var li = el('li', { class: i === 0 ? 'main' : '', 'data-i': i }, [
        el('div', { class: 'im' }, [el('img', { src: p.url, alt: 'Photo ' + (i + 1) }), el('span', { class: 'no' + (i === 0 ? ' m' : ''), text: i === 0 ? '★ Main photo' : String(i + 1) }), el('span', { class: 'hd', text: '⠿', title: 'Drag to reorder', 'data-h': i })]),
        sel, txt,
        el('div', { class: 'bt' }, [
          el('button', { type: 'button', text: '↑', title: 'Move up', 'aria-label': 'Move up', onclick: function () { move(i, i - 1); } }),
          el('button', { type: 'button', text: '↓', title: 'Move down', 'aria-label': 'Move down', onclick: function () { move(i, i + 1); } }),
          i ? el('button', { type: 'button', class: 'mn', text: '★ Main', title: 'Make this the main photo', onclick: function () { move(i, 0); } }) : null,
          el('button', { type: 'button', class: 'bl', text: 'Blur', onclick: function () { openBlur(p); } }),
          el('button', { type: 'button', class: 'x', text: '✕', title: 'Remove', 'aria-label': 'Remove photo', onclick: function () { photos.splice(i, 1); if (p.blob) URL.revokeObjectURL(p.url); renderPhotos(); } })])
      ]);
      li.tabIndex = 0; li.setAttribute('aria-label', 'Photo ' + (i + 1) + (i === 0 ? ', main photo' : '') + '. Alt+Up or Alt+Down to move.');
      li.addEventListener('keydown', function (e) { if (e.target !== li) return; if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1); focusPhoto(i - 1); } if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1); focusPhoto(i + 1); } if (e.key === 'Delete') { photos.splice(i, 1); renderPhotos(); focusPhoto(Math.min(i, photos.length - 1)); } });
      ol.appendChild(li);
    });
  }
  function focusPhoto(i) { var c = $('photos').children[Math.max(0, i)]; if (c) c.focus(); }
  // touch/mouse drag reordering (works in iPad Safari, which has no reliable HTML5 drag-and-drop for lists)
  (function () {
    var from = null, over = null;
    $('photos').addEventListener('pointerdown', function (e) { var h = e.target.closest('.hd'); if (!h) return; e.preventDefault(); from = +h.getAttribute('data-h'); h.setPointerCapture(e.pointerId); $('photos').children[from].classList.add('drag'); });
    $('photos').addEventListener('pointermove', function (e) {
      if (from === null) return; var t = document.elementFromPoint(e.clientX, e.clientY), li = t && t.closest('.adm-photos li');
      [].forEach.call($('photos').children, function (c) { c.classList.remove('over'); }); over = li ? +li.getAttribute('data-i') : null; if (li) li.classList.add('over');
      if (e.clientY < 60) scrollBy(0, -12); else if (e.clientY > innerHeight - 60) scrollBy(0, 12);
    });
    function end() { if (from === null) return; var f = from; from = null; if (over !== null && over !== f) move(f, over); else renderPhotos(); over = null; }
    $('photos').addEventListener('pointerup', end); $('photos').addEventListener('pointercancel', end);
  })();

  /* ---------------- blur tool ---------------- */
  var blurState = null;
  async function openBlur(p) {
    try {
      var src = p.url;
      if (!p.blob) { busy('Opening photo…', 30, ''); var b64s = (await api('GET', R() + '/git/blobs/' + p.sha)).data.content.replace(/\n/g, ''); busy(false); var bin = atob(b64s), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); src = URL.createObjectURL(new Blob([arr], { type: 'image/jpeg' })); }
      var img = await loadImage(src), cv = $('blurCv');
      cv.width = img.naturalWidth; cv.height = img.naturalHeight; cv.getContext('2d').drawImage(img, 0, 0);
      blurState = { p: p, img: img, rects: [], src: src }; $('blurDlg').hidden = false; drawBlur();
    } catch (e) { fail(e); }
  }
  function drawBlur(cur) {
    var cv = $('blurCv'), cx = cv.getContext('2d'); cx.drawImage(blurState.img, 0, 0);
    var lw = Math.max(3, cv.width / 300);
    blurState.rects.concat(cur ? [cur] : []).forEach(function (r) { pixelate(cx, r); cx.lineWidth = lw; cx.strokeStyle = '#e0252f'; cx.setLineDash([lw * 3, lw * 2]); cx.strokeRect(r.x, r.y, r.w, r.h); });
  }
  function norm(r) { return { x: Math.round(Math.min(r.x, r.x + r.w)), y: Math.round(Math.min(r.y, r.y + r.h)), w: Math.round(Math.abs(r.w)), h: Math.round(Math.abs(r.h)) }; }
  function pixelate(cx, r) { // strong blur without ctx.filter (not available in every Safari): shrink hard, then smooth back up, twice
    r = norm(r); if (r.w < 4 || r.h < 4) return;
    var t = document.createElement('canvas'), f = Math.max(2, Math.round(Math.max(r.w, r.h) / 14));
    t.width = Math.max(1, Math.round(r.w / f)); t.height = Math.max(1, Math.round(r.h / f));
    var tx = t.getContext('2d'); tx.imageSmoothingEnabled = true; tx.drawImage(cx.canvas, r.x, r.y, r.w, r.h, 0, 0, t.width, t.height);
    var u = document.createElement('canvas'); u.width = Math.max(1, Math.round(t.width * 3)); u.height = Math.max(1, Math.round(t.height * 3));
    var ux = u.getContext('2d'); ux.imageSmoothingEnabled = true; ux.drawImage(t, 0, 0, u.width, u.height);
    cx.save(); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(u, 0, 0, u.width, u.height, r.x, r.y, r.w, r.h); cx.restore();
  }
  (function () {
    var cv = $('blurCv'), start = null, touches = {};
    function pt(e) { var b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) * cv.width / b.width, y: (e.clientY - b.top) * cv.height / b.height }; }
    // one finger (or the mouse) draws a box; a second finger cancels the box so pinching never leaves a stray blur
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); touches[e.pointerId] = 1; if (Object.keys(touches).length > 1) { start = null; drawBlur(); return; } try { cv.setPointerCapture(e.pointerId); } catch (x) {} start = pt(e); });
    cv.addEventListener('pointermove', function (e) { if (!start || Object.keys(touches).length > 1) return; var q = pt(e); drawBlur({ x: start.x, y: start.y, w: q.x - start.x, h: q.y - start.y }); });
    function up(e) { var multi = Object.keys(touches).length > 1; delete touches[e.pointerId]; if (!start || multi) { start = null; return; } var q = pt(e), r = norm({ x: start.x, y: start.y, w: q.x - start.x, h: q.y - start.y }); start = null; if (r.w > 6 && r.h > 6) blurState.rects.push(r); drawBlur(); }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', function (e) { delete touches[e.pointerId]; start = null; drawBlur(); });
    ['touchstart', 'touchmove', 'gesturestart'].forEach(function (t) { cv.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false }); });
    document.addEventListener('keydown', function (e) { if ($('blurDlg').hidden) return; if (e.key === 'Escape') $('blurCancel').click(); if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); $('blurUndo').click(); } });
    $('blurUndo').addEventListener('click', function () { blurState.rects.pop(); drawBlur(); });
    $('blurCancel').addEventListener('click', function () { $('blurDlg').hidden = true; if (blurState.src !== blurState.p.url) URL.revokeObjectURL(blurState.src); blurState = null; });
    $('blurApply').addEventListener('click', async function () {
      var s = blurState; if (!s.rects.length) { $('blurDlg').hidden = true; return; }
      var c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; var x2 = c2.getContext('2d'); x2.drawImage(s.img, 0, 0);
      s.rects.forEach(function (r) { pixelate(x2, r); pixelate(x2, r); }); window.__lastBlurCount = s.rects.length;
      var b = await toBlob(c2, JPEG_Q); if (s.p.blob) URL.revokeObjectURL(s.p.url); if (s.src !== s.p.url) URL.revokeObjectURL(s.src);
      s.p.blob = b; s.p.sha = null; s.p.url = URL.createObjectURL(b); s.p.blurred = true; $('blurDlg').hidden = true; blurState = null; renderPhotos();
    });
  })();

  /* ---------------- preview ---------------- */
  function blobToDataURL(b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); }); }
  $('previewBtn').addEventListener('click', async function () {
    var f = readForm(); if (!f.car.slug) f.car.slug = 'preview';
    if (!f.car.photos.length) { msg('formMsg', 'Add at least one photo to preview.'); return; }
    var c = f.car; c.price = c.price || (c.sold ? null : c.price);
    var html = G.carPage(Object.assign({}, c, { make: c.make || 'Make', model: c.model || 'Model', name: c.name.trim() || 'New car', year: c.year || '', colour: c.colour[1] ? c.colour : ['c_x', '—'] }));
    var dir = '../../assets/img/cars/' + c.slug + '/';
    for (var i = 0; i < photos.length; i++) {
      var n = (i < 9 ? '0' : '') + (i + 1) + '.jpg', src = photos[i].blob ? await blobToDataURL(photos[i].blob) : location.origin + '/assets/img/cars/' + c.slug + '/' + photos[i].file;
      html = html.split(dir + n).join(src);
    }
    html = html.split('../../').join('').replace(/<script data-goatcounter[^>]*><\/script>/, '')
      .replace('<head>', '<head><base href="' + location.origin + '/"><script src="admin/preview-shim.js"></script>');
    $('pvFrame').srcdoc = html; $('pvDlg').hidden = false;
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('pvDlg').hidden) $('pvClose').click(); });
  $('pvClose').addEventListener('click', function () { $('pvDlg').hidden = true; $('pvFrame').srcdoc = ''; });

  /* ---------------- publish ---------------- */
  function pad(i) { return (i < 9 ? '0' : '') + (i + 1) + '.jpg'; }
  async function i18nUpdate(ctx, c, tr) {
    var js = await ctx.read('assets/js/i18n.js'), I = G.readI18n(js), D = I.D;
    var keys = G.carKeys(c), t = Object.assign({}, BUILTIN_TR, tr || {});
    var added = G.addKeys(D, keys, t), out = I.write(D);
    return { js: out === js ? null : out, added: added };
  }
  function newKeys(c) { if (!site.D) return []; var keys = G.carKeys(c); return Object.keys(keys).filter(function (k) { return !(k in site.D.ms) && !BUILTIN_TR[k]; }).map(function (k) { return [k, keys[k]]; }); }
  async function loadD() { if (!site.D) site.D = G.readI18n((await api('GET', R() + '/contents/assets/js/i18n.js?ref=' + CONFIG.BRANCH, null, { raw: true })).data).D; }
  async function translationsDialog(c, title, lead) {
    await loadD(); var nk = newKeys(c), tr = {};
    var box = el('div', {}, [el('h3', { text: title }), el('p', { class: 'muted', text: lead })]);
    if (nk.length) {
      box.appendChild(el('p', { text: nk.length + ' new word' + (nk.length > 1 ? 's' : '') + ' without Malay / Chinese / Tamil translation. Optional: type them below, or leave blank to show English.' }));
      var tb = el('table'); tb.appendChild(el('tr', {}, [el('td', { text: 'English' }), el('td', { text: 'BM' }), el('td', { text: '中文' }), el('td', { text: 'தமிழ்' })]));
      nk.forEach(function (x) { tr[x[0]] = {}; var row = el('tr', {}, [el('td', { text: x[1] })]); ['ms', 'zh', 'ta'].forEach(function (l) { var i = el('input', { 'aria-label': l }); i.addEventListener('input', function () { tr[x[0]][l] = i.value.trim(); }); row.appendChild(el('td', {}, [i])); }); tb.appendChild(row); });
      box.appendChild(tb);
    }
    var ok = await dialog(box, [{ label: 'Cancel', value: false }, { label: 'Publish now', value: true, cls: 'btn-red' }]);
    return ok ? tr : null;
  }
  function pageFiles(ctx, c, plan) { // plan.photos: [{blob}|{sha}] in final order ; plan.oldFiles: [{name,sha}]
    var files = {}, d = 'assets/img/cars/' + c.slug + '/';
    plan.photos.forEach(function (p, i) { files[d + pad(i)] = p.blob ? p.blob : { sha: p.sha }; });
    (plan.oldFiles || []).forEach(function (f) { if (/^\d\d+\.jpg$/.test(f.name) && !(d + f.name in files)) files[d + f.name] = null; });
    if (plan.share) files[d + 'share.jpg'] = plan.share;
    files['cars/' + c.slug + '/index.html'] = G.carPage(c);
    return files;
  }
  async function gridFiles(ctx, files, opts) {
    var cars = await ctx.read('cars.html'), home = await ctx.read('index.html');
    var nc = G.updateMakeFilter(G.rebuildGrid(cars, G.CARS_MARK, opts));
    var nh = G.rebuildGrid(home, G.homeMark(home), opts);
    if (nc !== cars) files['cars.html'] = nc; if (nh !== home) files['index.html'] = nh;
  }
  function existing(slug, ref) {
    return site.cards.filter(function (c) { return c.slug === slug || (ref && c.ref && c.ref.toLowerCase() === String(ref).toLowerCase()); })[0];
  }
  $('publishBtn').addEventListener('click', async function () {
    var f = readForm();
    if (f.errs.length) { msg('formMsg', 'Please fill in: ' + f.errs.join(', ') + '.'); return; }
    msg('formMsg', '');
    var c = f.car;
    try {
      if (!editing) {
        var dup = existing(c.slug, c.ref);
        if (!dup) { var probe = await api('GET', R() + '/contents/cars/' + c.slug + '/index.html?ref=' + CONFIG.BRANCH, null, { allow: [404] }); if (probe.status !== 404) dup = { slug: c.slug, name: c.name }; }
        if (dup) {
          var ch = await dialog(el('div', {}, [el('h3', { text: 'This car is already on the site' }), el('p', { text: (dup.name || dup.slug) + (dup.ref ? ' #' + dup.ref : '') + ' already has a page (lhcars.my/cars/' + dup.slug + '/).' }), el('p', { class: 'muted', text: 'Update it instead? Your new details replace the old ones, and your new photos are added after its current photos. You can check everything before publishing.' })]),
            [{ label: 'Cancel', value: 0 }, { label: 'Update that car', value: 1, cls: 'btn-red' }]);
          if (ch) await startEdit(dup.slug, { keepForm: true });
          return;
        }
      }
      var tr = await translationsDialog(c, editing ? 'Save changes?' : 'Publish this car?', c.name + (c.ref ? ' #' + c.ref : '') + ' with ' + photos.length + ' photo' + (photos.length > 1 ? 's' : '') + '.');
      if (!tr) return;
      var isNew = !editing, ed = editing;
      var mainChanged = isNew || !photos[0].sha || photos[0].file !== '01.jpg' || photos[0].blurred;
      var share = mainChanged ? await shareJpeg(photos[0].blob || await remoteBlob(photos[0].sha)) : null;
      var snapshot = photos.slice();
      await commit(async function (ctx) {
        var oldFiles = isNew ? [] : await ctx.list('assets/img/cars/' + c.slug);
        if (!isNew) { // refresh shas of remote photos from the current head
          var byName = {}; oldFiles.forEach(function (x) { byName[x.name] = x.sha; });
          snapshot.forEach(function (p) { if (!p.blob && p.file) p.sha = byName[p.file] || p.sha; });
        } else if ((await ctx.read('cars/' + c.slug + '/index.html')) !== null) throw new Error('A page with this web address was just created. Refresh and try again.');
        var files = pageFiles(ctx, c, { photos: snapshot, oldFiles: oldFiles, share: share });
        await gridFiles(ctx, files, { upsert: { slug: c.slug, card: G.carCard(c, 1), position: isNew ? 'first' : 'keep' } });
        var i = await i18nUpdate(ctx, c, tr); if (i.js) files['assets/js/i18n.js'] = i.js;
        var label = c.name + (c.ref ? ' #' + c.ref : '') + ' (' + c.year + ')';
        return { message: (isNew ? 'Add ' + label + ' listing: ' + c.mileage + ' ' + (c.unit === 'mi' ? 'miles' : 'km') + ', ' + (c.price && !c.sold ? 'asking price ' + G.money(c.price) : c.sold ? 'SOLD' : 'enquire for price') : 'Update ' + label + ' details and photos') + ' (via admin page)', files: files };
      });
      site.D = null; resetForm(); await loadSite();
      await doneDialog(isNew ? 'Published!' : 'Saved!', c.slug);
    } catch (e) { fail(e); }
  });
  async function remoteBlob(sha) { var s = (await api('GET', R() + '/git/blobs/' + sha)).data.content.replace(/\n/g, ''), bin = atob(s), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: 'image/jpeg' }); }

  /* ---------------- manage ---------------- */
  function cardLabel(c) { return c.name + (c.ref ? ' #' + c.ref : ''); }
  function renderManage() {
    var q = ($('mSearch').value || '').toLowerCase(), ul = $('mList'); ul.innerHTML = '';
    site.cards.filter(function (c) { return !q || (cardLabel(c) + ' ' + c.year + ' ' + c.slug).toLowerCase().indexOf(q) >= 0; }).forEach(function (c) {
      var info = el('div', {}, [c.sold ? el('span', { class: 'tag', 'data-i18n': 'tag_sold', text: 'SOLD' }) : null, el('h3', { text: cardLabel(c) }),
        el('div', { class: 'muted', text: c.year + ' · ' + (c.sold ? 'Sold' : c.price ? G.money(+c.price) : 'Enquire for price') + ' · lhcars.my/cars/' + c.slug + '/' }),
        el('div', { class: 'bt' }, [
          c.sold ? el('button', { type: 'button', class: 'btn btn-ghost', text: 'Unmark SOLD', onclick: function () { unmarkSold(c); } }) : el('button', { type: 'button', class: 'btn btn-red', text: 'Mark as SOLD', onclick: function () { markSold(c); } }),
          el('button', { type: 'button', class: 'btn btn-ghost', text: 'Edit details', onclick: function () { startEdit(c.slug); } }),
          el('button', { type: 'button', class: 'btn btn-ghost', text: 'Add photos', onclick: function () { startEdit(c.slug, { addPhotos: true }); } }),
          el('a', { class: 'btn btn-ghost', href: liveLink(c.slug), target: '_blank', rel: 'noopener', text: 'View' }),
          el('button', { type: 'button', class: 'btn btn-del', text: 'Delete', onclick: function () { del(c); } })])]);
      ul.appendChild(el('li', {}, [el('img', { src: '../assets/img/cars/' + c.slug + '/01.jpg', alt: '', loading: 'lazy' }), info]));
    });
  }
  $('mSearch').addEventListener('input', renderManage);
  $('mReload').addEventListener('click', function () { loadSite().catch(fail); });
  async function readCar(ctx, slug) {
    var html = await ctx.read('cars/' + slug + '/index.html'); if (!html) throw new Error('The page for ' + slug + ' was not found.');
    var cars = await ctx.read('cars.html'), card = G.readGrid(cars, G.CARS_MARK).filter(function (x) { return x.slug === slug; })[0];
    var c = G.parseCarPage(html, slug); if (card) { c.body = card.body; if (card.make !== c.make) c.fmake = card.make; }
    return c;
  }
  async function simpleChange(title, verb, slug, mutate) {
    var label;
    await commit(async function (ctx) {
      var c = await readCar(ctx, slug); mutate(c); label = cardLabel(c) + ' (' + c.year + ')';
      var files = {}; files['cars/' + slug + '/index.html'] = G.carPage(c);
      await gridFiles(ctx, files, { upsert: { slug: slug, card: G.carCard(c, 1), position: 'keep' } });
      return { message: verb + ' ' + label + ' (via admin page)', files: files };
    });
    await loadSite(); await doneDialog(title, slug);
  }
  async function markSold(card) {
    var ok = await dialog(el('div', {}, [el('h3', { text: 'Mark as SOLD?' }), el('p', { text: cardLabel(card) + ' will show the SOLD label, its price will be hidden, and it moves to the end of the list.' })]), [{ label: 'Cancel', value: 0 }, { label: 'Mark as SOLD', value: 1, cls: 'btn-red' }]);
    if (ok) simpleChange('Marked as SOLD', 'Mark as SOLD:', card.slug, function (c) { c.sold = true; }).catch(fail);
  }
  async function unmarkSold(card) {
    var inp = el('input', { inputmode: 'numeric', placeholder: 'e.g. 428,000' }), poaBox = el('input', { type: 'checkbox' });
    var box = el('div', {}, [el('h3', { text: 'Put back on sale?' }), el('p', { text: 'The website does not keep the price of sold cars. Enter the asking price for ' + cardLabel(card) + ':' }),
      el('label', {}, ['Asking price (RM)', inp]), el('label', { class: 'adm-row', style: 'margin-top:10px' }, [poaBox, 'Enquire for price instead'])]);
    var ok = await dialog(box, [{ label: 'Cancel', value: 0 }, { label: 'Unmark SOLD', value: 1, cls: 'btn-red' }]);
    if (!ok) return; var price = poaBox.checked ? null : G.parsePrice('RM' + inp.value);
    if (!poaBox.checked && !price) { await dialog('Please enter the asking price, or tick "Enquire for price".', [{ label: 'OK', value: 1 }]); return; }
    simpleChange('Back on sale', 'Unmark SOLD:', card.slug, function (c) { c.sold = false; c.price = price; }).catch(fail);
  }
  async function del(card) {
    var ok = await dialog(el('div', {}, [el('h3', { text: 'Delete ' + cardLabel(card) + '?' }), el('p', { text: 'This removes the car page, its photos and its card from the website. To show it as sold instead, use Mark as SOLD.' })]), [{ label: 'Cancel', value: 0 }, { label: 'Yes, delete', value: 1, cls: 'btn-del' }]);
    if (!ok) return;
    var ok2 = await dialog('Are you sure? This cannot be undone from this page.', [{ label: 'No, keep it', value: 0 }, { label: 'Delete for good', value: 1, cls: 'btn-red' }]);
    if (!ok2) return;
    try {
      await commit(async function (ctx) {
        var files = {}; files['cars/' + card.slug + '/index.html'] = null;
        (await ctx.list('assets/img/cars/' + card.slug)).forEach(function (f) { if (f.type === 'file') files['assets/img/cars/' + card.slug + '/' + f.name] = null; });
        await gridFiles(ctx, files, { remove: card.slug });
        return { message: 'Remove ' + cardLabel(card) + ' (' + card.year + ') listing (via admin page)', files: files };
      });
      await loadSite(); await doneDialog('Deleted', null);
    } catch (e) { fail(e); }
  }
  async function startEdit(slug, opt) {
    opt = opt || {};
    try {
      busy('Opening…', 40, '');
      var ctx = { read: async function (p) { var x = await api('GET', R() + '/contents/' + p + '?ref=' + CONFIG.BRANCH, null, { raw: true, allow: [404] }); return x.data; } };
      var c = await readCar(ctx, slug), card = site.cards.filter(function (x) { return x.slug === slug; })[0];
      var list = (await api('GET', R() + '/contents/assets/img/cars/' + slug + '?ref=' + CONFIG.BRANCH)).data, byName = {};
      list.forEach(function (f) { byName[f.name] = f.sha; });
      busy(false);
      var newOnes = opt.keepForm ? photos.filter(function (p) { return p.blob; }) : [];
      var formCar = opt.keepForm ? readForm().car : null;
      if (!opt.keepForm) resetForm();
      editing = { slug: slug, car: c, card: card };
      photos = c.photos.map(function (cap, i) { var file = c.photoFiles[i]; return { id: ++pid, blob: null, sha: byName[file], file: file, url: '../assets/img/cars/' + slug + '/' + file + '?v=' + (byName[file] || '').slice(0, 7), caption: cap }; }).concat(newOnes);
      fillForm(c, card);
      if (formCar) { // dealer text pasted for an existing car: take the new details
        $('fMake').value = formCar.make; $('fModel').value = formCar.model; $('fYear').value = formCar.year; $('fMileage').value = formCar.mileage; $('fUnit').value = formCar.unit;
        $('fColour').value = formCar.colour[1]; $('fGrade').value = formCar.grade || ''; if (formCar.price) { $('fPrice').value = formCar.price.toLocaleString('en-US'); $('fPoa').checked = false; }
        if (formCar.feats.length) $('fFeats').value = formCar.feats.join('\n'); if (formCar.notes) $('fNotes').value = formCar.notes;
      }
      $('fSlug').disabled = true; $('slugHint').textContent = 'The web address of an existing car stays the same.';
      $('editBanner').hidden = false; $('editTitle').textContent = 'Editing ' + cardLabel(c); $('pasteCard').hidden = true; $('publishBtn').textContent = 'Save changes';
      renderPhotos(); tab('add');
      if (opt.addPhotos) { $('photos').scrollIntoView({ behavior: 'smooth' }); setTimeout(function () { $('fFiles').click(); }, 400); } else scrollTo(0, 0);
    } catch (e) { fail(e); }
  }

  /* ---------------- tabs + boot ---------------- */
  function tab(t) { [].forEach.call(document.querySelectorAll('.adm-tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === t); }); $('tAdd').hidden = t !== 'add'; $('tManage').hidden = t !== 'manage'; }
  [].forEach.call(document.querySelectorAll('.adm-tabs button'), function (b) { b.addEventListener('click', function () { tab(b.getAttribute('data-tab')); }); });
  $('signIn').addEventListener('click', signIn);
  $('signOut').addEventListener('click', function () { signOut(); });
  window.addEventListener('beforeunload', function (e) { if (photos.some(function (p) { return p.blob; }) && !$('vApp').hidden) { e.preventDefault(); e.returnValue = ''; } });

  (async function boot() {
    var fr = readFragment();
    if (fr && fr.error) { showSignin(fr.error === 'not_allowed' ? 'That GitHub account is not allowed to manage this site.' : fr.error === 'state' ? 'Sign-in could not be confirmed. Please try again.' : 'Sign-in did not finish (' + fr.error + '). Please try again.'); return; }
    if (fr) { auth = fr; } else loadAuth();
    if (!auth) { showSignin(workerReady() ? '' : 'Sign-in is not set up yet (Worker address missing in admin.js).'); return; }
    try { busy('Signing in…', 50, 'Checking access to the website…'); await verify(); showApp(); await loadSite(); busy(false); }
    catch (e) { busy(false); if (!(e instanceof AuthError)) { auth = null; sessionStorage.removeItem(AUTH_KEY); showSignin(e.message); } }
  })();
})();
