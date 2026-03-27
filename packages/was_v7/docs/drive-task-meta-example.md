# WPS 获取异步任务信息 API 使用示例

## 概述

获取异步任务信息接口用于查询异步任务（如批量删除、批量移动等）的执行进度及结果，包括成功数量、失败数量、任务状态等。

## API 信息

- **接口名称**: `getDriveTaskMeta`
- **请求方法**: GET
- **WPS API 路径**: `/v7/drive_tasks/{task_id}/meta`
- **签名方式**: KSO-1
- **权限要求**:
  - 应用授权: `kso.file.read` 或 `kso.file.readwrite`
  - 用户授权: `kso.file.read` 或 `kso.file.readwrite`

## 类型定义

### 任务状态 (DriveTaskStatus)

```typescript
type DriveTaskStatus = 'running' | 'success' | 'failed' | 'pending';
```

- `pending`: 任务待执行
- `running`: 任务执行中
- `success`: 任务执行成功
- `failed`: 任务执行失败

### 请求参数 (GetDriveTaskMetaParams)

```typescript
interface GetDriveTaskMetaParams {
  /** 异步任务ID */
  task_id: string;
}
```

### 响应数据 (DriveTaskMeta)

```typescript
interface DriveTaskMeta {
  /** 完成成功的数量 */
  done: number;
  /** 失败的数量 */
  failed: number;
  /** 任务状态 */
  status: DriveTaskStatus;
  /** 任务总处理数量 */
  total: number;
}
```

## 使用示例

### 基础用法

```typescript
import { createWpsDriveAdapter } from '@stratix/was-v7';

// 创建适配器实例
const driveAdapter = createWpsDriveAdapter(pluginContainer);

// 查询任务状态
const taskInfo = await driveAdapter.getDriveTaskMeta({
  task_id: 'task_abc123xyz'
});

console.log('任务状态:', taskInfo.status);
console.log('已完成:', taskInfo.done);
console.log('失败数:', taskInfo.failed);
console.log('总数:', taskInfo.total);

// 输出示例:
// 任务状态: running
// 已完成: 45
// 失败数: 2
// 总数: 100
```

### 轮询任务状态直到完成

```typescript
/**
 * 轮询查询任务状态，直到任务完成或失败
 */
async function waitForTaskCompletion(
  driveAdapter: WpsDriveAdapter,
  taskId: string,
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    onProgress?: (taskInfo: DriveTaskMeta) => void;
  } = {}
): Promise<DriveTaskMeta> {
  const {
    maxAttempts = 60,
    intervalMs = 2000,
    onProgress
  } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const taskInfo = await driveAdapter.getDriveTaskMeta({
      task_id: taskId
    });

    // 触发进度回调
    if (onProgress) {
      onProgress(taskInfo);
    }

    // 任务完成（成功或失败）
    if (taskInfo.status === 'success' || taskInfo.status === 'failed') {
      return taskInfo;
    }

    // 任务仍在执行中，等待后继续轮询
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(`任务 ${taskId} 超时：已轮询 ${maxAttempts} 次仍未完成`);
}

// 使用示例
const finalTaskInfo = await waitForTaskCompletion(
  driveAdapter,
  'task_abc123xyz',
  {
    maxAttempts: 30,
    intervalMs: 3000,
    onProgress: (taskInfo) => {
      const progress = taskInfo.total > 0
        ? ((taskInfo.done + taskInfo.failed) / taskInfo.total * 100).toFixed(1)
        : 0;
      console.log(`进度: ${progress}% (${taskInfo.done}/${taskInfo.total})`);
    }
  }
);

console.log('任务最终状态:', finalTaskInfo.status);
```

### 批量删除 + 任务追踪完整示例

```typescript
import type { WpsDriveAdapter } from '@stratix/was-v7';

/**
 * 批量删除文件并追踪任务进度
 */
async function batchDeleteWithTracking(
  driveAdapter: WpsDriveAdapter,
  driveId: string,
  fileIds: string[]
): Promise<void> {
  console.log(`开始批量删除 ${fileIds.length} 个文件...`);

  // 1. 提交批量删除任务
  const deleteResult = await driveAdapter.batchDeleteFiles({
    drive_id: driveId,
    file_ids: fileIds
  });

  console.log(`删除任务已提交，任务ID: ${deleteResult.task_id}`);

  // 2. 轮询任务状态
  const finalTaskInfo = await waitForTaskCompletion(
    driveAdapter,
    deleteResult.task_id,
    {
      onProgress: (taskInfo) => {
        const total = taskInfo.done + taskInfo.failed;
        console.log(
          `删除进度: ${total}/${taskInfo.total} ` +
          `(成功: ${taskInfo.done}, 失败: ${taskInfo.failed})`
        );
      }
    }
  );

  // 3. 检查最终结果
  if (finalTaskInfo.status === 'success') {
    console.log(`✅ 批量删除成功！`);
    console.log(`   - 成功删除: ${finalTaskInfo.done} 个文件`);
    if (finalTaskInfo.failed > 0) {
      console.warn(`   - 删除失败: ${finalTaskInfo.failed} 个文件`);
    }
  } else {
    console.error(`❌ 批量删除失败！`);
    console.error(`   - 成功: ${finalTaskInfo.done}`);
    console.error(`   - 失败: ${finalTaskInfo.failed}`);
    throw new Error('批量删除任务执行失败');
  }
}

// 使用示例
await batchDeleteWithTracking(
  driveAdapter,
  'q60YOE5',
  ['file_id_1', 'file_id_2', 'file_id_3']
);
```

