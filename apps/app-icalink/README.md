# iCalink 智能校园考勤系统

基于 Stratix 框架开发的智能校园考勤管理系统，实现学生签到、请假申请、审批等核心功能。

## 项目概述

iCalink（Intelligent Campus Attendance Link）是一个现代化的校园考勤管理系统，采用严格的分层架构设计，遵循依赖倒置原则，提供高性能、可扩展的考勤管理解决方案。

### 核心特性

- 🎯 **智能签到**：支持位置验证、时间窗口控制、迟到自动判定
- 📝 **请假管理**：完整的请假申请、审批、撤回流程
- 📊 **数据统计**：实时考勤统计、趋势分析、报表导出
- 🔐 **权限控制**：基于角色的访问控制，确保数据安全
- 📱 **移动友好**：RESTful API设计，支持多端接入
- ⚡ **高性能**：基于Fastify + Stratix框架，支持高并发

## 技术架构

### 框架选择

- **核心框架**：Stratix Framework (基于 Fastify 5 + Awilix 12)
- **数据库**：MySQL 8.0+
- **语言**：TypeScript 5.0+
- **依赖注入**：Awilix容器 + 自动发现机制

### 分层架构

```
┌─────────────────────────────────────────┐
│              Controller 层               │  ← HTTP接口层
├─────────────────────────────────────────┤
│               Service 层                 │  ← 业务逻辑层
├─────────────────────────────────────────┤
│             Repository 层                │  ← 数据访问层
├─────────────────────────────────────────┤
│              Database 层                 │  ← 数据存储层
└─────────────────────────────────────────┘
```

### 核心设计原则

1. **依赖倒置原则**：高层模块不依赖低层模块，都依赖抽象
2. **接口隔离原则**：使用接口定义契约，实现松耦合
3. **单一职责原则**：每个类和模块都有明确的职责
4. **开闭原则**：对扩展开放，对修改关闭

## 项目结构

```
apps/app-icalink/
├── src/
│   ├── types/                    # 类型定义
│   │   ├── database.ts          # 数据库实体类型
│   │   ├── api.ts               # API接口类型
│   │   ├── service.ts           # 服务层类型
│   │   └── index.ts             # 类型导出
│   ├── repositories/            # 数据访问层
│   │   ├── interfaces/          # Repository接口
│   │   └── implementations/     # Repository实现
│   ├── services/                # 业务逻辑层
│   │   ├── interfaces/          # Service接口
│   │   └── implementations/     # Service实现
│   ├── controllers/             # HTTP控制器层
│   │   ├── AttendanceController.ts
│   │   └── LeaveController.ts
│   ├── plugins/                 # Stratix插件
│   │   └── attendance/
│   │       └── index.ts         # 插件入口
│   ├── config/                  # 配置文件
│   │   ├── app.ts              # 应用配置
│   │   ├── database.ts         # 数据库配置
│   │   └── index.ts            # 配置导出
│   ├── utils/                   # 工具函数
│   │   ├── validation.ts       # 验证工具
│   │   ├── datetime.ts         # 时间工具
│   │   └── index.ts            # 工具导出
│   └── index.ts                # 应用入口
├── database/                    # 数据库文件
│   ├── 001_create_attendance_tables.sql
│   └── 已存的数据库.sql
├── docs/                        # API文档
│   ├── API_01_LEAVE_QUERY.md
│   ├── API_02_STUDENT_CHECKIN.md
│   ├── API_03_LEAVE_APPLICATION.md
│   ├── API_04_LEAVE_WITHDRAW.md
│   ├── API_05_LEAVE_APPROVAL.md
│   ├── API_06_LEAVE_ATTACHMENTS.md
│   ├── API_07_ATTACHMENT_DOWNLOAD.md
│   ├── API_08_ATTENDANCE_HISTORY.md
│   ├── API_09_CURRENT_ATTENDANCE.md
│   └── API_10_ATTENDANCE_STATISTICS.md
├── package.json
└── README.md
```

## 核心功能模块

### 1. 考勤管理模块

#### 学生签到 (API_02)

- **端点**：`POST /api/attendance/checkin/{course_id}`
- **功能**：学生课程签到，支持位置验证和迟到判定
- **特性**：
  - 签到时间窗口控制
  - GPS位置验证（可选）
  - 自动迟到判定
  - 签到状态实时更新

#### 考勤历史查询 (API_08)

- **端点**：`GET /api/attendance/history`
- **功能**：查询历史考勤记录，支持多维度筛选
- **特性**：
  - 分页查询
  - 多条件筛选
  - 统计汇总
  - 数据导出

#### 当前考勤查询 (API_09)

- **端点**：`GET /api/attendance/current/{course_id}`
- **功能**：教师查看当前课程学生考勤状态
- **特性**：
  - 实时考勤状态
  - 学生列表管理
  - 考勤统计
  - 批量操作

#### 考勤统计分析 (API_10)

- **端点**：`GET /api/attendance/statistics`
- **功能**：考勤数据统计分析和趋势展示
- **特性**：
  - 多维度统计
  - 趋势分析
  - 图表展示
  - 报表导出

### 2. 请假管理模块

#### 请假信息查询 (API_01)

- **端点**：`GET /api/leave/applications`
- **功能**：查询请假申请信息，支持多角色访问
- **特性**：
  - 角色权限控制
  - 状态筛选
  - 分页查询
  - 详情展示

#### 请假申请提交 (API_03)

- **端点**：`POST /api/leave/applications`
- **功能**：学生提交请假申请，支持附件上传
- **特性**：
  - 表单验证
  - 图片附件上传
  - 自动通知
  - 状态跟踪

#### 请假申请撤回 (API_04)

