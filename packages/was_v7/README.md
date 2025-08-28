# @stratix/was-v7

WPS协作平台V7 API的Stratix插件，采用服务适配器模式，提供纯函数式的API调用接口。

## 🔥 最新更新

### v2.0.0 - 服务适配器架构重构

- ✅ **服务适配器模式**: 将所有WPS API封装为纯函数适配器
- ✅ **根容器注册**: 适配器注册到应用根容器，全局可用
- ✅ **命名空间隔离**: 使用`@stratix/was-v7.{adapterName}`命名空间
- ✅ **自动发现机制**: 插件自动发现和注册所有适配器
- ✅ **函数式编程**: 完全采用函数式编程范式
- ✅ **零配置使用**: 其他插件可直接通过DI容器调用适配器
- ✅ **完整API覆盖**: 8个适配器覆盖95+个WPS API接口
- ✅ **便捷方法**: 提供高级封装和批量操作方法
- ✅ **参数验证**: 完整的配置参数验证和错误处理机制
- ✅ **安全配置**: 生产环境强制HTTPS，敏感信息保护

### v1.1.0 - 日历模块开发完成

- ✅ **日历管理**: 创建日历、查询主日历、日历权限管理
- ✅ **日程管理**: 完整的日程CRUD操作，支持15个API接口
- ✅ **参与者管理**: 添加/删除参与者、获取参与者列表、用户组成员查询
- ✅ **会议室管理**: 添加/删除会议室、获取会议室列表
- ✅ **请假日程**: 创建和删除请假类型的日程
- ✅ **忙闲查询**: 查询用户在指定时间范围内的忙闲状态
- ✅ **便捷方法**: 提供简单日程创建、全天日程、今日/本周日程查询等便捷方法

## 功能特性

- 🎯 **服务适配器模式** - 纯函数式API调用，注册到根容器
- 🔐 **完整的认证授权** - 自动处理token获取和刷新
- 🔒 **KSO-1签名算法** - 实现WPS开放平台KSO-1标准签名算法
- ⚪ **签名白名单** - 支持特定路径跳过签名验证（如OAuth token接口）
- 🌐 **HTTP客户端** - 基于axios的高性能HTTP客户端
- 🔄 **自动重试** - 支持请求失败自动重试
- 📝 **TypeScript支持** - 完整的类型定义
- 🔌 **插件化设计** - 符合Stratix最新插件开发规范
- 🛠️ **错误处理** - 统一的错误处理和分类
- ✅ **参数验证** - 智能的配置验证和默认值处理
- 🔒 **安全配置** - 生产环境安全检查和敏感信息保护
- 👥 **通讯录管理** - 完整的企业、部门、用户管理功能
- 📅 **日历日程** - 完整的日历和日程管理功能，支持参与者和会议室
- 💬 **消息聊天** - 支持多种消息类型发送和聊天会话管理
- 🔐 **用户认证** - 完整的OAuth2.0用户授权和认证流程
- 🚀 **全局可用** - 任何插件和应用都可以直接调用WPS API
- 📦 **8个适配器** - 覆盖95+个WPS API接口

## 安装

```bash
npm install @stratix/was-v7
```

## 快速开始

### 1. 插件注册

```typescript
// stratix.config.ts
import type { StratixConfig } from '@stratix/core';
import wasV7Plugin from '@stratix/was-v7';

export default (sensitiveConfig: any): StratixConfig => {
  return {
    plugins: [
      {
        name: '@stratix/was-v7',
        plugin: wasV7Plugin,
        options: {
          // 必需参数
          appId: sensitiveConfig.wasV7.appId,
          appSecret: sensitiveConfig.wasV7.appSecret,

          // 可选参数（有默认值）
          baseUrl: 'https://openapi.wps.cn', // 默认值
          timeout: 60000, // 60秒，默认值
          retryTimes: 3, // 默认值
          debug: false // 默认值
        }
      }
    ]
  };
};
```

#### 参数验证功能

插件会自动验证配置参数：

