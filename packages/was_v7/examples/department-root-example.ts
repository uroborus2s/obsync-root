/**
 * WPS V7 部门API - 使用示例
 *
 * 本示例演示如何使用部门适配器的各种功能
 *
 * @remarks
 * - 签名方式：KSO-1（自动处理）
 * - 权限要求：kso.contact.readwrite 或 kso.contact.read
 */

import type { AwilixContainer } from '@stratix/core';
import type { WpsDepartmentAdapter } from '../src/adapters/department.adapter.js';
import type { DeptInfo } from '../src/types/contact.js';

/**
 * 获取根部门信息示例
 *
 * @param container - Awilix容器实例
 *
 * @example
 * ```typescript
 * import { createContainer } from '@stratix/core';
 * import wasV7Plugin from '@stratix/was-v7';
 *
 * const app = fastify();
 * await app.register(wasV7Plugin, {
 *   appId: 'your-app-id',
 *   appSecret: 'your-app-secret',
 *   baseUrl: 'https://openapi.wps.cn',
 *   timeout: 30000
 * });
 *
 * await getRootDepartmentExample(app.container);
 * ```
 */
export async function getRootDepartmentExample(
  container: AwilixContainer
): Promise<void> {
  console.log('=== WPS V7 获取根部门信息示例 ===\n');

  try {
    // 从容器中解析部门适配器
    const departmentAdapter = container.resolve<WpsDepartmentAdapter>(
      '@stratix/was-v7.department'
    );

    console.log('1. 获取根部门信息...');
    const rootDept: DeptInfo = await departmentAdapter.getRootDept();

    console.log('✓ 成功获取根部门信息\n');
    console.log('根部门详细信息：');
    console.log('─'.repeat(50));
    console.log(`部门ID:          ${rootDept.id}`);
    console.log(`部门名称:        ${rootDept.name}`);
    console.log(`部门绝对路径:    ${rootDept.abs_path}`);
    console.log(`父部门ID:        ${rootDept.parent_id}`);
    console.log(`外部部门ID:      ${rootDept.ex_dept_id}`);
    console.log(`排序值:          ${rootDept.order}`);
    console.log(
      `创建时间:        ${new Date(rootDept.ctime * 1000).toLocaleString('zh-CN')}`
    );

    if (rootDept.leaders && rootDept.leaders.length > 0) {
      console.log('\n部门领导列表：');
      rootDept.leaders.forEach((leader, index) => {
        console.log(
          `  ${index + 1}. 用户ID: ${leader.user_id}, 排序: ${leader.order}`
        );
      });
    } else {
      console.log('\n部门领导列表: 无');
    }

    console.log('─'.repeat(50));
    console.log('\n=== 示例执行完成 ===');
  } catch (error) {
    console.error('❌ 获取根部门信息失败:', error);
    throw error;
  }
}

/**
 * 根部门信息展示工具函数
 *
 * @param rootDept - 根部门信息
 */
export function displayRootDepartmentInfo(rootDept: DeptInfo): void {
  console.log('\n📋 根部门信息卡片');
  console.log('┌' + '─'.repeat(48) + '┐');
  console.log(`│ 部门名称: ${rootDept.name.padEnd(36)} │`);
  console.log(`│ 部门ID:   ${rootDept.id.padEnd(36)} │`);
  console.log('├' + '─'.repeat(48) + '┤');
  console.log(`│ 绝对路径: ${rootDept.abs_path.padEnd(36)} │`);
  console.log(`│ 外部ID:   ${rootDept.ex_dept_id.padEnd(36)} │`);
  console.log('├' + '─'.repeat(48) + '┤');
  console.log(
    `│ 创建时间: ${new Date(rootDept.ctime * 1000).toLocaleString('zh-CN').padEnd(36)} │`
  );
  console.log(`│ 排序值:   ${String(rootDept.order).padEnd(36)} │`);
  console.log('├' + '─'.repeat(48) + '┤');

  if (rootDept.leaders && rootDept.leaders.length > 0) {
    console.log(`│ 领导数量: ${String(rootDept.leaders.length).padEnd(36)} │`);
    rootDept.leaders.forEach((leader, index) => {
      const leaderInfo = `${index + 1}. ${leader.user_id} (排序:${leader.order})`;
      console.log(`│   ${leaderInfo.padEnd(44)} │`);
    });
  } else {
    console.log(`│ 领导数量: 0${' '.repeat(35)} │`);
  }

  console.log('└' + '─'.repeat(48) + '┘\n');
}

