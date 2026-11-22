"""生成 DSH 页面内宠物插件 `@local/dsh-sitter`。

架构（大一统后）：
  scripts/pet/client.template.js   客户端模板（JS，占位符 __XXX__）
  scripts/pet/host.template.js     宿主模板（统计/状态服务）
  scripts/pet/config.default.json  默认参数（唯一真源）
  scripts/make_sitter_plugin.py    编排：读模板 + 嵌素材 + 替换占位符 → 产物

产物：dsh-sitter/{package.json,cordis.patch.yml,index.js,client.js}
"""
import base64
import io
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent   # 仓库根（可移植，不写死盘符）
PLUGIN = ROOT / 'dsh-sitter'
PET = ROOT / 'scripts' / 'pet'

CFG = json.loads((PET / 'config.default.json').read_text(encoding='utf-8'))

DISPLAY_H = CFG['displayHeight']
EMBED_H = CFG['embedHeight']
SLEEP_MS = CFG['timeline']['sleepMs']
FRAME_MS = CFG['timeline']['frameMs']
INITIAL_LIFT = CFG['layout']['initialLift']
SEAT_INSET = CFG['layout']['seatInset']
TOPPAD = CFG['layout']['topPad']

BRICK_H = CFG['brick']['height']
BRICK_OVERLAP = CFG['brick']['overlap']
BRICK_SINK = CFG['brick']['sink']
BUTT_RATIO = CFG['seat']['buttRatio']
BUTT = round(DISPLAY_H * BUTT_RATIO)
GAP = BRICK_OVERLAP - BRICK_H + BRICK_SINK + BUTT
SEAT_RISE = -GAP
BRICK_CSS_BOTTOM = GAP - BRICK_OVERLAP

DEBUG = bool(CFG['debug'])
OUTFIT_COUNT = CFG['outfits']['count']
HOODIE_INDEX = CFG['outfits']['hoodieIndex']

# 素材根目录：assets/ 只放「构建真正读到的」152 个文件（150 张精灵 + fitting_meta + 插件图标）。
# 历史稿在 10_base/ 20_face/ 30_clothes/ 40_actions/ 50_anim/ 里，已移出版控，仅留作底稿。
BASE = ROOT / 'assets'
GEN = BASE / '_gen'
SMALL = CFG['embedHeightSmall']

META = json.loads((BASE / 'fitting_meta.json').read_text(encoding='utf-8'))
COLS = META['cols']

# 素材清单：key -> (相对路径, 嵌入高度)

# ── 非形态素材：道具、特殊姿势。不属于任何皮肤，仍单独声明 ──
# 形态（皮肤）贴图不在这里 —— 全部由 scripts/pet/skins.json 驱动，见下方 SKINS/FORMS。
PROPS = {
    'sleep': (BASE / 'sleep_dino.png', EMBED_H),
    'strip': (BASE / 'fitting_strip.png', EMBED_H),
    'brick': (BASE / 'gold_brick.png', SMALL),
    'think': (BASE / 'think_cloud.png', 52),
    'bubble': (GEN / 'bubble.png', SMALL),
    'iconCoin': (BASE / 'icon_coin.png', SMALL),
    'iconClock': (BASE / 'icon_clock.png', SMALL),
    'ultra0': (BASE / 'ultra0.png', EMBED_H),
    'ultra1': (BASE / 'ultra1.png', EMBED_H),
    'walk0': (BASE / 'walk' / 'f_01.png', EMBED_H),
    'walk1': (BASE / 'walk' / 'f_02.png', EMBED_H),
    'walk2': (BASE / 'walk' / 'f_03.png', EMBED_H),
    'walk3': (BASE / 'walk' / 'f_04.png', EMBED_H),
    'angry0': (BASE / 'angry0.png', 600),
    'angry1': (BASE / 'angry1.png', 600),
    'angry2': (BASE / 'angry2.png', 600),
    'angry3': (BASE / 'angry3.png', 600),
}

