/**
 * 宿主侧：为挂件提供今日统计与实时状态。
 * GET /stats 今日 token / 活跃分钟数
 * GET /state 当前是否在干活、最近一次出错、turn 起止
 * @module @local/dsh-sitter
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

const BUILD_VERSION = '20261122-221546';
const PORT_CANDIDATES = [43717, 43718, 43719, 43720];
const PORT = PORT_CANDIDATES[0];
const DEFAULTS = {"displayHeight": 83, "embedHeight": 180, "embedHeightSmall": 64, "debug": false, "outfits": {"count": 4, "hoodieIndex": 1, "force": null, "seasonMode": "season", "giftFrameMs": 90}, "timeline": {"sleepMs": 30000, "frameMs": 380, "blinkMs": 130, "blinkMinGapMs": 3500, "blinkMaxGapMs": 6500, "typingHoldMs": 900, "typingFrameMs": 220, "workHoldMs": 800, "dozeMs": 1800000}, "layout": {"initialLift": 26, "seatInset": 44, "topPad": 30, "freeLeft": null, "freeTop": null, "dragEnabled": true, "say": {"gapX": 0.04, "gapY": 0.05, "maxW": 1.12}, "think": {"x": 0.6, "y": 0.02, "size": 0.24}, "sleepBubble": {"x": 0.84, "y": 0.26, "size": 0.24}}, "brick": {"height": 20, "overlap": 4, "sink": 3}, "seat": {"buttRatio": 0.38}, "features": {"blink": true, "typing": true, "workLink": true, "hoverCard": true, "think": true, "outfits": true, "pacifier": true, "legacy": {"panic": true, "desktop": false, "physics": false, "tray": false, "voice": false, "chat": false, "todo": false, "balance": false, "weather": false}}, "resetAt": 0, "escalate": {"enabled": true, "idleMs": 180000, "stepMs": 10000}, "night": {"from": 23, "to": 7}, "break": {"enabled": true, "workMs": 2400000, "runMs": 7000, "rounds": 3, "text": "小宝贝，歇一会儿眼睛吧～"}, "chat": {"enabled": true, "intervalMs": 75000, "durationMs": 4500, "quietFrom": 1, "quietTo": 7}, "love": {"points": 0}};
const CONFIG_DIR = path.join(os.homedir(), '.dsh', 'dsh-sitter');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const REMINDER_FILE = path.join(CONFIG_DIR, 'reminders.json');
const STATS_CACHE_MS = 60000;
const TAIL_BYTES = 512 * 1024;
const ACTIVE_WINDOW_MS = 120000;
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

let statsCache = null;
let statsAt = 0;
let newestCache = { file: null, at: 0 };
let lastCommand = null;
let lastHello = null;
let lastClientError = null;
let lastSelfTest = null;
let statsPending = null;
let stateCache = null;
let stateAt = 0;
const STATE_CACHE_MS = 1500;

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function listSessionFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const q = path.join(dir, e.name);
      if (e.isDirectory()) walk(q);
      else if (e.name.endsWith('.zstd')) out.push(q);
    }
  };
  walk(root);
  return out;
}

function decodeFrames(buf) {
  const pos = [];
  let i = 0;
  for (;;) {
    const k = buf.indexOf(MAGIC, i);
    if (k < 0) break;
    pos.push(k);
    i = k + 4;
  }
  const parts = [];
  for (let n = 0; n < pos.length; n += 1) {
    const start = pos[n];
    const end = n + 1 < pos.length ? pos[n + 1] : buf.length;
    try { parts.push(zlib.zstdDecompressSync(buf.subarray(start, end))); } catch {}
  }
  return Buffer.concat(parts).toString('utf8');
}

function parseEvents(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    try { out.push(JSON.parse(line)); } catch {}
  }
  return out;
}

function newestSessionFile(root) {
  const now = Date.now();
  if (newestCache.file && now - newestCache.at < 5000) return newestCache.file;
  let best = null;
  let bestM = 0;
  for (const f of listSessionFiles(root)) {
    try {
      const m = fs.statSync(f).mtimeMs;
      if (m > bestM) { bestM = m; best = f; }
    } catch {}
  }
  newestCache = { file: best, at: now };
  return best;
}

function readTailEvents(file, bytes = TAIL_BYTES) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - bytes);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    return parseEvents(decodeFrames(buf));
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * 找「最近一次 turn/start」不能只看固定尾巴。
 * 一个 turn 里工具调用一多，turn/start 就落到 512KB 之外，于是 phase 永远 idle，
 * 宠物不会跟着干活。这里按需把窗口放大：512KB → 2MB → 8MB，找到就停。
 */
