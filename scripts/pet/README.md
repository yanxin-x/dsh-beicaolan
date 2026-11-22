# 插件架构（大一统后）

```
D:\DSH-Pet\
├─ scripts\
│  ├─ pet\
│  │  ├─ config.default.json    ← 唯一参数真源（改这里）
│  │  ├─ client.template.js     ← 客户端模板（JS，占位符 __XXX__）
│  │  └─ host.template.js       ← 宿主模板（本地统计/状态服务）
│  ├─ make_sitter_plugin.py     ← 编排：读模板 + 嵌素材 + 替换占位符
│  ├─ make_blink_frames.py      ← 生成闭眼帧（待机）
│  ├─ make_typing_blink.py      ← 生成闭眼帧（打字姿势）
│  ├─ recolor.py                ← 零出图换色
│  └─ _archive\                 ← 一次性补丁脚本（历史，不再使用）
├─ 10_base\                     ← 原图（高分辨率）
│  └─ _gen\                     ← 由旧产物导出的贴图（气泡等）
├─ dsh-sitter\                  ← 产物（package.json / patch / index.js / client.js）
└─ 60_build\                    ← 截图与中间产物
```

## 一次构建做了什么

```
config.default.json  ─┐
client.template.js   ─┼─→ make_sitter_plugin.py ─→ dsh-sitter/client.js
host.template.js     ─┤                            dsh-sitter/index.js
10_base/**/*.png     ─┘                            dsh-sitter/package.json
```

- 素材统一缩放到 `embedHeight`（人物 300 / 小件 64），转 base64 内嵌
- 已经是对应高度的素材**不再二次重采样**（像素级可复现）
- 所有 `__XXX__` 占位符由 Python 注入

## 改参数改哪里

| 想改 | 改 `config.default.json` 的 |
|---|---|
| 宠物大小 | `displayHeight` |
| 睡多久 / 帧速 / 眨眼 / 打盹 | `timeline.*` |
| 贴输入框的位置 | `layout.*` |
| 金砖尺寸与压边 | `brick.*` |
| 屁股在精灵里的位置 | `seat.buttRatio` |
| 调试角标 | `debug` |

改完执行：

```powershell
python scripts\make_sitter_plugin.py
Copy-Item "dsh-sitter\client.js" "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\@local\dsh-sitter\client.js" -Force
Copy-Item "dsh-sitter\index.js" "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\@local\dsh-sitter\index.js" -Force
# 然后 plugin_manager 关→开 include:dsh-sitter
```

## 宿主接口

| 端点 | 用途 |
|---|---|
| `GET /stats` | 今日 token、活跃分钟数、会话数 |
| `GET /state` | 是否在干活（turn 标记）、最近出错、turn 起止 |

端口 `127.0.0.1:43717`，只监听本机。

## 为什么 JS 从 Python 里搬出来

原来 1000 多行的 `CLIENT = """..."""` 内嵌在生成器里：没有语法高亮、不能用 `node --check`
提前发现错误、每次改动都要小心 Python 字符串转义。现在模板是真正的 `.js` 文件，
生成器只做"读模板 → 填占位符 → 写产物"。

搬完做了**像素级比对**：新旧产物 23 张贴图逐像素一致，确认无损。

## 尚未做的

- 运行时配置（现在改参数要重新构建）
- 页面内设置面板（名称/大小/开关可调）
- 动作库 `40_actions` 尚未接进状态机

## 运行时配置（第二版）

参数不再需要重新构建：

| 接口 | 说明 |
|---|---|
| GET /config | 返回默认值 + 用户覆盖后的完整配置 |
| POST /config | 提交局部覆盖，写入 ~/.dsh/dsh-sitter/config.json |
| POST /config/reset | 删除用户配置，回到默认 |

客户端启动拉一次，之后每 60 秒刷新一次；页面内设置面板保存后立即生效。

### 设置面板

**鼠标停在宠物身上，按 P** 打开（不占用全局快捷键）。

面板包含：大小、睡眠秒数、六个功能开关（眨眼 / 打字 / 联动 / 卡片 / 思考泡 / 换装）、保存按钮。

### 坑

- 全局热键 Ctrl+Alt+P 会和应用自身的快捷键冲突（实测把会话切回了首页），
  所以改成「悬停时按 P」这种只在本组件内生效的方式。
- 保存配置时若以空对象为基准做合并，会把所有键丢掉；必须用**默认配置当结构模板**逐键校验合并。

