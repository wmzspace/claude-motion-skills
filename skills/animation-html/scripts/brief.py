#!/usr/bin/env python3
"""创意方向抽签：每条维度随机抽一项，用来打破"每个讲解动画都是方框加箭头"的惯性。
用法：python3 brief.py "<主题>" [--seed N] [--n 2]
抽到的项是起点不是命令：和主题明显冲突可以重抽或改，但要写明理由。"""
import argparse, random, signal, time
signal.signal(signal.SIGPIPE, signal.SIG_DFL)   # allow `brief.py | head`
AXES = {
 '视觉隐喻': ['画真实对象本身（报文、张量、器件……）', '地铁线路图', '仪表盘', '显微镜/放大镜下', '剖面图', '工厂流水线', '地图与路线', '故事分镜', '游戏关卡'],
 '美术风格': ['线稿', '扁平色块', '等距 3D', '黑板粉笔', '蓝图', '纸张手绘', '终端字符', '信息图'],
 '动效语法': ['粒子/数据流动', '逐笔描线', '镜头推拉（viewBox 缩放）', '分镜切换', '弹性物理', '堆叠/拆解', '计数与生长'],
 '叙事结构': ['问题 → 答案', '失败 → 修正', '时间顺序', '对比两种方案', '倒叙（先看结果）', '由宏观到微观', '由例子到原理'],
 '旁白语气': ['老师讲解', '侦探推理', '对话问答', '新闻播报', '朋友聊天'],
 '配色调整': ['沿用模板 token', '在 token 名不变的前提下改成冷色系', '改成暖色系', '高对比黑白 + 一色', '低饱和'],
}
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('topic', nargs='?', default=''); ap.add_argument('--seed', type=int); ap.add_argument('--n', type=int, default=1)
    a = ap.parse_args(); seed = a.seed if a.seed is not None else int(time.time() * 1000) % 10**9; r = random.Random(seed)
    print(f'# 创意方向（seed {seed}）' + (f' — {a.topic}' if a.topic else ''))
    for k, v in AXES.items(): print(f'- **{k}**：' + ' / '.join(r.sample(v, min(a.n, len(v)))))
    print('\n与主题冲突的项可重抽（换 seed）或改，但要写理由。')
if __name__ == '__main__': main()