function readTailEventsWithTurn(file) {
  let events = [];
  for (const bytes of [TAIL_BYTES, 2 * 1024 * 1024, 8 * 1024 * 1024]) {
    events = readTailEvents(file, bytes);
    if (events.some((ev) => ev && ev.type === 'turn/start')) return events;
    try {
      if (fs.statSync(file).size <= bytes) break;   // 文件本来就这么小，再大也没用
    } catch { break; }
  }
  return events;
}

function lastCallConfig(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i];
    const cfg = ev && ev.type === 'request/header' ? ev?.data?.header?.config : null;
    if (cfg && cfg.provider && cfg.model) return { provider: cfg.provider, model: cfg.model };
  }
  return null;
}

function lastUserText(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i];
    if (!ev || ev.type !== 'user/message') continue;
    const kind = ev?.data?.source?.kind;
    if (kind && kind !== 'user') continue;
    const content = ev?.data?.content;
    if (!Array.isArray(content)) continue;
    const text = content
      .filter((x) => x && x.type === 'text')
      .map((x) => String(x.text || ''))
      .join(' ')
      .trim();
    if (text) return text.slice(0, 160);
  }
  return '';
}

function computeState() {
  const root = path.join(os.homedir(), '.dsh', 'sessions');
  const file = newestSessionFile(root);
  if (!file) return { phase: 'idle', reason: 'no-session', updatedAt: Date.now() };

  let events;
  try { events = readTailEventsWithTurn(file); } catch { return { phase: 'idle', reason: 'read-failed', updatedAt: Date.now() }; }

  let last = null;
  let lastErrorAt = 0;
  let turnStartAt = 0;
  let turnEndAt = 0;
  for (const ev of events) {
    if (!ev || typeof ev.type !== 'string') continue;
    last = ev;
    if (ev.type === 'turn/start') turnStartAt = ev.time || 0;
    if (ev.type === 'turn/end') turnEndAt = ev.time || 0;
    if (ev.type === 'tool/result') {
      const err = ev?.data?.isError ?? ev?.data?.error ?? ev?.data?.failed;
      if (err) lastErrorAt = ev.time || 0;
    }
  }

  const now = Date.now();
  const lastTime = last?.time || 0;
  const fresh = now - lastTime < ACTIVE_WINDOW_MS;
  const busy = turnStartAt > turnEndAt && fresh;

  return {
    phase: busy ? 'busy' : 'idle',
    lastType: last?.type || null,
    lastUser: lastUserText(events),
    lastTime,
    lastErrorAt,
    turnStartAt,
    turnEndAt,
    updatedAt: now,
  };
}

async function computeStatsAsync() {
  const since = todayStart();
  const root = path.join(os.homedir(), '.dsh', 'sessions');
  const files = (await listSessionFilesAsync(root)).filter(async (f) => f);
  const candidates = [];
  for (const f of files) {
    try {
      const st = await fsp.stat(f);
      if (st.mtimeMs >= since) candidates.push(f);
    } catch { /* skip */ }
  }

  const results = await Promise.all(candidates.map(async (f) => {
    try {
      const buf = await fsp.readFile(f);
      return decodeFrames(buf);
    } catch {
      return '';
    }
  }));

  let tokens = 0;
  const minutes = new Set();
  for (const text of results) {
    for (const ev of parseEvents(text)) {
      const tt = ev?.time;
      if (typeof tt !== 'number' || tt < since) continue;
      minutes.add(Math.floor(tt / 60000));
      if (ev.type === 'assistant/message') {
        const total = ev?.data?.usage?.totalTokens;
        if (typeof total === 'number') tokens += total;
      }
    }
  }
  return { tokens, activeMinutes: minutes.size, sessions: candidates.length, updatedAt: Date.now() };
}

