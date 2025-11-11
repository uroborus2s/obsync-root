# 考勤数据导出进度显示解决方案

## 问题描述

当前导出功能存在以下问题：
1. ✅ **URL错误**：前端使用了错误的URL拼接方式（已修复）
2. ⚠️ **进度条不显示**：虽然前端有进度条UI，但后端返回的进度始终是100%

## 问题根本原因

### 当前实现（同步导出）

```typescript
// AttendanceExportService.ts - exportRealtimeData()
async exportRealtimeData(request: RealtimeExportRequest, userId: string) {
  const taskId = this.generateTaskId();
  
  // 1. 查询数据
  const data = await this.attendanceTodayViewRepository.findByCourseId(courseId);
  
  // 2. 生成Excel
  const excelBuffer = await this.generateRealtimeExcel(data, fileName);
  
  // 3. 上传OSS
  await this.uploadToOSS(objectPath, excelBuffer);
  
  // 4. 创建任务记录 - 直接设置为completed
  await this.attendanceExportRecordRepository.create({
    task_id: taskId,
    status: 'completed',  // ❌ 直接完成
    progress: 100,        // ❌ 直接100%
    // ...
  });
  
  // 5. 返回结果
  return right({ taskId, status: 'completed', progress: 100 });
}
```

**问题**：
- 所有操作在一个方法中同步执行
- 创建任务记录时已经完成所有工作
- 前端轮询时只能看到已完成的任务（100%）
- 无法显示中间进度

## 解决方案

### 方案A：简单异步模式（推荐）

**优点**：
- 实现简单，不需要额外依赖
- 适合中小规模应用
- 可以显示真实进度

**缺点**：
- 进程重启会丢失任务
- 不支持分布式部署

**实现步骤**：

#### 1. 修改导出方法为异步执行

```typescript
// AttendanceExportService.ts
async exportRealtimeData(request: RealtimeExportRequest, userId: string) {
  const taskId = this.generateTaskId();
  
  // 1. 立即创建任务记录（status: 'processing', progress: 0）
  await this.attendanceExportRecordRepository.create({
    task_id: taskId,
    export_type: 'realtime',
    course_id: request.courseId,
    status: 'processing',  // ✅ 处理中
    progress: 0,           // ✅ 0%
    file_name: fileName,
    created_by: userId,
    created_at: new Date()
  });

  // 2. 异步执行导出任务（不等待完成）
  this.executeRealtimeExportTask(taskId, request, userId).catch(error => {
    this.logger.error('导出任务失败', { error, taskId });
    // 更新任务状态为失败
    this.updateTaskStatus(taskId, 'failed', {
      error_message: error.message
    });
  });

  // 3. 立即返回taskId（此时任务还在执行中）
  return right({
    taskId,
    status: 'processing',
    progress: 0,
    fileName,
    downloadUrl: null
  });
}

/**
 * 异步执行实时数据导出任务
 */
private async executeRealtimeExportTask(
  taskId: string,
  request: RealtimeExportRequest,
  userId: string
): Promise<void> {
  try {
    // 更新进度：10% - 开始查询数据
    await this.updateTaskProgress(taskId, 10);
    this.logger.info('开始查询实时考勤数据', { taskId, courseId: request.courseId });
    
    const data = await this.attendanceTodayViewRepository.findByCourseId(
      request.courseId
    );
    
    // 更新进度：30% - 数据查询完成
    await this.updateTaskProgress(taskId, 30);
    this.logger.info('实时考勤数据查询完成', {
      taskId,
      recordCount: data.length
    });
    
    // 更新进度：50% - 开始生成Excel
    await this.updateTaskProgress(taskId, 50);
    this.logger.info('开始生成实时考勤Excel文件', { taskId });
    
    const fileName = `实时考勤数据_${new Date().toISOString()}.xlsx`;
    const excelBuffer = await this.generateRealtimeExcel(data, fileName);
    
    // 更新进度：70% - Excel生成完成
    await this.updateTaskProgress(taskId, 70);
    this.logger.info('实时考勤Excel文件生成完成', {
      taskId,
      bufferSize: excelBuffer.length
    });
    
    // 更新进度：90% - 开始上传OSS
    await this.updateTaskProgress(taskId, 90);
    this.logger.info('开始上传文件到OSS', { taskId });
    
    const objectPath = `realtime/${request.courseId}/${Date.now()}_${fileName}`;
    await this.uploadToOSS(objectPath, excelBuffer);
    
    // 更新进度：100% - 完成
    await this.updateTaskStatus(taskId, 'completed', {
      progress: 100,
      file_path: objectPath,
      file_size: excelBuffer.length,
      record_count: data.length,
      completed_at: new Date()
    });
    
    this.logger.info('实时考勤数据导出任务完成', { taskId });
  } catch (error) {
    this.logger.error('实时考勤数据导出任务失败', { error, taskId });
    throw error;
  }
}

/**
 * 更新任务进度
 */
private async updateTaskProgress(taskId: string, progress: number): Promise<void> {
  await this.attendanceExportRecordRepository.updateTaskStatus(
    taskId,
    'processing',
    { progress }
  );
  this.logger.info('任务进度更新', { taskId, progress });
}
```

#### 2. 修改Repository的updateTaskStatus方法

```typescript
// AttendanceExportRecordRepository.ts
async updateTaskStatus(
  taskId: string,
  status: AttendanceExportStatus,
  updates: Partial<IcalinkAttendanceExportRecord>
): Promise<void> {
  await this.update(
    (qb) => qb.where('task_id', '=', taskId),
    {
      status,
      ...updates,
      updated_at: new Date()
    }
  );
}
```

#### 3. 前端轮询逻辑（已实现）

