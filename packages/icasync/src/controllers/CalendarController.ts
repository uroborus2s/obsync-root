// @stratix/icasync 日历控制器
// 提供日历管理的 HTTP REST API 接口

import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';
import type {
  CalendarSyncConfig,
  CalendarSyncResult,
  ICalendarSyncService
} from '../services/CalendarSyncService.js';
import type { ApiResponse } from './SyncController.js';

/**
 * 创建日历请求体
 */
export interface CreateCalendarRequest {
  /** 开课号 */
  kkh: string;
  /** 学年学期 */
  xnxq: string;
  /** 批处理大小 */
  batchSize?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 重试次数 */
  retryCount?: number;
}

/**
 * 批量创建日历请求体
 */
export interface BatchCreateCalendarRequest {
  /** 开课号列表 */
  kkhList: string[];
  /** 学年学期 */
  xnxq: string;
  /** 批处理大小 */
  batchSize?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 重试次数 */
  retryCount?: number;
}

/**
 * 添加参与者请求体
 */
export interface AddParticipantsRequest {
  /** 日历ID */
  calendarId: string;
  /** 开课号 */
  kkh: string;
  /** 批处理大小 */
  batchSize?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
}

/**
 * 日历查询参数
 */
export interface CalendarQueryParams {
  /** 学年学期 */
  xnxq?: string;
  /** 开课号 */
  kkh?: string;
  /** 页码 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 是否包含已删除 */
  includeDeleted?: boolean;
}

/**
 * 日历控制器
 *
 * 提供日历管理相关的 HTTP API 接口
 */
