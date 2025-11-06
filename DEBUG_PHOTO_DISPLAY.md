# 照片签到审核功能调试指南

## 问题描述
在照片签到审核对话框中，学生上传的签到照片无法正常显示。

---

## 调试步骤

### 1. 检查前端控制台日志

打开浏览器开发者工具（F12），查看 Console 标签的输出：

```javascript
// 应该看到以下日志：
学生信息: {
  student_id: "...",
  student_name: "...",
  metadata: {
    photo_url: "checkin/1734567890/photo_123.jpg",  // ← 检查这个值
    location_offset_distance: 50.5
  },
  ...
}

地址: http://localhost:8090/api/icalink/v1/oss/view/checkin/1734567890/photo_123.jpg
```

**检查项：**
- ✅ `metadata.photo_url` 是否存在？
- ✅ `metadata.photo_url` 的格式是否正确？（应该是 `checkin/时间戳/文件名.jpg`）
- ✅ 构造的完整 URL 是否正确？

---

### 2. 检查网络请求

打开浏览器开发者工具的 **Network** 标签：

1. **清空网络日志**（点击 🚫 图标）
2. **点击"审核"按钮**，打开照片审核对话框
3. **查找图片请求**：
   - 在 Filter 中输入 `oss/view`
   - 或者直接查找 `photo` 相关的请求

#### 2.1 检查请求 URL

```
GET http://localhost:8090/api/icalink/v1/oss/view/checkin/1734567890/photo_123.jpg
```

**检查项：**
- ✅ URL 格式是否正确？
- ✅ 路径中是否包含完整的对象路径？
- ✅ 是否有多余的斜杠或特殊字符？

#### 2.2 检查响应状态码

| 状态码 | 含义 | 可能原因 |
|--------|------|----------|
| **200** | 成功 | 图片正常返回 |
| **401** | 未认证 | 用户未登录或 token 过期 |
| **404** | 未找到 | OSS 中不存在该文件 |
| **500** | 服务器错误 | 后端代码错误或 OSS 连接失败 |

#### 2.3 检查响应头

点击请求，查看 **Headers** 标签：

```
Content-Type: image/jpeg  ← 应该是图片类型
Content-Disposition: inline; filename="photo_123.jpg"
Cache-Control: public, max-age=3600
Content-Length: 123456
```

**检查项：**
- ✅ `Content-Type` 是否是图片类型？（`image/jpeg`、`image/png` 等）
- ✅ `Content-Length` 是否大于 0？

#### 2.4 检查响应体

点击请求，查看 **Preview** 或 **Response** 标签：

**情况 1：正常返回图片**
- Preview 标签应该能看到图片预览
- Response 标签显示二进制数据

**情况 2：返回 JSON 错误**
```json
{
  "success": false,
  "message": "文件不存在"
}
```

**情况 3：返回 HTML 错误页面**
- 可能是路由配置错误

---

### 3. 检查后端日志

查看后端终端的日志输出：

#### 3.1 正常情况的日志

```
[INFO] Viewing image from OSS {
  userId: "105063",
  userType: "teacher",
  objectPath: "checkin/1734567890/photo_123.jpg"
}

[INFO] Image downloaded successfully {
  fileName: "photo_123.jpg",
  mimeType: "image/jpeg",
  fileSize: 123456
}
```

#### 3.2 错误情况的日志

**错误 1：用户未认证**
```
[WARN] User not authenticated
```

**错误 2：文件不存在**
```
[ERROR] Error in viewImage {
  error: "The specified key does not exist.",
  stack: "..."
}
```

**错误 3：路径解析错误**
```
[ERROR] Invalid object path: ""
```

---

### 4. 检查前端图片渲染

文件：`apps/agendaedu-app/src/components/PhotoApprovalDialog.tsx`

#### 4.1 检查 `imageUrl` 的值

```typescript
const imageUrl = getImageUrl(student.metadata?.photo_url);
console.log('地址:', imageUrl);
```

**可能的值：**
- ✅ `http://localhost:8090/api/icalink/v1/oss/view/checkin/1734567890/photo_123.jpg` - 正常
- ❌ `undefined` - `photo_url` 不存在
- ❌ `http://localhost:8090/api/icalink/v1/oss/view/undefined` - `photo_url` 为 `undefined`

