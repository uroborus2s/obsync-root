import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, StratixApp } from '../src/index.js';

describe('StratixApp', () => {
  let app: StratixApp;

  beforeEach(() => {
    app = createApp({ name: 'test-app' });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('createApp', () => {
    it('should create an app instance', () => {
      expect(app).toBeDefined();
      expect(app).toBeInstanceOf(Object);
      expect(app.name).toBe('test-app');
    });

    it('should create an app with default options', () => {
      const defaultApp = createApp();
      expect(defaultApp).toBeDefined();
      expect(defaultApp.name).toBe('stratix-app');
    });
  });

  describe('register', () => {
    it('should register a plugin function', async () => {
      const mockPlugin = vi.fn();
      app.register(mockPlugin);

      await app.start();

      expect(mockPlugin).toHaveBeenCalled();
      expect(mockPlugin).toHaveBeenCalledWith(app, {});
    });

    it('should register a plugin with options', async () => {
      const mockPlugin = vi.fn();
      const options = { test: true };

      app.register(mockPlugin, options);

      await app.start();

      expect(mockPlugin).toHaveBeenCalledWith(app, options);
    });

    it('should register a plugin object', async () => {
      const mockRegister = vi.fn();
      const plugin = {
        name: 'test-plugin',
        register: mockRegister
      };

      app.register(plugin);

      await app.start();

      expect(mockRegister).toHaveBeenCalled();
      expect(mockRegister).toHaveBeenCalledWith(app, {});
    });

    it('should return the app instance for chaining', () => {
      const result = app.register(() => {});
      expect(result).toBe(app);
    });
  });

  describe('lifecycle', () => {
    it('should start and close the app', async () => {
      const startSpy = vi.spyOn(app, 'start');
      const closeSpy = vi.spyOn(app, 'close');

      await app.start();
      expect(startSpy).toHaveBeenCalled();

      await app.close();
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
