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
