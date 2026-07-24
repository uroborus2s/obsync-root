import { createContainer } from 'awilix';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cleanupRuntimeResources,
  executeShutdownHandlers,
  setupProcessGracefulShutdown
} from '../lifecycle-shutdown.js';

function loggerMock() {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  } as any;
}

describe('lifecycle shutdown helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('runs shutdown handlers and records rejected handlers without throwing', async () => {
    const logger = loggerMock();
    const okHandler = vi.fn(async () => {});
    const brokenHandler = vi.fn(async () => {
      throw new Error('close failed');
    });

    await executeShutdownHandlers([okHandler, brokenHandler], logger);

    expect(okHandler).toHaveBeenCalledTimes(1);
    expect(brokenHandler).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        handlerIndex: 2
      }),
      'Shutdown handler 2 failed'
    );
  });

  it('cleans Fastify and root container resources', async () => {
    const logger = loggerMock();
    const fastifyInstance = { close: vi.fn(async () => {}) } as any;
    const rootContainer = createContainer();
    const clearRootContainer = vi.fn();

    await cleanupRuntimeResources({
      clearRootContainer,
      fastifyInstance,
      logger,
      rootContainer
    });

    expect(fastifyInstance.close).toHaveBeenCalledTimes(1);
    expect(clearRootContainer).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      '✅ Cleanup completed successfully'
    );
  });

  it('logs and rethrows cleanup failures', async () => {
    const logger = loggerMock();
    const closeError = new Error('close failed');
    const fastifyInstance = {
      close: vi.fn(async () => {
        throw closeError;
      })
    } as any;

    await expect(
      cleanupRuntimeResources({
        clearRootContainer: vi.fn(),
        fastifyInstance,
        logger,
        rootContainer: undefined
      })
    ).rejects.toThrow(closeError);

    expect(logger.error).toHaveBeenCalledWith(
      { err: closeError },
      '❌ Error during cleanup'
    );
  });

  it('registers SIGTERM and SIGINT graceful shutdown handlers', async () => {
    const logger = loggerMock();
    const handlers = new Map<string, () => void>();
    const stop = vi.fn(async () => {});
    const exit = vi.fn();

    setupProcessGracefulShutdown({
      exit,
      logger,
      processOn(signal, handler) {
        handlers.set(signal, handler);
      },
      stop,
      timeout: 1000
    });

    handlers.get('SIGTERM')?.();
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));

    expect(handlers.has('SIGINT')).toBe(true);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Received SIGTERM, starting graceful shutdown...'
    );
  });

  it('exits with status 1 when graceful shutdown times out', async () => {
    vi.useFakeTimers();
    const logger = loggerMock();
    const handlers = new Map<string, () => void>();
    const stop = vi.fn(() => new Promise<void>(() => {}));
    const exit = vi.fn();

    setupProcessGracefulShutdown({
      exit,
      logger,
      processOn(signal, handler) {
        handlers.set(signal, handler);
      },
      stop,
      timeout: 25
    });

    handlers.get('SIGINT')?.();
    await vi.advanceTimersByTimeAsync(25);

    expect(stop).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      'Error during graceful shutdown'
    );
  });

  it('uses the default process exit function when no exit override is provided', async () => {
    const processExit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);
    const handlers = new Map<string, () => void>();

    setupProcessGracefulShutdown({
      processOn(signal, handler) {
        handlers.set(signal, handler);
      },
      stop: async () => {},
      timeout: 1000
    });

    handlers.get('SIGTERM')?.();
    await vi.waitFor(() => expect(processExit).toHaveBeenCalledWith(0));
  });

  it('uses process.on by default for signal registration', () => {
    const beforeSigterm = new Set(process.listeners('SIGTERM'));
    const beforeSigint = new Set(process.listeners('SIGINT'));

    try {
      setupProcessGracefulShutdown({
        exit: vi.fn(),
        stop: async () => {},
        timeout: 1000
      });

      expect(process.listeners('SIGTERM').length).toBeGreaterThan(
        beforeSigterm.size
      );
      expect(process.listeners('SIGINT').length).toBeGreaterThan(
        beforeSigint.size
      );
    } finally {
      for (const listener of process.listeners('SIGTERM')) {
        if (!beforeSigterm.has(listener)) {
          process.removeListener('SIGTERM', listener);
        }
      }
      for (const listener of process.listeners('SIGINT')) {
        if (!beforeSigint.has(listener)) {
          process.removeListener('SIGINT', listener);
        }
      }
    }
  });
});
