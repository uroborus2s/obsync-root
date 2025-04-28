# JSON 模块使用指南

@stratix/utils 提供了全面的 JSON 处理功能，适用于各种复杂度的数据序列化和反序列化场景。

## 模块概述

JSON 模块提供两套主要 API：

1. **基础 API**：针对普通 JSON 数据的高效处理
2. **增强 API**：支持复杂数据类型和特殊场景

## 基础 API（简单高效）

### 序列化功能

```typescript
import { 
  serialize, 
  serializeCompact, 
  serializePretty, 
  serializeSafe 
} from '@stratix/utils/json';

// 基本序列化
const result = serialize({ name: '张三', age: 30 });
// { success: true, data: '{"name":"张三","age":30}' }

// 格式化序列化（带缩进）
const prettyResult = serializePretty({ name: '张三', age: 30 });
// { success: true, data: '{\n  "name": "张三",\n  "age": 30\n}' }

// 紧凑序列化（无空格）
const compactResult = serializeCompact({ name: '张三', age: 30 });
// { success: true, data: '{"name":"张三","age":30}' }

// 安全序列化（处理简单循环引用）
const obj = { name: '张三' };
obj.self = obj; // 循环引用
const safeResult = serializeSafe(obj);
// { success: true, data: '{"name":"张三","self":"[Circular]"}' }

// 使用选项
const customResult = serialize(
  { name: '张三', birthDate: new Date(), pattern: /test/ },
  {
    indent: 2,                // 缩进2个空格
    includeUndefined: false,  // 忽略undefined值
    removeNull: true,         // 移除null值
    convertDates: true,       // 转换日期为ISO字符串
    convertRegExp: true       // 转换正则表达式为字符串
  }
);
```

### 解析功能

```typescript
import { 
  parse, 
  parseSafe, 
  tryParse, 
  isValidJSON 
} from '@stratix/utils/json';

// 基本解析
const parseResult = parse('{"name":"张三","age":30}');
// { success: true, data: { name: '张三', age: 30 } }

// 安全解析（失败返回默认值）
const data = parseSafe('{"name":"张三",invalidJson', { name: '默认值' });
// { name: '默认值' }

// 尝试解析（返回元组）
const [result, error] = tryParse('{"name":"张三","age":30}');
// [{ name: '张三', age: 30 }, undefined]
// 如果失败: [undefined, Error]

// 验证JSON有效性
const isValid = isValidJSON('{"name":"张三"}');
// true

// 使用选项恢复特殊对象
const dateResult = parse(
  '{"name":"张三","birthDate":"2023-01-01T00:00:00.000Z","pattern":"/test/i"}',
  {
    reviveDates: true,    // 恢复日期对象
    reviveRegExp: true,   // 恢复正则表达式对象
    reviver: (key, value) => {
      // 自定义转换逻辑
      if (key === 'age' && typeof value === 'string') {
        return parseInt(value, 10);
      }
      return value;
    }
  }
);
// 结果中 birthDate 是 Date 对象，pattern 是 RegExp 对象
```

## 增强 API（复杂类型支持）

### 处理复杂对象

```typescript
import { 
  enhancedSerialize, 
  enhancedDeserialize, 
  safeMerge 
} from '@stratix/utils/json';

// 创建包含复杂类型的对象
const complexObject = {
  id: 1,
  name: '测试对象',
  createdAt: new Date(),
  items: new Set([1, 2, 3]),
  metadata: new Map([
    ['version', '1.0'],
    ['type', 'test']
  ]),
  buffer: Buffer.from('测试数据'),
  processData: function(data) {
    console.log('处理数据:', data);
  },
  error: new Error('测试错误'),
  pattern: /test-\d+/i,
  // 循环引用
  parent: null
};
complexObject.parent = complexObject;

// 增强序列化
const serialized = enhancedSerialize(complexObject);
// { success: true, data: '...' }

// 反序列化恢复所有特殊类型
const deserialized = enhancedDeserialize(serialized.data);
// { success: true, data: {...} }
// 还原了 Date, Set, Map, Buffer, 函数, Error, RegExp 和循环引用

// 安全合并对象（包括复杂类型）
const config1 = { 
  server: { port: 3000, host: 'localhost' },
  options: new Map([['timeout', 5000]])
};
const config2 = { 
  server: { ssl: true },
  options: new Map([['debug', true]])
};
const mergedConfig = safeMerge(config1, config2);
// 递归合并，保留特殊类型
```

### 序列化选项

```typescript
const result = enhancedSerialize(complexObject, {
  handleFunctions: true,         // 处理函数
  handleCircular: true,          // 处理循环引用
  handleErrors: true,            // 处理Error对象
  handleSpecialObjects: true,    // 处理特殊对象(Date,RegExp等)
  indent: 2,                     // 缩进空格数
  replacer: (key, value) => {
    // 自定义替换逻辑
    if (key === 'secretField') return undefined;
    return value;
  }
});
```

### 反序列化选项

```typescript
const result = enhancedDeserialize(jsonString, {
  reviveFunctions: true,         // 还原函数
  reviveSpecialObjects: true,    // 还原特殊对象
  safeMode: true,                // 安全模式(不执行函数构造)
  reviver: (key, value) => {
    // 自定义转换逻辑
    return value;
  }
});
```

## 选择指南

1. **何时使用基础 API**：
   - 处理常规的JSON数据（字符串、数字、布尔值、普通对象和数组）
   - 需要最佳性能
   - 只需要基本的Date/RegExp支持

2. **何时使用增强 API**：
   - 处理包含特殊类型的复杂对象
   - 需要处理循环引用
   - 需要序列化函数、Error、Map、Set、Buffer等
   - 需要精确还原JavaScript对象结构

## 性能考虑

基础 API 通常比增强 API 性能更好，因为它不需要进行复杂类型的检测和处理。对于简单数据，建议使用基础 API。增强 API 提供更强大的功能，但会有一些性能开销。 