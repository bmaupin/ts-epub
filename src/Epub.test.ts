import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
// @ts-expect-error: This is just for tests to work around "TypeError: blob.arrayBuffer is not a function"
import { Blob } from 'blob-polyfill';
import { spawn } from 'child_process';
import { access, writeFile } from 'fs/promises';
import hasbin from 'hasbin';
import { beforeAll, describe, expect, test, vi } from 'vitest';

import Epub from './Epub';

// Without this, tests fail with "TypeError: blob.arrayBuffer is not a function"
globalThis.Blob = Blob;

const testDateString = '2023-02-16T18:35:03Z';
const testEpubLanguage = 'en';
const testEpubId = 'urn:uuid:38e9a65c-8077-45b7-a59e-8d0ae827ca5f';
const testEpubTitle = 'My title';
const testSectionBody = '<h1>Hello world</h1>\n    <p>Hi</p>';
const testSectionFilename = 'section1.xhtml';
const testSectionTitle = 'First section';

// TODO: delete test files

describe('Minimal EPUB', () => {
  const testEpubFilename = 'minimal.epub';

  let epub: Epub;
  let epubBlob: Blob;
  let zipReader: ZipReader<Blob>;

  beforeAll(() => {
    epub = new Epub({
      id: testEpubId,
      language: testEpubLanguage,
      title: testEpubTitle,
    });
  });

  test('Create new Epub', () => {
    expect(epub).toBeInstanceOf(Epub);
  });

  test('Add section', async () => {
    await epub.addSection({
      body: testSectionBody,
      filename: testSectionFilename,
      title: testSectionTitle,
    });
  });

  test('Write Epub', async () => {
    // Use a consistent timestamp for tests
    vi.setSystemTime(new Date(testDateString));

    // These will be used by our tests to validate the exact content of the EPUB
    epubBlob = await epub.write();
    const zipFileReader = new BlobReader(epubBlob);
    zipReader = new ZipReader(zipFileReader);

    // This will be used by epubcheck to do proper EPUB validation
    await writeFile(
      testEpubFilename,
      Buffer.from(await epubBlob.arrayBuffer())
    );

    expect(await doesFileExist(testEpubFilename)).toBe(true);
  });

  test('Validate mimetype', async () => {
    expect(await getFileContentFromZip(zipReader, 'mimetype')).toEqual(
      `application/epub+zip`
    );
  });

  test('Validate container.xml', async () => {
    expect(
      await getFileContentFromZip(zipReader, 'META-INF/container.xml')
    ).toEqual(
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    );
  });

  test('Validate package.opf', async () => {
    expect(await getFileContentFromZip(zipReader, 'EPUB/package.opf')).toEqual(
      `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="pub-id" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${testEpubId}</dc:identifier>
    <dc:title>${testEpubTitle}</dc:title>
    <dc:language>${testEpubLanguage}</dc:language>
    <meta property="dcterms:modified">${testDateString}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="${testSectionFilename}" href="xhtml/${testSectionFilename}" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="${testSectionFilename}"/>
  </spine>
</package>`
    );
  });

  test('Validate nav.xml', async () => {
    expect(await getFileContentFromZip(zipReader, 'EPUB/nav.xhtml')).toEqual(
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head>
    <title>${testEpubTitle}</title>
  </head>
  <body>
    <nav epub:type="toc">
      <h1>Table of Contents</h1>
      <ol>
        <li>
          <a href="xhtml/${testSectionFilename}">${testSectionTitle}</a>
        </li>
      </ol>
    </nav>
  </body>
</html>`
    );
  });

  test('Validate toc.ncx', async () => {
    expect(await getFileContentFromZip(zipReader, 'EPUB/toc.ncx')).toEqual(
      `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${testEpubId}"/>
  </head>
  <docTitle>
    <text>${testEpubTitle}</text>
  </docTitle>
  <navMap>
    <navPoint id="navPoint-1">
      <navLabel>
        <text>${testSectionTitle}</text>
      </navLabel>
      <content src="xhtml/${testSectionFilename}"/>
    </navPoint>
  </navMap>
</ncx>`
    );
  });

  test('Validate section', async () => {
    expect(
      await getFileContentFromZip(
        zipReader,
        `EPUB/xhtml/${testSectionFilename}`
      )
    ).toEqual(
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>${testSectionTitle}</title>
  </head>
  <body>
    ${testSectionBody}
  </body>
</html>`
    );
  });

  test('Validate EPUB using epubcheck', async () => {
    if (await isCommandAvailable('epubcheck')) {
      // This syntax has to be used to avoid vitest from exiting with "Unhandled rejection"
      await expect(
        runCommand('epubcheck', [testEpubFilename])
      ).resolves.toEqual(0);
    }
  });
});

