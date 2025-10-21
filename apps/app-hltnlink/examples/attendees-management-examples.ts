// @wps/hltnlink 日程参与者管理示例
// 展示如何在日程创建后自动添加教师作为参与者

import type CalendarSyncService from '../src/services/CalendarSyncService.js';
import type { CourseScheduleData } from '../src/types/calendar-sync.js';

/**
 * 日程参与者管理示例
 */
export async function attendeesManagementExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('📅 开始日程参与者管理示例...\n');

  // 示例课程数据，包含多个教师工号
  const courseData: CourseScheduleData = {
    courseSequence: 'CS101',
    courseName: '计算机科学导论',
    teacherName: '张教授',
    teacherCode: '0154,0326,0789', // 多个教师工号，用逗号分隔
    startTime: '1940', // 19:40开始
    endTime: '2110', // 21:10结束
    weekday: '2', // 星期二
    weeks: '1,4,7,10,13,16', // 教学周
    classroom: '教学楼A101',
    semester: '2025-2026-1',
    batchId: 'attendees-example'
  };

  console.log('📋 课程信息:');
  console.log('  - 课程名称:', courseData.courseName);
  console.log('  - 教师姓名:', courseData.teacherName);
  console.log('  - 教师工号:', courseData.teacherCode);
  console.log(
    '  - 上课时间:',
    `星期${courseData.weekday} ${courseData.startTime}-${courseData.endTime}`
  );
  console.log('  - 教学周:', courseData.weeks);

  console.log('\n🔄 日程创建和参与者添加流程:');

  console.log('\n步骤1: 转换课程数据为WPS日程格式');
  const wpsSchedule = calendarSyncService.convertCourseToWpsSchedule(
    courseData,
    'example-calendar-id'
  );
  console.log('  ✓ 日程数据转换完成');
  console.log('  - 日程标题:', wpsSchedule.summary);
  console.log('  - 开始时间:', wpsSchedule.startTime);
  console.log('  - 结束时间:', wpsSchedule.endTime);

  console.log('\n步骤2: 创建WPS日程');
  console.log('  📝 调用 createWpsSchedule API...');
  console.log('  ✓ 日程创建成功，获得 eventId: "example-event-id"');

  console.log('\n步骤3: 添加教师作为参与者');
  console.log('  👨‍🏫 解析多个教师工号:');
  console.log('    - 原始工号:', courseData.teacherCode);
  console.log('    - 解析结果: ["0154", "0326", "0789"]');
  console.log('    - 参与者数量: 3个');
  console.log('    - 显示名称:', courseData.teacherName);
  console.log('    - 参与者类型: user');
  console.log('    - 响应状态: needsAction');
  console.log('    - 是否可选: false');

  console.log('\n  📡 调用 batchCreateAttendees API:');
  console.log(
    '    POST /v7/calendars/{calendar_id}/events/{event_id}/attendees/batch_create'
  );
  console.log('    Headers: { "X-Kso-Id-Type": "external" }');
  console.log('    Body: {');
  console.log('      "attendees": [');
  console.log('        {');
  console.log('          "type": "user",');
  console.log('          "user_id": "0154",');
  console.log('          "display_name": "' + courseData.teacherName + '",');
  console.log('          "response_status": "needsAction",');
  console.log('          "optional": false');
  console.log('        },');
  console.log('        {');
  console.log('          "type": "user",');
  console.log('          "user_id": "0326",');
  console.log('          "display_name": "' + courseData.teacherName + '",');
  console.log('          "response_status": "needsAction",');
  console.log('          "optional": false');
  console.log('        },');
  console.log('        {');
  console.log('          "type": "user",');
  console.log('          "user_id": "0789",');
  console.log('          "display_name": "' + courseData.teacherName + '",');
  console.log('          "response_status": "needsAction",');
  console.log('          "optional": false');
  console.log('        }');
  console.log('      ],');
  console.log('      "response_status": "needsAction"');
  console.log('    }');

  console.log('\n  ✓ 参与者添加成功');

  console.log('\n📊 完整流程总结:');
  console.log('  1. ✅ 课程数据转换为WPS日程格式');
  console.log('  2. ✅ 创建WPS日程，获得eventId');
  console.log('  3. ✅ 使用教师工号添加参与者');
  console.log('  4. ✅ 设置参与者状态为"需要响应"');

  console.log('\n🎯 关键特性:');
  console.log('  - 自动参与者添加: 日程创建成功后自动添加教师');
  console.log('  - 错误容错: 参与者添加失败不影响日程创建成功状态');
  console.log('  - 批量处理: 支持多个课程的参与者批量添加');
  console.log('  - 标准格式: 使用WPS API标准的参与者数据格式');

  console.log('\n📅 日程参与者管理示例完成！');
}

