# 隐秘 EPUB 阅读插件 — 设计文档

- 日期：2026-06-10
- 状态：已与用户确认，待评审

## 1. 目标与背景

开发一款 VSCode 扩展，用于在"摸鱼"场景下隐秘地阅读 EPUB 电子书。核心诉求是**高隐蔽性**：屏幕上看起来就像在写代码，旁人/老板走过不易察觉。

非目标（本期不做）：txt/mobi/pdf 等其它格式、多本书管理 UI、书签、云同步。

## 2. 核心设计决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 显示方式 | 伪装成代码（编辑器内） | 隐蔽性与阅读连贯性兼顾，优于状态栏/Webview |
| 渲染技术 | **TextEditor Decoration（装饰器）** | 文字不进文件，零 Git 痕迹、不触发保存/格式化、无"已修改"标记 |
| 装饰依附位置 | 专用"伪装缓冲区"——`TextDocumentContentProvider` 提供的**只读虚拟文档** | 虚拟文档无 dirty 状态、关闭无保存弹窗，才能真正做到"零痕迹"；untitled 文档插入内容后会变 dirty（标签圆点 + 关闭弹保存框），不可用 |
| 翻页输入 | 键盘组合键 `Alt+[` / `Alt+]` | VSCode 不支持鼠标按键；由用户用鼠标软件（如 X-Mouse Button Control）把侧键映射到该组合键 |

### 关于鼠标侧键
VSCode 的 keybindings 系统不支持鼠标按键，扩展也无法在编辑器内捕获侧键（button 4/5）原始事件。因此翻页绑定为键盘组合键，用户在系统侧用鼠标驱动 / X-Mouse Button Control 将两个侧键映射为 `Alt+[`、`Alt+]`。此为约定，非插件实现项。

## 3. 架构

```
┌─────────────┐   .epub    ┌──────────────┐
│ EPUB 解析器  │──────────▶│  书籍模型     │  章节列表 + 全文流
└─────────────┘            └──────┬───────┘
                                  │ 分页引擎（按配置算每页内容）
                                  ▼
┌─────────────┐  当前页文本  ┌──────────────┐
│ 进度存储     │◀──────────▶│  渲染器       │  Decoration 画到伪装缓冲区
│(globalState)│            └──────┬───────┘
└─────────────┘                  │
                                  ▼
                          ┌──────────────┐
                          │  命令/快捷键  │ 翻页 / 老板键 / 目录跳转
                          └──────────────┘
```

## 4. 模块设计

每个模块单一职责、接口清晰、可独立测试。

### 4.1 `epubParser`
- **做什么**：解析 .epub 文件，输出有序章节（标题 + 纯文本）。
- **怎么用**：`parseEpub(filePath): Promise<Book>`。
- **依赖**：`jszip`（解压），`fast-xml-parser`（读 OPF/NCX）；HTML 抽纯文本（去标签、保留段落换行）。
- **实现要点**：epub 是 zip；读 `META-INF/container.xml` 找到 OPF；OPF 的 `<spine>` 给出阅读顺序，`<manifest>` 给出文件路径；逐章读取 XHTML 抽文本。

### 4.2 `book`（书籍模型 + 分页引擎）
- **做什么**：持有章节数据，按配置把文本切成"页"。
- **怎么用**：`new Book(chapters)`；`book.getPage(index, layout): string[]`；`book.totalPages`；`book.chapterOf(pageIndex)`。
- **依赖**：无（纯逻辑，易单测）。
- **实现要点**：分页输入 `{ linesPerPage, charsPerLine }`；中文按字宽断行；记录章节与页的映射，支持目录跳转。

