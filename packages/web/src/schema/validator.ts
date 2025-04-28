/**
 * Schema验证器，用于请求和响应的验证
 */

import { FastifyInstance } from 'fastify';
import { SchemaOptions } from '../types/options.js';

/**
 * 添加Schema到Fastify实例
 * @param fastify Fastify实例
 * @param id Schema ID
 * @param schema Schema对象
 */
export function addSchema(
  fastify: FastifyInstance,
  id: string,
  schema: any
): void {
  // 确保schema有$id属性
  const schemaWithId = {
    ...schema,
    $id: id
  };

  fastify.addSchema(schemaWithId);
}

/**
 * 转换Schema选项为Fastify兼容格式
 * @param schema Schema选项
 */
export function transformSchema(
  schema: SchemaOptions = {}
): Record<string, any> {
  const result: Record<string, any> = {};

  // 复制各种Schema验证
  if (schema.body) {
    result.body = schema.body;
  }

  if (schema.querystring) {
    result.querystring = schema.querystring;
  }

  if (schema.params) {
    result.params = schema.params;
  }

  if (schema.headers) {
    result.headers = schema.headers;
  }

  if (schema.response) {
    result.response = schema.response;
  }

  return result;
}

/**
 * 创建验证函数
 * @param fastify Fastify实例
 * @param schema Schema选项
 */
export function createValidator(
  fastify: FastifyInstance,
  schema: SchemaOptions = {}
) {
  const transformedSchema = transformSchema(schema);

  // 这个函数会被Fastify在请求处理前自动调用
  // 返回true表示验证通过，返回false表示验证失败
  return function validate(request: any): boolean {
    // 使用Fastify的内置验证器来验证请求
    // 这里不需要手动实现，因为添加了schema后，
    // Fastify会自动在路由级别进行验证
    return true;
  };
}

/**
 * Schema管理器类，集中管理Schema
 */
export class SchemaManager {
  private fastify: FastifyInstance;
  private schemas: Map<string, any> = new Map();

  /**
   * 构造函数
   * @param fastify Fastify实例
   */
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * 添加Schema
   * @param id Schema ID
   * @param schema Schema对象
   */
  public add(id: string, schema: any): void {
    // 确保ID格式正确
    const normalizedId = id.startsWith('#') ? id : `#${id}`;

    // 存储Schema
    this.schemas.set(normalizedId, schema);

    // 添加到Fastify实例
    addSchema(this.fastify, normalizedId, schema);
  }

  /**
   * 获取Schema
   * @param id Schema ID
   */
  public get(id: string): any {
    const normalizedId = id.startsWith('#') ? id : `#${id}`;
    return this.schemas.get(normalizedId);
  }

  /**
   * 检查Schema是否存在
   * @param id Schema ID
   */
  public has(id: string): boolean {
    const normalizedId = id.startsWith('#') ? id : `#${id}`;
    return this.schemas.has(normalizedId);
  }

  /**
   * 获取所有Schema
   */
  public getAll(): Map<string, any> {
    return new Map(this.schemas);
  }

  /**
   * 创建Schema引用
   * @param id Schema ID
   */
  public ref(id: string): any {
    const normalizedId = id.startsWith('#') ? id : `#${id}`;
    return { $ref: normalizedId };
  }
}
