/**
 * @stratix/tasks 服务层类型导出
 *
 * ==================================================================================
 * 🏗️ STRATIX 工作流系统架构说明
 * ==================================================================================
 *
 * 在 Stratix 框架中，services 文件夹内的所有服务类都会通过依赖注入容器自动注册，
 * 因此本文件只导出类型接口，不导出服务类实现。
 *
 * ==================================================================================
 * 📋 系统整体架构
 * ==================================================================================
 *
 * 1. **工作流定义层 (Workflow Definition Layer)**
 *    - WorkflowDefinitionService: 管理工作流模板和版本
 *    - 支持工作流的创建、更新、版本控制和归档
 *
 * 2. **工作流执行层 (Workflow Execution Layer)**
 *    - WorkflowEngine: 核心执行引擎，负责工作流实例的生命周期管理
 *    - 支持启动、暂停、恢复、取消工作流实例
 *
 * 3. **任务调度层 (Task Scheduling Layer)**
 *    - TaskScheduler: 任务队列管理和调度
 *    - 支持优先级调度、并发控制、重试机制
 *
 * 4. **执行器管理层 (Executor Management Layer)**
 *    - ExecutorRegistry: 执行器注册表，管理所有可用的任务执行器
 *    - ExecutorFactory: 执行器工厂，负责创建和配置执行器实例
 *
 * ==================================================================================
 * 🔄 执行流程说明
 * ==================================================================================
 *
 * 1. **工作流定义阶段**:
 *    定义 → 验证 → 存储 → 版本管理
 *
 * 2. **工作流实例化阶段**:
 *    模板加载 → 实例创建 → 参数绑定 → 依赖解析
 *
 * 3. **任务执行阶段**:
 *    任务调度 → 执行器选择 → 任务执行 → 结果处理
 *
 * 4. **状态管理阶段**:
 *    状态更新 → 事件通知 → 监控记录 → 错误处理
 *
 * ==================================================================================
 * 🔗 服务依赖关系
 * ==================================================================================
 *
 * WorkflowEngine
 *     ├── WorkflowDefinitionService (工作流定义管理)
 *     ├── TaskScheduler (任务调度)
 *     └── ExecutorRegistry (执行器管理)
 *         └── ExecutorFactory (执行器创建)
 *
 * ==================================================================================
 * 🚀 依赖注入自动注册机制
 * ==================================================================================
 *
 * Stratix 框架会自动扫描 services 目录下的所有类，并根据以下规则注册：
 *
 * 1. **服务类命名规范**: XxxService 或 XxxServiceImpl
 * 2. **注册名称**: 类名的 camelCase 形式（去掉 Service 后缀）
 * 3. **生命周期**: 默认为 SINGLETON（单例模式）
 * 4. **依赖注入**: 通过构造函数参数自动注入依赖
 *
 * 示例注册结果：
 * - WorkflowEngineService → 'workflowEngine'
 * - TaskSchedulerService → 'taskScheduler'
 * - ExecutorRegistryService → 'executorRegistry'
 * - ExecutorFactoryService → 'executorFactory'
 * - WorkflowDefinitionServiceImpl → 'workflowDefinition'
 */

// ==================================================================================
// 🚫 服务类不再手动导出 - 由依赖注入容器自动注册
// ==================================================================================
//
// 以下服务类已被注释，因为它们会被 Stratix 框架自动注册：
//
// export { ExecutorFactoryService } from './ExecutorFactoryService.js';
// export { ExecutorRegistryService } from './ExecutorRegistryService.js';
// export { TaskSchedulerService } from './TaskScheduler.js';
// export { WorkflowDefinitionServiceImpl } from './WorkflowDefinitionService.js';
// export { WorkflowEngineService } from './WorkflowEngine.js';

// ==================================================================================
// ✅ 类型接口导出 - 供其他模块使用
// ==================================================================================

export type {
  TaskDefinition,
  TaskInstance,
  TaskPriority,
  TaskScheduler,
  TaskStatus
} from './TaskScheduler.js';

export type { WorkflowEngine } from './WorkflowEngine.js';