```typescript
// ✅ 正确配置
options: {
  appId: 'your-app-id',
  appSecret: 'your-app-secret',
  timeout: 30000, // 30秒，在允许范围内
  retryTimes: 5 // 在允许范围内
}

// ❌ 错误配置 - 会抛出验证错误
options: {
  appId: '', // 错误：空字符串
  appSecret: 'secret',
  timeout: -1000, // 错误：负数
  retryTimes: 15 // 错误：超出范围
}
```

### 2. 使用适配器

```typescript
// 在路由处理器中使用
app.get('/api/users', async (request, reply) => {
  // 从根容器获取WPS用户适配器
  const wpsUserAdapter = request.diScope.cradle['@stratix/was-v7.user'];

  const users = await wpsUserAdapter.getAllUser({ page_size: 20 });
  reply.send({ success: true, data: users });
});

// 在其他服务中使用
export class MyService {
  constructor(private container: AwilixContainer) {}

  async syncUsers() {
    const wpsUserAdapter = this.container.resolve('@stratix/was-v7.user');
    const wpsDeptAdapter = this.container.resolve('@stratix/was-v7.department');

    const departments = await wpsDeptAdapter.getAllDeptList();
    const users = await wpsUserAdapter.getAllUserList();

    // 执行业务逻辑...
  }
}
```

## 配置选项

```typescript
interface WasV7PluginOptions {
  appId: string;          // 应用ID
  appSecret: string;      // 应用密钥
  apiEndpoint?: string;   // API端点，默认：https://openapi.wps.cn
}
```

## 通讯录API

### 企业管理

```typescript
// 获取企业信息
const companyInfo = await companyModule.getCurrentCompany();
console.log('企业名称:', companyInfo.name);
```

### 部门管理

```typescript
// 查询子部门列表（分页）
const deptList = await deptModule.getDeptList({
  parent_id: 'parent-dept-id',
  page_size: 20
});

// 获取所有子部门（自动分页）
const allDepts = await deptModule.getAllDeptList({
  parent_id: 'parent-dept-id'
});

// 获取根部门
const rootDept = await deptModule.getRootDept();

// 创建部门
const newDept = await deptModule.createDept({
  name: '新部门',
  parent_id: 'parent-dept-id',
  order: 1
});

// 更新部门
await deptModule.updateDept({
  dept_id: 'dept-id',
  name: '更新后的部门名称'
});

// 删除部门
await deptModule.deleteDept({ dept_id: 'dept-id' });

// 获取部门树结构
const deptTree = await deptModule.getDeptTree();
```

### 用户管理

