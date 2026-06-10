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

  it('解码 &apos; 与数字/十六进制实体', () => {
    expect(htmlToText('<p>&apos;引&#x6587;&#25991;&apos;</p>')).toBe("'引文文'");
  });

  it('非法码点实体替换为 U+FFFD 而不崩溃', () => {
    expect(htmlToText('<p>甲&#x110000;乙&#9999999;丙</p>')).toBe('甲�乙�丙');
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

  it('单章节（manifest/spine 非数组路径）也能解析', async () => {
    const zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip');
    zip.file(
      'META-INF/container.xml',
      `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
    );
    zip.file(
      'content.opf',
      `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>单章书</dc:title></metadata><manifest><item id="c1" href="only.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/></spine></package>`
    );
    zip.file('only.xhtml', `<html><body><p>唯一内容</p></body></html>`);
    const book = await parseEpubBuffer(await zip.generateAsync({ type: 'uint8array' }));
    expect(book.chapters).toHaveLength(1);
    expect(book.chapters[0].text).toBe('唯一内容');
  });

  it('GBK 编码的章节按声明解码', async () => {
    const zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip');
    zip.file(
      'META-INF/container.xml',
      `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
    );
    zip.file(
      'content.opf',
      `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>GBK书</dc:title></metadata><manifest><item id="c1" href="gbk.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/></spine></package>`
    );
    // GBK bytes for 中文内容: D6D0 CEC4 C4DA C8DD
    const head = Buffer.from(`<?xml version="1.0" encoding="gbk"?><html><body><p>`, 'ascii');
    const cjk = Buffer.from([0xd6, 0xd0, 0xce, 0xc4, 0xc4, 0xda, 0xc8, 0xdd]);
    const tail = Buffer.from(`</p></body></html>`, 'ascii');
    zip.file('gbk.xhtml', Buffer.concat([head, cjk, tail]));
    const book = await parseEpubBuffer(await zip.generateAsync({ type: 'uint8array' }));
    expect(book.chapters[0].text).toBe('中文内容');
  });
});
