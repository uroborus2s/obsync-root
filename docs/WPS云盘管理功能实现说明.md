# WPS云盘管理功能实现说明

## 功能概述

在管理后台添加了WPS云盘管理功能，允许管理员查看和管理WPS驱动盘、文件夹和文件。

## 一、导航栏结构

在管理后台左侧导航栏中新增：
- **一级菜单**: "WPS云盘管理"
- **二级菜单**: "驱动盘管理"

**权限要求**: 仅管理员（admin、super_admin）可见

## 二、页面布局

页面采用左右分栏布局：

### 左侧区域：树形结构展示

1. **第一级：驱动盘列表**
   - 调用后端接口 `GET /api/icalink/v1/wps-drive/drives` 获取驱动盘列表
   - 使用 `WpsDriveAdapter.getDrive()` 获取驱动盘信息
   - 展示所有可用的驱动盘节点

2. **第二级及以下：文件/文件夹树**
   - 调用后端接口 `GET /api/icalink/v1/wps-drive/drives/:drive_id/files/:parent_id/children` 获取子节点
   - 使用 `WpsDriveAdapter.getChildren()` 获取子节点数据
   - 根据返回数据的 `type` 字段区分展示：
     - `type` 为 `folder` 时，显示为可展开的文件夹图标
     - `type` 为 `file` 时，显示为文件图标
   - 支持递归展开子文件夹

### 右侧区域：详情信息展示

根据左侧树形结构中选中的节点类型，展示不同的详情信息：

1. **选中驱动盘节点时**：
   - 调用后端接口 `GET /api/icalink/v1/wps-drive/drives/:drive_id/meta` 获取驱动盘元数据
   - 使用 `WpsDriveAdapter.getDriveMeta()` 获取详细信息
   - 展示驱动盘的详细信息：
     - 驱动盘名称
     - 驱动盘ID
     - 描述
     - 归属类型
     - 归属ID
     - 状态
     - 容量信息（总容量、已使用、剩余、回收站）

2. **选中文件夹节点时**：
   - 调用后端接口 `GET /api/icalink/v1/wps-drive/files/:file_id/meta` 获取文件夹元数据
   - 使用 `WpsDriveAdapter.getFileMeta()` 获取详细信息
   - 展示文件夹的详细信息：
     - 文件名
     - 文件ID
     - 类型
     - 大小
     - 父目录ID
     - 创建时间
     - 修改时间
     - 是否共享

3. **选中文件节点时**：
   - 调用后端接口 `GET /api/icalink/v1/wps-drive/files/:file_id/meta` 获取文件元数据
   - 使用 `WpsDriveAdapter.getFileMeta()` 获取详细信息
   - 展示文件的详细信息（同文件夹）

## 三、技术实现

### 后端开发（app-icalink）

#### 1. Service层

**文件**: `apps/app-icalink/src/services/WpsDriveService.ts`

实现了以下方法：
- `getDriveList(alloteeType, pageSize)`: 获取驱动盘列表
- `getDriveMeta(driveId, withExtAttrs)`: 获取驱动盘元数据
- `getChildren(driveId, parentId, pageSize, pageToken, withPermission, withExtAttrs)`: 获取子节点列表
- `getFileMeta(fileId, withPermission, withExtAttrs, withDrive)`: 获取文件元数据

**特点**：
- 遵循Stratix框架规范
- 统一的错误处理和结果格式
- 完整的参数验证
- 详细的日志记录

#### 2. Controller层

**文件**: `apps/app-icalink/src/controllers/WpsDriveController.ts`

实现了以下HTTP接口：
- `GET /api/icalink/v1/wps-drive/drives`: 获取驱动盘列表
- `GET /api/icalink/v1/wps-drive/drives/:drive_id/meta`: 获取驱动盘元数据
- `GET /api/icalink/v1/wps-drive/drives/:drive_id/files/:parent_id/children`: 获取子节点列表
- `GET /api/icalink/v1/wps-drive/files/:file_id/meta`: 获取文件元数据

**特点**：
- 使用装饰器注册路由
- 完整的参数验证
- 统一的HTTP状态码
- 详细的错误信息

#### 3. Adapter层

使用现有的 `WpsDriveAdapter`（来自 `@stratix/was-v7` 包），通过依赖注入获取：
```typescript
private readonly wasV7ApiDrive: WpsDriveAdapter
```

注册名称：`wasV7ApiDrive`

### 前端开发（agendaedu-web）

#### 1. 路由配置

**文件**: `apps/agendaedu-web/src/routes/_authenticated/wps-drive.tsx`

- 路由路径: `/wps-drive`
- 权限检查: 需要管理员权限（admin、super_admin）

