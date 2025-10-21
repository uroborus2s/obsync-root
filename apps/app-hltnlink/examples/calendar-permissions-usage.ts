// @wps/hltnlink CalendarSyncService权限添加功能使用示例
// 展示优化后的分批处理和用户存在性检查功能

import type CalendarSyncService from '../src/services/CalendarSyncService.js';

/**
 * 使用示例：添加日历权限
 */
export async function addCalendarPermissionsExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('🚀 开始权限添加示例...\n');

  // 示例1: 小批量用户（少于100个）
  console.log('📝 示例1: 小批量用户权限添加');
  const smallBatchUsers = [
    'user001', 'user002', 'user003', 'user004', 'user005',
    'user006', 'user007', 'user008', 'user009', 'user010'
  ];

  try {
    const result1 = await calendarSyncService.addCalendarPermissions(
      'calendar-small-batch',
      smallBatchUsers
    );

    console.log('✅ 小批量结果:', {
      成功: result1.data?.successful,
      失败: result1.data?.failed,
      错误: result1.data?.errors
    });
  } catch (error) {
    console.error('❌ 小批量处理失败:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例2: 大批量用户（超过100个，测试分批处理）
  console.log('📝 示例2: 大批量用户权限添加（250个用户）');
  const largeBatchUsers = Array.from(
    { length: 250 }, 
    (_, i) => `student${String(i + 1).padStart(3, '0')}`
  );

  try {
    const result2 = await calendarSyncService.addCalendarPermissions(
      'calendar-large-batch',
      largeBatchUsers
    );

    console.log('✅ 大批量结果:', {
      总用户数: largeBatchUsers.length,
      成功: result2.data?.successful,
      失败: result2.data?.failed,
      错误数量: result2.data?.errors?.length,
      '预期批次数': Math.ceil(largeBatchUsers.length / 100)
    });

    if (result2.data?.errors && result2.data.errors.length > 0) {
      console.log('⚠️  错误详情:', result2.data.errors.slice(0, 3)); // 只显示前3个错误
    }
  } catch (error) {
    console.error('❌ 大批量处理失败:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例3: 混合场景（包含不存在的用户）
  console.log('📝 示例3: 混合场景（包含不存在的用户）');
  const mixedUsers = [
    // 正常用户
    'valid_user_001', 'valid_user_002', 'valid_user_003',
    // 不存在的用户
    'nonexistent_001', 'nonexistent_002',
    // 更多正常用户
    'valid_user_004', 'valid_user_005'
  ];

  try {
    const result3 = await calendarSyncService.addCalendarPermissions(
      'calendar-mixed-scenario',
      mixedUsers
    );

    console.log('✅ 混合场景结果:', {
      总用户数: mixedUsers.length,
      成功: result3.data?.successful,
      失败: result3.data?.failed,
      错误: result3.data?.errors
    });

    // 分析结果
    const successRate = result3.data?.successful 
      ? (result3.data.successful / mixedUsers.length * 100).toFixed(1)
      : '0';
    console.log(`📊 成功率: ${successRate}%`);

  } catch (error) {
    console.error('❌ 混合场景处理失败:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 示例4: 空用户列表
  console.log('📝 示例4: 空用户列表处理');
  try {
    const result4 = await calendarSyncService.addCalendarPermissions(
      'calendar-empty-list',
      []
    );

    console.log('✅ 空列表结果:', {
      成功: result4.data?.successful,
      失败: result4.data?.failed,
      错误: result4.data?.errors
    });
  } catch (error) {
    console.error('❌ 空列表处理失败:', error);
  }

  console.log('\n🎉 权限添加示例完成！');
}

/**
 * 性能测试示例
 */
export async function performanceTestExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('⚡ 开始性能测试...\n');

  // 测试不同规模的用户批次
  const testSizes = [50, 100, 200, 500, 1000];

  for (const size of testSizes) {
    console.log(`📊 测试 ${size} 个用户的处理性能`);
    
    const users = Array.from(
      { length: size }, 
      (_, i) => `perf_test_user_${i + 1}`
    );

    const startTime = Date.now();
    
    try {
      const result = await calendarSyncService.addCalendarPermissions(
        `perf-test-${size}`,
        users
      );

      const endTime = Date.now();
      const duration = endTime - startTime;
      const expectedBatches = Math.ceil(size / 100);

      console.log(`✅ ${size} 用户处理完成:`, {
        耗时: `${duration}ms`,
        成功: result.data?.successful,
        失败: result.data?.failed,
        预期批次: expectedBatches,
        平均每批耗时: `${(duration / expectedBatches).toFixed(1)}ms`
      });

    } catch (error) {
      console.error(`❌ ${size} 用户处理失败:`, error);
    }

    console.log(''); // 空行分隔
  }

  console.log('🎯 性能测试完成！');
}

/**
 * 错误处理示例
 */
export async function errorHandlingExample(
  calendarSyncService: CalendarSyncService
) {
  console.log('🛡️ 开始错误处理示例...\n');

  // 示例：处理无效的日历ID
  console.log('📝 测试无效日历ID处理');
  try {
    const result = await calendarSyncService.addCalendarPermissions(
      '', // 空的日历ID
      ['user1', 'user2']
    );

    console.log('结果:', result);
  } catch (error) {
    console.log('✅ 正确捕获错误:', error);
  }

  console.log('\n🔒 错误处理示例完成！');
}

// 导出所有示例函数
export default {
  addCalendarPermissionsExample,
  performanceTestExample,
  errorHandlingExample
};
