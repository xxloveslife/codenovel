# 隐秘 EPUB 阅读插件实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一个 VSCode 扩展：用 TextEditor Decoration 把 EPUB 正文伪装成代码注释渲染在只读虚拟文档上，支持翻页、老板键、目录跳转、跨会话恢复进度。

**Architecture:** 纯逻辑层（epubParser / book 分页引擎 / positionStore）与 VSCode 层（renderer / controller / extension）严格分离——前者不 import `vscode`，用 vitest 单测；后者保持薄，靠 F5 手动冒烟验证。伪装缓冲区是 `TextDocumentContentProvider` 提供的只读虚拟文档（scheme `stealth-reader`，文件名 `util.py`），正文用 `after` 装饰画上去，文件内容永远是空行，零痕迹。

**Tech Stack:** TypeScript、VSCode Extension API、jszip、fast-xml-parser、vitest（单测）、tsc（构建）、@vscode/vsce（打包）。

**Spec:** `docs/superpowers/specs/2026-06-10-stealth-epub-reader-design.md`

## 文件结构

```
stealth-reader/
├── package.json              # 扩展清单：commands/keybindings/configuration
├── tsconfig.json
├── .gitignore / .vscodeignore
├── .vscode/launch.json       # F5 调试
├── scripts/make-sample-epub.mjs  # 生成手动测试用样例书
└── src/
    ├── book.ts               # 纯逻辑：断行 + 分页 + 位置换算（无 vscode 依赖）
    ├── book.test.ts
    ├── epubParser.ts         # 纯逻辑：epub → 章节文本（无 vscode 依赖）
    ├── epubParser.test.ts
    ├── positionStore.ts      # 纯逻辑：进度存取（KeyValueStore 接口，无 vscode 依赖）
    ├── positionStore.test.ts
    ├── renderer.ts           # VSCode 层：虚拟文档 + 装饰渲染
    ├── controller.ts         # VSCode 层：命令逻辑调度
    └── extension.ts          # 入口：注册与接线
```

约定：测试与源码同目录（`*.test.ts`），tsc 构建排除测试文件，vitest 直接跑 TS。

---

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`、`tsconfig.json`、`.gitignore`、`.vscodeignore`、`.vscode/launch.json`

- [ ] **Step 1: git init 并提交已有设计文档**

```bash
cd C:\Users\ASUS\stealth-reader
git init
git add docs/
git commit -m "docs: add design spec"
```

- [ ] **Step 2: 创建 `package.json`**

```json
{
  "name": "stealth-reader",
  "displayName": "Util Helper",
  "description": "Editor productivity helper",
  "version": "0.0.1",
  "publisher": "xxloveslife",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "main": "./out/extension.js",
  "activationEvents": [],
  "contributes": {
    "commands": [
      { "command": "stealthReader.openBook", "title": "Stealth Reader: Open Book" },
      { "command": "stealthReader.nextPage", "title": "Stealth Reader: Next Page" },
      { "command": "stealthReader.prevPage", "title": "Stealth Reader: Previous Page" },
      { "command": "stealthReader.bossKey", "title": "Stealth Reader: Boss Key" },
      { "command": "stealthReader.gotoChapter", "title": "Stealth Reader: Go to Chapter" }
    ],
    "keybindings": [
      { "command": "stealthReader.nextPage", "key": "alt+]", "when": "stealthReader.active" },
      { "command": "stealthReader.prevPage", "key": "alt+[", "when": "stealthReader.active" },
      { "command": "stealthReader.bossKey", "key": "alt+q", "when": "stealthReader.active" }
    ],
    "configuration": {
      "title": "Stealth Reader",
      "properties": {
        "stealthReader.charsPerLine": {
          "type": "number", "default": 40,
          "description": "每行字数（全角计 1，半角计 0.5）"
        },
        "stealthReader.linesPerPage": {
          "type": "number", "default": 25,
          "description": "每页行数"
        },
        "stealthReader.textColor": {
          "type": "string", "default": "#6A9955",
          "description": "正文颜色（默认近似深色主题注释绿）"
        },
        "stealthReader.commentPrefix": {
          "type": "string", "enum": ["auto", "#", "//"], "default": "auto",
          "description": "注释前缀；auto 按伪装文档语言推断"
        }
      }
    }
  },
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "test": "vitest run"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/vscode": "^1.85.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  },
  "dependencies": {
    "fast-xml-parser": "^4.4.0",
    "jszip": "^3.10.1"
  }
}
```

说明：`displayName` 故意起得不显眼；keybindings 全部带 `when: stealthReader.active`（由 `setContext` 控制），没在读书时不抢占快捷键。

- [ ] **Step 3: 创建 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "out",
    "rootDir": "src",
    "strict": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 4: 创建 `.gitignore`**

```
node_modules/
out/
*.vsix
sample.epub
```

- [ ] **Step 5: 创建 `.vscodeignore`**

```
.vscode/**
src/**
tsconfig.json
docs/**
scripts/**
**/*.map
sample.epub
```

- [ ] **Step 6: 创建 `.vscode/launch.json`**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "preLaunchTask": "npm: compile"
    }
  ]
}
```

