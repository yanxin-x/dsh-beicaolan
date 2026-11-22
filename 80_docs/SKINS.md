# 形态注册表（皮肤统一格式）

> 一句话：**除了"睡觉"，一切外观都是「形态」（form），一套格式，一个真源 `scripts/pet/skins.json`。**

## 一、为什么统一

改造前皮肤有三套互不相同的注册方式：

| 家族 | 待机 | 眨眼 | 打字 | 不戴奶嘴 |
|---|---|---|---|---|
| 四季 | `idle0..3` | `blink0..3` | `typing0..3` | `nopac_s0..3` |
| 睡衣 | `pajama0` | `pajama1` | `pajama2` | `nopac_pajama` |
| 12 套皮肤 | `skin_<id>` | `blink_<id>` | `typing_<id>` | `nopac_<id>` |

同一件事三种命名，加一套皮肤要同时改 **5 个地方**（图 / SPRITES / SKIN_IDS / 宿主商店表 / 回退链），
漏一处**不报错**，只是静默显示错的图。

现在：**一套 `<form>.<pose>.<pac>`**，商店价格也在同一份文件里。

## 二、注册表长什么样

`scripts/pet/skins.json`：

```json
{
  "version": 1,
  "poses": ["idle", "blink", "typing"],
  "forms": [
    {
      "id": "s0", "label": "冬装", "kind": "season",
      "months": [12, 1, 2], "rotateIndex": 0,
      "sprites": {
        "idle":   { "pac": "sitting.png",  "nopac": "nopac_s0.png" },
        "blink":  { "pac": "blink0.png",   "nopac": "nopac_blink_s0.png" },
        "typing": { "pac": "typing0.png",  "nopac": "nopac_typing_s0.png" }
      }
    },
    { "id": "pajama", "label": "睡衣", "kind": "night", "months": [], "sprites": { ... } },
    {
      "id": "caveman", "label": "原始人", "kind": "skin", "months": [],
      "shop": { "price": 20, "desc": "兽皮背心 + 骨头发簪", "emoji": "🦴" },
      "sprites": { "idle": {...}, "blink": {...}, "typing": {...} }
    }
  ]
}
```

`kind` 只有三种含义：

| kind | 谁 | 怎么被选中 |
|---|---|---|
| `season` | `s0..s3` | 按 `months` 自动；`seasonMode: "rotate"` 时按 `rotateIndex` 轮换 |
| `night` | `pajama` | 落在 `night.from ~ night.to` 时段自动 |
| `skin` | 12 套 | 只能手动（面板衣橱 / `outfits.force`），带 `shop` 才能在商店买 |

## 二·五、逐形态的坐姿校准（`seat`）

所有皮肤画在同一画布、**脚底对齐**，但坐姿不同：标准坐姿、盘腿、抱腿……
屁股在精灵里的高度不一样，用同一个 `seat.buttRatio` 就会「人浮在砖上」或「陷进砖里」。

所以允许逐形态覆盖（可选字段，不写就用全局 `seat.buttRatio`）：

```json
{ "id": "caveman", "label": "原始人", "kind": "skin", "seat": 0.30, ... }
```

- 值 = 屁股在精灵高度中的比例，**越小 → 屁股越低 → 砖越往下**
- 判据：让它像「坐在砖上」，屁股压在砖的上表面、腿在前面垂下来
- 现在的覆盖：`caveman: 0.30`（盘腿、身前还有鼓，重心比标准坐姿低）

**加新皮肤时**：先不写 `seat`（用默认 0.38）；如果发现砖高/低，就补一个 0.26–0.42 之间的值。

## 三、key 规则

```
<form>.<pose>.<pac>        pac = pac（戴奶嘴） | nopac（不戴）
<form>.typing.<pac>.b      打字第二帧（构建期从第一帧下移 4px 派生）
```

例：`cat.typing.nopac.b`

## 四、缺图怎么办：回退顺序（写死在客户端，注册表不管）

```
① <form>.<pose>.<当前奶嘴状态>
② <form>.<pose>.<另一种奶嘴状态>
③ <form>.idle.<当前奶嘴状态>
④ <form>.idle.<另一种奶嘴状态>
⑤ s0.idle.pac / s0.idle.nopac
```

所以**注册表只描述"有什么素材"，不描述"缺了怎么办"**——补图不会牵动代码。

## 五、加一套新皮肤 = 3 步

