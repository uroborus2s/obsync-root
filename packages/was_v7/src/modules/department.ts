import type { AuthManager } from '../auth/auth-manager.js';
import type { HttpClient } from '../core/http-client.js';
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
 * 部门管理模块
 * 提供部门的增删改查功能
 */
export class DepartmentModule {
  constructor(
    private readonly wasV7HttpClient: HttpClient,
    private readonly wasV7AuthManager: AuthManager
  ) {}

  /**
   * 确保有有效的访问令牌
   */
  private async ensureAccessToken(): Promise<void> {
    if (!this.wasV7AuthManager.isTokenValid()) {
      await this.wasV7AuthManager.getAppAccessToken();
    }
  }

  /**
   * 查询子部门列表
   * 查询指定部门下的子部门列表，支持分页
   * 单页最大值为50，如果需要获取所有数据请使用getAllDeptList方法
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/dept/get-dept-list.html
   * @param params 查询参数
   * @returns 部门列表
   */
  async getDeptList(
    params: GetDeptListParams = {}
  ): Promise<GetDeptListResponse> {
    await this.ensureAccessToken();

    // 确保分页大小不超过最大值50
    const queryParams = {
      ...params,
      page_size: Math.min(params.page_size || 10, 50)
    };

    const response = await this.wasV7HttpClient.get<GetDeptListResponse>(
      '/v7/contacts/depts',
      queryParams
    );
    return response.data;
  }

  /**
   * 获取所有子部门列表
   * 自动处理分页，获取指定部门下的所有子部门
   *
   * @param params 查询参数（不包含分页参数）
   * @returns 所有部门列表
   */
  async getAllDeptList(
    params: Omit<GetDeptListParams, 'page_size' | 'page_token'> = {}
  ): Promise<DeptInfo[]> {
    const allDepts: DeptInfo[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.getDeptList({
        ...params,
        page_size: 50, // 使用最大分页大小
        page_token: pageToken
      });

      allDepts.push(...response.items);
      pageToken = response.next_page_token;
    } while (pageToken);

    return allDepts;
  }

  /**
   * 批量查询指定部门信息
   * 根据部门ID列表批量查询部门信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/dept/batch-dept-info.html
   * @param params 查询参数
   * @returns 部门信息列表
   */
  async batchGetDeptInfo(
    params: BatchGetDeptInfoParams
  ): Promise<BatchGetDeptInfoResponse> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post<BatchGetDeptInfoResponse>(
      '/v7/contacts/depts/batch',
      params
    );
    return response.data;
  }

  /**
   * 根据外部部门ID获取部门信息
   * 通过外部部门ID查询部门信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/dept/get-ex-dept.html
   * @param params 查询参数
   * @returns 部门信息
   */
  async getDeptByExId(params: GetDeptByExIdParams): Promise<DeptInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<DeptInfo>(
      `/v7/contacts/depts/ex/${params.ex_dept_id}`
    );
    return response.data;
  }

  /**
   * 获取根部门
   * 获取企业的根部门信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/dept/get-root-dept.html
   * @returns 根部门信息
   */
  async getRootDept(): Promise<DeptInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<DeptInfo>(
      '/v7/contacts/depts/root'
    );
    return response.data;
  }

  /**
   * 创建部门
   * 在指定父部门下创建新部门
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/dept/create-dept.html
   * @param params 创建参数
   * @returns 创建结果
   */
  async createDept(params: CreateDeptParams): Promise<CreateDeptResponse> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post<CreateDeptResponse>(
      '/v7/contacts/depts',
      params
    );
    return response.data;
  }

  /**
   * 更新部门
   * 更新指定部门的信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/dept/update-dept.html
   * @param params 更新参数
   * @returns 更新结果
   */
  async updateDept(params: UpdateDeptParams): Promise<void> {
    await this.ensureAccessToken();

    const { dept_id, ...updateData } = params;
    await this.wasV7HttpClient.put(`/v7/contacts/depts/${dept_id}`, updateData);
  }

  /**
   * 删除部门
   * 删除指定部门（部门下不能有子部门和用户）
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/dept/delete-dept.html
   * @param params 删除参数
   * @returns 删除结果
   */
  async deleteDept(params: DeleteDeptParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.delete(`/v7/contacts/depts/${params.dept_id}`);
  }

  /**
   * 获取部门信息
   * 根据部门ID获取单个部门信息
   *
   * @param deptId 部门ID
   * @returns 部门信息
   */
  async getDeptInfo(deptId: string): Promise<DeptInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<DeptInfo>(
      `/v7/contacts/depts/${deptId}`
    );
    return response.data;
  }

  /**
   * 获取所有子部门（递归）
   * 递归获取指定部门下的所有子部门
   *
   * @param parentId 父部门ID，不传则从根部门开始
   * @returns 所有子部门列表
   */
  async getAllSubDepts(parentId?: string): Promise<DeptInfo[]> {
    const allDepts: DeptInfo[] = [];

    // 使用getAllDeptList获取当前层级的所有部门
    const currentLevelDepts = await this.getAllDeptList({
      parent_id: parentId
    });

    allDepts.push(...currentLevelDepts);

    // 递归获取每个子部门的子部门
    for (const dept of currentLevelDepts) {
      const subDepts = await this.getAllSubDepts(dept.id);
      allDepts.push(...subDepts);
    }

    return allDepts;
  }

  /**
   * 获取部门树结构
   * 获取完整的部门树结构
   *
   * @param parentId 父部门ID，不传则从根部门开始
   * @returns 部门树结构
   */
  async getDeptTree(parentId?: string): Promise<DeptTreeNode[]> {
    // 使用getAllDeptList获取当前层级的所有部门
    const depts = await this.getAllDeptList({
      parent_id: parentId
    });

    const tree: DeptTreeNode[] = [];

    for (const dept of depts) {
      const children = await this.getDeptTree(dept.id);
      tree.push({
        ...dept,
        children: children.length > 0 ? children : undefined
      });
    }

    return tree;
  }
}

/**
 * 部门树节点
 */
export interface DeptTreeNode extends DeptInfo {
  /** 子部门列表 */
  children?: DeptTreeNode[];
}
