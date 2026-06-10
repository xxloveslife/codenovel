// 生成一本用于手动测试的中文样例书（5 章 × 40 段）
import JSZip from 'jszip';
import { writeFileSync } from 'node:fs';

const zip = new JSZip();
zip.file('mimetype', 'application/epub+zip');
zip.file(
  'META-INF/container.xml',
  `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
);

const chapters = Array.from({ length: 5 }, (_, i) => {
  const n = i + 1;
  const paras = Array.from(
    { length: 40 },
    (_, j) =>
      `<p>第${n}章第${j + 1}段：山间小路蜿蜒曲折，行人三三两两，远处炊烟袅袅升起，倦鸟归林，暮色四合，正是赶路人投宿的时辰。</p>`
  ).join('');
  return {
    id: `c${n}`,
    href: `ch${n}.xhtml`,
    html: `<html><body><h1>第${n}章 测试章节</h1>${paras}</body></html>`,
  };
});
for (const c of chapters) zip.file(`OEBPS/${c.href}`, c.html);
zip.file(
  'OEBPS/content.opf',
  `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>样例书</dc:title></metadata><manifest>${chapters
    .map(c => `<item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`)
    .join('')}</manifest><spine>${chapters
    .map(c => `<itemref idref="${c.id}"/>`)
    .join('')}</spine></package>`
);

writeFileSync('sample.epub', await zip.generateAsync({ type: 'nodebuffer' }));
console.log('sample.epub 已生成');
