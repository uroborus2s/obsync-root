// @wps/hltnlink DJZ字段（教学周）逻辑示例
// 展示正确的DJZ字段解析、until_date计算和排除日期生成

import type CalendarSyncService from '../src/services/CalendarSyncService.js';
import type { CourseScheduleData } from '../src/types/calendar-sync.js';

/**
 * DJZ字段逻辑详解示例
 */
export async function djzLogicDetailExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('📚 开始DJZ字段逻辑详解示例...\n');

  const courseData: CourseScheduleData = {
    courseSequence: 'CS101',
    courseName: '计算机科学导论',
    teacherName: '张教授',
    startTime: '1940', // KSSJ：19:40开始
    endTime: '2110',   // JSSJ：21:10结束
    weekday: '2',      // XQJ：星期二
    weeks: '1,4,7,10,13,16', // DJZ：教学周
    classroom: '教学楼A101',
    semester: '2025-2026-1',
    batchId: 'djz-example'
  };

  console.log('📋 输入数据解析:');
  console.log('  - DJZ字段:', courseData.weeks);
  console.log('  - KSSJ（开始时间）:', courseData.startTime);
  console.log('  - JSSJ（结束时间）:', courseData.endTime);
  console.log('  - XQJ（星期几）:', courseData.weekday, '(星期二)');

  // 解析DJZ字段
  const weeks = calendarSyncService.parseWeeksString(courseData.weeks);
  console.log('\n🔍 DJZ字段解析结果:');
  console.log('  - 教学周数组:', weeks);
  console.log('  - 第一周:', Math.min(...weeks));
  console.log('  - 最后一周:', Math.max(...weeks));
  console.log('  - 总教学周数:', weeks.length);

  // 计算非教学周
  const allWeeks = Array.from({length: Math.max(...weeks)}, (_, i) => i + 1);
  const nonTeachingWeeks = allWeeks.filter(week => !weeks.includes(week));
  console.log('  - 非教学周:', nonTeachingWeeks);

  console.log('\n' + '='.repeat(60) + '\n');

  // 转换为WPS日程格式
  const wpsSchedule = calendarSyncService.convertCourseToWpsSchedule(
    courseData,
    'djz-example-calendar'
  );

  console.log('📝 WPS日程转换结果:');
  
  // 解析开始时间和结束时间
  const startDate = new Date(wpsSchedule.startTime);
  const endDate = new Date(wpsSchedule.endTime);
  
  console.log('✅ 开始时间计算:');
  console.log('  - 基准: 第', Math.min(...weeks), '周星期二');
  console.log('  - 时间: KSSJ =', courseData.startTime, '→ 19:40');
  console.log('  - 结果:', wpsSchedule.startTime);
  console.log('  - 解析:', startDate.toLocaleString('zh-CN'));

  console.log('✅ 结束时间计算:');
  console.log('  - 基准: 第', Math.min(...weeks), '周星期二');
  console.log('  - 时间: JSSJ =', courseData.endTime, '→ 21:10');
  console.log('  - 结果:', wpsSchedule.endTime);
  console.log('  - 解析:', endDate.toLocaleString('zh-CN'));

  const recurrence = wpsSchedule.recurrence as any;
  
  console.log('✅ until_date计算:');
  console.log('  - 基准: 第', Math.max(...weeks), '周星期二（最后一个教学周）');
  console.log('  - 时间: JSSJ =', courseData.endTime, '→ 21:10');
  console.log('  - 结果:', recurrence.until_date.datetime);
  
  const untilDate = new Date(recurrence.until_date.datetime);
  console.log('  - 解析:', untilDate.toLocaleString('zh-CN'));

  console.log('✅ 排除日期计算:');
  console.log('  - 排除周次:', nonTeachingWeeks);
  console.log('  - 排除日期数量:', recurrence.exdate.length);
  console.log('  - 每个排除日期的时间: KSSJ =', courseData.startTime, '→ 19:40');
  
  if (recurrence.exdate.length > 0) {
    console.log('  - 前3个排除日期:');
    recurrence.exdate.slice(0, 3).forEach((exdate: any, index: number) => {
      const excludeDate = new Date(exdate.datetime);
      console.log(`    ${index + 1}. ${exdate.datetime} (${excludeDate.toLocaleString('zh-CN')})`);
    });
    if (recurrence.exdate.length > 3) {
      console.log(`    ... 还有 ${recurrence.exdate.length - 3} 个排除日期`);
    }
  }

  console.log('\n📚 DJZ字段逻辑详解示例完成！');
}

