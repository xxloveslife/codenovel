<p align="center">
  <img src="images/icon.png" width="120" alt="CodeNovel" />
</p>

<h1 align="center">CodeNovel</h1>

<p align="center">在编辑器里把电子书伪装成<strong>源代码</strong>或 <strong>Markdown 笔记</strong>，隐蔽阅读。<br/>Read e-books in your editor, disguised as <strong>source code</strong> or <strong>markdown notes</strong>.</p>

<p align="center"><em>一眼望去是在写代码，其实在读小说。 · It looks like you're coding. You're actually reading a novel.</em></p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=xxloveslife.codenovel"><img src="https://img.shields.io/visual-studio-marketplace/v/xxloveslife.codenovel?label=Marketplace&color=2d2d46" alt="Version" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=xxloveslife.codenovel"><img src="https://img.shields.io/visual-studio-marketplace/i/xxloveslife.codenovel?label=Installs&color=4EC9B0" alt="Installs" /></a>
  <a href="https://github.com/xxloveslife/codenovel"><img src="https://img.shields.io/badge/source-GitHub-6A9955" alt="GitHub" /></a>
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
</p>

<p align="center"><strong><a href="#中文">中文</a></strong> · <a href="#english">English</a></p>

---

<a name="中文"></a>

## 中文

**CodeNovel** 是一款 VSCode 扩展，把电子书的正文渲染成「一屏看起来像在写代码（或记笔记）」的样子。配合一键「老板键」，让你在编辑器里安静读书而不引人注目——适合需要长时间盯着屏幕、又想见缝插针读点闲书的人。

> 🔒 它**不会**把书的内容写进任何文件。正文只作为「装饰」叠加显示，不进磁盘、不进 Git、不可复制、不可搜索，关掉即净，不留痕迹。

### ✨ 特性

- 📖 **直接读 EPUB / TXT**——选一个 `.epub` 或 `.txt` 即可，自动解析章节（兼容 UTF-8 / GBK 中文书）
- 🥷 **两种伪装模式**——伪装成代码 `util.py` 或笔记 `notes.md`，随场景切换
- ⌨️ **老板键**——`Alt+Q` 一键隐藏 / 再按恢复
- 💾 **自动记忆进度**——精确到字符，重启后按一下翻页键即从原处续读
- 🎲 **去规整化**——行宽抖动、成段混排、缩进抖动，打破「一眼假」的整齐感
- 🔒 **零痕迹**——基于只读虚拟文档，无「已修改」标记、无保存弹窗、不出现在工作区

### 🎬 快速上手

1. **安装** CodeNovel（市场搜索，或从 VSIX 安装）
2. `Ctrl+Shift+P` 打开命令面板 → 运行 **CodeNovel: Open Book** → 选你的电子书（`.epub` / `.txt`）
3. `Alt+]` / `Alt+[` 翻页，`Alt+Q` 随时隐藏 / 恢复

就这么简单。下次重启 VSCode，直接按 `Alt+]` 就能接着上次读。

### ⌨️ 快捷键

| 操作 | 快捷键 |
|---|---|
| 下一页 | `Alt+]` |
| 上一页 | `Alt+[` |
| 隐藏 / 恢复（老板键） | `Alt+Q` |
| 打开书 / 跳转章节 | 命令面板（`Ctrl+Shift+P`） |

### 🎭 两种伪装模式

在设置 `CodeNovel: Disguise Mode` 中切换，随时生效：

| | **代码模式** | **Markdown 模式** |
|---|---|---|
| 伪装文件 | `util.py` | `notes.md` |
| 正文呈现 | `#` 注释（带语法高亮的真代码穿插其间） | 纯文本段落（穿插 `##`/`-`/`>` 结构） |
| 适合场景 | 周围都是程序员、屏幕该是代码 | 像在写工作笔记 / 文档 |
| 配置值 | `disguiseMode = code` | `disguiseMode = markdown` |

### ⚙️ 配置项

在设置中搜索 `CodeNovel`：

