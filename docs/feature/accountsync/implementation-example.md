# @stratix/accountsync 实现示例

本文档提供了 `@stratix/accountsync` 插件的常见实现示例，帮助开发者理解如何使用和扩展这个插件。

## 1. 自定义数据源适配器示例

以下是创建自定义数据源适配器的完整示例，该适配器从LDAP服务器读取组织和用户数据：

```typescript
import { DataSourceAdapter, Organization, User, OrgUserRelation } from '@stratix/accountsync';
import * as ldap from 'ldapjs';
import { promisify } from 'util';

interface LdapSourceConfig {
  url: string;
  baseDn: string;
  bindDn: string;
  bindCredentials: string;
  orgFilter: string;
  userFilter: string;
  orgMapping: Record<string, string>;
  userMapping: Record<string, string>;
}

export class LdapSourceAdapter implements DataSourceAdapter {
  private client: any;
  private config: LdapSourceConfig;
  
  constructor(config: LdapSourceConfig) {
    this.config = config;
  }
  
  async init(): Promise<void> {
    this.client = ldap.createClient({
      url: this.config.url
    });
    
    // 将回调API转换为Promise
    const bindAsync = promisify(this.client.bind).bind(this.client);
    
    // 绑定到LDAP服务器
    try {
      await bindAsync(this.config.bindDn, this.config.bindCredentials);
    } catch (error) {
      throw new Error(`LDAP连接失败: ${error.message}`);
    }
  }
  
  async close(): Promise<void> {
    if (this.client) {
      this.client.unbind();
    }
  }
  
  async getOrganizations(): Promise<Organization[]> {
    const searchAsync = promisify(this.client.search).bind(this.client);
    
    try {
      const result = await searchAsync(this.config.baseDn, {
        filter: this.config.orgFilter,
        scope: 'sub',
        attributes: Object.values(this.config.orgMapping)
      });
      
      const organizations: Organization[] = [];
      
      // 处理搜索结果
      result.on('searchEntry', (entry) => {
        const org = this.mapLdapToOrganization(entry.object);
        organizations.push(org);
      });
      
      // 等待搜索完成
      return new Promise((resolve, reject) => {
        result.on('error', reject);
        result.on('end', () => resolve(organizations));
      });
    } catch (error) {
      throw new Error(`获取组织列表失败: ${error.message}`);
    }
  }
  
  async getUsers(): Promise<User[]> {
    const searchAsync = promisify(this.client.search).bind(this.client);
    
    try {
      const result = await searchAsync(this.config.baseDn, {
        filter: this.config.userFilter,
        scope: 'sub',
        attributes: Object.values(this.config.userMapping)
      });
      
      const users: User[] = [];
      
      // 处理搜索结果
      result.on('searchEntry', (entry) => {
        const user = this.mapLdapToUser(entry.object);
        users.push(user);
      });
      
      // 等待搜索完成
      return new Promise((resolve, reject) => {
        result.on('error', reject);
        result.on('end', () => resolve(users));
      });
    } catch (error) {
      throw new Error(`获取用户列表失败: ${error.message}`);
    }
  }
  
  async getOrgUserRelations(): Promise<OrgUserRelation[]> {
    // 在LDAP中，通常通过用户的memberOf属性获取关系
    const users = await this.getUsers();
    const orgs = await this.getOrganizations();
    
    // 创建DN到组织ID的映射
    const dnToOrgId = new Map<string, string>();
    for (const org of orgs) {
      if (org.extra?.dn) {
        dnToOrgId.set(org.extra.dn as string, org.id);
      }
    }
    
    // 创建关系列表
    const relations: OrgUserRelation[] = [];
    
    for (const user of users) {
      const memberOf = user.extra?.memberOf;
      if (Array.isArray(memberOf)) {
        for (const orgDn of memberOf) {
          const orgId = dnToOrgId.get(orgDn);
          if (orgId) {
            relations.push({
              id: `${user.id}_${orgId}`,
              orgId,
              userId: user.id,
              isPrimary: false
            });
          }
        }
      }
    }
    
    return relations;
  }
  
  // 暂不支持增量同步
  async getOrganizationChanges(): Promise<any[]> {
    return [];
  }
  
  async getUserChanges(): Promise<any[]> {
    return [];
  }
  
  async getOrgUserRelationChanges(): Promise<any[]> {
    return [];
  }
  
  // 工具方法：将LDAP对象映射为组织对象
  private mapLdapToOrganization(ldapObj: any): Organization {
    const mapping = this.config.orgMapping;
    const org: Organization = {
      id: ldapObj[mapping.id],
      orgCode: ldapObj[mapping.orgCode] || ldapObj[mapping.id],
      orgName: ldapObj[mapping.orgName],
      extra: {
        dn: ldapObj.dn
      }
    };
    
    // 映射父组织ID
    if (mapping.parentId && ldapObj[mapping.parentId]) {
      org.parentId = ldapObj[mapping.parentId];
    }
    
    return org;
  }
  
  // 工具方法：将LDAP对象映射为用户对象
  private mapLdapToUser(ldapObj: any): User {
    const mapping = this.config.userMapping;
    const user: User = {
      id: ldapObj[mapping.id],
      username: ldapObj[mapping.username],
      realName: ldapObj[mapping.realName],
      extra: {
        dn: ldapObj.dn,
        memberOf: ldapObj.memberOf
      }
    };
    
    // 映射可选字段
    if (mapping.email && ldapObj[mapping.email]) {
      user.email = ldapObj[mapping.email];
    }
    
    if (mapping.mobile && ldapObj[mapping.mobile]) {
      user.mobile = ldapObj[mapping.mobile];
    }
    
    return user;
  }
}

// 注册自定义数据源适配器
// 在应用启动时调用
export function registerLdapSourceAdapter(app) {
  app.accountsync.registerSourceAdapter('ldap', (config: LdapSourceConfig) => {
    return new LdapSourceAdapter(config);
  });
}
```