```typescript
// 获取当前用户ID
const currentUserId = await userModule.getCurrentUserId();

// 查询指定用户
const userInfo = await userModule.getUser('user-id');

// 查询企业下所有用户（分页）
const allUsers = await userModule.getAllUser({
  page_size: 20,
  with_total: true
});

// 获取企业下所有用户（自动分页）
const allUsersList = await userModule.getAllUserList();

// 批量查询用户
const batchUsers = await userModule.batchGetUser({
  user_ids: ['user1', 'user2', 'user3']
});

// 根据邮箱查询用户
const userByEmail = await userModule.getUserByEmail({
  email: 'user@example.com'
});

// 根据手机号查询用户
const userByPhone = await userModule.getUserByPhone({
  mobile: '13800138000'
});

// 根据外部用户ID查询用户
const userByExId = await userModule.getUserByExId({
  ex_user_id: 'external-user-id'
});

// 创建用户
const newUser = await userModule.createUser({
  name: '新用户',
  email: 'newuser@example.com',
  mobile: '13800138000',
  dept_ids: ['dept-id'],
  position: '工程师'
});

// 更新用户
await userModule.updateUser({
  user_id: 'user-id',
  name: '更新后的用户名',
  position: '高级工程师'
});

// 删除用户
await userModule.deleteUser({ user_id: 'user-id' });

// 批量禁用用户
await userModule.batchDisableUser({
  user_ids: ['user1', 'user2']
});

// 批量启用用户
await userModule.batchEnableUser({
  user_ids: ['user1', 'user2']
});

// 查询部门下用户列表
const deptUsers = await userModule.getDeptUser({
  dept_id: 'dept-id',
  page_size: 20,
  include_child_dept: true
});

// 批量查询部门下的成员信息
const batchDeptUsers = await userModule.batchGetDeptUser({
  dept_ids: ['dept1', 'dept2'],
  include_child_dept: false
});

// 将用户加入到部门
await userModule.joinDept({
  user_id: 'user-id',
  dept_id: 'dept-id',
  order: 1
});

// 将用户移除部门
await userModule.removeDept({
  user_id: 'user-id',
  dept_id: 'dept-id'
});

// 获取用户所在部门列表
const userDepts = await userModule.getUserDept({
  user_id: 'user-id'
});

// 批量修改用户在部门中排序值
await userModule.batchUpdateUserOrder({
  items: [
    { user_id: 'user1', dept_id: 'dept-id', order: 1 },
    { user_id: 'user2', dept_id: 'dept-id', order: 2 }
  ]
});

// 批量更新用户所在部门
await userModule.batchUpdateUserDept({
  items: [
    { user_id: 'user1', dept_ids: ['dept1', 'dept2'] },
    { user_id: 'user2', dept_ids: ['dept2'] }
  ]
});

// 批量获取用户的自定义属性值
const userAttributes = await userModule.batchGetUserAttribute({
  user_ids: ['user1', 'user2'],
  attribute_ids: ['attr1', 'attr2']
});

// 批量更新用户的自定义属性值
await userModule.batchUpdateUserAttribute({
  items: [
    {
      user_id: 'user1',
      attributes: [
        { attribute_id: 'attr1', value: 'value1' }
      ]
    }
  ]
});
```

## 认证授权

### 应用访问凭证

```typescript
// 获取应用访问凭证（用于应用级别的API调用）
const appToken = await authManager.getAppAccessToken();
```

### 租户访问凭证

```typescript
// 获取租户访问凭证（用于租户级别的API调用）
const tenantToken = await authManager.getTenantAccessToken('tenant-key');
```

### 用户授权流程

```typescript
// 1. 生成授权URL
const authUrl = authManager.generateAuthUrl(
  'http://localhost:3000/callback',
  'user:read,drive:read',
  'state-123'
);

// 2. 用户授权后，使用授权码获取访问凭证
const userToken = await authManager.getUserAccessToken(
  'authorization-code',
  'http://localhost:3000/callback'
);

// 3. 刷新访问凭证
const refreshedToken = await authManager.refreshUserAccessToken(
  userToken.refresh_token
);
```

## 错误处理

```typescript
import { WpsError } from '@stratix/was-v7';

try {
  await userModule.getUser('user-id');
} catch (error) {
  if (error instanceof WpsError) {
    console.log('错误码:', error.code);
    console.log('HTTP状态:', error.httpStatus);
    
    // 判断错误类型
    if (error.isAuthError()) {
      console.log('认证错误');
    } else if (error.isNetworkError()) {
      console.log('网络错误');
    }
  }
}
```

## DI容器注册

插件会自动注册以下服务到DI容器：

- `wasV7SignatureUtil` - SignatureUtil实例
- `wasV7HttpClient` - HttpClient实例
- `wasV7AuthManager` - AuthManager实例
- `wasV7Department` - DepartmentModule实例
- `wasV7Company` - CompanyModule实例
- `wasV7User` - UserModule实例
- `wasV7Calendar` - CalendarModule实例
- `wasV7Schedule` - ScheduleModule实例
- `wasV7Message` - MessageModule实例
- `wasV7Chat` - ChatModule实例

```typescript
// 在路由处理器中使用
app.get('/api/users', async (request, reply) => {
  const userModule = request.diScope.cradle.wasV7User;
  
  const users = await userModule.getAllUser({ page_size: 20 });
  return users;
});
```

## API文档

### UserModule

用户管理模块，提供完整的用户管理功能。

#### 方法