| 配置 | 默认 | 说明 |
|---|---|---|
| `disguiseMode` | `code` | 伪装载体：`code`（util.py）或 `markdown`（notes.md） |
| `charsPerLine` | `40` | 每行字数（全角计 1） |
| `linesPerPage` | `25` | 每页行数 |
| `widthJitter` | `0.15` | 行宽随机浮动，打破右边缘整齐矩形（0 = 整齐） |
| `fakeCodeEvery` | `4` | 平均每几行正文插入一段伪装代码/结构 |
| `fakeCodeBlock` | `1` | 每段伪装的平均行数（0 = 关闭混排） |
| `fakeCodeJitter` | `0.5` | 伪装块大小的随机幅度 |
| `fakeCodeLines` | `[]` | 自定义伪装片段（留空用内置） |
| `textColor` | `#6A9955` | 正文颜色（默认注释绿） |
| `commentPrefix` | `auto` | 注释前缀（仅代码模式） |
| `chapterSplit` | `auto` | （仅TXT）章节切分：`auto` 自动识别标题，`off` 整本一章 |
| `chapterPattern` | `""` | （仅TXT）自定义章节正则（留空用内置规则） |

**推荐配置**
- *代码党*：`disguiseMode=code`，`widthJitter=0.3`，`fakeCodeEvery=3`，`fakeCodeBlock=2`
- *文档党*：`disguiseMode=markdown`，`widthJitter=0.2`

### ❓ 常见问题

**进度会自动保存吗？**
会。每次翻页都会自动记录位置（精确到字符），关闭、重启后按 `Alt+]` 即从原处续读，无需手动操作。

**屏幕看着还是太整齐 / 有点假？**
调大 `widthJitter`（如 0.3）让每行长短不一，再调 `fakeCodeEvery` / `fakeCodeBlock` 改变代码与正文的穿插比例。所有随机都用固定种子，翻页时骨架不会乱跳。

**能同时读多本书吗？**
目前只记**最近一本**的进度，用「Open Book」换书会覆盖上一本的进度。

**重启后多了个空白的 `util.py` / `notes.md` 标签？**
关闭 VSCode 窗口前先按一次 `Alt+Q` 即可避免（这只是个残留的空标签，无任何内容泄露）。

**支持别的格式吗？**
目前支持 **EPUB** 和 **TXT**。TXT 会自动按「第X章」等独占行的标题切分章节，可通过 `chapterSplit=off` 关闭，或用 `chapterPattern` 自定义正则；mobi / pdf 暂不支持。

### 🔗 源码与反馈

源码托管在 GitHub：<https://github.com/xxloveslife/codenovel>

