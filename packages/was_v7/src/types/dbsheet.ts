/**
 * WPS DBSheet (轻维表) 类型定义
 * 基于 WPS 365 DBSheet API 文档
 * @see https://open.wps.cn/documents/app-integration-dev/wps365/server/dbsheet/
 */

// ============================================================================
// 基础类型定义
// ============================================================================

/**
 * 字段类型枚举
 */
export enum DBSheetFieldType {
  // 基础类型
  SingleLineText = 'SingleLineText',
  MultiLineText = 'MultiLineText',
  Number = 'Number',
  Currency = 'Currency',
  Percentage = 'Percentage',

  // 日期时间
  Date = 'Date',
  Time = 'Time',

  // 选择类型
  SingleSelect = 'SingleSelect',
  MultipleSelect = 'MultipleSelect',

  // 其他类型
  Checkbox = 'Checkbox',
  Rating = 'Rating',
  Complete = 'Complete',
  Attachment = 'Attachment',

  // 特殊类型
  ID = 'ID',
  Phone = 'Phone',
  Email = 'Email',
  Url = 'Url',
  AutoNumber = 'AutoNumber'
}

/**
 * 视图类型枚举
 */
export enum DBSheetViewType {
  Grid = 'Grid',
  Kanban = 'Kanban',
  Gallery = 'Gallery',
  Form = 'Form',
  Gantt = 'Gantt',
  Query = 'Query'
}

/**
 * 筛选操作符枚举
 */
export enum DBSheetFilterOperator {
  Equals = 'Equals',
  NotEqu = 'NotEqu',
  Greater = 'Greater',
  GreaterEqu = 'GreaterEqu',
  Less = 'Less',
  LessEqu = 'LessEqu',
  GreaterEquAndLessEqu = 'GreaterEquAndLessEqu',
  LessOrGreater = 'LessOrGreater',
  BeginWith = 'BeginWith',
  EndWith = 'EndWith',
  Contains = 'Contains',
  NotContains = 'NotContains',
  Intersected = 'Intersected',
  Empty = 'Empty',
  NotEmpty = 'NotEmpty'
}

/**
 * 筛选逻辑关系
 */
export enum DBSheetFilterMode {
  AND = 'AND',
  OR = 'OR'
}

// ============================================================================
// 字段相关类型
// ============================================================================

/**
 * 选项项
 */
export interface DBSheetSelectItem {
  id?: string;
  value: string;
  color?: number;
}

/**
 * 字段数据配置（根据字段类型不同而不同）
 */
export interface DBSheetFieldData {
  // 数字/货币/百分比相关
  number_format?: string;

  // 日期相关
  default_value?: string;
  default_value_type?: string;

  // 选择类型相关
  allow_add_item_while_inputting?: boolean;
  items?: DBSheetSelectItem[];

  // 多行文本相关
  unique_value?: boolean;

  // 附件相关
  only_upload_by_camera?: boolean;

  // 等级相关
  max?: number;

  // 其他字段
  [key: string]: any;
}

/**
 * 字段定义
 */
export interface DBSheetField {
  id?: string;
  name: string;
  type: DBSheetFieldType | string;
  data?: DBSheetFieldData;
}

/**
 * 创建字段参数
 */
export interface CreateDBSheetFieldParams {
  fields: DBSheetField[];
}

/**
 * 更新字段参数
 */
export interface UpdateDBSheetFieldParams {
  fields: DBSheetField[];
  prefer_id?: boolean;
}

/**
 * 删除字段参数
 */
export interface DeleteDBSheetFieldParams {
  fields: Array<string>;
}

// ============================================================================
// 视图相关类型
// ============================================================================

/**
 * 视图定义
 */
export interface DBSheetView {
  id?: string;
  name: string;
  type: DBSheetViewType;
}

/**
 * 创建视图参数
 */
export interface CreateDBSheetViewParams {
  name: string;
  type: DBSheetViewType | string;
}

/**
 * 更新视图参数
 */
export interface UpdateDBSheetViewParams {
  name: string;
}

