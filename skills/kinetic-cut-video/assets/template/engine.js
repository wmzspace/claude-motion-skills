/* kinetic-cut-video engine — Canvas 2D, deterministic (everything is a pure function of time).
   Load order in index.html:  <script>window.KCONF={...}</script> <script src="engine.js"></script> <script>…shots…; K.start({...})</script> */
const KC=Object.assign({W:1920,H:1080,FPS:60,SAMPLES:10,SHUTTER:.6,punch:.05,caBase:1.6,caHit:13,flash:.3,vignette:.34,palette:{},fonts:{}},window.KCONF||{});
const W=KC.W,H=KC.H,CX=W/2,CY=H/2,PI=Math.PI,TAU=PI*2;
const PAL=Object.assign({ink:[19,18,17],paper:[240,238,230],accent:[217,119,87],accentHi:[242,160,126],warm:[232,180,90],deep:[122,46,28],shade:[58,31,43],mute:[176,174,165],gray:[94,93,89],cool:[90,150,210]},KC.palette);
const FONT=Object.assign({serif:'"Noto Serif CJK SC"',sans:'"Noto Sans CJK SC"',mono:'"DejaVu Sans Mono"'},KC.fonts);
// ---- math / easing ----
const cl=(x,a=0,b=1)=>x<a?a:x>b?b:x,lp=(a,b,t)=>a+(b-a)*t,P=(t,s,d)=>cl((t-s)/d);
const eo=x=>1-Math.pow(1-x,3),eo5=x=>1-Math.pow(1-x,5),ex=x=>x>=1?1:x<=0?0:1-Math.pow(2,-10*x),ei=x=>x*x*x,eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const spr=(x,d=7,f=9)=>x<=0?0:x>=1?1:1-Math.exp(-d*x)*Math.cos(f*x);   // spring 0→1 with overshoot
const st=(u,d=.28,k=1.2)=>1+k*(1-ex(P(u,0,d)));                         // "stamp" scale: (1+k)→1
const rgb=(c,a=1)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
const mixc=(a,b,t)=>{t=cl(t);return[lp(a[0],b[0],t),lp(a[1],b[1],t),lp(a[2],b[2],t)]};
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const fillAll=(g,c)=>{g.fillStyle=typeof c==='string'?c:rgb(c);g.fillRect(-W*.2,-H*.3,W*1.4,H*1.6)};
// ---- text ----
const _m=mk(8,8).getContext('2d'),_LC={};
function lay(str,font){const k=str+'|'+font;if(_LC[k])return _LC[k];_m.font=font;let x=0;const gl=[];for(const ch of str){const w=_m.measureText(ch).width;gl.push({ch,x,w});x+=w}return _LC[k]={gl,w:x}}
function T(g,str,font,x,y,col,al=1,align='center'){if(al<=.003)return;g.font=font;g.textAlign=align;g.fillStyle=rgb(col,al);g.fillText(str,x,y)}
function TS(g,str,font,x,y,col,lw,al=1,align='center'){if(al<=.003)return;g.font=font;g.textAlign=align;g.strokeStyle=rgb(col,al);g.lineWidth=lw;g.lineJoin='round';g.strokeText(str,x,y)}
function tracked(g,str,font,cx,y,sp,col,al=1){if(al<=.003)return;const L=lay(str,font),n=L.gl.length,x0=cx-(L.w+sp*(n-1))/2;g.font=font;g.textAlign='left';g.fillStyle=rgb(col,al);L.gl.forEach((q,k)=>g.fillText(q.ch,x0+q.x+k*sp,y))}
/* cjk: full-width glyphs, vertically centred on cy. fn(j)->{s,sx,sy,rot,shx,dx,dy,al,col}; stroke>0 draws outline. */
function cjk(g,str,size,cx,cy,col,fn,stroke=0,weight=900,family=FONT.serif){const ch=[...str],n=ch.length;g.font=`${weight} ${size}px ${family}`;g.textAlign='center';g.lineJoin='round';
  for(let j=0;j<n;j++){const o=fn?fn(j):{};if(o.al===0)continue;const s=o.s??1;g.save();g.translate(cx+(j-(n-1)/2)*size+(o.dx||0),cy+(o.dy||0));if(o.rot)g.rotate(o.rot);if(o.shx)g.transform(1,0,o.shx,1,0,0);g.scale((o.sx??1)*s,(o.sy??1)*s);g.globalAlpha*=(o.al??1);
    if(stroke){g.strokeStyle=rgb(o.col||col);g.lineWidth=stroke/(s||1);g.strokeText(ch[j],0,.36*size)}else{g.fillStyle=rgb(o.col||col);g.fillText(ch[j],0,.36*size)}g.restore()}}
/* word: proportional (Latin) glyphs on a baseline, centred on cx. fn(j)->{s,sx,sy,rot,dx,dy,al,col} pivot = glyph bottom-centre. */
function word(g,str,font,cx,base,col,fn){const L=lay(str,font),x0=cx-L.w/2;g.font=font;g.textAlign='center';L.gl.forEach((q,j)=>{const o=fn?fn(j):{};if(o.al===0)return;const s=o.s??1;g.save();g.translate(x0+q.x+q.w/2+(o.dx||0),base+(o.dy||0));if(o.rot)g.rotate(o.rot);g.scale(Math.max(.001,(o.sx??1)*s),(o.sy??1)*s);g.globalAlpha*=(o.al??1);g.fillStyle=rgb(o.col||col);g.fillText(q.ch,0,0);g.restore()});return L}
function typed(str,p){const a=[...str];return a.slice(0,Math.floor(cl(p)*a.length+.01)).join('')}
// ---- primitives ----
const _BL=mk(320,180),_blc=_BL.getContext('2d');
/* blobs: soft moving light field. base colour + list of glow colours; amp ~0.4 calm … 2 flare. */
function blobs(g,t,base,cols,amp=1){_blc.globalCompositeOperation='source-over';_blc.fillStyle=rgb(base);_blc.fillRect(0,0,320,180);_blc.globalCompositeOperation='lighter';
  cols.forEach((c,i)=>{const x=160+Math.sin(t*.7*(1+i*.23)+i*2.1)*120,y=90+Math.cos(t*.55*(1+i*.31)+i*1.3)*70,r=120+40*Math.sin(t*.9+i),gr=_blc.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,rgb(c,cl(.5*amp)));gr.addColorStop(1,rgb(c,0));_blc.fillStyle=gr;_blc.fillRect(0,0,320,180)});
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(_BL,-W*.08,-H*.08,W*1.16,H*1.16)}
function ticks(g,cx,cy,r,n,rot,col,al){if(al<=.003||r<=0)return;g.save();g.translate(cx,cy);g.rotate(rot);g.strokeStyle=rgb(col,al);g.lineWidth=2;g.beginPath();for(let i=0;i<n;i++){const a=i/n*TAU,l=i%5?9:22,c=Math.cos(a),s=Math.sin(a);g.moveTo(c*r,s*r);g.lineTo(c*(r+l),s*(r+l))}g.stroke();g.restore()}
function ring(g,cx,cy,r,col,al,lw=2,dash=null,rot=0){if(al<=.003||r<=0)return;g.save();g.translate(cx,cy);g.rotate(rot);g.strokeStyle=rgb(col,al);g.lineWidth=lw;if(dash)g.setLineDash(dash);g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();g.restore()}
function arcText(g,str,font,cx,cy,r,rot,col,al){if(al<=.003||r<=0)return;const ch=[...str],n=ch.length;g.save();g.translate(cx,cy);g.font=font;g.textAlign='center';g.fillStyle=rgb(col,al);for(let i=0;i<n;i++){g.save();g.rotate(rot+i/n*TAU);g.fillText(ch[i],0,-r);g.restore()}g.restore()}
const _LY=mk(W,H),_ly=_LY.getContext('2d');
/* layer(draw): returns an offscreen canvas the size of the frame, cleared, after running draw(ctx). Use for sweeps/glitch/masks. */
function layer(draw){_ly.setTransform(1,0,0,1,0,0);_ly.globalAlpha=1;_ly.globalCompositeOperation='source-over';_ly.clearRect(0,0,W,H);draw(_ly);return _LY}