前端的 `ShareAttendanceDialog.tsx` 已经实现了轮询逻辑：

```typescript
// ShareAttendanceDialog.tsx
useEffect(() => {
  if (!isPolling || !taskId) return;

  const pollInterval = setInterval(async () => {
    const response = await attendanceApi.getExportTaskStatus(taskId);
    
    // 更新进度
    setProgress(response.progress || 0);
    
    // 根据进度更新状态文字
    if (response.progress! < 30) {
      setStatusText('正在查询数据...');
    } else if (response.progress! < 70) {
      setStatusText('正在生成Excel...');
    } else if (response.progress! < 90) {
      setStatusText('正在上传文件...');
    } else {
      setStatusText('即将完成...');
    }
    
    // 检查任务状态
    if (response.status === 'completed') {
      setIsPolling(false);
      setDialogState('ready');
      // 显示下载按钮
    }
  }, 2000); // 每2秒轮询一次

  return () => clearInterval(pollInterval);
}, [isPolling, taskId]);
```

### 方案B：任务队列模式（生产级）

**优点**：
- 可靠性高，支持重试、持久化
- 支持分布式部署
- 可以处理高并发导出请求

**缺点**：
- 需要引入Redis和BullMQ
- 实现复杂度较高

**实现步骤**：

#### 1. 安装依赖

```bash
pnpm add bullmq ioredis
```

#### 2. 创建任务队列

```typescript
// AttendanceExportQueue.ts
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

interface ExportJobData {
  taskId: string;
  type: 'realtime' | 'history';
  request: any;
  userId: string;
}

export class AttendanceExportQueue {
  private queue: Queue<ExportJobData>;
  private worker: Worker<ExportJobData>;

  constructor(
    private attendanceExportService: AttendanceExportService,
    redisConnection: Redis
  ) {
    // 创建队列
    this.queue = new Queue('attendance-export', {
      connection: redisConnection
    });

    // 创建Worker处理任务
    this.worker = new Worker(
      'attendance-export',
      async (job: Job<ExportJobData>) => {
        await this.processExportJob(job);
      },
      {
        connection: redisConnection,
        concurrency: 5 // 同时处理5个任务
      }
    );

    // 监听Worker事件
    this.worker.on('completed', (job) => {
      console.log(`任务完成: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`任务失败: ${job?.id}`, err);
    });
  }

  /**
   * 添加导出任务到队列
   */
  async addExportJob(data: ExportJobData): Promise<string> {
    const job = await this.queue.add('export', data, {
      attempts: 3, // 失败重试3次
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
    return job.id!;
  }

  /**
   * 处理导出任务
   */
  private async processExportJob(job: Job<ExportJobData>): Promise<void> {
    const { taskId, type, request, userId } = job.data;

    // 更新进度：10%
    await job.updateProgress(10);
    
    if (type === 'realtime') {
      await this.attendanceExportService.executeRealtimeExportTask(
        taskId,
        request,
        userId,
        async (progress: number) => {
          await job.updateProgress(progress);
        }
      );
    } else {
      await this.attendanceExportService.executeHistoryExportTask(
        taskId,
        request,
        userId,
        async (progress: number) => {
          await job.updateProgress(progress);
        }
      );
    }
  }
}
```

## 实施建议

### 第一阶段：使用方案A（简单异步模式）

1. 修改 `exportRealtimeData` 和 `exportHistoryData` 方法
2. 添加 `executeRealtimeExportTask` 和 `executeHistoryExportTask` 私有方法
3. 添加 `updateTaskProgress` 方法
4. 测试进度显示是否正常

### 第二阶段（可选）：升级到方案B（任务队列）

1. 引入BullMQ和Redis
2. 创建 `AttendanceExportQueue` 类
3. 修改Service层使用队列
4. 配置Worker和监控

## 测试验证

### 1. 测试进度显示

```bash
# 启动应用
pnpm run dev

# 打开浏览器开发者工具
# 进入课程考勤页面
# 点击"导出" → "实时数据"
# 观察进度条是否从0%逐步增加到100%
```

### 2. 检查后端日志

```bash
# 查看任务进度日志
tail -f logs/app.log | grep "任务进度更新"

# 应该看到类似输出：
# 任务进度更新 { taskId: 'task_xxx', progress: 10 }
# 任务进度更新 { taskId: 'task_xxx', progress: 30 }
# 任务进度更新 { taskId: 'task_xxx', progress: 50 }
# 任务进度更新 { taskId: 'task_xxx', progress: 70 }
# 任务进度更新 { taskId: 'task_xxx', progress: 90 }
# 任务进度更新 { taskId: 'task_xxx', progress: 100 }
```

### 3. 检查前端轮询

```javascript
// 浏览器Console应该看到：
// 正在查询数据... (0-30%)
// 正在生成Excel... (30-70%)
// 正在上传文件... (70-90%)
// 即将完成... (90-100%)
```

## 注意事项

1. **异步执行的错误处理**：确保在 `catch` 块中更新任务状态为 `failed`
2. **进度更新的频率**：不要过于频繁更新数据库，建议每10-20%更新一次
3. **超时处理**：对于长时间运行的任务，考虑添加超时机制
4. **并发控制**：如果使用方案A，注意控制并发导出任务数量，避免资源耗尽

## 相关文件

- `apps/app-icalink/src/services/AttendanceExportService.ts` - 导出服务
- `apps/app-icalink/src/repositories/AttendanceExportRecordRepository.ts` - 任务记录Repository
- `apps/agendaedu-app/src/components/ShareAttendanceDialog.tsx` - 前端导出对话框
- `apps/agendaedu-app/src/lib/attendance-api.ts` - 前端API客户端

