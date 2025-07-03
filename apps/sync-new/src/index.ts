import StratixApp, { type IStratixApp } from '@stratix/core';

StratixApp.run().then(async (app: IStratixApp) => {
  const fullSyncService = app.tryResolve('fullSyncService');
  fullSyncService.startFullSync({
    reason: '应用启动后自动执行',
    xnxq: '2024-2025-2'
  });
  // wasV7Message.sendTextMessage({
  //   type: 'card',
  //   receivers: [
  //     {
  //       type: 'user',
  //       receiver_ids: []
  //     }
  //   ],
  //   content: {
  //     config: {}
  //   }
  // });
});
