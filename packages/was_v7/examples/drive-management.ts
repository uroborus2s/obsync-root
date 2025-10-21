/**
 * WPS V7 驱动盘管理示例
 * 演示如何使用 WpsDriveAdapter 进行驱动盘的创建、查询、更新和删除操作
 */

import type { AwilixContainer } from '@stratix/core';
import type { WpsDriveAdapter } from '../src/adapters/drives.adapter.js';

/**
 * 驱动盘管理示例
 */
export async function driveManagementExample(container: AwilixContainer) {
  // 从容器获取驱动盘适配器
  const driveAdapter = container.resolve<WpsDriveAdapter>(
    '@stratix/was-v7.drive'
  );

  console.log('=== WPS V7 驱动盘管理示例 ===\n');

  try {
    // 1. 创建用户私有盘
    console.log('1. 创建用户私有盘...');
    const createUserDriveResult = await driveAdapter.createDrive({
      allotee_id: 'user_123', // 用户ID
      allotee_type: 'user',
      name: '我的云文档',
      description: '用户私有云文档存储空间',
      source: 'private', // 私网：private（我的云文档）
      total_quota: 10737418240, // 10GB
      ext_attrs: [
        {
          name: 'department',
          value: '技术部'
        }
      ]
    });
    console.log('创建成功:', createUserDriveResult.data);
    console.log('驱动盘ID:', createUserDriveResult.data.id);
    console.log('');

    // 2. 创建用户组盘
    console.log('2. 创建用户组盘...');
    const createGroupDriveResult = await driveAdapter.createDrive({
      allotee_id: 'group_456', // 用户组ID
      allotee_type: 'group',
      name: '团队共享盘',
      description: '团队协作文档存储空间',
      total_quota: 53687091200, // 50GB
      ext_attrs: [
        {
          name: 'team',
          value: '研发团队'
        }
      ]
    });
    console.log('创建成功:', createGroupDriveResult.data);
    console.log('');

    // 3. 创建应用盘
    console.log('3. 创建应用盘...');
    const createAppDriveResult = await driveAdapter.createDrive({
      allotee_id: 'app_789', // 应用SPID
      allotee_type: 'app',
      name: '应用数据盘',
      description: '应用专用数据存储空间',
      total_quota: 107374182400 // 100GB
    });
    console.log('创建成功:', createAppDriveResult.data);
    console.log('');

    // 4. 获取驱动盘信息
    console.log('4. 获取驱动盘信息...');
    const driveInfo = await driveAdapter.getDrive({
      drive_id: createUserDriveResult.data.id
    });
    console.log('驱动盘信息:', driveInfo);
    console.log('容量信息:', driveInfo.quota);
    console.log('');

    // 5. 更新驱动盘信息
    console.log('5. 更新驱动盘信息...');
    await driveAdapter.updateDrive({
      drive_id: createUserDriveResult.data.id,
      name: '我的云文档（已更新）',
      description: '更新后的用户私有云文档存储空间',
      total_quota: 21474836480, // 扩容到20GB
      ext_attrs: [
        {
          name: 'department',
          value: '技术部'
        },
        {
          name: 'updated',
          value: 'true'
        }
      ]
    });
    console.log('更新成功');
    console.log('');

    // 6. 获取驱动盘列表（分页）
    console.log('6. 获取驱动盘列表（分页）...');
    const driveList = await driveAdapter.getDriveList({
      page_size: 10
    });
    console.log(`找到 ${driveList.items.length} 个驱动盘`);
    console.log('是否有更多:', driveList.has_more);
    driveList.items.forEach((drive, index) => {
      console.log(`  ${index + 1}. ${drive.name} (${drive.id})`);
      console.log(`     类型: ${drive.allotee_type}, 状态: ${drive.status}`);
      console.log(
        `     容量: ${(drive.quota.used / 1024 / 1024).toFixed(2)}MB / ${(drive.quota.total / 1024 / 1024).toFixed(2)}MB`
      );
    });
    console.log('');

    // 7. 获取特定用户的所有驱动盘
    console.log('7. 获取特定用户的所有驱动盘...');
    const userDrives = await driveAdapter.getDriveList({
      allotee_id: 'user_123',
      allotee_type: 'user'
    });
    console.log(`用户拥有 ${userDrives.items.length} 个驱动盘`);
    console.log('');

    // 8. 获取所有驱动盘（自动分页）
    console.log('8. 获取所有驱动盘（自动分页）...');
    const allDrives = await driveAdapter.getAllDriveList();
    console.log(`总共有 ${allDrives.length} 个驱动盘`);
    console.log('');

    // 9. 删除驱动盘
    console.log('9. 删除驱动盘...');
    await driveAdapter.deleteDrive({
      drive_id: createUserDriveResult.data.id
    });
    console.log('删除成功');
    console.log('');

    console.log('=== 示例执行完成 ===');
  } catch (error) {
    console.error('操作失败:', error);
    throw error;
  }
}

