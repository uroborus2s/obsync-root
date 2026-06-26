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
        lines: 43,
        functions: 38,
        branches: 34,
        statements: 42,
        'src/bootstrap/application-bootstrap.ts': {
          lines: 70,
          functions: 75,
          branches: 50,
          statements: 70
        },
        'src/bootstrap/eager-initialization.ts': {
          lines: 80,
          functions: 70,
          branches: 60,
          statements: 80
        },
        'src/bootstrap/error-handling.ts': {
          lines: 75,
          functions: 95,
          branches: 60,
          statements: 75
        },
        'src/bootstrap/lifecycle-shutdown.ts': {
          lines: 85,
          functions: 85,
          branches: 70,
          statements: 85
        },
        'src/bootstrap/observability.ts': {
          lines: 95,
          functions: 95,
          branches: 80,
          statements: 95
        },
        'src/bootstrap/plugin-loader.ts': {
          lines: 85,
          functions: 80,
          branches: 55,
          statements: 85
        },
        'src/bootstrap/request-context.ts': {
          lines: 90,
          functions: 95,
          branches: 60,
          statements: 90
        },
        'src/bootstrap/request-identity.ts': {
          lines: 90,
          functions: 80,
          branches: 80,
          statements: 90
        },
        'src/bootstrap/security.ts': {
          lines: 90,
          functions: 95,
          branches: 75,
          statements: 90
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
