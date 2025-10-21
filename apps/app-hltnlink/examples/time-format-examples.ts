// @wps/hltnlink 时间格式解析功能使用示例
// 展示parseDateTime方法对不同时间格式的支持

import type CalendarSyncService from '../src/services/CalendarSyncService.js';
import type { CourseScheduleData } from '../src/types/calendar-sync.js';

/**
 * 时间格式解析功能使用示例
 */
export async function timeFormatParsingExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('⏰ 开始时间格式解析功能示例...\n');

  // 示例1: HH:mm 格式（标准格式）
  console.log('📝 示例1: HH:mm 格式（标准格式）');
  const courseData1: CourseScheduleData = {
    courseSequence: 'CS101',
    courseName: '计算机科学导论',
    teacherName: '张教授',
    startTime: '19:40', // HH:mm 格式
    endTime: '21:10',   // HH:mm 格式
    weekday: '2',
    weeks: '1,4,7,10,13,16',
    classroom: '教学楼A101',
    semester: '2025-2026-1',
    batchId: 'batch-001'
  };

  const result1 = calendarSyncService.convertCourseToWpsSchedule(
    courseData1,
    'calendar-123'
  );

  const startDate1 = new Date(result1.startTime);
  const endDate1 = new Date(result1.endTime);

  console.log('✅ 转换结果:');
  console.log('  - 输入开始时间: 19:40');
  console.log('  - 解析后开始时间:', `${startDate1.getHours()}:${startDate1.getMinutes().toString().padStart(2, '0')}`);
  console.log('  - 输入结束时间: 21:10');
  console.log('  - 解析后结束时间:', `${endDate1.getHours()}:${endDate1.getMinutes().toString().padStart(2, '0')}`);
  console.log('  - ISO格式开始时间:', result1.startTime);

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例2: HHmm 格式（4位数字）
  console.log('📝 示例2: HHmm 格式（4位数字）');
  const courseData2: CourseScheduleData = {
    courseSequence: 'MATH201',
    courseName: '高等数学',
    teacherName: '李教授',
    startTime: '1940', // HHmm 格式
    endTime: '2110',   // HHmm 格式
    weekday: '1',
    weeks: '1-16',
    classroom: '教学楼B202',
    semester: '2025-2026-1',
    batchId: 'batch-002'
  };

  const result2 = calendarSyncService.convertCourseToWpsSchedule(
    courseData2,
    'calendar-456'
  );

  const startDate2 = new Date(result2.startTime);
  const endDate2 = new Date(result2.endTime);

  console.log('✅ 转换结果:');
  console.log('  - 输入开始时间: 1940 (HHmm格式)');
  console.log('  - 解析后开始时间:', `${startDate2.getHours()}:${startDate2.getMinutes().toString().padStart(2, '0')}`);
  console.log('  - 输入结束时间: 2110 (HHmm格式)');
  console.log('  - 解析后结束时间:', `${endDate2.getHours()}:${endDate2.getMinutes().toString().padStart(2, '0')}`);

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例3: Hmm 格式（3位数字）
  console.log('📝 示例3: Hmm 格式（3位数字）');
  const courseData3: CourseScheduleData = {
    courseSequence: 'PHY301',
    courseName: '大学物理',
    teacherName: '王教授',
    startTime: '940',  // Hmm 格式（09:40）
    endTime: '1120',   // HHmm 格式（11:20）
    weekday: '3',
    weeks: '1,3,5-8,10',
    classroom: '实验楼C301',
    semester: '2025-2026-1',
    batchId: 'batch-003'
  };

  const result3 = calendarSyncService.convertCourseToWpsSchedule(
    courseData3,
    'calendar-789'
  );

  const startDate3 = new Date(result3.startTime);
  const endDate3 = new Date(result3.endTime);

  console.log('✅ 转换结果:');
  console.log('  - 输入开始时间: 940 (Hmm格式，表示09:40)');
  console.log('  - 解析后开始时间:', `${startDate3.getHours()}:${startDate3.getMinutes().toString().padStart(2, '0')}`);
  console.log('  - 输入结束时间: 1120 (HHmm格式)');
  console.log('  - 解析后结束时间:', `${endDate3.getHours()}:${endDate3.getMinutes().toString().padStart(2, '0')}`);

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例4: 混合格式
  console.log('📝 示例4: 混合格式');
  const courseData4: CourseScheduleData = {
    courseSequence: 'ENG401',
    courseName: '大学英语',
    teacherName: '赵教授',
    startTime: '800',   // Hmm 格式（08:00）
    endTime: '09:40',   // HH:mm 格式
    weekday: '5',
    weeks: '2,4,6,8,10,12,14,16',
    classroom: '语言楼D401',
    semester: '2025-2026-2',
    batchId: 'batch-004'
  };

  const result4 = calendarSyncService.convertCourseToWpsSchedule(
    courseData4,
    'calendar-mixed'
  );

  const startDate4 = new Date(result4.startTime);
  const endDate4 = new Date(result4.endTime);

  console.log('✅ 转换结果:');
  console.log('  - 输入开始时间: 800 (Hmm格式，表示08:00)');
  console.log('  - 解析后开始时间:', `${startDate4.getHours()}:${startDate4.getMinutes().toString().padStart(2, '0')}`);
  console.log('  - 输入结束时间: 09:40 (HH:mm格式)');
  console.log('  - 解析后结束时间:', `${endDate4.getHours()}:${endDate4.getMinutes().toString().padStart(2, '0')}`);

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例5: 常见课程时间段
  console.log('📝 示例5: 常见课程时间段');
  const commonTimeSlots = [
    { start: '0800', end: '0940', name: '第1-2节课（上午）' },
    { start: '1000', end: '1140', name: '第3-4节课（上午）' },
    { start: '1400', end: '1540', name: '第5-6节课（下午）' },
    { start: '1600', end: '1740', name: '第7-8节课（下午）' },
    { start: '1940', end: '2110', name: '第9-10节课（晚上）' },
    { start: '2120', end: '2250', name: '第11-12节课（晚上）' }
  ];

  for (const slot of commonTimeSlots) {
    const testCourse: CourseScheduleData = {
      courseSequence: 'TEST',
      courseName: slot.name,
      teacherName: '测试教师',
      startTime: slot.start,
      endTime: slot.end,
      weekday: '1',
      weeks: '1,2,3',
      classroom: '测试教室',
      semester: '2025-2026-1',
      batchId: 'test'
    };

    const result = calendarSyncService.convertCourseToWpsSchedule(testCourse, 'test');
    const startDate = new Date(result.startTime);
    const endDate = new Date(result.endTime);

    const startTimeStr = `${startDate.getHours()}:${startDate.getMinutes().toString().padStart(2, '0')}`;
    const endTimeStr = `${endDate.getHours()}:${endDate.getMinutes().toString().padStart(2, '0')}`;

    console.log(`  - ${slot.name}: ${slot.start}-${slot.end} → ${startTimeStr}-${endTimeStr} ✓`);
  }

  console.log('\n🎉 时间格式解析功能示例完成！');
}

