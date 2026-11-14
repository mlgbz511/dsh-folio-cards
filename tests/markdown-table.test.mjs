import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// 静态安全断言：这段「给 DSH 原生 markdown 表格套皮」的 CSS 必须满足安全约束，
// 一旦有人加上 !important、裸 table 选择器或去掉 :where() 包裹，这个测试就红。
const repo = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(repo, 'client.js'), 'utf8');
// 注释里允许出现 !important 这个字样（例如说明「为什么不用」），规则体里不许
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');

// 1) 必须存在探针开关
assert.ok(source.includes('data-folio-mdtable-probe'), 'probe attribute present');
// 皮肤当前是停用状态：规则被包在不生效的 media 外壳里，探针也不注册
assert.ok(source.includes('@media (min-width: 100000px)'), 'skin wrapped in an inert media query');
assert.ok(source.includes('MD_TABLE_SKIN = false'), 'probe stays off while the skin is disabled');

// 2) 新皮肤段内禁止 !important（样式表其它历史规则不受这条约束）
const skinAt = code.indexOf("class*='tableScroll'");
assert.ok(skinAt > 0, 'skin block located');
const skin = code.slice(skinAt - 400);
assert.ok(!/!important/.test(skin), 'no !important inside the markdown-table skin');

// 3) 不允许裸 table 选择器（必须是 :where(...) 包裹的容器后代）
const nakedTable = /(^|\n)\s*table\s*\{/.test(source);
assert.equal(nakedTable, false, 'no naked "table {" rule');

// 4) 至少三条 :where() 表格规则
// 命中用的选择器必须是查证过的 CSS Module 局部名子串
assert.ok(code.includes("class*='tableScroll'"), 'targets tableScroll wrapper');
assert.ok(code.includes("class*='tableFill'"), 'targets tableFill wrapper');
// 外框必须画在包裹层上（画在 table 上会被滚动容器裁掉边角）
assert.ok(/:where\(div\[class\*='tableScroll'\][^{]*\{[^}]*border: 1px solid/.test(code), 'wrapper carries the outer border');
assert.ok(code.includes('border-top-left-radius'), 'corner cells are rounded');
// 首列不许再强制单行/最小宽度：那样会把长内容挤出行盒，出现文字重叠
const firstCol = /th:first-child, table:not\(\.rc-table\) td:first-child\) \{([\s\S]*?)\}/.exec(code);
assert.ok(firstCol, 'first-column rule present');
assert.ok(!/white-space:\s*nowrap/.test(firstCol[1]), 'first column wraps again');
assert.ok(!/min-width:\s*(?!0\b)[0-9]/.test(firstCol[1]), 'first column has no forced min-width');
assert.ok(!/table:not\(\.rc-table\)\) \{[^}]*border-radius: 6px/.test(code), 'table itself no longer carries a radius');
// 这两类选择器在本构建里不存在（会静默失效），禁止再用
assert.ok(!code.includes('[data-markdown]'), 'drops the non-existent [data-markdown]');
assert.ok(!/\s\.markdown\s/.test(code), 'drops the non-existent .markdown container');
const whereRules = (code.match(/:where\(/g) || []).length;
assert.ok(whereRules >= 8, ':where() used throughout: ' + whereRules);

// 5) 折叠规则在 640px 媒体查询里
assert.ok(/@media \(max-width: 640px\)/.test(source), '640px media query present');

// 6) 皮肤段必须带可检索的注释头，方便整段删除
assert.ok(source.includes('markdown-table skin') || source.includes('markdown 表格皮肤') || source.includes('MD-TABLE-SKIN'), 'skin block is labelled');

console.log('MDTABLE-OK');
