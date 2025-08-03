# @stratix/icasync 重构实施计划

## 概述

本文档详细描述了 @stratix/icasync 插件的重构实施计划，包括具体的任务分解、实施步骤、代码示例和验收标准。

## 任务分解

### P0 任务：核心功能完成

#### 1. 创建 Controller 层（2-3 天）

**目标**：实现完整的 HTTP REST API 接口

**任务清单**：
- [ ] `SyncController.ts` - 同步操作接口
- [ ] `CalendarController.ts` - 日历管理接口
- [ ] `TaskController.ts` - 任务管理接口
- [ ] API Schema 定义和验证
- [ ] 错误处理中间件

**实施步骤**：

1. **创建 SyncController.ts**
```typescript
@Controller()
export default class SyncController {
  constructor(
    private syncWorkflowService: ISyncWorkflowService,
    private logger: Logger
  ) {}

  @Post('/sync/full', {
    schema: {
      body: {
        type: 'object',
        properties: {
          xnxq: { type: 'string', pattern: '^\\d{4}-\\d{4}-[12]$' },
          batchSize: { type: 'number', minimum: 1, maximum: 1000 },
          timeout: { type: 'number', minimum: 1000 }
        },
        required: ['xnxq']
      }
    }
  })
  async executeFullSync(request: FastifyRequest<{ Body: FullSyncRequest }>) {
    // 实现全量同步接口
  }
}
```

2. **创建 CalendarController.ts**
```typescript
@Controller()
export default class CalendarController {
  @Get('/calendars/:xnxq')
  async getCalendarsByXnxq() { /* 实现 */ }
  
  @Post('/calendars')
  async createCalendar() { /* 实现 */ }
  
  @Delete('/calendars/:calendarId')
  async deleteCalendar() { /* 实现 */ }
}
```

3. **创建 TaskController.ts**
```typescript
@Controller()
export default class TaskController {
  @Get('/tasks')
  async getTasks() { /* 实现 */ }
  
  @Get('/tasks/:id')
  async getTaskById() { /* 实现 */ }
  
  @Post('/tasks/:id/cancel')
  async cancelTask() { /* 实现 */ }
}
```

**验收标准**：
- [ ] 所有 API 端点返回正确的 HTTP 状态码
- [ ] 请求参数验证正常工作
- [ ] 错误响应格式统一
- [ ] API 文档自动生成

#### 2. 完善 Service 层未实现方法（1-2 天）

**目标**：完成 SyncWorkflowService 中的所有方法实现

**任务清单**：
- [ ] `executeCalendarCreationWorkflow` 方法
- [ ] `executeCalendarDeletionWorkflow` 方法
- [ ] `getWorkflowStatus` 方法
- [ ] `cancelWorkflow` 方法
- [ ] 工作流监控优化

**实施步骤**：

1. **实现 executeCalendarCreationWorkflow**
```typescript
async executeCalendarCreationWorkflow(
  kkhList: string[],
  xnxq: string,
  config?: Partial<SyncWorkflowConfig>
): Promise<WorkflowExecutionResult> {
  const workflowDefinition: WorkflowDefinition = {
    name: `日历创建-${xnxq}-${Date.now()}`,
    tasks: [
      {
        name: 'calendar-creation-batch',
        type: 'calendar_creation',
        config: { kkhList, xnxq, ...config }
      }
    ]
  };
  
  return await this.executeWorkflow(workflowDefinition);
}
```

2. **实现工作流状态查询**
```typescript
async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
  const statusResult = await this.tasksWorkflow.getWorkflowStatus(workflowId);
  if (!statusResult.success) {
    throw new Error(`获取工作流状态失败: ${statusResult.error}`);
  }
  return statusResult.data;
}
```

**验收标准**：
- [ ] 所有方法正常执行，不抛出 "Not implemented" 错误
- [ ] 工作流创建和执行成功
- [ ] 状态查询返回正确信息
- [ ] 取消功能正常工作

#### 3. 修复依赖配置（0.5 天）

**目标**：修复 package.json 配置问题

**任务清单**：
- [ ] 添加缺失的 devDependencies
- [ ] 验证类型定义路径
- [ ] 更新构建脚本

**实施步骤**：

1. **更新 package.json**
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "tsx": "^4.0.0",
    "rimraf": "^5.0.0",
    "@types/node": "^20.0.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "clean": "rimraf dist",
    "build": "pnpm run clean && tsc",
    "dev": "tsx --watch src/index.ts",
    "type-check": "tsc --noEmit"
  }
}
```

2. **验证构建输出**
```bash
pnpm run build
# 检查 dist/ 目录结构
# 验证类型定义文件位置
```

**验收标准**：
- [ ] 所有依赖正确安装
- [ ] 构建成功无错误
- [ ] 类型定义路径正确
- [ ] 测试命令正常工作

### P1 任务：重要功能

#### 4. 增加 Adapter 层（1-2 天）

**目标**：实现增量同步和日历管理适配器

**任务清单**：
- [ ] `IncrementalSyncAdapter.ts`
- [ ] `CalendarManagementAdapter.ts`
- [ ] 统一适配器接口

#### 5. 完善测试覆盖（2-3 天）

**目标**：测试覆盖率达到 80%+

**任务清单**：
- [ ] Repository 层单元测试
- [ ] Service 层单元测试
- [ ] Controller 层集成测试
- [ ] 端到端测试

#### 6. 增加监控和健康检查（1 天）

**目标**：完善运维支持功能

**任务清单**：
- [ ] 健康检查端点
- [ ] 性能指标收集
- [ ] 错误监控

### P2 任务：优化改进

#### 7. 性能优化（1-2 天）
#### 8. 文档完善（1-2 天）
#### 9. 配置管理优化（0.5-1 天）

## 实施时间表

### 第一周（P0 任务）
- **Day 1-3**: Controller 层实现
- **Day 4-5**: Service 层完善
- **Day 5**: 依赖配置修复

### 第二周（P1 任务）
- **Day 1-2**: Adapter 层实现
- **Day 3-5**: 测试覆盖完善
- **Day 5**: 监控和健康检查

### 第三周（P2 任务）
- **Day 1-2**: 性能优化
- **Day 3-4**: 文档完善
- **Day 5**: 最终测试和发布

## 质量保证

### 代码审查检查点
- [ ] 符合 Stratix 框架规范
- [ ] 类型定义完整
- [ ] 错误处理完善
- [ ] 日志记录规范
- [ ] 测试覆盖充分

### 功能测试检查点
- [ ] API 接口正常工作
- [ ] 工作流执行成功
- [ ] 错误场景处理正确
- [ ] 性能指标达标

## 风险缓解

### 技术风险
- **@stratix/tasks 集成问题**：提前进行兼容性测试
- **WPS API 依赖**：实现 Mock 适配器用于测试

### 进度风险
- **任务复杂度评估不准**：每日进度跟踪，及时调整
- **依赖阻塞**：并行开发，减少关键路径

## 成功标准

### 功能完整性
- [ ] 所有 HTTP API 正常工作
- [ ] 工作流管理功能完整
- [ ] 错误处理机制完善

### 代码质量
- [ ] 测试覆盖率 ≥ 80%
- [ ] TypeScript 类型检查通过
- [ ] 代码规范检查通过

### 运维支持
- [ ] 监控和健康检查完善
- [ ] 文档完整易懂
- [ ] 配置管理灵活

---

**计划制定时间**: 2025-08-03  
**预计完成时间**: 2025-08-24  
**负责人**: 开发团队  
**审核人**: 架构师
