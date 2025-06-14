/**
 * API配置
 */

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  useMockApi: boolean;
}

/**
 * 获取API配置
 */
export function getApiConfig(): ApiConfig {
  const isDevelopment = import.meta.env.DEV;

  // 默认配置
  const defaultConfig: ApiConfig = {
    baseUrl: '/api/tasks',
    timeout: 10000,
    useMockApi: false
  };

  // 从环境变量读取配置
  const config: ApiConfig = {
    baseUrl: import.meta.env.VITE_API_BASE_URL || defaultConfig.baseUrl,
    timeout: Number(import.meta.env.VITE_API_TIMEOUT) || defaultConfig.timeout,
    useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true'
  };

  // 如果在开发环境且没有设置API_BASE_URL，则使用Mock API
  if (isDevelopment && !import.meta.env.VITE_API_BASE_URL) {
    config.useMockApi = true;
  }

  return config;
}

/**
 * API配置实例
 */
export const apiConfig = getApiConfig();

/**
 * 是否使用Mock API
 */
export const shouldUseMockApi = apiConfig.useMockApi;

/**
 * 打印当前API配置（仅在开发环境）
 */
if (import.meta.env.DEV) {
  console.log('🔧 API配置:', {
    baseUrl: apiConfig.baseUrl,
    timeout: apiConfig.timeout,
    useMockApi: apiConfig.useMockApi,
    environment: import.meta.env.MODE
  });
}