export type { IWorkflowDefinitionService as WorkflowDefinitionService } from './WorkflowDefinitionService.js';

// ==================================================================================
// 📚 完整使用示例
// ==================================================================================

/**
 * 🔧 1. 工作流定义示例
 *
 * 定义一个包含多个任务节点的工作流，展示节点依赖、执行器配置等
 *
 * @example
 * ```typescript
 * import type { WorkflowDefinition } from '@stratix/tasks';
 *
 * const orderProcessingWorkflow: WorkflowDefinition = {
 *   name: 'order-processing',
 *   version: '1.0.0',
 *   description: '订单处理工作流',
 *
 *   // 输入参数定义
 *   inputs: [
 *     {
 *       name: 'orderId',
 *       type: 'string',
 *       required: true,
 *       description: '订单ID'
 *     },
 *     {
 *       name: 'customerId',
 *       type: 'string',
 *       required: true,
 *       description: '客户ID'
 *     }
 *   ],
 *
 *   // 输出参数定义
 *   outputs: [
 *     {
 *       name: 'processResult',
 *       type: 'object',
 *       description: '处理结果'
 *     }
 *   ],
 *
 *   // 工作流节点定义
 *   nodes: [
 *     // 1. 验证订单节点
 *     {
 *       type: 'task',
 *       id: 'validate-order',
 *       name: '验证订单',
 *       executor: 'http',
 *       config: {
 *         url: 'https://api.example.com/orders/validate',
 *         method: 'POST',
 *         headers: {
 *           'Content-Type': 'application/json',
 *           'Authorization': 'Bearer ${context.token}'
 *         },
 *         body: {
 *           orderId: '${inputs.orderId}',
 *           customerId: '${inputs.customerId}'
 *         },
 *         timeout: 30000
 *       },
 *       retry: {
 *         maxAttempts: 3,
 *         backoff: 'exponential',
 *         delay: '1s'
 *       }
 *     },
 *
 *     // 2. 库存检查节点（依赖订单验证）
 *     {
 *       type: 'task',
 *       id: 'check-inventory',
 *       name: '检查库存',
 *       dependsOn: ['validate-order'],
 *       executor: 'script',
 *       config: {
 *         language: 'javascript',
 *         script: `
 *           const { orderId } = inputs;
 *           const orderData = context['validate-order'].data;
 *
 *           // 检查库存逻辑
 *           const inventoryService = services.inventory;
 *           const result = await inventoryService.checkStock(orderData.items);
 *
 *           return {
 *             success: result.available,
 *             data: result,
 *             shouldRetry: !result.available && result.retryable
 *           };
 *         `
 *       }
 *     },
 *
 *     // 3. 并行处理节点
 *     {
 *       type: 'parallel',
 *       id: 'parallel-processing',
 *       name: '并行处理',
 *       dependsOn: ['check-inventory'],
 *       branches: [
 *         {
 *           id: 'payment-branch',
 *           name: '支付处理分支',
 *           nodes: [
 *             {
 *               type: 'task',
 *               id: 'process-payment',
 *               name: '处理支付',
 *               executor: 'http',
 *               config: {
 *                 url: 'https://payment.example.com/charge',
 *                 method: 'POST',
 *                 body: {
 *                   amount: '${context.validate-order.data.amount}',
 *                   currency: 'CNY',
 *                   customerId: '${inputs.customerId}'
 *                 }
 *               }
 *             }
 *           ]
 *         },
 *         {
 *           id: 'notification-branch',
 *           name: '通知分支',
 *           nodes: [
 *             {
 *               type: 'task',
 *               id: 'send-notification',
 *               name: '发送通知',
 *               executor: 'email',
 *               config: {
 *                 to: '${context.validate-order.data.customerEmail}',
 *                 subject: '订单处理通知',
 *                 body: '您的订单 ${inputs.orderId} 正在处理中...',
 *                 html: true
 *               }
 *             }
 *           ]
 *         }
 *       ],
 *       joinType: 'all',
 *       maxConcurrency: 2
 *     },
 *
 *     // 4. 条件节点
 *     {
 *       type: 'condition',
 *       id: 'check-payment-result',
 *       name: '检查支付结果',
 *       dependsOn: ['parallel-processing'],
 *       condition: '${context.process-payment.data.status} === "success"',
 *       trueBranch: [
 *         {
 *           type: 'task',
 *           id: 'fulfill-order',
 *           name: '履行订单',
 *           executor: 'http',
 *           config: {
 *             url: 'https://fulfillment.example.com/orders',
 *             method: 'POST',
 *             body: {
 *               orderId: '${inputs.orderId}',
 *               paymentId: '${context.process-payment.data.paymentId}'
 *             }
 *           }
 *         }
 *       ],
 *       falseBranch: [
 *         {
 *           type: 'task',
 *           id: 'handle-payment-failure',
 *           name: '处理支付失败',
 *           executor: 'script',
 *           config: {
 *             language: 'javascript',
 *             script: `
 *               logger.error('Payment failed for order', {
 *                 orderId: inputs.orderId,
 *                 error: context['process-payment'].error
 *               });
 *
 *               // 发送失败通知
 *               await services.notification.sendFailureAlert({
 *                 orderId: inputs.orderId,
 *                 reason: context['process-payment'].error
 *               });
 *
 *               return { success: false, error: 'Payment processing failed' };
 *             `
 *           }
 *         }
 *       ]
 *     }
 *   ],
 *
 *   // 工作流配置
 *   config: {
 *     timeout: '30m',
 *     errorHandling: 'fail-fast',
 *     concurrency: 5,
 *     priority: 1,
 *     persistIntermediateResults: true,
 *     retryPolicy: {
 *       maxAttempts: 2,
 *       backoff: 'exponential',
 *       delay: '5s'
 *     }
 *   },
 *
 *   tags: ['order', 'payment', 'fulfillment'],
 *   category: 'business-process'
 * };
 * ```
 */

