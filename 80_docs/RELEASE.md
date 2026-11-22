# 发布记录（2026-11-22）

## 一、已发布

| 项 | 值 |
|---|---|
| 仓库 | https://github.com/yanxin-x/dsh-beicaolan （**public**） |
| 首个提交 | `1f2cafa6ce004df36e9f1ce876bc524e51d05529` |
| tag | `v1.0.0` |
| 入库 | 183 个文件 / 30 MB |
| 插件包 | `dsh-sitter/`（子目录） |
| 打包实测 | `files` 过滤后 **9 个文件 / 5.6 MB**（`npm pack --dry-run`） |

### 安装目标

```
git+https://github.com/yanxin-x/dsh-beicaolan.git#1f2cafa6ce004df36e9f1ce876bc524e51d05529&path:/dsh-sitter
```

`path:/dsh-sitter` 不能省：仓库根是开发工程，插件包在子目录。
更新插件时 `install_bundle` 会报 `already-installed`，必须 `remove_bundle` → `install_bundle`。

## 二、仓库里有什么

```
dsh-beicaolan/
├─ dsh-sitter/          ← 插件包（用户从 git 装的就是它）
│   ├─ package.json     dsh.bundle.patch + dsh.client + exports + files + icon
│   ├─ cordis.patch.yml
│   ├─ index.js  client.js        （构建产物，必须入库）
│   ├─ locale/zh.json  en.json    meta.title / description / detail
│   ├─ docs/DETAIL.md
│   └─ icon.png                   41 KB（上限 256 KiB）
├─ assets/              152 个构建输入（150 张精灵 + fitting_meta + 图标）
├─ scripts/pet/         源码真源：client/host 模板 + config.default.json
├─ scripts/             构建器 + 3 个校验脚本 + CLI
├─ 80_docs/             架构 / 红线 / 工作流
├─ README.md  LICENSE(MIT)  .gitignore
```

**没进仓库**（留在本地当底稿，`.gitignore` 里写清了）：
`10_base/` `20_face/` `30_clothes/` `40_actions/` `50_anim/` `00_ref/` `rig/`
`60_build/` `70_dist/`、`scripts/_*.py`（一次性补丁）、`scripts/*.ps1`、`scripts/pet/experiments/`。

## 三、环境坑（下次直接照抄）

### 1. git 必须 `http.sslBackend=openssl`

Windows git 默认 schannel，过代理必然 `SSL/TLS connection failed`。
本仓库 `.git/config` 已设（机器相关，不入库）：

```
git config http.sslBackend openssl
git config http.proxy http://127.0.0.1:7897
```

全局只差 sslBackend 这一项；要不要推全局等你定。

### 2. 首次 push 会遇到 TLS 抖动，重试即可

第一次 push 报：

```
TLS connect error: error:0A000126:SSL routines::unexpected eof while reading
```

加上这几个参数后一次通过（30 MB）：

```
git -c http.postBuffer=524288000 -c http.lowSpeedLimit=0 -c http.lowSpeedTime=999999 push
```

**认证不要写进 remote URL**。用一次性头：

```powershell
$tok = (Select-String -Path "$env:USERPROFILE\.dsh\cordis.patch.yml" -Pattern "GITHUB_PERSONAL_ACCESS_TOKEN:\s*'([^']+)'").Matches.Groups[1].Value
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("x-access-token:$tok"))
git -c http.extraheader="Authorization: Basic $b64" push
```

### 3. `npm` 在 PowerShell 里被 ExecutionPolicy 拦

用 `npm.cmd`，别用 `npm`。

### 4. 写文件别让 PowerShell 加 BOM

`Set-Content -Encoding UTF8` 在 PS 5.1 会加 BOM，`node --check pet-cli.mjs` 会报
`Invalid or unexpected token`（BOM 在 `#!` 前面）。用：

```powershell
[System.IO.File]::WriteAllText((Resolve-Path $f), $t, (New-Object System.Text.UTF8Encoding($false)))
```

## 四、还没做

| 项 | 状态 | 说明 |
|---|---|---|
| 从 git 真机安装一次 | ⚠️ 未实测 | 会动到正在用的 `@local/dsh-sitter`，留着等隔离 profile 里验 |
| `index.json`（Discover 索引） | ❌ | 想让别人在插件市场里发现才需要；托管到 Pages 或 raw |
| npm publish | ❌ | `npm whoami` = ENEEDAUTH；走 git 安装不需要 |
| gh CLI | ❌ | 只影响侧栏 PR 跟踪 |

### 从 git 安装怎么验（安全做法）

不要直接 `remove_bundle` 线上那套。起一个独立 DSH 实例 + 独立 profile，在里面：

```
plugin_manager install_bundle target="git+https://github.com/yanxin-x/dsh-beicaolan.git#1f2cafa6...&path:/dsh-sitter"
```

再确认 bundle 详情页的标题/描述/详情/图标都正常，插件行有图标，宠物能出现在输入框上。
