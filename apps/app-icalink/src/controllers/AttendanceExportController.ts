import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import { isLeft } from '@stratix/utils/functional';
import type AttendanceExportService from '../services/AttendanceExportService.js';
import type {
  HistoryExportRequest,
  RealtimeExportRequest
} from '../types/attendance-export.types.js';
import { ServiceErrorCode } from '../types/service.js';
import { getTeacherIdentityFromRequest } from '../utils/user-identity.js';

/**
 * 考勤数据导出控制器
 *
 * 提供考勤数据导出相关的HTTP接口
 */
@Controller()
export default class AttendanceExportController {
  constructor(
    private readonly logger: Logger,
    private readonly attendanceExportService: AttendanceExportService
  ) {
    this.logger.info('✅ AttendanceExportController initialized');
  }

  /**
   * 导出实时考勤数据
   * POST /api/icalink/v1/attendance/export/realtime
   *
   * @description
   * 导出当前课程的实时签到数据
   *
   * 请求体：
   * {
   *   courseId: number;        // 课程ID
   *   externalId?: string;     // 课程外部ID（可选）
   * }
   *
   * 响应：
   * {
   *   success: boolean;
   *   message: string;
   *   data: {
   *     taskId: string;
   *     status: 'completed';
   *     downloadUrl: string;
   *     cacheHit: false;
   *     progress: 100;
   *     fileName: string;
   *     fileSize: number;
   *     recordCount: number;
   *     createdAt: Date;
   *     completedAt: Date;
   *   }
   * }
   *
   * HTTP 状态码：
   * - 200: 导出成功
   * - 400: 参数验证失败
   * - 403: 权限不足（非教师用户）
   * - 404: 未找到考勤数据
   * - 500: 服务器内部错误
   */
  @Post('/api/icalink/v1/attendance/export/realtime')
  async exportRealtimeData(
    request: FastifyRequest<{
      Body: RealtimeExportRequest;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // 1. 教师身份验证
      let teacherInfo;
      try {
        teacherInfo = getTeacherIdentityFromRequest(request);
      } catch (error) {
        return reply.status(403).send({
          success: false,
          message: error instanceof Error ? error.message : '教师身份验证失败',
          code: String(ServiceErrorCode.UNAUTHORIZED)
        });
      }

      // 2. 参数验证
      const { courseId } = request.body;
      if (!courseId || courseId <= 0) {
        return reply.status(400).send({
          success: false,
          message: '无效的课程ID',
          code: String(ServiceErrorCode.INVALID_PARAMETER)
        });
      }

      // 3. 调用服务层导出数据
      const result = await this.attendanceExportService.exportRealtimeData(
        request.body,
        teacherInfo.userId
      );

      // 4. 处理结果
      if (isLeft(result)) {
        const error = result.left;
        const statusCode =
          error.code === String(ServiceErrorCode.RESOURCE_NOT_FOUND)
            ? 404
            : 500;
        return reply.status(statusCode).send({
          success: false,
          message: error.message,
          code: error.code
        });
      }

      return reply.status(200).send({
        success: true,
        message: '导出成功',
        data: result.right
      });
    } catch (error) {
      this.logger.error('导出实时考勤数据失败', { error });
      return reply.status(500).send({
        success: false,
        message: '导出失败',
        code: String(ServiceErrorCode.INTERNAL_ERROR)
      });
    }
  }

  /**
   * 导出历史统计数据
   * POST /api/icalink/v1/attendance/export/history
   *
   * @description
   * 导出课程的历史缺勤统计数据
   * 支持缓存机制，相同查询参数会返回已生成的文件
   *
   * 请求体：
   * {
   *   courseCode: string;      // 课程代码
   *   sortField?: string;      // 排序字段（默认：absence_rate）
   *   sortOrder?: 'asc' | 'desc'; // 排序方向（默认：desc）
   * }
   *
   * 响应：
   * {
   *   success: boolean;
   *   message: string;
   *   data: {
   *     taskId: string;
   *     status: 'completed';
   *     downloadUrl: string;
   *     cacheHit: boolean;      // 是否命中缓存
   *     progress: 100;
   *     fileName: string;
   *     fileSize: number;
   *     recordCount: number;
   *     createdAt: Date;
   *     completedAt: Date;
   *   }
   * }
   *
   * HTTP 状态码：
   * - 200: 导出成功
   * - 400: 参数验证失败
   * - 403: 权限不足（非教师用户）
   * - 404: 未找到历史统计数据
   * - 500: 服务器内部错误
   */
  @Post('/api/icalink/v1/attendance/export/history')
  async exportHistoryData(
    request: FastifyRequest<{
      Body: HistoryExportRequest;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // 1. 教师身份验证
      let teacherInfo;
      try {
        teacherInfo = getTeacherIdentityFromRequest(request);
      } catch (error) {
        return reply.status(403).send({
          success: false,
          message: error instanceof Error ? error.message : '教师身份验证失败',
          code: String(ServiceErrorCode.UNAUTHORIZED)
        });
      }

      // 2. 参数验证
      const { courseCode } = request.body;
      if (!courseCode || courseCode.trim() === '') {
        return reply.status(400).send({
          success: false,
          message: '课程代码不能为空',
          code: String(ServiceErrorCode.INVALID_PARAMETER)
        });
      }

      // 3. 调用服务层导出数据
      const result = await this.attendanceExportService.exportHistoryData(
        request.body,
        teacherInfo.userId
      );

      // 4. 处理结果
      if (isLeft(result)) {
        const error = result.left;
        const statusCode =
          error.code === String(ServiceErrorCode.RESOURCE_NOT_FOUND)
            ? 404
            : 500;
        return reply.status(statusCode).send({
          success: false,
          message: error.message,
          code: error.code
        });
      }

      return reply.status(200).send({
        success: true,
        message: result.right.cacheHit ? '使用缓存文件' : '导出成功',
        data: result.right
      });
    } catch (error) {
      this.logger.error('导出历史统计数据失败', { error });
      return reply.status(500).send({
        success: false,
        message: '导出失败',
        code: String(ServiceErrorCode.INTERNAL_ERROR)
      });
    }
  }

