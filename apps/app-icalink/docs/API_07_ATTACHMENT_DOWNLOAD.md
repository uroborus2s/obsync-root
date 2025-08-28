# 7. 下载请假申请附件接口

## 接口概述

下载请假申请附件接口，支持学生和教师角色。直接返回图片文件流，支持原图和缩略图下载。

## 接口规范

- **HTTP方法**: `GET`
- **路径**: `/api/icalink/v1/leave-attachments/:attachment_id/download`
- **权限**: 学生/教师
- **认证方式**: 通过HTTP请求头获取用户信息，无需额外认证流程

## 请求参数

### 路径参数 (Path Parameters)

```typescript
interface DownloadPathParams {
  attachment_id: string; // 附件ID
}
```

### 查询参数 (Query Parameters)

```typescript
interface DownloadQueryParams {
  thumbnail?: boolean; // 是否下载缩略图，默认false
}
```

### 参数说明

| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| attachment_id | string | ✅ | 附件ID |
| thumbnail | boolean | ❌ | 是否下载缩略图，默认false |

## 响应格式

### 成功响应（文件流）

**响应头**
```
Content-Type: image/jpeg | image/png | image/gif | image/webp
Content-Disposition: attachment; filename="原始文件名"
Content-Length: 文件大小
Cache-Control: public, max-age=3600
ETag: "文件哈希值"
Last-Modified: 文件修改时间
```

**响应体**
- 直接返回图片文件的二进制数据流

### 错误响应（JSON格式）

```typescript
interface DownloadErrorResponse {
  success: false;
  message: string;
  code: string;
}
```

### 错误响应示例

```json
{
  "success": false,
  "message": "附件不存在或已被删除",
  "code": "NOT_FOUND"
}
```

```json
{
  "success": false,
  "message": "您无权下载此附件",
  "code": "FORBIDDEN"
}
```

## 权限控制

### 学生权限
- 只能下载自己的请假申请附件
- 系统自动验证附件所有权

### 教师权限
- 可以下载自己课程学生的请假申请附件
- 验证教师对相关课程的授课权限

### 访问控制
- 验证用户对附件的访问权限
- 检查附件是否存在且未被删除
- 支持访问日志记录

## 业务逻辑

### 权限验证流程
1. **附件存在性**: 验证附件ID是否存在
2. **用户权限**: 根据用户角色验证访问权限
3. **申请关联**: 验证附件所属的请假申请
4. **课程权限**: 教师需验证课程授课权限

### 文件处理逻辑
- **原图下载**: 返回完整的原始图片
- **缩略图下载**: 返回200x200的缩略图
- **格式保持**: 保持原始图片格式
- **文件名处理**: 使用原始文件名

### 缓存策略
- 设置适当的缓存头部
- 支持ETag和Last-Modified
- 缩略图缓存时间更长
- 支持条件请求（304 Not Modified）

### 安全措施
- 防止路径遍历攻击
- 验证文件类型和大小
- 记录下载访问日志
- 限制下载频率

## 错误处理

### 常见错误

| 错误代码 | HTTP状态码 | 说明 | 解决方案 |
|---------|-----------|------|----------|
| `UNAUTHORIZED` | 401 | 用户未认证 | 检查认证信息 |
| `FORBIDDEN` | 403 | 无权限下载该附件 | 确认用户权限 |
| `NOT_FOUND` | 404 | 附件不存在 | 确认附件ID正确 |
| `GONE` | 410 | 附件已被删除 | 提示附件不可用 |
| `TOO_MANY_REQUESTS` | 429 | 下载频率过高 | 稍后重试 |
| `INTERNAL_ERROR` | 500 | 服务器错误 | 联系技术支持 |

## 使用示例

### 下载原图

```bash
curl -X GET "/api/icalink/v1/leave-attachments/456/download" \
  -H "X-User-Id: 20210001" \
  -H "X-User-Type: student" \
  -H "X-User-Name: %E5%BC%A0%E4%B8%89" \
  -o "downloaded_image.jpg"
```

### 下载缩略图

```bash
curl -X GET "/api/icalink/v1/leave-attachments/456/download?thumbnail=true" \
  -H "X-User-Id: 20210001" \
  -H "X-User-Type: student" \
  -H "X-User-Name: %E5%BC%A0%E4%B8%89" \
  -o "thumbnail.jpg"
```

### 教师下载学生附件

```bash
curl -X GET "/api/icalink/v1/leave-attachments/456/download" \
  -H "X-User-Id: T001" \
  -H "X-User-Type: teacher" \
  -H "X-User-Name: %E6%9D%8E%E8%80%81%E5%B8%88" \
  -o "student_attachment.jpg"
```

### JavaScript调用示例

```javascript
// 下载附件
async function downloadAttachment(attachmentId, thumbnail = false, filename = null) {
  try {
    const url = `/api/icalink/v1/leave-attachments/${attachmentId}/download${thumbnail ? '?thumbnail=true' : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-User-Id': '20210001',
        'X-User-Type': 'student',
        'X-User-Name': encodeURIComponent('张三')
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '下载失败');
    }

    // 获取文件名
    const contentDisposition = response.headers.get('Content-Disposition');
    const defaultFilename = filename || `attachment_${attachmentId}${thumbnail ? '_thumb' : ''}.jpg`;
    let downloadFilename = defaultFilename;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        downloadFilename = filenameMatch[1];
      }
    }

    // 创建下载链接
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = downloadFilename;
    link.click();
    
    // 清理URL对象
    window.URL.revokeObjectURL(downloadUrl);
    
    console.log('下载成功:', downloadFilename);
  } catch (error) {
    console.error('下载失败:', error);
    alert(`下载失败: ${error.message}`);
  }
}

