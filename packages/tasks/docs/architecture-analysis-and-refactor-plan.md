# Tasks插件架构分析与重构报告

## 执行摘要

本报告对obsync-root项目中的packages/tasks插件进行了全面的架构分析和代码审查，识别了多个关键的架构缺陷和设计问题。主要发现包括：锁续期机制完全缺失、架构层次违规、生命周期管理不当、心跳机制重复、分布式实现不完整等问题。这些问题可能导致数据一致性风险、系统可靠性下降和维护困难。

## 1. 问题清单与影响评估

### 1.1 锁续期机制缺失问题 🔴 **严重**

**问题描述**：
- **位置**：整个锁机制中缺少续期功能
- **影响**：锁过期后可能导致重复执行工作流实例
- **风险等级**：严重 - 可能导致数据一致性问题

**具体表现**：
```typescript
// packages/tasks/src/services/DatabaseLockService.ts:168-206
// 定义了renewLock方法但没有被调用
async renewLock(key: string, owner: string, expirationMs?: number): Promise<boolean>

// packages/tasks/src/services/WorkflowEngineService.ts:224-253
// 心跳机制只更新引擎状态，不处理锁续期
private startHeartbeat(): void {
  // 缺少锁续期逻辑
}
```

### 1.2 架构违规问题 🔴 **严重**

**问题描述**：
- **位置**：`DistributedScheduler.ts`直接使用DatabaseAPI绕过Repository层
- **影响**：违反分层架构原则，增加维护成本
- **风险等级**：严重 - 破坏架构一致性

**具体表现**：
```typescript
// packages/tasks/src/services/DistributedScheduler.ts:525-532
private async getAffectedWorkflows(failedInstanceId: string): Promise<number[]> {
  const result = await this.databaseApi.executeQuery(async (db) => {
    return await db
      .selectFrom('workflow_instances')  // 直接操作数据库
      .select('id')
      .where('assigned_engine_id', '=', failedInstanceId)
      .execute();
  });
}

// 类似问题还出现在：
// - getAffectedNodes() 方法 (554-566行)
// - transferWorkflowsToEngine() 方法 (605-614行, 640-651行)
```

### 1.3 生命周期管理问题 🟡 **中等**

**问题描述**：
- **位置**：`WorkflowEngineService.ts`构造函数中启动心跳
- **影响**：违反Stratix框架生命周期管理原则
- **风险等级**：中等 - 可能导致资源管理问题

**具体表现**：
```typescript
// packages/tasks/src/services/WorkflowEngineService.ts:186-190
constructor(...) {
  // 在构造函数中启动心跳，应该在onReady中启动
  if (this.distributedScheduler) {
    this.registerEngineInstance();
    this.startHeartbeat();  // ❌ 错误的生命周期时机
  }
}
```

### 1.4 心跳机制重复问题 🟡 **中等**

**问题描述**：
- **位置**：`WorkflowEngineService`和`DistributedScheduler`都有心跳机制
- **影响**：功能重复，可能导致冲突和资源浪费
- **风险等级**：中等 - 影响性能和可维护性

**具体表现**：
```typescript
// WorkflowEngineService.ts:224-253 - 引擎心跳
private startHeartbeat(): void {
  this.heartbeatTimer = setInterval(async () => {
    await this.distributedScheduler.updateHeartbeat(this.instanceId, currentLoad);
  }, this.heartbeatInterval);
}

// DistributedScheduler.ts:496-507 - 调度器心跳
private startHeartbeatMonitoring(): void {
  this.heartbeatTimer = setInterval(async () => {
    await this.detectFailuresAndFailover();
    await this.lockManager.cleanupExpiredLocks();
  }, this.config.heartbeatInterval);
}
```

### 1.5 分布式实现不完整问题 🟡 **中等**

**问题描述**：
- **位置**：引擎注册仅存储在内存中，缺少持久化
- **影响**：节点重启后无法恢复分布式状态
- **风险等级**：中等 - 影响分布式可靠性

**具体表现**：
```typescript
// packages/tasks/src/services/DistributedScheduler.ts:88-96
async registerEngine(instance: WorkflowEngineInstance): Promise<void> {
  // 仅存储在内存Map中，缺少数据库持久化
  this.engines.set(instance.instanceId, instance);
}
```

### 1.6 Stratix框架集成问题 🟡 **中等**

**问题描述**：
- **位置**：核心服务未正确使用框架生命周期钩子
- **影响**：无法充分利用框架的生命周期管理能力
- **风险等级**：中等 - 影响框架集成质量

**具体表现**：
```typescript
// ✅ 正确实现 - AutoRecoveryService.ts:100-166
class AutoRecoveryService {
  async onReady(): Promise<void> { /* 正确实现 */ }
  async onClose(): Promise<void> { /* 正确实现 */ }
  async onListen(): Promise<void> { /* 正确实现 */ }
  async preClose(): Promise<void> { /* 正确实现 */ }
}

// ❌ 缺失实现 - WorkflowEngineService.ts
class WorkflowEngineService {
  constructor() {
    // 在构造函数中启动服务，应该在onReady中
    if (this.distributedScheduler) {
      this.registerEngineInstance();
      this.startHeartbeat();  // 错误的时机
    }
  }
  // 缺少onReady、onClose等生命周期方法
}

// ❌ 缺失实现 - DistributedScheduler.ts
class DistributedScheduler {
  constructor() {
    this.startHeartbeatMonitoring();  // 错误的时机
  }
  // 缺少生命周期方法
}
```

## 2. 架构缺陷详细分析

### 2.1 分层架构违规分析

**问题根因**：
1. `DistributedScheduler`作为Service层组件，直接使用DatabaseAPI操作数据库
2. 缺少对应的Repository层抽象
3. 违反了"Service层通过Repository层访问数据"的架构原则

**影响范围**：
- 数据访问逻辑分散，难以维护
- 无法统一处理数据库错误和事务
- 破坏了代码的可测试性

### 2.2 锁机制设计缺陷

**问题根因**：
1. 锁的生命周期管理不完整
2. 缺少与工作流执行状态的同步机制
3. 过期清理机制过于简单

**潜在风险**：
- 长时间运行的工作流可能因锁过期被重复执行
- 系统无法区分正常过期和异常过期
- 可能导致数据不一致和业务逻辑错误

### 2.3 生命周期管理缺陷

**问题根因**：
1. 未充分利用Stratix框架的生命周期钩子
2. 资源初始化时机不当
3. 缺少优雅关闭机制

**影响**：
- 可能导致资源泄露
- 系统启动和关闭过程不可控
- 难以进行集成测试

