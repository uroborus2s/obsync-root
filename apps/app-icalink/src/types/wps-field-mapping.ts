/**
 * WPS 字段映射实体类型定义
 */

/**
 * WPS 字段映射表结构
 */
export interface WpsFieldMapping {
  id: number;
  file_id: string; // WPS 文件 ID
  sheet_id: number; // WPS Sheet ID
  wps_field_id: string; // WPS 字段 ID（从 API 获取）
  wps_field_name: string; // WPS 字段名称（中文）
  wps_field_type: string; // WPS 字段类型
  db_field_name: string; // 数据库字段名称
  is_active: number; // 是否启用：1-启用，0-禁用
  sort_order: number; // 排序顺序
  created_at: string; // 创建时间
  updated_at: string; // 更新时间
}

/**
 * 创建字段映射的输入类型
 */
export interface CreateWpsFieldMappingInput {
  file_id: string;
  sheet_id: number;
  wps_field_id: string;
  wps_field_name: string;
  wps_field_type: string;
  db_field_name: string;
  is_active?: number;
  sort_order?: number;
}

/**
 * 更新字段映射的输入类型
 */
export interface UpdateWpsFieldMappingInput {
  wps_field_id?: string;
  wps_field_name?: string;
  wps_field_type?: string;
  db_field_name?: string;
  is_active?: number;
  sort_order?: number;
}

/**
 * WPS API 返回的字段信息
 */
export interface WpsFieldSchema {
  id: string; // 字段 ID
  name: string; // 字段名称
  type: string; // 字段类型
  data?: any; // 字段配置数据（如选项列表）
}

/**
 * WPS API getSchemas 返回的结构
 */
export interface WpsSchemasResponse {
  fields: WpsFieldSchema[];
}

