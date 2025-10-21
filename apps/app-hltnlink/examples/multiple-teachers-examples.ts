// @wps/hltnlink 多个教师工号处理示例
// 展示如何处理包含多个教师工号的课程数据

import type CalendarSyncService from '../src/services/CalendarSyncService.js';
import type { CourseScheduleData } from '../src/types/calendar-sync.js';

/**
 * 多个教师工号处理示例
 */
export async function multipleTeachersExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('👥 开始多个教师工号处理示例...\n');

  // 示例1: 单个教师工号
  const singleTeacherCourse: CourseScheduleData = {
    courseSequence: 'CS101',
    courseName: '计算机科学导论',
    teacherName: '张教授',
    teacherCode: '0154', // 单个教师工号
    startTime: '0800',
    endTime: '0940',
    weekday: '1',
    weeks: '1-8',
    classroom: '教学楼A101',
    semester: '2025-2026-1',
    batchId: 'single-teacher'
  };

  // 示例2: 多个教师工号（逗号分隔）
  const multipleTeachersCourse: CourseScheduleData = {
    courseSequence: 'MATH201',
    courseName: '高等数学（合班）',
    teacherName: '李教授',
    teacherCode: '0154,0326,0789', // 多个教师工号
    startTime: '1000',
    endTime: '1140',
    weekday: '2',
    weeks: '1-16',
    classroom: '大礼堂',
    semester: '2025-2026-1',
    batchId: 'multiple-teachers'
  };

  // 示例3: 包含空格的多个教师工号
  const spacedTeachersCourse: CourseScheduleData = {
    courseSequence: 'PHY301',
    courseName: '大学物理实验',
    teacherName: '王教授',
    teacherCode: ' 0154 , 0326 , 0789 ', // 包含空格的多个工号
    startTime: '1400',
    endTime: '1530',
    weekday: '3',
    weeks: '1-8',
    classroom: '物理实验室',
    semester: '2025-2026-1',
    batchId: 'spaced-teachers'
  };

  console.log('📋 课程数据示例:');
  console.log('\n1. 单个教师工号:');
  console.log('   课程:', singleTeacherCourse.courseName);
  console.log('   教师工号:', `"${singleTeacherCourse.teacherCode}"`);
  console.log('   解析结果: ["0154"]');
  console.log('   参与者数量: 1个');

  console.log('\n2. 多个教师工号（逗号分隔）:');
  console.log('   课程:', multipleTeachersCourse.courseName);
  console.log('   教师工号:', `"${multipleTeachersCourse.teacherCode}"`);
  console.log('   解析结果: ["0154", "0326", "0789"]');
  console.log('   参与者数量: 3个');

  console.log('\n3. 包含空格的多个教师工号:');
  console.log('   课程:', spacedTeachersCourse.courseName);
  console.log('   教师工号:', `"${spacedTeachersCourse.teacherCode}"`);
  console.log('   解析结果: ["0154", "0326", "0789"] (自动去除空格)');
  console.log('   参与者数量: 3个');

  console.log('\n🔄 处理流程详解:');
  
  console.log('\n步骤1: 解析教师工号字符串');
  console.log('  teacherCode.split(",")           // 按逗号分割');
  console.log('  .map(code => code.trim())        // 去除空格');
  console.log('  .filter(code => code.length > 0) // 过滤空字符串');

  console.log('\n步骤2: 为每个工号创建参与者对象');
  console.log('  teacherCodes.map(code => ({');
  console.log('    type: "user",');
  console.log('    user_id: code,                 // 使用具体的教师工号');
  console.log('    display_name: teacherName,     // 所有工号使用相同的教师姓名');
  console.log('    response_status: "needsAction",');
  console.log('    optional: false');
  console.log('  }))');

  console.log('\n步骤3: 批量添加参与者');
  console.log('  POST /v7/calendars/{calendar_id}/events/{event_id}/attendees/batch_create');

  console.log('\n📊 实际API调用示例:');
  
  console.log('\n示例1 - 单个教师工号的API调用:');
  console.log('  {');
  console.log('    "attendees": [');
  console.log('      {');
  console.log('        "type": "user",');
  console.log('        "user_id": "0154",');
  console.log('        "display_name": "张教授",');
  console.log('        "response_status": "needsAction",');
  console.log('        "optional": false');
  console.log('      }');
  console.log('    ]');
  console.log('  }');

  console.log('\n示例2 - 多个教师工号的API调用:');
  console.log('  {');
  console.log('    "attendees": [');
  console.log('      {');
  console.log('        "type": "user",');
  console.log('        "user_id": "0154",');
  console.log('        "display_name": "李教授",');
  console.log('        "response_status": "needsAction",');
  console.log('        "optional": false');
  console.log('      },');
  console.log('      {');
  console.log('        "type": "user",');
  console.log('        "user_id": "0326",');
  console.log('        "display_name": "李教授",');
  console.log('        "response_status": "needsAction",');
  console.log('        "optional": false');
  console.log('      },');
  console.log('      {');
  console.log('        "type": "user",');
  console.log('        "user_id": "0789",');
  console.log('        "display_name": "李教授",');
  console.log('        "response_status": "needsAction",');
  console.log('        "optional": false');
  console.log('      }');
  console.log('    ]');
  console.log('  }');

  console.log('\n🎯 关键特性:');
  console.log('  - 灵活解析: 支持单个或多个教师工号');
  console.log('  - 自动清理: 自动去除空格和空字符串');
  console.log('  - 统一姓名: 所有工号使用相同的教师姓名');
  console.log('  - 批量添加: 一次API调用添加所有参与者');
  console.log('  - 错误容错: 无效工号不影响其他工号的处理');

  console.log('\n👥 多个教师工号处理示例完成！');
}

