# 发布准备（2026-11-22 实测）

## 一、当前能做什么

| 事项 | 状态 | 证据 |
|---|---|---|
| 本地 git 仓库 | ✅ 已建 | `git log` = 1 条基线提交，工作区 clean |
| git 直连 github.com | ❌ 被阻断 | `schannel: failed to receive handshake` |
| git 走代理 + openssl | ✅ **通** | `git ls-remote https://github.com/git/git.git HEAD` → exit 0 |
| GitHub REST / MCP | ✅ 通 | 上一个会话实测：建仓、写文件、建分支、PR、合并、删除、release 全过 |
| `gh` CLI | ❌ 未安装 | 只影响侧栏 PR 跟踪，不影响发布 |
| npm 登录 | ❌ `ENEEDAUTH` | 只影响 `npm publish`；走 git 索引不需要 npm |

**唯一的环境坑**：Windows 上 git 默认用 schannel，经过代理时 TLS 握手必失败。
必须 `http.sslBackend=openssl`。你的全局配置里已经有 `http.proxy=https://127.0.0.1:7897`，
**只差 sslBackend 这一项**。

本仓库已自带（`.git/config`，不会入库）：

```
git config http.sslBackend openssl
git config http.proxy http://127.0.0.1:7897
```

要不要推到全局，等你定 —— 推了之后你所有仓库都能走代理，副作用是再也用不了系统证书链。

## 二、待你拍板的四件事

### 1. 推到哪个仓库（阻塞项）

需要：**owner / 仓库名 / public 还是 private**。
建议命名 `dsh-sitter`；owner 按你账号 `yanxin-x` 的话就是 `https://github.com/yanxin-x/dsh-sitter`。

### 2. 396 MB 素材怎么办（阻塞项）

当前基线入库 396 MB，其中 `10_base` 占 292 MB。里面**只有 150 张是插件真正加载的**，
另外 261 张是历史稿、备份、早期方案原料。

三个选项：

| 方案 | 仓库体积 | 代价 |
|---|---|---|
| A. 全推（现状） | 396 MB | GitHub 能收（单文件都 <100 MB），但首次 clone 很慢 |
| B. 只推用到的 150 张 + 代码（推荐） | ~90 MB | 未用素材留在本地并 ignore；历史稿不进版控 |
| C. git-lfs | ~90 MB + LFS 配额 | 需要装 lfs，GitHub 免费额度 1 GB |

我倾向 B：**未用素材不是"资产"而是"成本"** —— 它们最该被 git 记住的不是文件本身，
而是"哪张是定稿"这个结论（已经写在 `INHERIT-20261122.md` 里了）。

### 3. npm publish 要不要（非阻塞）

要让别人 `pnpm add @local/dsh-sitter` 才需要。DSH 插件走 git 索引就够了，可以先不做。

### 4. gh CLI 要不要（非阻塞）

装了才能在 DSH 侧栏看 PR 状态。`winget install GitHub.cli` 一条命令。

## 三、发布 DSH 插件的完整链路（上一个会话实测结论）

```
① repo 按插件包结构组织（package.json 带 dsh.client / dsh.bundle 字段）
② 打 tag + 建 release
③ 写 index.json，托管在 GitHub Pages 或 raw 链接
④ 用户在自己的 DSH 里 Discover 添加这个 index URL
⑤ 安装目标形如：
     git+https://github.com/<owner>/dsh-sitter.git#<commit>&path:/dsh-sitter
```

**注意**：`plugin_market` 只是**读取器**，不是发布器。发布 = 自己托管一个 index JSON。
`plugin_manager install_bundle` 对同名已装包会报 `already-installed`，更新必须
`remove_bundle` → `install_bundle`。

## 四、推之前我会做的检查

- [ ] 确认仓库里没有 token（`~/.dsh/cordis.patch.yml` 不在本仓库，安全）
- [ ] `git remote add` 用 `credential.helper=manager`，不把 token 写进 remote URL
- [ ] 首次 push 后核对：文件数、体积、`dsh-sitter/` 与 `60_build/` 确实没上去
