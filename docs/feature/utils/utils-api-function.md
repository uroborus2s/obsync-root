# @stratix/utils/function 函数工具函数文档

本模块提供了一系列用于处理函数的实用工具，可帮助开发者控制函数执行、优化性能、创建函数组合和转换函数调用方式等。

## 目录

- [@stratix/utils/function 函数工具函数文档](#stratixutilsfunction-函数工具函数文档)
  - [目录](#目录)
  - [函数详情](#函数详情)
    - [once(func)](#oncefunc)
    - [memoize(func, resolver)](#memoizefunc-resolver)
    - [compose(...funcs)](#composefuncs)
    - [pipe(...funcs)](#pipefuncs)
    - [composeAsync(...funcs)](#composeasyncfuncs)
    - [pipeAsync(...funcs)](#pipeasyncfuncs)
    - [curry(func, arity)](#curryfunc-arity)
    - [partial(func, ...partials)](#partialfunc-partials)
    - [negate(func)](#negatefunc)
    - [delay(func, wait, ...args)](#delayfunc-wait-args)
    - [defer(func, ...args)](#deferfunc-args)
    - [after(n, func)](#aftern-func)
    - [before(n, func)](#beforen-func)
    - [ary(func, n)](#aryfunc-n)
    - [unary(func)](#unaryfunc)
    - [identity(value)](#identityvalue)
    - [noop()](#noop)

## 函数详情

<a id="once"></a>
### once(func)

创建一个只执行一次的函数，后续调用返回第一次执行的结果。

**参数:**
- `func` `{Function}`: 要限制执行次数的函数

**返回:**
- `{Function}`: 包装后的函数

**示例:**
```js
import { once } from '@stratix/utils/function';

// 创建一个只执行一次的初始化函数
const initialize = once(() => {
  console.log('系统初始化');
  return { status: 'ready' };
});

// 第一次调用会执行函数
const result1 = initialize();
console.log(result1); // { status: 'ready' }

// 后续调用返回第一次的结果，不会重新执行
const result2 = initialize();
console.log(result2); // { status: 'ready' }

// 即使传入参数，也不会重新执行
const result3 = initialize('新参数');
console.log(result3); // { status: 'ready' }
```

<a id="memoize"></a>
### memoize(func, resolver)

创建一个会缓存结果的函数。

**参数:**
- `func` `{Function}`: 要缓存结果的函数
- `resolver` `{Function}`: (可选) 参数解析器，用于生成缓存键

**返回:**
- `{Function}`: 包装后的函数

**示例:**
```js
import { memoize } from '@stratix/utils/function';

// 创建一个费时的计算函数
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 创建缓存版本
const memoizedFib = memoize(fibonacci);

console.time('第一次计算');
memoizedFib(35); // 首次计算，缓存结果
console.timeEnd('第一次计算');

console.time('第二次计算');
memoizedFib(35); // 从缓存中获取结果
console.timeEnd('第二次计算');

// 使用自定义解析器
const getUserById = (id, api) => {
  console.log(`从 ${api} 获取用户 ${id}`);
  // 实际应用中这里会发起API请求
  return { id, name: `用户${id}` };
};

// 只使用id作为缓存键，忽略api参数
const memoizedGetUser = memoize(getUserById, (id) => id);

memoizedGetUser(42, 'api.example.com');
// 输出: "从 api.example.com 获取用户 42"

memoizedGetUser(42, 'api2.example.com');
// 不会再次获取，使用缓存结果
```

<a id="compose"></a>
### compose(...funcs)

从右到左组合函数，前一个函数的返回值作为后一个函数的参数。

**参数:**
- `...funcs` `{...Function}`: 要组合的函数

**返回:**
- `{Function}`: 组合后的函数

**示例:**
```js
import { compose } from '@stratix/utils/function';

// 示例函数
const double = x => x * 2;
const square = x => x * x;
const addOne = x => x + 1;

// 组合函数: (x + 1)²
const addOneThenSquare = compose(square, addOne);
console.log(addOneThenSquare(3)); // 16

// 可以组合多个函数
const complexCalc = compose(addOne, double, square);
// 等价于 addOne(double(square(x)))
console.log(complexCalc(3)); // 19 (3² = 9, 9*2 = 18, 18+1 = 19)
```

<a id="pipe"></a>
### pipe(...funcs)

从左到右组合函数，前一个函数的返回值作为后一个函数的参数。

**参数:**
- `...funcs` `{...Function}`: 要组合的函数

**返回:**
- `{Function}`: 组合后的函数

**示例:**
```js
import { pipe } from '@stratix/utils/function';

// 示例函数
const double = x => x * 2;
const square = x => x * x;
const addOne = x => x + 1;

// 从左到右执行
const calculation = pipe(addOne, square, double);
// 等价于 double(square(addOne(x)))
console.log(calculation(3)); // 32 (3+1 = 4, 4² = 16, 16*2 = 32)

// 数据处理流程示例
const processUserData = pipe(
  user => ({ ...user, lastLogin: new Date() }),           // 添加登录日期
  user => ({ ...user, name: user.name.toUpperCase() }),   // 转换名称为大写
  user => ({ ...user, displayName: `${user.name} (${user.role})` }) // 生成显示名称
);

const user = { name: '张三', role: '管理员' };
console.log(processUserData(user));
/* 输出:
{
  name: '张三',
  role: '管理员',
  lastLogin: Date,
  name: '张三',
  displayName: '张三 (管理员)'
}
*/
```

<a id="composeasync"></a>
### composeAsync(...funcs)

从右到左组合函数，支持异步函数，前一个函数的返回值作为后一个函数的参数。

**参数:**
- `...funcs` `{...Function}`: 要组合的函数，可以包含返回Promise的函数

**返回:**
- `{Function}`: 组合后的异步函数，返回Promise

**示例:**
```js
import { composeAsync } from '@stratix/utils/function';

// 异步函数示例
const fetchUserData = async (id) => {
  // 模拟API请求
  console.log(`获取用户 ${id} 数据`);
  return { id, name: `用户${id}`, role: '普通用户' };
};

const attachPermissions = async (user) => {
  // 模拟权限查询
  console.log(`为 ${user.name} 附加权限`);
  return { 
    ...user, 
    permissions: user.role === '管理员' ? ['read', 'write', 'admin'] : ['read'] 
  };
};

const formatUserProfile = async (user) => {
  console.log(`格式化 ${user.name} 的资料`);
  return {
    ...user,
    formattedName: `${user.name} (${user.permissions.join(',')})`
  };
};

// 从右到左组合异步函数
const processUser = composeAsync(
  formatUserProfile,
  attachPermissions,
  fetchUserData
);

// 使用异步函数
async function run() {
  const result = await processUser(42);
  console.log('最终结果:', result);
}

run();
// 输出:
// 获取用户 42 数据
// 为 用户42 附加权限
// 格式化 用户42 的资料
// 最终结果: { id: 42, name: '用户42', role: '普通用户', permissions: ['read'], formattedName: '用户42 (read)' }
```

<a id="pipeasync"></a>
### pipeAsync(...funcs)

从左到右组合函数，支持异步函数，前一个函数的返回值作为后一个函数的参数。

**参数:**
- `...funcs` `{...Function}`: 要组合的函数，可以包含返回Promise的函数

**返回:**
- `{Function}`: 组合后的异步函数，返回Promise

**示例:**
```js
import { pipeAsync } from '@stratix/utils/function';

// 异步数据处理函数
const validateUser = async (userData) => {
  console.log('验证用户数据');
  if (!userData.email) {
    throw new Error('邮箱不能为空');
  }
  return userData;
};

const normalizeData = async (userData) => {
  console.log('规范化用户数据');
  return {
    ...userData,
    email: userData.email.toLowerCase(),
    name: userData.name.trim()
  };
};

const saveToDatabase = async (userData) => {
  console.log('保存到数据库');
  // 模拟数据库操作
  return {
    ...userData,
    id: Math.floor(Math.random() * 1000),
    createdAt: new Date()
  };
};

// 从左到右组合异步函数
const createUser = pipeAsync(
  validateUser,
  normalizeData,
  saveToDatabase
);

// 使用组合后的异步函数
async function registerUser(userData) {
  try {
    const newUser = await createUser(userData);
    console.log('用户创建成功:', newUser);
    return newUser;
  } catch (error) {
    console.error('创建用户失败:', error.message);
    return null;
  }
}

registerUser({ name: ' 张三 ', email: 'ZHANG@example.com' });
// 输出:
// 验证用户数据
// 规范化用户数据
// 保存到数据库
// 用户创建成功: { name: '张三', email: 'zhang@example.com', id: 123, createdAt: Date }
```

<a id="curry"></a>
### curry(func, arity)

创建一个柯里化函数，可以分多次传入参数。

**参数:**
- `func` `{Function}`: 要柯里化的函数
- `arity` `{number}`: (可选) 参数数量，默认为func.length

**返回:**
- `{Function}`: 柯里化后的函数

**示例:**
```js
import { curry } from '@stratix/utils/function';

// 普通函数
function add(a, b, c) {
  return a + b + c;
}

// 柯里化
const curriedAdd = curry(add);

// 以下调用方式都有效
console.log(curriedAdd(1)(2)(3));     // 6
console.log(curriedAdd(1, 2)(3));     // 6
console.log(curriedAdd(1)(2, 3));     // 6
console.log(curriedAdd(1, 2, 3));     // 6

// 实际应用示例：筛选函数
const filter = curry(function(predicate, array) {
  return array.filter(predicate);
});

// 创建特定的筛选器
const getPositives = filter(x => x > 0);
const getEvens = filter(x => x % 2 === 0);

console.log(getPositives([-3, -2, -1, 0, 1, 2, 3])); // [1, 2, 3]
console.log(getEvens([1, 2, 3, 4, 5, 6]));          // [2, 4, 6]
```

<a id="partial"></a>
### partial(func, ...partials)

创建一个预设了部分参数的函数。

**参数:**
- `func` `{Function}`: 要预设参数的函数
- `...partials` `{...any}`: 预设的参数

**返回:**
- `{Function}`: 包装后的函数

**示例:**
```js
import { partial } from '@stratix/utils/function';

function greet(greeting, name) {
  return `${greeting}, ${name}!`;
}

// 预设第一个参数
const sayHello = partial(greet, '你好');
console.log(sayHello('张三')); // "你好, 张三!"

// 预设多个参数
function request(url, method, data) {
  return `${method} ${url} ${JSON.stringify(data)}`;
}

// 创建特定API请求函数
const getUserAPI = partial(request, '/api/users', 'GET');
console.log(getUserAPI({ id: 123 })); // "GET /api/users {"id":123}"

const createUserAPI = partial(request, '/api/users', 'POST');
console.log(createUserAPI({ name: '张三' })); // "POST /api/users {"name":"张三"}"
```

<a id="negate"></a>
### negate(func)

创建一个结果取反的函数。

**参数:**
- `func` `{Function}`: 要取反的函数

**返回:**
- `{Function}`: 取反后的函数

**示例:**
```js
import { negate } from '@stratix/utils/function';

// 检查数字是否为偶数
const isEven = num => num % 2 === 0;

// 创建检查数字是否为奇数的函数
const isOdd = negate(isEven);

console.log(isEven(4)); // true
console.log(isOdd(4));  // false
console.log(isEven(5)); // false
console.log(isOdd(5));  // true

// 实际应用：过滤非空字符串
const isEmpty = str => !str || str.trim() === '';
const isNotEmpty = negate(isEmpty);

const strings = ['', 'hello', '   ', 'world', null, undefined];
const nonEmptyStrings = strings.filter(isNotEmpty);
console.log(nonEmptyStrings); // ['hello', 'world']
```

<a id="delay"></a>
### delay(func, wait, ...args)

延迟一定时间后调用函数。

**参数:**
- `func` `{Function}`: 要延迟的函数
- `wait` `{number}`: 延迟时间（毫秒）
- `...args` `{...any}`: 调用函数的参数

**返回:**
- `{number}`: 定时器ID

**示例:**
```js
import { delay } from '@stratix/utils/function';

// 简单延迟
delay(() => {
  console.log('3秒后执行');
}, 3000);

// 带参数的延迟
delay((name, message) => {
  console.log(`${name}: ${message}`);
}, 2000, '系统通知', '操作已完成');

// 取消延迟执行
const timerId = delay(() => {
  console.log('这条消息不会显示');
}, 5000);

// 在定时器触发前取消
clearTimeout(timerId);
```

<a id="defer"></a>
### defer(func, ...args)

推迟到当前调用栈清空后执行函数。

**参数:**
- `func` `{Function}`: 要推迟的函数
- `...args` `{...any}`: 调用函数的参数

**返回:**
- `{number}`: 定时器ID

**示例:**
```js
import { defer } from '@stratix/utils/function';

console.log('开始');

defer(() => {
  console.log('推迟执行');
});

console.log('结束');

// 输出顺序：
// 开始
// 结束
// 推迟执行

// 带参数的调用
defer((a, b) => {
  console.log(`计算结果: ${a + b}`);
}, 5, 10);
// 最后输出: "计算结果: 15"
```

<a id="after"></a>
### after(n, func)

创建一个函数，在调用 n 次之后执行原函数。

**参数:**
- `n` `{number}`: 需要调用的次数
- `func` `{Function}`: 延迟执行的函数

**返回:**
- `{Function}`: 包装后的函数

**示例:**
```js
import { after } from '@stratix/utils/function';

// 创建一个函数，在调用3次后才执行
const executeAfterThreeCalls = after(3, () => {
  console.log('三次调用后执行');
  return '执行完成';
});

console.log(executeAfterThreeCalls()); // undefined
console.log(executeAfterThreeCalls()); // undefined
console.log(executeAfterThreeCalls()); // "三次调用后执行" 并返回 "执行完成"
console.log(executeAfterThreeCalls()); // "执行完成" (再次执行)

// 实际应用：多个异步操作完成后执行
function loadApplication() {
  let assetsLoaded = 0;
  const totalAssets = 3; // 配置、用户数据、UI资源
  
  const onAllAssetsLoaded = after(totalAssets, () => {
    console.log('所有资源加载完成，启动应用');
    startApp();
  });
  
  loadConfig().then(() => {
    console.log('配置加载完成');
    onAllAssetsLoaded();
  });
  
  loadUserData().then(() => {
    console.log('用户数据加载完成');
    onAllAssetsLoaded();
  });
  
  loadUIResources().then(() => {
    console.log('UI资源加载完成');
    onAllAssetsLoaded();
  });
}
```

<a id="before"></a>
### before(n, func)

创建一个函数，在调用 n 次之前执行原函数，之后返回最后一次调用的结果。

**参数:**
- `n` `{number}`: 限制的调用次数
- `func` `{Function}`: 要限制执行的函数

**返回:**
- `{Function}`: 包装后的函数

**示例:**
```js
import { before } from '@stratix/utils/function';

// 创建一个最多执行5次的函数
const limitedLog = before(5, (message) => {
  console.log(`消息: ${message}`);
  return `已记录: ${message}`;
});

for (let i = 1; i <= 10; i++) {
  const result = limitedLog(`调用 ${i}`);
  console.log(`返回: ${result}`);
}

// 输出:
// 消息: 调用 1
// 返回: 已记录: 调用 1
// ...
// 消息: 调用 4
// 返回: 已记录: 调用 4
// 返回: 已记录: 调用 4  (第5-10次调用都返回最后一次执行的结果)

// 实际应用：限制API调用次数
const fetchDataWithLimit = before(3, (url) => {
  console.log(`向 ${url} 发起请求`);
  return fetch(url).then(response => response.json());
});
```

<a id="ary"></a>
### ary(func, n)

创建一个调用 func 的函数，该函数最多接受 n 个参数，忽略多余的参数。

**参数:**
- `func` `{Function}`: 要限制参数的函数
- `n` `{number}`: 允许的参数数量

**返回:**
- `{Function}`: 包装后的函数

**示例:**
```js
import { ary } from '@stratix/utils/function';

// 创建一个最多接受2个参数的函数
function log(...args) {
  console.log('接收到参数:', args);
  return args;
}

const limitedLog = ary(log, 2);

console.log(limitedLog(1, 2, 3, 4, 5));
// 输出: "接收到参数: [1, 2]"
// 返回: [1, 2]

// 实际应用：处理回调函数中不需要的参数
const numbers = ['1', '2', '3', '4'];

// parseInt的第二个参数是进制，在map中会收到索引参数导致错误解析
console.log(numbers.map(parseInt)); 
// [1, NaN, NaN, NaN]

// 限制为只接收一个参数
console.log(numbers.map(ary(parseInt, 1))); 
// [1, 2, 3, 4]
```

<a id="unary"></a>
### unary(func)

创建一个最多接受一个参数的函数，忽略多余的参数。

**参数:**
- `func` `{Function}`: 要限制参数的函数

**返回:**
- `{Function}`: 包装后的函数

**示例:**
```js
import { unary } from '@stratix/utils/function';

function log(...args) {
  console.log('接收到参数:', args);
  return args[0];
}

const singleArgLog = unary(log);

console.log(singleArgLog(1, 2, 3));
// 输出: "接收到参数: [1]"
// 返回: 1

// 实际应用：解析数字数组
const numbers = ['1', '2', '3', '4'];

// 标准方式会错误地将索引作为第二个参数传给parseInt
console.log(numbers.map(parseInt)); 
// [1, NaN, NaN, NaN]

// 使用unary解决
console.log(numbers.map(unary(parseInt))); 
// [1, 2, 3, 4]
```

<a id="identity"></a>
### identity(value)

返回传入的第一个参数。

**参数:**
- `value` `{*}`: 任意值

**返回:**
- `{*}`: 输入的值

**示例:**
```js
import { identity } from '@stratix/utils/function';

console.log(identity(5)); // 5
console.log(identity('hello')); // "hello"
console.log(identity({ name: '张三' })); // { name: '张三' }

// 实际应用：作为默认转换函数
function transform(array, transformer = identity) {
  return array.map(transformer);
}

console.log(transform([1, 2, 3])); 
// [1, 2, 3]

console.log(transform([1, 2, 3], x => x * 2)); 
// [2, 4, 6]

// 用作属性选择器
const users = [
  { id: 1, name: '张三' },
  { id: 2, name: '李四' },
  { id: 3, name: '王五' }
];

const userIds = users.map(user => user.id);
// 等价于
const userIdsAlt = users.map(user => identity(user.id));
```

<a id="noop"></a>
### noop()

返回 undefined，无论传入什么参数。

**参数:**
- 无

**返回:**
- `{undefined}`: 始终返回undefined

**示例:**
```js
import { noop } from '@stratix/utils/function';

console.log(noop()); // undefined
console.log(noop(1, 2, 3)); // undefined
console.log(noop('hello')); // undefined

// 实际应用：作为默认回调
function fetchData(url, onSuccess, onError = noop) {
  try {
    // 模拟请求
    const data = { result: 'success' };
    onSuccess(data);
  } catch (error) {
    // 如果没有提供错误处理，则不执行任何操作
    onError(error);
  }
}

// 不提供错误处理回调
fetchData('/api/data', (data) => {
  console.log('获取数据成功:', data);
});

// 占位符参数
function createComponent(options = {}) {
  const { 
    init = noop,
    render,
    destroy = noop
  } = options;
  
  // 即使用户没有提供init或destroy方法，也可以安全调用
  init();
  render();
  // 组件销毁时
  destroy();
}
``` 