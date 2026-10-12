# engine.js 速查

所有函数都是全局的。坐标单位是像素，默认画幅 1920×1080；`W,H,CX,CY` 是画幅与中心。颜色一律是 `[r,g,b]` 数组，取自 `PAL`（`ink paper accent accentHi warm deep shade mute gray cool`）。字体族在 `FONT.serif / sans / mono`。

## 时间与缓动

| 函数 | 用途 |
|---|---|
| `P(t, start, dur)` | 把时间映射到 0..1（夹紧）。几乎所有动画都从它开始 |
| `ex(x)` | expo-out，急停：砸入、甩入、展开 |
| `spr(x, damp=7, freq=9)` | 弹簧 0→1 带回弹：弹出、落位 |
| `ei(x)` | 三次方加速：蓄力、被吸走、塌缩 |
| `eo(x)` `eo5(x)` `eio(x)` | 缓出 / 强缓出（冲击波）/ 缓入缓出（扫光、路径） |
| `st(u, d=.28, k=1.2)` | "砸入"缩放：从 1+k 倍急停到 1 |
| `lp(a,b,t)` `cl(x,a,b)` `mixc(c1,c2,t)` `rgb(c,alpha)` | 插值、夹紧、混色、转 CSS 颜色 |
| `rng(seed)` | 带种子的随机数发生器（禁止 `Math.random`） |
| `typed(str, p)` | 打字机：取前 p 比例的字符 |

## 文字

- `cjk(g, str, size, cx, cy, col, fn, stroke=0, weight=900, family)`：等宽全角字，垂直居中于 `cy`。`fn(j)` 返回每个字的 `{s, sx, sy, rot, shx(剪切), dx, dy, al, col}`；`stroke>0` 画描边。
- `word(g, str, font, cx, baseline, col, fn)`：比例宽度（拉丁）单词，逐字母 `fn`，支点在字母底部中点。
- `T(g, str, font, x, y, col, al, align)` / `TS(...lw...)`：整串填充 / 描边。
- `tracked(g, str, font, cx, y, spacing, col, al)`：加字距的居中小字，字距可做收拢动画。
- `arcText(g, str, font, cx, cy, r, rot, col, al)`：环形文字。
- `lay(str, font)`：量出每个字的位置 `{gl:[{ch,x,w}], w}`。
- `layer(draw)`：返回一张离屏整幅画布，用于 `source-atop` 遮罩、切片故障等。

## 图元

`fillAll(g, col)` 铺满底色（含出血） · `blobs(g, t, base, [cols], amp)` 流动光斑背景（amp 0.4 平静，1.5+ 爆闪，可乘 `Math.exp(-4*u)` 做冲击后回落） · `ring(g,cx,cy,r,col,al,lw,dash,rot)` · `ticks(g,cx,cy,r,n,rot,col,al)` 刻度环。

## 镜头技法 FX.*

