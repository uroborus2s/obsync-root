// @stratix/icasync 工作流执行示例
// 展示如何使用 @stratix/tasks 系统执行课表同步工作流

import type { WorkflowExecutionRequest, TasksClient } from '@stratix/tasks';

/**
 * 全量同步工作流执行示例
 */
export async function executeFullSyncWorkflow(
  tasksClient: TasksClient,
  xnxq: string,
  options: {
    batchSize?: number;
    maxConcurrency?: number;
    clearExisting?: boolean;
    createAttendanceRecords?: boolean;
    sendNotification?: boolean;
  } = {}
): Promise<string> {
  const request: WorkflowExecutionRequest = {
    workflowName: 'icasync-full-sync',
    version: '2.0.0',
    inputs: {
      xnxq,
      batchSize: options.batchSize || 100,
      maxConcurrency: options.maxConcurrency || 10,
      timeout: '45m',
      clearExisting: options.clearExisting ?? true,
      createAttendanceRecords: options.createAttendanceRecords ?? false,
      sendNotification: options.sendNotification ?? true
    },
    metadata: {
      requestId: `full-sync-${xnxq}-${Date.now()}`,
      source: 'icasync-api',
      priority: 'high',
      tags: ['course-sync', 'full-sync', xnxq]
    }
  };

  const execution = await tasksClient.executeWorkflow(request);
  return execution.executionId;
}

/**
 * 增量同步工作流执行示例
 */
export async function executeIncrementalSyncWorkflow(
  tasksClient: TasksClient,
  xnxq: string,
  options: {
    timeWindow?: number;
    batchSize?: number;
    maxConcurrency?: number;
    generateChangeReport?: boolean;
    sendNotification?: boolean;
  } = {}
): Promise<string> {
  const request: WorkflowExecutionRequest = {
    workflowName: 'icasync-incremental-sync',
    version: '2.0.0',
    inputs: {
      xnxq,
      timeWindow: options.timeWindow || 24,
      batchSize: options.batchSize || 50,
      maxConcurrency: options.maxConcurrency || 5,
      timeout: '20m',
      generateChangeReport: options.generateChangeReport ?? true,
      sendNotification: options.sendNotification ?? false
    },
    metadata: {
      requestId: `incremental-sync-${xnxq}-${Date.now()}`,
      source: 'icasync-api',
      priority: 'medium',
      tags: ['course-sync', 'incremental-sync', xnxq]
    }
  };

  const execution = await tasksClient.executeWorkflow(request);
  return execution.executionId;
}

/**
 * 工作流状态监控示例
 */
export async function monitorWorkflowExecution(
  tasksClient: TasksClient,
  executionId: string
): Promise<void> {
  console.log(`开始监控工作流执行: ${executionId}`);

  const checkInterval = 30000; // 30秒检查一次
  const maxWaitTime = 7200000; // 最多等待2小时
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await tasksClient.getExecutionStatus(executionId);
      
      console.log(`工作流状态: ${status.status}`);
      console.log(`当前节点: ${status.currentNode || 'N/A'}`);
      console.log(`进度: ${status.progress || 0}%`);
      
      if (status.status === 'completed') {
        console.log('工作流执行完成');
        console.log('执行结果:', status.outputs);
        break;
      } else if (status.status === 'failed') {
        console.error('工作流执行失败');
        console.error('错误信息:', status.error);
        break;
      } else if (status.status === 'cancelled') {
        console.log('工作流执行已取消');
        break;
      }

      // 等待下次检查
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    } catch (error) {
      console.error('获取工作流状态失败:', error);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
}

/**
 * 批量执行多个学期的全量同步
 */
export async function batchExecuteFullSync(
  tasksClient: TasksClient,
  semesters: string[],
  options: {
    batchSize?: number;
    maxConcurrency?: number;
    sequential?: boolean; // 是否串行执行
  } = {}
): Promise<string[]> {
  const executionIds: string[] = [];

  if (options.sequential) {
    // 串行执行
    for (const xnxq of semesters) {
      console.log(`开始执行学期 ${xnxq} 的全量同步`);
      const executionId = await executeFullSyncWorkflow(tasksClient, xnxq, {
        batchSize: options.batchSize,
        maxConcurrency: options.maxConcurrency,
        clearExisting: true,
        sendNotification: false // 批量执行时不发送通知
      });
      executionIds.push(executionId);
      
      // 等待当前学期完成再执行下一个
      await monitorWorkflowExecution(tasksClient, executionId);
    }
  } else {
    // 并行执行
    const promises = semesters.map(async (xnxq) => {
      console.log(`开始执行学期 ${xnxq} 的全量同步`);
      return await executeFullSyncWorkflow(tasksClient, xnxq, {
        batchSize: options.batchSize,
        maxConcurrency: Math.max(1, Math.floor((options.maxConcurrency || 10) / semesters.length)),
        clearExisting: true,
        sendNotification: false
      });
    });

    const results = await Promise.all(promises);
    executionIds.push(...results);
  }

  return executionIds;
}