/**
 * 🚀 2. 工作流启动示例
 *
 * 展示如何启动工作流实例，包括参数传递、上下文设置等
 *
 * @example
 * ```typescript
 * import type { WorkflowEngine } from '@stratix/tasks';
 *
 * // 在 Fastify 路由中使用工作流
 * fastify.post('/orders/:orderId/process', async (request, reply) => {
 *   const { orderId } = request.params;
 *   const { customerId, priority = 'normal' } = request.body;
 *
 *   try {
 *     // 从依赖注入容器获取工作流引擎
 *     const workflowEngine = request.diScope.resolve<WorkflowEngine>('workflowEngine');
 *
 *     // 启动工作流实例
 *     const workflowInstance = await workflowEngine.startWorkflow(
 *       'order-processing', // 工作流名称
 *       '1.0.0',           // 版本号
 *       {
 *         // 输入参数
 *         orderId,
 *         customerId,
 *         priority
 *       },
 *       {
 *         // 执行上下文
 *         userId: request.user.id,
 *         requestId: request.id,
 *         token: request.headers.authorization,
 *
 *         // 自定义配置
 *         timeout: priority === 'urgent' ? '10m' : '30m',
 *         retryPolicy: {
 *           maxAttempts: priority === 'urgent' ? 5 : 3
 *         }
 *       }
 *     );
 *
 *     reply.code(201).send({
 *       success: true,
 *       data: {
 *         workflowInstanceId: workflowInstance.id,
 *         status: workflowInstance.status,
 *         startedAt: workflowInstance.startedAt
 *       }
 *     });
 *
 *   } catch (error) {
 *     request.log.error('Failed to start workflow', { orderId, error });
 *     reply.code(500).send({
 *       success: false,
 *       error: 'Failed to start order processing workflow'
 *     });
 *   }
 * });
 * ```
 */

