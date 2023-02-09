import EpubWriter from './EpubWriter';

interface EpubOptions {
  id: string;
}

export default class Epub {
  constructor(options: EpubOptions) {
    // TODO
  }

  async write(): Promise<Blob> {
    const epubWriter = new EpubWriter(this);
    return epubWriter.write();
  }
}

/*
 * TODO:
 *
 * 1. EPUB 3 MVP
 *   1. Create minimal package.opf file
 *   1. Create minimal nav.xhtml
 *   1. Package it up (zip) with mimetype and container.xml files
 *   1. Implement addSection
 *   1. Get validation test working
 * 1. Set up GitHub Actions
 * 1. Add EPUBv2 TOC
 * 1. Start adding features
 *    1. Author
 *    1. Default CSS
 *    1. Exclude section from TOC
 *    1. Cover
 * 1. Add tsdoc
 */