欢迎 [提 Issue](https://github.com/xxloveslife/codenovel/issues) 反馈问题或建议，也欢迎 PR 🙌

---

<a name="english"></a>

## English

**CodeNovel** is a VSCode extension that renders an e-book's text to look like you're writing code (or taking notes). With a one-key "boss key", you can read quietly in your editor without drawing attention — handy for anyone who stares at a screen all day and wants to sneak in some leisure reading.

> 🔒 It **never** writes the book's content to any file. The text is only overlaid as editor *decorations* — nothing hits the disk, nothing shows in Git, it can't be selected, copied, or searched. Turn it off and the screen is instantly clean.

### ✨ Features

- 📖 **Reads EPUB / TXT directly** — just pick a `.epub` or `.txt`; chapters are parsed automatically (UTF-8 / GBK Chinese books supported)
- 🥷 **Two disguise modes** — pose as code `util.py` or notes `notes.md`, switch by context
- ⌨️ **Boss key** — `Alt+Q` hides instantly, press again to restore
- 💾 **Remembers your progress** — down to the character; after a restart, one page-turn key resumes where you left off
- 🎲 **De-uniformed look** — width jitter, block interleaving and indent jitter break the tell-tale "perfect rectangle"
- 🔒 **Zero footprint** — a read-only virtual document: no "modified" dot, no save prompt, never appears in your workspace

### 🎬 Quick Start

1. **Install** CodeNovel (from the Marketplace, or from a VSIX)
2. `Ctrl+Shift+P` → run **CodeNovel: Open Book** → pick your e-book (`.epub` / `.txt`)
3. `Alt+]` / `Alt+[` to turn pages, `Alt+Q` to hide / restore anytime

That's it. Next time you open VSCode, just press `Alt+]` to pick up where you stopped.

### ⌨️ Shortcuts

| Action | Key |
|---|---|
| Next page | `Alt+]` |
| Previous page | `Alt+[` |
| Hide / restore (boss key) | `Alt+Q` |
| Open book / go to chapter | Command Palette (`Ctrl+Shift+P`) |

### 🎭 Two Disguise Modes

Switch anytime via the `CodeNovel: Disguise Mode` setting:

| | **Code mode** | **Markdown mode** |
|---|---|---|
| Disguise file | `util.py` | `notes.md` |
| Text rendered as | `#` comments (real syntax-highlighted code interleaved) | plain paragraphs (with `##`/`-`/`>` interleaved) |
| Best for | surrounded by devs, screen should be code | looks like writing notes / docs |
| Config value | `disguiseMode = code` | `disguiseMode = markdown` |

### ⚙️ Settings

Search `CodeNovel` in Settings:

| Setting | Default | Description |
|---|---|---|
| `disguiseMode` | `code` | Disguise carrier: `code` (util.py) or `markdown` (notes.md) |
| `charsPerLine` | `40` | Characters per line (full-width counts as 1) |
| `linesPerPage` | `25` | Lines per page |
| `widthJitter` | `0.15` | Random line-width jitter to ragged the right edge (0 = even) |
| `fakeCodeEvery` | `4` | Avg. lines of text between each fake-code block |
| `fakeCodeBlock` | `1` | Avg. lines per fake-code block (0 = disable interleaving) |
| `fakeCodeJitter` | `0.5` | Randomness of the block sizes |
| `fakeCodeLines` | `[]` | Custom disguise snippets (empty = built-in) |
| `textColor` | `#6A9955` | Text color (default comment green) |
| `commentPrefix` | `auto` | Comment prefix (code mode only) |
| `chapterSplit` | `auto` | (TXT only) `auto` detect headings, `off` whole book as one chapter |
| `chapterPattern` | `""` | (TXT only) custom chapter-heading regex (empty = built-in) |

**Recommended**
- *Coder*: `disguiseMode=code`, `widthJitter=0.3`, `fakeCodeEvery=3`, `fakeCodeBlock=2`
- *Note-taker*: `disguiseMode=markdown`, `widthJitter=0.2`

### ❓ FAQ

**Is progress saved automatically?**
Yes. Every page turn records your position (to the character). After closing or restarting, press `Alt+]` to resume — no manual step.

**Still looks too neat / fake?**
Increase `widthJitter` (e.g. 0.3) for uneven line lengths, and tune `fakeCodeEvery` / `fakeCodeBlock` to change the code-to-text mix. All randomness uses a fixed seed, so the skeleton doesn't reshuffle on page turns.

**Can I read multiple books at once?**
It currently remembers only the **most recent** book; opening another book overwrites the previous progress.

**A blank `util.py` / `notes.md` tab after restart?**
Press `Alt+Q` once before closing the VSCode window to avoid it (it's just an empty leftover tab — no content leak).

**Other formats?**
**EPUB** and **TXT** are supported. TXT auto-splits chapters by whole-line headings like "Chapter X / 第X章"; turn it off with `chapterSplit=off` or customize via `chapterPattern`. mobi / pdf are not supported yet.

### 🔗 Source & Feedback

Source on GitHub: <https://github.com/xxloveslife/codenovel>

[Open an issue](https://github.com/xxloveslife/codenovel/issues) for bugs or ideas — PRs welcome 🙌

## 📄 License

[MIT](LICENSE) © xxloveslife

---

<p align="center"><sub>摸鱼有风险，上班需谨慎 · Slack off at your own risk 🐟</sub></p>
