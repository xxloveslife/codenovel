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
