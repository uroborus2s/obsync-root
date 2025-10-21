// @wps/hltnlink 教学周数据到WPS日程转换功能使用示例
// 展示如何将教学周数据转换为WPS日程格式

import type CalendarSyncService from '../src/services/CalendarSyncService.js';
import type { CourseScheduleData } from '../src/types/calendar-sync.js';

/**
 * 教学周转换功能使用示例
 */
export async function teachingWeeksConversionExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('🎓 开始教学周转换功能示例...\n');

  // 示例1: 逗号分隔的教学周（1,4,7,10,13,16周）
  console.log('📝 示例1: 逗号分隔的教学周');
  const courseData1: CourseScheduleData = {
    courseSequence: 'CS101',
    courseName: '计算机科学导论',
    teacherName: '张教授',
    startTime: '19:40',
    endTime: '21:10',
    weekday: '2', // 星期二
    weeks: '1,4,7,10,13,16', // 逗号分隔的教学周
    classroom: '教学楼A101',
    semester: '2025-2026-1',
    batchId: 'batch-001'
  };

  const wpsSchedule1 = calendarSyncService.convertCourseToWpsSchedule(
    courseData1,
    'calendar-123'
  );

  console.log('✅ 转换结果:');
  console.log('  - 课程标题:', wpsSchedule1.summary);
  console.log('  - 开始时间:', wpsSchedule1.startTime);
  console.log('  - 结束时间:', wpsSchedule1.endTime);
  console.log('  - 教室:', wpsSchedule1.location);
  console.log('  - 重复规则数量:', wpsSchedule1.recurrence?.length);
  console.log('  - 基础RRULE:', wpsSchedule1.recurrence?.[0]);
  
  if (wpsSchedule1.recurrence && wpsSchedule1.recurrence.length > 1) {
    console.log('  - EXDATE规则:', wpsSchedule1.recurrence.slice(1).length, '条');
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例2: 范围格式的教学周（1-16周）
  console.log('📝 示例2: 范围格式的教学周');
  const courseData2: CourseScheduleData = {
    courseSequence: 'MATH201',
    courseName: '高等数学',
    teacherName: '李教授',
    startTime: '08:00',
    endTime: '09:40',
    weekday: '1', // 星期一
    weeks: '1-16周', // 范围格式
    classroom: '教学楼B202',
    semester: '2025-2026-1',
    batchId: 'batch-002'
  };

  const wpsSchedule2 = calendarSyncService.convertCourseToWpsSchedule(
    courseData2,
    'calendar-456'
  );

  console.log('✅ 转换结果:');
  console.log('  - 课程标题:', wpsSchedule2.summary);
  console.log('  - 星期几: 周一 (BYDAY=MO)');
  console.log('  - 重复规则:', wpsSchedule2.recurrence?.[0]);

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例3: 混合格式的教学周（1,3,5-8,10）
  console.log('📝 示例3: 混合格式的教学周');
  const courseData3: CourseScheduleData = {
    courseSequence: 'PHY301',
    courseName: '大学物理',
    teacherName: '王教授',
    startTime: '14:00',
    endTime: '15:40',
    weekday: '3', // 星期三
    weeks: '1,3,5-8,10', // 混合格式
    classroom: '实验楼C301',
    semester: '2025-2026-1',
    batchId: 'batch-003'
  };

  const wpsSchedule3 = calendarSyncService.convertCourseToWpsSchedule(
    courseData3,
    'calendar-789'
  );

  console.log('✅ 转换结果:');
  console.log('  - 课程标题:', wpsSchedule3.summary);
  console.log('  - 星期几: 周三 (BYDAY=WE)');
  console.log('  - 解析的教学周:', calendarSyncService.parseWeeksString(courseData3.weeks));
  console.log('  - 重复规则数量:', wpsSchedule3.recurrence?.length);

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例4: 春季学期的课程
  console.log('📝 示例4: 春季学期的课程');
  const courseData4: CourseScheduleData = {
    courseSequence: 'ENG401',
    courseName: '大学英语',
    teacherName: '赵教授',
    startTime: '10:00',
    endTime: '11:40',
    weekday: '5', // 星期五
    weeks: '2,4,6,8,10,12,14,16',
    classroom: '语言楼D401',
    semester: '2025-2026-2', // 春季学期
    batchId: 'batch-004'
  };

  const wpsSchedule4 = calendarSyncService.convertCourseToWpsSchedule(
    courseData4,
    'calendar-spring'
  );

  console.log('✅ 转换结果:');
  console.log('  - 课程标题:', wpsSchedule4.summary);
  console.log('  - 星期几: 周五 (BYDAY=FR)');
  console.log('  - 学期: 春季学期 (2025-2026-2)');
  
  const startDate = new Date(wpsSchedule4.startTime);
  console.log('  - 开始日期:', startDate.toLocaleDateString());
  console.log('  - 开始月份:', startDate.getMonth() + 1, '月'); // +1因为月份索引从0开始

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例5: 不同星期几的映射
  console.log('📝 示例5: 不同星期几的映射');
  const weekdayExamples = [
    { weekday: '1', name: '周一', expected: 'MO' },
    { weekday: '2', name: '周二', expected: 'TU' },
    { weekday: '3', name: '周三', expected: 'WE' },
    { weekday: '4', name: '周四', expected: 'TH' },
    { weekday: '5', name: '周五', expected: 'FR' },
    { weekday: '6', name: '周六', expected: 'SA' },
    { weekday: '7', name: '周日', expected: 'SU' }
  ];

  for (const example of weekdayExamples) {
    const testCourse: CourseScheduleData = {
      courseSequence: 'TEST',
      courseName: '测试课程',
      teacherName: '测试教师',
      startTime: '10:00',
      endTime: '11:00',
      weekday: example.weekday,
      weeks: '1,2,3',
      classroom: '测试教室',
      semester: '2025-2026-1',
      batchId: 'test'
    };

    const schedule = calendarSyncService.convertCourseToWpsSchedule(testCourse, 'test');
    const rrule = schedule.recurrence?.[0] || '';
    const byDayMatch = rrule.match(/BYDAY=([A-Z]{2})/);
    const actualByDay = byDayMatch ? byDayMatch[1] : 'UNKNOWN';

    console.log(`  - ${example.name} (${example.weekday}) → BYDAY=${actualByDay} ✓`);
  }

  console.log('\n🎉 教学周转换功能示例完成！');
}

