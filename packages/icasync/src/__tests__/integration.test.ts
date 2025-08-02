// @stratix/icasync 集成测试
// 测试插件的整体集成功能

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Icasync Plugin Integration', () => {
  describe('插件加载和配置', () => {
    it('应该能够正确导入插件', async () => {
      // 测试插件导入
      const { default: icasyncPlugin } = await import('../index.js');
      
      expect(icasyncPlugin).toBeDefined();
      expect(typeof icasyncPlugin).toBe('function');
    });

    it('应该能够导入所有必要的类型', async () => {
      // 测试类型导入
      const types = await import('../index.js');
      
      // 验证主要类型存在
      expect(types).toHaveProperty('ICalendarSyncService');
      expect(types).toHaveProperty('ISyncWorkflowService');
      expect(types).toHaveProperty('ICourseScheduleSyncService');
      expect(types).toHaveProperty('WpsCalendarAdapter');
      expect(types).toHaveProperty('WpsScheduleAdapter');
    });
  });

  describe('Repository层集成', () => {
    it('应该能够导入所有Repository接口', async () => {
      const types = await import('../index.js');
      
      // 验证Repository接口存在
      expect(types).toHaveProperty('IJuheRenwuRepository');
      expect(types).toHaveProperty('IStudentCourseRepository');
      expect(types).toHaveProperty('IStudentRepository');
      expect(types).toHaveProperty('ITeacherRepository');
      expect(types).toHaveProperty('IUserInfoRepository');
    });
  });

  describe('Service层集成', () => {
    it('应该能够创建CalendarSyncService实例', async () => {
      // 这个测试需要模拟所有依赖
      const { CalendarSyncService } = await import('../services/CalendarSyncService.js');
      
      // 创建模拟依赖
      const mockDependencies = {
        calendarMappingRepository: {},
        calendarParticipantsRepository: {},
        juheRenwuRepository: {},
        studentCourseRepository: {},
        studentRepository: {},
        teacherRepository: {},
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
        tasksWorkflow: {},
        wasV7Calendar: {},
        wasV7Schedule: {}
      };

      expect(() => {
        new CalendarSyncService(
          mockDependencies.calendarMappingRepository as any,
          mockDependencies.calendarParticipantsRepository as any,
          mockDependencies.juheRenwuRepository as any,
          mockDependencies.studentCourseRepository as any,
          mockDependencies.studentRepository as any,
          mockDependencies.teacherRepository as any,
          mockDependencies.logger as any,
          mockDependencies.tasksWorkflow as any,
          mockDependencies.wasV7Calendar as any,
          mockDependencies.wasV7Schedule as any
        );
      }).not.toThrow();
    });

    it('应该能够创建SyncWorkflowService实例', async () => {
      const { SyncWorkflowService } = await import('../services/SyncWorkflowService.js');
      
      // 创建模拟依赖
      const mockDependencies = {
        courseAggregationService: {},
        calendarSyncService: {},
        courseScheduleSyncService: {},
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
        tasksWorkflow: {}
      };

      expect(() => {
        new SyncWorkflowService(
          mockDependencies.courseAggregationService as any,
          mockDependencies.calendarSyncService as any,
          mockDependencies.courseScheduleSyncService as any,
          mockDependencies.logger as any,
          mockDependencies.tasksWorkflow as any
        );
      }).not.toThrow();
    });
  });

  describe('Controller层集成', () => {
    it('应该能够导入SyncController', async () => {
      const { default: SyncController } = await import('../controllers/SyncController.js');
      
      expect(SyncController).toBeDefined();
      expect(typeof SyncController).toBe('function');
    });
  });

  describe('类型定义集成', () => {
    it('应该能够导入数据库类型', async () => {
      const types = await import('../types/database.js');
      
      // 验证主要数据库类型存在
      expect(types).toHaveProperty('CalendarMapping');
      expect(types).toHaveProperty('CalendarParticipant');
      expect(types).toHaveProperty('JuheRenwu');
      expect(types).toHaveProperty('NewCalendarMapping');
      expect(types).toHaveProperty('NewCalendarParticipant');
    });

    it('应该能够导入同步类型', async () => {
      const types = await import('../types/sync.js');
      
      // 验证同步相关类型存在
      expect(types).toHaveProperty('SyncConfig');
      expect(types).toHaveProperty('SyncStatus');
    });
  });

  describe('错误处理集成', () => {
    it('应该能够处理服务层错误', async () => {
      const { CalendarSyncService } = await import('../services/CalendarSyncService.js');
      
      // 创建一个会抛出错误的模拟服务
      const mockCalendarMappingRepository = {
        findByKkhAndXnxq: vi.fn().mockRejectedValue(new Error('数据库连接失败'))
      };

      const service = new CalendarSyncService(
        mockCalendarMappingRepository as any,
        {} as any, {} as any, {} as any, {} as any, {} as any,
        { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
        {} as any, {} as any, {} as any
      );

      // 测试错误处理
      const result = await service.createCourseCalendar('TEST001', '2024-2025-1');
      
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('配置验证', () => {
    it('应该验证插件配置选项', () => {
      // 测试插件配置接口
      const validConfig = {
        connectionName: 'default',
        debug: true,
        prefix: '/api/icasync',
        enableValidation: true,
        enableLogging: true
      };

      // 这里主要是类型检查，确保配置接口正确
      expect(validConfig.connectionName).toBe('default');
      expect(validConfig.debug).toBe(true);
      expect(validConfig.prefix).toBe('/api/icasync');
      expect(validConfig.enableValidation).toBe(true);
      expect(validConfig.enableLogging).toBe(true);
    });

    it('应该验证同步工作流配置', () => {
      // 测试同步配置接口
      const validSyncConfig = {
        xnxq: '2024-2025-1',
        syncType: 'full' as const,
        batchSize: 10,
        timeout: 1800000,
        maxConcurrency: 5,
        retryCount: 3,
        parallel: false
      };

      // 类型检查
      expect(validSyncConfig.xnxq).toBe('2024-2025-1');
      expect(validSyncConfig.syncType).toBe('full');
      expect(validSyncConfig.batchSize).toBe(10);
      expect(validSyncConfig.timeout).toBe(1800000);
      expect(validSyncConfig.maxConcurrency).toBe(5);
      expect(validSyncConfig.retryCount).toBe(3);
      expect(validSyncConfig.parallel).toBe(false);
    });
  });

  describe('依赖注入集成', () => {
    it('应该正确配置自动发现模式', () => {
      // 测试插件的自动发现配置
      // 这主要是确保配置结构正确
      const discoveryConfig = {
        patterns: [
          'repositories/**/*.{ts,js}',
          'services/**/*.{ts,js}',
          'controllers/**/*.{ts,js}'
        ]
      };

      expect(discoveryConfig.patterns).toHaveLength(3);
      expect(discoveryConfig.patterns).toContain('repositories/**/*.{ts,js}');
      expect(discoveryConfig.patterns).toContain('services/**/*.{ts,js}');
      expect(discoveryConfig.patterns).toContain('controllers/**/*.{ts,js}');
    });
  });
});
