// @wps/hltnlink 日期时间计算示例
// 展示新的时间计算逻辑和RFC3339格式支持

import type CalendarSyncService from '../src/services/CalendarSyncService.js';
import type { CourseScheduleData } from '../src/types/calendar-sync.js';

/**
 * 日期时间计算示例
 */
export async function dateTimeCalculationExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('📅 开始日期时间计算示例...\n');

  const courseData: CourseScheduleData = {
    courseSequence: 'CS101',
    courseName: '计算机科学导论',
    teacherName: '张教授',
    startTime: '1940', // 19:40开始
    endTime: '2110',   // 21:10结束
    weekday: '2',      // 星期二
    weeks: '4,7,10,13,16', // 教学周：第4,7,10,13,16周
    classroom: '教学楼A101',
    semester: '2025-2026-1',
    batchId: 'example'
  };

  console.log('📋 输入数据:');
  console.log('  - 课程:', courseData.courseName);
  console.log('  - 时间:', `${courseData.startTime}-${courseData.endTime} (HHmm格式)`);
  console.log('  - 星期:', '星期二');
  console.log('  - 教学周:', courseData.weeks);
  console.log('  - 学期:', courseData.semester);

  console.log('\n' + '='.repeat(60) + '\n');

  // 转换为WPS日程格式
  const wpsSchedule = calendarSyncService.convertCourseToWpsSchedule(
    courseData,
    'example-calendar'
  );

  console.log('📝 WPS日程转换结果:');
  console.log('✅ 开始时间:', wpsSchedule.startTime);
  console.log('✅ 结束时间:', wpsSchedule.endTime);
  
  // 验证RFC3339格式
  const rfc3339Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
  console.log('✅ 开始时间格式正确:', rfc3339Regex.test(wpsSchedule.startTime));
  console.log('✅ 结束时间格式正确:', rfc3339Regex.test(wpsSchedule.endTime));
  
  // 解析时间信息
  const startDate = new Date(wpsSchedule.startTime);
  const endDate = new Date(wpsSchedule.endTime);
  
  console.log('\n📊 时间解析结果:');
  console.log('  - 开始日期:', startDate.toLocaleDateString('zh-CN'));
  console.log('  - 开始时间:', startDate.toLocaleTimeString('zh-CN'));
  console.log('  - 结束日期:', endDate.toLocaleDateString('zh-CN'));
  console.log('  - 结束时间:', endDate.toLocaleTimeString('zh-CN'));
  console.log('  - 是否同一天:', startDate.toDateString() === endDate.toDateString());

  // 检查重复规则中的until_date
  const recurrence = wpsSchedule.recurrence as any;
  if (recurrence.until_date) {
    console.log('\n🔄 重复规则信息:');
    console.log('  - until_date:', recurrence.until_date.datetime);
    console.log('  - until_date格式正确:', rfc3339Regex.test(recurrence.until_date.datetime));
    
    const untilDate = new Date(recurrence.until_date.datetime);
    console.log('  - 结束日期:', untilDate.toLocaleDateString('zh-CN'));
    console.log('  - 结束时间:', untilDate.toLocaleTimeString('zh-CN'));
    
    // 验证until_date是最后一个教学周的结束时间
    console.log('  - 结束时间是21:10:', untilDate.getHours() === 21 && untilDate.getMinutes() === 10);
  }

  console.log('\n📅 日期时间计算示例完成！');
}

/**
 * 不同教学周起始的时间计算示例
 */
