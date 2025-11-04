import type {
  DriveInfo,
  FileInfo,
  GetChildrenResponse
} from '@stratix/was-v7';

/**
 * WPS云盘服务接口
 * 负责WPS云盘相关的业务逻辑处理
 */
export interface IWpsDriveService {
  /**
   * 获取驱动盘列表
   *
   * @param alloteeType - 盘归属身份类型
   * @param pageSize - 分页大小
   * @returns 包含驱动盘列表的服务结果
   */
  getDriveList(
    alloteeType: string,
    pageSize: number
  ): Promise<{
    success: boolean;
    data?: DriveInfo[];
    error?: string;
  }>;

  /**
   * 获取驱动盘元数据
   *
   * @param driveId - 驱动盘ID
   * @param withExtAttrs - 是否获取扩展属性
   * @returns 包含驱动盘元数据的服务结果
   */
  getDriveMeta(
    driveId: string,
    withExtAttrs?: boolean
  ): Promise<{
    success: boolean;
    data?: DriveInfo;
    error?: string;
  }>;

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
  getChildren(
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
  }>;

  /**
   * 获取文件/文件夹元数据
   *
   * @param fileId - 文件ID
   * @param withPermission - 是否返回权限信息
   * @param withExtAttrs - 是否返回扩展属性
   * @param withDrive - 是否返回驱动盘信息
   * @returns 包含文件元数据的服务结果
   */
  getFileMeta(
    fileId: string,
    withPermission?: boolean,
    withExtAttrs?: boolean,
    withDrive?: boolean
  ): Promise<{
    success: boolean;
    data?: FileInfo;
    error?: string;
  }>;
}

