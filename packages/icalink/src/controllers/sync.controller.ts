/**
 * 同步控制器
 * 提供全量同步和增量同步的HTTP接口
 */

import { Logger } from '@stratix/core';
import {
  FullSyncConfig,
  FullSyncService
} from '../services/full-sync.service.js';
// import { Request, Response } from 'express';

// 临时类型定义，避免express依赖
interface Request {
  body: any;
  params: any;
  query: any;
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}

/**
 * 同步控制器
 */
export class SyncController {
  constructor(
    private fullSyncService: FullSyncService,
    private log: Logger
  ) {}

  /**
   * 启动全量同步
   * POST /api/icalink/sync/full
   */
  async startFullSync(req: Request, res: Response): Promise<void> {
    try {
      const config: FullSyncConfig = {
        xnxq: req.body.xnxq,
        batchSize: req.body.batchSize || 50,
        parallel: req.body.parallel || false,
        maxConcurrency: req.body.maxConcurrency || 5
      };

      // 验证必需参数
      if (!config.xnxq) {
        res.status(400).json({
          success: false,
          message: '学年学期参数不能为空'
        });
        return;
      }

      this.log.info({ config }, '收到全量同步请求');

      const taskId = await this.fullSyncService.startFullSync(config);

      res.json({
        success: true,
        message: '全量同步任务已启动',
        data: {
          taskId,
          config
        }
      });
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          body: req.body
        },
        '启动全量同步失败'
      );

      res.status(500).json({
        success: false,
        message: '启动全量同步失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 获取全量同步状态
   * GET /api/icalink/sync/full/:taskId/status
   */
  async getFullSyncStatus(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        res.status(400).json({
          success: false,
          message: '任务ID不能为空'
        });
        return;
      }

      const status = await this.fullSyncService.getFullSyncStatus(taskId);

      if (!status) {
        res.status(404).json({
          success: false,
          message: '任务不存在'
        });
        return;
      }

      res.json({
        success: true,
        message: '获取同步状态成功',
        data: status
      });
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          taskId: req.params.taskId
        },
        '获取全量同步状态失败'
      );

      res.status(500).json({
        success: false,
        message: '获取同步状态失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 取消全量同步
   * POST /api/icalink/sync/full/:taskId/cancel
   */
  async cancelFullSync(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        res.status(400).json({
          success: false,
          message: '任务ID不能为空'
        });
        return;
      }

      const success = await this.fullSyncService.cancelFullSync(taskId);

      res.json({
        success,
        message: success ? '任务取消成功' : '任务取消失败',
        data: {
          taskId,
          cancelled: success
        }
      });
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          taskId: req.params.taskId
        },
        '取消全量同步失败'
      );

      res.status(500).json({
        success: false,
        message: '取消同步失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 健康检查
   * GET /api/icalink/sync/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        message: 'icalink同步服务运行正常',
        data: {
          timestamp: new Date().toISOString(),
          service: 'icalink-sync',
          version: '1.0.0'
        }
      });
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error)
        },
        '健康检查失败'
      );

      res.status(500).json({
        success: false,
        message: '健康检查失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 检查是否有可恢复的同步任务
   * GET /api/icalink/sync/full/check/:xnxq
   */
  async checkResumableSync(req: Request, res: Response): Promise<void> {
    try {
      const { xnxq } = req.params;

      if (!xnxq) {
        res.status(400).json({
          success: false,
          message: '学年学期参数不能为空'
        });
        return;
      }

      // 使用私有方法检查任务状态
      const rootTaskStatus = await (
        this.fullSyncService as any
      ).checkRootTaskStatus(xnxq);

      res.json({
        success: true,
        message: '检查完成',
        data: {
          xnxq,
          exists: rootTaskStatus.exists,
          taskId: rootTaskStatus.taskId,
          status: rootTaskStatus.status,
          canResume: rootTaskStatus.canResume,
          resumable: rootTaskStatus.exists && rootTaskStatus.canResume
        }
      });
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          xnxq: req.params.xnxq
        },
        '检查可恢复同步任务失败'
      );

      res.status(500).json({
        success: false,
        message: '检查失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
