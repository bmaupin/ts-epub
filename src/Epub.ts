import EpubWriter from './EpubWriter';

/**
 * Options to provide when creating a new `Epub`
 */
interface EpubOptions {
  /** EPUB author */
  author?: string;
  /** EPUB identifier (https://www.w3.org/publishing/epub3/epub-packages.html#sec-opf-dcidentifier). */
  id: string;
  /** EPUB language code (https://www.w3.org/publishing/epub3/epub-packages.html#sec-opf-dclanguage). */
  language: string;
  /** EPUB title (https://www.w3.org/publishing/epub3/epub-packages.html#sec-opf-dctitle). */
  title: string;
}

/**
 * Represents a section in an EPUB.
 */
interface EpubSection {
  /** Content that will go between the `<body>` tags of the section XHTML file. The content will **not** be validated. */
  body: string;
  /** Filename to use inside the generated EPUB. Must be unique within the EPUB or an error will be thrown */
  filename: string;
  /** Title of the section which will be used for the table of contents. */
  title: string;
}

export default class Epub {
  options: EpubOptions;
  sections: EpubSection[] = [];

  /**
   * The constructor of the `Epub` class.
   *
   * @param {EpubOptions} options Options to be used to create the EPUB.
   */
  constructor(options: EpubOptions) {
    this.options = options;
  }

  /**
   * Add a new section to the EPUB.
   *
   * A section represents an individual XHTML file inside the EPUB. It often corresponds
   * to a chapter in a book.
   *
   * @param {EpubSection} section The new section to add.
   */
  addSection(section: EpubSection): void {
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