## 3. 完整的重构方案设计

### 3.1 锁续期机制重构

**目标**：实现完整的锁生命周期管理

**方案**：
1. 在WorkflowEngineService中添加锁续期逻辑
2. 建立锁与工作流实例的关联机制
3. 实现智能续期策略

**实现步骤**：
```typescript
// 1. 扩展WorkflowEngineService
class WorkflowEngineService {
  private workflowLocks = new Map<string, LockInfo>();
  
  // 在心跳中添加锁续期
  private async sendHeartbeat(): Promise<void> {
    await this.updateEngineHeartbeat();
    await this.renewWorkflowLocks();  // 新增
  }
  
  private async renewWorkflowLocks(): Promise<void> {
    for (const [instanceId, lockInfo] of this.workflowLocks) {
      if (this.shouldRenewLock(lockInfo)) {
        await this.distributedLockManager?.renewLock(
          lockInfo.lockKey,
          lockInfo.owner,
          this.calculateRenewalTime(lockInfo)
        );
      }
    }
  }
}
```

### 3.2 架构层次重构

**目标**：修复架构违规，建立正确的分层结构

**方案**：
1. 创建DistributedSchedulerRepository
2. 重构DistributedScheduler使用Repository层
3. 统一数据访问模式

**实现步骤**：
```typescript
// 1. 创建新的Repository
interface IDistributedSchedulerRepository {
  findWorkflowsByEngineId(engineId: string): Promise<DatabaseResult<WorkflowInstance[]>>;
  findNodesByEngineId(engineId: string): Promise<DatabaseResult<NodeInstance[]>>;
  transferWorkflowsToEngine(workflowIds: number[], targetEngineId: string): Promise<DatabaseResult<boolean>>;
  resetNodeStatus(nodeIds: string[]): Promise<DatabaseResult<boolean>>;
}

// 2. 重构DistributedScheduler
class DistributedScheduler {
  constructor(
    private readonly schedulerRepository: IDistributedSchedulerRepository,
    // 移除直接的DatabaseAPI依赖
  ) {}
  
  private async getAffectedWorkflows(failedInstanceId: string): Promise<number[]> {
    const result = await this.schedulerRepository.findWorkflowsByEngineId(failedInstanceId);
    return result.success ? result.data.map(w => w.id) : [];
  }
}
```

### 3.3 生命周期管理重构

**目标**：正确使用Stratix框架生命周期钩子

**方案**：
1. 实现onReady、onClose等生命周期方法
2. 将资源初始化移到合适的生命周期阶段
3. 添加优雅关闭机制

**实现步骤**：
```typescript
// 1. 为WorkflowEngineService添加生命周期方法
class WorkflowEngineService {
  constructor(...) {
    // 移除心跳启动逻辑
  }
  
  // 添加生命周期方法
  async onReady(): Promise<void> {
    if (this.distributedScheduler) {
      await this.registerEngineInstance();
      this.startHeartbeat();
    }
  }
  
  async onClose(): Promise<void> {
    await this.shutdown();
  }
  
  async preClose(): Promise<void> {
    // 停止接收新任务
    this.isShuttingDown = true;
  }
}
```

### 3.4 心跳机制统一重构

**目标**：消除心跳机制重复，建立统一的心跳管理

**方案**：
1. 将心跳功能集中到DistributedScheduler
2. WorkflowEngineService通过事件机制参与心跳
3. 建立心跳事件总线

**实现步骤**：
```typescript
// 1. 创建心跳事件总线
interface HeartbeatEventBus {
  on(event: 'heartbeat', handler: (data: HeartbeatData) => Promise<void>): void;
  emit(event: 'heartbeat', data: HeartbeatData): Promise<void>;
}

// 2. 重构心跳机制
class DistributedScheduler {
  private heartbeatBus: HeartbeatEventBus;
  
  private startHeartbeatMonitoring(): void {
    this.heartbeatTimer = setInterval(async () => {
      const heartbeatData = await this.collectHeartbeatData();
      await this.heartbeatBus.emit('heartbeat', heartbeatData);
      await this.detectFailuresAndFailover();
      await this.lockManager.cleanupExpiredLocks();
    }, this.config.heartbeatInterval);
  }
}

class WorkflowEngineService {
  constructor(private heartbeatBus: HeartbeatEventBus) {
    this.heartbeatBus.on('heartbeat', this.handleHeartbeat.bind(this));
  }
  
  private async handleHeartbeat(data: HeartbeatData): Promise<void> {
    await this.renewWorkflowLocks();
    await this.updateEngineStatus();
  }
}
```

### 3.5 分布式实现完善重构

**目标**：实现完整的分布式架构

**方案**：
1. 添加引擎注册的数据库持久化
2. 实现引擎发现机制
3. 建立分布式状态同步

**实现步骤**：
```typescript
// 1. 创建引擎注册Repository
interface IEngineRegistryRepository {
  registerEngine(instance: WorkflowEngineInstance): Promise<DatabaseResult<boolean>>;
  unregisterEngine(instanceId: string): Promise<DatabaseResult<boolean>>;
  findActiveEngines(): Promise<DatabaseResult<WorkflowEngineInstance[]>>;
  updateHeartbeat(instanceId: string, heartbeatData: any): Promise<DatabaseResult<boolean>>;
}

// 2. 重构DistributedScheduler
class DistributedScheduler {
  constructor(
    private readonly engineRegistry: IEngineRegistryRepository,
  ) {}
  
  async registerEngine(instance: WorkflowEngineInstance): Promise<void> {
    // 内存注册
    this.engines.set(instance.instanceId, instance);
    
    // 数据库持久化
    await this.engineRegistry.registerEngine(instance);
  }
  
  async loadEnginesFromDatabase(): Promise<void> {
    const result = await this.engineRegistry.findActiveEngines();
    if (result.success) {
      for (const engine of result.data) {
        this.engines.set(engine.instanceId, engine);
      }
    }
  }
}
```

## 4. 代码实现建议和最佳实践

### 4.1 锁续期最佳实践

```typescript
// 智能锁续期策略
class LockRenewalStrategy {
  calculateRenewalTime(lockInfo: LockInfo): number {
    const remainingTime = lockInfo.expiresAt.getTime() - Date.now();
    const renewalThreshold = lockInfo.originalDuration * 0.3; // 30%阈值
    
    if (remainingTime < renewalThreshold) {
      return lockInfo.originalDuration; // 续期原始时长
    }
    
    return 0; // 不需要续期
  }
  
  shouldRenewLock(lockInfo: LockInfo): boolean {
    const remainingTime = lockInfo.expiresAt.getTime() - Date.now();
    const renewalThreshold = lockInfo.originalDuration * 0.3;
    
    return remainingTime < renewalThreshold && lockInfo.isActive;
  }
}
```

