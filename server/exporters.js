// DOCX (standard manuscript format) and EPUB 3 writers. No dependencies.
import { makeZip } from './zip.js';
import { runs } from '../public/manuscript.js';

const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- DOCX ----------
const wRun = (r) => `<w:r>${r.i ? '<w:rPr><w:i/></w:rPr>' : ''}<w:t xml:space="preserve">${x(r.t)}</w:t></w:r>`;
const wPara = (text, style) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${runs(text).map(wRun).join('')}</w:p>`;

export function toDocx(ms) {
  const words = ms.chapters.reduce((n, c) => n + c.words, 0);
  const body = [];
  body.push(wPara(ms.author || '', 'Contact'), wPara(`About ${Math.round(words / 100) * 100} words`, 'Contact'));
  body.push('<w:p><w:pPr><w:spacing w:before="4800"/><w:pStyle w:val="Title"/></w:pPr><w:r><w:t xml:space="preserve">' + x(ms.title) + '</w:t></w:r></w:p>');
  if (ms.author) body.push(wPara(`by ${ms.author}`, 'Byline'));
  ms.chapters.forEach((c) => {
    body.push(`<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t xml:space="preserve">${x(c.title || '')}</w:t></w:r></w:p>`);
    c.scenes.forEach((s, si) => {
      if (si) body.push(wPara('#', 'SceneBreak'));
      s.paras.forEach((p, pi) => body.push(wPara(p, pi === 0 ? 'First' : 'Body')));
    });
  });
  const font = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="480" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Body"><w:name w:val="Body"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:firstLine="720"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="First"><w:name w:val="First Paragraph"/><w:basedOn w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="SceneBreak"><w:name w:val="Scene Break"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Contact"><w:name w:val="Contact"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:line="240" w:lineRule="auto"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:caps/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Byline"><w:name w:val="Byline"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="First"/><w:pPr><w:pageBreakBefore/><w:spacing w:before="2400" w:after="480"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr></w:style>
</w:styles>`;
  const surname = (ms.author || '').trim().split(/\s+/).pop() || '';
  const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:t xml:space="preserve">${x([surname, ms.title].filter(Boolean).join(' / '))} / </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:hdr>`;
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join('')}<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/><w:titlePg/></w:sectPr></w:body></w:document>`;
  return makeZip([
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>' },
    { name: 'word/document.xml', data: doc },
    { name: 'word/styles.xml', data: styles },
    { name: 'word/header1.xml', data: header },
  ]);
}

// ---------- EPUB 3 ----------
const hPara = (p, cls) => `<p${cls ? ` class="${cls}"` : ''}>${runs(p).map((r) => (r.i ? `<em>${x(r.t)}</em>` : x(r.t))).join('')}</p>`;
const page = (title, body) => `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en"><head><meta charset="utf-8"/><title>${x(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>${body}</body></html>`;

export function toEpub(ms, id) {
  const uid = `urn:uuid:writing-studio-${id}`;
  const files = [];
  const chapters = ms.chapters.map((c, i) => {
    const name = `ch${String(i + 1).padStart(3, '0')}.xhtml`;
    const title = c.title || `Section ${i + 1}`;
    const body = `<section epub:type="chapter"><h1>${x(c.title || '')}</h1>${c.scenes.map((s) => s.paras.map((p, pi) => hPara(p, pi === 0 ? 'first' : '')).join('')).join('<p class="break">* * *</p>')}</section>`;
    files.push({ name: `OEBPS/${name}`, data: page(title, body) });
    return { name, title };
  });
  const titlePage = page(ms.title, `<section class="titlepage"><h1>${x(ms.title)}</h1>${ms.author ? `<p class="author">${x(ms.author)}</p>` : ''}</section>`);
  const nav = page('Contents', `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${chapters.map((c) => `<li><a href="${c.name}">${x(c.title)}</a></li>`).join('')}</ol></nav>`);
  const css = 'body{font-family:serif;line-height:1.5;margin:5%}h1{font-size:1.4em;font-weight:normal;text-align:center;margin:3em 0 2em}p{margin:0;text-indent:1.4em;text-align:justify}p.first,p.break+p{text-indent:0}p.break{text-align:center;text-indent:0;margin:1.2em 0}.titlepage{text-align:center;margin-top:30%}.titlepage h1{font-size:2em}.author{text-indent:0;text-align:center;font-style:italic}nav ol{list-style:none;padding:0}nav li{margin:.5em 0}';
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="en"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">${x(uid)}</dc:identifier><dc:title>${x(ms.title)}</dc:title><dc:language>en</dc:language>${ms.author ? `<dc:creator>${x(ms.author)}</dc:creator>` : ''}<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta></metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/><item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>${chapters.map((c, i) => `<item id="c${i}" href="${c.name}" media-type="application/xhtml+xml"/>`).join('')}</manifest>
<spine><itemref idref="title"/>${chapters.map((c, i) => `<itemref idref="c${i}"/>`).join('')}</spine></package>`;
  return makeZip([
    { name: 'mimetype', data: 'application/epub+zip', store: true },
    { name: 'META-INF/container.xml', data: '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>' },
    { name: 'OEBPS/content.opf', data: opf },
    { name: 'OEBPS/nav.xhtml', data: nav },
    { name: 'OEBPS/style.css', data: css },
    { name: 'OEBPS/title.xhtml', data: titlePage },
    ...files,
  ]);
}