# ── 形态注册表：唯一真源 scripts/pet/skins.json ──
# 除"睡觉"以外的一切外观都是一个「形态」，格式统一：
#   kind=season  s0..s3   按月份自动
#   kind=night   pajama   夜间
#   kind=skin    其余     商店皮肤（带 shop 价格/描述）
# 贴图 key 统一为 <form>.<pose>.<pac>；打字姿势另派生 <key>.b 作为第二帧。
SKINS = json.loads((PET / 'skins.json').read_text(encoding='utf-8'))
FORMS = SKINS['forms']
POSES = SKINS['poses']
SKIN_IDS = [f['id'] for f in FORMS if f['kind'] == 'skin']
SKIN_CATALOG = [
    {'id': f['id'], 'name': f['label'], 'price': f['shop']['price'],
     'desc': f['shop']['desc'], 'emoji': f['shop']['emoji']}
    for f in FORMS if f['kind'] == 'skin'
]
FORMS_META = [
    {'id': f['id'], 'label': f['label'], 'kind': f['kind'],
     'months': f.get('months') or [], 'rotateIndex': f.get('rotateIndex')}
    for f in FORMS
]

import time as _time
BUILD_VERSION = _time.strftime('%Y%m%d-%H%M%S')


DETAIL_DOC = """# 贝草兰 · 桌上陪伴

坐在输入框右侧的像素小家伙，会陪你打字、提醒你休息。

## 会做什么

- **陪打字**：你敲字或助手干活时，它掏出迷你笔记本一起敲，头顶冒思考云。
- **换装**：白天按季节自动换（春夏秋冬四套）；23:00–07:00 自动换成浅蓝睡衣。
- **看用量**：鼠标停在它身上，弹出今日已用 token、今日使用时长、今天被提醒次数。
- **护眼**：连续工作约 40 分钟，它放下电脑在输入框上来回跑几趟，提醒你休息。
- **监督**：长时间没人操作，它会逐步放大直到占满屏幕；点一下并确认「知道了」才复原。
- **碎碎念**：每隔一分多钟自己说一句（按时段挑，深夜闭嘴）；整点会报时。

## 配置

参数在 `~/.dsh/dsh-sitter/config.json`，改完几秒内生效，无需重启。
常用：`displayHeight`（大小）、`night.from/to`（夜间时段）、`break.workMs`（提醒间隔）、
`chat.intervalMs`（说话频率）、`escalate.enabled`（是否放大监督）。

## 限制

- 需要 DSH 的 Web 页面环境（CLI 下没有宠物）。
- 插件更新后需要刷新页面一次，新的前端模块才会装载。
- 用量统计读的是本机会话日志；若 DSH 改了存储格式，数字会显示 0，但不会影响其它功能。
"""

PACKAGE = {
    'name': '@local/dsh-sitter',
    'version': '1.0.0',
    'private': True,
    'description': '贝草兰：坐在输入框上的像素桌宠——陪伴、监督、换装与学习提醒',
    'type': 'module',
    'main': './index.js',
    'exports': {
        '.': './index.js',
        './client': './client.js',
        './locale/*.json': './locale/*.json',
        './icon': './icon.png',
    },
    'files': ['index.js', 'client.js', 'cordis.patch.yml', 'README.md', 'locale/*.json', 'docs', 'icon.png'],
    'icon': './icon.png',
    'keywords': ['dsh', 'dsh-plugin', 'desktop-pet', 'pixel-art', 'companion'],
    'license': 'MIT',
    'engines': {'node': '>=22.12.0'},
    'dsh': {
        'bundle': {'patch': './cordis.patch.yml'},
        'client': {
            'platform': 'web',
            'immediately': True,
            'inject': ['@deepseek-ai/dsh-client-ui-conversation', '@deepseek-ai/dsh-client-ui-settings'],
        },
    },
}

PATCH = """- insert:
    - id: dsh-sitter
      name: '@local/dsh-sitter'
"""

CLIENT = (PET / 'client.template.js').read_text(encoding='utf-8')
INDEX = (PET / 'host.template.js').read_text(encoding='utf-8')