### 4.2 错误处理最佳实践

```typescript
// 统一错误处理
class DistributedSystemErrorHandler {
  async handleLockRenewalFailure(lockInfo: LockInfo, error: Error): Promise<void> {
    this.logger.error('锁续期失败', { lockInfo, error });
    
    // 尝试重新获取锁
    const reacquired = await this.reacquireLock(lockInfo);
    if (!reacquired) {
      // 标记工作流为异常状态
      await this.markWorkflowAsAbnormal(lockInfo.workflowInstanceId);
    }
  }
  
  async handleEngineFailure(engineId: string, error: Error): Promise<void> {
    this.logger.error('引擎故障', { engineId, error });
    
    // 执行故障转移
    await this.executeFailover(engineId);
    
    // 通知监控系统
    await this.notifyMonitoring('engine_failure', { engineId, error });
  }
}
```

### 4.3 生命周期管理最佳实践

```typescript
// 生命周期管理器
class WorkflowEngineLifecycleManager {
  private resources: Resource[] = [];
  
  async onReady(): Promise<void> {
    // 按依赖顺序初始化资源
    await this.initializeDatabase();
    await this.initializeLockManager();
    await this.initializeScheduler();
    await this.startHeartbeat();
  }
  
  async onClose(): Promise<void> {
    // 按相反顺序清理资源
    await this.stopHeartbeat();
    await this.shutdownScheduler();
    await this.releaseLocks();
    await this.closeDatabase();
  }
  
  private async gracefulShutdown(timeoutMs: number = 30000): Promise<void> {
    const shutdownPromise = this.performShutdown();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Shutdown timeout')), timeoutMs)
    );
    
    await Promise.race([shutdownPromise, timeoutPromise]);
  }
}
```

## 5. 风险评估和迁移计划

### 5.1 风险评估

| 风险类型 | 风险等级 | 影响范围 | 缓解措施 |
|---------|---------|---------|---------|
| 数据一致性 | 高 | 工作流执行 | 实现锁续期机制 |
| 架构违规 | 中 | 代码维护 | 重构分层架构 |
| 性能影响 | 中 | 系统响应 | 优化心跳机制 |
| 兼容性 | 低 | API接口 | 保持接口兼容 |

### 5.2 迁移计划

**阶段1：紧急修复（1-2周）**
1. 实现锁续期机制
2. 修复架构违规问题
3. 添加基本的生命周期管理

**阶段2：架构重构（3-4周）**
1. 重构心跳机制
2. 完善分布式实现
3. 优化错误处理

**阶段3：质量提升（2-3周）**
1. 完善测试覆盖
2. 性能优化
3. 文档更新

### 5.3 回滚策略

1. **功能开关**：使用配置开关控制新功能启用
2. **渐进式部署**：先在测试环境验证，再逐步推广
3. **监控告警**：建立完善的监控体系，及时发现问题
4. **快速回滚**：保持代码版本管理，支持快速回滚

## 6. 结论和建议

### 6.1 主要结论

1. **架构问题严重**：存在多个严重的架构违规和设计缺陷
2. **可靠性风险高**：锁机制缺陷可能导致数据一致性问题
3. **维护成本高**：代码结构混乱，增加维护难度
4. **框架集成不充分**：未充分利用Stratix框架能力

### 6.2 优先级建议

1. **立即修复**：锁续期机制缺失问题
2. **短期重构**：架构违规和生命周期管理问题
3. **中期优化**：心跳机制和分布式实现
4. **长期完善**：测试覆盖和性能优化

### 6.3 技术债务管理

建议建立技术债务管理机制：
1. 定期进行架构审查
2. 建立代码质量门禁
3. 持续重构和优化
4. 完善文档和测试

通过系统性的重构和改进，可以显著提升tasks插件的架构质量、系统可靠性和维护效率。

## 7. 详细代码实现示例

### 7.1 锁续期机制完整实现

```typescript
// packages/tasks/src/services/WorkflowLockManager.ts
export interface WorkflowLockInfo {
  lockKey: string;
  owner: string;
  workflowInstanceId: string;
  originalDuration: number;
  expiresAt: Date;
  isActive: boolean;
  renewalCount: number;
  maxRenewals: number;
}

export class WorkflowLockManager {
  private workflowLocks = new Map<string, WorkflowLockInfo>();
  private renewalTimer?: NodeJS.Timeout;

  constructor(
    private readonly lockService: DatabaseLockService,
    private readonly logger: Logger
  ) {}

  async registerWorkflowLock(
    workflowInstanceId: string,
    lockKey: string,
    owner: string,
    duration: number
  ): Promise<void> {
    const lockInfo: WorkflowLockInfo = {
      lockKey,
      owner,
      workflowInstanceId,
      originalDuration: duration,
      expiresAt: new Date(Date.now() + duration),
      isActive: true,
      renewalCount: 0,
      maxRenewals: 10 // 最多续期10次
    };

    this.workflowLocks.set(workflowInstanceId, lockInfo);
    this.logger.debug('注册工作流锁', { workflowInstanceId, lockKey });
  }

  async startRenewalProcess(): Promise<void> {
    this.renewalTimer = setInterval(async () => {
      await this.renewAllActiveLocks();
    }, 30000); // 每30秒检查一次
  }

  private async renewAllActiveLocks(): Promise<void> {
    for (const [instanceId, lockInfo] of this.workflowLocks) {
      if (this.shouldRenewLock(lockInfo)) {
        await this.renewLock(instanceId, lockInfo);
      }
    }
  }

  private shouldRenewLock(lockInfo: WorkflowLockInfo): boolean {
    if (!lockInfo.isActive || lockInfo.renewalCount >= lockInfo.maxRenewals) {
      return false;
    }

    const remainingTime = lockInfo.expiresAt.getTime() - Date.now();
    const renewalThreshold = lockInfo.originalDuration * 0.3; // 剩余30%时续期

    return remainingTime < renewalThreshold;
  }

  private async renewLock(instanceId: string, lockInfo: WorkflowLockInfo): Promise<void> {
    try {
      const renewed = await this.lockService.renewLock(
        lockInfo.lockKey,
        lockInfo.owner,
        lockInfo.originalDuration
      );

      if (renewed) {
        lockInfo.expiresAt = new Date(Date.now() + lockInfo.originalDuration);
        lockInfo.renewalCount++;

        this.logger.debug('锁续期成功', {
          instanceId,
          lockKey: lockInfo.lockKey,
          renewalCount: lockInfo.renewalCount
        });
      } else {
        this.logger.warn('锁续期失败', {
          instanceId,
          lockKey: lockInfo.lockKey
        });

        // 标记锁为非活跃状态
        lockInfo.isActive = false;
      }
    } catch (error) {
      this.logger.error('锁续期异常', {
        instanceId,
        lockKey: lockInfo.lockKey,
        error
      });

      lockInfo.isActive = false;
    }
  }

  async unregisterWorkflowLock(instanceId: string): Promise<void> {
    const lockInfo = this.workflowLocks.get(instanceId);
    if (lockInfo) {
      lockInfo.isActive = false;
      this.workflowLocks.delete(instanceId);

      // 释放锁
      await this.lockService.releaseLock(lockInfo.lockKey, lockInfo.owner);

      this.logger.debug('注销工作流锁', {
        instanceId,
        lockKey: lockInfo.lockKey
      });
    }
  }

  async stopRenewalProcess(): Promise<void> {
    if (this.renewalTimer) {
      clearInterval(this.renewalTimer);
      this.renewalTimer = undefined;
    }

    // 释放所有活跃锁
    for (const [instanceId, lockInfo] of this.workflowLocks) {
      if (lockInfo.isActive) {
        await this.lockService.releaseLock(lockInfo.lockKey, lockInfo.owner);
      }
    }

    this.workflowLocks.clear();
  }
}
```

