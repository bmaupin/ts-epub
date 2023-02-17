import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
// @ts-expect-error: This is just for tests to work around "TypeError: blob.arrayBuffer is not a function"
import { Blob } from 'blob-polyfill';
import { spawn } from 'child_process';
import { access, writeFile } from 'fs/promises';
import hasbin from 'hasbin';
import { beforeAll, describe, expect, test, vi } from 'vitest';

import Epub from './Epub';

// TODO: figure out how to test individual features; test them all in one full-featured suite? or one by one?
// TODO: Add individual file testing to full-featured EPUB tests
// TODO: delete test files

// Without this, tests fail with "TypeError: blob.arrayBuffer is not a function"
globalThis.Blob = Blob;

describe('Minimal EPUB', () => {
  const testDateString = '2023-02-16T18:35:03Z';
  const testEpubLanguage = 'en';
  const testEpubId = 'urn:uuid:38e9a65c-8077-45b7-a59e-8d0ae827ca5f';
  const testEpubFilename = 'minimal.epub';
  const testEpubTitle = 'My title';
  const testSectionBody = '<h1>Hello world</h1>\n    <p>Hi</p>';
  const testSectionFilename = 'first-section.xhtml';
  const testSectionTitle = 'First section';

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

  test('Add section', () => {
    epub.addSection({
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
    const isEpubcheckAvailable = await isCommandAvailable('epubcheck');

    if (isEpubcheckAvailable) {
      // This syntax has to be used to avoid vitest from exiting with "Unhandled rejection"
      await expect(
        runCommand('epubcheck', [testEpubFilename])
      ).resolves.toEqual(0);
    }
  });
});

describe('Full-featured EPUB', () => {
  const testEpubFilename = 'full.epub';

  let epub: Epub;

  beforeAll(() => {
    epub = new Epub({
      author: 'Turd Ferguson',
      id: 'urn:uuid:38e9a65c-8077-45b7-a59e-8d0ae827ca5f',
      language: 'en',
      title: 'My title',
    });
  });

  test('Create new Epub', () => {
    expect(epub).toBeInstanceOf(Epub);
  });

  test('Add section', () => {
    epub.addSection({
      body: `<h1>Hello world</h1>
             <p>Hi</p>`,
      filename: 'first-section.xhtml',
      title: 'First section',
    });
  });

  test('Write Epub', async () => {
    await writeFile(
      testEpubFilename,
      Buffer.from(await (await epub.write()).arrayBuffer())
    );
  });

  test('Validate EPUB using epubcheck', async () => {
    const isEpubcheckAvailable = await isCommandAvailable('epubcheck');

    if (isEpubcheckAvailable) {
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
