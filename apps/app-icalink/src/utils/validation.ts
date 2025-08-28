// @wps/app-icalink 验证工具函数
// 基于 Stratix 框架的验证工具

import type { ServiceResult } from '../types/service.js';
import {
  createErrorResult,
  createSuccessResult,
  ServiceErrorCode
} from '../types/service.js';

/**
 * 验证学号格式
 * @param studentId 学号
 * @returns 验证结果
 */
export function validateStudentId(studentId: string): ServiceResult<string> {
  if (!studentId) {
    return createErrorResult(ServiceErrorCode.VALIDATION_ERROR, '学号不能为空');
  }

  // 学号格式：通常为8-12位数字或字母数字组合
  const studentIdPattern = /^[A-Za-z0-9]{8,12}$/;
  if (!studentIdPattern.test(studentId)) {
    return createErrorResult(
      ServiceErrorCode.INVALID_STUDENT_ID,
      '学号格式不正确，应为8-12位字母数字组合'
    );
  }

  return createSuccessResult(studentId);
}

/**
 * 验证教师工号格式
 * @param teacherId 教师工号
 * @returns 验证结果
 */
export function validateTeacherId(teacherId: string): ServiceResult<string> {
  if (!teacherId) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      '教师工号不能为空'
    );
  }

  // 教师工号格式：通常为6-10位数字或字母数字组合
  const teacherIdPattern = /^[A-Za-z0-9]{6,10}$/;
  if (!teacherIdPattern.test(teacherId)) {
    return createErrorResult(
      ServiceErrorCode.INVALID_TEACHER_ID,
      '教师工号格式不正确，应为6-10位字母数字组合'
    );
  }

  return createSuccessResult(teacherId);
}

/**
 * 验证课程ID格式
 * @param courseId 课程ID
 * @returns 验证结果
 */
export function validateCourseId(courseId: string): ServiceResult<number> {
  if (!courseId) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      '课程ID不能为空'
    );
  }

  // 尝试转换为数字
  const courseIdNum = parseInt(courseId, 10);
  if (isNaN(courseIdNum) || courseIdNum <= 0) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      '课程ID必须是正整数'
    );
  }

  return createSuccessResult(courseIdNum);
}

/**
 * 验证日期格式
 * @param dateString 日期字符串
 * @param fieldName 字段名称
 * @returns 验证结果
 */
export function validateDateString(
  dateString: string,
  fieldName: string = '日期'
): ServiceResult<Date> {
  if (!dateString) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      `${fieldName}不能为空`
    );
  }

  // 支持 YYYY-MM-DD 格式
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    return createErrorResult(
      ServiceErrorCode.INVALID_DATE_FORMAT,
      `${fieldName}格式不正确，应为YYYY-MM-DD格式`
    );
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return createErrorResult(
      ServiceErrorCode.INVALID_DATE_FORMAT,
      `${fieldName}不是有效的日期`
    );
  }

  return createSuccessResult(date);
}

/**
 * 验证时间范围
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 验证结果
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date
): ServiceResult<{ startDate: Date; endDate: Date }> {
  if (startDate > endDate) {
    return createErrorResult(
      ServiceErrorCode.INVALID_TIME_RANGE,
      '开始日期不能晚于结束日期'
    );
  }

  // 检查时间范围是否过大（比如超过1年）
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  if (endDate.getTime() - startDate.getTime() > oneYear) {
    return createErrorResult(
      ServiceErrorCode.INVALID_TIME_RANGE,
      '查询时间范围不能超过1年'
    );
  }

  return createSuccessResult({ startDate, endDate });
}

/**
 * 验证坐标
 * @param latitude 纬度
 * @param longitude 经度
 * @param accuracy 精度
 * @returns 验证结果
 */
export function validateCoordinates(
  latitude: number,
  longitude: number,
  accuracy?: number
): ServiceResult<{ latitude: number; longitude: number; accuracy?: number }> {
  if (latitude < -90 || latitude > 90) {
    return createErrorResult(
      ServiceErrorCode.INVALID_COORDINATES,
      '纬度必须在-90到90之间'
    );
  }

  if (longitude < -180 || longitude > 180) {
    return createErrorResult(
      ServiceErrorCode.INVALID_COORDINATES,
      '经度必须在-180到180之间'
    );
  }

  if (accuracy !== undefined && accuracy < 0) {
    return createErrorResult(
      ServiceErrorCode.INVALID_COORDINATES,
      '精度不能为负数'
    );
  }

  return createSuccessResult({ latitude, longitude, accuracy });
}

/**
 * 验证图片文件
 * @param fileName 文件名
 * @param fileSize 文件大小（字节）
 * @param mimeType MIME类型
 * @param maxSize 最大文件大小（字节）
 * @returns 验证结果
 */
