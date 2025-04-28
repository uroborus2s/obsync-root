/**
 * 配置验证器实现
 */
import { JSONSchema } from '../types/common.js';
import { ConfigValidationError } from '../types/errors.js';

/**
 * 验证配置是否符合Schema
 * @param config 要验证的配置对象
 * @param schema JSON Schema
 * @returns 是否有效
 * @throws ConfigValidationError 验证失败时抛出
 */
export function validateSchema(config: any, schema: JSONSchema): boolean {
  try {
    // 使用动态导入避免TypeScript错误
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Ajv = require('ajv');
    const ajv = new Ajv({
      allErrors: true,
      useDefaults: true,
      removeAdditional: false,
      coerceTypes: true
    });

    const validate = ajv.compile(schema);
    const isValid = validate(config);

    if (!isValid && validate.errors) {
      const errorMessages = validate.errors
        .map((error: any) => {
          return `${error.instancePath || '根对象'} ${error.message}`;
        })
        .join('; ');

      throw new ConfigValidationError(`配置验证失败: ${errorMessages}`);
    }

    return true;
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      throw err;
    }

    throw new ConfigValidationError(`配置验证出错: ${(err as Error).message}`);
  }
}