/**
 * 驱动盘容量管理示例
 */
export async function driveQuotaExample(container: AwilixContainer) {
  const driveAdapter = container.resolve<WpsDriveAdapter>(
    '@stratix/was-v7.drive'
  );

  console.log('=== 驱动盘容量管理示例 ===\n');

  try {
    // 创建一个测试盘
    const createResult = await driveAdapter.createDrive({
      allotee_id: 'user_test',
      allotee_type: 'user',
      name: '容量测试盘',
      source: 'private',
      total_quota: 5368709120 // 5GB
    });

    const driveId = createResult.data.id;
    console.log('创建测试盘:', driveId);

    // 获取容量信息
    const driveInfo = await driveAdapter.getDrive({ drive_id: driveId });
    const quota = driveInfo.quota;

    console.log('\n容量信息:');
    console.log(
      `  总容量: ${(quota.total / 1024 / 1024 / 1024).toFixed(2)} GB`
    );
    console.log(`  已使用: ${(quota.used / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(
      `  剩余容量: ${(quota.remaining / 1024 / 1024 / 1024).toFixed(2)} GB`
    );
    console.log(
      `  回收站: ${(quota.deleted / 1024 / 1024 / 1024).toFixed(2)} GB`
    );
    console.log(`  使用率: ${((quota.used / quota.total) * 100).toFixed(2)}%`);

    // 扩容
    console.log('\n扩容到 10GB...');
    await driveAdapter.updateDrive({
      drive_id: driveId,
      total_quota: 10737418240 // 10GB
    });

    const updatedInfo = await driveAdapter.getDrive({ drive_id: driveId });
    console.log(
      `新容量: ${(updatedInfo.quota.total / 1024 / 1024 / 1024).toFixed(2)} GB`
    );

    // 清理
    await driveAdapter.deleteDrive({ drive_id: driveId });
    console.log('\n测试盘已删除');

    console.log('\n=== 示例执行完成 ===');
  } catch (error) {
    console.error('操作失败:', error);
    throw error;
  }
}

/**
 * 批量驱动盘操作示例
 */
export async function batchDriveOperationsExample(container: AwilixContainer) {
  const driveAdapter = container.resolve<WpsDriveAdapter>(
    '@stratix/was-v7.drive'
  );

  console.log('=== 批量驱动盘操作示例 ===\n');

  try {
    // 批量创建驱动盘
    console.log('批量创建驱动盘...');
    const driveIds: string[] = [];

    for (let i = 1; i <= 5; i++) {
      const result = await driveAdapter.createDrive({
        allotee_id: `user_${i}`,
        allotee_type: 'user',
        name: `用户${i}的云盘`,
        source: 'private',
        total_quota: 5368709120 // 5GB
      });
      driveIds.push(result.data.id);
      console.log(`  创建驱动盘 ${i}: ${result.data.id}`);
    }

    // 获取所有驱动盘并统计
    console.log('\n获取所有驱动盘并统计...');
    const allDrives = await driveAdapter.getAllDriveList();

    const stats = {
      total: allDrives.length,
      byType: {
        user: 0,
        group: 0,
        app: 0
      },
      byStatus: {
        inuse: 0,
        deleted: 0
      },
      totalQuota: 0,
      usedQuota: 0
    };

    allDrives.forEach((drive) => {
      stats.byType[drive.allotee_type]++;
      stats.byStatus[drive.status]++;
      stats.totalQuota += drive.quota.total;
      stats.usedQuota += drive.quota.used;
    });

    console.log('统计信息:');
    console.log(`  总数: ${stats.total}`);
    console.log(`  用户盘: ${stats.byType.user}`);
    console.log(`  用户组盘: ${stats.byType.group}`);
    console.log(`  应用盘: ${stats.byType.app}`);
    console.log(`  使用中: ${stats.byStatus.inuse}`);
    console.log(`  已删除: ${stats.byStatus.deleted}`);
    console.log(
      `  总配额: ${(stats.totalQuota / 1024 / 1024 / 1024).toFixed(2)} GB`
    );
    console.log(
      `  已使用: ${(stats.usedQuota / 1024 / 1024 / 1024).toFixed(2)} GB`
    );

    // 批量删除
    console.log('\n批量删除驱动盘...');
    for (const driveId of driveIds) {
      await driveAdapter.deleteDrive({ drive_id: driveId });
      console.log(`  删除驱动盘: ${driveId}`);
    }

    console.log('\n=== 示例执行完成 ===');
  } catch (error) {
    console.error('操作失败:', error);
    throw error;
  }
}

/**
 * 文件管理示例
 */
export async function fileManagementExample(container: AwilixContainer) {
  const driveAdapter = container.resolve<WpsDriveAdapter>(
    '@stratix/was-v7.drive'
  );

  console.log('=== 文件管理示例 ===\n');

  try {
    // 1. 创建一个测试驱动盘
    console.log('1. 创建测试驱动盘...');
    const driveResult = await driveAdapter.createDrive({
      allotee_id: 'user_test',
      allotee_type: 'user',
      name: '文件测试盘',
      source: 'private',
      total_quota: 5368709120 // 5GB
    });
    const driveId = driveResult.data.id;
    console.log('驱动盘ID:', driveId);
    console.log('');

    // 2. 在根目录创建文件夹
    console.log('2. 创建文件夹...');
    const folderResult = await driveAdapter.createFile({
      drive_id: driveId,
      parent_id: 'root', // 根目录
      file_type: 'folder',
      name: '项目文档'
    });
    console.log('文件夹ID:', folderResult.data.id);
    console.log('文件夹名称:', folderResult.data.name);
    console.log('');

    // 3. 在文件夹中创建文件
    console.log('3. 创建文件...');
    const fileResult = await driveAdapter.createFile({
      drive_id: driveId,
      parent_id: folderResult.data.id,
      file_type: 'file',
      name: '需求文档.docx',
      on_name_conflict: 'rename' // 如果文件名冲突，自动重命名
    });
    console.log('文件ID:', fileResult.data.id);
    console.log('文件名称:', fileResult.data.name);
    console.log('文件大小:', fileResult.data.size, '字节');
    console.log('文件版本:', fileResult.data.version);
    console.log('');

    // 4. 创建快捷方式
    console.log('4. 创建快捷方式...');
    const shortcutResult = await driveAdapter.createFile({
      drive_id: driveId,
      parent_id: 'root',
      file_type: 'shortcut',
      name: '需求文档快捷方式',
      file_id: fileResult.data.id // 指向原文件
    });
    console.log('快捷方式ID:', shortcutResult.data.id);
    console.log('链接文件ID:', shortcutResult.data.link_id);
    console.log('');

    // 5. 使用parent_path创建嵌套文件夹和文件
    console.log('5. 使用parent_path创建嵌套结构...');
    const nestedFileResult = await driveAdapter.createFile({
      drive_id: driveId,
      parent_id: 'root',
      file_type: 'file',
      name: '设计稿.psd',
      parent_path: ['设计文档', '2024年', '第一季度'], // 自动创建路径
      on_name_conflict: 'overwrite'
    });
    console.log('嵌套文件ID:', nestedFileResult.data.id);
    console.log('父目录ID:', nestedFileResult.data.parent_id);
    console.log('');

    // 6. 查看文件权限
    console.log('6. 文件权限信息:');
    const permission = fileResult.data.permission;
    console.log('  可读:', permission.download);
    console.log('  可写:', permission.update);
    console.log('  可删除:', permission.delete);
    console.log('  可分享:', permission.share);
    console.log('  可评论:', permission.comment);
    console.log('  可复制:', permission.copy);
    console.log('');

    // 7. 查看文件详细信息
    console.log('7. 文件详细信息:');
    console.log('  创建者:', fileResult.data.created_by.name);
    console.log(
      '  创建时间:',
      new Date(fileResult.data.ctime * 1000).toLocaleString()
    );
    console.log('  修改者:', fileResult.data.modified_by.name);
    console.log(
      '  修改时间:',
      new Date(fileResult.data.mtime * 1000).toLocaleString()
    );
    console.log('  是否共享:', fileResult.data.shared);
    console.log(
      '  文件哈希:',
      fileResult.data.hash.type,
      '-',
      fileResult.data.hash.sum
    );
    console.log('');

    // 清理
    await driveAdapter.deleteDrive({ drive_id: driveId });
    console.log('测试盘已删除');

    console.log('\n=== 示例执行完成 ===');
  } catch (error) {
    console.error('操作失败:', error);
    throw error;
  }
}
