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
  const capacity = Math.max(2, charsPerLine * 2);
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
