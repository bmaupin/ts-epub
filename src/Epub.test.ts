import { writeFile } from 'fs/promises';
import { beforeAll, describe, expect, test } from 'vitest';

import Epub from './Epub';

let epub: Epub;

describe('Epub', () => {
  beforeAll(() => {
    epub = new Epub({
      id: 'urn:uuid:38e9a65c-8077-45b7-a59e-8d0ae827ca5f',
      language: 'en',
      title: 'My title',
    });
  });

  test('Create new Epub', () => {
    expect(epub).toBeInstanceOf(Epub);
  });

  test('Write Epub', async () => {
    await writeFile(
      'test.epub',
      Buffer.from(await (await epub.write()).arrayBuffer())
    );

    // TODO: use zip.js to extract the EPUB and make sure it contains all the necessary files
  });
});

// TODO: add test(s) to make sure EPUB is valid