/**
 * 📊 3. 工作流监控和管理示例
 *
 * 展示如何监控工作流状态、处理事件、管理实例等
 *
 * @example
 * ```typescript
 * import type { WorkflowEngine, TaskScheduler } from '@stratix/tasks';
 *
 * // 工作流状态查询
 * fastify.get('/workflows/:instanceId/status', async (request, reply) => {
 *   const { instanceId } = request.params;
 *   const workflowEngine = request.diScope.resolve<WorkflowEngine>('workflowEngine');
 *
 *   try {
 *     const instance = await workflowEngine.getWorkflowInstance(instanceId);
 *     const executionStats = await workflowEngine.getExecutionStats(instanceId);
 *
 *     reply.send({
 *       success: true,
 *       data: {
 *         instance: {
 *           id: instance.id,
 *           status: instance.status,
 *           progress: executionStats.progress,
 *           startedAt: instance.startedAt,
 *           completedAt: instance.completedAt,
 *           currentNode: executionStats.currentNode,
 *           errorMessage: instance.errorMessage
 *         },
 *         stats: {
 *           totalNodes: executionStats.totalNodes,
 *           completedNodes: executionStats.completedNodes,
 *           failedNodes: executionStats.failedNodes,
 *           runningNodes: executionStats.runningNodes
 *         }
 *       }
 *     });
 *   } catch (error) {
 *     reply.code(404).send({
 *       success: false,
 *       error: 'Workflow instance not found'
 *     });
 *   }
 * });
 *
 * // 工作流暂停
 * fastify.post('/workflows/:instanceId/pause', async (request, reply) => {
 *   const { instanceId } = request.params;
 *   const workflowEngine = request.diScope.resolve<WorkflowEngine>('workflowEngine');
 *
 *   try {
 *     await workflowEngine.pauseWorkflow(instanceId);
 *     reply.send({ success: true, message: 'Workflow paused successfully' });
 *   } catch (error) {
 *     reply.code(400).send({
 *       success: false,
 *       error: 'Failed to pause workflow'
 *     });
 *   }
 * });
 *
 * // 工作流恢复
 * fastify.post('/workflows/:instanceId/resume', async (request, reply) => {
 *   const { instanceId } = request.params;
 *   const workflowEngine = request.diScope.resolve<WorkflowEngine>('workflowEngine');
 *
 *   try {
 *     await workflowEngine.resumeWorkflow(instanceId);
 *     reply.send({ success: true, message: 'Workflow resumed successfully' });
 *   } catch (error) {
 *     reply.code(400).send({
 *       success: false,
 *       error: 'Failed to resume workflow'
 *     });
 *   }
 * });
 *
 * // 工作流取消
 * fastify.post('/workflows/:instanceId/cancel', async (request, reply) => {
 *   const { instanceId } = request.params;
 *   const { reason } = request.body;
 *   const workflowEngine = request.diScope.resolve<WorkflowEngine>('workflowEngine');
 *
 *   try {
 *     await workflowEngine.cancelWorkflow(instanceId, reason);
 *     reply.send({ success: true, message: 'Workflow cancelled successfully' });
 *   } catch (error) {
 *     reply.code(400).send({
 *       success: false,
 *       error: 'Failed to cancel workflow'
 *     });
 *   }
 * });
 *
 * // 任务调度器状态
 * fastify.get('/scheduler/status', async (request, reply) => {
 *   const taskScheduler = request.diScope.resolve<TaskScheduler>('taskScheduler');
 *
 *   const stats = await taskScheduler.getStats();
 *
 *   reply.send({
 *     success: true,
 *     data: {
 *       isRunning: stats.isRunning,
 *       queueSize: stats.queueSize,
 *       runningTasks: stats.runningTasks,
 *       completedTasks: stats.completedTasks,
 *       failedTasks: stats.failedTasks,
 *       averageExecutionTime: stats.averageExecutionTime
 *     }
 *   });
 * });
 * ```
 */

