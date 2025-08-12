// @wps/app-icasync 应用入口文件
// 基于 Stratix 框架的现代化课表同步服务

import { Stratix } from '@stratix/core';

async function main() {
  const app = await Stratix.run();
  // console.log(app);
  // const icasyncFullSync = app.diContainer.resolve(
  //   'icasyncFullSync'
  // ) as FullSyncAdapter;
  // await icasyncFullSync.executeFullSync({
  //   xnxq: '2024-2025-2'
  //   // 明确指定清空现有数据
  // });
}

main();