## 2. 自定义同步业务逻辑示例

以下示例展示了如何实现自定义的同步业务逻辑，包括预处理、转换和后处理：

```typescript
import { StratixApp } from 'stratix';
import { SyncHooks } from '@stratix/accountsync';

export function setupCustomSyncLogic(app: StratixApp) {
  const { accountsync } = app;
  
  // 注册组织数据预处理钩子
  accountsync.hook(SyncHooks.BEFORE_PROCESS_ORGANIZATIONS, async (organizations, context) => {
    console.log(`处理前组织数量: ${organizations.length}`);
    
    // 筛选有效组织
    const validOrgs = organizations.filter(org => 
      org.status !== 0 && // 排除禁用组织
      !org.orgName.includes('测试') // 排除测试组织
    );
    
    console.log(`处理后组织数量: ${validOrgs.length}`);
    return validOrgs;
  });
  
  // 注册用户数据转换钩子
  accountsync.hook(SyncHooks.TRANSFORM_USER, async (user, context) => {
    // 转换用户数据
    if (!user.email && user.username.includes('@')) {
      user.email = user.username;
    }
    
    // 确保手机号格式正确
    if (user.mobile) {
      user.mobile = user.mobile.replace(/\s+/g, '');
      // 确保手机号前缀为国家代码
      if (!user.mobile.startsWith('+')) {
        user.mobile = `+86${user.mobile}`;
      }
    }
    
    return user;
  });
  
  // 注册同步完成后的钩子
  accountsync.hook(SyncHooks.AFTER_SYNC_COMPLETED, async (result, context) => {
    // 同步完成后发送通知
    await app.sendNotification({
      type: 'sync-completed',
      taskId: context.taskId,
      success: result.total.success,
      failed: result.total.failed,
      completedAt: new Date()
    });
    
    // 更新同步状态到其他系统
    await app.externalService.updateSyncStatus(context.taskId, 'completed', result);
  });
}
```

## 3. 定时同步任务配置示例

以下示例展示如何配置定时执行的同步任务：

```typescript
import { createApp } from 'stratix';
import { accountsyncPlugin } from '@stratix/accountsync';

async function configureScheduledSync() {
  const app = createApp({
    plugins: {
      // 基础插件配置...
    }
  });
  
  await app.register(accountsyncPlugin);
  
  // 配置每日全量同步任务
  await app.accountsync.createSyncTask({
    name: '每日全量同步',
    type: 'full',
    source: {
      type: 'database',
      // 数据源配置...
    },
    target: {
      type: 'wps-api',
      // 目标配置...
    },
    schedule: {
      cron: '0 2 * * *', // 每天凌晨2点执行
      timezone: 'Asia/Shanghai'
    }
  });
  
  // 配置工作时间内每小时执行的增量同步
  await app.accountsync.createSyncTask({
    name: '工作时间增量同步',
    type: 'incremental',
    source: {
      type: 'api',
      // 数据源配置...
    },
    target: {
      type: 'wps-api',
      // 目标配置...
    },
    schedule: {
      cron: '0 9-18 * * 1-5', // 工作日9点到18点整点执行
      timezone: 'Asia/Shanghai'
    }
  });
  
  await app.start();
}

configureScheduledSync().catch(console.error);
```

## 4. 完整的Stratix应用集成示例

以下是将 `@stratix/accountsync` 插件完整集成到Stratix应用中的示例：

