import StratixApp, { type IStratixApp } from '@stratix/core';

StratixApp.run().then(async (app: IStratixApp) => {
  // const wasV7Message = app.tryResolve('wasV7Message');
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
  // try {
  //   const fullSyncService = app.tryResolve('fullSyncService');
  //   fullSyncService.startFullSync({
  //     reason: '新学期初始化',
  //     xnxq: '2024-2025-2'
  //   });
  // } catch (error) {
  //   console.error(error);
  // }
});
