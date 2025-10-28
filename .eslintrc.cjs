/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['next', 'next/core-web-vitals'],
  rules: {
    '@next/next/no-img-element': 'off',
  },
};
