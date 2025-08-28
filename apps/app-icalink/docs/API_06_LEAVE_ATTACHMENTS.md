# 6. 查看请假申请附件接口

## 接口概述

查看请假申请附件接口，支持学生和教师角色。学生只能查看自己的附件，教师可以查看自己课程学生的附件。

## 接口规范

- **HTTP方法**: `GET`
- **路径**: `/api/icalink/v1/leave-applications/:application_id/attachments`
- **权限**: 学生/教师
- **认证方式**: 通过HTTP请求头获取用户信息，无需额外认证流程

## 请求参数

### 路径参数 (Path Parameters)

```typescript
interface AttachmentsPathParams {
  application_id: string; // 请假申请ID
}
```

### 查询参数 (Query Parameters)

```typescript
interface AttachmentsQueryParams {
  thumbnail?: boolean; // 是否返回缩略图，默认false
}
```

### 参数说明

| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| application_id | string | ✅ | 请假申请ID |
| thumbnail | boolean | ❌ | 是否返回缩略图，默认false |

## 响应格式

### 成功响应

```typescript
interface AttachmentsResponse {
  success: boolean;
  message: string;
  data: {
    application_id: number;
    student_id: string;
    student_name: string;
    course_name: string;
    attachments: Array<{
      id: number;
      image_name: string;
      image_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      image_size: number;                 // 文件大小（字节）
      image_width?: number;               // 图片宽度（像素）
      image_height?: number;              // 图片高度（像素）
      upload_time: string;                // ISO 8601 格式
      thumbnail_url: string;              // 缩略图访问URL
      download_url: string;               // 原图下载URL
    }>;
    total_count: number;
  };
}
```

### 响应示例

```json
{
  "success": true,
  "message": "获取附件列表成功",
  "data": {
    "application_id": 123,
    "student_id": "20210001",
    "student_name": "张三",
    "course_name": "高等数学",
    "attachments": [
      {
        "id": 456,
        "image_name": "diagnosis.jpg",
        "image_type": "image/jpeg",
        "image_size": 1024000,
        "image_width": 1920,
        "image_height": 1080,
        "upload_time": "2024-01-15T10:30:00Z",
        "thumbnail_url": "/api/icalink/v1/leave-attachments/456/download?thumbnail=true",
        "download_url": "/api/icalink/v1/leave-attachments/456/download"
      },
      {
        "id": 457,
        "image_name": "medical_certificate.png",
        "image_type": "image/png",
        "image_size": 512000,
        "image_width": 1280,
        "image_height": 720,
        "upload_time": "2024-01-15T10:31:00Z",
        "thumbnail_url": "/api/icalink/v1/leave-attachments/457/download?thumbnail=true",
        "download_url": "/api/icalink/v1/leave-attachments/457/download"
      }
    ],
    "total_count": 2
  }
}
```

### 无附件响应示例

```json
{
  "success": true,
  "message": "该申请没有附件",
  "data": {
    "application_id": 124,
    "student_id": "20210002",
    "student_name": "李四",
    "course_name": "高等数学",
    "attachments": [],
    "total_count": 0
  }
}
```

## 权限控制

### 学生权限
- 只能查看自己的请假申请附件
- 系统自动验证申请所有权

### 教师权限
- 可以查看自己课程学生的请假申请附件
- 验证教师对该课程的授课权限

### 访问控制
- 附件URL包含访问令牌，防止未授权访问
- URL有时效性，默认1小时有效
- 支持防盗链机制

## 业务逻辑

### 权限验证流程
1. **申请存在性**: 验证申请ID是否存在
2. **用户权限**: 根据用户角色验证访问权限
3. **课程权限**: 教师需验证课程授课权限
4. **附件查询**: 查询该申请的所有附件

### URL生成逻辑
- **缩略图URL**: 包含thumbnail=true参数
- **原图URL**: 直接下载链接
- **访问令牌**: 包含用户身份和时效验证
- **防盗链**: 验证Referer头部

### 图片信息处理
- 自动获取图片尺寸信息
- 计算文件大小和格式
- 生成安全的访问URL
- 支持图片预览和下载

## 错误处理

### 常见错误