## CLI 面板（和页面面板共用同一份数据）

`powershell
node scripts/pet-cli.mjs status     # 状态 + 今日统计
node scripts/pet-cli.mjs config     # 当前生效配置
node scripts/pet-cli.mjs set displayHeight=110 timeline.sleepMs=6000 features.think=false
node scripts/pet-cli.mjs reset      # 恢复默认
node scripts/pet-cli.mjs play sleep # 让宠物演一个动作（idle/blink/work/shake/cheer/attention/sleep/fitting/doze）
node scripts/pet-cli.mjs check      # 一键体检
`

**互通原理**：两个面板都读写宿主的同一套接口 —— 配置存 ~/.dsh/dsh-sitter/config.json，
动作走 /cmd 队列。CLI 改完，页面面板 5 秒内自动同步；页面面板改完，CLI 立刻可见。

- 页面面板刷新时若用户正在编辑（脏标记），不会覆盖用户输入
- 动作指令由页面每 2 秒轮询 /state 时取走，带时间戳去重

### check 做什么

依次验证 /config、/state、/stats、配置写入往返、指令通道，输出通过数并在有失败时返回非零退出码，
可以直接塞进构建脚本。

## 学习监督（第一阶段已完成）

配置项：

`json
"escalate": { "enabled": true, "idleMs": 180000, "stepMs": 10000 }
`

流程：

`
无输入 3 分钟 → 放大 2 倍 → 每 10 秒再翻倍 → 刚好占满视口并锁定
      → 点击宠物 → 弹窗「要认真学习，知道吗？」→ 点「知道了」→ 复位
`

细节：

- 用 window 的 mousemove/keydown/pointerdown/wheel 计时；**成长阶段**任何输入都会取消放大
- 占满后**锁定**，不再被鼠标动作取消，必须点确认（否则点不到）
- 放大层用 createPortal 挂到 document.body：插槽容器会限制 position: fixed
- 最终缩放取 min(视口宽/宠宽, 视口高/宠高)，保证整只宠物可见
- 缩放原点必须是 50% 50%；用底部原点会把头顶挤出屏幕

CLI 调试：

`powershell
node scripts/pet-cli.mjs set escalate.idleMs=4000 escalate.stepMs=1200
node scripts/pet-cli.mjs play idle     # 从头开始计时
node scripts/pet-cli.mjs play prompt   # 直接弹确认框
node scripts/pet-cli.mjs play dismiss  # 复位
`

### 下一阶段

- 生成「拿鞭子」的监督形态素材，占满屏幕时切换成那个姿势
- 弹窗文案/音效、连续未完成任务的计数
- 统计「今天被提醒了几次」，接进悬停卡

### 鞭子监督形态（第二阶段已完成）

- 素材：10_base/whip_stand.png（AI 生成，站立执鞭、鞭梢垂地，表情认真不凶）
- 占满屏幕时自动切换成这个姿势，并给遮罩加**周期性抽打抖动**（3.6 秒一轮，短暂左右晃）
- 页面面板新增 放大 / 督促 / 复位 三个按钮，与 CLI 的 escalate / prompt / dismiss 一一对应

踩坑记录：

- play prompt 早期把等级写死成 3，实际满级是 4，导致鞭子不出现 → 统一用 ullStageOf()
- 鞭子精灵比例与坐姿不同，必须从容器宽高比计算里排除，否则会把宠物容器撑宽

### 挥鞭两帧 + 提醒计数（第三阶段）

**挥鞭动画**

- 素材：10_base/whip0.png / whip1.png（举起 / 甩出，2 格图切出来的）
- 切图脚本 scripts/make_whip_frames.py：**按头部中心对齐**，不是按鞋子——
  按鞋子对齐时两帧身体会明显错位
- 满屏锁定后每 900ms 切换一帧，遮罩同时有 3.6 秒一轮的抽打抖动

**提醒计数**

- 宿主把每次弹窗记到 ~/.dsh/dsh-sitter/reminders.json，按天存，只留最近 60 天
- POST /reminder 计数并返回今日次数；GET /stats 里带 eminders 字段
- 悬停卡新增第三行「提醒 N 次」，复盘"今天被念了几次"

**出图踩坑**：第一版提示词写「抽下/抽打」，被内容审核判为暴力（content_policy_rejected）。
改成「甩鞭花（表演性质）」并强调画面里没有攻击对象，就通过了。