// ---- building blocks for NEW techniques (prefer these over whole FX recipes) ----
/* stg: staggered progress for item i. e.g. a=stg(u,i,.05,.4,ex) */
const stg=(u,i,gap=.05,d=.4,ease=ex)=>ease(P(u,i*gap,d));
/* noise1: smooth deterministic 1-D value noise in [-1,1] — organic jitter, signal wobble, hand-drawn lines. */
const noise1=(x,seed=0)=>{const h=n=>{const v=Math.sin(n*127.1+seed*311.7)*43758.5453;return v-Math.floor(v)},i=Math.floor(x),f=x-i,k=f*f*(3-2*f);return lp(h(i),h(i+1),k)*2-1};
/* drawOn: stroke a polyline [[x,y],...] up to fraction p of its length (traces, waveforms, routes, signatures). Returns the head point. */
function drawOn(g,pts,p,col,lw=3,al=1){if(pts.length<2||p<=0)return pts[0];const L=[0];for(let i=1;i<pts.length;i++)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));const end=L[L.length-1]*cl(p);
  g.save();g.strokeStyle=rgb(col,al);g.lineWidth=lw;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(pts[0][0],pts[0][1]);let hx=pts[0][0],hy=pts[0][1];
  for(let i=1;i<pts.length;i++){if(L[i]<=end){g.lineTo(pts[i][0],pts[i][1]);hx=pts[i][0];hy=pts[i][1]}else{const f=(end-L[i-1])/(L[i]-L[i-1]||1);hx=lp(pts[i-1][0],pts[i][0],f);hy=lp(pts[i-1][1],pts[i][1],f);g.lineTo(hx,hy);break}}g.stroke();g.restore();return[hx,hy]}

// ======================= FX recipes (all parameterised) =======================
const FX={};
const _STK=(()=>{const r=rng(21);return Array.from({length:760},()=>({a:r()*TAU,r:.15+r()*.7,w:1+r()*3.2,c:r(),d:r()*.32}))})();
/* converge: light streaks rush to a point. u:0..1 */
FX.converge=(g,u,o={})=>{const cx=o.cx??CX,cy=o.cy??CY,A=o.colA||PAL.accent,B=o.colB||PAL.paper,D=Math.hypot(W,H);g.save();g.lineCap='round';
  const gr=g.createRadialGradient(cx,cy,0,cx,cy,60+D*.24*u*u*u);gr.addColorStop(0,rgb(o.core||PAL.accentHi,.95*u*u));gr.addColorStop(1,rgb(A,0));g.fillStyle=gr;g.fillRect(0,0,W,H);
  for(const p of _STK){const q=P(u,p.d,1-p.d),k=1-q*q*q,R=p.r*D,r=R*k+6,l=8+R*q*q*.55*(k+.08);g.strokeStyle=rgb(mixc(A,B,p.c),P(u,0,.2)*(.3+.7*q));g.lineWidth=p.w;g.beginPath();g.moveTo(cx+Math.cos(p.a)*r,cy+Math.sin(p.a)*r);g.lineTo(cx+Math.cos(p.a)*(r+l),cy+Math.sin(p.a)*(r+l));g.stroke()}g.restore()};
const _BP=(()=>{const r=rng(8);return Array.from({length:260},()=>({a:r()*TAU,v:700+r()*4400,w:1.5+r()*4,c:r(),tw:r()*TAU}))})();
/* shock: expanding rings + streak particles from an impact. u = seconds since hit. */
FX.shock=(g,u,o={})=>{if(u<0)return;const cx=o.cx??CX,cy=o.cy??CY,cols=o.cols||[PAL.accentHi,PAL.warm,PAL.paper],k=o.scale??1,n=o.rings??3;g.save();g.lineCap='round';
  for(let i=0;i<n;i++){const p=P(u,i*.09,.95);if(p<=0||p>=1)continue;g.strokeStyle=rgb(i?(o.ringCol||PAL.accent):cols[0],(1-p)*.8);g.lineWidth=14*(1-p)+1;g.beginPath();g.arc(cx,cy,(180+1500*eo5(p))*k,0,TAU);g.stroke()}
  if(o.streaks!==false)for(const b of _BP){const r=(150+b.v*(1-Math.exp(-4.2*u))/4.2)*k,l=(b.v*Math.exp(-4.2*u)*.035+2)*k,al=(1-P(u,.7,.8))*(.6+.4*Math.sin(u*20+b.tw));if(al<=0)continue;g.strokeStyle=rgb(cols[Math.floor(b.c*cols.length)],al);g.lineWidth=b.w;g.beginPath();g.moveTo(cx+Math.cos(b.a)*r,cy+Math.sin(b.a)*r);g.lineTo(cx+Math.cos(b.a)*(r+l),cy+Math.sin(b.a)*(r+l));g.stroke()}g.restore()};
/* star: n irregular rays. ⚠ This shape is close to the Claude logo — use it ONLY when the video is about Claude/Anthropic.
   For any other subject draw the subject's own mark (its logo paths, initials, an object from its motif) and feed it to FX.sample/FX.assemble. grow 0..~1.2 */
