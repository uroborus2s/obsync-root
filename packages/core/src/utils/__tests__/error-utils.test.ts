// ErrorUtils 单元测试
// 测试统一错误处理工具的功能

import { describe, expect, it, vi } from 'vitest';
import { ErrorUtils } from '../error-utils.js';

describe('ErrorUtils', () => {
  describe('extractMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error message');
      expect(ErrorUtils.extractMessage(error)).toBe('Test error message');
    });

    it('should return string as is', () => {
      const message = 'String error message';
      expect(ErrorUtils.extractMessage(message)).toBe(message);
    });

    it('should extract message from object with message property', () => {
      const errorObj = { message: 'Object error message' };
      expect(ErrorUtils.extractMessage(errorObj)).toBe('Object error message');
    });

    it('should convert unknown types to string', () => {
      expect(ErrorUtils.extractMessage(123)).toBe('123');
      expect(ErrorUtils.extractMessage(null)).toBe('null');
      expect(ErrorUtils.extractMessage(undefined)).toBe('undefined');
    });
  });

  describe('wrapError', () => {
    it('should wrap error with context', () => {
      const originalError = new Error('Original error');
      const wrappedError = ErrorUtils.wrapError(originalError, {
        context: 'Test context'
      });

      expect(wrappedError.message).toBe('Test context: Original error');
      expect(wrappedError).toBeInstanceOf(Error);
    });

    it('should preserve stack trace when preserveStack is true', () => {
      const originalError = new Error('Original error');
      const wrappedError = ErrorUtils.wrapError(originalError, {
        context: 'Test context',
        preserveStack: true
      });

      expect(wrappedError.stack).toContain('Caused by:');
      expect(wrappedError.stack).toContain(originalError.stack);
    });

    it('should add metadata to wrapped error', () => {
      const originalError = new Error('Original error');
      const metadata = { userId: '123', operation: 'test' };
      const wrappedError = ErrorUtils.wrapError(originalError, {
        context: 'Test context',
        metadata
      });

      expect((wrappedError as any).metadata).toEqual(metadata);
    });

    it('should log error when logger is provided', () => {
      const mockLogger = {
        error: vi.fn()
      };
      const originalError = new Error('Original error');
      
      ErrorUtils.wrapError(originalError, {
        context: 'Test context',
        logger: mockLogger as any
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test context: Original error',
        expect.objectContaining({
          originalError
        })
      );
    });
  });

  describe('safeExecute', () => {
    it('should return result when function succeeds', async () => {
      const fn = () => 'success';
      const result = await ErrorUtils.safeExecute(fn, {
        defaultValue: 'default'
      });

      expect(result).toBe('success');
    });

    it('should return default value when function throws', async () => {
      const fn = () => {
        throw new Error('Function failed');
      };
      const result = await ErrorUtils.safeExecute(fn, {
        defaultValue: 'default'
      });

      expect(result).toBe('default');
    });

    it('should handle async functions', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async success';
      };
      const result = await ErrorUtils.safeExecute(fn, {
        defaultValue: 'default'
      });

      expect(result).toBe('async success');
    });

    it('should log error when logger is provided', async () => {
      const mockLogger = {
        error: vi.fn()
      };
      const fn = () => {
        throw new Error('Function failed');
      };

      await ErrorUtils.safeExecute(fn, {
        defaultValue: 'default',
        logger: mockLogger as any,
        context: {
          component: 'TestComponent',
          operation: 'testOperation'
        }
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Safe execution failed in TestComponent.testOperation'),
        expect.objectContaining({
          error: expect.any(Error),
          defaultValue: 'default'
        })
      );
    });
  });

  describe('safeExecuteSync', () => {
    it('should return result when function succeeds', () => {
      const fn = () => 'success';
      const result = ErrorUtils.safeExecuteSync(fn, {
        defaultValue: 'default'
      });

      expect(result).toBe('success');
    });

    it('should return default value when function throws', () => {
      const fn = () => {
        throw new Error('Function failed');
      };
      const result = ErrorUtils.safeExecuteSync(fn, {
        defaultValue: 'default'
      });

      expect(result).toBe('default');
    });
  });

  describe('createErrorWrapper', () => {
    it('should create a wrapper function with context', () => {
      const wrapper = ErrorUtils.createErrorWrapper('TestContext');
      const originalError = new Error('Original error');
      const wrappedError = wrapper(originalError);

      expect(wrappedError.message).toBe('TestContext: Original error');
    });

    it('should support additional context', () => {
      const wrapper = ErrorUtils.createErrorWrapper('TestContext');
      const originalError = new Error('Original error');
      const wrappedError = wrapper(originalError, 'additionalContext');

      expect(wrappedError.message).toBe('TestContext.additionalContext: Original error');
    });
  });

  describe('createSafeExecutor', () => {
    it('should create a safe executor with component context', async () => {
      const mockLogger = {
        error: vi.fn()
      };
      const executor = ErrorUtils.createSafeExecutor('TestComponent', mockLogger as any);
      
      const result = await executor('testOperation', () => {
        throw new Error('Operation failed');
      }, 'default');

      expect(result).toBe('default');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Safe execution failed in TestComponent.testOperation'),
        expect.any(Object)
      );
    });
  });

  describe('utility functions', () => {
    it('should check if value is Error', () => {
      expect(ErrorUtils.isError(new Error('test'))).toBe(true);
      expect(ErrorUtils.isError('string')).toBe(false);
      expect(ErrorUtils.isError(null)).toBe(false);
    });

    it('should check if error is of specific type', () => {
      class CustomError extends Error {}
      const customError = new CustomError('test');
      const regularError = new Error('test');

      expect(ErrorUtils.isErrorOfType(customError, CustomError)).toBe(true);
      expect(ErrorUtils.isErrorOfType(regularError, CustomError)).toBe(false);
    });

    it('should extract error code', () => {
      const errorWithCode = { code: 'ENOENT', message: 'File not found' };
      const errorWithoutCode = new Error('Regular error');

      expect(ErrorUtils.extractErrorCode(errorWithCode)).toBe('ENOENT');
      expect(ErrorUtils.extractErrorCode(errorWithoutCode)).toBeUndefined();
    });

    it('should check if error is system error', () => {
      const systemError = Object.assign(new Error('System error'), {
        code: 'ENOENT',
        errno: -2
      });
      const regularError = new Error('Regular error');

      expect(ErrorUtils.isSystemError(systemError)).toBe(true);
      expect(ErrorUtils.isSystemError(regularError)).toBe(false);
    });

    it('should format error for logging', () => {
      const error = new Error('Test error');
      const context = { component: 'TestComponent', operation: 'testOp' };
      const formatted = ErrorUtils.formatForLogging(error, context);

      expect(formatted).toMatchObject({
        message: 'Test error',
        name: 'Error',
        context,
        timestamp: expect.any(String)
      });
      expect(formatted.stack).toBeDefined();
    });
  });

  describe('withErrorHandling decorator', () => {
    it('should wrap synchronous function errors', () => {
      const fn = () => {
        throw new Error('Function error');
      };
      const wrappedFn = ErrorUtils.withErrorHandling(fn, 'TestContext');

      expect(() => wrappedFn()).toThrow('TestContext: Function error');
    });

    it('should wrap asynchronous function errors', async () => {
      const fn = async () => {
        throw new Error('Async function error');
      };
      const wrappedFn = ErrorUtils.withErrorHandling(fn, 'TestContext');

      await expect(wrappedFn()).rejects.toThrow('TestContext: Async function error');
    });

    it('should not affect successful function execution', () => {
      const fn = (x: number) => x * 2;
      const wrappedFn = ErrorUtils.withErrorHandling(fn, 'TestContext');

      expect(wrappedFn(5)).toBe(10);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await ErrorUtils.withRetry(fn, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const result = await ErrorUtils.withRetry(fn, { 
        maxRetries: 3, 
        delay: 10 
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(
        ErrorUtils.withRetry(fn, { maxRetries: 2, delay: 10 })
      ).rejects.toThrow('Persistent failure');

      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should use exponential backoff', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Failure'));
      const startTime = Date.now();

      try {
        await ErrorUtils.withRetry(fn, { 
          maxRetries: 2, 
          delay: 10, 
          backoff: 'exponential' 
        });
      } catch {
        // Expected to fail
      }

      const duration = Date.now() - startTime;
      // Should take at least 10ms + 20ms = 30ms for exponential backoff
      expect(duration).toBeGreaterThan(25);
    });
  });
});
