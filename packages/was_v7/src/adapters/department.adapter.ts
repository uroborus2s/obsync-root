import type { AwilixContainer, Logger } from '@stratix/core';
import type { HttpClientService } from '../services/httpClientService.js';
import type {
  BatchGetDeptInfoParams,
  BatchGetDeptInfoResponse,
  DeptInfo,
  GetDeptByExIdsParams,
  GetDeptByExIdsResponse,
  GetDeptChildrenParams,
  GetDeptChildrenResponse
} from '../types/contact.js';

/**
 * WPS V7 部门API适配器
 * 提供符合WPS开放平台v7规范的部门管理API调用
 *
 * @remarks
 * - 签名方式：KSO-1
 * - 权限要求：kso.contact.readwrite 或 kso.contact.read
 */
export interface WpsDepartmentAdapter {
  /**
   * 获取根部门信息
   *
   * @returns 根部门信息
   * @throws {WpsError} 当API调用失败时抛出错误
   *
   * @example
   * ```typescript
   * const rootDept = await departmentAdapter.getRootDept();
   * console.log('根部门名称:', rootDept.name);
   * console.log('根部门ID:', rootDept.id);
   * ```
   */
  getRootDept(): Promise<DeptInfo>;

  /**
   * 查询子部门列表
   *
   * @param params - 查询参数
   * @returns 子部门列表响应
   * @throws {WpsError} 当API调用失败时抛出错误
   *
   * @example
   * ```typescript
   * // 查询指定部门的子部门（第一页）
   * const result = await departmentAdapter.getDeptChildren({
   *   dept_id: 'parent-dept-id',
   *   page_size: 20
   * });
   * console.log('子部门数量:', result.items.length);
   *
   * // 翻页查询
   * if (result.next_page_token) {
   *   const nextPage = await departmentAdapter.getDeptChildren({
   *     dept_id: 'parent-dept-id',
   *     page_size: 20,
   *     page_token: result.next_page_token
   *   });
   * }
   * ```
   */
  getDeptChildren(
    params: GetDeptChildrenParams
  ): Promise<GetDeptChildrenResponse>;

  /**
   * 批量查询指定部门信息
   *
   * @param params - 查询参数
   * @returns 部门信息列表响应
   * @throws {WpsError} 当API调用失败时抛出错误
   *
   * @example
   * ```typescript
   * // 批量查询多个部门的信息
   * const result = await departmentAdapter.batchGetDeptInfo({
   *   dept_ids: ['dept-id-1', 'dept-id-2', 'dept-id-3']
   * });
   * console.log('查询到的部门数量:', result.items.length);
   *
   * // 遍历部门信息
   * result.items.forEach(dept => {
   *   console.log(`部门: ${dept.name}, ID: ${dept.id}`);
   * });
   * ```
   */
  batchGetDeptInfo(
    params: BatchGetDeptInfoParams
  ): Promise<BatchGetDeptInfoResponse>;

  /**
   * 根据外部部门ID批量获取部门信息
   *
   * @param params - 查询参数
   * @returns 部门信息列表响应
   * @throws {WpsError} 当API调用失败时抛出错误
   *
   * @example
   * ```typescript
   * // 根据外部身份源部门ID批量查询部门信息
   * const result = await departmentAdapter.getDeptByExIds({
   *   ex_dept_ids: ['ex-dept-id-1', 'ex-dept-id-2', 'ex-dept-id-3']
   * });
   * console.log('查询到的部门数量:', result.items.length);
   *
   * // 遍历部门信息
   * result.items.forEach(dept => {
   *   console.log(`部门: ${dept.name}, 外部ID: ${dept.ex_dept_id}`);
   * });
   * ```
   */
  getDeptByExIds(params: GetDeptByExIdsParams): Promise<GetDeptByExIdsResponse>;
}

