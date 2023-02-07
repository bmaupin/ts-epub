import { describe, expect, test } from 'vitest';

import Epub from './Epub';

describe('Epub', () => {
  test('Create new Epub', () => {
    const epub = new Epub({ id: '38e9a65c-8077-45b7-a59e-8d0ae827ca5f' });
    expect(epub).toBeInstanceOf(Epub);
  });
});
