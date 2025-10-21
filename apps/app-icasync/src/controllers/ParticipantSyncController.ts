// @wps/app-icasync 参与者同步控制器
// 提供 HTTP 接口用于手动触发参与者同步

import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import type { WpsCalendarAdapter } from '@stratix/was-v7';
import CalendarParticipantsSyncService from '../services/CalendarParticipantsSyncService.js';

/**
 * 参与者同步响应
 */
interface SyncParticipantsResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  timestamp: Date;
}

/**
 * 参与者同步控制器
 */
@Controller({
  prefix: '/api/icasync/participants'
})
export default class ParticipantSyncController {
  private syncService: CalendarParticipantsSyncService;

  constructor(
    private readonly logger: Logger,
    private readonly databaseApi: DatabaseAPI,
    private readonly wasV7ApiCalendar: WpsCalendarAdapter
  ) {
    this.syncService = new CalendarParticipantsSyncService(
      databaseApi,
      wasV7ApiCalendar,
      logger
    );
  }

  /**
   * 获取参与者同步状态
   * GET /api/icasync/participants/status
   */
  @Get('/status')
  async getStatus(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<SyncParticipantsResponse> {
    try {
      this.logger.info('获取参与者同步状态');

      return {
        success: true,
        message: '参与者同步服务正常运行',
        timestamp: new Date()
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('获取状态失败', { error: errorMsg });

      return {
        success: false,
        message: '获取状态失败',
        error: errorMsg,
        timestamp: new Date()
      };
    }
  }

  /**
   * 手动触发参与者同步
   * POST /api/icasync/participants/sync
   *
   * 请求体示例：
   * {}
   */
  @Post('/sync')
  async syncParticipants(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<SyncParticipantsResponse> {
    try {
      this.logger.info('开始手动触发参与者同步');

      // 1. 获取所有有效的课程映射
      const mappings = await this.syncService.getValidCalendarMappings();

      if (mappings.length === 0) {
        return {
          success: true,
          message: '没有找到有效的课程映射',
          data: {
            totalCourses: 0,
            successCourses: 0,
            failedCourses: 0,
            totalAdded: 0,
            totalRemoved: 0,
            details: []
          },
          timestamp: new Date()
        };
      }

      // 2. 批量同步参与者
      const results = await this.syncService.syncMultipleCourses(mappings);

      // 3. 统计结果
      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;
      const totalAdded = results.reduce((sum, r) => sum + r.addedCount, 0);
      const totalRemoved = results.reduce((sum, r) => sum + r.removedCount, 0);
      const errors = results
        .filter((r) => r.errors && r.errors.length > 0)
        .flatMap((r) => r.errors || []);

      this.logger.info('参与者同步完成', {
        totalCourses: mappings.length,
        successCourses: successCount,
        failedCourses: failedCount,
        totalAdded,
        totalRemoved
      });

      return {
        success: failedCount === 0,
        message: '参与者同步完成',
        data: {
          totalCourses: mappings.length,
          successCourses: successCount,
          failedCourses: failedCount,
          totalAdded,
          totalRemoved,
          details: results,
          errors: errors.length > 0 ? errors : undefined
        },
        timestamp: new Date()
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('参与者同步异常', { error: errorMsg });

      reply.status(500);
      return {
        success: false,
        message: '参与者同步异常',
        error: errorMsg,
        timestamp: new Date()
      };
    }
  }

  /**
   * 获取参与者同步历史
   * GET /api/icasync/participants/history
   */
  @Get('/history')
  async getSyncHistory(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<SyncParticipantsResponse> {
    try {
      this.logger.info('获取参与者同步历史');

      return {
        success: true,
        message: '获取参与者同步历史成功',
        data: [],
        timestamp: new Date()
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('获取同步历史失败', { error: errorMsg });

      return {
        success: false,
        message: '获取同步历史失败',
        error: errorMsg,
        timestamp: new Date()
      };
    }
  }

  /**
   * 获取单个课程的参与者同步详情
   * GET /api/icasync/participants/course/:kkh
   */
  @Get('/course/:kkh')
  async getCourseParticipantDetails(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<SyncParticipantsResponse> {
    try {
      const { kkh } = request.params as { kkh: string };

      if (!kkh) {
        reply.status(400);
        return {
          success: false,
          message: '开课号不能为空',
          timestamp: new Date()
        };
      }

      this.logger.info(`获取课程 ${kkh} 的参与者详情`);

      // 获取课程的参与者
      const participants = await this.syncService.getCourseParticipants(kkh);

      return {
        success: true,
        message: `获取课程 ${kkh} 的参与者详情成功`,
        data: {
          kkh,
          participantCount: participants.length,
          participants
        },
        timestamp: new Date()
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('获取课程参与者详情失败', { error: errorMsg });

      reply.status(500);
      return {
        success: false,
        message: '获取课程参与者详情失败',
        error: errorMsg,
        timestamp: new Date()
      };
    }
  }
}

