import { describe, it, expect } from 'vitest';
import { buildLines, Book } from './book';

describe('buildLines 断行', () => {
  it('ASCII 按半角宽度断行（40 字 = 80 半角单元）', () => {
    const lines = buildLines([{ title: 't', text: 'a'.repeat(81) }], 40);
    expect(lines.map(l => l.text)).toEqual(['a'.repeat(80), 'a']);
    expect(lines[1].charOffset).toBe(80);
  });

  it('中文按全角宽度断行', () => {
    const lines = buildLines([{ title: 't', text: '字'.repeat(41) }], 40);
    expect(lines.map(l => l.text)).toEqual(['字'.repeat(40), '字']);
    expect(lines[1].charOffset).toBe(40);
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
    if (page + 1 < b.totalPages) {
      expect(b.positionOfPage(page + 1).charOffset).toBeGreaterThan(pos.charOffset);
    }
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

  it('跨章节位置恢复正确', () => {
    const book = new Book([mk(30), mk(30)], layout);
    const pos = { chapterIndex: 1, charOffset: 0 };
    expect(book.pageOfPosition(pos)).toBe(book.chapterStartPage(1));
  });

  it('超出末尾的位置落到最后一页', () => {
    const book = new Book([mk(30)], layout);
    expect(book.pageOfPosition({ chapterIndex: 5, charOffset: 0 })).toBe(book.totalPages - 1);
    expect(book.pageOfPosition({ chapterIndex: 0, charOffset: 999999 })).toBe(book.totalPages - 1);
  });
});