- `getCurrentUserId()` - 获取当前用户ID
- `getUser(userId)` - 查询指定用户
- `getAllUser(params?)` - 查询企业下所有用户（分页）
- `getAllUserList(params?)` - 获取企业下所有用户（自动分页）
- `batchGetUser(params)` - 批量查询用户
- `getUserByEmail(params)` - 根据邮箱获取用户
- `getUserByPhone(params)` - 根据手机号获取用户
- `getUserByExId(params)` - 根据外部用户ID获取用户
- `createUser(params)` - 创建用户
- `updateUser(params)` - 更新用户
- `deleteUser(params)` - 删除用户
- `batchDisableUser(params)` - 批量禁用用户
- `batchEnableUser(params)` - 批量启用用户
- `getDeptUser(params)` - 查询部门下用户列表
- `getAllDeptUser(params)` - 获取部门下所有用户（自动分页）
- `batchGetDeptUser(params)` - 批量查询部门下的成员信息
- `joinDept(params)` - 将用户加入到部门
- `removeDept(params)` - 将用户移除部门
- `getUserDept(params)` - 获取用户所在部门列表
- `batchUpdateUserOrder(params)` - 批量修改用户在部门中排序值
- `batchUpdateUserDept(params)` - 批量更新用户所在部门
- `batchGetUserAttribute(params)` - 批量获取用户的自定义属性值
- `batchUpdateUserAttribute(params)` - 批量更新用户的自定义属性值

### DepartmentModule

部门管理模块。

#### 方法

- `getDeptList(params?)` - 查询子部门列表（分页）
- `getAllDeptList(params?)` - 获取所有子部门列表（自动分页）
- `batchGetDeptInfo(params)` - 批量查询指定部门信息
- `getDeptByExId(params)` - 根据外部部门ID获取部门信息
- `getRootDept()` - 获取根部门
- `createDept(params)` - 创建部门
- `updateDept(params)` - 更新部门
- `deleteDept(params)` - 删除部门
- `getDeptInfo(deptId)` - 获取部门信息
- `getAllSubDepts(parentId?)` - 获取所有子部门（递归）
- `getDeptTree(parentId?)` - 获取部门树结构

### CompanyModule

企业管理模块。

#### 方法

- `getCurrentCompany()` - 查询企业信息
- `getCompanyInfo()` - 获取企业信息（别名方法）

### CalendarModule

日历管理模块。

#### 方法

- `createCalendar(params)` - 创建日历
- `getPrimaryCalendar()` - 查询主日历信息
- `createCalendarPermission(params)` - 创建日历权限
- `getMainCalendar()` - 获取主日历信息（别名方法）

### ScheduleModule

日程管理模块。

#### 日程基础管理

- `createSchedule(params)` - 创建日程
- `updateSchedule(params)` - 更新日程
- `deleteSchedule(params)` - 删除日程
- `getSchedule(params)` - 查询日程
- `getScheduleList(params)` - 查询日程列表（分页）
- `getAllScheduleList(params)` - 获取所有日程列表（自动分页）
- `getFreeBusy(params)` - 查看日程忙闲

#### 日程参与者管理

- `addScheduleAttendees(params)` - 添加日程参与者
- `removeScheduleAttendees(params)` - 删除日程参与者
- `getScheduleAttendees(params)` - 获取日程参与者列表（分页）
- `getAllScheduleAttendees(params)` - 获取所有日程参与者（自动分页）
- `getAttendeeGroupMembers(params)` - 获取某个日程参与者为用户组的成员
- `getAllAttendeeGroupMembers(params)` - 获取用户组所有成员（自动分页）

#### 日程会议室管理

- `addScheduleMeetingRooms(params)` - 添加日程会议室
- `removeScheduleMeetingRooms(params)` - 删除日程会议室
- `getScheduleMeetingRooms(params)` - 获取日程会议室列表（分页）
- `getAllScheduleMeetingRooms(params)` - 获取所有日程会议室（自动分页）

#### 请假日程管理

- `createLeaveEvent(params)` - 创建请假日程
- `deleteLeaveEvent(params)` - 删除请假日程

#### 便捷方法

