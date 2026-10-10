// Local test of the sign-in Worker in Miniflare (workerd) with GitHub mocked. Run: node test/worker.test.mjs
// Needs miniflare@3 (npm i miniflare@3). Nothing here talks to the real GitHub.
import { Miniflare } from 'miniflare';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const TOKEN_OK = 'ghu_TESTTOKENallowed1234567890', TOKEN_BAD = 'ghu_TESTTOKENother0987654321', CODE_OK = 'code-allowed', CODE_BAD = 'code-other';
const SECRET = 'test-client-secret-xyz';
const logs = [];
const revoked = []; let exchanges = 0;
// Mocked GitHub: every outbound request from the Worker lands here.
async function github(req) {
  const u = new URL(req.url), json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'content-type': 'application/json' } });
  if (u.origin === 'https://github.com' && u.pathname === '/login/oauth/access_token' && req.method === 'POST') {
    exchanges++; const b = await req.json();
    assert.equal(b.client_secret, SECRET);
    if (b.code === CODE_OK) return json({ access_token: TOKEN_OK, expires_in: 28800, refresh_token: 'ghr_REFRESHSHOULDNOTLEAK', token_type: 'bearer' });
    if (b.code === CODE_BAD) return json({ access_token: TOKEN_BAD, expires_in: 28800, refresh_token: 'ghr_x', token_type: 'bearer' });
    return json({ error: 'bad_verification_code' });
  }
  if (u.origin === 'https://api.github.com' && u.pathname === '/user') {
    const a = req.headers.get('authorization');
    if (a === 'Bearer ' + TOKEN_OK) return json({ login: 'Skywalking-Luke', id: 1 });
    if (a === 'Bearer ' + TOKEN_BAD) return json({ login: 'someone-else', id: 2 });
    return json({ message: 'Bad credentials' }, 401);
  }
  if (u.origin === 'https://api.github.com' && /^\/applications\/[^/]+\/token$/.test(u.pathname) && req.method === 'DELETE') {
    assert.equal(req.headers.get('authorization'), 'Basic ' + Buffer.from('Iv1.testclientid:' + SECRET).toString('base64'));
    revoked.push((await req.json()).access_token); return new Response(null, { status: 204 });
  }
  return new Response('unexpected ' + req.method + ' ' + req.url, { status: 599 });
}
const mf = new Miniflare({
  modulesRoot: fileURLToPath(new URL('..', import.meta.url)), modules: true, scriptPath: fileURLToPath(new URL('../src/index.js', import.meta.url)), compatibilityDate: '2024-09-23',
  bindings: { CLIENT_ID: 'Iv1.testclientid', CLIENT_SECRET: SECRET, ALLOWED_LOGIN: 'Skywalking-Luke', ALLOWED_ORIGIN: 'https://lhcars.my', ADMIN_URL: 'https://lhcars.my/admin/' },
  outboundService: github,
  handleRuntimeStdio(stdout, stderr) { stdout.on('data', d => logs.push(String(d))); stderr.on('data', d => logs.push(String(d))); }
});
const W = 'https://lh-cars-admin.test.workers.dev';
const NONCE = 'abcdefghijklmnopqrstuvwx';
async function login() {
  const r = await mf.dispatchFetch(W + '/login?n=' + NONCE, { redirect: 'manual' });
  assert.equal(r.status, 302);
  const loc = new URL(r.headers.get('location'));
  assert.equal(loc.origin + loc.pathname, 'https://github.com/login/oauth/authorize');
  assert.equal(loc.searchParams.get('redirect_uri'), W + '/callback');
  const cookie = r.headers.get('set-cookie');
  assert.match(cookie, /^__Host-lh_oauth=[^;]+; Path=\/; Secure; HttpOnly; SameSite=Lax; Max-Age=600$/);
  return { state: loc.searchParams.get('state'), cookie: cookie.split(';')[0] };
}
const results = [];
async function t(name, fn) { await fn(); results.push('PASS ' + name); }

