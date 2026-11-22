# 贝草兰（dsh-beicaolan）

一只贴在 DSH 输入框右上方的像素小家伙：陪你打字、提醒休息、按季节换装、看你学习。

**页面内挂件**（注册在 `conversation.composer.dock` 槽位），不是桌面透明窗。
**零 token** —— 台词全部来自本地词池 + 关键词匹配，不联网、不调用模型。

```
DSH 页面 ──React 组件──▶ 挂件（150 张精灵以 base64 内嵌进 client.js）
   │  每 2–5 秒轮询
   └──▶ 本地 HTTP 服务 127.0.0.1:43717（同进程宿主插件）
            配置 / 用量 / 命令 / 商店 / 自检
```

## 会做什么

| 能力 | 说明 |
|---|---|
| 陪伴 | 开局睡一会儿 → 衣柜换装 → 坐在金砖上待机 |
| 陪打字 | 你敲字或助手干活时，它掏出迷你笔记本一起敲，头顶冒思考云 |
| 眨眼 | 3.5–6.5 秒随机眨一次（按脸部包围盒只换眼睛那一条，整身不跳） |
| 换装 | 白天按季节自动换（春夏秋冬）；23:00–07:00 自动换睡衣 |
| 皮肤 | 12 套 + 商店（吉吉币本地计，每学习 10 分钟 1 枚） |
| 看用量 | 鼠标停在它身上：今日 token、今日时长、今天被提醒次数、吉吉币 |
| 护眼 | 连续工作约 40 分钟，放下电脑在输入框上来回跑几趟 |
| 监督 | 长时间没人操作会逐步放大直到占满屏幕，点一下确认「要认真学习」才复原 |
| 碎碎念 | 每一分多钟说一句，按你最后一条消息挑话（画图 / 报错 / 论文 / 代码…） |
| 拖动 | 拖着走，靠近边缘吸边，松手吸 6 个锚点之一，位置记在配置里 |

## 安装

需要 DSH 桌面端（Web GUI）。用插件管理器从 git 安装：

```
git+https://github.com/yanxin-x/dsh-beicaolan.git#<commit>&path:/dsh-sitter
```

`path:/dsh-sitter` 不能省 —— 插件包在子目录里，仓库根是整个开发工程。

装完在「设置 → 贝贝的基地」里调大小、换装、开关奶嘴。

## 配置

参数在 `~/.dsh/dsh-sitter/config.json`，改完 5 秒内生效，不用重启：

```json
{
  "displayHeight": 83,
  "timeline": { "sleepMs": 30000 },
  "outfits": { "force": null },
  "night": { "from": 23, "to": 7 },
  "break": { "workMs": 2400000 },
  "escalate": { "enabled": true, "idleMs": 180000 },
  "chat": { "intervalMs": 75000 }
}
```

完整参数见 [`scripts/pet/config.default.json`](scripts/pet/config.default.json)。
也可以用 CLI：

```powershell
node scripts/pet-cli.mjs status            # 状态 + 今日统计
node scripts/pet-cli.mjs set displayHeight=110 timeline.sleepMs=6000
node scripts/pet-cli.mjs reset
node scripts/pet-cli.mjs play sleep        # 让宠物演一个动作
```

## 自己改（开发）

**源码真源**：`scripts/pet/client.template.js`（客户端）、`host.template.js`（宿主）、
`config.default.json`。**`dsh-sitter/` 是构建产物，不要手改。**

```powershell
# 1. 重建产物（读 assets/ 的 152 个素材 + 模板，约 30 秒）
python scripts\make_sitter_plugin.py

# 2. 校验（都不碰运行中的应用）
node --check dsh-sitter\index.js
node scripts\check_client.mjs               # 离线加载客户端（vm + React stub）
node scripts\test_cmd_channel.mjs           # 宿主接口隔离冒烟，20 项

# 3. 装进本机 profile
$inst = "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\@local\dsh-sitter"
copy dsh-sitter\client.js, dsh-sitter\index.js, dsh-sitter\package.json $inst

# 4. 热重载客户端：开关插件，不用刷新页面
plugin_manager set_plugin include:dsh-sitter enabled=false
plugin_manager set_plugin include:dsh-sitter enabled=true
```

> ⚠️ `pet-cli.mjs play / check` 会向**正在运行的应用**投递命令。改宿主路由后先跑
> `test_cmd_channel.mjs`（临时 HOME + 自动选空闲端口，完全隔离），再碰线上。
> 历史上有一个路由 bug 让应用连着重启了 5 次，记录在 `80_docs/RED-LINES.md`。

## 目录

| 目录 | 是什么 |
|---|---|
| `dsh-sitter/` | **插件包**（构建产物，但必须入库 —— 用户从 git 装的就是它） |
| `scripts/pet/` | 源码真源：client / host 模板 + 默认配置 |
| `scripts/make_sitter_plugin.py` | 构建器：读模板 + 嵌素材 + 填占位符 |
| `assets/` | **构建真正读到的 152 个文件**（150 张精灵 + fitting_meta + 插件图标） |
| `80_docs/` | 架构、红线、发布、工作流等文档 |
| `10_base/`、`50_anim/` 等 | 历史素材底稿，**未入库**，仅本地保留 |

## 文档

| 文档 | 讲什么 |
|---|---|
| [80_docs/INHERIT-20261122.md](80_docs/INHERIT-20261122.md) | **架构全图 + 10 个难改点**，接手先看这个 |
| [80_docs/RED-LINES.md](80_docs/RED-LINES.md) | 7 条血泪红线，每条都对应一次真实崩溃 |
| [80_docs/RELEASE.md](80_docs/RELEASE.md) | 发布链路与已知环境坑 |
| [scripts/pet/README.md](scripts/pet/README.md) | 开发史与踩过的坑（很长，当字典查） |

## 许可

MIT。素材由作者用 AI 出图后手工修整，随代码一并按 MIT 授权。
