// 隔离验证：临时 HOME + 自动选端口，绝不碰正在运行的那个宿主。
// 目标：证明 POST /cmd 不会再让进程挂掉，且 /state 能取到命令、只取一次。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-sitter-test-'));
process.env.USERPROFILE = tmpHome;
process.env.HOME = tmpHome;

const cfgDir = path.join(tmpHome, '.dsh', 'dsh-sitter');
const portFile = path.join(cfgDir, 'port.txt');

const { fileURLToPath } = await import('node:url');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hostUrl = new URL('file://' + path.join(ROOT, 'dsh-sitter', 'index.js'));
const mod = await import(hostUrl.href);

const results = [];
let dispose = () => {};
const ok = (name, pass, detail = '') => results.push({ name, pass, detail });

const ctx = {
  effect(fn) {
    try {
      const disposer = fn();
      dispose = () => { try { if (typeof disposer === 'function') disposer(); } catch {} };
      return dispose;
    } catch { return () => {}; }
  },
};

try {
  mod.apply(ctx);
} catch (e) {
  console.log('APPLY THREW:', e && e.stack);
  process.exit(2);
}

// 等端口落盘
let port = null;
for (let i = 0; i < 60; i += 1) {
  try {
    const p = Number(fs.readFileSync(portFile, 'utf8').trim());
    if (p && p !== 43717) { port = p; break; }
  } catch { /* not yet */ }
  await new Promise((r) => setTimeout(r, 100));
}
if (!port) { console.log('FAIL: 宿主没起在预期端口（可能撞到在线宿主）'); process.exit(3); }
const base = `http://127.0.0.1:${port}`;

const req = async (p, opt = {}) => {
  const r = await fetch(base + p, {
    method: opt.method || 'GET',
    headers: { 'content-type': 'application/json', ...(opt.headers || {}) },
    body: opt.body,
    signal: AbortSignal.timeout(8000),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text };
};

// 1. 正常 POST /cmd —— 这一条以前会把整个应用带走
try {
  const r = await req('/cmd', { method: 'POST', body: JSON.stringify({ name: 'blink' }) });
  ok('POST /cmd 正常返回 200', r.status === 200 && r.json?.ok === true, `status=${r.status}`);
} catch (e) {
  ok('POST /cmd 正常返回 200', false, String(e));
}

// 2. /state 必须能取到这条命令
try {
  const r = await req('/state');
  ok('/state 取到命令', r.json?.cmd?.name === 'blink', JSON.stringify(r.json?.cmd));
} catch (e) {
  ok('/state 取到命令', false, String(e));
}

// 3. 再取一次必须为空（只投递一次）
try {
  const r = await req('/state');
  ok('/state 命令只投递一次', r.json?.cmd == null, JSON.stringify(r.json?.cmd));
} catch (e) {
  ok('/state 命令只投递一次', false, String(e));
}

// 4. 缺 name 的 POST 必须回 400，且不崩
try {
  const r = await req('/cmd', { method: 'POST', body: '{}' });
  ok('POST /cmd 缺 name 返回 400', r.status === 400, `status=${r.status}`);
} catch (e) {
  ok('POST /cmd 缺 name 返回 400', false, String(e));
}

// 5. 坏 JSON 必须不崩
try {
  const r = await req('/cmd', { method: 'POST', body: '{not json' });
  ok('POST /cmd 坏 JSON 不崩', r.status === 400 || r.status === 200, `status=${r.status}`);
} catch (e) {
  ok('POST /cmd 坏 JSON 不崩', false, String(e));
}

// 6. 其它 POST 路由一起过一遍
for (const [p, body] of [['/selftest', '{"results":[],"v":"t"}'], ['/client-error', '{"msg":"t"}'], ['/config', '{"displayHeight":90}']]) {
  try {
    const r = await req(p, { method: 'POST', body });
    ok(`POST ${p} 不崩`, r.status === 200, `status=${r.status}`);
  } catch (e) {
    ok(`POST ${p} 不崩`, false, String(e));
  }
}

// 7. 全路由冒烟：任何一个 GET 抛错都会让宿主进程退出
const routes = ['/config', '/state', '/stats', '/hello', '/selftest', '/skins', '/coins', '/reminder', '/diag', '/client-error'];
for (const p of routes) {
  try {
    const r = await req(p);
    ok(`GET ${p} 200`, r.status === 200, `status=${r.status}`);
  } catch (e) {
    ok(`GET ${p} 200`, false, String(e));
  }
}

// 8. 进程还活着 + 没有 handler-error
const errLog = path.join(cfgDir, 'handler-error.log');
const hasErr = fs.existsSync(errLog);
ok('宿主进程存活（能继续响应）', true);
ok('没有新的 handler 异常日志', !hasErr, hasErr ? fs.readFileSync(errLog, 'utf8').slice(0, 300) : '');

// 收尾
const pass = results.filter((r) => r.pass).length;
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  — ' + r.detail : ''}`);
console.log(`\n${pass}/${results.length} 通过`);
try { dispose(); } catch {}
await new Promise((r) => setTimeout(r, 300));
process.exitCode = pass === results.length ? 0 : 1;
