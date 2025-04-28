# @stratix/utils/i18n 国际化工具函数文档

该模块提供了一系列用于国际化(i18n)的工具函数，帮助开发者实现多语言支持、本地化格式化和国际化相关功能。

## 目录

- [语言和区域设置函数](#语言和区域设置函数)
  - [getLocale](#getlocale)
  - [setLocale](#setlocale)
  - [getSupportedLocales](#getsupportedlocales)
  - [detectLocale](#detectlocale)
  - [isRTL](#isrtl)

- [文本翻译函数](#文本翻译函数)
  - [translate](#translate)
  - [translatePlural](#translateplural)
  - [createTranslator](#createtranslator)
  - [loadTranslations](#loadtranslations)
  - [registerTranslation](#registertranslation)

- [日期和时间格式化函数](#日期和时间格式化函数)
  - [formatDate](#formatdate)
  - [formatTime](#formattime)
  - [formatDateTime](#formatdatetime)
  - [formatRelativeTime](#formatrelativetime)

- [数字和货币格式化函数](#数字和货币格式化函数)
  - [formatNumber](#formatnumber)
  - [formatCurrency](#formatcurrency)
  - [formatPercent](#formatpercent)
  - [formatUnit](#formatunit)

## 语言和区域设置函数

### getLocale

获取当前使用的区域设置。

```typescript
function getLocale(): string
```

**返回值:**
- 当前区域设置编码，例如 'zh-CN', 'en-US'

**示例:**

```javascript
import { getLocale } from '@stratix/utils/i18n';

// 获取当前区域设置
const currentLocale = getLocale();
console.log('当前区域设置:', currentLocale); // 例如: 'zh-CN'
```

### setLocale

设置当前区域设置。

```typescript
function setLocale(locale: string): boolean
```

**参数:**
- `locale`: 要设置的区域设置编码

**返回值:**
- 设置是否成功

**示例:**

```javascript
import { setLocale, getLocale } from '@stratix/utils/i18n';

// 设置应用区域为英语(美国)
const success = setLocale('en-US');

if (success) {
  console.log('区域设置已更改为:', getLocale()); // 'en-US'
} else {
  console.error('不支持的区域设置');
}
```

### getSupportedLocales

获取支持的所有区域设置列表。

```typescript
function getSupportedLocales(): Array<{ code: string, name: string }>
```

**返回值:**
- 支持的区域设置对象数组，每个对象包含区域代码和名称

**示例:**

```javascript
import { getSupportedLocales } from '@stratix/utils/i18n';

// 获取所有支持的区域设置
const locales = getSupportedLocales();

// 显示语言选择下拉列表
function renderLanguageSelector() {
  return (
    `<select>
      ${locales.map(locale => 
        `<option value="${locale.code}">${locale.name}</option>`
      ).join('')}
    </select>`
  );
}
```

### detectLocale

自动检测用户的首选区域设置。

```typescript
function detectLocale(fallback?: string): string
```

**参数:**
- `fallback`: 如果无法检测到区域设置时的回退设置（可选，默认为'en-US'）

**返回值:**
- 检测到的区域设置编码

**示例:**

```javascript
import { detectLocale, setLocale } from '@stratix/utils/i18n';

// 初始化应用时检测并设置用户区域
function initializeApp() {
  // 检测用户区域，如果无法检测则使用中文
  const detectedLocale = detectLocale('zh-CN');
  
  // 设置应用区域
  setLocale(detectedLocale);
  console.log('应用区域已设置为:', detectedLocale);
  
  // 继续应用初始化...
}
```

### isRTL

检查指定区域设置是否为从右到左(RTL)书写方式。

```typescript
function isRTL(locale?: string): boolean
```

**参数:**
- `locale`: 要检查的区域设置（可选，不指定则使用当前区域设置）

**返回值:**
- 如果是RTL书写方向则返回true，否则返回false

**示例:**

```javascript
import { isRTL, getLocale } from '@stratix/utils/i18n';

// 根据当前区域设置自动调整布局方向
function adjustLayoutDirection() {
  const currentLocale = getLocale();
  
  if (isRTL(currentLocale)) {
    document.documentElement.setAttribute('dir', 'rtl');
    document.body.classList.add('rtl-layout');
    console.log('应用布局方向设置为RTL (从右到左)');
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
    document.body.classList.remove('rtl-layout');
    console.log('应用布局方向设置为LTR (从左到右)');
  }
}
```

## 文本翻译函数

### translate

翻译文本消息。

```typescript
function translate(key: string, params?: Record<string, any>, locale?: string): string
```

**参数:**
- `key`: 翻译键
- `params`: 用于替换消息中占位符的参数（可选）
- `locale`: 使用的区域设置（可选，默认使用当前区域设置）

**返回值:**
- 翻译后的文本

**示例:**

```javascript
import { translate } from '@stratix/utils/i18n';

// 简单翻译
const message = translate('common.welcome'); // 例如："欢迎使用"

// 带参数的翻译
const greeting = translate('common.greeting', { name: '张三' }); 
// 如果翻译为 "你好，{name}！"，则结果为 "你好，张三！"

// 指定区域的翻译
const enMessage = translate('common.welcome', {}, 'en-US'); // "Welcome"
```

### translatePlural

根据数量选择正确复数形式的翻译。

```typescript
function translatePlural(key: string, count: number, params?: Record<string, any>, locale?: string): string
```

**参数:**
- `key`: 翻译键
- `count`: 数量值，用于选择正确的复数形式
- `params`: 用于替换消息中占位符的参数（可选）
- `locale`: 使用的区域设置（可选，默认使用当前区域设置）

**返回值:**
- 翻译后的文本

**示例:**

```javascript
import { translatePlural } from '@stratix/utils/i18n';

// 根据项目数量显示正确的消息
function showItemCount(count) {
  // 英语有两种复数形式: 1个项目 vs 多个项目
  // 翻译定义例如: { "one": "You have {count} item", "other": "You have {count} items" }
  const message = translatePlural('items.count', count, { count });
  return message;
}

console.log(showItemCount(1)); // "You have 1 item"
console.log(showItemCount(5)); // "You have 5 items"

// 中文没有复数形式变化，但仍可以使用同一API
console.log(translatePlural('items.count', 5, { count: 5 }, 'zh-CN')); // "你有5个项目"
```

### createTranslator

创建一个预设了命名空间的翻译器函数。

```typescript
function createTranslator(namespace: string): {
  t: (key: string, params?: Record<string, any>, locale?: string) => string,
  tp: (key: string, count: number, params?: Record<string, any>, locale?: string) => string
}
```

**参数:**
- `namespace`: 翻译键的命名空间前缀

**返回值:**
- 包含预设命名空间的翻译函数对象，具有以下方法：
  - `t`: 等同于translate，但自动添加命名空间前缀
  - `tp`: 等同于translatePlural，但自动添加命名空间前缀

**示例:**

```javascript
import { createTranslator } from '@stratix/utils/i18n';

// 为用户模块创建专用翻译器
const userI18n = createTranslator('user');

function UserProfile() {
  // 使用命名空间翻译器简化键名
  const title = userI18n.t('profile.title'); // 实际键名为 "user.profile.title"
  const lastLogin = userI18n.t('profile.lastLogin', { date: new Date() });
  const messageCount = userI18n.tp('messages.count', 5, { count: 5 });
  
  return `
    <div class="user-profile">
      <h2>${title}</h2>
      <p>${lastLogin}</p>
      <p>${messageCount}</p>
    </div>
  `;
}
```

### loadTranslations

加载翻译文件或对象到翻译系统。

```typescript
function loadTranslations(localeCode: string, translations: Record<string, any>): void
```

**参数:**
- `localeCode`: 区域设置编码
- `translations`: 包含该区域设置翻译的对象

**返回值:**
- 无

**示例:**

```javascript
import { loadTranslations, setLocale } from '@stratix/utils/i18n';

// 加载中文翻译
const zhCN = {
  common: {
    welcome: '欢迎使用',
    greeting: '你好，{name}！'
  },
  user: {
    profile: {
      title: '用户信息',
      lastLogin: '上次登录时间：{date}'
    }
  }
};

// 加载英文翻译
const enUS = {
  common: {
    welcome: 'Welcome',
    greeting: 'Hello, {name}!'
  },
  user: {
    profile: {
      title: 'User Profile',
      lastLogin: 'Last login: {date}'
    }
  }
};

// 初始化国际化设置
function initializeI18n() {
  loadTranslations('zh-CN', zhCN);
  loadTranslations('en-US', enUS);
  setLocale('zh-CN'); // 默认使用中文
}

initializeI18n();
```

### registerTranslation

注册单个翻译键值对。

```typescript
function registerTranslation(locale: string, key: string, value: string): void
```

**参数:**
- `locale`: 区域设置编码
- `key`: 翻译键
- `value`: 翻译值

**返回值:**
- 无

**示例:**

```javascript
import { registerTranslation, translate } from '@stratix/utils/i18n';

// 注册新的翻译条目
registerTranslation('zh-CN', 'app.version', '版本 {version}');
registerTranslation('en-US', 'app.version', 'Version {version}');

// 使用新注册的翻译
const versionText = translate('app.version', { version: '1.0.0' });
console.log(versionText); // 根据当前区域设置显示对应语言
```

## 日期和时间格式化函数

### formatDate

格式化日期，根据当前区域设置自动选择适当的日期格式。

```typescript
function formatDate(date: Date | number | string, options?: DateFormatOptions, locale?: string): string
```

**参数:**
- `date`: 要格式化的日期（Date对象、时间戳或ISO日期字符串）
- `options`: 格式化选项（可选）
  - `format`: 预设格式（'short', 'medium', 'long', 'full'）或自定义格式字符串
  - 其他 Intl.DateTimeFormat 支持的选项
- `locale`: 使用的区域设置（可选，默认使用当前区域设置）

**返回值:**
- 格式化后的日期字符串

**示例:**

```javascript
import { formatDate } from '@stratix/utils/i18n';

const date = new Date('2023-05-15');

// 使用默认格式
console.log(formatDate(date)); // 中文环境: "2023/5/15"，英文环境: "5/15/2023"

// 使用预设格式
console.log(formatDate(date, { format: 'long' })); // 中文环境: "2023年5月15日"，英文环境: "May 15, 2023"

// 自定义格式
console.log(formatDate(date, { 
  year: 'numeric', 
  month: '2-digit', 
  day: '2-digit',
  weekday: 'short'
})); // 中文环境: "周一, 2023年05月15日"，英文环境: "Mon, 05/15/2023"

// 指定区域设置
console.log(formatDate(date, { format: 'full' }, 'ja-JP')); // 日文: "2023年5月15日月曜日"
```

### formatTime

格式化时间，根据当前区域设置自动选择适当的时间格式。

```typescript
function formatTime(time: Date | number | string, options?: TimeFormatOptions, locale?: string): string
```

**参数:**
- `time`: 要格式化的时间（Date对象、时间戳或ISO日期字符串）
- `options`: 格式化选项（可选）
  - `format`: 预设格式（'short', 'medium', 'long', 'full'）或自定义格式字符串
  - `hour12`: 是否使用12小时制（默认根据区域自动判断）
  - 其他 Intl.DateTimeFormat 支持的选项
- `locale`: 使用的区域设置（可选，默认使用当前区域设置）

**返回值:**
- 格式化后的时间字符串

**示例:**

```javascript
import { formatTime } from '@stratix/utils/i18n';

const time = new Date('2023-05-15T14:30:45');

// 使用默认格式
console.log(formatTime(time)); // 中文环境: "14:30:45"，英文环境: "2:30:45 PM"

// 使用预设格式
console.log(formatTime(time, { format: 'short' })); // 中文环境: "14:30"，英文环境: "2:30 PM"

// 强制使用24小时制
console.log(formatTime(time, { hour12: false })); // "14:30:45"

// 强制使用12小时制
console.log(formatTime(time, { hour12: true })); // "下午2:30:45" 或 "2:30:45 PM"

// 指定区域设置
console.log(formatTime(time, { format: 'medium' }, 'de-DE')); // 德文: "14:30:45"
```

### formatDateTime

格式化日期和时间，根据当前区域设置自动选择适当的格式。

```typescript
function formatDateTime(dateTime: Date | number | string, options?: DateTimeFormatOptions, locale?: string): string
```

**参数:**
- `dateTime`: 要格式化的日期和时间（Date对象、时间戳或ISO日期字符串）
- `options`: 格式化选项（可选）
  - `format`: 预设格式（'short', 'medium', 'long', 'full'）或自定义格式字符串
  - `dateStyle`: 日期风格
  - `timeStyle`: 时间风格
  - 其他 Intl.DateTimeFormat 支持的选项
- `locale`: 使用的区域设置（可选，默认使用当前区域设置）

**返回值:**
- 格式化后的日期和时间字符串

**示例:**

```javascript
import { formatDateTime } from '@stratix/utils/i18n';

const dateTime = new Date('2023-05-15T14:30:45');

// 使用默认格式
console.log(formatDateTime(dateTime)); 
// 中文环境: "2023/5/15 14:30:45"，英文环境: "5/15/2023, 2:30:45 PM"

// 使用预设格式
console.log(formatDateTime(dateTime, { format: 'short' })); 
// 中文环境: "2023/5/15 14:30"，英文环境: "5/15/23, 2:30 PM"

// 使用日期和时间风格
console.log(formatDateTime(dateTime, { 
  dateStyle: 'full', 
  timeStyle: 'medium' 
}));
// 中文环境: "2023年5月15日星期一 14:30:45"，英文环境: "Monday, May 15, 2023 at 2:30:45 PM"

// 指定区域设置
console.log(formatDateTime(dateTime, { format: 'medium' }, 'fr-FR')); 
// 法文: "15 mai 2023 à 14:30:45"
```

### formatRelativeTime

格式化相对时间（例如"3小时前"、"2天后"）。

```typescript
function formatRelativeTime(date: Date | number | string, options?: RelativeTimeFormatOptions, locale?: string): string
```

**参数:**
- `date`: 要相对于当前时间格式化的日期
- `options`: 格式化选项（可选）
  - `now`: 作为参考的当前时间（默认为new Date()）
  - `style`: 格式风格（'long', 'short', 'narrow'）
  - `numeric`: 使用文字('auto')还是数值('always')
- `locale`: 使用的区域设置（可选，默认使用当前区域设置）

**返回值:**
- 格式化后的相对时间字符串

**示例:**

```javascript
import { formatRelativeTime } from '@stratix/utils/i18n';

// 过去的时间
const pastDate = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3小时前
console.log(formatRelativeTime(pastDate)); // 中文环境: "3小时前"，英文环境: "3 hours ago"

// 未来的时间
const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2天后
console.log(formatRelativeTime(futureDate)); // 中文环境: "2天后"，英文环境: "in 2 days"

// 使用短格式
console.log(formatRelativeTime(pastDate, { style: 'short' })); // 中文环境: "3小时前"，英文环境: "3 hr. ago"

// 使用不同区域设置
console.log(formatRelativeTime(pastDate, {}, 'ja-JP')); // 日文: "3時間前"
```

## 数字和货币格式化函数

### formatNumber

格式化数字，根据当前区域设置自动选择适当的格式。

```typescript
function formatNumber(value: number, options?: NumberFormatOptions, locale?: string): string
```

**参数:**
- `value`: 要格式化的数字
- `options`: 格式化选项（可选）
  - `precision`: 小数位数
  - `useGrouping`: 是否使用千位分隔符
  - 其他 Intl.NumberFormat 支持的选项
- `locale`: 使用的区域设置（可选，默认使用当前区域设置）

**返回值:**
- 格式化后的数字字符串

**示例:**

```javascript
import { formatNumber } from '@stratix/utils/i18n';

// 基本格式化
console.log(formatNumber(1234567.89)); 
// 中文环境: "1,234,567.89"，英文环境: "1,234,567.89"

// 控制小数位数
console.log(formatNumber(1234.56789, { precision: 2 })); // "1,234.57"

// 禁用千位分隔符
console.log(formatNumber(1234567.89, { useGrouping: false })); // "1234567.89"

// 使用科学计数法
console.log(formatNumber(1234567.89, { notation: 'scientific' })); // "1.23E6"

// 使用指定区域设置
console.log(formatNumber(1234567.89, {}, 'de-DE')); // 德文: "1.234.567,89"
```

### formatCurrency

格式化货币，根据当前区域设置自动选择适当的货币符号和格式。

```typescript
function formatCurrency(value: number, currency: string, options?: CurrencyFormatOptions, locale?: string): string
```

**参数:**
- `value`: 要格式化的金额
- `currency`: 货币代码（ISO 4217格式，如 'CNY', 'USD', 'EUR'）
- `options`: 格式化选项（可选）
  - `precision`: 小数位数（默认根据货币自动判断）
  - `display`: 货币符号显示方式（'symbol', 'code', 'name'）
  - 其他 Intl.NumberFormat 支持的选项
- `locale`: 使用的区域设置（可选，默认使用当前区域设置）

**返回值:**
- 格式化后的货币字符串

**示例:**

```javascript
import { formatCurrency } from '@stratix/utils/i18n';

// 基本货币格式化
console.log(formatCurrency(1234.56, 'CNY')); // 中文环境: "¥1,234.56"，英文环境: "CN¥1,234.56"
console.log(formatCurrency(1234.56, 'USD')); // 中文环境: "US$1,234.56"，英文环境: "$1,234.56"

// 控制小数位数
console.log(formatCurrency(1234.5, 'JPY', { precision: 0 })); // "¥1,235"
console.log(formatCurrency(1234.56, 'EUR', { precision: 2 })); // "€1,234.56"

// 不同的货币符号显示方式
console.log(formatCurrency(1234.56, 'USD', { display: 'symbol' })); // "$1,234.56"
console.log(formatCurrency(1234.56, 'USD', { display: 'code' })); // "USD 1,234.56"
console.log(formatCurrency(1234.56, 'USD', { display: 'name' })); // "1,234.56 US dollars"

// 使用指定区域设置
console.log(formatCurrency(1234.56, 'EUR', {}, 'de-DE')); // 德文: "1.234,56 €"
```

### formatPercent

格式化百分比。

```typescript
function formatPercent(value: number, options?: PercentFormatOptions, locale?: string): string
```

**参数:**
- `value`: 要格式化的数字（1.0 = 100%）
- `options`: 格式化选项（可选）
  - `precision`: 小数位数
  - 其他 Intl.NumberFormat 支持的选项
- `locale`: 使用的区域设置（可选，默认使用当前区域设置）

**返回值:**
- 格式化后的百分比字符串

**示例:**

```javascript
import { formatPercent } from '@stratix/utils/i18n';

// 基本百分比格式化
console.log(formatPercent(0.1234)); // "12.34%"

// 控制小数位数
console.log(formatPercent(0.126, { precision: 1 })); // "12.6%"
console.log(formatPercent(0.126, { precision: 0 })); // "13%"

// 使用指定区域设置
console.log(formatPercent(0.1234, {}, 'de-DE')); // 德文: "12,34 %"
```

### formatUnit

格式化带有单位的数字。

```typescript
function formatUnit(value: number, unit: string, options?: UnitFormatOptions, locale?: string): string
```

**参数:**
- `value`: 要格式化的数字
- `unit`: 单位标识符，如 'meter', 'kilogram', 'celsius'
- `options`: 格式化选项（可选）
  - `precision`: 小数位数
  - `unitDisplay`: 单位显示方式（'short', 'long', 'narrow'）
  - 其他 Intl.NumberFormat 支持的选项
- `locale`: 使用的区域设置（可选，默认使用当前区域设置）

**返回值:**
- 格式化后的带单位的字符串

**示例:**

```javascript
import { formatUnit } from '@stratix/utils/i18n';

// 基本单位格式化
console.log(formatUnit(100, 'meter')); // "100 m"
console.log(formatUnit(25, 'celsius')); // "25°C"

// 不同的单位显示方式
console.log(formatUnit(100, 'meter', { unitDisplay: 'short' })); // "100 m"
console.log(formatUnit(100, 'meter', { unitDisplay: 'long' })); // "100 meters"
console.log(formatUnit(100, 'meter', { unitDisplay: 'narrow' })); // "100m"

// 控制小数位数
console.log(formatUnit(10.5678, 'kilogram', { precision: 2 })); // "10.57 kg"

// 使用指定区域设置
console.log(formatUnit(100, 'meter', {}, 'fr-FR')); // 法文: "100 m"
console.log(formatUnit(100, 'meter', { unitDisplay: 'long' }, 'fr-FR')); // 法文: "100 mètres"
``` 