- `createSimpleSchedule(calendarId, summary, startTime, endTime, description?)` - 创建简单日程
- `createAllDaySchedule(calendarId, summary, date, description?)` - 创建全天日程
- `getTodaySchedules(calendarId)` - 获取今日日程
- `getThisWeekSchedules(calendarId)` - 获取本周日程

## 开发说明

### 分页处理

所有分页接口都提供两种方式：

1. **分页查询** - 返回单页数据，支持手动分页
2. **自动分页** - 自动处理所有分页，返回完整数据

```typescript
// 分页查询 - 手动控制分页
const pageResult = await userModule.getAllUser({
  page_size: 20,
  page_token: 'next-page-token'
});

// 自动分页 - 获取所有数据
const allUsers = await userModule.getAllUserList();
```

### 错误重试

HTTP客户端支持自动重试机制：

```typescript
const config = {
  retryTimes: 3,  // 重试次数
  timeout: 30000  // 超时时间
};
```

### 调试模式

启用调试模式可以查看详细的请求日志：

```typescript
const config = {
  debug: true
};
```

## 许可证

MIT

## 贡献

欢迎提交Issue和Pull Request！

## 日历API

### 日历管理

```typescript
// 获取主日历信息
const primaryCalendar = await calendarModule.getPrimaryCalendar();
console.log('主日历:', primaryCalendar);

// 创建新日历
const newCalendar = await calendarModule.createCalendar({
  summary: '项目日历',
  description: '用于管理项目相关的日程',
  time_zone: 'Asia/Shanghai'
});

// 创建日历权限
const permission = await calendarModule.createCalendarPermission({
  calendar_id: newCalendar.calendar_id,
  principal_id: 'user-id-123',
  principal_type: 'user',
  role: 'writer'
});
```

### 日程管理

```typescript
// 创建简单日程
const simpleSchedule = await scheduleModule.createSimpleSchedule(
  'calendar-id',
  '项目会议',
  '2024-01-15T10:00:00+08:00',
  '2024-01-15T11:00:00+08:00',
  '讨论项目进度和下一步计划'
);

// 创建全天日程
const allDaySchedule = await scheduleModule.createAllDaySchedule(
  'calendar-id',
  '团建活动',
  '2024-01-20',
  '公司年度团建活动'
);

// 创建复杂日程（带参与者和提醒）
const complexSchedule = await scheduleModule.createSchedule({
  calendar_id: 'calendar-id',
  summary: '重要客户会议',
  description: '与重要客户讨论合作事宜',
  start: {
    date_time: '2024-01-16T14:00:00+08:00',
    time_zone: 'Asia/Shanghai'
  },
  end: {
    date_time: '2024-01-16T16:00:00+08:00',
    time_zone: 'Asia/Shanghai'
  },
  attendees: [
    {
      display_name: '张三',
      email: 'zhangsan@example.com',
      type: 'user'
    }
  ],
  reminders: [
    { method: 'email', minutes: 60 },
    { method: 'popup', minutes: 15 }
  ],
  status: 'confirmed',
  visibility: 'private'
});

// 更新日程
const updatedSchedule = await scheduleModule.updateSchedule({
  calendar_id: 'calendar-id',
  event_id: 'event-id',
  summary: '项目会议（已更新）',
  description: '讨论项目进度、风险和解决方案'
});

// 删除日程
await scheduleModule.deleteSchedule({
  calendar_id: 'calendar-id',
  event_id: 'event-id'
});

// 查询日程
const schedule = await scheduleModule.getSchedule({
  calendar_id: 'calendar-id',
  event_id: 'event-id'
});

// 查询日程列表（分页）
const scheduleList = await scheduleModule.getScheduleList({
  calendar_id: 'calendar-id',
  time_min: '2024-01-01T00:00:00+08:00',
  time_max: '2024-01-31T23:59:59+08:00',
  page_size: 20,
  single_events: true,
  order_by: 'startTime'
});

// 获取所有日程（自动分页）
const allSchedules = await scheduleModule.getAllScheduleList({
  calendar_id: 'calendar-id',
  time_min: '2024-01-01T00:00:00+08:00',
  time_max: '2024-01-31T23:59:59+08:00'
});

// 获取今日日程
const todaySchedules = await scheduleModule.getTodaySchedules('calendar-id');

// 获取本周日程
const weekSchedules = await scheduleModule.getThisWeekSchedules('calendar-id');
```

