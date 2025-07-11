/**
 * 通讯录相关类型定义
 */

// 企业状态枚举
export type CompanyStatus = 'active' | 'deleted' | 'disabled';

// 部门状态枚举
export type DeptStatus = 'active' | 'deleted' | 'disabled';

// 用户状态枚举
export type UserStatus = 'active' | 'deleted' | 'disabled';

/**
 * 企业信息
 */
export interface CompanyInfo {
  /** 创建时间 */
  ctime: number;
  /** 企业ID */
  id: string;
  /** 企业头像 */
  logo: string;
  /** 企业名称 */
  name: string;
  /** 企业状态 */
  status: CompanyStatus;
}

/**
 * 部门信息
 */
export interface DeptInfo {
  /** 创建时间 */
  ctime: number;
  /** 部门ID */
  id: string;
  /** 部门名称 */
  name: string;
  /** 排序值 */
  order: number;
  /** 父部门ID */
  parent_id: string;
  /** 部门状态 */
  status: DeptStatus;
}

/**
 * 用户信息
 */
export interface UserInfo {
  /** 用户ID */
  id: string;
  /** 用户名称 */
  name: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  mobile?: string;
  /** 头像 */
  avatar?: string;
  /** 用户状态 */
  status: UserStatus;
  /** 企业ID */
  company_id: string;
  /** 部门ID列表 */
  dept_ids?: string[];
  /** 创建时间 */
  ctime?: number;
  /** 更新时间 */
  mtime?: number;
  /** 外部用户ID */
  ex_user_id?: string;
  /** 工号 */
  employee_id?: string;
  /** 职位 */
  position?: string;
  /** 性别 */
  gender?: 'male' | 'female' | 'unknown';
  /** 生日 */
  birthday?: string;
  /** 直属主管的 user_id */
  leader_id?: string;
}

/**
 * 查询部门列表请求参数
 */
export interface GetDeptListParams {
  /** 父部门ID，不传则查询根部门 */
  parent_id?: string;
  /** 分页大小，默认20，最大100 */
  page_size?: number;
  /** 分页标记，第一次请求不传 */
  page_token?: string;
}

/**
 * 查询部门列表响应
 */
export interface GetDeptListResponse {
  /** 部门列表 */
  items: DeptInfo[];
  /** 下一页标记 */
  next_page_token?: string;
  /** 总数 */
  total: number;
}

/**
 * 批量查询部门信息请求参数
 */
export interface BatchGetDeptInfoParams {
  /** 部门ID列表，最多100个 */
  dept_ids: string[];
}

/**
 * 批量查询部门信息响应
 */
export interface BatchGetDeptInfoResponse {
  /** 部门信息列表 */
  items: DeptInfo[];
}

/**
 * 根据外部部门ID获取部门信息请求参数
 */
export interface GetDeptByExIdParams {
  /** 外部部门ID */
  ex_dept_id: string;
}

/**
 * 创建部门请求参数
 */
export interface CreateDeptParams {
  /** 部门名称 */
  name: string;
  /** 父部门ID */
  parent_id: string;
  /** 排序值，默认0 */
  order?: number;
  /** 外部部门ID */
  ex_dept_id?: string;
}

/**
 * 创建部门响应
 */
export interface CreateDeptResponse {
  /** 部门ID */
  id: string;
}

/**
 * 更新部门请求参数
 */
export interface UpdateDeptParams {
  /** 部门ID */
  dept_id: string;
  /** 部门名称 */
  name?: string;
  /** 父部门ID */
  parent_id?: string;
  /** 排序值 */
  order?: number;
  /** 外部部门ID */
  ex_dept_id?: string;
}

/**
 * 删除部门请求参数
 */
export interface DeleteDeptParams {
  /** 部门ID */
  dept_id: string;
}

/**
 * 查询用户列表请求参数
 */
export interface GetUserListParams {
  /** 部门ID */
  dept_id?: string;
  /** 分页大小，默认20，最大100 */
  page_size?: number;
  /** 分页标记，第一次请求不传 */
  page_token?: string;
  /** 是否包含子部门用户 */
  include_child_dept?: boolean;
}

