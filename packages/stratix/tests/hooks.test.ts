import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, StratixApp } from '../src/index.js';

describe('Hooks System', () => {
  let app: StratixApp;

  beforeEach(() => {
    app = createApp({ name: 'test-app' });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('addHook', () => {
    it('should add a hook handler', async () => {
      const handler = vi.fn();
      app.addHook('beforeStart', handler);

      await app.start();

      expect(handler).toHaveBeenCalled();
    });

    it('should add multiple hooks of the same type', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      app.addHook('beforeStart', handler1);
      app.addHook('beforeStart', handler2);

      await app.start();

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should execute hooks in registration order', async () => {
      const order: number[] = [];

      app.addHook('beforeStart', async () => {
        order.push(1);
      });

      app.addHook('beforeStart', async () => {
        order.push(2);
      });

      await app.start();

      expect(order).toEqual([1, 2]);
    });

    it('should return the app instance for chaining', () => {
      const result = app.addHook('beforeStart', () => {});
      expect(result).toBe(app);
    });
  });

  describe('lifecycle hooks', () => {
    it('should execute beforeStart hooks before starting', async () => {
      const beforeStart = vi.fn();
      app.addHook('beforeStart', beforeStart);

      await app.start();

      expect(beforeStart).toHaveBeenCalled();
    });

    it('should execute afterStart hooks after starting', async () => {
      const afterStart = vi.fn();
      app.addHook('afterStart', afterStart);

      await app.start();

      expect(afterStart).toHaveBeenCalled();
    });

    it('should execute beforeClose hooks before closing', async () => {
      const beforeClose = vi.fn();
      app.addHook('beforeClose', beforeClose);

      await app.start();
      await app.close();

      expect(beforeClose).toHaveBeenCalled();
    });

    it('should execute afterClose hooks after closing', async () => {
      const afterClose = vi.fn();
      app.addHook('afterClose', afterClose);

      await app.start();
      await app.close();

      expect(afterClose).toHaveBeenCalled();
    });
  });

  describe('custom hooks', () => {
    it('should support custom hook types', async () => {
      const customHook = vi.fn();
      app.addHook('customEvent', customHook);

      await app.runHook('customEvent', { data: 'test' });

      expect(customHook).toHaveBeenCalledWith({ data: 'test' });
    });
  });
});
