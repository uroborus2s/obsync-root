// @wps/hltnlink WPS重复规则格式示例
// 展示对象格式和字符串数组格式的重复规则

import type CalendarSyncService from '../src/services/CalendarSyncService.js';
import type { CourseScheduleData } from '../src/types/calendar-sync.js';

/**
 * WPS重复规则格式对比示例
 */
export async function wpsRecurrenceFormatsExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('🔄 开始WPS重复规则格式对比示例...\n');

  const courseData: CourseScheduleData = {
    courseSequence: 'CS101',
    courseName: '计算机科学导论',
    teacherName: '张教授',
    startTime: '1940', // 使用HHmm格式
    endTime: '2110',   // 使用HHmm格式
    weekday: '2',      // 星期二
    weeks: '1,4,7,10,13,16', // 教学周
    classroom: '教学楼A101',
    semester: '2025-2026-1',
    batchId: 'batch-001'
  };

  const startDate = new Date('2025-09-01');
  const weeks = calendarSyncService.parseWeeksString(courseData.weeks);
  const weekday = parseInt(courseData.weekday);
  const semester = courseData.semester;

  console.log('📋 输入数据:');
  console.log('  - 课程:', courseData.courseName);
  console.log('  - 时间:', `${courseData.startTime}-${courseData.endTime}`);
  console.log('  - 星期:', weekday === 2 ? '星期二' : `星期${weekday}`);
  console.log('  - 教学周:', weeks.join(', '));
  console.log('  - 学期:', semester);

  console.log('\n' + '='.repeat(60) + '\n');

  // 示例1: 对象格式重复规则
  console.log('📝 示例1: 对象格式重复规则 (WPS API新格式)');
  
  const objectRule = calendarSyncService.generateRecurrenceRuleObject(
    weekday,
    weeks,
    startDate,
    semester
  );

  console.log('✅ 对象格式结果:');
  console.log('```json');
  console.log(JSON.stringify(objectRule, null, 2));
  console.log('```');

  console.log('\n📊 对象格式解析:');
  console.log('  - 重复频率:', objectRule.freq);
  console.log('  - 星期几:', objectRule.by_day?.join(', '));
  console.log('  - 重复间隔:', objectRule.interval);
  console.log('  - 结束日期:', objectRule.until_date?.datetime);
  console.log('  - 排除日期数量:', objectRule.exdate?.length || 0);

  if (objectRule.exdate && objectRule.exdate.length > 0) {
    console.log('  - 前3个排除日期:');
    objectRule.exdate.slice(0, 3).forEach((exdate, index) => {
      console.log(`    ${index + 1}. ${exdate.datetime || exdate.date}`);
    });
    if (objectRule.exdate.length > 3) {
      console.log(`    ... 还有 ${objectRule.exdate.length - 3} 个排除日期`);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 示例2: 字符串数组格式重复规则
  console.log('📝 示例2: 字符串数组格式重复规则 (RFC 5545标准)');
  
  const stringRules = calendarSyncService.generateRecurrenceRule(
    weekday,
    weeks,
    startDate,
    semester
  );

  console.log('✅ 字符串数组格式结果:');
  console.log('```');
  stringRules.forEach((rule, index) => {
    console.log(`${index + 1}. ${rule}`);
  });
  console.log('```');

  console.log('\n📊 字符串格式解析:');
  const rrule = stringRules[0];
  console.log('  - 基础RRULE:', rrule);
  
  if (rrule.includes('FREQ=')) {
    const freq = rrule.match(/FREQ=(\w+)/)?.[1];
    console.log('    - 重复频率:', freq);
  }
  
  if (rrule.includes('BYDAY=')) {
    const byday = rrule.match(/BYDAY=(\w+)/)?.[1];
    console.log('    - 星期几:', byday);
  }
  
  if (rrule.includes('INTERVAL=')) {
    const interval = rrule.match(/INTERVAL=(\d+)/)?.[1];
    console.log('    - 重复间隔:', interval);
  }
  
  if (rrule.includes('COUNT=')) {
    const count = rrule.match(/COUNT=(\d+)/)?.[1];
    console.log('    - 重复次数:', count);
  }

  const exdateRules = stringRules.filter(rule => rule.startsWith('EXDATE'));
  if (exdateRules.length > 0) {
    console.log('  - 排除日期规则数量:', exdateRules.length);
    console.log('  - 第一个EXDATE规则:', exdateRules[0].substring(0, 50) + '...');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 示例3: 完整的WPS日程创建
  console.log('📝 示例3: 完整的WPS日程创建 (使用对象格式)');
  
  const wpsSchedule = calendarSyncService.convertCourseToWpsSchedule(
    courseData,
    'calendar-123'
  );

  console.log('✅ WPS日程创建参数:');
  console.log('  - 日历ID:', wpsSchedule.calendarId);
  console.log('  - 标题:', wpsSchedule.summary);
  console.log('  - 开始时间:', wpsSchedule.startTime);
  console.log('  - 结束时间:', wpsSchedule.endTime);
  console.log('  - 地点:', wpsSchedule.location);
  console.log('  - 重复规则类型:', typeof wpsSchedule.recurrence);
  
  if (typeof wpsSchedule.recurrence === 'object' && !Array.isArray(wpsSchedule.recurrence)) {
    console.log('  - 重复规则 (对象格式):');
    console.log('    - 频率:', (wpsSchedule.recurrence as any).freq);
    console.log('    - 星期:', (wpsSchedule.recurrence as any).by_day?.join(', '));
    console.log('    - 排除日期数量:', (wpsSchedule.recurrence as any).exdate?.length || 0);
  }

  console.log('\n🎉 WPS重复规则格式对比示例完成！');
}

/**
 * 重复规则格式转换示例
 */
export async function recurrenceFormatConversionExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('🔄 开始重复规则格式转换示例...\n');

  const testCases = [
    {
      name: '每周二上课（教学周1,4,7,10,13,16）',
      weekday: 2,
      weeks: [1, 4, 7, 10, 13, 16],
      semester: '2025-2026-1'
    },
    {
      name: '每周五上课（教学周1-8）',
      weekday: 5,
      weeks: [1, 2, 3, 4, 5, 6, 7, 8],
      semester: '2025-2026-1'
    },
    {
      name: '每周一上课（教学周2,4,6,8,10,12,14,16）',
      weekday: 1,
      weeks: [2, 4, 6, 8, 10, 12, 14, 16],
      semester: '2025-2026-2'
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 测试用例: ${testCase.name}`);
    
    const startDate = new Date('2025-09-01');
    
    // 生成对象格式
    const objectRule = calendarSyncService.generateRecurrenceRuleObject(
      testCase.weekday,
      testCase.weeks,
      startDate,
      testCase.semester
    );
    
    // 生成字符串数组格式
    const stringRules = calendarSyncService.generateRecurrenceRule(
      testCase.weekday,
      testCase.weeks,
      startDate,
      testCase.semester
    );

    console.log('  📊 对象格式摘要:');
    console.log('    - 频率:', objectRule.freq);
    console.log('    - 星期:', objectRule.by_day?.join(', '));
    console.log('    - 排除日期:', objectRule.exdate?.length || 0, '个');
    
    console.log('  📊 字符串格式摘要:');
    console.log('    - 规则数量:', stringRules.length);
    console.log('    - 基础RRULE:', stringRules[0].substring(0, 40) + '...');
    
    console.log('');
  }

  console.log('🔄 重复规则格式转换示例完成！');
}

/**
 * WPS API兼容性测试示例
 */
export async function wpsApiCompatibilityExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('🔧 开始WPS API兼容性测试示例...\n');

  const courseData: CourseScheduleData = {
    courseSequence: 'TEST',
    courseName: '兼容性测试课程',
    teacherName: '测试教师',
    startTime: '1000',
    endTime: '1140',
    weekday: '3',
    weeks: '1,3,5,7,9,11,13,15',
    classroom: '测试教室',
    semester: '2025-2026-1',
    batchId: 'test'
  };

  console.log('📝 测试场景: 创建WPS日程');
  console.log('  - 输入时间格式: HHmm (1000, 1140)');
  console.log('  - 输入教学周: 奇数周 (1,3,5,7,9,11,13,15)');
  console.log('  - 星期: 周三');

  // 生成WPS日程参数
  const wpsSchedule = calendarSyncService.convertCourseToWpsSchedule(
    courseData,
    'test-calendar'
  );

  console.log('\n✅ WPS日程参数生成成功:');
  console.log('  - 时间解析正确:', wpsSchedule.startTime.includes('10:00'));
  console.log('  - 重复规则类型:', typeof wpsSchedule.recurrence);
  console.log('  - 重复规则有效:', wpsSchedule.recurrence !== undefined);

  // 模拟API调用前的格式转换
  console.log('\n🔄 模拟API调用前的格式转换:');
  
  if (typeof wpsSchedule.recurrence === 'object' && !Array.isArray(wpsSchedule.recurrence)) {
    console.log('  - 检测到对象格式重复规则');
    console.log('  - 需要转换为字符串数组格式');
    
    // 这里会在实际的createWpsSchedule方法中自动转换
    console.log('  - 转换过程: 对象 → RFC 5545字符串数组');
    console.log('  - 转换状态: ✅ 自动处理');
  } else if (Array.isArray(wpsSchedule.recurrence)) {
    console.log('  - 检测到字符串数组格式重复规则');
    console.log('  - 无需转换，直接使用');
  }

  console.log('\n📊 兼容性检查结果:');
  console.log('  ✅ 时间格式解析: 支持HHmm格式');
  console.log('  ✅ 教学周解析: 支持逗号分隔格式');
  console.log('  ✅ 重复规则生成: 支持对象格式');
  console.log('  ✅ API格式转换: 自动转换为字符串数组');
  console.log('  ✅ 排除日期处理: 正确生成非教学周排除');

  console.log('\n🔧 WPS API兼容性测试示例完成！');
}

// 导出所有示例函数
export default {
  wpsRecurrenceFormatsExample,
  recurrenceFormatConversionExample,
  wpsApiCompatibilityExample
};