### 参与者管理

```typescript
// 添加日程参与者
await scheduleModule.addScheduleAttendees({
  calendar_id: 'calendar-id',
  event_id: 'event-id',
  attendees: [
    {
      display_name: '王五',
      email: 'wangwu@example.com',
      type: 'user'
    }
  ]
});

// 删除日程参与者
await scheduleModule.removeScheduleAttendees({
  calendar_id: 'calendar-id',
  event_id: 'event-id',
  user_ids: ['user-id-1', 'user-id-2']
});

// 获取日程参与者列表
const attendees = await scheduleModule.getScheduleAttendees({
  calendar_id: 'calendar-id',
  event_id: 'event-id',
  page_size: 20
});

// 获取所有参与者（自动分页）
const allAttendees = await scheduleModule.getAllScheduleAttendees({
  calendar_id: 'calendar-id',
  event_id: 'event-id'
});

// 获取用户组成员
const groupMembers = await scheduleModule.getAttendeeGroupMembers({
  calendar_id: 'calendar-id',
  event_id: 'event-id',
  group_id: 'group-id',
  page_size: 20
});
```

### 会议室管理

```typescript
// 添加日程会议室
await scheduleModule.addScheduleMeetingRooms({
  calendar_id: 'calendar-id',
  event_id: 'event-id',
  meeting_rooms: [
    {
      display_name: '会议室A',
      email: 'room-a@example.com'
    }
  ]
});

// 删除日程会议室
await scheduleModule.removeScheduleMeetingRooms({
  calendar_id: 'calendar-id',
  event_id: 'event-id',
  room_ids: ['room-id-1', 'room-id-2']
});

// 获取日程会议室列表
const meetingRooms = await scheduleModule.getScheduleMeetingRooms({
  calendar_id: 'calendar-id',
  event_id: 'event-id',
  page_size: 20
});

// 获取所有会议室（自动分页）
const allMeetingRooms = await scheduleModule.getAllScheduleMeetingRooms({
  calendar_id: 'calendar-id',
  event_id: 'event-id'
});
```

### 忙闲查询

```typescript
// 查看用户忙闲状态
const freeBusy = await scheduleModule.getFreeBusy({
  time_min: '2024-01-15T00:00:00+08:00',
  time_max: '2024-01-15T23:59:59+08:00',
  user_ids: ['user-id-123', 'user-id-456']
});

console.log('用户忙闲状态:', freeBusy);
```

### 请假日程

```typescript
// 创建请假日程
const leaveEvent = await scheduleModule.createLeaveEvent({
  calendar_id: 'calendar-id',
  summary: '年假',
  description: '春节假期',
  start: { date: '2024-02-10' },
  end: { date: '2024-02-17' },
  is_all_day: true,
  leave_type: '年假'
});

// 删除请假日程
await scheduleModule.deleteLeaveEvent({
  calendar_id: 'calendar-id',
  leave_event_id: 'leave-event-id'
});
```

## 消息与会话API

### 消息发送

基于WPS协作机器人API文档实现的消息发送功能：
- [发送消息API文档](https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/message/create-msg.html)
- API地址：`POST https://openapi.wps.cn/v7/messages/batch_create`

#### 基本用法

```typescript
const messageModule = wasV7.getMessageModule();

// 定义接收者
const receivers = [
  { type: 'user', id: 'user_123' },
  { type: 'dept', id: 'dept_456' },
  { type: 'chat', id: 'chat_789' }
];

// 发送文本消息
const result = await messageModule.sendTextMessage(
  receivers,
  '这是一条文本消息'
);
console.log('消息ID:', result.message_id);
```

#### 支持的消息类型

##### 1. 文本消息 (text)

```typescript
await messageModule.sendTextMessage(
  receivers,
  '这是一条文本消息'
);
```

##### 2. 富文本消息 (rich_text)

支持Markdown格式：