/**
 * 批量课程参与者添加示例
 */
export async function batchAttendeesExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('📚 开始批量课程参与者添加示例...\n');

  const courses: CourseScheduleData[] = [
    {
      courseSequence: 'CS101',
      courseName: '计算机科学导论',
      teacherName: '张教授',
      teacherCode: 'T001',
      startTime: '0800',
      endTime: '0940',
      weekday: '1',
      weeks: '1-8',
      classroom: '教学楼A101',
      semester: '2025-2026-1',
      batchId: 'batch-example'
    },
    {
      courseSequence: 'MATH101',
      courseName: '高等数学',
      teacherName: '李教授',
      teacherCode: 'T002',
      startTime: '1000',
      endTime: '1140',
      weekday: '2',
      weeks: '1-8',
      classroom: '教学楼B201',
      semester: '2025-2026-1',
      batchId: 'batch-example'
    },
    {
      courseSequence: 'PHY101',
      courseName: '大学物理',
      teacherName: '王教授',
      teacherCode: 'T003',
      startTime: '1400',
      endTime: '1530',
      weekday: '3',
      weeks: '1-8',
      classroom: '教学楼C301',
      semester: '2025-2026-1',
      batchId: 'batch-example'
    }
  ];

  console.log('📋 批量课程信息:');
  courses.forEach((course, index) => {
    console.log(`  ${index + 1}. ${course.courseName}`);
    console.log(`     教师: ${course.teacherName} (${course.teacherCode})`);
    console.log(
      `     时间: 星期${course.weekday} ${course.startTime}-${course.endTime}`
    );
    console.log(`     教室: ${course.classroom}`);
  });

  console.log('\n🔄 批量处理流程:');
  console.log('  📝 调用 batchCreateWpsSchedules...');

  // 模拟批量创建过程
  console.log('\n  逐个处理课程:');
  courses.forEach((course, index) => {
    console.log(`\n  课程 ${index + 1}: ${course.courseName}`);
    console.log('    ✓ 转换为WPS日程格式');
    console.log('    ✓ 创建日程成功 (eventId: event-' + (index + 1) + ')');
    console.log('    ✓ 添加教师参与者:');
    console.log(
      '      - 教师: ' + course.teacherName + ' (' + course.teacherCode + ')'
    );
    console.log('      - API调用: batchCreateAttendees');
    console.log('      - 状态: 成功');
    console.log('    ⏱️  延迟 20ms (避免API限制)');
  });

  console.log('\n📊 批量处理结果:');
  console.log('  - 成功创建日程: 3个');
  console.log('  - 失败日程: 0个');
  console.log('  - 成功添加参与者: 3个');
  console.log('  - 参与者添加失败: 0个');

  console.log('\n🎯 批量处理特性:');
  console.log('  - 顺序处理: 逐个创建日程，确保稳定性');
  console.log('  - 自动参与者: 每个日程自动添加对应教师');
  console.log('  - 错误隔离: 单个课程失败不影响其他课程');
  console.log('  - 速率限制: 自动添加延迟避免API限制');

  console.log('\n📚 批量课程参与者添加示例完成！');
}

/**
 * 参与者添加错误处理示例
 */
