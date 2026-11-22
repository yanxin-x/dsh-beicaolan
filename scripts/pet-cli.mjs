#!/usr/bin/env node
/**
 * 贝草兰 CLI 面板：和页面内面板共用同一份配置与状态。
 *
 *   node scripts/pet-cli.mjs status          # 状态 + 今日统计
 *   node scripts/pet-cli.mjs config          # 当前生效配置
 *   node scripts/pet-cli.mjs set a=1 b=2     # 改配置（支持点号路径）
 *   node scripts/pet-cli.mjs reset           # 恢复默认
 *   node scripts/pet-cli.mjs play sleep      # 让宠物演一个动作
 *   node scripts/pet-cli.mjs check           # 一键体检（自动跑一遍）
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 仓库根：从脚本位置推，不写死盘符，换机器/换目录都能跑 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_JS = path.join(ROOT, 'dsh-sitter', 'client.js');

/** 宿主端口可能从 43717 漂到 43718+（旧实例没退干净时），以 port.txt 为准 */
const PORT = (() => {
  try {
    const p = Number(fs.readFileSync(path.join(os.homedir(), '.dsh', 'dsh-sitter', 'port.txt'), 'utf8').trim());
    return p > 0 ? p : 43717;
  } catch {
    return 43717;
  }
})();
const BASE = `http://127.0.0.1:${PORT}`;
const ACTIONS = ['idle', 'blink', 'work', 'shake', 'cheer', 'attention', 'sleep', 'fitting', 'doze', 'escalate', 'prompt', 'dismiss', 'selftest', 'hover', 'say', 'outfit', 'ultra', 'dragtest', 'diag', 'dom', 'nothink', 'showthink', 'hidepet', 'showpet', 'hit'];

async function get(path) {
  const r = await fetch(BASE + path, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return r.json();
}

async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return r.json();
}

function setPath(obj, dotted, value) {
  const keys = dotted.split('.');
  let node = obj;
  for (let i = 0; i < keys.length - 1; i += 1) {
    if (typeof node[keys[i]] !== 'object' || node[keys[i]] === null) node[keys[i]] = {};
    node = node[keys[i]];
  }
  const last = keys[keys.length - 1];
  if (value === 'true') value = true;
  else if (value === 'false') value = false;
  else if (value === 'null') value = null;
  else if (value !== '' && !Number.isNaN(Number(value))) value = Number(value);
  node[last] = value;
  return obj;
}

const fmtTokens = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));
const fmtMins = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

async function cmdStatus() {
  const [state, stats, hello] = await Promise.all([get('/state'), get('/stats'), get('/hello').catch(() => ({}))]);
  console.log('客户端 :', hello.v || '（未上报，可能是旧版或未挂载）');
  console.log('状态   :', state.phase === 'busy' ? '在干活' : '空闲', `(${state.lastType || '-'})`);
  console.log('今日   :', fmtTokens(stats.tokens), 'tokens |', fmtMins(stats.activeMinutes), '|', stats.sessions, '个会话');
  if (state.cmd) console.log('最近指令:', state.cmd.name);
}

async function cmdConfig() {
  const c = await get('/config');
  console.log(JSON.stringify(c, null, 2));
}

async function cmdSet(args) {
  if (!args.length) throw new Error('用法: set 键=值（如 displayHeight=120 timeline.sleepMs=6000 features.think=false）');
  const patch = {};
  for (const a of args) {
    const i = a.indexOf('=');
    if (i < 0) throw new Error(`参数格式错误: ${a}`);
    setPath(patch, a.slice(0, i), a.slice(i + 1));
  }
  const c = await post('/config', patch);
  console.log('已保存。当前关键值:');
  console.log('  displayHeight =', c.displayHeight);
  console.log('  sleepMs       =', c.timeline.sleepMs);
  console.log('  features      =', JSON.stringify(c.features));
}

async function cmdReset() {
  const c = await post('/config/reset', {});
  console.log('已恢复默认: displayHeight=' + c.displayHeight + ' sleepMs=' + c.timeline.sleepMs);
}

