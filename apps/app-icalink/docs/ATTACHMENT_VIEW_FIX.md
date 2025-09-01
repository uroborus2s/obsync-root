# 附件查看功能修复

## 问题描述

1. **教师查看附件图片**：提示图片加载失败
2. **学生查看附件图片**：无法查看，没有图片展示框出来

## 问题原因分析

### 1. 字段名不匹配问题

**后端返回的字段名**：
```typescript
{
  id: number,
  image_name: string,
  image_size: number,
  image_type: string,
  upload_time: string
}
```

**前端期望的字段名**：
```typescript
{
  id: string,
  file_name: string,
  file_size: number,
  file_type: string,
  upload_time: string
}
```

### 2. 学生页面缺少附件显示功能

- `Leave.tsx`：只有上传功能，没有查看已提交附件的功能
- `StudentMessages.tsx`：有查看功能但缺少附件显示部分

## 修复方案

### 1. 统一字段名映射

#### 1.1 更新后端返回数据格式

在 `LeaveService.getLeaveApplicationAttachments` 方法中：

```typescript
// 修复前
const attachments = attachmentsResult.data.map((attachment) => ({
  id: attachment.id,
  image_name: attachment.image_name,
  image_size: attachment.image_size,
  image_type: attachment.image_type,
  // ...
}));

// 修复后
const attachments = attachmentsResult.data.map((attachment) => ({
  id: attachment.id.toString(),
  file_name: attachment.image_name,
  file_size: attachment.image_size,
  file_type: attachment.image_type,
  // ...
}));
```

#### 1.2 更新类型定义

在 `apps/app-icalink/src/types/api.ts` 中：

```typescript
export interface AttachmentInfo {
  id: string; // 改为string以匹配前端期望
  file_name: string; // 统一字段名
  file_size: number; // 统一字段名
  file_type: ImageType; // 统一字段名
  upload_time: string;
  download_url: string;
  thumbnail_url?: string;
  preview_url?: string; // 添加预览URL
}
```

### 2. 添加学生附件查看功能

#### 2.1 在StudentMessages.tsx中添加附件显示

```typescript
{/* 附件信息 */}
{application.attachments && application.attachments.length > 0 && (
  <div className='mt-3 rounded-lg bg-gray-50 p-3'>
    <div className='mb-2 text-sm font-medium text-gray-700'>
      附件 ({application.attachments.length}):
    </div>
    <div className='grid grid-cols-2 gap-2'>
      {application.attachments.map((attachment, index) => (
        <div
          key={attachment.id || index}
          className='flex items-center justify-between rounded border bg-white p-2'
        >
          <div className='flex items-center space-x-2'>
            <FileText className='h-4 w-4 text-gray-400' />
            <span className='truncate text-xs text-gray-600'>
              {attachment.file_name}
            </span>
          </div>
          <button
            onClick={() => handleViewAttachment(attachment.id, attachment.file_name)}
            className='rounded p-1 text-blue-600 hover:bg-blue-50'
            title='查看附件'
          >
            <Eye className='h-4 w-4' />
          </button>
        </div>
      ))}
    </div>
  </div>
)}
```

### 3. 修复图片URL构建

确保前端使用正确的API基础URL：

```typescript
const imageUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090/api'}/icalink/v1/attendance/attachments/${attachmentId}/image`;
```

## 完整的附件查看流程

### 1. 数据流程

```
数据库存储 (image_name, image_size, image_type)
    ↓
后端Service层 (字段名转换)
    ↓
API响应 (file_name, file_size, file_type)
    ↓
前端显示 (统一的字段名)
```

### 2. 前端页面功能

#### 教师页面 (Approval.tsx)
- ✅ 显示附件列表
- ✅ 点击查看附件
- ✅ 图片预览模态框
- ✅ 错误处理

#### 学生页面 (StudentMessages.tsx)
- ✅ 显示附件列表 (新增)
- ✅ 点击查看附件 (新增)
- ✅ 图片预览模态框 (已有)
- ✅ 错误处理

#### 学生请假页面 (Leave.tsx)
- ✅ 上传附件功能
- ❌ 查看已提交附件 (不需要，在StudentMessages中查看)

### 3. 后端接口支持

#### 预览接口
- `GET /api/icalink/v1/attendance/attachments/:id/image`
- 支持缩略图：`?thumbnail=true`
- 返回图片二进制数据

#### 下载接口
- `GET /api/icalink/v1/attendance/attachments/:id/download`
- 支持缩略图：`?thumbnail=true`
- 强制下载文件

## 测试验证

### 1. 教师查看附件

```bash
# 1. 获取审批列表
curl -X GET "http://localhost:8090/api/icalink/v1/attendance/teacher-leave-applications?page=1&page_size=5" \
  -H "Cookie: userType=teacher; userId=teacher123"

# 2. 查看附件（如果有附件ID）
curl -I "http://localhost:8090/api/icalink/v1/attendance/attachments/1/image" \
  -H "Cookie: userType=teacher; userId=teacher123"
```

### 2. 学生查看附件

```bash
# 1. 获取学生申请列表
curl -X GET "http://localhost:8090/api/icalink/v1/attendance/leave-applications?page=1&page_size=5" \
  -H "Cookie: userType=student; userId=student123"

# 2. 查看附件（如果有附件ID）
curl -I "http://localhost:8090/api/icalink/v1/attendance/attachments/1/image" \
  -H "Cookie: userType=student; userId=student123"
```

### 3. 前端测试

#### 教师端测试
1. 登录教师账号
2. 进入审批页面
3. 查看有附件的申请
4. 点击附件查看按钮
5. 验证图片是否正常显示

#### 学生端测试
1. 登录学生账号
2. 进入消息页面
3. 查看已提交的申请
4. 验证附件列表是否显示
5. 点击附件查看按钮
6. 验证图片是否正常显示

## 预期结果

### 成功场景
- 教师可以正常查看学生提交的附件图片
- 学生可以查看自己已提交申请的附件
- 图片在模态框中正确显示
- 支持缩略图和原图预览

### 错误处理
- 附件不存在时显示友好错误信息
- 图片加载失败时显示占位图
- 权限不足时显示相应提示

## 相关文件

### 后端文件
- `apps/app-icalink/src/services/LeaveService.ts` - 字段名映射修复
- `apps/app-icalink/src/types/api.ts` - 类型定义更新
- `apps/app-icalink/src/controllers/AttendanceController.ts` - 附件接口

### 前端文件
- `apps/agendaedu-app/src/pages/Approval.tsx` - 教师附件查看
- `apps/agendaedu-app/src/pages/StudentMessages.tsx` - 学生附件查看 (新增功能)
- `apps/agendaedu-app/src/lib/attendance-api.ts` - API类型定义

## 注意事项

1. **权限控制**：确保学生只能查看自己的附件，教师只能查看自己课程学生的附件
2. **性能优化**：大图片使用缩略图预览，点击后加载原图
3. **错误处理**：提供友好的错误提示和占位图
4. **移动端适配**：确保在移动设备上也能正常查看附件