export async function attendeesErrorHandlingExample() {
  console.log('⚠️ 开始参与者添加错误处理示例...\n');

  console.log('📋 错误处理场景:');

  console.log('\n场景1: 日程创建成功，参与者添加失败');
  console.log('  1. ✅ 课程数据转换成功');
  console.log('  2. ✅ WPS日程创建成功 (eventId: event-123)');
  console.log('  3. ❌ 添加参与者失败 (教师工号不存在)');
  console.log('  4. ⚠️  记录警告日志，但日程创建状态仍为成功');
  console.log('  5. ✅ 继续处理下一个课程');

  console.log('\n场景2: 网络超时导致参与者添加失败');
  console.log('  1. ✅ 日程创建成功');
  console.log('  2. ⏱️  调用 batchCreateAttendees API');
  console.log('  3. ❌ 网络超时 (timeout after 30s)');
  console.log('  4. ⚠️  记录警告: "Failed to add teacher as attendee"');
  console.log('  5. ✅ 日程创建状态保持成功');

  console.log('\n场景3: 权限不足导致参与者添加失败');
  console.log('  1. ✅ 日程创建成功');
  console.log('  2. ❌ 参与者添加失败 (403 Forbidden)');
  console.log('  3. ⚠️  记录详细错误信息');
  console.log('  4. ✅ 不影响整体同步流程');

  console.log('\n🛡️ 错误处理策略:');
  console.log('  - 容错设计: 参与者添加失败不影响日程创建成功状态');
  console.log('  - 详细日志: 记录所有错误信息便于排查');
  console.log('  - 继续执行: 单个失败不中断批量处理');
  console.log('  - 状态分离: 日程创建和参与者添加状态独立统计');

  console.log('\n📝 日志示例:');
  console.log(
    '  DEBUG: Adding teacher 张教授 (T001) as attendee to event event-123'
  );
  console.log(
    '  WARN:  Failed to add teacher as attendee for schedule event-123: Error: User T001 not found'
  );
  console.log(
    '  INFO:  Batch schedule creation result: 1 successful, 0 failed'
  );

  console.log('\n⚠️ 参与者添加错误处理示例完成！');
}

/**
 * WPS API 参与者格式说明示例
 */
export async function wpsAttendeesFormatExample() {
  console.log('📋 开始WPS API参与者格式说明示例...\n');

  console.log('🔗 API端点:');
  console.log(
    '  POST /v7/calendars/{calendar_id}/events/{event_id}/attendees/batch_create'
  );

  console.log('\n📨 请求头:');
  console.log('  Content-Type: application/json');
  console.log('  X-Kso-Id-Type: external  // 使用外部用户ID');

  console.log('\n📋 请求体格式:');
  console.log('  {');
  console.log('    "attendees": [');
  console.log('      {');
  console.log('        "type": "user",           // 参与者类型: user | group');
  console.log('        "user_id": "T001",        // 用户ID (教师工号)');
  console.log('        "display_name": "张教授", // 显示名称');
  console.log('        "response_status": "needsAction", // 响应状态');
  console.log('        "optional": false         // 是否为可选参与者');
  console.log('      }');
  console.log('    ],');
  console.log('    "response_status": "needsAction"  // 默认响应状态');
  console.log('  }');

  console.log('\n📤 响应格式:');
  console.log('  {');
  console.log('    "items": [');
  console.log('      {');
  console.log('        "user_id": "T001",');
  console.log('        "display_name": "张教授",');
  console.log('        "type": "user",');
  console.log('        "response_status": "needsAction",');
  console.log('        "optional": false');
  console.log('      }');
  console.log('    ]');
  console.log('  }');

  console.log('\n🎯 关键字段说明:');
  console.log('  - type: 参与者类型');
  console.log('    * user: 用户参与者');
  console.log('    * group: 用户组参与者');
  console.log('  - user_id: 用户标识符 (使用教师工号)');
  console.log('  - display_name: 显示名称 (教师姓名)');
  console.log('  - response_status: 参与状态');
  console.log('    * needsAction: 需要响应');
  console.log('    * accepted: 已接受');
  console.log('    * declined: 已拒绝');
  console.log('    * tentative: 暂定');
  console.log('  - optional: 是否为可选参与者');

  console.log('\n⚠️ 注意事项:');
  console.log('  - 参与者数量限制: 最多1000个');
  console.log('  - 用户ID格式: 使用教师工号作为外部ID');
  console.log('  - 权限要求: 需要日程读写权限');
  console.log('  - 签名方式: KSO-1签名认证');

  console.log('\n📋 WPS API参与者格式说明示例完成！');
}

// 导出所有示例函数
export default {
  attendeesManagementExample,
  batchAttendeesExample,
  attendeesErrorHandlingExample,
  wpsAttendeesFormatExample
};