# 角色贴图统一画布：宽度固定，角色底部居中。
# 换装 / 切奶嘴 / 换姿势时几何完全一致，不会缩放跳变、不会边缘残留。
PET_CANVAS_W = 300

# 「打字第二帧」的下移量（贴完画布后的像素，画布高 EMBED_H=180）。
# 显示高度 83px 时约 1.8px —— 2px 在 83px 下只有 0.9px，肉眼几乎看不出来，所以取 4。
TYPING_FRAME_PX = 4


TOP_MARGIN = 0          # 画布顶部留 2px 透明边（发尖不再贴画布边缘）
TOP_FRINGE_ROWS = 3
TOP_TRIM = 4           # 顶端削掉的行数     # 顶部这几行里过窄的深色段按碎点清除
TOP_FRINGE_MIN_W = 8


def _strip_top_fringe(img):
    """清掉顶部几行的发尖碎点：宽度 < TOP_FRINGE_MIN_W 的深色连续段抹成透明。"""
    img = img.convert('RGBA')
    px = img.load()
    w, h = img.size
    removed = 0
    for y in range(min(TOP_FRINGE_ROWS, h)):
        x = 0
        while x < w:
            if px[x, y][3] <= 8:          # 连 1% 透明度的抗锯齿都算「有内容」
                x += 1
                continue
            x0 = x
            while x < w and px[x, y][3] > 8:
                x += 1
            if x - x0 < TOP_FRINGE_MIN_W:
                for xx in range(x0, x):
                    px[xx, y] = (0, 0, 0, 0)
                removed += 1
    return img, removed


def _drop_orphan_tufts(img):
    """删掉头顶上方独立的小碎块（发尖）。

    角色立绘最顶上常有一两撮孤立细发尖，缩到显示尺寸后就是两条悬空黑线。
    做法：连通域分析，保留最大的一块（身体），其余外框最高点高于主体顶部
    且面积 < 主体 2% 的碎块全部抹掉。
    """
    from collections import deque
    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()
    seen = [[False] * w for _ in range(h)]
    comps = []
    for y in range(h):
        for x in range(w):
            if seen[y][x] or px[x, y][3] <= 8:
                continue
            q = deque([(x, y)])
            seen[y][x] = True
            pts = []
            while q:
                cx, cy = q.popleft()
                pts.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny][3] > 8:
                            seen[ny][nx] = True
                            q.append((nx, ny))
            comps.append(pts)
    if len(comps) <= 1:
        return img, 0
    comps.sort(key=len, reverse=True)
    main = comps[0]
    main_top = min(y for _, y in main)
    limit = max(24, len(main) * 0.02)
    removed = 0
    for pts in comps[1:]:
        top = min(y for _, y in pts)
        if top < main_top and len(pts) < limit:
            for (x, y) in pts:
                px[x, y] = (0, 0, 0, 0)
            removed += 1
    return img, removed


def _flatten_hair_top(img):
    """把头顶的细发尖整段抹掉。

    头发最上面几行往往只有一两撮细尖，缩到显示尺寸（83px）后就是悬空的黑线。
    做法：逐行统计不透明宽度，找到第一条「宽度 >= 全图最宽 55%」的行，
    把它上面的所有行清空——头顶从此是连续的一整片，不会再出现孤立短线。
    """
    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()
    widths = []
    for y in range(h):
        xs = [x for x in range(w) if px[x, y][3] > 8]
        widths.append(len(xs))
    head_band = max(1, int(h * 0.30))          # 只看头部区域，别被肩膀/尾巴拉高阈值
    peak = max(widths[:head_band]) if widths else 0
    if peak == 0:
        return img
    limit = peak * 0.45
    cut = 0
    for y, wd in enumerate(widths):
        if wd >= limit:
            cut = y
            break
    for y in range(cut):
        for x in range(w):
            px[x, y] = (0, 0, 0, 0)
    return img


