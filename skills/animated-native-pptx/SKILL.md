---
name: animated-native-pptx
description: 制作带原生动画、可编辑的 .pptx（渐变背景、圆角卡片、线条图标、照片、自动播放的动画、页面切换和背景音乐），适用于任何题材。用户要“有动画的 PPT”、要做汇报/课件/答辩 PPT 并希望有动效，或要按批注修改这类 PPT 时使用；主题和配色按内容现定。
---


# 原生动画 PPT（animated-native-pptx）

产出一个 `.pptx`：文字、卡片、图标都是可编辑对象；每页进入后动画自动依次播放（不需要逐个点击）；页间用 PPT 自带切换。在 WPS 和 PowerPoint 里都能打开编辑。

做法是：Playwright 渲染背景图和线条图标 → python-pptx 在 1920×1080 像素网格上摆对象 → 往每页 XML 里注入 `<p:transition>` 和 `<p:timing>`。工具代码在本 skill 的 `scripts/` 目录里，直接复制到工作目录使用，不要重写。

适用于任何题材：工作汇报、课程课件、比赛答辩、产品介绍、活动复盘等。

依赖：`python3` + `python-pptx` `Pillow` `lxml`；`node` + `playwright`（Chromium）；`ffprobe`（用背景音乐时）；检查环节用 LibreOffice、`pdftoppm`、`ffmpeg`。

**主题、配色、字体、页数都不固定**，每次按用户的内容和参考图现定。下面的工具代码只管“怎么摆、怎么动”，不管“长什么样”。

## 流程

1. **先拿内容，再动手。** 读用户给的全部材料：参考图、旧 PPT（用 python-pptx 逐页遍历 shape、表格、图表取文字，遇到 `shape_type` 报错就用 `hasattr(s,'shapes')` 判断组合）、聊天截图、照片压缩包。长截图先看原始分辨率，宽度不足 600px 的直接告诉用户读不清，请对方发原图或文字，不要猜。
2. **定页面清单**，一页一个意思。超过 12 页时加章节页。把清单和每页用哪些素材对应好。
3. **定主题**（见“主题怎么定”），把 `scripts/` 里的文件复制到工作目录，写 `theme.json`，跑 `assets.js` 出背景和图标。
4. **写 `build.py`**，用 `deckkit.py` 的函数一页页搭，每页以 `finish(sl, 切换)` 结束，最后 `save('deck.pptx')`。
5. **检查**（见“检查”），修掉溢出和重叠后交付。
6. **交付说明里必须写清**：哪些文字是原文、哪些是自己补的或猜的、哪些是占位；动画没法在本环境放映，需要用户在 WPS/PowerPoint 里放一遍确认。

## 内容上的规矩

- 不编数据、不编引语。用户没给的数字、名称、日期用方括号占位，如 `[单位名称]`，并在交付时列出来。
- 截图里糊掉看不清的标题或句子：能从别的材料（比如旧 PPT）里找到原文就用原文；找不到就按上下文拟一个，并明确告诉用户“这是我拟的”。
- 用户说某份材料“仅供参考”时，以用户最近一次明确的要求为准，参考材料只用来补内容。
- 没用上的素材（照片等）在交付时提一句。

## 主题怎么定

每次重新选，不要沿用上一次的颜色：

- 有参考图就从参考图取：一个主色渐变做背景、一个浅色做卡片、一个强调色（按钮、进度条、高亮）、深色做卡片上的字。
- 没有参考图就按内容定调（医疗教育偏蓝绿、餐饮偏暖、科技偏深色等），一个主色占六七成，一个强调色点缀。
- 准备 2–5 张背景（同一色系的不同渐变），不同章节换着用，避免每页一样。特殊情境可以单做一张（比如夜景）。
- 卡片上的字和卡片底色对比要够；浅色卡片上不要放白字。
- 字体默认 `微软雅黑`（WPS/Windows 都有）；用户指定了就用用户的。

`T` 主题字典的键：`font` 字体；`on_bg` 背景上的主文字色；`on_bg_soft` 背景上的次要文字色；`accent` 强调色；`accent_ink` 强调色上的文字色；`card` 卡片底色；`ink` 卡片上的标题色；`mute` 卡片上的正文色；`primary` 主色（大数字、图标底）；`dot` 标题左上角圆点色。颜色一律 6 位十六进制、不带 `#`。