/**
 * 不同DJZ格式对比示例
 */
export async function djzFormatComparisonExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('📊 开始不同DJZ格式对比示例...\n');

  const testCases = [
    {
      name: '间隔教学周',
      djz: '1,4,7,10,13,16',
      description: '每3周上一次课'
    },
    {
      name: '连续教学周',
      djz: '1-8',
      description: '前8周连续上课'
    },
    {
      name: '奇数周',
      djz: '1,3,5,7,9,11,13,15',
      description: '奇数周上课'
    },
    {
      name: '偶数周',
      djz: '2,4,6,8,10,12,14,16',
      description: '偶数周上课'
    },
    {
      name: '混合格式',
      djz: '1,3,5-8,10,12-16',
      description: '混合格式教学周'
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}: ${testCase.description}`);
    console.log(`   DJZ字段: ${testCase.djz}`);
    
    const weeks = calendarSyncService.parseWeeksString(testCase.djz);
    console.log(`   解析结果: [${weeks.join(', ')}]`);
    console.log(`   第一周: ${Math.min(...weeks)}, 最后一周: ${Math.max(...weeks)}`);
    
    const courseData: CourseScheduleData = {
      courseSequence: 'COMPARE',
      courseName: testCase.name,
      teacherName: '测试教师',
      startTime: '1000',
      endTime: '1140',
      weekday: '1',
      weeks: testCase.djz,
      classroom: '测试教室',
      semester: '2025-2026-1',
      batchId: 'compare'
    };

    const result = calendarSyncService.convertCourseToWpsSchedule(
      courseData,
      'compare-calendar'
    );

    const recurrence = result.recurrence as any;
    const untilDate = new Date(recurrence.until_date.datetime);
    
    console.log(`   until_date: 第${Math.max(...weeks)}周 → ${untilDate.toLocaleDateString('zh-CN')}`);
    console.log(`   排除日期数量: ${recurrence.exdate?.length || 0}`);
    console.log('');
  }

  console.log('📊 不同DJZ格式对比示例完成！');
}

/**
 * DJZ逻辑验证示例
 */
export async function djzLogicValidationExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('🔍 开始DJZ逻辑验证示例...\n');

  const courseData: CourseScheduleData = {
    courseSequence: 'VALIDATION',
    courseName: 'DJZ逻辑验证课程',
    teacherName: '验证教师',
    startTime: '1400', // 14:00开始
    endTime: '1530',   // 15:30结束
    weekday: '3',      // 星期三
    weeks: '1,4,7,10,13,16', // DJZ字段
    classroom: '验证教室',
    semester: '2025-2026-1',
    batchId: 'validation'
  };

  console.log('🎯 验证目标:');
  console.log('  1. until_date应该是第16周星期三15:30');
  console.log('  2. 排除日期应该是第2,3,5,6,8,9,11,12,14,15周星期三14:00');
  console.log('  3. 开始时间应该是第1周星期三14:00');
  console.log('  4. 结束时间应该是第1周星期三15:30');

  const result = calendarSyncService.convertCourseToWpsSchedule(
    courseData,
    'validation-calendar'
  );

  console.log('\n✅ 验证结果:');
  
  // 验证1: until_date
  const recurrence = result.recurrence as any;
  const untilDate = new Date(recurrence.until_date.datetime);
  console.log('1. until_date验证:');
  console.log(`   期望: 第16周星期三15:30`);
  console.log(`   实际: ${recurrence.until_date.datetime}`);
  console.log(`   解析: ${untilDate.toLocaleString('zh-CN')}`);
  console.log(`   ✓ 时间正确: ${untilDate.getHours() === 15 && untilDate.getMinutes() === 30}`);
  console.log(`   ✓ 星期正确: ${untilDate.getDay() === 3} (星期三)`);

  // 验证2: 排除日期
  console.log('\n2. 排除日期验证:');
  console.log(`   期望排除周次: [2,3,5,6,8,9,11,12,14,15]`);
  console.log(`   实际排除数量: ${recurrence.exdate.length}`);
  console.log(`   ✓ 数量正确: ${recurrence.exdate.length === 10}`);
  
  if (recurrence.exdate.length > 0) {
    const firstExclude = new Date(recurrence.exdate[0].datetime);
    console.log(`   第一个排除日期: ${recurrence.exdate[0].datetime}`);
    console.log(`   解析: ${firstExclude.toLocaleString('zh-CN')}`);
    console.log(`   ✓ 时间正确: ${firstExclude.getHours() === 14 && firstExclude.getMinutes() === 0}`);
    console.log(`   ✓ 星期正确: ${firstExclude.getDay() === 3} (星期三)`);
  }

  // 验证3: 开始时间
  const startDate = new Date(result.startTime);
  console.log('\n3. 开始时间验证:');
  console.log(`   期望: 第1周星期三14:00`);
  console.log(`   实际: ${result.startTime}`);
  console.log(`   解析: ${startDate.toLocaleString('zh-CN')}`);
  console.log(`   ✓ 时间正确: ${startDate.getHours() === 14 && startDate.getMinutes() === 0}`);
  console.log(`   ✓ 星期正确: ${startDate.getDay() === 3} (星期三)`);

  // 验证4: 结束时间
  const endDate = new Date(result.endTime);
  console.log('\n4. 结束时间验证:');
  console.log(`   期望: 第1周星期三15:30`);
  console.log(`   实际: ${result.endTime}`);
  console.log(`   解析: ${endDate.toLocaleString('zh-CN')}`);
  console.log(`   ✓ 时间正确: ${endDate.getHours() === 15 && endDate.getMinutes() === 30}`);
  console.log(`   ✓ 星期正确: ${endDate.getDay() === 3} (星期三)`);
  console.log(`   ✓ 同一天: ${startDate.toDateString() === endDate.toDateString()}`);

  console.log('\n🔍 DJZ逻辑验证示例完成！');
}

/**
 * 边界情况测试示例
 */
export async function djzBoundaryCasesExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('🚧 开始DJZ边界情况测试示例...\n');

  const testCases = [
    {
      name: '单周课程',
      djz: '8',
      description: '只有第8周上课'
    },
    {
      name: '最后一周',
      djz: '20',
      description: '只有第20周上课'
    },
    {
      name: '前两周',
      djz: '1,2',
      description: '只有前两周上课'
    },
    {
      name: '最后两周',
      djz: '19,20',
      description: '只有最后两周上课'
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}: ${testCase.description}`);
    
    const courseData: CourseScheduleData = {
      courseSequence: 'BOUNDARY',
      courseName: testCase.name,
      teacherName: '边界测试教师',
      startTime: '0800',
      endTime: '0940',
      weekday: '5', // 星期五
      weeks: testCase.djz,
      classroom: '边界测试教室',
      semester: '2025-2026-1',
      batchId: 'boundary'
    };

    const result = calendarSyncService.convertCourseToWpsSchedule(
      courseData,
      'boundary-calendar'
    );

    const weeks = calendarSyncService.parseWeeksString(testCase.djz);
    const recurrence = result.recurrence as any;
    const untilDate = new Date(recurrence.until_date.datetime);
    
    console.log(`   教学周: [${weeks.join(', ')}]`);
    console.log(`   until_date: 第${Math.max(...weeks)}周 → ${untilDate.toLocaleDateString('zh-CN')}`);
    console.log(`   排除日期数量: ${recurrence.exdate?.length || 0}`);
    console.log(`   ✓ until_date正确: ${untilDate.getHours() === 9 && untilDate.getMinutes() === 40}`);
    console.log('');
  }

  console.log('🚧 DJZ边界情况测试示例完成！');
}

// 导出所有示例函数
export default {
  djzLogicDetailExample,
  djzFormatComparisonExample,
  djzLogicValidationExample,
  djzBoundaryCasesExample
};