async function listSessionFilesAsync(root) {
  const out = [];
  const walk = async (dir) => {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const q = path.join(dir, e.name);
      if (e.isDirectory()) await walk(q);
      else if (e.name.endsWith('.zstd')) out.push(q);
    }
  };
  await walk(root);
  return out;
}

function computeStats() {
  const since = todayStart();
  const root = path.join(os.homedir(), '.dsh', 'sessions');
  const files = listSessionFiles(root).filter((f) => {
    try { return fs.statSync(f).mtimeMs >= since; } catch { return false; }
  });

  let tokens = 0;
  const minutes = new Set();

  for (const f of files) {
    let text;
    try { text = decodeFrames(fs.readFileSync(f)); } catch { continue; }
    for (const ev of parseEvents(text)) {
      const tt = ev?.time;
      if (typeof tt !== 'number' || tt < since) continue;
      minutes.add(Math.floor(tt / 60000));
      if (ev.type === 'assistant/message') {
        const total = ev?.data?.usage?.totalTokens;
        if (typeof total === 'number') tokens += total;
      }
    }
  }

  return { tokens, activeMinutes: minutes.size, sessions: files.length, updatedAt: Date.now() };
}

function dayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function readReminders() {
  try {
    return JSON.parse(fs.readFileSync(REMINDER_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/** 记录一次提醒，返回今天的累计次数。 */
function bumpReminder() {
  const all = readReminders();
  const key = dayKey();
  all[key] = (all[key] || 0) + 1;
  // 只保留最近 60 天
  const keys = Object.keys(all).sort();
  while (keys.length > 60) {
    delete all[keys.shift()];
  }
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(REMINDER_FILE, JSON.stringify(all, null, 2), 'utf8');
  } catch {
    /* ignore */
  }
  return all[key];
}

const COIN_FILE = path.join(CONFIG_DIR, 'coins.json');
const COIN_PER_MIN = 10;      // 每 10 分钟学习 = 1 枚吉吉币

function readCoins() {
  try { return JSON.parse(fs.readFileSync(COIN_FILE, 'utf8')); }
  catch { return { day: dayKey(), minutes: 0, total: 0, spent: 0, unlocked: [] }; }
}

function writeCoins(v) {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(COIN_FILE, JSON.stringify(v), 'utf8');
  } catch { /* ignore */ }
}

function settleCoins(todayMinutes) {
  const v = readCoins();
  const today = dayKey();
  if (v.day !== today) { v.day = today; v.minutes = 0; v.awardedToday = 0; }
  // 老数据没有 awardedToday：按今天的时长初始化，避免重复入账
  if (typeof v.awardedToday !== 'number') {
    v.awardedToday = Math.floor((v.minutes || 0) / COIN_PER_MIN);
  }
  if (typeof todayMinutes === 'number' && todayMinutes > (v.minutes || 0)) v.minutes = todayMinutes;
  const earnedToday = Math.floor((v.minutes || 0) / COIN_PER_MIN);
  if (earnedToday > v.awardedToday) {
    // 只把"今天新增的部分"累加到 total —— 之前是把 total 直接写成 earnedToday，
    // 导致第二天 earnedToday 变小以后永远赚不到币。
    v.total = (v.total || 0) + (earnedToday - v.awardedToday);
    v.awardedToday = earnedToday;
  } else if (earnedToday < v.awardedToday) {
    v.awardedToday = earnedToday;      // 当天时长被重置时不倒扣
  }
  writeCoins(v);
  return v;
}

/** 皮肤目录：价格来自"每天 3 小时 ≈ 18 币"的节奏 */
// 商店目录：由构建期从 scripts/pet/skins.json 注入（唯一真源，不再手写）
const SKIN_CATALOG = [{"id": "caveman", "name": "原始人", "price": 20, "desc": "兽皮背心 + 骨头发簪", "emoji": "🦴"}, {"id": "muscle", "name": "肌肉男", "price": 45, "desc": "上半身赤裸的腱子肉", "emoji": "💪"}, {"id": "wolf", "name": "兽人·狼", "price": 70, "desc": "灰毛耳朵 + 尾巴", "emoji": "🐺"}, {"id": "fox", "name": "兽人·狐", "price": 70, "desc": "橙毛尖耳 + 大尾巴", "emoji": "🦊"}, {"id": "bear", "name": "兽人·熊", "price": 80, "desc": "圆耳朵 + 小短尾", "emoji": "🐻"}, {"id": "cat", "name": "兽人·猫", "price": 70, "desc": "软软的猫耳", "emoji": "🐱"}, {"id": "genderbend", "name": "性转", "price": 110, "desc": "另一个自己", "emoji": "🪞"}, {"id": "snake", "name": "蛇人", "price": 90, "desc": "蛇耳 + 竖瞳 + 翠绿长尾", "emoji": "🐍"}, {"id": "dragon", "name": "龙人", "price": 150, "desc": "龙角 + 小龙翼 + 青龙尾", "emoji": "🐲"}, {"id": "whale", "name": "鲸人", "price": 200, "desc": "鲸鳍耳 + 喷水孔 + 鲸尾", "emoji": "🐋"}, {"id": "qipao", "name": "旗袍", "price": 130, "desc": "酒红改良旗袍 + 金发簪", "emoji": "👘"}, {"id": "ultra", "name": "光之巨人", "price": 160, "desc": "银红战衣 + 胸口计时器", "emoji": "✨"}];

function buySkin(id) {
  const item = SKIN_CATALOG.find((s) => s.id === id);
  if (!item) return { error: 'unknown-skin' };
  const v = readCoins();
  const unlocked = Array.isArray(v.unlocked) ? v.unlocked : [];
  if (unlocked.includes(id)) return { error: 'already-owned', items: SKIN_CATALOG, coins: coinsInfo(), unlocked };
  const balance = Math.max(0, (v.total || 0) - (v.spent || 0));
  if (balance < item.price) return { error: 'not-enough', need: item.price - balance, coins: coinsInfo() };
  v.spent = (v.spent || 0) + item.price;
  v.unlocked = unlocked.concat([id]);
  writeCoins(v);
  try { saveConfig({ outfits: { force: id } }); } catch { /* ignore */ }
  return { ok: true, item, coins: coinsInfo(), equipped: id };
}

/** 诊断：把能自证的东西一次吐出来 */
let DIAG_CLIENT = null;

function diagInfo() {
  const cfg = resolveConfig();
  const coins = coinsInfo();
  const unlocked = Array.isArray(coins.unlocked) ? coins.unlocked : [];
  return {
    build: BUILD_VERSION,
    port: PORT_CANDIDATES[0],
    configFile: CONFIG_FILE,
    sessionDir: path.join(os.homedir(), '.dsh', 'sessions'),
    displayHeight: cfg.displayHeight,
    outfitsForce: cfg.outfits?.force ?? null,
    dragEnabled: !!cfg.layout?.dragEnabled,
    chatEnabled: !!cfg.chat?.enabled,
    escalate: !!cfg.escalate?.enabled,
    coins,
    catalog: SKIN_CATALOG.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      owned: unlocked.includes(s.id),
      spriteKey: 'skin_' + s.id,
    })),
    reminders: todayReminders(),
    lastClientError,
    lastSelfTest: lastSelfTest ? { at: lastSelfTest.at, v: lastSelfTest.v, fails: (lastSelfTest.results || []).filter((r) => !r.pass) } : null,
    client: DIAG_CLIENT,
  };
}

