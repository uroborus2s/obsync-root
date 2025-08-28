/**
 * 根据外部用户ID列表查询用户信息的示例
 */

import type { WpsUserAdapter, GetUsersByExUserIdsParams } from '../src/adapters/user.adapter.js';

/**
 * 示例：根据外部用户ID列表查询用户信息
 */
export async function getUsersByExUserIdsExample(userAdapter: WpsUserAdapter) {
  try {
    // 准备请求参数
    const params: GetUsersByExUserIdsParams = {
      ex_user_ids: ['external_user_1', 'external_user_2', 'external_user_3'],
      status: ['active', 'notactive'] // 可选：指定要查询的用户状态
    };

    // 调用API
    const response = await userAdapter.getUsersByExUserIds(params);

    // 检查响应
    if (response.code === 0) {
      console.log('查询成功！');
      console.log('用户信息列表：', response.data.items);
      
      // 处理用户信息
      response.data.items.forEach(user => {
        console.log(`用户: ${user.user_name}`);
        console.log(`  - ID: ${user.id}`);
        console.log(`  - 外部ID: ${user.ex_user_id}`);
        console.log(`  - 邮箱: ${user.email}`);
        console.log(`  - 手机: ${user.phone}`);
        console.log(`  - 角色: ${user.role}`);
        console.log(`  - 状态: ${user.status}`);
        console.log(`  - 职务: ${user.title}`);
        console.log('---');
      });
    } else {
      console.error('查询失败：', response.msg);
    }

    return response;
  } catch (error) {
    console.error('API调用出错：', error);
    throw error;
  }
}

/**
 * 示例：只查询激活状态的用户
 */
export async function getActiveUsersByExUserIds(
  userAdapter: WpsUserAdapter,
  exUserIds: string[]
) {
  const params: GetUsersByExUserIdsParams = {
    ex_user_ids: exUserIds,
    status: ['active'] // 只查询激活状态的用户
  };

  return await userAdapter.getUsersByExUserIds(params);
}

/**
 * 示例：查询所有状态的用户（不指定status参数）
 */
export async function getAllUsersByExUserIds(
  userAdapter: WpsUserAdapter,
  exUserIds: string[]
) {
  const params: GetUsersByExUserIdsParams = {
    ex_user_ids: exUserIds
    // 不指定status，查询所有状态的用户
  };

  return await userAdapter.getUsersByExUserIds(params);
}
