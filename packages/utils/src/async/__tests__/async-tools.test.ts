/**
 * 异步工具测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { sleep } from '../common.js';
import {
  SmartQueue,
  ResourcePool,
  RateLimiter,
  TaskPriority
} from '../concurrency.js';
import {
  executePromises,
  executeParallel,
  executeSequential,
  executeMixed,
  withRetry,
  withTimeout,
  ExecutionMode,
  ErrorAggregator
} from '../promise-combinators.js';

describe('Promise Combinators', () => {
  describe('executePromises', () => {
    it('应该并行执行Promise', async () => {
      const startTime = Date.now();
      const promises = [
        () => sleep(100).then(() => 1),
        () => sleep(100).then(() => 2),
        () => sleep(100).then(() => 3)
      ];

      const result = await executePromises(promises, {
        mode: ExecutionMode.Parallel
      });
      const duration = Date.now() - startTime;

      expect(result.results).toEqual([1, 2, 3]);
      expect(result.errors).toEqual([]);
      expect(result.stats.successful).toBe(3);
      expect(duration).toBeLessThan(200); // 并行执行应该快于串行
    });

    it('应该串行执行Promise', async () => {
      const startTime = Date.now();
      const promises = [
        () => sleep(50).then(() => 1),
        () => sleep(50).then(() => 2),
        () => sleep(50).then(() => 3)
      ];

      const result = await executePromises(promises, {
        mode: ExecutionMode.Sequential
      });
      const duration = Date.now() - startTime;

      expect(result.results).toEqual([1, 2, 3]);
      expect(result.errors).toEqual([]);
      expect(duration).toBeGreaterThan(140); // 串行执行应该慢于并行
    });

    it('应该处理错误而不中断其他任务', async () => {
      const promises = [
        () => Promise.resolve(1),
        () => Promise.reject(new Error('test error')),
        () => Promise.resolve(3)
      ];

      const result = await executePromises(promises);

      expect(result.results).toEqual([1, 3]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('test error');
    });

    it('应该支持超时控制', async () => {
      const promises = [
        () => sleep(200).then(() => 1),
        () => sleep(50).then(() => 2)
      ];

      const result = await executePromises(promises, { timeout: 100 });

      expect(result.results).toEqual([2]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('timed out');
    });
  });

  describe('withRetry', () => {
    it('应该成功重试失败的操作', async () => {
      let attempts = 0;
      const fn = () => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('fail'));
        }
        return Promise.resolve('success');
      };

      const result = await withRetry(fn, { retries: 3 });

      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toBe('success');
      }
      expect(attempts).toBe(3);
    });

    it('应该在重试次数用完后失败', async () => {
      const fn = () => Promise.reject(new Error('persistent error'));

      const result = await withRetry(fn, { retries: 2 });

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left.message).toBe('persistent error');
      }
    });
  });

  describe('withTimeout', () => {
    it('应该在超时时拒绝Promise', async () => {
      const slowPromise = sleep(200);

      await expect(withTimeout(slowPromise, 100)).rejects.toThrow(
        'Operation timed out'
      );
    });

    it('应该在超时前正常完成', async () => {
      const fastPromise = sleep(50).then(() => 'done');

      const result = await withTimeout(fastPromise, 100);
      expect(result).toBe('done');
    });
  });

  describe('ErrorAggregator', () => {
    it('应该正确聚合多个错误', () => {
      const aggregator = new ErrorAggregator();

      aggregator.add(new Error('Error 1'));
      aggregator.add(new Error('Error 2'));

      expect(aggregator.hasErrors()).toBe(true);
      expect(aggregator.getErrors()).toHaveLength(2);

      const aggregated = aggregator.getAggregatedError();
      expect(aggregated?.message).toContain('Multiple errors occurred');
      expect(aggregated?.message).toContain('Error 1');
      expect(aggregated?.message).toContain('Error 2');
    });
  });
});

describe('Concurrency Control', () => {
  describe('SmartQueue', () => {
    let queue: SmartQueue<number>;

    beforeEach(() => {
      queue = new SmartQueue({ maxConcurrency: 2, autoStart: true });
    });

    it('应该按优先级执行任务', async () => {
      const results: number[] = [];

      await queue.add(
        () =>
          sleep(10).then(() => {
            results.push(1);
            return 1;
          }),
        { priority: TaskPriority.Low }
      );
      await queue.add(
        () =>
          sleep(10).then(() => {
            results.push(2);
            return 2;
          }),
        { priority: TaskPriority.High }
      );
      await queue.add(
        () =>
          sleep(10).then(() => {
            results.push(3);
            return 3;
          }),
        { priority: TaskPriority.Normal }
      );

      await queue.waitForAll();

      expect(results[0]).toBe(2); // High priority should execute first
    });

    it('应该限制并发数量', async () => {
      let runningCount = 0;
      let maxRunning = 0;

      const task = () => {
        runningCount++;
        maxRunning = Math.max(maxRunning, runningCount);
        return sleep(50).then(() => {
          runningCount--;
          return 1;
        });
      };

      // 添加5个任务，但并发限制为2
      for (let i = 0; i < 5; i++) {
        await queue.add(task);
      }

      await queue.waitForAll();

      expect(maxRunning).toBeLessThanOrEqual(2);
    });

    it('应该提供准确的统计信息', async () => {
      await queue.add(() => Promise.resolve(1));
      await queue.add(() => Promise.reject(new Error('fail')));

      await queue.waitForAll();

      const stats = queue.getStats();
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.total).toBe(2);
    });
  });

  describe('ResourcePool', () => {
    it('应该正确管理资源池', async () => {
      let createdCount = 0;
      const pool = new ResourcePool({
        factory: async () => ({ id: ++createdCount }),
        maxSize: 2
      });

      const resource1 = await pool.acquire();
      const resource2 = await pool.acquire();

      expect(resource1.id).toBe(1);
      expect(resource2.id).toBe(2);

      await pool.release(resource1);
      const resource3 = await pool.acquire();

      expect(resource3.id).toBe(1); // 应该重用资源

      await pool.destroy();
    });

    it('应该阻塞当资源池满时', async () => {
      const pool = new ResourcePool({
        factory: async () => ({ id: Date.now() }),
        maxSize: 1
      });

      const resource1 = await pool.acquire();

      let acquired = false;
      const acquirePromise = pool.acquire().then(() => {
        acquired = true;
      });

      await sleep(50);
      expect(acquired).toBe(false);

      await pool.release(resource1);
      await acquirePromise;
      expect(acquired).toBe(true);

      await pool.destroy();
    });
  });

  describe('RateLimiter', () => {
    it('应该限制操作频率', async () => {
      const limiter = new RateLimiter(2, 1); // 2个令牌，每秒补充1个

      const startTime = Date.now();

      // 快速消耗令牌
      await limiter.acquire(1);
      await limiter.acquire(1);

      // 这次应该需要等待
      await limiter.acquire(1);

      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThan(900); // 应该等待约1秒
    });

    it('应该正确检查令牌可用性', async () => {
      const limiter = new RateLimiter(2, 10);

      expect(limiter.canAcquire(1)).toBe(true);
      expect(limiter.canAcquire(2)).toBe(true);
      expect(limiter.canAcquire(3)).toBe(false);

      await limiter.acquire(2);
      expect(limiter.canAcquire(1)).toBe(false);
    });
  });
});
