# dsh-folio-cards

让 DeepSeek Harness 的解释类回答带一张排过版的卡片：结论、要点、数据、时间线、多列对照表。

包名 `dsh-folio-cards`，仓库同名。上游 [ninepoin4/dsh-rich-cards](https://github.com/ninepoin4/dsh-rich-cards)（MIT）的源码快照 `fe6a86e` 是它的起点；此后新增 `table` 块、把表格从「能放」变成「该放时就放」，2.0.0 起改用现在的包名与区段名，与上游不再共享标识。

## 装

```sh
dsh plugin --profile <你的 profile> add link:<本仓库绝对路径>
```

装完**完整退出 App 再打开**（宿主提示词在启动时组装，刷新窗口不生效）。没有配置项、没有设置面板、没有工具。

## 输出深度：锁死在「全量详尽」

当前版本**没有深度开关**，提示词只注入一份规则，核心三条：

- 完整回答，不为塞进卡片而压缩正文、表格或代码；
- 代码不截断（不再有「24 行以内、砍掉其余」）；
- 卡片最多一张，放结论/对照/代码，不允许复述正文，也不允许因为卡片而删内容。

配置里的 `depth` 字段仍然接受（旧的 patch 不会报错），但**值被忽略**：无论写 `1` / `concise` / `auto`，注入的都是同一份详尽提示词。

想恢复四档（`1/2/3/0` + `/depth` 命令 + patch 热重载）：回退到 `2.7.1`，或看该版本提交 `beb38e1`/`2406ad1` 的实现。

## Mermaid 图表

DSH 本身不认 `mermaid` 语言（前端包里 mermaid/dagre/flowchart 出现 0 次），所以模型画流程图时只会落成代码块。本插件把它补上：

```
模型写 ```mermaid flowchart TB ...```  →  插件升级成内联 SVG
```

机制（**不动 DSH 本体**）：

1. 宿主半把 `vendor/mermaid.min.js` 用 `webServer.register` 暴露成 `/folio-cards/mermaid.min.js`；
2. 客户端半发现有 `pre code.language-mermaid` 时，**首次按需**加载该脚本（同 origin），调用 `mermaid.render` 换成 `div.rc-mermaid > svg`；
3. 任一环节失败（路由 404、脚本加载失败、语法错误、CSP 拦截）→ 保留原代码块，只打上 `data-folio-mermaid="failed"` 标记，**不影响其它内容**；
4. 可见性优先于塞进卡片：SVG **保持自然尺寸**（`useMaxWidth:false`，字号 15px），容器横向/纵向滚动，不把大图等比压小；
5. 卡片里按宽度铺满（超高则纵向滚动）；**点一下**进入全屏遮罩：打开时先整图适配视口，滚轮**以光标为锚点**缩放（0.6×–6×）、拖拽平移、双击重新适配，点背景或按 `Esc` 关闭；图块可 Tab 聚焦、回车打开；
6. 提示词里限定了图规模（约 ≤20 节点、≤3 层），超了就该拆图或改用表格 —— 40 节点的图任何缩放都读不清。

代价与出处：

- `vendor/mermaid.min.js` 约 3.5 MB，构建物随仓库一起分发（MIT，见 `vendor/mermaid.LICENSE`）；不联网也能用；
- 这是本插件唯一"体积大"的部分；不用 mermaid 时可以整个删掉 `vendor/` 与 client 里的 `installMermaid`，其余功能不受影响。

## 正文表格皮肤（当前停用）

> 状态：**已停用**。CSS 规则仍保留在 `client.js` 里，但被包在 `@media (min-width: 100000px)` 这种永不成立的外壳中，DSH 原生表格样式完全接管；调试用的探针也不再注册。
> 恢复方法：删掉那层 `@media` 外壳，并把 `MD_TABLE_SKIN` 改回 `true`。

原设计如下（保留供回滚参考）：

DSH 自己渲染的 markdown 表格（正文里 `| a | b |` 那种）现在与卡片里的表格同一套观感：低对比网格、表头次级色、首列不折、窄屏折成堆叠。

三条安全约束：

- **只在插件层**：注入一段 `<style data-dsh-folio-cards>`，不改 app.asar、不劫持渲染器、不打 DOM 补丁；
- **零优先级**：选择器全部 `:where()` 包裹，DSH 自带样式永远优先；新皮肤段内 0 个 `!important`；
- **可整体删除**：删掉样式表里标记为 markdown-table skin 的那一段即回退。

命中依据（查证过）：表格自身没有类名，靠父容器 `div[class*='tableScroll']` / `div[class*='tableFill']` 后代选择器命中；`.markdown`、`[data-markdown]`、`.markdown-table` 在这个构建里都不存在。

自检：给 `html` 加 `data-folio-mdtable-probe="1"`（浏览器控制台执行 `document.documentElement.dataset.folioMdtableProbe='1'`），表格会出现 1px 虚线描边 → 说明命中；没有描边说明选择器需要更新。

## 块类型

| 块 | 作用 |
| --- | --- |
| `heading` `paragraph` | 小节标题、正文 |
| `bullets` `steps` `chips` | 要点、步骤、标签 |
| `stats` | 2–4 个关键数字 |
| `kv` | 左右对照的键值行（2–3 个对象 × 1–2 个字段） |
| `callout` `quote` | 提示框（info / tip / warn）、引用 |
| `timeline` | 带日期的事件线 |
| `image` | 真图 URL + 说明 + 来源 |
| `table` | 多列对照表（本项目新增） |
| `code` | 代码匣：语言标签、复制、超 12 行自动行号与限高 |
| `verdict` | 核心问题块：一句话主因，放在卡片最上方 |
| `divider` | 分隔线 |

## table 块

```json
{"type": "table",
 "headers": ["方案", "上下文", "首字延迟"],
 "rows": [["桌面端", "1M", "0.8 s"], ["移动端", "128K", "1.4 s"]],
 "align": ["left", "right", "right"]}
```

规则与行为：

- 最多 **5 列 / 12 行**；单元格纯文本，不能含 markdown、`|` 或换行；
- `rows` 里可插入 `{"group": "常驻节点"}` 作分组行（软胶囊，跨整列）；
- `align` 可省。缺省时逐列探测：整列都像数字就右对齐并启用 `tabular-nums`；
- **≥4 列**时首列 sticky，横向滚动不丢行标签；
- **>6 行**时表格进入内部滚动（`max-height: 320px`），表头吸顶；
- **≤640px** 整表折叠成键值堆叠，单元格靠 `data-label` 认列 —— 模型不用自己算宽度。

视觉取向：低对比网格、无斑马纹、灰表头、行 hover 提亮、分组软胶囊。原型见同工作区 `prototypes/dsh-card-table-variants.html`。

## 提示词约定（为什么模型会主动用表）

卡片不是工具调用，而是回答末尾一个 `card` 围栏块：

````markdown
```card
{"title": "一句话答案", "kicker": "分类 · 主题", "accent": "indigo",
 "blocks": [{"type": "paragraph", "text": "正文"}]}
```
````

GUIDE（宿主注入的系统提示段）规定：

- 结论放在卡片里，卡后最多补两句；
- **≥3 个对象 × ≥3 个可比字段时必须用 `table`**，禁止退回 bullets / kv；
- `kv` 只用于 2–3 个对象 × 1–2 个字段；
- 提示词里附一段可照抄的最小 table 示例。

## 原理

- **宿主端**：向系统提示追加一段写作约定，不注册任何工具；
- **客户端**：`MutationObserver` 扫回答里的 `card` 围栏，正文能解析成卡片就在原位换掉代码块；
- **fail open**：围栏写坏只留下源码，不中断整轮回答 —— 这也是不用工具传参的原因（工具参数错会让整轮 `MALFORMED_RESPONSE`）。

## 已知边界

- 一张回答只渲染一张卡（最后一张生效），卡片固定在回答末尾；
- 认壳依赖代码块 DOM 结构（`data-code-block-*` 属性），渲染器大改结构时需重新适配；
- table 的吸顶／sticky 只在内部滚动容器里生效，行数不足时不会触发；
- 模型服从度是概率问题：提示词能让它大概率用表，不能保证 100%。

## 与上游的差异

| | 上游 `dsh-rich-cards` | 本仓库 `dsh-folio-cards` |
| --- | --- | --- |
| 包名 / 版本 | `dsh-rich-cards` 1.2.4 | `dsh-folio-cards` 2.1.0 |
| 块类型 | 12 | 15（+`table` +`code` +`verdict`）|
| 表格 | 无，只能 `kv` 两列 | V5 网格 + sticky 首列 + 数值对齐 + 吸顶 + 窄屏折叠 |
| 提示词 | 无表格判据 | 3×3 强制用表 + 最小示例 |
| 测试 | 无 | `tests/table.test.mjs`（6 组断言，`node tests/table.test.mjs`）|
| 素材 | 自带截图/logo | 不含上游图片素材 |

## 开发

```sh
node --check index.js && node --check client.js
node tests/table.test.mjs     # 期望输出 TABLE-OK
```

## License

MIT，见 [LICENSE](LICENSE)。上游版权归 ninepoin4。