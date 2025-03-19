import Stratix from '../src/index.js';

async function main() {
  try {
    // 使用Stratix.run()运行应用
    // 它会自动查找和加载配置文件，然后初始化应用
    const app = await Stratix.run();

    console.log('应用已启动:', app.name);

    // 处理信号，优雅关闭
    process.on('SIGINT', async () => {
      console.log('正在关闭应用...');
      await app.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('正在关闭应用...');
      await app.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('应用启动失败:', err);
    process.exit(1);
  }
}

// 执行主函数
main();
