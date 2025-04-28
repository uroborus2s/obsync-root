# @stratix/utils/validator 数据验证工具函数文档

该模块提供了一系列用于数据验证的工具函数，帮助开发者验证各种类型的输入数据，确保数据符合预期的格式和规则。

## 目录

- [字符串验证函数](#字符串验证函数)
  - [isEmail](#isemail)
  - [isURL](#isurl)
  - [isIP](#isip)
  - [isAlpha](#isalpha)
  - [isAlphanumeric](#isalphanumeric)
  - [isNumeric](#isnumeric)
  - [isBase64](#isbase64)
  - [isHexadecimal](#ishexadecimal)
  - [isUUID](#isuuid)
  - [isJSON](#isjson)
  - [isPhoneNumber](#isphonenumber)
  - [isPostalCode](#ispostalcode)
  - [isStrongPassword](#isstrongpassword)
  - [matches](#matches)

- [数字验证函数](#数字验证函数)
  - [isInteger](#isinteger)
  - [isFloat](#isfloat)
  - [isPositive](#ispositive)
  - [isNegative](#isnegative)
  - [isInRange](#isinrange)
  - [isDivisibleBy](#isdivisibleby)

- [日期验证函数](#日期验证函数)
  - [isDate](#isdate)
  - [isAfterDate](#isafterdate)
  - [isBeforeDate](#isbeforedate)

- [对象和数组验证函数](#对象和数组验证函数)
  - [isLength](#islength)
  - [isEmpty](#isempty)
  - [isNotEmpty](#isnotempty)
  - [contains](#contains)
  - [equals](#equals)
  - [isIn](#isin)
  - [isRequired](#isrequired)

- [综合验证函数](#综合验证函数)
  - [validate](#validate)
  - [validateAll](#validateall)
  - [validateObject](#validateobject)
  - [createValidator](#createvalidator)
  - [chain](#chain)

## 字符串验证函数

### isEmail

验证字符串是否为有效的电子邮件地址。

```typescript
function isEmail(value: string, options?: EmailOptions): boolean
```

**参数:**
- `value`: 要验证的字符串
- `options`: 验证选项（可选）
  - `allowDisplayName`: 是否允许显示名称，如 "Name <email@example.com>"
  - `requireTLD`: 是否要求顶级域名
  - `allowIPDomain`: 是否允许IP地址作为域名

**返回值:**
- 如果是有效的电子邮件地址则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isEmail } from '@stratix/utils/validator';

isEmail('user@example.com');     // true
isEmail('invalid-email');        // false
isEmail('user@localhost', { requireTLD: false }); // true
isEmail('User Name <user@example.com>', { allowDisplayName: true }); // true
```

### isURL

验证字符串是否为有效的URL。

```typescript
function isURL(value: string, options?: URLOptions): boolean
```

**参数:**
- `value`: 要验证的字符串
- `options`: 验证选项（可选）
  - `protocols`: 允许的协议数组，默认为 ['http', 'https']
  - `requireProtocol`: 是否要求URL包含协议
  - `requireValidProtocol`: 是否要求URL使用指定的协议
  - `allowQuery`: 是否允许查询参数
  - `allowFragment`: 是否允许片段标识符（#）

**返回值:**
- 如果是有效的URL则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isURL } from '@stratix/utils/validator';

isURL('https://example.com');                // true
isURL('example.com', { requireProtocol: false }); // true
isURL('ftp://example.com', { protocols: ['http', 'https', 'ftp'] }); // true
isURL('invalid url');                        // false
```

### isIP

验证字符串是否为有效的IP地址。

```typescript
function isIP(value: string, version?: 4 | 6): boolean
```

**参数:**
- `value`: 要验证的字符串
- `version`: IP版本，可以是4或6（可选，不指定则两种都接受）

**返回值:**
- 如果是有效的IP地址则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isIP } from '@stratix/utils/validator';

isIP('192.168.1.1');     // true
isIP('192.168.1.1', 4);  // true
isIP('192.168.1.1', 6);  // false
isIP('::1');             // true
isIP('::1', 6);          // true
isIP('invalid');         // false
```

### isAlpha

验证字符串是否只包含字母字符。

```typescript
function isAlpha(value: string, locale?: string): boolean
```

**参数:**
- `value`: 要验证的字符串
- `locale`: 语言环境（可选，如 'en-US', 'zh-CN' 等）

**返回值:**
- 如果字符串只包含字母则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isAlpha } from '@stratix/utils/validator';

isAlpha('abc');      // true
isAlpha('abc123');   // false
isAlpha('');         // false
isAlpha('基础编程', 'zh-CN'); // true
```

### isAlphanumeric

验证字符串是否只包含字母和数字。

```typescript
function isAlphanumeric(value: string, locale?: string): boolean
```

**参数:**
- `value`: 要验证的字符串
- `locale`: 语言环境（可选，如 'en-US', 'zh-CN' 等）

**返回值:**
- 如果字符串只包含字母和数字则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isAlphanumeric } from '@stratix/utils/validator';

isAlphanumeric('abc123');      // true
isAlphanumeric('abc123!@#');   // false
isAlphanumeric('');            // false
isAlphanumeric('编程123', 'zh-CN'); // true
```

### isNumeric

验证字符串是否只包含数字。

```typescript
function isNumeric(value: string): boolean
```

**参数:**
- `value`: 要验证的字符串

**返回值:**
- 如果字符串只包含数字则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isNumeric } from '@stratix/utils/validator';

isNumeric('123');     // true
isNumeric('123.45');  // false (包含小数点)
isNumeric('-123');    // false (包含负号)
isNumeric('a123');    // false
isNumeric('');        // false
```

### isBase64

验证字符串是否为有效的Base64编码。

```typescript
function isBase64(value: string): boolean
```

**参数:**
- `value`: 要验证的字符串

**返回值:**
- 如果是有效的Base64编码则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isBase64 } from '@stratix/utils/validator';

isBase64('SGVsbG8gV29ybGQ=');  // true
isBase64('Invalid base64');    // false
isBase64('');                  // false
```

### isHexadecimal

验证字符串是否为十六进制格式。

```typescript
function isHexadecimal(value: string): boolean
```

**参数:**
- `value`: 要验证的字符串

**返回值:**
- 如果是十六进制格式则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isHexadecimal } from '@stratix/utils/validator';

isHexadecimal('123abc');     // true
isHexadecimal('0xA1B2C3');   // false (包含0x前缀)
isHexadecimal('xyz');        // false
isHexadecimal('');           // false
```

### isUUID

验证字符串是否为有效的UUID。

```typescript
function isUUID(value: string, version?: 3 | 4 | 5 | 'all'): boolean
```

**参数:**
- `value`: 要验证的字符串
- `version`: UUID版本（可选，可以是3、4、5或'all'）

**返回值:**
- 如果是有效的UUID则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isUUID } from '@stratix/utils/validator';

isUUID('550e8400-e29b-41d4-a716-446655440000');  // true
isUUID('550e8400-e29b-41d4-a716-446655440000', 4); // true
isUUID('invalid-uuid');        // false
```

### isJSON

验证字符串是否为有效的JSON格式。

```typescript
function isJSON(value: string): boolean
```

**参数:**
- `value`: 要验证的字符串

**返回值:**
- 如果是有效的JSON格式则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isJSON } from '@stratix/utils/validator';

isJSON('{"name":"John","age":30}');   // true
isJSON('{"name":"John",age:30}');     // false (没有对属性名使用引号)
isJSON('not json');                   // false
```

### isPhoneNumber

验证字符串是否为有效的电话号码。

```typescript
function isPhoneNumber(value: string, locale?: string): boolean
```

**参数:**
- `value`: 要验证的字符串
- `locale`: 国家/地区代码（可选，如 'US', 'CN', 'GB' 等）

**返回值:**
- 如果是有效的电话号码则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isPhoneNumber } from '@stratix/utils/validator';

isPhoneNumber('+1 555-123-4567', 'US');   // true
isPhoneNumber('13812345678', 'CN');       // true
isPhoneNumber('invalid phone');            // false
```

### isPostalCode

验证字符串是否为有效的邮政编码。

```typescript
function isPostalCode(value: string, locale: string): boolean
```

**参数:**
- `value`: 要验证的字符串
- `locale`: 国家/地区代码（必需，如 'US', 'CN', 'GB' 等）

**返回值:**
- 如果是有效的邮政编码则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isPostalCode } from '@stratix/utils/validator';

isPostalCode('10001', 'US');     // true
isPostalCode('100001', 'CN');    // true
isPostalCode('SW1A 1AA', 'GB');  // true
isPostalCode('invalid', 'US');   // false
```

### isStrongPassword

验证密码是否满足强度要求。

```typescript
function isStrongPassword(value: string, options?: PasswordOptions): boolean
```

**参数:**
- `value`: 要验证的密码字符串
- `options`: 密码强度选项（可选）
  - `minLength`: 最小长度（默认为8）
  - `minLowercase`: 最少小写字母数量（默认为1）
  - `minUppercase`: 最少大写字母数量（默认为1）
  - `minNumbers`: 最少数字数量（默认为1）
  - `minSymbols`: 最少特殊符号数量（默认为1）

**返回值:**
- 如果密码满足强度要求则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isStrongPassword } from '@stratix/utils/validator';

isStrongPassword('Abcd1234!');   // true
isStrongPassword('weakpass');    // false
isStrongPassword('Abc123', { minLength: 6, minSymbols: 0 }); // true
```

### matches

验证字符串是否匹配指定的正则表达式模式。

```typescript
function matches(value: string, pattern: RegExp | string): boolean
```

**参数:**
- `value`: 要验证的字符串
- `pattern`: 正则表达式或正则表达式字符串

**返回值:**
- 如果字符串匹配模式则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { matches } from '@stratix/utils/validator';

matches('abc123', /^[a-z0-9]+$/);   // true
matches('abc123', '^[a-z0-9]+$');   // true
matches('ABC123', /^[a-z0-9]+$/);   // false (包含大写字母)
```

## 数字验证函数

### isInteger

验证值是否为整数。

```typescript
function isInteger(value: any): boolean
```

**参数:**
- `value`: 要验证的值

**返回值:**
- 如果值是整数则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isInteger } from '@stratix/utils/validator';

isInteger(123);        // true
isInteger(-123);       // true
isInteger(0);          // true
isInteger(123.45);     // false
isInteger('123');      // false (字符串不被视为整数)
isInteger(NaN);        // false
```

### isFloat

验证值是否为浮点数。

```typescript
function isFloat(value: any): boolean
```

**参数:**
- `value`: 要验证的值

**返回值:**
- 如果值是浮点数则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isFloat } from '@stratix/utils/validator';

isFloat(123.45);      // true
isFloat(-123.45);     // true
isFloat(123);         // true (整数也是浮点数)
isFloat('123.45');    // false (字符串不被视为浮点数)
isFloat(NaN);         // false
isFloat(Infinity);    // false
```

### isPositive

验证数字是否为正数。

```typescript
function isPositive(value: number): boolean
```

**参数:**
- `value`: 要验证的数字

**返回值:**
- 如果数字大于0则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isPositive } from '@stratix/utils/validator';

isPositive(123);       // true
isPositive(0.01);      // true
isPositive(0);         // false
isPositive(-123);      // false
```

### isNegative

验证数字是否为负数。

```typescript
function isNegative(value: number): boolean
```

**参数:**
- `value`: 要验证的数字

**返回值:**
- 如果数字小于0则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isNegative } from '@stratix/utils/validator';

isNegative(-123);      // true
isNegative(-0.01);     // true
isNegative(0);         // false
isNegative(123);       // false
```

### isInRange

验证数字是否在指定范围内。

```typescript
function isInRange(value: number, min: number, max: number): boolean
```

**参数:**
- `value`: 要验证的数字
- `min`: 范围最小值（包含）
- `max`: 范围最大值（包含）

**返回值:**
- 如果数字在指定范围内则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isInRange } from '@stratix/utils/validator';

isInRange(5, 1, 10);        // true
isInRange(1, 1, 10);        // true (边界值)
isInRange(10, 1, 10);       // true (边界值)
isInRange(0, 1, 10);        // false
isInRange(11, 1, 10);       // false
```

### isDivisibleBy

验证数字是否能被另一个数整除。

```typescript
function isDivisibleBy(value: number, divisor: number): boolean
```

**参数:**
- `value`: 要验证的数字
- `divisor`: 除数

**返回值:**
- 如果数字能被除数整除则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isDivisibleBy } from '@stratix/utils/validator';

isDivisibleBy(10, 2);      // true
isDivisibleBy(10, 3);      // false
isDivisibleBy(0, 5);       // true
isDivisibleBy(5, 0);       // false (除数不能为0)
```

## 日期验证函数

### isDate

验证值是否为有效的日期。

```typescript
function isDate(value: any): boolean
```

**参数:**
- `value`: 要验证的值

**返回值:**
- 如果值是有效的日期则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isDate } from '@stratix/utils/validator';

isDate(new Date());                 // true
isDate('2023-01-01');               // false (字符串不被自动转换为日期)
isDate(new Date('invalid date'));   // false
isDate(123456789);                  // false
```

### isAfterDate

验证日期是否晚于指定日期。

```typescript
function isAfterDate(value: Date, comparisonDate: Date): boolean
```

**参数:**
- `value`: 要验证的日期
- `comparisonDate`: 比较基准日期

**返回值:**
- 如果日期晚于比较日期则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isAfterDate } from '@stratix/utils/validator';

const date1 = new Date('2023-01-15');
const date2 = new Date('2023-01-01');
const date3 = new Date('2023-01-30');

isAfterDate(date1, date2);    // true (1月15日晚于1月1日)
isAfterDate(date1, date3);    // false (1月15日不晚于1月30日)
isAfterDate(date1, date1);    // false (同一天不晚于自己)
```

### isBeforeDate

验证日期是否早于指定日期。

```typescript
function isBeforeDate(value: Date, comparisonDate: Date): boolean
```

**参数:**
- `value`: 要验证的日期
- `comparisonDate`: 比较基准日期

**返回值:**
- 如果日期早于比较日期则返回 `true`，否则返回 `false`

**示例:**

```javascript
import { isBeforeDate } from '@stratix/utils/validator';

const date1 = new Date('2023-01-15');
const date2 = new Date('2023-01-01');
const date3 = new Date('2023-01-30');

isBeforeDate(date1, date3);    // true (1月15日早于1月30日)
isBeforeDate(date1, date2);    // false (1月15日不早于1月1日)
isBeforeDate(date1, date1);    // false (同一天不早于自己)
``` 