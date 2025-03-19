import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, StratixApp } from '../src/index.js';

describe('Plugin System', () => {
  let app: StratixApp;

  beforeEach(() => {
    app = createApp({ name: 'test-app' });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('plugin registration', () => {
    it('should register a plugin function', async () => {
      const plugin = vi.fn();
      app.register(plugin);

      await app.start();

      expect(plugin).toHaveBeenCalled();
    });

    it('should register a plugin object', async () => {
      const register = vi.fn();
      const plugin = {
        name: 'test-plugin',
        register
      };

      app.register(plugin);

      await app.start();

      expect(register).toHaveBeenCalled();
    });

    it('should pass options to plugin', async () => {
      const plugin = vi.fn();
      const options = { test: true };

      app.register(plugin, options);

      await app.start();

      expect(plugin).toHaveBeenCalledWith(app, options);
    });
  });

  describe('plugin dependencies', () => {
    it('should handle plugins with dependencies', async () => {
      const dependency = {
        name: 'dependency',
        register: vi.fn()
      };

      const plugin = {
        name: 'plugin',
        dependencies: ['dependency'],
        register: vi.fn()
      };

      app.register(dependency);
      app.register(plugin);

      await app.start();

      expect(dependency.register).toHaveBeenCalled();
      expect(plugin.register).toHaveBeenCalled();
    });

    it('should throw when a dependency is missing', async () => {
      const plugin = {
        name: 'plugin',
        dependencies: ['missing-dependency'],
        register: vi.fn()
      };

      app.register(plugin);

      await expect(app.start()).rejects.toThrow(/missing-dependency/);
    });
  });

  describe('plugin decorators', () => {
    it('should allow plugins to decorate the app', async () => {
      app.register(async (app: StratixApp) => {
        app.decorate('testUtil', () => 'test');
      });

      await app.start();

      expect(app.testUtil).toBeDefined();
      expect(app.testUtil()).toBe('test');
    });

    it('should throw when decorating with an existing property', async () => {
      app.decorate('test', () => {});

      expect(() => {
        app.decorate('test', () => {});
      }).toThrow();
    });
  });

  describe('plugin encapsulation', () => {
    it('should encapsulate plugin decorations', async () => {
      app.register(async (parentApp: StratixApp) => {
        parentApp.decorate('parentUtil', () => 'parent');

        parentApp.register(async (childApp: StratixApp) => {
          childApp.decorate('childUtil', () => 'child');

          // Child can access parent decorations
          expect(childApp.parentUtil).toBeDefined();
          expect(childApp.parentUtil()).toBe('parent');
        });
      });

      await app.start();

      // Root app cannot access child decorations
      expect(app.parentUtil).toBeDefined();
      expect(() => app.childUtil).toThrow();
    });
  });
});
