# Stratix Cron定时任务插件详细设计文档

## 目录
1. [需求理解总结](#1-需求理解总结)
2. [系统架构设计](#2-系统架构设计)
3. [详细设计](#3-详细设计)
   - [数据模型设计](#31-数据模型设计)
   - [API设计](#32-api设计)
   - [业务流程设计](#33-业务流程设计)
   - [安全性考虑](#34-安全性考虑)
   - [性能优化策略](#35-性能优化策略)
4. [技术选型](#4-技术选型)
5. [潜在风险与解决方案](#5-潜在风险与解决方案)
6. [实施计划](#6-实施计划)

## 1. 需求理解总结

Stratix Cron插件是Stratix框架的一个核心插件，旨在提供定时任务调度功能，使应用能够在特定时间点或按特定间隔执行任务。基于Stratix的插件化架构，该插件需要满足以下需求：

- 支持标准cron表达式配置定时任务
- 支持动态创建、修改、删除和暂停任务
- 提供任务执行历史记录和状态跟踪
- 支持任务超时控制和错误处理
- 与其他Stratix插件集成，如日志、队列等
- 支持分布式环境下的任务协调（避免重复执行）
- 提供优雅关闭机制，确保任务能够完成或正确停止

## 2. 系统架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────┐
│            Stratix Cron插件             │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐     ┌─────────────┐    │
│  │  调度管理器  │     │ 作业存储适配器│    │
│  └─────────────┘     └─────────────┘    │
│          │                 │            │
│          ▼                 ▼            │
│  ┌─────────────┐     ┌─────────────┐    │
│  │  作业执行器  │     │ 分布式锁管理 │    │
│  └─────────────┘     └─────────────┘    │
│          │                 │            │
│          └────────┬────────┘            │
│                   ▼                     │
│  ┌─────────────────────────────┐        │
│  │         事件发射器          │        │
│  └─────────────────────────────┘        │
│                                         │
└─────────────────────────────────────────┘
                    │
┌───────────────────┼───────────────────┐
│                   ▼                   │
│   ┌────────┐  ┌────────┐  ┌────────┐  │
│   │ Logger │  │ Queue  │  │ Cache  │  │
│   └────────┘  └────────┘  └────────┘  │
│                                       │
│          Stratix其他插件              │
└───────────────────────────────────────┘
```

### 2.2 核心组件及其关系

1. **调度管理器 (ScheduleManager)**
   - 管理所有定时任务配置
   - 解析和验证cron表达式
   - 计算下次执行时间
   - 触发任务执行

2. **作业存储适配器 (JobStoreAdapter)**
   - 提供作业持久化存储
   - 支持内存、文件、数据库等多种存储方式
   - 管理作业元数据和状态

3. **作业执行器 (JobRunner)**
   - 执行调度的任务
   - 管理任务上下文和超时
   - 处理任务返回结果
   - 记录执行历史

4. **分布式锁管理 (DistributedLockManager)**
   - 在分布式环境中确保任务不被重复执行
   - 支持多实例协调
   - 处理节点故障和任务接管

5. **事件发射器 (EventEmitter)**
   - 发出任务生命周期事件
   - 允许外部监听和响应任务状态变化

## 3. 详细设计

### 3.1 数据模型设计

#### 3.1.1 作业定义 (JobDefinition)

```typescript
interface JobDefinition {
  // 作业唯一标识
  id: string;
  
  // 作业名称
  name: string;
  
  // cron表达式或特殊调度类型(如"@hourly")
  schedule: string;
  
  // 时区，默认UTC
  timezone?: string;
  
  // 作业处理器（函数名或完整路径）
  handler: string;
  
  // 作业参数
  data?: any;
  
  // 作业配置选项
  options?: {
    // 是否启用
    enabled: boolean;
    
    // 超时时间（毫秒）
    timeout?: number;
    
    // 最大重试次数
    maxRetries?: number;
    
    // 执行模式：'normal'(默认)、'isolated'(独占)
    mode?: 'normal' | 'isolated';
    
    // 并发执行实例数上限（0表示无限制）
    maxConcurrency?: number;
    
    // 是否在应用启动时立即执行一次
    runOnStart?: boolean;
    
    // 任务优先级（数字越小优先级越高）
    priority?: number;
  };
  
  // 创建时间
  createdAt: Date;
  
  // 更新时间
  updatedAt: Date;
  
  // 下次预计执行时间
  nextRunTime?: Date;
  
  // 最后执行时间
  lastRunTime?: Date;
  
  // 最后执行状态
  lastRunStatus?: 'success' | 'failure' | 'timeout';
  
  // 最后错误信息
  lastError?: string;
}
```

#### 3.1.2 作业执行历史 (JobExecutionHistory)

```typescript
interface JobExecutionHistory {
  // 执行ID
  id: string;
  
  // 作业ID
  jobId: string;
  
  // 开始时间
  startTime: Date;
  
  // 结束时间
  endTime?: Date;
  
  // 执行状态
  status: 'running' | 'success' | 'failure' | 'timeout' | 'cancelled';
  
  // 执行结果
  result?: any;
  
  // 错误信息
  error?: string;
  
  // 执行节点标识
  nodeId: string;
  
  // 执行耗时(毫秒)
  duration?: number;
}
```

#### 3.1.3 锁定记录 (LockRecord)

```typescript
interface LockRecord {
  // 锁ID（通常是作业ID）
  lockId: string;
  
  // 持有锁的节点ID
  nodeId: string;
  
  // 获取锁的时间
  acquiredAt: Date;
  
  // 锁过期时间
  expiresAt: Date;
  
  // 锁更新时间（用于延长锁）
  updatedAt: Date;
}
```

### 3.2 API设计

#### 3.2.1 插件API

```typescript
// 插件定义
interface CronPlugin {
  name: string;
  dependencies: string[];
  register: (app: StratixApp, options: CronOptions) => Promise<void>;
}

// 默认导出
export default CronPlugin;
```

#### 3.2.2 调度管理器API

```typescript
// 调度管理器接口
interface ScheduleManager {
  // 添加作业
  add(jobDef: Partial<JobDefinition>): Promise<JobDefinition>;
  
  // 更新作业
  update(id: string, jobDef: Partial<JobDefinition>): Promise<JobDefinition>;
  
  // 移除作业
  remove(id: string): Promise<boolean>;
  
  // 获取所有作业
  getAll(): Promise<JobDefinition[]>;
  
  // 获取特定作业
  get(id: string): Promise<JobDefinition | null>;
  
  // 启用作业
  enable(id: string): Promise<JobDefinition>;
  
  // 禁用作业
  disable(id: string): Promise<JobDefinition>;
  
  // 手动触发作业执行
  trigger(id: string, data?: any): Promise<string>; // 返回执行ID
  
  // 停止特定作业的执行
  stop(executionId: string): Promise<boolean>;
  
  // 获取作业执行历史
  getHistory(jobId: string, options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<JobExecutionHistory[]>;
  
  // 等待作业执行完成
  waitForCompletion(executionId: string, timeout?: number): Promise<JobExecutionHistory>;
  
  // 获取作业下次执行时间
  getNextRunTime(jobId: string): Promise<Date | null>;
  
  // 获取作业状态
  getStatus(jobId: string): Promise<{
    enabled: boolean;
    running: boolean;
    nextRunTime?: Date;
    lastRunTime?: Date;
    lastRunStatus?: string;
    activeExecutions: number;
  }>;
  
  // 暂停所有作业调度
  pause(): Promise<void>;
  
  // 恢复所有作业调度
  resume(): Promise<void>;
  
  // 关闭调度器
  close(): Promise<void>;
  
  // 事件监听
  on(event: CronEvent, listener: (data: any) => void): void;
  off(event: CronEvent, listener: (data: any) => void): void;
}

// 事件类型
type CronEvent = 
  'job:created' | 
  'job:updated' | 
  'job:removed' | 
  'job:enabled' | 
  'job:disabled' | 
  'job:triggered' | 
  'job:started' | 
  'job:completed' | 
  'job:failed' | 
  'job:timeout' | 
  'scheduler:paused' | 
  'scheduler:resumed' | 
  'scheduler:closed';
```

### 3.3 业务流程设计

#### 3.3.1 作业调度流程

1. **作业注册流程**:
   - 应用通过API注册作业定义
   - 验证cron表达式和参数有效性
   - 计算首次执行时间
   - 存储作业定义
   - 启动作业调度

2. **调度循环流程**:
   - 定期检查需要执行的作业
   - 对到期作业尝试获取分布式锁
   - 成功获取锁后将作业添加到执行队列
   - 更新作业下次执行时间
   - 记录调度事件

3. **作业执行流程**:
   - 从执行队列获取作业
   - 创建执行上下文和历史记录
   - 设置超时控制
   - 执行作业处理函数
   - 记录执行结果
   - 处理成功/失败后的操作
   - 释放分布式锁

4. **错误处理流程**:
   - 捕获作业执行异常
   - 根据配置决定是否重试
   - 记录错误信息
   - 触发错误事件通知
   - 更新作业状态

5. **应用关闭流程**:
   - 接收关闭信号
   - 停止接受新的作业调度
   - 等待活跃作业完成或超时
   - 保存作业状态
   - 释放资源

#### 3.3.2 分布式协调流程

1. **锁获取流程**:
   - 生成作业锁ID
   - 通过存储适配器尝试获取锁
   - 设置锁过期时间
   - 记录锁持有节点信息

2. **锁维护流程**:
   - 定期更新锁过期时间
   - 检测锁状态变化
   - 处理锁异常情况

3. **锁释放流程**:
   - 作业完成后释放锁
   - 超时后自动释放锁
   - 节点故障处理

4. **节点协调流程**:
   - 节点启动时注册信息
   - 节点健康检查
   - 故障节点任务接管

### 3.4 安全性考虑

1. **权限控制**:
   - 限制只有授权用户可以添加/修改/删除作业
   - 敏感作业需要额外授权
   - 审计作业变更记录

2. **资源隔离**:
   - 作业执行环境隔离
   - 防止恶意作业消耗系统资源

3. **参数验证**:
   - 严格验证所有API输入参数
   - 防止注入攻击

4. **超时控制**:
   - 强制作业执行超时限制
   - 防止长时间运行作业阻塞系统

5. **错误限制**:
   - 限制连续失败次数过多的作业
   - 自动禁用异常作业

### 3.5 性能优化策略

1. **批量处理**:
   - 批量读取和更新作业状态
   - 减少存储访问频率

2. **缓存机制**:
   - 缓存作业定义和下次执行时间
   - 减少数据库查询负担

3. **负载分散**:
   - 均衡分布作业执行时间
   - 避免任务执行集中在同一时刻

4. **资源控制**:
   - 限制并发执行作业数量
   - 动态调整资源分配

5. **优化存储访问**:
   - 使用高效的存储策略
   - 定期清理历史记录

## 4. 技术选型

1. **核心依赖**:
   - `node-cron`: 提供cron表达式解析和调度功能
   - `cron-parser`: 高级cron表达式解析器
   - `uuid`: 生成唯一ID
   - `date-fns`: 时间和日期处理
   - `p-timeout`: 超时控制

2. **存储选项**:
   - 内存存储: 用于开发和简单场景
   - 文件存储: 用于单节点持久化
   - 数据库存储: 用于生产环境和分布式部署
   - Redis存储: 用于高性能分布式环境

3. **分布式锁实现**:
   - Redis-based锁: 使用Redis实现分布式锁
   - 数据库锁: 使用数据库事务实现锁机制
   - Etcd/ZooKeeper: 用于复杂分布式环境

## 5. 潜在风险与解决方案

1. **时钟漂移问题**
   - 风险: 不同节点时间不同步导致作业执行异常
   - 解决方案: 使用相对时间间隔和中央化时间源

2. **单点故障**
   - 风险: 中央调度器故障导致作业不执行
   - 解决方案: 分布式架构和故障转移机制

3. **长时间运行作业**
   - 风险: 长时间运行的作业阻塞调度器
   - 解决方案: 作业隔离执行和超时监控

4. **资源竞争**
   - 风险: 并发作业导致资源竞争
   - 解决方案: 作业优先级和资源限制机制

5. **数据一致性**
   - 风险: 分布式环境下数据不一致
   - 解决方案: 原子操作和事务支持

6. **作业重复执行**
   - 风险: 分布式环境下作业被多节点执行
   - 解决方案: 分布式锁和幂等性设计