`theme.json`：`bg` 里每个键是一张背景（`css` 渐变，可选 `glows` 光斑 `[x, y, 直径, rgba]`，可选 `html` 追加装饰元素如云朵、星星）；`icon_colors` 是图标要渲染的颜色（键名就是 `badge(..., ic='键名')` 用的名字）；可选 `icons` 追加自定义图标路径（120×120 画布、纯描边的 SVG path）。

```json
{"bg":{"main":{"css":"linear-gradient(140deg,#3B1F2B,#7A2E3A 55%,#C8553D)","glows":[[1200,480,760,"rgba(242,170,76,.45)"]]},
       "alt":{"css":"linear-gradient(160deg,#2B1A24,#5A2333 60%,#9C3F3A)"}},
 "icon_colors":{"primary":"#7A2E3A","ink":"#3B1F2B","accent":"#F2AA4C","white":"#FFF8F0"}}
```

## 版式规则（1920×1080 像素网格，1px = 0.5pt）

- 左右边距 128；页眉占 y 84–300（眉标胶囊、38pt 标题、16pt 副标题）；**正文区 y 326–950、x 128–1792**；页脚 y 984 起是页码和进度条，由 `new()` 自动画。
- 字号：标题 38pt，卡片小标题 20–26pt，正文 14–16pt，最小 14pt（页脚标签 12pt 除外）。
- 估算文字是否放得下：一个汉字宽约 `2×pt` 像素，一行高约 `2×pt×行距` 像素。先算行数再定卡片高度，宁可卡片大一点。
- 常用版式（各页换着用，不要每页同一种）：
  - 三栏卡片：x = 128 + i×565，宽 533
  - 四栏卡片：x = 128 + i×424，宽 392
  - 左文右图：左侧三张横向文字卡（高 194，间隔 210），右侧 2×2 照片格
  - 2×2 横卡，中间压一个圆形徽章
  - 流程：卡片之间放 `MSO_SHAPE.RIGHT_ARROW`
  - 横向条形数据：浅色轨道 + 按比例的色条（`wipe` 动画）+ 右侧大数字
  - 章节页：超大序号 + 标题 + 一句说明 + 大图标徽章
  - 时间线：`curve()` 画虚线，光点 `path` 动画沿线移动
- 一张卡片连同里面的图标和文字放进同一个 `card()` 组，对组做动画；这样动画是整块进来，用户仍可点进去改字。
- 照片：`photo()` 默认裁切填满（cover），海报、图示、证书这类不能裁的用 `contain=True`。照片先 EXIF 转正并缩到长边 1500px 以内再插入，控制文件大小。人像别用太扁的框，否则会裁到头。
- 压缩包解压时文件名可能是 GBK/UTF-8 混乱，按 `cp437→utf-8`、再 `cp437→gbk` 依次尝试；解压到独立目录，用 `python3 -I` 运行。

## 动画规则

`add(kind, shape, delay毫秒, dur毫秒)`，所有动画在进入页面后按 delay 自动播放。

| kind | 效果 | 适合 |
|---|---|---|
| `rise` | 上浮淡入 | 标题、卡片、文字 |
| `left` / `right` | 从左/右滑入淡入 | 左右分栏的卡片、照片 |
| `zoom` | 缩放弹出 | 图标徽章、照片、打勾、大数字 |
| `fade` | 淡入 | 次要文字、装饰 |
| `wipe` | 擦除（`dir='left'/'up'/'right'/'down'`） | 线条、进度条、箭头、数据条 |
| `pulse` | 放大再回弹（强调） | 入场完成后依次点亮各卡片 |
| `path` | 沿路径移动（`path=` 相对坐标串） | 光点沿时间线、太阳升落 |