### 7.2 分布式调度器Repository层实现

```typescript
// packages/tasks/src/repositories/DistributedSchedulerRepository.ts
export interface IDistributedSchedulerRepository {
  findWorkflowsByEngineId(engineId: string): Promise<DatabaseResult<WorkflowInstancesTable[]>>;
  findNodesByEngineId(engineId: string): Promise<DatabaseResult<string[]>>;
  transferWorkflowsToEngine(workflowIds: number[], targetEngineId: string): Promise<DatabaseResult<number>>;
  resetNodeStatus(nodeIds: string[]): Promise<DatabaseResult<number>>;
  registerEngineInstance(instance: WorkflowEngineInstance): Promise<DatabaseResult<boolean>>;
  updateEngineHeartbeat(instanceId: string, heartbeatData: any): Promise<DatabaseResult<boolean>>;
  findActiveEngines(): Promise<DatabaseResult<WorkflowEngineInstance[]>>;
  markEngineInactive(instanceId: string): Promise<DatabaseResult<boolean>>;
}

export default class DistributedSchedulerRepository
  extends BaseRepository<TasksDatabase, 'workflow_instances', any, any, any>
  implements IDistributedSchedulerRepository
{
  protected readonly tableName = 'workflow_instances' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  async findWorkflowsByEngineId(engineId: string): Promise<DatabaseResult<WorkflowInstancesTable[]>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom('workflow_instances')
          .selectAll()
          .where('assigned_engine_id', '=', engineId)
          .where('status', 'in', ['running', 'pending'])
          .execute();
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (error) {
      this.logger.error('查询引擎工作流失败', { engineId, error });
      return {
        success: false,
        error: new QueryError('查询引擎工作流失败', undefined, undefined, error as Error)
      };
    }
  }

  async findNodesByEngineId(engineId: string): Promise<DatabaseResult<string[]>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom('workflow_node_instances as wni')
          .innerJoin('workflow_instances as wi', 'wni.workflow_instance_id', 'wi.id')
          .select(['wni.node_id'])
          .where('wi.assigned_engine_id', '=', engineId)
          .where('wni.status', '=', 'running')
          .execute();
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const nodeIds = result.data.map(row => row.node_id);
      return { success: true, data: nodeIds };
    } catch (error) {
      this.logger.error('查询引擎节点失败', { engineId, error });
      return {
        success: false,
        error: new QueryError('查询引擎节点失败', undefined, undefined, error as Error)
      };
    }
  }

  async transferWorkflowsToEngine(
    workflowIds: number[],
    targetEngineId: string
  ): Promise<DatabaseResult<number>> {
    try {
      let transferredCount = 0;

      for (const workflowId of workflowIds) {
        const result = await this.databaseApi.executeQuery(async (db) => {
          return await db
            .updateTable('workflow_instances')
            .set({
              assigned_engine_id: targetEngineId,
              updated_at: new Date()
            })
            .where('id', '=', workflowId)
            .execute();
        });

        if (result.success && result.data[0]?.numUpdatedRows) {
          transferredCount += Number(result.data[0].numUpdatedRows);
        }
      }

      return { success: true, data: transferredCount };
    } catch (error) {
      this.logger.error('转移工作流失败', { workflowIds, targetEngineId, error });
      return {
        success: false,
        error: new QueryError('转移工作流失败', undefined, undefined, error as Error)
      };
    }
  }

  async resetNodeStatus(nodeIds: string[]): Promise<DatabaseResult<number>> {
    try {
      let resetCount = 0;

      for (const nodeId of nodeIds) {
        const result = await this.databaseApi.executeQuery(async (db) => {
          return await db
            .updateTable('workflow_node_instances')
            .set({
              status: 'pending',
              started_at: null,
              updated_at: new Date()
            })
            .where('node_id', '=', nodeId)
            .where('status', '=', 'running')
            .execute();
        });

        if (result.success && result.data[0]?.numUpdatedRows) {
          resetCount += Number(result.data[0].numUpdatedRows);
        }
      }

      return { success: true, data: resetCount };
    } catch (error) {
      this.logger.error('重置节点状态失败', { nodeIds, error });
      return {
        success: false,
        error: new QueryError('重置节点状态失败', undefined, undefined, error as Error)
      };
    }
  }

  async registerEngineInstance(instance: WorkflowEngineInstance): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .insertInto('workflow_engine_instances')
          .values({
            instance_id: instance.instanceId,
            hostname: instance.hostname,
            process_id: instance.processId,
            status: instance.status,
            load_info: JSON.stringify(instance.load),
            supported_executors: JSON.stringify(instance.supportedExecutors),
            started_at: instance.startedAt,
            last_heartbeat: instance.lastHeartbeat
          })
          .onDuplicateKeyUpdate({
            status: instance.status,
            last_heartbeat: instance.lastHeartbeat,
            load_info: JSON.stringify(instance.load),
            updated_at: new Date()
          })
          .execute();
      });

      return { success: result.success, data: result.success };
    } catch (error) {
      this.logger.error('注册引擎实例失败', { instanceId: instance.instanceId, error });
      return {
        success: false,
        error: new QueryError('注册引擎实例失败', undefined, undefined, error as Error)
      };
    }
  }

  async updateEngineHeartbeat(instanceId: string, heartbeatData: any): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .updateTable('workflow_engine_instances')
          .set({
            last_heartbeat: new Date(),
            load_info: JSON.stringify(heartbeatData),
            updated_at: new Date()
          })
          .where('instance_id', '=', instanceId)
          .execute();
      });

      const updated = result.success && result.data[0]?.numUpdatedRows > 0;
      return { success: result.success, data: updated };
    } catch (error) {
      this.logger.error('更新引擎心跳失败', { instanceId, error });
      return {
        success: false,
        error: new QueryError('更新引擎心跳失败', undefined, undefined, error as Error)
      };
    }
  }

  async findActiveEngines(): Promise<DatabaseResult<WorkflowEngineInstance[]>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom('workflow_engine_instances')
          .selectAll()
          .where('status', '=', 'active')
          .where('last_heartbeat', '>', new Date(Date.now() - 120000)) // 2分钟内有心跳
          .execute();
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const engines = result.data.map(row => ({
        instanceId: row.instance_id,
        hostname: row.hostname,
        processId: row.process_id,
        status: row.status as 'active' | 'inactive' | 'maintenance',
        load: JSON.parse(row.load_info),
        supportedExecutors: JSON.parse(row.supported_executors),
        startedAt: row.started_at,
        lastHeartbeat: row.last_heartbeat
      }));

      return { success: true, data: engines };
    } catch (error) {
      this.logger.error('查询活跃引擎失败', { error });
      return {
        success: false,
        error: new QueryError('查询活跃引擎失败', undefined, undefined, error as Error)
      };
    }
  }

  async markEngineInactive(instanceId: string): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .updateTable('workflow_engine_instances')
          .set({
            status: 'inactive',
            updated_at: new Date()
          })
          .where('instance_id', '=', instanceId)
          .execute();
      });

      const updated = result.success && result.data[0]?.numUpdatedRows > 0;
      return { success: result.success, data: updated };
    } catch (error) {
      this.logger.error('标记引擎非活跃失败', { instanceId, error });
      return {
        success: false,
        error: new QueryError('标记引擎非活跃失败', undefined, undefined, error as Error)
      };
    }
  }
}
```

