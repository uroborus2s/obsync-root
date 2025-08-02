# @stratix/icasync 系统架构设计文档

## 1. 架构概述

### 1.1 设计理念
@stratix/icasync 采用分层架构设计，遵循 Stratix 框架的插件开发规范，基于函数式编程范式，实现高内聚、低耦合的模块化设计。

### 1.2 核心原则
- **函数式编程**：所有业务逻辑采用纯函数实现
- **依赖注入**：基于 Awilix 的 IOC 容器管理
- **插件化架构**：符合 Fastify 插件标准
- **分层设计**：清晰的职责分离和接口定义
- **错误处理**：统一的错误处理和恢复机制

### 1.3 技术栈
- **框架**：Stratix Framework (Fastify 5 + Awilix 12)
- **语言**：TypeScript 5.0+
- **数据库**：MySQL 5.7+ (Kysely 查询构建器)
- **任务管理**：@stratix/tasks
- **外部集成**：@stratix/was-v7 (WPS API)
- **工具库**：@stratix/utils

## 2. 整体架构

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    @stratix/icasync                         │
├─────────────────────────────────────────────────────────────┤
│  Controller Layer (控制器层)                                │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │ SyncCtrl    │ TaskCtrl    │ CalendarCtrl│ MonitorCtrl │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (服务层)                                     │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │ CourseSvc   │ UserSvc     │ CalendarSvc │ TaskSvc     │  │
│  │ ScheduleSvc │ DataValidSvc│ MonitorSvc  │ EventBus    │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Adapter Layer (适配器层)                                   │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │ WpsCalendar │ WpsSchedule │ TaskMgmt    │ DataTransf  │  │
│  │ Adapter     │ Adapter     │ Adapter     │ Adapter     │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Repository Layer (仓库层)                                  │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │ CourseRepo  │ UserRepo    │ SyncRepo    │ TaskRepo    │  │
│  │ ScheduleRepo│ CalendarRepo│ MappingRepo │ LogRepo     │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  External Dependencies                                      │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │@stratix/    │@stratix/    │@stratix/    │ MySQL       │  │
│  │tasks        │was-v7       │database     │ Database    │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 模块依赖关系

```
Controller Layer
    ↓ (依赖)
Service Layer
    ↓ (依赖)
Adapter Layer + Repository Layer
    ↓ (依赖)
External Dependencies
```

## 3. 分层架构详细设计

### 3.1 控制器层 (Controller Layer)

#### 职责
- 处理 HTTP 请求和响应
- 参数验证和格式化
- 路由管理和权限控制
- 统一的错误处理

#### 核心组件
- **SyncController**：同步操作控制器
- **TaskController**：任务管理控制器
- **CalendarController**：日历管理控制器
- **ScheduleController**：日程管理控制器
- **UserController**：用户管理控制器
- **MonitoringController**：监控报告控制器

#### 设计特点
- 所有控制器注册为 SINGLETON 生命周期
- 采用函数式编程模式
- 统一的响应格式和错误处理
- 完整的请求参数验证

### 3.2 服务层 (Service Layer)

#### 职责
- 核心业务逻辑实现
- 服务间协调和编排
- 事务管理和数据一致性
- 业务规则验证

#### 核心组件
- **CourseSyncService**：课程同步业务逻辑
- **UserSyncService**：用户同步业务逻辑
- **CalendarManagementService**：日历管理业务逻辑
- **ScheduleManagementService**：日程管理业务逻辑
- **TaskManagementService**：任务管理业务逻辑
- **DataValidationService**：数据验证业务逻辑
- **MonitoringService**：监控报告业务逻辑
- **SyncEventBus**：事件总线

#### 设计特点
- 所有服务注册为 SINGLETON 生命周期
- 纯函数式业务逻辑
- 基于事件驱动的服务协作
- 统一的错误处理和重试机制

### 3.3 适配器层 (Adapter Layer)

#### 职责
- 外部系统集成封装
- 数据格式转换和映射
- 外部 API 调用管理
- 错误转换和重试机制

#### 核心组件
- **WpsCalendarAdapter**：WPS 日历 API 适配器
- **WpsScheduleAdapter**：WPS 日程 API 适配器
- **TaskManagementAdapter**：任务管理适配器
- **DataTransformAdapter**：数据转换适配器
- **CacheAdapter**：缓存适配器

#### 设计特点
- 所有适配器注册为 SINGLETON 生命周期
- 统一的适配器接口设计
- 支持批量操作和性能优化
- 完整的错误处理和重试机制

### 3.4 仓库层 (Repository Layer)

#### 职责
- 数据访问和持久化
- 数据库查询优化
- 事务管理
- 数据一致性保证

#### 核心组件
- **CourseRawRepository**：原始课程数据仓库
- **JuheRenwuRepository**：聚合任务数据仓库
- **StudentCourseRepository**：学生课程关联仓库
- **UserInfoRepository**：用户信息仓库
- **CalendarMappingRepository**：日历映射仓库
- **ScheduleMappingRepository**：日程映射仓库
- **UserViewRepository**：用户视图仓库
- **CalendarParticipantsRepository**：日历参与者仓库
- **SyncTaskRepository**：同步任务仓库

