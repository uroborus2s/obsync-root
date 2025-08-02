/**
 * QueueManager 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueueManager } from '../core/queue-manager.js';
import { QueueManagerConfig } from '../types/index.js';

describe('QueueManager', () => {
  let queueManager: QueueManager;
  let config: QueueManagerConfig;

  beforeEach(() => {
    config = {
      redis: {
        single: {
          host: 'localhost',
          port: 6379
        }
      }
    };
    queueManager = new QueueManager(config);
  });

  afterEach(async () => {
    if (queueManager) {
      await queueManager.stop();
      await queueManager.disconnect();
    }
  });

  describe('构造函数', () => {
    it('应该正确初始化QueueManager', () => {
      expect(queueManager).toBeDefined();
      expect(queueManager.config).toEqual(config);
    });

    it('应该在没有Redis配置时抛出错误', () => {
      expect(() => {
        new QueueManager({} as QueueManagerConfig);
      }).toThrow('Redis configuration is required');
    });
  });

  describe('连接管理', () => {
    it('应该能够连接到Redis', async () => {
      // 模拟Redis连接
      const mockConnect = vi.fn().mockResolvedValue(undefined);
      queueManager['connectionManager'].connect = mockConnect;

      await queueManager.connect();
      expect(mockConnect).toHaveBeenCalled();
    });

    it('应该能够断开Redis连接', async () => {
      const mockDisconnect = vi.fn().mockResolvedValue(undefined);
      queueManager['connectionManager'].disconnect = mockDisconnect;

      await queueManager.disconnect();
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('应该正确检查连接状态', () => {
      const mockIsHealthy = vi.fn().mockReturnValue(true);
      queueManager['connectionManager'].isConnectionHealthy = mockIsHealthy;

      const isConnected = queueManager.isConnected();
      expect(isConnected).toBe(true);
      expect(mockIsHealthy).toHaveBeenCalled();
    });
  });

  describe('队列管理', () => {
    beforeEach(async () => {
      // 模拟连接
      queueManager['connectionManager'].isConnectionHealthy = vi.fn().mockReturnValue(true);
    });

    it('应该能够创建队列', async () => {
      const queueName = 'test-queue';
      const queue = await queueManager.createQueue(queueName);

      expect(queue).toBeDefined();
      expect(queue.name).toBe(queueName);
      expect(queueManager.getQueue(queueName)).toBe(queue);
    });

    it('应该在创建重复队列时抛出错误', async () => {
      const queueName = 'test-queue';
      await queueManager.createQueue(queueName);

      await expect(queueManager.createQueue(queueName)).rejects.toThrow();
    });

    it('应该能够删除队列', async () => {
      const queueName = 'test-queue';
      await queueManager.createQueue(queueName);

      const deleted = await queueManager.deleteQueue(queueName);
      expect(deleted).toBe(true);
      expect(queueManager.getQueue(queueName)).toBeNull();
    });

    it('应该在删除不存在的队列时返回false', async () => {
      const deleted = await queueManager.deleteQueue('non-existent');
      expect(deleted).toBe(false);
    });

    it('应该能够列出所有队列', async () => {
      await queueManager.createQueue('queue1');
      await queueManager.createQueue('queue2');

      const queues = queueManager.listQueues();
      expect(queues).toContain('queue1');
      expect(queues).toContain('queue2');
      expect(queues).toHaveLength(2);
    });
  });

  describe('队列名称验证', () => {
    it('应该拒绝空队列名称', async () => {
      await expect(queueManager.createQueue('')).rejects.toThrow('Queue name must be a non-empty string');
    });

    it('应该拒绝包含非法字符的队列名称', async () => {
      await expect(queueManager.createQueue('test@queue')).rejects.toThrow('Queue name can only contain letters, numbers, underscores and hyphens');
    });

    it('应该拒绝过长的队列名称', async () => {
      const longName = 'a'.repeat(101);
      await expect(queueManager.createQueue(longName)).rejects.toThrow('Queue name cannot exceed 100 characters');
    });

    it('应该接受有效的队列名称', async () => {
      const validNames = ['test-queue', 'test_queue', 'testQueue123', 'queue-1'];
      
      for (const name of validNames) {
        const queue = await queueManager.createQueue(name);
        expect(queue.name).toBe(name);
      }
    });
  });

  describe('生命周期管理', () => {
    it('应该能够启动队列管理器', async () => {
      const mockConnect = vi.fn().mockResolvedValue(undefined);
      queueManager['connectionManager'].connect = mockConnect;
      queueManager['connectionManager'].isConnectionHealthy = vi.fn().mockReturnValue(true);

      await queueManager.start();
      expect(queueManager['isStarted']).toBe(true);
    });

    it('应该能够停止队列管理器', async () => {
      queueManager['isStarted'] = true;
      
      await queueManager.stop();
      expect(queueManager['isStarted']).toBe(false);
    });

    it('应该在重复启动时不报错', async () => {
      queueManager['isStarted'] = true;
      
      await expect(queueManager.start()).resolves.not.toThrow();
    });

    it('应该在重复停止时不报错', async () => {
      queueManager['isStarted'] = false;
      
      await expect(queueManager.stop()).resolves.not.toThrow();
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const mockHealthCheck = vi.fn().mockResolvedValue(true);
      queueManager['connectionManager'].healthCheck = mockHealthCheck;

      const health = await queueManager.healthCheck();
      expect(health).toBeDefined();
      expect(health.timestamp).toBeDefined();
    });

    it('应该在健康检查失败时返回不健康状态', async () => {
      const mockHealthCheck = vi.fn().mockRejectedValue(new Error('Connection failed'));
      queueManager['connectionManager'].healthCheck = mockHealthCheck;

      const health = await queueManager.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.error).toBeDefined();
    });
  });

  describe('指标收集', () => {
    it('应该返回系统指标', async () => {
      const mockGetConnectionInfo = vi.fn().mockReturnValue([]);
      queueManager['connectionManager'].getConnectionInfo = mockGetConnectionInfo;

      const metrics = await queueManager.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.system).toBeDefined();
      expect(metrics.connections).toBeDefined();
    });
  });

  describe('事件处理', () => {
    it('应该正确处理连接事件', () => {
      const connectSpy = vi.fn();
      queueManager.on('connected', connectSpy);

      queueManager.emit('connected');
      expect(connectSpy).toHaveBeenCalled();
    });

    it('应该正确处理错误事件', () => {
      const errorSpy = vi.fn();
      queueManager.on('error', errorSpy);

      const error = new Error('Test error');
      queueManager.emit('error', error);
      expect(errorSpy).toHaveBeenCalledWith(error);
    });
  });
});
