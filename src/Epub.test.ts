import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import { beforeAll, describe, expect, test } from 'vitest';

import Epub from './Epub';

const testEpubFilename = 'test.epub';

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

    // TODO: use zip.js to extract the EPUB and make sure it contains all the necessary files
  });
});

// TODO: add test(s) to make sure EPUB is valid

describe('epubcheck', () => {
  test('Validate EPUB using epubcheck', async () => {
    // TODO: check if epubcheck is installed before running this test

    // This syntax has to be used to avoid vitest from exiting with "Unhandled rejection"
    await expect(runCommand('epubcheck', [testEpubFilename])).resolves.toEqual(
      0
    );
  });
});

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
