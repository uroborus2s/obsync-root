// @wps/app-icasync 应用入口文件
// 基于 Stratix 框架的现代化课表同步服务

import { Stratix } from '@stratix/core';
import {
  WpsCalendarAdapter,
  WpsDBSheetAdapter,
  WpsDriveAdapter
} from '@stratix/was-v7';

async function main() {
  const app = await Stratix.run();

  const wasV7ApiCalendar = app.diContainer.resolve(
    'wasV7ApiCalendar'
  ) as WpsCalendarAdapter;

  const wasV7ApiDbsheet = app.diContainer.resolve(
    'wasV7ApiDbsheet'
  ) as WpsDBSheetAdapter;

  const wasV7ApiDrive = app.diContainer.resolve(
    'wasV7ApiDrive'
  ) as WpsDriveAdapter;

  // const calendars = await wasV7ApiCalendar.getAllCalendarList();
  // console.log(calendars);
  const res = await wasV7ApiDbsheet.getSchemas('459309344199');

  console.log(res);

  // const res = await wasV7ApiCalendar.createCalendarPermission({
  //   calendar_id: '128456693',
  //   user_id: '0316022301503',
  //   role: 'reader',
  //   id_type: 'external'
  // });

  // console.log(res);
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
