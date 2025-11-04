import type { ExecutionContext } from '@stratix/tasks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  FetchSchedulesConfig,
  FetchSchedulesResult
} from '../FetchSchedules.executor.js';
import FetchSchedulesExecutor from '../FetchSchedules.executor.js';

// Mock 依赖
const mockJuheRenwuRepository = {
  findByKkh: vi.fn()
};

const mockAttendanceCoursesRepository = {
  createBatch: vi.fn(),
  findByJuheRenwuId: vi.fn()
};

const mockDataIntegrityService = {
  validateJuheRenwuIdsExist: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('FetchSchedulesExecutor', () => {
  let executor: FetchSchedulesExecutor;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();

    // 默认数据完整性验证通过
    mockDataIntegrityService.validateJuheRenwuIdsExist.mockResolvedValue({
      valid: true
    });

    // 创建执行器实例
    executor = new FetchSchedulesExecutor(
      mockJuheRenwuRepository as any,
      mockAttendanceCoursesRepository as any,
      mockDataIntegrityService as any,
      mockLogger as any,
      'http://localhost:3000' // attendanceUrl
    );
  });

  describe('参数验证', () => {
    it('应该拒绝空配置', async () => {
      const context: ExecutionContext = {
        config: null,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('配置参数不能为空');
    });

    it('应该拒绝缺少开课号', async () => {
      const config: FetchSchedulesConfig = {
        kkh: ''
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('开课号(kkh)必须是非空字符串');
    });

    it('应该拒绝无效的开课号长度', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'AB' // 太短
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('开课号长度应在3-20个字符之间');
    });

    it('应该拒绝无效的批次大小', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST001',
        batch_size: 250
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('批次大小应在1-200之间');
    });
  });

  describe('日程获取和转换', () => {
    it('应该处理没有课程数据的情况', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST001'
      };

      // Mock 查询返回空结果
      mockCourseRawRepository.findByKkh.mockResolvedValue({
        success: true,
        data: []
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as FetchSchedulesResult;
      expect(data.total_schedules).toBe(0);
      expect(data.batch_count).toBe(0);
      expect(data.items).toEqual([]);
    });

    it('应该正确转换课程数据为WPS日程格式', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST001',
        batch_size: 200
      };

      // Mock 查询返回课程数据
      const mockCourseData = [
        {
          kkh: 'TEST001',
          kcmc: '高等数学',
          rq: '2024-01-15',
          st: '08:00:00',
          ed: '09:40:00',
          xms: '张教授',
          lq: 'A楼',
          room: '101',
          jc: 1,
          sfdk: '打卡'
        },
        {
          kkh: 'TEST001',
          kcmc: '高等数学',
          rq: '2024-01-17',
          st: '10:00:00',
          ed: '11:40:00',
          xms: '张教授',
          lq: 'A楼',
          room: '102',
          jc: 3,
          sfdk: '打卡'
        }
      ];

      mockCourseRawRepository.findByKkh.mockResolvedValue({
        success: true,
        data: mockCourseData
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as FetchSchedulesResult;
      expect(data.total_schedules).toBe(2);
      expect(data.batch_count).toBe(1);
      expect(data.items).toHaveLength(1);
      expect(data.items[0]).toHaveLength(2);

      // 验证日程格式
      const schedule = data.items[0][0];
      expect(schedule.summary).toBe('高等数学');
      expect(schedule.start_time.datetime).toBe('2024-01-15T08:00:00');
      expect(schedule.end_time.datetime).toBe('2024-01-15T09:40:00');
      expect(schedule.location).toBe('A楼101');
      expect(schedule.time_zone).toBe('Asia/Shanghai');
      expect(schedule.description).toContain('课程: 高等数学');
      expect(schedule.description).toContain('开课号: TEST001');
      expect(schedule.description).toContain('教师: 张教授');
    });

    it('应该正确分组超过200个日程', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST001',
        batch_size: 200
      };

      // Mock 查询返回450条课程数据
      const mockCourseData = Array.from({ length: 450 }, (_, i) => ({
        kkh: 'TEST001',
        kcmc: '高等数学',
        rq: `2024-01-${String(15 + (i % 15)).padStart(2, '0')}`,
        st: '08:00:00',
        ed: '09:40:00',
        xms: '张教授',
        lq: 'A楼',
        room: '101',
        jc: 1
      }));

      mockCourseRawRepository.findByKkh.mockResolvedValue({
        success: true,
        data: mockCourseData
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as FetchSchedulesResult;
      expect(data.total_schedules).toBe(450);
      expect(data.batch_count).toBe(3); // 450 / 200 = 3批
      expect(data.batch_size).toBe(200);
      expect(data.items).toHaveLength(3);

      // 验证分组
      expect(data.items[0]).toHaveLength(200); // 第一批200个
      expect(data.items[1]).toHaveLength(200); // 第二批200个
      expect(data.items[2]).toHaveLength(50); // 第三批50个
    });

    it('应该支持自定义批次大小', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST001',
        batch_size: 100
      };

      // Mock 查询返回250条课程数据
      const mockCourseData = Array.from({ length: 250 }, (_, i) => ({
        kkh: 'TEST001',
        kcmc: '高等数学',
        rq: `2024-01-15`,
        st: '08:00:00',
        ed: '09:40:00',
        xms: '张教授',
        lq: 'A楼',
        room: '101',
        jc: 1
      }));

      mockCourseRawRepository.findByKkh.mockResolvedValue({
        success: true,
        data: mockCourseData
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as FetchSchedulesResult;
      expect(data.total_schedules).toBe(250);
      expect(data.batch_count).toBe(3); // 250 / 100 = 3批
      expect(data.batch_size).toBe(100);
      expect(data.items).toHaveLength(3);

      // 验证分组大小
      expect(data.items[0]).toHaveLength(100); // 第一批100个
      expect(data.items[1]).toHaveLength(100); // 第二批100个
      expect(data.items[2]).toHaveLength(50); // 第三批50个
    });

    it('应该过滤掉缺少必要字段的数据', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST001'
      };

      // Mock 查询返回包含无效数据的结果
      const mockCourseData = [
        {
          kkh: 'TEST001',
          kcmc: '高等数学',
          rq: '2024-01-15',
          st: '08:00:00',
          ed: '09:40:00',
          xms: '张教授'
        },
        {
          kkh: 'TEST001',
          kcmc: '高等数学',
          rq: null, // 缺少日期
          st: '08:00:00',
          ed: '09:40:00',
          xms: '张教授'
        },
        {
          kkh: 'TEST001',
          kcmc: null, // 缺少课程名称
          rq: '2024-01-17',
          st: '08:00:00',
          ed: '09:40:00',
          xms: '张教授'
        }
      ];

      mockCourseRawRepository.findByKkh.mockResolvedValue({
        success: true,
        data: mockCourseData
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as FetchSchedulesResult;
      expect(data.total_schedules).toBe(1); // 只有1条有效数据
      expect(data.items[0]).toHaveLength(1);
    });

    it('应该处理查询课程数据失败', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST001'
      };

      // Mock 查询失败
      mockCourseRawRepository.findByKkh.mockResolvedValue({
        success: false,
        error: '数据库连接失败'
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('查询课程数据失败: 数据库连接失败');
    });

    it('应该处理查询异常', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST001'
      };

      // Mock 查询抛出异常
      mockCourseRawRepository.findByKkh.mockRejectedValue(
        new Error('网络连接超时')
      );

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('执行失败: 网络连接超时');
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const health = await executor.healthCheck();

      expect(health).toBe('healthy');
    });

    it('应该检测依赖服务缺失', async () => {
      const executorWithoutDeps = new FetchSchedulesExecutor(
        null as any,
        null as any,
        mockLogger as any
      );

      const health = await executorWithoutDeps.healthCheck();

      expect(health).toBe('unhealthy');
    });
  });

  describe('签到课程处理', () => {
    it('应该处理需要打卡的课程', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST001'
      };

      // Mock 课程数据，包含需要打卡的课程
      const mockCourseData = [
        {
          id: 1,
          kkh: 'TEST001',
          kcmc: '高等数学',
          rq: '2024-09-02',
          sj_f: '08:00:00',
          sj_t: '09:40:00',
          sfdk: '1', // 需要打卡
          xnxq: '2024-2025-1',
          jxz: 1,
          zc: 1,
          gh_s: 'T001',
          xm_s: '张教授',
          lq: '教学楼A',
          room_s: '101',
          jc_s: '1-2',
          sjd: 'am'
        },
        {
          id: 2,
          kkh: 'TEST001',
          kcmc: '高等数学',
          rq: '2024-09-04',
          sj_f: '10:00:00',
          sj_t: '11:40:00',
          sfdk: '0', // 不需要打卡
          xnxq: '2024-2025-1'
        }
      ];

      mockJuheRenwuRepository.findByKkh.mockResolvedValue({
        success: true,
        data: mockCourseData
      });

      mockAttendanceCoursesRepository.createBatch.mockResolvedValue({
        success: true,
        data: [{ id: 1 }] // 只创建了一条签到课程记录
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(mockAttendanceCoursesRepository.createBatch).toHaveBeenCalledWith([
        expect.objectContaining({
          juhe_renwu_id: 1,
          course_code: 'TEST001',
          course_name: '高等数学',
          semester: '2024-2025-1',
          start_time: '2024-09-02T08:00:00+08:00',
          end_time: '2024-09-02T09:40:00+08:00',
          time_period: 'am',
          attendance_enabled: 1
        })
      ]);
    });

    it('应该跳过不需要打卡的课程', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST002'
      };

      // Mock 课程数据，都不需要打卡
      const mockCourseData = [
        {
          id: 1,
          kkh: 'TEST002',
          kcmc: '线性代数',
          rq: '2024-09-02',
          sj_f: '08:00:00',
          sj_t: '09:40:00',
          sfdk: '0' // 不需要打卡
        },
        {
          id: 2,
          kkh: 'TEST002',
          kcmc: '线性代数',
          rq: '2024-09-04',
          sj_f: '10:00:00',
          sj_t: '11:40:00',
          sfdk: null // 不需要打卡
        }
      ];

      mockJuheRenwuRepository.findByKkh.mockResolvedValue({
        success: true,
        data: mockCourseData
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(
        mockAttendanceCoursesRepository.createBatch
      ).not.toHaveBeenCalled();
    });

    it('应该处理签到课程创建失败的情况', async () => {
      const config: FetchSchedulesConfig = {
        kkh: 'TEST003'
      };

      const mockCourseData = [
        {
          id: 1,
          kkh: 'TEST003',
          kcmc: '概率论',
          rq: '2024-09-02',
          sj_f: '08:00:00',
          sj_t: '09:40:00',
          sfdk: '1',
          xnxq: '2024-2025-1',
          jxz: 1,
          zc: 1
        }
      ];

      mockJuheRenwuRepository.findByKkh.mockResolvedValue({
        success: true,
        data: mockCourseData
      });

      mockAttendanceCoursesRepository.createBatch.mockResolvedValue({
        success: false,
        error: '数据库连接失败'
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      // 主流程应该继续成功，不受签到课程创建失败影响
      expect(result.success).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '创建签到课程记录失败',
        expect.objectContaining({
          error: '数据库连接失败'
        })
      );
    });
  });
});
