#!/usr/bin/env python3
"""Render + encode + check a kinetic-cut-video project.

  python3 build.py PROJECT stills [t ...]     quick contact sheet (default: 2 moments per shot)
  python3 build.py PROJECT preview            fast low-fps draft (12 fps, no motion blur) -> preview.mp4 + QA report
  python3 build.py PROJECT render             render all frames in parallel (resumable), encode, QA report
  python3 build.py PROJECT encode             (re)encode from existing frames + audio.wav, QA report
  python3 build.py PROJECT qa [VIDEO]         QA report only (default VIDEO: out.mp4, else preview.mp4)

Options: --workers N  --max-mb 28  --grain 2  --range A B (frames)  --out NAME.mp4  --force  --preview-fps 12
Long renders: run in the background and poll the log, e.g.
  nohup python3 build.py PROJECT render > PROJECT/build.log 2>&1 &

The QA report measures things you cannot judge from a few stills or cannot hear:
rhythm (shot-length variety), dead air (longest near-static stretch per shot), value/colour rhythm
(brightness and hue spread across shots) and audio sync (a transient at every cut / hit).
"""
import argparse, json, math, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); RENDER = os.path.join(HERE, 'render.mjs')
def sh(cmd, **kw): return subprocess.run(cmd, check=True, **kw)
def info(proj): return json.loads(subprocess.check_output(['node', RENDER, proj, 'info']).decode().strip().splitlines()[-1])
def sheet(pattern_args, out, cols, n, w=640):
    rows = max(1, math.ceil(n / cols))
    sh(['ffmpeg', '-y', '-loglevel', 'error', *pattern_args, '-vf', f'scale={w}:-1,tile={cols}x{rows}:padding=6', '-frames:v', '1', out])

def render_frames(P, f0, f1, workers, extra):
    n = max(1, min(workers, f1 - f0)); step = math.ceil((f1 - f0) / n); t0 = time.time(); procs = []
    for k in range(n):
        s, e = f0 + k * step, min(f1, f0 + (k + 1) * step)
        if s < e: procs.append(subprocess.Popen(['node', RENDER, P, 'frames', str(s), str(e)] + extra))
    if any(p.wait() for p in procs): sys.exit('render worker failed')
    print(f'rendered {f1 - f0} frames in {time.time() - t0:.0f}s')

def make_audio(P):
    wav = P + '/audio.wav'
    if os.path.exists(P + '/audio.py') and (not os.path.exists(wav) or os.path.getmtime(wav) < os.path.getmtime(P + '/audio.py')):
        sh([sys.executable, '-c', 'import sys, runpy; sys.path.insert(0, sys.argv[1]); runpy.run_path("audio.py", run_name="__main__")', HERE], cwd=P)
    return wav if os.path.exists(wav) else None

