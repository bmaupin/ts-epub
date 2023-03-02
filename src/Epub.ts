import EpubWriter from './EpubWriter';
import { validateAndPrettifyCss, validateAndPrettifyXml } from './utils';

/**
 * Options for adding a CSS file to an EPUB.
 */
interface CssOptions {
  /** Full content of the CSS file. The content will be validated and reformatted by default. */
  content: string;
  /** Filename to use inside the generated EPUB. Must be unique within the EPUB or an error will be thrown. */
  filename: string;
  /** Whether or not to validate and reformat the CSS. Defaults to `true`. */
  validate?: boolean;
}

/**
 * Options for creating a new `Epub`.
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
 * Options for a section in an EPUB.
 */
interface EpubSectionOptions {
  /** Content that will go between the `<body>` tags of the section XHTML file. The content will be validated and formatted by default. */
  body: string;
  /** Internal filename of a CSS file to apply to this section. */
  cssFilename?: string;
  /** Exclude the section from the table of contents. Defaults to `false`. */
  excludeFromToc?: boolean;
  /** Filename to use inside the generated EPUB. Must be unique within the EPUB or an error will be thrown. */
  filename: string;
  /** Title of the section which will be used for the table of contents. */
  title: string;
  /** Whether or not to validate and reformat the XML in the body. Defaults to `true`. */
  validate?: boolean;
}

export default class Epub {
  cssOptions: CssOptions[] = [];
  options: EpubOptions;
  sectionsOptions: (EpubSectionOptions & { content: string })[] = [];

  /**
   * The constructor of the `Epub` class.
   *
   * @param options Options to be used to create the EPUB.
   */
  constructor(options: EpubOptions) {
    this.options = options;
  }

  /**
   * Add a new CSS file to the EPUB.
   *
   * The filename of the CSS file can be provided to `addSection` to apply the CSS to the
   * section.
   *
   * @param options Options for the CSS file.
   */
  addCSS(options: CssOptions): void {
    if (
      this.cssOptions.find(
        (cssOptions) => cssOptions.filename === options.filename
      )
    ) {
      throw new Error(`Duplicate CSS file name: ${options.filename}`);
    }

    let cssContent = options.content;
    if (options.validate ?? true) {
      try {
        cssContent = validateAndPrettifyCss(options.content);
      } catch (error) {
        throw new Error(`Error validating CSS: ${error}`);
      }
    }

    this.cssOptions.push({
      ...options,
      content: cssContent,
    });
  }

  /**
   * Add a new section to the EPUB.
   *
   * A section represents an individual XHTML file inside the EPUB. It often corresponds
   * to a chapter in a book.
   *
   * @param options Options for the section.
   */
  addSection(options: EpubSectionOptions): void {
    if (
      this.sectionsOptions.find(
        (sectionOptions) => sectionOptions.filename === options.filename
      )
    ) {
      throw new Error(`Duplicate section file name: ${options.filename}`);
    }

    // Build the full section XML right away that way we can validate it so the user will
    // know immediately if the validation has failed, instead of waiting for when the EPUB
    // file is packaged.
    let cssLink;
    if (options.cssFilename) {
      const cssOptions = this.cssOptions.find(
        (cssOptions) => cssOptions.filename === options.cssFilename
      );
      if (cssOptions) {
        cssLink = `<link rel="stylesheet" type="text/css" href="../${cssOptions.filename}" />`;
      }
    }

    let sectionContent = `<?xml version="1.0" encoding="UTF-8"?>
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>${options.title}</title>
        ${cssLink ?? ''}
      </head>
      <body>
        ${options.body}
      </body>
    </html>`;

    if (options.validate ?? true) {
      try {
        sectionContent = validateAndPrettifyXml(sectionContent);
      } catch (error) {
        throw new Error(`Error validating section content: ${error}`);
      }
    }

    this.sectionsOptions.push({
      ...options,
      content: sectionContent,
    });
  }

  /**
   * Write the assembled EPUB.
   *
   * @returns The assembled EPUB.
   */
  async write(): Promise<Blob> {
    const epubWriter = new EpubWriter(this);
    return epubWriter.write();
  }
}
