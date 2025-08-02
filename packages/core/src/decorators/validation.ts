// 验证装饰器
// 提供参数验证和数据验证装饰器支持

import 'reflect-metadata';

/**
 * 验证元数据键
 */
export const VALIDATION_METADATA_KEY = Symbol('validation:metadata');
export const PARAM_VALIDATION_METADATA_KEY = Symbol(
  'param-validation:metadata'
);

/**
 * 验证规则类型
 */
export type ValidationType =
  | 'required'
  | 'string'
  | 'number'
  | 'boolean'
  | 'email'
  | 'url'
  | 'uuid'
  | 'date'
  | 'array'
  | 'object'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'custom';

/**
 * 验证规则接口
 */
export interface ValidationRule {
  type: ValidationType;
  value?: any;
  message?: string;
  validator?: (value: any) => boolean | Promise<boolean>;
}

/**
 * 参数验证元数据接口
 */
export interface ParamValidationMetadata {
  parameterIndex: number;
  propertyKey: string;
  rules: ValidationRule[];
}

/**
 * 属性验证元数据接口
 */
export interface PropertyValidationMetadata {
  propertyKey: string;
  rules: ValidationRule[];
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * 验证错误接口
 */
export interface ValidationError {
  property: string;
  value: any;
  message: string;
  rule: ValidationType;
}

/**
 * Required 装饰器
 * 标记参数或属性为必需的
 */
export function Required(message?: string) {
  return function (target: any, propertyKey: string, parameterIndex?: number) {
    const rule: ValidationRule = {
      type: 'required',
      message: message || `${propertyKey} is required`
    };

    addValidationRule(target, propertyKey, rule, parameterIndex);
  };
}

/**
 * IsString 装饰器
 * 验证值为字符串类型
 */
export function IsString(message?: string) {
  return function (target: any, propertyKey: string, parameterIndex?: number) {
    const rule: ValidationRule = {
      type: 'string',
      message: message || `${propertyKey} must be a string`
    };

    addValidationRule(target, propertyKey, rule, parameterIndex);
  };
}

/**
 * IsNumber 装饰器
 * 验证值为数字类型
 */
export function IsNumber(message?: string) {
  return function (target: any, propertyKey: string, parameterIndex?: number) {
    const rule: ValidationRule = {
      type: 'number',
      message: message || `${propertyKey} must be a number`
    };

    addValidationRule(target, propertyKey, rule, parameterIndex);
  };
}

/**
 * IsBoolean 装饰器
 * 验证值为布尔类型
 */
export function IsBoolean(message?: string) {
  return function (target: any, propertyKey: string, parameterIndex?: number) {
    const rule: ValidationRule = {
      type: 'boolean',
      message: message || `${propertyKey} must be a boolean`
    };

    addValidationRule(target, propertyKey, rule, parameterIndex);
  };
}

/**
 * IsEmail 装饰器
 * 验证值为有效的邮箱格式
 */
export function IsEmail(message?: string) {
  return function (target: any, propertyKey: string, parameterIndex?: number) {
    const rule: ValidationRule = {
      type: 'email',
      message: message || `${propertyKey} must be a valid email`
    };

    addValidationRule(target, propertyKey, rule, parameterIndex);
  };
}

/**
 * MinLength 装饰器
 * 验证字符串或数组的最小长度
 */
export function MinLength(length: number, message?: string) {
  return function (target: any, propertyKey: string, parameterIndex?: number) {
    const rule: ValidationRule = {
      type: 'minLength',
      value: length,
      message:
        message || `${propertyKey} must be at least ${length} characters long`
    };

    addValidationRule(target, propertyKey, rule, parameterIndex);
  };
}

/**
 * MaxLength 装饰器
 * 验证字符串或数组的最大长度
 */
export function MaxLength(length: number, message?: string) {
  return function (target: any, propertyKey: string, parameterIndex?: number) {
    const rule: ValidationRule = {
      type: 'maxLength',
      value: length,
      message:
        message ||
        `${propertyKey} must be no more than ${length} characters long`
    };

    addValidationRule(target, propertyKey, rule, parameterIndex);
  };
}

/**
 * Min 装饰器
 * 验证数字的最小值
 */
export function Min(value: number, message?: string) {
  return function (target: any, propertyKey: string, parameterIndex?: number) {
    const rule: ValidationRule = {
      type: 'min',
      value,
      message: message || `${propertyKey} must be at least ${value}`
    };

    addValidationRule(target, propertyKey, rule, parameterIndex);
  };
}

/**
 * Max 装饰器
 * 验证数字的最大值
 */
export function Max(value: number, message?: string) {
  return function (target: any, propertyKey: string, parameterIndex?: number) {
    const rule: ValidationRule = {
      type: 'max',
      value,
      message: message || `${propertyKey} must be no more than ${value}`
    };

    addValidationRule(target, propertyKey, rule, parameterIndex);
  };
}

/**
 * Pattern 装饰器
 * 验证值匹配正则表达式
 */
export function Pattern(pattern: RegExp, message?: string) {
  return function (target: any, propertyKey: string, parameterIndex?: number) {
    const rule: ValidationRule = {
      type: 'pattern',
      value: pattern,
      message: message || `${propertyKey} does not match the required pattern`
    };

    addValidationRule(target, propertyKey, rule, parameterIndex);
  };
}

/**
 * Custom 装饰器
 * 自定义验证函数
 */
export function Custom(
  validator: (value: any) => boolean | Promise<boolean>,
  message?: string
) {
  return function (target: any, propertyKey: string, parameterIndex?: number) {
    const rule: ValidationRule = {
      type: 'custom',
      validator,
      message: message || `${propertyKey} failed custom validation`
    };

    addValidationRule(target, propertyKey, rule, parameterIndex);
  };
}

/**
 * 添加验证规则到元数据
 */
function addValidationRule(
  target: any,
  propertyKey: string,
  rule: ValidationRule,
  parameterIndex?: number
): void {
  if (typeof parameterIndex === 'number') {
    // 参数验证
    const existingRules: ParamValidationMetadata[] =
      Reflect.getMetadata(PARAM_VALIDATION_METADATA_KEY, target) || [];

    let paramMetadata = existingRules.find(
      (r) =>
        r.parameterIndex === parameterIndex && r.propertyKey === propertyKey
    );

    if (!paramMetadata) {
      paramMetadata = {
        parameterIndex,
        propertyKey,
        rules: []
      };
      existingRules.push(paramMetadata);
    }

    paramMetadata.rules.push(rule);
    Reflect.defineMetadata(
      PARAM_VALIDATION_METADATA_KEY,
      existingRules,
      target
    );
  } else {
    // 属性验证
    const existingRules: PropertyValidationMetadata[] =
      Reflect.getMetadata(VALIDATION_METADATA_KEY, target.constructor) || [];

    let propertyMetadata = existingRules.find(
      (r) => r.propertyKey === propertyKey
    );

    if (!propertyMetadata) {
      propertyMetadata = {
        propertyKey,
        rules: []
      };
      existingRules.push(propertyMetadata);
    }

    propertyMetadata.rules.push(rule);
    Reflect.defineMetadata(
      VALIDATION_METADATA_KEY,
      existingRules,
      target.constructor
    );
  }
}

/**
 * 获取参数验证元数据
 */
export function getParamValidationMetadata(
  target: any
): ParamValidationMetadata[] {
  return Reflect.getMetadata(PARAM_VALIDATION_METADATA_KEY, target) || [];
}

/**
 * 获取属性验证元数据
 */
export function getPropertyValidationMetadata(
  target: any
): PropertyValidationMetadata[] {
  return Reflect.getMetadata(VALIDATION_METADATA_KEY, target) || [];
}

/**
 * 验证值
 */
export async function validateValue(
  value: any,
  rules: ValidationRule[]
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const isValid = await validateSingleRule(value, rule);
    if (!isValid) {
      errors.push({
        property: '',
        value,
        message: rule.message || `Validation failed for rule ${rule.type}`,
        rule: rule.type
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证单个规则
 */
async function validateSingleRule(
  value: any,
  rule: ValidationRule
): Promise<boolean> {
  switch (rule.type) {
    case 'required':
      return value !== null && value !== undefined && value !== '';

    case 'string':
      return typeof value === 'string';

    case 'number':
      return typeof value === 'number' && !isNaN(value);

    case 'boolean':
      return typeof value === 'boolean';

    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return typeof value === 'string' && emailRegex.test(value);

    case 'minLength':
      return value && value.length >= rule.value;

    case 'maxLength':
      return !value || value.length <= rule.value;

    case 'min':
      return typeof value === 'number' && value >= rule.value;

    case 'max':
      return typeof value === 'number' && value <= rule.value;

    case 'pattern':
      return typeof value === 'string' && rule.value.test(value);

    case 'custom':
      return rule.validator ? await rule.validator(value) : true;

    default:
      return true;
  }
}

/**
 * 验证工具函数
 */
export const ValidationUtils = {
  getParamValidationMetadata,
  getPropertyValidationMetadata,
  validateValue,
  validateSingleRule
};
