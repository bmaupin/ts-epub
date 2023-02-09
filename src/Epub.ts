import EpubWriter from './EpubWriter';

interface EpubOptions {
  id: string;
  language: string;
  title: string;
}

interface EpubSection {
  body: string;
  filename: string;
  title: string;
}

export default class Epub {
  options: EpubOptions;
  sections: EpubSection[] = [];

  /**
   * @param {EpubOptions} options
   * @param {string} options.id - EPUB identifier (https://www.w3.org/publishing/epub3/epub-packages.html#sec-opf-dcidentifier).
   * @param {string} options.lang - EPUB language code (https://www.w3.org/publishing/epub3/epub-packages.html#sec-opf-dclanguage).
   * @param {string} options.title - EPUB title (https://www.w3.org/publishing/epub3/epub-packages.html#sec-opf-dctitle).
   */
  constructor(options: EpubOptions) {
    this.options = options;
  }

  addSection(section: EpubSection) {
    if (
      this.sections.find(
        (someSection) => someSection.filename === section.filename
      )
    ) {
      throw new Error(`Duplicate section file name: ${section.filename}`);
    }

    this.sections.push(section);
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
 *   1. [ ] Create minimal package.opf file
 *   1. [ ] Create minimal nav.xhtml
 *   1. [x] Package it up (zip) with mimetype and container.xml files
 *   1. [ ] Implement addSection
 *   1. [ ] Get validation test working
 * 1. [ ] Set up GitHub Actions
 * 1. [ ] Add EPUBv2 TOC
 * 1. Start adding features
 *    1. [ ] Author
 *    1. [ ] Default CSS
 *    1. [ ] Exclude section from TOC
 *    1. [ ] Cover
 * 1. [ ] Add tsdoc
 */