- [ ] **Step 7: 安装依赖并验证**

```bash
npm install
```

Expected: 无报错，生成 `node_modules/` 与 `package-lock.json`。

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore .vscodeignore .vscode/
git commit -m "chore: scaffold extension project"
```

---

### Task 2: `book.ts` — 断行引擎

**Files:**
- Create: `src/book.ts`
- Test: `src/book.test.ts`

宽度模型：每行容量 = `charsPerLine × 2` 个半角单元；码点 > 0xFF 计 2 单元（覆盖 CJK 与全角标点），否则 1 单元。即默认 40 = 一行 40 个汉字或 80 个 ASCII。

- [ ] **Step 1: 写失败测试 `src/book.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { buildLines } from './book';

describe('buildLines 断行', () => {
  it('ASCII 按半角宽度断行（40 字 = 80 半角单元）', () => {
    const lines = buildLines([{ title: 't', text: 'a'.repeat(81) }], 40);
    expect(lines.map(l => l.text)).toEqual(['a'.repeat(80), 'a']);
  });

  it('中文按全角宽度断行', () => {
    const lines = buildLines([{ title: 't', text: '字'.repeat(41) }], 40);
    expect(lines.map(l => l.text)).toEqual(['字'.repeat(40), '字']);
  });

  it('跳过空行并记录正确的章内字符偏移', () => {
    const lines = buildLines([{ title: 't', text: '第一段\n\n第二段' }], 40);
    expect(lines).toEqual([
      { text: '第一段', chapterIndex: 0, charOffset: 0 },
      { text: '第二段', chapterIndex: 0, charOffset: 5 },
    ]);
  });

  it('多章节时记录章节索引', () => {
    const lines = buildLines(
      [{ title: 'a', text: '甲' }, { title: 'b', text: '乙' }], 40);
    expect(lines[0].chapterIndex).toBe(0);
    expect(lines[1].chapterIndex).toBe(1);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/book.test.ts`
Expected: FAIL，`buildLines` 不存在。

- [ ] **Step 3: 实现 `src/book.ts`（本任务只到 buildLines）**

```typescript
export interface Chapter {
  title: string;
  text: string;
}

export interface Layout {
  charsPerLine: number;
  linesPerPage: number;
}

export interface Position {
  chapterIndex: number;
  charOffset: number;
}

export interface BookLine {
  text: string;
  chapterIndex: number;
  charOffset: number;
}

function charWidth(ch: string): number {
  return ch.codePointAt(0)! > 0xff ? 2 : 1;
}

/** 把各章文本按显示宽度断成行；容量 = charsPerLine * 2 个半角单元 */
export function buildLines(chapters: Chapter[], charsPerLine: number): BookLine[] {
  const capacity = charsPerLine * 2;
  const lines: BookLine[] = [];
  chapters.forEach((chapter, chapterIndex) => {
    let offset = 0;
    for (const para of chapter.text.split('\n')) {
      if (para.trim() !== '') {
        let cur = '';
        let curWidth = 0;
        let curStart = offset;
        let pos = offset;
        for (const c of para) {
          const w = charWidth(c);
          if (curWidth + w > capacity) {
            lines.push({ text: cur, chapterIndex, charOffset: curStart });
            cur = '';
            curWidth = 0;
            curStart = pos;
          }
          cur += c;
          curWidth += w;
          pos += c.length;
        }
        if (cur) lines.push({ text: cur, chapterIndex, charOffset: curStart });
      }
      offset += para.length + 1; // +1 是被 split 吃掉的换行符
    }
  });
  return lines;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/book.test.ts`
Expected: 4 passed。

- [ ] **Step 5: Commit**

```bash
git add src/book.ts src/book.test.ts
git commit -m "feat: line wrapping engine with CJK width handling"
```

---

### Task 3: `book.ts` — 分页与位置换算

**Files:**
- Modify: `src/book.ts`（追加 Book 类）
- Test: `src/book.test.ts`（追加用例）

- [ ] **Step 1: 在 `src/book.test.ts` 追加失败测试**

```typescript
import { Book } from './book';

describe('Book 分页与定位', () => {
  const mk = (n: number) => ({
    title: 'c',
    text: Array.from({ length: n }, (_, i) => `行${i}`).join('\n'),
  });
  const layout = { charsPerLine: 40, linesPerPage: 25 };

  it('totalPages 按每页行数向上取整', () => {
    const book = new Book([mk(60)], layout);
    expect(book.totalPages).toBe(3);
    expect(book.getPage(0)).toHaveLength(25);
    expect(book.getPage(2)).toHaveLength(10);
  });

  it('positionOfPage / pageOfPosition 往返一致', () => {
    const book = new Book([mk(60)], layout);
    expect(book.pageOfPosition(book.positionOfPage(2))).toBe(2);
  });

  it('布局变化后位置仍落在覆盖原偏移的页上', () => {
    const chapters = [mk(100)];
    const a = new Book(chapters, layout);
    const pos = a.positionOfPage(3);
    const b = new Book(chapters, { charsPerLine: 30, linesPerPage: 10 });
    const page = b.pageOfPosition(pos);
    expect(b.positionOfPage(page).charOffset).toBeLessThanOrEqual(pos.charOffset);
  });

  it('chapterStartPage 返回章首页码', () => {
    const book = new Book([mk(30), mk(30)], layout);
    expect(book.chapterStartPage(0)).toBe(0);
    expect(book.chapterStartPage(1)).toBe(1); // 第 2 章从第 30 行开始 → 页 1
  });

  it('空书也有 1 页且不崩溃', () => {
    const book = new Book([{ title: 'x', text: '' }], layout);
    expect(book.totalPages).toBe(1);
    expect(book.getPage(0)).toEqual([]);
    expect(book.positionOfPage(0)).toEqual({ chapterIndex: 0, charOffset: 0 });
  });
});
```

- [ ] **Step 2: 运行确认新用例失败**

Run: `npx vitest run src/book.test.ts`
Expected: 原 4 个 pass，新 5 个 FAIL（Book 不存在）。

- [ ] **Step 3: 在 `src/book.ts` 末尾追加 Book 类**

```typescript
export class Book {
  private readonly lines: BookLine[];
  private readonly linesPerPage: number;

  constructor(readonly chapters: Chapter[], layout: Layout) {
    this.lines = buildLines(chapters, layout.charsPerLine);
    this.linesPerPage = layout.linesPerPage;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.lines.length / this.linesPerPage));
  }

  get chapterTitles(): string[] {
    return this.chapters.map(c => c.title);
  }

  getPage(page: number): string[] {
    return this.lines
      .slice(page * this.linesPerPage, (page + 1) * this.linesPerPage)
      .map(l => l.text);
  }

  /** 页首行对应的位置（用于持久化进度，与布局无关） */
  positionOfPage(page: number): Position {
    const line = this.lines[page * this.linesPerPage];
    return line
      ? { chapterIndex: line.chapterIndex, charOffset: line.charOffset }
      : { chapterIndex: 0, charOffset: 0 };
  }

  /** 找到覆盖该位置的页（恢复进度 / 布局变化后换算） */
  pageOfPosition(pos: Position): number {
    const idx = this.lines.findIndex(
      l =>
        l.chapterIndex > pos.chapterIndex ||
        (l.chapterIndex === pos.chapterIndex &&
          l.charOffset + l.text.length > pos.charOffset)
    );
    return idx === -1 ? this.totalPages - 1 : Math.floor(idx / this.linesPerPage);
  }

  chapterStartPage(chapterIndex: number): number {
    const idx = this.lines.findIndex(l => l.chapterIndex >= chapterIndex);
    return idx === -1 ? this.totalPages - 1 : Math.floor(idx / this.linesPerPage);
  }
}
```

- [ ] **Step 4: 运行确认全部通过**

Run: `npx vitest run src/book.test.ts`
Expected: 9 passed。

- [ ] **Step 5: Commit**

```bash
git add src/book.ts src/book.test.ts
git commit -m "feat: pagination engine with layout-independent positions"
```

---

### Task 4: `epubParser.ts` — EPUB 解析

**Files:**
- Create: `src/epubParser.ts`
- Test: `src/epubParser.test.ts`

EPUB = zip 包。流程：`META-INF/container.xml` → OPF 路径 → OPF 的 `<manifest>`（id→href）与 `<spine>`（阅读顺序）→ 逐章读 XHTML 抽纯文本。

- [ ] **Step 1: 写失败测试 `src/epubParser.test.ts`（fixture 用 jszip 现场构造）**

```typescript
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseEpubBuffer, htmlToText } from './epubParser';

async function makeEpub(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
  );
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>测试之书</dc:title></metadata><manifest><item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>`
  );
  zip.file(
    'OEBPS/ch1.xhtml',
    `<html><body><h1>第一章 雪夜</h1><p>风雪山神庙。</p><p>林冲&amp;鲁智深。</p></body></html>`
  );
  zip.file(
    'OEBPS/ch2.xhtml',
    `<html><body><h2>第二章</h2><p>第二章内容。</p></body></html>`
  );
  return zip.generateAsync({ type: 'uint8array' });
}

describe('htmlToText', () => {
  it('块级闭合转换行、剥标签、解实体、去空行', () => {
    expect(htmlToText('<p>甲&amp;乙</p><p> </p><div>丙<br/>丁</div>')).toBe('甲&乙\n丙\n丁');
  });
});

describe('parseEpubBuffer', () => {
  it('按 spine 顺序解析章节并抽取纯文本', async () => {
    const book = await parseEpubBuffer(await makeEpub());
    expect(book.title).toBe('测试之书');
    expect(book.chapters).toHaveLength(2);
    expect(book.chapters[0].title).toBe('第一章 雪夜');
    expect(book.chapters[0].text).toBe('第一章 雪夜\n风雪山神庙。\n林冲&鲁智深。');
    expect(book.chapters[1].text).toContain('第二章内容。');
  });

  it('损坏的文件抛错而非崩溃', async () => {
    await expect(parseEpubBuffer(new Uint8Array([1, 2, 3]))).rejects.toThrow();
  });

  it('缺少 container.xml 时给出友好错误', async () => {
    const zip = new JSZip();
    zip.file('hello.txt', 'hi');
    await expect(
      parseEpubBuffer(await zip.generateAsync({ type: 'uint8array' }))
    ).rejects.toThrow('container.xml');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/epubParser.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现 `src/epubParser.ts`**

```typescript
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { promises as fs } from 'fs';
import { Chapter } from './book';

export interface ParsedBook {
  title: string;
  chapters: Chapter[];
}

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function asArray<T>(v: T | T[] | undefined): T[] {
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

/** XHTML → 纯文本：块级闭合转换行，剥标签，解常见实体，去空白行 */
export function htmlToText(html: string): string {
  let s = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<(br|\/p|\/div|\/h[1-6]|\/li)[^>]*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
  return s
    .split('\n')
    .map(l => l.trim())
    .filter(l => l !== '')
    .join('\n');
}

function firstHeading(html: string): string | null {
  const m = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  if (!m) return null;
  const t = htmlToText(m[1]).trim();
  return t || null;
}

export async function parseEpubBuffer(data: Uint8Array): Promise<ParsedBook> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error('不是有效的 EPUB 文件（无法解压）');
  }

  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('不是有效的 EPUB：缺少 META-INF/container.xml');
  const container = xml.parse(await containerFile.async('text'));
  const rootfile = asArray(container?.container?.rootfiles?.rootfile)[0] as
    | Record<string, string>
    | undefined;
  const opfPath = rootfile?.['@_full-path'];
  const opfFile = opfPath ? zip.file(opfPath) : null;
  if (!opfFile) throw new Error('不是有效的 EPUB：找不到 OPF 清单');

  const opf = xml.parse(await opfFile.async('text'));
  const pkg = opf.package;
  if (!pkg) throw new Error('不是有效的 EPUB：OPF 格式异常');
  const opfDir = opfPath!.includes('/') ? opfPath!.slice(0, opfPath!.lastIndexOf('/') + 1) : '';

  const manifest = new Map<string, string>();
  for (const item of asArray<Record<string, string>>(pkg.manifest?.item)) {
    manifest.set(item['@_id'], item['@_href']);
  }

  const chapters: Chapter[] = [];
  for (const ref of asArray<Record<string, string>>(pkg.spine?.itemref)) {
    const href = manifest.get(ref['@_idref']);
    if (!href) continue;
    const file = zip.file(decodeURIComponent(opfDir + href));
    if (!file) continue;
    const html = await file.async('text');
    const text = htmlToText(html);
    if (!text) continue;
    chapters.push({
      title: firstHeading(html) ?? `第 ${chapters.length + 1} 节`,
      text,
    });
  }
  if (chapters.length === 0) throw new Error('EPUB 中没有可读取的章节');

  const dcTitle = pkg.metadata?.['dc:title'];
  const title =
    (typeof dcTitle === 'string' ? dcTitle : dcTitle?.['#text']) ?? '未知书名';
  return { title: String(title), chapters };
}

export async function parseEpub(filePath: string): Promise<ParsedBook> {
  return parseEpubBuffer(await fs.readFile(filePath));
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/epubParser.test.ts`
Expected: 4 passed。

- [ ] **Step 5: Commit**

```bash
git add src/epubParser.ts src/epubParser.test.ts
git commit -m "feat: epub parser (container -> opf -> spine -> plain text)"
```

---

### Task 5: `positionStore.ts` — 进度存储

**Files:**
- Create: `src/positionStore.ts`
- Test: `src/positionStore.test.ts`

为可单测，不直接依赖 vscode：定义 `KeyValueStore` 接口，运行时传入 `context.globalState`（结构兼容），测试传 fake。

- [ ] **Step 1: 写失败测试 `src/positionStore.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { PositionStore, KeyValueStore } from './positionStore';

class FakeStore implements KeyValueStore {
  private m = new Map<string, unknown>();
  get<T>(key: string): T | undefined {
    return this.m.get(key) as T | undefined;
  }
  async update(key: string, value: unknown): Promise<void> {
    if (value === undefined) this.m.delete(key);
    else this.m.set(key, value);
  }
}

describe('PositionStore', () => {
  it('保存后能读回，clear 后为空', async () => {
    const store = new PositionStore(new FakeStore());
    expect(store.load()).toBeNull();

    const state = {
      bookPath: 'C:/books/a.epub',
      position: { chapterIndex: 2, charOffset: 99 },
    };
    await store.save(state);
    expect(store.load()).toEqual(state);

    await store.clear();
    expect(store.load()).toBeNull();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/positionStore.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现 `src/positionStore.ts`**

```typescript
import { Position } from './book';

export interface ReadingState {
  bookPath: string;
  position: Position;
}

/** vscode.Memento 的最小结构子集，便于脱离 vscode 单测 */
export interface KeyValueStore {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): Thenable<void>;
}

const KEY = 'stealthReader.state';

export class PositionStore {
  constructor(private store: KeyValueStore) {}

  async save(state: ReadingState): Promise<void> {
    await this.store.update(KEY, state);
  }

  load(): ReadingState | null {
    return this.store.get<ReadingState>(KEY) ?? null;
  }

  async clear(): Promise<void> {
    await this.store.update(KEY, undefined);
  }
}
```

- [ ] **Step 4: 运行全部测试确认通过**

Run: `npx vitest run`
Expected: book 9 + epubParser 4 + positionStore 1 = 14 passed。

- [ ] **Step 5: Commit**

```bash
git add src/positionStore.ts src/positionStore.test.ts
git commit -m "feat: reading position persistence"
```

---

### Task 6: `renderer.ts` — 虚拟文档与装饰渲染

**Files:**
- Create: `src/renderer.ts`

VSCode 层，无单测（Task 8 手动冒烟覆盖）。关键点：只读虚拟文档（无 dirty 状态）、`after` 装饰、`white-space: pre` 防空格折叠。

- [ ] **Step 1: 实现 `src/renderer.ts`**

```typescript
import * as vscode from 'vscode';

export const SCHEME = 'stealth-reader';
const DOC_NAME = 'util.py'; // 标签页显示的伪装文件名，.py 让语言推断为 python

/** 只读虚拟文档：内容只有空行，装饰画在空行上，文件本体零内容零痕迹 */
export class StealthDocProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;
  linesPerPage = 25;

  provideTextDocumentContent(): string {
    // N 个换行 → N+1 行：0..N-1 给正文，第 N 行给页码指示
    return '\n'.repeat(this.linesPerPage);
  }

  refresh(uri: vscode.Uri): void {
    this._onDidChange.fire(uri);
  }
}

export function commentPrefixFor(languageId: string): string {
  return ['python', 'shellscript', 'yaml', 'ruby', 'perl', 'r'].includes(languageId)
    ? '#'
    : '//';
}

export class Renderer implements vscode.Disposable {
  readonly uri = vscode.Uri.parse(`${SCHEME}:/${DOC_NAME}`);
  private decoType = vscode.window.createTextEditorDecorationType({});

  constructor(private provider: StealthDocProvider) {}

  async openEditor(linesPerPage: number): Promise<vscode.TextEditor> {
    if (this.provider.linesPerPage !== linesPerPage) {
      this.provider.linesPerPage = linesPerPage;
      this.provider.refresh(this.uri);
    }
    const doc = await vscode.workspace.openTextDocument(this.uri);
    return vscode.window.showTextDocument(doc, { preview: false });
  }

  show(editor: vscode.TextEditor, lines: string[], color: string, prefix: string): void {
    const decorations: vscode.DecorationOptions[] = lines.map((line, i) => ({
      range: new vscode.Range(i, 0, i, 0),
      renderOptions: {
        after: {
          contentText: line === '' ? '' : `${prefix} ${line}`,
          color,
          // white-space: pre 防止 contentText 中连续空格被折叠
          textDecoration: 'none; white-space: pre;',
        },
      },
    }));
    editor.setDecorations(this.decoType, decorations);
  }

  clear(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.scheme === SCHEME) {
        editor.setDecorations(this.decoType, []);
      }
    }
  }

  async closeStealthTabs(): Promise<void> {
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (tab.input instanceof vscode.TabInputText && tab.input.uri.scheme === SCHEME) {
          await vscode.window.tabGroups.close(tab);
        }
      }
    }
  }

  dispose(): void {
    this.decoType.dispose();
  }
}
```

- [ ] **Step 2: 编译验证**

Run: `npm run compile`
Expected: 无错误，`out/renderer.js` 生成。

- [ ] **Step 3: Commit**

```bash
git add src/renderer.ts
git commit -m "feat: readonly virtual doc provider and decoration renderer"
```

---

### Task 7: `controller.ts` + `extension.ts` — 命令调度与接线

**Files:**
- Create: `src/controller.ts`
- Create: `src/extension.ts`

- [ ] **Step 1: 实现 `src/controller.ts`**

```typescript
import * as vscode from 'vscode';
import { Book, Layout, Position } from './book';
import { parseEpub } from './epubParser';
import { PositionStore } from './positionStore';
import { Renderer, SCHEME, commentPrefixFor } from './renderer';

export class ReaderController {
  private book: Book | null = null;
  private bookPath = '';
  private page = 0;

  constructor(private renderer: Renderer, private store: PositionStore) {}

  private config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('stealthReader');
  }

  private layout(): Layout {
    const cfg = this.config();
    return {
      charsPerLine: cfg.get('charsPerLine', 40),
      linesPerPage: cfg.get('linesPerPage', 25),
    };
  }

  async openBook(): Promise<void> {
    const picked = await vscode.window.showOpenDialog({
      filters: { 'EPUB 电子书': ['epub'] },
      canSelectMany: false,
    });
    if (!picked?.length) return;
    await this.loadBook(picked[0].fsPath, null);
  }

  async nextPage(): Promise<void> {
    await this.turnPage(1);
  }

  async prevPage(): Promise<void> {
    await this.turnPage(-1);
  }

  /** 老板键：清装饰 + 关伪装标签页；书还在内存里，再按翻页键即恢复 */
  async bossKey(): Promise<void> {
    this.renderer.clear();
    await this.renderer.closeStealthTabs();
  }

  async gotoChapter(): Promise<void> {
    if (!(await this.ensureBook())) return;
    const items = this.book!.chapterTitles.map((title, index) => ({
      label: title,
      index,
    }));
    const picked = await vscode.window.showQuickPick(items, { placeHolder: '跳转到章节' });
    if (!picked) return;
    this.page = this.book!.chapterStartPage(picked.index);
    await this.render();
  }

  /** 配置变化：以字符偏移保持位置，重建分页 */
  async onConfigChanged(): Promise<void> {
    if (!this.book) return;
    const pos = this.book.positionOfPage(this.page);
    this.book = new Book(this.book.chapters, this.layout());
    this.page = this.book.pageOfPosition(pos);
    await this.render();
  }

  /** 切走再切回伪装标签页时，重新应用装饰 */
  reapply(): void {
    const editor = this.findStealthEditor();
    if (editor && this.book) this.showPage(editor);
  }

  private async turnPage(delta: number): Promise<void> {
    if (!(await this.ensureBook())) return;
    const next = this.page + delta;
    if (next < 0 || next >= this.book!.totalPages) return;
    this.page = next;
    await this.render();
  }

  private findStealthEditor(): vscode.TextEditor | undefined {
    return vscode.window.visibleTextEditors.find(
      e => e.document.uri.scheme === SCHEME
    );
  }

  /** 无书时尝试从存档恢复；存档也没有则提示 */
  private async ensureBook(): Promise<boolean> {
    if (this.book) return true;
    const saved = this.store.load();
    if (!saved) {
      void vscode.window.showInformationMessage(
        '先通过命令面板执行 “Stealth Reader: Open Book” 打开一本书'
      );
      return false;
    }
    await this.loadBook(saved.bookPath, saved.position);
    return this.book !== null;
  }

  private async loadBook(fsPath: string, pos: Position | null): Promise<void> {
    try {
      const parsed = await parseEpub(fsPath);
      this.book = new Book(parsed.chapters, this.layout());
      this.bookPath = fsPath;
      this.page = pos ? this.book.pageOfPosition(pos) : 0;
      await vscode.commands.executeCommand('setContext', 'stealthReader.active', true);
      await this.render();
    } catch (e) {
      this.book = null;
      await this.store.clear();
      void vscode.window.showErrorMessage(
        `打开书籍失败：${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  private async render(): Promise<void> {
    if (!this.book) return;
    const editor = await this.renderer.openEditor(this.layout().linesPerPage);
    this.showPage(editor);
    await this.store.save({
      bookPath: this.bookPath,
      position: this.book.positionOfPage(this.page),
    });
  }

  private showPage(editor: vscode.TextEditor): void {
    const cfg = this.config();
    const prefixCfg = cfg.get<string>('commentPrefix', 'auto');
    const prefix =
      prefixCfg === 'auto' ? commentPrefixFor(editor.document.languageId) : prefixCfg;
    const lines = [
      ...this.book!.getPage(this.page),
      `· ${this.page + 1}/${this.book!.totalPages}`,
    ];
    this.renderer.show(editor, lines, cfg.get('textColor', '#6A9955'), prefix);
  }
}
```

- [ ] **Step 2: 实现 `src/extension.ts`**

```typescript
import * as vscode from 'vscode';
import { ReaderController } from './controller';
import { PositionStore } from './positionStore';
import { Renderer, SCHEME, StealthDocProvider } from './renderer';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new StealthDocProvider();
  const renderer = new Renderer(provider);
  const store = new PositionStore(context.globalState);
  const controller = new ReaderController(renderer, store);

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(SCHEME, provider),
    renderer,
    vscode.commands.registerCommand('stealthReader.openBook', () => controller.openBook()),
    vscode.commands.registerCommand('stealthReader.nextPage', () => controller.nextPage()),
    vscode.commands.registerCommand('stealthReader.prevPage', () => controller.prevPage()),
    vscode.commands.registerCommand('stealthReader.bossKey', () => controller.bossKey()),
    vscode.commands.registerCommand('stealthReader.gotoChapter', () => controller.gotoChapter()),
    vscode.window.onDidChangeVisibleTextEditors(() => controller.reapply()),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('stealthReader')) void controller.onConfigChanged();
    })
  );

  // 有存档时激活快捷键上下文，按 Alt+] 即可直接续读
  if (store.load()) {
    void vscode.commands.executeCommand('setContext', 'stealthReader.active', true);
  }
}

export function deactivate(): void {}
```

- [ ] **Step 3: 编译 + 全量测试**

Run: `npm run compile && npm test`
Expected: 编译无错误；14 个测试全部通过。

- [ ] **Step 4: Commit**

```bash
git add src/controller.ts src/extension.ts
git commit -m "feat: reader controller, commands and extension wiring"
```

---

### Task 8: 样例书 + 手动冒烟测试

**Files:**
- Create: `scripts/make-sample-epub.mjs`

- [ ] **Step 1: 创建 `scripts/make-sample-epub.mjs`**

```javascript
// 生成一本用于手动测试的中文样例书（5 章 × 40 段）
import JSZip from 'jszip';
import { writeFileSync } from 'node:fs';

const zip = new JSZip();
zip.file('mimetype', 'application/epub+zip');
zip.file(
  'META-INF/container.xml',
  `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
);

const chapters = Array.from({ length: 5 }, (_, i) => {
  const n = i + 1;
  const paras = Array.from(
    { length: 40 },
    (_, j) =>
      `<p>第${n}章第${j + 1}段：山间小路蜿蜒曲折，行人三三两两，远处炊烟袅袅升起，倦鸟归林，暮色四合，正是赶路人投宿的时辰。</p>`
  ).join('');
  return {
    id: `c${n}`,
    href: `ch${n}.xhtml`,
    html: `<html><body><h1>第${n}章 测试章节</h1>${paras}</body></html>`,
  };
});
for (const c of chapters) zip.file(`OEBPS/${c.href}`, c.html);
zip.file(
  'OEBPS/content.opf',
  `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>样例书</dc:title></metadata><manifest>${chapters
    .map(c => `<item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`)
    .join('')}</manifest><spine>${chapters
    .map(c => `<itemref idref="${c.id}"/>`)
    .join('')}</spine></package>`
);

writeFileSync('sample.epub', await zip.generateAsync({ type: 'nodebuffer' }));
console.log('sample.epub 已生成');
```

- [ ] **Step 2: 生成样例书**

Run: `node scripts/make-sample-epub.mjs`
Expected: 输出 `sample.epub 已生成`，项目根目录出现 `sample.epub`（已在 .gitignore）。

- [ ] **Step 3: F5 手动冒烟（在扩展开发宿主窗口逐项验证）**

按 F5 启动扩展开发宿主，逐项检查：

1. 命令面板 → `Stealth Reader: Open Book` → 选 `sample.epub` → 出现标签页 `util.py`，正文以 `# 第1章…` 注释样式显示，末行有 `· 1/N` 页码。
2. `Alt+]` 翻下页、`Alt+[` 翻上页，首页/末页越界不报错。
3. `Alt+Q` 老板键：标签页立即关闭，焦点回到之前的编辑器，无“是否保存”弹窗。
4. 再按 `Alt+]`：自动重开伪装页并停在原页（续读）。
5. 命令面板 → `Go to Chapter` → 选“第3章” → 跳到该章首页。
6. 切到别的标签页再切回 `util.py`，正文仍在（装饰重新应用）。
7. 设置中把 `stealthReader.charsPerLine` 改为 30 → 页面重排，阅读位置基本不变。
8. 重启扩展开发宿主窗口 → 直接按 `Alt+]` → 恢复到上次位置。
9. 隐蔽性检查：`util.py` 标签无修改圆点；选一个真实工作区跑 `git status` 无新增文件。
10. 错误处理：把一个 .txt 改名为 .epub 打开 → 弹出“打开书籍失败”，不崩溃。

任何一项不符 → 修复后重跑该项，再继续。

- [ ] **Step 4: Commit**

```bash
git add scripts/make-sample-epub.mjs
git commit -m "test: sample epub generator and manual smoke pass"
```

---

### Task 9: 打包 VSIX

**Files:**
- Create: `LICENSE`（vsce 要求）、`README.md`（vsce 警告）

- [ ] **Step 1: 创建占位 `README.md`**

```markdown
# Util Helper

Editor productivity helper.
```

（README 故意不写实际用途，保持低调。）

- [ ] **Step 2: 创建 `LICENSE`**

```
MIT License

Copyright (c) 2026 xxloveslife

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: 打包**

```bash
npx @vscode/vsce package
```

Expected: 生成 `stealth-reader-0.0.1.vsix`。若报 repository 缺失警告可忽略（仅本地安装，不发布 Marketplace）。

- [ ] **Step 4: 本地安装验证**

```bash
code --install-extension stealth-reader-0.0.1.vsix
```

重启 VSCode（非开发宿主），重复 Task 8 冒烟项 1–4。

- [ ] **Step 5: Commit**

```bash
git add README.md LICENSE
git commit -m "chore: package metadata for local vsix install"
```

---

## 偏离 spec 的说明

- spec 第 8 节提到 renderer 用“VSCode 扩展集成测试”验证。本计划改为 Task 8 的系统化手动冒烟清单：v1 搭 `@vscode/test-electron` 收益低于成本，纯逻辑层已有完整单测覆盖。
- 不发布 Marketplace（隐蔽性插件公开发布反而暴露），交付物是本地安装的 `.vsix`。