async function cmdDiag() {
  await post('/cmd', { name: 'diag' });
  await new Promise((r) => setTimeout(r, 2500));
  const d = await get('/diag');
  console.log('构建      :', d.build);
  console.log('尺寸/形态 :', d.displayHeight + 'px', '| force=' + String(d.outfitsForce));
  console.log('拖动/说话 :', 'drag=' + d.dragEnabled, 'chat=' + d.chatEnabled);
  console.log('吉吉币    :', d.coins.balance, '（累计', d.coins.total, '已花', d.coins.spent, '）');
  console.log('');
  console.log('皮肤目录：');
  for (const s of d.catalog) {
    console.log(' ', (s.owned ? '[已解锁]' : '[锁定  ]'), s.id.padEnd(11), String(s.price).padStart(4), '币');
  }
  const cl = d.client;
  if (!cl) { console.log('\n客户端未回报（可能没刷新）'); return; }
  console.log('');
  console.log('客户端回报 :', cl.build, '| 当前形态', cl.form, '| 贴图', cl.spriteCount, '张');
  console.log('当前形态可取图:', cl.formSpriteOk, '| wrap 数', cl.wraps, '| 面板卡片', cl.cards);
  console.log('缺贴图的皮肤:', cl.missingSkins && cl.missingSkins.length ? cl.missingSkins.join(', ') : '（无）');
  const bad = (cl.skins || []).filter((s) => !s.hasSprite);
  if (bad.length) { console.log('注意：'); bad.forEach((b) => console.log('  -', b.id, '缺少', b.key)); }
}

async function cmdSelfTest() {
  await post('/cmd', { name: 'selftest' });
  process.stdout.write('已请求客户端自检，等待结果');
  for (let i = 0; i < 20; i += 1) {
    await new Promise((r) => setTimeout(r, 1000));
    const r = await get('/selftest');
    if (r && r.at && Date.now() - r.at < 30000) {
      console.log('\n客户端版本: ' + (r.v || '?'));
      let fail = 0;
      for (const item of r.results) {
        if (!item.pass) fail += 1;
        const mark = item.pass ? '[OK]' : '[FAIL]';
        console.log(mark + ' ' + item.name + (item.detail ? '  ' + item.detail : ''));
      }
      console.log('\n' + (r.results.length - fail) + '/' + r.results.length + ' 通过');
      process.exitCode = fail ? 1 : 0;
      return;
    }
    process.stdout.write('.');
  }
  console.log('\n超时：客户端没有回传（页面可能没刷新/没挂载）');
  process.exitCode = 1;
}

async function cmdPlay(name) {
  if (!ACTIONS.includes(name)) throw new Error(`未知动作: ${name}（可用: ${ACTIONS.join(', ')}）`);
  await post('/cmd', { name });
  console.log('已发送动作:', name, '（页面 2 秒内响应）');
}