| 技法 | 调用 | 适合表达 |
|---|---|---|
| 光线汇聚 | `FX.converge(g, u01, {cx,cy,colA,colB})` | 开场蓄力、转场吸入 |
| 冲击波 + 粒子 | `FX.shock(g, u, {cx,cy,cols,rings,streaks,scale})` | 爆开、发布、重击 |
| 占位徽标 | `FX.star(g,cx,cy,R,rot,grow,col,breath,t,n)`；`FX.rays(n)` 取射线数据 | 没有 logo 时的标志 |
| 仪表环 | `FX.dial(g,cx,cy,r,u,{text,al})` | 给标志加精密感 |
| 描边回声 | `FX.echo(g,str,size,cx,cy,col,e)`（e:1→0） | 大字砸入的余震 |
| 速度线 | `FX.speedLines(g,u,e,col,dir)` | 快、甩入 |
| 翻转字标 + 扫光 + 故障 | `FX.sweepWord(g,{str,font,cx,base,col,u,sweep:[起,时长],glitch:[起,时长],seed:t,flip})` 返回布局 | 英文名/品牌名亮相 |
| 斜向滚动字幕 | `FX.marquee(g,{unit,font,rowH,scroll,band,bandGrow,fill,stroke,angle,rows})` | 关键词铺满、宣言 |
| 纸卡片打字 | `FX.card(g,{x,y,pop,tab,text,p})` | 一句话文案、引用 |
| 代码墙 | `FX.codeWall(g, scrollPx, {lines,cols,size})` + `FX.glitchCjk(g,str,size,cx,cy,gl)` | 技术、工程、自动化 |
| 等距柱阵 | `FX.isoBars(g,u,{cx,cy,N,tw,amp,hi:[[i,j]],top,left,right})` | 数据、增长、规模 |
| 节点网络 + 雷达 | `FX.network(g,u,{cx,cy,R})` | 搜索、连接、生态 |
| 透视隧道 | `FX.tunnel(g,u,{colA,colB,speed})` | 深入、聚焦、穿越 |
| 点阵球 + 路径 | `FX.sphere(g,{cx,cy,R,ry,path})` | 全球、智能、探索 |
| 频闪字卡 | `FX.strobe(g,u,k,{bg,fg,text,sub,num,total})` | 步骤、清单、0.25s 连切 |
| 清单打勾 | `FX.checklist(g,u,rows,{x,y,rowH,size})` | 流程、承诺、功能点 |
| 轨道行星 | `FX.orbits(g,u,false,o)` → 画主体 → `FX.orbits(g,u,true,o)` | 好奇、灵活、围绕 |
| 描边收拢 + 参考线 | `FX.outlineConverge(g,str,size,cx,cy,col,e,solidAl)`、`FX.guides(g,cx,cy,hw,hh,p)` | 精确、透明、对齐 |
| 落地压扁 + 碎屑 + 砌墙 | `FX.slam(u)`→`{sx,sy,w}`、`FX.debris(g,u,{gy})`、`FX.bricks(g,u,{gy})` | 可靠、稳、重量 |
| 三色滚动带 | `FX.bands(g,u,[{text,bg,fg,dot,dir}],{collapse})` | 汇总多个关键词 |
| 粒子聚成任意形状 | `pts=FX.sample(ctx=>{…在[-1,1]内画白色…}, n)`（顶层调用一次）；`FX.assemble(g,pts,u,{cx,cy,R,rot,t})` | logo 定格、收尾 |
| 输入框 / 行动号召 | `FX.pill(g,v,{y,text,w,h,hit})` | CTA、搜索、对话 |
| 关机线 | `FX.crt(g,u,{cy})`（约 0.55s） | 干脆的结尾 |

组合惯例（见 `index.html`）：
- **砸字**：`cjk(..., j=>({s:st(u-j*.06,.3,1.1), al:u>=j*.06?1:0}))`，字与字错开 0.05–0.11s。
- **甩入**：`e=1-ex(P(u,0,.35))`，`dx:e*1800, shx:-.6*e`，配 `FX.speedLines`。
- **整组塌缩/吸走**：`g.translate(CX,CY); g.scale(1-q2, 1-q); g.translate(-CX,-CY)`，`q=ei(P(u,.62,.28))`，在镜头最后 0.3s 把画面压成一条线或一个点，下一个镜头在切点爆开。
- **压在复杂背景上的大字**：先用底色描一层粗边（`stroke=30~40`），再画实心字。
- **数字滚动**：`Math.round(N*eo(P(u,.06,.75)))`。
- **写新技法**时保持同样约定：纯函数、参数带默认值、位置用 `cx/cy`、颜色用 `PAL`。

## K.start 配置

```js
K.start({
  duration: 20,                       // 秒；不写则取最后一个镜头的结束时间
  hud: { title:'片名 — 副题', show:true },
  fade: { in:.12, out:.15 },
  shots: [[起, 止, (g,t,u)=>{}, { label:'01 — NAME', hud:PAL.ink | [上,下] | t=>col | false, bloom:.5, samples:10 }], ...],
  hits:  [[时间, 强度, 震屏像素], ...],
});
```
`KCONF` 可调：`W H FPS SAMPLES(子帧数) SHUTTER(快门占比) punch(镜头推进) caBase/caHit(色散) flash(闪白) vignette palette fonts`。想要更干净的画面就把 `caBase` 设 0、`flash` 设 0.15。