@Controller()
export default class CalendarController {
  constructor(
    private readonly calendarSyncService: ICalendarSyncService,
    private readonly calendarMappingRepository: ICalendarMappingRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 获取日历列表
   */
  @Get('/calendars', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          xnxq: {
            type: 'string',
            pattern: '^\\d{4}-\\d{4}-[12]$',
            description: '学年学期过滤'
          },
          kkh: {
            type: 'string',
            description: '开课号过滤'
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
          includeDeleted: {
            type: 'boolean',
            default: false,
            description: '是否包含已删除的日历'
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
                calendars: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      kkh: { type: 'string' },
                      xnxq: { type: 'string' },
                      calendar_id: { type: 'string' },
                      calendar_name: { type: 'string' },
                      is_deleted: { type: 'boolean' },
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
  async getCalendars(
    request: FastifyRequest<{ Querystring: CalendarQueryParams }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const {
        xnxq,
        kkh,
        page = 1,
        pageSize = 20,
        includeDeleted = false
      } = request.query;

      this.logger.info('查询日历列表', {
        xnxq,
        kkh,
        page,
        pageSize,
        includeDeleted
      });

      // 构建查询条件
      const filter: any = {};
      if (xnxq) filter.xnxq = xnxq;
      if (kkh) filter.kkh = kkh;
      if (!includeDeleted) filter.is_deleted = false;

      // 查询日历列表
      const result = await this.calendarMappingRepository.findMany(filter, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        orderBy: 'created_at',
        order: 'desc'
      });

      if (!result.success) {
        throw new Error(result.error?.message || '查询日历列表失败');
      }

      // 查询总数
      const countResult = await this.calendarMappingRepository.count(filter);
      const total = countResult.success ? countResult.data : 0;

      return reply.code(200).send({
        success: true,
        data: {
          calendars: result.data,
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

      this.logger.error('查询日历列表失败', {
        query: request.query,
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'GET_CALENDARS_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 根据ID获取日历详情
   */
  @Get('/calendars/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: '日历映射ID'
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
                kkh: { type: 'string' },
                xnxq: { type: 'string' },
                calendar_id: { type: 'string' },
                calendar_name: { type: 'string' },
                is_deleted: { type: 'boolean' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' },
                metadata: { type: 'object' }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async getCalendarById(
    request: FastifyRequest<{ Params: { id: number } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;

      this.logger.info('查询日历详情', { id });

      const result = await this.calendarMappingRepository.findByIdNullable(id);

      if (!result.success) {
        throw new Error(result.error?.message || '查询日历详情失败');
      }

      if (!result.data) {
        return reply.code(404).send({
          success: false,
          error: '日历不存在',
          code: 'CALENDAR_NOT_FOUND',
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

      this.logger.error('查询日历详情失败', {
        id: request.params.id,
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'GET_CALENDAR_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 创建单个日历
   */
  @Post('/calendars', {
    schema: {
      body: {
        type: 'object',
        properties: {
          kkh: {
            type: 'string',
            description: '开课号'
          },
          xnxq: {
            type: 'string',
            pattern: '^\\d{4}-\\d{4}-[12]$',
            description: '学年学期'
          },
          batchSize: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            description: '批处理大小'
          },
          timeout: {
            type: 'number',
            minimum: 1000,
            description: '超时时间（毫秒）'
          },
          maxConcurrency: {
            type: 'number',
            minimum: 1,
            maximum: 5,
            description: '最大并发数'
          },
          retryCount: {
            type: 'number',
            minimum: 0,
            maximum: 3,
            description: '重试次数'
          }
        },
        required: ['kkh', 'xnxq']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                successCount: { type: 'number' },
                failedCount: { type: 'number' },
                totalCount: { type: 'number' },
                createdCalendarIds: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async createCalendar(
    request: FastifyRequest<{ Body: CreateCalendarRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse<CalendarSyncResult>> {
    const startTime = Date.now();

    try {
      const { kkh, xnxq, batchSize, timeout, maxConcurrency, retryCount } =
        request.body;

      this.logger.info('创建课程日历', {
        kkh,
        xnxq,
        batchSize,
        timeout
      });

      // 构建同步配置
      const config: CalendarSyncConfig = {
        batchSize: batchSize || 10,
        timeout: timeout || 60000,
        maxConcurrency: maxConcurrency || 3,
        retryCount: retryCount || 2
      };

      // 创建日历
      const result = await this.calendarSyncService.createCourseCalendar(
        kkh,
        xnxq,
        config
      );

      this.logger.info('课程日历创建完成', {
        kkh,
        xnxq,
        successCount: result.successCount,
        failedCount: result.failedCount,
        duration: Date.now() - startTime
      });

      return reply.code(201).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('创建课程日历失败', {
        kkh: request.body.kkh,
        xnxq: request.body.xnxq,
        error: errorMessage,
        duration: Date.now() - startTime
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'CREATE_CALENDAR_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 批量创建日历
   */
  @Post('/calendars/batch', {
    schema: {
      body: {
        type: 'object',
        properties: {
          kkhList: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 100,
            description: '开课号列表'
          },
          xnxq: {
            type: 'string',
            pattern: '^\\d{4}-\\d{4}-[12]$',
            description: '学年学期'
          },
          batchSize: {
            type: 'number',
            minimum: 1,
            maximum: 50,
            description: '批处理大小'
          },
          timeout: {
            type: 'number',
            minimum: 1000,
            description: '超时时间（毫秒）'
          },
          maxConcurrency: {
            type: 'number',
            minimum: 1,
            maximum: 5,
            description: '最大并发数'
          },
          retryCount: {
            type: 'number',
            minimum: 0,
            maximum: 3,
            description: '重试次数'
          }
        },
        required: ['kkhList', 'xnxq']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                successCount: { type: 'number' },
                failedCount: { type: 'number' },
                totalCount: { type: 'number' },
                createdCalendarIds: {
                  type: 'array',
                  items: { type: 'string' }
                },
                errors: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async batchCreateCalendars(
    request: FastifyRequest<{ Body: BatchCreateCalendarRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse<CalendarSyncResult>> {
    const startTime = Date.now();

    try {
      const { kkhList, xnxq, batchSize, timeout, maxConcurrency, retryCount } =
        request.body;

      this.logger.info('批量创建课程日历', {
        kkhCount: kkhList.length,
        xnxq,
        batchSize,
        timeout
      });

      // 构建同步配置
      const config: CalendarSyncConfig = {
        batchSize: batchSize || 10,
        timeout: timeout || 300000, // 5分钟
        maxConcurrency: maxConcurrency || 3,
        retryCount: retryCount || 2
      };

      // 批量创建日历
      const result = await this.calendarSyncService.createCourseCalendarsBatch(
        kkhList,
        xnxq,
        config
      );

      this.logger.info('批量日历创建完成', {
        kkhCount: kkhList.length,
        xnxq,
        successCount: result.successCount,
        failedCount: result.failedCount,
        duration: Date.now() - startTime
      });

      return reply.code(201).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('批量创建课程日历失败', {
        kkhCount: request.body.kkhList.length,
        xnxq: request.body.xnxq,
        error: errorMessage,
        duration: Date.now() - startTime
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'BATCH_CREATE_CALENDARS_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 生命周期方法：控制器就绪
   */
  async onReady(): Promise<void> {
    this.logger.info('CalendarController 已就绪');
  }

  /**
   * 生命周期方法：控制器关闭
   */
  async onClose(): Promise<void> {
    this.logger.info('CalendarController 正在关闭');
  }
}
