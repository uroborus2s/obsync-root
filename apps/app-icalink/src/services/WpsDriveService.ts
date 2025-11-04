import type { Logger } from '@stratix/core';
import type {
  CreateDriveParams,
  CreateFileParams,
  DriveInfo,
  FileInfo,
  GetChildrenResponse,
  WpsDriveAdapter
} from '@stratix/was-v7';
import type { IWpsDriveService } from './interfaces/IWpsDriveService.js';

/**
 * WPS云盘服务实现
 * 负责WPS云盘相关的业务逻辑处理
 *
 * @remarks
 * - 通过依赖注入获取 WPS V7 驱动盘适配器
 * - 提供统一的错误处理和结果格式转换
 * - 遵循 Stratix 框架的 Service 层规范
 */
export default class WpsDriveService implements IWpsDriveService {
  constructor(
    private readonly logger: Logger,
    private readonly wasV7ApiDrive: WpsDriveAdapter
  ) {
    this.logger.info('✅ WpsDriveService initialized');
  }

  /**
   * 获取驱动盘列表
   *
   * @param alloteeType - 盘归属身份类型
   * @param pageSize - 分页大小
   * @returns 包含驱动盘列表的服务结果
   */
  public async getDriveList(
    alloteeType: string,
    pageSize: number
  ): Promise<{
    success: boolean;
    data?: DriveInfo[];
    error?: string;
  }> {
    try {
      this.logger.debug('Getting drive list', {
        alloteeType,
        pageSize
      });

      // 调用适配器获取驱动盘信息
      // 注意：WPS API返回的是 { items: DriveInfo[], next_page_token: string } 结构
      const response = (await this.wasV7ApiDrive.getDrive({
        allotee_type: alloteeType,
        page_size: pageSize
      })) as any;

      // 提取驱动盘列表
      // WPS API返回格式: { items: [...], next_page_token: "" }
      const driveList = response.items || [];

      this.logger.debug('Successfully retrieved drive list', {
        count: driveList.length,
        drives: driveList.map((d: DriveInfo) => ({ id: d.id, name: d.name }))
      });

      // 返回驱动盘列表
      return {
        success: true,
        data: driveList
      };
    } catch (error: any) {
      this.logger.error('Failed to get drive list', {
        alloteeType,
        pageSize,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message || 'Failed to get drive list'
      };
    }
  }

  /**
   * 获取驱动盘元数据
   *
   * @param driveId - 驱动盘ID
   * @param withExtAttrs - 是否获取扩展属性
   * @returns 包含驱动盘元数据的服务结果
   */
  public async getDriveMeta(
    driveId: string,
    withExtAttrs?: boolean
  ): Promise<{
    success: boolean;
    data?: DriveInfo;
    error?: string;
  }> {
    try {
      // 参数验证
      if (!driveId || driveId.trim().length === 0) {
        this.logger.warn('Invalid drive ID provided');
        return {
          success: false,
          error: 'Drive ID is required'
        };
      }

      this.logger.debug('Getting drive meta', {
        driveId,
        withExtAttrs
      });

      const driveMeta = await this.wasV7ApiDrive.getDriveMeta({
        drive_id: driveId,
        with_ext_attrs: withExtAttrs
      });

      this.logger.debug('Successfully retrieved drive meta', {
        driveId: driveMeta.id,
        driveName: driveMeta.name
      });

      return {
        success: true,
        data: driveMeta
      };
    } catch (error: any) {
      this.logger.error('Failed to get drive meta', {
        driveId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message || 'Failed to get drive meta'
      };
    }
  }

  /**
   * 获取文件/文件夹子节点
   *
   * @param driveId - 驱动盘ID
   * @param parentId - 父目录ID（根目录传 '0'）
   * @param pageSize - 分页大小
   * @param pageToken - 分页Token
   * @param withPermission - 是否返回权限信息
   * @param withExtAttrs - 是否返回扩展属性
   * @returns 包含子节点列表的服务结果
   */
  public async getChildren(
    driveId: string,
    parentId: string,
    pageSize: number,
    pageToken?: string,
    withPermission?: boolean,
    withExtAttrs?: boolean
  ): Promise<{
    success: boolean;
    data?: GetChildrenResponse;
    error?: string;
  }> {
    try {
      // 参数验证
      if (!driveId || driveId.trim().length === 0) {
        this.logger.warn('Invalid drive ID provided');
        return {
          success: false,
          error: 'Drive ID is required'
        };
      }

      if (!parentId || parentId.trim().length === 0) {
        this.logger.warn('Invalid parent ID provided');
        return {
          success: false,
          error: 'Parent ID is required'
        };
      }

      // 验证 pageSize 范围
      if (pageSize < 1 || pageSize > 500) {
        this.logger.warn('Invalid page size, using default value', {
          providedPageSize: pageSize
        });
        pageSize = 20;
      }

      this.logger.debug('Getting children', {
        driveId,
        parentId,
        pageSize,
        pageToken,
        withPermission,
        withExtAttrs
      });

      const children = await this.wasV7ApiDrive.getChildren({
        drive_id: driveId,
        parent_id: parentId,
        page_size: pageSize,
        page_token: pageToken,
        with_permission: withPermission,
        with_ext_attrs: withExtAttrs
      });

      this.logger.debug('Successfully retrieved children', {
        driveId,
        parentId,
        itemCount: children.items.length,
        hasNextPage: !!children.next_page_token
      });

      return {
        success: true,
        data: children
      };
    } catch (error: any) {
      this.logger.error('Failed to get children', {
        driveId,
        parentId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message || 'Failed to get children'
      };
    }
  }

  /**
   * 获取文件/文件夹元数据
   *
   * @param fileId - 文件ID
   * @param withPermission - 是否返回权限信息
   * @param withExtAttrs - 是否返回扩展属性
   * @param withDrive - 是否返回驱动盘信息
   * @returns 包含文件元数据的服务结果
   */
  public async getFileMeta(
    fileId: string,
    withPermission?: boolean,
    withExtAttrs?: boolean,
    withDrive?: boolean
  ): Promise<{
    success: boolean;
    data?: FileInfo;
    error?: string;
  }> {
    try {
      // 参数验证
      if (!fileId || fileId.trim().length === 0) {
        this.logger.warn('Invalid file ID provided');
        return {
          success: false,
          error: 'File ID is required'
        };
      }

      this.logger.debug('Getting file meta', {
        fileId,
        withPermission,
        withExtAttrs,
        withDrive
      });

      const fileMeta = await this.wasV7ApiDrive.getFileMeta({
        file_id: fileId,
        with_permission: withPermission,
        with_ext_attrs: withExtAttrs,
        with_drive: withDrive
      });

      this.logger.debug('Successfully retrieved file meta', {
        fileId: fileMeta.id,
        fileName: fileMeta.name,
        fileType: fileMeta.type
      });

      return {
        success: true,
        data: fileMeta
      };
    } catch (error: any) {
      this.logger.error('Failed to get file meta', {
        fileId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message || 'Failed to get file meta'
      };
    }
  }

  /**
   * 创建驱动盘
   *
   * @param params - 创建驱动盘参数
   * @returns 包含新创建驱动盘信息的服务结果
   */
  public async createDrive(params: CreateDriveParams): Promise<{
    success: boolean;
    data?: DriveInfo;
    error?: string;
  }> {
    try {
      this.logger.debug('Creating drive', {
        name: params.name,
        alloteeType: params.allotee_type,
        alloteeId: params.allotee_id
      });

      // 调用适配器创建驱动盘
      const driveInfo = await this.wasV7ApiDrive.createDrive(params);

      this.logger.info('Successfully created drive', {
        driveId: driveInfo.id,
        driveName: driveInfo.name
      });

      return {
        success: true,
        data: driveInfo
      };
    } catch (error: any) {
      this.logger.error('Failed to create drive', {
        params,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message || 'Failed to create drive'
      };
    }
  }

  /**
   * 创建文件或文件夹
   *
   * @param params - 创建文件参数
   * @returns 包含新创建文件信息的服务结果
   */
  public async createFile(params: CreateFileParams): Promise<{
    success: boolean;
    data?: FileInfo;
    error?: string;
  }> {
    try {
      this.logger.debug('Creating file', {
        driveId: params.drive_id,
        parentId: params.parent_id,
        name: params.name,
        type: params.file_type
      });

      // 调用适配器创建文件
      const fileInfo = await this.wasV7ApiDrive.createFile(params);

      this.logger.info('Successfully created file', {
        fileId: fileInfo.id,
        fileName: fileInfo.name,
        fileType: fileInfo.type
      });

      return {
        success: true,
        data: fileInfo
      };
    } catch (error: any) {
      this.logger.error('Failed to create file', {
        params,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message || 'Failed to create file'
      };
    }
  }
}
