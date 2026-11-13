# 主题层：接管原生 Markdown 显示

日期：2026-11-14 · 目标 2.3.0（依赖 2.2.0 的 depth 设置先落地）

## 1. 目标概述

现在的插件只管 `card` 围栏；**正文里的 Markdown（标题、段落、表格、代码、引用）仍是 DSH 原生样式**。本计划加一层**可开关的主题覆盖**，用纯 CSS 把原生 Markdown 的排版语言改成与卡片一致：

- 标题：去掉花哨装饰，回到「字号 + 字重 + 间距」三级层次；
- 表格：低对比网格、灰表头、无斑马（与 `table` 块同一套）；
- 代码：`md-code-block` 的圆角/边框/背景与卡片 `code` 块对齐，等宽字体一致；
- 引用：4px 强调轨代替默认左侧灰线；
- 段落行高与字距对齐卡片正文。

**不替换渲染器**：不做 Markdown → 自己的 AST/React 渲染（那需要 conversation slot 的替换能力，我没验证到，风险高）。只做 CSS 层。

## 2. 用户审核项

> [!IMPORTANT]
> **默认关闭，用户手动开启。** 这是全局视觉改动，会影响所有会话的历史显示，不能默默打开。配置项 `markdown: 'off' | 'folio'`，默认 `off`。

> [!WARNING]
> **作用域依赖两个已探明的钩子，但内部结构仍有未知。** 在 `app.asar` 里确认存在 `.markdown`（578 次）与 `data-markdown`（22 次）两个标识，所以可以 `[data-markdown] :is(h2, p, table, blockquote, pre)` 这样安全限域。但**表格与代码块的具体 DOM 结构我没有实测**（可能是 `table`，也可能是 div 网格）——首版只覆盖「标签级」选择器，没命中就自然无效果（fail-open），再按截图迭代。绝不写 `body table {}` 这种全局选择器。

> [!WARNING]
> **与插件管理器/设置 UI 无关。** 开关走 `Config`（同 depth 方案），若管理器不渲染表单，则手改 `cordis.patch.yml` 里的 `config: { markdown: folio }`。

> [!IMPORTANT]
> **顺序建议：先做 2.2.0（depth），再做 2.3.0（markdown 主题）。** 两者都改 `Config` 与 GUIDE，混在一个提交里回滚粒度太粗。

## 3. 拟定变更清单

### [MODIFY] index.js

- `Config` 增加 `markdown: Schema.string().default('off')`（白名单 `off|folio`）。
- 新增 `export function markdownTheme(config)` 返回 `'folio' | 'off'`，供客户端读取（经 `ctx.systemPrompt` 之外的通道？**不新增通道**：客户端读同一个插件包，直接用 `import` 不可行，故改为常量映射 + 客户端本地默认 `off`，由 Config 在宿主侧决定是否在 GUIDE 里声明「正文按 folio 主题排版」）。
- 明确取舍：**主题开关只影响客户端 CSS，宿主侧只负责把选择写进配置**。若客户端拿不到宿主 config（跨进程），则开关落在客户端插件的 `localStorage`？—— 不。方案定为：客户端读不到 config 时默认 `off`，开关通过 profile 的 `cordis.patch.yml` **注入到客户端**的方式不成立，因此**本计划改为：客户端始终注入 CSS，但全部规则挂在 `[data-folio-markdown='1']` 根属性上；该属性由用户在设置里切换时写到 `document.documentElement`，并持久化到 `localStorage`。** 宿主 config 只用于提示词侧（`verbosity`）。
  > 这条是实施中最容易翻车的地方，写清楚：CSS 常驻、开关是 DOM 属性，不经过 IPC。

### [MODIFY] client.js · CSS

新增约 70 行，全部以 `[data-folio-markdown='1']` 为前缀：

```css
[data-folio-markdown='1'] [data-markdown] :is(h2, h3) { letter-spacing: .01em; margin: 22px 0 10px; }
[data-folio-markdown='1'] [data-markdown] table { border-collapse: separate; border-spacing: 0; }
...（表头灰底、单元格极淡竖线、代码块圆角 8px 与字体统一、引用 4px 轨）
```

不含 `!important` 除非必要（原生用的是 CSS Modules，特异性通常 0,1,0；我们用 `[data-folio-markdown] [data-markdown] table` 已达 0,2,1，够压）。

### [MODIFY] client.js · 开关 UI（最小实现）

不新建设置页（那要注入 `@deepseek-ai/dsh-client-ui-settings`，成本高）。最小可用：**在卡片右上角之外不动 UI**，改为监听一个约定 —— 用户在命令面板/终端执行 `localStorage.setItem('folio-markdown','1')` 太差。

故本计划取**第二个最小方案**：客户端启动时读 `localStorage['dsh.folio.markdown']`（`'1'`/`'0'`），有则设属性；同时暴露 `window.__folioMarkdown(on)` 方便在 DevTools 一行开启。真正的设置项等 2.4.0 再做（需要 ui-settings API）。

### [MODIFY] README / package.json

版本 2.3.0；README 增「主题层」小节：默认关闭、两种开启方式、已知不覆盖项。

### [NEW] tests/markdown-theme.test.mjs

断言：CSS 文本里**每个**新增规则都带 `[data-folio-markdown='1']` 前缀；不存在裸 `table {` / `pre {` 选择器；`!important` 计数为 0（或列明白名单）。

## 4. 验证计划

### 自动化

```sh
node --check client.js && node --check index.js
node tests/*.mjs        # TABLE/CODE/VERDICT/RENDER/DEPTH/MARKDOWN
```

### 人工

1. DevTools 控制台执行 `__folioMarkdown(true)`（或改 localStorage 后刷新），历史会话里的标题/表格/代码立刻换样式；
2. 关掉 → 恢复原样，确认没有残留；
3. 重点看：表格在 600px 下是否溢出（原生表格不在滚动壳里，可能横向溢出 —— 若溢出，本层只改颜色不动宽度，宽度问题留给后续）；
4. 检查深色主题下表格竖线是否过重（目标：几乎看不见，只在悬停时提亮）。

## 5. 回滚

删掉 `[data-folio-markdown]` 前缀的整段 CSS（一段连续区块，删除无副作用）；或 `git revert`。

## 6. 明确的边界

- 只管**视觉**，不改 Markdown 解析结果；
- 表格宽屏溢出、长代码块换行等**布局行为**不在本层范围；
- 上游改 DOM 结构时，本层效果可能局部失效 —— 那是有意的 fail-open，不报错、不破版。

---

🛑 **执行门禁**：本方案与「输出深度」方案都在等确认。建议先确认 2.2.0（depth），做完再开 2.3.0（本方案）。要改开关策略（例如接受注入 ui-settings 做一个真开关）现在说。
