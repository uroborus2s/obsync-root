# @stratix/utils

Stratix框架通用工具函数库，提供纯函数式、无副作用的工具方法集。

## 功能特点

- **纯函数**：所有工具函数都是纯函数，相同输入保证相同输出，无副作用
- **类型安全**：完全支持TypeScript类型定义，提供良好的类型推断
- **模块化**：按功能领域组织代码，便于使用和维护
- **可组合性**：函数设计便于组合使用
- **简洁性**：API设计简洁明了，易于理解和使用
- **最小依赖**：尽量减少外部依赖

## 安装

```bash
npm install @stratix/utils
# 或
pnpm add @stratix/utils
# 或
yarn add @stratix/utils
```

## 使用方式

你可以按需导入特定模块或函数：

```typescript
// 导入整个模块
import * as utils from '@stratix/utils';

// 按需导入特定子模块
import { deepMerge, pick } from '@stratix/utils/object';
import { toCamelCase } from '@stratix/utils/string';
import { retry, withTimeout } from '@stratix/utils/async';

// 直接导入特定函数
import { generateId } from '@stratix/utils/common/id.js';
import { isEmail } from '@stratix/utils/validator';
```

## 模块列表

@stratix/utils包含以下功能模块：

- **通用工具函数 (common)** - 基础通用工具
- **异步工具函数 (async)** - 异步处理相关工具
- **字符串工具函数 (string)** - 字符串处理相关工具
- **对象工具函数 (object)** - 对象操作相关工具
- **函数工具函数 (function)** - 函数操作相关工具
- **数字工具函数 (number)** - 数字处理相关工具
- **文件工具函数 (file)** - 文件操作相关工具
- **时间工具函数 (time)** - 时间和日期处理工具
- **类型工具函数 (type)** - 类型检查和转换工具
- **环境变量工具函数 (environment)** - 环境变量处理工具
- **加密工具函数 (crypto)** - 加密和哈希相关工具
- **数据验证工具函数 (validator)** - 数据验证工具
- **数据集合工具函数 (collection)** - 数据集合操作工具
- **性能工具函数 (performance)** - 性能相关工具
- **国际化工具函数 (i18n)** - 国际化工具
- **不可变数据工具函数 (immutable)** - 不可变数据操作工具
- **上下文工具函数 (context)** - 上下文管理工具

## 基础使用示例

```typescript
import { generateId } from '@stratix/utils/common';
import { toCamelCase } from '@stratix/utils/string';
import { deepMerge } from '@stratix/utils/object';

// 生成唯一ID
const id = generateId();

// 转换命名风格
const camelCased = toCamelCase('api_response'); // 'apiResponse'

// 深度合并对象
const config = deepMerge(
  { base: true, settings: { debug: true } },
  { settings: { timeout: 5000 } }
);
// 结果: { base: true, settings: { debug: true, timeout: 5000 } }
```

## 异步处理示例

```typescript
import { retry, withTimeout } from '@stratix/utils/async';

// 重试机制
const fetchWithRetry = async (url) => {
  return await retry(
    async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    },
    {
      retries: 3,
      delay: 1000,
      onRetry: (err, attempt) => console.log(`Retry #${attempt}: ${err.message}`)
    }
  );
};

// 超时控制
const fetchWithTimeout = async (url) => {
  return await withTimeout(
    fetch(url).then(r => r.json()),
    5000,
    '请求超时'
  );
};
```

## 对象操作示例

```typescript
import { pick, omit, camelizeKeys } from '@stratix/utils/object';

// 选择对象属性
const user = { id: 1, name: 'John', password: 'secret', role: 'admin' };
const safeUser = pick(user, ['id', 'name', 'role']); 
// { id: 1, name: 'John', role: 'admin' }

// 排除对象属性
const publicUser = omit(user, ['password']);
// { id: 1, name: 'John', role: 'admin' }

// 转换对象键为驼峰命名
const data = { user_id: 1, first_name: 'John', last_name: 'Doe' };
const camelized = camelizeKeys(data); 
// { userId: 1, firstName: 'John', lastName: 'Doe' }
```

## 集合操作示例

```typescript
import { 
  chunk, unique, groupBy, sortBy, 
  map, filter, partition, difference 
} from '@stratix/utils/collection';

// 分组数据
const users = [
  { id: 1, role: 'admin', name: '张三' },
  { id: 2, role: 'user', name: '李四' },
  { id: 3, role: 'user', name: '王五' },
  { id: 4, role: 'admin', name: '赵六' }
];

// 按角色分组
const usersByRole = groupBy(users, 'role');
// { admin: [{id:1,...}, {id:4,...}], user: [{id:2,...}, {id:3,...}] }

// 数组分块
const chunks = chunk([1, 2, 3, 4, 5, 6], 2);
// [[1, 2], [3, 4], [5, 6]]

// 数组去重
const uniqueValues = unique([1, 2, 2, 3, 1, 4]);
// [1, 2, 3, 4]

// 按属性去重
const uniqueUsers = unique(users, 'role');
// 只保留各角色的第一个用户

// 数据分区
const [admins, nonAdmins] = partition(users, user => user.role === 'admin');
// admins: [{id:1,...}, {id:4,...}]
// nonAdmins: [{id:2,...}, {id:3,...}]

// 类型安全的映射和筛选
const adminNames = map(
  filter(users, user => user.role === 'admin'),
  user => user.name
);
// ['张三', '赵六']

// 排序
const sortedUsers = sortBy(users, ['role', 'name']);
// 先按角色排序，再按名称排序
```

## JSON增强处理示例

```typescript
import { 
  enhancedSerialize, 
  enhancedDeserialize, 
  deepClone, 
  safeMerge 
} from '@stratix/utils/json';

// 复杂对象（包含特殊类型）
const complexData = {
  id: 1,
  name: '测试数据',
  createdAt: new Date(),
  pattern: /test-\d+/i,
  items: new Set([1, 2, 3]),
  meta: new Map([
    ['version', '1.0.0'],
    ['type', 'test']
  ]),
  handler: function(data: any) { 
    console.log('处理数据:', data);
  },
  buffer: Buffer.from('测试文本', 'utf8'),
  // 循环引用
  parent: null
};
// 创建循环引用
complexData.parent = complexData;

// 序列化复杂对象（处理特殊类型和循环引用）
const result = enhancedSerialize(complexData);
// 返回: { success: true, data: "..." }

// 反序列化
const deserializedData = enhancedDeserialize(result.data);
// 数据保留了原始结构，包括Date、RegExp、Set、Map等

// 深度克隆对象
const cloned = deepClone(complexData);
// 深拷贝的对象，保留所有特殊类型

// 安全合并对象
const config1 = { 
  server: { port: 3000, host: 'localhost' },
  timeout: 5000
};
const config2 = { 
  server: { ssl: true }, 
  debug: true 
};
const mergedConfig = safeMerge(config1, config2);
// 结果: {
//   server: { port: 3000, host: 'localhost', ssl: true },
//   timeout: 5000,
//   debug: true
// }
```

## 许可证

MIT 