import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 42,
        functions: 36,
        branches: 32,
        statements: 41,
        'src/bootstrap/application-bootstrap.ts': {
          lines: 70,
          functions: 75,
          branches: 50,
          statements: 70
        },
        'src/discovery/**': {
          lines: 65,
          functions: 80,
          branches: 50,
          statements: 65
        }
      },
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/__tests__/**',
        'src/types/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