const _RAY=n=>{const r=rng(11);return Array.from({length:n},(_,i)=>({a:i/n*TAU+(r()-.5)*.16-PI/2,l:[1,.8,.93,.76][i%4]*(.96+r()*.08),w:.15+r()*.03}))},_RC={};
FX.rays=(n=12)=>_RC[n]||(_RC[n]=_RAY(n));
FX.star=(g,cx,cy,R,rot=0,grow=2,col=PAL.accent,breath=0,t=0,n=12)=>{if(R<=0)return;g.save();g.translate(cx,cy);g.rotate(rot);g.fillStyle=rgb(col);FX.rays(n).forEach((ry,i)=>{const gi=spr(P(grow,i*.04,.56),5,8);if(gi<=.001)return;const L=R*ry.l*gi*(1+breath*Math.sin(t*3.1+i*1.9)),h=R*ry.w;g.save();g.rotate(ry.a);g.beginPath();g.roundRect(-R*.03,-h/2,L+R*.03,h,h*.22);g.fill();g.restore()});g.restore()};
/* dial: instrument rings (ticks + dashed ring + rotating arc text) around a point. */
FX.dial=(g,cx,cy,r,u,o={})=>{const c=o.col||PAL.paper,a=o.al??1;ticks(g,cx,cy,r,o.n||120,u*.3,c,.55*a);ring(g,cx,cy,r*1.153,c,.3*a,1.5,[4,14],-u*.4);if(o.text)arcText(g,o.text,`400 ${o.size||22}px ${FONT.mono}`,cx,cy,r*1.276,-u*.25,o.textCol||PAL.mute,.85*a)};
/* echo: outlined copies that collapse into the solid word. e: 1 (spread) → 0 (collapsed) */
FX.echo=(g,str,size,cx,cy,col,e,n=4)=>{g.save();for(let k=n;k>=1;k--){g.globalAlpha=.55/k;cjk(g,str,size,cx,cy,col,j=>({s:1+k*.07*(1+3.2*e)}),3)}g.restore()};
const _SL=(()=>{const r=rng(31);return Array.from({length:52},()=>({y:r(),l:200+r()*900,v:.5+r(),w:1+r()*5,x:r()}))})();
/* speedLines: horizontal streaks. e: 1 fast → 0 settled, u seconds. dir -1 leftwards */
FX.speedLines=(g,u,e,col=PAL.paper,dir=-1)=>{const M=W+1400;for(const s of _SL){const x=(((s.x*W+dir*(u*900+2800*(1-e))*s.v)%M)+M)%M-700;g.fillStyle=rgb(col,.2+.5*e);g.fillRect(x,s.y*H,s.l*(.3+e),s.w)}};
/* sweepWord: Latin wordmark, letters flip in, a light band sweeps across, optional glitch tear-out.
   o:{str,font,cx,base,col,u, stagger=.05, sweep:[start,dur], sweepCol, glitch:[start,dur], seed} */
FX.sweepWord=(g,o)=>{const L=lay(o.str,o.font),u=o.u,stg=o.stagger??.05;const cv=layer(c=>{word(c,o.str,o.font,o.cx??CX,o.base,o.col||PAL.paper,o.flip===false?null:j=>{const a=P(u,j*stg,.5);return a<=0?{al:0}:{sx:spr(a,5,8),dy:-(1-ex(a))*130}});
    if(o.sweep){const sw=eio(P(u,o.sweep[0],o.sweep[1]));if(sw>0&&sw<1){c.globalCompositeOperation='source-atop';const x=lp(-W*.3,W*1.1,sw),gr=c.createLinearGradient(x,0,x+W*.24,H*.16);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.5,rgb(o.sweepCol||[255,196,160],1));gr.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gr;c.fillRect(0,0,W,H)}}});
  const gp=o.glitch?P(u,o.glitch[0],o.glitch[1]):0;if(gp>0){const r=rng(Math.floor((o.seed??u)*45)+3),sh=54;for(let y=0;y<H;y+=sh)g.drawImage(cv,0,y,W,sh,(r()-.5)*W*.17*gp,y,W,sh)}else g.drawImage(cv,0,0);return L};
/* marquee: tilted rows of repeated text scrolling in alternating directions; centre row solid on a colour band.
   o:{unit,font,rowH,rows=3,angle=-.13,scroll,band,bandGrow=1,fill,stroke,strokeAl=.32} */
FX.marquee=(g,o)=>{const uw=lay(o.unit,o.font).w,R=o.rows??3,rh=o.rowH,D=Math.hypot(W,H)*.8;g.save();g.translate(o.cx??CX,o.cy??CY);g.rotate(o.angle??-.13);g.font=o.font;g.textAlign='left';g.lineJoin='round';
  if(o.band){g.fillStyle=rgb(o.band);const b=o.bandGrow??1;g.fillRect(-D,-rh/2*b,D*2,rh*b)}
  for(let k=-R;k<=R;k++){const dir=k%2?1:-1,off=dir*o.scroll+k*137,y=k*rh+rh*.28;let x=((off%uw)+uw)%uw-uw-D;for(;x<D;x+=uw){if(k===0){g.fillStyle=rgb(o.fill||PAL.paper);g.fillText(o.unit,x,y)}else{g.strokeStyle=rgb(o.stroke||PAL.ink,o.strokeAl??.32);g.lineWidth=2.5;g.strokeText(o.unit,x,y)}}}g.restore()};
/* card: paper card with a filename tab, typed headline and caret. p typed 0..1, c pop 0..1 */
FX.card=(g,o)=>{const c=o.pop??1,w=o.w||900,h=o.h||250;g.save();g.translate(o.x,o.y+(1-c)*H*.5);g.rotate(o.rot??.035);g.shadowColor='rgba(20,20,19,.38)';g.shadowBlur=60;g.shadowOffsetY=30;g.fillStyle=o.bg||'#FBFAF6';g.beginPath();g.roundRect(-w/2,-h/2,w,h,26);g.fill();g.shadowColor='transparent';
  if(o.tab)T(g,o.tab,`400 20px ${FONT.mono}`,-w/2+50,-h/2+53,PAL.mute,1,'left');const s=typed(o.text,o.p??1);g.font=o.font||`700 70px ${FONT.serif}`;g.textAlign='left';g.fillStyle=rgb(o.col||PAL.ink);g.fillText(s,-w/2+50,h*.16);const tw=g.measureText(s).width;g.fillStyle=rgb(o.caret||PAL.accent);g.fillRect(-w/2+58+tw,h*.16-68,6,80);g.restore()};
