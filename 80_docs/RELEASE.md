# 发布记录

## v1.0.0（定稿）

| 项 | 值 |
|---|---|
| 仓库 | https://github.com/yanxin-x/dsh-beicaolan （**public**） |
| tag | **`v1.0.0`** |
| 插件包 | 仓库子目录 `dsh-sitter/` |
| 形态 | 17 个（四季 4 + 睡衣 1 + 付费皮肤 12） |
| 贴图 | 157 张，其中打字第二帧 **34/34 全是真素材** |
| 规范校验 | **0 条警告** |
| 离线回归 | `check_client.mjs` 全通过 / `test_cmd_channel.mjs` 20-20 |

### 一句话安装（发给对方的 DSH 即可）

```text
帮我装个桌宠插件：plugin_manager 的 install_bundle，
target 用这个：
git+https://github.com/yanxin-x/dsh-beicaolan.git#v1.0.0&path:/dsh-sitter
装完把插件启用，然后对主窗口按 Ctrl+R。
```

`path:/dsh-sitter` 不能省——仓库根是开发工程，插件包在子目录。

### 更新已有安装

`install_bundle` 遇到同名会报 `already-installed`，必须先卸再装：

```text
plugin_manager set_plugin  target=include:dsh-sitter  enabled=false
plugin_manager remove_bundle target=<旧包名>
plugin_manager install_bundle target=git+https://github.com/yanxin-x/dsh-beicaolan.git#v1.0.0&path:/dsh-sitter
plugin_manager set_plugin  target=include:dsh-sitter  enabled=true
然后 Ctrl+R
```

> ⚠️ **插件开关本身不会重载页面侧模块**，不按 Ctrl+R 会一直看到旧版本。
> 这是本项目最容易踩的坑，排查过至少 3 次。

### 装完之后看到什么

- 一只像素小人坐在输入框右上方（**不压住发送键**）
- 你打字时它跟着敲键盘（两帧交替），偶尔眨眼
- 思考时头顶冒云、说话时左边出气泡，两者不重叠
- 放置一会儿会盖上小被子睡觉
- 换皮肤时有个礼物盒盖上再打开
- 设置 →「贝草兰」：调大小、开关奶嘴、衣橱/商店（吉吉币：每学习 10 分钟 1 枚）

### 已知遗留（计划 v1.0.1）

| 项 | 说明 |
|---|---|
| 鲸人 / 蛇人的 **pac 版 idle 是旧设计**（卫衣 vs 军装，剪影 IoU 0.599 / 0.766） | 其余所有帧都是军装版，需要重画这两张 |
| 熊 pac 打字第二帧、冬装 nopac 眨眼 | 重绘幅度偏大（IoU 0.779 / 0.792） |
| 10 对帧有 3~15px 的**竖直**偏差 | 属 AI 重绘固有误差；修了会让屁股离砖或头顶留空，反而更扎眼 |

详见 `80_docs/AUDIT-20261122.md`。

---

## 仓库里有什么

```
scripts/            开发工程（模板 + 构建器 + 测试 + 维护脚本）
assets/             素材原图（157 张 + 道具）
dsh-sitter/         ★ 插件产物（装这个）
80_docs/            设计/布局/皮肤/安装/体检等文档
CHANGELOG.md        全程变更记录
```

`dsh-sitter/` 是自包含的：`client.js` 已把图片全部内联成 base64（约 7.2 MB），
**只拷 `package.json` / `index.js` / `client.js` 三个文件就能跑**，不依赖仓库其它目录。

## 运行时

- 零网络、零模型调用、零外部依赖（素材与台词全在本地）
- 状态目录 `~/.dsh/dsh-sitter/`：`config.json` / `coins.json` / `port.txt` / 各类日志
- 删掉状态目录不影响使用，配置回默认


## 安全更新流程（推荐）

`plugin_manager` 是给 AI 用的工具，命令行调不到它。所以更新分成两步：
**脚本做预检和备份，AI 做装卸，脚本再做校验**。

```powershell
# ① 更新前：预检 tag 是否存在 + 备份插件包与用户数据 + 生成回滚说明
node scripts/update_plugin.mjs --tag v1.0.6

# ② 把脚本打印的三条 plugin_manager 命令交给 AI 执行
#    （remove_bundle → install_bundle → set_plugin）

# ③ 更新后：校验宿主在线、版本、吉吉币是否与备份一致
node scripts/update_plugin.mjs --verify v1.0.6

# 万一装坏了：打印回滚步骤
node scripts/update_plugin.mjs --rollback
```

### 为什么必须"先预检"

`remove_bundle` 会把**依赖和 bundle 登记一起删掉**。如果随后 `install_bundle`
因为断网/代理失败，结果不是"更新失败"，而是 **插件直接消失**。
预检会先确认目标 tag 在远端能取到；连不上 GitHub 就**直接拒绝开始**。

### 备份与回滚

- 插件包备份：`06_backups/plugin-<时间戳>/`（420 个文件，可 `install_bundle file:` 直接装回）
- 用户数据快照：`06_backups/userdata-latest.json`（吉吉币与解锁状态）
- 回滚说明：`06_backups/ROLLBACK.txt`（三档回退方案）

**用户数据永远不在插件包里**：吉吉币/配置在 `~/.dsh/dsh-sitter/`，
更新只替换 `node_modules/@local/dsh-sitter/`，两者物理隔离。
