import { describe, it, expect } from 'vitest';
import { parseTxtBuffer } from './txtParser';

const u8 = (s: string) => new TextEncoder().encode(s); // UTF-8

describe('parseTxtBuffer 编码', () => {
  it('去除 UTF-8 BOM', () => {
    const b = new Uint8Array([0xef, 0xbb, 0xbf, ...u8('正文内容')]);
    const r = parseTxtBuffer(b, { fileName: 'a', split: false });
    expect(r.chapters[0].text).toBe('正文内容');
  });
  it('GBK 解码（无 BOM，UTF-8 严格解码失败时回退）', () => {
    // '中文' 的 GBK 字节：D6 D0 CE C4
    const b = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4]);
    const r = parseTxtBuffer(b, { fileName: 'a', split: false });
    expect(r.chapters[0].text).toBe('中文');
  });
});

describe('parseTxtBuffer 章节切分', () => {
  const book = (s: string, opts: any = {}) =>
    parseTxtBuffer(u8(s), { fileName: '书名', split: true, ...opts });

  it('独占整行的标题被切，句中的"第X章"不被切', () => {
    const txt = '楔子内容\n第一章 开始\n正文一，他翻到第二章时停下。\n第二章 继续\n正文二';
    const r = book(txt);
    const titles = r.chapters.map(c => c.title);
    expect(titles).toContain('第一章 开始');
    expect(titles).toContain('第二章 继续');
    const ch1 = r.chapters.find(c => c.title === '第一章 开始')!;
    expect(ch1.text).toContain('他翻到第二章时停下');
  });

  it('首个标题前的内容作为「前言」章', () => {
    const r = book('序章的话\n第一章 始\n正文');
    expect(r.chapters[0].title).toBe('前言');
    expect(r.chapters.some(c => c.title === '第一章 始')).toBe(true);
  });

  it('正常多章被正确切分（章节 text 含标题行）', () => {
    const mk = (n: string) => `第${n}章 标题\n` + '正文内容。'.repeat(50);
    const r = book([mk('一'), mk('二'), mk('三')].join('\n'));
    expect(r.chapters).toHaveLength(3);
    expect(r.chapters[0].text.startsWith('第一章 标题')).toBe(true);
  });

  it('无章节标题 → 整本一章，标题用文件名', () => {
    const r = book('没有任何章节标题的纯文本\n第二段也没有');
    expect(r.chapters).toHaveLength(1);
    expect(r.chapters[0].title).toBe('书名');
  });

  it('合理性校验：大量极短「章」判为误切，回退整本一章', () => {
    const lines: string[] = [];
    for (let i = 1; i <= 30; i++) { lines.push(`第${i}章`); lines.push('短'); }
    const r = book(lines.join('\n'));
    expect(r.chapters).toHaveLength(1);
  });

  it('split:false → 整本一章', () => {
    const r = book('第一章 标题\n' + '正文。'.repeat(50), { split: false });
    expect(r.chapters).toHaveLength(1);
  });

  it('自定义正则切分（信任用户，跳过合理性校验）', () => {
    const r = book('=== 卷一 ===\n内容A\n=== 卷二 ===\n内容B', { pattern: '^=== .+ ===$' });
    expect(r.chapters).toHaveLength(2);
    expect(r.chapters[0].title).toBe('=== 卷一 ===');
  });

  it('非法自定义正则 → 回退内置正则', () => {
    const mk = (n: string) => `第${n}章 标题\n` + '正文。'.repeat(50);
    const r = book([mk('一'), mk('二')].join('\n'), { pattern: '([' });
    expect(r.chapters).toHaveLength(2);
  });

  it('CRLF 与 CR 行尾都能识别标题', () => {
    const mk = (n: string) => `第${n}章 标题\r\n` + '正文。'.repeat(50);
    const r = book([mk('一'), mk('二')].join('\r\n'));
    expect(r.chapters).toHaveLength(2);
  });
});

describe('parseTxtBuffer 覆盖补充', () => {
  it('UTF-16 LE BOM 解码', () => {
    // '中' U+4E2D 的 LE 字节：2D 4E
    const b = new Uint8Array([0xff, 0xfe, 0x2d, 0x4e]);
    expect(parseTxtBuffer(b, { fileName: 'a', split: false }).chapters[0].text).toBe('中');
  });
  it('标题作为最后一行（无正文）不崩溃且成章', () => {
    const r = parseTxtBuffer(u8('正文。'.repeat(50) + '\n第二章 末尾'), { fileName: '书', split: true });
    expect(r.chapters.some(c => c.title === '第二章 末尾')).toBe(true);
  });
  it('自定义正则即使产生极短章也被信任（跳过合理性校验）', () => {
    const lines: string[] = [];
    for (let i = 1; i <= 10; i++) { lines.push('## ' + i); lines.push('短'); }
    const r = parseTxtBuffer(u8(lines.join('\n')), { fileName: '书', split: true, pattern: '^## \\d+$' });
    expect(r.chapters).toHaveLength(10);
  });
});