### 在 Service 层集成

```typescript
import type { WpsDriveAdapter, DriveTaskMeta } from '@stratix/was-v7';

class FileCleanupService {
  constructor(
    private readonly wpsDriveAdapter: WpsDriveAdapter
  ) {}

  /**
   * 清理过期文件并返回清理结果
   */
  async cleanupExpiredFiles(
    driveId: string,
    expiredFileIds: string[]
  ): Promise<{
    success: boolean;
    deletedCount: number;
    failedCount: number;
    taskId: string;
  }> {
    // 提交批量删除任务
    const deleteResult = await this.wpsDriveAdapter.batchDeleteFiles({
      drive_id: driveId,
      file_ids: expiredFileIds
    });

    // 等待任务完成
    const taskInfo = await this.waitForTask(deleteResult.task_id);

    return {
      success: taskInfo.status === 'success',
      deletedCount: taskInfo.done,
      failedCount: taskInfo.failed,
      taskId: deleteResult.task_id
    };
  }

  /**
   * 等待任务完成
   */
  private async waitForTask(taskId: string): Promise<DriveTaskMeta> {
    const maxAttempts = 60;
    const intervalMs = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      const taskInfo = await this.wpsDriveAdapter.getDriveTaskMeta({
        task_id: taskId
      });

      if (taskInfo.status === 'success' || taskInfo.status === 'failed') {
        return taskInfo;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`任务 ${taskId} 执行超时`);
  }
}
```

### 任务状态判断工具函数

```typescript
import type { DriveTaskMeta, DriveTaskStatus } from '@stratix/was-v7';

/**
 * 判断任务是否已完成（成功或失败）
 */
function isTaskCompleted(taskInfo: DriveTaskMeta): boolean {
  return taskInfo.status === 'success' || taskInfo.status === 'failed';
}

/**
 * 判断任务是否成功
 */
function isTaskSuccess(taskInfo: DriveTaskMeta): boolean {
  return taskInfo.status === 'success';
}

/**
 * 判断任务是否失败
 */
function isTaskFailed(taskInfo: DriveTaskMeta): boolean {
  return taskInfo.status === 'failed';
}

/**
 * 判断任务是否仍在执行中
 */
function isTaskRunning(taskInfo: DriveTaskMeta): boolean {
  return taskInfo.status === 'running' || taskInfo.status === 'pending';
}

/**
 * 计算任务进度百分比
 */
function calculateTaskProgress(taskInfo: DriveTaskMeta): number {
  if (taskInfo.total === 0) return 0;
  const processed = taskInfo.done + taskInfo.failed;
  return Math.round((processed / taskInfo.total) * 100);
}

// 使用示例
const taskInfo = await driveAdapter.getDriveTaskMeta({ task_id: 'task_123' });

console.log('任务已完成:', isTaskCompleted(taskInfo));
console.log('任务成功:', isTaskSuccess(taskInfo));
console.log('任务进度:', calculateTaskProgress(taskInfo) + '%');
```

## 注意事项

1. **轮询间隔**: 建议轮询间隔设置为 2-5 秒，避免过于频繁的请求
2. **超时处理**: 建议设置最大轮询次数，避免无限等待
3. **任务状态**: 任务状态包括 `pending`、`running`、`success`、`failed` 四种
4. **部分失败**: 即使任务状态为 `success`，也可能存在部分文件删除失败（`failed > 0`）
5. **错误处理**: 应妥善处理网络错误和任务失败的情况
6. **进度回调**: 建议实现进度回调，提升用户体验

## 相关接口

- `batchDeleteFiles`: 批量删除文件(夹)，返回任务ID
- `deleteFile`: 删除单个文件或文件夹

## API 文档参考

完整的 WPS API 文档请参考: https://openapi.wps.cn/docs

