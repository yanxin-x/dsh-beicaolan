# 换装系统：三种成本档位

按「剪影变化」和「颜色变化」分开处理，能省下大量出图。

## 一、0 次出图：换色（`scripts/recolor.py`）

像素画的颜色是平的，同一个剪影换个色就是另一件衣服。

```powershell
# 卫衣蓝 → 绿（只改蓝色那一类色相，皮肤不动）
python scripts\recolor.py --sprite 10_base\sitting_hoodie_clean.png `
  --out 10_base\variants\hoodie_green.png --mode hue --hue 105 --only-hue 240 --hue-win 40

# 羽绒服近黑 → 藏蓝（flat 模式按相对亮度缩放，保留明暗）
python scripts\recolor.py --sprite 10_base\sitting.png `
  --out 10_base\variants\puffer_navy.png --mode flat --from 1a1a20 --to 302f4a --tol 16
```

- **一定要加 `--only-hue`**，否则肤色（也是高饱和）会一起被染，人物会变成绿脸。
- 奶嘴环偏蓝，换色时可能被轻微带偏；需要的话用 `--box` 限定在躯干区域。

## 二、复用已有过渡：不额外出图

试衣间条带的第 3–6 格是「走进→拉帘→帘子全闭」。**帘子全闭那一格看不到人**，
所以在第 6 格切到任意新待机都不会穿帮——观众自然理解为在帘子后面换的。

所以插件里：

```
目标衣服是卫衣 → 播满 8 格（最后两格就是卫衣）
其它衣服       → 只播前 6 格，然后切到该衣服的待机图
```

## 三、1 次出图/套：换剪影

羽绒服 → T 恤、卫衣 → 薄外套，形状变了就必须重新出。

目前四季各 1 张坐姿待机：

| 季节 | 文件 | 出图次数 |
|---|---|---|
| 冬 · 黑羽绒服 | `10_base/sitting.png` | 1 |
| 秋 · 克莱因蓝卫衣 | `10_base/sitting_hoodie_clean.png` | 1（含在试衣间那次里） |
| 春 · 浅灰薄外套 | `10_base/sitting_spring.png` | 1 |
| 夏 · 白 T 短裤 | `10_base/sitting_summer.png` | 1 |

## 插件里的轮换逻辑

每加载一次插件（刷新/重载/开机）换下一套，记录在 `localStorage['dsh-sitter-outfit']`：

```
睡 2 分钟 → 试衣间过渡 → 换下一套 → 待机
```

想固定某套，把 `localStorage` 那个值改成对应下标即可（0 冬 / 1 秋 / 2 春 / 3 夏）。

## 成本对照

| 方案 | 4 套季节装总成本 |
|---|---|
| 每套重新出图 | 4 次 |
| **本方案**（1 套试衣间过渡 + 3 张待机） | **3 次** |
| 只换同款颜色（比如卫衣 5 色） | **0 次** |
