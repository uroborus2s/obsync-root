# @stratix/utils/string 字符串工具函数文档

本模块提供了一系列用于处理字符串的实用函数，可帮助开发者进行字符串转换、格式化、验证和操作等常见任务。

## 目录

- [@stratix/utils/string 字符串工具函数文档](#stratixutilsstring-字符串工具函数文档)
  - [目录](#目录)
  - [函数详情](#函数详情)
    - [trim(string, chars)](#trimstring-chars)
    - [capitalize(string)](#capitalizestring)
    - [camelCase(string)](#camelcasestring)
    - [kebabCase(string)](#kebabcasestring)
    - [snakeCase(string)](#snakecasestring)
    - [pascalCase(string)](#pascalcasestring)
    - [startsWith(string, target, position)](#startswithstring-target-position)
    - [endsWith(string, target, position)](#endswithstring-target-position)
    - [truncate(string, options)](#truncatestring-options)
    - [padStart(string, length, chars)](#padstartstring-length-chars)
    - [padEnd(string, length, chars)](#padendstring-length-chars)
    - [template(string, values)](#templatestring-values)
    - [escape(string)](#escapestring)
    - [unescape(string)](#unescapestring)

## 函数详情

<a id="trim"></a>
### trim(string, chars)

去除字符串两端的空格或指定字符。

**参数:**
- `string` `{string}`: 要处理的字符串
- `chars` `{string}`: (可选) 要去除的字符，默认为空格

**返回:**
- `{string}`: 处理后的字符串

**示例:**
```js
import { trim } from '@stratix/utils/string';

// 去除空格
console.log(trim('  Hello, World!  '));
// 'Hello, World!'

// 去除指定字符
console.log(trim('!!Hello, World!!', '!'));
// 'Hello, World'
```

<a id="capitalize"></a>
### capitalize(string)

将字符串的第一个字符转换为大写，其余部分转换为小写。

**参数:**
- `string` `{string}`: 要处理的字符串

**返回:**
- `{string}`: 处理后的字符串

**示例:**
```js
import { capitalize } from '@stratix/utils/string';

console.log(capitalize('hello'));
// 'Hello'

console.log(capitalize('HELLO'));
// 'Hello'

console.log(capitalize('hello world'));
// 'Hello world'
```

<a id="camelcase"></a>
### camelCase(string)

将字符串转换为驼峰式命名（小驼峰）。

**参数:**
- `string` `{string}`: 要处理的字符串

**返回:**
- `{string}`: 处理后的字符串

**示例:**
```js
import { camelCase } from '@stratix/utils/string';

console.log(camelCase('hello world'));
// 'helloWorld'

console.log(camelCase('hello-world'));
// 'helloWorld'

console.log(camelCase('hello_world'));
// 'helloWorld'

console.log(camelCase('HelloWorld'));
// 'helloWorld'
```

<a id="kebabcase"></a>
### kebabCase(string)

将字符串转换为短横线命名（中横线命名）。

**参数:**
- `string` `{string}`: 要处理的字符串

**返回:**
- `{string}`: 处理后的字符串

**示例:**
```js
import { kebabCase } from '@stratix/utils/string';

console.log(kebabCase('hello world'));
// 'hello-world'

console.log(kebabCase('helloWorld'));
// 'hello-world'

console.log(kebabCase('HelloWorld'));
// 'hello-world'

console.log(kebabCase('hello_world'));
// 'hello-world'
```

<a id="snakecase"></a>
### snakeCase(string)

将字符串转换为下划线命名。

**参数:**
- `string` `{string}`: 要处理的字符串

**返回:**
- `{string}`: 处理后的字符串

**示例:**
```js
import { snakeCase } from '@stratix/utils/string';

console.log(snakeCase('hello world'));
// 'hello_world'

console.log(snakeCase('helloWorld'));
// 'hello_world'

console.log(snakeCase('hello-world'));
// 'hello_world'

console.log(snakeCase('HelloWorld'));
// 'hello_world'
```

<a id="pascalcase"></a>
### pascalCase(string)

将字符串转换为帕斯卡命名（大驼峰）。

**参数:**
- `string` `{string}`: 要处理的字符串

**返回:**
- `{string}`: 处理后的字符串

**示例:**
```js
import { pascalCase } from '@stratix/utils/string';

console.log(pascalCase('hello world'));
// 'HelloWorld'

console.log(pascalCase('hello-world'));
// 'HelloWorld'

console.log(pascalCase('hello_world'));
// 'HelloWorld'

console.log(pascalCase('helloWorld'));
// 'HelloWorld'
```

<a id="startswith"></a>
### startsWith(string, target, position)

检查字符串是否以指定的目标字符串开头。

**参数:**
- `string` `{string}`: 要检查的字符串
- `target` `{string}`: 要搜索的目标字符串
- `position` `{number}`: (可选) 开始搜索的位置，默认为0

**返回:**
- `{boolean}`: 如果字符串以目标字符串开头，则返回true，否则返回false

**示例:**
```js
import { startsWith } from '@stratix/utils/string';

console.log(startsWith('Hello, World!', 'Hello'));
// true

console.log(startsWith('Hello, World!', 'World'));
// false

console.log(startsWith('Hello, World!', 'World', 7));
// true
```

<a id="endswith"></a>
### endsWith(string, target, position)

检查字符串是否以指定的目标字符串结尾。

**参数:**
- `string` `{string}`: 要检查的字符串
- `target` `{string}`: 要搜索的目标字符串
- `position` `{number}`: (可选) 结束搜索的位置，默认为字符串长度

**返回:**
- `{boolean}`: 如果字符串以目标字符串结尾，则返回true，否则返回false

**示例:**
```js
import { endsWith } from '@stratix/utils/string';

console.log(endsWith('Hello, World!', 'World!'));
// true

console.log(endsWith('Hello, World!', 'Hello'));
// false

console.log(endsWith('Hello, World!', 'Hello', 5));
// true
```

<a id="truncate"></a>
### truncate(string, options)

截断字符串，如果超出指定长度则添加省略符号。

**参数:**
- `string` `{string}`: 要截断的字符串
- `options` `{Object}`: 截断选项
  - `length` `{number}`: 截断长度，默认为30
  - `omission` `{string}`: 省略符号，默认为'...'
  - `separator` `{RegExp|string}`: (可选) 在哪里截断的分隔符

**返回:**
- `{string}`: 截断后的字符串

**示例:**
```js
import { truncate } from '@stratix/utils/string';

console.log(truncate('这是一个很长的句子，需要被截断', { length: 10 }));
// '这是一个很...'

console.log(truncate('这是一个很长的句子，需要被截断', { 
  length: 12,
  omission: '..更多' 
}));
// '这是一个很..更多'

console.log(truncate('这是一个很长的句子，需要被截断', { 
  length: 15,
  separator: '，' 
}));
// '这是一个很长的句子...'
```

<a id="padstart"></a>
### padStart(string, length, chars)

在字符串左侧填充指定字符，直到达到指定长度。

**参数:**
- `string` `{string}`: 要填充的字符串
- `length` `{number}`: 目标长度
- `chars` `{string}`: (可选) 填充字符，默认为空格

**返回:**
- `{string}`: 填充后的字符串

**示例:**
```js
import { padStart } from '@stratix/utils/string';

console.log(padStart('123', 5));
// '  123'

console.log(padStart('123', 5, '0'));
// '00123'

console.log(padStart('123', 10, '0-'));
// '0-0-0-0123'
```

<a id="padend"></a>
### padEnd(string, length, chars)

在字符串右侧填充指定字符，直到达到指定长度。

**参数:**
- `string` `{string}`: 要填充的字符串
- `length` `{number}`: 目标长度
- `chars` `{string}`: (可选) 填充字符，默认为空格

**返回:**
- `{string}`: 填充后的字符串

**示例:**
```js
import { padEnd } from '@stratix/utils/string';

console.log(padEnd('123', 5));
// '123  '

console.log(padEnd('123', 5, '0'));
// '12300'

console.log(padEnd('123', 10, '-='));
// '123-=-=-='
```

<a id="template"></a>
### template(string, values)

使用提供的值来插入字符串模板中的占位符。

**参数:**
- `string` `{string}`: 包含占位符的模板字符串
- `values` `{Object}`: 要替换的值对象

**返回:**
- `{string}`: 替换后的字符串

**示例:**
```js
import { template } from '@stratix/utils/string';

// 使用 {{name}} 形式的占位符
const greeting = template('你好，{{name}}！今天是{{day}}。', {
  name: '张三',
  day: '星期一'
});

console.log(greeting);
// '你好，张三！今天是星期一。'

// 嵌套属性
const message = template('项目{{project.name}}的状态是：{{project.status}}', {
  project: {
    name: '营销活动',
    status: '进行中'
  }
});

console.log(message);
// '项目营销活动的状态是：进行中'
```

<a id="escape"></a>
### escape(string)

转义HTML特殊字符。

**参数:**
- `string` `{string}`: 要转义的字符串

**返回:**
- `{string}`: 转义后的字符串

**示例:**
```js
import { escape } from '@stratix/utils/string';

console.log(escape('<p>这是一段HTML文本 & 符号</p>'));
// '&lt;p&gt;这是一段HTML文本 &amp; 符号&lt;/p&gt;'
```

<a id="unescape"></a>
### unescape(string)

反转义HTML特殊字符。

**参数:**
- `string` `{string}`: 要反转义的字符串

**返回:**
- `{string}`: 反转义后的字符串

**示例:**
```js
import { unescape } from '@stratix/utils/string';

console.log(unescape('&lt;p&gt;这是一段HTML文本 &amp; 符号&lt;/p&gt;'));
// '<p>这是一段HTML文本 & 符号</p>'
``` 