### 监督形态改为「抱胸生气甩头」（第四阶段）

鞭子方案放弃（内容审核两次判暴力，且两帧太生硬），改成更可爱的表达：

- 素材：10_base/angry0..5.png，一张 3×2 的六帧图切出来
- 动作：**双手抱胸、眉毛下压、头左右甩**（6 帧一个循环）
- 播放：满屏锁定后每 **110ms** 换一帧（约 9fps，一个循环 660ms）
- 切图脚本 scripts/make_angry_frames.py：**按脚底中心对齐**（身体不动，脚最稳）
- 遮罩保留 3.6 秒一轮的轻微抖动，作为"哼！"的节奏

**教训**：像素动画帧数少于 4 帧一定显得卡；能一次出 6 格就用 6 格。
切多帧图时，对齐锚点要选**最不容易变的部分**（抱胸甩头这种动作，脚比头稳）。

### 四方向 + 高清帧（第五阶段）

- 素材：4K 出图（2×2），切成**四方向**（左上/右上/左下/右下），脚本 scripts/make_angry_frames.py
- 后处理三步，解决"放大后糙"：
  1. **调色板量化**（56 色）去掉 AI 出图的抖动噪点
  2. **去孤立像素**（孤立实心点→透明，孤立透明点→填邻居色）
  3. **嵌入高度 600**（不是 300），放大后依然锐利
- 播放：4 帧循环，每帧 180ms

**踩坑**：色数一开始设 28，奶嘴被量化成肤色消失了；56 色才保住。
**对齐**：这版抱胸甩头，脚底最稳，按脚底中心对齐。

## 交付审查结论（2026-11-22）

子智能体做了只读审查，结论「需修（小修）」。已修：

| 项 | 问题 | 修法 |
|---|---|---|
| 🟠 包规范 | exports 缺 "."，标准 Node 解析器认为无入口 | 补 ".": "./index.js" |
| 🟠 **CORS 预检** | 浏览器 JSON POST 全被预检拦死，/hello /config 静默失效 | 加 OPTIONS 204 + llow-methods / llow-headers |
| 🟠 调试残留 | 硬编码 D:\DSH-Pet\60_build 写盘 | 改写到 ~/.dsh/dsh-sitter/ |
| 🟠 body 无上限 | 超大请求可打爆内存 | 64KB 上限 |
| 🟡 无错误边界 | 组件抛错会拖垮整个页面（白屏） | 加 Boundary + /client-error 上报 |

**重要教训**：之前判断「客户端没重载」是**错的**——真正原因是 CORS 预检把 POST /hello 拦了，
所以版本探针永远为空。加了 OPTIONS 之后立刻能看到客户端版本号。
**以后判断"新代码是否生效"，先看探针通道本身是否可用，别急着怀疑重载。**

尚未处理（下一轮）：
- 端口写死 43717，冲突时静默
- CORS * 无 Origin 校验（/state 会泄露 session id）
- 同步 IO 跑在主进程（大量会话时可能卡 UI）
- 锚点只找一次，composer 后出现时永久错位
- 死代码（saveConfig/btn/CTX_KEYS）与魔法数字

## 第二轮加固（按审查剩余项）

| 项 | 修法 |
|---|---|
| 端口写死 | 宿主依次尝试 43717–43720，实际端口写 ~/.dsh/dsh-sitter/port.txt；客户端启动时探测可用端口 |
| CORS 全开 | 只允许 127.0.0.1 / localhost 来源，其它返回 403；/state 不再回 session id |
| 统计太慢 | 缓存 20s → 60s |
| 锚点只找一次 | 找不到 composer 时每 500ms 重试，最多 30 秒 |
| 死代码 | 删除 saveConfig / draft / dirtyRef / tn |
| 无离线验证 | 新增 scripts/check_client.mjs：用 vm + React stub 离线加载客户端，验证模块注册 / apply / 插槽注册 |


ode scripts/pet-cli.mjs check 现在 10 项全过（含离线加载校验）。

**踩坑**：改 pply() 时把 PORT_CANDIDATES 的声明一起删了，插件直接
ReferenceError: PORT_CANDIDATES is not defined 启动失败。
教训：**动结构前先确认保留头部常量**，改完立刻 
ode --check + 启动验证。

## 客户端自检（第五阶段）

刷新页面后，一键验证功能是否真的生效：

`powershell
node scripts/pet-cli.mjs selftest
`

