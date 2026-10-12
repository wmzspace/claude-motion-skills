#!/usr/bin/env python3
"""Render + encode a kinetic-cut-video project.

  python3 build.py PROJECT stills [t ...]     quick contact sheet (default: 2 moments per shot)
  python3 build.py PROJECT render             render all frames in parallel (resumable), then encode
  python3 build.py PROJECT encode             (re)encode from existing frames + audio.wav

Options: --workers N  --max-mb 28  --grain 2  --range A B (frames)  --out NAME.mp4  --force
Long renders: run in the background and poll the log, e.g.
  nohup python3 build.py PROJECT render > PROJECT/build.log 2>&1 &
"""
import argparse, json, math, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); RENDER = os.path.join(HERE, 'render.mjs')
def sh(cmd, **kw): return subprocess.run(cmd, check=True, **kw)
def info(proj): return json.loads(subprocess.check_output(['node', RENDER, proj, 'info']).decode().strip().splitlines()[-1])
def sheet(pattern_args, out, cols, n, w=640):
    rows = max(1, math.ceil(n / cols))
    sh(['ffmpeg', '-y', '-loglevel', 'error', *pattern_args, '-vf', f'scale={w}:-1,tile={cols}x{rows}:padding=6', '-frames:v', '1', out])
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('project'); ap.add_argument('mode', choices=['stills', 'render', 'encode']); ap.add_argument('times', nargs='*', type=float)
    ap.add_argument('--workers', type=int, default=max(1, os.cpu_count() or 1)); ap.add_argument('--max-mb', type=float, default=28.0); ap.add_argument('--grain', type=int, default=2)
    ap.add_argument('--range', nargs=2, type=int); ap.add_argument('--out', default='out.mp4'); ap.add_argument('--force', action='store_true')
    a = ap.parse_args(); P = os.path.abspath(a.project); I = info(P); fps, dur = I['FPS'], I['duration']; total = int(round(dur * fps))
    if a.mode == 'stills':
        ts = a.times or [round(x, 3) for s in I['shots'] for x in ((s[0] + min(.1, (s[1] - s[0]) * .25)), (s[0] + (s[1] - s[0]) * .7))]
        for f in os.listdir(P + '/stills') if os.path.isdir(P + '/stills') else []: os.remove(os.path.join(P, 'stills', f))
        sh(['node', RENDER, P, 'stills', *map(str, ts)]); sheet(['-pattern_type', 'glob', '-i', P + '/stills/*.png'], P + '/stills_sheet.jpg', 4, len(ts))
        print('times:', ts); print('sheet:', P + '/stills_sheet.jpg'); return
    f0, f1 = a.range or (0, total)
    if a.mode == 'render':
        n = max(1, min(a.workers, f1 - f0)); step = math.ceil((f1 - f0) / n); t0 = time.time(); procs = []
        for k in range(n):
            s, e = f0 + k * step, min(f1, f0 + (k + 1) * step)
            if s < e: procs.append(subprocess.Popen(['node', RENDER, P, 'frames', str(s), str(e)] + (['--force'] if a.force else [])))
        if any(p.wait() for p in procs): sys.exit('render worker failed')
        print(f'rendered {f1 - f0} frames in {time.time() - t0:.0f}s')
    missing = [f for f in range(f0, f1) if not os.path.exists(f'{P}/frames/{f:05d}.png')]
    if missing: sys.exit(f'{len(missing)} frames missing (first {missing[0]}); run render first')
    wav = P + '/audio.wav'
    if os.path.exists(P + '/audio.py') and (not os.path.exists(wav) or os.path.getmtime(wav) < os.path.getmtime(P + '/audio.py')):
        sh([sys.executable, '-c', 'import sys, runpy; sys.path.insert(0, sys.argv[1]); runpy.run_path("audio.py", run_name="__main__")', HERE], cwd=P)
    secs = (f1 - f0) / fps; kbps = int(min(16000, max(1500, (a.max_mb * 8 * 1024 * .94) / secs - 256)))
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-start_number', str(f0), '-i', P + '/frames/%05d.png']
    if os.path.exists(wav): cmd += ['-ss', f'{f0 / fps:.4f}', '-i', wav]
    cmd += ['-frames:v', str(f1 - f0), '-vf', f'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p' + (f',noise=alls={a.grain}:allf=t' if a.grain else ''),
            '-c:v', 'libx264', '-preset', 'slow', '-b:v', f'{kbps}k', '-maxrate', f'{int(kbps * 1.7)}k', '-bufsize', f'{kbps * 3}k', '-g', str(fps), '-pix_fmt', 'yuv420p',
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
    if os.path.exists(wav): cmd += ['-c:a', 'aac', '-b:a', '256k', '-shortest']
    out = os.path.join(P, a.out); sh(cmd + ['-movflags', '+faststart', out])
    n = int(math.ceil(secs * 2)); sh(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-vf', f'fps=2,scale=384:-1,tile=8x{max(1, math.ceil(n / 8))}:padding=3', '-frames:v', '1', P + '/qa_sheet.jpg'])
    print(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,width,height,r_frame_rate,nb_frames', '-of', 'default=nw=1', out]).decode())
    print(f'video: {out}  ({os.path.getsize(out) / 1048576:.1f} MB, {kbps} kbps)\nqa sheet: {P}/qa_sheet.jpg' + ('' if os.path.exists(wav) else '\nNOTE: no audio.wav — silent video'))
if __name__ == '__main__': main()
