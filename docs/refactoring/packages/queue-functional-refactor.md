# Queue包函数式重构详细方案

## 📋 重构概述

### 当前问题分析
1. **QueueManager类状态复杂**：多个可变状态属性，状态转换逻辑分散
2. **JobExecutionService职责过多**：既管理执行状态，又处理任务调度
3. **事件驱动逻辑混乱**：事件监听和处理逻辑耦合在类方法中
4. **并发控制复杂**：串行/并行模式切换逻辑复杂
5. **测试困难**：状态管理和副作用混合，难以单元测试

### 重构目标
- 将状态管理与业务逻辑分离
- 实现纯函数式的任务处理流水线
- 简化并发控制逻辑
- 提高代码可测试性和可预测性

## 🎯 重构策略

### 1. 状态管理函数式化

#### 当前状态管理问题
```typescript
// 问题：可变状态，难以追踪和测试
class QueueManager extends EventEmitter {
  private state: QueueManagerState = {
    isInitialized: false,
    isRunning: false,
    isPaused: false,
    startedAt: null,
    pausedAt: null,
    lastActivityAt: null
  };
  
  start() {
    this.state.isRunning = true;  // 直接修改状态
    this.state.startedAt = new Date();
  }
}
```

#### 重构后不可变状态管理
```typescript
// 解决方案：不可变状态 + 纯函数状态转换
interface QueueState {
  readonly isInitialized: boolean;
  readonly isRunning: boolean;
  readonly isPaused: boolean;
  readonly startedAt: Date | null;
  readonly pausedAt: Date | null;
  readonly lastActivityAt: Date | null;
  readonly jobs: readonly QueueJob[];
  readonly activeJobs: ReadonlyMap<string, QueueJob>;
}

const createInitialQueueState = (): QueueState => ({
  isInitialized: false,
  isRunning: false,
  isPaused: false,
  startedAt: null,
  pausedAt: null,
  lastActivityAt: null,
  jobs: [],
  activeJobs: new Map()
});

// 纯函数状态转换
const startQueue = (state: QueueState): QueueState => ({
  ...state,
  isRunning: true,
  isPaused: false,
  startedAt: new Date(),
  lastActivityAt: new Date()
});

const pauseQueue = (state: QueueState): QueueState => ({
  ...state,
  isPaused: true,
  pausedAt: new Date()
});

const addJob = (job: QueueJob) => (state: QueueState): QueueState => ({
  ...state,
  jobs: [...state.jobs, job],
  lastActivityAt: new Date()
});

const removeJob = (jobId: string) => (state: QueueState): QueueState => ({
  ...state,
  jobs: state.jobs.filter(job => job.id !== jobId),
  lastActivityAt: new Date()
});
```

### 2. 任务处理流水线函数化

#### 当前任务处理问题
```typescript
// 问题：复杂的类方法，难以组合和测试
class JobExecutionService {
  async executeJob(job: QueueJob): Promise<void> {
    // 复杂的执行逻辑，包含状态管理、错误处理、日志记录等
    this.state.activeJobs.set(job.id, job);
    try {
      // 执行逻辑...
    } catch (error) {
      // 错误处理...
    } finally {
      this.state.activeJobs.delete(job.id);
    }
  }
}
```

#### 重构后函数式流水线
```typescript
// 解决方案：函数组合 + 管道模式
import { pipe } from '@stratix/utils/functional';

// 基础任务处理函数
const validateJob = (job: QueueJob): Either<Error, QueueJob> => {
  if (!job.id) return left(new Error('Job ID is required'));
  if (!job.type) return left(new Error('Job type is required'));
  return right(job);
};

const prepareJobExecution = (job: QueueJob): JobExecutionContext => ({
  job,
  startTime: new Date(),
  attempts: 0,
  metadata: {}
});

const executeJobLogic = async (context: JobExecutionContext): Promise<JobResult> => {
  const { job } = context;
  
  try {
    // 根据任务类型执行相应逻辑
    const executor = getJobExecutor(job.type);
    const result = await executor(job.data);
    
    return {
      success: true,
      result,
      executionTime: Date.now() - context.startTime.getTime()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - context.startTime.getTime()
    };
  }
};

const logJobResult = (logger: Logger) => (result: JobResult): JobResult => {
  if (result.success) {
    logger.info(`Job completed successfully in ${result.executionTime}ms`);
  } else {
    logger.error(`Job failed: ${result.error}`);
  }
  return result;
};

// 任务处理管道
const createJobProcessor = (logger: Logger) => (job: QueueJob): Promise<JobResult> =>
  pipe(
    job,
    validateJob,
    map(prepareJobExecution),
    chain(executeJobLogic),
    map(logJobResult(logger))
  );
```