/* codeWall: sheared columns of syntax-coloured code scrolling. lines: array of strings; scroll in px. */
const _KW=new Set(['def','for','in','return','class','async','await','while','not','if','else','self','import','from','const','let','function','new','try','except']);
const _tok=l=>{const o=[],re=/([A-Za-z_]+|"[^"]*"|\s+|[^A-Za-z_\s"]+)/g;let m,x=0;while(m=re.exec(l)){const s=m[0];let c='mute';if(_KW.has(s))c='accent';else if(s[0]==='"')c='warm';else if(/^[A-Za-z_]+$/.test(s)&&l[re.lastIndex]==='(')c='paper';else if(/^[^A-Za-z_\s]/.test(s))c='gray';if(s.trim())o.push([s,x,c]);x+=s.length}return o},_TC=new Map();
FX.codeWall=(g,scroll,o)=>{let tk=_TC.get(o.lines);if(!tk){tk=o.lines.map(_tok);_TC.set(o.lines,tk)}const fs=o.size||30,lh=fs*1.53,n=tk.length,tot=lh*n,cols=o.cols||3;g.save();g.transform(1,o.skewY??-.1,o.skewX??.22,1,-W*.16,H*.25);g.font=`400 ${fs}px ${FONT.mono}`;g.textAlign='left';const cw=g.measureText('M').width;
  for(let c=0;c<cols;c++){const base=-((scroll*(1+c*.35)+c*211)%tot);for(let r=0;r<n*Math.ceil(H*1.6/tot+1);r++){const y=base+r*lh;if(y<-H*.25||y>H*1.25)continue;for(const[s,x,k]of tk[r%n]){g.fillStyle=rgb(PAL[k],o.al??.62);g.fillText(s,W*.047+c*W*.385+x*cw,y)}}}g.restore();
  if(o.focus!==false){const gr=g.createRadialGradient(CX,CY,120,CX,CY,H*.83);gr.addColorStop(0,rgb(o.bg||[14,13,13],.86));gr.addColorStop(1,rgb(o.bg||[14,13,13],0));g.fillStyle=gr;g.fillRect(-200,-200,W+400,H+400)}};
/* glitchCjk: RGB-split copies converging onto the word. gl: 1→0 */
FX.glitchCjk=(g,str,size,cx,cy,gl,a=PAL.accent,b=PAL.cool)=>{if(gl<=0)return;g.save();g.globalCompositeOperation='lighter';cjk(g,str,size,cx-46*gl,cy,a);cjk(g,str,size,cx+46*gl,cy+6,b);g.restore()};
/* isoBars: isometric field of bars rippling like a wave. u seconds. o:{cx,cy,N=11,tw=96,top,left,right,hi:[[i,j],..],hiCol} */
FX.isoBars=(g,u,o={})=>{const cx=o.cx??W*.7,cy=o.cy??H*.22,tw=o.tw||96,th=tw/2,N=o.N||11,hw=tw*.39,hh=th*.39,top=o.top||PAL.paper,lf=o.left||[176,88,60],rt=o.right||PAL.deep,amp=o.amp||235,hi=o.hi||[];
  const poly=(p,c)=>{g.fillStyle=rgb(c);g.beginPath();g.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)g.lineTo(p[i],p[i+1]);g.closePath();g.fill()};
  for(let s=0;s<=2*(N-1);s++)for(let i=Math.max(0,s-N+1);i<=Math.min(N-1,s);i++){const j=s-i,grw=spr(P(u-(i+j)*.014,0,.5),5,7),h=(34+amp*Math.pow(.5+.5*Math.sin(i*.6+j*.42-u*5.5),2))*grw,x=cx+(i-j)*tw/2,y=cy+(i+j)*th/2+amp+35,H1=hi.some(q=>q[0]===i&&q[1]===j);
    poly([x-hw,y-h,x,y-h+hh,x,y+hh,x-hw,y],H1?[40,36,34]:lf);poly([x,y-h+hh,x+hw,y-h,x+hw,y,x,y+hh],H1?[10,10,10]:rt);poly([x,y-h-hh,x+hw,y-h,x,y-h+hh,x-hw,y-h],H1?(o.hiCol||PAL.ink):top)}};
/* network: rotating 3D node cloud with links and a radar sweep that lights nodes. u seconds. */
const _NET=(()=>{const r=rng(17),p=[];while(p.length<160){const x=r()*2-1,y=r()*2-1,z=r()*2-1;if(x*x+y*y+z*z<1)p.push([x,y*.72,z])}const e=[];for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){const d=(p[i][0]-p[j][0])**2+(p[i][1]-p[j][1])**2+(p[i][2]-p[j][2])**2;if(d<.08)e.push([i,j])}return{p,e}})();
FX.network=(g,u,o={})=>{const cx=o.cx??W*.61,cy=o.cy??CY,R0=o.R||660,R=R0*spr(P(u,0,.7),4,6),ry=u*.9+1.6*(1-ex(P(u,0,1))),c=Math.cos(ry),s=Math.sin(ry),N=o.node||PAL.paper,A=o.accent||PAL.accent,Ah=o.lit||PAL.accentHi;
  const pr=_NET.p.map(p=>{const x=p[0]*c+p[2]*s,z=-p[0]*s+p[2]*c,k=2.4/(2.4-z);return[cx+x*R*k,cy+p[1]*R*k,z,k]});
  for(const f of[.3,.6,.91])ring(g,cx,cy,R0*f,N,.13,1.5);g.fillStyle=rgb(N,.13);g.fillRect(cx-R0*.97,cy-1,R0*1.94,2);g.fillRect(cx-1,cy-R0*.97,2,R0*1.94);ticks(g,cx,cy,R0*.91,180,0,N,.3);
  const th=u*5.5-1,cg=g.createConicGradient(th,cx,cy);cg.addColorStop(0,rgb(A,0));cg.addColorStop(.78,rgb(A,0));cg.addColorStop(1,rgb(A,.42));g.fillStyle=cg;g.beginPath();g.arc(cx,cy,R0*.94,0,TAU);g.fill();
  g.strokeStyle=rgb(Ah,.9);g.lineWidth=3;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(th)*R0*.94,cy+Math.sin(th)*R0*.94);g.stroke();
  g.lineWidth=1.2;for(const[i,j]of _NET.e){const a=pr[i],b=pr[j];g.strokeStyle=rgb(N,lp(.04,.3,((a[2]+b[2])/2+1)/2));g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke()}
  for(const p of pr){const d=(((th-Math.atan2(p[1]-cy,p[0]-cx))%TAU)+TAU)%TAU,lit=Math.exp(-d*1.5),dp=(p[2]+1)/2,r=(2.5+5*dp)*p[3]*(1+1.2*lit);g.fillStyle=rgb(mixc(N,Ah,lit),lp(.25,1,dp));g.beginPath();g.arc(p[0],p[1],r,0,TAU);g.fill();if(lit>.45){g.strokeStyle=rgb(A,lit);g.lineWidth=2;g.beginPath();g.arc(p[0],p[1],r+8+14*(1-lit),0,TAU);g.stroke()}}};