function skinsInfo() {
  const v = readCoins();
  const unlocked = Array.isArray(v.unlocked) ? v.unlocked : [];
  return {
    items: SKIN_CATALOG.map((s) => ({
      ...s,
      owned: unlocked.includes(s.id),
      affordable: (coinsInfo().balance >= s.price),
    })),
    unlocked,
    coins: coinsInfo(),
    equipped: resolveConfig().outfits?.force ?? null,
  };
}

function equipSkin(id) {
  const v = readCoins();
  const unlocked = Array.isArray(v.unlocked) ? v.unlocked : [];
  // 季节装(0-3)与睡衣本来就有，不需要解锁；只有商店皮肤才校验
  const isSkin = typeof id === 'string' && SKIN_CATALOG.some((s) => s.id === id);
  if (isSkin && !unlocked.includes(id)) return { error: 'not-owned' };
  const next = saveConfig({ outfits: { force: id } });
  return { ok: true, equipped: next.outfits?.force ?? null, skins: skinsInfo() };
}

function coinsInfo() {
  const v = readCoins();
  const total = Math.max(0, v.total || 0);
  const spent = Math.max(0, v.spent || 0);
  return { total, spent, balance: Math.max(0, total - spent), minutes: v.minutes || 0, unlocked: Array.isArray(v.unlocked) ? v.unlocked : [] };
}

