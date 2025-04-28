# @stratix/utils/immutable 不可变数据工具函数文档

## 简介

`@stratix/utils/immutable` 模块提供了一系列用于处理不可变数据的工具函数，帮助开发者以不可变的方式操作数据结构，确保数据的稳定性和可预测性。

## 目录

- [produce](#produce)
- [freeze](#freeze)
- [deepFreeze](#deepfreeze)
- [immutableSet](#immutableset)
- [immutableDelete](#immutabledelete)
- [immutablePush](#immutablepush)
- [immutablePop](#immutablepop)
- [immutableShift](#immutableshift)
- [immutableUnshift](#immutableunshift)
- [immutableSplice](#immutablesplice)
- [immutableSort](#immutablesort)
- [immutableReverse](#immutablereverse)
- [immutableMerge](#immutablemerge)
- [immutableDeepMerge](#immutabledeepmerge)
- [immutableUpdate](#immutableupdate)

## API 详情

### produce

`produce(baseState, recipe)`

基于 Immer 库的思想，提供一种简单方式创建不可变数据的更新。

**参数:**
- `baseState: any` - 原始状态对象
- `recipe: Function` - 修改草稿状态的函数

**返回值:**
- `any` - 新的不可变状态

**示例:**
```javascript
import { produce } from '@stratix/utils/immutable';

const baseState = { a: 1, b: { c: 2 } };
const nextState = produce(baseState, draft => {
  draft.a = 2;
  draft.b.c = 3;
});

console.log(nextState); // { a: 2, b: { c: 3 } }
console.log(baseState); // { a: 1, b: { c: 2 } } - 原始对象不变
```

### freeze

`freeze(obj)`

冻结对象，防止对象属性被修改。

**参数:**
- `obj: Object` - 要冻结的对象

**返回值:**
- `Object` - 冻结后的对象

**示例:**
```javascript
import { freeze } from '@stratix/utils/immutable';

const obj = { a: 1, b: 2 };
const frozenObj = freeze(obj);

// 尝试修改会在严格模式下抛出错误
// frozenObj.a = 3; // TypeError: Cannot assign to read only property 'a' of object
```

### deepFreeze

`deepFreeze(obj)`

递归冻结对象及其所有嵌套属性，创建完全不可变的数据结构。

**参数:**
- `obj: Object` - 要深度冻结的对象

**返回值:**
- `Object` - 深度冻结后的对象

**示例:**
```javascript
import { deepFreeze } from '@stratix/utils/immutable';

const obj = { a: 1, b: { c: 2 } };
const deepFrozenObj = deepFreeze(obj);

// 尝试修改任何属性都会失败
// deepFrozenObj.b.c = 3; // TypeError: Cannot assign to read only property 'c' of object
```

### immutableSet

`immutableSet(obj, path, value)`

以不可变方式设置对象指定路径的值。

**参数:**
- `obj: Object` - 源对象
- `path: string | Array` - 属性路径
- `value: any` - 要设置的值

**返回值:**
- `Object` - 新对象，原对象不变

**示例:**
```javascript
import { immutableSet } from '@stratix/utils/immutable';

const obj = { a: 1, b: { c: 2 } };
const newObj = immutableSet(obj, 'b.c', 3);

console.log(newObj); // { a: 1, b: { c: 3 } }
console.log(obj); // { a: 1, b: { c: 2 } } - 原对象不变
```

### immutableDelete

`immutableDelete(obj, path)`

以不可变方式删除对象指定路径的属性。

**参数:**
- `obj: Object` - 源对象
- `path: string | Array` - 属性路径

**返回值:**
- `Object` - 新对象，原对象不变

**示例:**
```javascript
import { immutableDelete } from '@stratix/utils/immutable';

const obj = { a: 1, b: { c: 2, d: 3 } };
const newObj = immutableDelete(obj, 'b.c');

console.log(newObj); // { a: 1, b: { d: 3 } }
console.log(obj); // { a: 1, b: { c: 2, d: 3 } } - 原对象不变
```

### immutablePush

`immutablePush(array, ...items)`

以不可变方式向数组末尾添加元素。

**参数:**
- `array: Array` - 源数组
- `...items: any[]` - 要添加的元素

**返回值:**
- `Array` - 新数组，原数组不变

**示例:**
```javascript
import { immutablePush } from '@stratix/utils/immutable';

const arr = [1, 2, 3];
const newArr = immutablePush(arr, 4, 5);

console.log(newArr); // [1, 2, 3, 4, 5]
console.log(arr); // [1, 2, 3] - 原数组不变
```

### immutablePop

`immutablePop(array)`

以不可变方式移除数组最后一个元素。

**参数:**
- `array: Array` - 源数组

**返回值:**
- `Array` - 新数组，原数组不变

**示例:**
```javascript
import { immutablePop } from '@stratix/utils/immutable';

const arr = [1, 2, 3];
const newArr = immutablePop(arr);

console.log(newArr); // [1, 2]
console.log(arr); // [1, 2, 3] - 原数组不变
```

### immutableShift

`immutableShift(array)`

以不可变方式移除数组第一个元素。

**参数:**
- `array: Array` - 源数组

**返回值:**
- `Array` - 新数组，原数组不变

**示例:**
```javascript
import { immutableShift } from '@stratix/utils/immutable';

const arr = [1, 2, 3];
const newArr = immutableShift(arr);

console.log(newArr); // [2, 3]
console.log(arr); // [1, 2, 3] - 原数组不变
```

### immutableUnshift

`immutableUnshift(array, ...items)`

以不可变方式向数组开头添加元素。

**参数:**
- `array: Array` - 源数组
- `...items: any[]` - 要添加的元素

**返回值:**
- `Array` - 新数组，原数组不变

**示例:**
```javascript
import { immutableUnshift } from '@stratix/utils/immutable';

const arr = [2, 3, 4];
const newArr = immutableUnshift(arr, 0, 1);

console.log(newArr); // [0, 1, 2, 3, 4]
console.log(arr); // [2, 3, 4] - 原数组不变
```

### immutableSplice

`immutableSplice(array, start, deleteCount, ...items)`

以不可变方式对数组进行裁剪操作。

**参数:**
- `array: Array` - 源数组
- `start: number` - 开始位置
- `deleteCount: number` - 要删除的元素数量
- `...items: any[]` - 要插入的元素

**返回值:**
- `Array` - 新数组，原数组不变

**示例:**
```javascript
import { immutableSplice } from '@stratix/utils/immutable';

const arr = [1, 2, 3, 4, 5];
const newArr = immutableSplice(arr, 2, 1, 'a', 'b');

console.log(newArr); // [1, 2, 'a', 'b', 4, 5]
console.log(arr); // [1, 2, 3, 4, 5] - 原数组不变
```

### immutableSort

`immutableSort(array, compareFn)`

以不可变方式对数组进行排序。

**参数:**
- `array: Array` - 源数组
- `compareFn?: Function` - 比较函数

**返回值:**
- `Array` - 新排序后的数组，原数组不变

**示例:**
```javascript
import { immutableSort } from '@stratix/utils/immutable';

const arr = [3, 1, 4, 2];
const newArr = immutableSort(arr);

console.log(newArr); // [1, 2, 3, 4]
console.log(arr); // [3, 1, 4, 2] - 原数组不变
```

### immutableReverse

`immutableReverse(array)`

以不可变方式反转数组。

**参数:**
- `array: Array` - 源数组

**返回值:**
- `Array` - 新反转后的数组，原数组不变

**示例:**
```javascript
import { immutableReverse } from '@stratix/utils/immutable';

const arr = [1, 2, 3, 4];
const newArr = immutableReverse(arr);

console.log(newArr); // [4, 3, 2, 1]
console.log(arr); // [1, 2, 3, 4] - 原数组不变
```

### immutableMerge

`immutableMerge(target, ...sources)`

以不可变方式合并多个对象。

**参数:**
- `target: Object` - 目标对象
- `...sources: Object[]` - 源对象

**返回值:**
- `Object` - 合并后的新对象，原对象不变

**示例:**
```javascript
import { immutableMerge } from '@stratix/utils/immutable';

const obj1 = { a: 1, b: 2 };
const obj2 = { b: 3, c: 4 };
const merged = immutableMerge(obj1, obj2);

console.log(merged); // { a: 1, b: 3, c: 4 }
console.log(obj1); // { a: 1, b: 2 } - 原对象不变
```

### immutableDeepMerge

`immutableDeepMerge(target, ...sources)`

以不可变方式深度合并多个对象。

**参数:**
- `target: Object` - 目标对象
- `...sources: Object[]` - 源对象

**返回值:**
- `Object` - 深度合并后的新对象，原对象不变

**示例:**
```javascript
import { immutableDeepMerge } from '@stratix/utils/immutable';

const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { b: { d: 3 }, e: 4 };
const merged = immutableDeepMerge(obj1, obj2);

console.log(merged); // { a: 1, b: { c: 2, d: 3 }, e: 4 }
console.log(obj1); // { a: 1, b: { c: 2 } } - 原对象不变
```

### immutableUpdate

`immutableUpdate(obj, path, updater)`

以不可变方式更新对象指定路径的值。

**参数:**
- `obj: Object` - 源对象
- `path: string | Array` - 属性路径
- `updater: Function` - 更新函数，接收当前值并返回新值

**返回值:**
- `Object` - 更新后的新对象，原对象不变

**示例:**
```javascript
import { immutableUpdate } from '@stratix/utils/immutable';

const obj = { a: 1, b: { c: 2 } };
const newObj = immutableUpdate(obj, 'b.c', value => value * 2);

console.log(newObj); // { a: 1, b: { c: 4 } }
console.log(obj); // { a: 1, b: { c: 2 } } - 原对象不变
``` 