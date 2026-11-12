# dsh-folio-cards

让 DSH 的回答带一张排过版的卡片：标题、导语、要点、数据、时间线。

上游是 [ninepoin4/dsh-rich-cards](https://github.com/ninepoin4/dsh-rich-cards)（MIT）。本仓库为本地分叉，保留卡片机制，清掉三类风险项，改名独立演进。

## 与上游的差异

1. **提示词不再诱导跑终端**：删掉「先用 curl 查维基图库」的整段（含「走 shell 而不是 web_fetch」），也删掉「不要提查不到图」的话术。不再劝模型绕开受控的 `web_fetch`，也不再隐藏过程。
2. **配图地址收口**：`image.url` 只接受 http(s)；`localhost`/`127.*`/`10.*`/`192.168.*`/`172.16-31.*`/`169.254.*`/`*.local`/`*.internal` 与非 http(s) 协议一律不渲染。`<img>` 带 `referrerPolicy="no-referrer"`。卡片不能再当内网探测跳板，也不向图站泄漏来源页。
3. **删死代码**：`rich_card` 工具定义、schema 与 `REGISTER_TOOL` 常量整段移除，工具通道不可能被一个常量翻回来。
4. **素材不继承**：不含上游截图/logo/banner（其商标与图库授权不在 MIT 范围）。

## 安装

```sh
dsh plugin --profile <你的 profile> add link:<本仓库绝对路径>
```

装完刷新窗口。没有配置项、没有设置面板、没有工具。

## 用法

模型会在合适的回答末尾写一个 `card` 围栏块，也可手写：

````markdown
```card
{
  "title": "一句话答案",
  "kicker": "分类 · 主题",
  "lead": "导语",
  "accent": "indigo",
  "blocks": [{ "type": "paragraph", "text": "正文" }]
}
```
````

块类型：`heading` `paragraph` `bullets` `steps` `stats` `kv` `callout` `quote` `chips` `timeline` `image` `divider`。

## 已知边界

- 一张回答只渲染一张卡（最后一张生效），卡片固定在回答末尾；
- 认壳依赖代码块 DOM 结构，前端改版需重新适配；
- 解析失败退回源码（fail open），不中断整轮回答。

## License

MIT，见 [LICENSE](LICENSE)。上游版权归 ninepoin4。
