// @wps/app-icasync 应用入口文件
// 基于 Stratix 框架的现代化课表同步服务

import { Stratix } from '@stratix/core';
import { WpsCalendarAdapter } from '@stratix/was-v7';
import CalendarCreationService from './services/CalendarCreationService.js';
import CalendarSyncService from './services/CalendarSyncService.js';
import SourceDataSyncService from './services/SourceDataSyncService.js';

async function main() {
  const app = await Stratix.run();

  const wasV7ApiCalendar = app.diContainer.resolve(
    'wasV7ApiCalendar'
  ) as WpsCalendarAdapter;

  // const lists = await wasV7ApiCalendar.getAllCalendarList();
  // console.log(lists);

  // for (const list of lists) {
  //   if (list.summary !== '日历推送的日历') {
  //     await wasV7ApiCalendar.deleteCalendar({
  //       calendar_id: list.id
  //     });
  //   }
  // }

  const sourceDataSyncService = app.diContainer.resolve(
    'sourceDataSyncService'
  ) as SourceDataSyncService;

  const calendarCreationService = app.diContainer.resolve(
    'calendarCreationService'
  ) as CalendarCreationService;

  // await calendarCreationService.createCalendarsFromCourses(
  //   '202509072149',
  //   '2025-2026-1'
  // );

  const calendarSyncService = app.diContainer.resolve(
    'calendarSyncService'
  ) as CalendarSyncService;
  calendarSyncService.syncCalendarSchedules({
    batchId: '202509072151',
    semester: '2025-2026-1',
    courseBatchId: '202509072149',
    selectionBatchId: '202509072151'
  });

  // const result = await sourceDataSyncService.syncAllData();
  // console.log(result);
  // const mainCalendar = await wasV7ApiCalendar.getMainCalendar();
  // console.log(mainCalendar);

  // // const noDeletes = [];
  // // const toDeletes = [];
  // // console.log(allCalendars);
  // // for (const calendar of allCalendars) {
  // //   if (calendar.summary.includes('课表')) {
  // //     toDeletes.push(calendar);
  // //   } else {
  // //     noDeletes.push(calendar);
  // //   }
  // // }

  // // const mainCalendar = await wasV7ApiCalendar.getMainCalendar();
  // // console.log(mainCalendar);
  // const calendar = await wasV7ApiCalendar.getCalendar({
  //   calendar_id: '127949198'
  // });
  // console.log(calendar);
  // const list = await wasV7ApiCalendar.getCalendarList({ page_size: 1 });
  // console.log(list);

  // const icasyncFullSync = app.diContainer.resolve(
  //   'icasyncFullSync'
  // ) as FullSyncAdapter;
  // await icasyncFullSync.startManualSync({
  //   xnxq: '2024-2025-2'
  //   // 明确指定清空现有数据
  // });
}

main();
