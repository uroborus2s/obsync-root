# 附件预览和下载接口

## 接口概述

提供请假申请附件的预览和下载功能，支持缩略图预览和原图下载。

**重要说明**：所有附件相关接口都统一在 `AttendanceController` 中实现，避免重复路由。

## 1. 附件预览接口

### 接口规范

- **HTTP方法**: `GET`
- **路径**: `/api/icalink/v1/attendance/attachments/:id/image`
- **功能**: 在浏览器中直接预览图片附件
- **权限**: 学生/教师（需要有权限访问对应的请假申请）

### 请求参数

#### 路径参数
| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| id | string | ✅ | 附件ID |

#### 查询参数
| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| thumbnail | boolean | ❌ | 是否返回缩略图，默认false |

### 响应格式

**成功响应**：
- 直接返回图片二进制数据
- Content-Type: image/jpeg, image/png 等
- Content-Disposition: inline（浏览器直接显示）
- Cache-Control: public, max-age=3600（缓存1小时）

**错误响应**：
```json
{
  "success": false,
  "message": "错误信息"
}
```

### 使用示例

```bash
# 预览原图
GET /api/icalink/v1/attendance/attachments/123/image

# 预览缩略图
GET /api/icalink/v1/attendance/attachments/123/image?thumbnail=true
```

## 2. 附件下载接口

### 接口规范

- **HTTP方法**: `GET`
- **路径**: `/api/icalink/v1/attendance/attachments/:id/download`
- **功能**: 下载图片附件到本地
- **权限**: 学生/教师（需要有权限访问对应的请假申请）

### 请求参数

#### 路径参数
| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| id | string | ✅ | 附件ID |

#### 查询参数
| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| thumbnail | boolean | ❌ | 是否下载缩略图，默认false |

### 响应格式

**成功响应**：
- 直接返回图片二进制数据
- Content-Type: image/jpeg, image/png 等
- Content-Disposition: attachment（强制下载）
- 文件名会自动设置

**错误响应**：
```json
{
  "success": false,
  "message": "错误信息"
}
```

### 使用示例

```bash
# 下载原图
GET /api/icalink/v1/attendance/attachments/123/download

# 下载缩略图
GET /api/icalink/v1/attendance/attachments/123/download?thumbnail=true
```

## 3. 前端集成

### 在请假申请列表中的附件数据格式

```typescript
interface AttachmentInfo {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  upload_time: string;
  // 缩略图预览URL
  thumbnail_url: string;
  // 原图预览URL
  preview_url: string;
  // 下载URL
  download_url: string;
}
```

### 前端使用示例

```typescript
// 预览缩略图
<img src={attachment.thumbnail_url} alt={attachment.file_name} />

// 预览原图
<img src={attachment.preview_url} alt={attachment.file_name} />

// 下载文件
<a href={attachment.download_url} download={attachment.file_name}>
  下载附件
</a>
```

## 4. 权限控制

- **学生**：只能访问自己提交的请假申请的附件
- **教师**：可以访问自己课程学生的请假申请附件
- 系统会自动验证用户权限，无权限访问会返回404错误

## 5. 缓存策略

- 预览接口设置了1小时的缓存时间
- 下载接口不设置缓存，确保每次都是最新文件
- 建议前端也实现适当的缓存策略

## 6. 错误处理

| 状态码 | 说明 |
|-------|------|
| 200 | 成功返回附件内容 |
| 400 | 无效的附件ID |
| 401 | 用户身份验证失败 |
| 403 | 无权限访问该附件 |
| 404 | 附件不存在 |
| 500 | 服务器内部错误 |
