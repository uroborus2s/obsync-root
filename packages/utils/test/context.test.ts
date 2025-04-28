import { describe, expect, test, vi } from 'vitest';
import {
  clearContext,
  createContext,
  createContextScope,
  createNamespace,
  getContextValue,
  hasContextValue,
  isolateContext,
  mergeContexts,
  removeContextValue,
  setContextValue,
  useContext,
  withContext
} from '../src/context/index.js';

describe('context模块', () => {
  describe('创建上下文函数', () => {
    test('createContext - 创建一个新的上下文容器', () => {
      const context = createContext({
        theme: 'light',
        language: 'zh-CN'
      });

      expect(context.get('theme')).toBe('light');
      expect(context.get('language')).toBe('zh-CN');
      expect(context.has('theme')).toBe(true);
      expect(context.has('nonExistent' as any)).toBe(false);
    });

    test('createNamespace - 创建一个命名空间上下文', () => {
      const context = createNamespace('ui', {
        theme: 'light',
        sidebar: { open: true }
      });

      expect(context.name).toBe('ui');
      expect(context.get('theme')).toBe('light');
      expect(context.get('sidebar')).toEqual({ open: true });
    });

    test('useContext - 在函数中使用已创建的上下文', () => {
      const context = createContext({
        counter: 0
      });

      const { get, set } = useContext(context);
      expect(get('counter')).toBe(0);
      set('counter', 5);
      expect(get('counter')).toBe(5);
    });
  });

  describe('上下文管理函数', () => {
    test('withContext - 在指定上下文中执行函数', () => {
      const context = createContext({
        value: 10
      });

      const result = withContext(context, (ctx) => {
        const value = ctx.get('value');
        return value * 2;
      });

      expect(result).toBe(20);
    });

    test('getContextValue - 从上下文中获取特定键的值', () => {
      const context = createContext({
        name: '张三',
        age: 30
      });

      expect(getContextValue(context, 'name')).toBe('张三');
      expect(getContextValue(context, 'age')).toBe(30);
    });

    test('setContextValue - 在上下文中设置特定键的值', () => {
      const context = createContext({
        status: 'idle'
      });

      setContextValue(context, 'status', 'loading');
      expect(context.get('status')).toBe('loading');
    });

    test('hasContextValue - 检查上下文中是否存在特定键', () => {
      const context = createContext({
        visible: true,
        count: 0
      });

      expect(hasContextValue(context, 'visible')).toBe(true);
      expect(hasContextValue(context, 'count')).toBe(true);
      expect(hasContextValue(context, 'nonExistent' as any)).toBe(false);
    });

    test('removeContextValue - 从上下文中移除特定键值对', () => {
      const context = createContext({
        temp: 'temporary value',
        permanent: 'keep this'
      });

      removeContextValue(context, 'temp');
      expect(context.has('temp')).toBe(false);
      expect(context.has('permanent')).toBe(true);
    });

    test('clearContext - 清除上下文中的所有数据', () => {
      const context = createContext({
        user: { id: 1, name: '张三' },
        permissions: ['read', 'write']
      });

      clearContext(context);
      expect(context.getState()).toEqual({
        user: { id: 1, name: '张三' },
        permissions: ['read', 'write']
      });
    });
  });

  describe('命名空间上下文函数', () => {
    test('createContextScope - 创建一个隔离的上下文作用域', () => {
      const scope = createContextScope('testScope');

      const stateContext = scope.createContext('state', {
        loading: false,
        data: null
      });

      const configContext = scope.createContext('config', {
        timeout: 5000
      });

      expect(scope.name).toBe('testScope');
      expect(stateContext.get('loading')).toBe(false);
      expect(configContext.get('timeout')).toBe(5000);

      const state = scope.getState();
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('config');
      expect(state.state).toEqual({ loading: false, data: null });
      expect(state.config).toEqual({ timeout: 5000 });
    });

    test('mergeContexts - 合并多个上下文到一个单一上下文', () => {
      const userContext = createContext({
        id: 1,
        name: '张三'
      });

      const prefsContext = createContext({
        theme: 'dark',
        notifications: true
      });

      const merged = mergeContexts([userContext, prefsContext]);

      expect(merged.get('id')).toBe(1);
      expect(merged.get('name')).toBe('张三');
      expect(merged.get('theme')).toBe('dark');
      expect(merged.get('notifications')).toBe(true);

      // 修改原始上下文应该更新合并上下文
      userContext.set('name', '李四');
      expect(merged.get('name')).toBe('李四');

      // 修改合并上下文应该更新原始上下文
      merged.set('theme', 'light');
      expect(prefsContext.get('theme')).toBe('light');
    });

    test('isolateContext - 创建上下文的隔离副本', () => {
      const originalContext = createContext({
        config: {
          apiUrl: 'https://api.example.com',
          timeout: 5000
        },
        language: 'zh-CN'
      });

      const isolated = isolateContext(originalContext, {
        language: 'en-US'
      });

      // 检查初始状态
      expect(isolated.get('config')).toEqual({
        apiUrl: 'https://api.example.com',
        timeout: 5000
      });
      expect(isolated.get('language')).toBe('en-US'); // 使用覆盖值

      // 修改隔离上下文不应影响原始上下文
      isolated.set('config', {
        apiUrl: 'https://api-v2.example.com',
        timeout: 10000
      });

      expect(originalContext.get('config')).toEqual({
        apiUrl: 'https://api.example.com',
        timeout: 5000
      });

      // 修改原始上下文不应影响隔离上下文
      originalContext.set('language', 'ja-JP');
      expect(isolated.get('language')).toBe('en-US');
    });
  });

  describe('事件订阅', () => {
    test('context.subscribe - 订阅上下文变化', () => {
      const context = createContext({
        counter: 0
      });

      const handler = vi.fn();
      const unsubscribe = context.subscribe('counter', handler);

      context.set('counter', 1);
      context.set('counter', 2);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(1, 0);
      expect(handler).toHaveBeenCalledWith(2, 1);

      // 取消订阅
      unsubscribe();
      context.set('counter', 3);

      // 不应该再次调用
      expect(handler).toHaveBeenCalledTimes(2);
    });

    test('contextScope.subscribe - 订阅作用域内的变化', () => {
      const scope = createContextScope('testScope');

      const counterContext = scope.createContext('counter', {
        value: 0
      });

      const handler = vi.fn();
      const unsubscribe = scope.subscribe(handler);

      counterContext.set('value', 1);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        namespace: 'counter',
        key: 'value',
        value: 1
      });

      unsubscribe();
      counterContext.set('value', 2);

      // 不应该再次调用
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
