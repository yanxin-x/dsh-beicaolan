# 内置的历史模块（封印状态）

`vendor/dsh-pet/` 里放的是第三方 MIT 代码，**默认完全封印**：
不加载、不注册、不起进程、不下载、不读写它的目录。

## 来源与许可

```
dsh-pet 0.4.9
MIT License
Copyright (c) 2026 PC2005-cloud
```

完整许可证见 `vendor/dsh-pet/LICENSE`（随代码一起分发，未修改）。

我们只搬了**运行时需要的两部分**，没有搬它的 `src/`（TypeScript 源码 + 测试）和
`assets/`（64 MB 素材与字体）：

| 目录 | 体积 | 用途 |
|---|---|---|
| `vendor/dsh-pet/lib/` | 5.77 MB | 编译后的运行时逻辑（窗口/物理/托盘/语音/聊天…） |
| `vendor/dsh-pet/runtime/` | 0.47 MB | Electron 桌面窗 helper（透明窗裸应用） |

## 封印规则（六条，缺一不可）

1. **顶层不 import**
   `index.js` 里**不允许**出现对 `vendor/dsh-pet` 的顶层 `require`/`import`。
   只有开关打开时才在 `try/catch` 里动态 `await import()`。

2. **默认全关**
   `config.features.legacy` 下每个子开关默认 `false`：
   `desktop / physics / tray / voice / chat / todo / balance / weather`。
   全部为 `false` 时，我们的进程里**不会多加载一个模块**。

3. **零副作用**
   封印状态下不允许：
   - spawn 任何子进程
   - 下载 Electron（`@electron/get` 一次都不许调）
   - 创建窗口 / 托盘 / 全局热键
   - 读写 `~/.dsh/dsh-pet/`（只允许**读** `main-config.jsonc` 里的 `size`，那是既有联动）

4. **失败隔离**
   动态加载与启动一律包在 `try/catch`，失败只写日志并降级为纯页面挂件，
   **绝不允许让宿主进程崩**（我们为此踩过 5 次崩溃的坑）。

5. **总闸**
   `features.legacy.panic = true` 时，无论其它子开关如何，**一律不加载**，
   并主动 `kill` 已存在的 helper 进程。

6. **可验证**
   `selftest` 必须在封印状态下断言：
   - 没有 helper 子进程
   - 没有新增文件到 `~/.dsh/dsh-pet/`
   - `legacy` 相关模块未被加载

## 为什么要封印而不是删除

桌面透明窗、物理、托盘、语音、聊天是"以后可能坐进去"的位置。
先原样留住、锁死入口，比将来重新找一遍代码便宜得多；而且封印状态下它对
正常运行**零影响**，可以放心长期带着。

## 解除封印的步骤（将来）

1. 在 `config.json` 里把对应的 `features.legacy.*` 打开（一次只开一个）
2. 首次启用桌面窗时才会下载 Electron（约 100 MB，需明确确认）
3. 观察 `~/.dsh/dsh-sitter/handler-error.log` 与 `client-error.log`
4. 出问题就设 `features.legacy.panic = true`，立刻回到封印态
