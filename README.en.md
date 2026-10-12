<div align="center">

# Claude Motion Skills

**Skills that make Claude produce things that move: animated PowerPoint decks, kinetic-cut videos, and step-by-step animated explainer pages.**

English · [中文](README.md)

![license](https://img.shields.io/badge/license-MIT-blue) ![skills](https://img.shields.io/badge/skills-3-orange) ![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-d97757)

<img src="docs/images/kinetic-cut-video.gif" width="720" alt="kinetic-cut-video demo">

<sub>↑ The 18-second demo reel that ships with <code>kinetic-cut-video</code> (original is 1080p60 with a synthesized soundtrack)</sub>

</div>

---

Three [Agent Skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview). Each one comes with **working code**, not just a prompt:

| Skill | Output | What it does |
|---|---|---|
| [`animated-native-pptx`](skills/animated-native-pptx) | `.pptx` | Every text box, card and icon stays editable. Native animations **play automatically** when you enter a slide. Opens in PowerPoint and WPS |
| [`kinetic-cut-video`](skills/kinetic-cut-video) | `.mp4` | Canvas engine, rendered frame by frame with Playwright. A new full-screen shot every second, with motion blur, bloom, chromatic aberration and a **code-synthesized soundtrack** |
| [`animation-html`](skills/animation-html) | `.html` | A single-file explainer that goes one step at a time: stepper, narration, fullscreen presenter mode, clicker support, plus an **in-browser editor that works like PowerPoint** |

> The skill instructions are written in Chinese. Claude follows them fine whatever language you use, and it writes the content in the language you ask for.

## Demos

### 🎞️ animated-native-pptx

<img src="docs/images/animated-native-pptx.png" alt="animated-native-pptx sample">

- Rise, slide, zoom, wipe, pulse and **motion-path** animations, transitions, and auto-playing background music
- The animations are real `<p:timing>` XML, not embedded video, so the text stays editable
- Sample deck: [`examples/deckkit-demo.pptx`](https://github.com/wmzspace/claude-motion-skills/releases/download/v1.0.0/deckkit-demo.pptx) (download it and start the slideshow)

### 🎬 kinetic-cut-video

<img src="docs/images/kinetic-cut-video-stills.jpg" width="720" alt="kinetic-cut-video stills">

- 20+ parameterized shot techniques: shockwaves, speed-line whips, code walls, isometric bars, node networks, tunnels, dot spheres, strobe cards, particle logo assembly, a CRT switch-off…
- Every frame is a pure function of time, so rendering runs in **parallel and can resume** after an interruption
- A small numpy synth builds a soundtrack that hits on every cut

### 📽️ animation-html

<img src="docs/images/animation-html.gif" width="720" alt="animation-html demo">

- Space to pause, arrow keys to step, `F` for presenter mode, light and dark themes
- Press `E` to edit in the page: drag elements, change text, add shapes, then `Ctrl+S` writes the changes back into the HTML
- Example: [`examples/tcp-handshake_animation.html`](examples/tcp-handshake_animation.html)

## Install

**Claude Code** (installs all three):

```text
/plugin marketplace add wmzspace/claude-motion-skills
/plugin install kinetic-skills@claude-motion-skills
```

**Manual:**

```bash
git clone https://github.com/wmzspace/claude-motion-skills.git
cp -r claude-motion-skills/skills/* ~/.claude/skills/
```

**Claude.ai / desktop:** zip one skill folder (`zip -r animation-html.zip animation-html`) and upload it on the Skills page in settings.

## Requirements

| Skill | Needs |
|---|---|
| animated-native-pptx | `python3` (`python-pptx`, `Pillow`, `lxml`), `node` + `playwright`; LibreOffice, `pdftoppm` and `ffmpeg` for the visual check |
| kinetic-cut-video | `node` + `playwright` (Chromium), `ffmpeg`, `python3` + `numpy`, a CJK font with heavy weights (e.g. Noto CJK) |
| animation-html | A browser; `playwright` for the self-check screenshots |

## License

[MIT](LICENSE). Issues, PRs, new shot techniques and things you made with these skills are all welcome. If they save you time, a ⭐ helps.
