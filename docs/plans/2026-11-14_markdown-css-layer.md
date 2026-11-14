# 主题层：插件 CSS 只盖 Markdown 排版

日期：2026-11-14 · 目标 2.6.0 · 前置：2.5.1（`/depth` 已上线）

## 1. 目标概述

卡片已有的排版语言（低对比网格表、去装饰标题、克制引用轨、统一圆角代码块）只作用于 `card` 围栏。本方案加一层**默认关闭、可运行时开关**的纯 CSS 覆盖，把原生 Markdown 正文的排版改成同一套语言。

不做：不替换渲染器、不改解析结果、不动表格宽度机制、不碰卡片自身的 `.rc-*` 样式。

## 2. 调研结论（已在本机 `app.asar` 与 profile 实读，纠正旧计划）

旧计划 [2026-11-14_markdown-theme.md](./2026-11-14_markdown-theme.md) 的 `[data-markdown]` 前提是**错的**：全包 22 处命中都是 `data-markdown-variant`，且该属性只在 `variant="compact"` 时写出，正文根节点上没有。

实测到的稳定锚点：

| 目标 | 实证 DOM | 来源 |
|---|---|---|
| 正文根 | `div`，class 来自 CSS Module：`_markdown_<hash>_<n>`（已见 `_markdown_rve47_5`） | asar 内 CSS 规则 `._markdown_rve47_5 li > *` |
| 紧凑变体 | 同节点上 `data-markdown-variant="compact"` | 渲染函数 `className: de(Mt.markdown, l==="compact" && Mt.compact)` |
| 代码块 | **字面量** class `md-code-block`，附 `data-line-numbers` / `data-code-wrap`，内有 `pre` | 渲染函数与插件既有 `.md-code-block` 用法 |
| 表格 | 外层 `div` 带 `md-table-wide`（宽表）或 module class，内层裸 `table`、`thead th`、`tbody td` | asar 内 `md-table-wide` 规则与渲染函数 |
| 宽表出血 | 依赖 `--dsh-chat-content-width` / `--dsh-table-lead` 负边距 | 同上 |

结论：外层只能锚到 `[class*="_markdown_"]`（哈希在 `_markdown_` 之后变化，前缀稳定），表格/代码块可锚到字面量。**锚不到就整层无效果，不报错**（fail-open）。

## 3. 用户审核项

> [!IMPORTANT]
> **默认关闭。** 全局排版改动会影响所有历史会话显示。开关落在客户端 `localStorage['dsh.folio.md']`，客户端启动读一次，之后可用 `window.__folioMarkdown(true|false)` 即时切。**不做设置页 UI**（需注入 ui-settings，成本单独立项）。

> [!WARNING]
> **选择器依赖哈希前缀。** 上游若把 CSS Module 类名改成别的形态（不再以 `_markdown_` 开头），本层静默失效。这是有意的 fail-open：不报错、不破版、不写 `!important` 强压。

> [!WARNING]
> **不动表格宽度。** 宽表靠负边距出血到聊天栏外，本层只改颜色/边框/内边距；任何 `width/max-width/margin` 改动都可能破坏出血布局，禁止。

> [!WARNING]
> **compact 变体单独处理。** `data-markdown-variant="compact"`（概览/侧栏预览）只吃颜色类规则；标题尺寸、块间距一律用 `:not([data-markdown-variant="compact"])` 排除，避免压扁紧凑视图。

> [!IMPORTANT]
> **工作区当前 read-only。** 落盘 `client.js` / `tests/` / `package.json` 需要一次写入权限升级（approval 提示）。确认方案后我再申请，不在本轮擅自写入。

## 4. 拟定变更清单

### [MODIFY] `client.js`

