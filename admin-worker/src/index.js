/* LH Cars admin sign-in Worker (Cloudflare Workers, free plan).
   Does ONLY the GitHub App OAuth code exchange for https://lhcars.my/admin/.
     GET  /login?n=<page nonce>  -> redirect to GitHub with a random state (kept in a short-lived HttpOnly cookie)
     GET  /callback              -> check state, exchange code (CLIENT_ID / CLIENT_SECRET are Worker secrets),
                                    check GET /user == ALLOWED_LOGIN, hand the 8-hour token to the admin page in the URL fragment
     POST /revoke                -> (CORS, only from ALLOWED_ORIGIN) revoke the token on Sign out
   Tokens, codes and secrets are never logged. The refresh token never leaves the Worker (it is dropped). */

const GH = 'https://github.com';
const API = 'https://api.github.com';
const UA = 'lh-cars-admin-worker';
const COOKIE = '__Host-lh_oauth';

function cfg(env) {
  return {
    clientId: env.CLIENT_ID,
    clientSecret: env.CLIENT_SECRET,
    allowed: (env.ALLOWED_LOGIN || 'Skywalking-Luke').toLowerCase(),
    origin: env.ALLOWED_ORIGIN || 'https://lhcars.my',
    admin: env.ADMIN_URL || 'https://lhcars.my/admin/'
  };
}
const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=31536000'
};
function respond(status, body, extra) {
  return new Response(body, { status, headers: Object.assign({ 'Content-Type': 'text/plain; charset=utf-8' }, BASE_HEADERS, extra || {}) });
}
function redirect(location, extra) { return respond(302, '', Object.assign({ Location: location }, extra || {})); }
function b64url(bytes) { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function randomState() { const a = new Uint8Array(32); crypto.getRandomValues(a); return b64url(a); }
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !a.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0;
}
function readCookie(req, name) {
  const h = req.headers.get('Cookie') || '';
  for (const part of h.split(/;\s*/)) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1); }
  return null;
}
const clearCookie = COOKIE + '=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0';
function log(event, detail) { console.log(JSON.stringify(Object.assign({ event }, detail || {}))); } // never pass tokens/codes here
function back(c, params, cookie) {
  const frag = new URLSearchParams(params).toString();
  return redirect(c.admin + '#' + frag, cookie === false ? {} : { 'Set-Cookie': clearCookie });
}
function cors(c, req) {
  const o = req.headers.get('Origin');
  if (o !== c.origin) return null;
  return { 'Access-Control-Allow-Origin': c.origin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Authorization', 'Access-Control-Max-Age': '600', Vary: 'Origin' };
}
async function revokeToken(c, token) {
  try {
    const r = await fetch(API + '/applications/' + encodeURIComponent(c.clientId) + '/token', {
      method: 'DELETE',
      headers: { Authorization: 'Basic ' + btoa(c.clientId + ':' + c.clientSecret), Accept: 'application/vnd.github+json', 'User-Agent': UA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: token })
    });
    return r.status;
  } catch (e) { return 0; }
}

export async function handle(req, env) {
  const c = cfg(env);
  const url = new URL(req.url);
  if (!c.clientId || !c.clientSecret) { log('misconfigured'); return respond(500, 'Sign-in is not configured yet (CLIENT_ID / CLIENT_SECRET secrets missing).'); }

  if (url.pathname === '/login' && req.method === 'GET') {
    const n = url.searchParams.get('n') || '';
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(n)) return respond(400, 'Bad request');
    const state = randomState();
    const q = new URLSearchParams({ client_id: c.clientId, redirect_uri: url.origin + '/callback', state, allow_signup: 'false', login: env.ALLOWED_LOGIN || 'Skywalking-Luke' });
    log('login_start');
    return redirect(GH + '/login/oauth/authorize?' + q.toString(), {
      'Set-Cookie': COOKIE + '=' + state + '.' + n + '; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600'
    });
  }

  if (url.pathname === '/callback' && req.method === 'GET') {
    const raw = readCookie(req, COOKIE) || '';
    const dot = raw.indexOf('.');
    const want = dot > 0 ? raw.slice(0, dot) : '', nonce = dot > 0 ? raw.slice(dot + 1) : '';
    const state = url.searchParams.get('state') || '';
    if (!safeEqual(state, want)) { log('state_mismatch'); return back(c, { error: 'state' }); }
    if (url.searchParams.get('error')) { log('github_denied'); return back(c, { error: 'denied' }); }
    const code = url.searchParams.get('code');
    if (!code) return back(c, { error: 'no_code' });

    let tok;
    try {
      const r = await fetch(GH + '/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': UA },
        body: JSON.stringify({ client_id: c.clientId, client_secret: c.clientSecret, code, redirect_uri: url.origin + '/callback' })
      });
      tok = await r.json();
    } catch (e) { log('exchange_failed'); return back(c, { error: 'exchange' }); }
    if (!tok || !tok.access_token) { log('exchange_rejected', { reason: tok && tok.error }); return back(c, { error: 'exchange' }); }

    let user;
    try {
      const u = await fetch(API + '/user', { headers: { Authorization: 'Bearer ' + tok.access_token, Accept: 'application/vnd.github+json', 'User-Agent': UA } });
      if (!u.ok) throw new Error('status ' + u.status);
      user = await u.json();
    } catch (e) { log('user_failed'); await revokeToken(c, tok.access_token); return back(c, { error: 'user' }); }

    if (!user || typeof user.login !== 'string' || user.login.toLowerCase() !== c.allowed) {
      log('login_refused', { login: user && user.login });
      await revokeToken(c, tok.access_token);
      return back(c, { error: 'not_allowed' });
    }
    log('login_ok', { login: user.login });
    return back(c, { access_token: tok.access_token, expires_in: String(tok.expires_in || 28800), login: user.login, n: nonce });
  }

  if (url.pathname === '/revoke') {
    const h = cors(c, req);
    if (!h) return respond(403, 'Forbidden');
    if (req.method === 'OPTIONS') return respond(204, null, h);
    if (req.method !== 'POST') return respond(405, 'Method not allowed', h);
    const m = /^Bearer\s+([A-Za-z0-9_\-.]+)$/.exec(req.headers.get('Authorization') || '');
    if (!m) return respond(400, 'Bad request', h);
    const s = await revokeToken(c, m[1]);
    log('revoke', { status: s });
    return respond(204, null, h);
  }

  if (url.pathname === '/' && req.method === 'GET') return respond(200, 'LH Cars admin sign-in. Nothing to see here.');
  return respond(404, 'Not found');
}

export default { fetch: (req, env) => handle(req, env) };
