import { AwilixContainer } from 'awilix';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, StratixApp } from '../src/index.js';

describe('Dependency Injection', () => {
  let app: StratixApp;

  beforeEach(() => {
    app = createApp({ name: 'test-app' });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('inject', () => {
    it('should inject a factory function', async () => {
      app.inject('testService', () => ({
        getValue: () => 'test value'
      }));

      const service = await app.resolve('testService');
      expect(service).toBeDefined();
      expect(service.getValue()).toBe('test value');
    });

    it('should inject a value', async () => {
      const value = { data: 'test data' };
      app.injectValue('testValue', value);

      const resolvedValue = await app.resolve('testValue');
      expect(resolvedValue).toBe(value);
    });

    it('should inject a class', async () => {
      class TestService {
        getValue() {
          return 'class value';
        }
      }

      app.injectClass('testClass', TestService);

      const service = await app.resolve('testClass');
      expect(service).toBeInstanceOf(TestService);
      expect(service.getValue()).toBe('class value');
    });
  });

  describe('resolve', () => {
    it('should resolve a registered dependency', async () => {
      app.inject('service', () => ({ name: 'test' }));

      const service = await app.resolve('service');
      expect(service).toBeDefined();
      expect(service.name).toBe('test');
    });

    it('should throw when resolving an unknown dependency', async () => {
      await expect(app.resolve('unknown')).rejects.toThrow();
    });

    it('should resolve dependencies with their own dependencies', async () => {
      app.inject('config', () => ({ apiKey: '12345' }));

      app.inject('apiService', async (container: AwilixContainer) => {
        const config = await container.resolve('config');
        return {
          makeRequest: () => `Using API key: ${config.apiKey}`
        };
      });

      const apiService = await app.resolve('apiService');
      expect(apiService.makeRequest()).toBe('Using API key: 12345');
    });
  });
});
