<p align="center">
  <img src="images/icon.png" width="120" alt="CodeNovel" />
</p>

<h1 align="center">CodeNovel</h1>

<p align="center">把 EPUB 电子书伪装成<strong>源代码</strong>或 <strong>Markdown 笔记</strong>，在编辑器里隐蔽阅读。</p>

<p align="center"><em>一眼望去是在写代码，其实在读小说。</em></p>

---

CodeNovel 是一款 VSCode 扩展：它把电子书的正文渲染成一屏看起来像在写代码（或记笔记）的样子，配合一键「老板键」，让你在编辑器里安静读书而不引人注目。

> ⚠️ 它**不会**把书的内容写进任何文件——正文只作为「装饰」叠加显示，不进磁盘、不进 Git、不留痕迹。

## ✨ 特性

- 📖 **直接读 EPUB**——选一个 `.epub` 文件即可，自动解析章节（兼容 UTF-8 / GBK 编码的中文书）
- 🥷 **两种伪装模式**
  - **代码模式**：伪装成 `util.py`，正文以 `#` 注释呈现，中间穿插带语法高亮的真 Python 代码
  - **Markdown 模式**：伪装成 `notes.md`，正文是纯文本段落，穿插 `##` 标题、`-` 列表等结构，像在写工作笔记
- ⌨️ **老板键**——`Alt+Q` 一键隐藏 / 再按恢复
- 💾 **自动记忆进度**——精确到字符，关掉、重启后按一下翻页键即从原处续读
- 🎲 **去规整化**——行宽抖动、成段混排、注释缩进抖动，打破「一眼假」的整齐感（固定种子，翻页时代码骨架不跳动）
- 🔒 **零痕迹**——基于只读虚拟文档，无「已修改」标记、无保存弹窗、不出现在工作区文件里
- 🎨 **高度可配置**——颜色、每行字数、每页行数、伪装密度、自定义伪装片段……

## 📸 预览

> 把一张截图放到 `images/screenshot.png` 即可在此展示。

## 📦 安装

**方式一：VSCode 应用市场**
在扩展面板搜索 **CodeNovel**，点击安装。

**方式二：从 VSIX 安装**
下载 `codenovel-x.y.z.vsix` → 扩展面板右上角 `…` → **从 VSIX 安装…** → 选择该文件。

## 🚀 使用

1. **打开书**：`Ctrl+Shift+P` 打开命令面板 → 输入 **CodeNovel: Open Book** → 选择你的 `.epub`
2. **翻页**：`Alt+]` 下一页，`Alt+[` 上一页
3. **老板键**：`Alt+Q` 隐藏 / 恢复
4. **跳转章节**：命令面板 → **CodeNovel: Go to Chapter**
5. **续读**：重启 VSCode 后直接按 `Alt+]`，自动加载上次的书并停在原页

### 🖱️ 用鼠标侧键翻页（可选）

VSCode 的快捷键系统不支持鼠标侧键，但你可以用鼠标驱动或 [X-Mouse Button Control](https://www.highrez.co.uk/downloads/XMouseButtonControl.htm) 把两个侧键映射成 `Alt+[` / `Alt+]`，即可侧键翻页。

## ⚙️ 配置项

在设置中搜索 `CodeNovel`：

| 配置 | 默认 | 说明 |
|---|---|---|
| `disguiseMode` | `code` | 伪装载体：`code`（util.py）或 `markdown`（notes.md） |
| `charsPerLine` | `40` | 每行字数（全角计 1） |
| `linesPerPage` | `25` | 每页行数 |
| `widthJitter` | `0.15` | 行宽随机浮动幅度，打破右边缘的整齐矩形（0 = 整齐） |
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
- 在任何 Git 仓库里 `git status` 都**看不到**新增/改动
- 正文**不可选中、不可复制、不可搜索**（你看得到，剪贴板和全局搜索却抓不到）
- 关掉扩展，画面瞬间干净，什么都不留

## ⚠️ 已知限制

- 目前**只记最近一本书**的进度，用「Open Book」换书会覆盖上一本的进度
- 仅支持 **EPUB**（暂不支持 txt/mobi/pdf）
- 关闭 VSCode 窗口前建议先按一次 `Alt+Q`，否则重启后会残留一个空白的伪装标签页（无内容泄露，只是多余）

## 🧑‍💻 开发

```bash
npm install
npm run compile     # 编译
npm test            # 运行单元测试
npm run icon        # 重新生成图标
npx @vscode/vsce package   # 打包 vsix
```

## 📄 License

[MIT](LICENSE) © xxloveslife

---

<p align="center"><sub>摸鱼有风险，上班需谨慎 🐟</sub></p>
