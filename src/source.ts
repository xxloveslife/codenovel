import { extname } from 'path';
import { parseEpub, ParsedBook } from './epubParser';
import { parseTxt } from './txtParser';

export interface BookSourceOptions {
  chapterSplit: 'auto' | 'off';
  chapterPattern?: string;
}

/** 按扩展名分派到对应解析器，产出统一的 ParsedBook */
export async function parseBook(filePath: string, opts: BookSourceOptions): Promise<ParsedBook> {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.epub') return parseEpub(filePath);
  if (ext === '.txt') {
    return parseTxt(filePath, {
      split: opts.chapterSplit === 'auto',
      pattern: opts.chapterPattern || undefined,
    });
  }
  throw new Error(`不支持的文件格式：${ext || '(无扩展名)'}（目前支持 .epub / .txt）`);
}
