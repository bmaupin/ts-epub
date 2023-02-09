import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import Epub from './Epub';

export default class EpubWriter {
  private epub: Epub;

  constructor(epub: Epub) {
    this.epub = epub;
  }

  async write(): Promise<Blob> {
    const zipFileWriter = new BlobWriter();

    const zipWriter = new ZipWriter(zipFileWriter);
    // As per the EPUB spec, the mimetype file must come first and not be compressed
    await zipWriter.add('mimetype', new TextReader('application/epub+zip'), {
      level: 0,
    });

    await zipWriter.add(
      'META-INF/container.xml',
      new TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>\n`)
    );

    await zipWriter.add(
      'EPUB/package.opf',
      new TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="pub-id" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${this.epub.options.id}</dc:identifier>
    <dc:title>${this.epub.options.title}</dc:title>
    <dc:language>${this.epub.options.language}</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
  </manifest>
  <spine>
    <!-- TODO -->
    <itemref idref="section0001.xhtml" />
  </spine>
</package>\n`)
    );

    await zipWriter.add(
      'EPUB/nav.xhtml',
      new TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head>
    <title>${this.epub.options.title}</title>
  </head>
  <body>
    <nav epub:type="toc">
      <h1>Table of Contents</h1>
      <ol>
      <!-- TODO -->
        <li><a href="xhtml/section0001.xhtml">Section 1</a></li>
      </ol>
    </nav>
  </body>
</html>\n`)
    );

    // TODO: Test adding files concurrently (https://gildas-lormeau.github.io/zip.js/api/index.html#examples)

    await zipWriter.close();

    return await zipFileWriter.getData();
  }
}