| 错误代码 | HTTP状态码 | 说明 | 解决方案 |
|---------|-----------|------|----------|
| `UNAUTHORIZED` | 401 | 用户未认证 | 检查认证信息 |
| `FORBIDDEN` | 403 | 无权限查看该申请附件 | 确认用户权限 |
| `NOT_FOUND` | 404 | 申请不存在或无附件 | 确认申请ID正确 |
| `INTERNAL_ERROR` | 500 | 服务器错误 | 联系技术支持 |

### 错误响应示例

```json
{
  "success": false,
  "message": "您无权查看此申请的附件",
  "code": "FORBIDDEN"
}
```

```json
{
  "success": false,
  "message": "申请不存在或已被删除",
  "code": "NOT_FOUND"
}
```

## 使用示例

### 基本查询

```bash
curl -X GET "/api/icalink/v1/leave-applications/123/attachments" \
  -H "X-User-Id: 20210001" \
  -H "X-User-Type: student" \
  -H "X-User-Name: %E5%BC%A0%E4%B8%89"
```

### 教师查询学生附件

```bash
curl -X GET "/api/icalink/v1/leave-applications/123/attachments" \
  -H "X-User-Id: T001" \
  -H "X-User-Type: teacher" \
  -H "X-User-Name: %E6%9D%8E%E8%80%81%E5%B8%88"
```

### JavaScript调用示例

```javascript
// 获取附件列表
async function getLeaveAttachments(applicationId) {
  try {
    const response = await fetch(`/api/icalink/v1/leave-applications/${applicationId}/attachments`, {
      method: 'GET',
      headers: {
        'X-User-Id': '20210001',
        'X-User-Type': 'student',
        'X-User-Name': encodeURIComponent('张三')
      }
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('附件列表:', result.data.attachments);
      return result.data;
    } else {
      console.error('获取失败:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('网络错误:', error);
    throw error;
  }
}

// 预加载图片
function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// 显示附件图片
async function displayAttachments(applicationId) {
  try {
    const data = await getLeaveAttachments(applicationId);
    const container = document.getElementById('attachments-container');
    
    if (data.total_count === 0) {
      container.innerHTML = '<p>该申请没有附件</p>';
      return;
    }

    container.innerHTML = '<h4>附件图片:</h4>';
    
    for (const attachment of data.attachments) {
      const imgContainer = document.createElement('div');
      imgContainer.className = 'attachment-item';
      
      // 创建缩略图
      const thumbnail = document.createElement('img');
      thumbnail.src = attachment.thumbnail_url;
      thumbnail.alt = attachment.image_name;
      thumbnail.className = 'thumbnail';
      thumbnail.onclick = () => openFullImage(attachment.download_url, attachment.image_name);
      
      // 创建信息
      const info = document.createElement('div');
      info.className = 'attachment-info';
      info.innerHTML = `
        <p><strong>文件名:</strong> ${attachment.image_name}</p>
        <p><strong>大小:</strong> ${formatFileSize(attachment.image_size)}</p>
        <p><strong>尺寸:</strong> ${attachment.image_width}x${attachment.image_height}</p>
        <p><strong>上传时间:</strong> ${new Date(attachment.upload_time).toLocaleString()}</p>
      `;
      
      // 创建下载按钮
      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = '下载原图';
      downloadBtn.onclick = () => downloadAttachment(attachment.download_url, attachment.image_name);
      
      imgContainer.appendChild(thumbnail);
      imgContainer.appendChild(info);
      imgContainer.appendChild(downloadBtn);
      container.appendChild(imgContainer);
    }
  } catch (error) {
    document.getElementById('attachments-container').innerHTML = 
      `<p class="error">加载附件失败: ${error.message}</p>`;
  }
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 打开全尺寸图片
function openFullImage(url, filename) {
  const modal = document.createElement('div');
  modal.className = 'image-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
      <img src="${url}" alt="${filename}" style="max-width: 90%; max-height: 90%;">
      <p>${filename}</p>
    </div>
  `;
  document.body.appendChild(modal);
}

