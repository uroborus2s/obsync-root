# 附件查看问题调试指南

## 问题现象

学生在消息界面点击附件查看按钮后，无法显示图片。

## 调试步骤

### 1. 检查浏览器控制台

打开浏览器开发者工具，查看Console标签页的输出：

#### 预期的正常日志
```javascript
尝试查看附件: {
  attachmentId: "123",
  fileName: "截屏2025-08-29 14.46.31.png",
  imageUrl: "http://localhost:8090/api/icalink/v1/attendance/attachments/123/image",
  baseUrl: "http://localhost:8090/api"
}

附件查看成功: {
  imageUrl: "http://localhost:8090/api/icalink/v1/attendance/attachments/123/image",
  fileName: "截屏2025-08-29 14.46.31.png"
}

图片加载成功: http://localhost:8090/api/icalink/v1/attendance/attachments/123/image
```

#### 可能的错误日志
```javascript
// 权限错误
附件访问失败: {
  status: 403,
  statusText: "Forbidden",
  url: "http://localhost:8090/api/icalink/v1/attendance/attachments/123/image"
}

// 附件不存在
附件访问失败: {
  status: 404,
  statusText: "Not Found",
  url: "http://localhost:8090/api/icalink/v1/attendance/attachments/123/image"
}

// 图片加载失败
图片加载失败: http://localhost:8090/api/icalink/v1/attendance/attachments/123/image
```

### 2. 检查网络请求

在浏览器开发者工具的Network标签页中：

1. 点击附件查看按钮
2. 观察是否有对应的网络请求
3. 检查请求的状态码和响应

#### 预期的网络请求
```
Method: HEAD
URL: http://localhost:8090/api/icalink/v1/attendance/attachments/123/image
Status: 200 OK
Response Headers:
  Content-Type: image/png
  Content-Disposition: inline; filename="..."
  Cache-Control: public, max-age=3600
```

#### 常见错误状态码
- **403 Forbidden**: 权限不足，检查用户登录状态和权限
- **404 Not Found**: 附件不存在，检查附件ID是否正确
- **500 Internal Server Error**: 服务器错误，检查后端日志

### 3. 手动测试API接口

#### 3.1 获取附件列表
```bash
# 学生获取自己的申请列表
curl -X GET "http://localhost:8090/api/icalink/v1/attendance/leave-applications?page=1&page_size=5" \
  -H "Cookie: userType=student; userId=student123" \
  -s | jq '.data.applications[0].attachments'
```

#### 3.2 测试附件访问
```bash
# 使用获取到的附件ID测试
curl -I "http://localhost:8090/api/icalink/v1/attendance/attachments/1/image" \
  -H "Cookie: userType=student; userId=student123"
```

#### 3.3 下载附件内容
```bash
# 下载附件查看内容
curl "http://localhost:8090/api/icalink/v1/attendance/attachments/1/image" \
  -H "Cookie: userType=student; userId=student123" \
  -o test_attachment.png
```

### 4. 检查数据库数据

#### 4.1 检查附件记录
```sql
-- 查看附件表数据
SELECT 
  id,
  leave_application_id,
  image_name,
  image_size,
  image_type,
  upload_time
FROM icalink_leave_attachments 
ORDER BY id DESC 
LIMIT 10;
```

#### 4.2 检查请假申请关联
```sql
-- 查看请假申请和附件的关联
SELECT 
  la.id as application_id,
  la.student_id,
  la.student_name,
  la.status,
  att.id as attachment_id,
  att.image_name,
  att.image_size
FROM icalink_leave_applications la
LEFT JOIN icalink_leave_attachments att ON la.id = att.leave_application_id
WHERE la.student_id = 'student123'
ORDER BY la.id DESC;
```

### 5. 检查后端日志

查看app-icalink服务的日志：

```bash
# 查看实时日志
docker logs -f app-icalink

# 或者查看文件日志
tail -f logs/app-icalink.log
```

#### 关键日志信息
```
Getting attachment image: {
  userId: "student123",
  userType: "student", 
  attachmentId: "1",
  thumbnail: false
}

Download attachment by ID started: {
  attachmentId: 1,
  thumbnail: false
}
```

### 6. 常见问题和解决方案

#### 6.1 权限问题
**现象**: 403 Forbidden错误
**原因**: 学生尝试访问不属于自己的附件
**解决**: 检查权限验证逻辑，确保学生只能访问自己的附件

#### 6.2 附件ID格式问题
**现象**: 400 Bad Request或404 Not Found
**原因**: 前端传递的附件ID格式不正确
**解决**: 检查前端传递的ID是否为数字字符串

#### 6.3 Cookie认证问题
**现象**: 401 Unauthorized或403 Forbidden
**原因**: Cookie未正确传递或已过期
**解决**: 检查浏览器Cookie设置，重新登录

#### 6.4 CORS问题
**现象**: 网络请求被阻止
**原因**: 跨域请求配置问题
**解决**: 检查服务器CORS配置

### 7. 修复验证

修复后进行以下验证：

1. **功能验证**
   - 学生可以正常查看自己的附件
   - 教师可以正常查看学生的附件
   - 图片在模态框中正确显示

2. **错误处理验证**
   - 附件不存在时显示友好错误信息
   - 权限不足时显示相应提示
   - 网络错误时有重试机制

3. **性能验证**
   - 大图片加载速度合理
   - 缩略图功能正常工作
   - 缓存机制有效

### 8. 调试工具

#### 8.1 浏览器扩展
- **React Developer Tools**: 查看组件状态
- **Redux DevTools**: 查看状态管理（如果使用）

#### 8.2 网络调试
- **Postman**: 测试API接口
- **curl**: 命令行测试
- **浏览器Network面板**: 查看请求详情

#### 8.3 日志工具
- **浏览器Console**: 前端日志
- **服务器日志**: 后端错误信息
- **数据库日志**: SQL执行情况

## 预期修复结果

修复完成后，学生点击附件查看按钮应该：

1. 在控制台看到正确的调试日志
2. 网络请求返回200状态码
3. 图片在模态框中正确显示
4. 错误情况下显示友好的错误提示

如果仍有问题，请按照上述步骤逐一排查，并提供具体的错误信息。
