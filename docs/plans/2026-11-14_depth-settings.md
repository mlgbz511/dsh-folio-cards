# 输出深度设置 · 四档模式

日期：2026-11-14 · 仓库 `dsh-folio-cards` 2.1.1 · 目标 2.2.0
前置诉求：卡片曾被写成「卡即答案 + 正文≤2 句」，会逼模型浓缩；本次把深度做成可配置。

## 1. 目标概述

把「回答要多深」从提示词里写死的一条，改成用户可选的四档，并在宿主侧读取配置后组装不同 GUIDE：

| 档位 | 定位 | 正文 | 卡片 |
| --- | --- | --- | --- |
| `verbose` 详尽 | 方案、诊断、教学 | 不限长，展开推理链、反例、边界 | 末尾一张，6–9 块，可用 `layout: article` |
| `balanced` 适中 | 有来由的解释 | 3–4 段 | 末尾一张，4–6 块 |
| `concise` 精简（当前） | 事实、对比、代码 | ≤2 句 | 卡即答案，块少而密 |
| `auto` 自动 | **默认** | 由模型按题型自选 | 同上，附判据 |

同时修正一条真实缺陷：现有 GUIDE 写死「卡就是答案，正文不得复述」，等于逼浓缩。新规则改为**卡承载结论，正文承载推理**，并禁止卡复述正文。

## 2. 用户审核项

> [!IMPORTANT]
> **默认档位选 `auto`。** 理由：固定 `concise` 是当前浓缩的根源；固定 `verbose` 又会让「一句话能答完」的问题被灌水。`auto` 给模型判据，简单题仍短、复杂题展开。要改默认就在 Config 里改，一行。

> [!IMPORTANT]
> **设置入口的能力尚未证实。** DSH 的插件确实可以 `export const Config`（已核对 `dsh-codearts-free` 走 `@deepseek-ai/schemastery` 3.19.0 + `apply(ctx, config)`），但**插件管理器是否把 Config 渲染成设置表单，我没有验证**。因此实施时保证两条路都通：
> 1. 管理器若有表单 → 直接改；
> 2. 无论如何都能手改 `cordis.patch.yml` 的 `config: { depth: auto }`。
> 实施完我会告诉你哪条实际可用，不含糊。

> [!WARNING]
> **语义变化：卡从「必需」变「可选」。** 取消 `Exactly one card fence per reply` 的强制，改为「至多一张；没有什么值得归纳时可以不写」。副作用：会出现「正文 + 卡」并存；用一条硬规则兜住 —— 卡不复述正文，只放结论/对照表/代码。

> [!WARNING]
> **未知值必须回落而不是报错。** 手写 YAML 容易打错（`Depth` / `detailed`），所以 `depth` 用 `Schema.string().default('auto')`，代码里做白名单归一，非法值一律落到 `auto`，且不抛异常（插件加载失败会连卡片一起消失）。

## 3. 拟定变更清单

### [MODIFY] index.js

- 顶部 `import Schema from '@deepseek-ai/schemastery'`，`export const name = 'dsh-folio-cards'`。
- `export const Config = Schema.object({ depth: Schema.string().default('auto') })`。
- `apply(ctx, config)`：`const depth = DEPTHS.includes(config?.depth) ? config.depth : 'auto'`；GUIDE 由 `guideFor(depth)` 生成。
- `guideFor(depth)`：基础段（卡片结构、字段、JSON 纪律、table/code/verdict 规则）保持不动，尾部按档位拼一段：

```text
## Depth: verbose
Write the reasoning in prose first, with no length cap: the causal chain, the alternatives you
rejected and why, the boundary where the advice stops. Then end with at most one card holding the
verdict, the comparison table or the code. The card summarises; it must not restate the prose.
```

四档分别表述（`balanced` 3–4 段、`concise` 保留现行为、`auto` 给三条判据）。共同规则替换原来的第 55–56 行：

- 「至多一张卡，可省略；短答可以只有卡」；
- 「卡只放结论/对照/代码，不复述正文」；
- 「需要推理时正文优先，不因为卡片而压缩论证」。

### [MODIFY] package.json / README

版本 `2.1.1 → 2.2.0`；README 增加「输出深度」小节（四档 + 两种设置方式 + 重启生效）。

### [MODIFY] 本机 profile 的 `cordis.patch.yml`（实施时）

在第 141–142 行那条下面补 `config: { depth: auto }`，作为默认值的落地示例；同时保留备份。

### [NEW] tests/depth.test.mjs

用桩 ctx 调 `apply(ctx, {depth: x})`，捕获 `systemPrompt.section` 的 `text`，断言：
1. 四档文本互不相同，且 `verbose` 含 `no length cap`、`concise` 含 `two short sentences`；
2. `verbose` 文本长度 > `balanced` > `concise`（不是唯一判据，但能抓错拼）；
3. 缺省与非法值（`detailed` / 大写 `AUTO` / `undefined`）都落到 `auto`；
4. 四档都仍含 `table`、`code`、`verdict` 的规则（防止拼接时丢段）。

## 4. 验证计划

### 自动化

```sh
node --check index.js && node --check client.js
node tests/table.test.mjs      # TABLE-OK / CODE-OK / VERDICT-OK
node tests/render.test.mjs     # RENDER-OK
node tests/depth.test.mjs      # DEPTH-OK
```

### 人工

1. 改 `depth: verbose` → 重启 → 问同一个方案题，正文应明显变长、卡只留结论与对照表；
2. 改 `depth: concise` → 重启 → 同一题应回到「两句正文 + 一张卡」；
3. 改 `depth: nonsense` → 重启 → 不报错，行为等同 `auto`（插件仍加载，卡仍渲染）；
4. 检查插件管理器那行是否出现可视化设置表单（决定 README 主推哪条入口）。

## 5. 回滚

`git revert` 该提交；或在 profile patch 里删掉 `config` 段，回到 `auto` 默认；再退一步即 2.1.1 的固定文案。

---

🛑 **执行门禁**：方案已制定完毕。收到明确确认（「确认」/「proceed」）前不动代码。若要把默认档改成 `concise`（保持现状）或 `verbose`，现在说。