### 7.3 生命周期管理完整实现

```typescript
// packages/tasks/src/services/WorkflowEngineService.ts - 重构后的生命周期管理
export default class WorkflowEngineService implements WorkflowEngine {
  private readonly executionContexts = new Map<string, ExecutionContext>();
  private readonly instanceId: string;
  private heartbeatTimer?: NodeJS.Timeout;
  private lockManager?: WorkflowLockManager;
  private isShuttingDown = false;
  private isReady = false;

  constructor(
    private logger: Logger,
    private workflowInstanceRepository: WorkflowInstanceRepository,
    private taskNodeRepository: WorkflowTaskNodeRepository,
    private workflowDefinitionRepository: WorkflowDefinitionRepository,
    private distributedLockManager?: IDistributedLockManager,
    private distributedScheduler?: IDistributedScheduler
  ) {
    this.instanceId = `engine_${process.pid}_${Date.now()}`;
    // 移除构造函数中的心跳启动逻辑
  }

  /**
   * Stratix框架生命周期钩子：服务就绪
   */
  async onReady(): Promise<void> {
    this.logger.info('工作流引擎开始初始化', { instanceId: this.instanceId });

    try {
      // 1. 初始化锁管理器
      if (this.distributedLockManager) {
        this.lockManager = new WorkflowLockManager(
          new DatabaseLockService(/* 依赖注入 */),
          this.logger
        );
        await this.lockManager.startRenewalProcess();
      }

      // 2. 注册到分布式调度器
      if (this.distributedScheduler) {
        await this.registerEngineInstance();
        this.startHeartbeat();
      }

      // 3. 启动恢复服务
      await this.startRecoveryService();

      this.isReady = true;
      this.logger.info('工作流引擎初始化完成', { instanceId: this.instanceId });
    } catch (error) {
      this.logger.error('工作流引擎初始化失败', { instanceId: this.instanceId, error });
      throw error;
    }
  }

  /**
   * Stratix框架生命周期钩子：准备关闭
   */
  async preClose(): Promise<void> {
    this.logger.info('工作流引擎开始准备关闭', { instanceId: this.instanceId });

    // 停止接收新的工作流
    this.isShuttingDown = true;

    // 等待当前执行的工作流达到安全点
    await this.waitForSafeShutdownPoint();
  }

  /**
   * Stratix框架生命周期钩子：服务关闭
   */
  async onClose(): Promise<void> {
    this.logger.info('工作流引擎开始关闭', { instanceId: this.instanceId });

    try {
      // 1. 停止心跳
      this.stopHeartbeat();

      // 2. 停止锁续期
      if (this.lockManager) {
        await this.lockManager.stopRenewalProcess();
      }

      // 3. 注销引擎实例
      if (this.distributedScheduler) {
        await this.distributedScheduler.unregisterEngine(this.instanceId);
      }

      // 4. 等待活跃工作流完成或超时
      await this.waitForActiveWorkflowsToComplete(30000); // 30秒超时

      // 5. 清理执行上下文
      this.executionContexts.clear();

      this.isReady = false;
      this.logger.info('工作流引擎关闭完成', { instanceId: this.instanceId });
    } catch (error) {
      this.logger.error('工作流引擎关闭失败', { instanceId: this.instanceId, error });
      throw error;
    }
  }

  /**
   * 启动心跳发送
   */
  private startHeartbeat(): void {
    if (!this.distributedScheduler) return;

    this.heartbeatTimer = setInterval(async () => {
      if (this.isShuttingDown || !this.distributedScheduler) return;

      try {
        const currentLoad = this.getCurrentLoad();
        await this.distributedScheduler.updateHeartbeat(this.instanceId, currentLoad);

        this.logger.debug('心跳发送成功', {
          instanceId: this.instanceId,
          load: currentLoad
        });
      } catch (error) {
        this.logger.error('心跳发送失败', {
          instanceId: this.instanceId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 30000); // 30秒心跳间隔

    this.logger.info('心跳服务启动', {
      instanceId: this.instanceId,
      interval: 30000
    });
  }

  /**
   * 停止心跳发送
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
      this.logger.info('心跳服务停止', { instanceId: this.instanceId });
    }
  }

  /**
   * 等待安全关闭点
   */
  private async waitForSafeShutdownPoint(): Promise<void> {
    // 等待所有工作流到达安全点（如节点完成、暂停等）
    const maxWaitTime = 60000; // 最多等待1分钟
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const hasUnsafeWorkflows = Array.from(this.executionContexts.values())
        .some(context => !this.isWorkflowAtSafePoint(context));

      if (!hasUnsafeWorkflows) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    }
  }

  /**
   * 检查工作流是否处于安全点
   */
  private isWorkflowAtSafePoint(context: ExecutionContext): boolean {
    // 工作流处于以下状态时认为是安全的：
    // - 已完成
    // - 已暂停
    // - 已失败
    // - 正在等待外部输入
    const safeStatuses = ['completed', 'paused', 'failed'];
    return safeStatuses.includes(context.instance.status);
  }

  /**
   * 等待活跃工作流完成
   */
  private async waitForActiveWorkflowsToComplete(timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (this.executionContexts.size === 0) {
        break;
      }

      // 检查是否有工作流仍在执行
      const activeWorkflows = Array.from(this.executionContexts.values())
        .filter(context => context.instance.status === 'running');

      if (activeWorkflows.length === 0) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 如果超时，强制停止剩余工作流
    if (this.executionContexts.size > 0) {
      this.logger.warn('强制停止剩余工作流', {
        remainingCount: this.executionContexts.size
      });

      for (const context of this.executionContexts.values()) {
        try {
          await this.updateWorkflowInstanceStatus(context.instance.id, 'cancelled');
        } catch (error) {
          this.logger.error('强制停止工作流失败', {
            instanceId: context.instance.id,
            error
          });
        }
      }
    }
  }

  /**
   * 启动工作流（重写以支持锁管理）
   */
  async startWorkflow(
    workflowDefinition: WorkflowDefinition,
    inputs: Record<string, any>,
    options?: {
      externalId?: string;
      priority?: number;
      scheduledAt?: Date;
      mutexKey?: string;
    }
  ): Promise<WorkflowInstance | null> {
    if (!this.isReady || this.isShuttingDown) {
      this.logger.warn('引擎未就绪或正在关闭，拒绝启动工作流', {
        isReady: this.isReady,
        isShuttingDown: this.isShuttingDown
      });
      return null;
    }

    // 原有的工作流启动逻辑...
    const instance = await this.createWorkflowInstance(workflowDefinition, inputs, options);

    // 如果有互斥键，注册锁
    if (options?.mutexKey && this.lockManager) {
      const lockKey = `mutex:${options.mutexKey}`;
      const owner = `engine:${this.instanceId}:${instance.id}`;

      await this.lockManager.registerWorkflowLock(
        instance.id.toString(),
        lockKey,
        owner,
        300000 // 5分钟初始锁定时间
      );
    }

    return instance;
  }

  // 其他现有方法保持不变...
}
```

