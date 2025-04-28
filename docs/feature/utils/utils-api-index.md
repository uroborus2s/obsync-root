# Stratix 通用工具模块API索引

本文档为`@stratix/utils`模块的API接口索引，提供所有可用工具函数的快速参考。

## 模块划分

`@stratix/utils`模块按照功能领域划分为以下子模块：

1. [通用工具函数 (common)](./utils-api-common.md)
2. [异步工具函数 (async)](./utils-api-async.md)
3. [字符串工具函数 (string)](./utils-api-string.md)
4. [对象工具函数 (object)](./utils-api-object.md)
5. [函数工具函数 (function)](./utils-api-function.md)
6. [数字工具函数 (number)](./utils-api-number.md)
7. [文件工具函数 (file)](./utils-api-file.md)
8. [时间工具函数 (time)](./utils-api-time.md)
9. [类型工具函数 (type)](./utils-api-type.md)
10. [环境变量工具函数 (environment)](./utils-api-environment.md)
11. [加密工具函数 (crypto)](./utils-api-crypto.md)
12. [数据验证工具函数 (validator)](./utils-api-validator.md)
13. [数据集合工具函数 (collection)](./utils-api-collection.md)
14. [性能工具函数 (performance)](./utils-api-performance.md)
15. [国际化工具函数 (i18n)](./utils-api-i18n.md)
16. [不可变数据工具函数 (immutable)](./utils-api-immutable.md)
17. [上下文工具函数 (context)](./utils-api-context.md)

## 函数总览

以下是按模块分类的所有工具函数列表：

### 通用工具函数 (common)

- `isNil(value)` - 检查值是否为null或undefined
- `generateNumberId(min?, max?)` - 生成数字格式的唯一ID
- `generateUUId()` - 通过UUID生成唯一ID
- `generateId()` - 生成唯一ID

### 异步工具函数 (async)

- `delay(ms)` - 延迟指定时间后解析Promise
- `retry(fn, options?)` - 重试执行异步函数
- `withTimeout(promise, ms, message?)` - 为Promise添加超时控制
- `safeExecuteAsync(fn, defaultValue?)` - 安全执行异步函数，出错时返回默认值

### 字符串工具函数 (string)

- `toCamelCase(str)` - 转换为驼峰命名
- `toPascalCase(str)` - 转换为帕斯卡命名
- `toSnakeCase(str)` - 转换为蛇形命名
- `toKebabCase(str)` - 转换为短横线命名
- `pluralize(str)` - 转换为复数形式
- `singularize(str)` - 转换为单数形式

### 对象工具函数 (object)

- `isEmpty(value)` - 检查值是否为空
- `isNotEmpty(value)` - 检查值是否为非空
- `deepMerge(target, ...sources)` - 深度合并对象
- `isObject(item)` - 检查值是否为对象
- `deepClone(obj)` - 深度克隆对象
- `pick(obj, keys)` - 选择对象的部分属性
- `omit(obj, keys)` - 排除对象的部分属性

### 函数工具函数 (function)

- `debounce(func, wait, options?)` - 创建防抖函数
- `throttle(func, wait, options?)` - 创建节流函数
- `memoize(func, resolver?)` - 创建带缓存的函数
- `once(func)` - 创建只执行一次的函数
- `compose(...fns)` - 从右到左组合函数
- `pipe(...fns)` - 从左到右组合函数

### 数据集合工具函数 (collection)

- `chunk(array, size)` - 将数组拆分为指定大小的块
- `unique(array, iteratee?)` - 数组去重
- `groupBy(array, iteratee)` - 数组分组
- `flatten(array, depth?)` - 数组扁平化
- `sortBy(array, iteratees)` - 数组排序
- `pick(object, paths)` - 对象属性选择
- `omit(object, paths)` - 对象属性排除
- `partition(array, predicate)` - 数组分割
- `difference(array, ...values)` - 数组差集
- `intersection(...arrays)` - 数组交集
- `keyBy(array, iteratee)` - 数组转对象
- `union(...arrays)` - 数组并集
- `compact(array)` - 去除假值
- `map(array, iteratee)` - 数组映射
- `filter(array, predicate)` - 数组过滤
- `reduce(array, iteratee, initialValue)` - 数组归约
- `find(array, predicate)` - 查找元素
- `findIndex(array, predicate)` - 查找索引
- `take(array, n)` - 获取子数组
- `shuffle(array)` - 数组随机排序

### 其他模块

其他模块的函数列表请查看各自的API文档页面。

## 使用说明

### 引入方式

```typescript
// 引入整个模块
import * as utils from '@stratix/utils';

// 按需引入特定子模块
import { deepMerge, pick } from '@stratix/utils/object';
import { toCamelCase } from '@stratix/utils/string';
import { retry, withTimeout } from '@stratix/utils/async';

// 直接引入特定函数
import { generateId } from '@stratix/utils/common/id';
import { isEmail } from '@stratix/utils/validator';
```

### 浏览器与Node.js兼容性

大部分工具函数同时支持浏览器和Node.js环境，少数函数（如文件系统相关）仅在Node.js环境中可用。每个函数的文档中都会注明其兼容性。 