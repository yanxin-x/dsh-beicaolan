# 贝草兰 · 安装与移植

目标：**在另一台电脑上，装上这个插件就能用全部功能**。本文列清所有前置、步骤和坑。

---

## 一、插件本体（必需）

插件产物在仓库的 `dsh-sitter/` 目录里，是自包含的：

```
dsh-sitter/
  package.json     # DSH 插件清单
  cordis.patch.yml # 插槽声明
  index.js         # 宿主侧（本地 HTTP 服务 + 配置读写）
  client.js        # 页面侧（宠物本体、动画、台词、设置面板）
  icon.png
  locale/
  docs/
```

**只装这 3 个文件就够**：`package.json`、`index.js`、`client.js`（`icon.png`/`locale` 可选）。

### 装法 A：从 GitHub 装（推荐）

```powershell
# 先拿到一个固定 commit，避免装到半成品
git ls-remote https://github.com/yanxin-x/dsh-beicaolan main
```

然后在 DSH 里用插件管理器装（把 `<SHA>` 换成上一步的 commit）：

```text
plugin_manager install_bundle
  target: git+https://github.com/yanxin-x/dsh-beicaolan.git#<SHA>&path:/dsh-sitter
```

### 装法 B：本地目录

把 `dsh-sitter/` 整个拷到：

```
%USERPROFILE%\.dsh\profiles\desktop\node_modules\@local\dsh-sitter\
```

然后 `plugin_manager set_plugin` 启用。

### 装完之后**必须**做的一步

```
plugin_manager set_plugin  enable   → 关
plugin_manager set_plugin  enable   → 开
然后对 DSH 主窗口按 Ctrl + R
```

> ⚠️ **插件开关本身不会重新加载页面侧的 client.js**。不按 Ctrl+R 你会一直看到旧版本，而且表现为"我改了没生效"——这是本项目最容易踩的坑，排查过至少 3 次。

---

## 二、运行时依赖（全自动，无需安装）

| 依赖 | 说明 |
|---|---|
| Node | DSH 自带，插件跑在它里面 |
| Python | **只有重建素材时需要**，装完即用不需要 |
| 网络 | **完全不需要**。全部本地：数据存 `~/.dsh/dsh-sitter/`，不出网 |
| 模型 API | **不调用**。台词全是本地规则，零 token |

宿主侧会起一个本地 HTTP 服务（端口 43717–43720 自动挑一个），只监听 `127.0.0.1`。

---

## 三、运行时文件（自动生成，可删）

```
%USERPROFILE%\.dsh\dsh-sitter\
  config.json        # 你的配置（尺寸、皮肤、台词开关…）
  port.txt           # 当前服务端口
  coins.json         # 金币数
  reminders.json     # 学习监督
  selftest.json      # 自检结果
  diag-client.json   # 页面状态探针（排错用）
  client-error.log   # 页面报错（有内容说明出问题了）
  handler-error.log  # 宿主报错
```

删掉不影响使用，下次启动会重建（配置会回到默认）。

---

## 四、跨机器必须确认的 3 件事

1. **仓库里不能有绝对路径**。已审计：所有脚本用 `__file__` / `os.homedir()` 定位，无 `D:\`、`C:\Users\` 写死。
2. **`dsh-pet` 面板是可选依赖**。宿主会尝试读 `~/.dsh/dsh-pet/main-config.jsonc` 来联动桌面版宠物；没有这个文件就静默跳过，不影响使用。
3. **素材在 `assets/`，不需要单独下**。构建产物 `client.js` 里已经把图片全部内联成 base64（约 7.3 MB），所以**只拷 `dsh-sitter/` 三个文件就能跑**，不依赖仓库其它目录。

---

## 五、换机器后的验收清单

```powershell
# 1) 页面侧静态检查（不需要跑应用）
node scripts/check_client.mjs
#   → 期望：全部通过

# 2) 宿主命令通道离线测试（会临时起一个独立服务，不影响正在运行的）
node scripts/test_cmd_channel.mjs
#   → 期望：20/20

# 3) 素材规范校验
python scripts/make_sitter_plugin.py
#   → 期望：形态 17 个、贴图 160 张；规范警告应为 0~1 条
```

装好后肉眼确认：
- 宠物坐在输入框右上方，**不压住发送键**
- 思考时头顶出现云，说话时出现气泡，两者不重叠
- 换皮肤时有一个**礼物盒**盖上再打开
- 睡一会儿会盖被子
- 设置面板（设置 → 贝贝的基地）能翻皮肤、买皮肤、调尺寸

---

## 六、重新构建（只有改素材/改代码才需要）

```powershell
pip install pillow
python scripts/make_sitter_plugin.py     # 产出 dsh-sitter/
```

加一套新皮肤：

```powershell
python scripts/new_skin.py --id plant --label 植物人 --price 100 --desc "藤蔓缠身" --voice base
# 它会：写入注册表 + 生成出图提示词 + 打印 8 张素材的精确文件名
python scripts/make_sitter_plugin.py     # 缺哪张报哪张
```

---

## 七、排错表

| 现象 | 原因 | 处理 |
|---|---|---|
| 改了没生效 | 页面还在跑旧的 client.js | 关开插件 + **Ctrl+R** |
| 宠物不出现 | 插件没启用 / 插槽没注册 | 看 `client-error.log`；`check_client.mjs` 能看到插槽注册 |
| 宠物不跟着打字 | `features.workLink` 关了，或长会话读不到事件 | 开 `workLink`；宿主已做 tail 窗口自适应 |
| 应用突然重启 | 宿主未捕获异常 | 看 `handler-error.log`；命令通道已有 `once()` 保护，回归过 20/20 |
| `preflight.mjs` 报 EPERM | DSH 沙箱不允许管道式 spawn | 已知限制，用 `check_client.mjs` 代替 |
| `git push` TLS EOF | 代理能过小请求、掐大上传 | 用 `http.version=HTTP/1.1` + `http.postBuffer=8388608` 重试 |
| 生图 `generation_unavailable` | 上游偶发，**已退款** | 直接重试，不花钱 |
| 生图 `n=2` 只回 1 张然后空转 | `gen.py` 的 `_dig_url` 只取第一个 URL | **一律 `--n 1`**，要几张提交几次 |
