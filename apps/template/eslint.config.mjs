import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  // 基础规则
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['**/dist/**', '**/node_modules/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    plugins: {
      import: importPlugin,
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin
    },
    rules: {
      'no-console': 'warn',
      'import/no-unresolved': 'error',
      'prettier/prettier': 'error'
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx']
        },
        typescript: {} // 解析TypeScript模块
      }
    }
  },

  // TypeScript 配置
  {
    files: ['**/*.ts', '**/*.tsx'],
    parser: tsParser,
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off'
    }
  }
];