def embed(path: Path, height: int, dy: int = 0):
    """加载素材，缩放到目标高度后统一贴到同一画布（底部居中），再转 base64。

    dy > 0 时把整张画布下移 dy 像素、底部裁掉——用于派生「打字第二帧」。
    同一张图位移出来的两帧不会抖，比 AI 各出一帧稳得多（见 make_frame2_shift.py 的历史说明）。
    """
    img = Image.open(path).convert('RGBA')
    if img.height != height:
        w = max(1, round(img.width * height / img.height))
        img = img.resize((w, height), Image.LANCZOS)
    if height >= 120:                      # 角色贴图统一画布（道具 52/64 不参与）
        canvas = Image.new('RGBA', (PET_CANVAS_W, height + TOP_MARGIN), (0, 0, 0, 0))
        x = (PET_CANVAS_W - img.width) // 2
        if x < 0:
            img = img.resize((PET_CANVAS_W, height), Image.LANCZOS)
            x = 0
        canvas.alpha_composite(img, (x, TOP_MARGIN))
        img = canvas
    if dy:
        shifted = Image.new('RGBA', img.size, (0, 0, 0, 0))
        shifted.alpha_composite(img.crop((0, 0, img.width, img.height - dy)), (0, dy))
        img = shifted

    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=True)
    return base64.b64encode(buf.getvalue()).decode('ascii'), img.width, img.height