/**
 * 验证根部门信息的完整性
 *
 * @param rootDept - 根部门信息
 * @returns 验证结果
 */
export function validateRootDepartment(rootDept: DeptInfo): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 必填字段验证
  if (!rootDept.id) {
    errors.push('缺少部门ID');
  }
  if (!rootDept.name) {
    errors.push('缺少部门名称');
  }
  if (!rootDept.abs_path) {
    errors.push('缺少部门绝对路径');
  }
  if (rootDept.ctime === undefined || rootDept.ctime === null) {
    errors.push('缺少创建时间');
  }
  if (!rootDept.ex_dept_id) {
    errors.push('缺少外部部门ID');
  }
  if (!Array.isArray(rootDept.leaders)) {
    errors.push('领导列表格式错误');
  }
  if (rootDept.order === undefined || rootDept.order === null) {
    errors.push('缺少排序值');
  }
  if (!rootDept.parent_id) {
    errors.push('缺少父部门ID');
  }

  // 领导列表验证
  if (Array.isArray(rootDept.leaders)) {
    rootDept.leaders.forEach((leader, index) => {
      if (!leader.user_id) {
        errors.push(`领导列表第${index + 1}项缺少用户ID`);
      }
      if (leader.order === undefined || leader.order === null) {
        errors.push(`领导列表第${index + 1}项缺少排序值`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 查询子部门列表示例
 *
 * @param container - Awilix容器实例
 * @param deptId - 父部门ID
 */
export async function getDeptChildrenExample(
  container: AwilixContainer,
  deptId: string
): Promise<void> {
  console.log('=== WPS V7 查询子部门列表示例 ===\n');

  try {
    const departmentAdapter = container.resolve<WpsDepartmentAdapter>(
      '@stratix/was-v7.department'
    );

    console.log(`1. 查询部门 ${deptId} 的子部门列表（第一页）...`);
    const firstPage = await departmentAdapter.getDeptChildren({
      dept_id: deptId,
      page_size: 20
    });

    console.log('✓ 成功获取第一页子部门列表\n');
    console.log(`子部门数量: ${firstPage.items.length}`);
    console.log(`是否有下一页: ${firstPage.next_page_token ? '是' : '否'}`);

    if (firstPage.items.length > 0) {
      console.log('\n子部门列表：');
      console.log('─'.repeat(80));
      firstPage.items.forEach((dept, index) => {
        console.log(`${index + 1}. ${dept.name} (ID: ${dept.id})`);
        console.log(`   路径: ${dept.abs_path}`);
        console.log(`   领导数量: ${dept.leaders.length}`);
      });
      console.log('─'.repeat(80));
    }

    if (firstPage.next_page_token) {
      console.log('\n2. 查询下一页...');
      const secondPage = await departmentAdapter.getDeptChildren({
        dept_id: deptId,
        page_size: 20,
        page_token: firstPage.next_page_token
      });

      console.log(`✓ 成功获取第二页子部门列表`);
      console.log(`子部门数量: ${secondPage.items.length}`);
    }

    console.log('\n=== 示例执行完成 ===');
  } catch (error) {
    console.error('❌ 查询子部门列表失败:', error);
    throw error;
  }
}

/**
 * 递归获取所有子部门示例
 *
 * @param container - Awilix容器实例
 * @param deptId - 父部门ID
 * @returns 所有子部门列表
 */
export async function getAllDeptChildrenExample(
  container: AwilixContainer,
  deptId: string
): Promise<DeptInfo[]> {
  console.log('=== WPS V7 递归获取所有子部门示例 ===\n');

  const departmentAdapter = container.resolve<WpsDepartmentAdapter>(
    '@stratix/was-v7.department'
  );

  const allDepts: DeptInfo[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;

  try {
    do {
      pageCount++;
      console.log(`正在获取第 ${pageCount} 页...`);

      const response = await departmentAdapter.getDeptChildren({
        dept_id: deptId,
        page_size: 50,
        page_token: pageToken
      });

      allDepts.push(...response.items);
      pageToken = response.next_page_token;

      console.log(
        `✓ 第 ${pageCount} 页获取成功，本页 ${response.items.length} 个部门`
      );
    } while (pageToken);

    console.log('\n总结：');
    console.log('─'.repeat(50));
    console.log(`总页数: ${pageCount}`);
    console.log(`总部门数: ${allDepts.length}`);
    console.log('─'.repeat(50));

    console.log('\n=== 示例执行完成 ===');
    return allDepts;
  } catch (error) {
    console.error('❌ 递归获取子部门失败:', error);
    throw error;
  }
}

/**
 * 批量查询部门信息示例
 *
 * @param container - Awilix容器实例
 * @param deptIds - 部门ID列表
 */
export async function batchGetDeptInfoExample(
  container: AwilixContainer,
  deptIds: string[]
): Promise<void> {
  console.log('=== WPS V7 批量查询部门信息示例 ===\n');

  try {
    const departmentAdapter = container.resolve<WpsDepartmentAdapter>(
      '@stratix/was-v7.department'
    );

    console.log(`批量查询 ${deptIds.length} 个部门的信息...`);
    const result = await departmentAdapter.batchGetDeptInfo({
      dept_ids: deptIds
    });

    console.log(`✓ 成功查询到 ${result.items.length} 个部门的信息\n`);

    if (result.items.length > 0) {
      console.log('部门信息列表：');
      console.log('─'.repeat(80));
      result.items.forEach((dept, index) => {
        console.log(`${index + 1}. ${dept.name} (ID: ${dept.id})`);
        console.log(`   路径: ${dept.abs_path}`);
        console.log(`   父部门ID: ${dept.parent_id}`);
        console.log(`   领导数量: ${dept.leaders.length}`);
        console.log(`   排序值: ${dept.order}`);
        if (dept.ex_dept_id) {
          console.log(`   外部部门ID: ${dept.ex_dept_id}`);
        }
        console.log('');
      });
      console.log('─'.repeat(80));
    }

    console.log('\n=== 示例执行完成 ===');
  } catch (error) {
    console.error('❌ 批量查询部门信息失败:', error);
    throw error;
  }
}

/**
 * 根据外部部门ID批量获取部门信息示例
 *
 * @param container - Awilix容器实例
 * @param exDeptIds - 外部身份源部门ID列表
 */
export async function getDeptByExIdsExample(
  container: AwilixContainer,
  exDeptIds: string[]
): Promise<void> {
  console.log('=== WPS V7 根据外部部门ID批量获取部门信息示例 ===\n');

  try {
    const departmentAdapter = container.resolve<WpsDepartmentAdapter>(
      '@stratix/was-v7.department'
    );

    console.log(`根据 ${exDeptIds.length} 个外部部门ID查询部门信息...`);
    const result = await departmentAdapter.getDeptByExIds({
      ex_dept_ids: exDeptIds
    });

    console.log(`✓ 成功查询到 ${result.items.length} 个部门的信息\n`);

    if (result.items.length > 0) {
      console.log('部门信息列表：');
      console.log('─'.repeat(80));
      result.items.forEach((dept, index) => {
        console.log(`${index + 1}. ${dept.name} (ID: ${dept.id})`);
        console.log(`   外部部门ID: ${dept.ex_dept_id}`);
        console.log(`   路径: ${dept.abs_path}`);
        console.log(`   父部门ID: ${dept.parent_id}`);
        console.log(`   领导数量: ${dept.leaders.length}`);
        console.log(`   排序值: ${dept.order}`);
        console.log('');
      });
      console.log('─'.repeat(80));
    }

    console.log('\n=== 示例执行完成 ===');
  } catch (error) {
    console.error('❌ 根据外部部门ID批量获取部门信息失败:', error);
    throw error;
  }
}

/**
 * 主函数 - 运行示例
 */
export async function main(): Promise<void> {
  console.log('请在实际的Stratix应用中调用示例函数');
  console.log('示例代码：');
  console.log(`
import { createContainer } from '@stratix/core';
import wasV7Plugin from '@stratix/was-v7';
import {
  getRootDepartmentExample,
  getDeptChildrenExample,
  getAllDeptChildrenExample,
  batchGetDeptInfoExample,
  getDeptByExIdsExample
} from './examples/department-root-example.js';

const app = fastify();
await app.register(wasV7Plugin, {
  appId: process.env.WPS_APP_ID,
  appSecret: process.env.WPS_APP_SECRET,
  baseUrl: 'https://openapi.wps.cn',
  timeout: 30000
});

// 获取根部门信息
await getRootDepartmentExample(app.container);

// 查询子部门列表
await getDeptChildrenExample(app.container, 'dept-id');

// 递归获取所有子部门
const allDepts = await getAllDeptChildrenExample(app.container, 'dept-id');

// 批量查询部门信息
await batchGetDeptInfoExample(app.container, ['dept-id-1', 'dept-id-2', 'dept-id-3']);

// 根据外部部门ID批量获取部门信息
await getDeptByExIdsExample(app.container, ['ex-dept-id-1', 'ex-dept-id-2', 'ex-dept-id-3']);
  `);
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
