/**
 * Redis消息队列基础使用示例
 */
import { QueueManager, Producer, Consumer } from '../src/index.js';
async function basicUsageExample() {
    // 1. 创建队列管理器
    const queueManager = new QueueManager({
        redis: {
            single: {
                host: 'localhost',
                port: 6379
            }
        }
    });
    try {
        // 2. 连接到Redis
        await queueManager.connect();
        console.log('✅ 已连接到Redis');
        // 3. 启动队列管理器
        await queueManager.start();
        console.log('✅ 队列管理器已启动');
        // 4. 创建队列
        const queue = await queueManager.createQueue('task-queue', {
            maxLength: 10000,
            priority: true,
            retryAttempts: 3
        });
        console.log('✅ 队列已创建');
        // 5. 创建生产者
        const producer = new Producer(queue, {
            batchSize: 10,
            batchTimeout: 1000
        });
        await producer.start();
        console.log('✅ 生产者已启动');
        // 6. 发送消息
        console.log('📤 开始发送消息...');
        // 发送单条消息
        const result1 = await producer.send({
            payload: { type: 'email', to: 'user@example.com', subject: 'Hello' },
            priority: 5,
            headers: { source: 'web-app' }
        });
        console.log('✅ 消息已发送:', result1.messageId);
        // 发送优先级消息
        const result2 = await producer.sendPriority({
            payload: { type: 'urgent-notification', message: 'System alert' }
        }, 9);
        console.log('✅ 高优先级消息已发送:', result2.messageId);
        // 发送延迟消息
        const result3 = await producer.sendDelayed({
            payload: { type: 'reminder', message: 'Meeting in 1 hour' }
        }, 60000); // 1分钟后执行
        console.log('✅ 延迟消息已发送:', result3.messageId);
        // 批量发送消息
        const batchMessages = Array.from({ length: 5 }, (_, i) => ({
            payload: { type: 'batch-task', index: i },
            priority: 3
        }));
        const batchResults = await producer.sendBatch(batchMessages);
        console.log(`✅ 批量发送了 ${batchResults.length} 条消息`);
        // 7. 创建消费者
        const consumer = new Consumer(queue, async (result) => {
            console.log('📥 收到消息:', {
                id: result.messageId,
                payload: result.message.payload,
                priority: result.message.priority
            });
            // 模拟处理时间
            await new Promise(resolve => setTimeout(resolve, 100));
            // 确认消息
            await result.ack();
            console.log('✅ 消息已确认:', result.messageId);
        }, queueManager['connectionManager'], {
            batchSize: 1,
            timeout: 5000,
            autoAck: false,
            concurrency: 2
        });
        await consumer.start();
        console.log('✅ 消费者已启动');
        // 8. 等待一段时间让消息被处理
        console.log('⏳ 等待消息处理...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        // 9. 获取队列信息
        const queueInfo = await queue.getInfo();
        console.log('📊 队列信息:', {
            name: queueInfo.name,
            length: queueInfo.length,
            consumers: queueInfo.consumers
        });
        // 10. 获取生产者指标
        const producerMetrics = producer.getMetrics();
        console.log('📈 生产者指标:', {
            messagesSent: producerMetrics.messagesSent,
            batchesSent: producerMetrics.batchesSent,
            averageLatency: producerMetrics.averageLatency
        });
        // 11. 获取消费者指标
        const consumerMetrics = consumer.getMetrics();
        console.log('📈 消费者指标:', {
            messagesProcessed: consumerMetrics.messagesProcessed,
            averageProcessingTime: consumerMetrics.averageProcessingTime,
            errorRate: consumerMetrics.errorRate
        });
        // 12. 健康检查
        const health = await queueManager.healthCheck();
        console.log('🏥 系统健康状态:', {
            healthy: health.healthy,
            redis: health.redis,
            queuesCount: health.queues.length
        });
        // 13. 清理资源
        console.log('🧹 开始清理资源...');
        await consumer.stop();
        console.log('✅ 消费者已停止');
        await producer.stop();
        console.log('✅ 生产者已停止');
        await queueManager.stop();
        console.log('✅ 队列管理器已停止');
        await queueManager.disconnect();
        console.log('✅ 已断开Redis连接');
    }
    catch (error) {
        console.error('❌ 发生错误:', error);
    }
}
// 高级使用示例
async function advancedUsageExample() {
    const queueManager = new QueueManager({
        redis: {
            cluster: {
                nodes: [
                    { host: 'localhost', port: 7000 },
                    { host: 'localhost', port: 7001 },
                    { host: 'localhost', port: 7002 }
                ]
            }
        }
    });
    try {
        await queueManager.connect();
        await queueManager.start();
        // 创建多个队列
        const emailQueue = await queueManager.createQueue('email-queue');
        const smsQueue = await queueManager.createQueue('sms-queue');
        const pushQueue = await queueManager.createQueue('push-queue');
        console.log('✅ 创建了多个队列:', queueManager.listQueues());
        // 创建多个生产者
        const emailProducer = new Producer(emailQueue);
        const smsProducer = new Producer(smsQueue);
        const pushProducer = new Producer(pushQueue);
        await Promise.all([
            emailProducer.start(),
            smsProducer.start(),
            pushProducer.start()
        ]);
        // 创建多个消费者
        const emailConsumer = new Consumer(emailQueue, async (result) => {
            console.log('📧 处理邮件:', result.message.payload);
            await result.ack();
        }, queueManager['connectionManager']);
        const smsConsumer = new Consumer(smsQueue, async (result) => {
            console.log('📱 处理短信:', result.message.payload);
            await result.ack();
        }, queueManager['connectionManager']);
        await Promise.all([
            emailConsumer.start(),
            smsConsumer.start()
        ]);
        // 发送不同类型的消息
        await emailProducer.send({
            payload: { to: 'user@example.com', subject: 'Welcome!' }
        });
        await smsProducer.send({
            payload: { phone: '+1234567890', message: 'Verification code: 123456' }
        });
        await pushProducer.send({
            payload: { deviceId: 'device123', title: 'New message', body: 'You have a new message' }
        });
        // 等待处理
        await new Promise(resolve => setTimeout(resolve, 2000));
        // 获取系统指标
        const metrics = await queueManager.getMetrics();
        console.log('📊 系统指标:', {
            queues: metrics.queues.length,
            systemUptime: metrics.system.uptime,
            memoryUsage: metrics.system.memory
        });
        // 清理
        await Promise.all([
            emailConsumer.stop(),
            smsConsumer.stop(),
            emailProducer.stop(),
            smsProducer.stop(),
            pushProducer.stop()
        ]);
        await queueManager.stop();
        await queueManager.disconnect();
    }
    catch (error) {
        console.error('❌ 高级示例发生错误:', error);
    }
}
// 运行示例
async function main() {
    console.log('🚀 开始基础使用示例...\n');
    await basicUsageExample();
    console.log('\n🚀 开始高级使用示例...\n');
    await advancedUsageExample();
    console.log('\n✨ 所有示例执行完成!');
}
// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
export { basicUsageExample, advancedUsageExample };
//# sourceMappingURL=basic-usage.js.map