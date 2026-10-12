"""Tiny numpy synth for beat-synced soundtracks. No samples, no external deps beyond numpy.

    from audio_lib import Mix, note
    m = Mix(duration=18, bpm=120)
    m.pad([note(-31), note(-12), note(-7), note(-3)], 0.5, 4)   # chord, start, end
    m.kick(2.0); m.snare(2.5); m.hat(2.25); m.bass(2.0, note(-31))
    m.bell(2.0, note(5)); m.boom(2.0); m.riser(4.0, 0.4); m.whoosh(2.5); m.tick(4.3)
    m.render('audio.wav')

All times are in seconds — copy them straight from the shot table so sound and picture stay locked.
note(s) = frequency s semitones from A4 (440 Hz).  D major from D5: 5 7 9 10 12 14 16 17.
chord('Dm9', octave=3) -> list of Hz;  scale('E', 'dorian', octave=4) -> 8 notes;  MODES lists the modes.

Timbres: pad (soft bed), bell (FM), pluck (Karplus-Strong string), lead (band-limited saw), sub (808-style),
kick / snare / clap / hat / tick, boom / riser / whoosh, vinyl (crackle + hiss).  Patterns: beat (with swing), arp, typing.
Pick a sound palette per video from the brief — don't default to pad + bell + kick every time.
"""
import numpy as np, wave, re
def note(s): return 440.0 * 2 ** (s / 12)
_PC = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
def _root(name, octave):
    s = _PC[name[0].upper()] + (1 if '#' in name[1:2] else -1 if 'b' in name[1:2] else 0)
    return s + 12 * (octave - 4)
_Q = {'': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], '9': [0, 4, 7, 10, 14], 'maj9': [0, 4, 7, 11, 14],
      'm9': [0, 3, 7, 10, 14], 'sus2': [0, 2, 7], 'sus4': [0, 5, 7], '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9], 'add9': [0, 4, 7, 14], 'dim': [0, 3, 6], 'aug': [0, 4, 8], '5': [0, 7, 12]}
def chord(name, octave=3, bass=True):
    """'Dm9' 'Gmaj7' 'F#m' 'Bbsus2' -> frequencies (with an extra bass note an octave below when bass=True)."""
    m = re.match(r'^([A-Ga-g][#b]?)(.*)$', name); root = _root(m.group(1), octave); iv = _Q[m.group(2)]
    return ([note(root - 12)] if bass else []) + [note(root + i) for i in iv]
MODES = {'major': [0, 2, 4, 5, 7, 9, 11], 'minor': [0, 2, 3, 5, 7, 8, 10], 'dorian': [0, 2, 3, 5, 7, 9, 10], 'phrygian': [0, 1, 3, 5, 7, 8, 10],
         'lydian': [0, 2, 4, 6, 7, 9, 11], 'mixolydian': [0, 2, 4, 5, 7, 9, 10], 'pentatonic': [0, 2, 4, 7, 9], 'minor_pent': [0, 3, 5, 7, 10], 'harmonic': [0, 2, 3, 5, 7, 8, 11]}
