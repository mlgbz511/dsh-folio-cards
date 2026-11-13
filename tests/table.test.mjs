import assert from 'node:assert';

let mod = null;
globalThis.window = { __ModuleLoader__: { load: (m) => { mod = m; } } };
await import('../client.js');

const React = {
  createElement: (type, props, ...kids) => ({ type, props: props || {}, kids }),
  useState: (v) => [v, () => {}],
  useMemo: (fn) => fn(),
};
const api = mod.factory((name) => {
  if (name === 'react') return React;
  throw new Error('unexpected require: ' + name);
});
const { tableSpec, Table } = api.__test;

// children 常以数组形式传入，walk 必须先摊平
const walk = (node, visit) => {
  if (Array.isArray(node)) { for (const item of node) walk(item, visit); return; }
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const kid of node.kids || []) walk(kid, visit);
};
const all = (root, pred) => {
  const hits = [];
  walk(root, (n) => { if (n && n.type && pred(n)) hits.push(n); });
  return hits;
};

// 1) 3 列 1 行：无滚动壳、无 sticky
const small = { headers: ['方案', '上下文', '策略'], rows: [['桌面端', '1M', '常驻']] };
const smallTree = Table({ block: small });
assert.equal(all(smallTree, (n) => String(n.props.className).includes('rc-table-scroll')).length, 1, 'every table gets a scroll container');
assert.equal(all(smallTree, (n) => String(n.props.className).includes('rc-table-scroll-tall')).length, 0, 'small table must not cap its height');
assert.equal(all(smallTree, (n) => String(n.props.className).includes('rc-table-sticky')).length, 0, 'small table must not pin first column');

// 2) 4 列 8 行：滚动壳 + sticky
const rows8 = Array.from({ length: 8 }, (_, i) => ['r' + i, '1' + i, 'site-' + i, 'ok']);
const big = { headers: ['方案', '上下文', '区域', '策略'], rows: rows8 };
const bigTree = Table({ block: big });
assert.equal(all(bigTree, (n) => String(n.props.className).includes('rc-table-scroll-tall')).length, 1, 'big table caps its height');
assert.ok(all(bigTree, (n) => String(n.props.className).includes('rc-table-sticky')).length > 0, '4 columns must pin first column');

// 3) 分组行
const grouped = { headers: ['A', 'B'], rows: [['1', '2'], { group: 'Section' }, ['3', '4']] };
const spec = tableSpec(grouped);
assert.deepEqual(spec.entries.map((e) => (e.group ? 'group:' + e.group : 'row')), ['row', 'group:Section', 'row']);
const groupTree = Table({ block: grouped });
const groupRow = all(groupTree, (n) => n.props.className === 'rc-table-group')[0];
assert.ok(groupRow, 'group row rendered');
const groupCell = all(groupRow, (n) => n.type === 'td')[0];
assert.equal(groupCell.props.colSpan, 2, 'group cell spans the table');

// 4) 数值列右对齐
const numeric = { headers: ['方案', '首字延迟'], rows: [['桌面端', '0.8 s'], ['移动端', '1.4 s']] };
assert.deepEqual(tableSpec(numeric).align, ['left', 'right'], 'numeric column right-aligned');
const numTree = Table({ block: numeric });
const numHeaders = all(numTree, (n) => n.type === 'th' && n.props.className === 'n');
assert.equal(numHeaders.length, 1, 'numeric header carries the n class');

// 5) data-label 与表头一致
const labels = all(numTree, (n) => n.type === 'td').map((n) => n.props['data-label']);
assert.deepEqual(labels, ['方案', '首字延迟', '方案', '首字延迟'], 'every cell carries its header label');

// 6) 空/畸形输入不崩
assert.equal(tableSpec({ rows: [] }), null);
assert.equal(Table({ block: { headers: [], rows: [] } }), null);

console.log('TABLE-OK');