### 3. 队列管理器重构

#### 重构后的函数式队列管理器
```typescript
// queue-manager.ts
export interface QueueManager {
  getState: () => QueueState;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  addJob: (job: QueueJob) => Promise<void>;
  getNextJob: () => QueueJob | null;
  processJobs: () => Promise<void>;
}

export const createQueueManager = (
  jobRepository: QueueJobRepository,
  logger: Logger,
  options: QueueOptions = {}
): QueueManager => {
  let currentState = createInitialQueueState();
  const jobProcessor = createJobProcessor(logger);
  
  // 状态更新辅助函数
  const updateState = (updater: (state: QueueState) => QueueState): void => {
    currentState = updater(currentState);
  };
  
  return {
    getState: () => currentState,
    
    start: async () => {
      if (currentState.isRunning) return;
      
      updateState(startQueue);
      logger.info('Queue manager started');
      
      // 启动任务处理循环
      processJobsLoop();
    },
    
    stop: async () => {
      if (!currentState.isRunning) return;
      
      updateState(state => ({ ...state, isRunning: false }));
      logger.info('Queue manager stopped');
    },
    
    pause: async () => {
      if (!currentState.isRunning || currentState.isPaused) return;
      
      updateState(pauseQueue);
      logger.info('Queue manager paused');
    },
    
    resume: async () => {
      if (!currentState.isPaused) return;
      
      updateState(state => ({ ...state, isPaused: false, pausedAt: null }));
      logger.info('Queue manager resumed');
    },
    
    addJob: async (job) => {
      updateState(addJob(job));
      await jobRepository.create(job);
      logger.debug(`Job added: ${job.id}`);
    },
    
    getNextJob: () => {
      if (currentState.jobs.length === 0) return null;
      
      const nextJob = currentState.jobs[0];
      updateState(removeJob(nextJob.id));
      return nextJob;
    },
    
    processJobs: async () => {
      if (!currentState.isRunning || currentState.isPaused) return;
      
      const job = getNextJob();
      if (!job) return;
      
      try {
        const result = await jobProcessor(job);
        await handleJobResult(job, result);
      } catch (error) {
        logger.error(`Job processing failed: ${error.message}`);
      }
    }
  };
  
  // 私有辅助函数
  const processJobsLoop = async (): Promise<void> => {
    while (currentState.isRunning) {
      if (!currentState.isPaused) {
        await processJobs();
      }
      
      // 短暂休眠，避免CPU占用过高
      await sleep(options.pollInterval || 100);
    }
  };
  
  const handleJobResult = async (job: QueueJob, result: JobResult): Promise<void> => {
    if (result.success) {
      await jobRepository.markAsCompleted(job.id, result);
    } else {
      await jobRepository.markAsFailed(job.id, result.error);
    }
  };
};
```

### 4. 并发控制函数化

#### 重构后的并发控制
```typescript
// concurrency-control.ts
export interface ConcurrencyController {
  canExecute: (state: QueueState) => boolean;
  getMaxConcurrency: () => number;
  setMaxConcurrency: (max: number) => void;
}

export const createConcurrencyController = (
  initialMaxConcurrency: number = 1
): ConcurrencyController => {
  let maxConcurrency = initialMaxConcurrency;
  
  return {
    canExecute: (state) => state.activeJobs.size < maxConcurrency,
    
    getMaxConcurrency: () => maxConcurrency,
    
    setMaxConcurrency: (max) => {
      if (max > 0) {
        maxConcurrency = max;
      }
    }
  };
};

// 并发任务处理器
export const createConcurrentJobProcessor = (
  concurrencyController: ConcurrencyController,
  jobProcessor: (job: QueueJob) => Promise<JobResult>
) => {
  const activeJobs = new Map<string, Promise<JobResult>>();
  
  return {
    processJob: async (job: QueueJob): Promise<void> => {
      if (activeJobs.has(job.id)) return;
      
      const jobPromise = jobProcessor(job)
        .finally(() => {
          activeJobs.delete(job.id);
        });
      
      activeJobs.set(job.id, jobPromise);
      await jobPromise;
    },
    
    canAcceptNewJob: (): boolean => {
      return activeJobs.size < concurrencyController.getMaxConcurrency();
    },
    
    getActiveJobCount: (): number => activeJobs.size,
    
    waitForAllJobs: async (): Promise<void> => {
      await Promise.all(Array.from(activeJobs.values()));
    }
  };
};
```

