import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-unused-vars': 'warn',
      'react/prop-types': 'off',
    },
  },
  {
    files: ['test_*.js', '*.config.js', 'check_*.cjs', 'functions/**/*.js', 'scripts/**/*.js', 'check_*.js', 'debug_*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'off', // Or keep enabled and rely on globals
      'no-unused-vars': 'off'
    }
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        importScripts: 'readonly',
        firebase: 'readonly',
        clients: 'readonly',
      }
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off'
    }
  },
  prettier,
];
