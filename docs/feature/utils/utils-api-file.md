# @stratix/utils/file 文件工具函数文档

本模块提供了一系列用于处理文件的实用函数，可帮助开发者进行文件操作、文件类型判断以及文件内容处理等常见任务。

## 目录

- [@stratix/utils/file 文件工具函数文档](#stratixutilsfile-文件工具函数文档)
  - [目录](#目录)
  - [函数详情](#函数详情)
    - [exists(path)](#existspath)
    - [isDirectory(path)](#isdirectorypath)
    - [isFile(path)](#isfilepath)
    - [readFile(path, options)](#readfilepath-options)
    - [writeFile(path, data, options)](#writefilepath-data-options)
    - [copyFile(src, dest, options)](#copyfilesrc-dest-options)
    - [moveFile(src, dest, options)](#movefilesrc-dest-options)
    - [removeFile(path)](#removefilepath)
    - [glob(pattern, options)](#globpattern-options)
    - [getMimeType(path)](#getmimetypepath)
    - [getCurrentDirname(importMetaUrl)](#getcurrentdirnameimportmetaurl)
    - [getCurrentFilename(importMetaUrl)](#getcurrentfilenameimportmetaurl)

## 函数详情

<a id="exists"></a>
### exists(path)

检查给定路径是否存在。

**参数:**
- `path` `{string}`: 要检查的路径

**返回:**
- `{Promise<boolean>}`: 如果路径存在则为true，否则为false

**示例:**
```js
import { exists } from '@stratix/utils/file';

// 检查文件是否存在
const checkFile = async () => {
  const fileExists = await exists('./config.json');
  if (fileExists) {
    console.log('配置文件存在');
  } else {
    console.log('配置文件不存在');
  }
};

// 在上传前检查文件是否已存在
async function uploadFile(filename) {
  if (await exists(`./uploads/${filename}`)) {
    return '文件已存在，请重命名后再上传';
  }
  
  // 继续上传逻辑
  return '文件上传成功';
}
```

<a id="isdirectory"></a>
### isDirectory(path)

检查给定路径是否为目录。

**参数:**
- `path` `{string}`: 要检查的路径

**返回:**
- `{Promise<boolean>}`: 如果是目录则为true，否则为false

**示例:**
```js
import { isDirectory } from '@stratix/utils/file';

// 检查路径是否为目录
const checkPath = async () => {
  const isDir = await isDirectory('./src');
  if (isDir) {
    console.log('这是一个目录');
  } else {
    console.log('这不是一个目录');
  }
};

// 递归处理目录
async function processPath(path) {
  if (await isDirectory(path)) {
    // 处理目录
    const files = await readDir(path);
    for (const file of files) {
      await processPath(`${path}/${file}`);
    }
  } else {
    // 处理文件
    console.log(`处理文件: ${path}`);
  }
}
```

<a id="isfile"></a>
### isFile(path)

检查给定路径是否为常规文件。

**参数:**
- `path` `{string}`: 要检查的路径

**返回:**
- `{Promise<boolean>}`: 如果是文件则为true，否则为false

**示例:**
```js
import { isFile } from '@stratix/utils/file';

// 检查路径是否为文件
const checkPath = async () => {
  const isRegularFile = await isFile('./package.json');
  if (isRegularFile) {
    console.log('这是一个文件');
  } else {
    console.log('这不是一个文件');
  }
};

// 仅处理JavaScript文件
async function processJSFiles(files) {
  for (const file of files) {
    if (await isFile(file) && file.endsWith('.js')) {
      console.log(`处理JS文件: ${file}`);
      // 处理JavaScript文件的逻辑
    }
  }
}
```

<a id="readfile"></a>
### readFile(path, options)

读取文件的全部内容。

**参数:**
- `path` `{string}`: 文件路径
- `options` `{Object|string}`: (可选) 选项对象或编码字符串
  - `encoding` `{string}`: 文件编码，默认为'utf8'
  - `flag` `{string}`: 文件系统标志，默认为'r'

**返回:**
- `{Promise<string|Buffer>}`: 文件内容，如果指定了编码则为字符串，否则为Buffer

**示例:**
```js
import { readFile } from '@stratix/utils/file';

// 读取文本文件
const readConfig = async () => {
  try {
    const content = await readFile('./config.json', 'utf8');
    const config = JSON.parse(content);
    console.log('配置加载成功:', config);
    return config;
  } catch (error) {
    console.error('读取配置文件失败:', error.message);
    return {};
  }
};

// 读取二进制文件
async function readImage() {
  try {
    const imageBuffer = await readFile('./assets/logo.png');
    console.log(`图片大小: ${imageBuffer.length} 字节`);
    return imageBuffer;
  } catch (error) {
    console.error('读取图片失败:', error);
    return null;
  }
}
```

<a id="writefile"></a>
### writeFile(path, data, options)

将数据写入文件，如果文件已存在则覆盖。

**参数:**
- `path` `{string}`: 文件路径
- `data` `{string|Buffer|TypedArray|DataView}`: 要写入的数据
- `options` `{Object|string}`: (可选) 选项对象或编码字符串
  - `encoding` `{string}`: 文件编码，默认为'utf8'
  - `mode` `{number}`: 文件权限，默认为0o666
  - `flag` `{string}`: 文件系统标志，默认为'w'

**返回:**
- `{Promise<void>}`: 成功时解析为void

**示例:**
```js
import { writeFile } from '@stratix/utils/file';

// 写入JSON数据
const saveConfig = async (config) => {
  try {
    const data = JSON.stringify(config, null, 2);
    await writeFile('./config.json', data, 'utf8');
    console.log('配置保存成功');
  } catch (error) {
    console.error('保存配置失败:', error.message);
  }
};

// 写入二进制数据
async function saveImage(buffer) {
  try {
    await writeFile('./output/image.png', buffer);
    console.log('图片保存成功');
    return true;
  } catch (error) {
    console.error('保存图片失败:', error);
    return false;
  }
}
```

<a id="copyfile"></a>
### copyFile(src, dest, options)

将文件从源路径复制到目标路径。

**参数:**
- `src` `{string}`: 源文件路径
- `dest` `{string}`: 目标文件路径
- `options` `{Object}`: (可选) 选项对象
  - `overwrite` `{boolean}`: 如果目标存在是否覆盖，默认为true
  - `errorOnExist` `{boolean}`: 如果目标存在且不覆盖，是否抛出错误，默认为false

**返回:**
- `{Promise<void>}`: 成功时解析为void

**示例:**
```js
import { copyFile } from '@stratix/utils/file';

// 复制配置文件
const backupConfig = async () => {
  try {
    await copyFile('./config.json', './backups/config.backup.json');
    console.log('配置文件备份成功');
  } catch (error) {
    console.error('备份配置失败:', error.message);
  }
};

// 复制模板文件，不覆盖现有文件
async function setupTemplate(templateName, targetPath) {
  try {
    await copyFile(
      `./templates/${templateName}.html`,
      targetPath,
      { overwrite: false }
    );
    console.log(`模板 ${templateName} 设置成功`);
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') {
      console.log('目标文件已存在，跳过复制');
      return true;
    }
    console.error('设置模板失败:', error);
    return false;
  }
}
```

<a id="movefile"></a>
### moveFile(src, dest, options)

将文件从源路径移动到目标路径。

**参数:**
- `src` `{string}`: 源文件路径
- `dest` `{string}`: 目标文件路径
- `options` `{Object}`: (可选) 选项对象
  - `overwrite` `{boolean}`: 如果目标存在是否覆盖，默认为true

**返回:**
- `{Promise<void>}`: 成功时解析为void

**示例:**
```js
import { moveFile } from '@stratix/utils/file';

// 移动上传文件到正确位置
const finalizeUpload = async (tempPath, username) => {
  try {
    await moveFile(tempPath, `./uploads/${username}/profile.jpg`);
    console.log('文件上传完成');
    return true;
  } catch (error) {
    console.error('移动文件失败:', error.message);
    return false;
  }
};

// 移动到存档目录
async function archiveFile(filePath) {
  const filename = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = `./archives/${timestamp}_${filename}`;
  
  try {
    await moveFile(filePath, archivePath);
    console.log(`文件已存档: ${archivePath}`);
    return archivePath;
  } catch (error) {
    console.error('存档文件失败:', error);
    return null;
  }
}
```

<a id="removefile"></a>
### removeFile(path)

删除文件或目录。

**参数:**
- `path` `{string}`: 要删除的文件或目录路径

**返回:**
- `{Promise<void>}`: 成功时解析为void

**示例:**
```js
import { removeFile } from '@stratix/utils/file';

// 删除临时文件
const cleanupTemp = async () => {
  try {
    await removeFile('./temp/cache.tmp');
    console.log('临时文件清理完成');
  } catch (error) {
    console.error('清理临时文件失败:', error.message);
  }
};

// 删除过期日志文件
async function removeOldLogs(days) {
  const oldLogsDir = `./logs/older-than-${days}-days`;
  
  try {
    await removeFile(oldLogsDir);
    console.log(`已删除 ${days} 天前的日志`);
    return true;
  } catch (error) {
    console.error('删除旧日志失败:', error);
    return false;
  }
}
```

<a id="glob"></a>
### glob(pattern, options)

使用glob模式匹配文件路径。

**参数:**
- `pattern` `{string}`: glob模式
- `options` `{Object}`: (可选) 选项对象
  - `cwd` `{string}`: 当前工作目录，默认为process.cwd()
  - `dot` `{boolean}`: 是否包含点文件，默认为false
  - `ignore` `{Array<string>}`: 忽略的模式列表

**返回:**
- `{Promise<Array<string>>}`: 匹配的文件路径数组

**示例:**
```js
import { glob } from '@stratix/utils/file';

// 查找所有JavaScript文件
const findJsFiles = async () => {
  try {
    const jsFiles = await glob('**/*.js', { 
      cwd: './src',
      ignore: ['**/node_modules/**', '**/dist/**'] 
    });
    console.log(`找到 ${jsFiles.length} 个JS文件`);
    return jsFiles;
  } catch (error) {
    console.error('查找文件失败:', error.message);
    return [];
  }
};

// 查找特定类型的资源文件
async function findAssets(type) {
  const patterns = {
    images: '**/*.{png,jpg,jpeg,gif,svg}',
    fonts: '**/*.{ttf,woff,woff2,eot}',
    documents: '**/*.{pdf,doc,docx,xls,xlsx,ppt,pptx}'
  };
  
  try {
    const pattern = patterns[type] || '**/*';
    const files = await glob(pattern, { cwd: './assets' });
    console.log(`找到 ${files.length} 个${type}文件`);
    return files;
  } catch (error) {
    console.error('查找资源失败:', error);
    return [];
  }
}
```

<a id="getmimetype"></a>
### getMimeType(path)

根据文件路径或扩展名获取MIME类型。

**参数:**
- `path` `{string}`: 文件路径或扩展名

**返回:**
- `{string}`: MIME类型字符串，如果未知则返回'application/octet-stream'

**示例:**
```js
import { getMimeType } from '@stratix/utils/file';

// 获取文件的MIME类型
console.log(getMimeType('image.png')); 
// 输出: 'image/png'

console.log(getMimeType('document.pdf')); 
// 输出: 'application/pdf'

console.log(getMimeType('style.css')); 
// 输出: 'text/css'

console.log(getMimeType('.js')); 
// 输出: 'application/javascript'

// 处理HTTP响应的Content-Type
function serveFile(filePath, response) {
  const mimeType = getMimeType(filePath);
  response.setHeader('Content-Type', mimeType);
  
  // 继续处理文件内容和响应
}
```

<a id="getcurrentdirname"></a>
### getCurrentDirname(importMetaUrl)

获取当前文件所在的目录路径，兼容ES模块和CommonJS模块。

**参数:**
- `importMetaUrl` `{string}`: ES模块中的import.meta.url

**返回:**
- `{string}`: 当前文件所在的目录路径

**示例:**
```js
// ES 模块中使用
import { getCurrentDirname } from '@stratix/utils/file';

const __dirname = getCurrentDirname(import.meta.url);
console.log(__dirname);
// 输出: '/absolute/path/to/current/directory'

// 读取相对于当前目录的文件
const configPath = `${__dirname}/config.json`;
const config = await readFile(configPath, 'utf8');

// CommonJS 模块中使用
const { getCurrentDirname } = require('@stratix/utils/file');

// 在CommonJS中，__dirname已经存在，但仍可以使用此函数
// 注意：此时不需要传参数
const dirName = getCurrentDirname();
console.log(dirName);
// 输出: '/absolute/path/to/current/directory'
```

<a id="getcurrentfilename"></a>
### getCurrentFilename(importMetaUrl)

获取当前文件的完整路径，兼容ES模块和CommonJS模块。

**参数:**
- `importMetaUrl` `{string}`: ES模块中的import.meta.url

**返回:**
- `{string}`: 当前文件的完整路径

**示例:**
```js
// ES 模块中使用
import { getCurrentFilename } from '@stratix/utils/file';

const __filename = getCurrentFilename(import.meta.url);
console.log(__filename);
// 输出: '/absolute/path/to/current/directory/current-file.js'

// 获取当前执行文件的名称
const currentFileName = path.basename(__filename);
console.log(`当前执行的文件是: ${currentFileName}`);

// CommonJS 模块中使用
const { getCurrentFilename } = require('@stratix/utils/file');

// 在CommonJS中，__filename已经存在，但仍可以使用此函数
// 注意：此时不需要传参数
const fileName = getCurrentFilename();
console.log(fileName);
// 输出: '/absolute/path/to/current/directory/current-file.js'
``` 