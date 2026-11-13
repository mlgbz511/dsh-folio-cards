# 表格块实施计划 · V5 Notion 骨架 + mix 四件套

日期：2026-11-13 · 目标仓库：`E:\workSpace\dsh_wksp\rich-cards`（dsh-folio-cards 1.0.0）
原型：`E:\workSpace\dsh_wksp\prototypes\dsh-card-table-variants.html`（V5 + mix 小节）

## 1. 目标概述

给卡片新增 `table` 块类型，让「多列对照数据」不再硬塞进 `kv` 的两列。

设计基线 = 原型 V5（低对比全网格、无斑马、灰表头、分组软胶囊、圆角 6px 外包壳），叠加 mix 小节四个可组合件：

1. 首列 sticky（横向滚动时行标签不丢）
2. 数值右对齐 + `tabular-nums`（按列自动判定）
3. 表头吸顶（仅行数 > 6、表格进入内部滚动时）
4. 窄屏（< 640px）退化为键值堆叠

不改动 `kv` / `stats` / `timeline` 行为；新块类型对旧卡片完全向后兼容（旧 spec 里没有 table，行为不变）。

## 2. 用户审核项

> [!IMPORTANT]
> **假设：骨架取 V5。** 你上一轮说「应用 mix」，而 mix 小节是挂在 V5 上的装饰件。若你要的其实是 V2 骨架 + mix，CSS 换 6 行即可，JS 不动 —— 现在改口成本最低。

> [!WARNING]
> **表头吸顶需要内部滚动容器。** 卡片本身不限高，因此在无容器的情况下 `position: sticky` 无效。方案是**按行数分支**：行数 > 6 时外包 `max-height: 320px; overflow: auto`，否则不加壳。副作用：行数多时卡片内会出现第二层滚动条。

> [!IMPORTANT]
> **分组的数据形态需要拍板。** 计划采用「`rows` 里允许混入 `{"group": "常驻节点"}` 对象」的写法，好处是不改顶层字段、单行即可表达分组；坏处是 `rows` 元素类型不统一。备选：顶层加 `groups: [{ title, at }]`，更干净但 schema 更复杂。

> [!WARNING]
> **窄屏堆叠依赖 `data-label`。** 为让 `td` 折叠后仍知道自己是哪一列，渲染时要把表头写到单元格的 `data-label` 属性上。这是新增 DOM 属性，但只读、无脚本执行面。

## 3. 变更清单

### [MODIFY] client.js · CSS（插在 `@media (prefers-reduced-motion: reduce)` 之前，第 406 行前）

新增约 40 行：`.rc-table-shell`（1px `--dsw-alias-border-l1` 低对比外框、6px 圆角）、`.rc-table-scroll`（仅在 JS 判定需要时挂上）、`.rc-table` 本体（`border-collapse: separate; border-spacing: 0`）、`thead th`（吸顶 + 灰小字 + `letter-spacing: .08em`）、`td/th` 的 `border-right`/`border-bottom`（均用 `color-mix(in oklab, var(--dsw-alias-border-l1) 60%, transparent)`，比现有 `--rc-accent` 系更淡）、`td.n { text-align: right; font-variant-numeric: tabular-nums }`、`tr:hover` 4% 提亮、首列 sticky（`left: 0` + 不透明 `background: var(--dsw-alias-bg-layer-1)`）、分组行 `.rc-table-group` 的软胶囊，以及 `@media (max-width: 640px)` 下 `table/thead/tbody/tr/td` 转 `display: block` + `td::before { content: attr(data-label) }`。

不引入任何新颜色变量，全部复用现有 `--dsw-alias-*` 与 `--rc-accent`。

### [MODIFY] client.js · JS（`renderRow` 之后、`Figure` 之前插入；`renderBlock` 的 kv 分支后加 dispatch）

新增约 45 行、三个纯函数：