/**
 * ⚠️ 4. 错误处理和重试机制示例
 *
 * 展示如何配置错误处理策略、重试机制、失败恢复等
 *
 * @example
 * ```typescript
 * import type { WorkflowDefinition, TaskExecutor, ExecutionContext } from '@stratix/tasks';
 *
 * // 自定义执行器示例 - 带错误处理和重试
 * class RobustHttpExecutor implements TaskExecutor {
 *   readonly name = 'robust-http';
 *   readonly description = '具有强大错误处理能力的HTTP执行器';
 *
 *   async execute(context: ExecutionContext): Promise<ExecutionResult> {
 *     const { config, logger } = context;
 *     const startTime = Date.now();
 *
 *     try {
 *       // 执行前验证
 *       if (!config.url) {
 *         throw new Error('URL is required');
 *       }
 *
 *       // 执行HTTP请求
 *       const response = await this.makeRequest(config, context);
 *
 *       // 成功响应处理
 *       return {
 *         success: true,
 *         data: response.data,
 *         duration: Date.now() - startTime,
 *         logs: [
 *           {
 *             level: 'info',
 *             message: `HTTP request completed successfully`,
 *             timestamp: new Date(),
 *             data: {
 *               url: config.url,
 *               status: response.status,
 *               duration: Date.now() - startTime
 *             }
 *           }
 *         ]
 *       };
 *
 *     } catch (error) {
 *       const duration = Date.now() - startTime;
 *       logger.error('HTTP request failed', { error, config, duration });
 *
 *       // 错误分类和重试策略
 *       const errorType = this.classifyError(error);
 *       const shouldRetry = this.shouldRetryError(errorType, context);
 *       const retryDelay = this.calculateRetryDelay(context.retryCount || 0);
 *
 *       return {
 *         success: false,
 *         error: error.message,
 *         errorDetails: {
 *           type: errorType,
 *           statusCode: error.response?.status,
 *           responseData: error.response?.data
 *         },
 *         duration,
 *         shouldRetry,
 *         retryDelay,
 *         logs: [
 *           {
 *             level: 'error',
 *             message: `HTTP request failed: ${error.message}`,
 *             timestamp: new Date(),
 *             data: {
 *               error: error.message,
 *               errorType,
 *               shouldRetry,
 *               retryDelay
 *             }
 *           }
 *         ]
 *       };
 *     }
 *   }
 *
 *   private classifyError(error: any): string {
 *     if (error.code === 'ECONNREFUSED') return 'connection_refused';
 *     if (error.code === 'ETIMEDOUT') return 'timeout';
 *     if (error.response?.status >= 500) return 'server_error';
 *     if (error.response?.status === 429) return 'rate_limit';
 *     if (error.response?.status >= 400) return 'client_error';
 *     return 'unknown';
 *   }
 *
 *   private shouldRetryError(errorType: string, context: ExecutionContext): boolean {
 *     const retryableErrors = ['connection_refused', 'timeout', 'server_error', 'rate_limit'];
 *     const maxRetries = context.config.maxRetries || 3;
 *     const currentRetries = context.retryCount || 0;
 *
 *     return retryableErrors.includes(errorType) && currentRetries < maxRetries;
 *   }
 *
 *   private calculateRetryDelay(retryCount: number): number {
 *     // 指数退避策略：1s, 2s, 4s, 8s...
 *     return Math.min(1000 * Math.pow(2, retryCount), 30000);
 *   }
 * }
 *
 * // 工作流级别的错误处理配置
 * const resilientWorkflow: WorkflowDefinition = {
 *   name: 'resilient-workflow',
 *   version: '1.0.0',
 *   description: '具有强大错误处理能力的工作流',
 *
 *   nodes: [
 *     {
 *       type: 'task',
 *       id: 'critical-task',
 *       name: '关键任务',
 *       executor: 'robust-http',
 *       config: {
 *         url: 'https://api.example.com/critical-operation',
 *         method: 'POST',
 *         maxRetries: 5,
 *         timeout: 30000
 *       },
 *       retry: {
 *         maxAttempts: 5,
 *         backoff: 'exponential',
 *         delay: '2s',
 *         maxDelay: '60s',
 *         retryIf: 'error.type !== "client_error"' // 只重试非客户端错误
 *       },
 *       timeout: '5m'
 *     },
 *
 *     // 错误处理节点
 *     {
 *       type: 'task',
 *       id: 'error-handler',
 *       name: '错误处理器',
 *       dependsOn: ['critical-task'],
 *       condition: '${context.critical-task.success} === false',
 *       executor: 'script',
 *       config: {
 *         language: 'javascript',
 *         script: `
 *           const error = context['critical-task'].error;
 *           const errorDetails = context['critical-task'].errorDetails;
 *
 *           // 记录详细错误信息
 *           logger.error('Critical task failed', {
 *             taskId: 'critical-task',
 *             error,
 *             errorDetails,
 *             retryCount: context['critical-task'].retryCount
 *           });
 *
 *           // 发送告警通知
 *           await services.alerting.sendAlert({
 *             level: 'critical',
 *             title: 'Workflow Critical Task Failed',
 *             message: \`Task failed after \${context['critical-task'].retryCount} retries: \${error}\`,
 *             details: errorDetails,
 *             workflowInstanceId: context.workflowInstanceId
 *           });
 *
 *           // 尝试降级处理
 *           try {
 *             const fallbackResult = await services.fallback.handleCriticalTaskFailure({
 *               originalError: error,
 *               context: context
 *             });
 *
 *             return {
 *               success: true,
 *               data: {
 *                 fallbackUsed: true,
 *                 fallbackResult
 *               }
 *             };
 *           } catch (fallbackError) {
 *             return {
 *               success: false,
 *               error: 'Both primary and fallback operations failed',
 *               errorDetails: {
 *                 primaryError: error,
 *                 fallbackError: fallbackError.message
 *               }
 *             };
 *           }
 *         `
 *       }
 *     }
 *   ],
 *
 *   config: {
 *     errorHandling: 'continue', // 继续执行其他节点
 *     timeout: '30m',
 *     retryPolicy: {
 *       maxAttempts: 3,
 *       backoff: 'exponential',
 *       delay: '10s'
 *     }
 *   }
 * };
 *
 * // 工作流事件监听和错误处理
 * fastify.addHook('onReady', async () => {
 *   const workflowEngine = fastify.diContainer.resolve<WorkflowEngine>('workflowEngine');
 *
 *   // 监听工作流事件
 *   workflowEngine.on('workflow.failed', async (event) => {
 *     const { workflowInstanceId, error, context } = event;
 *
 *     fastify.log.error('Workflow failed', {
 *       workflowInstanceId,
 *       error,
 *       context
 *     });
 *
 *     // 自动重试逻辑
 *     if (context.retryCount < 3 && error.retryable) {
 *       fastify.log.info('Retrying failed workflow', { workflowInstanceId });
 *
 *       setTimeout(async () => {
 *         try {
 *           await workflowEngine.retryWorkflow(workflowInstanceId);
 *         } catch (retryError) {
 *           fastify.log.error('Failed to retry workflow', {
 *             workflowInstanceId,
 *             retryError
 *           });
 *         }
 *       }, 5000 * Math.pow(2, context.retryCount)); // 指数退避
 *     }
 *   });
 *
 *   // 监听任务失败事件
 *   workflowEngine.on('task.failed', async (event) => {
 *     const { taskId, workflowInstanceId, error } = event;
 *
 *     // 记录任务失败指标
 *     await fastify.metrics.increment('task.failures', {
 *       taskId,
 *       errorType: error.type,
 *       workflowName: event.workflowName
 *     });
 *   });
 * });
 * ```
 */

// ==================================================================================
// 📝 开发者注意事项
// ==================================================================================

/**
 * 💡 最佳实践建议：
 *
 * 1. **服务注入**: 在控制器或其他服务中使用 `request.diScope.resolve()` 获取服务实例
 * 2. **错误处理**: 始终包装工作流操作在 try-catch 块中
 * 3. **日志记录**: 使用结构化日志记录工作流执行信息
 * 4. **监控指标**: 收集工作流执行指标用于性能监控
 * 5. **资源清理**: 确保长时间运行的工作流有适当的超时和清理机制
 * 6. **版本管理**: 使用语义化版本管理工作流定义
 * 7. **测试策略**: 为工作流编写单元测试和集成测试
 * 8. **文档维护**: 保持工作流定义和使用文档的同步更新
 */
