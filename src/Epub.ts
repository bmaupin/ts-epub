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
