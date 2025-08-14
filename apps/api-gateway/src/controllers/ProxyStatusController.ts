/**
 * 代理状态监控控制器
 * 提供代理功能的状态监控和管理接口
 */

import {
  Controller,
  Get,
  type FastifyReply,
  type FastifyRequest,
  type Logger
} from '@stratix/core';

/**
 * 代理状态监控控制器
 */
@Controller()
export default class ProxyStatusController {
  constructor(private logger: Logger) {
    this.logger.info('✅ ProxyStatusController initialized');
  }

  /**
   * 获取代理指标信息
   */
  @Get('/api/gateway/metrics')
  async getProxyMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const metrics = request.server.memoryUsage();

      // 转换为可读格式
      const readableMetrics = {
        // 事件循环延迟（毫秒，保留两位小数）
        eventLoopDelay: {
          value: parseFloat(metrics.eventLoopDelay.toFixed(2)),
          unit: 'ms'
        },
        // 事件循环利用率（百分比，保留两位小数）
        eventLoopUtilized: {
          value: parseFloat((metrics.eventLoopUtilized * 100).toFixed(2)),
          unit: '%'
        },
        // 内存使用（字节转换为 MB，保留两位小数）
        rss: {
          value: parseFloat((metrics.rssBytes / (1024 * 1024)).toFixed(2)),
          unit: 'MB',
          description: '进程总内存占用（Resident Set Size）'
        },
        heapUsed: {
          value: parseFloat((metrics.heapUsed / (1024 * 1024)).toFixed(2)),
          unit: 'MB',
          description: '已使用的堆内存'
        },
        // 添加时间戳便于监控
        timestamp: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: readableMetrics
      });
    } catch (error) {
      this.logger.error('Failed to get proxy metrics', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get proxy metrics',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