### 7.4 统一心跳事件总线实现

```typescript
// packages/tasks/src/services/HeartbeatEventBus.ts
export interface HeartbeatData {
  timestamp: Date;
  engineId: string;
  load: {
    activeWorkflows: number;
    cpuUsage: number;
    memoryUsage: number;
  };
  metadata?: Record<string, any>;
}

export interface HeartbeatEventHandler {
  (data: HeartbeatData): Promise<void>;
}

export interface IHeartbeatEventBus {
  on(event: 'heartbeat', handler: HeartbeatEventHandler): void;
  off(event: 'heartbeat', handler: HeartbeatEventHandler): void;
  emit(event: 'heartbeat', data: HeartbeatData): Promise<void>;
  dispose(): void;
}

export class HeartbeatEventBus implements IHeartbeatEventBus {
  private handlers = new Set<HeartbeatEventHandler>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  on(event: 'heartbeat', handler: HeartbeatEventHandler): void {
    this.handlers.add(handler);
    this.logger.debug('注册心跳事件处理器', { handlerCount: this.handlers.size });
  }

  off(event: 'heartbeat', handler: HeartbeatEventHandler): void {
    this.handlers.delete(handler);
    this.logger.debug('注销心跳事件处理器', { handlerCount: this.handlers.size });
  }

  async emit(event: 'heartbeat', data: HeartbeatData): Promise<void> {
    const promises = Array.from(this.handlers).map(async (handler) => {
      try {
        await handler(data);
      } catch (error) {
        this.logger.error('心跳事件处理器执行失败', { error });
      }
    });

    await Promise.allSettled(promises);
  }

  dispose(): void {
    this.handlers.clear();
    this.logger.debug('心跳事件总线已清理');
  }
}
```

### 7.5 重构后的DistributedScheduler实现

