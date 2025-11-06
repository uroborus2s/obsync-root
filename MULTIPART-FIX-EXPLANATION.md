# @fastify/multipart 字段解析问题修复说明

## 🐛 问题描述

在使用 `@fastify/multipart` 插件处理文件上传时，无法获取表单中的 `parent_id` 字段。

### 症状

```typescript
const data = await request.file();
console.log(data.fields.parent_id); // ❌ undefined
```

前端发送的 multipart/form-data 请求包含：

- `file` 字段：文件数据
- `parent_id` 字段：父目录ID（值为 `'0'` 或文件夹ID）

但后端无法获取 `parent_id` 的值。

## 🔍 根本原因

**`request.file()` 方法只返回文件数据，不包含其他表单字段！**

根据 [@fastify/multipart 官方文档](https://github.com/fastify/fastify-multipart)：

```typescript
const data = await request.file();

data.file; // ✅ 文件流
data.fieldname; // ✅ 文件字段名
data.filename; // ✅ 文件名
data.encoding; // ✅ 编码
data.mimetype; // ✅ MIME类型
data.fields; // ❌ 这个fields是指文件的元数据，不是表单的其他字段！
```

**官方文档说明**：

> "Note about data.fields: busboy consumes the multipart in serial order (stream). Therefore, the order of form fields is VERY IMPORTANT to how @fastify/multipart can display the fields to you."

`data.fields` 是指文件的元数据字段，**不是表单的其他字段**！

## ✅ 解决方案

### 方案1：使用 `request.parts()` （推荐）

遍历所有部分（文件和字段），分别处理：

```typescript
const parts = request.parts();

let fileData: any = null;
let parent_id: string | null = null;

// 遍历所有部分
for await (const part of parts) {
  if (part.type === 'file') {
    // 文件部分
    fileData = part;
  } else {
    // 字段部分 (part.type === 'field')
    if (part.fieldname === 'parent_id') {
      parent_id = part.value as string;
    }
  }
}

// 验证
if (!fileData) {
  throw new Error('未找到上传的文件');
}

if (!parent_id) {
  throw new Error('缺少必需参数：parent_id');
}

// 使用文件数据
const fileBuffer = await fileData.toBuffer();
const fileName = fileData.filename;
const contentType = fileData.mimetype;
```

### 方案2：使用 `attachFieldsToBody: true` 配置

在注册插件时启用此选项：

```typescript
// stratix.config.ts
{
  name: 'multipart',
  plugin: multipart,
  options: {
    attachFieldsToBody: true,  // ✅ 启用字段附加到body
    limits: {
      fileSize: 50 * 1024 * 1024
    }
  }
}
```

然后在Controller中：

```typescript
fastify.post('/upload', async (request, reply) => {
  // 字段会自动附加到 request.body
  const parent_id = request.body.parent_id.value; // 注意：需要访问.value
  const fileBuffer = await request.body.file.toBuffer();
});
```

### 方案3：使用 `attachFieldsToBody: 'keyValues'` 配置

更简洁的方式：

```typescript
// stratix.config.ts
{
  name: 'multipart',
  plugin: multipart,
  options: {
    attachFieldsToBody: 'keyValues',  // ✅ 直接键值对形式
    limits: {
      fileSize: 50 * 1024 * 1024
    }
  }
}
```

然后在Controller中：

```typescript
fastify.post('/upload', async (request, reply) => {
  const parent_id = request.body.parent_id; // ✅ 直接访问
  const fileBuffer = request.body.file; // ✅ Buffer对象
});
```

## 📝 当前项目的修复

我们选择了**方案1**（使用 `request.parts()`），因为：

1. ✅ 可以获取完整的文件元数据（filename, mimetype, encoding）
2. ✅ 不需要前端额外传递文件名和类型
3. ✅ 代码逻辑清晰，易于理解
4. ✅ 完全控制字段和文件的处理顺序
5. ✅ 符合官方文档的最佳实践

### 修改的文件

#### 1. `apps/app-icalink/src/stratix.config.ts`

**移除了 `attachFieldsToBody` 配置**：

```typescript
{
  name: 'multipart',
  plugin: multipart,
  options: {
    // attachFieldsToBody: 'keyValues',  // ❌ 已移除
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB文件大小限制
    }
  }
}
```

#### 2. `apps/app-icalink/src/controllers/WpsDriveController.ts`

**使用 `request.parts()` 遍历所有部分**：

```typescript
@Post('/api/icalink/v1/wps-drive/drives/:drive_id/files/upload')
async uploadFile(request, reply) {
  const { drive_id } = request.params;

  // ✅ 使用 request.parts() 而不是 request.file()
  const parts = request.parts();

  let fileData: any = null;
  let parent_id: string | null = null;

  // 遍历所有部分
  for await (const part of parts) {
    if (part.type === 'file') {
      // 文件部分
      fileData = part;
      this.logger.debug('Received file part', {
        fieldname: part.fieldname,
        filename: part.filename,
        mimetype: part.mimetype
      });
    } else {
      // 字段部分 (part.type === 'field')
      this.logger.debug('Received field part', {
        fieldname: part.fieldname,
        value: part.value
      });

      if (part.fieldname === 'parent_id') {
        parent_id = part.value as string;
      }
    }
  }

  // 验证文件
  if (!fileData) {
    return reply.status(400).send({
      success: false,
      message: '未找到上传的文件'
    });
  }

  // 验证parent_id
  if (!parent_id) {
    return reply.status(400).send({
      success: false,
      message: '缺少必需参数：parent_id'
    });
  }

  // 处理文件
  const fileBuffer = await fileData.toBuffer();
  const fileName = fileData.filename;  // ✅ 自动获取文件名
  const fileSize = fileBuffer.length;
  const contentType = fileData.mimetype || 'application/octet-stream';  // ✅ 自动获取MIME类型

  // ... 后续处理
}
```

## 🎯 关键要点

### ❌ 错误用法

```typescript
// 错误：request.file() 不包含其他表单字段
const data = await request.file();
const parent_id = data.fields.parent_id; // ❌ undefined
```

### ✅ 正确用法

```typescript
// 正确：使用 request.parts() 遍历所有部分
const parts = request.parts();
for await (const part of parts) {
  if (part.type === 'file') {
    // 处理文件
  } else {
    // 处理字段
    console.log(part.fieldname, part.value);
  }
}
```

## 📚 参考资料

- [@fastify/multipart 官方文档](https://github.com/fastify/fastify-multipart)
- [Handle multiple file streams and fields](https://github.com/fastify/fastify-multipart#handle-multiple-file-streams-and-fields)
- [Parse all fields and assign them to the body](https://github.com/fastify/fastify-multipart#parse-all-fields-and-assign-them-to-the-body)

## 🧪 测试方法

使用提供的测试工具验证修复：

```bash
# 方法1：使用HTML测试页面
open test-upload.html

# 方法2：使用Shell脚本
./test-upload.sh test-file.txt YOUR_DRIVE_ID 0

# 方法3：使用curl
curl -X POST "http://localhost:8090/api/icalink/v1/wps-drive/drives/YOUR_DRIVE_ID/files/upload" \
  -F "file=@test-file.txt" \
  -F "parent_id=0" \
  -v
```

## ✅ 验证结果

修复后，后端日志应该显示：

```
[DEBUG] Received field: { fieldname: 'parent_id', value: '0' }
[INFO] Received file upload request: {
  drive_id: 'xxx',
  parent_id: '0',
  fileName: 'test-file.txt',
  fileSize: 123,
  contentType: 'text/plain'
}
```

## 🎉 总结

问题的根本原因是**对 `@fastify/multipart` API 的误解**：

- `request.file()` 只返回**单个文件**，不包含其他表单字段
- `request.parts()` 返回**所有部分**（文件+字段），需要遍历处理
- `attachFieldsToBody` 配置可以自动将字段附加到 `request.body`

我们选择使用 `request.parts()` 方法，因为它提供了最大的灵活性和控制力。
