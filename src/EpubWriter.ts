import path from 'path';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';

import Epub from './Epub';

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
    // TODO: use a library to format the content so I don't have to worry about whitespace
    const containerXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles>
        <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml" />
      </rootfiles>
    </container>`;

    await zipWriter.add(
      'META-INF/container.xml',
      new TextReader(EpubWriter.prettifyXml(containerXmlContent))
    );
  }

  // https://stackoverflow.com/a/47317538/399105
  static prettifyXml(sourceXml: string): string {
    const xmlDoc = new DOMParser().parseFromString(
      sourceXml,
      'application/xml'
    );
    const xsltDoc = new DOMParser().parseFromString(
      [
        // describes how we want to modify the XML - indent everything
        '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:strip-space elements="*"/>',
        '  <xsl:template match="para[content-style][not(text())]">', // change to just text() to strip space in text nodes
        '    <xsl:value-of select="normalize-space(.)"/>',
        '  </xsl:template>',
        '  <xsl:template match="node()|@*">',
        '    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
        '  </xsl:template>',
        '  <xsl:output indent="yes"/>',
        '</xsl:stylesheet>',
      ].join('\n'),
      'application/xml'
    );

    const xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDoc);
    const resultDoc = xsltProcessor.transformToDocument(xmlDoc);
    const resultXml = new XMLSerializer().serializeToString(resultDoc);
    return resultXml;
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
        )}" media-type="application/xhtml+xml" />`
      );
      spineElements.push(`<itemref idref="${section.filename}" />`);
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
        ${manifestElements}
      </manifest>
      <spine>
        ${spineElements}
      </spine>
    </package>\n`;

    await zipWriter.add(
      path.join(INTERNAL_EPUB_DIRECTORY, 'package.opf'),
      new TextReader(packageOpfContent)
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
    <!DOCTYPE html>
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
    </html>\n`;

    await zipWriter.add(
      path.join(INTERNAL_EPUB_DIRECTORY, 'nav.xhtml'),
      new TextReader(navXhtmlContent)
    );
  }

  private async writeSections(zipWriter: ZipWriter<Blob>): Promise<void> {
    // TODO: Test adding files concurrently (https://gildas-lormeau.github.io/zip.js/api/index.html#examples)

    for (const section of this.epub.sections) {
      const sectionContent = `<?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE html>
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
        new TextReader(sectionContent)
      );
    }
  }
}
