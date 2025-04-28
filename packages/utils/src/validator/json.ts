/**
 * JSON验证模块
 * 基于ajv库提供JSON Schema验证功能
 */

import { Ajv, JSONSchemaType } from 'ajv';
// 导入类型定义
import type { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

// 创建Ajv实例并添加格式支持
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats.default(ajv);

/**
 * 验证结果接口
 */
export interface ValidationResult<T = any> {
  valid: boolean;
  data?: T;
  errors?: ErrorObject[];
  errorMessage?: string;
}

/**
 * 根据JSON Schema验证数据
 * @param schema JSON Schema
 * @param data 待验证数据
 * @returns 验证结果
 */
export function validateWithSchema<T>(
  schema: JSONSchemaType<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (valid) {
      return {
        valid: true,
        data: data as T
      };
    } else {
      return {
        valid: false,
        errors: validate.errors || undefined,
        errorMessage: ajv.errorsText(validate.errors)
      };
    }
  } catch (error) {
    return {
      valid: false,
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 创建可重用的验证器
 * @param schema JSON Schema
 * @returns 验证函数
 */
export function createValidator<T>(
  schema: JSONSchemaType<T>
): (data: unknown) => ValidationResult<T> {
  const validate = ajv.compile(schema);

  return (data: unknown): ValidationResult<T> => {
    try {
      const valid = validate(data);

      if (valid) {
        return {
          valid: true,
          data: data as T
        };
      } else {
        return {
          valid: false,
          errors: validate.errors || undefined,
          errorMessage: ajv.errorsText(validate.errors)
        };
      }
    } catch (error) {
      return {
        valid: false,
        errorMessage: error instanceof Error ? error.message : String(error)
      };
    }
  };
}

/**
 * 验证JSON字符串是否合法
 * @param jsonString JSON字符串
 * @returns 验证结果
 */
export function isValidJson(jsonString: string): ValidationResult {
  if (typeof jsonString !== 'string') {
    return {
      valid: false,
      errorMessage: '输入必须是字符串'
    };
  }

  try {
    JSON.parse(jsonString);
    return {
      valid: true
    };
  } catch (error) {
    return {
      valid: false,
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 使用ajv自定义关键字和格式
 * @param keywordName 关键字名称
 * @param keywordDef 关键字定义
 */
export function addCustomKeyword(
  keywordName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keywordDef: any
): void {
  ajv.addKeyword(keywordName, keywordDef);
}

/**
 * 添加自定义格式
 * @param formatName 格式名称
 * @param formatValidator 格式验证函数
 */
export function addCustomFormat(
  formatName: string,
  formatValidator: (data: string) => boolean
): void {
  ajv.addFormat(formatName, formatValidator);
}

/**
 * 获取ajv实例
 * @returns Ajv实例
 */
export function getAjvInstance(): any {
  return ajv;
}