export async function differentWeekStartExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('📅 开始不同教学周起始的时间计算示例...\n');

  const testCases = [
    {
      name: '第1周开始的课程',
      weeks: '1,2,3,4,5',
      expectedStartWeek: 1
    },
    {
      name: '第4周开始的课程',
      weeks: '4,7,10,13,16',
      expectedStartWeek: 4
    },
    {
      name: '第8周开始的课程',
      weeks: '8,9,10,11,12',
      expectedStartWeek: 8
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 测试用例: ${testCase.name}`);
    
    const courseData: CourseScheduleData = {
      courseSequence: 'TEST',
      courseName: testCase.name,
      teacherName: '测试教师',
      startTime: '1000', // 10:00
      endTime: '1140',   // 11:40
      weekday: '1',      // 星期一
      weeks: testCase.weeks,
      classroom: '测试教室',
      semester: '2025-2026-1',
      batchId: 'test'
    };

    const result = calendarSyncService.convertCourseToWpsSchedule(
      courseData,
      'test-calendar'
    );

    const startDate = new Date(result.startTime);
    
    // 计算是第几周
    const semesterStart = new Date('2025-09-01'); // 学期开始日期
    const weekNumber = Math.floor((startDate.getTime() - semesterStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    
    console.log('  ✅ 开始时间:', result.startTime);
    console.log('  ✅ 计算的周次:', weekNumber);
    console.log('  ✅ 预期周次:', testCase.expectedStartWeek);
    console.log('  ✅ 周次正确:', Math.abs(weekNumber - testCase.expectedStartWeek) <= 1); // 允许1周误差
    console.log('');
  }

  console.log('📅 不同教学周起始的时间计算示例完成！');
}

/**
 * 时间格式兼容性示例
 */
export async function timeFormatCompatibilityExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('🕐 开始时间格式兼容性示例...\n');

  const timeFormats = [
    { name: 'HH:mm格式', start: '19:40', end: '21:10' },
    { name: 'HHmm格式', start: '1940', end: '2110' },
    { name: 'Hmm格式', start: '940', end: '1110' },
    { name: '混合格式', start: '08:00', end: '940' }
  ];

  for (const format of timeFormats) {
    console.log(`📋 测试格式: ${format.name}`);
    
    const courseData: CourseScheduleData = {
      courseSequence: 'TIME_TEST',
      courseName: `时间格式测试-${format.name}`,
      teacherName: '测试教师',
      startTime: format.start,
      endTime: format.end,
      weekday: '3', // 星期三
      weeks: '1,2,3',
      classroom: '测试教室',
      semester: '2025-2026-1',
      batchId: 'time-test'
    };

    const result = calendarSyncService.convertCourseToWpsSchedule(
      courseData,
      'time-test-calendar'
    );

    const startDate = new Date(result.startTime);
    const endDate = new Date(result.endTime);
    
    console.log('  ✅ 输入:', `${format.start} - ${format.end}`);
    console.log('  ✅ 输出开始时间:', result.startTime);
    console.log('  ✅ 输出结束时间:', result.endTime);
    console.log('  ✅ 解析开始时间:', `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`);
    console.log('  ✅ 解析结束时间:', `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`);
    console.log('  ✅ RFC3339格式:', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(result.startTime));
    console.log('  ✅ 时区正确:', result.startTime.includes('+08:00'));
    console.log('');
  }

  console.log('🕐 时间格式兼容性示例完成！');
}

/**
 * 学期日期计算示例
 */
export async function semesterDateCalculationExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('📚 开始学期日期计算示例...\n');

  const semesters = [
    { code: '2024-2025-1', name: '2024-2025学年第一学期（秋季）' },
    { code: '2024-2025-2', name: '2024-2025学年第二学期（春季）' },
    { code: '2025-2026-1', name: '2025-2026学年第一学期（秋季）' },
    { code: '2025-2026-2', name: '2025-2026学年第二学期（春季）' }
  ];

  for (const semester of semesters) {
    console.log(`📋 学期: ${semester.name}`);
    
    const courseData: CourseScheduleData = {
      courseSequence: 'SEM_TEST',
      courseName: '学期测试课程',
      teacherName: '测试教师',
      startTime: '1400',
      endTime: '1530',
      weekday: '4', // 星期四
      weeks: '1,2,3',
      classroom: '测试教室',
      semester: semester.code,
      batchId: 'semester-test'
    };

    const result = calendarSyncService.convertCourseToWpsSchedule(
      courseData,
      'semester-test-calendar'
    );

    const startDate = new Date(result.startTime);
    
    console.log('  ✅ 学期代码:', semester.code);
    console.log('  ✅ 第1周开始时间:', result.startTime);
    console.log('  ✅ 开始日期:', startDate.toLocaleDateString('zh-CN'));
    console.log('  ✅ 开始月份:', startDate.getMonth() + 1);
    console.log('  ✅ 是否秋季学期:', semester.code.endsWith('-1'));
    console.log('  ✅ 是否春季学期:', semester.code.endsWith('-2'));
    console.log('');
  }

  console.log('📚 学期日期计算示例完成！');
}

// 导出所有示例函数
export default {
  dateTimeCalculationExample,
  differentWeekStartExample,
  timeFormatCompatibilityExample,
  semesterDateCalculationExample
};
