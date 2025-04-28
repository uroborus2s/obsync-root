# @stratix/utils/performance 性能工具函数文档

该模块提供了一系列用于性能测量、优化和分析的工具函数，帮助开发者监控和提升应用程序性能。

## 目录

- [@stratix/utils/performance 性能工具函数文档](#stratixutilsperformance-性能工具函数文档)
  - [目录](#目录)
  - [性能测量函数](#性能测量函数)
    - [measure](#measure)
    - [timer](#timer)
    - [benchmark](#benchmark)
    - [profileFn](#profilefn)
    - [profile](#profile)
  - [性能优化函数](#性能优化函数)
    - [memoize](#memoize)
    - [throttle](#throttle)
    - [debounce](#debounce)
    - [rAF](#raf)
    - [nextTick](#nexttick)
  - [资源监控函数](#资源监控函数)
    - [getMemoryUsage](#getmemoryusage)
    - [getCPUUsage](#getcpuusage)
    - [getResourceUsage](#getresourceusage)
    - [monitorPerformance](#monitorperformance)
  - [高级性能工具函数](#高级性能工具函数)
    - [asyncCache](#asynccache)
    - [batch](#batch)
    - [limitConcurrency](#limitconcurrency)

## 性能测量函数

### measure

测量函数执行时间。

```typescript
function measure<T>(fn: () => T, label?: string): T
```

**参数:**
- `fn`: 要测量的函数
- `label`: 测量标签（可选），用于在日志中标识

**返回值:**
- 函数的返回值

**示例:**

```javascript
import { measure } from '@stratix/utils/performance';

// 测量函数执行时间
const result = measure(() => {
  // 执行一些操作...
  const sum = Array(1000000).fill(1).reduce((a, b) => a + b, 0);
  return sum;
}, '计算大数组求和');

// 输出: [Performance] 计算大数组求和: 15ms
console.log(result); // 1000000
```

### timer

创建一个简单的计时器，用于测量代码块的执行时间。

```typescript
function timer(label?: string): { stop: () => number }
```

**参数:**
- `label`: 计时器标签（可选），用于在日志中标识

**返回值:**
- 一个对象，包含 `stop` 方法，调用该方法停止计时并返回经过的毫秒数

**示例:**

```javascript
import { timer } from '@stratix/utils/performance';

// 开始计时
const t = timer('数据处理');

// 执行一些操作...
const data = processLargeData();

// 停止计时并获取经过的时间
const elapsed = t.stop();
console.log(`数据处理耗时: ${elapsed}ms`);
```

### benchmark

对函数进行基准测试，多次运行并计算平均执行时间。

```typescript
function benchmark<T>(fn: () => T, iterations?: number, label?: string): BenchmarkResult<T>
```

**参数:**
- `fn`: 要测试的函数
- `iterations`: 迭代次数（可选，默认为1000）
- `label`: 测试标签（可选）

**返回值:**
- 包含以下属性的结果对象：
  - `result`: 最后一次函数调用的返回值
  - `averageTime`: 平均执行时间（毫秒）
  - `totalTime`: 总执行时间（毫秒）
  - `iterations`: 实际执行的迭代次数

**示例:**

```javascript
import { benchmark } from '@stratix/utils/performance';

// 对字符串拼接方法进行基准测试
const stringConcatTest = () => {
  let result = '';
  for (let i = 0; i < 1000; i++) {
    result += i.toString();
  }
  return result;
};

const stringJoinTest = () => {
  const array = [];
  for (let i = 0; i < 1000; i++) {
    array.push(i.toString());
  }
  return array.join('');
};

const concatResult = benchmark(stringConcatTest, 100, '字符串拼接');
const joinResult = benchmark(stringJoinTest, 100, '数组join');

console.log(`字符串拼接平均时间: ${concatResult.averageTime}ms`);
console.log(`数组join平均时间: ${joinResult.averageTime}ms`);
```

### profileFn

使用性能分析API分析函数的执行情况。

```typescript
function profileFn<T>(fn: () => T, label?: string): T
```

**参数:**
- `fn`: 要分析的函数
- `label`: 分析标签（可选）

**返回值:**
- 函数的返回值

**示例:**

```javascript
import { profileFn } from '@stratix/utils/performance';

// 分析一个计算密集型函数
const result = profileFn(() => {
  let total = 0;
  for (let i = 0; i < 1000000; i++) {
    total += Math.sqrt(i);
  }
  return total;
}, '计算平方根');

// 在浏览器环境中，可以在Performance面板中查看详细的性能分析结果
```

### profile

分析函数性能并输出结果。

```typescript
function profile<T>(fn: () => T, label?: string): T
```

**参数:**
- `fn`: 要分析的函数
- `label`: 分析标签（可选）

**返回值:**
- 函数的返回值

**示例:**

```javascript
import { profile } from '@stratix/utils/performance';

// 分析函数性能
const result = profile(() => {
  // 执行一些操作...
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += i;
  }
  return sum;
}, '计算累加和');

// 输出类似:
// [Profile] Starting: 计算累加和
// [Profile] Completed: 计算累加和
// [Profile] Time: 12.34ms
// [Profile] Memory: 0.05MB
console.log(result); // 499999500000
```

## 性能优化函数

### memoize

创建一个带有结果缓存的函数，避免重复计算。

```typescript
function memoize<T extends (...args: any[]) => any>(fn: T, resolver?: (...args: Parameters<T>) => string): T
```

**参数:**
- `fn`: 要缓存结果的函数
- `resolver`: 自定义解析器函数（可选），用于生成缓存键

**返回值:**
- 缓存优化后的函数

**示例:**

```javascript
import { memoize } from '@stratix/utils/performance';

// 创建一个计算斐波那契数列的函数
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 未优化的斐波那契函数计算大值会非常慢
console.time('未优化');
console.log(fibonacci(35));
console.timeEnd('未优化');

// 使用memoize优化函数
const memoizedFibonacci = memoize(fibonacci);

// 优化后的函数执行速度大幅提升
console.time('优化后');
console.log(memoizedFibonacci(35));
console.timeEnd('优化后');
```

### throttle

创建一个节流函数，限制函数在一定时间内只能执行一次。

```typescript
function throttle<T extends (...args: any[]) => any>(fn: T, wait: number, options?: ThrottleOptions): T & { cancel: () => void }
```

**参数:**
- `fn`: 要节流的函数
- `wait`: 等待时间（毫秒）
- `options`: 配置选项（可选）
  - `leading`: 是否在开始边界触发（默认为true）
  - `trailing`: 是否在结束边界触发（默认为true）

**返回值:**
- 节流后的函数，附加了 `cancel` 方法用于取消待执行的调用

**示例:**

```javascript
import { throttle } from '@stratix/utils/performance';

// 处理滚动事件，限制每100ms执行一次
const handleScroll = throttle(() => {
  console.log('滚动位置:', window.scrollY);
  // 执行一些昂贵的DOM操作...
}, 100);

// 添加滚动事件监听
window.addEventListener('scroll', handleScroll);

// 移除事件监听和取消节流函数的待执行调用
function cleanup() {
  window.removeEventListener('scroll', handleScroll);
  handleScroll.cancel();
}
```

### debounce

创建一个防抖函数，延迟执行函数直到一定时间后没有再次调用。

```typescript
function debounce<T extends (...args: any[]) => any>(fn: T, wait: number, options?: DebounceOptions): T & { cancel: () => void, flush: () => void }
```

**参数:**
- `fn`: 要防抖的函数
- `wait`: 等待时间（毫秒）
- `options`: 配置选项（可选）
  - `leading`: 是否在延迟开始前调用函数（默认为false）
  - `trailing`: 是否在延迟结束后调用函数（默认为true）
  - `maxWait`: 最大等待时间（毫秒），超过该时间必定执行

**返回值:**
- 防抖后的函数，附加了以下方法：
  - `cancel`: 取消待执行的调用
  - `flush`: 立即执行待执行的调用

**示例:**

```javascript
import { debounce } from '@stratix/utils/performance';

// 处理输入事件，用户停止输入500ms后执行搜索
const searchInput = document.getElementById('search');
const performSearch = debounce((query) => {
  console.log('搜索查询:', query);
  // 发送API请求...
}, 500);

searchInput.addEventListener('input', (e) => {
  performSearch(e.target.value);
});

// 表单提交前强制执行待处理的搜索
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  performSearch.flush();
});
```

### rAF

使用requestAnimationFrame优化动画和视觉更新操作。

```typescript
function rAF(callback: FrameRequestCallback): { cancel: () => void }
```

**参数:**
- `callback`: 在下一次重绘之前调用的函数

**返回值:**
- 一个对象，包含 `cancel` 方法用于取消请求

**示例:**

```javascript
import { rAF } from '@stratix/utils/performance';

function animate() {
  // 更新元素位置
  element.style.left = `${position++}px`;
  
  // 如果动画未完成，请求下一帧
  if (position < 300) {
    animationRequest = rAF(animate);
  }
}

// 开始动画
let position = 0;
let animationRequest = rAF(animate);

// 停止动画
function stopAnimation() {
  if (animationRequest) {
    animationRequest.cancel();
  }
}
```

### nextTick

将回调函数延迟到下一个事件循环周期执行。

```typescript
function nextTick(callback: () => void): void
```

**参数:**
- `callback`: 要延迟执行的回调函数

**返回值:**
- 无

**示例:**

```javascript
import { nextTick } from '@stratix/utils/performance';

// 在DOM更新后执行操作
function updateUI() {
  // 更新DOM
  document.getElementById('result').textContent = '计算结果: ' + result;
  
  // 在DOM更新后执行测量
  nextTick(() => {
    const height = document.getElementById('result').offsetHeight;
    console.log('结果元素高度:', height);
  });
}
```

## 资源监控函数

### getMemoryUsage

获取当前进程的内存使用情况。

```typescript
function getMemoryUsage(): MemoryUsage | null
```

**返回值:**
- 包含以下属性的内存使用对象：
  - `rss`: 常驻集大小（字节）
  - `heapTotal`: V8引擎分配的总内存（字节）
  - `heapUsed`: V8引擎实际使用的内存（字节）
  - `external`: V8管理的绑定到JavaScript的C++对象的内存（字节）
  - `arrayBuffers`: 分配给ArrayBuffer和SharedArrayBuffer的内存（字节）
- 在不支持的环境（如浏览器）中返回null

**示例:**

```javascript
import { getMemoryUsage } from '@stratix/utils/performance';

// 获取当前内存使用情况
const memoryUsage = getMemoryUsage();

if (memoryUsage) {
  console.log('内存使用情况:');
  console.log(`RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB`);
  console.log(`堆总大小: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`);
  console.log(`堆已使用: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`);
}
```

### getCPUUsage

获取当前进程的CPU使用情况。

```typescript
function getCPUUsage(): Promise<CPUUsage | null>
```

**返回值:**
- 解析为包含以下属性的CPU使用对象的Promise：
  - `user`: 用户CPU时间（微秒）
  - `system`: 系统CPU时间（微秒）
  - `percentage`: CPU使用百分比（0-100）
- 在不支持的环境中返回解析为null的Promise

**示例:**

```javascript
import { getCPUUsage } from '@stratix/utils/performance';

// 获取CPU使用情况
async function logCPUUsage() {
  const cpuUsage = await getCPUUsage();
  
  if (cpuUsage) {
    console.log('CPU使用情况:');
    console.log(`用户CPU时间: ${cpuUsage.user}μs`);
    console.log(`系统CPU时间: ${cpuUsage.system}μs`);
    console.log(`CPU使用率: ${cpuUsage.percentage.toFixed(2)}%`);
  }
}

logCPUUsage();
```

### getResourceUsage

获取当前进程的资源使用情况（内存和CPU）。

```typescript
function getResourceUsage(): Promise<ResourceUsage | null>
```

**返回值:**
- 解析为包含内存和CPU使用情况的对象的Promise
- 在不支持的环境中返回解析为null的Promise

**示例:**

```javascript
import { getResourceUsage } from '@stratix/utils/performance';

// 获取资源使用情况
async function monitorResources() {
  const usage = await getResourceUsage();
  
  if (usage) {
    console.log('资源使用情况:');
    console.log(`内存已使用: ${Math.round(usage.memory.heapUsed / 1024 / 1024)} MB / ${Math.round(usage.memory.heapTotal / 1024 / 1024)} MB`);
    console.log(`CPU使用率: ${usage.cpu.percentage.toFixed(2)}%`);
  }
}

monitorResources();
```

### monitorPerformance

持续监控资源使用情况，定期调用回调函数。

```typescript
function monitorPerformance(
  callback: (usage: ResourceUsage) => void,
  interval?: number
): { stop: () => void }
```

**参数:**
- `callback`: 回调函数，接收资源使用情况对象
- `interval`: 监控间隔（毫秒，默认为5000）

**返回值:**
- 一个对象，包含 `stop` 方法用于停止监控

**示例:**

```javascript
import { monitorPerformance } from '@stratix/utils/performance';

// 开始监控性能，每3秒报告一次
const monitor = monitorPerformance((usage) => {
  console.log(`[${new Date().toISOString()}] 性能报告:`);
  console.log(`内存使用: ${Math.round(usage.memory.heapUsed / 1024 / 1024)} MB`);
  console.log(`CPU使用率: ${usage.cpu.percentage.toFixed(2)}%`);
  
  // 根据使用情况发出警告
  if (usage.cpu.percentage > 80) {
    console.warn('CPU使用率过高!');
  }
  if (usage.memory.heapUsed / usage.memory.heapTotal > 0.9) {
    console.warn('内存使用率过高!');
  }
}, 3000);

// 一段时间后停止监控
setTimeout(() => {
  monitor.stop();
  console.log('性能监控已停止');
}, 60000);
```

## 高级性能工具函数

### asyncCache

创建带有缓存的异步函数。

```typescript
function asyncCache<T, A extends any[]>(
  fn: (...args: A) => Promise<T>,
  options?: CacheOptions
): (...args: A) => Promise<T>
```

**参数:**
- `fn`: 要缓存结果的异步函数
- `options`: 缓存选项（可选）
  - `ttl`: 缓存生存时间(ms)
  - `maxSize`: 最大缓存项数量
  - `keyFn`: 自定义缓存键函数

**返回值:**
- 带有缓存的异步函数

**示例:**

```javascript
import { asyncCache } from '@stratix/utils/performance';

// 原始的获取用户数据的函数
async function fetchUserData(userId) {
  console.log(`获取用户 ${userId} 的数据...`);
  // 模拟API调用
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { id: userId, name: `用户${userId}`, role: 'user' };
}

// 创建带缓存的版本
const cachedFetchUserData = asyncCache(fetchUserData, {
  ttl: 60000, // 缓存60秒
  maxSize: 100 // 最多缓存100个用户
});

// 使用缓存函数
async function demo() {
  console.time('第一次调用');
  await cachedFetchUserData(123); // 将执行API调用
  console.timeEnd('第一次调用');
  
  console.time('第二次调用');
  await cachedFetchUserData(123); // 将从缓存返回
  console.timeEnd('第二次调用');
  
  // 使用不同参数调用
  await cachedFetchUserData(456); // 将执行API调用
}

demo();
```

### batch

创建批处理函数。

```typescript
function batch<T, R>(
  fn: (items: T[]) => Promise<R[]>,
  options?: BatchOptions
): (item: T) => Promise<R>
```

**参数:**
- `fn`: 处理批量项的函数
- `options`: 批处理选项（可选）
  - `maxBatchSize`: 每批最大项数
  - `maxDelay`: 最大延迟时间(ms)

**返回值:**
- 处理单个项的函数，内部会批量处理

**示例:**

```javascript
import { batch } from '@stratix/utils/performance';

// 原始的批量处理用户ID的函数
async function fetchUsersByIds(ids) {
  console.log(`批量获取${ids.length}个用户: ${ids.join(', ')}`);
  // 模拟API批量查询
  await new Promise(resolve => setTimeout(resolve, 500));
  return ids.map(id => ({ id, name: `用户${id}` }));
}

// 创建单个用户处理函数，内部会批量处理
const fetchUserById = batch(fetchUsersByIds, {
  maxBatchSize: 5, // 最多5个用户一批
  maxDelay: 50 // 最多等待50ms就发送请求
});

// 模拟多个并发请求
async function demo() {
  // 并发请求10个用户，实际上会被合并成更少的批量请求
  const userPromises = [];
  for (let i = 1; i <= 10; i++) {
    userPromises.push(fetchUserById(i));
  }
  
  const users = await Promise.all(userPromises);
  console.log(`获取到${users.length}个用户`);
}

demo();
// 输出可能是:
// 批量获取5个用户: 1, 2, 3, 4, 5
// 批量获取5个用户: 6, 7, 8, 9, 10
// 获取到10个用户
```

### limitConcurrency

限制并发的异步函数。

```typescript
function limitConcurrency<T, A extends any[]>(
  fn: (...args: A) => Promise<T>,
  maxConcurrent: number
): (...args: A) => Promise<T>
```

**参数:**
- `fn`: 要限制并发的异步函数
- `maxConcurrent`: 最大并发数

**返回值:**
- 受限的异步函数

**示例:**

```javascript
import { limitConcurrency } from '@stratix/utils/performance';

// 原始的异步函数
async function downloadFile(url) {
  console.log(`开始下载: ${url}`);
  // 模拟下载过程
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`完成下载: ${url}`);
  return `content-of-${url}`;
}

// 创建限制并发的版本
const limitedDownload = limitConcurrency(downloadFile, 2); // 最多同时下载2个文件

// 使用并发限制的函数
async function demo() {
  console.time('总下载时间');
  
  // 尝试下载5个文件，但最多同时下载2个
  const urls = [
    'file1.txt',
    'file2.txt',
    'file3.txt',
    'file4.txt',
    'file5.txt'
  ];
  
  const results = await Promise.all(urls.map(url => limitedDownload(url)));
  console.log(`下载了${results.length}个文件`);
  
  console.timeEnd('总下载时间');
}

demo();
// 输出:
// 开始下载: file1.txt
// 开始下载: file2.txt
// (2秒后)
// 完成下载: file1.txt
// 完成下载: file2.txt
// 开始下载: file3.txt
// 开始下载: file4.txt
// (2秒后)
// 完成下载: file3.txt
// 完成下载: file4.txt
// 开始下载: file5.txt
// (2秒后)
// 完成下载: file5.txt
// 下载了5个文件
// 总下载时间: 6000.123ms
``` 