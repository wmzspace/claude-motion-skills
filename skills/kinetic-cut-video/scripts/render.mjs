// node render.mjs <projectDir> info
// node render.mjs <projectDir> stills <t1> <t2> ...     -> <projectDir>/stills/NN.png
// node render.mjs <projectDir> frames <start> <end>     -> <projectDir>/frames/00000.png (skips existing; add --force to redo)
import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs'; import path from 'path';
function loadPlaywright() {
  const bases = [process.cwd() + '/'];
  try { bases.push(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/'); } catch {}
  for (const b of bases) { try { return createRequire(b)('playwright'); } catch {} }
  throw new Error('playwright not found: npm i -g playwright (do NOT run "playwright install" if a browser is preinstalled)');
}
const { chromium } = loadPlaywright();
const [dirArg, mode, ...rest] = process.argv.slice(2);
if (!dirArg || !mode) { console.error('usage: render.mjs <projectDir> info|stills|frames ...'); process.exit(2); }
const DIR = path.resolve(dirArg), force = rest.includes('--force'), args = rest.filter(a => a !== '--force');
const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--force-color-profile=srgb', '--disable-lcd-text'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
let failed = false;
page.on('pageerror', e => { failed = true; console.error('PAGEERROR', e.message); });
await page.goto('file://' + DIR + '/index.html');
const info = await page.evaluate(() => window.ready);
if (failed || !info) { console.error('page failed to initialise'); await browser.close(); process.exit(1); }
await page.setViewportSize({ width: info.W, height: info.H });
if (mode === 'info') console.log(JSON.stringify(info));
else if (mode === 'stills') {
  fs.mkdirSync(DIR + '/stills', { recursive: true }); const t0 = Date.now(), ts = args.map(Number);
  for (let i = 0; i < ts.length; i++) { await page.evaluate(t => renderAt(t), ts[i]); await page.screenshot({ path: `${DIR}/stills/${String(i).padStart(2, '0')}.png` }); }
  console.log('stills', ts.length, 'ms/frame', Math.round((Date.now() - t0) / Math.max(1, ts.length)));
} else if (mode === 'frames') {
  fs.mkdirSync(DIR + '/frames', { recursive: true }); const a = +args[0], b = +args[1];
  for (let f = a; f < b; f++) { const p = `${DIR}/frames/${String(f).padStart(5, '0')}.png`;
    if (!force && fs.existsSync(p)) continue;
    await page.evaluate(t => renderAt(t), f / info.FPS); await page.screenshot({ path: p + '.tmp.png' }); fs.renameSync(p + '.tmp.png', p);
    if (f % 60 === 0) console.log('frame', f); }
  console.log(failed ? 'FAILED' : 'DONE', a, b);
}
await browser.close(); process.exit(failed ? 1 : 0);