/* tunnel: rounded frames rushing at the camera. u seconds. */
FX.tunnel=(g,u,o={})=>{const N=o.n||26,A=o.colA||PAL.paper,B=o.colB||PAL.accent,sp=o.speed??.85;g.save();g.translate(o.cx??CX,o.cy??CY);
  for(let k=0;k<N;k++){const z=(((k/N+u*sp)%1)+1)%1,s=Math.pow(z,2.6)*3.4+.02,w=W*s,h=H*s;g.save();g.rotate((1-z)*1.6+u*.25);g.strokeStyle=rgb(k%3?A:B,Math.min(1,z*2.2)*(1-P(z,.85,.15))*(k%3?.6:1));g.lineWidth=1.5+14*z*z*z;g.beginPath();g.roundRect(-w/2,-h/2,w,h,h*.18);g.stroke();g.restore()}g.restore();
  if(o.focus!==false){const bg=o.bg||[13,12,12],gr=g.createRadialGradient(CX,CY,H*.15,CX,CY,H*.52);gr.addColorStop(0,rgb(bg,.8));gr.addColorStop(1,rgb(bg,0));g.fillStyle=gr;g.fillRect(0,0,W,H)}};
/* sphere: Fibonacci point sphere with wire links and a glowing path. o:{cx,cy,R,ry,rx=.36,path:0..1} */
const _PTS=(()=>{const n=640,p=[],ga=PI*(3-Math.sqrt(5));for(let i=0;i<n;i++){const y=1-2*(i+.5)/n,r=Math.sqrt(1-y*y),a=i*ga;p.push([Math.cos(a)*r,y,Math.sin(a)*r])}return p})();
const _NB=_PTS.map((p,i)=>_PTS.map((q,j)=>[(p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2,j]).filter(x=>x[1]!==i).sort((a,b)=>a[0]-b[0]).slice(0,6).map(x=>x[1]));
const _SE=[];_NB.forEach((l,i)=>l.slice(0,3).forEach(j=>{if(i<j)_SE.push([i,j])}));
const _PATH=(()=>{const r=rng(5),path=[600],seen=new Set(path);for(let k=0;k<40;k++){const cur=path[path.length-1],cand=_NB[cur].filter(j=>!seen.has(j));if(!cand.length)break;cand.sort((a,b)=>_PTS[b][1]-_PTS[a][1]);const nx=cand[Math.min(cand.length-1,Math.floor(r()*2.6))];path.push(nx);seen.add(nx)}return path})();
FX.sphere=(g,o)=>{const cx=o.cx??CX,cy=o.cy??CY,R=o.R,rx=o.rx??.36,cr=Math.cos(o.ry),sr=Math.sin(o.ry),cxr=Math.cos(rx),sxr=Math.sin(rx),N=o.node||PAL.paper,A=o.accent||PAL.accent;if(R<=1)return;
  const pr=_PTS.map(p=>{const x=p[0]*cr+p[2]*sr,z=-p[0]*sr+p[2]*cr,y2=p[1]*cxr-z*sxr,z2=p[1]*sxr+z*cxr,s=3/(3-z2);return[cx+x*R*s,cy-y2*R*s,z2,s]});
  g.save();g.lineWidth=1;for(const[i,j]of _SE){const a=pr[i],b=pr[j];g.strokeStyle=rgb(N,lp(.02,.2,((a[2]+b[2])/2+1)/2));g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke()}
  for(const p of pr){const d=(p[2]+1)/2;g.fillStyle=rgb(N,lp(.14,.9,d));g.beginPath();g.arc(p[0],p[1],lp(1,2.9,d)*p[3],0,TAU);g.fill()}
  const pp=cl(o.path||0)*(_PATH.length-1),full=Math.floor(pp),fr=pp-full;if(pp>0){g.strokeStyle=rgb(A);g.lineWidth=6;g.lineCap='round';g.lineJoin='round';g.beginPath();let hx,hy;
    _PATH.forEach((id,k)=>{if(k>full+1)return;let[x,y]=pr[id];if(k===full+1){const q=pr[_PATH[full]];x=lp(q[0],x,fr);y=lp(q[1],y,fr)}k?g.lineTo(x,y):g.moveTo(x,y);hx=x;hy=y});g.stroke();
    const gr=g.createRadialGradient(hx,hy,0,hx,hy,150);gr.addColorStop(0,rgb(PAL.accentHi,.7));gr.addColorStop(1,rgb(A,0));g.fillStyle=gr;g.fillRect(hx-150,hy-150,300,300);g.fillStyle='#FFEFE6';g.beginPath();g.arc(hx,hy,11,0,TAU);g.fill()}g.restore()};
/* orbits: elliptical orbits with planets that pass behind / in front of whatever you draw between the two calls.
   call FX.orbits(g,u,false,o) → draw subject → FX.orbits(g,u,true,o).  o.list:[[a,b,tilt,speed,col,size],...] */
FX.orbits=(g,u,front,o={})=>{const cx=o.cx??CX,cy=o.cy??CY,L=o.list||[[660,170,-.2,5.2,PAL.accent,46],[540,250,.36,6.7,PAL.warm,30],[780,112,.08,4.1,PAL.ink,24]],lc=o.line||PAL.ink;
  L.forEach(([a,b,tilt,spd,col,sz],k)=>{const p=eo(P(u,k*.05,.35));if(p<=0)return;g.save();g.translate(cx,cy);g.rotate(tilt);g.strokeStyle=rgb(lc,.5);g.lineWidth=2.5;g.beginPath();if(front)g.ellipse(0,0,a,b,0,0,PI*Math.min(1,p*2));else g.ellipse(0,0,a,b,0,PI,PI+PI*Math.max(0,p*2-1));g.stroke();
    for(let m=10;m>=0;m--){const th=(u-m*.012)*spd+k*2.1,d=Math.sin(th);if((d>=0)!==front)continue;g.fillStyle=rgb(col,m?.45*(1-m/11):1);g.beginPath();g.arc(Math.cos(th)*a,Math.sin(th)*b,Math.max(1,(sz/2-m*1.2)*(1+.35*d)),0,TAU);g.fill()}g.restore()})};
/* outlineConverge: stacked outlines above & below collapse into the solid word. e: 1→0, solid alpha separately. */
FX.outlineConverge=(g,str,size,cx,cy,col,e,solidAl=1,n=5,gap=78)=>{g.save();if(e>.004)for(let k=n;k>=1;k--)for(const d of[-1,1]){g.globalAlpha=.75*(1-k/(n+2));cjk(g,str,size,cx,cy+d*k*gap*e,col,null,3)}g.restore();g.save();cjk(g,str,size,cx,cy,col,j=>({al:solidAl,s:1+.04*e}));g.restore()};
/* guides: design-tool guide lines sliding in to frame a box. p 0..1 */
FX.guides=(g,cx,cy,hw,hh,p,col=PAL.paper)=>{g.fillStyle=rgb(col,.55);g.fillRect(lp(-200,cx-hw,p),-200,2,H+400);g.fillRect(lp(W+200,cx+hw,p),-200,2,H+400);g.fillRect(-200,lp(-200,cy-hh,p),W+400,2);g.fillRect(-200,lp(H+200,cy+hh,p),W+400,2)};
/* slam: squash/rebound factors for something that lands at u=0. returns {sx,sy,w} */
FX.slam=(u,k=.24)=>{const w=u<0?0:Math.exp(-9*u)*Math.cos(26*u);return{w,sy:1-k*w,sx:1+k*.62*w}};
const _DST=(()=>{const r=rng(41);return Array.from({length:170},()=>({x:(r()-.5)*1000,vx:(r()-.5)*2600,vy:300+r()*1500,s:3+r()*11,c:r(),rot:r()*TAU}))})();
/* debris: squares sprayed up from a ground line at impact; falls back with gravity. */
FX.debris=(g,u,o={})=>{const cx=o.cx??CX,gy=o.gy??H*.65,A=o.colA||PAL.accent,B=o.colB||PAL.paper;for(const d of _DST){const x=cx+d.x+d.vx*(1-Math.exp(-3*u))/3,y=gy-d.vy*u+1500*u*u;if(y>gy)continue;g.save();g.translate(x,y);g.rotate(d.rot+u*8);g.fillStyle=rgb(d.c<.3?A:B,1-P(u,.5,.4));g.fillRect(-d.s/2,-d.s/2,d.s,d.s);g.restore()}
  const p=P(u,0,.6);if(p<1){g.strokeStyle=rgb(o.ring||PAL.accentHi,(1-p)*.9);g.lineWidth=8*(1-p)+1;g.beginPath();g.ellipse(cx,gy,300+1000*eo5(p),20+70*eo5(p),0,0,TAU);g.stroke()}
  g.fillStyle=rgb(B);const gl=W*.57*ex(P(u,0,.3));g.fillRect(cx-gl,gy-3,gl*2,6)};
/* bricks: wall building up below a ground line, spreading from the centre. */
FX.bricks=(g,u,o={})=>{const gy=o.gy??H*.65,bw=o.bw||100,bh=o.bh||66,rows=Math.ceil((H-gy)/bh)+1,cols=Math.ceil(W/bw)+2,base=o.col||[40,38,36],A=o.accent||PAL.accent;
  for(let r=0;r<rows;r++)for(let k=-1;k<cols;k++){const x=k*bw+(r%2?-bw/2:0),s=spr(P(u-(.05+Math.abs(k-cols/2+1)*.022+r*.045),0,.4),6,8);if(s<=0)continue;const hi=(k*7+r*3)%11===0;g.fillStyle=rgb(hi?A:base);g.fillRect(x+3,gy+10+r*bh,bw-6,(bh-6)*s);if(!hi){g.fillStyle=rgb(PAL.paper,.06);g.fillRect(x+3,gy+10+r*bh,bw-6,5*s)}}};
/* bands: full-width colour bands with scrolling repeated words. rows:[{text,bg,fg,dot,dir}], u seconds; q collapses to a line (0..1). */
FX.bands=(g,u,rows,o={})=>{const n=rows.length,bh=H/n,size=o.size||bh*.745,F=`900 ${size}px ${FONT.serif}`,q=o.collapse||0;g.save();g.translate(CX,CY);g.scale(1,1-q*.992);g.translate(-CX,-CY);
  rows.forEach((r,k)=>{const dir=r.dir??(k%2?1:-1),e=ex(P(u-k*.05,0,.32)),ox=dir*(1-e)*(W+500),unit=r.text+' · ',uw=lay(unit,F).w,tw=lay(r.text,F).w,off=dir*(u*520+1500*(1-ex(P(u,0,.7))))+k*190;g.save();g.beginPath();g.rect(-300+ox,k*bh,W+600,bh);g.clip();g.fillStyle=rgb(r.bg);g.fillRect(-300+ox,k*bh,W+600,bh);
    g.font=F;g.textAlign='left';let x=((off%uw)+uw)%uw-uw-300+ox;for(;x<W+300+Math.abs(ox);x+=uw){g.fillStyle=rgb(r.fg);g.fillText(r.text,x,k*bh+bh*.772);g.fillStyle=rgb(r.dot||PAL.accent);g.fillText(' · ',x+tw,k*bh+bh*.772)}g.restore()});
  if(q>0){g.fillStyle=rgb(o.flash||PAL.accentHi,q);g.fillRect(-300,0,W+600,H)}g.restore()};
/* sample: turn ANY drawing (logo, glyph, icon) into particle targets. draw(ctx) paints white in a [-1,1] box. */
FX.sample=(draw,n=2600,seed=77)=>{const S=384,c=mk(S,S),x=c.getContext('2d',{willReadFrequently:true});x.translate(S/2,S/2);x.scale(S/2,S/2);x.fillStyle='#fff';x.strokeStyle='#fff';draw(x);const d=x.getImageData(0,0,S,S).data,ok=[];for(let i=0;i<S*S;i++)if(d[i*4+3]>128)ok.push(i);const r=rng(seed),o=[];
  for(let i=0;i<n&&ok.length;i++){const k=ok[Math.floor(r()*ok.length)],px=((k%S)+r())/S*2-1,py=(Math.floor(k/S)+r())/S*2-1;o.push({ta:Math.atan2(py,px),tr:Math.hypot(px,py),sr:4+r()*7,d:r()*.42,c:r(),z:2+r()*3})}return o};
/* assemble: particles swirl in from afar and settle on the sampled shape. u seconds (≈1s to settle). */
FX.assemble=(g,pts,u,o={})=>{const cx=o.cx??CX,cy=o.cy??CY,R=o.R||180,rot=o.rot||0,cols=o.cols||[PAL.accent,PAL.accentHi,PAL.warm],t=o.t||0;g.save();g.globalCompositeOperation='lighter';
  for(const p of pts){const a=P(u-p.d,0,.95);if(a<=0)continue;const e=ex(a),rad=lp(p.sr,p.tr,e)*(1+(u>1.1?.07*Math.sin(t*3+p.c*40):0)),ang=p.ta+rot+(1-e)*(2.4+p.c),z=p.z*(1+2.5*(1-e));g.fillStyle=rgb(cols[Math.floor(p.c*cols.length)],u>1?(o.restAl??.38):.85);g.fillRect(cx+Math.cos(ang)*rad*R-z/2,cy+Math.sin(ang)*rad*R-z/2,z,z)}g.restore()};
/* pill: input pill with typed text, caret and a send button that pulses. v seconds. */
FX.pill=(g,v,o)=>{const cx=o.cx??CX,y=o.y,w=(o.w||920)*spr(P(v,.02,.5),6,7),h=o.h||104,fg=o.fg||PAL.paper,A=o.accent||PAL.accent;if(w<4)return;g.save();g.fillStyle=rgb(fg,.07);g.strokeStyle=rgb(fg,.32);g.lineWidth=2;g.beginPath();g.roundRect(cx-w/2,y-h/2,w,h,h/2);g.fill();g.stroke();
  const s=typed(o.text,P(v,.15,o.typeDur||.5));g.font=`400 ${h*.365}px ${FONT.sans}`;g.textAlign='left';g.fillStyle=rgb(fg,P(v,.1,.1));const x0=cx-(o.w||920)/2+48;g.fillText(s,x0,y+h*.135);const tw=g.measureText(s).width;if(s.length<[...o.text].length||Math.floor(v*5)%2===0){g.fillStyle=rgb(A,P(v,.1,.1));g.fillRect(x0+tw+8,y-h*.25,4,h*.5)}
  const hit=o.hit??.75,bs=spr(P(v,.2,.4),6,8)*(1-.16*Math.sin(PI*P(v,hit-.03,.2))),bx=cx+w/2-h*.52,r=h*.346*bs;g.fillStyle=rgb(A);g.beginPath();g.arc(bx,y,r,0,TAU);g.fill();g.strokeStyle=rgb(fg);g.lineWidth=5*bs;g.lineJoin='round';g.lineCap='round';g.beginPath();g.moveTo(bx,y+r*.42);g.lineTo(bx,y-r*.42);g.moveTo(bx-r*.36,y-r*.08);g.lineTo(bx,y-r*.44);g.lineTo(bx+r*.36,y-r*.08);g.stroke();
  const rp=P(v,hit,.5);if(rp>0&&rp<1){const e=60*eo(rp);g.strokeStyle=rgb(PAL.accentHi,(1-rp)*.8);g.lineWidth=4*(1-rp)+1;g.beginPath();g.roundRect(cx-w/2-e,y-h/2-e,w+2*e,h+2*e,h/2+e);g.stroke()}g.restore()};
/* crt: "TV switching off" — a dot pops, stretches into a line, vanishes. u seconds (uses ~0.55s). */
FX.crt=(g,u,o={})=>{if(u<0||u>.56)return;const cx=o.cx??CX,cy=o.cy??CY,a=spr(P(u,0,.2),6,9),w=u<.28?18*a:lp(18,W*.78,ex(P(u,.28,.12)))*(1-ei(P(u,.38,.16))),h=u<.28?18*a:lp(18,3,P(u,.28,.07));g.fillStyle=o.col||'#FFD9C8';g.beginPath();g.roundRect(cx-w/2,cy-h/2,w,h,h/2);g.fill()};
/* checklist: rows sliding in from alternating sides with drawn check marks. rows:[[big,small],...] */
FX.checklist=(g,u,rows,o={})=>{const x0=o.x??W*.17,y0=o.y??H*.23,rh=o.rowH||190,sz=o.size||150,fg=o.fg||PAL.paper,A=o.accent||PAL.accent,wd=o.w||W*.66;rows.forEach((r,k)=>{const e=ex(P(u-k*.07,0,.35)),y=y0+k*rh,dx=(1-e)*(k%2?-1300:1300);T(g,String(k+1).padStart(2,'0'),`400 30px ${FONT.mono}`,x0+dx,y+10,A,1,'left');T(g,r[0],`900 ${sz}px ${FONT.serif}`,x0+100+dx,y+52,fg,1,'left');if(r[1])T(g,r[1],`400 26px ${FONT.mono}`,x0+130+[...r[0]].length*sz+dx,y+10,PAL.mute,1,'left');
    g.fillStyle=rgb(fg,.25);g.fillRect(x0+dx,y+92,wd,2);const c=eo(P(u-k*.07,.2,.2));if(c>0){g.strokeStyle=rgb(A);g.lineWidth=14;g.lineCap='round';g.lineJoin='round';g.beginPath();const X=x0+wd-120,Y=y+2,a=Math.min(1,c*2.5),b=Math.max(0,(c-.4)/.6);g.moveTo(X,Y);g.lineTo(X+32*a,Y+32*a);if(b>0)g.lineTo(X+32+66*b,Y+32-76*b);g.stroke()}})};
/* strobe: one full-bleed typographic flash card. u local seconds, k index. */
FX.strobe=(g,u,k,o)=>{const e=ex(P(u,0,.2)),BG=o.bg,FG=o.fg,sz=o.size||H*.52;fillAll(g,BG);g.save();g.translate(CX,CY);g.rotate((k%2?1:-1)*.04*(1-e));g.translate(-CX,-CY);
  if(o.num)TS(g,o.num,`900 ${H*.94}px ${FONT.serif}`,CX+(k%2?1:-1)*(W*.17+(1-e)*200),H*.83,FG,4,.24);cjk(g,o.text,sz,CX,H*.472,FG,j=>({s:1.28-.28*e}));
  g.fillStyle=rgb(FG);const bw=(W+400)*e;g.fillRect(k%2?W+200-bw:-200,H*.139,bw,10);g.fillRect(k%2?-200:W+200-bw,H*.838,bw,10);if(o.sub)tracked(g,o.sub,`400 30px ${FONT.mono}`,CX,H*.806,26,FG,1);
  const n=o.total||0;for(let j=0;j<n;j++){g.fillStyle=rgb(FG);g.strokeStyle=rgb(FG);g.lineWidth=3;const x=CX-n*26+j*52;if(j<=k)g.fillRect(x,92,32,32);else g.strokeRect(x+1.5,93.5,29,29)}g.restore()};

// ======================= master: camera, HUD, motion blur, post =======================
const K={FX,conf:KC};
K.start=function(cfg){const SH=cfg.shots.map(s=>Array.isArray(s)?{a:s[0],b:s[1],draw:s[2],...(s[3]||{})}:s),HITS=cfg.hits||[],DUR=cfg.duration||SH[SH.length-1].b,hud=Object.assign({show:false,title:'',fadeOut:.9},cfg.hud||{}),fade=Object.assign({in:.12,out:.15},cfg.fade||{});
  const env=(t,k)=>{let v=0;for(const[t0,s]of HITS){const u=t-t0;if(u>=0&&u<1.2)v+=s*Math.exp(-k*u)}return v};K.env=env;
  const out=document.getElementById('out')||document.body.appendChild(Object.assign(mk(W,H),{id:'out'}));out.width=W;out.height=H;
  const octx=out.getContext('2d',{alpha:false}),sub=mk(W,H),g0=sub.getContext('2d',{alpha:false}),ACC=mk(W,H),actx=ACC.getContext('2d',{alpha:false});
  const VIG=mk(W,H);{const c=VIG.getContext('2d'),D=Math.hypot(W,H)/2,gr=c.createRadialGradient(CX,CY,D*.45,CX,CY,D*1.05);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,`rgba(0,0,0,${KC.vignette})`);c.fillStyle=gr;c.fillRect(0,0,W,H)}
  function drawHud(g,t,c1,c2,label){const a=.8*P(t,.1,.3)*(1-P(t,DUR-hud.fadeOut,.2));if(a<=0||!hud.show)return;const m=48,pw=Math.min(800,W*.42),px=CX-pw/2,N=Math.round(DUR);g.save();g.lineWidth=2;
    [[m,m,1,1,c1],[W-m,m,-1,1,c1],[m,H-m,1,-1,c2],[W-m,H-m,-1,-1,c2]].forEach(([x,y,sx,sy,c])=>{g.strokeStyle=rgb(c,a);g.beginPath();g.moveTo(x+sx*26,y);g.lineTo(x,y);g.lineTo(x,y+sy*26);g.stroke()});
    g.font=`400 18px ${FONT.mono}`;g.fillStyle=rgb(c1,a);g.textAlign='left';g.fillText(hud.title,m+44,m+24);g.textAlign='right';const f=Math.floor(t*KC.FPS+.001);g.fillText('00:'+String(Math.floor(f/KC.FPS)).padStart(2,'0')+':'+String(f%KC.FPS).padStart(2,'0'),W-m-44,m+24);
    g.fillStyle=rgb(c2,a);g.textAlign='left';g.fillText(label||'',m+44,H-m-10);g.textAlign='right';g.fillText(String(Math.min(N,Math.floor(t)+1)).padStart(2,'0')+' / '+String(N).padStart(2,'0'),W-m-44,H-m-10);
    if(W>=1200){g.fillStyle=rgb(c2,a*.35);g.fillRect(px,H-66,pw,2);g.fillStyle=rgb(c2,a);g.fillRect(px,H-66,pw*t/DUR,2);for(let k=0;k<=N;k++)g.fillRect(px+k*pw/N-1,H-74,2,k%4?6:14)}g.restore()}
  function frame(g,t,sh){g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.shadowColor='transparent';g.setLineDash([]);g.fillStyle='#000';g.fillRect(0,0,W,H);
    let z=1+KC.punch*env(t,7),sx=0,sy=0;for(const[t0,s,k]of HITS){const u=t-t0;if(k&&u>=0&&u<1){const d=Math.exp(-8*u);sx+=k*d*Math.sin(u*64+t0);sy+=k*d*Math.cos(u*57+t0*2)}}
    g.setTransform(z,0,0,z,CX*(1-z)+sx,CY*(1-z)+sy);g.save();sh.draw(g,t,t-sh.a);g.restore();g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.shadowColor='transparent';g.setLineDash([]);
    let hc=typeof sh.hud==='function'?sh.hud(t):sh.hud;if(hc!==false){hc=hc||[PAL.paper,PAL.paper];if(!Array.isArray(hc[0]))hc=[hc,hc];drawHud(g,t,hc[0],hc[1],typeof sh.label==='function'?sh.label(t):sh.label)}}
  const bw=Math.round(W/4),bh=Math.round(H/4),b1=mk(bw,bh),b2=mk(bw,bh),b3=mk(bw,bh),CR=mk(W,H),CG=mk(W,H),CB=mk(W,H);
  const chan=(cv,col)=>{const c=cv.getContext('2d');c.globalCompositeOperation='copy';c.drawImage(ACC,0,0);c.globalCompositeOperation='multiply';c.fillStyle=col;c.fillRect(0,0,W,H)};
  window.renderAt=function(t){const sh=SH.find(s=>t>=s.a&&t<s.b)||SH[SH.length-1],NS=window.__SAMPLES||(typeof sh.samples==='function'?sh.samples(t):sh.samples)||KC.SAMPLES;
    for(let k=0;k<NS;k++){const ts=cl(t+((k+.5)/NS-.5)*KC.SHUTTER/KC.FPS,sh.a,sh.b-1e-4);frame(g0,ts,sh);actx.globalAlpha=1/(k+1);actx.drawImage(sub,0,0)}actx.globalAlpha=1;
    const bl=(typeof sh.bloom==='function'?sh.bloom(t):sh.bloom)??.5,b=bl*.72+.22*env(t,10);if(b>.01){let c=b1.getContext('2d');c.drawImage(ACC,0,0,bw,bh);c=b2.getContext('2d');c.globalCompositeOperation='source-over';c.drawImage(b1,0,0);c.globalCompositeOperation='multiply';c.drawImage(b1,0,0);
      c=b3.getContext('2d');c.filter='blur(8px)';c.drawImage(b2,0,0);actx.globalCompositeOperation='screen';actx.globalAlpha=cl(b);actx.drawImage(b3,0,0,W,H);actx.globalAlpha=cl(b*.16);actx.drawImage(b3,-W*.6,H*.3,W*2.2,H*.4);actx.globalCompositeOperation='source-over';actx.globalAlpha=1}
    const k=(KC.caBase+KC.caHit*env(t,9))/960;octx.globalCompositeOperation='source-over';octx.globalAlpha=1;
    if(k>0){chan(CR,'#f00');chan(CG,'#0f0');chan(CB,'#00f');octx.fillStyle='#000';octx.fillRect(0,0,W,H);octx.globalCompositeOperation='lighter';octx.drawImage(CR,-W*k,-H*k,W*(1+2*k),H*(1+2*k));octx.drawImage(CG,-W*k/2,-H*k/2,W*(1+k),H*(1+k));octx.drawImage(CB,0,0)}else octx.drawImage(ACC,0,0);
    const fl=KC.flash*env(t,24);if(fl>.004){octx.globalCompositeOperation='lighter';octx.fillStyle=rgb([255,236,224],cl(fl));octx.fillRect(0,0,W,H)}
    octx.globalCompositeOperation='source-over';octx.globalAlpha=bl<.2?.4:1;octx.drawImage(VIG,0,0);octx.globalAlpha=1;const f=Math.max(fade.in?1-eo(P(t,0,fade.in)):0,fade.out?P(t,DUR-fade.out-.05,fade.out):0);if(f>0){octx.fillStyle=`rgba(0,0,0,${f})`;octx.fillRect(0,0,W,H)}};
  window.KINFO={W,H,FPS:KC.FPS,duration:DUR,shots:SH.map(s=>[s.a,s.b,typeof s.label==='string'?s.label:'']),hits:HITS.map(h=>[h[0],h[1]])};
  const fonts=cfg.fonts||[`900 40px ${FONT.serif}`,`700 40px ${FONT.serif}`,`400 40px ${FONT.sans}`,`400 20px ${FONT.mono}`];
  window.ready=Promise.all(fonts.map(f=>document.fonts.load(f,'你好Aa'))).then(()=>{window.renderAt(0);return window.KINFO})};