#### 设计特点
- 所有仓库注册为 SCOPED 生命周期
- 基于 Kysely 的类型安全查询
- 统一的 CRUD 操作接口
- 支持批量操作和事务管理

## 4. 数据流设计

### 4.1 全量同步数据流

```
原始数据表 (u_jw_kcb_cur)
    ↓ (聚合)
聚合任务表 (juhe_renwu)
    ↓ (转换)
WPS 日历创建请求
    ↓ (API 调用)
WPS 日历系统
    ↓ (映射存储)
日历映射表 (icasync_calendar_mapping)
    ↓ (日程创建)
WPS 日程系统
    ↓ (映射存储)
日程映射表 (icasync_schedule_mapping)
```

### 4.2 增量同步数据流

```
变更检测 (u_jw_kcb_cur.gx_zt = null)
    ↓ (分析变更)
变更分类 (新增/更新/删除)
    ↓ (删除处理)
WPS 日程删除 + 本地软删除
    ↓ (重新聚合)
新的聚合数据 (juhe_renwu)
    ↓ (同步更新)
WPS 日历/日程更新
    ↓ (状态更新)
同步状态表更新
```

### 4.3 用户同步数据流

```
用户原始表 (out_xsxx + out_jsxx)
    ↓ (整合)
用户视图表 (icasync_user_view)
    ↓ (变更检测)
用户变更分析
    ↓ (权限更新)
WPS 日历参与者管理
    ↓ (映射更新)
参与者映射表 (icasync_calendar_participants)
```

## 5. 任务管理架构

### 5.1 任务树结构

```
同步任务树 (Root)
├── 数据准备阶段
│   ├── 参数验证
│   ├── 连接检查
│   └── 数据清理
├── 数据处理阶段
│   ├── 数据聚合
│   ├── 数据验证
│   └── 数据转换
├── 同步执行阶段
│   ├── 日历创建
│   ├── 参与者管理
│   └── 日程同步
└── 完成清理阶段
    ├── 状态更新
    ├── 报告生成
    └── 资源清理
```

### 5.2 任务处理器架构

```
TaskProcessor Interface
├── DataValidatorProcessor
├── DataAggregatorProcessor
├── CalendarCreatorProcessor
├── ScheduleCreatorProcessor
├── ParticipantManagerProcessor
├── StatusUpdaterProcessor
└── ReportGeneratorProcessor
```

## 6. 错误处理架构

### 6.1 错误分类

```
IcasyncError (基础错误类)
├── ValidationError (验证错误)
├── BusinessLogicError (业务逻辑错误)
├── ExternalServiceError (外部服务错误)
│   ├── WpsApiError (WPS API 错误)
│   └── DatabaseError (数据库错误)
├── TaskExecutionError (任务执行错误)
└── SystemError (系统错误)
```

### 6.2 错误处理策略

```
错误捕获 → 错误分类 → 错误转换 → 错误记录 → 错误恢复
    ↓           ↓           ↓           ↓           ↓
异常捕获    错误类型    统一格式    日志记录    重试/回滚
```

## 7. 性能优化架构

### 7.1 缓存策略

```
多层缓存架构
├── 应用层缓存 (内存缓存)
│   ├── 用户映射缓存
│   ├── 日历信息缓存
│   └── 配置信息缓存
├── 数据库缓存 (查询缓存)
│   ├── 查询结果缓存
│   └── 连接池缓存
└── 外部 API 缓存 (响应缓存)
    ├── WPS API 响应缓存
    └── 用户信息缓存
```

### 7.2 并发控制

```
并发控制策略
├── 全局锁 (防止多个同步任务并发)
├── 任务树锁 (任务树级别的互斥)
├── 节点锁 (任务节点级别的控制)
└── 资源锁 (共享资源的访问控制)
```

## 8. 监控和观测架构

### 8.1 监控指标

```
监控指标体系
├── 业务指标
│   ├── 同步成功率
│   ├── 数据准确率
│   └── 任务完成时间
├── 性能指标
│   ├── API 响应时间
│   ├── 数据库查询时间
│   └── 外部 API 调用时间
├── 系统指标
│   ├── CPU 使用率
│   ├── 内存使用率
│   └── 网络 I/O
└── 错误指标
    ├── 错误率
    ├── 错误类型分布
    └── 错误恢复时间
```

### 8.2 日志架构

```
日志系统
├── 业务日志
│   ├── 同步操作日志
│   ├── 任务执行日志
│   └── 数据变更日志
├── 系统日志
│   ├── 应用启动日志
│   ├── 错误异常日志
│   └── 性能监控日志
└── 审计日志
    ├── 用户操作日志
    ├── 权限变更日志
    └── 配置修改日志
```

## 9. 部署架构

### 9.1 部署模式

```
部署架构
├── 单机部署 (开发/测试环境)
├── 集群部署 (生产环境)
│   ├── 负载均衡
│   ├── 服务发现
│   └── 故障转移
└── 容器化部署 (Docker/K8s)
    ├── 镜像管理
    ├── 配置管理
    └── 资源管理
```

### 9.2 扩展性设计

```
扩展性架构
├── 水平扩展 (多实例部署)
├── 垂直扩展 (资源增加)
├── 功能扩展 (插件机制)
└── 数据扩展 (分库分表)
```
