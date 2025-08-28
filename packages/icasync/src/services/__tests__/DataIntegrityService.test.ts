// DataIntegrityService 测试
import type { Logger } from '@stratix/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DataIntegrityService from '../DataIntegrityService.js';

// Mock 依赖
const mockJuheRenwuRepository = {
  findByIdNullable: vi.fn(),
  findByIds: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as unknown as Logger;

describe('DataIntegrityService', () => {
  let service: DataIntegrityService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DataIntegrityService(
      mockJuheRenwuRepository as any,
      mockLogger
    );
  });

  describe('validateJuheRenwuIdExists', () => {
    it('应该验证有效的juhe_renwu_id', async () => {
      mockJuheRenwuRepository.findByIdNullable.mockResolvedValue({
        success: true,
        data: { id: 1, kkh: 'TEST001' }
      });

      const result = await service.validateJuheRenwuIdExists(1);

      expect(result.valid).toBe(true);
      expect(mockJuheRenwuRepository.findByIdNullable).toHaveBeenCalledWith(1);
    });

    it('应该拒绝不存在的juhe_renwu_id', async () => {
      mockJuheRenwuRepository.findByIdNullable.mockResolvedValue({
        success: true,
        data: null
      });

      const result = await service.validateJuheRenwuIdExists(999);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('juhe_renwu_id 999 does not exist');
      expect(result.details).toEqual({ juheRenwuId: 999 });
    });

    it('应该拒绝无效的juhe_renwu_id格式', async () => {
      const result = await service.validateJuheRenwuIdExists(0);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('juhe_renwu_id must be a positive integer');
      expect(mockJuheRenwuRepository.findByIdNullable).not.toHaveBeenCalled();
    });

    it('应该处理数据库查询失败', async () => {
      mockJuheRenwuRepository.findByIdNullable.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const result = await service.validateJuheRenwuIdExists(1);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Failed to validate juhe_renwu_id');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '验证juhe_renwu_id时查询失败',
        expect.objectContaining({
          juheRenwuId: 1,
          error: 'Database connection failed'
        })
      );
    });

    it('应该处理查询异常', async () => {
      mockJuheRenwuRepository.findByIdNullable.mockRejectedValue(
        new Error('Network error')
      );

      const result = await service.validateJuheRenwuIdExists(1);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Validation error: Network error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '验证juhe_renwu_id异常',
        expect.objectContaining({
          juheRenwuId: 1,
          error: 'Network error'
        })
      );
    });
  });

  describe('validateJuheRenwuIdsExist', () => {
    it('应该验证有效的juhe_renwu_id数组', async () => {
      mockJuheRenwuRepository.findByIds.mockResolvedValue({
        success: true,
        data: [
          { id: 1, kkh: 'TEST001' },
          { id: 2, kkh: 'TEST002' }
        ]
      });

      const result = await service.validateJuheRenwuIdsExist([1, 2]);

      expect(result.valid).toBe(true);
      expect(mockJuheRenwuRepository.findByIds).toHaveBeenCalledWith([1, 2]);
      expect(mockJuheRenwuRepository.findByIds).toHaveBeenCalledTimes(1);
    });

    it('应该拒绝包含不存在ID的数组', async () => {
      mockJuheRenwuRepository.findByIds.mockResolvedValue({
        success: true,
        data: [
          { id: 1, kkh: 'TEST001' }
          // ID 999 不存在
        ]
      });

      const result = await service.validateJuheRenwuIdsExist([1, 999]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Some juhe_renwu_ids do not exist: 999');
      expect(result.details).toEqual({
        missingIds: [999],
        existingIds: [1],
        totalChecked: 2,
        missingCount: 1
      });
    });

    it('应该拒绝空数组', async () => {
      const result = await service.validateJuheRenwuIdsExist([]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('juheRenwuIds array cannot be empty');
      expect(mockJuheRenwuRepository.findByIds).not.toHaveBeenCalled();
    });

    it('应该拒绝包含无效ID格式的数组', async () => {
      const result = await service.validateJuheRenwuIdsExist([1, 0, -1]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Some juhe_renwu_ids are invalid');
      expect(result.details).toEqual({ invalidIds: [0, -1] });
      expect(mockJuheRenwuRepository.findByIds).not.toHaveBeenCalled();
    });

    it('应该处理批量验证异常', async () => {
      mockJuheRenwuRepository.findByIds.mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.validateJuheRenwuIdsExist([1, 2]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Batch validation error: Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '批量验证juhe_renwu_ids异常',
        expect.objectContaining({
          juheRenwuIds: [1, 2],
          error: 'Database error'
        })
      );
    });

    it('应该处理数据库查询失败', async () => {
      mockJuheRenwuRepository.findByIds.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const result = await service.validateJuheRenwuIdsExist([1, 2]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Failed to validate juhe_renwu_ids');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '批量验证时查询失败',
        expect.objectContaining({
          uniqueIds: [1, 2],
          error: 'Database connection failed'
        })
      );
    });

    it('应该去重重复的ID', async () => {
      mockJuheRenwuRepository.findByIds.mockResolvedValue({
        success: true,
        data: [
          { id: 1, kkh: 'TEST001' },
          { id: 2, kkh: 'TEST002' }
        ]
      });

      const result = await service.validateJuheRenwuIdsExist([1, 2, 1, 2]); // 重复的ID

      expect(result.valid).toBe(true);
      // 验证只查询了去重后的ID
      expect(mockJuheRenwuRepository.findByIds).toHaveBeenCalledWith([1, 2]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '开始批量验证juhe_renwu_ids',
        expect.objectContaining({
          totalIds: 4,
          uniqueIds: 2
        })
      );
    });
  });

  describe('findOrphanedAttendanceCourses', () => {
    it('应该返回空数组（当前实现）', async () => {
      const result = await service.findOrphanedAttendanceCourses();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
      expect(mockLogger.info).toHaveBeenCalledWith('开始查找孤儿签到课程记录');
    });

    it('应该处理查找异常', async () => {
      // 模拟异常情况
      vi.spyOn(service, 'findOrphanedAttendanceCourses').mockImplementation(
        async () => {
          throw new Error('Query failed');
        }
      );

      const result = await service.findOrphanedAttendanceCourses();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