// 下载附件
function downloadAttachment(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}
```

### Vue.js组件示例

```vue
<template>
  <div class="attachments-viewer">
    <div v-if="loading" class="loading">
      加载中...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else-if="attachments.length === 0" class="no-attachments">
      该申请没有附件
    </div>
    
    <div v-else class="attachments-grid">
      <div 
        v-for="attachment in attachments" 
        :key="attachment.id"
        class="attachment-item"
      >
        <div class="thumbnail-container">
          <img 
            :src="attachment.thumbnail_url" 
            :alt="attachment.image_name"
            class="thumbnail"
            @click="openFullImage(attachment)"
            @error="handleImageError"
          />
          <div class="overlay">
            <button @click="openFullImage(attachment)" class="btn-view">查看</button>
            <button @click="downloadImage(attachment)" class="btn-download">下载</button>
          </div>
        </div>
        
        <div class="attachment-info">
          <h5>{{ attachment.image_name }}</h5>
          <p>大小: {{ formatFileSize(attachment.image_size) }}</p>
          <p>尺寸: {{ attachment.image_width }}x{{ attachment.image_height }}</p>
          <p>上传: {{ formatTime(attachment.upload_time) }}</p>
        </div>
      </div>
    </div>

    <!-- 全屏图片模态框 -->
    <div v-if="showModal" class="image-modal" @click="closeModal">
      <div class="modal-content" @click.stop>
        <button class="close-btn" @click="closeModal">&times;</button>
        <img :src="currentImage.download_url" :alt="currentImage.image_name" />
        <div class="image-info">
          <h4>{{ currentImage.image_name }}</h4>
          <p>{{ formatFileSize(currentImage.image_size) }} | {{ currentImage.image_width }}x{{ currentImage.image_height }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    applicationId: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      attachments: [],
      loading: false,
      error: null,
      showModal: false,
      currentImage: null
    };
  },
  mounted() {
    this.loadAttachments();
  },
  methods: {
    async loadAttachments() {
      this.loading = true;
      this.error = null;
      
      try {
        const data = await getLeaveAttachments(this.applicationId);
        this.attachments = data.attachments;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    
    openFullImage(attachment) {
      this.currentImage = attachment;
      this.showModal = true;
    },
    
    closeModal() {
      this.showModal = false;
      this.currentImage = null;
    },
    
    downloadImage(attachment) {
      const link = document.createElement('a');
      link.href = attachment.download_url;
      link.download = attachment.image_name;
      link.click();
    },
    
    handleImageError(event) {
      event.target.src = '/images/image-error.png'; // 错误占位图
    },
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    formatTime(timeString) {
      return new Date(timeString).toLocaleString('zh-CN');
    }
  }
};
</script>

<style scoped>
.attachments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  padding: 20px;
}

.attachment-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.thumbnail-container {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.3s;
}

.thumbnail:hover {
  transform: scale(1.05);
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  opacity: 0;
  transition: opacity 0.3s;
}

.thumbnail-container:hover .overlay {
  opacity: 1;
}

.btn-view, .btn-download {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.btn-view {
  background: #007bff;
}

.btn-download {
  background: #28a745;
}

.attachment-info {
  padding: 15px;
}

.attachment-info h5 {
  margin: 0 0 10px 0;
  font-size: 16px;
  word-break: break-all;
}

.attachment-info p {
  margin: 5px 0;
  font-size: 14px;
  color: #666;
}

.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
  text-align: center;
}

.modal-content img {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
}

.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 30px;
  cursor: pointer;
}

.image-info {
  color: white;
  margin-top: 10px;
}

.loading, .error, .no-attachments {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  color: #dc3545;
}
</style>
```

## 注意事项

1. **权限验证**: 严格验证用户对附件的访问权限
2. **URL安全**: 附件URL包含访问令牌和时效验证
3. **图片加载**: 大图片可能加载较慢，建议显示加载状态
4. **错误处理**: 图片加载失败时显示占位图
5. **缓存策略**: 缩略图可以设置较长的缓存时间
6. **移动端适配**: 确保在移动设备上正常显示
7. **网络优化**: 优先加载缩略图，按需加载原图
8. **安全防护**: 防止图片URL被恶意访问

## 相关接口

- [下载请假申请附件接口](./API_07_ATTACHMENT_DOWNLOAD.md) - 下载附件文件
- [学生请假申请接口](./API_03_LEAVE_APPLICATION.md) - 上传附件
- [查询请假信息接口](./API_01_LEAVE_QUERY.md) - 查看申请状态
