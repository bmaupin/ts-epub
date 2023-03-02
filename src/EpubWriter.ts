import path from 'path';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';

import Epub from './Epub';
import { validateAndPrettifyXml } from './utils';

const INTERNAL_EPUB_DIRECTORY = 'EPUB';
const INTERNAL_XHTML_DIRECTORY = 'xhtml';

export default class EpubWriter {
  private epub: Epub;

  constructor(epub: Epub) {
    this.epub = epub;
  }

  async write(): Promise<Blob> {
    const zipFileWriter = new BlobWriter();
    const zipWriter = new ZipWriter(zipFileWriter);

    // As per the EPUB spec, the mimetype file must come first
    await this.writeMetadata(zipWriter);
    await this.writeContainerXml(zipWriter);
    await this.writePackageOpf(zipWriter);
    await this.writeNavXhtml(zipWriter);
    await this.writeTocNcx(zipWriter);
    await this.writeCss(zipWriter);
    await this.writeSections(zipWriter);

    await zipWriter.close();

    return await zipFileWriter.getData();
  }

  // https://www.w3.org/publishing/epub3/epub-ocf.html#sec-zip-container-mime
  private async writeMetadata(zipWriter: ZipWriter<Blob>): Promise<void> {
    await zipWriter.add('mimetype', new TextReader('application/epub+zip'), {
      // As per the EPUB spec, the mimetype file must not contain any extra fields
      extendedTimestamp: false,
      // As per the EPUB spec, the mimetype file must not be compressed
      level: 0,
    });
  }

  private async writeContainerXml(zipWriter: ZipWriter<Blob>): Promise<void> {
    const containerXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles>
        <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml" />
      </rootfiles>
    </container>`;

    await zipWriter.add(
      'META-INF/container.xml',
      new TextReader(validateAndPrettifyXml(containerXmlContent))
    );
  }

  private async writePackageOpf(zipWriter: ZipWriter<Blob>): Promise<void> {
    let creatorElement = '';
    if (this.epub.options.author) {
      creatorElement = `<dc:creator id="creator">${this.epub.options.author}</dc:creator>`;
    }

    const manifestElements = [];
    const spineElements = [];

    for (const cssOptions of this.epub.cssOptions) {
      // Use the filename as the ID in the package.opf file, since we're already
      // checking that it's unique
      manifestElements.push(
        `<item id="${cssOptions.filename}" href="${path.join(
          cssOptions.filename
        )}" media-type="text/css" />`
      );
    }

    for (const sectionOptions of this.epub.sectionsOptions) {
      manifestElements.push(
        `<item id="${sectionOptions.filename}" href="${path.join(
          INTERNAL_XHTML_DIRECTORY,
          sectionOptions.filename
        )}" media-type="application/xhtml+xml" />`
      );
      spineElements.push(`<itemref idref="${sectionOptions.filename}" />`);
    }

    const packageOpfContent = `<?xml version="1.0" encoding="UTF-8"?>
    <package version="3.0" unique-identifier="pub-id" xmlns="http://www.idpf.org/2007/opf">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:identifier id="pub-id">${this.epub.options.id}</dc:identifier>
        <dc:title>${this.epub.options.title}</dc:title>
        ${creatorElement}
        <dc:language>${this.epub.options.language}</dc:language>
        <meta property="dcterms:modified">${EpubWriter.generateIsoDateWithoutMilliseconds()}</meta>
      </metadata>
      <manifest>
        <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
        ${manifestElements.join('\n')}
      </manifest>
      <spine toc="ncx">
        ${spineElements.join('\n')}
      </spine>
    </package>`;

    await zipWriter.add(
      path.join(INTERNAL_EPUB_DIRECTORY, 'package.opf'),
      new TextReader(validateAndPrettifyXml(packageOpfContent))
    );
  }

  static generateIsoDateWithoutMilliseconds(): string {
    return new Date().toISOString().slice(0, -5) + 'Z';
  }

  private async writeNavXhtml(zipWriter: ZipWriter<Blob>): Promise<void> {
    const liElements = [];

    for (const sectionOptions of this.epub.sectionsOptions) {
      if (!sectionOptions.excludeFromToc) {
        liElements.push(
          `<li><a href="${path.join(
            INTERNAL_XHTML_DIRECTORY,
            sectionOptions.filename
          )}">${sectionOptions.title}</a></li>`
        );
      }
    }

    const navXhtmlContent = `<?xml version="1.0" encoding="UTF-8"?>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
      <head>
        <title>${this.epub.options.title}</title>
      </head>
      <body>
        <nav epub:type="toc">
          <h1>Table of Contents</h1>
          <ol>
            ${liElements.join('\n')}
          </ol>
        </nav>
      </body>
    </html>`;

    await zipWriter.add(
      path.join(INTERNAL_EPUB_DIRECTORY, 'nav.xhtml'),
      new TextReader(validateAndPrettifyXml(navXhtmlContent))
    );
  }

  private async writeTocNcx(zipWriter: ZipWriter<Blob>): Promise<void> {
    const navPoints = [];

    for (const [i, sectionOptions] of this.epub.sectionsOptions.entries()) {
      if (!sectionOptions.excludeFromToc) {
        navPoints.push(
          `<navPoint id="navPoint-${i + 1}">
          <navLabel>
            <text>${sectionOptions.title}</text>
          </navLabel>
          <content src="${path.join(
            INTERNAL_XHTML_DIRECTORY,
            sectionOptions.filename
          )}" />
        </navPoint>`
        );
      }
    }

    const tocNcxContent = `<?xml version="1.0" encoding="UTF-8"?>
    <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
      <head>
        <meta name="dtb:uid" content="${this.epub.options.id}" />
      </head>
      <docTitle>
        <text>${this.epub.options.title}</text>
      </docTitle>
      <navMap>
        ${navPoints.join('\n')}
      </navMap>
    </ncx>`;

    await zipWriter.add(
      path.join(INTERNAL_EPUB_DIRECTORY, 'toc.ncx'),
      new TextReader(validateAndPrettifyXml(tocNcxContent))
    );
  }

  private async writeCss(zipWriter: ZipWriter<Blob>) {
    for (const cssOptions of this.epub.cssOptions) {
      await zipWriter.add(
        path.join(INTERNAL_EPUB_DIRECTORY, cssOptions.filename),
        new TextReader(cssOptions.content)
      );
    }
  }

  private async writeSections(zipWriter: ZipWriter<Blob>): Promise<void> {
    // TODO: Test adding files concurrently (https://gildas-lormeau.github.io/zip.js/api/index.html#examples)

    for (const sectionOptions of this.epub.sectionsOptions) {
      await zipWriter.add(
        path.join(
          INTERNAL_EPUB_DIRECTORY,
          INTERNAL_XHTML_DIRECTORY,
          sectionOptions.filename
        ),
        new TextReader(sectionOptions.content)
      );
    }
  }
}
