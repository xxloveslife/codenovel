<p align="center">
  <img src="images/icon.png" width="120" alt="CodeNovel" />
</p>

<h1 align="center">CodeNovel</h1>

<p align="center">在编辑器里把 EPUB 电子书伪装成<strong>源代码</strong>或 <strong>Markdown 笔记</strong>，隐蔽阅读。</p>

<p align="center"><em>一眼望去是在写代码，其实在读小说。</em></p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=xxloveslife.codenovel"><img src="https://img.shields.io/visual-studio-marketplace/v/xxloveslife.codenovel?label=Marketplace&color=2d2d46" alt="Version" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=xxloveslife.codenovel"><img src="https://img.shields.io/visual-studio-marketplace/i/xxloveslife.codenovel?label=Installs&color=4EC9B0" alt="Installs" /></a>
  <a href="https://github.com/xxloveslife/codenovel"><img src="https://img.shields.io/badge/source-GitHub-6A9955" alt="GitHub" /></a>
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
</p>

---

**CodeNovel** 是一款 VSCode 扩展，把电子书的正文渲染成「一屏看起来像在写代码（或记笔记）」的样子。配合一键「老板键」，让你在编辑器里安静读书而不引人注目——适合需要长时间盯着屏幕、又想见缝插针读点闲书的人。

> 🔒 它**不会**把书的内容写进任何文件。正文只作为「装饰」叠加显示，不进磁盘、不进 Git、不可复制、不可搜索，关掉即净，不留痕迹。

## ✨ 特性

- 📖 **直接读 EPUB**——选一个 `.epub` 即可，自动解析章节（兼容 UTF-8 / GBK 中文书）
- 🥷 **两种伪装模式**——伪装成代码 `util.py` 或笔记 `notes.md`，随场景切换
- ⌨️ **老板键**——`Alt+Q` 一键隐藏 / 再按恢复
- 💾 **自动记忆进度**——精确到字符，重启后按一下翻页键即从原处续读
- 🎲 **去规整化**——行宽抖动、成段混排、缩进抖动，打破「一眼假」的整齐感
- 🔒 **零痕迹**——基于只读虚拟文档，无「已修改」标记、无保存弹窗、不出现在工作区

## 🎬 快速上手

1. **安装** CodeNovel（市场搜索，或从 VSIX 安装）
2. `Ctrl+Shift+P` 打开命令面板 → 运行 **CodeNovel: Open Book** → 选你的 `.epub`
3. `Alt+]` / `Alt+[` 翻页，`Alt+Q` 随时隐藏 / 恢复

就这么简单。下次重启 VSCode，直接按 `Alt+]` 就能接着上次读。

## ⌨️ 快捷键

| 操作 | 快捷键 |
|---|---|
| 下一页 | `Alt+]` |
| 上一页 | `Alt+[` |
| 隐藏 / 恢复（老板键） | `Alt+Q` |
| 打开书 / 跳转章节 | 命令面板（`Ctrl+Shift+P`） |

### 🖱️ 用鼠标侧键翻页（可选）

VSCode 的快捷键系统不支持鼠标侧键，但你可以用鼠标驱动或 [X-Mouse Button Control](https://www.highrez.co.uk/downloads/XMouseButtonControl.htm) 把两个侧键映射成 `Alt+[` / `Alt+]`，即可侧键翻页。

## 🎭 两种伪装模式

在设置 `CodeNovel: Disguise Mode` 中切换，随时生效：

| | **代码模式** | **Markdown 模式** |
|---|---|---|
| 伪装文件 | `util.py` | `notes.md` |
| 正文呈现 | `#` 注释（带语法高亮的真代码穿插其间） | 纯文本段落（穿插 `##`/`-`/`>` 结构） |
| 适合场景 | 周围都是程序员、屏幕该是代码 | 像在写工作笔记 / 文档 |
| 配置值 | `disguiseMode = code` | `disguiseMode = markdown` |

## ⚙️ 配置项

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

**推荐配置**
- *代码党*：`disguiseMode=code`，`widthJitter=0.3`，`fakeCodeEvery=3`，`fakeCodeBlock=2`
- *文档党*：`disguiseMode=markdown`，`widthJitter=0.2`

## 🔒 隐蔽性是怎么做到的

正文从不写入文件——它通过 VSCode 的 Decoration API 作为「虚影」叠加在一个**只读虚拟文档**上。因此：

- 标签页**没有**「已修改」小圆点，关闭时**不弹**保存框
- 在任何 Git 仓库里 `git status` 都**看不到**新增 / 改动
- 正文**不可选中、不可复制、不可搜索**（你看得到，剪贴板和全局搜索却抓不到）
- 关掉扩展，画面瞬间干净，什么都不留

## ❓ 常见问题

**进度会自动保存吗？**
会。每次翻页都会自动记录位置（精确到字符），关闭、重启后按 `Alt+]` 即从原处续读，无需手动操作。

**屏幕看着还是太整齐 / 有点假？**
调大 `widthJitter`（如 0.3）让每行长短不一，再调 `fakeCodeEvery` / `fakeCodeBlock` 改变代码与正文的穿插比例。所有随机都用固定种子，翻页时骨架不会乱跳。

**能同时读多本书吗？**
目前只记**最近一本**的进度，用「Open Book」换书会覆盖上一本的进度。

**重启后多了个空白的 `util.py` / `notes.md` 标签？**
关闭 VSCode 窗口前先按一次 `Alt+Q` 即可避免（这只是个残留的空标签，无任何内容泄露）。

**支持别的格式吗？**
目前仅支持 **EPUB**（暂不支持 txt / mobi / pdf）。

## 🧑‍💻 开发与贡献

源码：https://github.com/xxloveslife/codenovel

```bash
npm install
npm run compile            # 编译
npm test                   # 运行单元测试
npm run icon               # 重新生成图标
npx @vscode/vsce package   # 打包 vsix
```

欢迎提 Issue 与 PR。

## 📄 License

[MIT](LICENSE) © xxloveslife

---

<p align="center"><sub>摸鱼有风险，上班需谨慎 🐟</sub></p>