def qa(P, I, video):
    """Objective checks on the encoded video. Prints a report and writes qa_report.txt."""
    import numpy as np
    shots = [(s[0], s[1], s[2]) for s in I['shots']]; hits = [h[0] for h in I.get('hits', [])]; dur = I['duration']
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', video, '-vf', 'fps=30,scale=96:54', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], capture_output=True).stdout
    v = np.frombuffer(raw, np.uint8).reshape(-1, 54, 96, 3).astype(np.float32) / 255; nf = len(v)
    luma = v @ np.array([.2126, .7152, .0722], np.float32)
    motion = np.concatenate([[0], np.abs(np.diff(luma, axis=0)).mean(axis=(1, 2)) * 255])
    L, warn = [], []
    L.append(f'QA report — {os.path.basename(video)}  ({nf / 30:.1f}s analysed)')
    # 1. rhythm
    lens = [round(b - a, 2) for a, b, _ in shots]; uniq = len(set(round(x * 4) / 4 for x in lens))
    L.append(f'\n[rhythm] {len(shots)} shots, lengths (s): {lens}')
    if len(shots) >= 4 and uniq <= max(1, len(shots) // 4):
        warn.append(f'shot lengths are nearly uniform ({uniq} distinct values) — vary them (1/2/4/8 beats) to build a rhythm curve: build-up, breath, climax')
    # 2. dead air + 3. value / colour per shot
    L.append('\n[per shot]  luma  hue/sat  longest near-static (s)')
    lum, hues = [], []
    for a, b, lab in shots:
        i0, i1 = int(a * 30), min(nf, int(b * 30))
        if i1 - i0 < 3: continue
        m = motion[i0 + 2:i1]; still = m < .35; run = best = 0
        for s in still: run = run + 1 if s else 0; best = max(best, run)
        seg = v[i0:i1].reshape(-1, 3); mx, mn = seg.max(1), seg.min(1); sat = float(((mx - mn) / (mx + 1e-6)).mean())
        r, g, bb = seg[:, 0].mean(), seg[:, 1].mean(), seg[:, 2].mean(); hue = (math.degrees(math.atan2(math.sqrt(3) * (g - bb), 2 * r - g - bb)) + 360) % 360
        lm = float(luma[i0:i1].mean()); lum.append(lm); hues.append(hue)
        L.append(f'  {lab or f"{a:.2f}s":<16} {lm:.2f}  {hue:5.0f}°/{sat:.2f}  {best / 30:.2f}')
        if best / 30 > .6: warn.append(f'shot {lab or a}: {best / 30:.1f}s with almost no motion — add a secondary motion layer or a second event after the main action')
    if len(lum) >= 3 and max(lum) - min(lum) < .2:
        warn.append(f'brightness barely changes across shots ({min(lum):.2f}–{max(lum):.2f}) — plan a value rhythm: at least one bright / inverted / colour-flooded shot, and let the climax break the visual system')
    if len(hues) >= 4:
        hs = np.radians(hues); spread = 1 - math.hypot(np.cos(hs).mean(), np.sin(hs).mean())
        if spread < .05: warn.append('every shot sits on the same hue — introduce the accent / a contrasting colour as a full-frame moment somewhere')
    # 4. audio sync
    a = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', video, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], capture_output=True).stdout
    if a:
        x = np.frombuffer(a, np.int16).astype(np.float32) / 32768; hop = 80; n = len(x) // hop
        e = np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1)); on = np.maximum(0, np.diff(e, prepend=0)); med = np.median(on[on > 0]) + 1e-9
        cuts = sorted(set([round(s[0], 3) for s in shots[1:]] + [round(h[0], 3) for h in I.get('hits', []) if h[0] > 0 and h[1] >= .8]))
        weak = [c for c in cuts if c < dur - .05 and on[max(0, int(c * 100) - 4):int(c * 100) + 5].max() / med < 4]
        L.append(f'\n[audio] transients checked at {len(cuts)} cuts/hits; weak: {weak or "none"}')
        if weak: warn.append(f'no clear sound at {weak} — put a hit, drum or timbre change on every cut')
    else:
        L.append('\n[audio] no audio track'); warn.append('video is silent')
    L.append('\n[warnings]' + ('' if warn else ' none'))
    L += [f'  - {w}' for w in warn]
    L.append('\nNot measured — check by eye: whether every shot comes from the subject\'s motifs, composition and text-entrance variety, readability.')
    txt = '\n'.join(L); print(txt); open(P + '/qa_report.txt', 'w').write(txt + '\n')

