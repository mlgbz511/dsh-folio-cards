# 卡片渲染升级 · 代码块与核心问题块

日期：2026-11-14 · 仓库 `dsh-folio-cards` 2.0.0 · 目标 2.1.0
设计依据：/ui-ux-pro-max（对比、触控、动效优先级）+ /claude-design（克制、无塑料味、系统先于像素）

## 1. 目标概述

当前卡片只能吐纯文本：`paragraph` 里的代码会被当成一行字，多行缩进全丢；「核心问题」只能靠一条普通 `callout` 混在正文里。结果就是卡片读起来像加粗的 markdown，没有 Claude 网页那种「代码是代码，结论是结论」的层次。

本次新增两个块类型：

- `code` —— 带语言标签与可选文件名的代码匣：等宽字体、行号可选、纵向限高、横向滚动、复制按钮。
- `verdict` —— 核心问题/结论块：4px 强调轨 + 色块标签 + 稍大字号的单段文字，放在卡片最上方。

加上 GUIDE 的两条使用规则：**结论有唯一主因时先写 verdict**；**代码一律走 code 块，不许塞进 paragraph**。

## 2. 用户审核项

> [!IMPORTANT]
> **语法高亮只能做到轻量版。** 插件零依赖（无 shiki/highlight.js），所以不引入完整高亮引擎。两个选项：
> **(A) 无色**：纯等宽 + 语言标签，最安全，永不误解代码语义。
> **(B) 轻量着色（推荐）**：约 40 行手写扫描器，只染三类记号 —— 注释、字符串、数字，外加少量关键字（`const/def/fn/let/import/return/if/else/for/class`）。规则：行内字符串优先，注释吞到行尾；`#` 只在 shell/python/yaml 系列生效，避免 `#include` 被误判。
> 不做完整词法分析，也不承诺「颜色准确」。取舍写进代码注释。

> [!WARNING]
> **复制按钮要触碰剪贴板。** 用 `navigator.clipboard.writeText`，失败时退回隐藏 textarea + `document.execCommand('copy')`；两者都失败就保持按钮不变、不弹窗骚扰。卡片是只读渲染层，不写响应式状态的话按钮反馈靠 CSS（`:active` + 短暂 `data-copied` 属性），约 12 行。

> [!IMPORTANT]
> **块类型是新增，不是改旧。** `paragraph` / `callout` 行为与样式不动，旧卡片与旧会话不受影响；版本 2.0.0 → 2.1.0。

> [!WARNING]
> **限制要与提示词对齐。** 模型容易贴 200 行代码。GUIDE 必须写死上限：单块 ≤ 24 行、超过只留关键片段，否则卡片会变成代码墙。

## 3. 拟定变更清单

### [MODIFY] client.js · CSS（插在表格样式之后、`@media (prefers-reduced-motion)` 之前）

- `.rc-code`：外框 1px `--dsw-alias-border-l1`、圆角 8px、背景 `color-mix(in oklab, var(--dsw-alias-label-primary) 3%, var(--dsw-alias-bg-layer-2))`（无渐变、无发光）。
- `.rc-code-head`：36px 高、小写语言标签 11px/0.08em、右侧复制按钮 44×44 命中区（视觉 24×24 + padding）、`focus-visible` 环用 `--rc-accent`。
- `.rc-code pre`：`font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`、13px/1.65、`padding: 12px 14px`、`overflow: auto`、纵向 `max-height: 320px`（仅行数 > 12 时挂类，同表格思路）。
- 行号：`counter-reset` + `::before` 灰色 11px，可开关。
- 着色类：`.tk-c`（注释，40% 前景）、`.tk-s`（字符串，`--dsw-alias-state-success-primary` 降饱和）、`.tk-n`（数字）、`.tk-k`（关键字，`--rc-accent`）。全部基于现有变量，不新增色板。
- `.rc-verdict`：`border-left: 4px` + `--dsw-alias-state-warning-primary`、底 `color-mix(warning 9%, bg)`、`padding: 14px 16px`、圆角 4px（刻意比卡片 18px 更方，制造层级差）；标题标签 11px 色块内嵌；正文 15.5px/1.7 `label-primary`。

### [MODIFY] client.js · JS

- `codeSpec(block)`：归一 `language`（默认 `text`）、`code`（数组或字符串，`\n` 拼接）、`title`、`lines`(bool, 默认行数 > 12 才开)、`highlight`(行号数组，可选，染 3% 底色条)。超 24 行时截断并在尾部加一行省略提示？**不**：截断会骗人，改为「不截断，交给内部滚动」。
- `tokenize(code, lang)`：单次扫描，产出 `[{t: 'text'|'c'|'s'|'n'|'k', v}]`；只在 (B) 方案启用。
- `CodeBlock(props)`：结构 = `div.rc-code > div.rc-code-head(span.lang, span.title?, button.copy) + pre > code`；所有文本走 `text` 节点，不用 `innerHTML`。
- `VerdictBlock(props)`：`aside.rc-verdict[data-tone] > div.rc-verdict-t + p`。
- `renderBlock` 加两个分支：`if (type === 'code') return h(CodeBlock, …)`、`if (type === 'verdict') return h(VerdictBlock, …)`。

### [MODIFY] index.js · GUIDE

- 块清单补 `code (language + code, ≤24 lines)` 与 `verdict (one sentence, the single root cause)`。
- 新增三条规则：核心问题唯一时先写 verdict 再展开；代码只进 code 块且 ≤24 行；行内代码仍用反引号写在 paragraph 里（不新开块）。

### [MODIFY] tests/table.test.mjs

复用现有断言骨架，扩到 `code` / `verdict`：语言标签、行号开关阈值、着色记号数、`data-label` 之外的 `highlight` 底色、`verdict` 的 tone 与单段结构。

### [MODIFY] package.json / README

版本 2.1.0；README 块表补两行，并把「13 种块」改为「15 种块」。

## 4. 验证计划

### 自动化

```sh
node --check client.js && node --check index.js
node tests/table.test.mjs        # 期望 TABLE-OK 后追加 CODE-OK / VERDICT-OK
```

断言清单（新增）：`code` 在 25 行时不截断、≤12 行不开行号、>12 行开行号并挂限高类；`tokenize` 对 `#include <x.h>` 不误判为注释、对 `"a # b"` 字符串内的 `#` 不染色；`verdict` 缺 text 时返回 null；两个块都不使用 `dangerouslySetInnerHTML` 等价路径。

### 人工

1. 完整退出 App 再开，插件管理器确认 2.1.0。
2. 问「这段代码为什么报 CORS 错」，期望：verdict 打头（一句话主因）+ code 块（带语言标签、可复制、长代码可滚）。
3. 拖到 600px 宽，确认代码块横向滚动、行号不与正文重叠。
4. 检查深色主题下 `tk-c` 注释对比度仍可读（目标 ≥ 4.5:1）。

## 5. 回滚

`git revert` 单提交；或删两个 `renderBlock` 分支 + 对应 CSS + GUIDE 三条规则，即回到 2.0.0。

---

🛑 **执行门禁**：方案已制定完毕，在收到你的明确确认（回复「确认」或「proceed」）前，我不会修改任何代码或执行写操作。等你先拍板高亮方案 A 还是 B。