/**
 * 定时增量同步示例
 */
export async function scheduleIncrementalSync(
  tasksClient: TasksClient,
  xnxq: string,
  cronExpression: string = '0 */6 * * *' // 每6小时执行一次
): Promise<string> {
  const scheduleRequest = {
    name: `icasync-incremental-sync-${xnxq}`,
    description: `学期 ${xnxq} 的定时增量同步`,
    cronExpression,
    workflowName: 'icasync-incremental-sync',
    version: '2.0.0',
    inputs: {
      xnxq,
      timeWindow: 8, // 检测最近8小时的变更
      batchSize: 30,
      maxConcurrency: 3,
      generateChangeReport: true,
      sendNotification: false
    },
    enabled: true,
    metadata: {
      source: 'icasync-scheduler',
      tags: ['scheduled', 'incremental-sync', xnxq]
    }
  };

  const schedule = await tasksClient.createSchedule(scheduleRequest);
  return schedule.scheduleId;
}

/**
 * 工作流执行统计示例
 */
export async function getWorkflowExecutionStats(
  tasksClient: TasksClient,
  workflowName: string,
  timeRange: {
    startDate: Date;
    endDate: Date;
  }
): Promise<any> {
  const stats = await tasksClient.getWorkflowStats({
    workflowName,
    startDate: timeRange.startDate,
    endDate: timeRange.endDate
  });

  return {
    totalExecutions: stats.totalExecutions,
    successfulExecutions: stats.successfulExecutions,
    failedExecutions: stats.failedExecutions,
    averageDuration: stats.averageDuration,
    successRate: stats.successfulExecutions / stats.totalExecutions * 100,
    commonErrors: stats.commonErrors,
    performanceMetrics: stats.performanceMetrics
  };
}

/**
 * 使用示例
 */
export async function exampleUsage() {
  // 假设已经初始化了 TasksClient
  const tasksClient = {} as TasksClient; // 实际使用时需要正确初始化

  try {
    // 1. 执行全量同步
    console.log('执行全量同步...');
    const fullSyncExecutionId = await executeFullSyncWorkflow(tasksClient, '2024-2025-1', {
      batchSize: 100,
      maxConcurrency: 10,
      clearExisting: true,
      createAttendanceRecords: false,
      sendNotification: true
    });

    // 2. 监控执行状态
    await monitorWorkflowExecution(tasksClient, fullSyncExecutionId);

    // 3. 设置定时增量同步
    console.log('设置定时增量同步...');
    const scheduleId = await scheduleIncrementalSync(tasksClient, '2024-2025-1');
    console.log(`定时任务已创建: ${scheduleId}`);

    // 4. 获取执行统计
    const stats = await getWorkflowExecutionStats(tasksClient, 'icasync-full-sync', {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 最近30天
      endDate: new Date()
    });
    console.log('工作流执行统计:', stats);

  } catch (error) {
    console.error('工作流执行失败:', error);
  }
}

/**
 * 错误处理和重试示例
 */
export async function executeWithRetry(
  tasksClient: TasksClient,
  workflowName: string,
  inputs: any,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`尝试执行工作流 (第${attempt}次)...`);
      
      const execution = await tasksClient.executeWorkflow({
        workflowName,
        version: '2.0.0',
        inputs,
        metadata: {
          requestId: `retry-${workflowName}-${Date.now()}`,
          attempt,
          maxRetries
        }
      });

      return execution.executionId;
    } catch (error) {
      lastError = error as Error;
      console.error(`第${attempt}次尝试失败:`, error);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 指数退避
        console.log(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`工作流执行失败，已重试${maxRetries}次。最后错误: ${lastError?.message}`);
}
