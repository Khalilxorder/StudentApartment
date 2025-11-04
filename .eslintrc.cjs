/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['next', 'next/core-web-vitals'],
  plugins: ['@typescript-eslint'],
  rules: {
    '@next/next/no-img-element': 'off',
    '@typescript-eslint/no-var-requires': 'off',
  },
};
