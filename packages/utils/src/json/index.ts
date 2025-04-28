/**
 * JSON处理模块
 * 提供多种级别的JSON序列化和解析功能
 *
 * @module json
 */

/**
 * JSON模块使用指南:
 *
 * 1. 基础API：适用于简单JSON对象
 *    - serialize/parse: 基础序列化和解析
 *    - serializeCompact: 生成紧凑JSON
 *    - serializePretty: 格式化输出
 *    - serializeSafe: 处理简单循环引用
 *    - parseSafe: 安全解析（失败返回默认值）
 *    - tryParse: 返回元组 [data, error]
 *    - isValidJSON: 检查字符串是否为有效JSON
 *
 * 2. 增强API：适用于复杂对象和特殊类型
 *    - enhancedSerialize: 支持循环引用、函数、Map、Set、Buffer等复杂类型
 *    - enhancedDeserialize: 支持还原所有特殊类型
 *    - safeMerge: 安全地合并复杂对象
 *
 * 3. 选择指南:
 *    - 对于简单数据结构，优先使用基础API (serialize/parse)
 *    - 对于包含特殊类型的复杂对象，使用增强API (enhancedSerialize)
 */

// 导出基础序列化功能
export {
  // 序列化功能
  serialize,
  serializeCompact,
  serializePretty,
  serializeSafe,

  // 序列化相关类型
  type SerializeOptions,
  type SerializeResult
} from './serialize.js';

// 导出基础解析功能
export {
  isValidJSON,
  // 解析功能
  parse,
  parseSafe,
  tryParse,
  // 解析相关类型
  type ParseOptions,
  type ParseResult
} from './parse.js';

// 创建类型别名，使API更直观
export type {
  SerializeOptions as BasicSerializeOptions,
  SerializeResult as BasicSerializeResult
} from './serialize.js';

export type {
  ParseOptions as BasicParseOptions,
  ParseResult as BasicParseResult
} from './parse.js';

// 导出增强版序列化/解析功能和相关类型
export {
  enhancedDeserialize,
  // 增强版序列化功能
  enhancedSerialize,
  safeMerge,
  type EnhancedDeserializeOptions,
  // 类型定义
  type EnhancedSerializeOptions,
  type EnhancedSerializeResult
} from './serializer.js';