- 节奏：页眉 0–350ms；正文从 600ms 起，同组元素间隔 250–500ms；`pulse` 放在全部入场之后，间隔 550–650ms。单页总时长控制在 5 秒内。
- 同一个对象可以叠两个动画（比如 `fade` + `path`，或 `zoom` 之后 `pulse`）。
- `path` 是相对对象原位置的位移，单位是页面宽高的比例：`'M 0 0.45 L 0 0'` 表示从下方 45% 页高处升到原位。
- 背景音乐：在 `finish()` 之前调用 `audio(sl, 'xx.mp3')`，翻到这一页自动播放，放映时喇叭图标隐藏；用了音乐就必须用 `save()` 保存（它会修正音频的关系类型）。
- 切换写在 `finish(sl, ...)` 里，各页换着用：`<p:fade/>`、`<p:circle/>`、`<p:push dir="l"/>`、`<p:wipe dir="r"/>`、`<p:split orient="horz" dir="out"/>`。
- 原生动画做不到的：图标描线绘制、逐字弹入、背景持续飘动。用户要这些时如实说明，可以改做网页版或把每页录成视频嵌进 PPT（那样文字就不可编辑）。

## 检查

```bash
# 若装了 Anthropic 官方 pptx skill，可先跑它的结构校验：python3 <pptx skill 目录>/scripts/office/validate.py deck.pptx
cp deck.pptx n.pptx   # 中文文件名先复制成英文名再转
soffice --headless --convert-to pdf n.pptx
rm -f slide-*.jpg; pdftoppm -jpeg -r 55 n.pdf slide
ffmpeg -y -loglevel error -pattern_type glob -i 'slide-*.jpg' -vf "tile=4x5" -frames:v 1 sheet.jpg
```

看拼图（必要时提高 `-r` 单看某几页）：文字有没有溢出卡片或被截断、元素有没有重叠、照片有没有裁到关键部位、哪页明显偏空。渲染出来的是动画结束后的静态画面；LibreOffice 的字体是替代字体，宽度接近但不完全一致，卡片留一点余量。

## 改别人给的稿子

用户给一份已有的 PPT 要求“按批注改”时：

- 先逐页取出文字和图片（python-pptx 遍历，图片按内容哈希另存），并渲染成缩略图看一遍。批注常常直接写在页面上（红字、单独的说明页），要当作修改要求读，而不是当作内容保留。
- 把每条批注列成清单，逐条对应到页面；删页、并页、加页按对方的顺序来。
- 版式已经乱掉的稿子，用本 skill 按对方的顺序和内容整份重建，比在原文件上逐个修更稳；对方新加的图片从原文件里取出来复用。
- 交付时用表格列出“批注 → 怎么处理”，没做的批注要说明原因。

## 工具文件（`scripts/`）

| 文件 | 作用 |
|---|---|
| `deckkit.py` | 工具库：摆放文字、卡片、图标徽章、照片，写入动画、切换和自动播放的音乐 |
| `assets.js` | 读 `theme.json`，用 Playwright 渲染 `assets/<背景名>.jpg` 和 `assets/<图标>_<颜色名>.png` |
| `theme.example.json` | 主题文件示例，复制成 `theme.json` 后改 |
| `demo.py` | 3 页的最小示例，演示封面、三栏卡片、路径动画和音乐 |

运行顺序：

```bash
cp <本 skill 目录>/scripts/* .            # 复制到工作目录
cp theme.example.json theme.json          # 然后按本次主题改
NODE_PATH=$(npm root -g) node assets.js   # 需要 playwright；环境里已有 Chromium 时不要再执行 playwright install
python3 build.py                          # 自己写的搭建脚本，写法参考 demo.py
```

### `deckkit.py` 的函数

所有坐标是 1920×1080 网格上的像素；`c` 是容器，传 `sl.shapes` 或某个组的 `g.shapes`。