/**
 * 边界情况处理示例
 */
export async function edgeCasesExample() {
  console.log('⚠️ 开始边界情况处理示例...\n');

  const testCases = [
    {
      name: '空字符串',
      teacherCode: '',
      expected: '[]',
      description: '记录警告日志，不调用API'
    },
    {
      name: '只有逗号',
      teacherCode: ',,,',
      expected: '[]',
      description: '过滤后为空，记录警告日志'
    },
    {
      name: '包含空元素',
      teacherCode: '0154,,0326',
      expected: '["0154", "0326"]',
      description: '自动过滤空元素'
    },
    {
      name: '大量空格',
      teacherCode: '  0154  ,  ,  0326  ',
      expected: '["0154", "0326"]',
      description: '去除空格并过滤空元素'
    },
    {
      name: '重复工号',
      teacherCode: '0154,0154,0326,0154',
      expected: '["0154", "0154", "0326", "0154"]',
      description: '保留重复工号（由WPS API处理去重）'
    },
    {
      name: '单个工号带空格',
      teacherCode: '  0154  ',
      expected: '["0154"]',
      description: '正确处理单个工号的空格'
    }
  ];

  console.log('📋 边界情况测试:');
  
  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}:`);
    console.log(`   输入: "${testCase.teacherCode}"`);
    console.log(`   期望输出: ${testCase.expected}`);
    console.log(`   处理方式: ${testCase.description}`);
  });

  console.log('\n🔍 处理逻辑:');
  console.log('  1. 按逗号分割字符串');
  console.log('  2. 对每个元素执行 trim() 去除空格');
  console.log('  3. 过滤掉长度为0的元素');
  console.log('  4. 如果结果数组为空，记录警告并返回');
  console.log('  5. 否则为每个工号创建参与者对象');

  console.log('\n📝 日志示例:');
  console.log('  DEBUG: Adding 3 teacher(s) as attendees to event event-123: 0154, 0326, 0789');
  console.log('  WARN:  No valid teacher codes found in: ');
  console.log('  DEBUG: Successfully added 3 teacher attendee(s): 0154, 0326, 0789');

  console.log('\n⚠️ 边界情况处理示例完成！');
}

/**
 * 性能考虑示例
 */
export async function performanceConsiderationsExample() {
  console.log('⚡ 开始性能考虑示例...\n');

  console.log('📊 性能指标:');
  console.log('  - WPS API限制: 最多1000个参与者/请求');
  console.log('  - 字符串解析: O(n) 时间复杂度');
  console.log('  - 内存使用: 临时数组存储解析结果');
  console.log('  - 网络请求: 每个日程1次API调用');

  console.log('\n🎯 优化策略:');
  console.log('  1. 批量处理: 一次API调用添加所有参与者');
  console.log('  2. 早期验证: 提前过滤无效工号');
  console.log('  3. 内存优化: 及时释放临时数组');
  console.log('  4. 错误隔离: 单个课程失败不影响其他课程');

  console.log('\n📈 扩展性考虑:');
  console.log('  - 支持大量教师工号（受WPS API限制）');
  console.log('  - 自动处理格式变化（空格、分隔符等）');
  console.log('  - 向后兼容单个教师工号的现有数据');
  console.log('  - 可扩展支持其他分隔符（如分号、空格等）');

  console.log('\n🔧 潜在改进:');
  console.log('  - 缓存解析结果避免重复计算');
  console.log('  - 支持配置化的分隔符');
  console.log('  - 添加工号格式验证');
  console.log('  - 实现工号去重逻辑');

  console.log('\n⚡ 性能考虑示例完成！');
}

// 导出所有示例函数
export default {
  multipleTeachersExample,
  edgeCasesExample,
  performanceConsiderationsExample
};