```typescript
// packages/tasks/src/services/DistributedScheduler.ts - 重构版本
export default class DistributedScheduler implements IDistributedScheduler {
  private readonly engines = new Map<string, WorkflowEngineInstance>();
  private heartbeatTimer?: NodeJS.Timeout;
  private heartbeatBus: IHeartbeatEventBus;

  constructor(
    private readonly schedulerRepository: IDistributedSchedulerRepository,
    private readonly lockManager: IDistributedLockManager,
    private readonly logger: Logger,
    private readonly config: DistributedSchedulingConfig,
    private readonly currentInstanceId: string,
    heartbeatBus: IHeartbeatEventBus
  ) {
    this.heartbeatBus = heartbeatBus;
    // 移除构造函数中的心跳启动
  }

  /**
   * Stratix框架生命周期钩子：服务就绪
   */
  async onReady(): Promise<void> {
    this.logger.info('分布式调度器开始初始化');

    try {
      // 1. 从数据库加载现有引擎
      await this.loadEnginesFromDatabase();

      // 2. 启动心跳监控
      this.startHeartbeatMonitoring();

      this.logger.info('分布式调度器初始化完成');
    } catch (error) {
      this.logger.error('分布式调度器初始化失败', { error });
      throw error;
    }
  }

  /**
   * Stratix框架生命周期钩子：服务关闭
   */
  async onClose(): Promise<void> {
    this.logger.info('分布式调度器开始关闭');

    try {
      // 1. 停止心跳监控
      this.stopHeartbeatMonitoring();

      // 2. 标记当前引擎为非活跃
      await this.schedulerRepository.markEngineInactive(this.currentInstanceId);

      // 3. 清理内存状态
      this.engines.clear();

      this.logger.info('分布式调度器关闭完成');
    } catch (error) {
      this.logger.error('分布式调度器关闭失败', { error });
      throw error;
    }
  }

  /**
   * 注册引擎实例（使用Repository层）
   */
  async registerEngine(instance: WorkflowEngineInstance): Promise<void> {
    try {
      // 1. 内存注册
      this.engines.set(instance.instanceId, instance);

      // 2. 数据库持久化
      const result = await this.schedulerRepository.registerEngineInstance(instance);

      if (!result.success) {
        // 回滚内存注册
        this.engines.delete(instance.instanceId);
        throw new Error(`引擎注册失败: ${result.error}`);
      }

      this.logger.info('引擎实例注册成功', {
        instanceId: instance.instanceId,
        hostname: instance.hostname,
        supportedExecutors: instance.supportedExecutors
      });
    } catch (error) {
      this.logger.error('引擎实例注册失败', {
        instanceId: instance.instanceId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 更新引擎心跳（使用Repository层）
   */
  async updateHeartbeat(
    instanceId: string,
    load: WorkflowEngineInstance['load']
  ): Promise<void> {
    try {
      // 1. 更新内存状态
      const engine = this.engines.get(instanceId);
      if (engine) {
        engine.lastHeartbeat = new Date();
        engine.load = load;
        engine.status = 'active';
      }

      // 2. 更新数据库
      await this.schedulerRepository.updateEngineHeartbeat(instanceId, load);

      // 3. 发送心跳事件
      await this.heartbeatBus.emit('heartbeat', {
        timestamp: new Date(),
        engineId: instanceId,
        load,
        metadata: { source: 'distributed-scheduler' }
      });
    } catch (error) {
      this.logger.error('更新引擎心跳失败', { instanceId, error });
      throw error;
    }
  }

  /**
   * 从数据库加载引擎
   */
  private async loadEnginesFromDatabase(): Promise<void> {
    try {
      const result = await this.schedulerRepository.findActiveEngines();

      if (result.success) {
        for (const engine of result.data) {
          this.engines.set(engine.instanceId, engine);
        }

        this.logger.info('从数据库加载引擎完成', {
          engineCount: result.data.length
        });
      } else {
        this.logger.warn('从数据库加载引擎失败', { error: result.error });
      }
    } catch (error) {
      this.logger.error('从数据库加载引擎异常', { error });
    }
  }

  /**
   * 启动心跳监控
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.detectFailuresAndFailover();
        await this.lockManager.cleanupExpiredLocks();
      } catch (error) {
        this.logger.error('心跳监控异常', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.config.heartbeatInterval);

    this.logger.info('心跳监控启动', {
      interval: this.config.heartbeatInterval
    });
  }

  /**
   * 停止心跳监控
   */
  public stopHeartbeatMonitoring(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
      this.logger.info('心跳监控停止');
    }
  }

  /**
   * 处理引擎故障（使用Repository层）
   */
  private async handleEngineFailure(
    failedInstanceId: string
  ): Promise<FailoverEvent | null> {
    try {
      const failedEngine = this.engines.get(failedInstanceId);
      if (!failedEngine) {
        return null;
      }

      this.logger.warn('开始处理引擎故障', { failedInstanceId });

      // 1. 查找受影响的工作流和节点（使用Repository）
      const [affectedWorkflows, affectedNodes] = await Promise.all([
        this.schedulerRepository.findWorkflowsByEngineId(failedInstanceId),
        this.schedulerRepository.findNodesByEngineId(failedInstanceId)
      ]);

      const workflowIds = affectedWorkflows.success ?
        affectedWorkflows.data.map(w => w.id) : [];
      const nodeIds = affectedNodes.success ? affectedNodes.data : [];

      // 2. 选择接管的引擎实例
      const takeoverEngine = await this.selectBestEngine();
      if (!takeoverEngine) {
        this.logger.error('没有可用的引擎实例进行故障转移', {
          failedInstanceId,
          affectedWorkflows: workflowIds.length
        });
        return null;
      }

      // 3. 执行实际的故障转移（使用Repository）
      const [workflowTransferResult, nodeResetResult] = await Promise.all([
        this.schedulerRepository.transferWorkflowsToEngine(workflowIds, takeoverEngine.instanceId),
        this.schedulerRepository.resetNodeStatus(nodeIds)
      ]);

      // 4. 标记故障引擎为非活跃状态
      failedEngine.status = 'inactive';
      await this.schedulerRepository.markEngineInactive(failedInstanceId);

      // 5. 创建故障转移事件
      const failoverEvent: FailoverEvent = {
        eventId: `failover_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        failedEngineId: failedInstanceId,
        takeoverEngineId: takeoverEngine.instanceId,
        affectedWorkflows: workflowIds,
        affectedNodes: nodeIds,
        failoverAt: new Date(),
        failoverReason: 'Engine heartbeat timeout'
      };

      this.logger.info('故障转移执行完成', {
        ...failoverEvent,
        transferredWorkflows: workflowTransferResult.success ? workflowTransferResult.data : 0,
        resetNodes: nodeResetResult.success ? nodeResetResult.data : 0
      });

      return failoverEvent;
    } catch (error) {
      this.logger.error('故障转移处理异常', {
        failedInstanceId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  // 其他方法保持不变，但移除直接的数据库操作...
}
```

## 8. 测试策略和质量保证

### 8.1 单元测试策略

```typescript
// packages/tasks/src/services/__tests__/WorkflowLockManager.test.ts
describe('WorkflowLockManager', () => {
  let lockManager: WorkflowLockManager;
  let mockLockService: jest.Mocked<DatabaseLockService>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLockService = createMockLockService();
    mockLogger = createMockLogger();
    lockManager = new WorkflowLockManager(mockLockService, mockLogger);
  });

  describe('锁续期机制', () => {
    it('应该在锁剩余时间少于30%时触发续期', async () => {
      // 安排
      const workflowInstanceId = 'workflow-123';
      const lockKey = 'mutex:test-key';
      const owner = 'test-owner';
      const duration = 300000; // 5分钟

      await lockManager.registerWorkflowLock(workflowInstanceId, lockKey, owner, duration);

      // 模拟时间流逝到续期阈值
      jest.advanceTimersByTime(duration * 0.8); // 80%时间过去

      mockLockService.renewLock.mockResolvedValue(true);

      // 执行
      await lockManager.startRenewalProcess();
      jest.advanceTimersByTime(30000); // 触发续期检查

      // 断言
      expect(mockLockService.renewLock).toHaveBeenCalledWith(lockKey, owner, duration);
    });

    it('应该在续期失败时标记锁为非活跃', async () => {
      // 测试续期失败场景
    });

    it('应该限制最大续期次数', async () => {
      // 测试最大续期次数限制
    });
  });
});
```

### 8.2 集成测试策略

```typescript
// packages/tasks/src/__tests__/integration/distributed-architecture.test.ts
describe('分布式架构集成测试', () => {
  let testContainer: AwilixContainer;
  let distributedScheduler: DistributedScheduler;
  let workflowEngine: WorkflowEngineService;

  beforeEach(async () => {
    testContainer = await setupTestContainer();
    distributedScheduler = testContainer.resolve('distributedScheduler');
    workflowEngine = testContainer.resolve('workflowEngine');
  });

  describe('引擎注册和发现', () => {
    it('应该正确注册引擎到数据库和内存', async () => {
      // 测试引擎注册的完整流程
    });

    it('应该在引擎重启后从数据库恢复状态', async () => {
      // 测试状态恢复机制
    });
  });

  describe('故障转移机制', () => {
    it('应该在引擎故障时正确转移工作流', async () => {
      // 测试故障转移的完整流程
    });

    it('应该正确处理并发故障转移请求', async () => {
      // 测试并发场景
    });
  });
});
```

### 8.3 性能测试策略

```typescript
// packages/tasks/src/__tests__/performance/lock-renewal.test.ts
describe('锁续期性能测试', () => {
  it('应该在高并发场景下保持良好性能', async () => {
    const lockManager = new WorkflowLockManager(/* ... */);
    const concurrentLocks = 1000;

    // 注册大量锁
    const promises = Array.from({ length: concurrentLocks }, (_, i) =>
      lockManager.registerWorkflowLock(`workflow-${i}`, `lock-${i}`, `owner-${i}`, 300000)
    );

    await Promise.all(promises);

    // 测量续期性能
    const startTime = Date.now();
    await lockManager.renewAllActiveLocks();
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(5000); // 5秒内完成
  });
});
```

## 9. 监控和可观测性

### 9.1 指标收集

```typescript
// packages/tasks/src/monitoring/MetricsCollector.ts
export class WorkflowMetricsCollector {
  private metrics = new Map<string, number>();

