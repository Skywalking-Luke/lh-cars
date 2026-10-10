/* LH Cars admin: page/card generator and parser.
   Mirrors /workspace/lh-build/gen2.py + cars_ext.py and the live page head (OG tags, GoatCounter).
   Works in the browser (window.LHGen) and in Node (module.exports) for tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LHGen = factory();
})(this, function () {
  'use strict';
  var WA = '60128744878';
  var SITE = 'https://lhcars.my';
  var MSG_GEN = "Hi LH Cars, I'm looking for a car. Can you help me?";
  var MSG_SAMPLE = "Hi LH Cars, I'm looking for a car like the {car}. Can you help me check availability and price?";
  var MSG_STOCK = "Hi LH Cars, I'm interested in the {car} asking price {price}. Is it still available?";
  var MSG_POA = "Hi LH Cars, I'd like to know the price of the {car}. Is it still available?";
  var TXT = {
    d_enq_p2: 'Send us a WhatsApp message. We will confirm availability and the details with the seller.',
    d_disc2: 'The asking price is set by the seller. Viewing, terms and paperwork are handled by the authorised seller.',
    d_sold_p: 'This car has been sold. Ask us on WhatsApp about similar cars.',
    u_km: 'km', u_mi: 'miles'
  };
  var GOAT = '<script data-goatcounter="https://lhcars.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>';

  // Python urllib.parse.quote(s) (safe='/')
  function pyQuote(s) {
    return encodeURIComponent(s).replace(/[!'()*]/g, function (c) {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase();
    }).replace(/%2F/g, '/');
  }
  function wa(msg) { return 'https://wa.me/' + WA + '?text=' + pyQuote(msg); }
  function slugKey(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
  function slugUrl(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function fkey(s) { return 'f_' + slugKey(s); }
  function ckey(s) { return 'cap_' + slugKey(s); }
  function money(n) { return 'RM' + Number(n).toLocaleString('en-US'); }
  // text content: same as gen2 esc() (& only) plus < > which never occur in existing pages
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // attribute values: existing pages never contain " or <, so this is identical for them
  function attr(s) { return String(s).replace(/&(?!amp;)/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function unesc(s) { return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); }

  function nm(c) { return c.name + (c.ref ? ' #' + c.ref : ''); }
  function carlabel(c) { return c.ref ? (c.name + ' #' + c.ref + ' (' + c.year + ')') : (c.year + ' ' + c.name); }
  function poa(c) { return !c.sold && (c.price === null || c.price === undefined || c.price === ''); }
  function refchip(c) { return c.ref ? '<span>#' + esc(c.ref) + '</span>' : ''; }
  function imgDir(c) { return 'assets/img/cars/' + c.slug + '/'; }
  function unitHtml(c) { return esc(c.mileage) + ' <span data-i18n="u_' + c.unit + '">' + TXT['u_' + c.unit] + '</span>'; }
  function badge(c) { return c.sold ? '<span class="tag" data-i18n="tag_sold">SOLD</span>' : ''; }
  function modelOf(c) { return c.model || c.name.split(' ').slice(1).join(' '); }

  function waCar(c, cls, label) {
    if (c.sold) {
      var m = MSG_SAMPLE.replace('{car}', c.name);
      return '<a class="' + cls + '" href="' + wa(m) + '" data-wa="wa_sample" data-car="' + attr(c.name) + '" target="_blank" rel="noopener">' + label + '</a>';
    }
    if (poa(c)) {
      var m2 = MSG_POA.replace('{car}', carlabel(c));
      return '<a class="' + cls + '" href="' + wa(m2) + '" data-wa="wa_poa" data-car="' + attr(carlabel(c)) + '" target="_blank" rel="noopener">' + label + '</a>';
    }
    var msg = MSG_STOCK.replace('{car}', carlabel(c)).replace('{price}', money(c.price));
    return '<a class="' + cls + '" href="' + wa(msg) + '" data-wa="wa_stock" data-car="' + attr(carlabel(c)) + '" data-price="' + money(c.price) + '" target="_blank" rel="noopener">' + label + '</a>';
  }

  var NAV = [['index.html', 'nav_home', 'Home'], ['cars.html', 'nav_cars', 'Cars'], ['how-it-works.html', 'nav_how', 'How it works'], ['why-us.html', 'nav_why', 'Why LH Cars'], ['faq.html', 'nav_faq', 'FAQ'], ['contact.html', 'nav_contact', 'Contact']];
  var FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Saira:ital,wght@1,700;1,800&family=Noto+Sans+SC:wght@400;700&family=Noto+Sans+Tamil:wght@400;700&display=swap" rel="stylesheet">';

  function page(c, title, ogTitle, desc, body, sticky) {
    var p = '../../';
    var nav = NAV.map(function (n) { return '<a href="' + p + n[0] + '"' + (n[0] === 'cars.html' ? ' class="on"' : '') + ' data-i18n="' + n[1] + '">' + n[2] + '</a>'; }).join('');
    var fnav = NAV.map(function (n) { return '<li><a href="' + p + n[0] + '" data-i18n="' + n[1] + '">' + n[2] + '</a></li>'; }).join('');
    var langs = [['en', 'EN', 'English'], ['ms', 'BM', 'Bahasa Melayu'], ['zh', '中文', '简体中文'], ['ta', 'தமிழ்', 'தமிழ்']].map(function (l) { return '<button type="button" data-lang="' + l[0] + '" aria-label="' + l[2] + '">' + l[1] + '</button>'; }).join('');
    var url = SITE + '/cars/' + c.slug + '/', img = SITE + '/' + imgDir(c) + 'share.jpg', alt = attr(nm(c) + ' (' + c.year + ')');
    var og = '<meta property="og:type" content="website"><meta property="og:site_name" content="LH Cars"><meta property="og:title" content="' + attr(ogTitle) + '"><meta property="og:description" content="' + attr(desc) + '"><meta property="og:url" content="' + url + '"><meta property="og:image" content="' + img + '"><meta property="og:image:secure_url" content="' + img + '"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="' + alt + '"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + attr(ogTitle) + '"><meta name="twitter:description" content="' + attr(desc) + '"><meta name="twitter:image" content="' + img + '">';
    var gen = '<a class="hwa" href="' + wa(MSG_GEN) + '" data-wa="wa_gen" target="_blank" rel="noopener">💬 <span data-i18n="btn_wa">WhatsApp</span></a>';
    return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n' +
      '<title data-i18n="ti_' + c.slug + '">' + esc(title) + '</title><meta name="description" content="' + attr(desc) + '"><meta name="theme-color" content="#14161e">' + og + '\n' +
      '<link rel="icon" href="' + p + 'assets/img/favicon.svg" type="image/svg+xml">' + FONTS + '<link rel="stylesheet" href="' + p + 'assets/css/styles.css">\n</head><body>\n' +
      '<header class="hdr"><div class="wrap"><a class="logo" href="' + p + 'index.html"><b>LH</b><span>LH <em>Cars</em></span></a>\n' +
      '<nav class="nav" aria-label="Main">' + nav + '</nav>\n' +
      '<div class="lang" role="group" aria-label="Language">' + langs + '</div>\n' + gen + '\n' +
      '<button class="burger" type="button" aria-label="Menu" aria-expanded="false">☰</button></div></header>\n<main>\n' + body + '\n</main>\n' +
      '<footer class="ft"><div class="wrap"><div class="cols">\n' +
      '<div><a class="logo" href="' + p + 'index.html"><b>LH</b><span>LH <em>Cars</em></span></a><p data-i18n="ft_tag">A buyer-side car broker in Malaysia. Browse, ask on WhatsApp, and let the sale be handled properly.</p></div>\n' +
      '<div><h4 data-i18n="ft_pages">Pages</h4><ul>' + fnav + '</ul></div>\n' +
      '<div><h4 data-i18n="ft_contact">Contact</h4><ul><li>WhatsApp: <a href="' + wa(MSG_GEN) + '" data-wa="wa_gen" target="_blank" rel="noopener">+60128744878</a></li><li><span data-i18n="ft_phone">Phone</span>: <a href="tel:+60128744878">+60128744878</a></li><li data-i18n="ft_market">Malaysia</li></ul></div>\n' +
      '</div><p class="legal" data-i18n="ft_note">LH Cars introduces buyers to authorised sellers and dealers. The final price, terms, viewing, financing and paperwork are set and completed by the authorised seller, not by LH Cars.</p>\n' +
      '<p class="legal">© <span class="yr">2026</span> LH Cars · Malaysia</p></div></footer>\n' + sticky + '\n' +
      '<script src="' + p + 'assets/js/i18n.js"></script><script src="' + p + 'assets/js/main.js?v=14"></script>\n' + GOAT + '\n</body></html>\n';
  }

  function featLis(list) { return list.map(function (f) { return '<li data-i18n="' + fkey(f) + '">' + esc(f) + '</li>'; }).join(''); }

  /* c = {slug, make, model, name, ref, year, mileage, unit:'km'|'mi', colour:[key,en], price:number|null,
          sold, grade, extra:[[k,label,valueHtml,vk]], feats:[], fgroups:[[gk,gen,[..]]], photos:[captionEN], notes,
          fmake, body} */
  function carPage(c) {
    var p = '../../', d = imgDir(c), ck = c.colour[0], cen = c.colour[1], n = c.photos.length;
    var thumbs = c.photos.map(function (cap, i) {
      var f = p + d + (i + 1 < 10 ? '0' : '') + (i + 1) + '.jpg';
      return '<button type="button" data-full="' + f + '"' + (i === 0 ? ' class="on"' : '') + '><img src="' + f + '" alt="' + attr(nm(c) + ' – ' + cap) + '" loading="lazy"><span class="cap" data-i18n="' + ckey(cap) + '">' + esc(cap) + '</span></button>';
    }).join('');
    var specs = [['sp_make', 'Make', esc(c.make), null], ['sp_model', 'Model', esc(modelOf(c)), null], ['sp_ref', 'Stock ref', '#' + esc(c.ref || ''), null], ['sp_year', 'Year', String(c.year), null], ['sp_mileage', 'Mileage', unitHtml(c), null], ['sp_colour', 'Exterior colour', esc(cen), ck]];
    if (!c.ref) specs = specs.filter(function (s) { return s[0] !== 'sp_ref'; });
    specs = specs.concat(c.extra || []);
    if (c.grade) specs.push(['sp_grade', 'Auction grade', esc(c.grade), null]);
    if (poa(c)) specs.push(['sp_price', 'Price', 'Enquire for price', 'lbl_poa']);
    else if (!c.sold) specs.push(['lbl_ask', 'Asking price', money(c.price), null]);
    var specHtml = specs.map(function (s) { return '<div><dt data-i18n="' + s[0] + '">' + s[1] + '</dt><dd' + (s[3] ? ' data-i18n="' + s[3] + '"' : '') + '>' + s[2] + '</dd></div>'; }).join('');
    var feats;
    if (c.fgroups && c.fgroups.length) {
      feats = c.fgroups.map(function (g) { return '<h4 class="fg-h" data-i18n="' + g[0] + '">' + esc(g[1]) + '</h4><ul class="flist">' + featLis(g[2]); }).join('</ul>') + '</ul>';
    } else feats = '<ul class="flist">' + featLis(c.feats || []) + '</ul>';
    var PBAR, ENQ;
    if (c.sold) {
      PBAR = '<div class="pbar"><div><div class="price" data-i18n="tag_sold">SOLD</div></div></div>';
      ENQ = '<div class="enq"><h3 data-i18n="tag_sold">SOLD</h3><p data-i18n="d_sold_p">' + TXT.d_sold_p + '</p>\n<div class="row">' + waCar(c, 'btn btn-wa', '💬 <span data-i18n="btn_similar">Ask about similar cars</span>') + '</div></div>';
    } else {
      PBAR = poa(c) ? '<div class="pbar"><div><div class="price" data-i18n="lbl_poa">Enquire for price</div></div></div>'
        : '<div class="pbar"><div><div class="muted" data-i18n="lbl_ask">Asking price</div><div class="price">' + money(c.price) + '</div></div></div>';
      ENQ = '<div class="enq"><h3 data-i18n="d_enq_h">Interested in this car?</h3><p data-i18n="d_enq_p2">' + TXT.d_enq_p2 + '</p>\n<div class="row">' + waCar(c, 'btn btn-wa', '💬 <span data-i18n="btn_enquire">Enquire on WhatsApp</span>') + '<button class="btn btn-ghost" type="button" data-share>↗ <span data-i18n="d_share2">Share this car</span></button></div>\n<p class="disc" data-i18n="d_disc2">' + TXT.d_disc2 + '</p></div>';
    }
    var notes = c.notes ? '<h3 class="box-h" data-i18n="d_about">About this car</h3>\n<p class="muted lh-notes">' + esc(c.notes).replace(/\n/g, '<br>') + '</p>\n' : '';
    var body = '<div class="wrap"><div class="dtop"><a class="crumb" href="' + p + 'cars.html">‹‹ <span data-i18n="d_back">Back to all cars</span></a>\n' +
      '<div class="btns"><button class="btn btn-ghost btn-sm" type="button" data-share>↗ <span data-i18n="d_share">Share</span></button><a class="btn btn-ghost btn-sm" href="' + p + 'contact.html" data-i18n="d_contact">Contact</a>' + waCar(c, 'btn btn-wa btn-sm', '💬 WhatsApp') + '</div></div>\n' +
      '<div class="stage fit"><img src="' + p + d + '01.jpg" alt="' + attr(nm(c)) + '"><button class="arrow l" type="button" data-go="-1" aria-label="Previous photo">‹</button><button class="arrow r" type="button" data-go="1" aria-label="Next photo">›</button><span class="count">1 / ' + n + '</span></div>\n' +
      PBAR + '\n<div class="dgrid"><div>\n' + badge(c) + '<h1>' + esc(c.name) + '</h1>\n' +
      '<div class="chips">' + refchip(c) + '<span>' + c.year + '</span><span>' + unitHtml(c) + '</span><span data-i18n="' + ck + '">' + esc(cen) + '</span>' + (c.grade ? '<span><span data-i18n="sp_grade">Auction grade</span> ' + esc(c.grade) + '</span>' : '') + '</div>\n' +
      '<h3 class="box-h" data-i18n="d_info">Car information</h3>\n<dl class="spec">' + specHtml + '</dl>\n' +
      '<h3 class="box-h" data-i18n="d_feats">Features</h3>\n' + feats + '\n' + notes + ENQ + '\n</div><div>\n' +
      '<h3 class="box-h" style="margin-top:0" data-i18n="d_photos">Photos</h3><div class="thumbs">' + thumbs + '</div>\n' +
      '<p class="disc" data-i18n="d_tap">Tap a photo to view it large. Swipe or use the arrows to browse.</p>\n</div></div></div>\n' +
      '<div class="lb" role="dialog" aria-label="Photo viewer"><button class="x" type="button" aria-label="Close">×</button><button class="arrow l" type="button" data-go="-1" aria-label="Previous photo">‹</button><img src="' + p + d + '01.jpg" alt="' + attr(c.name) + ' large photo"><button class="arrow r" type="button" data-go="1" aria-label="Next photo">›</button></div>';
    var state = c.sold ? 'SOLD' : poa(c) ? 'Enquire for price' : money(c.price);
    var ogTitle = nm(c) + ' (' + c.year + ') · ' + state;
    var desc = nm(c) + ', ' + c.year + ', ' + c.mileage + ' ' + TXT['u_' + c.unit] + ', ' + cen + '. ' +
      (c.sold ? 'Sold. Ask LH Cars on WhatsApp about similar cars.' : poa(c) ? 'Enquire with LH Cars on WhatsApp for the price.' : 'Asking price ' + money(c.price) + '. Enquire with LH Cars on WhatsApp.');
    var sticky = waCar(c, 'swa', c.sold ? '💬 <span data-i18n="btn_similar">Ask about similar cars</span>' : '💬 <span data-i18n="btn_enquire">Enquire on WhatsApp</span>');
    return page(c, ogTitle + ' · LH Cars', ogTitle, desc, body, sticky);
  }

  function carCard(c, order) {
    var ck = c.colour[0], cen = c.colour[1];
    var ribbon = c.sold ? '' : poa(c) ? '<span class="ribbon"><small data-i18n="lbl_poa">Enquire for price</small></span>' : '<span class="ribbon"><small data-i18n="lbl_ask">Asking price</small>' + money(c.price) + '</span>';
    return '<article class="card"' + (c.body !== undefined && c.body !== null ? ' data-body="' + attr(c.body) + '"' : '') + ' data-make="' + attr(c.fmake || c.make) + '" data-year="' + c.year + '" data-price="' + (c.sold || poa(c) ? '' : c.price) + '" data-order="' + (c.sold ? 999 : order) + '">\n' +
      '<a class="ph" href="cars/' + c.slug + '/"><img src="' + imgDir(c) + '01.jpg" alt="' + attr(nm(c)) + '" loading="lazy">' + badge(c) + ribbon + '</a>\n' +
      '<div class="bd"><h3>' + esc(c.name) + '</h3>\n' +
      '<div class="chips">' + refchip(c) + '<span>' + c.year + '</span><span>' + unitHtml(c) + '</span><span data-i18n="' + ck + '">' + esc(cen) + '</span></div>\n' +
      '<div class="act"><a class="btn btn-red btn-sm" href="cars/' + c.slug + '/" data-i18n="btn_details">View photos &amp; specs</a>' + waCar(c, 'btn btn-wa btn-sm', c.sold ? '<span data-i18n="btn_similar">Ask about similar cars</span>' : '<span data-i18n="btn_enquire">Enquire on WhatsApp</span>') + '</div></div></article>';
  }

  /* ---------- parsing existing pages ---------- */
  function m1(re, s) { var m = re.exec(s); return m ? m[1] : null; }
  function parseCarPage(html, slug) {
    var c = { slug: slug };
    var chips = m1(/<div class="dgrid"><div>\n[\s\S]*?<div class="chips">([\s\S]*?)<\/div>\n/, html) || '';
    c.sold = /<div class="price" data-i18n="tag_sold">SOLD<\/div>/.test(html);
    c.name = unesc(m1(/<h1>([\s\S]*?)<\/h1>/, html) || '');
    var spec = m1(/<dl class="spec">([\s\S]*?)<\/dl>/, html) || '';
    var rows = [], re = /<div><dt data-i18n="([^"]+)">([\s\S]*?)<\/dt><dd(?: data-i18n="([^"]+)")?>([\s\S]*?)<\/dd><\/div>/g, m;
    while ((m = re.exec(spec))) rows.push([m[1], m[2], m[4], m[3] || null]);
    c.extra = []; c.ref = null; c.grade = null; c.price = null;
    rows.forEach(function (r) {
      var k = r[0];
      if (k === 'sp_make') c.make = unesc(r[2]);
      else if (k === 'sp_model') c.model = unesc(r[2]);
      else if (k === 'sp_ref') c.ref = r[2].replace(/^#/, '');
      else if (k === 'sp_year') c.year = parseInt(r[2], 10);
      else if (k === 'sp_mileage') { c.mileage = unesc(r[2].replace(/ <span[\s\S]*$/, '')); c.unit = m1(/data-i18n="u_(km|mi)"/, r[2]) || 'km'; }
      else if (k === 'sp_colour') c.colour = [r[3], unesc(r[2])];
      else if (k === 'sp_grade') c.grade = unesc(r[2]);
      else if (k === 'lbl_ask') c.price = parseInt(r[2].replace(/[^0-9]/g, ''), 10);
      else if (k === 'sp_price' && r[3] === 'lbl_poa') c.price = null;
      else c.extra.push(r);
    });
    if (c.sold) {
      var pm = m1(/<meta name="lh-price" content="(\d+)">/, html); // never written; sold pages hide the price
      c.price = pm ? +pm : null;
    }
    var fsec = m1(/<h3 class="box-h" data-i18n="d_feats">Features<\/h3>\n([\s\S]*?)\n(?:<h3 class="box-h" data-i18n="d_about"|<div class="enq">)/, html) || '';
    var liRe = /<li data-i18n="[^"]*">([\s\S]*?)<\/li>/g;
    function lis(s) { var out = [], x; liRe.lastIndex = 0; while ((x = liRe.exec(s))) out.push(unesc(x[1])); return out; }
    if (/<h4 class="fg-h"/.test(fsec)) {
      c.fgroups = []; var gre = /<h4 class="fg-h" data-i18n="([^"]+)">([\s\S]*?)<\/h4><ul class="flist">([\s\S]*?)<\/ul>/g, g;
      while ((g = gre.exec(fsec))) c.fgroups.push([g[1], unesc(g[2]), lis(g[3])]);
      c.feats = [].concat.apply([], c.fgroups.map(function (x) { return x[2]; }));
    } else { c.feats = lis(fsec); c.fgroups = null; }
    var nt = m1(/<p class="muted lh-notes">([\s\S]*?)<\/p>/, html);
    c.notes = nt ? unesc(nt.replace(/<br>/g, '\n')) : '';
    var thumbs = m1(/<div class="thumbs">([\s\S]*?)<\/div>\n<p class="disc"/, html) || '';
    c.photos = []; var tre = /<span class="cap" data-i18n="[^"]*">([\s\S]*?)<\/span><\/button>/g, t;
    while ((t = tre.exec(thumbs))) c.photos.push(unesc(t[1]));
    c.photoFiles = []; var fre = /data-full="\.\.\/\.\.\/assets\/img\/cars\/[^/]+\/([^"]+)"/g, f;
    while ((f = fre.exec(thumbs))) c.photoFiles.push(f[1]);
    if (!c.model) c.model = c.name.split(' ').slice(1).join(' ');
    c.chips = chips;
    return c;
  }

  // cards in a grid: [{html, slug, order, make, body, sold, ref}]
  var CARD_RE = /<article class="card[^"]*"[^>]*>[\s\S]*?<\/article>/g;
  function parseCard(h) {
    return {
      html: h,
      slug: m1(/<a class="ph" href="cars\/([^/]+)\/"/, h),
      order: +(m1(/data-order="(\d+)"/, h) || 0),
      make: unesc(m1(/data-make="([^"]*)"/, h) || ''),
      body: (function () { var b = m1(/data-body="([^"]*)"/, h); return b === null ? null : unesc(b); })(),
      sold: /data-i18n="tag_sold"/.test(h),
      ref: m1(/<div class="chips"><span>#([^<]+)<\/span>/, h),
      name: unesc(m1(/<h3>([\s\S]*?)<\/h3>/, h) || ''),
      year: m1(/data-year="(\d*)"/, h),
      price: m1(/data-price="(\d*)"/, h),
      fixed: /data-order="0"/.test(h)
    };
  }
  function gridSpan(html, marker) {
    var i = html.indexOf(marker); if (i < 0) return null;
    var start = i + marker.length;
    // grid ends at the last </article> followed by </div>
    var re = /<\/article><\/div>/g; re.lastIndex = start; var m = re.exec(html); if (!m) return null;
    return { start: start, end: m.index + '</article>'.length };
  }
  function readGrid(html, marker) {
    var sp = gridSpan(html, marker); if (!sp) return null;
    var inner = html.slice(sp.start, sp.end), cards = inner.match(CARD_RE) || [];
    if (cards.join('') !== inner) throw new Error('Unexpected content between cards in grid');
    return cards.map(parseCard);
  }
  /* ordering: fixed cards (data-order 0, the MG) stay first; then unsold cars in order; SOLD (999) at the end.
     opts: {upsert: {card, slug, position:'first'|'keep'}, remove: slug} */
  function rebuildGrid(html, marker, opts) {
    var sp = gridSpan(html, marker); if (!sp) throw new Error('Car grid not found');
    var cards = readGrid(html, marker);
    var fixed = cards.filter(function (c) { return c.fixed; });
    var rest = cards.filter(function (c) { return !c.fixed; }).sort(function (a, b) { return a.order - b.order; });
    var idx = -1;
    rest.forEach(function (c, i) { if (c.slug === (opts.remove || (opts.upsert && opts.upsert.slug))) idx = i; });
    if (opts.remove) { if (idx >= 0) rest.splice(idx, 1); }
    if (opts.upsert) {
      var nc = parseCard(opts.upsert.card);
      if (idx >= 0 && nc.sold && !rest[idx].sold) { rest.splice(idx, 1); rest.push(nc); } // just sold: goes to the very end
      else if (idx >= 0 && opts.upsert.position !== 'first') rest[idx] = nc;
      else { if (idx >= 0) rest.splice(idx, 1); rest.unshift(nc); }
    }
    var live = rest.filter(function (c) { return !c.sold; }), sold = rest.filter(function (c) { return c.sold; });
    var out = fixed.map(function (c) { return c.html; });
    live.forEach(function (c, i) { out.push(c.html.replace(/data-order="\d+"/, 'data-order="' + (i + 1) + '"')); });
    sold.forEach(function (c) { out.push(c.html.replace(/data-order="\d+"/, 'data-order="999"')); });
    return html.slice(0, sp.start) + out.join('') + html.slice(sp.end);
  }
  var CARS_MARK = '<div class="grid" data-list>';
  function homeMark(html) { var m = /<div class="grid">(?=<article class="card feat")/.exec(html); return m ? m[0] : '<div class="grid">'; }
  function makeSortKey(a, b) { return a < b ? -1 : a > b ? 1 : 0; } // Python sorted() order (code units)
  function updateMakeFilter(carsHtml) {
    var cards = readGrid(carsHtml, CARS_MARK);
    var makes = {}; cards.forEach(function (c) { if (c.make) makes[c.make] = 1; });
    var list = Object.keys(makes).sort(makeSortKey);
    return carsHtml.replace(/(<select id="fMake"><option value="" data-i18n="f_all">All makes<\/option>)[\s\S]*?(<\/select>)/, function (_, a, b) {
      return a + list.map(function (m) { return '<option>' + esc(m) + '</option>'; }).join('') + b;
    });
  }

  /* ---------- i18n.js ---------- */
  function readI18n(js) {
    var lines = js.split('\n'), i = -1;
    for (var n = 0; n < lines.length; n++) if (lines[n].indexOf('var D=') === 0) { i = n; break; }
    if (i < 0) throw new Error('i18n dictionary not found');
    var D = JSON.parse(lines[i].slice(6).replace(/;\s*$/, ''));
    return { D: D, write: function (D2) { var l2 = lines.slice(); l2[i] = 'var D=' + JSON.stringify(D2) + ';'; return l2.join('\n'); } };
  }
  // keys used by a car (features, captions, colour, feature groups) -> EN text
  function carKeys(c) {
    var k = {};
    (c.feats || []).forEach(function (f) { k[fkey(f)] = f; });
    (c.photos || []).forEach(function (p) { k[ckey(p)] = p; });
    if (c.colour) k[c.colour[0]] = c.colour[1];
    (c.fgroups || []).forEach(function (g) { k[g[0]] = g[1]; });
    return k;
  }
  // add missing keys; tr = {key:{ms,zh,ta}} optional translations, otherwise English placeholder
  function addKeys(D, keys, tr) {
    var added = [];
    Object.keys(keys).forEach(function (k) {
      ['ms', 'zh', 'ta'].forEach(function (l) {
        var t = tr && tr[k] && tr[k][l];
        if (t) { D[l][k] = t; }
        else if (!(k in D[l])) { D[l][k] = keys[k]; if (added.indexOf(k) < 0) added.push(k); }
      });
    });
    return added;
  }

  /* ---------- WhatsApp paste parsing ---------- */
  var KNOWN_MAKES = ['Aston Martin', 'Alfa Romeo', 'Land Rover', 'Range Rover', 'Rolls-Royce', 'Rolls Royce', 'Mercedes-Benz', 'Mercedes-AMG', 'Mercedes-Maybach', 'Mercedes Benz', 'Mercedes', 'Lamborghini', 'Ferrari', 'Porsche', 'BMW', 'Bentley', 'McLaren', 'Maserati', 'Nissan', 'Honda', 'Toyota', 'Lexus', 'Audi', 'Volkswagen', 'Volvo', 'Mazda', 'Mini', 'MG', 'Proton', 'Perodua', 'Subaru', 'Mitsubishi', 'Hyundai', 'Kia', 'Tesla', 'Jaguar', 'Lotus', 'Ford', 'Jeep', 'BYD', 'Bugatti', 'Pagani', 'Koenigsegg', 'Cadillac', 'Chevrolet', 'Suzuki', 'Isuzu', 'Peugeot', 'Genesis'];
  var MAKE_CANON = { 'Rolls Royce': 'Rolls-Royce', 'Mercedes Benz': 'Mercedes-Benz', 'Mercedes': 'Mercedes-Benz' };
  // emoji / bullet at the start of a line (✅ 📅 🛣️ • - etc.)
  var LEAD = /^(?:[\u2000-\u2BFF\u2E00-\u2E7F\u3000-\u303F\uFE0F\u20E3\u200D]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]|[•·▪◦\-–—*>+]|\d\uFE0F?\u20E3)+\s*/;
  function stripStrike(s) { return s.replace(/~[^~\n]*~/g, ' '); }
  function cleanText(t) {
    return String(t).replace(/\r\n?/g, '\n').replace(/[\u2028\u2029\u0085]/g, '\n').replace(/[\u00A0\u202F\u2007]/g, ' ').replace(/[\u200B\u200C\u2060\uFEFF]/g, '');
  }
  function parsePrice(s) {
    s = stripStrike(String(s)).replace(/\*/g, '');
    var all = s.match(/RM\s*[0-9][0-9,.]*\s*(?:k|mil|million|m)?(?![a-z])/gi) || s.match(/[0-9][0-9,.]*\s*(?:k|mil|million|m)?(?![a-z])/gi);
    if (!all) return null;
    var last = all[all.length - 1].replace(/RM/i, '').trim();
    var mult = /(mil|million|m)$/i.test(last) ? 1e6 : /k$/i.test(last) ? 1e3 : 1;
    var num = last.replace(/[a-z\s]/gi, '');
    if (mult === 1) num = num.replace(/\.\d{1,2}$/, '').replace(/[,.]/g, ''); else num = num.replace(/,/g, '');
    var v = Math.round(parseFloat(num) * mult);
    return isFinite(v) && v >= 1000 ? v : null;
  }
  function fmtMileage(s) {
    var m = /([0-9][0-9,.]*)\s*(k\b)?\s*(\+)?/i.exec(s); if (!m) return '';
    var n = m[2] ? Math.round(parseFloat(m[1].replace(/,/g, '')) * 1000) : parseInt(m[1].replace(/[,.]/g, ''), 10);
    return n.toLocaleString('en-US') + (m[3] || '');
  }
  var KEYS = [
    ['year', /^(year|yom|yor|reg(istration)? year|year of (make|manufacture)|manufactur\w* year|tahun)$/],
    ['mileage', /^(mileage|millage|milage|odo(meter)?|km|kms|miles?|jarak)$/],
    ['grade', /^(auction )?grade$/],
    ['price', /^(asking price|price|selling price|harga|now|offer price|special price|cash price)$/],
    ['colour', /^(colou?r|exterior( colou?r)?|paint|warna)$/],
    ['ref', /^(stock( no\.?| number| #)?|ref|stock ref)$/],
    ['features', /^(features?|spec(s|ifications?)?|options?|equipment|highlights?)$/]
  ];
  function keyOf(k) { k = k.toLowerCase().replace(/[.:#]+$/, '').trim(); for (var i = 0; i < KEYS.length; i++) if (KEYS[i][1].test(k)) return KEYS[i][0]; return null; }
  function parseWhatsApp(text) {
    var out = { feats: [], unused: [] };
    var src = cleanText(text).split('\n');
    var lines = [];
    src.forEach(function (raw) {
      var l = stripStrike(raw).replace(/\*/g, '').replace(/(^|\s)_([^_\n]+)_(?=\s|$)/g, '$1$2').replace(/\s+/g, ' ').trim();
      if (l) lines.push({ raw: raw.trim(), l: l, marked: LEAD.test(l) });
    });
    var inFeats = false, titleDone = false;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i], l = L.l.replace(LEAD, '').trim(); if (!l) continue;
      var key = null, val = '', kv = /^(.+?)\s*[-–—:=]+\s*(.*)$/.exec(l);
      if (kv && keyOf(kv[1])) { key = keyOf(kv[1]); val = kv[2].trim(); }
      else { var w = l.split(' '); for (var n = Math.min(4, w.length); n >= 1 && !key; n--) { var kk = keyOf(w.slice(0, n).join(' ')); if (kk) { key = kk; val = w.slice(n).join(' ').replace(/^[-–—:=\s]+/, '').trim(); } } }
      if (key && key !== 'features' && !val && i + 1 < lines.length) { val = lines[i + 1].l.replace(LEAD, '').trim(); i++; } // value on the next line
      if (key === 'features') { inFeats = true; if (val) out.feats.push(val); continue; }
      if (key === 'year') { var y = /(19|20)\d{2}/.exec(val); if (y) { out.year = +y[0]; continue; } }
      if (key === 'mileage' && /[0-9]/.test(val)) { out.mileage = fmtMileage(val); out.unit = /mile|\bmi\b/i.test(val) ? 'mi' : 'km'; continue; }
      if (key === 'grade' && val) { out.grade = val; continue; }
      if (key === 'price') {
        if (!/[0-9]/.test(val) && /enquire|ask|call|pm|poa|tba|inbox/i.test(val)) { out.poa = true; continue; }
        var p = parsePrice(val); if (p) { out.price = p; out.poa = false; continue; }
      }
      if (key === 'colour' && val) { out.colour = val; continue; }
      if (key === 'ref' && /[0-9]/.test(val)) { out.ref = val.replace(/^#\s*/, '').split(/\s/)[0]; continue; }
      if (!titleDone && (i === 0 || !L.marked || /^#\s*[A-Za-z0-9]/.test(l))) {
        titleDone = true;
        var r = /^#\s*([A-Za-z0-9-]+)\s+(.+)$/.exec(l), title = l;
        if (r) { out.ref = r[1]; title = r[2]; }
        var mk = null, tl = title.toLowerCase();
        KNOWN_MAKES.slice().sort(function (a, b) { return b.length - a.length; }).some(function (k) {
          if (tl.indexOf(k.toLowerCase() + ' ') === 0 || tl === k.toLowerCase()) { mk = k; return true; } return false;
        });
        if (mk) { out.make = MAKE_CANON[mk] || mk; out.model = title.slice(mk.length).trim(); }
        else { var sp = title.indexOf(' '); out.make = sp > 0 ? title.slice(0, sp) : title; out.model = sp > 0 ? title.slice(sp + 1) : ''; }
        continue;
      }
      if (L.marked || inFeats) { out.feats.push(l); continue; }
      out.unused.push(L.raw);
    }
    return out;
  }
  // "✅Feature" block -> list (emoji stripped, blank lines skipped)
  function parseFeatures(text) {
    return String(text).replace(/\r/g, '').split('\n').map(function (l) {
      return cleanText(l).replace(/\*/g, '').trim().replace(LEAD, '').trim();
    }).filter(Boolean);
  }

  return {
    pyQuote: pyQuote, wa: wa, slugKey: slugKey, slugUrl: slugUrl, fkey: fkey, ckey: ckey, money: money, esc: esc, attr: attr, unesc: unesc,
    carPage: carPage, carCard: carCard, parseCarPage: parseCarPage, parseCard: parseCard, readGrid: readGrid, rebuildGrid: rebuildGrid,
    CARS_MARK: CARS_MARK, homeMark: homeMark, updateMakeFilter: updateMakeFilter, readI18n: readI18n, carKeys: carKeys, addKeys: addKeys,
    parseWhatsApp: parseWhatsApp, parseFeatures: parseFeatures, parsePrice: parsePrice, nm: nm, poa: poa, KNOWN_MAKES: KNOWN_MAKES
  };
});
