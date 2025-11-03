import { apiClient } from './api-client'

/**
 * 系统配置实体
 */
export interface SystemConfig {
  id: number
  config_key: string
  config_value: string | null
  config_type: string
  config_group: string
  description: string | null
  is_system: boolean
  is_encrypted: boolean
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

/**
 * 创建/更新配置请求
 */
export interface CreateConfigRequest {
  config_key: string
  config_value: string
  config_type: string
  config_group: string
  description?: string
}

/**
 * API响应格式
 */
export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

/**
 * 系统配置API
 */
export const systemConfigApi = {
  /**
   * 获取所有配置
   */
  async getAllConfigs(): Promise<ApiResponse<SystemConfig[]>> {
    return apiClient.get('/api/icalink/v1/system-configs')
  },

  /**
   * 根据配置键获取配置
   */
  async getConfigByKey(configKey: string): Promise<ApiResponse<SystemConfig>> {
    return apiClient.get(`/api/icalink/v1/system-configs/${configKey}`)
  },

  /**
   * 根据分组获取配置列表
   */
  async getConfigsByGroup(
    configGroup: string
  ): Promise<ApiResponse<SystemConfig[]>> {
    return apiClient.get(
      `/api/icalink/v1/system-configs/group/${configGroup}`
    )
  },

  /**
   * 创建配置
   */
  async createConfig(
    data: CreateConfigRequest
  ): Promise<ApiResponse<SystemConfig>> {
    return apiClient.post('/api/icalink/v1/system-configs', data)
  },

  /**
   * 更新配置
   */
  async updateConfig(
    configKey: string,
    data: CreateConfigRequest
  ): Promise<ApiResponse<SystemConfig>> {
    return apiClient.put(`/api/icalink/v1/system-configs/${configKey}`, data)
  },

  /**
   * 删除配置
   */
  async deleteConfig(configKey: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/icalink/v1/system-configs/${configKey}`)
  },
}

