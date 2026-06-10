import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseEpubBuffer, htmlToText } from './epubParser';

async function makeEpub(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
  );
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>测试之书</dc:title></metadata><manifest><item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>`
  );
  zip.file(
    'OEBPS/ch1.xhtml',
    `<html><body><h1>第一章 雪夜</h1><p>风雪山神庙。</p><p>林冲&amp;鲁智深。</p></body></html>`
  );
  zip.file(
    'OEBPS/ch2.xhtml',
    `<html><body><h2>第二章</h2><p>第二章内容。</p></body></html>`
  );
  return zip.generateAsync({ type: 'uint8array' });
}

describe('htmlToText', () => {
  it('块级闭合转换行、剥标签、解实体、去空行', () => {
    expect(htmlToText('<p>甲&amp;乙</p><p> </p><div>丙<br/>丁</div>')).toBe('甲&乙\n丙\n丁');
  });
});

describe('parseEpubBuffer', () => {
  it('按 spine 顺序解析章节并抽取纯文本', async () => {
    const book = await parseEpubBuffer(await makeEpub());
    expect(book.title).toBe('测试之书');
    expect(book.chapters).toHaveLength(2);
    expect(book.chapters[0].title).toBe('第一章 雪夜');
    expect(book.chapters[0].text).toBe('第一章 雪夜\n风雪山神庙。\n林冲&鲁智深。');
    expect(book.chapters[1].text).toContain('第二章内容。');
  });

  it('损坏的文件抛错而非崩溃', async () => {
    await expect(parseEpubBuffer(new Uint8Array([1, 2, 3]))).rejects.toThrow();
  });

  it('缺少 container.xml 时给出友好错误', async () => {
    const zip = new JSZip();
    zip.file('hello.txt', 'hi');
    await expect(
      parseEpubBuffer(await zip.generateAsync({ type: 'uint8array' }))
    ).rejects.toThrow('container.xml');
  });
});