```typescript
const markdownContent = `
# 重要通知

**会议安排：**
- 时间：明天上午10点
- 地点：会议室A

请准时参加！
`;

await messageModule.sendRichTextMessage(
  receivers,
  markdownContent
);
```

##### 3. 图片消息 (image)

```typescript
await messageModule.sendImageMessage(
  receivers,
  'image_storage_key_12345',
  { width: 800, height: 600, size: 1024000 }
);
```

##### 4. 文件消息 (file)

```typescript
await messageModule.sendFileMessage(
  receivers,
  'file_storage_key_67890',
  '项目计划.docx',
  { size: 2048000, suffix: 'docx' }
);
```

##### 5. 音频消息 (audio)

```typescript
await messageModule.sendAudioMessage(
  receivers,
  'audio_storage_key_11111',
  { duration: 30, size: 500000 }
);
```

##### 6. 视频消息 (video)

```typescript
await messageModule.sendVideoMessage(
  receivers,
  'video_storage_key_22222',
  {
    codec: 'h264',
    format: 'mp4',
    width: 1920,
    height: 1080,
    duration: 120,
    size: 10240000,
    cover_storage_key: 'cover_storage_key_33333'
  }
);
```

##### 7. 卡片消息 (card)

```typescript
const cardContent = {
  config: {
    wide_screen_mode: true,
    enable_forward: true
  },
  i18n_items: [
    {
      language: 'zh_cn',
      elements: [
        {
          tag: 'div',
          text: {
            content: '这是一个消息卡片',
            tag: 'plain_text'
          }
        }
      ],
      header: {
        title: {
          content: '卡片标题',
          tag: 'plain_text'
        }
      }
    }
  ],
  link: {
    url: 'https://example.com'
  }
};

await messageModule.sendCardMessage(receivers, cardContent);
```

#### @人功能

按照官方文档实现的@人功能：

##### @特定用户

```typescript
// 定义提及的用户
const mentions = [
  { id: '2', user_id: 'user_123', name: '张三' },
  { id: '3', user_id: 'user_456', name: '李四' }
];

// 构建包含@标签的文本
const textWithMentions = MessageModule.buildMentionText(
  '大家好 @张三 @李四，请查看这个消息',
  [
    { id: '2', name: '张三' },
    { id: '3', name: '李四' }
  ]
);

// 发送@人消息
await messageModule.sendTextMessage(
  receivers,
  textWithMentions,
  mentions
);
```

##### @所有人

```typescript
// 构建@所有人文本（id固定为1）
const allMentionText = MessageModule.buildMentionAllText('@所有人 重要通知！');
const allMentions = [
  { id: '1', user_id: 'all' }
];

await messageModule.sendTextMessage(
  receivers,
  allMentionText,
  allMentions
);
```

#### 批量发送

```typescript
const batchReceivers = [
  [{ type: 'user', id: 'user_111' }],
  [{ type: 'user', id: 'user_222' }],
  [{ type: 'user', id: 'user_333' }]
];

const results = await messageModule.batchSendMessage(
  batchReceivers,
  {
    type: 'text',
    mentions: [],
    content: { text: '这是批量发送的消息' }
  }
);
```

#### 直接使用sendMessage方法

```typescript
import type { SendMessageParams } from '@stratix/was-v7';

const params: SendMessageParams = {
  type: 'text',
  receivers: [
    { type: 'user', id: 'user_123' }
  ],
  mentions: [],
  content: {
    text: '使用完整sendMessage方法发送的消息'
  }
};

const result = await messageModule.sendMessage(params);
```

### 接收者类型

支持以下接收者类型：

| 类型 | 说明 | 示例 |
|------|------|------|
| `company` | 企业 | `{ type: 'company', id: 'company_id' }` |
| `dept` | 部门 | `{ type: 'dept', id: 'dept_id' }` |
| `user` | 用户 | `{ type: 'user', id: 'user_id' }` |
| `chat` | 会话/群聊 | `{ type: 'chat', id: 'chat_id' }` |
| `user_group` | 用户组 | `{ type: 'user_group', id: 'group_id' }` |

