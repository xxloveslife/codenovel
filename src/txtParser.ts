import { promises as fs } from 'fs';
import { basename, extname } from 'path';
import { Chapter } from './book';
import { ParsedBook } from './epubParser';

export interface TxtOptions {
  fileName: string;
  split: boolean;
  pattern?: string;
}

// 内置章节标题：独占整行、较短。覆盖「第X章/回/节/卷/集/部/篇」与「Chapter N」「卷X」。
const BUILTIN = '^[\\t \\u3000]*(?:第[0-9零一二三四五六七八九十百千两亿]+[章回节卷集部篇]|Chapter\\s+\\d+|卷[0-9一二三四五六七八九十]+)[^\\n]{0,30}$';

/** 按 BOM / 严格 UTF-8 / GBK 顺序解码 */
function decodeTxt(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe)
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff)
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    try { return new TextDecoder('gbk').decode(bytes); }
    catch { return new TextDecoder('utf-8').decode(bytes); }
  }
}

/** 切分；返回切出的章节（text 含标题行），matches 为空则返回 null（交由上层兜底） */
function splitByRegex(text: string, re: RegExp, fileName: string): Chapter[] | null {
  const matches = [...text.matchAll(re)];
  if (matches.length === 0) return null;
  const chapters: Chapter[] = [];
  const preface = text.slice(0, matches[0].index!).trim();
  if (preface) chapters.push({ title: '前言', text: preface });
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const block = text.slice(start, end).trim();
    const nl = block.indexOf('\n');
    const title = (nl === -1 ? block : block.slice(0, nl)).trim();
    chapters.push({ title: title || fileName, text: block });
  }
  return chapters;
}

/** 误切检测：排除「前言」后，正文体（去掉标题行后的内容）极短（<10 去空白字符）的章占比过半 → 判为误切 */
function looksMisSplit(chapters: Chapter[]): boolean {
  const real = chapters.filter(c => c.title !== '前言');
  if (real.length < 2) return false;
  const tiny = real.filter(c => {
    // 去掉首行（标题行），只看正文体长度
    const nl = c.text.indexOf('\n');
    const body = nl === -1 ? '' : c.text.slice(nl + 1);
    return body.replace(/\s/g, '').length < 10;
  }).length;
  return tiny / real.length > 0.5;
}

export function parseTxtBuffer(data: Uint8Array, opts: TxtOptions): ParsedBook {
  const text = decodeTxt(data).replace(/\r\n?/g, '\n').trim();
  const whole = (): ParsedBook => ({ title: opts.fileName, chapters: [{ title: opts.fileName, text }] });

  if (!opts.split) return whole();

  let re: RegExp;
  let custom = false;
  if (opts.pattern) {
    try { re = new RegExp(opts.pattern, 'gm'); custom = true; }
    catch { re = new RegExp(BUILTIN, 'gm'); }
  } else {
    re = new RegExp(BUILTIN, 'gm');
  }

  const chapters = splitByRegex(text, re, opts.fileName);
  if (!chapters) return whole();
  // 自定义正则信任用户，跳过合理性校验；内置切分才做误切兜底
  if (!custom && looksMisSplit(chapters)) return whole();
  return { title: opts.fileName, chapters };
}

export async function parseTxt(filePath: string, opts?: { split?: boolean; pattern?: string }): Promise<ParsedBook> {
  const data = await fs.readFile(filePath);
  const fileName = basename(filePath, extname(filePath));
  return parseTxtBuffer(data, { fileName, split: opts?.split ?? true, pattern: opts?.pattern });
}
