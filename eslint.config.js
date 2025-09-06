const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      prettier: prettier,
    },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      'no-unused-vars': 'warn',
      'no-undef': 'error',
    },
  },
];