function todayReminders() {
  return readReminders()[dayKey()] || 0;
}

function handle(req, res) {
  try {
    handleInner(req, res);
  } catch (e) {
    try {
      res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'internal', message: String((e && e.message) || e) }));
    } catch { /* ignore */ }
    try {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.writeFileSync(path.join(CONFIG_DIR, 'handler-error.log'), String((e && e.stack) || e), 'utf8');
    } catch { /* ignore */ }
  }
}

function handleInner(req, res) {
  const origin = String(req.headers.origin || '');
  const localOrigin = origin === ''
    || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)
    || /^dsh-app:\/\/[A-Za-z0-9._-]+$/.test(origin);
  if (!localOrigin) {
    res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' });
    res.end('{"error":"origin not allowed"}');
    return;
  }
  const headers = {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  const url = req.url || '';
  try {
    if (url.startsWith('/config')) {
      if (req.method === 'POST') {
        readBody(req, (patch) => {
          try {
            const next = url.startsWith('/config/reset')
              ? (fs.rmSync(CONFIG_FILE, { force: true }), resolveConfig())
              : saveConfig(patch);
            res.writeHead(200, headers);
            res.end(JSON.stringify(next));
          } catch (e) {
            res.writeHead(400, headers);
            res.end(JSON.stringify({ error: String((e && e.message) || e) }));
          }
        });
        return;
      }
      res.writeHead(200, headers);
      res.end(JSON.stringify(resolveConfig()));
      return;
    }
    if (url.startsWith('/selftest')) {
      // 封印断言：总闸关闭时，vendor/dsh-pet 必须一个模块都没加载过
      try {
        const sealed = legacySealed(resolveConfig());
        const loadedAny = LEGACY_LOADED && Object.keys(LEGACY_LOADED).length > 0;
        if (sealed && loadedAny) {
          try {
            fs.appendFileSync(path.join(CONFIG_DIR, 'handler-error.log'),
              '[seal-violation] 封印状态下加载了 vendor 模块: ' + Object.keys(LEGACY_LOADED).join(',') + '\n');
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      if (req.method === 'POST') {
        readBody(req, (body) => {
          lastSelfTest = { results: Array.isArray(body?.results) ? body.results : [], at: Date.now(), v: String(body?.v || '') };
          try {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
            fs.writeFileSync(path.join(CONFIG_DIR, 'selftest.json'), JSON.stringify(lastSelfTest, null, 2), 'utf8');
          } catch { /* ignore */ }
          res.writeHead(200, headers);
          res.end('{"ok":true}');
        });
        return;
      }
      res.writeHead(200, headers);
      res.end(JSON.stringify(lastSelfTest || {}));
      return;
    }
    if (url.startsWith('/client-error')) {
      if (req.method === 'POST') {
        readBody(req, (body) => {
          lastClientError = { msg: String(body?.msg || ''), stack: String(body?.stack || ''), at: Date.now() };
          try {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
            fs.writeFileSync(path.join(CONFIG_DIR, 'client-error.log'), JSON.stringify(lastClientError, null, 2), 'utf8');
          } catch { /* ignore */ }
          res.writeHead(200, headers);
          res.end('{"ok":true}');
        });
        return;
      }
      res.writeHead(200, headers);
      res.end(JSON.stringify(lastClientError || {}));
      return;
    }
    if (url.startsWith('/hello')) {
      if (req.method === 'POST') {
        readBody(req, (body) => {
          lastHello = { v: String(body?.v || '?'), at: Date.now() };
          res.writeHead(200, headers);
          res.end(JSON.stringify({ ok: true }));
        });
        return;
      }
      res.writeHead(200, headers);
      res.end(JSON.stringify(lastHello || {}));
      return;
    }
    if (url.startsWith('/cmd')) {
      if (req.method === 'POST') {
        readBody(req, (body) => {
          const name = typeof body?.name === 'string' ? body.name : '';
          if (!name) {
            res.writeHead(400, headers);
            res.end('{"error":"missing name"}');
            return;
          }
          lastCommand = { name, at: Date.now() };
          res.writeHead(200, headers);
          res.end(JSON.stringify({ ok: true }));
        });
        return;
      }
      res.writeHead(200, headers);
      res.end(JSON.stringify(lastCommand || {}));
      return;
    }
    if (url.startsWith('/state')) {
      // 命令只投递一次：取走就清空，避免刷新后重放（hidepet 会让宠物永远回不来）
      const pendingCmd = lastCommand;
      if (pendingCmd) lastCommand = null;
      const now = Date.now();
      if (!stateCache || now - stateAt > STATE_CACHE_MS) {
        stateCache = computeState();
        stateAt = now;
      }
      res.writeHead(200, headers);
      res.end(JSON.stringify({ ...stateCache, cmd: pendingCmd }));
      return;
    }
    if (url.startsWith('/reminder')) {
      if (req.method === 'POST') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({ reminders: bumpReminder(), day: dayKey() }));
        return;
      }
      res.writeHead(200, headers);
      res.end(JSON.stringify({ reminders: todayReminders(), day: dayKey() }));
      return;
    }
    if (url.startsWith('/diag')) {
      if (url.startsWith('/diag/report') && req.method === 'POST') {
        readBody(req, (body) => {
          DIAG_CLIENT = { at: Date.now(), ...(body || {}) };
          try {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
            fs.writeFileSync(path.join(CONFIG_DIR, 'diag-client.json'), JSON.stringify(DIAG_CLIENT, null, 2), 'utf8');
          } catch { /* ignore */ }
          res.writeHead(200, headers);
          res.end('{"ok":true}');
        });
        return;
      }
      res.writeHead(200, headers);
      res.end(JSON.stringify(diagInfo()));
      return;
    }
    if (url.startsWith('/skins')) {
      if (url.startsWith('/skins/buy') && req.method === 'POST') {
        readBody(req, (body) => {
          const r = buySkin(String(body?.id || ''));
          res.writeHead(200, headers);
          res.end(JSON.stringify({ ...r, skins: skinsInfo() }));
        });
        return;
      }
      if (url.startsWith('/skins/equip') && req.method === 'POST') {
        readBody(req, (body) => {
          const r = equipSkin(body?.id ? String(body.id) : null);
          res.writeHead(200, headers);
          res.end(JSON.stringify(r));
        });
        return;
      }
      res.writeHead(200, headers);
      res.end(JSON.stringify(skinsInfo()));
      return;
    }
    if (url.startsWith('/coins')) {
      res.writeHead(200, headers);
      res.end(JSON.stringify(coinsInfo()));
      return;
    }
    if (url.startsWith('/stats')) {
      const now = Date.now();
      if (statsCache && now - statsAt <= STATS_CACHE_MS) {
        res.writeHead(200, headers);
        res.end(JSON.stringify({ ...statsCache, reminders: todayReminders(), coins: coinsInfo() }));
        return;
      }
      if (!statsPending) {
        statsPending = computeStatsAsync()
          .then((s) => { statsCache = s; statsAt = Date.now(); if (s && typeof s.activeMinutes === 'number') settleCoins(s.activeMinutes); })
          .catch(() => { statsCache = { tokens: 0, activeMinutes: 0, sessions: 0, degraded: true }; statsAt = Date.now(); })
          .finally(() => { statsPending = null; });
      }
      statsPending.then(() => {
        try {
          res.writeHead(200, headers);
          res.end(JSON.stringify({ ...statsCache, reminders: todayReminders(), coins: coinsInfo() }));
        } catch (e) {
          reportHandlerError(e);
        }
      });
      return;
    }
    res.writeHead(404, headers);
    res.end('{"error":"not found"}');
  } catch (e) {
    res.writeHead(500, headers);
    res.end(JSON.stringify({ error: String((e && e.message) || e) }));
  }
}

const MAX_BODY = 64 * 1024;

/** 异步回调里抛错会绕过 handle() 的 try/catch，直接把宿主进程带走（code 1 → 应用重启）。
 *  所以：回调只允许调用一次，且异常必须就地吞掉记日志，绝不能二次调用 done。 */
function reportHandlerError(e) {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(path.join(CONFIG_DIR, 'handler-error.log'), String((e && e.stack) || e), 'utf8');
  } catch { /* ignore */ }
}

