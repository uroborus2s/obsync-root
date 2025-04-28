/**
 * @stratix/queue 性能测试脚本
 * 用于测试队列的性能表现
 */

import { createQueuePlugin } from './index.js';
import { runPerformanceTest } from './utils/performance.js';

/**
 * 运行队列性能测试
 */
async function runQueuePerformanceTests() {
  // 创建队列插件实例
  const queuePlugin = createQueuePlugin({
    driver: 'bullmq',
    redis: {
      host: 'localhost',
      port: 6379
    },
    prefix: 'perf-test:'
  });

  // 创建模拟应用
  const app = {
    name: 'perf-test',
    log: {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error
    },
    hook: {
      register: () => {}
    },
    decorate: (name: string, value: any) => {
      (app as any)[name] = value;
    }
  };

  // 注册队列插件
  await queuePlugin.register(app, {});

  // 获取队列管理器
  const queueManager = (app as any).queue;

  // 创建测试队列
  const testQueue = queueManager.createQueue('perf-test');

  // 注册处理器
  testQueue.process(async (job: any) => {
    // 模拟不同处理时间的工作负载
    const processingTime = job.data.processingTime || 10;
    await new Promise((resolve) => setTimeout(resolve, processingTime));
    return { processed: true, jobId: job.id };
  });

  console.log('队列性能测试开始...');

  // 测试添加单个任务
  await runPerformanceTest(
    'add-single-job',
    async () => {
      await testQueue.add('test-job', {
        value: Math.random(),
        processingTime: 5
      });
    },
    100, // 100次迭代
    10 // 10个并发
  );

  // 测试批量添加任务
  await runPerformanceTest(
    'add-bulk-jobs',
    async () => {
      const jobs = Array(50)
        .fill(0)
        .map((_, i) => ({
          name: 'test-job',
          data: { value: i, processingTime: 5 }
        }));
      await testQueue.addBulk(jobs);
    },
    10, // 10次迭代
    2 // 2个并发
  );

  // 测试获取任务
  let testJobId: string | null = null;
  // 先添加一个任务获取ID
  const testJob = await testQueue.add('id-test', { value: 'test' });
  testJobId = testJob.id;

  await runPerformanceTest(
    'get-job',
    async () => {
      if (testJobId) {
        await testQueue.getJob(testJobId);
      }
    },
    100, // 100次迭代
    10 // 10个并发
  );

  // 测试获取队列状态
  await runPerformanceTest(
    'get-status',
    async () => {
      await testQueue.getStatus();
    },
    100, // 100次迭代
    1 // 单个并发
  );

  // 测试获取队列指标
  await runPerformanceTest(
    'get-metrics',
    async () => {
      await testQueue.getMetrics();
    },
    100, // 100次迭代
    1 // 单个并发
  );

  // 清理测试队列
  console.log('清理测试队列...');
  await testQueue.empty();
  await testQueue.close();

  // 关闭队列连接
  await queueManager.closeAll();

  console.log('队列性能测试完成');
}

// 运行测试
if (require.main === module) {
  runQueuePerformanceTests().catch(console.error);
}

export { runQueuePerformanceTests };