  /**
   * 查询导出任务状态
   * GET /api/icalink/v1/attendance/export/status/:taskId
   *
   * @description
   * 查询导出任务的当前状态和进度
   *
   * 响应：
   * {
   *   success: boolean;
   *   message: string;
   *   data: {
   *     taskId: string;
   *     status: 'pending' | 'processing' | 'completed' | 'failed';
   *     downloadUrl?: string;
   *     progress: number;
   *     error?: string;
   *     fileName: string;
   *     fileSize: number;
   *     recordCount: number;
   *     createdAt: Date;
   *     completedAt?: Date;
   *   }
   * }
   *
   * HTTP 状态码：
   * - 200: 查询成功
   * - 403: 权限不足（非教师用户）
   * - 404: 任务不存在
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/attendance/export/status/:taskId')
  async getTaskStatus(
    request: FastifyRequest<{
      Params: { taskId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // 1. 教师身份验证
      try {
        getTeacherIdentityFromRequest(request);
      } catch (error) {
        return reply.status(403).send({
          success: false,
          message: error instanceof Error ? error.message : '教师身份验证失败',
          code: String(ServiceErrorCode.UNAUTHORIZED)
        });
      }

      // 2. 参数验证
      const { taskId } = request.params;
      if (!taskId || taskId.trim() === '') {
        return reply.status(400).send({
          success: false,
          message: '任务ID不能为空',
          code: String(ServiceErrorCode.INVALID_PARAMETER)
        });
      }

      // 3. 调用服务层查询状态
      const result = await this.attendanceExportService.getTaskStatus(taskId);

      // 4. 处理结果
      if (isLeft(result)) {
        const error = result.left;
        const statusCode =
          error.code === String(ServiceErrorCode.RESOURCE_NOT_FOUND)
            ? 404
            : 500;
        return reply.status(statusCode).send({
          success: false,
          message: error.message,
          code: error.code
        });
      }

      return reply.status(200).send({
        success: true,
        message: '查询成功',
        data: result.right
      });
    } catch (error) {
      this.logger.error('查询任务状态失败', { error });
      return reply.status(500).send({
        success: false,
        message: '查询失败',
        code: String(ServiceErrorCode.INTERNAL_ERROR)
      });
    }
  }

  /**
   * 下载导出文件
   * GET /api/icalink/v1/attendance/export/download/:taskId
   *
   * @description
   * 下载已完成的导出文件
   *
   * HTTP 状态码：
   * - 200: 下载成功（返回文件流）
   * - 403: 权限不足（非教师用户）
   * - 404: 任务不存在或文件不存在
   * - 422: 任务未完成
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/attendance/export/download/:taskId')
  async downloadFile(
    request: FastifyRequest<{
      Params: { taskId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // 1. 教师身份验证
      try {
        getTeacherIdentityFromRequest(request);
      } catch (error) {
        return reply.status(403).send({
          success: false,
          message: error instanceof Error ? error.message : '教师身份验证失败',
          code: String(ServiceErrorCode.UNAUTHORIZED)
        });
      }

      // 2. 参数验证
      const { taskId } = request.params;
      if (!taskId || taskId.trim() === '') {
        return reply.status(400).send({
          success: false,
          message: '任务ID不能为空',
          code: String(ServiceErrorCode.INVALID_PARAMETER)
        });
      }

      // 3. 调用服务层下载文件
      const result = await this.attendanceExportService.downloadFile(taskId);

      // 4. 处理结果
      if (isLeft(result)) {
        const error = result.left;
        let statusCode = 500;
        if (error.code === String(ServiceErrorCode.RESOURCE_NOT_FOUND)) {
          statusCode = 404;
        } else if (error.code === String(ServiceErrorCode.BAD_REQUEST)) {
          statusCode = 422;
        }
        return reply.status(statusCode).send({
          success: false,
          message: error.message,
          code: error.code
        });
      }

      const { fileName, fileContent, mimeType } = result.right;

      // 5. 设置响应头并返回文件
      return reply
        .header('Content-Type', mimeType)
        .header(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(fileName)}"`
        )
        .header('Content-Length', fileContent.length)
        .send(fileContent);
    } catch (error) {
      this.logger.error('下载文件失败', { error });
      return reply.status(500).send({
        success: false,
        message: '下载失败',
        code: String(ServiceErrorCode.INTERNAL_ERROR)
      });
    }
  }
}
