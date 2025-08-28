// @wps/app-icalink 请假附件仓储接口
// 基于 Stratix 框架的仓储接口定义

import { BaseRepository } from '@stratix/database';
import type { 
  IcalinkLeaveAttachment, 
  IcalinkDatabase, 
  ImageType 
} from '../../types/database.js';
import type { 
  ServiceResult, 
  PaginatedResult, 
  QueryOptions 
} from '../../types/service.js';

/**
 * 请假附件查询条件
 */
export interface LeaveAttachmentQueryConditions {
  leave_application_id?: number;
  image_type?: ImageType;
  min_size?: number;
  max_size?: number;
  upload_start_date?: Date;
  upload_end_date?: Date;
}

/**
 * 请假附件创建数据
 */
export interface CreateLeaveAttachmentData {
  leave_application_id: number;
  image_name: string;
  image_size: number;
  image_type: ImageType;
  image_extension: string;
  image_content: Buffer;
  image_width?: number;
  image_height?: number;
  thumbnail_content?: Buffer;
  upload_time?: Date;
  created_by?: string;
  metadata?: any;
}

/**
 * 请假附件更新数据
 */
export interface UpdateLeaveAttachmentData {
  image_name?: string;
  thumbnail_content?: Buffer;
  metadata?: any;
}

/**
 * 附件统计信息
 */
export interface AttachmentStats {
  total_count: number;
  total_size: number;
  average_size: number;
  type_distribution: Record<ImageType, number>;
}

/**
 * 附件详细信息（包含关联数据）
 */
export interface LeaveAttachmentWithDetails extends IcalinkLeaveAttachment {
  application_info?: {
    student_id?: string;
    student_name?: string;
    course_name?: string;
    leave_type?: string;
    status?: string;
  };
}

/**
 * 请假附件仓储接口
 * 继承基础仓储接口，提供请假附件相关的数据访问方法
 */
