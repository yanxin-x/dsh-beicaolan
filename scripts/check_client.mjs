#!/usr/bin/env node
/**
 * 离线加载 + 真实渲染一遍客户端组件。
 * 用 vm + React stub 模拟浏览器，捕获模块初始化、apply、以及渲染期异常。
 */
import fs from 'node:fs';
import vm from 'node:vm';

const FILE = process.argv[2] || 'dsh-sitter/client.js';
const src = fs.readFileSync(FILE, 'utf8');

let captured = null;
const sandbox = {
  window: { __ModuleLoader__: { load: (mod) => { captured = mod; } }, innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1 },
  console,
  setTimeout: (fn) => { try { fn(); } catch { /* 不递归 */ } return 0; },
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  requestAnimationFrame: (fn) => { try { fn(); } catch { /* ignore */ } return 0; },
  cancelAnimationFrame: () => {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  fetch: () => Promise.reject(new Error('offline')),
  Image: class { set src(v) { if (this.onload) { try { this.onload(); } catch { /* ignore */ } } } },
  MutationObserver: class { observe() {} disconnect() {} },
  Date, Math, JSON, Object, Array, String, Number, Boolean, Promise, RegExp, Error, isNaN, parseInt, parseFloat,
};
sandbox.document = {
  hidden: false,
  body: { appendChild() {} },
  querySelector: () => null,
  documentElement: {},
  createElement: () => ({ style: {}, appendChild() {}, remove() {} }),
};
sandbox.globalThis = sandbox;
sandbox.window.document = sandbox.document;
sandbox.window.localStorage = sandbox.localStorage;

// React stub：createElement 直接执行函数式组件，便于把整棵树立即渲染一遍
const hookStates = [];
let hookIndex = 0;
const React = {
  createElement(type, props, ...children) {
    return { type, props: props || {}, children };
  },
  Component: class {
    constructor(props) { this.props = props; this.state = {}; }
    setState(s) { Object.assign(this.state, typeof s === 'function' ? s(this.state) : s); }
  },
  useState(init) {
    const i = hookIndex++;
    if (!(i in hookStates)) hookStates[i] = typeof init === 'function' ? init() : init;
    return [hookStates[i], (v) => { hookStates[i] = typeof v === 'function' ? v(hookStates[i]) : v; }];
  },
  useRef(v) { return { current: v }; },
  useEffect() {}, useLayoutEffect() {},
  useMemo: (fn) => fn(),
  useCallback: (fn) => fn,
};

const requireStub = (id) => {
  if (id === 'react') return React;
  if (id === 'react-dom') return { createPortal: (node) => node };
  if (id === 'react-dom/client') return { createRoot: () => ({ render() {} }) };
  throw new Error('unexpected require: ' + id);
};

const imageUrls = [];

function renderTree(el, depth = 0) {
  if (el == null || depth > 12) return;
  if (Array.isArray(el)) { el.forEach((c) => renderTree(c, depth + 1)); return; }
  if (typeof el !== 'object') return;
  const { type, props, children } = el;
  if (props && props.style && props.style.backgroundImage) {
    imageUrls.push(String(props.style.backgroundImage));
  }
  if (typeof type === 'function') {
    if (type.prototype && type.prototype.render) {
      const inst = new type(props);
      inst.props = props;
      inst.state = inst.state || {};
      renderTree(inst.render(), depth + 1);
      return;
    }
    renderTree(type(props), depth + 1);
    return;
  }
  (children || []).forEach((c) => renderTree(c, depth + 1));
}

vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: FILE });
if (!captured) { console.error('❌ 没有调用 __ModuleLoader__.load'); process.exit(1); }
console.log('✅ 模块已注册:', captured.id);

const mod = captured.factory(requireStub);
if (typeof mod.apply !== 'function') { console.error('❌ 缺少 apply()'); process.exit(1); }

let registered = null;
mod.apply({
  slots: {
    inject: (name, fn) => fn(),
    register: (opts, comp) => { registered = { opts, comp }; return () => {}; },
  },
  effect: (fn) => fn(),
  on: () => {},
});

if (!registered) { console.error('❌ 没有注册组件'); process.exit(1); }
console.log('✅ 插槽已注册:', registered.opts.id);

const collectUrls = (el, depth = 0) => {
  if (el == null || depth > 12) return;
  if (Array.isArray(el)) { el.forEach((c) => collectUrls(c, depth + 1)); return; }
  if (typeof el !== 'object') return;
  const st = el.props && el.props.style;
  if (st && st.backgroundImage) imageUrls.push(String(st.backgroundImage));
  const st2 = el.props && el.props.style && el.props.style.background;
  if (st2) imageUrls.push(String(st2));
  (el.children || []).forEach((c) => collectUrls(c, depth + 1));
};

try {
  hookIndex = 0;
  const tree = registered.comp();
  renderTree(tree);
  collectUrls(tree);
  const bad = imageUrls.filter((u) => u.includes('undefined'));
  if (bad.length) {
    console.error('❌ 发现 undefined 图片地址:', bad.slice(0, 3));
    process.exit(1);
  }
  console.log('✅ 组件渲染通过（无异常）｜图片地址', imageUrls.length, '个，无 undefined');
} catch (e) {
  console.error('❌ 渲染异常:', e && e.message);
  console.error((e && e.stack || '').split('\n').slice(0, 6).join('\n'));
  process.exit(1);
}

console.log('\n全部通过');
