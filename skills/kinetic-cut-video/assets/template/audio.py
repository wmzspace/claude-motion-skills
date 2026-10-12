"""配乐骨架。时间全部抄 index.html 的镜头表和 hits，保证音画对齐。
运行：PYTHONPATH=<skill>/scripts python3 audio.py（build.py 会自动运行）
写法参考 examples/showreel/audio.py；音色按题材选（电子题材可多用 tick/bell 高音，温暖题材多用 pad）。"""
from audio_lib import Mix, note as n, chord, scale

# 风格、BPM、调式、和弦进行、音色都按 brief 定，不要每次都是 120 BPM + D 大调 + pad/bell/kick。
# 可用音色：pad bell pluck lead sub kick snare clap hat tick boom riser whoosh vinyl；节奏型 beat(pattern=, swing=, clap=)、arp()。
DUR, BPM = 2, 120
CUTS = []                       # 每个镜头的起点（秒），抄镜头表
m = Mix(duration=DUR, bpm=BPM)
m.pad(chord('Dmaj9'), 0, DUR)                           # 和弦床，按段落换（例：chord('Em9') chord('Cmaj7')）
for i, tc in enumerate(CUTS):
    m.boom(tc, 0.3); m.bell(tc, n([5, 7, 9, 12, 14][i % 5]), 0.12, 1.2)
m.render('audio.wav')
