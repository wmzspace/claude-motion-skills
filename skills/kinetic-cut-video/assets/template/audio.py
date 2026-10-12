"""Soundtrack for the demo reel. Every time below is copied from the shot table / hits in index.html.
Run:  PYTHONPATH=<skill>/scripts python3 audio.py     (build.py does this automatically)"""
from audio_lib import Mix, note as n
D2, G2, A2, B2 = n(-31), n(-26), n(-24), n(-22)
m = Mix(duration=18, bpm=120)
# chord per section (D – G – Bm – A – D)
m.pad([D2, n(-19), n(-12), n(-7), n(-3), n(7)], 0.5, 4)
m.pad([G2, n(-14), n(-10), n(-7), n(-3), n(0)], 4, 8)
m.pad([B2, n(-7), n(-3), n(0), n(4)], 8, 12)
m.pad([A2, n(-5), n(0), n(2), n(4)], 12, 16)
m.pad([D2, n(-19), n(-12), n(-7), n(-3), n(0), n(7)], 16, 17.6, 0.06)
# opening: converge → ignition
m.riser(0.5, 0.5, 0.2); m.boom(0.5, 0.45); m.bell(0.5, n(-7), 0.12, 2.4, -0.2); m.bell(0.52, n(5), 0.1, 2.2, 0.2); m.bell(0.56, n(12), 0.07, 2.0)
for k in range(4): m.hat(1.0 + k * 0.25, 0.012)
m.riser(2.0, 0.3, 0.12)
# groove
m.beat(2, 4, D2, snare=0); m.beat(4, 8, G2); m.beat(8, 10, B2); m.beat(11, 12, B2); m.beat(12, 16, A2); m.beat(16, 17, D2, snare=0, sixteenths=False)
# one boom per cut, heavier on the big ones
for tc, a in [(2, .3), (3, .3), (4, .34), (5, .3), (6, .3), (7, .3), (8, .38), (9, .3), (11, .25), (12, .36), (13, .3), (14, .5), (15, .3), (16, .5), (17, .36)]: m.boom(tc, a)
# melody: one bell per cut, climbing
m.bell(2.0, n(5), 0.13, 1.0, -0.2); m.bell(2.5, n(7), 0.13, 1.0, 0.2); m.whoosh(2.55, 0.4, 0.12); m.bell(3.0, n(9), 0.13, 1.8, -0.2); m.bell(3.02, n(12), 0.1, 1.8, 0.2)
m.riser(4.0, 0.35, 0.12)
for k, s in enumerate([2, 5, 7, 10]): m.bell(4 + k, n(s), 0.12, 1.2, -0.4 + k * 0.27); m.bell(4.5 + k, n(s + 7), 0.06, 0.9, 0.4 - k * 0.27)
m.typing(4.3, 4.8, 9); m.typing(5.3, 5.85, 12)
m.riser(8.0, 0.5, 0.15)
for k, s in enumerate([2, 4, 7, 9]): m.bell(8 + k * 0.11, n(s), 0.11, 0.9, -0.4 + k * 0.27); m.snare(8 + k * 0.11, 0.03)   # four stamped glyphs
m.bell(9.0, n(9), 0.12, 1.6, -0.2); m.bell(9.02, n(14), 0.09, 1.6, 0.2)
for k, s in enumerate([5, 7, 9, 12]):                                                                               # strobe: a hit every 0.25s
    tb = 10 + k * 0.25; m.kick(tb, 0.24); m.snare(tb, 0.055); m.bell(tb, n(s), 0.14, 0.7, -0.4 + k * 0.27); m.bass(tb, B2, 0.1, 0.18)
m.typing(11.2, 11.5, 4, 0.05); m.riser(12.0, 0.4, 0.16)
m.bell(12.0, n(0), 0.13, 1.6, -0.2); m.bell(12.02, n(7), 0.1, 1.6, 0.2)
m.bell(13.0, n(2), 0.13, 1.6, -0.2); m.bell(13.02, n(9), 0.1, 1.6, 0.2); m.whoosh(13.2, 0.5, 0.07)
m.bell(14.0, n(-8), 0.14, 2.0); m.bell(14.02, n(4), 0.11, 1.8, -0.2); m.bell(14.03, n(12), 0.08, 1.8, 0.2)
m.bell(15.0, n(4), 0.1, 1.0, -0.3); m.bell(15.1, n(7), 0.08, 1.0); m.bell(15.2, n(12), 0.08, 1.0, 0.3); m.whoosh(15.4, 0.8, 0.09); m.riser(16.0, 0.3, 0.18)
# finale: assemble → wordmark → CRT off
m.bell(16.0, n(-19), 0.14, 3.0); m.whoosh(16.5, 1.0, 0.1, 400, 5000); m.riser(17.0, 0.5, 0.1)
m.bell(17.0, n(5), 0.14, 2.4, -0.2); m.bell(17.03, n(12), 0.11, 2.4, 0.2); m.bell(17.12, n(21), 0.06, 2.2)
m.riser(17.72, 0.22, 0.12); m.tick(17.98, 0.09); m.bell(17.98, n(29), 0.05, 0.3)
m.render('audio.wav')
