import xml2js from 'isomorphic-xml2js';
import path from 'path';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';

import Epub from './Epub';

const INTERNAL_EPUB_DIRECTORY = 'EPUB';
const INTERNAL_XHTML_DIRECTORY = 'xhtml';

// TODO: prettify/validate all XML

export default class EpubWriter {
  private epub: Epub;

  constructor(epub: Epub) {
    this.epub = epub;
  }

  async write(validateSections = true): Promise<Blob> {
    const zipFileWriter = new BlobWriter();
    const zipWriter = new ZipWriter(zipFileWriter);

    // As per the EPUB spec, the mimetype file must come first
    await this.writeMetadata(zipWriter);
    await this.writeContainerXml(zipWriter);
    await this.writePackageOpf(zipWriter);
    await this.writeNavXhtml(zipWriter);
    await this.writeTocNcx(zipWriter);
    await this.writeSections(zipWriter, validateSections);

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
        <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
      </rootfiles>
    </container>`;

    await zipWriter.add(
      'META-INF/container.xml',
      new TextReader(await EpubWriter.prettifyXml(containerXmlContent))
    );
  }

  private async writePackageOpf(zipWriter: ZipWriter<Blob>): Promise<void> {
    let creatorElement = '';
    if (this.epub.options.author) {
      creatorElement = `<dc:creator id="creator">${this.epub.options.author}</dc:creator>`;
    }

    const manifestElements = [];
    const spineElements = [];

    for (const section of this.epub.sections) {
      // Use the section filename as the ID in the package.opf file, since we're already
      // checking that they're unique
      manifestElements.push(
        `<item id="${section.filename}" href="${path.join(
          INTERNAL_XHTML_DIRECTORY,
          section.filename
        )}" media-type="application/xhtml+xml"/>`
      );
      spineElements.push(`<itemref idref="${section.filename}"/>`);
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
        <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
        ${manifestElements}
      </manifest>
      <spine>
        ${spineElements}
      </spine>
    </package>`;

    await zipWriter.add(
      path.join(INTERNAL_EPUB_DIRECTORY, 'package.opf'),
      new TextReader(await EpubWriter.prettifyXml(packageOpfContent))
    );
  }

  static generateIsoDateWithoutMilliseconds(): string {
    return new Date().toISOString().slice(0, -5) + 'Z';
  }

  private async writeNavXhtml(zipWriter: ZipWriter<Blob>): Promise<void> {
    const liElements = [];

    for (const section of this.epub.sections) {
      liElements.push(
        `<li><a href="${path.join(
          INTERNAL_XHTML_DIRECTORY,
          section.filename
        )}">${section.title}</a></li>`
      );
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
            ${liElements}
          </ol>
        </nav>
      </body>
    </html>`;

    await zipWriter.add(
      path.join(INTERNAL_EPUB_DIRECTORY, 'nav.xhtml'),
      new TextReader(await EpubWriter.prettifyXml(navXhtmlContent))
    );
  }

  private async writeTocNcx(zipWriter: ZipWriter<Blob>): Promise<void> {
    const navPoints = [];

    for (const [i, section] of this.epub.sections.entries()) {
      navPoints.push(
        `<navPoint id="navPoint-${i + 1}">
          <navLabel>
            <text>${section.title}</text>
          </navLabel>
          <content src="${path.join(
            INTERNAL_XHTML_DIRECTORY,
            section.filename
          )}"/>
        </navPoint>`
      );
    }

    const tocNcxContent = `<?xml version="1.0" encoding="UTF-8"?>
    <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
      <head>
        <meta name="dtb:uid" content="${this.epub.options.id}"/>
      </head>
      <docTitle>
        <text>${this.epub.options.title}</text>
      </docTitle>
      <navMap>
        ${navPoints}
      </navMap>
    </ncx>`;

    await zipWriter.add(
      path.join(INTERNAL_EPUB_DIRECTORY, 'toc.ncx'),
      new TextReader(await EpubWriter.prettifyXml(tocNcxContent))
    );
  }

  private async writeSections(
    zipWriter: ZipWriter<Blob>,
    validateSections: boolean
  ): Promise<void> {
    // TODO: Test adding files concurrently (https://gildas-lormeau.github.io/zip.js/api/index.html#examples)

    for (const section of this.epub.sections) {
      const sectionContent = `<?xml version="1.0" encoding="UTF-8"?>
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>${section.title}</title>
        </head>
        <body>
          ${section.body}
        </body>
      </html>`;

      await zipWriter.add(
        path.join(
          INTERNAL_EPUB_DIRECTORY,
          INTERNAL_XHTML_DIRECTORY,
          section.filename
        ),
        new TextReader(
          validateSections
            ? await EpubWriter.prettifyXml(sectionContent)
            : sectionContent
        )
      );
    }
  }

  // This is primarily for prettifying the XML, which makes testing easier (we don't have
  // to worry about whitespace for the XML templates) and also makes the final generated
  // EPUB nicer. Because this has to parse the XML to prettify it, it also acts as a
  // sanity check for ensuring the source is valid XML as it will throw an error if not.
  static async prettifyXml(sourceXml: string): Promise<string> {
    const parsedXml = await xml2js.parseStringPromise(sourceXml);

    // xml2js adds 'standalone="yes"' to the XML header. It's not a big deal, but to keep
    // things to a minimum, add the header manually
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const builder = new xml2js.Builder({
      headless: true,
    });
    return `${xmlHeader}${builder.buildObject(parsedXml)}`;
  }
}