export function validateImageFile(
  fileName: string,
  fileSize: number,
  mimeType: string,
  maxSize: number = 10485760 // 10MB
): ServiceResult<{ fileName: string; fileSize: number; mimeType: string }> {
  if (!fileName) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      '文件名不能为空'
    );
  }

  if (fileSize <= 0) {
    return createErrorResult(
      ServiceErrorCode.INVALID_FILE_SIZE,
      '文件大小必须大于0'
    );
  }

  if (fileSize > maxSize) {
    return createErrorResult(
      ServiceErrorCode.INVALID_FILE_SIZE,
      `文件大小不能超过${Math.round(maxSize / 1024 / 1024)}MB`
    );
  }

  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (!allowedMimeTypes.includes(mimeType)) {
    return createErrorResult(
      ServiceErrorCode.INVALID_IMAGE_FORMAT,
      '不支持的图片格式，仅支持JPEG、PNG、GIF、WebP格式'
    );
  }

  // 验证文件扩展名
  const extension = fileName.toLowerCase().split('.').pop();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  if (!extension || !allowedExtensions.includes(extension)) {
    return createErrorResult(
      ServiceErrorCode.INVALID_IMAGE_FORMAT,
      '文件扩展名不正确'
    );
  }

  return createSuccessResult({ fileName, fileSize, mimeType });
}

/**
 * 验证Base64编码的图片
 * @param base64String Base64字符串
 * @returns 验证结果
 */
export function validateBase64Image(
  base64String: string
): ServiceResult<Buffer> {
  if (!base64String) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      'Base64字符串不能为空'
    );
  }

  // 检查Base64格式
  const base64Pattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
  if (!base64Pattern.test(base64String)) {
    return createErrorResult(
      ServiceErrorCode.INVALID_IMAGE_FORMAT,
      'Base64图片格式不正确'
    );
  }

  try {
    // 提取Base64数据部分
    const base64Data = base64String.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length === 0) {
      return createErrorResult(
        ServiceErrorCode.INVALID_IMAGE_FORMAT,
        'Base64图片数据为空'
      );
    }

    return createSuccessResult(buffer);
  } catch (error) {
    return createErrorResult(
      ServiceErrorCode.INVALID_IMAGE_FORMAT,
      'Base64图片解码失败'
    );
  }
}

/**
 * 验证分页参数
 * @param page 页码
 * @param pageSize 每页大小
 * @param maxPageSize 最大每页大小
 * @returns 验证结果
 */
export function validatePagination(
  page: number = 1,
  pageSize: number = 20,
  maxPageSize: number = 100
): ServiceResult<{ page: number; pageSize: number }> {
  if (page < 1) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      '页码必须大于0'
    );
  }

  if (pageSize < 1) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      '每页大小必须大于0'
    );
  }

  if (pageSize > maxPageSize) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      `每页大小不能超过${maxPageSize}`
    );
  }

  return createSuccessResult({ page, pageSize });
}

/**
 * 验证请假原因
 * @param reason 请假原因
 * @param minLength 最小长度
 * @param maxLength 最大长度
 * @returns 验证结果
 */
export function validateLeaveReason(
  reason: string,
  minLength: number = 1,
  maxLength: number = 1000
): ServiceResult<string> {
  if (!reason || reason.trim().length === 0) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      '请假原因不能为空'
    );
  }

  const trimmedReason = reason.trim();

  if (trimmedReason.length < minLength) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      `请假原因至少需要${minLength}个字符`
    );
  }

  if (trimmedReason.length > maxLength) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      `请假原因不能超过${maxLength}个字符`
    );
  }

  // 检查是否包含敏感词汇（可以根据需要扩展）
  const sensitiveWords = ['测试', 'test'];
  const lowerReason = trimmedReason.toLowerCase();

  for (const word of sensitiveWords) {
    if (lowerReason.includes(word.toLowerCase())) {
      return createErrorResult(
        ServiceErrorCode.VALIDATION_ERROR,
        '请假原因包含不当内容'
      );
    }
  }

  return createSuccessResult(trimmedReason);
}

/**
 * 验证审批意见
 * @param comment 审批意见
 * @param maxLength 最大长度
 * @returns 验证结果
 */
export function validateApprovalComment(
  comment?: string,
  maxLength: number = 1000
): ServiceResult<string | undefined> {
  if (!comment) {
    return createSuccessResult(undefined);
  }

  const trimmedComment = comment.trim();

  if (trimmedComment.length === 0) {
    return createSuccessResult(undefined);
  }

  if (trimmedComment.length > maxLength) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      `审批意见不能超过${maxLength}个字符`
    );
  }

  return createSuccessResult(trimmedComment);
}

/**
 * 验证用户类型
 * @param userType 用户类型
 * @returns 验证结果
 */
export function validateUserType(
  userType: string
): ServiceResult<'student' | 'teacher'> {
  if (!userType) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      '用户类型不能为空'
    );
  }

  if (userType !== 'student' && userType !== 'teacher') {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      '用户类型必须为student或teacher'
    );
  }

  return createSuccessResult(userType);
}

/**
 * 验证请假类型
 * @param leaveType 请假类型
 * @returns 验证结果
 */
export function validateLeaveType(leaveType: string): ServiceResult<string> {
  if (!leaveType) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      '请假类型不能为空'
    );
  }

  const validTypes = ['sick', 'personal', 'emergency', 'other'];
  if (!validTypes.includes(leaveType)) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      '无效的请假类型'
    );
  }

  return createSuccessResult(leaveType);
}
