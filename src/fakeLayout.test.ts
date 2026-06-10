import { describe, it, expect } from 'vitest';
import { buildFakeLayout, DEFAULT_SNIPPETS } from './fakeLayout';

describe('buildFakeLayout', () => {
  it('ratio 0 时退化为纯空行（兼容旧行为）', () => {
    const l = buildFakeLayout(3, 0, []);
    expect(l.content).toBe('\n\n\n');
    expect(l.slotLines).toEqual([0, 1, 2, 3]);
  });

  it('ratio 1 时每个槽位前插一行代码，片段循环使用', () => {
    const l = buildFakeLayout(3, 1, ['a()', 'b()']);
    expect(l.content.split('\n')).toEqual(['a()', '', 'b()', '', 'a()', '', '']);
    expect(l.slotLines).toEqual([1, 3, 5, 6]);
  });

  it('ratio 0.5 时按累积预算每两个槽位插一行代码', () => {
    const l = buildFakeLayout(4, 0.5, ['x = 1']);
    // i=0: budget 0.5; i=1: 1.0 → 插入; i=2: 0.5; i=3: 1.0 → 插入
    expect(l.content.split('\n')).toEqual(['', 'x = 1', '', '', 'x = 1', '', '']);
    expect(l.slotLines).toEqual([0, 2, 3, 5, 6]);
  });

  it('slotLines 数量恒为 linesPerPage + 1（末位给页码指示）', () => {
    for (const ratio of [0, 0.3, 1, 2]) {
      expect(buildFakeLayout(25, ratio, []).slotLines).toHaveLength(26);
    }
  });

  it('空片段数组时使用内置默认片段', () => {
    const l = buildFakeLayout(2, 1, []);
    expect(l.content.split('\n')[0]).toBe(DEFAULT_SNIPPETS[0]);
  });
});