/**
 * 查询用户列表响应
 */
export interface GetUserListResponse {
  /** 用户列表 */
  items: UserInfo[];
  /** 下一页标记 */
  next_page_token?: string;
  /** 总数 */
  total: number;
}

/**
 * 批量查询用户信息请求参数
 */
export interface BatchGetUserInfoParams {
  /** 用户ID列表，最多100个 */
  user_ids: string[];
}

/**
 * 批量查询用户信息响应
 */
export interface BatchGetUserInfoResponse {
  /** 用户信息列表 */
  items: UserInfo[];
}

/**
 * 创建用户请求参数
 */
export interface CreateUserParams {
  /** 用户名称 */
  name: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  mobile?: string;
  /** 部门ID列表 */
  dept_ids?: string[];
  /** 外部用户ID */
  ex_user_id?: string;
  /** 工号 */
  employee_id?: string;
  /** 职位 */
  position?: string;
  /** 性别 */
  gender?: 'male' | 'female' | 'unknown';
  /** 生日 */
  birthday?: string;
  /** 入职时间 */
  hire_date?: string;
}

/**
 * 创建用户响应
 */
export interface CreateUserResponse {
  /** 用户ID */
  id: string;
}

/**
 * 更新用户请求参数
 */
export interface UpdateUserParams {
  /** 用户ID */
  user_id: string;
  /** 用户名称 */
  name?: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  mobile?: string;
  /** 部门ID列表 */
  dept_ids?: string[];
  /** 外部用户ID */
  ex_user_id?: string;
  /** 工号 */
  employee_id?: string;
  /** 职位 */
  position?: string;
  /** 性别 */
  gender?: 'male' | 'female' | 'unknown';
  /** 生日 */
  birthday?: string;
  /** 入职时间 */
  hire_date?: string;
}

/**
 * 删除用户请求参数
 */
export interface DeleteUserParams {
  /** 用户ID */
  user_id: string;
}

/**
 * 批量禁用用户请求参数
 */
export interface BatchDisableUserParams {
  /** 用户ID列表，最多100个 */
  user_ids: string[];
}

/**
 * 批量启用用户请求参数
 */
export interface BatchEnableUserParams {
  /** 用户ID列表，最多100个 */
  user_ids: string[];
}

/**
 * 获取用户ID信息响应
 */
export interface GetCurrentUserIdResponse {
  /** 用户ID */
  user_id: string;
}

/**
 * 查询企业下所有用户请求参数
 */
export interface GetAllUserParams {
  /** 分页大小，默认20，最大50 */
  page_size?: number;
  /** 分页标记，第一次请求不传 */
  page_token?: string;
  /** 是否返回总数 */
  with_total?: boolean;
}

/**
 * 查询企业下所有用户响应
 */
export interface GetAllUserResponse {
  /** 用户列表 */
  items: UserInfo[];
  /** 下一页标记 */
  next_page_token?: string;
  /** 总数 */
  total?: number;
}

/**
 * 查询部门下用户列表请求参数
 */
export interface GetDeptUserParams {
  /** 部门ID */
  dept_id: string;
  /** 分页大小，默认20，最大50 */
  page_size?: number;
  /** 分页标记，第一次请求不传 */
  page_token?: string;
  /** 是否包含子部门用户 */
  include_child_dept?: boolean;
  /** 是否返回总数 */
  with_total?: boolean;
}

/**
 * 查询部门下用户列表响应
 */
export interface GetDeptUserResponse {
  /** 用户列表 */
  items: UserInfo[];
  /** 下一页标记 */
  next_page_token?: string;
  /** 总数 */
  total?: number;
}

/**
 * 批量查询部门下的成员信息请求参数
 */
export interface BatchGetDeptUserParams {
  /** 部门ID列表，最多100个 */
  dept_ids: string[];
  /** 是否包含子部门用户 */
  include_child_dept?: boolean;
}

/**
 * 批量查询部门下的成员信息响应
 */
export interface BatchGetDeptUserResponse {
  /** 部门用户信息列表 */
  items: DeptUserInfo[];
}