// 预览图片（在新窗口中打开）
function previewAttachment(attachmentId) {
  const url = `/api/icalink/v1/leave-attachments/${attachmentId}/download`;
  const headers = {
    'X-User-Id': '20210001',
    'X-User-Type': 'student',
    'X-User-Name': encodeURIComponent('张三')
  };
  
  // 创建带认证头的预览URL
  const previewWindow = window.open('', '_blank');
  previewWindow.document.write(`
    <html>
      <head><title>图片预览</title></head>
      <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f0f0f0;">
        <img id="preview-img" style="max-width:100%; max-height:100%; object-fit:contain;" />
        <div id="loading" style="position:absolute;">加载中...</div>
      </body>
    </html>
  `);
  
  fetch(url, { headers })
    .then(response => response.blob())
    .then(blob => {
      const imgUrl = URL.createObjectURL(blob);
      previewWindow.document.getElementById('preview-img').src = imgUrl;
      previewWindow.document.getElementById('loading').style.display = 'none';
    })
    .catch(error => {
      previewWindow.document.getElementById('loading').textContent = '加载失败: ' + error.message;
    });
}

// 批量下载
async function batchDownloadAttachments(attachmentIds, thumbnail = false) {
  const results = [];
  
  for (let i = 0; i < attachmentIds.length; i++) {
    const id = attachmentIds[i];
    try {
      await downloadAttachment(id, thumbnail, `attachment_${i + 1}`);
      results.push({ id, success: true });
      
      // 添加延迟避免频率限制
      if (i < attachmentIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      results.push({ id, success: false, error: error.message });
    }
  }
  
  return results;
}

// 检查文件是否可下载
async function checkAttachmentAvailability(attachmentId) {
  try {
    const response = await fetch(`/api/icalink/v1/leave-attachments/${attachmentId}/download`, {
      method: 'HEAD', // 只获取头部信息
      headers: {
        'X-User-Id': '20210001',
        'X-User-Type': 'student',
        'X-User-Name': encodeURIComponent('张三')
      }
    });
    
    return {
      available: response.ok,
      size: response.headers.get('Content-Length'),
      type: response.headers.get('Content-Type'),
      lastModified: response.headers.get('Last-Modified')
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
}
```

### React组件示例

```jsx
import React, { useState } from 'react';

const AttachmentDownloader = ({ attachmentId, filename, size, type }) => {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async (thumbnail = false) => {
    setDownloading(true);
    setProgress(0);

    try {
      const url = `/api/icalink/v1/leave-attachments/${attachmentId}/download${thumbnail ? '?thumbnail=true' : ''}`;

      const response = await fetch(url, {
        headers: {
          'X-User-Id': '20210001',
          'X-User-Type': 'student',
          'X-User-Name': encodeURIComponent('张三')
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }

      // 读取响应流并显示进度
      const reader = response.body.getReader();
      const contentLength = +response.headers.get('Content-Length');
      let receivedLength = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;
        
        if (contentLength) {
          setProgress(Math.round((receivedLength / contentLength) * 100));
        }
      }

      // 合并数据并下载
      const blob = new Blob(chunks);
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || `attachment_${attachmentId}.jpg`;
      link.click();
      URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      alert(`下载失败: ${error.message}`);
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="attachment-downloader">
      <div className="file-info">
        <h4>{filename}</h4>
        <p>大小: {formatFileSize(size)} | 类型: {type}</p>
      </div>
      
      {downloading && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}
      
      <div className="download-buttons">
        <button 
          onClick={() => handleDownload(false)}
          disabled={downloading}
          className="btn btn-primary"
        >
          {downloading ? '下载中...' : '下载原图'}
        </button>
        <button 
          onClick={() => handleDownload(true)}
          disabled={downloading}
          className="btn btn-secondary"
        >
          下载缩略图
        </button>
      </div>
    </div>
  );
};

export default AttachmentDownloader;
```

## 性能优化

### 1. 缓存策略
- 设置合适的缓存头部
- 支持条件请求
- 使用CDN加速

### 2. 压缩优化
- 缩略图使用更高的压缩率
- 支持WebP格式
- 动态调整图片质量

### 3. 并发控制
- 限制同时下载数量
- 实现下载队列
- 防止服务器过载

### 4. 断点续传
- 支持Range请求
- 处理网络中断
- 提供重试机制

## 注意事项

1. **权限验证**: 每次下载都会验证用户权限
2. **文件安全**: 只允许下载图片文件
3. **大小限制**: 大文件下载可能较慢
4. **网络状况**: 注意网络超时和中断
5. **浏览器兼容**: 确保下载功能在各浏览器正常工作
6. **移动端**: 移动设备下载体验优化
7. **频率限制**: 避免频繁下载触发限制
8. **错误处理**: 提供友好的错误提示

## 相关接口

- [查看请假申请附件接口](./API_06_LEAVE_ATTACHMENTS.md) - 获取附件列表
- [学生请假申请接口](./API_03_LEAVE_APPLICATION.md) - 上传附件
- [查询请假信息接口](./API_01_LEAVE_QUERY.md) - 查看申请状态
