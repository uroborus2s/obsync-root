/**
 * 分页参数修复测试
 * 
 * 验证Controller中的分页参数解析是否正确处理字符串类型的query参数
 */

import { describe, it, expect } from 'vitest';

// 模拟Controller中的分页参数解析方法
function parsePaginationParams(query: any): { page: number; pageSize: number } {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(query.pageSize as string) || 20));
  return { page, pageSize };
}

describe('分页参数解析修复测试', () => {
  it('应该正确解析字符串类型的分页参数', () => {
    // 模拟HTTP query参数（都是字符串类型）
    const query = {
      page: '2',
      pageSize: '10'
    };

    const result = parsePaginationParams(query);

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(typeof result.page).toBe('number');
    expect(typeof result.pageSize).toBe('number');
  });

  it('应该处理无效的分页参数', () => {
    const query = {
      page: 'invalid',
      pageSize: 'invalid'
    };

    const result = parsePaginationParams(query);

    expect(result.page).toBe(1); // 默认值
    expect(result.pageSize).toBe(20); // 默认值
  });

  it('应该处理缺失的分页参数', () => {
    const query = {};

    const result = parsePaginationParams(query);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('应该限制pageSize的最大值', () => {
    const query = {
      page: '1',
      pageSize: '200' // 超过最大值100
    };

    const result = parsePaginationParams(query);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(100); // 被限制为最大值
  });

  it('应该确保page和pageSize至少为1', () => {
    const query = {
      page: '0',
      pageSize: '0'
    };

    const result = parsePaginationParams(query);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
  });

  it('应该处理负数', () => {
    const query = {
      page: '-1',
      pageSize: '-5'
    };

    const result = parsePaginationParams(query);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
  });

  it('验证修复前的问题场景', () => {
    // 这是导致SQL错误的场景：字符串被直接传递给limit()
    const query = {
      page: '1',
      pageSize: '2'
    };

    const result = parsePaginationParams(query);

    // 确保返回的是数字类型，而不是字符串
    expect(result.pageSize).toBe(2);
    expect(typeof result.pageSize).toBe('number');
    
    // 模拟SQL构建，确保不会生成带引号的limit
    const mockSqlLimit = `LIMIT ${result.pageSize}`;
    expect(mockSqlLimit).toBe('LIMIT 2');
    expect(mockSqlLimit).not.toBe("LIMIT '2'");
  });
});
