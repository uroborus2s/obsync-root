import Stratix from '@obsync/stratix';

Stratix.bootstrap().catch((err: any) => {
  console.error('应用启动失败:', error);
  process.exit(1);
});