```typescript
import { createApp } from 'stratix';
import { accountsyncPlugin } from '@stratix/accountsync';
import { registerLdapSourceAdapter } from './custom/ldap-source-adapter';
import { setupCustomSyncLogic } from './custom/sync-hooks';

async function main() {
  // 创建应用实例
  const app = createApp({
    name: 'sync-service',
    
    // 配置依赖插件
    plugins: {
      database: {
        client: 'postgresql',
        connection: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASS || 'postgres',
          database: process.env.DB_NAME || 'syncdb'
        },
        pool: { min: 2, max: 10 }
      },
      
      cache: {
        type: 'redis',
        options: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASS
        }
      },
      
      queue: {
        type: 'redis',
        options: {
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASS
          }
        }
      },
      
      web: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || '0.0.0.0',
        cors: true,
        compression: true
      },
      
      schedule: {
        timezone: 'Asia/Shanghai'
      }
    }
  });
  
  // 注册accountsync插件
  await app.register(accountsyncPlugin, {
    database: {
      tablePrefix: 'sync_'
    },
    cache: {
      prefix: 'accountsync:',
      ttl: 86400 // 1天
    },
    api: {
      prefix: '/api/sync',
      auth: {
        type: 'jwt',
        secret: process.env.API_SECRET || 'your-secret-key'
      }
    },
    queue: {
      concurrency: 2
    },
    logging: {
      level: 'info',
      detailed: true
    }
  });
  
  // 注册自定义LDAP数据源适配器
  registerLdapSourceAdapter(app);
  
  // 设置自定义同步逻辑
  setupCustomSyncLogic(app);
  
  // 启动应用
  await app.start();
  
  console.log(`同步服务已启动，API访问地址: http://${app.config.get('web.host')}:${app.config.get('web.port')}/api/sync`);
}

main().catch(err => {
  console.error('应用启动失败:', err);
  process.exit(1);
});
```

## 5. 基于WPS API的差异比对与同步示例

以下示例展示了如何实现基于WPS API的差异比对与同步：

```typescript
import { WpsApiTargetAdapter, Organization, SyncOptions } from '@stratix/accountsync';

class CustomWpsApiAdapter extends WpsApiTargetAdapter {
  // 扩展WPS API适配器，增加差异比对逻辑
  
  async syncOrganizations(organizations: Organization[], options?: SyncOptions): Promise<any> {
    // 获取WPS通讯录中的现有组织
    const existingOrgs = await this.fetchExistingOrganizations();
    
    // 构建ID映射
    const existingOrgMap = new Map(existingOrgs.map(org => [org.externalId, org]));
    const incomingOrgMap = new Map(organizations.map(org => [org.id, org]));
    
    // 识别需要创建的组织
    const orgsToCreate = organizations.filter(org => !existingOrgMap.has(org.id));
    
    // 识别需要更新的组织
    const orgsToUpdate = organizations.filter(org => {
      const existing = existingOrgMap.get(org.id);
      if (!existing) return false;
      
      // 检查是否有变更
      return org.orgName !== existing.orgName || 
             org.parentId !== existing.parentId ||
             org.sortOrder !== existing.sortOrder;
    });
    
    // 识别需要删除的组织(仅在全量同步模式下)
    const orgsToDelete = options?.syncMode === 'full' 
      ? Array.from(existingOrgMap.values())
          .filter(org => !incomingOrgMap.has(org.externalId))
      : [];
    
    // 批量执行创建操作
    const createResults = await Promise.allSettled(
      orgsToCreate.map(org => this.createOrganization(org))
    );
    
    // 批量执行更新操作
    const updateResults = await Promise.allSettled(
      orgsToUpdate.map(org => {
        const existing = existingOrgMap.get(org.id);
        return this.updateOrganization(org, existing.wpsOrgId);
      })
    );
    
    // 批量执行删除操作
    const deleteResults = await Promise.allSettled(
      orgsToDelete.map(org => this.deleteOrganization(org.wpsOrgId))
    );
    
    // 统计结果
    const results = {
      create: this.countResults(createResults),
      update: this.countResults(updateResults),
      delete: this.countResults(deleteResults),
      total: {
        success: 0,
        failed: 0
      }
    };
    
    results.total.success = results.create.success + results.update.success + results.delete.success;
    results.total.failed = results.create.failed + results.update.failed + results.delete.failed;
    
    return results;
  }
  
  // 统计Promise.allSettled结果
  private countResults(results: PromiseSettledResult<any>[]): { success: number, failed: number } {
    return results.reduce((acc, result) => {
      if (result.status === 'fulfilled') {
        acc.success++;
      } else {
        acc.failed++;
      }
      return acc;
    }, { success: 0, failed: 0 });
  }
  
  // WPS API调用方法...
}
```

这些示例展示了如何在实际项目中使用和扩展 `@stratix/accountsync` 插件，开发者可以根据自己的项目需求进行调整和定制。 