- **端点**：`PUT /api/leave/applications/{application_id}/withdraw`
- **功能**：学生撤回已提交的请假申请
- **特性**：
  - 权限验证
  - 状态检查
  - 撤回限制
  - 通知机制

#### 请假申请审批 (API_05)

- **端点**：`PUT /api/leave/applications/{application_id}/approve`
- **功能**：教师审批学生请假申请
- **特性**：
  - 审批权限验证
  - 审批意见记录
  - 状态更新
  - 自动通知

#### 请假附件管理 (API_06, API_07)

- **端点**：
  - `GET /api/leave/applications/{application_id}/attachments`
  - `GET /api/leave/applications/{application_id}/attachments/{attachment_id}`
- **功能**：请假申请附件查看和下载
- **特性**：
  - 权限控制
  - 缩略图支持
  - 安全下载
  - 格式验证

## 数据库设计

### 核心数据表

#### 1. 签到记录表 (icalink_attendance_records)

```sql
CREATE TABLE icalink_attendance_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  attendance_course_id INT NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  student_name VARCHAR(100) NOT NULL,
  status ENUM('not_started', 'present', 'absent', 'leave', 'late') DEFAULT 'not_started',
  checkin_time DATETIME NULL,
  checkin_location VARCHAR(200) NULL,
  checkin_latitude DECIMAL(10,8) NULL,
  checkin_longitude DECIMAL(11,8) NULL,
  is_late BOOLEAN DEFAULT FALSE,
  late_minutes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2. 请假申请表 (icalink_leave_applications)

```sql
CREATE TABLE icalink_leave_applications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  attendance_record_id INT NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  student_name VARCHAR(100) NOT NULL,
  course_id VARCHAR(50) NOT NULL,
  course_name VARCHAR(200) NOT NULL,
  teacher_id VARCHAR(50) NOT NULL,
  teacher_name VARCHAR(100) NOT NULL,
  leave_type ENUM('sick', 'personal', 'emergency', 'other') NOT NULL,
  leave_reason TEXT NOT NULL,
  status ENUM('leave_pending', 'leave', 'leave_rejected', 'cancelled') DEFAULT 'leave_pending',
  application_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approval_time TIMESTAMP NULL,
  approval_comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 3. 请假附件表 (icalink_leave_attachments)

```sql
CREATE TABLE icalink_leave_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  leave_application_id INT NOT NULL,
  image_name VARCHAR(255) NOT NULL,
  image_size INT NOT NULL,
  image_type ENUM('image/jpeg', 'image/png', 'image/gif', 'image/webp') NOT NULL,
  image_content LONGBLOB NOT NULL,
  thumbnail_content BLOB NULL,
  upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 开发规范

### 代码规范

1. **命名约定**
   - 文件命名：PascalCase + 层级后缀 (如：`UserRepository.ts`)
   - 类命名：PascalCase (如：`AttendanceService`)
   - 接口命名：I + PascalCase (如：`IUserService`)
   - 方法命名：camelCase (如：`getUserInfo`)

2. **类型定义**
   - 所有接口和类型都有完整的TypeScript定义
   - 使用严格的类型检查
   - 避免使用`any`类型

3. **错误处理**
   - 统一使用`ServiceResult<T>`返回格式
   - 明确的错误代码和错误信息
   - 完整的错误日志记录

### 依赖注入规范

1. **Repository层**：SCOPED生命周期，继承BaseRepository
2. **Service层**：SCOPED生命周期，实现对应接口
3. **Controller层**：SCOPED生命周期，使用装饰器注册路由
4. **Adapter层**：SINGLETON生命周期，提供外部服务集成

### 性能优化

1. **数据库优化**
   - 使用连接池管理数据库连接
   - 合理的索引设计
   - 查询优化和缓存策略

2. **缓存策略**
   - 用户信息缓存（5分钟）
   - 课程信息缓存（10分钟）
   - 考勤统计缓存（3分钟）

3. **并发控制**
   - 请求级别的作用域管理
   - 异步处理和批量操作
   - 合理的限流策略

## 部署说明

### 环境要求

- Node.js 18.0+
- MySQL 8.0+
- Redis 6.0+ (可选，用于缓存)

### 环境变量配置

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=icalink

# 服务器配置
HOST=0.0.0.0
PORT=3000
NODE_ENV=production

# 日志配置
LOG_LEVEL=info
LOG_FILE_ENABLED=true

# 缓存配置
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 启动命令

```bash
# 安装依赖
pnpm install

# 构建项目
pnpm run build

# 启动服务
pnpm run start

# 开发模式
pnpm run dev
```

## API文档

详细的API文档请参考 `docs/` 目录中的各个接口文档文件。

### 主要API端点

| 端点                                             | 方法 | 功能         | 文档   |
| ------------------------------------------------ | ---- | ------------ | ------ |
| `/api/leave/applications`                        | GET  | 查询请假信息 | API_01 |
| `/api/attendance/checkin/{course_id}`            | POST | 学生签到     | API_02 |
| `/api/leave/applications`                        | POST | 请假申请     | API_03 |
| `/api/leave/applications/{id}/withdraw`          | PUT  | 撤回请假     | API_04 |
| `/api/leave/applications/{id}/approve`           | PUT  | 审批请假     | API_05 |
| `/api/leave/applications/{id}/attachments`       | GET  | 查看附件     | API_06 |
| `/api/leave/applications/{id}/attachments/{aid}` | GET  | 下载附件     | API_07 |
| `/api/attendance/history`                        | GET  | 考勤历史     | API_08 |
| `/api/attendance/current/{course_id}`            | GET  | 当前考勤     | API_09 |
| `/api/attendance/statistics`                     | GET  | 考勤统计     | API_10 |

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

© 2024 WPS Team. All rights reserved.
