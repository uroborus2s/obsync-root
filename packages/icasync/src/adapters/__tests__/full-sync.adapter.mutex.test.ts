/**
 * FullSyncAdapter 互斥功能测试
 */

import type { AwilixContainer } from '@stratix/core';
import type WorkflowMutexService from '@stratix/tasks/src/services/WorkflowMutexService.js';
import FullSyncAdapter from '../FullSync.adapter.js';
import { SyncStatus } from '../../types/sync.js';

describe('FullSyncAdapter Mutex Tests', () => {
  let adapter: FullSyncAdapter;
  let mockContainer: AwilixContainer;
  let mockMutexService: jest.Mocked<WorkflowMutexService>;
  let mockTasksWorkflow: any;
  let mockLogger: any;

  beforeEach(() => {
    // Mock dependencies
    mockMutexService = {
      createMutexWorkflow: jest.fn()
    } as any;

    mockTasksWorkflow = {
      executeWorkflow: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    mockContainer = {
      resolve: jest.fn((name: string) => {
        switch (name) {
          case 'workflowMutexService':
            return mockMutexService;
          case 'tasksWorkflow':
            return mockTasksWorkflow;
          case 'logger':
            return mockLogger;
          default:
            throw new Error(`Unknown dependency: ${name}`);
        }
      })
    } as any;

    adapter = new FullSyncAdapter(mockContainer);
  });

  describe('Mutex Functionality', () => {
    it('should create mutex workflow successfully', async () => {
      // Arrange
      const config = { xnxq: '2024-01' };
      const mockInstance = { id: 123 };
      
      mockMutexService.createMutexWorkflow.mockResolvedValue({
        success: true,
        instance: mockInstance
      } as any);

      mockTasksWorkflow.executeWorkflow.mockResolvedValue({
        success: true,
        data: { result: 'success' }
      });

      // Act
      const result = await adapter.executeFullSync(config);

      // Assert
      expect(mockMutexService.createMutexWorkflow).toHaveBeenCalledWith(
        { name: 'icasync-full-sync', version: '2.0.0' },
        expect.objectContaining({
          xnxq: '2024-01',
          batchSize: 100,
          timeout: '45m',
          clearExisting: true,
          createAttendanceRecords: false,
          sendNotification: true
        }),
        'icasync-full-sync:2024-01',
        expect.objectContaining({
          timeout: 1800000,
          maxConcurrency: 3
        })
      );

      expect(result.status).toBe(SyncStatus.COMPLETED);
      expect(result.details).toEqual(
        expect.objectContaining({
          workflowId: '123',
          mutexKey: 'icasync-full-sync:2024-01',
          status: 'completed'
        })
      );
    });

    it('should handle conflicting instance and return SKIPPED status', async () => {
      // Arrange
      const config = { xnxq: '2024-01' };
      const conflictingInstance = { id: 456 };
      
      mockMutexService.createMutexWorkflow.mockResolvedValue({
        success: false,
        error: '存在冲突的工作流实例',
        conflictingInstance
      } as any);

      // Act
      const result = await adapter.executeFullSync(config);

      // Assert
      expect(result.status).toBe(SyncStatus.SKIPPED);
      expect(result.details).toEqual(
        expect.objectContaining({
          reason: 'conflict',
          message: '已存在运行中的同学年学期全量同步任务',
          conflictingInstanceId: 456,
          mutexKey: 'icasync-full-sync:2024-01'
        })
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[FullSyncAdapter] 已存在运行中的全量同步任务',
        expect.objectContaining({
          xnxq: '2024-01',
          conflictingInstanceId: 456,
          mutexKey: 'icasync-full-sync:2024-01'
        })
      );
    });

    it('should handle mutex service failure', async () => {
      // Arrange
      const config = { xnxq: '2024-01' };
      
      mockMutexService.createMutexWorkflow.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      } as any);

      // Act
      const result = await adapter.executeFullSync(config);

      // Assert
      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.errors).toContain('创建互斥工作流失败: Database connection failed');
    });

    it('should use correct mutex key format for different xnxq values', async () => {
      // Arrange
      const configs = [
        { xnxq: '2024-01' },
        { xnxq: '2024-02' },
        { xnxq: '2023-02' }
      ];

      mockMutexService.createMutexWorkflow.mockResolvedValue({
        success: true,
        instance: { id: 123 }
      } as any);

      mockTasksWorkflow.executeWorkflow.mockResolvedValue({
        success: true,
        data: {}
      });

      // Act & Assert
      for (const config of configs) {
        await adapter.executeFullSync(config);
        
        expect(mockMutexService.createMutexWorkflow).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          `icasync-full-sync:${config.xnxq}`,
          expect.anything()
        );
      }
    });

    it('should pass through custom config parameters', async () => {
      // Arrange
      const config = {
        xnxq: '2024-01',
        batchSize: 200,
        timeout: 3600000 // 1 hour
      };

      mockMutexService.createMutexWorkflow.mockResolvedValue({
        success: true,
        instance: { id: 123 }
      } as any);

      mockTasksWorkflow.executeWorkflow.mockResolvedValue({
        success: true,
        data: {}
      });

      // Act
      await adapter.executeFullSync(config);

      // Assert
      expect(mockMutexService.createMutexWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          xnxq: '2024-01',
          batchSize: 200,
          timeout: '3600000ms'
        }),
        expect.anything(),
        expect.objectContaining({
          timeout: 3600000,
          maxConcurrency: 3
        })
      );
    });
  });
});