def scale(root, mode='major', octave=4, n=8):
    r = _root(root, octave); iv = MODES[mode]; return [note(r + iv[k % len(iv)] + 12 * (k // len(iv))) for k in range(n)]
class Mix:
    def __init__(self, duration, bpm=120, sr=48000, seed=4):
        self.T, self.bpm, self.sr = float(duration), bpm, sr; self.N = int(sr * self.T); self.t = np.arange(self.N) / sr
        self.rs = np.random.RandomState(seed); self.wet = np.zeros((2, self.N)); self.dry = np.zeros((2, self.N))
    def _add(self, buf, t0, sig_l, sig_r=None):
        i0 = int(round(t0 * self.sr))
        if i0 < 0: sig_l = sig_l[-i0:]; sig_r = None if sig_r is None else sig_r[-i0:]; i0 = 0
        n = min(len(sig_l), self.N - i0)
        if n <= 0: return
        buf[0, i0:i0 + n] += sig_l[:n]; buf[1, i0:i0 + n] += (sig_l if sig_r is None else sig_r)[:n]
    def _noise(self, n, centre, width=0.7):
        x = self.rs.randn(n); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / self.sr)
        X *= np.exp(-0.5 * ((np.log(f + 1) - np.log(centre)) / width) ** 2); x = np.fft.irfft(X, n); return x / (np.abs(x).max() + 1e-9)
    # ---- sustained ----
    def pad(self, freqs, t0, t1, amp=0.05):
        """Soft chord bed; first freq is treated as the bass note."""
        t = self.t; e = np.clip((t - (t0 - .6)) / 1.1, 0, 1) * np.clip(((t1 + .9) - t) / 1.5, 0, 1); e = e * e * (3 - 2 * e)
        for i, f in enumerate(freqs):
            a = amp * (1.6 if i == 0 else 1.0) / (1 + i * .12); trem = 1 + .12 * np.sin(2 * np.pi * (.13 + .05 * i) * t + i)
            for det, ch in ((-.35, 0), (.35, 1)):
                self.wet[ch] += a * e * trem * (np.sin(2 * np.pi * (f + det) * t + i * 1.3) + .22 * np.sin(4 * np.pi * (f + det) * t + i) + .06 * np.sin(6 * np.pi * f * t))
    # ---- drums / bass (dry) ----
    def kick(self, t0, amp=0.2):
        tt = np.arange(int(self.sr * .3)) / self.sr; ph = 2 * np.pi * np.cumsum(46 + 90 * np.exp(-tt * 38)) / self.sr
        self._add(self.dry, t0, amp * np.sin(ph) * np.exp(-tt * 13) * np.clip(tt / .003, 0, 1))
    def snare(self, t0, amp=0.05):
        n = int(self.sr * .16); tt = np.arange(n) / self.sr
        self._add(self.wet, t0, amp * self._noise(n, 2400, .6) * np.exp(-tt * 26) + amp * .6 * np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 40))
    def hat(self, t0, amp=0.02):
        n = int(self.sr * .05); tt = np.arange(n) / self.sr; x = np.diff(np.diff(self.rs.randn(n), prepend=0), prepend=0) * np.exp(-tt * 90) * amp
        self._add(self.dry, t0, x * .8, x * 1.1)
    def bass(self, t0, f, amp=0.1, dur=0.22):
        tt = np.arange(int(self.sr * dur)) / self.sr
        self._add(self.dry, t0, amp * (np.sin(2 * np.pi * f * tt) + .25 * np.sin(4 * np.pi * f * tt)) * np.clip(tt / .01, 0, 1) * np.clip((dur - tt) / .06, 0, 1))
    def clap(self, t0, amp=0.06):
        n = int(self.sr * .2); tt = np.arange(n) / self.sr; x = self._noise(n, 1500, .5); e = np.zeros(n)
        for d in (0, .011, .022): e += np.exp(-np.clip(tt - d, 0, None) * 120) * (tt >= d)
        self._add(self.wet, t0, amp * x * (e * .5 + np.exp(-tt * 18) * .5))
    def sub(self, t0, f, amp=0.25, dur=0.9):
        """808-style sub bass with a short pitch drop."""
        tt = np.arange(int(self.sr * dur)) / self.sr; ph = 2 * np.pi * np.cumsum(f * (1 + .6 * np.exp(-tt * 40))) / self.sr
        self._add(self.dry, t0, amp * np.tanh(1.6 * np.sin(ph)) * np.exp(-tt * 3.2 / dur) * np.clip(tt / .004, 0, 1))
    def tick(self, t0, amp=0.03):
        """Typing / UI click."""
        n = int(self.sr * .012); tt = np.arange(n) / self.sr; s = np.diff(amp * self.rs.randn(n) * np.exp(-tt * 500), prepend=0) * 1.5; p = self.rs.rand() * .6 + .2
        self._add(self.dry, t0, s * (1 - p) * 2, s * p * 2)
    # ---- melodic / fx (wet) ----
    def bell(self, t0, f, amp=0.12, dec=1.3, pan=0.0):
        tt = np.arange(int(self.sr * dec * 4)) / self.sr
        s = (np.sin(2 * np.pi * f * tt + 1.6 * np.exp(-tt * 7) * np.sin(4 * np.pi * f * tt)) * np.exp(-tt / dec * 3) + .3 * np.sin(4 * np.pi * f * tt) * np.exp(-tt / dec * 6)) * np.clip(tt / .004, 0, 1) * amp
        self._add(self.wet, t0, s * (.75 - .5 * pan), s * (.75 + .5 * pan))
    def pluck(self, t0, f, amp=0.12, dec=1.2, pan=0.0, bright=0.5):
        """Plucked string (Karplus-Strong): guitar/koto/harp-like."""
        n = int(self.sr * dec * 2); P = max(2, int(self.sr / f)); y = np.zeros(n); y[:P] = self.rs.uniform(-1, 1, P) * (1 - bright) + np.sign(self.rs.uniform(-1, 1, P)) * bright
        g = .5 * (.996 ** (1 / max(dec, .05)))
        for i in range(P, n, P):
            j = min(n, i + P); prev = y[i - P:j - P]; prev2 = np.concatenate([[y[i - P - 1] if i - P - 1 >= 0 else 0], prev[:-1]]); y[i:j] = g * 2 * .5 * (prev + prev2)
        y *= amp / (np.abs(y).max() + 1e-9); self._add(self.wet, t0, y * (.75 - .5 * pan), y * (.75 + .5 * pan))
    def lead(self, t0, f, dur=0.4, amp=0.06, cutoff=3000, pan=0.0, vib=0.0):
        """Band-limited saw lead (synthwave / chiptune-ish when cutoff is low)."""
        tt = np.arange(int(self.sr * dur)) / self.sr; fr = f * (1 + vib * np.sin(2 * np.pi * 5.5 * tt)); ph = 2 * np.pi * np.cumsum(fr) / self.sr
        s = sum(np.sin(k * ph) / k for k in range(1, max(2, int(cutoff / f)) + 1))
        e = np.clip(tt / .01, 0, 1) * np.clip((dur - tt) / .08, 0, 1) * (.7 + .3 * np.exp(-tt * 6)); s = amp * s * e
        self._add(self.wet, t0, s * (.75 - .5 * pan), s * (.75 + .5 * pan))
    def vinyl(self, t0, t1, amp=0.02):
        """Crackle + hiss bed (lo-fi / film texture)."""
        n = int(self.sr * (t1 - t0)); x = self._noise(n, 6000, 1.2) * .25
        idx = self.rs.randint(0, max(1, n), int((t1 - t0) * 14)); x[idx] += self.rs.uniform(-1, 1, len(idx)) * 3
        self._add(self.dry, t0, amp * x, amp * np.roll(x, 37))
    def boom(self, t0, amp=0.3):
        """Sub impact for a cut."""
        tt = np.arange(int(self.sr * 2.5)) / self.sr; ph = 2 * np.pi * np.cumsum(42 + 38 * np.exp(-tt * 9)) / self.sr
        self._add(self.dry, t0, amp * np.sin(ph) * np.exp(-tt * 2.2) * np.clip(tt / .01, 0, 1))
    def riser(self, t_end, dur=0.5, amp=0.12):
        """Noise swell that peaks exactly at t_end (put before section changes)."""
        n = int(self.sr * dur); e = np.linspace(0, 1, n) ** 3
        self._add(self.wet, t_end - dur, amp * e * self._noise(n, 1800, .8), amp * e * self._noise(n, 1800, .8))
    def whoosh(self, tc, dur=1.0, amp=0.1, lo=250, hi=3200):
        n = int(self.sr * dur); e = np.sin(np.pi * np.linspace(0, 1, n) ** .8) ** 2.2; c = np.sqrt(lo * hi)
        self._add(self.wet, tc - dur * .55, amp * e * self._noise(n, c), amp * e * self._noise(n, c))
    # ---- patterns ----
    def beat(self, t0, t1, root, kick=0.2, bass=0.1, hat=0.02, snare=0.05, sixteenths=True, swing=0.0, pattern='four', clap=False):
        """Drum pattern between t0 and t1 on this Mix's bpm grid.
        pattern: 'four' (kick every beat) | 'half' (kick on 1 & 3) | 'break' (syncopated kick) ; swing 0..0.6 delays the off-16ths."""
        b = 60.0 / self.bpm; k = 0; t = t0; sw = swing * b / 4
        while t < t1 - 1e-6:
            kk = {'four': True, 'half': k % 2 == 0, 'break': k % 4 in (0, 2) or (k % 4 == 3)}[pattern]
            if kick and kk: self.kick(t, kick)
            if kick and pattern == 'break' and k % 4 == 1: self.kick(t + b * .75 + sw, kick * .7)
            if bass: self.bass(t, root, bass); self.bass(t + b / 2, root, bass * .65, .16)
            if hat: self.hat(t + b / 2, hat)
            if hat and sixteenths: self.hat(t + b / 4 + sw, hat * .45); self.hat(t + 3 * b / 4 + sw, hat * .45)
            if snare and k % 2 == 1: (self.clap if clap else self.snare)(t, snare * (1.2 if clap else 1))
            k += 1; t = t0 + k * b
    def arp(self, t0, t1, freqs, step=None, amp=0.08, voice='pluck', order='up'):
        """Arpeggio over freqs from t0 to t1. step defaults to a 16th note. voice: pluck | bell | lead."""
        step = step or 60.0 / self.bpm / 4; seq = freqs if order == 'up' else freqs[::-1] if order == 'down' else freqs + freqs[-2:0:-1]; k = 0; t = t0
        while t < t1 - 1e-6:
            f = seq[k % len(seq)]
            if voice == 'pluck': self.pluck(t, f, amp, .5)
            elif voice == 'lead': self.lead(t, f, step * .9, amp * .7)
            else: self.bell(t, f, amp, .5)
            k += 1; t = t0 + k * step
    def typing(self, t0, t1, n, amp=0.03):
        for k in range(n): self.tick(t0 + (t1 - t0) * k / max(1, n), amp)
    # ---- master ----
    def render(self, path='audio.wav', reverb=0.30, fade_in=0.05, fade_out=0.4, peak=0.84):
        sr, N = self.sr, self.N; ir_n = int(sr * 2.4); it = np.arange(ir_n) / sr; out = []
        for ch in (0, 1):
            ir = self.rs.randn(ir_n) * np.exp(-it * 2.6); ir[:int(sr * .012)] = 0; ir /= np.sqrt((ir ** 2).sum())
            M = 1 << (N + ir_n - 2).bit_length(); rev = np.fft.irfft(np.fft.rfft(self.wet[ch], M) * np.fft.rfft(ir, M), M)[:N]
            out.append(self.wet[ch] * .8 + rev * reverb + self.dry[ch])
        y = np.stack(out, 1); t = self.t; y *= (np.clip(t / max(fade_in, 1e-3), 0, 1) * np.clip((self.T - t) / max(fade_out, 1e-3), 0, 1) ** 1.5)[:, None]
        y = np.tanh(y * 1.4) / 1.4; y *= peak / (np.abs(y).max() + 1e-9)
        w = wave.open(path, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((y * 32767).astype('<i2').tobytes()); w.close()
        print(f'{path}: {self.T:.2f}s peak {np.abs(y).max():.2f} rms {np.sqrt((y ** 2).mean()):.3f}  (aim rms 0.15–0.20; check with: ffmpeg -i {path} -af ebur128 -f null -)')
