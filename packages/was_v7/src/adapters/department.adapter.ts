import type { AwilixContainer, Logger } from '@stratix/core';
import type { HttpClientService } from '../services/httpClientService.js';
import type {
  BatchGetDeptInfoParams,
  BatchGetDeptInfoResponse,
  CreateDeptParams,
  CreateDeptResponse,
  DeleteDeptParams,
  DeptInfo,
  GetDeptByExIdParams,
  GetDeptListParams,
  GetDeptListResponse,
  UpdateDeptParams
} from '../types/contact.js';

/**
 * 部门树节点
 */
export interface DeptTreeNode extends DeptInfo {
  children?: DeptTreeNode[];
}

/**
 * WPS V7 部门API适配器
 * 提供纯函数式的部门管理API调用
 */
export interface WpsDepartmentAdapter {
  // 基础CRUD操作
  createDept(params: CreateDeptParams): Promise<CreateDeptResponse>;
  updateDept(params: UpdateDeptParams): Promise<void>;
  deleteDept(params: DeleteDeptParams): Promise<void>;

  // 查询操作
  getDeptList(params?: GetDeptListParams): Promise<GetDeptListResponse>;
  getAllDeptList(params?: GetDeptListParams): Promise<DeptInfo[]>;
  getRootDept(): Promise<DeptInfo>;
  getDeptByExId(params: GetDeptByExIdParams): Promise<DeptInfo>;

  // 批量操作
  batchGetDeptInfo(
    params: BatchGetDeptInfoParams
  ): Promise<BatchGetDeptInfoResponse>;

  // 便捷方法
  getAllSubDepts(parentId: string): Promise<DeptInfo[]>;
  getDeptTree(rootId?: string): Promise<DeptTreeNode>;
}

/**
 * 创建WPS部门适配器的工厂函数
 */
export function createWpsDepartmentAdapter(
  pluginContainer: AwilixContainer
): WpsDepartmentAdapter {
  const httpClient =
    pluginContainer.resolve<HttpClientService>('httpClientService');
  const logger = pluginContainer.resolve<Logger>('logger');

  const adapter: WpsDepartmentAdapter = {
    /**
     * 创建部门
     */
    async createDept(params: CreateDeptParams): Promise<CreateDeptResponse> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post(
        '/v7/contacts/departments',
        params
      );
      return response.data;
    },

    /**
     * 更新部门信息
     */
    async updateDept(params: UpdateDeptParams): Promise<void> {
      await httpClient.ensureAccessToken();
      await httpClient.put('/v7/contacts/departments', params);
    },

    /**
     * 删除部门
     */
    async deleteDept(params: DeleteDeptParams): Promise<void> {
      await httpClient.ensureAccessToken();
      await httpClient.delete('/v7/contacts/departments', params);
    },

    /**
     * 获取部门列表
     */
    async getDeptList(
      params: GetDeptListParams = {}
    ): Promise<GetDeptListResponse> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get('/v7/contacts/departments', params);
      return response.data;
    },

    /**
     * 获取所有部门列表（自动分页）
     */
    async getAllDeptList(params: GetDeptListParams = {}): Promise<DeptInfo[]> {
      const allDepts: DeptInfo[] = [];
      let pageToken: string | undefined;

      do {
        const response = await adapter.getDeptList({
          ...params,
          page_token: pageToken
        });

        allDepts.push(...(response.items || []));
        pageToken = response.next_page_token;
      } while (pageToken);

      return allDepts;
    },

    /**
     * 获取根部门
     */
    async getRootDept(): Promise<DeptInfo> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get('/v7/contacts/departments/root');
      return response.data;
    },

    /**
     * 根据外部ID获取部门
     */
    async getDeptByExId(params: GetDeptByExIdParams): Promise<DeptInfo> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get(
        '/v7/contacts/departments/by_ex_id',
        params
      );
      return response.data;
    },

    /**
     * 批量获取部门信息
     */
    async batchGetDeptInfo(
      params: BatchGetDeptInfoParams
    ): Promise<BatchGetDeptInfoResponse> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post(
        '/v7/contacts/departments/batch/get',
        params
      );
      return response.data;
    },

    /**
     * 获取所有子部门（递归）
     */
    async getAllSubDepts(parentId: string): Promise<DeptInfo[]> {
      const allSubDepts: DeptInfo[] = [];

      const fetchSubDepts = async (pid: string): Promise<void> => {
        const response = await adapter.getDeptList({ parent_id: pid });
        const subDepts = response.items || [];

        allSubDepts.push(...subDepts);

        // 递归获取子部门的子部门
        for (const dept of subDepts) {
          await fetchSubDepts(dept.id);
        }
      };

      await fetchSubDepts(parentId);
      return allSubDepts;
    },

    /**
     * 获取部门树结构
     */
    async getDeptTree(rootId?: string): Promise<DeptTreeNode> {
      const root = rootId
        ? await adapter.getDeptByExId({ ex_dept_id: rootId })
        : await adapter.getRootDept();

      const buildTree = async (dept: DeptInfo): Promise<DeptTreeNode> => {
        const children = await adapter.getDeptList({ parent_id: dept.id });
        const childNodes: DeptTreeNode[] = [];

        for (const child of children.items || []) {
          const childNode = await buildTree(child);
          childNodes.push(childNode);
        }

        return {
          ...dept,
          children: childNodes.length > 0 ? childNodes : undefined
        };
      };

      return buildTree(root);
    }
  };

  return adapter;
}

/**
 * 默认导出适配器配置
 */
export default {
  adapterName: 'department',
  factory: createWpsDepartmentAdapter
};
