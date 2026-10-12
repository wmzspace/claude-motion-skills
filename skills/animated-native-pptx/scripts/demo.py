from deckkit import *
init(dict(font='微软雅黑', on_bg='FFF8F0', on_bg_soft='F3D9C9', accent='F2AA4C', accent_ink='3B1F2B', card='FBEDE2', ink='3B1F2B', mute='6B4A4F', primary='7A2E3A', dot='C8553D'), total=3, tag='示例主题 · deckkit demo')
sl = new('main', '封面')
add('rise', pill(sl.shapes, 128, 220, '年度复盘'), 0)
add('rise', text(sl.shapes, 128, 290, 1000, 180, '咖啡馆经营', 75, bold=True), 200, 700)
add('wipe', box(sl.shapes, 128, 480, 440, 12, T['accent'], rad=6), 800, 700)
g = group(sl, '徽章'); badge(g.shapes, 'rocket', 1270, 300, 340); add('zoom', g, 700, 700); add('pulse', g, 2200, 500)
finish(sl, '<p:fade/>')
sl = new('alt', '三个要点')
header(sl, '01 · 概览', '今年做对的三件事', '每件事配一个数据')
for i, (ic, h, d) in enumerate([('chart', '客单价', '示例文字，占位用'), ('clock', '出杯时间', '示例文字，占位用'), ('heart', '复购', '示例文字，占位用')]):
    x = 128 + i * 565
    g = card(sl, x, 326, 533, 624, h); badge(g.shapes, ic, x + 40, 370, 120, T['primary'], 'accent')
    text(g.shapes, x + 40, 526, 453, 60, h, 24, T['ink'], True); text(g.shapes, x + 40, 602, 453, 300, d, 16, T['mute'], spacing=1.4)
    add('rise', g, 600 + i * 500, 700); add('pulse', g, 2600 + i * 500, 320)
finish(sl, '<p:circle/>')
sl = new('main', '路径')
header(sl, '02 · 路径', '光点沿路径移动')
pts = [(128 + i * 83.2, 600 + 120 * ((i % 10) / 10 if (i // 10) % 2 == 0 else 1 - (i % 10) / 10)) for i in range(21)]
ln, path = curve(sl, pts); add('wipe', ln, 600, 1500)
dot = box(sl.shapes, pts[0][0] - 22, pts[0][1] - 22, 44, 44, T['accent'], MSO_SHAPE.OVAL); add('fade', dot, 700, 300); add('path', dot, 800, 3000, path=path)
import os
if os.path.exists('test.mp3'): audio(sl, 'test.mp3')    # 进入本页自动播放
finish(sl, '<p:push dir="l"/>')
assert S['n'] == S['total']
save('demo.pptx')