function readBody(req, done) {
  let raw = '';
  let over = false;
  let called = false;
  const once = (value) => {
    if (called) return;
    called = true;
    try {
      done(value);
    } catch (e) {
      // 响应可能已经发出去一半了，这里只能记日志，绝不能再调一次 done
      reportHandlerError(e);
    }
  };
  req.on('data', (c) => {
    if (over) return;
    raw += c;
    if (raw.length > MAX_BODY) {
      over = true;
      raw = '';
    }
  });
  req.on('error', () => once({}));
  req.on('end', () => {
    if (over) { once({}); return; }
    let value = {};
    try { value = raw ? JSON.parse(raw) : {}; } catch { value = {}; }
    once(value);
  });
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** 只合并默认配置里存在的键，避免用户写错字段污染配置。 */
function mergeKnown(base, over) {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  if (!isPlainObject(over)) return out;
  for (const k of Object.keys(over)) {
    if (!(k in base)) continue;
    const b = base[k];
    const o = over[k];
    if (isPlainObject(b) && isPlainObject(o)) out[k] = mergeKnown(b, o);
    else if (b === null && (o === null || ['string', 'number', 'boolean'].includes(typeof o))) out[k] = o;
    else if (typeof b === typeof o) out[k] = o;
  }
  return out;
}

/** 按默认配置的结构校验，把 patch 合并进用户配置。 */
function mergeInto(target, over, schema) {
  const out = isPlainObject(target) ? { ...target } : {};
  if (!isPlainObject(over)) return out;
  for (const k of Object.keys(over)) {
    if (!(k in schema)) continue;
    const s = schema[k];
    const o = over[k];
    if (isPlainObject(s) && isPlainObject(o)) out[k] = mergeInto(out[k], o, s);
    else if (s === null && (o === null || ['string', 'number', 'boolean'].includes(typeof o))) out[k] = o;
    else if (typeof s === typeof o) out[k] = o;
  }
  return out;
}

function readUserConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

const DSH_PET_CONFIG = path.join(os.homedir(), '.dsh', 'dsh-pet', 'main-config.jsonc');

/** 读 dsh-pet 的配置（JSONC：去掉注释和尾逗号），拿它的 size 当我们的基准 */
/** 读桌面面板里那只宠物的整套设置（位置/偏移/开关） */
function readDshPetPanel() {
  try {
    const raw = fs.readFileSync(DSH_PET_CONFIG, 'utf8').replace(/^\uFEFF/, '');
    const noBlock = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    const noLine = noBlock.replace(/(^|[^:])\/\/.*$/gm, '$1');
    const noTail = noLine.replace(/,(\s*[}\]])/g, '$1');
    const obj = JSON.parse(noTail);
    const pet = Array.isArray(obj?.pets) && obj.pets[0];
    if (!pet) return null;
    return {
      size: Number(pet.size) || null,
      corner: String(pet?.position?.corner || 'bottom-right'),
      marginX: Number(pet?.position?.marginX) || 0,
      marginY: Number(pet?.position?.marginY) || 0,
      fixed: !!pet.fixedEnabled,
      whisper: !!pet.whisperEnabled,
      workLink: !!pet.workStatusEnabled,
      balance: !!pet.balanceEnabled,
    };
  } catch {
    return null;
  }
}