describe('Full-featured EPUB', () => {
  const testCssContent = `h1 {
      text-align: center;
    }
    p {
      font-family: sans-serif;
    }`;
  const testCssFilename = 'epub.css';
  const testEpubAuthor = 'Sequester Grundelplith';
  const testEpubFilename = 'full.epub';
  const testSection2Body = '<p><b>Bold choice</b></p>';
  const testSection2Filename = 'section2.xhtml';
  const testSection2Title = 'Next section';
  const testSection3Body = '<p>This is a paragraph.</p>';
  const testSection3Filename = 'section3.xhtml';
  const testSection3Title = "I'm running out of ideas";

  let epub: Epub;
  let epubBlob: Blob;
  let zipReader: ZipReader<Blob>;

  beforeAll(async () => {
    epub = new Epub({
      author: testEpubAuthor,
      id: testEpubId,
      language: testEpubLanguage,
      title: testEpubTitle,
    });

    epub.addCSS({
      content: testCssContent,
      filename: testCssFilename,
    });

    await epub.addSection({
      body: testSectionBody,
      filename: testSectionFilename,
      title: testSectionTitle,
    });
    await epub.addSection({
      body: testSection2Body,
      cssFilename: testCssFilename,
      filename: testSection2Filename,
      title: testSection2Title,
    });
    await epub.addSection({
      body: testSection3Body,
      excludeFromToc: true,
      filename: testSection3Filename,
      title: testSection3Title,
    });
  });

  test('Add duplicate CSS', () => {
    // Function has to be wrapped in an IIFE for toThrow() to work 🤷
    expect(() => {
      epub.addCSS({
        content: testCssContent,
        filename: testCssFilename,
      });
    }).toThrow();
  });

  test('Add invalid CSS', () => {
    expect(() => {
      epub.addCSS({
        content: 'This is not valid CSS',
        filename: "Shouldn't matter",
      });
    }).toThrow();
  });

  test('Add duplicate section', async () => {
    await expect(
      epub.addSection({
        body: testSectionBody,
        filename: testSectionFilename,
        title: testSectionTitle,
      })
    ).rejects.toThrow();
  });

  test('Add invalid section', async () => {
    await expect(
      epub.addSection({
        body: '<p><p>This is not valid XML',
        filename: "Shouldn't matter",
        title: "Shouldn't matter either",
      })
    ).rejects.toThrow();
  });

  test('Write Epub', async () => {
    // Use a consistent timestamp for tests
    vi.setSystemTime(new Date(testDateString));

    // These will be used by our tests to validate the exact content of the EPUB
    epubBlob = await epub.write();
    const zipFileReader = new BlobReader(epubBlob);
    zipReader = new ZipReader(zipFileReader);

    // This will be used by epubcheck to do proper EPUB validation
    await writeFile(
      testEpubFilename,
      Buffer.from(await epubBlob.arrayBuffer())
    );

    expect(await doesFileExist(testEpubFilename)).toBe(true);
  });

  test('Validate package.opf', async () => {
    expect(await getFileContentFromZip(zipReader, 'EPUB/package.opf')).toEqual(
      `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="pub-id" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${testEpubId}</dc:identifier>
    <dc:title>${testEpubTitle}</dc:title>
    <dc:creator id="creator">${testEpubAuthor}</dc:creator>
    <dc:language>${testEpubLanguage}</dc:language>
    <meta property="dcterms:modified">${testDateString}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="epub.css" href="${testCssFilename}" media-type="text/css"/>
    <item id="${testSectionFilename}" href="xhtml/${testSectionFilename}" media-type="application/xhtml+xml"/>
    <item id="${testSection2Filename}" href="xhtml/${testSection2Filename}" media-type="application/xhtml+xml"/>
    <item id="${testSection3Filename}" href="xhtml/${testSection3Filename}" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="${testSectionFilename}"/>
    <itemref idref="${testSection2Filename}"/>
    <itemref idref="${testSection3Filename}"/>
  </spine>
</package>`
    );
  });

  test('Validate nav.xml', async () => {
    expect(await getFileContentFromZip(zipReader, 'EPUB/nav.xhtml')).toEqual(
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head>
    <title>${testEpubTitle}</title>
  </head>
  <body>
    <nav epub:type="toc">
      <h1>Table of Contents</h1>
      <ol>
        <li>
          <a href="xhtml/${testSectionFilename}">${testSectionTitle}</a>
        </li>
        <li>
          <a href="xhtml/${testSection2Filename}">${testSection2Title}</a>
        </li>
      </ol>
    </nav>
  </body>
</html>`
    );
  });

  test('Validate toc.ncx', async () => {
    expect(await getFileContentFromZip(zipReader, 'EPUB/toc.ncx')).toEqual(
      `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${testEpubId}"/>
  </head>
  <docTitle>
    <text>${testEpubTitle}</text>
  </docTitle>
  <navMap>
    <navPoint id="navPoint-1">
      <navLabel>
        <text>${testSectionTitle}</text>
      </navLabel>
      <content src="xhtml/${testSectionFilename}"/>
    </navPoint>
    <navPoint id="navPoint-2">
      <navLabel>
        <text>${testSection2Title}</text>
      </navLabel>
      <content src="xhtml/${testSection2Filename}"/>
    </navPoint>
  </navMap>
</ncx>`
    );
  });

  test('Validate CSS', async () => {
    expect(await getFileContentFromZip(zipReader, `EPUB/${testCssFilename}`))
      .toEqual(`h1 {
  text-align: center;
}

p {
  font-family: sans-serif;
}`);
  });

  test('Validate section with CSS', async () => {
    expect(
      await getFileContentFromZip(
        zipReader,
        `EPUB/xhtml/${testSection2Filename}`
      )
    ).toEqual(
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>${testSection2Title}</title>
    <link rel="stylesheet" type="text/css" href="../${testCssFilename}"/>
  </head>
  <body>
    <p>
      <b>Bold choice</b>
    </p>
  </body>
</html>`
    );
  });

  test('Validate section excluded from TOC', async () => {
    expect(
      await getFileContentFromZip(
        zipReader,
        `EPUB/xhtml/${testSection3Filename}`
      )
    ).toEqual(
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>${testSection3Title}</title>
  </head>
  <body>
    <p>This is a paragraph.</p>
  </body>
</html>`
    );
  });

  test('Validate EPUB using epubcheck', async () => {
    if (await isCommandAvailable('epubcheck')) {
      // This syntax has to be used to avoid vitest from exiting with "Unhandled rejection"
      await expect(
        runCommand('epubcheck', [testEpubFilename])
      ).resolves.toEqual(0);
    }
  });
});

const doesFileExist = async (filepath: string): Promise<boolean> => {
  try {
    await access(filepath);
    return true;
  } catch {
    return false;
  }
};

// filepath is the path to the file within the zip file
const getFileContentFromZip = async (
  zipReader: ZipReader<Blob>,
  filepath: string
): Promise<string | undefined> => {
  for (const zipReaderEntry of await zipReader.getEntries()) {
    if (zipReaderEntry.filename === filepath) {
      const textWriter = new TextWriter();
      return await zipReaderEntry.getData(textWriter);
    }
  }
};

const isCommandAvailable = async (command: string) => {
  return new Promise((resolve) => {
    hasbin.async(command, (result) => {
      resolve(result);
    });
  });
};

// Run a command and return the exit code
//
// If the exit code isn't 0, will throw an error containing stderr
const runCommand = async (command: string, parameters: string[]) => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, parameters);
    let stderr = '';

    process.stderr.on('data', (data) => {
      stderr += data;
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(stderr);
      } else {
        resolve(code);
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
};