/**
 * 创建WPS部门适配器的工厂函数
 *
 * @param pluginContainer - Awilix插件容器，用于解析依赖
 * @returns WPS部门适配器实例
 *
 * @remarks
 * 该适配器遵循Stratix框架的Adapter层规范：
 * - 使用SINGLETON生命周期
 * - 通过容器解析HttpClientService和Logger依赖
 * - 提供统一的错误处理和结果格式转换
 * - 自动处理KSO-1签名和授权头
 */
export function createWpsDepartmentAdapter(
  pluginContainer: AwilixContainer
): WpsDepartmentAdapter {
  const httpClient =
    pluginContainer.resolve<HttpClientService>('httpClientService');
  const logger = pluginContainer.resolve<Logger>('logger');

  const adapter: WpsDepartmentAdapter = {
    /**
     * 获取根部门信息
     *
     * @returns 根部门信息
     * @throws {WpsError} 当API调用失败时抛出错误
     *
     * @remarks
     * - 接口地址：GET https://openapi.wps.cn/v7/depts/root
     * - 签名方式：KSO-1（由HttpClientService自动处理）
     * - 权限要求：kso.contact.readwrite 或 kso.contact.read
     *
     * 请求头会自动包含：
     * - Content-Type: application/json
     * - X-Kso-Date: RFC1123格式日期
     * - X-Kso-Authorization: KSO-1签名值
     * - Authorization: Bearer {access_token}
     */
    async getRootDept(): Promise<DeptInfo> {
      try {
        logger.debug('开始获取根部门信息');

        // 确保访问令牌有效
        await httpClient.ensureAccessToken();

        // 调用API获取根部门信息
        // HttpClientService会自动添加KSO-1签名和Authorization头
        const response = await httpClient.get<DeptInfo>('/v7/depts/root');

        logger.debug('成功获取根部门信息', {
          deptId: response.data.id,
          deptName: response.data.name
        });

        return response.data;
      } catch (error) {
        logger.error('获取根部门信息失败', error);
        throw error;
      }
    },

    /**
     * 查询子部门列表
     *
     * @param params - 查询参数
     * @returns 子部门列表响应
     * @throws {WpsError} 当API调用失败时抛出错误
     *
     * @remarks
     * - 接口地址：GET https://openapi.wps.cn/v7/depts/{dept_id}/children
     * - 签名方式：KSO-1（由HttpClientService自动处理）
     * - 权限要求：kso.contact.readwrite 或 kso.contact.read
     *
     * 请求头会自动包含：
     * - Content-Type: application/json
     * - X-Kso-Date: RFC1123格式日期
     * - X-Kso-Authorization: KSO-1签名值
     * - Authorization: Bearer {access_token}
     *
     * 查询参数：
     * - page_size: 分页大小，默认10，最大50
     * - page_token: 分页标记，用于翻页
     * - with_total: 是否返回总数
     */
    async getDeptChildren(
      params: GetDeptChildrenParams
    ): Promise<GetDeptChildrenResponse> {
      try {
        const { dept_id, page_size, page_token, with_total } = params;

        logger.debug('开始查询子部门列表', {
          deptId: dept_id,
          pageSize: page_size,
          pageToken: page_token
        });

        // 确保访问令牌有效
        await httpClient.ensureAccessToken();

        // 构建查询参数
        const queryParams: Record<string, string | number | boolean> = {};
        if (page_size !== undefined) {
          queryParams.page_size = page_size;
        }
        if (page_token) {
          queryParams.page_token = page_token;
        }
        if (with_total !== undefined) {
          queryParams.with_total = with_total;
        }

        // 构建查询字符串
        const queryString =
          Object.keys(queryParams).length > 0
            ? '?' +
              new URLSearchParams(
                Object.entries(queryParams).map(([key, value]) => [
                  key,
                  String(value)
                ])
              ).toString()
            : '';

        // 调用API查询子部门列表
        const response = await httpClient.get<GetDeptChildrenResponse>(
          `/v7/depts/${dept_id}/children${queryString}`
        );

        logger.debug('成功查询子部门列表', {
          deptId: dept_id,
          count: response.data.items.length,
          hasNextPage: !!response.data.next_page_token
        });

        return response.data;
      } catch (error) {
        logger.error('查询子部门列表失败', error);
        throw error;
      }
    },

    /**
     * 批量查询指定部门信息
     *
     * @param params - 查询参数
     * @returns 部门信息列表响应
     * @throws {WpsError} 当API调用失败时抛出错误
     *
     * @remarks
     * - 接口地址：POST https://openapi.wps.cn/v7/depts/batch_read
     * - 签名方式：KSO-1（由HttpClientService自动处理）
     * - 权限要求：kso.contact.readwrite 或 kso.contact.read
     *
     * 请求头会自动包含：
     * - Content-Type: application/json
     * - X-Kso-Date: RFC1123格式日期
     * - X-Kso-Authorization: KSO-1签名值
     * - Authorization: Bearer {access_token}
     *
     * 请求体：
     * - dept_ids: 部门ID列表（必填）
     */
    async batchGetDeptInfo(
      params: BatchGetDeptInfoParams
    ): Promise<BatchGetDeptInfoResponse> {
      try {
        const { dept_ids } = params;

        logger.debug('开始批量查询部门信息', {
          count: dept_ids.length,
          deptIds: dept_ids
        });

        // 确保访问令牌有效
        await httpClient.ensureAccessToken();

        // 调用API批量查询部门信息
        const response = await httpClient.post<BatchGetDeptInfoResponse>(
          '/v7/depts/batch_read',
          {
            dept_ids
          }
        );

        logger.debug('成功批量查询部门信息', {
          requestCount: dept_ids.length,
          responseCount: response.data.items.length
        });

        return response.data;
      } catch (error) {
        logger.error('批量查询部门信息失败', error);
        throw error;
      }
    },

    /**
     * 根据外部部门ID批量获取部门信息
     *
     * @param params - 查询参数
     * @returns 部门信息列表响应
     * @throws {WpsError} 当API调用失败时抛出错误
     *
     * @remarks
     * - 接口地址：POST https://openapi.wps.cn/v7/depts/by_ex_dept_ids
     * - 签名方式：KSO-1（由HttpClientService自动处理）
     * - 权限要求：kso.contact.readwrite 或 kso.contact.read
     *
     * 请求头会自动包含：
     * - Content-Type: application/json
     * - X-Kso-Date: RFC1123格式日期
     * - X-Kso-Authorization: KSO-1签名值
     * - Authorization: Bearer {access_token}
     *
     * 请求体：
     * - ex_dept_ids: 外部身份源部门ID列表（必填）
     */
    async getDeptByExIds(
      params: GetDeptByExIdsParams
    ): Promise<GetDeptByExIdsResponse> {
      try {
        const { ex_dept_ids } = params;

        logger.debug('开始根据外部部门ID批量查询部门信息', {
          count: ex_dept_ids.length,
          exDeptIds: ex_dept_ids
        });

        // 确保访问令牌有效
        await httpClient.ensureAccessToken();

        // 调用API根据外部部门ID批量查询部门信息
        const response = await httpClient.post<GetDeptByExIdsResponse>(
          '/v7/depts/by_ex_dept_ids',
          {
            ex_dept_ids
          }
        );

        logger.debug('成功根据外部部门ID批量查询部门信息', {
          requestCount: ex_dept_ids.length,
          responseCount: response.data.items.length
        });

        return response.data;
      } catch (error) {
        logger.error('根据外部部门ID批量查询部门信息失败', error);
        throw error;
      }
    }
  };

  return adapter;
}

/**
 * 默认导出适配器配置
 *
 * @remarks
 * 该配置用于在Stratix框架中注册适配器：
 * - adapterName: 适配器在容器中的注册名称
 * - factory: 适配器工厂函数，接收插件容器并返回适配器实例
 */
export default {
  adapterName: 'department',
  factory: createWpsDepartmentAdapter
};