#### 4.2 检查图片加载状态

在 `<img>` 标签中添加调试日志：

```typescript
const handleImageLoad = () => {
  console.log('✅ 图片加载成功');
  setImageLoading(false);
};

const handleImageError = () => {
  console.log('❌ 图片加载失败');
  setImageLoading(false);
  setImageError(true);
};
```

**检查项：**
- ✅ 是否触发了 `onLoad` 回调？（图片加载成功）
- ❌ 是否触发了 `onError` 回调？（图片加载失败）

---

### 5. 常见问题和解决方案

#### 问题 1：`metadata.photo_url` 为空

**原因：**
- 学生签到时没有上传照片
- 后端没有正确保存照片路径

**解决方案：**
1. 检查学生签到时是否成功上传了照片
2. 检查后端签到接口是否正确保存了 `metadata.photo_url`
3. 查看数据库中 `attendance_records` 表的 `metadata` 字段

#### 问题 2：返回 404 Not Found

**原因：**
- OSS 中不存在该文件
- 对象路径错误

**解决方案：**
1. 登录 MinIO 控制台，检查 `icalink-attachments` bucket 中是否存在该文件
2. 检查对象路径是否正确（区分大小写）
3. 检查文件是否被意外删除

#### 问题 3：返回 401 Unauthorized

**原因：**
- 用户未登录
- Token 过期
- 认证中间件配置错误

**解决方案：**
1. 刷新页面重新登录
2. 检查 Cookie 中的 `wps_jwt_token` 是否存在
3. 检查后端认证中间件是否正确配置

#### 问题 4：图片加载失败（触发 onError）

**原因：**
- 后端返回的不是图片数据
- Content-Type 设置错误
- CORS 问题

**解决方案：**
1. 检查网络请求的 Response，确认返回的是二进制图片数据
2. 检查响应头的 `Content-Type` 是否正确
3. 检查浏览器控制台是否有 CORS 错误

#### 问题 5：路径解析错误

**原因：**
- 通配符路由 `*` 没有正确匹配多级路径
- URL 编码问题

**解决方案：**
1. 检查后端日志中的 `objectPath` 值
2. 确认 Fastify 路由配置正确
3. 检查是否需要手动处理 URL 编码

---

## 调试检查清单

### 前端检查

- [ ] 浏览器控制台有 `学生信息:` 日志
- [ ] `metadata.photo_url` 不为空
- [ ] 浏览器控制台有 `地址:` 日志
- [ ] 构造的 URL 格式正确
- [ ] Network 标签中有图片请求
- [ ] 图片请求的状态码是 200
- [ ] 响应头的 `Content-Type` 是图片类型
- [ ] Preview 标签能看到图片预览
- [ ] 没有触发 `onError` 回调

### 后端检查

- [ ] 后端日志有 `Viewing image from OSS` 日志
- [ ] `objectPath` 值正确
- [ ] 后端日志有 `Image downloaded successfully` 日志
- [ ] 没有错误日志
- [ ] MinIO 中存在该文件
- [ ] 响应头设置正确

---

## 下一步行动

根据调试结果，选择对应的修复方案：

1. **如果 `photo_url` 为空**：
   - 检查学生签到流程
   - 检查后端签到接口的照片保存逻辑

2. **如果返回 404**：
   - 检查 MinIO 中的文件
   - 检查对象路径是否正确

3. **如果返回 401**：
   - 检查用户认证状态
   - 检查 Token 是否有效

4. **如果返回 500**：
   - 查看后端错误日志
   - 检查 OSS 连接配置

5. **如果图片加载失败**：
   - 检查响应的 Content-Type
   - 检查是否有 CORS 错误

---

## 联系信息

如果以上步骤无法解决问题，请提供以下信息：

1. 浏览器控制台的完整日志（包括 `学生信息:` 和 `地址:` 日志）
2. Network 标签中图片请求的截图（包括 Headers、Preview、Response）
3. 后端终端的日志输出
4. 具体的错误信息或错误堆栈

