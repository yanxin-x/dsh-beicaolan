# 桌宠工作流

目标：**一只宠物，多种状态**。不做多只宠物，不做组合爆炸。

---

## 一、素材分层

```
20_face/norm/         表情层：joy_1..3 / anger_1..3 / sad_1..3 / fun_1..3 / sleepy_1..3
20_face/norm/*_np_*   摘奶嘴版：同一批表情，只是没奶嘴
30_clothes/norm/      衣服：tops_1..4（上衣）、bottoms_1..4（下装）
10_base/body_ref.png  定稿素体，所有新素材都以它为参考图
```

约定：画布 900×760、透明底、人物脚底对齐、像素颗粒一致。

## 二、从素材到动画

```powershell
# 单段动画（精灵 -> 640x360 VP9-alpha webm）
python scripts\build_anims.py --sprite 20_face/norm/joy_1.png --name 待机 --duration 1.25 --bob 5

# 一次装配整只宠物（改脚本里的 ANIMS 表即可）
python scripts\build_single_pet.py

# 让它生效
curl.exe -X POST http://127.0.0.1:62898/dsh-pet-7340/reload
```

`build_single_pet.py` 里有两个关键表：

- `ANIMS`：动画名 → 哪个精灵 → 时长/浮动/挤压/抖动
- `CONFIG.animations`：动画名 → 什么时候播（idle / clicks / categories / sleep）

**新增一个状态只需两步**：往 `ANIMS` 加一行，再在 `CONFIG.animations` 里挂到某个池子。

## 三、状态怎么映射

| 池子 | 触发 | 现在放了什么 |
|---|---|---|
| `idle` | 待机 | 待机（睁眼微笑） |
| `clicks` | 点它 | 开心、大笑 |
| `categories` | 随机小动作 | 表情类：生气、难过；换装类：春装、夏装、秋装、冬装、摘奶嘴 |
| `sleep` | 右键睡觉 | 睡觉 |

权重规则：`idle + turn + move` 与所有 `categories` 的 weight **加起来等于 100**，否则配置报错。

## 四、验证

1. 看配置生效：`curl.exe http://127.0.0.1:62898/dsh-pet-7340/config`
2. 看判定：`~/.dsh/dsh-pet/logs.txt` 里的 `桌面判定：桌面可见=N`
3. 看窗口：`Invoke-Expression (Get-Content scripts\list-pet-windows.ps1 -Raw)`，宠物窗口数应为 1
4. 看画面：截图右下角再读图

## 五、常见坑

- **分身**：`display` 为 `both` 会同时出两只（网页一只 + 桌面一只）；只用 `desktop`。
- **素材 404**：URL 是 `/thumb/<种类名>/<动画名>.webm`，种类名是配置文件名前缀（`baobao-config.json` → `baobao`），**不是宠物 id**。
- **中文文件名**：ffmpeg 写中文路径会报 Permission denied，所以编码一律先落到工作区再复制。
- **改 display 不生效**：改配置不会自动重建窗口，必须 `POST /reload`。

## 六、动作分解图 -> 序列动画（跳舞这类）

一张 16:9 的分解图可以排 8 个姿势，一次出图拿到 8 帧，比逐帧生成省 7 倍调用次数。

```
python scripts\build_sequence_anim.py --sheet 50_anim/sheets/dance_xxx.png --name 跳舞 --fps 10 --repeat 3
```

- --fps 10：8 帧 = 0.8 秒
- --repeat 3：整段循环 3 遍 = 2.4 秒，太短会像抽一下
- 切帧靠列投影自动找间隙，帧之间要求「同高、同基线、留白」

出图提示词模板：`50_anim/_prompts/dance_grass.txt`

接进宠物：在 `build_single_pet.py` 的 `CONFIG.animations.categories` 里加一个动作池，
所有权重与 `animationWeights` 相加必须等于 100。

手动触发（调试用）：

```
curl -X POST "http://127.0.0.1:62898/dsh-pet-7340/anim?pet=baobao1&surface=desktop" ^
  -H "Content-Type: application/json" --data-binary "@60_build/anim_req.json"
```

其中 `anim_req.json` 是 UTF-8 的 `{"name":"跳舞"}`；**surface 走 query 参数**，不是 body。

## 七、坐在输入框上（dsh-sitter 插件）

桌宠的桌面透明窗是「飘」的：没有承托面，位置固定，跟界面无关。
要让它坐在输入框上，必须换成**页面内挂载**：注册到 conversation.composer.dock 槽位，
它就会随输入框布局，天然坐在输入框上沿。

```
python scripts\make_sitter_plugin.py     # 生成/刷新插件（精灵以 base64 内嵌）
```

安装（本机目录，改完要把文件同步进 profile 的 node_modules）：

```
plugin_manager install_bundle  target=file:D:/DSH-Pet/dsh-sitter
copy D:\DSH-Pet\dsh-sitter\client.js %USERPROFILE%\.dsh\profiles\desktop\node_modules\@local\dsh-sitter\
```

改完 **刷新页面**（Ctrl+R）才生效：客户端模块是在页面加载时装配的。

关键 CSS：position:absolute; right; bottom:22px; —— bottom 控制「坐在哪条线上」，
调大就是把屁股往上挪。

## 八、头/身体分层（rig）

```
python scripts\rig_split.py --sprite 30_clothes/norm/tops_2_smile.png --name stand
```

产出 ig/head.png（规范头，含发型和奶嘴）+ ig/body_<pose>.png，以及 ig/anchor.json。

- 切分点按**剪影最窄处（脖子）**估算，站姿落在 46% 高度
- 同比例、同参考图生成的姿势可以直接复用头部；坐姿这类比例不同的姿势，需要单独在 anchor.json 里调缩放和偏移

## 九、sitter 插件的状态机与固定位

- 挂载 -> sleep 120 秒 -> idle；计时用**模块级时间戳** LOADED_AT，槽位重挂载不会重置。
- 睡眠态：金黄色小恐龙被子 + 呼吸耸动（5.2s，scaleY 1.035）+ 呼噜泡（8.5s 一个周期，只在 sleep 显示）。
- 固定位两段式：
  1. 横向 ight 用宿主变量 --dsh-composer-side-clearance / --dsh-composer-card-max-width
  2. 纵向 --dsh-sitter-lift 优先用 measureLift() 实测（容器底 - 输入框上沿），失败回落 26px
- 改完用插件开关重载，不用刷新页面：

```
plugin_manager set_plugin include:dsh-sitter enabled=false
plugin_manager set_plugin include:dsh-sitter enabled=true
```
