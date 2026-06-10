export interface Chapter {
  title: string;
  text: string;
}

export interface Layout {
  charsPerLine: number;
  linesPerPage: number;
  widthJitter?: number;
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

/** mulberry32：确定性伪随机，固定种子，保证 widthJitter 结果稳定 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 把各章文本按显示宽度断成行；容量 = charsPerLine * 2 个半角单元
 *  widthJitter > 0 时每行容量在均值附近随机扰动，使右边缘参差；0 则与旧行为完全一致 */
export function buildLines(chapters: Chapter[], charsPerLine: number, widthJitter = 0): BookLine[] {
  const baseCapacity = Math.max(2, charsPerLine * 2);
  const rand = widthJitter > 0 ? mulberry32(0x1234abcd) : null;
  const nextCapacity = (): number => {
    if (rand === null) return baseCapacity;
    return Math.max(2, Math.round(baseCapacity * (1 + widthJitter * (rand() * 2 - 1))));
  };
  const lines: BookLine[] = [];
  chapters.forEach((chapter, chapterIndex) => {
    let offset = 0;
    for (const para of chapter.text.split('\n')) {
      if (para.trim() !== '') {
        let cur = '';
        let curWidth = 0;
        let curStart = offset;
        let pos = offset;
        let capacity = nextCapacity();
        for (const c of para) {
          const w = charWidth(c);
          if (curWidth + w > capacity) {
            lines.push({ text: cur, chapterIndex, charOffset: curStart });
            cur = '';
            curWidth = 0;
            curStart = pos;
            capacity = nextCapacity();
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

export class Book {
  private readonly lines: BookLine[];
  private readonly linesPerPage: number;

  constructor(readonly chapters: Chapter[], layout: Layout) {
    this.lines = buildLines(chapters, layout.charsPerLine, layout.widthJitter ?? 0);
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
