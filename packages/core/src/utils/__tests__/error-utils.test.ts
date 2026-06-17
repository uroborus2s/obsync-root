import { describe, expect, it, vi } from 'vitest';
import { ErrorUtils, withErrorHandling, withRetry } from '../error-utils.js';

describe('ErrorUtils', () => {
  describe('extractMessage', () => {
    it('extracts messages from common error shapes', () => {
      expect(ErrorUtils.extractMessage(new Error('boom'))).toBe('boom');
      expect(ErrorUtils.extractMessage('plain')).toBe('plain');
      expect(ErrorUtils.extractMessage({ message: 'object' })).toBe('object');
      expect(ErrorUtils.extractMessage(undefined)).toBe('undefined');
    });
  });

  describe('wrapError', () => {
    it('wraps with context and preserves stack by default', () => {
      const original = new Error('Original error');
      const wrapped = ErrorUtils.wrapError(original, {
        context: 'TestContext'
      });

      expect(wrapped.message).toBe('TestContext: Original error');
      expect(wrapped.stack).toContain('Caused by:');
      expect(wrapped.stack).toContain(original.stack);
    });

    it('logs with Pino object-first signature', () => {
      const logger = { error: vi.fn() };
      const original = new Error('Original error');

      ErrorUtils.wrapError(original, {
        context: 'TestContext',
        logger: logger as any,
        metadata: { operation: 'test' }
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Original error',
            name: 'Error',
            timestamp: expect.any(String)
          }),
          metadata: { operation: 'test' }
        }),
        'TestContext: Original error'
      );
    });
  });

  describe('safeExecute', () => {
    it('returns the result for successful operations', async () => {
      await expect(
        ErrorUtils.safeExecute(() => 'success', { defaultValue: 'default' })
      ).resolves.toBe('success');
    });

    it('returns the default value and logs failures', async () => {
      const logger = { error: vi.fn() };

      const result = await ErrorUtils.safeExecute(
        () => {
          throw new Error('Function failed');
        },
        {
          defaultValue: 'default',
          logger: logger as any,
          context: {
            component: 'TestComponent',
            operation: 'testOperation'
          }
        }
      );

      expect(result).toBe('default');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: 'Function failed' }),
          defaultValue: 'default',
          context: {
            component: 'TestComponent',
            operation: 'testOperation'
          }
        }),
        'Safe execution failed in TestComponent.testOperation: Function failed'
      );
    });
  });

  describe('safeExecuteSync', () => {
    it('returns default value when sync operation throws', () => {
      expect(
        ErrorUtils.safeExecuteSync(
          () => {
            throw new Error('Function failed');
          },
          { defaultValue: 'default' }
        )
      ).toBe('default');
    });
  });

  describe('utility functions', () => {
    it('checks error shapes and formats logs', () => {
      const systemError = Object.assign(new Error('missing'), {
        code: 'ENOENT',
        errno: -2
      });

      expect(ErrorUtils.isError(systemError)).toBe(true);
      expect(ErrorUtils.extractErrorCode(systemError)).toBe('ENOENT');
      expect(ErrorUtils.isSystemError(systemError)).toBe(true);
      expect(
        ErrorUtils.formatForLogging(systemError, {
          component: 'fs',
          operation: 'read'
        })
      ).toMatchObject({
        message: 'missing',
        name: 'Error',
        code: 'ENOENT',
        errno: -2,
        context: {
          component: 'fs',
          operation: 'read'
        }
      });
    });
  });

  describe('withErrorHandling', () => {
    it('wraps sync and async errors through the named export', async () => {
      const syncWrapped = withErrorHandling(() => {
        throw new Error('sync');
      }, 'SyncContext');
      const asyncWrapped = withErrorHandling(async () => {
        throw new Error('async');
      }, 'AsyncContext');

      expect(() => syncWrapped()).toThrow('SyncContext: sync');
      await expect(asyncWrapped()).rejects.toThrow('AsyncContext: async');
    });

    it('does not affect successful values', () => {
      const wrapped = withErrorHandling((value: number) => value * 2, 'Math');

      expect(wrapped(4)).toBe(8);
    });
  });

  describe('withRetry', () => {
    it('retries failures until success', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('first'))
        .mockResolvedValue('success');

      await expect(
        withRetry(fn, { maxRetries: 2, delay: 1 })
      ).resolves.toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('wraps the final failure after retries are exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('persistent'));

      await expect(
        withRetry(fn, {
          maxRetries: 1,
          delay: 1,
          context: 'RetryContext'
        })
      ).rejects.toThrow('RetryContext (after 1 retries): persistent');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
