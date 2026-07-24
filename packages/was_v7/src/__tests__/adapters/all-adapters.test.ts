import { asValue, createContainer } from 'awilix';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWpsCalendarAdapter } from '../../adapters/calendar.adapter.js';
import { createWpsChatAdapter } from '../../adapters/chat.adapter.js';
import { createWpsCompanyAdapter } from '../../adapters/company.adapter.js';
import { createWpsDepartmentAdapter } from '../../adapters/department.adapter.js';
import { createWpsMessageAdapter } from '../../adapters/message.adapter.js';
import { createWpsScheduleAdapter } from '../../adapters/schedule.adapter.js';
import { createWpsUserAuthAdapter } from '../../adapters/user-auth.adapter.js';
import { createWpsUserAdapter } from '../../adapters/user.adapter.js';

describe('WPS V7 所有适配器测试', () => {
  let container: ReturnType<typeof createContainer>;

  beforeEach(() => {
    const httpClientService = {
      ensureAccessToken: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    };
    const logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    container = createContainer();
    container.register({
      httpClientService: asValue(httpClientService),
      logger: asValue(logger)
    });
  });

  it('应该能够创建所有公开适配器', () => {
    expect(createWpsUserAdapter(container)).toBeDefined();
    expect(createWpsDepartmentAdapter(container)).toBeDefined();
    expect(createWpsCompanyAdapter(container)).toBeDefined();
    expect(createWpsCalendarAdapter(container)).toBeDefined();
    expect(createWpsScheduleAdapter(container)).toBeDefined();
    expect(createWpsMessageAdapter(container)).toBeDefined();
    expect(createWpsChatAdapter(container)).toBeDefined();
    expect(createWpsUserAuthAdapter(container)).toBeDefined();
  });

  it('应该暴露当前适配器方法集合', () => {
    const user = createWpsUserAdapter(container);
    const calendar = createWpsCalendarAdapter(container);
    const schedule = createWpsScheduleAdapter(container);

    expect(typeof user.createUser).toBe('function');
    expect(typeof user.getUsersByExUserIds).toBe('function');
    expect(typeof calendar.getAllCalendarPermissions).toBe('function');
    expect(typeof calendar.batchCreateCalendarPermissionsLimit).toBe(
      'function'
    );
    expect(typeof schedule.batchCreateAttendees).toBe('function');
  });
});
