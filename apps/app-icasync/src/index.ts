// @wps/app-icasync 应用入口文件
// 基于 Stratix 框架的现代化课表同步服务

import { Stratix } from '@stratix/core';
import type { FullSyncAdapter } from '@stratix/icasync';

async function main() {
  const app = await Stratix.run();
  console.log(app);
  const icasyncFullSync = app.diContainer.resolve(
    'icasyncFullSync'
  ) as FullSyncAdapter;
  icasyncFullSync.executeFullSync({
    xnxq: '2024-2025-2'
  });
}

main();