function readDshPetSize() {
  try {
    const raw = fs.readFileSync(DSH_PET_CONFIG, 'utf8').replace(/^\uFEFF/, '');
    const noBlock = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    const noLine = noBlock.replace(/(^|[^:])\/\/.*$/gm, '$1');
    const noTail = noLine.replace(/,(\s*[}\]])/g, '$1');
    const obj = JSON.parse(noTail);
    const pet = Array.isArray(obj?.pets) && obj.pets[0];
    const size = Number(pet?.size);
    return Number.isFinite(size) && size > 0 ? size : null;
  } catch {
    return null;
  }
}

function resolveConfig() {
  const merged = mergeKnown(DEFAULTS, readUserConfig());
  // 用户在 dsh-sitter 自己的配置里没写 displayHeight 时，跟随桌面面板的 size
  const userCfg = readUserConfig();
  if (!(userCfg && typeof userCfg.displayHeight === 'number')) {
    const size = readDshPetSize();
    if (size) {
      merged.displayHeight = Math.max(40, Math.min(140, Math.round(size / 6)));
    }
  }
  const panel = readDshPetPanel();
  if (panel) merged.panel = panel;
  if (panel && panel.size && !(userCfg && typeof userCfg.displayHeight === 'number')) {
    merged.displayHeight = Math.max(40, Math.min(140, Math.round(panel.size / 6)));
  }
  return merged;
}


