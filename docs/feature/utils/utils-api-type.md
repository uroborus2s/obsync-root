# @stratix/utils/type 类型工具函数文档

该模块提供了一系列用于类型检查、类型转换和类型处理的工具函数，帮助开发者进行精确的类型操作和类型安全的编程。

## 目录

- [@stratix/utils/type 类型工具函数文档](#stratixutilstype-类型工具函数文档)
  - [目录](#目录)
  - [类型检查函数](#类型检查函数)
    - [isNull](#isnull)
    - [isUndefined](#isundefined)
    - [isNil](#isnil)
    - [isString](#isstring)
    - [isNumber](#isnumber)
    - [isBoolean](#isboolean)
    - [isArray](#isarray)
    - [isObject](#isobject)
    - [isPlainObject](#isplainobject)
    - [isFunction](#isfunction)
    - [isDate](#isdate)
    - [isRegExp](#isregexp)
    - [isError](#iserror)
    - [isSymbol](#issymbol)
    - [isMap](#ismap)
    - [isSet](#isset)
    - [isPromise](#ispromise)
    - [isIterable](#isiterable)
  - [类型转换函数](#类型转换函数)
    - [toString](#tostring)
    - [toNumber](#tonumber)
    - [toInteger](#tointeger)
    - [toBoolean](#toboolean)
    - [toArray](#toarray)
    - [toObject](#toobject)
    - [toDate](#todate)
  - [类型获取和处理函数](#类型获取和处理函数)
    - [getType](#gettype)
    - [getPrimitiveType](#getprimitivetype)
    - [isTypeOf](#istypeof)
    - [isInstanceOf](#isinstanceof)
    - [ensureType](#ensuretype)
    - [typeCast](#typecast)
    - [typeGuard](#typeguard)

## 类型检查函数

### isNull

检查值是否为 `null`。

```typescript
function isNull(value: any): value is null
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为 `null` 则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isNull } from '@stratix/utils/type';

isNull(null);       // true
isNull(undefined);  // false
isNull(0);          // false
isNull('');         // false
isNull({});         // false
```

### isUndefined

检查值是否为 `undefined`。

```typescript
function isUndefined(value: any): value is undefined
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为 `undefined` 则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isUndefined } from '@stratix/utils/type';

isUndefined(undefined);  // true
isUndefined(null);       // false
isUndefined(0);          // false
isUndefined('');         // false
isUndefined({});         // false
```

### isNil

检查值是否为 `null` 或 `undefined`。

```typescript
function isNil(value: any): value is null | undefined
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为 `null` 或 `undefined` 则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isNil } from '@stratix/utils/type';

isNil(null);       // true
isNil(undefined);  // true
isNil(0);          // false
isNil('');         // false
isNil({});         // false
```

### isString

检查值是否为字符串类型。

```typescript
function isString(value: any): value is string
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为字符串类型则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isString } from '@stratix/utils/type';

isString('hello');     // true
isString('');          // true
isString(new String('hello')); // true
isString(123);         // false
isString(true);        // false
isString([]);          // false
```

### isNumber

检查值是否为数字类型。

```typescript
function isNumber(value: any): value is number
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为数字类型则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isNumber } from '@stratix/utils/type';

isNumber(123);         // true
isNumber(0);           // true
isNumber(-1.5);        // true
isNumber(NaN);         // true
isNumber(Infinity);    // true
isNumber('123');       // false
isNumber(true);        // false
isNumber([]);          // false
```

### isBoolean

检查值是否为布尔类型。

```typescript
function isBoolean(value: any): value is boolean
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为布尔类型则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isBoolean } from '@stratix/utils/type';

isBoolean(true);       // true
isBoolean(false);      // true
isBoolean(0);          // false
isBoolean('true');     // false
isBoolean(null);       // false
```

### isArray

检查值是否为数组。

```typescript
function isArray(value: any): value is Array<any>
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为数组则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isArray } from '@stratix/utils/type';

isArray([1, 2, 3]);   // true
isArray([]);          // true
isArray(new Array(3)); // true
isArray('abc');       // false
isArray({ 0: 'a', length: 1 }); // false
```

### isObject

检查值是否为对象。

```typescript
function isObject(value: any): value is object
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为对象则返回 `true`，否则返回 `false`（注意：数组也是对象）

**示例:**

```javascript
import { isObject } from '@stratix/utils/type';

isObject({});                // true
isObject({ name: 'John' });  // true
isObject([1, 2, 3]);         // true (数组也是对象)
isObject(new Date());        // true
isObject(null);              // false
isObject(123);               // false
isObject('abc');             // false
```

### isPlainObject

检查值是否为纯对象（由 `{}` 或 `new Object()` 创建的对象）。

```typescript
function isPlainObject(value: any): value is Record<string, any>
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为纯对象则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isPlainObject } from '@stratix/utils/type';

isPlainObject({});                // true
isPlainObject({ name: 'John' });  // true
isPlainObject(new Object());      // true
isPlainObject(Object.create(null)); // true
isPlainObject([1, 2, 3]);         // false
isPlainObject(new Date());        // false
isPlainObject(new Map());         // false
```

### isFunction

检查值是否为函数。

```typescript
function isFunction(value: any): value is Function
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为函数则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isFunction } from '@stratix/utils/type';

isFunction(function() {});        // true
isFunction(() => {});             // true
isFunction(async () => {});       // true
isFunction(class Person {});      // true
isFunction(Array.isArray);        // true
isFunction({});                   // false
isFunction(123);                  // false
```

### isDate

检查值是否为日期对象。

```typescript
function isDate(value: any): value is Date
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为日期对象则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isDate } from '@stratix/utils/type';

isDate(new Date());               // true
isDate(new Date('2023-01-01'));   // true
isDate(Date.now());               // false (这是一个数字)
isDate('2023-01-01');             // false
isDate({});                       // false
```

### isRegExp

检查值是否为正则表达式对象。

```typescript
function isRegExp(value: any): value is RegExp
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为正则表达式对象则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isRegExp } from '@stratix/utils/type';

isRegExp(/abc/);                  // true
isRegExp(new RegExp('abc'));      // true
isRegExp('/abc/');                // false
isRegExp({});                     // false
```

### isError

检查值是否为 Error 对象。

```typescript
function isError(value: any): value is Error
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为 Error 对象则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isError } from '@stratix/utils/type';

isError(new Error('Something went wrong')); // true
isError(new TypeError('Type error'));       // true
isError({ message: 'Error' });              // false
isError('Error message');                   // false
```

### isSymbol

检查值是否为 Symbol 类型。

```typescript
function isSymbol(value: any): value is symbol
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为 Symbol 类型则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isSymbol } from '@stratix/utils/type';

isSymbol(Symbol('foo'));          // true
isSymbol(Symbol.iterator);        // true
isSymbol('symbol');               // false
isSymbol({});                     // false
```

### isMap

检查值是否为 Map 对象。

```typescript
function isMap(value: any): value is Map<any, any>
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为 Map 对象则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isMap } from '@stratix/utils/type';

isMap(new Map());                 // true
isMap(new Map([['key', 'value']])); // true
isMap({});                        // false
isMap([]);                        // false
```

### isSet

检查值是否为 Set 对象。

```typescript
function isSet(value: any): value is Set<any>
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为 Set 对象则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isSet } from '@stratix/utils/type';

isSet(new Set());                 // true
isSet(new Set([1, 2, 3]));        // true
isSet({});                        // false
isSet([]);                        // false
```

### isPromise

检查值是否为 Promise 对象。

```typescript
function isPromise(value: any): value is Promise<any>
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值为 Promise 对象则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isPromise } from '@stratix/utils/type';

isPromise(Promise.resolve(123));              // true
isPromise(new Promise(resolve => resolve())); // true
isPromise({ then: () => {}, catch: () => {} }); // true (类Promise对象)
isPromise(async () => {});                   // false (这是一个函数，不是Promise)
isPromise({});                               // false
```

### isIterable

检查值是否为可迭代对象。

```typescript
function isIterable(value: any): value is Iterable<any>
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 如果值实现了迭代器协议则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isIterable } from '@stratix/utils/type';

isIterable([1, 2, 3]);            // true
isIterable('abc');                // true (字符串是可迭代的)
isIterable(new Map());            // true
isIterable(new Set());            // true
isIterable({});                   // false (普通对象不可迭代)
isIterable(123);                  // false
```

## 类型转换函数

### toString

将值转换为字符串。

```typescript
function toString(value: any): string
```

**参数:**
- `value`: 要转换的值

**返回值:**
- 转换后的字符串

**示例:**

```javascript
import { toString } from '@stratix/utils/type';

toString('hello');                // 'hello'
toString(123);                    // '123'
toString(true);                   // 'true'
toString([1, 2, 3]);              // '1,2,3'
toString({ name: 'John' });       // '[object Object]'
toString(null);                   // ''
toString(undefined);              // ''
```

### toNumber

将值转换为数字。

```typescript
function toNumber(value: any): number
```

**参数:**
- `value`: 要转换的值

**返回值:**
- 转换后的数字，如果无法转换则返回 `NaN`

**示例:**

```javascript
import { toNumber } from '@stratix/utils/type';

toNumber(123);                    // 123
toNumber('123');                  // 123
toNumber('123.45');               // 123.45
toNumber(true);                   // 1
toNumber(false);                  // 0
toNumber('abc');                  // NaN
toNumber([]);                     // 0
toNumber([1]);                    // 1
toNumber([1, 2]);                 // NaN
toNumber({});                     // NaN
toNumber(null);                   // 0
toNumber(undefined);              // NaN
```

### toInteger

将值转换为整数。

```typescript
function toInteger(value: any): number
```

**参数:**
- `value`: 要转换的值

**返回值:**
- 转换后的整数，小数部分会被截断，如果无法转换则返回 `0`

**示例:**

```javascript
import { toInteger } from '@stratix/utils/type';

toInteger(123);                   // 123
toInteger(123.45);                // 123
toInteger(-123.45);               // -123
toInteger('123.45');              // 123
toInteger(true);                  // 1
toInteger(false);                 // 0
toInteger('abc');                 // 0
toInteger(null);                  // 0
toInteger(undefined);             // 0
```

### toBoolean

将值转换为布尔值。

```typescript
function toBoolean(value: any): boolean
```

**参数:**
- `value`: 要转换的值

**返回值:**
- 转换后的布尔值

**示例:**

```javascript
import { toBoolean } from '@stratix/utils/type';

toBoolean(true);                  // true
toBoolean(false);                 // false
toBoolean(1);                     // true
toBoolean(0);                     // false
toBoolean('true');                // true
toBoolean('false');               // true (非空字符串都是true)
toBoolean('');                    // false
toBoolean(null);                  // false
toBoolean(undefined);             // false
toBoolean({});                    // true (非空对象都是true)
toBoolean([]);                    // true (非空数组都是true)
```

### toArray

将值转换为数组。

```typescript
function toArray<T>(value: T | T[]): T[]
```

**参数:**
- `value`: 要转换的值

**返回值:**
- 如果输入已经是数组，则直接返回；否则将输入值放入一个新数组并返回

**示例:**

```javascript
import { toArray } from '@stratix/utils/type';

toArray([1, 2, 3]);               // [1, 2, 3]
toArray(123);                     // [123]
toArray('abc');                   // ['abc']
toArray(null);                    // []
toArray(undefined);               // []
```

### toObject

将值转换为对象。

```typescript
function toObject(value: any): Record<string, any>
```

**参数:**
- `value`: 要转换的值

**返回值:**
- 转换后的对象

**示例:**

```javascript
import { toObject } from '@stratix/utils/type';

toObject({ name: 'John' });       // { name: 'John' }
toObject([['name', 'John'], ['age', 30]]); // { name: 'John', age: 30 }
toObject(new Map([['name', 'John'], ['age', 30]])); // { name: 'John', age: 30 }
toObject('abc');                  // { 0: 'a', 1: 'b', 2: 'c' }
toObject(null);                   // {}
toObject(undefined);              // {}
```

### toDate

将值转换为日期对象。

```typescript
function toDate(value: any): Date
```

**参数:**
- `value`: 要转换的值

**返回值:**
- 转换后的日期对象，如果无法转换则返回无效日期（new Date(NaN)）

**示例:**

```javascript
import { toDate } from '@stratix/utils/type';

toDate(new Date());               // 原日期对象
toDate('2023-01-01');             // Sun Jan 01 2023...
toDate(1672531200000);            // Sun Jan 01 2023... (时间戳)
toDate([2023, 0, 1]);             // Sun Jan 01 2023...
toDate('invalid date');           // Invalid Date
toDate({});                       // Invalid Date
toDate(null);                     // Invalid Date
toDate(undefined);                // Invalid Date
```

## 类型获取和处理函数

### getType

获取值的具体类型。

```typescript
function getType(value: any): string
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 表示值类型的小写字符串，如 'string', 'number', 'object', 'array' 等

**示例:**

```javascript
import { getType } from '@stratix/utils/type';

getType('hello');                 // 'string'
getType(123);                     // 'number'
getType(true);                    // 'boolean'
getType([]);                      // 'array'
getType({});                      // 'object'
getType(null);                    // 'null'
getType(undefined);               // 'undefined'
getType(() => {});                // 'function'
getType(new Date());              // 'date'
getType(/abc/);                   // 'regexp'
getType(new Error());             // 'error'
getType(new Map());               // 'map'
getType(new Set());               // 'set'
getType(Symbol('foo'));           // 'symbol'
```

### getPrimitiveType

获取值的原始类型。

```typescript
function getPrimitiveType(value: any): string
```

**参数:**
- `value`: 要检查的值

**返回值:**
- 表示值原始类型的字符串，如 'string', 'number', 'boolean', 'undefined', 'object', 'function', 'symbol' 等

**示例:**

```javascript
import { getPrimitiveType } from '@stratix/utils/type';

getPrimitiveType('hello');        // 'string'
getPrimitiveType(123);            // 'number'
getPrimitiveType(true);           // 'boolean'
getPrimitiveType([]);             // 'object'
getPrimitiveType({});             // 'object'
getPrimitiveType(null);           // 'object'
getPrimitiveType(undefined);      // 'undefined'
getPrimitiveType(() => {});       // 'function'
getPrimitiveType(Symbol('foo'));  // 'symbol'
```

### isTypeOf

检查值是否为指定的类型。

```typescript
function isTypeOf(value: any, type: string): boolean
```

**参数:**
- `value`: 要检查的值
- `type`: 要检查的类型字符串，如 'string', 'number', 'array' 等

**返回值:**
- 如果值为指定类型则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isTypeOf } from '@stratix/utils/type';

isTypeOf('hello', 'string');      // true
isTypeOf(123, 'number');          // true
isTypeOf([], 'array');            // true
isTypeOf({}, 'object');           // true
isTypeOf(null, 'null');           // true
isTypeOf(() => {}, 'function');   // true
isTypeOf('hello', 'number');      // false
```

### isInstanceOf

检查值是否为指定构造函数的实例。

```typescript
function isInstanceOf(value: any, constructor: Function): boolean
```

**参数:**
- `value`: 要检查的值
- `constructor`: 构造函数

**返回值:**
- 如果值是指定构造函数的实例则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isInstanceOf } from '@stratix/utils/type';

class Person {}
const john = new Person();

isInstanceOf(john, Person);       // true
isInstanceOf([1, 2, 3], Array);   // true
isInstanceOf(new Date(), Date);   // true
isInstanceOf({}, Object);         // true
isInstanceOf('hello', String);    // false (原始值不是实例)
isInstanceOf(123, Number);        // false (原始值不是实例)
isInstanceOf(john, Array);        // false
```

### ensureType

确保值为指定类型，如果不是则转换或返回默认值。

```typescript
function ensureType<T>(value: any, type: string, defaultValue?: T): T
```

**参数:**
- `value`: 要检查的值
- `type`: 期望的类型字符串
- `defaultValue`: 如果转换失败时的默认值（可选）

**返回值:**
- 如果值已经是期望的类型，则直接返回；如果不是，则尝试转换，转换失败则返回默认值

**示例:**

```javascript
import { ensureType } from '@stratix/utils/type';

ensureType('123', 'string');      // '123'
ensureType(123, 'string');        // '123'
ensureType('123', 'number');      // 123
ensureType('abc', 'number', 0);   // 0 (无法转换为数字，返回默认值)
ensureType('true', 'boolean');    // true
ensureType([1, 2], 'array');      // [1, 2]
ensureType(123, 'array', []);     // [] (无法转换为数组，返回默认值)
```

### typeCast

强制类型转换。

```typescript
function typeCast<T>(value: any, targetType: string): T
```

**参数:**
- `value`: 要转换的值
- `targetType`: 目标类型字符串

**返回值:**
- 转换后的值

**示例:**

```javascript
import { typeCast } from '@stratix/utils/type';

typeCast('123', 'number');        // 123
typeCast(123, 'string');          // '123'
typeCast('true', 'boolean');      // true
typeCast('[1,2,3]', 'array');     // [1, 2, 3]
typeCast('{"name":"John"}', 'object'); // { name: 'John' }
```

### typeGuard

创建一个类型保护函数。

```typescript
function typeGuard<T>(type: string): (value: any) => value is T
```

**参数:**
- `type`: 类型字符串

**返回值:**
- 返回一个类型保护函数，可用于TypeScript的类型保护

**示例:**

```typescript
import { typeGuard } from '@stratix/utils/type';

const isStringArray = typeGuard<string[]>('array');

function processItems(items: any) {
  if (isStringArray(items)) {
    // 在这个作用域中，TypeScript 知道 items 是 string[]
    items.forEach(item => console.log(item.toUpperCase()));
  } else {
    console.log('Not a string array');
  }
}

processItems(['a', 'b', 'c']); // 处理字符串数组
processItems(123);             // "Not a string array"
``` 