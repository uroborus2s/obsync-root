import { asValue, createContainer } from 'awilix';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWpsCalendarAdapter } from '../adapters/calendar.adapter.js';
import { createWpsCompanyAdapter } from '../adapters/company.adapter.js';
import { createWpsDepartmentAdapter } from '../adapters/department.adapter.js';
import { createWpsScheduleAdapter } from '../adapters/schedule.adapter.js';
import { createWpsUserAdapter } from '../adapters/user.adapter.js';

describe('WPS V7 适配器架构测试', () => {
  let container: ReturnType<typeof createContainer>;
  let mockHttpClient: any;
  let mockLogger: any;

  beforeEach(() => {
    mockHttpClient = {
      ensureAccessToken: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    };
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    container = createContainer();
    container.register({
      httpClientService: asValue(mockHttpClient),
      logger: asValue(mockLogger)
    });
  });

  it('应该能够创建核心适配器', () => {
    expect(createWpsUserAdapter(container)).toBeDefined();
    expect(createWpsDepartmentAdapter(container)).toBeDefined();
    expect(createWpsCompanyAdapter(container)).toBeDefined();
    expect(createWpsCalendarAdapter(container)).toBeDefined();
    expect(createWpsScheduleAdapter(container)).toBeDefined();
  });

  it('适配器应该通过当前 httpClientService token 解析依赖', async () => {
    const userAdapter = createWpsUserAdapter(container);
    mockHttpClient.post.mockResolvedValue({ data: { user_id: 'test123' } });

    await userAdapter.createUser({
      name: '测试用户',
      mobile: '13800138000',
      dept_ids: ['dept1']
    });

    expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
    expect(mockHttpClient.post).toHaveBeenCalledWith('/v7/contacts/users', {
      name: '测试用户',
      mobile: '13800138000',
      dept_ids: ['dept1']
    });
  });
});
