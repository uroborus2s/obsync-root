/**
 * 汉字请求头处理测试（简化版）
 *
 * 只测试X-User-Name、X-User-College、X-User-Major、X-User-Class这几个包含汉字的请求头
 * 版本: v1.0.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseIdentityFromHeaders } from '../utils/identity-parser.js';

// Mock logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('Chinese Headers Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should decode the 4 Chinese headers correctly', () => {
    const headers = {
      'x-user-id': 'user123',
      'x-user-name': encodeURIComponent('张三'),
      'x-user-college': encodeURIComponent('计算机学院'),
      'x-user-major': encodeURIComponent('软件工程'),
      'x-user-class': encodeURIComponent('软工2021-1班'),
      'x-user-type': 'student'
    };

    const result = parseIdentityFromHeaders(headers, mockLogger as any);

    expect(result.success).toBe(true);
    expect(result.identity!.username).toBe('张三');
    expect(result.identity!.collegeName).toBe('计算机学院');
    expect(result.identity!.majorName).toBe('软件工程');
    expect(result.identity!.className).toBe('软工2021-1班');
  });

  it('should handle ASCII headers normally', () => {
    const headers = {
      'x-user-id': 'user123',
      'x-user-name': 'john.doe',
      'x-user-email': 'john@example.com',
      'x-user-type': 'student'
    };

    const result = parseIdentityFromHeaders(headers, mockLogger as any);

    expect(result.success).toBe(true);
    expect(result.identity!.username).toBe('john.doe');
    expect(result.identity!.email).toBe('john@example.com');
  });
});
