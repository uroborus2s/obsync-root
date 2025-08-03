import { Stratix } from '@stratix/core';

async function main() {
  try {
    // 启动 API 网关应用
    const app = await Stratix.run({
      type: 'web',
      server: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || '0.0.0.0'
      },
      debug: process.env.NODE_ENV !== 'production',
      gracefulShutdown: true,
      shutdownTimeout: 10000
    });

    const address = app.getAddress();
    app.logger.info(
      `🚀 API Gateway started at ${address?.address}:${address?.port}`
    );

    // 设置进程信号处理
    process.on('SIGTERM', async () => {
      app.logger.info('收到 SIGTERM 信号，开始优雅关闭...');
      await app.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      app.logger.info('收到 SIGINT 信号，开始优雅关闭...');
      await app.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ 启动 API 网关失败:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason, 'at:', promise);
  process.exit(1);
});

main().catch(console.error);
