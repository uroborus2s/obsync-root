/**
 * WPS V1 API分页响应
 */
export interface WasV1PaginationResponse {
  total_count: number;
  page_size: number;
  page_number: number;
}

/**
 * 通用响应格式
 */
export interface WasV1Response<T = any> {
  code?: number;
  message?: string;
  data?: T;
}

/**
 * 认证令牌响应
 */
export interface WasV1TokenResponse {
  company_token: string;
  expires_in: number;
}

/**
 * 用户认证响应
 */
export interface WasV1UserTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  user_id?: string;
}

/**
 * 部门信息
 */
export interface WasV1Department {
  id: string;
  name: string;
  parentid?: string;
  order?: number;
  createtime?: number;
  updatetime?: number;
}

/**
 * 用户信息
 */
export interface WasV1User {
  userid: string;
  name: string;
  email?: string;
  mobile?: string;
  departments?: Array<{
    department_id: string;
    is_leader?: boolean;
  }>;
  status?: number;
}

/**
 * 文档信息
 */
export interface WasV1Document {
  id: string;
  name: string;
  type: string;
  size?: number;
  create_time?: number;
  modify_time?: number;
  parent_id?: string;
  creator?: {
    id: string;
    name: string;
  };
}

/**
 * 消息信息
 */
export interface WasV1Message {
  id: string;
  sender: {
    id: string;
    name: string;
  };
  chat_id: string;
  create_time: number;
  content: any; // 消息内容可能有多种类型
}
