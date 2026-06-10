import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { promises as fs } from 'fs';
import { Chapter } from './book';

export interface ParsedBook {
  title: string;
  chapters: Chapter[];
}

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function asArray<T>(v: T | T[] | undefined): T[] {
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

/** XHTML → 纯文本：块级闭合转换行，剥标签，解常见实体，去空白行 */
export function htmlToText(html: string): string {
  let s = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<(br|\/p|\/div|\/h[1-6]|\/li)[^>]*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
  return s
    .split('\n')
    .map(l => l.trim())
    .filter(l => l !== '')
    .join('\n');
}

function firstHeading(html: string): string | null {
  const m = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  if (!m) return null;
  const t = htmlToText(m[1]).trim();
  return t || null;
}

export async function parseEpubBuffer(data: Uint8Array): Promise<ParsedBook> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error('不是有效的 EPUB 文件（无法解压）');
  }

  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('不是有效的 EPUB：缺少 META-INF/container.xml');
  const container = xml.parse(await containerFile.async('text'));
  const rootfile = asArray(container?.container?.rootfiles?.rootfile)[0] as
    | Record<string, string>
    | undefined;
  const opfPath = rootfile?.['@_full-path'];
  const opfFile = opfPath ? zip.file(opfPath) : null;
  if (!opfFile) throw new Error('不是有效的 EPUB：找不到 OPF 清单');

  const opf = xml.parse(await opfFile.async('text'));
  const pkg = opf.package;
  if (!pkg) throw new Error('不是有效的 EPUB：OPF 格式异常');
  const opfDir = opfPath!.includes('/') ? opfPath!.slice(0, opfPath!.lastIndexOf('/') + 1) : '';

  const manifest = new Map<string, string>();
  for (const item of asArray<Record<string, string>>(pkg.manifest?.item)) {
    manifest.set(item['@_id'], item['@_href']);
  }

  const chapters: Chapter[] = [];
  for (const ref of asArray<Record<string, string>>(pkg.spine?.itemref)) {
    const href = manifest.get(ref['@_idref']);
    if (!href) continue;
    const file = zip.file(decodeURIComponent(opfDir + href));
    if (!file) continue;
    const html = await file.async('text');
    const text = htmlToText(html);
    if (!text) continue;
    chapters.push({
      title: firstHeading(html) ?? `第 ${chapters.length + 1} 节`,
      text,
    });
  }
  if (chapters.length === 0) throw new Error('EPUB 中没有可读取的章节');

  const dcTitle = pkg.metadata?.['dc:title'];
  const title =
    (typeof dcTitle === 'string' ? dcTitle : dcTitle?.['#text']) ?? '未知书名';
  return { title: String(title), chapters };
}

export async function parseEpub(filePath: string): Promise<ParsedBook> {
  return parseEpubBuffer(await fs.readFile(filePath));
}