流程：CLI 通过 /cmd 让页面跑一遍断言 → 客户端把结果 POST 回 /selftest → CLI 打印。

检查项：换装判定、四种姿态贴图、几何量、锚点是否找到输入框、句子池、监督四帧、走路四帧。
结果同时落盘 ~/.dsh/dsh-sitter/selftest.json。

这样即使没有截图，也能确认"刷新后代码真的跑起来了、功能没缺件"。

## 插件元数据（第六阶段）

按官方 host-plugin.md 规范补齐：

- locale/zh.json / locale/en.json：meta.title / meta.description / meta.detail
- docs/DETAIL.md：插件详情页正文（功能、配置、限制）
- package.json：exports 增加 "./locale/*.json" 与 "./icon"，iles 带上 locale 和 docs
- icon.png 走顶层 icon 字段（优先级高于 ./icon）

这样插件管理器里显示的是「贝草兰桌宠」而不是包名，详情页有完整说明。

## 性能与轮询（第七阶段）

- /state 加 1.5 秒缓存：多标签页轮询时只读一次会话文件
  实测：首次 39ms，缓存命中 7ms
- 页面隐藏（切到别的窗口）时暂停 /config 与 /state 轮询，回来立刻恢复

## 关键修复：页面 origin 是 dsh-app://app（第八阶段）

排查过程：宠物能显示（纯前端逻辑）但**改尺寸不生效、/hello 心跳为空、悬停卡没数字**。
加请求日志后看到真相：

`
17:58:23 GET /state origin=dsh-app://app
17:58:23 GET /config origin=dsh-app://app
`

DSH 桌面端的页面来自自定义协议 dsh-app://app，不是 http。
我自己加的「只允许 127.0.0.1 / localhost」Origin 白名单把**所有**请求判成 403，
于是配置、统计、心跳全部静默失效。

修法：白名单加上 ^dsh-app://[A-Za-z0-9._-]+$。

**教训**：
1. 加安全校验时，一定要先**记录真实请求头**，不要凭"本地服务就是 http://127.0.0.1"想当然。
2. 前端能显示 ≠ 数据通道正常；两者要分开验证（尺寸改不动就是通道坏的信号）。
3. 自检里 pass: !!r 会把返回的字符串当成功，必须用  === true。

## 内容感知碎碎念（第九阶段，零 token）

不再只是随机台词，而是**读你最后一条用户消息**来挑话：

- 宿主在 /state 里加 lastUser（只认 source.kind === 'user' 的真实消息，
  过滤掉 goal_round 这类系统注入，截断 160 字）
- 客户端 pickContextLine() 用关键词规则选台词：
  生图 → 「又在画图呀」；报错 → 「别慌，先看日志」；论文 → 「实验跑完了吗」；
  Stata → 「回归跑这么久，稳吗」；插件/代码 → 「又在写代码」；桌宠 → 「在说我吗」
- 调度时 55% 概率用内容感知台词，其余走通用池

**踩坑**：帮我画一张图 匹配不到 画图（中间夹了"一张"），自检项直接 FAIL，
把正则放宽成 画.{0,2}[张只幅] 才通过——**这种"看起来该匹配"的坑只能靠断言抓**。

## 事故记录：不要在运行中的宿主里调模型（2026-11-22）

**发生了什么**：为了做「模型吐槽」，我在插件宿主 index.js 里直接调
ctx.llm.stream() 并 or await 读流，然后在活着的应用里试了一次。
结果应用连续重启（Web GUI 端口 54790 → 62630），我的工具调用也被打断两次。

**原因**：宿主插件与页面跑在**同一个应用进程**。一次阻塞的模型调用足以让进程无响应，
被看门狗重启。这不是"代码写错"，而是**放错了地方**。

**处置**：
1. 立即从插件产物里移除全部 ctx.llm 调用（现已确认产物中为 0 处）
2. 代码原样保存到 scripts/pet/experiments/quip-endpoint.DISABLED.js，插件不加载
3. 宠物回到零 token 的关键词版（CONTEXT_RULES），已验证可用

**以后要碰模型，必须满足**：
- 独立 DSH 实例 + 独立 profile，绝不碰正在用的那个；或
- 用普通 node 脚本直连 provider API，完全不进应用进程
- 硬超时（AbortController）、失败静默、默认关闭

**教训**：能跑通的实验 ≠ 可以放进生产。危险能力要么隔离，要么不做。