/**
 * 部门用户信息
 */
export interface DeptUserInfo {
  /** 部门ID */
  dept_id: string;
  /** 用户列表 */
  users: UserInfo[];
}

/**
 * 根据邮箱获取用户请求参数
 */
export interface GetUserByEmailParams {
  /** 邮箱地址 */
  email: string;
}

/**
 * 根据手机号获取用户请求参数
 */
export interface GetUserByPhoneParams {
  /** 手机号 */
  mobile: string;
}

/**
 * 根据外部用户ID获取用户请求参数
 */
export interface GetUserByExIdParams {
  /** 外部用户ID */
  ex_user_ids: string[];
  status: string[];
}

/**
 * 批量修改用户在部门中排序值请求参数
 */
export interface BatchUpdateUserOrderParams {
  /** 用户排序信息列表 */
  items: UserOrderInfo[];
}

/**
 * 用户排序信息
 */
export interface UserOrderInfo {
  /** 用户ID */
  user_id: string;
  /** 部门ID */
  dept_id: string;
  /** 排序值 */
  order: number;
}

/**
 * 批量更新用户所在部门请求参数
 */
export interface BatchUpdateUserDeptParams {
  /** 用户部门信息列表 */
  items: UserDeptInfo[];
}

/**
 * 用户部门信息
 */
export interface UserDeptInfo {
  /** 用户ID */
  user_id: string;
  /** 部门ID列表 */
  dept_ids: string[];
}

/**
 * 自定义用户属性
 */
export interface UserAttribute {
  /** 属性ID */
  id: string;
  /** 属性名称 */
  name: string;
  /** 属性类型 */
  type: 'text' | 'number' | 'date' | 'select' | 'multi_select';
  /** 属性值 */
  value?: any;
}

/**
 * 批量获取用户的自定义属性值请求参数
 */
export interface BatchGetUserAttributeParams {
  /** 用户ID列表，最多100个 */
  user_ids: string[];
  /** 属性ID列表，不传则获取所有属性 */
  attribute_ids?: string[];
}

/**
 * 批量获取用户的自定义属性值响应
 */
export interface BatchGetUserAttributeResponse {
  /** 用户属性信息列表 */
  items: UserAttributeInfo[];
}

/**
 * 用户属性信息
 */
export interface UserAttributeInfo {
  /** 用户ID */
  user_id: string;
  /** 属性列表 */
  attributes: UserAttribute[];
}

/**
 * 批量更新用户的自定义属性值请求参数
 */
export interface BatchUpdateUserAttributeParams {
  /** 用户属性更新信息列表 */
  items: UserAttributeUpdateInfo[];
}

/**
 * 用户属性更新信息
 */
export interface UserAttributeUpdateInfo {
  /** 用户ID */
  user_id: string;
  /** 属性更新列表 */
  attributes: UserAttributeUpdate[];
}

/**
 * 用户属性更新
 */
export interface UserAttributeUpdate {
  /** 属性ID */
  attribute_id: string;
  /** 属性值 */
  value: any;
}

/**
 * 将用户加入到部门请求参数
 */
export interface JoinDeptParams {
  /** 用户ID */
  user_id: string;
  /** 部门ID */
  dept_id: string;
  /** 排序值，默认0 */
  order?: number;
}

/**
 * 将用户移除部门请求参数
 */
export interface RemoveDeptParams {
  /** 用户ID */
  user_id: string;
  /** 部门ID */
  dept_id: string;
}

/**
 * 获取用户所在部门列表请求参数
 */
export interface GetUserDeptParams {
  /** 用户ID */
  user_id: string;
}

/**
 * 获取用户所在部门列表响应
 */
export interface GetUserDeptResponse {
  /** 部门列表 */
  items: UserDeptItem[];
}

/**
 * 用户部门项
 */
export interface UserDeptItem {
  /** 部门ID */
  dept_id: string;
  /** 部门名称 */
  dept_name: string;
  /** 排序值 */
  order: number;
  /** 是否为主部门 */
  is_primary: boolean;
}