def encode(P, frames_dir, fps, f0, f1, out, kbps, grain, wav):
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-start_number', str(f0), '-i', f'{P}/{frames_dir}/%05d.png']
    if wav: cmd += ['-ss', f'{f0 / fps:.4f}', '-i', wav]
    cmd += ['-frames:v', str(f1 - f0), '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p' + (f',noise=alls={grain}:allf=t' if grain else ''),
            '-c:v', 'libx264', '-preset', 'slow', '-b:v', f'{kbps}k', '-maxrate', f'{int(kbps * 1.7)}k', '-bufsize', f'{kbps * 3}k', '-g', str(fps), '-pix_fmt', 'yuv420p',
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
    if wav: cmd += ['-c:a', 'aac', '-b:a', '256k', '-shortest']
    sh(cmd + ['-movflags', '+faststart', out])

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('project'); ap.add_argument('mode', choices=['stills', 'preview', 'render', 'encode', 'qa']); ap.add_argument('times', nargs='*')
    ap.add_argument('--workers', type=int, default=max(1, os.cpu_count() or 1)); ap.add_argument('--max-mb', type=float, default=28.0); ap.add_argument('--grain', type=int, default=2)
    ap.add_argument('--range', nargs=2, type=int); ap.add_argument('--out', default='out.mp4'); ap.add_argument('--force', action='store_true'); ap.add_argument('--preview-fps', type=int, default=12)
    a = ap.parse_args(); P = os.path.abspath(a.project); I = info(P); fps, dur = I['FPS'], I['duration']; total = int(round(dur * fps))
    if a.mode == 'stills':
        ts = [float(x) for x in a.times] or [round(x, 3) for s in I['shots'] for x in ((s[0] + min(.1, (s[1] - s[0]) * .25)), (s[0] + (s[1] - s[0]) * .7))]
        for f in os.listdir(P + '/stills') if os.path.isdir(P + '/stills') else []: os.remove(os.path.join(P, 'stills', f))
        sh(['node', RENDER, P, 'stills', *map(str, ts)]); sheet(['-pattern_type', 'glob', '-i', P + '/stills/*.png'], P + '/stills_sheet.jpg', 4, len(ts))
        print('times:', ts); print('sheet:', P + '/stills_sheet.jpg'); return
    if a.mode == 'qa':
        video = os.path.join(P, a.times[0]) if a.times else next((os.path.join(P, f) for f in ('out.mp4', 'preview.mp4') if os.path.exists(os.path.join(P, f))), None)
        if not video: sys.exit('no video to check; run preview or render first')
        return qa(P, I, video)
    if a.mode == 'preview':
        pf = a.preview_fps; n = int(round(dur * pf))
        if a.force and os.path.isdir(P + '/preview'):
            for f in os.listdir(P + '/preview'): os.remove(os.path.join(P, 'preview', f))
        render_frames(P, 0, n, a.workers, ['--fps', str(pf), '--samples', '1', '--dir', 'preview'])
        out = P + '/preview.mp4'; encode(P, 'preview', pf, 0, n, out, 4000, 0, make_audio(P))
        print(f'preview: {out}  (draft: {pf} fps, no motion blur — judge rhythm, layout and colour, not smoothness)'); return qa(P, I, out)
    f0, f1 = a.range or (0, total)
    if a.mode == 'render': render_frames(P, f0, f1, a.workers, ['--force'] if a.force else [])
    missing = [f for f in range(f0, f1) if not os.path.exists(f'{P}/frames/{f:05d}.png')]
    if missing: sys.exit(f'{len(missing)} frames missing (first {missing[0]}); run render first')
    wav = make_audio(P); secs = (f1 - f0) / fps; kbps = int(min(16000, max(1500, (a.max_mb * 8 * 1024 * .94) / secs - 256)))
    out = os.path.join(P, a.out); encode(P, 'frames', fps, f0, f1, out, kbps, a.grain, wav)
    n = int(math.ceil(secs * 2)); sh(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-vf', f'fps=2,scale=384:-1,tile=8x{max(1, math.ceil(n / 8))}:padding=3', '-frames:v', '1', P + '/qa_sheet.jpg'])
    print(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,width,height,r_frame_rate,nb_frames', '-of', 'default=nw=1', out]).decode())
    print(f'video: {out}  ({os.path.getsize(out) / 1048576:.1f} MB, {kbps} kbps)\nqa sheet: {P}/qa_sheet.jpg' + ('' if wav else '\nNOTE: no audio.wav — silent video'))
    if not a.range: qa(P, I, out)
if __name__ == '__main__': main()
