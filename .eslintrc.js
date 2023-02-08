module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['/types'],
  overrides: [
    // Enable @typescript-eslint/no-floating-promises only for TypeScript files; it
    // requires parserOptions.project which causses errors with this specific file:
    // "error  Parsing error: ESLint was configured to run on `<tsconfigRootDir>/.eslintrc.js` using `parserOptions.project`: <tsconfigRootDir>/tsconfig.json
    // However, that TSConfig does not include this file."
    {
      files: ['*.ts'],
      parserOptions: { project: './tsconfig.json' },
      rules: {
        '@typescript-eslint/no-floating-promises': ['error'],
      },
    },
    // Add an override to allow Node.js imports in tests
    {
      files: ['*.test.ts'],
      rules: {
        'no-restricted-imports': ['off'],
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  root: true,
  rules: {
    // Prevent importing Node.js libraries since this library should also work in the browser
    'no-restricted-imports': [
      'error',
      'assert',
      'buffer',
      'child_process',
      'cluster',
      'crypto',
      'dgram',
      'dns',
      'domain',
      'events',
      'freelist',
      'fs',
      'http',
      'https',
      'module',
      'net',
      'os',
      'path',
      'punycode',
      'querystring',
      'readline',
      'repl',
      'smalloc',
      'stream',
      'string_decoder',
      'sys',
      'timers',
      'tls',
      'tracing',
      'tty',
      'url',
      'util',
      'vm',
      'zlib',
    ],
  },
};
