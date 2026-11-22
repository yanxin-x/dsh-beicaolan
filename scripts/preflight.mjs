#!/usr/bin/env node
/**
 * 发布前体检（preflight）—— 只做"零副作用"的检查，绝不碰运行中的应用。
 *
 *  1. 语法：node --check
 *  2. 占位符是否残留 __XXX__
 *  3. 宿主能否在**独立子进程 + 临时 HOME**里被 import 且 apply() 不抛
 *
 * 注意：路由行为用 `pet-cli check` 对真实接口验证，这里不 bind 端口、不发请求。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 仓库根：从脚本位置推，不写死盘符 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = process.argv[2] || path.join(ROOT, 'dsh-sitter', 'index.js');
const CLIENT = process.argv[3] || path.join(ROOT, 'dsh-sitter', 'client.js');

const fails = [];
const ok = (name, pass, detail = '') => {
  if (!pass) fails.push(name + (detail ? ' — ' + detail : ''));
  console.log((pass ? '[OK]   ' : '[FAIL] ') + name + (detail ? '  ' + detail : ''));
};

for (const f of [HOST, CLIENT]) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    ok('语法 ' + path.basename(f), true);
  } catch (e) {
    ok('语法 ' + path.basename(f), false, String(e.stderr || e.message).split('\n')[0].slice(0, 120));
  }
}

for (const f of [HOST, CLIENT]) {
  const left = fs.readFileSync(f, 'utf8').match(/__[A-Z][A-Z0-9_]*__/g);
  ok('占位符 ' + path.basename(f), !left, left ? '残留 ' + [...new Set(left)].join(',') : '');
}

// 宿主加载测试：独立进程 + 临时 HOME，绝不写真实配置
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'sitter-pre-'));
const probe = [
  "import { pathToFileURL } from 'node:url';",
  `const mod = await import(pathToFileURL(${JSON.stringify(HOST)}).href + '?t=' + Date.now());`,
  'if (typeof mod.apply !== \"function\") { console.error(\"NO_APPLY\"); process.exit(3); }',
  "mod.apply({ effect: (fn) => { try { fn(); } catch (e) { console.error('EFFECT:' + e.message); } return () => {}; }, on: () => () => {}, slots: { inject() {}, register() {} }, get: () => undefined });",
  'console.log(\"APPLY_OK\");',
  'process.exit(0);',
].join('\n');

const probeFile = path.join(tmpHome, 'probe.mjs');
fs.writeFileSync(probeFile, probe, 'utf8');

try {
  const out = execFileSync(process.execPath, [probeFile], {
    stdio: 'pipe',
    timeout: 8000,
    env: { ...process.env, HOME: tmpHome, USERPROFILE: tmpHome, DSH_SITTER_PROBE: '1' },
  }).toString();
  ok('宿主 apply() 不抛', out.includes('APPLY_OK'), out.trim().slice(0, 100));
} catch (e) {
  const err = String(e.stderr || e.message).split('\n').filter(Boolean).slice(-3).join(' | ');
  ok('宿主 apply() 不抛', false, err.slice(0, 160));
}

try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch { /* ignore */ }

console.log('');
if (fails.length) {
  console.log('preflight 失败 ' + fails.length + ' 项：');
  fails.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('preflight 全部通过');
