import { describe, it, expect } from 'vitest';
import { buildFakeLayout, DEFAULT_SNIPPETS } from './fakeLayout';

describe('buildFakeLayout 随机成段混排', () => {
  it('codeBlock 0 时退化为纯空行（关闭混排）', () => {
    const l = buildFakeLayout(3, 4, 0, 0.5, []);
    expect(l.content).toBe('\n\n\n');
    expect(l.slotLines).toEqual([0, 1, 2, 3]);
  });

  it('jitter 0 时完全规整：每 2 行正文插 1 行代码，页首不插', () => {
    const l = buildFakeLayout(4, 2, 1, 0, ['a()', 'b()']);
    expect(l.content.split('\n')).toEqual(['', '', 'a()', '', '', '']);
    expect(l.slotLines).toEqual([0, 1, 3, 4, 5]);
  });

  it('jitter 0 块状多行代码，片段顺序循环', () => {
    const l = buildFakeLayout(3, 1, 2, 0, ['a()', 'b()', 'c()']);
    expect(l.content.split('\n')).toEqual(['', 'a()', 'b()', '', 'c()', 'a()', '', '']);
    expect(l.slotLines).toEqual([0, 3, 6, 7]);
  });

  it('相同入参生成完全相同的布局（确定性）', () => {
    const a = buildFakeLayout(25, 4, 2, 1, []);
    const b = buildFakeLayout(25, 4, 2, 1, []);
    expect(a).toEqual(b);
  });

  it('jitter 1 时块大小有变化但都在合法范围内', () => {
    const l = buildFakeLayout(50, 4, 2, 1, ['x()']);
    const rows = l.content.split('\n');
    expect(l.slotLines).toHaveLength(51);
    // 所有槽位行必须是空行，代码行必须是片段内容
    l.slotLines.forEach(n => expect(rows[n]).toBe(''));
    rows.forEach((r, n) => {
      if (!l.slotLines.includes(n)) expect(r).toBe('x()');
    });
    // 文本块大小应当有变化（jitter 生效）：统计相邻槽位间隔
    const gaps = new Set<number>();
    for (let i = 1; i < l.slotLines.length; i++) gaps.add(l.slotLines[i] - l.slotLines[i - 1]);
    expect(gaps.size).toBeGreaterThan(1);
  });

  it('slotLines 数量恒为 linesPerPage + 1', () => {
    for (const [tb, cb, j] of [[4, 0, 0], [3, 2, 0.5], [1, 5, 1], [2, 1, 0.3]]) {
      expect(buildFakeLayout(25, tb, cb, j, []).slotLines).toHaveLength(26);
    }
  });

  it('非法入参不崩溃', () => {
    const l = buildFakeLayout(2, 0, -3, 9, ['x']);
    expect(l.slotLines).toHaveLength(3);
    expect(l.content).toBe('\n\n');
  });

  it('空片段数组时使用内置默认片段', () => {
    const l = buildFakeLayout(2, 1, 1, 0, []);
    expect(l.content.split('\n')[1]).toBe(DEFAULT_SNIPPETS[0]);
  });
});
