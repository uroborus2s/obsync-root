import type { Logger } from '@stratix/core';
import type { IOSSAdapter } from '@stratix/ossp';
import {
  isLeft,
  isNone,
  eitherLeft as left,
  eitherRight as right,
  type Either
} from '@stratix/utils/functional';
import ExcelJS from 'exceljs';
import { createHash } from 'node:crypto';
import type { IAttendanceExportRecordRepository } from '../repositories/AttendanceExportRecordRepository.js';
import type AttendanceTodayViewRepository from '../repositories/AttendanceTodayViewRepository.js';
import type StudentAbsenceRateDetailRepository from '../repositories/StudentAbsenceRateDetailRepository.js';
import type {
  AttendanceExportStatus,
  AttendanceExportType,
  ExportTaskResponse,
  HistoryExportRequest,
  RealtimeExportRequest
} from '../types/attendance-export.types.js';
import type {
  IcalinkStudentAbsenceRateDetail,
  VAttendanceTodayDetails
} from '../types/database.js';
import type { ServiceError } from '../types/service.js';
import { ServiceErrorCode } from '../types/service.js';

/**
 * 考勤数据导出服务接口
 */
export interface IAttendanceExportService {
  /**
   * 导出实时考勤数据
   */
  exportRealtimeData(
    request: RealtimeExportRequest,
    userId?: string
  ): Promise<Either<ServiceError, ExportTaskResponse>>;

  /**
   * 导出历史统计数据
   */
  exportHistoryData(
    request: HistoryExportRequest,
    userId?: string
  ): Promise<Either<ServiceError, ExportTaskResponse>>;

  /**
   * 查询任务状态
   */
  getTaskStatus(
    taskId: string
  ): Promise<Either<ServiceError, ExportTaskResponse>>;

  /**
   * 下载导出文件
   */
  downloadFile(
    taskId: string
  ): Promise<
    Either<
      ServiceError,
      { fileName: string; fileContent: Buffer; mimeType: string }
    >
  >;
}

/**
 * 考勤数据导出服务实现
 */
