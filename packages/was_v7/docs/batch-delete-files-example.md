# WPS 批量删除文件(夹) API 使用示例

## 概述

批量删除文件(夹)接口允许您一次性删除多个文件或文件夹，返回一个异步任务ID用于追踪删除进度。

## API 信息

- **接口名称**: `batchDeleteFiles`
- **请求方法**: POST
- **WPS API 路径**: `/v7/drives/{drive_id}/files/batch_delete`
- **签名方式**: KSO-1
- **权限要求**:
  - 应用授权: `kso.file.readwrite`
  - 用户授权: `kso.file.readwrite`

## 类型定义

### 请求参数 (BatchDeleteFilesParams)

```typescript
interface BatchDeleteFilesParams {
  /** 云盘ID */
  drive_id: string;
  /** 需要删除的文件或文件夹ID列表 */
  file_ids: string[];
}
```

### 响应数据 (BatchDeleteFilesResponse)

```typescript
interface BatchDeleteFilesResponse {
  /** 异步任务ID */
  task_id: string;
}
```

## 使用示例

### 基础用法

```typescript
import { createWpsDriveAdapter } from '@stratix/was-v7';

// 创建适配器实例
const driveAdapter = createWpsDriveAdapter(pluginContainer);

// 批量删除文件
const result = await driveAdapter.batchDeleteFiles({
  drive_id: 'q60YOE5',
  file_ids: ['file_id_1', 'file_id_2', 'file_id_3']
});

console.log('删除任务ID:', result.task_id);
// 输出: 删除任务ID: task_abc123xyz
```

### 在 Service 层使用

```typescript
import type { WpsDriveAdapter } from '@stratix/was-v7';

class FileManagementService {
  constructor(private readonly wpsDriveAdapter: WpsDriveAdapter) {}

  /**
   * 批量删除过期的导出文件
   */
  async cleanupExpiredExports(
    driveId: string,
    expiredFileIds: string[]
  ): Promise<string> {
    try {
      // 批量删除文件
      const result = await this.wpsDriveAdapter.batchDeleteFiles({
        drive_id: driveId,
        file_ids: expiredFileIds
      });

      console.log(`成功提交删除任务，任务ID: ${result.task_id}`);
      console.log(`待删除文件数量: ${expiredFileIds.length}`);

      return result.task_id;
    } catch (error) {
      console.error('批量删除文件失败:', error);
      throw error;
    }
  }
}
```

### 结合错误处理

```typescript
async function batchDeleteWithRetry(
  driveAdapter: WpsDriveAdapter,
  driveId: string,
  fileIds: string[],
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await driveAdapter.batchDeleteFiles({
        drive_id: driveId,
        file_ids: fileIds
      });

      console.log(`✅ 批量删除成功 (尝试 ${attempt}/${maxRetries})`);
      return result.task_id;
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ 批量删除失败 (尝试 ${attempt}/${maxRetries}):`, error);

      if (attempt < maxRetries) {
        // 指数退避
        const delay = 1000 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `批量删除失败，已重试 ${maxRetries} 次: ${lastError?.message}`
  );
}
```

### 分批删除大量文件

```typescript
/**
 * 分批删除大量文件，避免单次请求文件数过多
 */
async function batchDeleteInChunks(
  driveAdapter: WpsDriveAdapter,
  driveId: string,
  fileIds: string[],
  chunkSize: number = 100
): Promise<string[]> {
  const taskIds: string[] = [];

  // 将文件ID分批
  for (let i = 0; i < fileIds.length; i += chunkSize) {
    const chunk = fileIds.slice(i, i + chunkSize);

    console.log(
      `正在删除第 ${Math.floor(i / chunkSize) + 1} 批文件 (${chunk.length} 个)`
    );

    const result = await driveAdapter.batchDeleteFiles({
      drive_id: driveId,
      file_ids: chunk
    });

    taskIds.push(result.task_id);

    // 避免请求过快，添加延迟
    if (i + chunkSize < fileIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(`✅ 所有批次删除任务已提交，共 ${taskIds.length} 个任务`);
  return taskIds;
}

// 使用示例
const allFileIds = ['file1', 'file2' /* ... 1000个文件ID ... */];
const taskIds = await batchDeleteInChunks(
  driveAdapter,
  'q60YOE5',
  allFileIds,
  100 // 每批100个文件
);
```

## 注意事项

1. **异步操作**: 批量删除是异步操作，接口返回任务ID后，实际删除操作在后台执行
2. **任务追踪**: 可以使用返回的 `task_id` 查询删除任务的执行状态（需要调用任务状态查询接口）
3. **权限验证**: 确保应用和用户都具有 `kso.file.readwrite` 权限
4. **批量大小**: 建议单次删除文件数量不超过 100-200 个，大量文件应分批删除
5. **错误处理**: 建议实现重试机制，处理网络波动等临时性错误
6. **文件恢复**: 删除的文件会进入回收站，可以在一定时间内恢复

### 批量删除 + 任务追踪完整示例

```typescript
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
  let taskCompleted = false;
  let attempts = 0;
  const maxAttempts = 60;

  while (!taskCompleted && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待2秒

    const taskInfo = await driveAdapter.getDriveTaskMeta({
      task_id: deleteResult.task_id
    });

    const total = taskInfo.done + taskInfo.failed;
    console.log(
      `删除进度: ${total}/${taskInfo.total} ` +
        `(成功: ${taskInfo.done}, 失败: ${taskInfo.failed})`
    );

    if (taskInfo.status === 'success' || taskInfo.status === 'failed') {
      taskCompleted = true;

      if (taskInfo.status === 'success') {
        console.log(`✅ 批量删除成功！成功删除 ${taskInfo.done} 个文件`);
      } else {
        console.error(`❌ 批量删除失败！`);
      }
    }

    attempts++;
  }

  if (!taskCompleted) {
    throw new Error('任务执行超时');
  }
}

// 使用示例
await batchDeleteWithTracking(driveAdapter, 'q60YOE5', [
  'file_id_1',
  'file_id_2',
  'file_id_3'
]);
```

## 相关接口

- `deleteFile`: 删除单个文件或文件夹
- `getDriveTaskMeta`: 获取异步任务信息（用于追踪批量删除进度）
- `getFileMeta`: 获取文件元信息
- `batchGetFiles`: 批量获取文件信息

## API 文档参考

完整的 WPS API 文档请参考: https://openapi.wps.cn/docs

更多任务追踪示例请参考: [drive-task-meta-example.md](./drive-task-meta-example.md)
