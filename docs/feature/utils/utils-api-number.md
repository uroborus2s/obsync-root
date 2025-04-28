# @stratix/utils/number 数字工具函数文档

本模块提供了一系列用于处理数字的实用函数，可帮助开发者进行数值计算、格式化、随机数生成和数值验证等操作。

## 目录

- [clamp - 数值限制](#clamp)
- [inRange - 范围检查](#inrange)
- [random - 随机数生成](#random)
- [round - 四舍五入](#round)
- [floor - 向下取整](#floor)
- [ceil - 向上取整](#ceil)
- [formatNumber - 数字格式化](#formatnumber)
- [toFixed - 精确小数位](#tofixed)
- [sum - 求和](#sum)
- [average - 求平均值](#average)
- [max - 最大值](#max)
- [min - 最小值](#min)
- [isNumber - 数字检查](#isnumber)
- [isInteger - 整数检查](#isinteger)
- [isFloat - 浮点数检查](#isfloat)

## 函数详情

<a id="clamp"></a>
### clamp(number, lower, upper)

将数字限制在指定的范围内。

**参数:**
- `number` `{number}`: 要限制的数字
- `lower` `{number}`: 下限
- `upper` `{number}`: 上限

**返回:**
- `{number}`: 限制后的数字

**示例:**
```js
import { clamp } from '@stratix/utils/number';

console.log(clamp(5, 1, 10));  // 5 (在范围内，不变)
console.log(clamp(0, 1, 10));  // 1 (小于下限，返回下限)
console.log(clamp(15, 1, 10)); // 10 (大于上限，返回上限)

// 实际应用：限制进度值
function setProgress(percent) {
  const validPercent = clamp(percent, 0, 100);
  element.style.width = `${validPercent}%`;
}
```

<a id="inrange"></a>
### inRange(number, start, end)

检查数字是否在指定范围内。

**参数:**
- `number` `{number}`: 要检查的数字
- `start` `{number}`: 范围起始值（包含）
- `end` `{number}`: (可选) 范围结束值（不包含），如果未提供，则start为0，end为start

**返回:**
- `{boolean}`: 如果数字在范围内，则返回true，否则返回false

**示例:**
```js
import { inRange } from '@stratix/utils/number';

console.log(inRange(3, 2, 4));   // true
console.log(inRange(4, 2, 4));   // false (不包含结束值)
console.log(inRange(2, 2, 4));   // true (包含开始值)
console.log(inRange(1.5, 1, 2)); // true
console.log(inRange(-3, -5, -1)); // true

// 只提供一个范围参数
console.log(inRange(3, 5));     // true (检查3是否在0到5之间)
console.log(inRange(5, 5));     // false
console.log(inRange(-1, 5));    // false

// 实际应用：检查日期
const today = new Date().getDate(); // 当月的日期，如 15
const isMiddleOfMonth = inRange(today, 10, 20);
console.log(isMiddleOfMonth ? '现在是月中' : '现在不是月中');
```

<a id="random"></a>
### random(lower, upper, floating)

生成一个指定范围内的随机数。

**参数:**
- `lower` `{number}`: (可选) 下限，默认为0
- `upper` `{number}`: (可选) 上限，默认为1
- `floating` `{boolean}`: (可选) 是否返回浮点数，默认根据参数自动判断

**返回:**
- `{number}`: 生成的随机数

**示例:**
```js
import { random } from '@stratix/utils/number';

// 不带参数，生成0到1之间的随机数
console.log(random());  // 例如: 0.6938462

// 指定上限，生成0到10之间的随机整数
console.log(random(10));  // 例如: 7

// 指定范围，生成5到10之间的随机整数
console.log(random(5, 10));  // 例如: 8

// 生成浮点数
console.log(random(5, 10, true));  // 例如: 7.342

// 负数范围
console.log(random(-10, -5));  // 例如: -7

// 实际应用：随机颜色生成
function randomColor() {
  const r = random(0, 255);
  const g = random(0, 255);
  const b = random(0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}
```

<a id="round"></a>
### round(number, precision)

四舍五入到指定的精度。

**参数:**
- `number` `{number}`: 要四舍五入的数字
- `precision` `{number}`: (可选) 精度，默认为0

**返回:**
- `{number}`: 四舍五入后的数字

**示例:**
```js
import { round } from '@stratix/utils/number';

console.log(round(4.006));      // 4
console.log(round(4.006, 2));   // 4.01
console.log(round(4.006, 1));   // 4.0
console.log(round(4100, -2));   // 4100
console.log(round(4160, -2));   // 4200

// 实际应用：金融计算
const price = 19.99;
const quantity = 3;
const totalWithTax = price * quantity * 1.08; // 64.77
const roundedTotal = round(totalWithTax, 2);  // 64.77
```

<a id="floor"></a>
### floor(number, precision)

向下舍入到指定的精度。

**参数:**
- `number` `{number}`: 要向下舍入的数字
- `precision` `{number}`: (可选) 精度，默认为0

**返回:**
- `{number}`: 向下舍入后的数字

**示例:**
```js
import { floor } from '@stratix/utils/number';

console.log(floor(4.9));      // 4
console.log(floor(4.96, 1));  // 4.9
console.log(floor(4160, -2)); // 4100

// 实际应用：计算分页
const totalItems = 637;
const pageSize = 10;
const totalPages = floor(totalItems / pageSize) + 1; // 64
```

<a id="ceil"></a>
### ceil(number, precision)

向上舍入到指定的精度。

**参数:**
- `number` `{number}`: 要向上舍入的数字
- `precision` `{number}`: (可选) 精度，默认为0

**返回:**
- `{number}`: 向上舍入后的数字

**示例:**
```js
import { ceil } from '@stratix/utils/number';

console.log(ceil(4.1));      // 5
console.log(ceil(4.06, 1));  // 4.1
console.log(ceil(4060, -2)); // 4100

// 实际应用：计算存储容量
const fileSize = 2.13; // MB
const requiredBlocks = ceil(fileSize); // 3 MB
```

<a id="formatnumber"></a>
### formatNumber(number, options)

将数字格式化为字符串，支持添加千位分隔符、指定小数位数等。

**参数:**
- `number` `{number}`: 要格式化的数字
- `options` `{Object}`: 格式化选项
  - `decimalPlaces` `{number}`: 小数位数
  - `decimalSeparator` `{string}`: 小数分隔符，默认为'.'
  - `thousandsSeparator` `{string}`: 千位分隔符，默认为','
  - `prefix` `{string}`: 前缀
  - `suffix` `{string}`: 后缀

**返回:**
- `{string}`: 格式化后的字符串

**示例:**
```js
import { formatNumber } from '@stratix/utils/number';

// 基本使用
console.log(formatNumber(1234.5678)); 
// "1,234.5678"

// 设置小数位
console.log(formatNumber(1234.5678, { decimalPlaces: 2 })); 
// "1,234.57"

// 自定义分隔符
console.log(formatNumber(1234.5678, { 
  decimalPlaces: 2,
  decimalSeparator: ',',
  thousandsSeparator: '.'
})); 
// "1.234,57"

// 添加前后缀
console.log(formatNumber(1234.5678, { 
  decimalPlaces: 2,
  prefix: '¥',
  suffix: ' CNY'
})); 
// "¥1,234.57 CNY"

// 处理负数
console.log(formatNumber(-1234.5678, { 
  decimalPlaces: 2,
  prefix: '¥'
})); 
// "-¥1,234.57"
```

<a id="tofixed"></a>
### toFixed(number, precision, roundingMode)

将数字转换为指定精度的字符串，可指定舍入模式，避免JavaScript原生toFixed的精度问题。

**参数:**
- `number` `{number}`: 要处理的数字
- `precision` `{number}`: (可选) 精度，默认为0
- `roundingMode` `{string}`: (可选) 舍入模式，可选值为'round'、'floor'、'ceil'，默认为'round'

**返回:**
- `{string}`: 处理后的字符串

**示例:**
```js
import { toFixed } from '@stratix/utils/number';

// 基本使用
console.log(toFixed(0.615, 2));  // "0.62" (四舍五入)
console.log(toFixed(0.615, 2, 'floor'));  // "0.61" (向下舍入)
console.log(toFixed(0.615, 2, 'ceil'));   // "0.62" (向上舍入)

// 解决JavaScript原生toFixed的精度问题
console.log((1.005).toFixed(2));  // "1.00" (错误!)
console.log(toFixed(1.005, 2));   // "1.01" (正确)

// 处理负数
console.log(toFixed(-1.005, 2));  // "-1.01"
console.log(toFixed(-1.005, 2, 'floor'));  // "-1.01"
console.log(toFixed(-1.005, 2, 'ceil'));   // "-1.00"
```

<a id="sum"></a>
### sum(array)

计算数组中数字的总和。

**参数:**
- `array` `{Array}`: 数字数组

**返回:**
- `{number}`: 数组中所有数字的总和

**示例:**
```js
import { sum } from '@stratix/utils/number';

console.log(sum([1, 2, 3, 4]));  // 10
console.log(sum([1.5, 2.3, 0.7]));  // 4.5
console.log(sum([]));  // 0

// 对象数组可以使用回调函数
const items = [
  { price: 10, quantity: 2 },
  { price: 15, quantity: 1 },
  { price: 5, quantity: 4 }
];

const totalItems = sum(items.map(item => item.quantity)); // 7
const totalPrice = sum(items.map(item => item.price * item.quantity)); // 55
```

<a id="average"></a>
### average(array)

计算数组中数字的平均值。

**参数:**
- `array` `{Array}`: 数字数组

**返回:**
- `{number}`: 数组中所有数字的平均值，空数组返回0

**示例:**
```js
import { average } from '@stratix/utils/number';

console.log(average([1, 2, 3, 4, 5]));  // 3
console.log(average([1.5, 2.5]));  // 2
console.log(average([]));  // 0

// 计算学生成绩平均分
const scores = [85, 90, 75, 95, 88];
const avgScore = average(scores);  // 86.6

// 对象数组可以使用映射
const students = [
  { name: '张三', score: 85 },
  { name: '李四', score: 90 },
  { name: '王五', score: 75 }
];

const avgStudentScore = average(students.map(student => student.score)); // 83.33
```

<a id="max"></a>
### max(array)

获取数组中的最大值。

**参数:**
- `array` `{Array}`: 数字数组

**返回:**
- `{number}`: 数组中的最大值，空数组返回-Infinity

**示例:**
```js
import { max } from '@stratix/utils/number';

console.log(max([1, 5, 3, 9, 2]));  // 9
console.log(max([-10, -5, -3]));  // -3
console.log(max([]));  // -Infinity

// 找出最高价商品
const products = [
  { name: '产品A', price: 100 },
  { name: '产品B', price: 150 },
  { name: '产品C', price: 120 }
];

const highestPrice = max(products.map(product => product.price)); // 150
const mostExpensiveProduct = products.find(product => product.price === highestPrice);
```

<a id="min"></a>
### min(array)

获取数组中的最小值。

**参数:**
- `array` `{Array}`: 数字数组

**返回:**
- `{number}`: 数组中的最小值，空数组返回Infinity

**示例:**
```js
import { min } from '@stratix/utils/number';

console.log(min([5, 3, 6, 1, 8]));  // 1
console.log(min([-10, -5, -3]));  // -10
console.log(min([]));  // Infinity

// 找出最低价商品
const products = [
  { name: '产品A', price: 100 },
  { name: '产品B', price: 150 },
  { name: '产品C', price: 120 }
];

const lowestPrice = min(products.map(product => product.price)); // 100
const cheapestProduct = products.find(product => product.price === lowestPrice);
```

<a id="isnumber"></a>
### isNumber(value)

检查值是否为有效数字（不包括NaN和Infinity）。

**参数:**
- `value` `{*}`: 要检查的值

**返回:**
- `{boolean}`: 如果值是有效数字，则返回true，否则返回false

**示例:**
```js
import { isNumber } from '@stratix/utils/number';

console.log(isNumber(123));     // true
console.log(isNumber(3.14));    // true
console.log(isNumber(0));       // true
console.log(isNumber(-42));     // true
console.log(isNumber('123'));   // false
console.log(isNumber(NaN));     // false
console.log(isNumber(Infinity)); // false
console.log(isNumber(undefined)); // false
console.log(isNumber(null));    // false
console.log(isNumber({}));      // false

// 实际应用：表单验证
function validateForm(values) {
  const errors = {};
  
  if (!values.age) {
    errors.age = '年龄必填';
  } else if (!isNumber(Number(values.age))) {
    errors.age = '年龄必须是数字';
  } else if (Number(values.age) < 18) {
    errors.age = '年龄必须大于等于18岁';
  }
  
  return errors;
}
```

<a id="isinteger"></a>
### isInteger(value)

检查值是否为整数。

**参数:**
- `value` `{*}`: 要检查的值

**返回:**
- `{boolean}`: 如果值是整数，则返回true，否则返回false

**示例:**
```js
import { isInteger } from '@stratix/utils/number';

console.log(isInteger(5));       // true
console.log(isInteger(-10));     // true
console.log(isInteger(0));       // true
console.log(isInteger(5.0));     // true
console.log(isInteger(5.1));     // false
console.log(isInteger('5'));     // false
console.log(isInteger(Infinity)); // false
console.log(isInteger(NaN));     // false

// 实际应用：验证页码
function validatePageNumber(page) {
  if (!isInteger(Number(page)) || Number(page) < 1) {
    return 1; // 默认返回第一页
  }
  return Number(page);
}
```

<a id="isfloat"></a>
### isFloat(value)

检查值是否为浮点数（带小数部分的数字）。

**参数:**
- `value` `{*}`: 要检查的值

**返回:**
- `{boolean}`: 如果值是浮点数，则返回true，否则返回false

**示例:**
```js
import { isFloat } from '@stratix/utils/number';

console.log(isFloat(5.5));     // true
console.log(isFloat(5.0));     // false (没有小数部分)
console.log(isFloat(-3.14));   // true
console.log(isFloat(0.0));     // false
console.log(isFloat(5));       // false
console.log(isFloat('5.5'));   // false
console.log(isFloat(NaN));     // false
console.log(isFloat(Infinity)); // false

// 实际应用：价格验证
function validatePrice(price) {
  if (!isNumber(Number(price))) {
    return '价格必须是数字';
  }
  
  if (Number(price) <= 0) {
    return '价格必须大于0';
  }
  
  if (isFloat(Number(price)) && String(price).split('.')[1].length > 2) {
    return '价格最多支持两位小数';
  }
  
  return null; // 验证通过
}
``` 