import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { z } from 'zod';
import { WasV1Options } from '../types/config.js';
import { WasV1RequestError } from '../types/request.js';
import { generateWPS3Headers } from './signature.js';
import { getCompanyToken } from './token.js';

/**
 * 创建WPS API请求客户端
 */
export function createWpsApiClient(
  app: any,
  config: WasV1Options
): AxiosInstance {
  // 获取日志对象
  const logger = app.hasPlugin('logger') ? app.logger : console;

  // 创建axios实例
  const axiosInstance = axios.create({
    baseURL: config.baseUrl || 'https://openapi.wps.cn',
    timeout: config.requestTimeout || 10000,
    headers: {
      Accept: 'application/json'
    }
  });

  // 请求拦截器：添加WPS3签名和company_token
  axiosInstance.interceptors.request.use(async (reqConfig) => {
    try {
      // 检查是否需要跳过签名
      if (reqConfig.headers?.['skipSign']) {
        delete reqConfig.headers['skipSign'];
        return reqConfig;
      }

      // 获取请求URL（不带域名）
      const url = reqConfig.url || '';

      // 获取请求方法
      const method = reqConfig.method?.toUpperCase() || 'GET';

      // 获取请求数据
      const data = reqConfig.data;

      // 生成WPS3签名头
      const headers = generateWPS3Headers(
        config.appId,
        config.appKey,
        method,
        url,
        data
      );

      // 检查是否需要跳过token刷新
      if (!reqConfig.headers?.['skipTokenRefresh']) {
        // 获取company_token
        const companyToken = await getCompanyToken(app, config);

        // 添加company_token到请求参数
        if (method === 'GET') {
          // GET请求添加到URL参数
          reqConfig.params = {
            ...reqConfig.params,
            company_token: companyToken
          };
        } else {
          // POST/PUT等请求添加到请求体
          reqConfig.data = {
            ...reqConfig.data,
            company_token: companyToken
          };
        }
      }

      // 删除特殊头部
      if (reqConfig.headers?.['skipTokenRefresh']) {
        delete reqConfig.headers['skipTokenRefresh'];
      }

      // 合并请求头
      if (reqConfig.headers) {
        for (const [key, value] of Object.entries(headers)) {
          reqConfig.headers[key] = value;
        }
      }

      // 记录请求日志
      logger.debug(`WPS API请求: ${method} ${url}`, {
        headers: reqConfig.headers,
        params: reqConfig.params,
        data: reqConfig.data
      });

      return reqConfig;
    } catch (error) {
      logger.error('WPS API请求拦截器错误', error);
      return Promise.reject(error);
    }
  });

  // 响应拦截器：处理错误和响应格式化
  axiosInstance.interceptors.response.use(
    (response) => {
      // 记录响应日志
      logger.debug(
        `WPS API响应: ${response.config.method?.toUpperCase()} ${response.config.url}`,
        {
          status: response.status,
          data: response.data
        }
      );

      return response;
    },
    (error) => {
      // 记录错误日志
      logger.error('WPS API请求错误', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data
      });

      // 构造错误对象
      const requestError: WasV1RequestError = {
        message: error.message,
        status: error.response?.status,
        code: error.response?.data?.code,
        data: error.response?.data
      };

      return Promise.reject(requestError);
    }
  );

  return axiosInstance;
}

/**
 * 发送请求并验证响应数据
 * @param client Axios客户端实例
 * @param config 请求配置
 * @param schema 响应数据验证Schema
 * @returns 验证后的响应数据
 */
export async function sendRequest<T>(
  client: AxiosInstance,
  config: AxiosRequestConfig,
  schema?: z.ZodType<T>
): Promise<T> {
  try {
    // 发送请求
    const response: AxiosResponse = await client(config);

    // 如果提供了schema，验证响应数据
    if (schema) {
      return schema.parse(response.data);
    }

    return response.data;
  } catch (error) {
    if ((error as Error).name === 'ZodError') {
      // Zod验证错误
      throw new Error(`响应数据验证失败: ${(error as Error).message}`);
    }

    // 其他错误
    throw error;
  }
}
