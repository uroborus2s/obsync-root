import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import type WpsDriveService from '../services/WpsDriveService.js';

/**
 * WPS云盘控制器
 * 提供WPS云盘管理相关的HTTP接口
 */
@Controller()
export default class WpsDriveController {
  constructor(
    private readonly logger: Logger,
    private readonly wpsDriveService: WpsDriveService
  ) {
    this.logger.info('✅ WpsDriveController initialized');
  }

  /**
   * 获取驱动盘列表
   * GET /api/icalink/v1/wps-drive/drives
   *
   * @description
   * 获取指定类型的驱动盘列表
   *
   * @query allotee_type - 盘归属身份类型（user/group/app）
   * @query page_size - 分页大小（默认20，最大100）
   *
   * @returns 驱动盘列表
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/wps-drive/drives')
  async getDriveList(
    request: FastifyRequest<{
      Querystring: {
        allotee_type?: string;
        page_size?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { allotee_type = 'user', page_size = '20' } = request.query;

      // 参数验证
      const validAlloteeTypes = ['user', 'group', 'app'];
      if (!validAlloteeTypes.includes(allotee_type)) {
        return reply.status(400).send({
          success: false,
          message: '盘归属类型必须是 user、group 或 app'
        });
      }

      const pageSizeNum = parseInt(page_size, 10);
      if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
        return reply.status(400).send({
          success: false,
          message: '分页大小必须在1-100之间'
        });
      }

      this.logger.debug(
        { alloteeType: allotee_type, pageSize: pageSizeNum },
        'Getting drive list'
      );

      const result = await this.wpsDriveService.getDriveList(
        allotee_type,
        pageSizeNum
      );

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.error || '获取驱动盘列表失败'
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get drive list');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取驱动盘元数据
   * GET /api/icalink/v1/wps-drive/drives/:drive_id/meta
   *
   * @description
   * 获取指定驱动盘的详细元数据信息
   *
   * @param drive_id - 驱动盘ID
   * @query with_ext_attrs - 是否获取扩展属性（可选，默认false）
   *
   * @returns 驱动盘元数据
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/wps-drive/drives/:drive_id/meta')
  async getDriveMeta(
    request: FastifyRequest<{
      Params: { drive_id: string };
      Querystring: { with_ext_attrs?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { drive_id } = request.params;
      const { with_ext_attrs } = request.query;

      // 参数验证
      if (!drive_id || drive_id.trim() === '') {
        return reply.status(400).send({
          success: false,
          message: '驱动盘ID不能为空'
        });
      }

      const withExtAttrs = with_ext_attrs === 'true';

      this.logger.debug(
        { driveId: drive_id, withExtAttrs },
        'Getting drive meta'
      );

      const result = await this.wpsDriveService.getDriveMeta(
        drive_id,
        withExtAttrs
      );

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.error || '获取驱动盘元数据失败'
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get drive meta');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取文件/文件夹子节点
   * GET /api/icalink/v1/wps-drive/drives/:drive_id/files/:parent_id/children
   *
   * @description
   * 获取指定文件夹下的子文件和子文件夹列表
   *
   * @param drive_id - 驱动盘ID
   * @param parent_id - 父目录ID（根目录传 '0'）
   * @query page_size - 分页大小（默认20，最大500）
   * @query page_token - 分页Token（可选）
   * @query with_permission - 是否返回权限信息（可选，默认false）
   * @query with_ext_attrs - 是否返回扩展属性（可选，默认false）
   *
   * @returns 子节点列表
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/wps-drive/drives/:drive_id/files/:parent_id/children')
  async getChildren(
    request: FastifyRequest<{
      Params: { drive_id: string; parent_id: string };
      Querystring: {
        page_size?: string;
        page_token?: string;
        with_permission?: string;
        with_ext_attrs?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { drive_id, parent_id } = request.params;
      const {
        page_size = '20',
        page_token,
        with_permission,
        with_ext_attrs
      } = request.query;

      // 参数验证
      if (!drive_id || drive_id.trim() === '') {
        return reply.status(400).send({
          success: false,
          message: '驱动盘ID不能为空'
        });
      }

      if (!parent_id || parent_id.trim() === '') {
        return reply.status(400).send({
          success: false,
          message: '父目录ID不能为空'
        });
      }

      const pageSizeNum = parseInt(page_size, 10);
      if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 500) {
        return reply.status(400).send({
          success: false,
          message: '分页大小必须在1-500之间'
        });
      }

      const withPermission = with_permission === 'true';
      const withExtAttrs = with_ext_attrs === 'true';

      this.logger.debug(
        {
          driveId: drive_id,
          parentId: parent_id,
          pageSize: pageSizeNum,
          pageToken: page_token,
          withPermission,
          withExtAttrs
        },
        'Getting children'
      );

      const result = await this.wpsDriveService.getChildren(
        drive_id,
        parent_id,
        pageSizeNum,
        page_token,
        withPermission,
        withExtAttrs
      );

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.error || '获取子节点列表失败'
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get children');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取文件/文件夹元数据
   * GET /api/icalink/v1/wps-drive/files/:file_id/meta
   *
   * @description
   * 获取指定文件或文件夹的详细元数据信息
   *
   * @param file_id - 文件ID
   * @query with_permission - 是否返回权限信息（可选，默认false）
   * @query with_ext_attrs - 是否返回扩展属性（可选，默认false）
   * @query with_drive - 是否返回驱动盘信息（可选，默认false）
   *
   * @returns 文件元数据
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/wps-drive/files/:file_id/meta')
  async getFileMeta(
    request: FastifyRequest<{
      Params: { file_id: string };
      Querystring: {
        with_permission?: string;
        with_ext_attrs?: string;
        with_drive?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { file_id } = request.params;
      const { with_permission, with_ext_attrs, with_drive } = request.query;

      // 参数验证
      if (!file_id || file_id.trim() === '') {
        return reply.status(400).send({
          success: false,
          message: '文件ID不能为空'
        });
      }

      const withPermission = with_permission === 'true';
      const withExtAttrs = with_ext_attrs === 'true';
      const withDrive = with_drive === 'true';

      this.logger.debug(
        { fileId: file_id, withPermission, withExtAttrs, withDrive },
        'Getting file meta'
      );

      const result = await this.wpsDriveService.getFileMeta(
        file_id,
        withPermission,
        withExtAttrs,
        withDrive
      );

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.error || '获取文件元数据失败'
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get file meta');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 创建驱动盘
   * POST /api/icalink/v1/wps-drive/drives
   *
   * @description
   * 创建新的驱动盘
   *
   * @body allotee_id - 盘归属身份id
   * @body allotee_type - 盘归属身份类型（user/group/app）
   * @body name - 驱动盘名称
   * @body description - 驱动盘描述（可选）
   * @body source - 盘来源（可选，默认yundoc）
   * @body total_quota - 盘空间配额（可选）
   *
   * @returns 新创建的驱动盘信息
   *
   * HTTP 状态码：
   * - 201: 创建成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Post('/api/icalink/v1/wps-drive/drives')
  async createDrive(
    request: FastifyRequest<{
      Body: {
        allotee_id: string;
        allotee_type: 'user' | 'group' | 'app';
        name: string;
        description?: string;
        source?: string;
        total_quota?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        allotee_id,
        allotee_type,
        name,
        description,
        source,
        total_quota
      } = request.body;

      // 参数验证
      if (!allotee_id || !allotee_type || !name) {
        return reply.status(400).send({
          success: false,
          message: '缺少必需参数：allotee_id, allotee_type, name'
        });
      }

      const validAlloteeTypes = ['user', 'group', 'app'];
      if (!validAlloteeTypes.includes(allotee_type)) {
        return reply.status(400).send({
          success: false,
          message: `无效的allotee_type，必须是: ${validAlloteeTypes.join(', ')}`
        });
      }

      this.logger.info('Creating drive', {
        allotee_id,
        allotee_type,
        name
      });

      // 调用服务层创建驱动盘
      const result = await this.wpsDriveService.createDrive({
        allotee_id,
        allotee_type,
        name,
        description,
        source,
        total_quota
      });

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.error || '创建驱动盘失败'
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to create drive');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 创建文件或文件夹
   * POST /api/icalink/v1/wps-drive/drives/:drive_id/files
   *
   * @description
   * 在指定驱动盘中创建文件或文件夹
   *
   * @param drive_id - 驱动盘ID
   * @body parent_id - 父目录ID（根目录传'0'）
   * @body file_type - 文件类型（file/folder）
   * @body name - 文件名称
   * @body on_name_conflict - 文件名冲突处理方式（可选）
   *
   * @returns 新创建的文件信息
   *
   * HTTP 状态码：
   * - 201: 创建成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Post('/api/icalink/v1/wps-drive/drives/:drive_id/files')
  async createFile(
    request: FastifyRequest<{
      Params: {
        drive_id: string;
      };
      Body: {
        parent_id: string;
        file_type: 'file' | 'folder';
        name: string;
        on_name_conflict?: 'fail' | 'rename' | 'overwrite' | 'replace';
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { drive_id } = request.params;
      const { parent_id, file_type, name, on_name_conflict } = request.body;

      // 参数验证
      if (!drive_id || !parent_id || !file_type || !name) {
        return reply.status(400).send({
          success: false,
          message: '缺少必需参数：drive_id, parent_id, file_type, name'
        });
      }

      const validFileTypes = ['file', 'folder'];
      if (!validFileTypes.includes(file_type)) {
        return reply.status(400).send({
          success: false,
          message: `无效的file_type，必须是: ${validFileTypes.join(', ')}`
        });
      }

      this.logger.info('Creating file', {
        drive_id,
        parent_id,
        file_type,
        name
      });

      // 调用服务层创建文件
      const result = await this.wpsDriveService.createFile({
        drive_id,
        parent_id,
        file_type,
        name,
        on_name_conflict
      });

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.error || '创建文件失败'
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to create file');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}
