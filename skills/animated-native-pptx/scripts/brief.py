#!/usr/bin/env python3
"""创意方向抽签：每条维度随机抽一项，用来打破"每份 PPT 都长一个样"的惯性。
用法：python3 brief.py "<主题>" [--seed N] [--n 2]
抽到的项是起点不是命令：和内容明显冲突可以重抽或改，但要在 design.md 里写明理由。"""
import argparse, random, signal, time
signal.signal(signal.SIGPIPE, signal.SIG_DFL)   # allow `brief.py | head`
AXES = {
 '美术风格': ['杂志编辑排版', '瑞士网格', '满版摄影', '扁平插画', '纸张拼贴', '极简留白', '复古印刷', '蓝图线稿', '玻璃拟态', '粗野主义大字', '手绘白板', '信息图'],
 '配色策略': ['单色 + 一个强调色', '互补撞色', '黑白 + 一个亮色', '低饱和大地色', '从内容实物/照片取色', '双色调', '高明度粉彩', '深色底 + 高亮'],
 '版式语法': ['不对称大留白', '大字报（一页一句）', '网格卡片', '满版图片压字', '左右分栏对比', '时间轴叙事', '数据大数字', '示意图/地图', 'Z 字阅读路径'],
 '封面手法': ['满版照片 + 压字', '超大数字或单字', '母题图形占半屏', '竖排标题', '标题拆成两行错位', '纯文字极简'],
 '动效性格': ['利落（短 dur、紧间隔、少 pulse）', '舒缓（长 dur、淡入为主）', '弹跳（zoom + pulse 多）', '机械逐格（wipe 为主）', '电影感（path 慢推、长停顿）'],
 '切换家族': ['统一淡入', '推移系列', '圆形/分割系列', '擦除系列', '章节内统一、章节间换'],
 '文案语气': ['结论先行短句', '用数字说话', '提问式标题', '故事叙述', '口语对话', '正式汇报'],
 '装饰母题来源': ['题材里的器物', '题材里的材料纹理', '题材里的符号/单位', '题材里的场景/地图', '数据本身的形状'],
 '背景音乐（若用）': ['不用音乐', '钢琴', 'lo-fi', '轻电子', '原声吉他', '管弦'],
}
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('topic', nargs='?', default=''); ap.add_argument('--seed', type=int); ap.add_argument('--n', type=int, default=1)
    a = ap.parse_args(); seed = a.seed if a.seed is not None else int(time.time() * 1000) % 10**9; r = random.Random(seed)
    print(f'# 创意方向（seed {seed}）' + (f' — {a.topic}' if a.topic else ''))
    for k, v in AXES.items(): print(f'- **{k}**：' + ' / '.join(r.sample(v, min(a.n, len(v)))))
    print('\n写进 design.md，说明每一项怎么落到这份稿子上；与内容冲突的项可重抽（换 seed）或改，但要写理由。')
if __name__ == '__main__': main()