// ───────── 内置历史模块的封印守卫 ─────────
// 见 80_docs/LEGACY-SEAL.md：默认全封印，只有显式打开子开关且总闸为 false 时才允许加载。
let LEGACY_LOADED = null;

function legacySealed(cfg) {
  const legacy = (cfg && cfg.features && cfg.features.legacy) || {};
  return legacy.panic !== false;      // panic 默认 true = 封印
}

function legacyFeatureOn(cfg, key) {
  if (legacySealed(cfg)) return false;
  const legacy = (cfg && cfg.features && cfg.features.legacy) || {};
  return legacy[key] === true;
}

/** 唯一允许加载 vendor 的入口：封印时直接返回 null，绝不 import */
async function loadLegacy(cfg, key) {
  if (!legacyFeatureOn(cfg, key)) return null;
  if (LEGACY_LOADED && LEGACY_LOADED[key]) return LEGACY_LOADED[key];
  try {
    const mod = await import('./vendor/dsh-pet/lib/index.js');
    LEGACY_LOADED = LEGACY_LOADED || {};
    LEGACY_LOADED[key] = mod;
    return mod;
  } catch (e) {
    try { fs.appendFileSync(path.join(CONFIG_DIR, 'handler-error.log'), String(e && e.stack || e) + '\n'); } catch { /* ignore */ }
    return null;                      // 失败只降级，绝不让宿主崩
  }
}

function saveConfig(patch) {
  const next = mergeInto(readUserConfig(), isPlainObject(patch) ? patch : {}, DEFAULTS);
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf8');
  return resolveConfig();
}

let HOST_CTX = null;
export function apply(ctx) {
  const server = http.createServer(handle);
  let idx = 0;
  let listening = false;

  const logPort = (port) => {
    try {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.writeFileSync(path.join(CONFIG_DIR, 'port.txt'), String(port), 'utf8');
    } catch { /* ignore */ }
  };

  const tryListen = () => {
    if (idx >= PORT_CANDIDATES.length) {
      try {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
        fs.writeFileSync(path.join(CONFIG_DIR, 'server-error.log'), 'all candidate ports busy', 'utf8');
      } catch { /* ignore */ }
      return;
    }
    server.listen(PORT_CANDIDATES[idx], '127.0.0.1', () => {
      listening = true;
      logPort(PORT_CANDIDATES[idx]);
    });
  };

  server.on('error', (e) => {
    if (!listening) {
      idx += 1;
      tryListen();
      return;
    }
    try {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.writeFileSync(path.join(CONFIG_DIR, 'server-error.log'), String((e && e.stack) || e), 'utf8');
    } catch { /* ignore */ }
  });

  tryListen();
  if (ctx && typeof ctx.effect === 'function') ctx.effect(() => () => server.close());
}