// ============================================================================
// Sheet 相关类型
// ============================================================================

/**
 * Sheet 定义
 */
export interface DBSheet {
  id: number;
  name: string;
  primary_field_id: string;
  fields: DBSheetField[];
  views: DBSheetView[];
}

/**
 * 创建 Sheet 参数
 */
export interface CreateDBSheetParams {
  name: string;
  views?: Array<{
    name: string;
    type: DBSheetViewType | string;
  }>;
  fields?: DBSheetField[];
}

/**
 * 更新 Sheet 参数
 */
export interface UpdateDBSheetParams {
  name: string;
}

// ============================================================================
// 记录相关类型
// ============================================================================

/**
 * 记录字段值
 */
export type DBSheetRecordFields = Record<string, any>;

/**
 * 记录定义
 */
export interface DBSheetRecord {
  id: string;
  fields: DBSheetRecordFields;
  created_time?: string;
  creator?: string;
  last_modified_by?: string;
  last_modified_time?: string;
}

/**
 * 创建记录参数
 */
export interface CreateDBSheetRecordParams {
  prefer_id?: boolean;
  records: Array<{
    fields_value: DBSheetRecordFields;
  }>;
}

/**
 * 更新记录参数
 */
export interface UpdateDBSheetRecordParams {
  prefer_id?: boolean;
  id: string;
  records: Array<{
    id: string;
    fields_value: DBSheetRecordFields;
  }>;
}

/**
 * 更新记录参数
 */
export interface UpdateDBSheetRecordParams {
  prefer_id?: boolean;
  id: string;
  records: Array<{
    id: string;
    fields_value: DBSheetRecordFields;
  }>;
}

/**
 * 删除记录参数
 */
export interface DeleteDBSheetRecordParams {
  records: string[];
}

/**
 * 筛选条件
 */
export interface DBSheetFilterCriteria {
  field: string;
  op: DBSheetFilterOperator | string;
  values: string[];
}

/**
 * 查询记录参数
 */
export interface QueryDBSheetRecordsParams {
  fields?: string[];
  filter?: {
    criteria?: DBSheetFilterCriteria[];
    mode?: DBSheetFilterMode | string;
  };
  max_records?: number;
  page_size?: number;
  page_token?: string;
  prefer_id?: boolean;
  show_fields_info?: boolean;
  show_record_extra_info?: boolean;
  text_value?: string;
  view_id?: string;
}

/**
 * 复杂查询记录参数
 */
export interface ComplexQueryDBSheetRecordsParams {
  preferId?: boolean;
  pageSize?: number;
  viewId?: string;
  maxRecords?: number;
  fields?: string[];
  offset?: string;
  filter?: {
    mode?: DBSheetFilterMode | string;
    criteria: DBSheetFilterCriteria[];
  };
}

// ============================================================================
// 响应类型
// ============================================================================

/**
 * WPS API 通用响应格式
 */
export interface WpsDBSheetApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

/**
 * DBSheet Schema 响应数据
 */
export interface DBSheetSchemaData {
  sheets: DBSheet[];
}

/**
 * 记录列表响应数据
 */
export interface DBSheetRecordsData {
  records: DBSheetRecord[];
}

/**
 * 删除记录列表响应数据
 */
export interface DBSheetDeleteRecord {
  deleted: boolean;
  id: string;
}

/**
 * 记录列表响应数据
 */
export interface DBSheetRecordsDeleteData {
  records: DBSheetDeleteRecord[];
}

/**
 * 字段列表响应数据
 */
export interface DBSheetFieldsData {
  fields: DBSheetField[];
  prefer_id?: boolean;
}

/**
 * 视图响应数据
 */
export interface DBSheetViewData {
  view: DBSheetView;
}

/**
 * Sheet 响应数据
 */
export interface DBSheetData {
  sheet: DBSheet;
}

/**
 * 记录响应数据
 */
export interface DBSheetRecordData {
  records: DBSheetRecord[];
}

/**
 * 删除响应数据
 */
export interface DBSheetDeleteData {
  deleted: boolean;
  id: string;
}