/** 一键体检：走一遍开关、端点、配置往返 */
async function cmdCheck() {
  const results = [];
  const ok = (name, pass, detail = '') => results.push({ name, pass, detail });

  const t0 = Date.now();
  try {
    const cfg = await get('/config');
    ok('GET /config', true, `${Date.now() - t0}ms`);
    ok('配置结构完整', ['displayHeight', 'timeline', 'layout', 'brick', 'seat', 'features'].every((k) => k in cfg));
    ok('功能开关齐全', Object.values(cfg.features).every((v) => typeof v === 'boolean'));
  } catch (e) {
    ok('GET /config', false, e.message);
  }

  try {
    const st = await get('/state');
    ok('GET /state', true, st.phase);
  } catch (e) {
    ok('GET /state', false, e.message);
  }

  try {
    const stats = await get('/stats');
    ok('GET /stats', true, `${fmtTokens(stats.tokens)} tokens`);
  } catch (e) {
    ok('GET /stats', false, e.message);
  }

  // 资源引用检查：SPRITES.xxx 必须存在
  try {
    const fs = await import('node:fs');
    const src = fs.readFileSync(PLUGIN_JS, 'utf8');
    const anchor = src.indexOf('const SPRITES = ');
    if (anchor < 0) throw new Error('no sprite table');
    let depth = 0, end = -1;
    for (let k = src.indexOf('{', anchor); k < src.length; k += 1) {
      if (src[k] === '{') depth += 1;
      else if (src[k] === '}') { depth -= 1; if (!depth) { end = k; break; } }
    }
    if (end < 0) throw new Error('sprite table broken');
    const table = JSON.parse(src.slice(src.indexOf('{', anchor), end + 1));
    const keys = new Set(Object.keys(table));
    const used = new Set();
    for (const r of src.matchAll(/SPRITES\.([A-Za-z0-9_]+)/g)) used.add(r[1]);
    for (const r of src.matchAll(/SPRITES\['([A-Za-z0-9_]+)'\]/g)) used.add(r[1]);
    const prefixes = new Set();
    for (const r of src.matchAll(/SPRITES\['([A-Za-z0-9_]+)' \+ /g)) prefixes.add(r[1]);
    const bad = [...used].filter((k) => !keys.has(k));
    for (const p of prefixes) {
      const hasFamily = [...keys].some((k) => k.startsWith(p));
      if (!hasFamily) bad.push(p + '*');
    }
    ok('资源引用有效', bad.length === 0, bad.length ? 'undefined: ' + bad.join(',') : used.size + ' refs');
  } catch (e) {
    ok('资源引用有效', false, e.message);
  }

  // 离线加载客户端产物：模块注册 / apply / 组件
  try {
    const { execFileSync } = await import('node:child_process');
    const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check_client.mjs'), PLUGIN_JS], { encoding: 'utf8' });
    ok('客户端可加载', out.includes('全部通过'), '模块/插槽/组件 正常');
  } catch (e) {
    ok('客户端可加载', false, (e.message || '').split('\n')[0]);
  }

  // 发布前体检：语法 / 占位符 / 宿主可加载（零副作用）
  try {
    const { execFileSync } = await import('node:child_process');
    const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'preflight.mjs')], { encoding: 'utf8' });
    ok('preflight', out.includes('全部通过'), '语法/占位符/加载');
  } catch (e) {
    ok('preflight', false, String(e.stdout || e.message).split('\n').slice(-3).join(' ').slice(0, 120));
  }

  // 静态功能校验：产物里该有的关键标记
  try {
    const fs = await import('node:fs');
    const clientPath = PLUGIN_JS;
    const src = fs.readFileSync(clientPath, 'utf8');
    const need = {
      '四季待机': /"idle[0-3]":/,
      '闭眼帧': /"blink[0-3]":/,
      '打字姿势': /"typing[0-3]":/,
      '打字闭眼': /"typingblink[0-3]":/,
      '睡衣三姿态': /"pajama[0-2]":/,
      '生气四向': /"angry[0-3]":/,
      '走路四帧': /"walk[0-3]":/,
      '金砖': /"brick":/,
      '思考泡': /"think":/,
      '悬停卡图标': /"iconCoin":/,
      '换装判定': /formSprite/,
      '季节/夜间': /currentForm/,
      '碎碎念': /LINES =/,
      '点击反应': /onPoke/,
      '视力保护': /dsh-sitter-runner/,
      '满屏监督': /dsh-sitter-veil/,
    };
    const missing = Object.entries(need).filter(([, re]) => !re.test(src)).map(([k]) => k);
    ok('功能完整性', missing.length === 0, missing.length ? '缺: ' + missing.join('、') : Object.keys(need).length + ' 项齐全');
    ok('测试面板已移除', !src.includes('dsh-sitter-test'));
  } catch (e) {
    ok('功能完整性', false, e.message);
  }

  // 配置往返：写入 → 读回 → 还原（原样恢复文件，绝不把测试值留在用户配置里）
  try {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const npath = await import('node:path');
    const cfgPath = npath.join(os.homedir(), '.dsh', 'dsh-sitter', 'config.json');
    const backup = fs.existsSync(cfgPath) ? fs.readFileSync(cfgPath) : null;

    const mark = 87 + Math.floor(Math.random() * 40);
    const written = await post('/config', { displayHeight: mark });
    const readBack = await get('/config');
    ok('配置写入往返', written.displayHeight === mark && readBack.displayHeight === mark, `写 ${mark} 读 ${readBack.displayHeight}`);

    // 还原：有备份就写回原字节，没有就删掉（避免留下 displayHeight 覆盖面板设置）
    if (backup) fs.writeFileSync(cfgPath, backup);
    else if (fs.existsSync(cfgPath)) {
      const cur = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      delete cur.displayHeight;
      if (Object.keys(cur).length) fs.writeFileSync(cfgPath, JSON.stringify(cur, null, 2), 'utf8');
      else fs.rmSync(cfgPath, { force: true });
    }
  } catch (e) {
    ok('配置写入往返', false, e.message);
  }

  // 指令通道
  try {
    const r = await post('/cmd', { name: 'blink' });
    ok('指令通道', r.ok === true, r.cmd?.name);
  } catch (e) {
    ok('指令通道', false, e.message);
  }

  const pad = Math.max(...results.map((r) => r.name.length));
  let failed = 0;
  for (const r of results) {
    if (!r.pass) failed += 1;
    console.log(`${r.pass ? '✅' : '❌'} ${r.name.padEnd(pad)}  ${r.detail}`);
  }
  console.log(`\n${results.length - failed}/${results.length} 通过`);
  process.exitCode = failed ? 1 : 0;
}

const [cmd, ...rest] = process.argv.slice(2);
const run = {
  status: cmdStatus,
  config: cmdConfig,
  set: () => cmdSet(rest),
  reset: cmdReset,
  play: () => cmdPlay(rest[0]),
  selftest: cmdSelfTest,
  diag: cmdDiag,
  check: cmdCheck,
}[cmd || 'status'];

if (!run) {
  console.log('用法: node scripts/pet-cli.mjs status|config|set|reset|play|check');
  process.exit(1);
}

run().catch((e) => {
  console.error('失败:', e.message);
  process.exit(1);
});
