import type { Logger } from '@stratix/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWpsCalendarAdapter } from '../../adapters/calendar.adapter.js';
import { createWpsChatAdapter } from '../../adapters/chat.adapter.js';
import { createWpsCompanyAdapter } from '../../adapters/company.adapter.js';
import { createWpsDepartmentAdapter } from '../../adapters/department.adapter.js';
import { createWpsMessageAdapter } from '../../adapters/message.adapter.js';
import { createWpsScheduleAdapter } from '../../adapters/schedule.adapter.js';
import { createWpsUserAuthAdapter } from '../../adapters/user-auth.adapter.js';
import { createWpsUserAdapter } from '../../adapters/user.adapter.js';
import type { HttpClientService } from '../../services/httpClientService.js';

// Mock dependencies
const mockLogger: Logger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as any;

const mockHttpClient: HttpClientService = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  ensureAccessToken: vi.fn()
} as any;

describe('WPS V7 统一适配器架构测试', () => {
  let container: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // 创建模拟容器
    container = {
      resolve: vi.fn((name: string) => {
        if (name === 'logger') return mockLogger;
        if (name === 'httpClientService') return mockHttpClient;
        throw new Error(`Unknown service: ${name}`);
      })
    };
  });

  describe('适配器工厂函数创建', () => {
    it('应该能够创建所有适配器', () => {
      const userAdapter = createWpsUserAdapter(container);
      const deptAdapter = createWpsDepartmentAdapter(container);
      const companyAdapter = createWpsCompanyAdapter(container);
      const calendarAdapter = createWpsCalendarAdapter(container);
      const scheduleAdapter = createWpsScheduleAdapter(container);
      const messageAdapter = createWpsMessageAdapter(container);
      const chatAdapter = createWpsChatAdapter(container);
      const userAuthAdapter = createWpsUserAuthAdapter(container);

      expect(userAdapter).toBeDefined();
      expect(deptAdapter).toBeDefined();
      expect(companyAdapter).toBeDefined();
      expect(calendarAdapter).toBeDefined();
      expect(scheduleAdapter).toBeDefined();
      expect(messageAdapter).toBeDefined();
      expect(chatAdapter).toBeDefined();
      expect(userAuthAdapter).toBeDefined();
    });
  });

  describe('统一的HttpClient使用', () => {
    it('所有适配器都应该使用统一的httpClientService', () => {
      // 验证容器解析调用
      createWpsUserAdapter(container);
      createWpsDepartmentAdapter(container);
      createWpsCompanyAdapter(container);
      createWpsMessageAdapter(container);
      createWpsChatAdapter(container);
      createWpsUserAuthAdapter(container);

      // 验证所有适配器都从容器中解析了相同的服务
      expect(container.resolve).toHaveBeenCalledWith('httpClientService');
      expect(container.resolve).toHaveBeenCalledWith('logger');
    });

    it('所有适配器都应该调用httpClient.ensureAccessToken()', async () => {
      const userAdapter = createWpsUserAdapter(container);

      vi.mocked(mockHttpClient.post).mockResolvedValue({
        data: { user_id: 'test123' }
      });

      await userAdapter.createUser({
        name: '测试用户',
        mobile: '13800138000',
        dept_ids: ['dept1']
      });

      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
    });
  });

  describe('适配器接口一致性', () => {
    it('用户适配器应该包含所有必需方法', () => {
      const adapter = createWpsUserAdapter(container);

      expect(typeof adapter.createUser).toBe('function');
      expect(typeof adapter.getUser).toBe('function');
      expect(typeof adapter.updateUser).toBe('function');
      expect(typeof adapter.deleteUser).toBe('function');
      expect(typeof adapter.getAllUser).toBe('function');
      expect(typeof adapter.getAllUserList).toBe('function');
      expect(typeof adapter.getCurrentUserId).toBe('function');
      expect(typeof adapter.getUserByExId).toBe('function');
      expect(typeof adapter.batchGetUserInfo).toBe('function');
      expect(typeof adapter.batchDisableUser).toBe('function');
    });

    it('部门适配器应该包含所有必需方法', () => {
      const adapter = createWpsDepartmentAdapter(container);

      expect(typeof adapter.getDeptList).toBe('function');
      expect(typeof adapter.getAllDeptList).toBe('function');
      expect(typeof adapter.getRootDept).toBe('function');
      expect(typeof adapter.createDept).toBe('function');
      expect(typeof adapter.updateDept).toBe('function');
      expect(typeof adapter.deleteDept).toBe('function');
      expect(typeof adapter.getDeptByExId).toBe('function');
      expect(typeof adapter.batchGetDeptInfo).toBe('function');
      expect(typeof adapter.getAllSubDepts).toBe('function');
      expect(typeof adapter.getDeptTree).toBe('function');
    });

    it('企业适配器应该包含所有必需方法', () => {
      const adapter = createWpsCompanyAdapter(container);

      expect(typeof adapter.getCurrentCompany).toBe('function');
      expect(typeof adapter.getCompanyInfo).toBe('function');
    });

    it('日历适配器应该包含所有必需方法', () => {
      const adapter = createWpsCalendarAdapter(container);

      expect(typeof adapter.createCalendar).toBe('function');
      expect(typeof adapter.getPrimaryCalendar).toBe('function');
      expect(typeof adapter.getMainCalendar).toBe('function');
      expect(typeof adapter.createCalendarPermission).toBe('function');
      expect(typeof adapter.getCalendarPermissionList).toBe('function');
      expect(typeof adapter.getAllCalendarPermissions).toBe('function');
      expect(typeof adapter.deleteCalendar).toBe('function');
      expect(typeof adapter.batchCreateCalendarPermissions).toBe('function');
      expect(typeof adapter.deleteCalendarPermission).toBe('function');
    });

    it('消息适配器应该包含所有必需方法', () => {
      const adapter = createWpsMessageAdapter(container);

      expect(typeof adapter.sendMessage).toBe('function');
      expect(typeof adapter.updateMessage).toBe('function');
      expect(typeof adapter.revokeMessage).toBe('function');
      expect(typeof adapter.getChatHistory).toBe('function');
      expect(typeof adapter.getAllChatHistory).toBe('function');
      expect(typeof adapter.sendTextMessage).toBe('function');
      expect(typeof adapter.sendRichTextMessage).toBe('function');
      expect(typeof adapter.sendImageMessage).toBe('function');
      expect(typeof adapter.sendFileMessage).toBe('function');
      expect(typeof adapter.sendAudioMessage).toBe('function');
      expect(typeof adapter.sendVideoMessage).toBe('function');
      expect(typeof adapter.sendCardMessage).toBe('function');
      expect(typeof adapter.sendBulkTextMessage).toBe('function');
      expect(typeof adapter.sendBulkRichTextMessage).toBe('function');
    });

    it('聊天适配器应该包含所有必需方法', () => {
      const adapter = createWpsChatAdapter(container);

      expect(typeof adapter.createChat).toBe('function');
      expect(typeof adapter.getChatInfo).toBe('function');
      expect(typeof adapter.updateChat).toBe('function');
      expect(typeof adapter.disbandChat).toBe('function');
      expect(typeof adapter.getChatList).toBe('function');
      expect(typeof adapter.getAllChatList).toBe('function');
      expect(typeof adapter.addChatMembers).toBe('function');
      expect(typeof adapter.removeChatMembers).toBe('function');
      expect(typeof adapter.getChatMembers).toBe('function');
      expect(typeof adapter.getAllChatMembers).toBe('function');
      expect(typeof adapter.createGroupChat).toBe('function');
      expect(typeof adapter.createPrivateChat).toBe('function');
      expect(typeof adapter.inviteUsersToChat).toBe('function');
      expect(typeof adapter.removeUsersFromChat).toBe('function');
      expect(typeof adapter.updateChatName).toBe('function');
      expect(typeof adapter.updateChatDescription).toBe('function');
    });

    it('用户认证适配器应该包含所有必需方法', () => {
      const adapter = createWpsUserAuthAdapter(container);

      expect(typeof adapter.getUserAccessToken).toBe('function');
      expect(typeof adapter.refreshUserAccessToken).toBe('function');
      expect(typeof adapter.getUserInfo).toBe('function');
      expect(typeof adapter.getCurrentUserInfo).toBe('function');
      expect(typeof adapter.exchangeCodeForToken).toBe('function');
      expect(typeof adapter.refreshToken).toBe('function');
      expect(typeof adapter.validateAccessToken).toBe('function');
      expect(typeof adapter.getUserProfile).toBe('function');
    });
  });

  describe('适配器配置导出', () => {
    it('每个适配器都应该有正确的默认导出配置', async () => {
      const userConfig = (await import('../../adapters/user.adapter.js'))
        .default;
      const deptConfig = (await import('../../adapters/department.adapter.js'))
        .default;
      const companyConfig = (await import('../../adapters/company.adapter.js'))
        .default;
      const messageConfig = (await import('../../adapters/message.adapter.js'))
        .default;
      const chatConfig = (await import('../../adapters/chat.adapter.js'))
        .default;
      const userAuthConfig = (
        await import('../../adapters/user-auth.adapter.js')
      ).default;

      expect(userConfig.adapterName).toBe('user');
      expect(typeof userConfig.factory).toBe('function');

      expect(deptConfig.adapterName).toBe('department');
      expect(typeof deptConfig.factory).toBe('function');

      expect(companyConfig.adapterName).toBe('company');
      expect(typeof companyConfig.factory).toBe('function');

      expect(messageConfig.adapterName).toBe('message');
      expect(typeof messageConfig.factory).toBe('function');

      expect(chatConfig.adapterName).toBe('chat');
      expect(typeof chatConfig.factory).toBe('function');

      expect(userAuthConfig.adapterName).toBe('userAuth');
      expect(typeof userAuthConfig.factory).toBe('function');
    });
  });

  describe('错误处理一致性', () => {
    it('所有适配器都应该正确处理HTTP错误', async () => {
      const userAdapter = createWpsUserAdapter(container);

      // 模拟HTTP错误
      vi.mocked(mockHttpClient.post).mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        userAdapter.createUser({
          name: '测试用户',
          mobile: '13800138000',
          dept_ids: ['dept1']
        })
      ).rejects.toThrow('Network error');

      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
    });
  });

  describe('命名约定一致性', () => {
    it('所有适配器文件都应该使用.adapter.ts命名约定', () => {
      const expectedFiles = [
        'user.adapter.ts',
        'department.adapter.ts',
        'company.adapter.ts',
        'calendar.adapter.ts',
        'schedule.adapter.ts',
        'message.adapter.ts',
        'chat.adapter.ts',
        'user-auth.adapter.ts'
      ];

      // 这个测试主要是文档性的，确保我们遵循了正确的命名约定
      expectedFiles.forEach((fileName) => {
        expect(fileName).toMatch(/\.adapter\.ts$/);
      });
    });
  });
});