  recordLockRenewal(success: boolean, duration: number): void {
    this.incrementCounter('lock_renewals_total', { success: success.toString() });
    this.recordHistogram('lock_renewal_duration_ms', duration);
  }

  recordEngineFailover(engineId: string, affectedWorkflows: number): void {
    this.incrementCounter('engine_failovers_total', { engineId });
    this.recordGauge('affected_workflows_count', affectedWorkflows);
  }

  recordHeartbeat(engineId: string, latency: number): void {
    this.recordHistogram('heartbeat_latency_ms', latency, { engineId });
    this.setGauge('last_heartbeat_timestamp', Date.now(), { engineId });
  }
}
```

### 9.2 告警规则

```yaml
# monitoring/alerts.yml
groups:
  - name: workflow-engine
    rules:
      - alert: LockRenewalFailureRate
        expr: rate(lock_renewals_total{success="false"}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "锁续期失败率过高"

      - alert: EngineHeartbeatMissing
        expr: time() - last_heartbeat_timestamp > 120
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "引擎心跳丢失"
```

## 10. 部署和运维指南

### 10.1 部署检查清单

- [ ] 数据库迁移已执行
- [ ] 配置文件已更新
- [ ] 监控指标已配置
- [ ] 告警规则已设置
- [ ] 日志级别已调整
- [ ] 性能基准已建立

### 10.2 运维手册

```bash
# 检查引擎状态
curl -X GET /api/workflows/engines/status

# 查看锁统计
curl -X GET /api/workflows/locks/statistics

# 手动触发故障转移
curl -X POST /api/workflows/engines/{engineId}/failover

# 查看心跳状态
curl -X GET /api/workflows/engines/heartbeat
```

通过这个全面的重构方案，可以系统性地解决tasks插件中的架构问题，提升系统的可靠性、可维护性和性能。

## 11. 关键发现总结

### 11.1 架构分析关键发现

经过全面的代码审查，发现了以下关键问题：

1. **锁续期机制完全缺失** - 这是最严重的问题，可能导致数据一致性风险
2. **架构层次违规严重** - DistributedScheduler直接使用DatabaseAPI，违反分层原则
3. **生命周期管理不一致** - 只有AutoRecoveryService正确实现了框架生命周期钩子
4. **心跳机制设计混乱** - 多个组件都有独立的心跳机制，缺乏统一协调
5. **分布式实现不完整** - 引擎注册缺少持久化，重启后状态丢失

### 11.2 正面发现

值得肯定的是，项目在以下方面表现良好：

1. **AutoRecoveryService设计优秀** - 正确实现了Stratix框架生命周期钩子
2. **Repository层设计规范** - 大部分Repository都遵循了良好的分层架构
3. **错误处理相对完善** - 大多数方法都有适当的错误处理和日志记录
4. **类型定义完整** - TypeScript类型定义相对完善

### 11.3 重构优先级建议

**立即修复（1-2周）**：
1. 实现锁续期机制，防止数据一致性问题
2. 修复DistributedScheduler的架构违规问题
3. 为核心服务添加生命周期钩子

**短期重构（3-4周）**：
1. 统一心跳机制设计
2. 完善分布式实现的持久化
3. 优化错误处理和监控

**长期优化（2-3个月）**：
1. 完善测试覆盖率
2. 性能优化和监控完善
3. 文档和最佳实践指南

### 11.4 技术债务评估

| 债务类型 | 严重程度 | 修复成本 | 业务影响 | 建议处理时间 |
|---------|---------|---------|---------|-------------|
| 锁续期缺失 | 高 | 中 | 高 | 立即 |
| 架构违规 | 高 | 高 | 中 | 1-2周 |
| 生命周期管理 | 中 | 低 | 中 | 2-3周 |
| 心跳机制重复 | 中 | 中 | 低 | 1个月 |
| 分布式不完整 | 中 | 中 | 中 | 1个月 |

### 11.5 风险缓解建议

**短期风险缓解**：
1. 增加锁过期时间，降低过期风险
2. 添加更多的监控和告警
3. 建立手动故障恢复流程

**长期风险缓解**：
1. 实施完整的重构方案
2. 建立自动化测试体系
3. 完善运维监控体系

### 11.6 成功指标

重构成功的关键指标：

**技术指标**：
- 锁续期成功率 > 99.9%
- 架构违规数量 = 0
- 代码覆盖率 > 80%
- 平均故障恢复时间 < 30秒

**业务指标**：
- 工作流重复执行事件 = 0
- 系统可用性 > 99.95%
- 故障转移成功率 > 99%
- 平均响应时间改善 > 20%

**运维指标**：
- 部署成功率 > 99%
- 回滚次数 < 5%
- 监控覆盖率 = 100%
- 告警准确率 > 95%

通过系统性的重构和持续的改进，tasks插件将成为一个高质量、高可靠性的企业级工作流管理系统。
```
```