await t('allowed user gets in (token only in fragment, nonce echoed, cookie cleared, refresh token dropped)', async () => {
  const { state, cookie } = await login();
  const r = await mf.dispatchFetch(W + '/callback?code=' + CODE_OK + '&state=' + state, { headers: { Cookie: cookie }, redirect: 'manual' });
  assert.equal(r.status, 302);
  const loc = r.headers.get('location');
  assert.ok(loc.startsWith('https://lhcars.my/admin/#'), loc.slice(0, 40));
  const f = new URLSearchParams(loc.split('#')[1]);
  assert.equal(f.get('access_token'), TOKEN_OK); assert.equal(f.get('login'), 'Skywalking-Luke'); assert.equal(f.get('n'), NONCE); assert.equal(f.get('expires_in'), '28800');
  assert.ok(!loc.includes('ghr_'), 'refresh token must not leak');
  assert.ok(!new URL(loc).search.includes('ghu_'), 'token must not be in the query string');
  assert.match(r.headers.get('set-cookie'), /Max-Age=0/); assert.equal(r.headers.get('cache-control'), 'no-store'); assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
});
await t('another GitHub user is refused and their token revoked', async () => {
  const { state, cookie } = await login();
  const r = await mf.dispatchFetch(W + '/callback?code=' + CODE_BAD + '&state=' + state, { headers: { Cookie: cookie }, redirect: 'manual' });
  const loc = r.headers.get('location');
  assert.equal(loc, 'https://lhcars.my/admin/#error=not_allowed');
  assert.ok(revoked.includes(TOKEN_BAD));
});
await t('bad state is refused (no code exchange)', async () => {
  const { cookie } = await login();
  const before = revoked.length, ex = exchanges;
  const r = await mf.dispatchFetch(W + '/callback?code=' + CODE_OK + '&state=forged-state-value-000000000000', { headers: { Cookie: cookie }, redirect: 'manual' });
  assert.equal(r.headers.get('location'), 'https://lhcars.my/admin/#error=state');
  const r2 = await mf.dispatchFetch(W + '/callback?code=' + CODE_OK + '&state=anything', { redirect: 'manual' }); // no cookie at all
  assert.equal(r2.headers.get('location'), 'https://lhcars.my/admin/#error=state');
  assert.equal(revoked.length, before); assert.equal(exchanges, ex, 'code must not be exchanged on bad state');
});
await t('login rejects a missing/odd page nonce', async () => {
  const r = await mf.dispatchFetch(W + '/login?n=<script>', { redirect: 'manual' }); assert.equal(r.status, 400);
});
await t('strict CORS: /revoke only from https://lhcars.my', async () => {
  const pre = await mf.dispatchFetch(W + '/revoke', { method: 'OPTIONS', headers: { Origin: 'https://lhcars.my', 'Access-Control-Request-Method': 'POST' } });
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-origin'), 'https://lhcars.my');
  const evil = await mf.dispatchFetch(W + '/revoke', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
  assert.equal(evil.status, 403); assert.equal(evil.headers.get('access-control-allow-origin'), null);
  const evilPost = await mf.dispatchFetch(W + '/revoke', { method: 'POST', headers: { Origin: 'https://evil.example', Authorization: 'Bearer ' + TOKEN_OK } });
  assert.equal(evilPost.status, 403);
  const ok = await mf.dispatchFetch(W + '/revoke', { method: 'POST', headers: { Origin: 'https://lhcars.my', Authorization: 'Bearer ' + TOKEN_OK } });
  assert.equal(ok.status, 204); assert.ok(revoked.includes(TOKEN_OK));
});
await mf.dispose();
await new Promise(r => setTimeout(r, 300));
const all = logs.join('');
await t('no token, code, refresh token or secret in Worker logs', async () => {
  for (const s of [TOKEN_OK, TOKEN_BAD, 'ghr_', CODE_OK, CODE_BAD, SECRET]) assert.ok(!all.includes(s), 'leaked ' + s);
  assert.ok(all.includes('login_ok') && all.includes('login_refused') && all.includes('state_mismatch'), 'expected event logs missing');
});
console.log(results.join('\n'));
console.log('--- Worker log lines ---\n' + all.trim());