export interface ILeaveAttachmentRepository
  extends InstanceType<typeof BaseRepository<
    IcalinkDatabase,
    'icalink_leave_attachments',
    IcalinkLeaveAttachment,
    CreateLeaveAttachmentData,
    UpdateLeaveAttachmentData
  >> {

  /**
   * 根据请假申请ID查找附件
   * @param leaveApplicationId 请假申请ID
   * @param options 查询选项
   * @returns 附件列表
   */
  findByLeaveApplication(
    leaveApplicationId: number,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveAttachment[]>>;

  /**
   * 根据条件查询附件
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 附件列表
   */
  findByConditions(
    conditions: LeaveAttachmentQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveAttachment[]>>;

  /**
   * 分页查询附件
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 分页的附件列表
   */
  findByConditionsPaginated(
    conditions: LeaveAttachmentQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<IcalinkLeaveAttachment>>>;

  /**
   * 查询附件详细信息（包含关联数据）
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 附件详细信息列表
   */
  findWithDetails(
    conditions: LeaveAttachmentQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<LeaveAttachmentWithDetails[]>>;

  /**
   * 获取附件内容
   * @param id 附件ID
   * @param thumbnail 是否获取缩略图
   * @returns 附件内容
   */
  getContent(
    id: number,
    thumbnail?: boolean
  ): Promise<ServiceResult<Buffer>>;

  /**
   * 获取附件信息（不包含内容）
   * @param id 附件ID
   * @returns 附件信息
   */
  getInfo(
    id: number
  ): Promise<ServiceResult<Omit<IcalinkLeaveAttachment, 'image_content' | 'thumbnail_content'>>>;

  /**
   * 统计附件信息
   * @param conditions 查询条件
   * @returns 统计信息
   */
  getStatistics(
    conditions?: LeaveAttachmentQueryConditions
  ): Promise<ServiceResult<AttachmentStats>>;

  /**
   * 根据请假申请ID统计附件
   * @param leaveApplicationId 请假申请ID
   * @returns 统计信息
   */
  getStatisticsByApplication(
    leaveApplicationId: number
  ): Promise<ServiceResult<AttachmentStats>>;

  /**
   * 检查附件是否存在
   * @param leaveApplicationId 请假申请ID
   * @param imageName 图片名称
   * @returns 是否存在
   */
  existsByApplicationAndName(
    leaveApplicationId: number,
    imageName: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 根据请假申请ID删除所有附件
   * @param leaveApplicationId 请假申请ID
   * @returns 删除的记录数量
   */
  deleteByLeaveApplication(
    leaveApplicationId: number
  ): Promise<ServiceResult<number>>;

  /**
   * 根据大小范围查询附件
   * @param minSize 最小大小（字节）
   * @param maxSize 最大大小（字节）
   * @param options 查询选项
   * @returns 附件列表
   */
  findBySizeRange(
    minSize: number,
    maxSize: number,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveAttachment[]>>;

  /**
   * 根据图片类型查询附件
   * @param imageType 图片类型
   * @param options 查询选项
   * @returns 附件列表
   */
  findByImageType(
    imageType: ImageType,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveAttachment[]>>;

  /**
   * 获取最大的附件
   * @param limit 记录数量限制
   * @returns 最大的附件列表
   */
  getLargestAttachments(
    limit?: number
  ): Promise<ServiceResult<LeaveAttachmentWithDetails[]>>;

  /**
   * 获取最近上传的附件
   * @param limit 记录数量限制
   * @returns 最近上传的附件列表
   */
  getRecentUploads(
    limit?: number
  ): Promise<ServiceResult<LeaveAttachmentWithDetails[]>>;

  /**
   * 根据时间范围查询附件
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param options 查询选项
   * @returns 附件列表
   */
  findByUploadDateRange(
    startDate: Date,
    endDate: Date,
    options?: QueryOptions
  ): Promise<ServiceResult<LeaveAttachmentWithDetails[]>>;

  /**
   * 更新缩略图
   * @param id 附件ID
   * @param thumbnailContent 缩略图内容
   * @returns 是否更新成功
   */
  updateThumbnail(
    id: number,
    thumbnailContent: Buffer
  ): Promise<ServiceResult<boolean>>;

  /**
   * 批量生成缩略图
   * @param ids 附件ID数组
   * @returns 处理的记录数量
   */
  generateThumbnailsBatch(
    ids: number[]
  ): Promise<ServiceResult<number>>;

  /**
   * 清理过期的附件（软删除）
   * @param daysOld 天数
   * @returns 清理的记录数量
   */
  cleanupOldAttachments(
    daysOld: number
  ): Promise<ServiceResult<number>>;

  /**
   * 验证附件完整性
   * @param id 附件ID
   * @returns 验证结果
   */
  validateIntegrity(
    id: number
  ): Promise<ServiceResult<{
    isValid: boolean;
    actualSize: number;
    expectedSize: number;
    hasContent: boolean;
    hasThumbnail: boolean;
  }>>;

  /**
   * 获取附件的下载URL
   * @param id 附件ID
   * @param thumbnail 是否为缩略图
   * @returns 下载URL
   */
  getDownloadUrl(
    id: number,
    thumbnail?: boolean
  ): Promise<ServiceResult<string>>;

  /**
   * 检查用户是否有权限访问附件
   * @param id 附件ID
   * @param userId 用户ID
   * @param userType 用户类型
   * @returns 是否有权限
   */
  checkAccessPermission(
    id: number,
    userId: string,
    userType: 'student' | 'teacher'
  ): Promise<ServiceResult<boolean>>;

  /**
   * 获取附件列表（不包含内容）
   * @param leaveApplicationId 请假申请ID
   * @returns 附件列表
   */
  getAttachmentList(
    leaveApplicationId: number
  ): Promise<ServiceResult<Omit<IcalinkLeaveAttachment, 'image_content' | 'thumbnail_content'>[]>>;

  /**
   * 获取附件内容
   * @param attachmentId 附件ID
   * @param thumbnail 是否获取缩略图
   * @returns 附件内容信息
   */
  getAttachmentContent(
    attachmentId: number,
    thumbnail?: boolean
  ): Promise<ServiceResult<{
    fileName: string;
    fileContent: Buffer;
    mimeType: string;
    fileSize: number;
  }>>;
}
