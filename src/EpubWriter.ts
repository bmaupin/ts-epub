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

    // TODO: Test adding files concurrently (https://gildas-lormeau.github.io/zip.js/api/index.html#examples)

    await zipWriter.close();

    return await zipFileWriter.getData();
  }
}