### 错误处理

```typescript
try {
  const result = await messageModule.sendTextMessage(receivers, '消息内容');
  console.log('发送成功:', result.message_id);
} catch (error) {
  console.error('发送失败:', error);
  
  // 处理不合法的接收者
  if (error.response?.data?.invalid_receivers) {
    console.log('不合法的接收者:', error.response.data.invalid_receivers);
  }
}
```

### 消息管理

```typescript
// 更新消息
await messageModule.updateMessage({
  message_id: 'msg123',
  type: 'text',
  content: { text: '这是更新后的消息内容' }
});

// 撤回消息
await messageModule.revokeMessage({
  message_id: 'msg123'
});

// 获取消息内容
const messageContent = await messageModule.getMessageContent({
  message_id: 'msg123'
});

// 根据业务ID获取消息ID
const messageIdInfo = await messageModule.getMessageIdByBusinessId({
  business_id: 'business123'
});
```

### 会话管理

```typescript
// 创建单聊
const singleChatResult = await chatModule.createSingleChat('user123');

// 创建群聊
const groupChatResult = await chatModule.createGroupChat(
  ['user1', 'user2', 'user3'], // 成员列表
  '项目讨论组', // 群名
  '用于讨论项目相关事宜' // 描述
);

// 获取会话信息
const chatInfo = await chatModule.getChatInfo('chat123');

// 获取会话列表
const chatList = await chatModule.getChatList({
  page_size: 20,
  chat_type: 'group'
});

// 获取所有会话（自动分页）
const allChats = await chatModule.getAllChatList('group');

// 更新会话信息
await chatModule.updateChat({
  chat_id: 'chat123',
  name: '新的群聊名称',
  description: '更新后的描述'
});

// 解散群聊
await chatModule.dismissChat({ chat_id: 'chat123' });
```

### 群成员管理

```typescript
// 添加群成员
await chatModule.addMember('chat123', 'user456');

// 批量添加群成员
await chatModule.batchAddMembers({
  chat_id: 'chat123',
  user_ids: ['user456', 'user789']
});

// 获取群成员列表
const members = await chatModule.getChatMembers({
  chat_id: 'chat123',
  page_size: 20
});

// 获取所有群成员（自动分页）
const allMembers = await chatModule.getAllChatMembers('chat123');

// 删除群成员
await chatModule.removeMember('chat123', 'user456');

// 批量删除群成员
await chatModule.batchRemoveMembers({
  chat_id: 'chat123',
  user_ids: ['user456', 'user789']
});

// 检查用户是否在群中
const isInChat = await chatModule.isUserInChat('chat123', 'user456');

// 获取群管理员列表
const admins = await chatModule.getChatAdmins('chat123');
```

### 消息历史

```typescript
// 获取会话历史消息（分页）
const chatHistory = await messageModule.getChatHistory({
  chat_id: 'chat123',
  page_size: 50,
  start_time: '2024-01-01T00:00:00+08:00',
  end_time: '2024-01-31T23:59:59+08:00'
});

// 获取所有历史消息（自动分页）
const allHistory = await messageModule.getAllChatHistory('chat123', {
  startTime: '2024-01-01T00:00:00+08:00',
  endTime: '2024-01-31T23:59:59+08:00'
});
```

### 部门群管理

```typescript
// 创建部门群
const deptChatResult = await chatModule.createDeptChat({
  dept_id: 'dept123',
  name: '技术部讨论群'
});

// 部门群转普通群
await chatModule.convertDeptChat({ chat_id: 'chat123' });

// 设置部门群群主
await chatModule.setDeptChatOwner({
  chat_id: 'chat123',
  owner_id: 'user123'
});
```

### 其他功能

```typescript
// 获取用户未读消息数
const unreadCount = await chatModule.getUserUnreadCount({
  user_id: 'user123'
});

// 根据用户ID获取单聊会话ID
const chatIdInfo = await chatModule.getChatIdByUserId({
  user_id: 'user123'
});

// 构建@所有人的文本
const mentionAllText = MessageModule.buildMentionAllText('通知：@所有人 请注意');
```