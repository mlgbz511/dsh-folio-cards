import assert from 'node:assert';

// 渲染层测试：把 Card 产出的元素树真正求值（函数组件递归展开），
// 断言五种块都落到了 DOM 形状上。表/代码/verdict 都是组件，只数 props 不算数。
let mod = null;
globalThis.window = { __ModuleLoader__: { load: (m) => { mod = m; } } };
globalThis.document = {
  createElement: () => ({ setAttribute() {}, style: {}, appendChild() {}, querySelector: () => null }),
  head: { appendChild() {} },
  body: { appendChild() {}, removeChild() {} },
  querySelectorAll: () => [],
};
globalThis.MutationObserver = class { observe() {} disconnect() {} };
await import('../client.js');

const React = {
  createElement: (type, props, ...kids) => ({ type, props: props || {}, kids }),
  Fragment: 'FRAGMENT',
  useState: (v) => [v, () => {}],
  useMemo: (fn) => fn(),
  useRef: (v) => ({ current: v }),
  useEffect: () => {},
  useCallback: (fn) => fn(),
};
const api = mod.factory((name) => {
  if (name === 'react') return React;
  if (name === 'react-dom/client') return { createRoot: () => ({ render() {}, unmount() {} }) };
  return new Proxy({}, { get: () => () => ({}) });
});
const { Card } = api.__test;

// 展开：数组摊平，函数组件调用一次，Fragment 透传
const flatten = (node) => {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (node === null || node === undefined || typeof node !== 'object') return [];
  if (typeof node.type === 'function') return flatten(node.type(node.props));
  if (node.type === 'FRAGMENT') return flatten(node.kids);
  return [node, ...(node.kids || []).flatMap(flatten)];
};

const spec = {
  title: '为什么这段代码会 CORS 失败',
  kicker: '排障 · 浏览器',
  accent: 'amber',
  layout: 'card',
  lead: '预检被拒，浏览器把真实请求拦在本地。',
  blocks: [
    { type: 'verdict', title: '核心问题', text: '服务端没有返回 Access-Control-Allow-Origin。' },
    { type: 'code', language: 'js', title: 'fetch.js', highlight: [3], code: 'fetch(url, {\n  method: POST,\n});' },
    { type: 'table', headers: ['检查项', '结果'], rows: [['响应头', '缺失'], { group: '补充' }, ['预检方法', '未允许']] },
    { type: 'callout', tone: 'warn', title: '别改前端', text: '加 Origin 是服务端的事。' },
    { type: 'bullets', items: ['先看 OPTIONS 状态码', '再看 Allow-Headers'] },
  ],
};

const nodes = flatten(Card({ spec }));
const count = (pred) => nodes.filter((n) => n.type && pred(n)).length;
const byClass = (cls) => count((n) => n.props.className === cls);

assert.equal(nodes[0].type, 'article', 'card root is an article');
assert.equal(byClass('rc-verdict'), 1, 'verdict block renders');
assert.equal(count((n) => n.props.className === 'rc-verdict-t'), 1, 'verdict label renders');
assert.equal(count((n) => String(n.props.className || '') === 'rc-code rc-code-scroll' || n.props.className === 'rc-code'), 1, 'code block renders');
assert.equal(count((n) => n.type === 'pre'), 1, 'code block renders one pre');
assert.equal(count((n) => n.props['aria-label'] === 'Copy code'), 1, 'copy button is present');
assert.equal(byClass('rc-table-shell'), 1, 'table block renders');
assert.equal(count((n) => n.props.className === 'rc-table-group'), 1, 'group row survives the card path');
assert.equal(byClass('rc-callout'), 1, 'callout still renders');
assert.equal(count((n) => n.type === 'li'), 2, 'bullets still render');


// 展示密度：开关只裁块，不重发包；三档各自可见的块数正确
const countMode = (mode) => {
  globalThis.window.localStorage = { getItem: () => (mode === 'full' ? null : mode) };
  const nodes = flatten(Card({ spec }));
  return {
    callout: nodes.filter((n) => n.props && n.props.className === 'rc-callout').length,
    verdict: nodes.filter((n) => n.props && n.props.className === 'rc-verdict').length,
    code: nodes.filter((n) => n.props && n.props.className === 'rc-code').length,
    toggle: nodes.filter((n) => n.props && n.props.className === 'rc-density').length,
    pressed: nodes
      .filter((n) => n.type === 'button' && n.props && n.props['aria-pressed'] === 'true')
      .length,
  };
};

const full = countMode('full');
const mid = countMode('mid');
const lean = countMode('lean');

assert.equal(full.toggle, 1, 'one density control per card');
assert.equal(full.pressed, 1, 'exactly one mode is pressed');
assert.equal(full.code, 1, 'full keeps the code block');
assert.equal(mid.code, 1, 'mid keeps the code block');
assert.equal(mid.callout, 0, 'mid drops callouts');
assert.equal(full.callout, 1, 'full keeps callouts');
assert.equal(lean.verdict, 1, 'lean keeps the verdict');
assert.equal(lean.code, 0, 'lean drops the code block');
assert.equal(lean.callout, 0, 'lean drops callouts');

delete globalThis.window.localStorage;
console.log('RENDER-OK');
