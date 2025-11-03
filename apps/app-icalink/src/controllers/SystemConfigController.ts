import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Delete, Get, Post, Put } from '@stratix/core';
import { isLeft } from '@stratix/utils/functional';
import type SystemConfigService from '../services/SystemConfigService.js';

/**
 * 系统配置控制器
 * 提供系统配置管理API接口
 */
@Controller()
export default class SystemConfigController {
  constructor(
    private readonly logger: Logger,
    private readonly systemConfigService: SystemConfigService
  ) {
    this.logger.info('✅ SystemConfigController initialized');
  }

  /**
   * 查询所有配置
   * GET /api/icalink/v1/system-configs
   */
  @Get('/api/icalink/v1/system-configs', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  config_key: { type: 'string' },
                  config_value: { type: 'string' },
                  config_type: { type: 'string' },
                  config_group: { type: 'string' },
                  description: { type: 'string' },
                  is_system: { type: 'boolean' },
                  is_encrypted: { type: 'boolean' },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' },
                  created_by: { type: 'string' },
                  updated_by: { type: 'string' }
                }
              }
            },
            error: { type: 'string' }
          }
        }
      }
    }
  })
  async getAllConfigs(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      this.logger.debug('Getting all system configs');

      const result = await this.systemConfigService.getAllConfigs();

      if (isLeft(result)) {
        const error = result.left;
        reply.status(500).send({
          success: false,
          error: error.message
        });
        return;
      }

      reply.status(200).send({
        success: true,
        data: result.right
      });
    } catch (error: any) {
      this.logger.error('Failed to get all system configs', {
        error: error.message
      });

      reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * 查询单个配置
   * GET /api/icalink/v1/system-configs/:key
   */
  @Get('/api/icalink/v1/system-configs/:key', {
    schema: {
      params: {
        type: 'object',
        required: ['key'],
        properties: {
          key: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'number' },
                config_key: { type: 'string' },
                config_value: { type: 'string' },
                config_type: { type: 'string' },
                config_group: { type: 'string' },
                description: { type: 'string' },
                is_system: { type: 'boolean' },
                is_encrypted: { type: 'boolean' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' },
                created_by: { type: 'string' },
                updated_by: { type: 'string' }
              }
            },
            error: { type: 'string' }
          }
        }
      }
    }
  })
  async getConfig(
    request: FastifyRequest<{ Params: { key: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { key } = request.params;

      this.logger.debug('Getting system config', { key });

      const result = await this.systemConfigService.getConfig(key);

      if (isLeft(result)) {
        const error = result.left;
        reply.status(400).send({
          success: false,
          error: error.message
        });
        return;
      }

      reply.status(200).send({
        success: true,
        data: result.right
      });
    } catch (error: any) {
      this.logger.error('Failed to get system config', {
        error: error.message
      });

      reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * 创建或更新配置
   * POST /api/icalink/v1/system-configs
   */
  @Post('/api/icalink/v1/system-configs', {
    schema: {
      body: {
        type: 'object',
        required: ['config_key', 'config_value', 'config_type'],
        properties: {
          config_key: { type: 'string' },
          config_value: { type: 'string' },
          config_type: {
            type: 'string',
            enum: ['string', 'number', 'boolean', 'json', 'array']
          },
          config_group: { type: 'string', default: 'default' },
          description: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  })
  async createConfig(
    request: FastifyRequest<{
      Body: {
        config_key: string;
        config_value: string;
        config_type: string;
        config_group?: string;
        description?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        config_key,
        config_value,
        config_type,
        config_group,
        description
      } = request.body;

      // 获取当前用户（如果有认证）
      const updatedBy = (request as any).user?.username || 'system';

      this.logger.debug('Creating/updating system config', { config_key });

      const result = await this.systemConfigService.updateConfig(
        config_key,
        config_value,
        config_type,
        config_group || 'default',
        description,
        updatedBy
      );

      if (isLeft(result)) {
        const error = result.left;
        reply.status(400).send({
          success: false,
          error: error.message
        });
        return;
      }

      reply.status(200).send({
        success: true,
        message: 'Config saved successfully'
      });
    } catch (error: any) {
      this.logger.error('Failed to create/update system config', {
        error: error.message
      });

      reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * 更新配置
   * PUT /api/icalink/v1/system-configs/:key
   */
  @Put('/api/icalink/v1/system-configs/:key', {
    schema: {
      params: {
        type: 'object',
        required: ['key'],
        properties: {
          key: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['config_value', 'config_type'],
        properties: {
          config_value: { type: 'string' },
          config_type: {
            type: 'string',
            enum: ['string', 'number', 'boolean', 'json', 'array']
          },
          config_group: { type: 'string' },
          description: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  })
  async updateConfig(
    request: FastifyRequest<{
      Params: { key: string };
      Body: {
        config_value: string;
        config_type: string;
        config_group?: string;
        description?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { key } = request.params;
      const { config_value, config_type, config_group, description } =
        request.body;

      // 获取当前用户（如果有认证）
      const updatedBy = (request as any).user?.username || 'system';

      this.logger.debug('Updating system config', { key });

      const result = await this.systemConfigService.updateConfig(
        key,
        config_value,
        config_type,
        config_group || 'default',
        description,
        updatedBy
      );

      if (isLeft(result)) {
        const error = result.left;
        reply.status(400).send({
          success: false,
          error: error.message
        });
        return;
      }

      reply.status(200).send({
        success: true,
        message: 'Config updated successfully'
      });
    } catch (error: any) {
      this.logger.error('Failed to update system config', {
        error: error.message
      });

      reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * 删除配置
   * DELETE /api/icalink/v1/system-configs/:key
   */
  @Delete('/api/icalink/v1/system-configs/:key', {
    schema: {
      params: {
        type: 'object',
        required: ['key'],
        properties: {
          key: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  })
  async deleteConfig(
    request: FastifyRequest<{ Params: { key: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { key } = request.params;

      this.logger.debug('Deleting system config', { key });

      const result = await this.systemConfigService.deleteConfig(key);

      if (isLeft(result)) {
        const error = result.left;
        reply.status(400).send({
          success: false,
          error: error.message
        });
        return;
      }

      if (!result.right) {
        reply.status(404).send({
          success: false,
          error: 'Config not found'
        });
        return;
      }

      reply.status(200).send({
        success: true,
        message: 'Config deleted successfully'
      });
    } catch (error: any) {
      this.logger.error('Failed to delete system config', {
        error: error.message
      });

      reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
