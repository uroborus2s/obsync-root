# @stratix/utils/collection 集合工具函数文档

本模块提供了一系列用于处理数组、对象和其他集合类型的实用函数，可帮助开发者更高效地操作和转换数据结构。

## 目录

- [@stratix/utils/collection 集合工具函数文档](#stratixutilscollection-集合工具函数文档)
  - [目录](#目录)
  - [数组操作](#数组操作)
    - [chunk(array, size)](#chunkarray-size)
    - [unique(array, iteratee)](#uniquearray-iteratee)
    - [groupBy(array, iteratee)](#groupbyarray-iteratee)
    - [flatten(array, depth)](#flattenarray-depth)
    - [sortBy(array, iteratees)](#sortbyarray-iteratees)
    - [partition(array, predicate)](#partitionarray-predicate)
    - [difference(array, ...values)](#differencearray-values)
    - [intersection(...arrays)](#intersectionarrays)
    - [union(...arrays)](#unionarrays)
    - [compact(array)](#compactarray)
    - [map(array, iteratee)](#maparray-iteratee)
    - [filter(array, predicate)](#filterarray-predicate)
    - [reduce(array, iteratee, initialValue)](#reducearray-iteratee-initialvalue)
    - [find(array, predicate)](#findarray-predicate)
    - [findIndex(array, predicate)](#findindexarray-predicate)
    - [take(array, n)](#takearray-n)
    - [shuffle(array)](#shufflearray)
  - [对象集合操作](#对象集合操作)
    - [pick(object, paths)](#pickobject-paths)
    - [omit(object, paths)](#omitobject-paths)
    - [merge(...objects)](#mergeobjects)
    - [cloneDeep(value)](#clonedeepvalue)
    - [keyBy(array, iteratee)](#keybyarray-iteratee)

## 数组操作

<a id="chunk"></a>
### chunk(array, size)

将数组分割成指定大小的多个小数组。

**参数:**
- `array` `{Array}`: 要分割的数组
- `size` `{number}`: 每个小数组的大小，默认为1

**返回:**
- `{Array}`: 包含小数组的新数组

**示例:**
```js
import { chunk } from '@stratix/utils/collection';

const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
const chunked = chunk(numbers, 3);
console.log(chunked); // [[1, 2, 3], [4, 5, 6], [7, 8]]
```

<a id="unique"></a>
### unique(array, iteratee)

创建一个去除重复值的新数组。

**参数:**
- `array` `{Array}`: 要去重的数组
- `iteratee` `{Function|string}`: (可选) 迭代函数，用于生成唯一性标准，或对象属性路径

**返回:**
- `{Array}`: 没有重复值的新数组

**示例:**
```js
import { unique } from '@stratix/utils/collection';

// 基本类型去重
const numbers = [1, 2, 2, 3, 4, 4, 5];
console.log(unique(numbers)); // [1, 2, 3, 4, 5]

// 对象数组基于属性去重
const users = [
  { id: 1, name: '张三' },
  { id: 2, name: '李四' },
  { id: 1, name: '张三' },
  { id: 3, name: '王五' }
];

// 基于 id 去重
console.log(unique(users, 'id')); 
// [{ id: 1, name: '张三' }, { id: 2, name: '李四' }, { id: 3, name: '王五' }]

// 使用自定义函数
console.log(unique(users, user => user.id));
// [{ id: 1, name: '张三' }, { id: 2, name: '李四' }, { id: 3, name: '王五' }]
```

<a id="groupby"></a>
### groupBy(array, iteratee)

创建一个对象，对象的键是通过对集合中每个元素运行迭代函数得到的结果，每个键对应的值是包含属于这个键的所有元素的数组。

**参数:**
- `array` `{Array}`: 要分组的数组
- `iteratee` `{Function|string}`: 迭代函数，用于生成分组的键，或对象属性路径

**返回:**
- `{Object}`: 分组后的对象

**示例:**
```js
import { groupBy } from '@stratix/utils/collection';

const products = [
  { category: '水果', name: '苹果', price: 5 },
  { category: '蔬菜', name: '胡萝卜', price: 3 },
  { category: '水果', name: '香蕉', price: 4 },
  { category: '蔬菜', name: '白菜', price: 2 },
  { category: '肉类', name: '猪肉', price: 10 }
];

// 基于类别分组
const groupedByCategory = groupBy(products, 'category');
console.log(groupedByCategory);
/*
{
  '水果': [
    { category: '水果', name: '苹果', price: 5 },
    { category: '水果', name: '香蕉', price: 4 }
  ],
  '蔬菜': [
    { category: '蔬菜', name: '胡萝卜', price: 3 },
    { category: '蔬菜', name: '白菜', price: 2 }
  ],
  '肉类': [
    { category: '肉类', name: '猪肉', price: 10 }
  ]
}
*/

// 基于价格区间分组
const groupedByPriceRange = groupBy(products, product => {
  if (product.price < 5) return '低价';
  if (product.price < 10) return '中价';
  return '高价';
});

console.log(groupedByPriceRange);
/*
{
  '低价': [
    { category: '蔬菜', name: '胡萝卜', price: 3 },
    { category: '水果', name: '香蕉', price: 4 },
    { category: '蔬菜', name: '白菜', price: 2 }
  ],
  '中价': [
    { category: '水果', name: '苹果', price: 5 }
  ],
  '高价': [
    { category: '肉类', name: '猪肉', price: 10 }
  ]
}
*/
```

<a id="flatten"></a>
### flatten(array, depth)

将嵌套数组扁平化到指定深度。

**参数:**
- `array` `{Array}`: 要扁平化的数组
- `depth` `{number}`: (可选) 扁平化的深度，默认为1

**返回:**
- `{Array}`: 扁平化后的新数组

**示例:**
```js
import { flatten } from '@stratix/utils/collection';

const nestedArray = [1, [2, [3, [4]], 5]];

// 默认扁平化一层
console.log(flatten(nestedArray)); 
// [1, 2, [3, [4]], 5]

// 扁平化两层
console.log(flatten(nestedArray, 2)); 
// [1, 2, 3, [4], 5]

// 完全扁平化(Infinity)
console.log(flatten(nestedArray, Infinity)); 
// [1, 2, 3, 4, 5]
```

<a id="sortby"></a>
### sortBy(array, iteratees)

创建一个根据迭代函数结果排序的数组。

**参数:**
- `array` `{Array}`: 要排序的数组
- `iteratees` `{Array|Function|string}`: 迭代函数，用于生成排序标准，或对象属性路径

**返回:**
- `{Array}`: 排序后的新数组

**示例:**
```js
import { sortBy } from '@stratix/utils/collection';

const users = [
  { name: '张三', age: 30 },
  { name: '李四', age: 25 },
  { name: '王五', age: 25 },
  { name: '赵六', age: 40 }
];

// 按年龄排序
const sortedByAge = sortBy(users, 'age');
console.log(sortedByAge);
/*
[
  { name: '李四', age: 25 },
  { name: '王五', age: 25 },
  { name: '张三', age: 30 },
  { name: '赵六', age: 40 }
]
*/

// 先按年龄排序，年龄相同的按名称排序
const sortedByAgeAndName = sortBy(users, ['age', 'name']);
console.log(sortedByAgeAndName);
/*
[
  { name: '李四', age: 25 },
  { name: '王五', age: 25 },
  { name: '张三', age: 30 },
  { name: '赵六', age: 40 }
]
*/

// 使用自定义排序函数
const sortedByNameLength = sortBy(users, user => user.name.length);
console.log(sortedByNameLength);
/*
[
  { name: '张三', age: 30 },
  { name: '李四', age: 25 },
  { name: '王五', age: 25 },
  { name: '赵六', age: 40 }
]
*/
```

<a id="partition"></a>
### partition(array, predicate)

根据断言函数将数组分割成两个组：满足条件的元素和不满足条件的元素。

**参数:**
- `array` `{Array}`: 要分割的数组
- `predicate` `{Function}`: 断言函数，用于判断元素属于哪个组

**返回:**
- `{Array}`: 包含两个数组的数组，第一个数组包含满足条件的元素，第二个数组包含不满足条件的元素

**示例:**
```js
import { partition } from '@stratix/utils/collection';

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 分割为偶数和奇数
const [evens, odds] = partition(numbers, num => num % 2 === 0);
console.log(evens); // [2, 4, 6, 8, 10]
console.log(odds);  // [1, 3, 5, 7, 9]

// 分割用户为活跃和非活跃
const users = [
  { id: 1, name: '张三', active: true },
  { id: 2, name: '李四', active: false },
  { id: 3, name: '王五', active: true },
  { id: 4, name: '赵六', active: false }
];

const [activeUsers, inactiveUsers] = partition(users, user => user.active);
console.log(activeUsers);   // [{ id: 1, name: '张三', active: true }, { id: 3, name: '王五', active: true }]
console.log(inactiveUsers); // [{ id: 2, name: '李四', active: false }, { id: 4, name: '赵六', active: false }]
```

<a id="difference"></a>
### difference(array, ...values)

创建一个新数组，包含在第一个数组中但不在其他数组中的值。

**参数:**
- `array` `{Array}`: 要检查的数组
- `...values` `{...Array}`: 要排除的值的数组

**返回:**
- `{Array}`: 过滤后的新数组

**示例:**
```js
import { difference } from '@stratix/utils/collection';

const array1 = [1, 2, 3, 4, 5];
const array2 = [3, 4, 5, 6, 7];

console.log(difference(array1, array2)); 
// [1, 2]

// 可以传入多个数组
const array3 = [1, 2, 8, 9];
console.log(difference(array1, array2, array3)); 
// [] (没有元素只在array1中出现)
```

<a id="intersection"></a>
### intersection(...arrays)

创建一个包含所有传入数组共有元素的新数组。

**参数:**
- `...arrays` `{...Array}`: 要检查的数组

**返回:**
- `{Array}`: 共有元素的新数组

**示例:**
```js
import { intersection } from '@stratix/utils/collection';

const array1 = [1, 2, 3, 4, 5];
const array2 = [3, 4, 5, 6, 7];
const array3 = [4, 5, 8, 9];

// 两个数组的交集
console.log(intersection(array1, array2)); 
// [3, 4, 5]

// 多个数组的交集
console.log(intersection(array1, array2, array3)); 
// [4, 5]
```

<a id="union"></a>
### union(...arrays)

创建一个包含所有传入数组所有元素的新数组。

**参数:**
- `...arrays` `{...Array}`: 要检查的数组

**返回:**
- `{Array}`: 所有元素的新数组

**示例:**
```js
import { union } from '@stratix/utils/collection';

const array1 = [1, 2, 3, 4, 5];
const array2 = [3, 4, 5, 6, 7];
const array3 = [4, 5, 8, 9];

console.log(union(array1, array2)); 
// [1, 2, 3, 4, 5, 6, 7]

console.log(union(array1, array2, array3)); 
// [1, 2, 3, 4, 5, 6, 7, 8, 9]
```

<a id="compact"></a>
### compact(array)

创建一个新数组，包含所有非假值的元素。

**参数:**
- `array` `{Array}`: 要过滤的数组

**返回:**
- `{Array}`: 过滤后的新数组

**示例:**
```js
import { compact } from '@stratix/utils/collection';

const array = [0, 1, false, 2, '', 3, null, 4, undefined, 5];
console.log(compact(array)); 
// [1, 2, 3, 4, 5]
```

<a id="map"></a>
### map(array, iteratee)

创建一个新数组，包含所有元素经过迭代函数处理后的结果。

**参数:**
- `array` `{Array}`: 要映射的数组
- `iteratee` `{Function}`: 迭代函数，用于处理每个元素

**返回:**
- `{Array}`: 映射后的新数组

**示例:**
```js
import { map } from '@stratix/utils/collection';

const numbers = [1, 2, 3, 4, 5];
const doubled = map(numbers, num => num * 2);
console.log(doubled); 
// [2, 4, 6, 8, 10]
```

<a id="filter"></a>
### filter(array, predicate)

创建一个新数组，包含所有满足断言函数条件的元素。

**参数:**
- `array` `{Array}`: 要过滤的数组
- `predicate` `{Function}`: 断言函数，用于判断元素是否满足条件

**返回:**
- `{Array}`: 过滤后的新数组

**示例:**
```js
import { filter } from '@stratix/utils/collection';

const numbers = [1, 2, 3, 4, 5];
const evenNumbers = filter(numbers, num => num % 2 === 0);
console.log(evenNumbers); 
// [2, 4]
```

<a id="reduce"></a>
### reduce(array, iteratee, initialValue)

创建一个归约后的值。

**参数:**
- `array` `{Array}`: 要归约的数组
- `iteratee` `{Function}`: 归约函数，用于处理每个元素
- `initialValue` `{*}`: (可选) 归约的初始值

**返回:**
- `{*}`: 归约后的值

**示例:**
```js
import { reduce } from '@stratix/utils/collection';

const numbers = [1, 2, 3, 4, 5];
const sum = reduce(numbers, (acc, num) => acc + num, 0);
console.log(sum); 
// 15
```

<a id="find"></a>
### find(array, predicate)

创建一个新数组，包含所有满足断言函数条件的元素。

**参数:**
- `array` `{Array}`: 要查找的数组
- `predicate` `{Function}`: 断言函数，用于判断元素是否满足条件

**返回:**
- `{*}`: 满足条件的元素

**示例:**
```js
import { find } from '@stratix/utils/collection';

const users = [
  { id: 1, name: '张三', age: 30 },
  { id: 2, name: '李四', age: 25 },
  { id: 3, name: '王五', age: 25 },
  { id: 4, name: '赵六', age: 40 }
];

const user = find(users, user => user.name === '张三');
console.log(user); 
// { id: 1, name: '张三', age: 30 }
```

<a id="findindex"></a>
### findIndex(array, predicate)

创建一个新数组，包含所有满足断言函数条件的元素。

**参数:**
- `array` `{Array}`: 要查找的数组
- `predicate` `{Function}`: 断言函数，用于判断元素是否满足条件

**返回:**
- `{number}`: 满足条件的元素的索引

**示例:**
```js
import { findIndex } from '@stratix/utils/collection';

const users = [
  { id: 1, name: '张三', age: 30 },
  { id: 2, name: '李四', age: 25 },
  { id: 3, name: '王五', age: 25 },
  { id: 4, name: '赵六', age: 40 }
];

const index = findIndex(users, user => user.name === '张三');
console.log(index); 
// 0
```

<a id="take"></a>
### take(array, n)

创建一个新数组，包含数组的前n个元素。

**参数:**
- `array` `{Array}`: 要获取子数组的数组
- `n` `{number}`: 要获取的元素数量

**返回:**
- `{Array}`: 包含前n个元素的新数组

**示例:**
```js
import { take } from '@stratix/utils/collection';

const numbers = [1, 2, 3, 4, 5];
const firstTwo = take(numbers, 2);
console.log(firstTwo); 
// [1, 2]
```

<a id="shuffle"></a>
### shuffle(array)

创建一个随机排序的新数组。

**参数:**
- `array` `{Array}`: 要随机排序的数组

**返回:**
- `{Array}`: 随机排序后的新数组

**示例:**
```js
import { shuffle } from '@stratix/utils/collection';

const numbers = [1, 2, 3, 4, 5];
const shuffled = shuffle(numbers);
console.log(shuffled); 
// 随机排序后的数组
```

## 对象集合操作

<a id="pick"></a>
### pick(object, paths)

创建一个从对象中选取指定属性的新对象。

**参数:**
- `object` `{Object}`: 源对象
- `paths` `{Array|string}`: 要选取的属性路径数组或单个属性

**返回:**
- `{Object}`: 包含选定属性的新对象

**示例:**
```js
import { pick } from '@stratix/utils/collection';

const user = {
  id: 1,
  name: '张三',
  age: 30,
  email: 'zhangsan@example.com',
  address: {
    city: '北京',
    street: '中关村'
  }
};

// 选取单个属性
console.log(pick(user, 'name')); 
// { name: '张三' }

// 选取多个属性
console.log(pick(user, ['id', 'name', 'email'])); 
// { id: 1, name: '张三', email: 'zhangsan@example.com' }

// 选取嵌套属性
console.log(pick(user, ['name', 'address.city'])); 
// { name: '张三', address: { city: '北京' } }
```

<a id="omit"></a>
### omit(object, paths)

创建一个从对象中排除指定属性的新对象。

**参数:**
- `object` `{Object}`: 源对象
- `paths` `{Array|string}`: 要排除的属性路径数组或单个属性

**返回:**
- `{Object}`: 不包含排除属性的新对象

**示例:**
```js
import { omit } from '@stratix/utils/collection';

const user = {
  id: 1,
  name: '张三',
  age: 30,
  password: 'secret123',
  email: 'zhangsan@example.com'
};

// 排除单个属性
console.log(omit(user, 'password')); 
// { id: 1, name: '张三', age: 30, email: 'zhangsan@example.com' }

// 排除多个属性
console.log(omit(user, ['password', 'id'])); 
// { name: '张三', age: 30, email: 'zhangsan@example.com' }
```

<a id="merge"></a>
### merge(...objects)

深度合并多个对象。

**参数:**
- `...objects` `{...Object}`: 要合并的源对象

**返回:**
- `{Object}`: 合并后的新对象

**示例:**
```js
import { merge } from '@stratix/utils/collection';

const defaults = {
  theme: 'light',
  sidebar: true,
  notifications: {
    email: true,
    sms: false,
    push: true
  }
};

const userSettings = {
  theme: 'dark',
  notifications: {
    email: false,
    push: false
  }
};

// 深度合并配置对象
const settings = merge(defaults, userSettings);
console.log(settings);
/*
{
  theme: 'dark',
  sidebar: true,
  notifications: {
    email: false,
    sms: false,
    push: false
  }
}
*/
```

<a id="clonedeep"></a>
### cloneDeep(value)

创建值的深拷贝。

**参数:**
- `value` `{*}`: 要深拷贝的值

**返回:**
- `{*}`: 深拷贝后的值

**示例:**
```js
import { cloneDeep } from '@stratix/utils/collection';

const original = {
  name: '张三',
  address: {
    city: '北京',
    street: '中关村'
  },
  hobbies: ['阅读', '游泳']
};

// 创建深拷贝
const copy = cloneDeep(original);
console.log(copy);
/* 
{
  name: '张三',
  address: {
    city: '北京',
    street: '中关村'
  },
  hobbies: ['阅读', '游泳']
}
*/

// 修改拷贝不会影响原对象
copy.address.city = '上海';
copy.hobbies.push('旅行');

console.log(original.address.city); // '北京'
console.log(original.hobbies); // ['阅读', '游泳']
```

<a id="keyby"></a>
### keyBy(array, iteratee)

创建一个对象，对象的键是通过对集合中每个元素运行迭代函数得到的结果，每个键对应的值是生成该键的最后一个元素。

**参数:**
- `array` `{Array}`: 要转换的数组
- `iteratee` `{Function|string}`: 迭代函数，用于生成键，或对象属性路径

**返回:**
- `{Object}`: 由键值对组成的对象

**示例:**
```js
import { keyBy } from '@stratix/utils/collection';

const users = [
  { id: 1, name: '张三' },
  { id: 2, name: '李四' },
  { id: 3, name: '王五' }
];

// 按ID生成查找对象
const usersById = keyBy(users, 'id');
console.log(usersById);
/*
{
  '1': { id: 1, name: '张三' },
  '2': { id: 2, name: '李四' },
  '3': { id: 3, name: '王五' }
}
*/

// 快速查找
console.log(usersById[2]); // { id: 2, name: '李四' }

// 使用自定义函数生成键
const usersByNameFirstChar = keyBy(users, user => user.name.charAt(0));
console.log(usersByNameFirstChar);
/*
{
  '张': { id: 1, name: '张三' },
  '李': { id: 2, name: '李四' },
  '王': { id: 3, name: '王五' }
}
*/
``` 