/* Sandboxed HEIC -> JPEG converter used by the admin page on browsers without HEIC support (Chrome/Edge on Windows, Android). */
window.addEventListener('message', async function (e) {
  var d = e.data || {}; if (d.type !== 'heic') return;
  try {
    var out = await window.heic2any({ blob: new Blob([d.buf], { type: 'image/heic' }), toType: 'image/jpeg', quality: 0.92 });
    if (Array.isArray(out)) out = out[0];
    var buf = await out.arrayBuffer();
    e.source.postMessage({ type: 'heic-done', id: d.id, buf: buf }, '*', [buf]);
  } catch (err) { e.source.postMessage({ type: 'heic-done', id: d.id, error: String(err && err.message || err) }, '*'); }
});
parent.postMessage({ type: 'heic-ready' }, '*');
