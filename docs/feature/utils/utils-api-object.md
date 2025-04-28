# @stratix/utils/object 对象工具函数文档

本模块提供了一系列用于处理JavaScript对象的实用函数，可帮助开发者更高效地操作、转换和分析对象数据结构。

## 目录

- [get - 获取嵌套属性](#get)
- [set - 设置嵌套属性](#set)
- [has - 检查属性是否存在](#has)
- [keys - 获取对象键](#keys)
- [values - 获取对象值](#values)
- [entries - 获取键值对](#entries)
- [fromEntries - 键值对转对象](#fromentries)
- [assign - 对象合并](#assign)
- [assignDeep - 深度合并](#assigndeep)
- [defaults - 填充默认值](#defaults)
- [mapValues - 映射对象值](#mapvalues)
- [mapKeys - 映射对象键](#mapkeys)
- [transform - 转换对象](#transform)
- [isEmpty - 检查是否为空](#isempty)
- [isEqual - 对象深度比较](#isequal)
- [deepMerge - 深度合并对象](#deepmerge)
- [deepClone - 深度克隆对象](#deepclone)
- [pick - 选择对象属性](#pick)
- [omit - 排除对象属性](#omit)

## 函数详情

<a id="get"></a>
### get(object, path, defaultValue)

获取对象中指定路径的值，支持嵌套属性访问。

**参数:**
- `object` `{Object}`: 要获取值的对象
- `path` `{string|Array}`: 属性路径，可以是字符串（以点分隔）或数组
- `defaultValue` `{*}`: (可选) 如果路径解析为undefined，则返回的默认值

**返回:**
- `{*}`: 解析的值或默认值

**示例:**
```js
import { get } from '@stratix/utils/object';

const user = {
  id: 1,
  name: '张三',
  profile: {
    address: {
      city: '北京',
      district: '海淀'
    },
    contacts: ['13800138000', '13900139000']
  }
};

// 使用字符串路径
console.log(get(user, 'name'));
// '张三'

console.log(get(user, 'profile.address.city'));
// '北京'

// 使用数组路径
console.log(get(user, ['profile', 'contacts', 0]));
// '13800138000'

// 提供默认值
console.log(get(user, 'profile.age', 25));
// 25 (因为 profile.age 不存在)
```

<a id="set"></a>
### set(object, path, value)

在对象上设置指定路径的值，支持创建嵌套属性。

**参数:**
- `object` `{Object}`: 要修改的对象
- `path` `{string|Array}`: 属性路径，可以是字符串（以点分隔）或数组
- `value` `{*}`: 要设置的值

**返回:**
- `{Object}`: 修改后的对象

**示例:**
```js
import { set } from '@stratix/utils/object';

const user = {
  name: '张三',
  profile: {
    address: {}
  }
};

// 设置现有属性的值
set(user, 'name', '李四');
console.log(user.name); // '李四'

// 设置嵌套属性的值
set(user, 'profile.address.city', '上海');
console.log(user.profile.address.city); // '上海'

// 创建不存在的嵌套路径
set(user, 'profile.contacts.mobile', '13800138000');
console.log(user.profile.contacts.mobile); // '13800138000'

// 使用数组路径
set(user, ['profile', 'skills'], ['编程', '设计']);
console.log(user.profile.skills); // ['编程', '设计']
```

<a id="has"></a>
### has(object, path)

检查对象是否包含指定路径的属性。

**参数:**
- `object` `{Object}`: 要检查的对象
- `path` `{string|Array}`: 属性路径，可以是字符串（以点分隔）或数组

**返回:**
- `{boolean}`: 如果路径存在，则返回true，否则返回false

**示例:**
```js
import { has } from '@stratix/utils/object';

const user = {
  id: 1,
  profile: {
    name: '张三',
    address: null
  }
};

console.log(has(user, 'id')); 
// true

console.log(has(user, 'profile.name')); 
// true

console.log(has(user, 'profile.address')); 
// true (address属性存在，但值为null)

console.log(has(user, 'profile.age')); 
// false

console.log(has(user, ['profile', 'email'])); 
// false
```

<a id="keys"></a>
### keys(object)

获取对象自身的可枚举属性名组成的数组。

**参数:**
- `object` `{Object}`: 要获取键的对象

**返回:**
- `{Array}`: 对象的键数组

**示例:**
```js
import { keys } from '@stratix/utils/object';

const user = {
  id: 1,
  name: '张三',
  age: 30
};

console.log(keys(user)); 
// ['id', 'name', 'age']

// 继承的属性不包括在内
const child = Object.create(user);
child.grade = '一年级';

console.log(keys(child)); 
// ['grade']
```

<a id="values"></a>
### values(object)

获取对象自身的可枚举属性值组成的数组。

**参数:**
- `object` `{Object}`: 要获取值的对象

**返回:**
- `{Array}`: 对象的值数组

**示例:**
```js
import { values } from '@stratix/utils/object';

const user = {
  id: 1,
  name: '张三',
  age: 30
};

console.log(values(user)); 
// [1, '张三', 30]

const scores = {
  math: 90,
  science: 85,
  history: 95
};

console.log(values(scores)); 
// [90, 85, 95]
```

<a id="entries"></a>
### entries(object)

获取对象自身的可枚举属性的键值对数组。

**参数:**
- `object` `{Object}`: 要获取键值对的对象

**返回:**
- `{Array}`: 对象的键值对数组

**示例:**
```js
import { entries } from '@stratix/utils/object';

const user = {
  id: 1,
  name: '张三',
  age: 30
};

console.log(entries(user)); 
// [['id', 1], ['name', '张三'], ['age', 30]]

// 可以用于遍历对象
entries(user).forEach(([key, value]) => {
  console.log(`${key}: ${value}`);
});
// 输出:
// id: 1
// name: 张三
// age: 30
```

<a id="fromentries"></a>
### fromEntries(entries)

将键值对数组转换为对象。

**参数:**
- `entries` `{Array}`: 键值对数组

**返回:**
- `{Object}`: 由键值对数组创建的对象

**示例:**
```js
import { fromEntries } from '@stratix/utils/object';

const keyValuePairs = [
  ['id', 1],
  ['name', '张三'],
  ['age', 30]
];

const user = fromEntries(keyValuePairs);
console.log(user); 
// { id: 1, name: '张三', age: 30 }

// 将 Map 转换为对象
const map = new Map([
  ['theme', 'dark'],
  ['language', 'zh-CN']
]);

const settings = fromEntries(map);
console.log(settings); 
// { theme: 'dark', language: 'zh-CN' }
```

<a id="assign"></a>
### assign(target, ...sources)

将所有可枚举属性的值从一个或多个源对象复制到目标对象。

**参数:**
- `target` `{Object}`: 目标对象
- `...sources` `{...Object}`: 源对象

**返回:**
- `{Object}`: 目标对象

**示例:**
```js
import { assign } from '@stratix/utils/object';

const defaults = {
  theme: 'light',
  fontSize: 14,
  showSidebar: true
};

const userSettings = {
  theme: 'dark',
  fontSize: 16
};

// 合并设置
const settings = assign({}, defaults, userSettings);
console.log(settings); 
// { theme: 'dark', fontSize: 16, showSidebar: true }

// 多个源对象
const moreSettings = {
  showSidebar: false,
  animations: true
};

const finalSettings = assign({}, defaults, userSettings, moreSettings);
console.log(finalSettings); 
// { theme: 'dark', fontSize: 16, showSidebar: false, animations: true }
```

<a id="assigndeep"></a>
### assignDeep(target, ...sources)

深度合并对象，将嵌套对象的所有可枚举属性从一个或多个源对象复制到目标对象。

**参数:**
- `target` `{Object}`: 目标对象
- `...sources` `{...Object}`: 源对象

**返回:**
- `{Object}`: 目标对象

**示例:**
```js
import { assignDeep } from '@stratix/utils/object';

const defaults = {
  theme: 'light',
  display: {
    sidebar: true,
    toolbar: true
  },
  notifications: {
    email: false,
    push: true
  }
};

const userSettings = {
  theme: 'dark',
  display: {
    sidebar: false
  },
  notifications: {
    email: true
  }
};

// 深度合并
const settings = assignDeep({}, defaults, userSettings);
console.log(settings);
/*
{
  theme: 'dark',
  display: {
    sidebar: false,
    toolbar: true
  },
  notifications: {
    email: true,
    push: true
  }
}
*/
```

<a id="defaults"></a>
### defaults(object, ...sources)

为对象中未定义的属性分配默认值。

**参数:**
- `object` `{Object}`: 目标对象
- `...sources` `{...Object}`: 默认值对象

**返回:**
- `{Object}`: 目标对象

**示例:**
```js
import { defaults } from '@stratix/utils/object';

const options = {
  title: '我的应用',
  width: 800
};

defaults(options, {
  title: '默认应用',
  width: 600,
  height: 400,
  theme: 'light'
});

console.log(options);
/*
{
  title: '我的应用', // 保持不变，因为已经定义
  width: 800,       // 保持不变，因为已经定义
  height: 400,      // 添加默认值
  theme: 'light'    // 添加默认值
}
*/
```

<a id="mapvalues"></a>
### mapValues(object, iteratee)

创建一个新对象，对象的值是通过运行原对象值的迭代函数而产生的。

**参数:**
- `object` `{Object}`: 要迭代的对象
- `iteratee` `{Function}`: 迭代函数，接收(value, key, object)作为参数

**返回:**
- `{Object}`: 新对象

**示例:**
```js
import { mapValues } from '@stratix/utils/object';

const users = {
  'user1': { name: '张三', age: 30 },
  'user2': { name: '李四', age: 25 },
  'user3': { name: '王五', age: 40 }
};

// 提取每个用户的名字
const names = mapValues(users, user => user.name);
console.log(names);
// { user1: '张三', user2: '李四', user3: '王五' }

// 计算每个用户5年后的年龄
const futureAges = mapValues(users, user => ({
  name: user.name,
  age: user.age + 5
}));
console.log(futureAges);
/*
{
  user1: { name: '张三', age: 35 },
  user2: { name: '李四', age: 30 },
  user3: { name: '王五', age: 45 }
}
*/
```

<a id="mapkeys"></a>
### mapKeys(object, iteratee)

创建一个新对象，对象的键是通过运行原对象键的迭代函数而产生的。

**参数:**
- `object` `{Object}`: 要迭代的对象
- `iteratee` `{Function}`: 迭代函数，接收(value, key, object)作为参数

**返回:**
- `{Object}`: 新对象

**示例:**
```js
import { mapKeys } from '@stratix/utils/object';

const files = {
  'file1.txt': { size: 100, type: 'text' },
  'file2.jpg': { size: 2048, type: 'image' },
  'file3.pdf': { size: 1024, type: 'document' }
};

// 移除文件名中的扩展名
const filesByName = mapKeys(files, (value, key) => {
  return key.split('.')[0];
});
console.log(filesByName);
/*
{
  'file1': { size: 100, type: 'text' },
  'file2': { size: 2048, type: 'image' },
  'file3': { size: 1024, type: 'document' }
}
*/

// 根据文件类型创建键
const filesByType = mapKeys(files, (value, key) => {
  return `${value.type}_${key}`;
});
console.log(filesByType);
/*
{
  'text_file1.txt': { size: 100, type: 'text' },
  'image_file2.jpg': { size: 2048, type: 'image' },
  'document_file3.pdf': { size: 1024, type: 'document' }
}
*/
```

<a id="transform"></a>
### transform(object, iteratee, accumulator)

对象的 reduce 操作，将对象转换为新的累加值。

**参数:**
- `object` `{Object}`: 要迭代的对象
- `iteratee` `{Function}`: 迭代函数，接收(accumulator, value, key, object)作为参数
- `accumulator` `{*}`: 初始累加值

**返回:**
- `{*}`: 累加结果

**示例:**
```js
import { transform } from '@stratix/utils/object';

const files = {
  'file1.txt': { size: 100, type: 'text' },
  'file2.jpg': { size: 2048, type: 'image' },
  'file3.pdf': { size: 1024, type: 'document' }
};

// 按类型分组文件
const groupedFiles = transform(files, (result, value, key) => {
  const type = value.type;
  if (!result[type]) {
    result[type] = [];
  }
  result[type].push({ name: key, ...value });
}, {});

console.log(groupedFiles);
/*
{
  text: [
    { name: 'file1.txt', size: 100, type: 'text' }
  ],
  image: [
    { name: 'file2.jpg', size: 2048, type: 'image' }
  ],
  document: [
    { name: 'file3.pdf', size: 1024, type: 'document' }
  ]
}
*/

// 计算所有文件的总大小
const totalSize = transform(files, (total, file) => {
  return total + file.size;
}, 0);

console.log(totalSize); // 3172
```

<a id="isempty"></a>
### isEmpty(value)

检查值是否为空对象、集合、映射或集合。

**参数:**
- `value` `{*}`: 要检查的值

**返回:**
- `{boolean}`: 如果值为空，则返回true，否则返回false

**示例:**
```js
import { isEmpty } from '@stratix/utils/object';

console.log(isEmpty({})); // true
console.log(isEmpty([])); // true
console.log(isEmpty('')); // true
console.log(isEmpty(null)); // true
console.log(isEmpty(undefined)); // true

console.log(isEmpty({ a: 1 })); // false
console.log(isEmpty([1, 2])); // false
console.log(isEmpty('text')); // false
console.log(isEmpty(0)); // false
console.log(isEmpty(false)); // false

// 对于 Map 和 Set
console.log(isEmpty(new Map())); // true
console.log(isEmpty(new Set())); // true
console.log(isEmpty(new Map([['key', 'value']]))); // false
console.log(isEmpty(new Set([1, 2]))); // false
```

<a id="isequal"></a>
### isEqual(value, other)

执行深度比较，确定两个值是否相等。

**参数:**
- `value` `{*}`: 要比较的值
- `other` `{*}`: 要比较的另一个值

**返回:**
- `{boolean}`: 如果值相等，则返回true，否则返回false

**示例:**
```js
import { isEqual } from '@stratix/utils/object';

// 基本类型
console.log(isEqual(1, 1)); // true
console.log(isEqual('a', 'a')); // true
console.log(isEqual(true, true)); // true
console.log(isEqual(null, null)); // true
console.log(isEqual(undefined, undefined)); // true

console.log(isEqual(1, '1')); // false
console.log(isEqual(null, undefined)); // false

// 对象
const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { a: 1, b: { c: 2 } };
const obj3 = { a: 1, b: { c: 3 } };

console.log(isEqual(obj1, obj2)); // true
console.log(isEqual(obj1, obj3)); // false

// 数组
console.log(isEqual([1, 2, [3, 4]], [1, 2, [3, 4]])); // true
console.log(isEqual([1, 2, [3, 4]], [1, 2, [3, 5]])); // false

// 日期
const date1 = new Date('2023-01-01');
const date2 = new Date('2023-01-01');
const date3 = new Date('2023-02-01');

console.log(isEqual(date1, date2)); // true
console.log(isEqual(date1, date3)); // false
```

<a id="deepmerge"></a>
### deepMerge(target, ...sources)

深度合并对象，将嵌套属性从一个或多个源对象复制到目标对象。

**参数:**
- `target` `{Object}`: 目标对象
- `...sources` `{...Object}`: 源对象

**返回:**
- `{Object}`: 合并后的目标对象

**示例:**
```js
import { deepMerge } from '@stratix/utils/object';

const defaults = {
  theme: 'light',
  display: {
    sidebar: true,
    toolbar: true
  },
  notifications: {
    email: false,
    push: true
  }
};

const userSettings = {
  theme: 'dark',
  display: {
    sidebar: false
  },
  notifications: {
    email: true
  }
};

// 深度合并
const settings = deepMerge({}, defaults, userSettings);
console.log(settings);
/*
{
  theme: 'dark',
  display: {
    sidebar: false,
    toolbar: true
  },
  notifications: {
    email: true,
    push: true
  }
}
*/
```

<a id="deepclone"></a>
### deepClone(obj)

创建对象的深拷贝。

**参数:**
- `obj` `{*}`: 要深拷贝的对象

**返回:**
- `{*}`: 深拷贝后的对象

**示例:**
```js
import { deepClone } from '@stratix/utils/object';

const original = {
  name: '张三',
  address: {
    city: '北京',
    street: '中关村'
  },
  hobbies: ['阅读', '游泳']
};

// 创建深拷贝
const copy = deepClone(original);
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

<a id="pick"></a>
### pick(obj, keys)

创建一个从对象中选取指定属性的新对象。

**参数:**
- `obj` `{Object}`: 源对象
- `keys` `{Array}`: 要选取的属性键数组

**返回:**
- `{Object}`: 包含选定属性的新对象

**示例:**
```js
import { pick } from '@stratix/utils/object';

const user = {
  id: 1,
  name: '张三',
  age: 30,
  email: 'zhangsan@example.com',
  password: 'secret123'
};

// 选取多个属性
console.log(pick(user, ['id', 'name', 'email'])); 
// { id: 1, name: '张三', email: 'zhangsan@example.com' }
```

<a id="omit"></a>
### omit(obj, keys)

创建一个从对象中排除指定属性的新对象。

**参数:**
- `obj` `{Object}`: 源对象
- `keys` `{Array}`: 要排除的属性键数组

**返回:**
- `{Object}`: 不包含排除属性的新对象

**示例:**
```js
import { omit } from '@stratix/utils/object';

const user = {
  id: 1,
  name: '张三',
  age: 30,
  email: 'zhangsan@example.com',
  password: 'secret123'
};

// 排除敏感信息
console.log(omit(user, ['password'])); 
// { id: 1, name: '张三', age: 30, email: 'zhangsan@example.com' }

// 排除多个属性
console.log(omit(user, ['password', 'id'])); 
// { name: '张三', age: 30, email: 'zhangsan@example.com' }
``` 