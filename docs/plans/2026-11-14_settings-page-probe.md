# 设置页探针结论（2026-11-14）

目标：让「输出深度」能在 DSH 设置页里用下拉框修改，并把值写回宿主配置。

## 已验证可行的部分

- 客户端可以注册设置节：`ctx.slots.inject('settings.section', () => ctx.slots.register({...}, Component))`，需要在 `dsh.client.inject` 里声明 `@deepseek-ai/dsh-client-ui-settings`。
- 客户端可以拿到宿主 RPC：模块 `inject` 加 `'connection'` / `'remote'` 后，`ctx.connection.rpc.call` 与 `ctx.remote.pluginManager` 都可用。
- `remote.pluginManager.listPlugins()`（0 参）成功返回插件清单，条目含 `entryId` / `moduleName` / `patchId`；本插件为 `include:folio-cards` / `dsh-folio-cards` / `folio-cards`。
- 方法参数个数是严格校验的：`listPlugins` 要 0 个，`inspect` 要 2 个，`updateBundle` 要 3 个；传错数量会报 `expected N argument(s), got M`。

## 未解决（所以没有做下拉框）

`inspect` 与 `updateBundle` 的第 1 个参数是结构化 spec，但形状没有文档，实测报错：

| 调用 | 报错 |
| --- | --- |
| `inspect({ id })` | `field: spec` |
| `inspect({ name })` | `field: spec` |
| `inspect({ patchId, name })` | `field: spec` |
| `updateBundle({ id, config })` | `field: name` |
| `updateBundle({ patchId, config })` | `field: name` |
| `updateBundle({ name, config })` | `field: name` |

即：inspect 要的 spec 不是 `{id}` / `{name}` / `{patchId}`，updateBundle 要的 name 也不是字符串形式。sch 定义在压缩过的宿主产物里（`dsh-plugin-manager` 的 lib 产物中检索不到方法名字面量），无法静态读出。

## 结论

- 放弃通过设置页写回配置；深度继续走 `cordis.patch.yml` 的 `config.depth`。
- 探针代码已删除（`2.3.0`），仓库回到干净状态。
- 若以后 DSH 公开这套 RPC 的 spec 形状，可按上面已验证的部分快速接回：注册 settings.section + 调 `updateBundle`。
