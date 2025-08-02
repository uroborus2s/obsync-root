// @stratix/database 适配器使用示例
// 展示如何在其他模块中使用 database.manager 适配器

import type { AwilixContainer } from '@stratix/core';
import type { DatabaseAPI } from '../src/adapters/database-api.adapter.js';

/**
 * 示例服务类，展示如何注入和使用 database.manager 适配器
 */
export class ExampleUserService {
  private databaseAPI: DatabaseAPI;

  constructor(container: AwilixContainer) {
    // 通过标准命名 "database.manager" 注入数据库适配器
    this.databaseAPI = container.resolve('database.manager');
  }

  /**
   * 创建用户示例
   */
  async createUser(userData: { name: string; email: string }) {
    return await this.databaseAPI.executeQuery(async (db) => {
      return await db
        .insertInto('users')
        .values({
          name: userData.name,
          email: userData.email,
          created_at: new Date()
        })
        .returningAll()
        .executeTakeFirst();
    });
  }

  /**
   * 查询用户示例
   */
  async findUserById(id: string) {
    return await this.databaseAPI.executeQuery(async (db) => {
      return await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
    });
  }

  /**
   * 事务示例
   */
  async transferPoints(fromUserId: string, toUserId: string, points: number) {
    return await this.databaseAPI.transaction(async (trx) => {
      // 扣除发送方积分
      await trx
        .updateTable('users')
        .set((eb) => ({
          points: eb('points', '-', points)
        }))
        .where('id', '=', fromUserId)
        .execute();

      // 增加接收方积分
      await trx
        .updateTable('users')
        .set((eb) => ({
          points: eb('points', '+', points)
        }))
        .where('id', '=', toUserId)
        .execute();

      return { success: true, transferredPoints: points };
    });
  }

  /**
   * 健康检查示例
   */
  async checkDatabaseHealth() {
    return await this.databaseAPI.healthCheck();
  }
}

/**
 * 示例仓储类，展示在Repository中使用适配器
 */
export class ExampleUserRepository {
  private databaseAPI: DatabaseAPI;

  constructor(container: AwilixContainer) {
    // 注入 database.manager 适配器
    this.databaseAPI = container.resolve('database.manager');
  }

  /**
   * 批量操作示例
   */
  async createMultipleUsers(users: Array<{ name: string; email: string }>) {
    const operations = users.map(
      (user) => (db: any) =>
        db
          .insertInto('users')
          .values({
            name: user.name,
            email: user.email,
            created_at: new Date()
          })
          .returningAll()
          .executeTakeFirst()
    );

    return await this.databaseAPI.executeBatch(operations);
  }

  /**
   * 并行查询示例
   */
  async getUserStatistics(userIds: string[]) {
    const operations = userIds.map(
      (id) => (db: any) =>
        db
          .selectFrom('users')
          .select(['id', 'name', 'points', 'created_at'])
          .where('id', '=', id)
          .executeTakeFirst()
    );

    return await this.databaseAPI.executeParallel(operations);
  }

  /**
   * 读写分离示例
   */
  async getUserForRead(id: string) {
    // 使用读连接进行查询
    const readConnection = await this.databaseAPI.getReadConnection();
    if (!readConnection.success) {
      throw readConnection.error;
    }

    return await readConnection.data
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async updateUserForWrite(
    id: string,
    data: { name?: string; email?: string }
  ) {
    // 使用写连接进行更新
    const writeConnection = await this.databaseAPI.getWriteConnection();
    if (!writeConnection.success) {
      throw writeConnection.error;
    }

    return await writeConnection.data
      .updateTable('users')
      .set({
        ...data,
        updated_at: new Date()
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }
}

/**
 * 插件配置示例，展示如何在其他插件中依赖 databaseManager
 */
export const examplePluginConfig = {
  name: 'example-plugin',
  dependencies: ['database'], // 依赖 database 插件

  // 自动发现配置
  services: {
    enabled: true,
    patterns: ['services/*.{ts,js}', 'repositories/*.{ts,js}']
  },

  // 在插件初始化时验证 databaseManager 适配器可用
  async onInit(container: AwilixContainer) {
    if (!container.hasRegistration('databaseManager')) {
      throw new Error('databaseManager adapter is required but not registered');
    }

    console.log('✅ databaseManager adapter is available');
  }
};