- 新增常量 `const CSS_MD = \`...\``（约 55 行），紧邻现有 `CSS` 常量；`apply()` 里 `style.textContent = CSS + CSS_MD`（一行改动）。
- 每条规则前缀固定 `[data-folio-md='1']`，二级作用域 `[class*="_markdown_"]`；不写裸选择器，不用 `!important`。
- 开关引导：`apply()` 内读 `localStorage.getItem('dsh.folio.md') === '1'` 决定是否给 `document.documentElement` 设 `data-folio-md="1"`；定义 `window.__folioMarkdown = (on) => {...}` 同步写 localStorage 与属性；`ctx.effect(() => () => {...})` 清理属性、函数与 style 节点。
- 排版规则（草案，全部只用插件已在用的令牌 `--dsw-alias-label-primary` / `--dsw-alias-border-l1` / `--dsw-alias-bg-layer-1`，其余颜色用 `color-mix(in oklab, ...)` 从这两个令牌派生，避免依赖未验证的 `-l2` 令牌）：
  - 标题：`h1..h4` 上下间距 26/10px，`letter-spacing: -.01em`，`font-weight: 600`；
  - 段落：`line-height: 1.78`，`margin: 10px 0`；列表 `padding-left: 20px`，`li + li` 间距 4px；
  - 表格：`border-collapse: separate; border-spacing: 0`；表头 `color-mix(... 5%, transparent)` 底；单元格 `0.5px solid var(--dsw-alias-border-l1)` 下边线；`th/td` 内边距 8px 10px；无斑马纹；`tbody tr:hover` 极淡提亮；
  - 代码：`.md-code-block` 圆角 10px、1px `--dsw-alias-border-l1` 边框、`padding: 12px 0`；块间距 `14px 0`（非 compact）；行内 `code` 圆角 4px、极淡底；
  - 引用：`border-left: 2px` + `color-mix(in oklab, var(--dsw-alias-label-primary) 18%, transparent)`，去默认灰底；
  - `hr`：`0.5px`、`--dsw-alias-border-l1`。

### [NEW] `tests/markdown-layer.test.mjs`

静态断言（不搭 DOM 假件，纯文本扫描 `client.js`）：

1. 存在 `CSS_MD` 常量，且 `style.textContent` 同时拼接 `CSS` 与 `CSS_MD`；
2. `CSS_MD` 内每条含 `{` 的规则行都带 `[data-folio-md='1']` 前缀；
3. 全文 `!important` 计数为 0；
4. 不存在裸 `table {` / `pre {` / `:is(h1,h2,h3,h4) {` 开头规则（必须以属性前缀起头）；
5. 存在 `__folioMarkdown` 与 `dsh.folio.md` 两个字符串；
6. `CSS_MD` 不含 `width` / `max-width` / `margin-left: calc`（守住宽表出血不被改）。

### [MODIFY] `README.md` / `package.json`

- 版本 2.6.0；README 增「Markdown 排版层」小节：默认关闭、开启方式（控制台 `__folioMarkdown(true)` 或 `localStorage.setItem('dsh.folio.md','1')` 后刷新）、已知不覆盖项（宽表宽度、HTML 内联、mermaid 容器）。
- 提示词区（`GUIDE`）不改：本层是客户端视觉，与深度/提示词无关。

## 5. 验证计划

### 自动化

```sh
node --check client.js && node --check index.js
node tests/table.test.mjs && node tests/code.test.mjs && node tests/verdict.test.mjs
node tests/render.test.mjs && node tests/depth.test.mjs && node tests/watch.test.mjs
node tests/markdown-layer.test.mjs
```

### 人工（实现时按序做，第 1 步是前置门禁）

1. DevTools 选中一条助手回答的正文根节点，确认 `class` 命中 `[class*="_markdown_"]`；**不命中则先改这一个选择器常量，再往下做**；
2. `__folioMarkdown(true)`：历史会话标题/段落/表格/代码块/引用即时换样；刷新后仍生效（localStorage 回读）；
3. `__folioMarkdown(false)`：恢复原样，页面无残留属性、无残留样式节点（`document.querySelectorAll('style[data-dsh-folio-cards]')` 数量不变）；
4. 宽表（>5 列）滚动与出血行为与开启前完全一致（对比截图）；
5. 侧栏 Markdown 预览（compact）不被压扁：标题尺寸与块间距与原样式一致，仅颜色微调；
6. 亮/暗各看一遍，确认 `color-mix` 在两种背景下对比度都够。

## 6. 回滚

删 `CSS_MD` 常量与 `+ CSS_MD` 拼接、开关引导三处（一个连续区块），或 `git revert`。属性缺失时全部规则不生效，回滚粒度天然安全。

## 7. 明确的边界

- 只管视觉；不改 Markdown 解析、不改 AST、不做每文件/每会话主题；
- 不覆盖：宽表宽度与出血、`dangerouslySetInnerHTML` 的 HTML 内联块、mermaid 容器、图片尺寸；
- 上游 DOM 变更时静默失效，不做运行时嗅探/报警；
- 不做设置页开关（等 ui-settings 注入方案）。

---

🛑 **执行门禁**：方案已写完。收到「确认」或「proceed」前不动任何代码；确认后第一步是 DOM 选择器复核，复核不通过就回来改方案而不是硬写。
