/**
 * 验证 NodeInstanceRepository.create 完整记录返回修复的脚本
 * 展示修复前后的行为差异
 */

console.log('=== NodeInstanceRepository.create 完整记录返回修复验证 ===\n');

// 模拟修复前的问题逻辑
function oldCreateBehavior(baseCreateResult) {
  console.log('🔴 修复前的问题:');
  console.log('BaseRepository.create 返回:', baseCreateResult);

  // 直接返回 BaseRepository.create 的结果，可能不完整
  if (!baseCreateResult.success) {
    console.log('输出: 创建失败');
    return { success: false, error: baseCreateResult.error };
  }

  console.log('输出: 直接返回（可能不完整）:', baseCreateResult.data);
  return { success: true, data: baseCreateResult.data };
}

// 模拟修复后的正确逻辑
function newCreateBehavior(baseCreateResult, mockFindById) {
  console.log('✅ 修复后的逻辑:');
  console.log('BaseRepository.create 返回:', baseCreateResult);

  if (!baseCreateResult.success) {
    console.log('输出: 创建失败');
    return { success: false, error: baseCreateResult.error };
  }

  const createdData = baseCreateResult.data;

  // 检查数据是否完整
  function isCompleteRecord(data) {
    if (!data || typeof data !== 'object') return false;
    const requiredFields = [
      'id',
      'workflow_instance_id',
      'node_id',
      'node_name',
      'node_type',
      'status',
      'created_at',
      'updated_at'
    ];
    return requiredFields.every(
      (field) => data[field] !== undefined && data[field] !== null
    );
  }

  if (!createdData || !isCompleteRecord(createdData)) {
    console.log('检测到数据不完整，重新查询...');

    // 从插入结果中提取ID（可能是 insertId 或 id）
    const recordId = createdData?.insertId || createdData?.id;

    if (!recordId) {
      console.log('输出: 错误 - 没有返回记录ID (检查了insertId和id字段)');
      return {
        success: false,
        error:
          'Create operation did not return record ID (checked both insertId and id fields)'
      };
    }

    // 将 BigInt 转换为 number（如果需要）
    const idValue = typeof recordId === 'bigint' ? Number(recordId) : recordId;

    const fullRecord = mockFindById(idValue);
    console.log('findById 返回:', fullRecord);

    if (!fullRecord.success || !fullRecord.data) {
      console.log('输出: 错误 - 无法获取完整记录');
      return {
        success: false,
        error: 'Failed to fetch complete record after creation'
      };
    }

    console.log('输出: 完整记录:', fullRecord.data);
    return { success: true, data: fullRecord.data };
  }

  console.log('输出: 数据已完整，直接返回:', createdData);
  return { success: true, data: createdData };
}

console.log(
  '=== 测试场景 1: BaseRepository.create 返回不完整数据（只有insertId和元数据）==='
);
const scenario1BaseResult = {
  success: true,
  data: {
    insertId: 1n, // BigInt 类型
    numInsertedOrUpdatedRows: 1n
    // 缺少业务字段
  }
};

const scenario1FindById = (id) => ({
  success: true,
  data: {
    id: 1,
    workflow_instance_id: 123,
    node_id: 'task-1',
    node_name: 'Task 1',
    node_type: 'simple',
    status: 'pending',
    executor: 'test-executor',
    created_at: new Date(),
    updated_at: new Date()
    // ... 其他完整字段
  }
});

oldCreateBehavior(scenario1BaseResult);
newCreateBehavior(scenario1BaseResult, scenario1FindById);
console.log('');

console.log('=== 测试场景 2: BaseRepository.create 返回完整数据 ===');
const scenario2BaseResult = {
  success: true,
  data: {
    id: 2,
    workflow_instance_id: 456,
    node_id: 'task-2',
    node_name: 'Task 2',
    node_type: 'simple',
    status: 'pending',
    executor: 'another-executor',
    created_at: new Date(),
    updated_at: new Date()
    // 完整的记录
  }
};

const scenario2FindById = (id) => ({
  success: true,
  data: scenario2BaseResult.data
});

oldCreateBehavior(scenario2BaseResult);
newCreateBehavior(scenario2BaseResult, scenario2FindById);
console.log('');

console.log('=== 测试场景 3: BaseRepository.create 返回没有ID的数据 ===');
const scenario3BaseResult = {
  success: true,
  data: {
    // 没有insertId或id字段
    numInsertedOrUpdatedRows: 1n,
    warningCount: 0
  }
};

const scenario3FindById = (id) => ({
  success: false,
  error: 'Record not found'
});

oldCreateBehavior(scenario3BaseResult);
newCreateBehavior(scenario3BaseResult, scenario3FindById);
console.log('');

console.log('=== 测试场景 4: BaseRepository.create 失败 ===');
const scenario4BaseResult = {
  success: false,
  error: 'Database connection timeout'
};

oldCreateBehavior(scenario4BaseResult);
newCreateBehavior(scenario4BaseResult, null);
console.log('');

console.log('=== 修复总结 ===');
console.log('✅ 修复前问题:');
console.log('   - 直接返回 BaseRepository.create 的结果');
console.log('   - 可能只包含插入操作的元数据（如 insertId, affectedRows）');
console.log('   - mapNodeToBusinessModel 接收不完整数据导致错误');
console.log('   - 调用方无法获得完整的节点实例信息');
console.log('');
console.log('✅ 修复后改进:');
console.log('   - 检查返回数据的完整性');
console.log('   - 如果数据不完整，自动重新查询完整记录');
console.log('   - 确保始终返回包含所有必需字段的完整记录');
console.log('   - 提供详细的调试日志');
console.log('');
console.log('✅ 关键改进点:');
console.log('   1. isCompleteRecord() 方法检查数据完整性');
console.log('   2. 自动回退到 findById() 获取完整记录');
console.log('   3. 适当的错误处理和日志记录');
console.log('   4. 确保与 mapNodeToBusinessModel 的兼容性');
console.log('');
console.log('✅ 性能考虑:');
console.log('   - 只有在数据不完整时才进行额外查询');
console.log('   - 大多数情况下（数据库支持 RETURNING）不会有额外开销');
console.log('   - 提供了向后兼容性和健壮性');

console.log('\n=== 验证完成 ===');