- `tableAlign(headers, rows)`：逐列判断是否「所有非空单元格都像数字」（`/^[\d.,%\s¥$+\-—/~]+$/`），是则该列右对齐；`block.align` 显式给出时以其为准。
- `tableRows(block)`：把 `rows` 归一为 `{ kind: 'group', title }` 或 `{ kind: 'row', cells }` 序列；缺格补空串、多格截断、非字符串项 `text()` 化。
- `Table(props)`：算出是否需要滚动壳（`rows.length > 6`）、是否 sticky 首列（`headers.length >= 4`），渲染 `table` 并给每个 `td` 写 `data-label`。

`renderBlock` 里加：

```js
if (type === 'table') return renderTable(block, key);
```

### [MODIFY] index.js · GUIDE（第 32 行块类型清单 + 新增一条字段说明）

- 块类型行补 `table (headers + rows, string cells only)`；
- 新增一条：`table` 最多 5 列 / 12 行，单元格纯文本、不得含 `|` 与换行，`rows` 里可放 `{"group": "名称"}` 作分组行；窄屏会自动折叠为键值堆叠，不需要模型自己判断宽度。

### [MODIFY] package.json

`version` 1.0.0 → 1.1.0。

### [NEW] docs/plans/2026-11-13_table-block-mix.md

本文件。

### 不动

`README.md` 的块类型表暂不改（等实现完一起补，避免文档先漂）；`assets`/`icon` 不涉及；宿主端零新工具、零新网络调用。

## 4. 验证计划

### 自动化校验

```sh
node --check client.js && node --check index.js
```

外加一个断言脚本（跑完即删，不留测试框架）：

1. 用 stub React（只记录 type/props/children）直接调 `Table`，断言：
   - 4 列 3 行 → 无滚动壳、无 sticky 首列；
   - 4 列 8 行 → 有滚动壳、有 sticky 首列；
   - `rows` 混入 `{"group":"A"}` → 输出分组行且列数正确；
   - 数值列 `0.8 s / 1.4 s / 3.2 s` → 该列带 `n` class；
   - 每格 `props['data-label']` 等于对应表头；
2. 回归：同脚本再喂 `kv` / `stats` / `timeline` 三个老块，断言输出结构与改动前一致（先记录基线再比对）。

### 人工验证

1. 重启 App，在新会话里问一个**多列对照**问题（例：「三种部署方式的上下文、首字延迟、策略对比」），确认模型主动写出 `table` 块；
2. 手写一张 8 行的卡验证表头吸顶与首列 sticky；
3. 窗口拖到 600px 以下，确认整表变堆叠且每格带列名；
4. 旧会话里的历史卡片仍正常渲染（新块类型不改旧结构）。

## 5. 回滚

单提交回滚：`git revert <sha>`；或删掉 `table` dispatch 与 CSS 段，GUIDE 相应条目一并删，即回到 1.0.0 行为。

---

🛑 **执行门禁**：方案已制定完毕，在收到明确确认（回复「确认」或「proceed」）前，我不会修改任何代码或执行写操作。

---

## 实施说明（2026-11-13 追加）

基座已从硬化分叉切到**上游快照**（`fe6a86e`），仓库改用自有远端 `dsh-folio-cards`，历史以 graft 接在 1.0.0 之后（远端保留 `legacy-hardened` 分支）。本计划已按此基座落地：

- `client.js`：CSS（`.rc-table-shell` / `.rc-table-scroll` / `.rc-table` / `.rc-table-sticky` / `.rc-table-group` / 窄屏折叠）；JS `tableAlignOf` / `tableSpec` / `Table` / `renderTable`；`renderBlock` 一行 dispatch；额外导出 `__test` 供断言。
- `index.js`：GUIDE 块类型补 `table`，新增一条字段约束（≤5 列 ≤12 行、纯文本、可分组的 `{"group": ...}` 行）。
- `package.json`：`1.2.4` → `1.3.0`。
- `tests/table.test.mjs`：6 组断言（不滚动 / 滚动+sticky / 分组跨列 / 数值右对齐 / data-label / 畸形输入）。
