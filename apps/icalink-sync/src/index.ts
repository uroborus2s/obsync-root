import StratixApp, { type IStratixApp } from '@stratix/core';
import { CalendarModule } from '@stratix/was-v7';
import { FullSyncService } from './plugin/sync/services/full-sync.service.js';

StratixApp.run().then(async (app: IStratixApp) => {
  const wasV7Calendar = app.tryResolve('wasV7Calendar') as CalendarModule;
  // const calendar = await wasV7Calendar.createCalendar({
  //   summary: '日历测试'
  // });
  // console.log(calendar);
  const fullSyncService = app.tryResolve('fullSyncService') as FullSyncService;

  const teachers = await fullSyncService.getTeachersForCourse({
    gh_s: '302032',
    xm_s: '孙永锐'
  });

  for (const teacher of teachers) {
    // const user = await wasV7User.getUserByExId({
    //   ex_user_ids: [teacher.gh],
    //   status: ['active']
    // });
    // const id = user.items[0].id;
    // console.log(user);
    try {
      const d = await wasV7Calendar.createCalendarPermission({
        calendar_id: '126338171',
        user_id: '101075',
        role: 'reader',
        id_type: 'external'
      });
      console.log(d);
    } catch (error) {
      console.error(error);
    }
  }

  // const students = await fullSyncService.getStudentsForCourse(
  //   '202420252003043225401',
  //   '2024-2025-2'
  // );
  // for (const student of students) {
  //   console.log(student);
  //   const user = await wasV7User.getUserByExId({
  //     ex_user_ids: [student.xh],
  //     status: ['active']
  //   });
  //   const id = user.items[0].id;
  //   console.log(user);
  //   try {
  //     const d = await wasV7Calendar.createCalendarPermission({
  //       calendar_id: '126238802',
  //       user_id: id,
  //       role: 'reader'
  //     });
  //     console.log(d);
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }

  // const fullSyncService = app.tryResolve('fullSyncService') as FullSyncService;
  // const aggregateTasks = await courseAggregateRepo.findByXnxq('2024-2025-2');
  // const wasV7Schedule = app.tryResolve('wasV7Schedule');
  // const userCalendarRepo = app.tryResolve(
  //   'userCalendarRepo'
  // ) as UserCalendarRepository;
  // const startDate = formatToRFC3339('2025/06/22', '08:00:00.000');
  // const endDate = formatToRFC3339('2025/07/22', '08:00:00.000');
  // const teachers = await fullSyncService.getTeachersForCourse({
  //   gh_s: '104082',
  //   xm_s: '胡玮佳'
  // });
  // const students = await fullSyncService.getStudentsForCourse(
  //   '202420252003034212701',
  //   '2024-2025-2'
  // );
  // const success = [];
  // const tsuccess = new Map<string, any>();
  // for (const teacher of teachers) {
  //   // 3. 从日历中删除日程
  //   try {
  //     // 获取教师的日历id
  //     const userCalendar = await userCalendarRepo.findByXgh(teacher.gh);
  //     if (!userCalendar) {
  //       continue;
  //     }
  //     // 检查日程是否存在，如果存在则删除日程
  //     const schedules = await wasV7Schedule.getAllScheduleList({
  //       calendar_id: userCalendar.calendar_id!,
  //       start_time: startDate,
  //       end_time: endDate
  //     });
  //     // 删除所有的日程
  //     for (const schedule of schedules) {
  //       success.push({
  //         name: userCalendar.name,
  //         title: schedule.summary,
  //         startTime: schedule.start_time.datetime,
  //         endTime: schedule.end_time.datetime,
  //         description: schedule.description
  //       });
  //     }
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }
  // console.log(success);
  // for (const student of students) {
  //   console.log(student);
  //   // 3. 从日历中删除日程
  //   try {
  //     // 获取教师的日历id
  //     const userCalendar = await userCalendarRepo.findByXgh(student.xh);
  //     if (!userCalendar) {
  //       continue;
  //     }
  //     // 检查日程是否存在，如果存在则删除日程
  //     const schedules = await wasV7Schedule.getAllScheduleList({
  //       calendar_id: userCalendar.calendar_id!,
  //       start_time: startDate,
  //       end_time: endDate
  //     });
  //     // 删除所有的日程
  //     for (const schedule of schedules) {
  //       if (schedule.summary === 'ACCA-审计与认证业务') {
  //         const t = tsuccess.get(student.xh);
  //         if (t) {
  //           t.push({
  //             name: userCalendar.name,
  //             title: schedule.summary,
  //             startTime: schedule.start_time.datetime,
  //             endTime: schedule.end_time.datetime,
  //             description: schedule.description
  //           });
  //         } else {
  //           tsuccess.set(student.xh, [
  //             {
  //               name: userCalendar.name,
  //               title: schedule.summary,
  //               startTime: schedule.start_time.datetime,
  //               endTime: schedule.end_time.datetime,
  //               description: schedule.description
  //             }
  //           ]);
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }
  // console.log(tsuccess);
  // for (const courseTask of aggregateTasks) {
  //   if (!courseTask.sj_f) {
  //     continue;
  //   }
  //   const startDate = formatToRFC3339(courseTask.rq, courseTask.sj_f);
  //   const teachers = await fullSyncService.getTeachersForCourse(courseTask);
  //   // 2. 获取课程的学生信息
  //   const students = await fullSyncService.getStudentsForCourse(
  //     courseTask.kkh,
  //     courseTask.xnxq
  //   );
  //   const error = [];
  //   const success = [];
  //   for (const teacher of teachers) {
  //     // 3. 从日历中删除日程
  //     try {
  //       // 获取教师的日历id
  //       const userCalendar = await userCalendarRepo.findByXgh(teacher.gh);
  //       if (!userCalendar) {
  //         error.push(teacher);
  //         continue;
  //       }
  //       // 检查日程是否存在，如果存在则删除日程
  //       const schedules = await wasV7Schedule.getAllScheduleList({
  //         calendar_id: userCalendar.calendar_id!,
  //         start_time: formatToRFC3339(courseTask.rq, courseTask.sj_f),
  //         end_time: formatToRFC3339(courseTask.rq, courseTask.sj_t)
  //       });
  //       // 删除所有的日程
  //       for (const schedule of schedules) {
  //         success.push({
  //           name: userCalendar.name,
  //           title: schedule.summary,
  //           startTime: schedule.start_time.datetime,
  //           endTime: schedule.start_time.datetime
  //         });
  //       }
  //     } catch (error) {
  //       console.error(error);
  //     }
  //   }
  //   for (const student of students) {
  //     console.log(student);
  //     // 3. 从日历中删除日程
  //     try {
  //       // 获取教师的日历id
  //       const userCalendar = await userCalendarRepo.findByXgh(student.xh);
  //       if (!userCalendar) {
  //         error.push(student);
  //         continue;
  //       }
  //       // 检查日程是否存在，如果存在则删除日程
  //       const schedules = await wasV7Schedule.getAllScheduleList({
  //         calendar_id: userCalendar.calendar_id!,
  //         start_time: formatToRFC3339(courseTask.rq, courseTask.sj_f),
  //         end_time: formatToRFC3339(courseTask.rq, courseTask.sj_t)
  //       });
  //       // 删除所有的日程
  //       for (const schedule of schedules) {
  //         success.push(schedule);
  //       }
  //     } catch (error) {
  //       console.error(error);
  //     }
  //   }
  // }
  try {
    const fullSyncService = app.tryResolve(
      'fullSyncService'
    ) as FullSyncService;
    // await fullSyncService.incremSyncc({
    //   xnxq: '2024-2025-2'
    // });
    // await fullSyncService.incremSyncc2({
    //   xnxq: '2024-2025-2'
    // });
    await fullSyncService.startFullSync({
      xnxq: '2024-2025-2'
    });
  } catch (error) {
    console.error(error);
  }
});