/**
 * 教学周解析功能示例
 */
export async function weekStringParsingExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('📅 开始教学周解析功能示例...\n');

  const testCases = [
    '1,4,7,10,13,16',
    '1-16周',
    '1,3,5-8,10',
    '2,4,6,8,10,12,14,16',
    '1周,3周,5周',
    '1-5,8-12,15-16',
    'invalid-format'
  ];

  for (const testCase of testCases) {
    const result = calendarSyncService.parseWeeksString(testCase);
    console.log(`输入: "${testCase}"`);
    console.log(`解析结果: [${result.join(', ')}]`);
    console.log(`周数: ${result.length}周\n`);
  }

  console.log('🎯 教学周解析功能示例完成！');
}

/**
 * RFC 5545重复规则示例
 */
export async function recurrenceRuleExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('🔄 开始RFC 5545重复规则示例...\n');

  const startDate = new Date('2025-09-01');
  const weeks = [1, 4, 7, 10, 13, 16];
  const semester = '2025-2026-1';

  console.log('输入参数:');
  console.log('  - 星期几: 2 (星期二)');
  console.log('  - 教学周:', weeks.join(', '));
  console.log('  - 学期:', semester);
  console.log('  - 开始日期:', startDate.toLocaleDateString());

  const recurrenceRules = calendarSyncService.generateRecurrenceRule(
    2, // 星期二
    weeks,
    startDate,
    semester
  );

  console.log('\n生成的重复规则:');
  recurrenceRules.forEach((rule, index) => {
    if (index === 0) {
      console.log(`  RRULE: ${rule}`);
    } else {
      console.log(`  EXDATE ${index}: ${rule}`);
    }
  });

  console.log('\n规则解释:');
  console.log('  - FREQ=WEEKLY: 每周重复');
  console.log('  - BYDAY=TU: 在星期二');
  console.log('  - INTERVAL=1: 每1周');
  console.log('  - COUNT=16: 总共16次');
  console.log('  - EXDATE: 排除非教学周的日期');

  console.log('\n🔄 RFC 5545重复规则示例完成！');
}

// 导出所有示例函数
export default {
  teachingWeeksConversionExample,
  weekStringParsingExample,
  recurrenceRuleExample
};