/**
 * 时间格式验证示例
 */
export async function timeFormatValidationExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('🔍 开始时间格式验证示例...\n');

  const testCases = [
    // 有效格式
    { format: 'HH:mm', examples: ['08:00', '19:40', '23:59', '00:00'] },
    { format: 'HHmm', examples: ['0800', '1940', '2359', '0000'] },
    { format: 'Hmm', examples: ['800', '940', '100', '159'] },
    
    // 无效格式（会使用降级处理）
    { format: '无效格式', examples: ['25:00', '12:60', '2500', 'invalid', ''] }
  ];

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.format} 格式测试:`);
    
    for (const timeExample of testCase.examples) {
      try {
        const courseData: CourseScheduleData = {
          courseSequence: 'TEST',
          courseName: '测试课程',
          teacherName: '测试教师',
          startTime: timeExample,
          endTime: '10:00', // 使用固定的有效结束时间
          weekday: '1',
          weeks: '1',
          classroom: '测试教室',
          semester: '2025-2026-1',
          batchId: 'test'
        };

        const result = calendarSyncService.convertCourseToWpsSchedule(courseData, 'test');
        const startDate = new Date(result.startTime);
        
        const parsedTime = `${startDate.getHours()}:${startDate.getMinutes().toString().padStart(2, '0')}`;
        
        if (testCase.format === '无效格式') {
          console.log(`  ❌ "${timeExample}" → ${parsedTime} (降级处理)`);
        } else {
          console.log(`  ✅ "${timeExample}" → ${parsedTime}`);
        }
      } catch (error) {
        console.log(`  ❌ "${timeExample}" → 解析失败: ${error}`);
      }
    }
    console.log('');
  }

  console.log('🔍 时间格式验证示例完成！');
}

/**
 * 时间格式性能测试示例
 */
export async function timeFormatPerformanceExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('⚡ 开始时间格式性能测试示例...\n');

  const testData = [
    { format: 'HH:mm', time: '19:40' },
    { format: 'HHmm', time: '1940' },
    { format: 'Hmm', time: '940' }
  ];

  const iterations = 1000;

  for (const test of testData) {
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const courseData: CourseScheduleData = {
        courseSequence: 'PERF_TEST',
        courseName: '性能测试',
        teacherName: '测试',
        startTime: test.time,
        endTime: test.time,
        weekday: '1',
        weeks: '1',
        classroom: '测试',
        semester: '2025-2026-1',
        batchId: 'perf'
      };

      calendarSyncService.convertCourseToWpsSchedule(courseData, 'perf');
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const avgTime = duration / iterations;

    console.log(`📊 ${test.format} 格式 (${test.time}):`);
    console.log(`  - 总时间: ${duration.toFixed(2)}ms`);
    console.log(`  - 平均时间: ${avgTime.toFixed(4)}ms/次`);
    console.log(`  - 处理速度: ${(iterations / (duration / 1000)).toFixed(0)} 次/秒\n`);
  }

  console.log('⚡ 时间格式性能测试示例完成！');
}

// 导出所有示例函数
export default {
  timeFormatParsingExample,
  timeFormatValidationExample,
  timeFormatPerformanceExample
};