export default class AttendanceExportService
  implements IAttendanceExportService
{
  private readonly bucketName = 'icalink-attendance-exports';

  constructor(
    private readonly attendanceExportRecordRepository: IAttendanceExportRecordRepository,
    private readonly attendanceTodayViewRepository: AttendanceTodayViewRepository,
    private readonly studentAbsenceRateDetailRepository: StudentAbsenceRateDetailRepository,
    private readonly osspClient: IOSSAdapter,
    private readonly logger: Logger
  ) {
    this.logger.info('✅ AttendanceExportService initialized');
  }

  /**
   * 导出实时考勤数据
   */
  async exportRealtimeData(
    request: RealtimeExportRequest,
    userId?: string
  ): Promise<Either<ServiceError, ExportTaskResponse>> {
    try {
      this.logger.info('导出实时考勤数据', { request, userId });

      // 1. 生成任务ID
      const taskId = this.generateTaskId();

      // 2. 查询实时考勤数据
      this.logger.info('开始查询实时考勤数据', { courseId: request.courseId });
      const attendanceData =
        await this.attendanceTodayViewRepository.findByCourseId(
          request.courseId
        );

      this.logger.info('实时考勤数据查询完成', {
        recordCount: attendanceData.length,
        courseName: attendanceData[0]?.course_name
      });

      if (attendanceData.length === 0) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: '未找到考勤数据'
        });
      }

      // 3. 生成Excel文件
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .split('T')[0];
      const fileName = `实时考勤数据_${attendanceData[0]?.course_name || '未知课程'}_${timestamp}.xlsx`;
      this.logger.info('开始生成实时考勤Excel文件', { fileName });
      const excelBuffer = await this.generateRealtimeExcel(
        attendanceData,
        fileName
      );
      this.logger.info('实时考勤Excel文件生成完成', {
        bufferSize: excelBuffer.length
      });

      // 4. 上传到OSS - 使用新的路径格式
      const objectPath = this.buildOSSPath(
        {
          teacher_names: attendanceData[0]?.teacher_names || undefined,
          course_name: attendanceData[0]?.course_name || '未知课程',
          teaching_week: attendanceData[0]?.teaching_week || 0,
          week_day: attendanceData[0]?.week_day || 1
        },
        'realtime',
        fileName
      );
      await this.uploadToOSS(objectPath, excelBuffer);

      // 5. 创建导出记录
      const queryHash = this.generateQueryHash({
        type: 'realtime',
        courseId: request.courseId
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

      const createResult = await this.attendanceExportRecordRepository.create({
        task_id: taskId,
        export_type: 'realtime' as AttendanceExportType,
        course_id: request.courseId,
        course_name: attendanceData[0]?.course_name || '',
        query_params: JSON.stringify(request),
        query_hash: queryHash,
        file_name: fileName,
        file_path: objectPath,
        file_size: excelBuffer.length,
        status: 'completed' as AttendanceExportStatus,
        progress: 100,
        record_count: attendanceData.length,
        created_by: userId,
        completed_at: new Date(),
        expires_at: expiresAt
      });

      if (isLeft(createResult)) {
        this.logger.error('创建导出记录失败', { error: createResult.left });
        return left({
          code: String(ServiceErrorCode.INTERNAL_ERROR),
          message: '创建导出记录失败'
        });
      }

      return right({
        taskId,
        status: 'completed' as AttendanceExportStatus,
        downloadUrl: `/api/icalink/v1/attendance/export/download/${taskId}`,
        cacheHit: false,
        progress: 100,
        fileName,
        fileSize: excelBuffer.length,
        recordCount: attendanceData.length,
        createdAt: new Date(),
        completedAt: new Date()
      });
    } catch (error) {
      this.logger.error('导出实时考勤数据失败', { error, request });
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: error instanceof Error ? error.message : '导出失败'
      });
    }
  }

  /**
   * 导出历史统计数据
   */
  async exportHistoryData(
    request: HistoryExportRequest,
    userId?: string
  ): Promise<Either<ServiceError, ExportTaskResponse>> {
    try {
      this.logger.info('导出历史统计数据', { request, userId });

      // 1. 生成查询哈希
      const queryHash = this.generateQueryHash({
        type: 'history',
        courseCode: request.courseCode,
        sortField: request.sortField,
        sortOrder: request.sortOrder
      });

      // 2. 检查缓存
      const cachedRecordMaybe =
        await this.attendanceExportRecordRepository.findCompletedByQueryHash(
          queryHash
        );

      if (!isNone(cachedRecordMaybe)) {
        const cachedRecord = cachedRecordMaybe.value;
        this.logger.info('命中缓存', {
          taskId: cachedRecord.task_id,
          queryHash
        });
        return right({
          taskId: cachedRecord.task_id,
          status: 'completed' as AttendanceExportStatus,
          downloadUrl: `/api/icalink/v1/attendance/export/download/${cachedRecord.task_id}`,
          cacheHit: true,
          progress: 100,
          fileName: cachedRecord.file_name,
          fileSize: cachedRecord.file_size || 0,
          recordCount: cachedRecord.record_count || 0,
          createdAt: new Date(cachedRecord.created_at as any),
          completedAt: cachedRecord.completed_at
            ? new Date(cachedRecord.completed_at)
            : undefined
        });
      }

      // 3. 生成任务ID
      const taskId = this.generateTaskId();

      // 4. 查询历史统计数据
      this.logger.info('开始查询历史统计数据', {
        courseCode: request.courseCode
      });
      const historyData =
        await this.studentAbsenceRateDetailRepository.findByCourseCode(
          request.courseCode,
          request.sortField || 'absence_rate',
          request.sortOrder || 'desc'
        );

      this.logger.info('历史统计数据查询完成', {
        recordCount: historyData.length,
        courseName: historyData[0]?.course_name
      });

      if (historyData.length === 0) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: '未找到历史统计数据'
        });
      }

      // 5. 查询缺勤明细数据（用于第二个Sheet）
      this.logger.info('开始查询缺勤明细数据', {
        courseCode: request.courseCode
      });
      const absenceDetails = await this.getAbsenceDetails(request.courseCode);
      this.logger.info('查询缺勤明细数据完成', {
        absenceCount: absenceDetails.length
      });

      // 6. 生成Excel文件（包含两个Sheet）
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .split('T')[0];
      const fileName = `历史统计数据_${historyData[0]?.course_name || '未知课程'}_${timestamp}.xlsx`;
      this.logger.info('开始生成历史统计Excel文件', { fileName });
      const excelBuffer = await this.generateHistoryExcel(
        historyData,
        absenceDetails,
        fileName
      );
      this.logger.info('历史统计Excel文件生成完成', {
        bufferSize: excelBuffer.length
      });

      // 6. 上传到OSS - 使用新的路径格式
      // 从缺勤明细数据中获取课程信息（因为historyData是统计数据，没有这些字段）
      const courseInfo = absenceDetails[0] || {
        teacher_names: undefined,
        course_name: historyData[0]?.course_name || '未知课程',
        teaching_week: 0,
        week_day: 1
      };

      const objectPath = this.buildOSSPath(
        {
          teacher_names: courseInfo.teacher_names || undefined,
          course_name: historyData[0]?.course_name || '未知课程',
          teaching_week: courseInfo.teaching_week || 0,
          week_day: courseInfo.week_day || 1
        },
        'history',
        fileName
      );
      await this.uploadToOSS(objectPath, excelBuffer);

      // 7. 创建导出记录
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

      const createResult = await this.attendanceExportRecordRepository.create({
        task_id: taskId,
        export_type: 'history' as AttendanceExportType,
        course_code: request.courseCode,
        course_name: historyData[0]?.course_name || '',
        query_params: JSON.stringify(request),
        query_hash: queryHash,
        file_name: fileName,
        file_path: objectPath,
        file_size: excelBuffer.length,
        status: 'completed' as AttendanceExportStatus,
        progress: 100,
        record_count: historyData.length,
        created_by: userId,
        completed_at: new Date(),
        expires_at: expiresAt
      });

      if (isLeft(createResult)) {
        this.logger.error('创建导出记录失败', { error: createResult.left });
        return left({
          code: String(ServiceErrorCode.INTERNAL_ERROR),
          message: '创建导出记录失败'
        });
      }

      return right({
        taskId,
        status: 'completed' as AttendanceExportStatus,
        downloadUrl: `/api/icalink/v1/attendance/export/download/${taskId}`,
        cacheHit: false,
        progress: 100,
        fileName,
        fileSize: excelBuffer.length,
        recordCount: historyData.length,
        createdAt: new Date(),
        completedAt: new Date()
      });
    } catch (error) {
      this.logger.error('导出历史统计数据失败', { error, request });
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: error instanceof Error ? error.message : '导出失败'
      });
    }
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(
    taskId: string
  ): Promise<Either<ServiceError, ExportTaskResponse>> {
    try {
      const recordMaybe =
        await this.attendanceExportRecordRepository.findByTaskId(taskId);

      if (isNone(recordMaybe)) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: '任务不存在'
        });
      }

      const record = recordMaybe.value;
      return right({
        taskId: record.task_id,
        status: record.status,
        downloadUrl:
          record.status === 'completed'
            ? `/api/icalink/v1/attendance/export/download/${taskId}`
            : undefined,
        progress: record.progress,
        error: record.error_message,
        fileName: record.file_name,
        fileSize: record.file_size || 0,
        recordCount: record.record_count || 0,
        createdAt: new Date(record.created_at as any),
        completedAt: record.completed_at
          ? new Date(record.completed_at)
          : undefined
      });
    } catch (error) {
      this.logger.error('查询任务状态失败', { error, taskId });
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: '查询失败'
      });
    }
  }

  /**
   * 下载导出文件
   */
  async downloadFile(
    taskId: string
  ): Promise<
    Either<
      ServiceError,
      { fileName: string; fileContent: Buffer; mimeType: string }
    >
  > {
    try {
      this.logger.info('📥 [文件下载] 开始下载文件', { taskId });

      // 1. 查询任务记录
      const recordMaybe =
        await this.attendanceExportRecordRepository.findByTaskId(taskId);

      if (isNone(recordMaybe)) {
        this.logger.warn('📥 [文件下载] 任务不存在', { taskId });
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: '任务不存在'
        });
      }

      const record = recordMaybe.value;
      this.logger.info('📥 [文件下载] 任务记录查询成功', {
        taskId,
        status: record.status,
        fileName: record.file_name,
        filePath: record.file_path,
        fileSize: record.file_size
      });

      if (record.status !== 'completed') {
        this.logger.warn('📥 [文件下载] 任务未完成', {
          taskId,
          status: record.status
        });
        return left({
          code: String(ServiceErrorCode.BAD_REQUEST),
          message: '任务未完成'
        });
      }

      // 2. 从OSS下载文件
      this.logger.info('📥 [文件下载] 开始从OSS获取文件', {
        bucketName: this.bucketName,
        filePath: record.file_path
      });

      const stream = await this.osspClient.getObject(
        this.bucketName,
        record.file_path
      );

      this.logger.info('📥 [文件下载] OSS Stream获取成功，开始转换为Buffer');

      // 3. 将流转换为Buffer
      const chunks: Buffer[] = [];
      let totalChunkSize = 0;
      let chunkCount = 0;

      for await (const chunk of stream) {
        const buffer = Buffer.from(chunk);
        chunks.push(buffer);
        totalChunkSize += buffer.length;
        chunkCount++;

        if (chunkCount % 10 === 0) {
          this.logger.info(
            `📥 [文件下载] 已接收 ${chunkCount} 个chunk，总大小: ${totalChunkSize} 字节`
          );
        }
      }

      const fileContent = Buffer.concat(chunks);

      this.logger.info('✅ [文件下载] Stream转Buffer完成', {
        chunkCount,
        totalChunkSize,
        finalBufferSize: fileContent.length,
        bufferIsEmpty: fileContent.length === 0,
        expectedFileSize: record.file_size,
        sizeMismatch: fileContent.length !== record.file_size
      });

      if (fileContent.length === 0) {
        this.logger.error('❌ [文件下载] Buffer为空！', {
          taskId,
          filePath: record.file_path,
          chunkCount,
          totalChunkSize
        });
      }

      return right({
        fileName: record.file_name,
        fileContent,
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    } catch (error) {
      this.logger.error('❌ [文件下载] 下载文件失败', {
        error,
        taskId,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: '下载失败'
      });
    }
  }

  // ========== 私有方法 ==========

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * 生成查询哈希
   */
  private generateQueryHash(params: any): string {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(params));
    return hash.digest('hex');
  }

  /**
   * 构建OSS文件路径
   * 格式：{教师姓名}/{课程名称}/第{教学周}周/星期{星期几}/{exportType}/{fileName}.xlsx
   *
   * @param courseData - 课程数据（包含 teacher_names, course_name, teaching_week, week_day）
   * @param exportType - 导出类型（realtime 或 history）
   * @param fileName - 文件名
   * @returns 格式化的OSS路径
   */
  private buildOSSPath(
    courseData: {
      teacher_names?: string;
      course_name: string;
      teaching_week: number;
      week_day: number;
    },
    exportType: 'realtime' | 'history',
    fileName: string
  ): string {
    // 处理教师姓名：如果有多个教师，使用第一个；如果为空，使用默认值
    let teacherName = '未知教师';
    if (courseData.teacher_names) {
      const teachers = courseData.teacher_names.split(',').map((t) => t.trim());
      teacherName = teachers[0] || '未知教师';
    }

    // 处理课程名称：如果为空，使用默认值；移除特殊字符
    const courseName = (courseData.course_name || '未知课程').replace(
      /[\/\\:*?"<>|]/g,
      '_'
    ); // 替换文件系统不允许的字符

    // 处理教学周
    const teachingWeek = courseData.teaching_week || 0;

    // 处理星期几（1-7 对应周一到周日）
    const weekDayMap: Record<number, string> = {
      1: '一',
      2: '二',
      3: '三',
      4: '四',
      5: '五',
      6: '六',
      7: '日'
    };
    const weekDay =
      weekDayMap[courseData.week_day] || courseData.week_day.toString();

    // 构建路径
    const path = `${teacherName}/${courseName}/第${teachingWeek}周/星期${weekDay}/${exportType}/${fileName}`;

    this.logger.info('🔵 [OSS路径] 构建OSS路径', {
      teacherName,
      courseName,
      teachingWeek,
      weekDay,
      exportType,
      fileName,
      finalPath: path
    });

    return path;
  }

  /**
   * 上传文件到OSS
   */
  private async uploadToOSS(objectPath: string, buffer: Buffer): Promise<void> {
    this.logger.info('🔵 [OSS上传] 开始上传文件', {
      objectPath,
      bufferSize: buffer.length,
      bufferIsEmpty: buffer.length === 0,
      bucketName: this.bucketName
    });

    // 确保存储桶存在
    const bucketExists = await this.osspClient.bucketExists(this.bucketName);
    if (!bucketExists) {
      this.logger.warn('存储桶不存在，正在创建', {
        bucketName: this.bucketName
      });
      await this.osspClient.makeBucket(this.bucketName);
    }

    // 上传文件
    await this.osspClient.putObject(
      this.bucketName,
      objectPath,
      buffer,
      buffer.length,
      {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    );

    this.logger.info('✅ [OSS上传] 文件上传成功', {
      objectPath,
      uploadedSize: buffer.length
    });
  }

  /**
   * 生成实时考勤数据Excel
   */
  private async generateRealtimeExcel(
    data: VAttendanceTodayDetails[],
    fileName: string
  ): Promise<Buffer> {
    this.logger.info('📊 [Excel生成] 开始生成实时考勤Excel', {
      fileName,
      dataCount: data.length,
      firstRecord: data[0]
        ? {
            student_id: data[0].student_id,
            student_name: data[0].student_name,
            final_status: data[0].final_status
          }
        : null
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('实时考勤数据');

    // 设置列定义
    worksheet.columns = [
      { header: '学号', key: 'student_id', width: 15 },
      { header: '姓名', key: 'student_name', width: 12 },
      { header: '班级', key: 'class_name', width: 20 },
      { header: '专业', key: 'major_name', width: 20 },
      { header: '签到状态', key: 'final_status', width: 12 },
      { header: '签到时间', key: 'checkin_time', width: 20 },
      { header: '备注', key: 'remark', width: 30 }
    ];

    this.logger.info('📝 [Excel生成] 列定义设置完成', {
      columnCount: worksheet.columns.length
    });

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    worksheet.getRow(1).alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };

    // 添加数据行
    this.logger.info('📝 [Excel生成] 开始写入数据行', {
      recordCount: data.length,
      currentRowCount: worksheet.rowCount
    });

    let addedRowCount = 0;
    data.forEach((record, index) => {
      const rowData = {
        student_id: record.student_id,
        student_name: record.student_name,
        class_name: record.class_name || '',
        major_name: record.major_name || '',
        final_status: this.formatAttendanceStatus(record.final_status),
        checkin_time: '', // VAttendanceTodayDetails没有checkin_time字段
        remark: ''
      };

      worksheet.addRow(rowData);
      addedRowCount++;

      // 每100行记录一次日志
      if ((index + 1) % 100 === 0) {
        this.logger.info(`📝 [Excel生成] 已写入 ${index + 1} 行数据`);
      }
    });

    this.logger.info('✅ [Excel生成] 数据行写入完成', {
      addedRowCount,
      totalRowCount: worksheet.rowCount,
      expectedRowCount: data.length + 1 // 数据行 + 表头行
    });

    // 生成Buffer
    this.logger.info('🔄 [Excel生成] 开始生成Buffer');
    const buffer = await workbook.xlsx.writeBuffer();
    const finalBuffer = Buffer.from(buffer);

    this.logger.info('✅ [Excel生成] Buffer生成完成', {
      bufferSize: finalBuffer.length,
      bufferIsEmpty: finalBuffer.length === 0,
      bufferType: typeof finalBuffer,
      isBuffer: Buffer.isBuffer(finalBuffer)
    });

    return finalBuffer;
  }

  /**
   * 查询缺勤明细数据
   */
  private async getAbsenceDetails(
    courseCode: string
  ): Promise<VAttendanceTodayDetails[]> {
    try {
      // 查询所有考勤记录
      const allRecords = await this.attendanceTodayViewRepository.findMany(
        (qb) => qb.where('course_code', '=', courseCode)
      );

      // 筛选出缺勤记录（final_status为absent、truant、leave等）
      const absenceRecords = allRecords.filter((record) => {
        const status = record.final_status;
        return (
          status === 'absent' ||
          status === 'truant' ||
          status === 'leave' ||
          status === 'leave_pending' ||
          status === 'leave_rejected'
        );
      });

      this.logger.info('筛选缺勤记录完成', {
        totalRecords: allRecords.length,
        absenceRecords: absenceRecords.length
      });

      return absenceRecords;
    } catch (error) {
      this.logger.error('查询缺勤明细失败', { error, courseCode });
      return [];
    }
  }

  /**
   * 生成历史统计数据Excel（包含两个Sheet）
   */
  private async generateHistoryExcel(
    statsData: IcalinkStudentAbsenceRateDetail[],
    absenceDetails: VAttendanceTodayDetails[],
    fileName: string
  ): Promise<Buffer> {
    this.logger.info('📊 [Excel生成] 开始生成历史统计Excel', {
      fileName,
      statsDataCount: statsData.length,
      absenceDetailsCount: absenceDetails.length,
      firstStatsRecord: statsData[0]
        ? {
            student_id: statsData[0].student_id,
            student_name: statsData[0].student_name,
            absence_rate: statsData[0].absence_rate
          }
        : null,
      firstAbsenceRecord: absenceDetails[0]
        ? {
            student_id: absenceDetails[0].student_id,
            student_name: absenceDetails[0].student_name,
            final_status: absenceDetails[0].final_status
          }
        : null
    });

    const workbook = new ExcelJS.Workbook();

    // ========== Sheet 1: 学生考勤统计 ==========
    this.logger.info('📝 [Excel生成] 创建Sheet 1: 学生考勤统计');
    const statsSheet = workbook.addWorksheet('学生考勤统计');

    // 设置列定义
    statsSheet.columns = [
      { header: '学号', key: 'student_id', width: 15 },
      { header: '姓名', key: 'student_name', width: 12 },
      { header: '班级', key: 'class_name', width: 20 },
      { header: '总课次', key: 'total_sessions', width: 10 },
      { header: '已上课次', key: 'completed_sessions', width: 12 },
      { header: '缺勤次数', key: 'absent_count', width: 12 },
      { header: '请假次数', key: 'leave_count', width: 12 },
      { header: '旷课次数', key: 'truant_count', width: 12 },
      { header: '缺课率', key: 'absence_rate', width: 12 },
      { header: '旷课率', key: 'truant_rate', width: 12 },
      { header: '请假率', key: 'leave_rate', width: 12 }
    ];

    // 设置表头样式
    statsSheet.getRow(1).font = { bold: true };
    statsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    statsSheet.getRow(1).alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };

    // 添加统计数据行
    this.logger.info('📝 [Excel生成] 开始写入学生考勤统计数据', {
      recordCount: statsData.length,
      currentRowCount: statsSheet.rowCount
    });

    let statsAddedCount = 0;
    statsData.forEach((record, index) => {
      statsSheet.addRow({
        student_id: record.student_id,
        student_name: record.student_name,
        class_name: record.class_name || '',
        total_sessions: record.total_sessions,
        completed_sessions: record.completed_sessions,
        absent_count: record.absent_count,
        leave_count: record.leave_count,
        truant_count: record.truant_count,
        absence_rate: `${(record.absence_rate * 100).toFixed(2)}%`,
        truant_rate: `${(record.truant_rate * 100).toFixed(2)}%`,
        leave_rate: `${(record.leave_rate * 100).toFixed(2)}%`
      });
      statsAddedCount++;

      if ((index + 1) % 50 === 0) {
        this.logger.info(`📝 [Excel生成] Sheet1已写入 ${index + 1} 行统计数据`);
      }
    });

    this.logger.info('✅ [Excel生成] 学生考勤统计数据写入完成', {
      addedRowCount: statsAddedCount,
      totalRowCount: statsSheet.rowCount,
      expectedRowCount: statsData.length + 1
    });

    // ========== Sheet 2: 学生缺勤明细 ==========
    this.logger.info('📝 [Excel生成] 创建Sheet 2: 学生缺勤明细');
    const detailsSheet = workbook.addWorksheet('学生缺勤明细');

    // 设置列定义
    detailsSheet.columns = [
      { header: '学号', key: 'student_id', width: 15 },
      { header: '姓名', key: 'student_name', width: 12 },
      { header: '班级', key: 'class_name', width: 20 },
      { header: '专业', key: 'major_name', width: 20 },
      { header: '课程名称', key: 'course_name', width: 25 },
      { header: '缺勤日期', key: 'attendance_date', width: 15 },
      { header: '缺勤类型', key: 'final_status', width: 12 },
      { header: '备注', key: 'remark', width: 30 }
    ];

    // 设置表头样式
    detailsSheet.getRow(1).font = { bold: true };
    detailsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    detailsSheet.getRow(1).alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };

    // 添加缺勤明细数据行
    this.logger.info('📝 [Excel生成] 开始写入学生缺勤明细数据', {
      recordCount: absenceDetails.length,
      currentRowCount: detailsSheet.rowCount
    });

    let detailsAddedCount = 0;
    absenceDetails.forEach((record, index) => {
      detailsSheet.addRow({
        student_id: record.student_id,
        student_name: record.student_name,
        class_name: record.class_name || '',
        major_name: record.major_name || '',
        course_name: record.course_name || '',
        attendance_date: record.start_time
          ? new Date(record.start_time).toLocaleDateString('zh-CN')
          : '',
        final_status: this.formatAttendanceStatus(record.final_status),
        remark: ''
      });
      detailsAddedCount++;

      if ((index + 1) % 50 === 0) {
        this.logger.info(`📝 [Excel生成] Sheet2已写入 ${index + 1} 行缺勤明细`);
      }
    });

    this.logger.info('✅ [Excel生成] 学生缺勤明细数据写入完成', {
      addedRowCount: detailsAddedCount,
      totalRowCount: detailsSheet.rowCount,
      expectedRowCount: absenceDetails.length + 1
    });

    // 生成Buffer
    this.logger.info('🔄 [Excel生成] 开始生成Buffer（包含2个Sheet）');
    const buffer = await workbook.xlsx.writeBuffer();
    const bufferObj = Buffer.from(buffer);

    this.logger.info('✅ [Excel生成] Buffer生成完成', {
      bufferSize: bufferObj.length,
      bufferIsEmpty: bufferObj.length === 0,
      sheetCount: workbook.worksheets.length,
      sheet1RowCount: statsSheet.rowCount,
      sheet2RowCount: detailsSheet.rowCount,
      bufferType: typeof bufferObj,
      isBuffer: Buffer.isBuffer(bufferObj)
    });

    return bufferObj;
  }

  /**
   * 格式化考勤状态
   */
  private formatAttendanceStatus(status: string): string {
    const statusMap: Record<string, string> = {
      present: '已签到',
      absent: '缺勤',
      leave: '请假',
      truant: '旷课',
      late: '迟到',
      unstarted: '未开始',
      pending_approval: '待审批',
      leave_pending: '请假待审批',
      leave_rejected: '请假被拒绝'
    };
    return statusMap[status] || status;
  }
}