#### 2. 页面组件

**文件**: `apps/agendaedu-web/src/features/wps-drive/index.tsx`

主要组件：
- `WpsDriveManagement`: 主页面组件
- `DriveTreeNode`: 驱动盘树节点组件
- `FileTreeNode`: 文件/文件夹树节点组件
- `DriveDetails`: 驱动盘详情组件
- `FileDetails`: 文件详情组件

**特点**：
- 使用React Query进行数据管理
- 懒加载子节点（点击展开时才加载）
- 响应式布局
- 加载状态和骨架屏
- 格式化显示（文件大小、时间等）

#### 3. API客户端

**文件**: `apps/agendaedu-web/src/features/wps-drive/api.ts`

封装了所有后端API调用：
- `getDriveList()`: 获取驱动盘列表
- `getDriveMeta()`: 获取驱动盘元数据
- `getChildren()`: 获取子节点列表
- `getFileMeta()`: 获取文件元数据

#### 4. 类型定义

**文件**: `apps/agendaedu-web/src/features/wps-drive/types.ts`

定义了所有相关的TypeScript类型：
- `DriveInfo`: 驱动盘信息
- `FileInfo`: 文件信息
- `GetChildrenResponse`: 子节点列表响应
- 其他辅助类型

#### 5. 导航栏配置

**文件**: `apps/agendaedu-web/src/components/layout/data/sidebar-data.ts`

在"系统管理"分组下添加了"WPS云盘管理"菜单项：
- 一级菜单: WPS云盘管理
- 二级菜单: 驱动盘管理（链接到 `/wps-drive`）
- 权限: 仅管理员可见

## 四、数据流

```
用户操作 → 前端组件 → API客户端 → 后端Controller → Service → Adapter → WPS API
                                                                    ↓
用户界面 ← 前端组件 ← React Query ← HTTP响应 ← Controller ← Service ← Adapter
```

## 五、文件清单

### 后端文件（app-icalink）

1. `apps/app-icalink/src/services/interfaces/IWpsDriveService.ts` - Service接口定义
2. `apps/app-icalink/src/services/WpsDriveService.ts` - Service实现
3. `apps/app-icalink/src/controllers/WpsDriveController.ts` - Controller实现
4. `apps/app-icalink/src/services/interfaces/index.ts` - 更新导出
5. `apps/app-icalink/src/services/index.ts` - 更新导出

### 前端文件（agendaedu-web）

1. `apps/agendaedu-web/src/routes/_authenticated/wps-drive.tsx` - 路由配置
2. `apps/agendaedu-web/src/features/wps-drive/index.tsx` - 主页面组件
3. `apps/agendaedu-web/src/features/wps-drive/api.ts` - API客户端
4. `apps/agendaedu-web/src/features/wps-drive/types.ts` - 类型定义
5. `apps/agendaedu-web/src/components/layout/data/sidebar-data.ts` - 导航栏配置更新

## 六、使用说明

1. **访问页面**：
   - 以管理员身份登录系统
   - 在左侧导航栏找到"WPS云盘管理" → "驱动盘管理"
   - 点击进入WPS云盘管理页面

2. **查看驱动盘**：
   - 左侧树形结构显示所有驱动盘
   - 点击驱动盘节点展开查看文件夹和文件
   - 右侧显示驱动盘的详细信息

3. **浏览文件**：
   - 点击文件夹图标展开查看子文件夹和文件
   - 点击文件或文件夹节点，右侧显示详细信息
   - 支持多级文件夹递归展开

## 七、注意事项

1. **权限控制**：
   - 仅管理员（admin、super_admin）可以访问此功能
   - 路由级别和组件级别都有权限检查

2. **性能优化**：
   - 使用懒加载，只在展开节点时才加载子节点
   - 使用React Query缓存数据，避免重复请求
   - 分页加载，默认每页20条数据

3. **错误处理**：
   - 后端统一错误处理和日志记录
   - 前端显示友好的错误提示
   - 网络错误自动重试

4. **扩展性**：
   - 代码结构清晰，易于扩展新功能
   - 类型定义完整，便于维护
   - 遵循项目规范，保持一致性

## 八、后续优化建议

1. **功能增强**：
   - 添加文件上传功能
   - 添加文件下载功能
   - 添加文件删除功能
   - 添加文件重命名功能
   - 添加文件搜索功能

2. **用户体验**：
   - 添加文件预览功能
   - 添加拖拽上传
   - 添加批量操作
   - 添加右键菜单

3. **性能优化**：
   - 虚拟滚动优化大量文件展示
   - 图片缩略图懒加载
   - 更智能的缓存策略

