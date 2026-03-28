# Context 与 Data API（v1.1.0）

版本切换：[函数 API 版本索引](../index.md) | [v1.1.0 概览](./index.md)  
主题切换：[Core 总览](./core.md) | [Service API](./service.md) | [Functional 总览](./functional.md)

这一页覆盖：

- `@stratix/core/context`
- `@stratix/core/data`

<a id="page-summary"></a>
## 页面摘要

- 这一页解决两类问题：运行期共享上下文怎么组织，普通对象/数组数据怎么安全读写与变换。
- `context` 更偏状态与作用域，`data` 更偏纯数据处理；不要把两者混成一套状态模型。
- 如果你只是查对象取值、深层设置、合并或比较，直接跳到下方 `data` 章节即可。

<a id="page-nav"></a>
## 页内导航

- [@stratix/core/context](#context-api)
- [@stratix/core/data](#data-api)
- [对象访问与变换](#data-object)
- [选择工具](#data-select)
- [合并与克隆](#data-merge)
- [数组工具](#data-array)
- [比较工具](#data-compare)
- [使用建议](#usage-notes)

<a id="context-api"></a>
## `@stratix/core/context`

### `createContext(defaultValues?)`

| 项 | 说明 |
|---|---|
| 作用 | 创建共享上下文对象 |
| 参数 | `defaultValues?: Partial<T>` |
| 返回值 | `IContext<T>` |
| 适合 | 请求上下文、局部共享状态、插件内部上下文 |

### `createNamespace(name, defaultValues?)`

| 项 | 说明 |
|---|---|
| 作用 | 创建带命名空间名称的上下文 |
| 参数 | `name: string`，`defaultValues?: Partial<T>` |
| 返回值 | `INamespaceContext<T>` |
| 适合 | 多套上下文并存，需要区分来源时使用 |

### `IContext<T>` 方法说明

| 方法 | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `get(key)` | 键名 | 对应值 | 读取字段 |
| `set(key, value)` | 键名、值 | `IContext<T>` | 写入字段，支持链式调用 |
| `has(key)` | 键名 | `boolean` | 检查字段是否存在 |
| `remove(key)` | 键名 | `IContext<T>` | 删除字段；如该键存在默认值则回退 |
| `getAll()` | 无 | `T` | 获取当前快照 |
| `onChange(handler)` | 变更回调 | 取消订阅函数 | 监听整体变更 |
| `getName()` | 无 | `string` | 返回上下文名称摘要 |
| `setDefaults(defaultValues)` | 默认值对象 | `IContext<T>` | 更新默认值 |
| `withHandler(handler)` | 处理函数 | `R` | 把内部状态对象交给回调 |
| `clear()` | 无 | `IContext<T>` | 清空并恢复默认值 |
| `subscribe(key, handler)` | 键名、字段回调 | 取消订阅函数 | 监听某个字段变更 |

<a id="data-api"></a>
## `@stratix/core/data`

<a id="data-object"></a>
## 对象访问与变换

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `get(object, path, defaultValue?)` | 对象、点路径/路径数组、默认值 | `T` | 安全读取嵌套字段 |
| `has(object, path)` | 对象、点路径/路径数组 | `boolean` | 判断路径是否存在 |
| `set(object, path, value)` | 对象、点路径/路径数组、值 | 原对象 | 写入嵌套字段，不存在的中间层会自动创建 |
| `keys(object)` | 对象 | `Array<keyof T>` | 取键数组 |
| `values(object)` | 对象 | 值数组 | 取值数组 |
| `entries(object)` | 对象 | 键值对数组 | 取 entries |
| `fromEntries(entries)` | 键值对数组 | 对象 | 把 entries 还原成对象 |
| `mapKeys(object, mapper)` | 对象、键映射函数 | 新对象 | 变换对象键名 |
| `mapValues(object, mapper)` | 对象、值映射函数 | 新对象 | 变换对象值 |
| `transform(object, transformer, initialValue)` | 对象、转换函数、初始值 | 累积结果 | 自定义对象变换 |
| `isObject(value)` | 任意值 | `boolean` | 判断是否为对象且不是数组 |

### 使用示例

```ts
import { get, pick, set } from '@stratix/core/data';

const payload = {};
set(payload, 'user.profile.email', 'alice@example.com');

const email = get(payload, 'user.profile.email', '');
```

<a id="data-select"></a>
## 选择工具

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `pick(object, paths)` | 源对象、字段数组 | 新对象 | 只保留指定字段 |
| `omit(object, paths)` | 源对象、字段数组 | 新对象 | 排除指定字段 |

适合：

- 输出 DTO 裁剪
- 隐藏敏感字段
- 组合响应对象

<a id="data-merge"></a>
## 合并与克隆

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `assign(target, ...sources)` | 目标对象、源对象列表 | 合并后的目标对象 | 浅合并，后面的覆盖前面的 |
| `defaults(target, ...sources)` | 目标对象、源对象列表 | 合并结果 | 只补缺失字段，不覆盖已存在字段 |
| `deepClone(value)` | 任意值 | 克隆结果 | 深拷贝对象、数组、日期等 |
| `deepMerge(target, source)` | 两个对象 | 合并后的新结构 | 深度合并嵌套对象和数组 |
| `immutableDeepMerge(target, source)` | 两个对象 | 全新对象 | 返回新的深度合并结果，不修改原对象 |

适合：

- 配置合并
- 默认参数叠加
- 需要保留原对象的不可变数据处理

<a id="data-array"></a>
## 数组工具

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `chunk(array, size?)` | 数组、分块大小 | `T[][]` | 把数组拆成小数组 |
| `compact(array)` | 数组 | 新数组 | 去掉 `false/null/0/''/undefined/NaN` 等假值 |
| `difference(array, ...values)` | 原数组、排除数组们 | 新数组 | 求差集 |
| `flatten(array, depth?)` | 嵌套数组、深度 | 新数组 | 扁平化 |
| `groupBy(array, iteratee)` | 数组、字段名或函数 | 分组对象 | 按字段或规则分组 |
| `keyBy(array, iteratee)` | 数组、字段名或函数 | 键值对象 | 以字段或规则生成映射对象 |
| `intersection(...arrays)` | 多个数组 | 新数组 | 求交集 |
| `partition(array, predicate)` | 数组、判断函数 | `[匹配, 不匹配]` | 按条件拆成两组 |
| `reduce(array, iteratee, initialValue)` | 数组、归并函数、初始值 | 累积值 | 函数式 reduce |
| `shuffle(array)` | 数组 | 新数组 | 随机打乱 |
| `sortBy(array, iteratee)` | 数组、字段名或函数 | 新数组 | 按字段或规则排序 |
| `take(array, count)` | 数组、数量 | 新数组 | 取前 N 个元素 |
| `union(...arrays)` | 多个数组 | 新数组 | 求并集 |
| `unique(array)` | 数组 | 新数组 | 去重 |

<a id="data-compare"></a>
## 比较工具

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `isEmpty(value)` | 任意值 | `boolean` | 判断空值、空字符串、空数组、空对象 |
| `isNotEmpty(value)` | 任意值 | `boolean` | `isEmpty` 的反向结果 |
| `isEqual(value, other)` | 任意两个值 | `boolean` | 深度比较 |

<a id="usage-notes"></a>
## 使用建议

- 要读深层字段，优先 `get()`，不要手写多层可选链之后又塞默认值。
- 要做配置合并，优先 `deepMerge()`，不要混用 `Object.assign()` 和手工递归。
- 要输出“去掉敏感字段”的响应对象，优先 `omit()`。
- 数组分组、建索引场景下，`groupBy()` 和 `keyBy()` 比手写循环更稳定、更清楚。
