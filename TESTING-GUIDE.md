# 文件上传功能测试指南

## 🎯 测试目标

验证 `parent_id` 字段是否能正确解析，文件上传功能是否正常工作。

---

## 📋 测试前准备

### 1. 确认代码已更新

```bash
# 查看配置文件
cat apps/app-icalink/src/stratix.config.ts | grep -A 5 "multipart"

# 应该看到（没有 attachFieldsToBody）：
# {
#   name: 'multipart',
#   plugin: multipart,
#   options: {
#     limits: {
#       fileSize: 50 * 1024 * 1024
#     }
#   }
# }
```

```bash
# 查看 Controller 代码
grep -A 10 "request.parts()" apps/app-icalink/src/controllers/WpsDriveController.ts

# 应该看到：
# const parts = request.parts();
# let fileData: any = null;
# let parent_id: string | null = null;
# ...
```

### 2. 重启后端服务

```bash
cd apps/app-icalink
pnpm run dev
```

---

## 🧪 测试方法

### 方法1：使用前端界面（推荐）

1. **打开前端应用**
   ```bash
   cd apps/agendaedu-web
   pnpm run dev
   ```

2. **导航到 WPS 云盘页面**
   - 访问 `http://localhost:3000/wps-drive`（根据实际端口）

3. **选择上传位置**
   - **测试场景A**：在云盘根目录上传
     - 选择一个云盘
     - 点击上传按钮
     - 选择一个文件
     - **预期**：`parent_id = '0'`
   
   - **测试场景B**：在文件夹内上传
     - 选择一个文件夹
     - 点击上传按钮
     - 选择一个文件
     - **预期**：`parent_id = 文件夹的file_id`

4. **查看后端日志**
   ```
   [DEBUG] Received field part: { fieldname: 'parent_id', value: '0' }
   [DEBUG] Received file part: { 
     fieldname: 'file', 
     filename: '截屏2025-11-05 00.30.43.png',
     mimetype: 'image/png'
   }
   [INFO] Received file upload request: {
     drive_id: 'xxx',
     parent_id: '0',
     fileName: '截屏2025-11-05 00.30.43.png',
     fileSize: 123456,
     contentType: 'image/png'
   }
   ```

---

### 方法2：使用 curl 命令

```bash
# 测试上传到根目录
curl -X POST "http://localhost:8090/api/icalink/v1/wps-drive/drives/YOUR_DRIVE_ID/files/upload" \
  -F "file=@test-file.txt" \
  -F "parent_id=0" \
  -v

# 测试上传到文件夹
curl -X POST "http://localhost:8090/api/icalink/v1/wps-drive/drives/YOUR_DRIVE_ID/files/upload" \
  -F "file=@test-file.txt" \
  -F "parent_id=FOLDER_FILE_ID" \
  -v
```

**预期响应**：
```json
{
  "success": true,
  "data": {
    "id": "file_xxx",
    "name": "test-file.txt",
    "type": "file",
    "size": 123,
    "created_at": "2025-11-05T00:30:43Z",
    "modified_at": "2025-11-05T00:30:43Z"
  }
}
```

---

### 方法3：使用 HTML 测试页面

1. **打开测试页面**
   ```bash
   open test-upload.html
   ```

2. **填写表单**
   - Drive ID: 输入你的云盘ID
   - Parent ID: 输入 `0`（根目录）或文件夹ID
   - 选择文件

3. **点击上传**

4. **查看结果**
   - 浏览器控制台会显示详细的请求和响应信息
   - 后端日志会显示解析的字段

---

## ✅ 验证清单

### 后端日志检查

- [ ] 看到 `[DEBUG] Received field part: { fieldname: 'parent_id', value: '...' }`
- [ ] 看到 `[DEBUG] Received file part: { fieldname: 'file', filename: '...', mimetype: '...' }`
- [ ] 看到 `[INFO] Received file upload request` 包含正确的 `parent_id`
- [ ] 没有看到 `缺少必需参数：parent_id` 错误

### 功能检查

- [ ] 文件成功上传到 WPS 云盘
- [ ] 文件出现在正确的位置（根目录或指定文件夹）
- [ ] 文件名、大小、类型正确
- [ ] 前端显示上传成功

---

## 🐛 常见问题排查

### 问题1：仍然提示 "缺少必需参数：parent_id"

**可能原因**：
- 代码未重新编译
- 服务未重启

**解决方法**：
```bash
# 停止服务
# Ctrl+C

# 重新构建
cd apps/app-icalink
pnpm run build

# 重新启动
pnpm run dev
```

---

### 问题2：后端日志没有显示 DEBUG 信息

**可能原因**：
- 日志级别设置过高

**解决方法**：
检查 `stratix.config.ts` 中的日志配置：
```typescript
logger: {
  level: 'debug',  // ✅ 确保是 debug
  // ...
}
```

---

### 问题3：文件上传失败，提示 403 或其他错误

**可能原因**：
- WPS API 认证问题
- 文件大小超限
- 网络问题

**解决方法**：
1. 查看完整的错误日志
2. 检查 WPS API 配置
3. 确认文件大小 < 50MB

---

## 📊 测试报告模板

```
测试时间：2025-11-05 00:30:43
测试人员：[你的名字]

测试场景1：上传到根目录
- 文件名：test-file.txt
- 文件大小：123 bytes
- parent_id：0
- 结果：✅ 成功 / ❌ 失败
- 备注：

测试场景2：上传到文件夹
- 文件名：image.png
- 文件大小：45678 bytes
- parent_id：folder_abc123
- 结果：✅ 成功 / ❌ 失败
- 备注：

后端日志：
[粘贴关键日志]

问题记录：
[如有问题，详细描述]
```

---

## 🎉 测试成功标志

如果看到以下日志，说明修复成功：

```
[DEBUG] Received field part: { fieldname: 'parent_id', value: '0' }
[DEBUG] Received file part: { 
  fieldname: 'file', 
  filename: 'test-file.txt',
  mimetype: 'text/plain'
}
[INFO] Received file upload request: {
  drive_id: 'xxx',
  parent_id: '0',
  fileName: 'test-file.txt',
  fileSize: 123,
  contentType: 'text/plain'
}
[DEBUG] File hash calculated: { fileName: 'test-file.txt', fileHash: 'xxx' }
[INFO] File uploaded successfully
```

**恭喜！🎊 `parent_id` 字段解析问题已完全解决！**