### 5. 事件系统函数化

#### 重构后的事件系统
```typescript
// event-system.ts
export type QueueEvent = 
  | { type: 'JOB_ADDED'; payload: { job: QueueJob } }
  | { type: 'JOB_STARTED'; payload: { jobId: string } }
  | { type: 'JOB_COMPLETED'; payload: { jobId: string; result: JobResult } }
  | { type: 'JOB_FAILED'; payload: { jobId: string; error: string } }
  | { type: 'QUEUE_STARTED'; payload: {} }
  | { type: 'QUEUE_STOPPED'; payload: {} };

export interface EventBus {
  emit: (event: QueueEvent) => void;
  subscribe: (eventType: QueueEvent['type'], handler: (event: QueueEvent) => void) => () => void;
}

export const createEventBus = (): EventBus => {
  const subscribers = new Map<QueueEvent['type'], Set<(event: QueueEvent) => void>>();
  
  return {
    emit: (event) => {
      const handlers = subscribers.get(event.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            console.error(`Event handler error for ${event.type}:`, error);
          }
        });
      }
    },
    
    subscribe: (eventType, handler) => {
      if (!subscribers.has(eventType)) {
        subscribers.set(eventType, new Set());
      }
      
      subscribers.get(eventType)!.add(handler);
      
      // 返回取消订阅函数
      return () => {
        subscribers.get(eventType)?.delete(handler);
      };
    }
  };
};

// 事件驱动的队列管理器
export const createEventDrivenQueueManager = (
  baseManager: QueueManager,
  eventBus: EventBus
): QueueManager => {
  // 包装原有方法，添加事件发射
  return {
    ...baseManager,
    
    start: async () => {
      await baseManager.start();
      eventBus.emit({ type: 'QUEUE_STARTED', payload: {} });
    },
    
    stop: async () => {
      await baseManager.stop();
      eventBus.emit({ type: 'QUEUE_STOPPED', payload: {} });
    },
    
    addJob: async (job) => {
      await baseManager.addJob(job);
      eventBus.emit({ type: 'JOB_ADDED', payload: { job } });
    }
  };
};
```

## 🧪 测试策略

### 1. 状态转换测试
```typescript
// queue-state.test.ts
describe('Queue State Transitions', () => {
  test('should start queue correctly', () => {
    const initialState = createInitialQueueState();
    const startedState = startQueue(initialState);
    
    expect(startedState.isRunning).toBe(true);
    expect(startedState.isPaused).toBe(false);
    expect(startedState.startedAt).toBeInstanceOf(Date);
  });
  
  test('should add job without mutation', () => {
    const initialState = createInitialQueueState();
    const job = createTestJob();
    const newState = addJob(job)(initialState);
    
    expect(initialState.jobs).toHaveLength(0); // 原状态不变
    expect(newState.jobs).toHaveLength(1);
    expect(newState.jobs[0]).toBe(job);
  });
});
```

### 2. 任务处理流水线测试
```typescript
// job-processor.test.ts
describe('Job Processor Pipeline', () => {
  test('should process valid job successfully', async () => {
    const logger = createMockLogger();
    const processor = createJobProcessor(logger);
    const job = createValidTestJob();
    
    const result = await processor(job);
    
    expect(result.success).toBe(true);
    expect(result.executionTime).toBeGreaterThan(0);
  });
  
  test('should handle invalid job gracefully', async () => {
    const logger = createMockLogger();
    const processor = createJobProcessor(logger);
    const invalidJob = { id: '', type: '', data: {} };
    
    const result = await processor(invalidJob);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Job ID is required');
  });
});
```

## ⏱️ 重构时间计划

### Week 1: 状态管理重构
- Day 1-2: 不可变状态设计和实现
- Day 3-4: 状态转换函数编写
- Day 5: 状态管理单元测试

### Week 2: 任务处理重构
- Day 1-2: 任务处理流水线设计
- Day 3-4: 并发控制函数化
- Day 5: 事件系统重构

## ⚠️ 风险评估

### 高风险
- **性能影响**：函数式可能影响高并发性能
  - 缓解：性能基准测试，关键路径优化

### 中风险
- **状态一致性**：不可变状态可能导致内存占用增加
  - 缓解：使用结构共享，定期清理历史状态

## 📊 成功指标

- **代码复杂度**：平均圈复杂度从12降低到6
- **测试覆盖率**：从70%提升到95%
- **状态可预测性**：100%的状态变更可追踪
- **并发性能**：支持1000+并发任务处理