### 4.3 `renderer`（装饰器渲染）
- **做什么**：把当前页文本画到伪装缓冲区上。
- **怎么用**：`renderer.show(editor, lines)`；`renderer.clear()`。
- **依赖**：`vscode` API（`createTextEditorDecorationType`，`after` 渲染选项）。
- **实现要点**：
  - 伪装缓冲区：注册 `TextDocumentContentProvider`（自定义 scheme，如 `stealth:`），提供一个只读虚拟文档（内容为若干空行）。虚拟文档无 dirty 状态、关闭无保存提示。
  - 每行文本用 `after` 装饰渲染，前缀按"当前语言注释符"（`#` / `//`）。
  - 颜色：注释色属于 TextMate token 配色，`ThemeColor` API 取不到；默认使用接近主流深色主题注释色的固定值（`#6A9955`），由 `stealthReader.textColor` 配置覆盖。
  - `contentText` 中连续空格会被折叠；缩进/对齐需通过 `textDecoration: 'none; white-space: pre'` 处理。
  - 监听 `onDidChangeVisibleTextEditors`：用户切走再切回伪装标签页时重新应用装饰。
  - 装饰内容不可选中/复制（符合隐蔽需求）。

### 4.4 `positionStore`（进度存储）
- **做什么**：记住"当前书 + 阅读位置"，跨会话恢复。
- **怎么用**：`store.save(bookPath, position)`；`store.load(): {bookPath, position} | null`，其中 `position = { chapterIndex, charOffset }`。
- **依赖**：`context.globalState`。
- **设计要点**：进度存**章节索引 + 章内字符偏移**，而非页码——页码由分页配置（每行字数/每页行数）派生，配置一改页码就错位；字符偏移与布局无关，恢复时由分页引擎换算回当前配置下的页。

### 4.5 `commands`（命令与快捷键）
- 注册命令并绑定快捷键，调度其它模块。
- 命令清单：
  - `stealthReader.openBook` — 选 .epub 文件并开始阅读
  - `stealthReader.nextPage` — `Alt+]`
  - `stealthReader.prevPage` — `Alt+[`
  - `stealthReader.bossKey` — `Alt+Q`，清屏并切回工作文件
  - `stealthReader.gotoChapter` — 命令面板选章节跳转

## 5. 数据流

1. `openBook` → `epubParser.parseEpub` → `Book` 实例 → `positionStore.save`。
2. 渲染：取 `positionStore` 的 `{chapterIndex, charOffset}` → 分页引擎换算成当前配置下的页码 → `book.getPage` → `renderer.show`。
3. 翻页：页码 ±1 → 重渲染 → 把新页首的 `{chapterIndex, charOffset}` 写回 `positionStore`。
4. 老板键：`renderer.clear()` + 聚焦回上一个真实编辑器。

## 6. 配置项（`contributes.configuration`）

| 配置 | 默认 | 说明 |
|---|---|---|
| `stealthReader.charsPerLine` | 40 | 每行字数 |
| `stealthReader.linesPerPage` | 25 | 每页行数 |
| `stealthReader.textColor` | `#6A9955`（近似主流深色主题注释色） | 文字颜色 |
| `stealthReader.commentPrefix` | `auto` | 注释前缀（auto 跟随语言 / `#` / `//`） |

## 7. 错误处理

- 非法/损坏 epub → 友好提示，不崩溃。
- 找不到上次的书文件 → 清除进度记录，提示重新打开。
- 没有活动编辑器时翻页 → 自动创建伪装缓冲区。

## 8. 测试策略

- `epubParser`：用样例 epub 测章节顺序与文本抽取。
- `book` 分页引擎：纯函数，覆盖中英文断行、边界页、章节映射（重点单测）。
- `renderer`：以 VSCode 扩展集成测试验证装饰应用/清除。
- 端到端：打开样例书 → 翻页 → 老板键 → 重启恢复进度。

## 9. 范围（YAGNI）

- **v1**：打开 epub、装饰器阅读、翻页、老板键、记忆进度、基础配置。
- **后续**：状态栏极限隐身模式、书签、多本书管理、txt/mobi 支持、阅读统计。

## 10. 技术栈

- TypeScript + VSCode Extension API
- 脚手架：`yo code`
- 依赖：`jszip`、`fast-xml-parser`
- 打包发布：`@vscode/vsce`
