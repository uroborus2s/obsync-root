/**
 * Stratix框架通用类型定义
 */

/**
 * JSON Schema类型定义
 */
export interface JSONSchema {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema | JSONSchema[];
  required?: string[];
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  default?: any;
  additionalProperties?: boolean | JSONSchema;
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  not?: JSONSchema;
  $ref?: string;
  definitions?: Record<string, JSONSchema>;
  [key: string]: any;
}

/**
 * 环境变量配置选项
 */
export interface EnvOptions {
  /**
   * 是否加载.env文件
   */
  dotenv?: boolean;

  /**
   * 必需的环境变量
   */
  required?: string[];

  /**
   * 环境变量前缀
   */
  prefix?: string;
}
