# @stratix/utils/async 异步工具函数文档

本模块提供了一系列用于处理异步操作的实用函数，可帮助开发者更高效地管理异步流程、控制并发和处理常见的异步模式。

## 目录

- [@stratix/utils/async 异步工具函数文档](#stratixutilsasync-异步工具函数文档)
  - [目录](#目录)
  - [函数详情](#函数详情)
    - [sleep(ms)](#sleepms)
    - [retry(fn, options)](#retryfn-options)
    - [timeout(promise, ms, message)](#timeoutpromise-ms-message)
    - [promisify(fn)](#promisifyfn)
    - [parallelLimit(tasks, limit)](#parallellimittasks-limit)
    - [throttle(fn, wait)](#throttlefn-wait)
    - [debounce(fn, wait)](#debouncefn-wait)
    - [waterfall(tasks)](#waterfalltasks)
    - [pMap(array, mapper, options)](#pmaparray-mapper-options)
    - [asyncPool(limit, array, iteratee)](#asyncpoollimit-array-iteratee)
    - [asyncify(fn)](#asyncifyfn)
    - [asyncifyAll(obj)](#asyncifyallobj)
    - [queue(worker, concurrency)](#queueworker-concurrency)

## 函数详情

<a id="sleep"></a>
### sleep(ms)

创建一个在指定时间后解析的Promise，用于延迟执行。

**参数:**
- `ms` `{number}`: 延迟的毫秒数

**返回:**
- `{Promise<void>}`: 在指定毫秒数后解析的Promise

**示例:**
```js
import { sleep } from '@stratix/utils/async';

async function example() {
  console.log('开始');
  await sleep(1000); // 暂停1秒
  console.log('1秒后继续');
}
```

<a id="retry"></a>
### retry(fn, options)

重试异步函数直到成功或达到最大尝试次数。

**参数:**
- `fn` `{Function}`: 要重试的异步函数
- `options` `{Object}`: 配置选项
  - `retries` `{number}`: 最大重试次数，默认为3
  - `delay` `{number}`: 重试之间的延迟（毫秒），默认为1000
  - `factor` `{number}`: 延迟时间的增长因子，默认为1（不增长）
  - `onRetry` `{Function}`: 每次重试前调用的函数，接收错误和尝试次数

**返回:**
- `{Promise<any>}`: 返回异步函数成功执行的结果

**示例:**
```js
import { retry } from '@stratix/utils/async';

async function fetchData() {
  // 可能失败的网络请求
  return fetch('https://api.example.com/data');
}

// 使用默认选项重试
const result = await retry(fetchData);

// 使用自定义选项重试
const resultWithOptions = await retry(fetchData, {
  retries: 5,
  delay: 2000,
  factor: 2,
  onRetry: (error, attempt) => {
    console.log(`尝试 ${attempt} 失败: ${error.message}`);
  }
});
```

<a id="timeout"></a>
### timeout(promise, ms, message)

为Promise添加超时限制，如果Promise在指定时间内未完成，则拒绝。

**参数:**
- `promise` `{Promise}`: 要添加超时的Promise
- `ms` `{number}`: 超时时间（毫秒）
- `message` `{string}`: （可选）超时错误消息

**返回:**
- `{Promise}`: 如果原Promise在超时前完成，则返回其结果；否则抛出超时错误

**示例:**
```js
import { timeout } from '@stratix/utils/async';

async function fetchWithTimeout() {
  try {
    const result = await timeout(
      fetch('https://api.example.com/data'),
      5000,
      '请求超时'
    );
    return await result.json();
  } catch (error) {
    console.error(error);
    // 处理超时或其他错误
  }
}
```

<a id="promisify"></a>
### promisify(fn)

将回调风格的函数转换为返回Promise的函数。

**参数:**
- `fn` `{Function}`: 遵循Node.js回调模式的函数（最后一个参数为(err, result) => {}）

**返回:**
- `{Function}`: 返回Promise的函数

**示例:**
```js
import { promisify } from '@stratix/utils/async';
import fs from 'fs';

// 转换fs.readFile为Promise版本
const readFile = promisify(fs.readFile);

async function readConfig() {
  try {
    const data = await readFile('config.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取文件失败:', error);
  }
}
```

<a id="parallellimit"></a>
### parallelLimit(tasks, limit)

并行执行异步任务，但限制最大并发数。

**参数:**
- `tasks` `{Array<Function>}`: 返回Promise的函数数组
- `limit` `{number}`: 最大并发数

**返回:**
- `{Promise<Array>}`: 包含所有任务结果的Promise

**示例:**
```js
import { parallelLimit } from '@stratix/utils/async';

const tasks = [
  () => fetch('https://api.example.com/1').then(r => r.json()),
  () => fetch('https://api.example.com/2').then(r => r.json()),
  () => fetch('https://api.example.com/3').then(r => r.json()),
  () => fetch('https://api.example.com/4').then(r => r.json()),
  () => fetch('https://api.example.com/5').then(r => r.json())
];

// 最多同时执行2个请求
const results = await parallelLimit(tasks, 2);
console.log(results); // 所有请求的结果数组
```

<a id="throttle"></a>
### throttle(fn, wait)

创建一个节流函数，限制函数执行频率。

**参数:**
- `fn` `{Function}`: 要节流的函数
- `wait` `{number}`: 执行间隔（毫秒）
- `options` `{Object}`: （可选）配置选项
  - `leading` `{boolean}`: 是否在节流开始前调用，默认为true
  - `trailing` `{boolean}`: 是否在节流结束后调用，默认为true

**返回:**
- `{Function}`: 节流后的函数，包含cancel和flush方法

**示例:**
```js
import { throttle } from '@stratix/utils/async';

// 创建一个最多每200ms执行一次的函数
const throttledScroll = throttle(() => {
  console.log('滚动事件处理');
}, 200);

// 使用自定义选项
const throttledResize = throttle(
  () => {
    console.log('调整大小事件处理');
  }, 
  300, 
  { leading: false, trailing: true }
);

// 添加事件监听器
window.addEventListener('scroll', throttledScroll);
window.addEventListener('resize', throttledResize);

// 取消等待执行
throttledScroll.cancel();
```

<a id="debounce"></a>
### debounce(fn, wait)

创建一个防抖函数，延迟函数执行，直到停止调用指定时间后才执行。

**参数:**
- `fn` `{Function}`: 要防抖的函数
- `wait` `{number}`: 等待时间（毫秒）
- `options` `{Object}`: （可选）配置选项
  - `leading` `{boolean}`: 是否在延迟开始前调用，默认为false
  - `trailing` `{boolean}`: 是否在延迟结束后调用，默认为true
  - `maxWait` `{number}`: 最大等待时间，默认为0（无限制）

**返回:**
- `{Function}`: 防抖后的函数，包含cancel、flush和pending方法

**示例:**
```js
import { debounce } from '@stratix/utils/async';

// 创建一个在停止输入500ms后才执行的搜索函数
const debouncedSearch = debounce((query) => {
  console.log(`搜索: ${query}`);
  // 执行搜索逻辑
}, 500);

// 使用自定义选项，确保最多等待1000ms就执行一次
const debouncedSave = debounce(
  () => {
    console.log('保存数据');
  },
  300,
  { maxWait: 1000 }
);

// 在输入框变化时调用
searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});

// 取消等待执行
debouncedSearch.cancel();
```

<a id="waterfall"></a>
### waterfall(tasks)

按顺序执行异步函数，每个函数的结果作为下一个函数的输入。

**参数:**
- `tasks` `{Array<Function>}`: 异步函数数组，每个函数接收前一个函数的结果

**返回:**
- `{Promise<any>}`: 最后一个任务的结果

**示例:**
```js
import { waterfall } from '@stratix/utils/async';

const tasks = [
  // 第一个函数没有参数
  () => fetch('https://api.example.com/user').then(r => r.json()),
  
  // 第二个函数使用第一个函数的结果
  (user) => fetch(`https://api.example.com/posts?userId=${user.id}`).then(r => r.json()),
  
  // 第三个函数使用第二个函数的结果
  (posts) => {
    const latestPost = posts[0];
    return fetch(`https://api.example.com/comments?postId=${latestPost.id}`).then(r => r.json());
  }
];

// 按顺序执行，前一个函数的结果传给下一个
const comments = await waterfall(tasks);
```

<a id="pmap"></a>
### pMap(array, mapper, options)

将数组中的每个项目映射到异步函数，并控制并发执行。

**参数:**
- `array` `{Array}`: 要映射的数组
- `mapper` `{Function}`: 异步映射函数，接收数组元素、索引和原数组
- `options` `{Object}`: 配置选项
  - `concurrency` `{number}`: 并发限制，默认为无限

**返回:**
- `{Promise<Array>}`: 映射结果的数组

**示例:**
```js
import { pMap } from '@stratix/utils/async';

const userIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 最多并发3个请求
const users = await pMap(
  userIds,
  async (id) => {
    const response = await fetch(`https://api.example.com/users/${id}`);
    return response.json();
  },
  { concurrency: 3 }
);

console.log(users); // 所有用户数据数组
```

<a id="asyncpool"></a>
### asyncPool(limit, array, iteratee)

创建一个异步池，限制并发执行任务。

**参数:**
- `limit` `{number}`: 最大并发数
- `array` `{Array}`: 输入数组
- `iteratee` `{Function}`: 异步迭代函数，应用于每个数组元素

**返回:**
- `{Promise<Array>}`: 所有任务结果的数组

**示例:**
```js
import { asyncPool } from '@stratix/utils/async';

const urls = [
  'https://api.example.com/data/1',
  'https://api.example.com/data/2',
  'https://api.example.com/data/3',
  // ...更多URL
];

// 最多同时执行5个请求
const results = await asyncPool(5, urls, async (url) => {
  const response = await fetch(url);
  return response.json();
});

console.log(results); // 所有请求结果的数组
```

<a id="asyncify"></a>
### asyncify(fn)

将同步函数转换为异步函数（返回Promise）。

**参数:**
- `fn` `{Function}`: 同步函数

**返回:**
- `{Function}`: 返回Promise的异步函数

**示例:**
```js
import { asyncify } from '@stratix/utils/async';

// 同步函数
function parseJSON(json) {
  return JSON.parse(json);
}

// 转换为异步函数
const asyncParseJSON = asyncify(parseJSON);

async function process() {
  try {
    // 现在可以使用await，并且错误会被Promise捕获
    const data = await asyncParseJSON('{"name":"张三"}');
    console.log(data.name); // 张三
  } catch (error) {
    console.error('解析错误:', error);
  }
}
```

### asyncifyAll(obj)

将同步函数转换为异步函数，并应用到对象的所有方法。

**参数:**
- `obj` `{Object}`: 包含同步方法的对象

**返回:**
- `{Object}`: 包含异步方法的新对象

**示例:**
```js
import { asyncifyAll } from '@stratix/utils/async';

// 包含多个同步方法的对象
const utils = {
  parseJSON(json) {
    return JSON.parse(json);
  },
  formatDate(date) {
    return new Date(date).toLocaleString();
  }
};

// 转换所有方法为异步方法
const asyncUtils = asyncifyAll(utils);

async function process() {
  try {
    // 现在可以对所有方法使用await
    const data = await asyncUtils.parseJSON('{"date":"2023-01-01"}');
    const formatted = await asyncUtils.formatDate(data.date);
    console.log(formatted);
  } catch (error) {
    console.error('处理错误:', error);
  }
}
```

<a id="queue"></a>
### queue(worker, concurrency)

创建一个队列，用于管理并发异步任务。

**参数:**
- `worker` `{Function}`: 处理队列任务的异步函数
- `concurrency` `{number}`: 并发执行的最大任务数

**返回:**
- `{Object}`: 队列对象，包含以下方法：
  - `push(task)`: 添加任务到队列，返回Promise，解析为任务的执行结果
  - `pushAll(tasks)`: 批量添加任务到队列，返回Promise数组，每个Promise解析为对应任务的执行结果
  - `drain()`: 返回一个Promise，在队列清空时解析
  - `pause()`: 暂停队列处理
  - `resume()`: 恢复队列处理
  - `size()`: 返回队列中待处理任务数量
  - `clear()`: 清空队列，移除所有未执行的任务

**示例:**
```js
import { queue } from '@stratix/utils/async';

// 创建一个最多同时处理2个任务的队列
const downloadQueue = queue(async (url) => {
  console.log(`开始下载: ${url}`);
  const response = await fetch(url);
  const data = await response.json();
  console.log(`下载完成: ${url}`);
  return data;
}, 2);

// 添加单个下载任务
const dataPromise = downloadQueue.push('https://api.example.com/data/1');
dataPromise.then(data => console.log('处理数据:', data));

// 批量添加多个下载任务
const promises = downloadQueue.pushAll([
  'https://api.example.com/data/2',
  'https://api.example.com/data/3',
  'https://api.example.com/data/4'
]);

// 暂停队列处理
downloadQueue.pause();

// 查看队列大小
console.log(`队列中有 ${downloadQueue.size()} 个待处理任务`);

// 恢复队列处理
downloadQueue.resume();

// 等待所有任务完成
await downloadQueue.drain();
console.log('所有下载任务已完成');

// 清空队列
downloadQueue.clear();
``` 