| 函数 | 说明 |
|---|---|
| `init(theme, total, tag='')` | 开始一份新稿；`total` 是总页数，`tag` 是右上角小字（可空） |
| `new(bg, label)` | 新建一页，`bg` 是背景名，`label` 是页脚的页面名；自动画页码和进度条 |
| `header(sl, eyebrow, title, sub='', center=False)` | 页眉：眉标胶囊、标题、副标题，自带入场动画 |
| `text(c, x, y, w, h, t, pt, color, bold, align, anchor, bullets=, spacing=)` | 文本框，`\n` 分段；`align` 用 `L/C/R`，垂直居中用 `anchor=MID` |
| `box(c, x, y, w, h, fill, kind, rad, alpha, name)` | 形状，默认圆角矩形；`kind=MSO_SHAPE.OVAL` 等；`alpha` 0–1 为不透明度 |
| `pill(c, x, y, t, pt, fill, color, w, h, center)` | 胶囊标签，不给 `w` 时按字数估宽 |
| `card(sl, x, y, w, h, name)` | 返回一个带半透明卡片底的组；往 `g.shapes` 里加内容，对 `g` 做动画 |
| `group(sl, name)` | 空组，用于把徽章等几个对象绑在一起做动画 |
| `badge(c, icon, x, y, s, bg, ic)` | 圆形图标徽章；`ic` 是 `theme.json` 里 `icon_colors` 的键名 |
| `pic(c, path, x, y, w, h)` | 直接放一张图（透明 PNG、艺术字等） |
| `photo(c, path, x, y, w, h, contain=False, rad, border)` | 圆角相框照片，默认裁切填满 |
| `curve(sl, pts, color, width, dash)` | 折线/曲线，返回 `(形状, 路径串)`，路径串给光点的 `path` 动画用 |
| `add(kind, shape, delay, dur, **kw)` | 给对象排一个动画 |
| `audio(sl, path)` | 本页自动播放的音乐 |
| `finish(sl, trans)` | 写入本页的切换和全部动画，每页最后调用 |
| `save(path)` | 保存文件 |

内置图标名：window spray eye clip thermo ask bag bowl drop smile moon bed sun alert phone shield home heart people spark chat check chart target gear book bulb flag rocket clock pin。需要别的图标时，在 `theme.json` 的 `icons` 里加 120×120 画布的描边路径。徽章里图标和底色要有对比（深底配浅色图标，浅底配深色图标）。

### `build.py` 写法示例

```python
from deckkit import *
init(dict(font='微软雅黑', on_bg='FFF8F0', on_bg_soft='F3D9C9', accent='F2AA4C', accent_ink='3B1F2B',
          card='FBEDE2', ink='3B1F2B', mute='6B4A4F', primary='7A2E3A', dot='C8553D'),
     total=3, tag='右上角的项目名')

# 封面
sl = new('main', '封面')
add('rise', pill(sl.shapes, 128, 220, '眉标'), 0)
add('rise', text(sl.shapes, 128, 290, 1000, 180, '主标题', 75, bold=True), 200, 700)
add('wipe', box(sl.shapes, 128, 480, 440, 12, T['accent'], rad=6), 800, 700)
g = group(sl, '徽章'); badge(g.shapes, 'rocket', 1270, 300, 340); add('zoom', g, 700, 700); add('pulse', g, 2200, 500)
add('fade', text(sl.shapes, 128, 900, 1000, 44, '[单位名称] · [汇报人] · [日期]', 14, T['on_bg_soft']), 1500)
finish(sl, '<p:fade/>')

# 三栏卡片，入场后依次强调
sl = new('alt', '三个要点')
header(sl, '01 · 概览', '页面标题', '一句副标题')
for i, (ic, h, d) in enumerate([('chart', '小标题一', '正文'), ('clock', '小标题二', '正文'), ('heart', '小标题三', '正文')]):
    x = 128 + i * 565
    g = card(sl, x, 326, 533, 624, h); badge(g.shapes, ic, x + 40, 370, 120, T['primary'], 'accent')
    text(g.shapes, x + 40, 526, 453, 60, h, 24, T['ink'], True)
    text(g.shapes, x + 40, 602, 453, 300, d, 18, T['mute'], spacing=1.4)
    add('rise', g, 600 + i * 500, 700); add('pulse', g, 2600 + i * 500, 320)
finish(sl, '<p:circle/>')

# 左照片右文字，带背景音乐
sl = new('main', '现场')
header(sl, '02 · 现场', '照片页标题')
add('left', photo(sl.shapes, 'ph/01.jpg', 128, 326, 760, 624), 600, 700)
g = card(sl, 920, 326, 872, 170, '说明'); text(g.shapes, 956, 326, 800, 170, '一句话说明', 18, T['ink'], True, anchor=MID, spacing=1.3)
add('right', g, 800, 650)
audio(sl, 'bgm.mp3')
finish(sl, '<p:push dir="l"/>')

assert S['n'] == S['total']      # 页数和 total 对上，进度条才准
save('deck.pptx')
```

要点：`total` 必须等于实际页数；每页先 `new()`、最后 `finish()`；要动画的对象才 `add()`，背景轨道这类静态元素不加；增删页时改 `total` 并重跑整个脚本。
