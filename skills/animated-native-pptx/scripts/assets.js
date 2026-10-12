// node assets.js  — reads theme.json, writes assets/<bg>.jpg and assets/<icon>_<color>.png
const {chromium}=require('playwright');const fs=require('fs');
const TH=JSON.parse(fs.readFileSync('theme.json','utf8'));
const P=Object.assign({
window:'M20 16h80v88H20z M60 16v88 M20 60h80',spray:'M44 50h32v54H44z M52 50V34h20v16 M72 38h18 M98 28l8-4 M98 38h10 M98 48l8 4',
eye:'M10 60C30 28 90 28 110 60C90 92 30 92 10 60z M60 44a16 16 0 1 0 .1 0z',clip:'M26 22h68v84H26z M46 14h28v16H46z M42 54l10 10 22-22 M42 86h36',
thermo:'M52 16a8 8 0 0 1 16 0v52a20 20 0 1 1-16 0z M60 44v36',ask:'M16 20h88v60H56L36 100V80H16z M50 40a10 10 0 1 1 14 9c-3 2-4 4-4 8 M60 68v1',
bag:'M22 44h76v60H22z M42 44V30a18 18 0 0 1 36 0v14 M50 70h20',bowl:'M14 58h92a46 46 0 0 1-92 0z M44 44c-6-8 6-12 0-22 M64 44c-6-8 6-12 0-22 M84 44c-6-8 6-12 0-22',
drop:'M60 12C84 44 92 58 92 74a32 32 0 0 1-64 0c0-16 8-30 32-62z M46 78a14 14 0 0 0 14 14',smile:'M60 12a48 48 0 1 0 .1 0z M40 68c8 14 32 14 40 0 M44 46v4 M76 46v4',
moon:'M78 14a48 48 0 1 0 28 62A40 40 0 0 1 78 14z',bed:'M12 100V40 M12 76h96v24 M108 76V62a10 10 0 0 0-10-10H48v24 M24 62a8 8 0 1 0 16 0a8 8 0 1 0-16 0',
sun:'M60 38a22 22 0 1 0 .1 0z M60 10v12 M60 98v12 M10 60h12 M98 60h12 M25 25l8 8 M87 87l8 8 M95 25l-8 8 M25 95l8-8',alert:'M60 14l50 88H10z M60 46v28 M60 88v1',
phone:'M30 10h44v100H30z M46 96h12 M88 40c9 10 9 30 0 40 M100 30c14 16 14 44 0 60',shield:'M60 10l40 14v30c0 28-18 46-40 56C38 100 20 82 20 54V24z M60 40v36 M42 58h36',
home:'M14 58L60 16l46 42 M26 50v52h68V50 M50 102V74h20v28',heart:'M60 100C20 72 12 50 22 34c10-16 32-12 38 4 6-16 28-20 38-4 10 16 2 38-38 66z',
people:'M38 20a14 14 0 1 0 .1 0z M14 100c0-30 48-30 48 0 M84 40a11 11 0 1 0 .1 0z M66 100c0-24 38-24 38 0',spark:'M60 14l10 36 36 10-36 10-10 36-10-36-36-10 36-10z',
chat:'M16 20h88v60H56L36 100V80H16z M36 42h48 M36 60h30',check:'M26 62l22 22 46-50',
chart:'M16 104h92 M28 104V64 M52 104V40 M76 104V56 M100 104V24',target:'M60 12a48 48 0 1 0 .1 0z M60 34a26 26 0 1 0 .1 0z M60 54a6 6 0 1 0 .1 0z',
gear:'M60 40a20 20 0 1 0 .1 0z M60 10v14 M60 96v14 M10 60h14 M96 60h14 M25 25l10 10 M85 85l10 10 M95 25l-10 10 M25 95l10-10',
book:'M60 26C46 16 28 16 14 22v72c14-6 32-6 46 4 14-10 32-10 46-4V22c-14-6-32-6-46 4z M60 26v72',bulb:'M44 84h32 M48 100h24 M60 12a30 30 0 0 0-18 54c4 4 6 8 6 18h24c0-10 2-14 6-18A30 30 0 0 0 60 12z',
flag:'M24 108V14 M24 18h66l-14 22 14 22H24',rocket:'M60 10c20 14 26 40 20 66H40c-6-26 0-52 20-66z M40 76l-14 18h20 M80 76l14 18H74 M60 40a8 8 0 1 0 .1 0z M52 94v14 M68 94v14',
clock:'M60 12a48 48 0 1 0 .1 0z M60 32v30l20 12',pin:'M60 108C36 78 26 62 26 46a34 34 0 0 1 68 0c0 16-10 32-34 62z M60 34a12 12 0 1 0 .1 0z'},TH.icons||{});
(async()=>{fs.mkdirSync('assets',{recursive:true});const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
for(const [n,g] of Object.entries(TH.bg)){
 const deco=(g.glows||[]).map(([x,y,s,c])=>`<div style="position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle,${c},transparent 68%)"></div>`).join('');
 await p.setContent(`<body style="margin:0;width:1920px;height:1080px;position:relative;overflow:hidden;background:${g.css}">${deco}${g.html||''}</body>`);
 await p.screenshot({path:`assets/${n}.jpg`,type:'jpeg',quality:92});}
await p.setViewportSize({width:240,height:240});
for(const [n,d] of Object.entries(P))for(const [cn,c] of Object.entries(TH.icon_colors)){
 await p.setContent(`<body style="margin:0;background:transparent"><svg width="240" height="240" viewBox="0 0 120 120"><path d="${d}" fill="none" stroke="${c}" stroke-width="${n==='check'?12:7}" stroke-linecap="round" stroke-linejoin="round"/></svg></body>`);
 await p.screenshot({path:`assets/${n}_${cn}.png`,omitBackground:true});}
await b.close()})();
