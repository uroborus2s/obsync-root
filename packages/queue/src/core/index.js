/**
 * 核心模块统一导出
 */
// 核心类
export { Consumer } from './consumer.js';
export { DeadLetterQueueManager } from './dead-letter-queue.js';
export { Producer } from './producer.js';
export { QueueManager } from './queue-manager.js';
export { Queue } from './queue.js';
// 注意：类型定义通过主入口文件统一导出，这里不再重复导出避免循环依赖
//# sourceMappingURL=index.js.map