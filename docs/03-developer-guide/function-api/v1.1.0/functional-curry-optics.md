# Curry 与 Optics API（v1.1.0）

版本切换：[函数 API 版本索引](../index.md) | [v1.1.0 概览](./index.md)  
主题切换：[Core 总览](./core.md) | [Service API](./service.md) | [Functional 总览](./functional.md)

这一页覆盖：

- `curry` 族与部分应用函数
- `pointFree`、`combinators`、`higherOrder`
- `optics` 族

<a id="page-summary"></a>
## 页面摘要

- 这一页属于 `functional` 里的进阶区，适合在你已经熟悉 `pipe`、`Either`、`Maybe` 之后再读。
- `curry` 解决函数复用和参数预绑定，`optics` 解决深层数据读取和不可变更新。
- 如果你的团队还不熟悉函数式风格，不要为了“高级”而过早把所有业务代码改成这套写法。

<a id="page-nav"></a>
## 页内导航

- [基础柯里化函数](#curry-basics)
- [部分应用函数](#partial-application)
- [占位符、装饰器与调试工具](#curry-debug)
- [常用柯里化示例函数](#curried-examples)
- [组合增强函数](#curry-composition)
- [pointFree](#point-free)
- [combinators](#combinators)
- [higherOrder](#higher-order)
- [Optics](#optics)

<a id="curry-basics"></a>
## 基础柯里化函数

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `curry(fn)` | 任意多参数函数 | 柯里化后的函数 | 通用柯里化 |
| `curry2(fn)` | 二元函数 | `(a) => (b) => result` | 二元函数专用 |
| `curry3(fn)` | 三元函数 | 三层柯里化函数 | 三元专用 |
| `curry4(fn)` | 四元函数 | 四层柯里化函数 | 四元专用 |
| `curryN(arity, fn)` | 参数个数、函数 | 柯里化函数 | 用指定 `arity` 控制何时执行 |
| `curryTyped(fn)` | 1-4 参数函数 | 带类型推导的柯里化函数 | 提供更稳的 TS 推导 |
| `typedCurry(fn, validators, options?)` | 函数、参数校验器、选项 | 柯里化函数 | 运行时参数类型校验版 |
| `safeCurry(fn, options?)` | 函数、错误处理选项 | 柯里化函数 | 执行失败时可重试或降级 |
| `curryAsync(fn)` | 异步函数 | 柯里化异步函数 | 用于 Promise 风格函数 |
| `autoCurry(fn)` | 函数 | 原函数或柯里化函数 | 自动按参数个数决定是否柯里化 |
| `memoizedCurry(fn, cache?)` | 函数、可选缓存 | 柯里化函数 | 柯里化 + 结果缓存 |

<a id="partial-application"></a>
## 部分应用函数

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `partial(fn, ...fixedArgs)` | 函数、前置固定参数 | 新函数 | 固定前几个参数 |
| `partialRight(fn, ...fixedArgs)` | 函数、后置固定参数 | 新函数 | 固定后几个参数 |
| `partialAt(fn, positions, ...fixedArgs)` | 函数、参数位置列表、固定值 | 新函数 | 按位置插入参数 |
| `partialIf(condition, fn, ...fixedArgs)` | 条件、函数、固定值 | 新函数 | 条件满足时用固定参数 |
| `partialLazy(fn, shouldExecute?)` | 函数、执行条件 | `{ apply, reset, getArgs }` | 分批累积参数，满足条件后才执行 |
| `partialMemo(fn, ...fixedArgs)` | 函数、固定参数 | 新函数 | 记忆化的部分应用 |
| `flip(fn)` | 二元函数 | 翻转参数的新函数 | 交换前两个参数顺序 |

<a id="curry-debug"></a>
## 占位符、装饰器与调试工具

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `placeholder` | 无 | `Symbol` | 占位符常量 |
| `debugCurry(fn, options?)` | 函数、调试选项 | 柯里化函数 | 打印参数与结果 |
| `perfCurry(fn, options?)` | 函数、性能选项 | 柯里化函数 | 超过阈值时告警 |
| `CurryCache.get(fn)` | 函数 | 柯里化函数 | 从弱引用缓存取柯里化结果 |
| `CurryCache.clear()` | 无 | `void` | 清空缓存 |
| `CurryStats.curry(fn, name?)` | 函数、名称 | 柯里化函数 | 统计调用次数与耗时 |
| `CurryStats.getStats(name?)` | 可选名称 | 统计信息 | 查看统计 |
| `CurryStats.clearStats(name?)` | 可选名称 | `void` | 清空统计 |

<a id="curried-examples"></a>
## 常用柯里化示例函数

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `add(a)(b)` | 两个数字 | 数字 | 加法 |
| `multiply(a)(b)` | 两个数字 | 数字 | 乘法 |
| `includes(substring)(str)` | 子串、字符串 | `boolean` | 字符串包含判断 |
| `curryMap(fn)(array)` | 映射函数、数组 | 新数组 | 公开导出的柯里化数组 map |
| `curryFilter(predicate)(array)` | 条件函数、数组 | 新数组 | 公开导出的柯里化数组 filter |
| `reduce(reducer)(initial)(array)` | 归并函数、初始值、数组 | 累积值 | 柯里化 reduce |
| `getPath(path)(obj)` | 字段路径数组、对象 | 值或 `undefined` | 读深层字段 |
| `setPath(path)(value)(obj)` | 字段路径数组、值、对象 | 新对象 | 写深层字段 |
| `curryBranch(predicate)(trueHandler)(falseHandler)` | 条件、真分支、假分支 | `(value) => result` | 条件分支函数 |

<a id="curry-composition"></a>
## 组合增强函数

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `pipeCurried(...fns)` | 一组单参数函数 | `(initialValue) => result` | 柯里化风格管道 |
| `curryCompose(...fns)` | 一组函数 | 组合函数 | 公开导出的右结合组合别名 |
| `curryPipe(...fns)` | 一组函数 | 管道函数 | 公开导出的左结合管道别名 |
| `composeIf(condition, truePath, falsePath?)` | 条件、真路径、假路径 | `(value) => result` | 条件组合 |
| `branchCompose(...branches)` | 多个分支函数 | `(value) => U[]` | 同时送到多个分支 |
| `parallel(...fns)` | 多个函数 | `async (value) => Promise<any[]>` | 并行执行多个分支 |
| `race(...fns)` | 多个函数 | `async (value) => Promise<any>` | 返回最快完成的结果 |
| `memoizeCompose(...fns)` | 多个函数 | 记忆化组合函数 | 同输入直接走缓存 |
| `composeWithFallback(fallbackFn, ...fns)` | 回退函数、函数链 | 组合函数 | 某步失败时回退 |
| `debugCompose(logger, ...fns)` | 调试 logger、函数链 | 组合函数 | 记录每步输出 |

<a id="point-free"></a>
## `pointFree`

`pointFree` 是一组点自由辅助函数集合。

### 对象与比较

| 成员 | 作用 |
|---|---|
| `pointFree.get(prop)(obj)` | 取对象属性 |
| `pointFree.call(method)(obj)` | 调对象方法 |
| `pointFree.eq(a)(b)` | 相等比较 |
| `pointFree.gt(a)(b)` / `lt` / `gte` / `lte` | 数值比较 |

### 逻辑与集合

| 成员 | 作用 |
|---|---|
| `pointFree.not(value)` | 逻辑非 |
| `pointFree.and(a)(b)` | 逻辑与 |
| `pointFree.or(a)(b)` | 逻辑或 |
| `pointFree.length(arr)` | 数组长度 |
| `pointFree.head(arr)` / `tail` / `last` / `init` | 常见数组拆分 |

### 字符串

| 成员 | 作用 |
|---|---|
| `pointFree.split(separator)(str)` | 拆分字符串 |
| `pointFree.join(separator)(arr)` | 拼接字符串数组 |
| `pointFree.trim(str)` | 去首尾空白 |
| `pointFree.toLowerCase(str)` | 转小写 |
| `pointFree.toUpperCase(str)` | 转大写 |

<a id="combinators"></a>
## `combinators`

函数式组合子集合。

| 成员 | 作用 |
|---|---|
| `I(x)` | 恒等 |
| `K(x)(y)` | 常量函数 |
| `S(f)(g)(x)` | 替换组合子 |
| `B(f)(g)(x)` | 组合组合子 |
| `C(f)(y)(x)` | 翻转组合子 |
| `W(f)(x)` | 重复组合子 |
| `Y(f)` | 不动点组合子，用于递归 |

<a id="higher-order"></a>
## `higherOrder`

高阶函数工具集合。

| 成员 | 作用 |
|---|---|
| `negate(predicate)` | 生成谓词的否定 |
| `allPass(...predicates)` | 多个谓词全部通过才返回 `true` |
| `anyPass(...predicates)` | 任一通过就返回 `true` |
| `ifElse(condition)(onTrue)(onFalse)` | 条件分支高阶函数 |
| `when(condition)(fn)` | 条件满足时执行 |
| `unless(condition)(fn)` | 条件不满足时执行 |

<a id="optics"></a>
## Optics

Optics 用于不可变地访问和更新深层结构。

### 核心类型

| 类型 | 说明 |
|---|---|
| `Lens<S, A>` | 聚焦某个可读可写子结构 |
| `Prism<S, A>` | 聚焦可选子结构 |
| `Traversal<S, A>` | 聚焦多个元素 |
| `Iso<S, A>` | 双向同构转换 |

### Lens 与基础操作

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `lensProp(prop)` | 属性名 | `Lens<T, T[K]>` | 聚焦对象属性 |
| `lensPath(path)` | 路径数组 | `Lens<T, any>` | 聚焦深层路径 |
| `lensIndex(index)` | 数组下标 | `Lens<T[], T \| undefined>` | 聚焦数组元素 |
| `composeLens(l1, l2)` | 两个 lens | 新 lens | 组合聚焦路径 |
| `view(lens)` | lens | `(source) => value` | 读取聚焦值 |
| `set(lens, value)` | lens、值 | `(source) => newSource` | 写入聚焦值 |
| `modify(lens, fn)` | lens、变换函数 | `(source) => newSource` | 在原值基础上修改 |

### Prism 与 Traversal

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `prismArray()` | 无 | `Prism<(T \| undefined)[], T[]>` | 聚焦有效数组 |
| `prismOptional()` | 无 | `Prism<T \| undefined, T>` | 聚焦可选值 |
| `traversalArray()` | 无 | `Traversal<T[], T>` | 遍历数组元素 |
| `traversalValues()` | 无 | `Traversal<Record<string, T>, T>` | 遍历对象值 |
| `traversalFilter(predicate)` | 条件函数 | `Traversal<T[], T>` | 只遍历匹配元素 |

### 其他 optics 工具

| API / 成员 | 说明 |
|---|---|
| `iso(to, from)` | 定义双向转换 |
| `LensBuilder` / `lensBuilder()` | 链式构建 lens |

### `LensBuilder`

| 方法 | 作用 |
|---|---|
| `focus(prop)` | 聚焦到对象属性 |
| `focusPath(path)` | 聚焦到路径 |
| `focusIndex(index)` | 聚焦到数组下标 |
| `get(source)` | 读取当前聚焦值 |
| `set(value)` | 生成设置函数 |
| `modify(fn)` | 生成修改函数 |
| `build()` | 返回最终 `Lens` |

### `update`

| 成员函数 | 参数 | 作用 |
|---|---|---|
| `update.prop(prop, value)` | 属性名、值 | 更新对象属性 |
| `update.modifyProp(prop, fn)` | 属性名、修改函数 | 修改对象属性 |
| `update.index(index, value)` | 下标、值 | 更新数组元素 |
| `update.modifyIndex(index, fn)` | 下标、修改函数 | 修改数组元素 |
| `update.append(value)` | 值 | 在数组末尾追加 |
| `update.prepend(value)` | 值 | 在数组开头追加 |
| `update.remove(index)` | 下标 | 删除数组元素 |
| `update.merge(updates)` | 局部对象 | 深度合并对象 |

### `immutable`

| 成员函数 | 参数 | 作用 |
|---|---|---|
| `immutable.setIn(path, value)` | 路径、值 | 设置嵌套属性 |
| `immutable.getIn(path)` | 路径 | 读取嵌套属性 |
| `immutable.updateIn(path, fn)` | 路径、修改函数 | 更新嵌套属性 |
| `immutable.deleteIn(path)` | 路径 | 删除嵌套属性 |

### `commonLenses`

| 成员函数 | 作用 |
|---|---|
| `commonLenses.head()` | 聚焦数组第一个元素 |
| `commonLenses.tail()` | 聚焦数组最后一个元素 |
| `commonLenses.length()` | 聚焦数组长度 |
