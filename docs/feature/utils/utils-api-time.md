# @stratix/utils/time 时间工具函数文档

该模块提供了一系列用于处理日期和时间的实用工具函数，包括日期格式化、解析、比较以及计算等操作。

## 目录

- [format](#format)
- [parse](#parse)
- [now](#now)
- [isValid](#isvalid)
- [isAfter](#isafter)
- [isBefore](#isbefore)
- [isSameDay](#issameday)
- [isSameMonth](#issamemonth)
- [isSameYear](#issameyear)
- [addDays](#adddays)
- [addMonths](#addmonths)
- [addYears](#addyears)
- [differenceInDays](#differenceindays)
- [differenceInMonths](#differenceinmonths)
- [differenceInYears](#differenceinyears)
- [startOfDay](#startofday)
- [endOfDay](#endofday)
- [startOfMonth](#startofmonth)
- [endOfMonth](#endofmonth)
- [startOfYear](#startofyear)
- [endOfYear](#endofyear)
- [getRelativeTime](#getrelativetime)
- [formatDuration](#formatduration)

## 函数

### format

将日期格式化为字符串。

```typescript
function format(date: Date | number | string, formatStr: string, options?: FormatOptions): string
```

**参数:**
- `date`: 要格式化的日期（Date对象、时间戳或ISO日期字符串）
- `formatStr`: 格式化模板字符串
- `options`: 可选配置项
  - `locale`: 本地化设置
  - `weekStartsOn`: 一周的起始日（0表示星期日，1表示星期一，依此类推）

**返回值:**
- 格式化后的日期字符串

**示例:**

```javascript
import { format } from '@stratix/utils/time';

// 基本格式化
format(new Date(2023, 0, 15), 'yyyy-MM-dd'); // '2023-01-15'
format(new Date(2023, 0, 15, 14, 30, 45), 'yyyy-MM-dd HH:mm:ss'); // '2023-01-15 14:30:45'

// 使用本地化选项
format(new Date(2023, 0, 15), 'yyyy年MM月dd日', { locale: 'zh-CN' }); // '2023年01月15日'
```

### parse

将字符串解析为日期对象。

```typescript
function parse(dateStr: string, formatStr: string, referenceDate?: Date, options?: ParseOptions): Date
```

**参数:**
- `dateStr`: 日期字符串
- `formatStr`: 解析的格式模板
- `referenceDate`: 参考日期（可选）
- `options`: 可选配置项
  - `locale`: 本地化设置
  - `weekStartsOn`: 一周的起始日

**返回值:**
- 解析后的Date对象

**示例:**

```javascript
import { parse } from '@stratix/utils/time';

// 基本解析
const date = parse('2023-01-15', 'yyyy-MM-dd');
console.log(date); // 2023-01-15T00:00:00.000Z

// 带时间的解析
const dateTime = parse('2023-01-15 14:30:45', 'yyyy-MM-dd HH:mm:ss');
console.log(dateTime); // 2023-01-15T14:30:45.000Z
```

### now

获取当前时间的时间戳。

```typescript
function now(): number
```

**返回值:**
- 当前时间的毫秒级时间戳

**示例:**

```javascript
import { now } from '@stratix/utils/time';

const timestamp = now();
console.log(timestamp); // 例如：1673779200000
```

### isValid

检查给定值是否为有效的日期。

```typescript
function isValid(date: any): boolean
```

**参数:**
- `date`: 要检查的值

**返回值:**
- 如果是有效日期则返回`true`，否则返回`false`

**示例:**

```javascript
import { isValid } from '@stratix/utils/time';

isValid(new Date()); // true
isValid(new Date('2023-01-15')); // true
isValid(new Date('invalid date')); // false
isValid('2023-01-15'); // true (可以被解析为有效日期)
isValid('not a date'); // false
```

### isAfter

检查第一个日期是否晚于第二个日期。

```typescript
function isAfter(date: Date | number | string, dateToCompare: Date | number | string): boolean
```

**参数:**
- `date`: 要比较的日期
- `dateToCompare`: 被比较的日期

**返回值:**
- 如果`date`晚于`dateToCompare`则返回`true`，否则返回`false`

**示例:**

```javascript
import { isAfter } from '@stratix/utils/time';

isAfter(new Date(2023, 1, 15), new Date(2023, 0, 15)); // true
isAfter(new Date(2023, 0, 15), new Date(2023, 1, 15)); // false
isAfter('2023-02-15', '2023-01-15'); // true
```

### isBefore

检查第一个日期是否早于第二个日期。

```typescript
function isBefore(date: Date | number | string, dateToCompare: Date | number | string): boolean
```

**参数:**
- `date`: 要比较的日期
- `dateToCompare`: 被比较的日期

**返回值:**
- 如果`date`早于`dateToCompare`则返回`true`，否则返回`false`

**示例:**

```javascript
import { isBefore } from '@stratix/utils/time';

isBefore(new Date(2023, 0, 15), new Date(2023, 1, 15)); // true
isBefore(new Date(2023, 1, 15), new Date(2023, 0, 15)); // false
isBefore('2023-01-15', '2023-02-15'); // true
```

### isSameDay

检查两个日期是否为同一天。

```typescript
function isSameDay(dateLeft: Date | number | string, dateRight: Date | number | string): boolean
```

**参数:**
- `dateLeft`: 第一个日期
- `dateRight`: 第二个日期

**返回值:**
- 如果两个日期是同一天则返回`true`，否则返回`false`

**示例:**

```javascript
import { isSameDay } from '@stratix/utils/time';

isSameDay(new Date(2023, 0, 15, 10), new Date(2023, 0, 15, 15)); // true
isSameDay(new Date(2023, 0, 15), new Date(2023, 0, 16)); // false
isSameDay('2023-01-15T10:00:00', '2023-01-15T15:30:00'); // true
```

### isSameMonth

检查两个日期是否在同一个月。

```typescript
function isSameMonth(dateLeft: Date | number | string, dateRight: Date | number | string): boolean
```

**参数:**
- `dateLeft`: 第一个日期
- `dateRight`: 第二个日期

**返回值:**
- 如果两个日期在同一个月则返回`true`，否则返回`false`

**示例:**

```javascript
import { isSameMonth } from '@stratix/utils/time';

isSameMonth(new Date(2023, 0, 15), new Date(2023, 0, 25)); // true
isSameMonth(new Date(2023, 0, 15), new Date(2023, 1, 15)); // false
isSameMonth('2023-01-15', '2023-01-30'); // true
```

### isSameYear

检查两个日期是否在同一年。

```typescript
function isSameYear(dateLeft: Date | number | string, dateRight: Date | number | string): boolean
```

**参数:**
- `dateLeft`: 第一个日期
- `dateRight`: 第二个日期

**返回值:**
- 如果两个日期在同一年则返回`true`，否则返回`false`

**示例:**

```javascript
import { isSameYear } from '@stratix/utils/time';

isSameYear(new Date(2023, 0, 15), new Date(2023, 11, 31)); // true
isSameYear(new Date(2023, 0, 15), new Date(2024, 0, 15)); // false
isSameYear('2023-01-15', '2023-12-31'); // true
```

### addDays

添加指定天数到日期。

```typescript
function addDays(date: Date | number | string, amount: number): Date
```

**参数:**
- `date`: 原始日期
- `amount`: 要添加的天数（可以为负数）

**返回值:**
- 添加天数后的新日期

**示例:**

```javascript
import { addDays, format } from '@stratix/utils/time';

const newDate = addDays(new Date(2023, 0, 15), 5);
format(newDate, 'yyyy-MM-dd'); // '2023-01-20'

const subtractedDate = addDays(new Date(2023, 0, 15), -5);
format(subtractedDate, 'yyyy-MM-dd'); // '2023-01-10'
```

### addMonths

添加指定月数到日期。

```typescript
function addMonths(date: Date | number | string, amount: number): Date
```

**参数:**
- `date`: 原始日期
- `amount`: 要添加的月数（可以为负数）

**返回值:**
- 添加月数后的新日期

**示例:**

```javascript
import { addMonths, format } from '@stratix/utils/time';

const newDate = addMonths(new Date(2023, 0, 15), 3);
format(newDate, 'yyyy-MM-dd'); // '2023-04-15'

const subtractedDate = addMonths(new Date(2023, 0, 15), -1);
format(subtractedDate, 'yyyy-MM-dd'); // '2022-12-15'
```

### addYears

添加指定年数到日期。

```typescript
function addYears(date: Date | number | string, amount: number): Date
```

**参数:**
- `date`: 原始日期
- `amount`: 要添加的年数（可以为负数）

**返回值:**
- 添加年数后的新日期

**示例:**

```javascript
import { addYears, format } from '@stratix/utils/time';

const newDate = addYears(new Date(2023, 0, 15), 2);
format(newDate, 'yyyy-MM-dd'); // '2025-01-15'

const subtractedDate = addYears(new Date(2023, 0, 15), -1);
format(subtractedDate, 'yyyy-MM-dd'); // '2022-01-15'
```

### differenceInDays

计算两个日期之间的天数差异。

```typescript
function differenceInDays(dateLeft: Date | number | string, dateRight: Date | number | string): number
```

**参数:**
- `dateLeft`: 较晚的日期
- `dateRight`: 较早的日期

**返回值:**
- 两个日期之间的天数差异（向下取整）

**示例:**

```javascript
import { differenceInDays } from '@stratix/utils/time';

differenceInDays(new Date(2023, 0, 20), new Date(2023, 0, 15)); // 5
differenceInDays('2023-01-20', '2023-01-15'); // 5
differenceInDays(new Date(2023, 0, 15), new Date(2023, 0, 20)); // -5
```

### differenceInMonths

计算两个日期之间的月数差异。

```typescript
function differenceInMonths(dateLeft: Date | number | string, dateRight: Date | number | string): number
```

**参数:**
- `dateLeft`: 较晚的日期
- `dateRight`: 较早的日期

**返回值:**
- 两个日期之间的月数差异（向下取整）

**示例:**

```javascript
import { differenceInMonths } from '@stratix/utils/time';

differenceInMonths(new Date(2023, 3, 15), new Date(2023, 0, 15)); // 3
differenceInMonths(new Date(2023, 0, 15), new Date(2022, 9, 15)); // 3
differenceInMonths('2023-04-15', '2023-01-15'); // 3
```

### differenceInYears

计算两个日期之间的年数差异。

```typescript
function differenceInYears(dateLeft: Date | number | string, dateRight: Date | number | string): number
```

**参数:**
- `dateLeft`: 较晚的日期
- `dateRight`: 较早的日期

**返回值:**
- 两个日期之间的年数差异（向下取整）

**示例:**

```javascript
import { differenceInYears } from '@stratix/utils/time';

differenceInYears(new Date(2025, 0, 15), new Date(2023, 0, 15)); // 2
differenceInYears(new Date(2023, 0, 15), new Date(2021, 5, 15)); // 1.5 -> 1 (向下取整)
differenceInYears('2025-01-15', '2023-01-15'); // 2
```

### startOfDay

返回给定日期的当天开始时刻。

```typescript
function startOfDay(date: Date | number | string): Date
```

**参数:**
- `date`: 输入日期

**返回值:**
- 设置为当天 00:00:00.000 的新日期

**示例:**

```javascript
import { startOfDay, format } from '@stratix/utils/time';

const result = startOfDay(new Date(2023, 0, 15, 14, 30, 45));
format(result, 'yyyy-MM-dd HH:mm:ss.SSS'); // '2023-01-15 00:00:00.000'
```

### endOfDay

返回给定日期的当天结束时刻。

```typescript
function endOfDay(date: Date | number | string): Date
```

**参数:**
- `date`: 输入日期

**返回值:**
- 设置为当天 23:59:59.999 的新日期

**示例:**

```javascript
import { endOfDay, format } from '@stratix/utils/time';

const result = endOfDay(new Date(2023, 0, 15, 14, 30, 45));
format(result, 'yyyy-MM-dd HH:mm:ss.SSS'); // '2023-01-15 23:59:59.999'
```

### startOfMonth

返回给定日期的当月开始日期。

```typescript
function startOfMonth(date: Date | number | string): Date
```

**参数:**
- `date`: 输入日期

**返回值:**
- 设置为当月第一天 00:00:00.000 的新日期

**示例:**

```javascript
import { startOfMonth, format } from '@stratix/utils/time';

const result = startOfMonth(new Date(2023, 0, 15));
format(result, 'yyyy-MM-dd HH:mm:ss.SSS'); // '2023-01-01 00:00:00.000'
```

### endOfMonth

返回给定日期的当月结束日期。

```typescript
function endOfMonth(date: Date | number | string): Date
```

**参数:**
- `date`: 输入日期

**返回值:**
- 设置为当月最后一天 23:59:59.999 的新日期

**示例:**

```javascript
import { endOfMonth, format } from '@stratix/utils/time';

const result = endOfMonth(new Date(2023, 0, 15));
format(result, 'yyyy-MM-dd HH:mm:ss.SSS'); // '2023-01-31 23:59:59.999'
```

### startOfYear

返回给定日期的当年开始日期。

```typescript
function startOfYear(date: Date | number | string): Date
```

**参数:**
- `date`: 输入日期

**返回值:**
- 设置为当年第一天 00:00:00.000 的新日期

**示例:**

```javascript
import { startOfYear, format } from '@stratix/utils/time';

const result = startOfYear(new Date(2023, 5, 15));
format(result, 'yyyy-MM-dd HH:mm:ss.SSS'); // '2023-01-01 00:00:00.000'
```

### endOfYear

返回给定日期的当年结束日期。

```typescript
function endOfYear(date: Date | number | string): Date
```

**参数:**
- `date`: 输入日期

**返回值:**
- 设置为当年最后一天 23:59:59.999 的新日期

**示例:**

```javascript
import { endOfYear, format } from '@stratix/utils/time';

const result = endOfYear(new Date(2023, 5, 15));
format(result, 'yyyy-MM-dd HH:mm:ss.SSS'); // '2023-12-31 23:59:59.999'
```

### getRelativeTime

获取相对于当前时间的相对时间描述。

```typescript
function getRelativeTime(date: Date | number | string, options?: RelativeTimeOptions): string
```

**参数:**
- `date`: 要计算相对时间的日期
- `options`: 可选配置项
  - `locale`: 本地化设置
  - `now`: 参考时间点（默认为当前时间）

**返回值:**
- 相对时间描述字符串（如"5分钟前"、"3天后"等）

**示例:**

```javascript
import { getRelativeTime } from '@stratix/utils/time';

// 假设当前时间是 2023-01-15 12:00:00
const fiveMinutesAgo = new Date(2023, 0, 15, 11, 55);
getRelativeTime(fiveMinutesAgo); // '5分钟前'

const threeDaysLater = new Date(2023, 0, 18, 12, 0);
getRelativeTime(threeDaysLater); // '3天后'

// 使用英语本地化
getRelativeTime(fiveMinutesAgo, { locale: 'en' }); // '5 minutes ago'
```

### formatDuration

将持续时间（毫秒）格式化为人类可读的字符串。

```typescript
function formatDuration(durationMs: number, options?: FormatDurationOptions): string
```

**参数:**
- `durationMs`: 持续时间（毫秒）
- `options`: 可选配置项
  - `format`: 输出格式数组，如['years', 'months', 'days']
  - `delimiter`: 分隔符（默认为', '）
  - `locale`: 本地化设置
  - `zero`: 是否显示零值单位（默认为false）

**返回值:**
- 格式化后的持续时间字符串

**示例:**

```javascript
import { formatDuration } from '@stratix/utils/time';

// 格式化3天2小时30分钟（毫秒值：275400000）
formatDuration(275400000); // '3天, 2小时, 30分钟'

// 指定格式
formatDuration(275400000, { format: ['days', 'hours'] }); // '3天, 2小时'

// 使用不同的分隔符
formatDuration(275400000, { delimiter: ' ' }); // '3天 2小时 30分钟'

// 英语本地化
formatDuration(275400000, { locale: 'en' }); // '3 days, 2 hours, 30 minutes'
``` 