# 开发红线（血泪版）

每一条都是**真实踩过并导致 DSH 崩溃/重启**的，不是假设。

---

## 红线 1：宿主路由里不许出现未定义变量

**事故**：我在 `/diag` 里写了 `build: BUILD_VERSION`，而宿主模板从来没有这个常量。
请求 `/diag` → `ReferenceError` → `handle()` 没有 try/catch → 异常冒到 Electron 主进程 → **整个应用重启**。

**规则**：
- 新增常量必须**同时**在宿主与客户端各自定义，不能只在一侧。
- `handle()` 必须有一层全局 try/catch（任何路由异常降级成 500，绝不冒到进程）。
- 新增路由后，**必须真的打一次**（`Invoke-WebRequest`），看它返回 200 且应用还活着。

---

## 红线 2：改代码 → 构建 → preflight → 才安装

**事故**：改完直接构建、直接覆盖安装目录、直接 toggle，出了问题才回头查。

**规则**（固定顺序，不许跳步）：
```
改模板 → python scripts/make_sitter_plugin.py
       → node scripts/preflight.mjs       （语法/占位符/宿主可加载）
       → node scripts/pet-cli.mjs check   （12 项，含真实接口）
       → 才复制到 profiles/.../@local/dsh-sitter
       → 才 set_plugin false/true
```

---

## 红线 3：不许用全局字符串替换改类名

**事故**：把面板卡片类名 `dsh-sitter-card` 全局替换成 `dsh-sitter-pcard`，
**顺手把悬停卡的 className 和两条 CSS 规则也改了** → 用量卡片套上面板样式，文字竖排。

**规则**：
- 改名只改**精确目标**（`.dsh-sitter-pcard {` 而不是 `dsh-sitter-card`）。
- 改完跑 `scripts/audit_classes.py`：JSX 类名必须与 CSS 规则一一对应，零失配。

---

## 红线 4：渲染体里不许写副作用

**事故**：把「配置清空→回到吸附位」写成渲染体里的一行 `setFreePos(null)`，
每帧执行 → 拖着拖着位置被抹掉 → 「拖不动」。

**规则**：
- `setState` / 位置重置 / 网络请求，只能出现在 `useEffect` 或事件回调里。
- 需要"状态变化时执行一次"，用 `useEffect` + 依赖数组，不要用"判断当前值"。

---

## 红线 5：不要在运行中的应用上做实验

**事故**：把模型调用（`ctx.llm.stream`）放进正在运行的宿主插件，
一次阻塞调用让主进程无响应被看门狗重启。

**规则**：
- 任何"不确定会不会炸"的东西，先放进 `60_build/harness/` 的独立渲染台跑，
  或起独立 DSH 实例 + 独立 profile。
- 危险能力默认关闭，且要有环境变量或配置双闸门。

---

## 红线 6：preflight 不许碰真实环境

**规则**：
- 用临时 HOME（`os.tmpdir()`）+ 独立子进程加载宿主。
- 不 bind 43717、不发真实请求（真实路由验证交给 `pet-cli check`）。
- 检查脚本本身崩了，也要**只报错不退出应用**。

---

## 红线 7：异步回调里写 res，等于绕过所有防线

**事故（2026-11-22，同一个下午把应用干重启 5 次）**：

```js
// handle() 外面套了 try/catch，但这段跑在 req.on('end') 里 —— try 早就返回了
readBody(req, (body) => {
  res.writeHead(200, headers);            // 第 1 次写：正常
  res.end(JSON.stringify({ cmd: pendingCmd }));   // pendingCmd 越界 → ReferenceError
});
// readBody 的 catch 又把 done({}) 调了第二次 → 第 2 次 writeHead → ERR_HTTP_HEADERS_SENT
// → uncaughtException → host exit 1 → 整个应用重启
```

**规则（三条，缺一都会复发）**：
- 响应的第一笔 `writeHead` 必须发生在 `try` 里；整条响应路径**只允许写一次**。
- 任何"拿到结果再回调"的封装（`readBody` 这类），必须用 `once()` 守卫，
  **回调抛错后只能记日志，绝不能再调一次回调**。
- 新增路由后，要在隔离实例上把**每一条**都打一遍（见 `60_build/harness/test_cmd_channel.mjs`），
  不要只在脑子里过。

**症状识别**：应用莫名其妙重启、GUI 端口变了、会话记录里最后一条是
`turn/end reason=aborted`。去 `%APPDATA%\@deepseek-ai\dsh-desktop\logs\crash-*-host.log`
搜 `fatal uncaught exception`，那里有精确的文件行号。

---

## 一句话总结

> **能崩掉用户应用的事，一律先做隔离验证；已经确定安全，才允许装到运行中的环境。**
