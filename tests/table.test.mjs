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

// ---- code / verdict ----
const { codeSpec, tokenizeCode, CodeBlock, VerdictBlock } = api.__test;

// 25 行不截断，只给内部滚动
const long = { language: 'js', code: Array.from({ length: 25 }, (_, i) => 'const v' + i + ' = ' + i + ';').join('\n') };
const longSpec = codeSpec(long);
assert.equal(longSpec.rawLines.length, 25, 'long code is not truncated');
assert.equal(longSpec.scroll, true, 'long code scrolls inside the block');
assert.equal(longSpec.showNumbers, true, 'long code shows line numbers');

// 行号阈值
assert.equal(codeSpec({ code: 'a\nb' }).showNumbers, false, 'short code hides line numbers');
assert.equal(codeSpec({ code: Array.from({ length: 13 }, () => 'x').join('\n') }).showNumbers, true, '13 lines turns numbers on');

// # 只在 shell/python 一类里算注释
const cTokens = tokenizeCode('#include <x.h>', 'c');
assert.equal(cTokens.some((t) => t.t === 'c'), false, 'C preprocessor line is not a comment');
const pyComment = tokenizeCode('# note', 'python');
assert.equal(pyComment[0].t, 'c', 'python hash starts a comment');

// 字符串里的 # 不染成注释
const pyString = tokenizeCode('x = "a # b"', 'python');
assert.ok(pyString.some((t) => t.t === 's' && t.v.includes('#')), 'hash inside a string stays a string');

// 渲染骨架
const codeTree = CodeBlock({ block: { language: 'js', code: 'const a = 1;\nreturn a;', highlight: [2] } });
const pres = all(codeTree, (n) => n.type === 'pre');
assert.equal(pres.length, 1, 'code block renders one pre');
const langNode = all(codeTree, (n) => n.props.className === 'rc-code-lang')[0];
assert.equal(langNode.kids[0], 'js', 'language label is rendered');
const copy = all(codeTree, (n) => n.type === 'button')[0];
assert.equal(copy.props['aria-label'], 'Copy code', 'copy button is labelled');
assert.equal(all(codeTree, (n) => n.props['data-hl'] === '1').length, 1, 'highlighted line is marked');
assert.ok(all(codeTree, (n) => n.props.className === 'tk-k').length > 0, 'keywords are tinted');

// verdict
assert.equal(VerdictBlock({ block: {} }), null, 'empty verdict renders nothing');
const vTree = VerdictBlock({ block: { text: '根因是 CORS 预检失败。' } });
assert.equal(vTree.props['data-tone'], 'warn', 'verdict defaults to warn');
const vLabel = all(vTree, (n) => n.props.className === 'rc-verdict-t')[0];
assert.equal(vLabel.kids[0], '核心问题', 'verdict label defaults to 核心问题');
console.log('CODE-OK');
console.log('VERDICT-OK');
