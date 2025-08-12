/**
 * 动态并行工作流集成测试
 * 
 * 验证动态并行任务创建和执行的完整流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WorkflowEngineService from '../services/WorkflowEngineService.js';
import type { Logger } from '@stratix/core';
import type { WorkflowDefinition, TaskNodeDefinition } from '../types/workflow.js';

// Mock dependencies
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as any;

const mockWorkflowInstanceRepository = {
  create: vi.fn(),
  findByIdNullable: vi.fn()
} as any;

// Mock executor registry
const mockExecutorRegistry = {
  getExecutor: vi.fn()
} as any;

vi.mock('../registerTask.js', () => mockExecutorRegistry);

describe('Dynamic Parallel Workflow Integration', () => {
  let workflowEngine: WorkflowEngineService;
  let mockExecutor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock executor
    mockExecutor = {
      execute: vi.fn()
    };
    
    mockExecutorRegistry.getExecutor = vi.fn().mockReturnValue(mockExecutor);
    
    workflowEngine = new WorkflowEngineService(
      mockLogger,
      mockWorkflowInstanceRepository
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute dynamic parallel loop with course groups', async () => {
    // 模拟数据聚合执行器返回课程分组
    const mockCourseGroups = [
      {
        groupId: 'group-1',
        groupName: '计算机学院',
        courses: [{ id: 1, name: '数据结构' }, { id: 2, name: '算法设计' }],
        totalCourses: 2
      },
      {
        groupId: 'group-2', 
        groupName: '软件学院',
        courses: [{ id: 3, name: 'Java编程' }, { id: 4, name: '数据库系统' }],
        totalCourses: 2
      }
    ];

    const mockDataAggregationResult = {
      success: true,
      data: {
        courseGroups: mockCourseGroups,
        totalCourses: 4
      }
    };

    const mockCourseGroupSyncResult = {
      success: true,
      data: {
        groupId: 'test-group',
        processedCourses: 2,
        createdCalendars: 2,
        success: true
      }
    };

    // 设置执行器模拟行为
    mockExecutor.execute
      .mockResolvedValueOnce(mockDataAggregationResult) // 数据聚合
      .mockResolvedValue(mockCourseGroupSyncResult); // 课程组同步

    // 模拟工作流实例创建
    const mockInstance = {
      id: 1,
      status: 'running',
      inputData: { xnxq: '2024-2025-1' },
      contextData: {},
      retryCount: 0,
      maxRetries: 3
    };

    mockWorkflowInstanceRepository.create.mockResolvedValue({
      success: true,
      data: mockInstance
    });

    // 定义测试工作流
    const testWorkflow: WorkflowDefinition = {
      id: 1,
      name: 'test-dynamic-parallel-sync',
      version: '1.0.0',
      description: '测试动态并行同步工作流',
      
      inputs: [
        {
          name: 'xnxq',
          type: 'string',
          required: true,
          description: '学年学期'
        }
      ],

      outputs: [
        {
          name: 'courseSyncResults',
          type: 'array',
          source: 'loops.parallel-course-sync.results',
          description: '课程同步结果'
        }
      ],

      nodes: [
        // 数据聚合节点
        {
          id: 'data-aggregation',
          name: '数据聚合',
          type: 'task',
          executor: 'dataAggregationProcessor',
          config: {
            xnxq: '${inputs.xnxq}',
            enableGrouping: true
          }
        },

        // 动态并行课程同步
        {
          id: 'parallel-course-sync',
          name: '动态并行课程同步',
          type: 'loop',
          loopType: 'dynamic',
          dependsOn: ['data-aggregation'],
          
          // 从数据聚合结果获取课程分组
          sourceExpression: 'nodes.data-aggregation.output.courseGroups',
          
          nodes: [], // 动态类型为空数组
          
          // 课程组同步任务模板
          taskTemplate: {
            id: 'sync-course-group',
            type: 'task',
            name: '同步课程组',
            executor: 'courseGroupSyncProcessor',
            config: {
              xnxq: '${inputs.xnxq}',
              groupId: '${item.groupId}',
              groupName: '${item.groupName}',
              courses: '${item.courses}',
              totalCourses: '${item.totalCourses}'
            }
          } as TaskNodeDefinition,
          
          maxConcurrency: 2,
          errorHandling: 'continue',
          joinType: 'all'
        }
      ]
    };

    // 执行工作流
    const result = await workflowEngine.startWorkflow(testWorkflow, {
      xnxq: '2024-2025-1'
    });

    // 验证结果
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    
    // 验证数据聚合执行器被调用
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: expect.any(Number),
        config: expect.objectContaining({
          xnxq: '2024-2025-1',
          enableGrouping: true
        })
      })
    );

    // 验证课程组同步执行器被调用（两个组，每组一次）
    expect(mockExecutor.execute).toHaveBeenCalledTimes(3); // 1次数据聚合 + 2次课程组同步

    // 验证日志记录
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Dynamic parallel loop processing 2 items')
    );
  });

  it('should handle dynamic parallel loop with empty source data', async () => {
    // 模拟空的课程分组
    const mockEmptyResult = {
      success: true,
      data: {
        courseGroups: [],
        totalCourses: 0
      }
    };

    mockExecutor.execute.mockResolvedValue(mockEmptyResult);

    const mockInstance = {
      id: 2,
      status: 'running',
      inputData: { xnxq: '2024-2025-1' },
      contextData: {},
      retryCount: 0,
      maxRetries: 3
    };

    mockWorkflowInstanceRepository.create.mockResolvedValue({
      success: true,
      data: mockInstance
    });

    const testWorkflow: WorkflowDefinition = {
      id: 2,
      name: 'test-empty-dynamic-parallel',
      version: '1.0.0',
      description: '测试空动态并行工作流',

      nodes: [
        {
          id: 'data-aggregation',
          name: '数据聚合',
          type: 'task',
          executor: 'dataAggregationProcessor',
          config: {
            xnxq: '${inputs.xnxq}'
          }
        },
        {
          id: 'parallel-course-sync',
          name: '动态并行课程同步',
          type: 'loop',
          loopType: 'dynamic',
          dependsOn: ['data-aggregation'],
          sourceExpression: 'nodes.data-aggregation.output.courseGroups',
          nodes: [],
          taskTemplate: {
            id: 'sync-course-group',
            type: 'task',
            name: '同步课程组',
            executor: 'courseGroupSyncProcessor',
            config: {
              groupId: '${item.groupId}'
            }
          } as TaskNodeDefinition,
          maxConcurrency: 2,
          errorHandling: 'continue',
          joinType: 'all'
        }
      ]
    };

    // 执行工作流
    const result = await workflowEngine.startWorkflow(testWorkflow, {
      xnxq: '2024-2025-1'
    });

    expect(result).toBeDefined();
    
    // 验证只调用了数据聚合，没有调用课程组同步
    expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
    
    // 验证记录了空数据的日志
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Dynamic parallel loop has no items to process')
    );
  });

  it('should handle dynamic parallel loop errors correctly', async () => {
    // 模拟课程分组数据
    const mockCourseGroups = [
      { groupId: 'group-1', groupName: '测试组', courses: [], totalCourses: 0 }
    ];

    const mockDataAggregationResult = {
      success: true,
      data: {
        courseGroups: mockCourseGroups
      }
    };

    // 模拟课程组同步失败
    const mockFailedSyncResult = {
      success: false,
      error: '同步失败：网络超时'
    };

    mockExecutor.execute
      .mockResolvedValueOnce(mockDataAggregationResult) // 数据聚合成功
      .mockResolvedValue(mockFailedSyncResult); // 课程组同步失败

    const mockInstance = {
      id: 3,
      status: 'running',
      inputData: { xnxq: '2024-2025-1' },
      contextData: {},
      retryCount: 0,
      maxRetries: 3
    };

    mockWorkflowInstanceRepository.create.mockResolvedValue({
      success: true,
      data: mockInstance
    });

    const testWorkflow: WorkflowDefinition = {
      id: 3,
      name: 'test-error-handling',
      version: '1.0.0',
      description: '测试错误处理',

      nodes: [
        {
          id: 'data-aggregation',
          name: '数据聚合',
          type: 'task',
          executor: 'dataAggregationProcessor',
          config: {}
        },
        {
          id: 'parallel-course-sync',
          name: '动态并行课程同步',
          type: 'loop',
          loopType: 'dynamic',
          dependsOn: ['data-aggregation'],
          sourceExpression: 'nodes.data-aggregation.output.courseGroups',
          nodes: [],
          taskTemplate: {
            id: 'sync-course-group',
            type: 'task',
            name: '同步课程组',
            executor: 'courseGroupSyncProcessor',
            config: {
              groupId: '${item.groupId}'
            }
          } as TaskNodeDefinition,
          maxConcurrency: 1,
          errorHandling: 'continue', // 继续执行策略
          joinType: 'all'
        }
      ]
    };

    // 执行工作流
    const result = await workflowEngine.startWorkflow(testWorkflow, {
      xnxq: '2024-2025-1'
    });

    expect(result).toBeDefined();
    
    // 验证执行器被调用
    expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
    
    // 验证错误被记录但工作流继续执行
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Dynamic parallel task 0 failed')
    );
  });

  it('should support JSONPath expressions in sourceExpression', async () => {
    // 模拟复杂的嵌套数据结构
    const mockComplexResult = {
      success: true,
      data: {
        metadata: {
          sync: {
            groups: [
              { id: 'nested-1', name: '嵌套组1' },
              { id: 'nested-2', name: '嵌套组2' }
            ]
          }
        }
      }
    };

    mockExecutor.execute.mockResolvedValue(mockComplexResult);

    const mockInstance = {
      id: 4,
      status: 'running',
      inputData: {},
      contextData: {},
      retryCount: 0,
      maxRetries: 3
    };

    mockWorkflowInstanceRepository.create.mockResolvedValue({
      success: true,
      data: mockInstance
    });

    const testWorkflow: WorkflowDefinition = {
      id: 4,
      name: 'test-jsonpath-expression',
      version: '1.0.0',
      description: '测试JSONPath表达式',

      nodes: [
        {
          id: 'data-preparation',
          name: '数据准备',
          type: 'task',
          executor: 'dataPreparationProcessor',
          config: {}
        },
        {
          id: 'parallel-processing',
          name: '并行处理',
          type: 'loop',
          loopType: 'dynamic',
          dependsOn: ['data-preparation'],
          
          // 使用JSONPath表达式访问嵌套数据
          sourceExpression: '$.nodes["data-preparation"].output.metadata.sync.groups',
          
          nodes: [],
          taskTemplate: {
            id: 'process-item',
            type: 'task',
            name: '处理项目',
            executor: 'itemProcessor',
            config: {
              itemId: '${item.id}',
              itemName: '${item.name}'
            }
          } as TaskNodeDefinition,
          maxConcurrency: 2,
          errorHandling: 'continue',
          joinType: 'all'
        }
      ]
    };

    // 执行工作流
    const result = await workflowEngine.startWorkflow(testWorkflow, {});

    expect(result).toBeDefined();
    
    // 验证JSONPath表达式被正确处理
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Dynamic parallel loop processing 2 items')
    );
  });
});