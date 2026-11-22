# 布局契约（四个主要元素）

改位置只动两个地方：`scripts/pet/config.default.json` 的 `layout.*`，和
`client.template.js` 里的 `LAY()`。**CSS 里不再写死任何元素坐标。**

## 一、坐标系

宠物挂件的容器（wrap）宽 `w`、高 `h`，都由 `displayHeight` 推导：

```
h = displayHeight                       // 用户可调 50–140
w = round(h × spriteRatio)              // spriteRatio ≈ 1.667，素材 300×180
```

四个元素全部相对这个 `w × h` 定位，所以**换大小不会错位**。

| 元素 | 组件 | 锚点 | 配置键 |
|---|---|---|---|
| 宠物主体 | `<PetBody>`（img） | 底部贴 wrap 底，水平居中 | `layout.seatInset`（相对输入框右缘） |
| 金砖 | `<SeatBrick>` | **屁股**（`seat.buttRatio`）压在砖面上，砖底压过输入框上沿 | `brick.height/overlap/sink`、`seat.buttRatio` |
| 台词框 | `<SayBubble>` | 宠物上方偏左，向左展开 | `layout.say.right/gapY/maxW`（占 w/h 的比例） |
| 思考云 | `<ThinkBubble>` | 头顶偏右，尾巴朝下 | `layout.think.x/y/size` |
| 呼噜泡 | `<SleepBubble>` | 睡觉时头顶右上 | `layout.sleepBubble.right/top/size` |

## 二、纵向：屁股落在砖上

这是最容易搞错的一处。`calibrate()` 做两件事：

1. **贴边**：把 wrap 的底边迭代到输入框上沿（3 次收敛到 1px 内）；
2. **让砖**：`seatRise = -(overlap - brickH + sink + butt)`，把整只抬高，让「屁股」而不是「脚底」落在砖面上。

`buttRatio = 0.38` 是屁股在精灵高度里的位置。**换素材后屁股位置变了，这个数要重新量**。
`debug: true` 时右上角会显示 `lift / gap`，用来核对。

## 三、横向：只由 seatInset 决定

```
right = (容器右缘 − 输入框右缘) + seatInset
```

`seatInset = -6` 表示宠物右缘探出输入框右缘 6px。

**曾经的坑**：这里还叠了 dsh-pet 面板的 `panel.corner` / `panel.marginX`，
导致"同样的 seatInset 在不同人机器上位置不一样"。现在已彻底解耦——
面板只保留 `size → displayHeight` 这一条映射，其余字段对页面内挂件**一律无效**。

## 三·五、上方带（band）与「互不遮挡」

宠物头顶以上单独留一条带子，思考云和台词框都住在里面：

```
band = max(配置的 layout.topPad, 云高 + 顶部缝隙)
wrap 高度 = pet.h + band
```

**为什么要有 band**：云的 `top` 曾是负数，等于把云顶伸出容器外，被 dock 的 overflow
裁掉最后一个小尾巴。现在 band 保证云整只在容器内。

**为什么不会再互相遮挡**：台词框的右缘固定在「云的左边 − gap」：

```
say.right = w − cloud.left + gap        // gap = layout.say.gapX × w
```

所以两者从构造上就不可能重叠（以前各锚各的，句子一长就压在一起）。

调整旋钮（`config.default.json`）：

| 想改 | 改 |
|---|---|
| 云的大小 | `layout.think.size`（占宠物宽的比例） |
| 云离头顶多远 | `layout.think.y` |
| 台词框离云多远 | `layout.say.gapX` |
| 台词框离头顶多高 | `layout.say.gapY` |
| 台词最长多宽 | `layout.say.maxW` |
| 带子最小高度 | `layout.topPad` |

## 四、打字两帧动画

### 素材从哪来

不靠出图。构建期对每个打字姿势派生一个 `<key>_f2`：把第一帧的整张画布**下移**
`TYPING_FRAME_PX = 4` 像素（画布高 180，显示 83px 时约 1.8px），底部裁掉。

```
assets/typing_cat.png      (第一帧)
      └─ 构建期派生 → 内嵌 key: typing_cat_f2
```

派生覆盖 **33 个 key**：12 套皮肤 + 4 个季节 + 睡衣 + 它们的 `nopac_` 版本。
所以"第一个宠物做好了，剩下的套模板"这件事，在构建期就自动完成了。

### 客户端怎么播

```
pose = working ? (帧序号 % 2 ? 'typingB' : 'typing') : (blinking ? 'blink' : 'idle')
formSprite(form, 'typingB')  →  formSpriteKey(...)  →  key + '_f2'（没有就退回第一帧）
```

- 帧间隔：`timeline.typingFrameMs`（默认 220ms）
- 打字时 **关掉呼吸动画**（`.dsh-sitter-img[data-working='1'] { animation: none }`），
  否则呼吸的 `translateY` 和两帧位移互相抵消，看起来像没动

### 为什么不用老的 `typingblink_*`

它们的语义是乱的：四季版是真·闭眼帧，部分皮肤是复制帧，另一部分是位移帧。
混着用会出现"有的在眨眼、有的在抖"。现在统一由构建期派生，语义只有一种。

## 五、怎么验

```powershell
# 1. 构建（会打印派生了多少张 _f2）
python scripts\make_sitter_plugin.py

# 2. 离线断言：贴图表里 _f2 的个数（应为 33）
node -e "const t=require('fs').readFileSync('dsh-sitter/client.js','utf8');console.log((t.match(/\"[A-Za-z0-9_]+_f2\":/g)||[]).length)"

# 3. 在线探针：diag 会上报当前贴图 URL 长度，两帧长度不同 → 在切换
node scripts/pet-cli.mjs play diag
Get-Content "$env:USERPROFILE\.dsh\dsh-sitter\diag-client.json" -Raw | ConvertFrom-Json | Select imgLen,pose,working
```

## 六、已知素材问题（不是布局 bug）

`nopac_typing_s0..s3`（四季的不戴奶嘴打字姿势）**图里还画着奶嘴**，
所以 `features.pacifier: false` 时，待机没奶嘴、一切到打字姿势奶嘴又冒出来。

修法只有重新出图（或补一次"去奶嘴"修图），代码侧无法补救。
另外这批 `nopac_` 变体里有一部分与带奶嘴版**逐像素完全相同**，说明当时的去奶嘴流程
没有校验。建议在构建里加一条断言：`nopac_X` 与 `X` 若完全相同就直接报错，避免静默。
