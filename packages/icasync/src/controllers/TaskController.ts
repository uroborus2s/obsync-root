// @stratix/icasync 任务控制器
// 提供同步任务管理的 HTTP REST API 接口

import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Delete, Get, Post } from '@stratix/core';
import type { ISyncTaskRepository } from '../repositories/SyncTaskRepository.js';
import type { TaskStatus, TaskType } from '../types/database.js';
import type { ApiResponse } from './SyncController.js';

/**
 * 任务查询参数
 */
export interface TaskQueryParams {
  /** 任务类型 */
  taskType?: TaskType;
  /** 任务状态 */
  status?: TaskStatus;
  /** 学年学期 */
  xnxq?: string;
  /** 页码 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 排序字段 */
  orderBy?: 'created_at' | 'updated_at' | 'start_time' | 'end_time';
  /** 排序方向 */
  order?: 'asc' | 'desc';
}

/**
 * 任务统计查询参数
 */
export interface TaskStatsQueryParams {
  /** 统计天数 */
  days?: number;
  /** 学年学期过滤 */
  xnxq?: string;
}

/**
 * 任务控制器
 *
 * 提供同步任务管理相关的 HTTP API 接口
 */
@Controller()
export default class TaskController {
  constructor(
    private readonly syncTaskRepository: ISyncTaskRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 获取任务列表
   */
  @Get('/tasks', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          taskType: {
            type: 'string',
            enum: ['full_sync', 'incremental_sync', 'user_sync'],
            description: '任务类型过滤'
          },
          status: {
            type: 'string',
            enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
            description: '任务状态过滤'
          },
          xnxq: {
            type: 'string',
            pattern: '^\\d{4}-\\d{4}-[12]$',
            description: '学年学期过滤'
          },
          page: {
            type: 'number',
            minimum: 1,
            default: 1,
            description: '页码'
          },
          pageSize: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: '每页大小'
          },
          orderBy: {
            type: 'string',
            enum: ['created_at', 'updated_at', 'start_time', 'end_time'],
            default: 'created_at',
            description: '排序字段'
          },
          order: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc',
            description: '排序方向'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      task_type: { type: 'string' },
                      status: { type: 'string' },
                      xnxq: { type: 'string' },
                      progress: { type: 'number' },
                      total_items: { type: 'number' },
                      processed_items: { type: 'number' },
                      failed_items: { type: 'number' },
                      start_time: { type: 'string' },
                      end_time: { type: 'string' },
                      created_at: { type: 'string' },
                      updated_at: { type: 'string' }
                    }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number' },
                    pageSize: { type: 'number' },
                    total: { type: 'number' },
                    totalPages: { type: 'number' }
                  }
                }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async getTasks(
    request: FastifyRequest<{ Querystring: TaskQueryParams }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const {
        taskType,
        status,
        xnxq,
        page = 1,
        pageSize = 20,
        orderBy = 'created_at',
        order = 'desc'
      } = request.query;

      this.logger.info('查询任务列表', {
        taskType,
        status,
        xnxq,
        page,
        pageSize,
        orderBy,
        order
      });

      // 构建查询条件
      const filter: any = {};
      if (taskType) filter.task_type = taskType;
      if (status) filter.status = status;
      if (xnxq) filter.xnxq = xnxq;

      // 查询任务列表
      const result = await this.syncTaskRepository.findMany(filter, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        orderBy,
        order
      });

      if (!result.success) {
        throw new Error(result.error?.message || '查询任务列表失败');
      }

      // 查询总数
      const countResult = await this.syncTaskRepository.count(filter);
      const total = countResult.success ? countResult.data : 0;

      return reply.code(200).send({
        success: true,
        data: {
          tasks: result.data,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('查询任务列表失败', {
        query: request.query,
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'GET_TASKS_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 根据ID获取任务详情
   */
  @Get('/tasks/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: '任务ID'
          }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                task_type: { type: 'string' },
                status: { type: 'string' },
                xnxq: { type: 'string' },
                progress: { type: 'number' },
                total_items: { type: 'number' },
                processed_items: { type: 'number' },
                failed_items: { type: 'number' },
                start_time: { type: 'string' },
                end_time: { type: 'string' },
                error_message: { type: 'string' },
                result_summary: { type: 'object' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async getTaskById(
    request: FastifyRequest<{ Params: { id: number } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;

      this.logger.info('查询任务详情', { id });

      const result = await this.syncTaskRepository.findByIdNullable(id);

      if (!result.success) {
        throw new Error(result.error?.message || '查询任务详情失败');
      }

      if (!result.data) {
        return reply.code(404).send({
          success: false,
          error: '任务不存在',
          code: 'TASK_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }

      return reply.code(200).send({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('查询任务详情失败', {
        id: request.params.id,
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'GET_TASK_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 获取正在运行的任务
   */
  @Get('/tasks/running', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      task_type: { type: 'string' },
                      xnxq: { type: 'string' },
                      progress: { type: 'number' },
                      start_time: { type: 'string' },
                      total_items: { type: 'number' },
                      processed_items: { type: 'number' }
                    }
                  }
                },
                count: { type: 'number' }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async getRunningTasks(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      this.logger.info('查询正在运行的任务');

      const result = await this.syncTaskRepository.findRunningTasks();

      if (!result.success) {
        throw new Error(result.error?.message || '查询运行中任务失败');
      }

      return reply.code(200).send({
        success: true,
        data: {
          tasks: result.data,
          count: result.data.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('查询运行中任务失败', {
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'GET_RUNNING_TASKS_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 获取任务统计信息
   */
  @Get('/tasks/stats', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            minimum: 1,
            maximum: 365,
            default: 30,
            description: '统计天数'
          },
          xnxq: {
            type: 'string',
            pattern: '^\\d{4}-\\d{4}-[12]$',
            description: '学年学期过滤'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                completed: { type: 'number' },
                failed: { type: 'number' },
                running: { type: 'number' },
                successRate: { type: 'number' }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async getTaskStats(
    request: FastifyRequest<{ Querystring: TaskStatsQueryParams }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { days = 30, xnxq } = request.query;

      this.logger.info('查询任务统计信息', { days, xnxq });

      const result = await this.syncTaskRepository.getTaskStatistics(days);

      if (!result.success) {
        throw new Error(result.error?.message || '查询任务统计失败');
      }

      return reply.code(200).send({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('查询任务统计失败', {
        query: request.query,
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'GET_TASK_STATS_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 取消任务
   */
  @Post('/tasks/:id/cancel', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: '任务ID'
          }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                cancelled: { type: 'boolean' },
                task: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    status: { type: 'string' },
                    updated_at: { type: 'string' }
                  }
                }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async cancelTask(
    request: FastifyRequest<{ Params: { id: number } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;

      this.logger.info('取消任务执行', { id });

      // 首先检查任务是否存在
      const taskResult = await this.syncTaskRepository.findByIdNullable(id);
      if (!taskResult.success || !taskResult.data) {
        return reply.code(404).send({
          success: false,
          error: '任务不存在',
          code: 'TASK_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }

      const task = taskResult.data;

      // 检查任务状态是否可以取消
      if (
        task.status === 'completed' ||
        task.status === 'failed' ||
        task.status === 'cancelled'
      ) {
        return reply.code(400).send({
          success: false,
          error: `任务状态为 ${task.status}，无法取消`,
          code: 'TASK_CANNOT_BE_CANCELLED',
          timestamp: new Date().toISOString()
        });
      }

      // 更新任务状态为已取消
      const updateResult = await this.syncTaskRepository.updateStatus(
        id,
        'cancelled'
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error?.message || '更新任务状态失败');
      }

      this.logger.info('任务已取消', {
        id,
        previousStatus: task.status
      });

      return reply.code(200).send({
        success: true,
        data: {
          cancelled: true,
          task: updateResult.data
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('取消任务失败', {
        id: request.params.id,
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'CANCEL_TASK_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 删除任务
   */
  @Delete('/tasks/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: '任务ID'
          }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                deleted: { type: 'boolean' }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async deleteTask(
    request: FastifyRequest<{ Params: { id: number } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;

      this.logger.info('删除任务记录', { id });

      // 首先检查任务是否存在
      const taskResult = await this.syncTaskRepository.findByIdNullable(id);
      if (!taskResult.success || !taskResult.data) {
        return reply.code(404).send({
          success: false,
          error: '任务不存在',
          code: 'TASK_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }

      const task = taskResult.data;

      // 检查任务状态，运行中的任务不能删除
      if (task.status === 'running') {
        return reply.code(400).send({
          success: false,
          error: '运行中的任务不能删除，请先取消任务',
          code: 'RUNNING_TASK_CANNOT_BE_DELETED',
          timestamp: new Date().toISOString()
        });
      }

      // 删除任务
      const deleteResult = await this.syncTaskRepository.delete(id);

      if (!deleteResult.success) {
        throw new Error(deleteResult.error?.message || '删除任务失败');
      }

      this.logger.info('任务已删除', { id });

      return reply.code(200).send({
        success: true,
        data: {
          deleted: deleteResult.data
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('删除任务失败', {
        id: request.params.id,
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'DELETE_TASK_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 生命周期方法：控制器就绪
   */
  async onReady(): Promise<void> {
    this.logger.info('TaskController 已就绪');
  }

  /**
   * 生命周期方法：控制器关闭
   */
  async onClose(): Promise<void> {
    this.logger.info('TaskController 正在关闭');
  }
}