1. 把图放进 `assets/`（规格：透明底、高 180、同画布居中；见 `make_sitter_plugin.py` 的 `embed()`）
2. 在 `skins.json` 的 `forms` 里加一条（`kind: "skin"` + `shop` 价格）
3. `python scripts/make_sitter_plugin.py`

**不需要**改客户端、不需要改宿主、不需要调回退链、不需要碰 `SKIN_IDS` 或商店表——
它们全部由注册表生成。打字两帧也自动有。

## 六、加一个新姿势 = 1 处

在 `skins.json` 的 `"poses"` 里加一个名字，再给想支持的形态补 `<pose>` 素材即可。
没补的形态会自动回退到 idle（不会空白）。

## 七、构建期校验

```powershell
python scripts/make_sitter_plugin.py
# 输出里会出现：
#   形态 17 个，贴图 150 张（其中打字第二帧 33 张）
# 若注册表引用了不存在的文件，会打印 [warn] 清单，不静默跳过
```

**等价性回归**（重构/迁移后必跑）：对比改动前后每个
`(形态 × 姿势 × 奶嘴状态 × 帧)` 解析出来的贴图是否逐字节一致。
这次迁移的结果：**135/136 完全一致，1 处是有意修正**——睡衣的「不戴奶嘴待机」
以前错误地退回了带奶嘴的 `pajama0`，现在正确命中 `nopac_pajama`。

## 八、睡觉为什么不进注册表

睡觉是唯一的「非人形」画面：整张被子小恐龙、没有 idle/blink/typing 三个姿势、
几何锚点也不同（它没有"屁股"，直接贴输入框上沿）。硬塞进形态格式只会逼出一堆空位，
所以它保持独立：`PROPS.sleep` → `SPRITES.sleep`。

## 九、加一套新皮肤：一条命令 + 一张清单（2026-11-22）

```powershell
python scripts/new_skin.py --id plant --label 植物人 --price 100 `
    --desc "藤蔓缠身 + 叶冠" --emoji T --voice base
```

它会做三件事：

1. 在 `skins.json` 里加一条（含 `shop` 价格 + `voice` 人设）
2. 生成出图提示词 `80_docs/skin_prompts/<id>.txt`（已写死"同一个角色/同一套画风/第二帧怎么画"）
3. 打印 **8 张素材的精确文件名清单**，并标出哪些已经有了

然后：

```powershell
python scripts/make_sitter_plugin.py
```

构建会**逐张校验**，缺哪张报哪张，不合规直接拒绝构建。

### 构建期规范校验（这是"达标"的关键）

| 检查 | 级别 | 说明 |
|---|---|---|
| 文件存在 | ❌ 错误 | 注册表写了但文件没有 |
| 能读、是 RGBA | ❌ 错误 | 透明底 |
| `nopac_*` 与戴奶嘴版**逐像素相同** | ❌ 错误 | 说明根本没去奶嘴 |
| 最后一行有没有像素 | ⚠️ 警告 | 脚底要贴画布底边，否则坐姿对位会歪 |
| `typing` 有没有**真·第二帧** | ⚠️ 警告 | 变化 ≥2% 才算；否则构建会用位移凑（用户明确拒绝） |

现在跑一次会报 **21 条"没有真第二帧"**——正好是待补的美术数量。

### 人设语气（`voice`）

每个形态可以有一条自己的语气线，**但共用一个身份：陪伴你工作的好男友**。

| voice | 覆盖形态 | 味道 |
|---|---|---|
| `base` | 四季 / 睡衣 / 性转 | 普通温柔 |
| `caveman` | 原始人 | 短句、单字、笨拙的温柔（"唔…喝水"） |
| `beast` | 狼 / 狐 / 猫 / 熊 | 兽感（"蹭蹭"、"尾巴借你抱"） |
| `muscle` | 肌肉男 | 憨直（"我扛着，你写"） |
| `snake` | 蛇人 | 凉、慢（"凉不凉"） |
| `dragon` | 龙人 | 古风、威严但软（"胆敢戳龙"） |
| `whale` | 鲸人 | 安静、慢（"海水一样慢"） |
| `ultra` | 光之巨人 | 正经口号（"光在你这边"） |
| `qipao` | 旗袍 | 文雅（"灯下慢慢写"） |

只覆盖最常出现的三个池子（idle / work / poke），**65% 概率说自己的话，其余走公共池**——
这样既有人设区别，又不会把 87 句公共台词乘 17 份。
