# 请假附件功能说明

## 功能概述

本功能为请假申请添加了附件上传支持，允许学生在提交请假申请时上传相关证明文件（如病假条、请假条等）。附件以二进制形式直接存储在数据库中，支持图片和PDF文件。

## 主要特性

### 1. 文件类型支持
- 图片格式：JPEG、JPG、PNG、GIF
- 文档格式：PDF
- 文件大小限制：单个文件最大5MB
- 数量限制：每个请假申请最多3个附件

### 2. 存储方式
- **数据库存储**：文件内容以LONGBLOB形式存储在数据库中（默认方式）
- **文件系统存储**：预留接口，支持将文件存储在文件系统中

### 3. 数据传输
- 前端使用Base64编码传输文件内容
- 后端自动将Base64解码为二进制数据存储
- 支持批量上传和处理

## 数据库变更

### 表结构修改

`icalink_leave_attachments` 表新增字段：

```sql
-- 文件内容字段（二进制数据）
`file_content` LONGBLOB DEFAULT NULL COMMENT '文件内容(二进制数据，用于数据库存储)'

-- 存储类型字段
`storage_type` enum('file','database') NOT NULL DEFAULT 'database' COMMENT '存储类型'

-- file_path字段修改为可选
`file_path` varchar(500) DEFAULT NULL COMMENT '文件路径(可选，用于文件系统存储)'
```

### 迁移脚本

执行 `packages/icalink/database/migrations/add_attachment_fields.sql` 来更新现有数据库。

## API 接口

### 1. 请假申请接口

**POST** `/api/attendance/leave`

请求体示例：
```json
{
  "attendance_record_id": "attendance123",
  "leave_reason": "身体不适需要就医",
  "leave_type": "sick",
  "attachments": [
    {
      "file_name": "病假条.jpg",
      "file_content": "base64编码的文件内容...",
      "file_type": "image/jpeg",
      "file_size": 1024000
    }
  ]
}
```

### 2. 查看附件接口

**GET** `/api/attendance/attachments/:attachmentId/view`

返回附件信息和Base64编码的内容。

### 3. 下载附件接口

**GET** `/api/attendance/attachments/:attachmentId/download`

直接返回文件的二进制内容，浏览器会自动下载。

## 前端实现

### 文件上传组件

```tsx
// 文件上传处理
const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files;
  if (files) {
    const newFiles = Array.from(files).slice(0, 3 - attachments.length);
    setAttachments([...attachments, ...newFiles]);
  }
};

// 转换为Base64
const filePromises = attachments.map((file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Content = result.split(',')[1];
      resolve({
        file_name: file.name,
        file_content: base64Content,
        file_type: file.type,
        file_size: file.size
      });
    };
    reader.readAsDataURL(file);
  });
});
```

## 后端实现

### Repository层

`LeaveAttachmentRepository` 提供以下方法：
- `createLeaveAttachment()` - 创建单个附件
- `batchCreateLeaveAttachments()` - 批量创建附件
- `getLeaveAttachmentById()` - 根据ID获取附件
- `getLeaveAttachmentsByApplicationId()` - 获取申请的所有附件

### 文件验证

后端会进行以下验证：
- 文件大小限制（5MB）
- 文件类型检查
- 文件数量限制（3个）
- Base64内容有效性检查

## 使用流程

### 学生端
1. 进入请假页面
2. 填写请假信息
3. 点击上传按钮选择文件
4. 预览已选择的文件
5. 提交请假申请（自动上传附件）

### 教师端
1. 查看请假申请列表
2. 点击查看附件
3. 在线预览或下载附件
4. 根据附件内容进行审批

## 性能考虑

### 优化措施
- 文件大小限制防止数据库过载
- 支持异步批量处理
- 附件上传失败不影响请假申请提交
- 使用索引优化查询性能

### 注意事项
- LONGBLOB字段会增加数据库存储空间
- 大量附件可能影响数据库备份和恢复时间
- 建议定期清理过期的附件数据

## 扩展性

### 未来可扩展功能
- 支持更多文件类型
- 文件压缩和优化
- 对象存储集成（如阿里云OSS）
- 附件预览功能增强
- 附件版本管理

### 配置项
可通过 `icalink_sync_config` 表配置：
- `leave.max_attachment_size` - 最大文件大小
- `leave.allowed_file_types` - 允许的文件类型
- `leave.max_attachment_count` - 最大附件数量

## 故障排除

### 常见问题
1. **文件上传失败**：检查文件大小和类型
2. **Base64解码错误**：检查前端编码是否正确
3. **数据库存储失败**：检查LONGBLOB字段配置
4. **附件下载失败**：检查文件内容是否存在

### 日志监控
- 附件上传成功/失败日志
- 文件大小和类型验证日志
- 数据库存储操作日志 