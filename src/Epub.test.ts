import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import hasbin from 'hasbin';
import { beforeAll, describe, expect, test } from 'vitest';

import Epub from './Epub';

// TODO: use zip.js to extract the EPUB and make sure it contains all the necessary files??

describe('Minimal EPUB', () => {
  const testEpubFilename = 'minimal.epub';

  let epub: Epub;

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

  // TODO: delete file
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

  // TODO: delete file
});

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