def main() -> int:
    # ---- 素材健全性校验：挡住空白帧/异常帧 ----
    from PIL import Image

    def ink_ratio(path):
        im = Image.open(path).convert('RGBA')
        px = im.load()
        solid = 0
        for y in range(im.height):
            for x in range(im.width):
                if px[x, y][3] > 60:
                    solid += 1
        return solid / max(1, im.width * im.height)

    bad = []

    def _all_assets():
        """把道具 + 注册表里所有形态贴图摊平成 (key, path)"""
        for k, v in PROPS.items():
            yield k, v[0]
        for form in FORMS:
            for pose, variants in (form['sprites'] or {}).items():
                for pac, rel in variants.items():
                    yield f"{form['id']}.{pose}.{pac}", BASE / rel

    for key, path in _all_assets():
        try:
            r = ink_ratio(path)
            if r < 0.08:
                bad.append(f"{key}:{path.name} ink={r:.1%}")
        except Exception as e:
            bad.append(f"{key}:{path.name} 读取失败 {e}")
    if bad:
        raise SystemExit('素材异常，拒绝构建：\n  ' + '\n  '.join(bad))

    encoded = {}
    max_ratio = 0.0

    # 道具
    for key, (path, height) in PROPS.items():
        if not path.exists():
            print(f'[skip] {key}: 缺少 {path}')
            continue
        b64, w, h = embed(path, height)
        encoded[key] = f'data:image/png;base64,{b64}'

    # 形态贴图：统一 key <form>.<pose>.<pac>
    missing = []
    frame2 = 0
    for form in FORMS:
        for pose in POSES:
            variants = form['sprites'].get(pose) or {}
            for pac, rel in variants.items():
                path = BASE / rel
                if not path.exists():
                    missing.append(f"{form['id']}.{pose}.{pac} <- {rel}")
                    continue
                key = f"{form['id']}.{pose}.{pac}"
                b64, w, h = embed(path, EMBED_H)
                encoded[key] = f'data:image/png;base64,{b64}'
                if pose == 'idle':
                    max_ratio = max(max_ratio, w / h)
                if pose == 'typing':
                    b64b, _w, _h = embed(path, EMBED_H, dy=TYPING_FRAME_PX)
                    encoded[key + '.b'] = f'data:image/png;base64,{b64b}'
                    frame2 += 1
    if missing:
        print('[warn] 注册表引用了不存在的素材：')
        for m in missing:
            print('   ', m)
    print(f'  形态 {len(FORMS)} 个，贴图 {len(encoded)} 张（其中打字第二帧 {frame2} 张）')

    disp_w = round(DISPLAY_H * max_ratio)

    defaults_json = json.dumps(CFG, ensure_ascii=False)

    client = (CLIENT
              .replace('__SPRITES__', json.dumps(encoded, ensure_ascii=False))
              .replace('__SKINS__', json.dumps(FORMS_META, ensure_ascii=False))
              .replace('__CONFIG_DEFAULTS__', defaults_json)
              .replace('__BUILD_VERSION__', BUILD_VERSION)
              .replace('__RATIO__', f'{max_ratio:.4f}')
              .replace('__SLEEP_MS__', str(SLEEP_MS))
              .replace('__FRAME_MS__', str(FRAME_MS))
              .replace('__COLS__', str(COLS))
              .replace('__CELL_RATIO__', f'{META["cell"][0] / META["cell"][1]:.4f}')
              .replace('__OUTFIT_COUNT__', str(OUTFIT_COUNT))
              .replace('__HOODIE_INDEX__', str(HOODIE_INDEX))
              .replace('__LIFT__', str(INITIAL_LIFT))
              .replace('__DEBUG__', 'true' if DEBUG else 'false')
              .replace('DISPLAY_H_JS', str(DISPLAY_H)))

    index = (INDEX
             .replace('__CONFIG_DEFAULTS__', defaults_json)
             .replace('__SKIN_CATALOG__', json.dumps(SKIN_CATALOG, ensure_ascii=False))
             .replace('__BUILD_VERSION__', "'" + BUILD_VERSION + "'"))

    PLUGIN.mkdir(parents=True, exist_ok=True)
    (PLUGIN / 'package.json').write_text(json.dumps(PACKAGE, ensure_ascii=False, indent=2), encoding='utf-8')
    (PLUGIN / 'cordis.patch.yml').write_text(PATCH, encoding='utf-8')
    (PLUGIN / 'index.js').write_text(index, encoding='utf-8')
    (PLUGIN / 'client.js').write_text(client, encoding='utf-8')
    readme = (
        '# 贝草兰 · DSH 桌宠插件\n\n'
        '坐在输入框上的像素小人。\n\n'
        '## 玩法\n'
        '- 开局睡一会儿 → 衣柜换装 → 待机陪伴\n'
        '- 打字/助手干活时一起敲键盘，头顶冒思考泡\n'
        '- 23:00–07:00 自动换睡衣；白天按季节换装\n'
        '- 鼠标停在身上：今日 token 用量与使用时长\n'
        '- 连续工作 40 分钟：放下电脑来回跑，提醒休息\n'
        '- 长时间没人理会：逐步放大占满屏幕，点一下确认「要认真学习」\n\n'
        '## 配置\n'
        '所有参数在 `~/.dsh/dsh-sitter/config.json`，改完无需重启。\n'
    )
    (PLUGIN / 'README.md').write_text(readme, encoding='utf-8')

    loc = PLUGIN / 'locale'
    loc.mkdir(parents=True, exist_ok=True)
    (loc / 'zh.json').write_text(json.dumps({
        'meta': {
            'title': '贝草兰桌宠',
            'description': '坐在输入框上的像素小家伙：陪你打字、提醒休息、按季节与夜间换装，并记录今日用量。零 token、纯本地，不联网也不调用模型。需要 DSH 桌面端页面环境。',
            'detail': 'docs/DETAIL.md',
        }
    }, ensure_ascii=False, indent=2), encoding='utf-8')
    (loc / 'en.json').write_text(json.dumps({
        'meta': {
            'title': 'Beicaolan desktop companion',
            'description': 'A pixel companion that sits on the composer: types along with you, nudges you to rest, dresses by season and at night, and tracks today\'s usage. Zero tokens, fully local. Requires the DSH desktop web page.',
            'detail': 'docs/DETAIL.md',
        }
    }, ensure_ascii=False, indent=2), encoding='utf-8')

    docs = PLUGIN / 'docs'
    docs.mkdir(parents=True, exist_ok=True)
    (docs / 'DETAIL.md').write_text(DETAIL_DOC, encoding='utf-8')

    icon_src = BASE / 'icon_plugin.png'
    if icon_src.exists():
        (PLUGIN / 'icon.png').write_bytes(icon_src.read_bytes())

    print(f'插件已生成: {PLUGIN}  显示 {disp_w}x{DISPLAY_H}px  {COLS} 帧 x {FRAME_MS}ms')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
