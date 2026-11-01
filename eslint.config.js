export default [{
  files: ['blocks/**/*.js', 'tests/**/*.js'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: Object.fromEntries([
      'window', 'document', 'console', 'fetch', 'URL', 'URLSearchParams', 'DOMParser',
    ].map((name) => [name, 'readonly'])),
  },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': 'error',
    'no-unreachable': 'error',
    'no-constant-condition': 'error',
  },
}];
