// RESOLVER 内联选项测试
// 测试 Awilix 12 RESOLVER 语法支持

import { InjectionMode, Lifetime, RESOLVER } from 'awilix';
import { describe, expect, it } from 'vitest';
import {
  getInjectableLifetime,
  getResolverOptions,
  isInjectable,
  ResolverUtils
} from '../injection.js';

describe('RESOLVER 内联选项支持', () => {
  describe('isInjectable 函数', () => {
    it('应该识别带有 RESOLVER 属性的类', () => {
      class TestService {
        static [RESOLVER] = {
          lifetime: Lifetime.SINGLETON
        };
      }

      expect(isInjectable(TestService)).toBe(true);
    });

    it('应该识别带有复杂 RESOLVER 配置的类', () => {
      class ComplexService {
        static [RESOLVER] = {
          lifetime: Lifetime.SCOPED,
          injectionMode: InjectionMode.PROXY,
          dispose: (instance: any) => instance.cleanup()
        };
      }

      expect(isInjectable(ComplexService)).toBe(true);
    });

    it('应该拒绝没有 RESOLVER 属性的类', () => {
      class PlainClass {
        // 没有 RESOLVER 属性
      }

      expect(isInjectable(PlainClass)).toBe(false);
    });

    it('应该拒绝非函数类型', () => {
      expect(isInjectable(null)).toBe(false);
      expect(isInjectable(undefined)).toBe(false);
      expect(isInjectable({})).toBe(false);
      expect(isInjectable('string')).toBe(false);
      expect(isInjectable(123)).toBe(false);
    });
  });

  describe('getResolverOptions 函数', () => {
    it('应该正确获取 RESOLVER 选项', () => {
      class TestService {
        static [RESOLVER] = {
          lifetime: Lifetime.SINGLETON,
          injectionMode: InjectionMode.PROXY
        };
      }

      const options = getResolverOptions(TestService);
      expect(options).toEqual({
        lifetime: Lifetime.SINGLETON,
        injectionMode: InjectionMode.PROXY
      });
    });

    it('应该处理带有 dispose 函数的 RESOLVER', () => {
      const disposeFunction = (instance: any) => instance.cleanup();

      class TestService {
        static [RESOLVER] = {
          lifetime: Lifetime.SINGLETON,
          dispose: disposeFunction
        };
      }

      const options = getResolverOptions(TestService);
      expect(options.dispose).toBe(disposeFunction);
    });

    it('应该对没有 RESOLVER 的类返回 null', () => {
      class PlainClass {}

      expect(getResolverOptions(PlainClass)).toBeNull();
    });

    it('应该对非函数类型返回 null', () => {
      expect(getResolverOptions(null)).toBeNull();
      expect(getResolverOptions({})).toBeNull();
      expect(getResolverOptions('string')).toBeNull();
    });
  });

  describe('getInjectableLifetime 函数', () => {
    it('应该从 RESOLVER 选项获取生命周期', () => {
      class SingletonService {
        static [RESOLVER] = {
          lifetime: Lifetime.SINGLETON
        };
      }

      class ScopedService {
        static [RESOLVER] = {
          lifetime: Lifetime.SCOPED
        };
      }

      class TransientService {
        static [RESOLVER] = {
          lifetime: Lifetime.TRANSIENT
        };
      }

      expect(getInjectableLifetime(SingletonService)).toBe('SINGLETON');
      expect(getInjectableLifetime(ScopedService)).toBe('SCOPED');
      expect(getInjectableLifetime(TransientService)).toBe('TRANSIENT');
    });

    it('应该为没有 RESOLVER 的类返回默认生命周期', () => {
      class PlainClass {}

      expect(getInjectableLifetime(PlainClass)).toBe('SINGLETON');
    });
  });

  describe('ResolverUtils 工具集', () => {
    it('应该包含所有必要的工具函数', () => {
      expect(ResolverUtils.getResolverOptions).toBeDefined();
      expect(ResolverUtils.isInjectable).toBeDefined();
      expect(ResolverUtils.getInjectableName).toBeDefined();
      expect(ResolverUtils.getInjectableLifetime).toBeDefined();
    });

    it('应该正确工作', () => {
      class TestService {
        static [RESOLVER] = {
          lifetime: Lifetime.SINGLETON,
          injectionMode: InjectionMode.PROXY
        };
      }

      expect(ResolverUtils.isInjectable(TestService)).toBe(true);
      expect(ResolverUtils.getInjectableLifetime(TestService)).toBe(
        'SINGLETON'
      );
    });
  });
});

describe('本地注入配置测试', () => {
  it('应该支持 localInjections 配置', () => {
    const factory = (pluginOptions: any) => ({
      config: pluginOptions.database || {}
    });

    class DatabaseService {
      static [RESOLVER] = {
        lifetime: Lifetime.SINGLETON,
        localInjections: {
          factory
        }
      };
    }

    const options = getResolverOptions(DatabaseService);
    expect(options.localInjections).toBeDefined();
    expect(options.localInjections.factory).toBe(factory);
  });

  it('应该正确执行本地注入工厂函数', () => {
    const mockPluginOptions = {
      database: {
        host: 'localhost',
        port: 5432
      }
    };

    class DatabaseService {
      static [RESOLVER] = {
        lifetime: Lifetime.SINGLETON,
        localInjections: {
          factory: (pluginOptions: any) => ({
            config: {
              host: pluginOptions.database?.host || 'default',
              port: pluginOptions.database?.port || 3306
            }
          })
        }
      };
    }

    const options = getResolverOptions(DatabaseService);
    const injections = options.localInjections.factory(mockPluginOptions);

    expect(injections.config.host).toBe('localhost');
    expect(injections.config.port).toBe(5432);
  });
});

describe('错误处理测试', () => {
  it('应该处理损坏的 RESOLVER 配置', () => {
    class BrokenService {
      static [RESOLVER] = null; // 损坏的配置
    }

    expect(() => getResolverOptions(BrokenService)).not.toThrow();
    expect(getResolverOptions(BrokenService)).toBeNull();
  });

  it('应该处理循环引用的 RESOLVER 配置', () => {
    const circularRef: any = {};
    circularRef.self = circularRef;

    class CircularService {
      static [RESOLVER] = circularRef;
    }

    expect(() => getResolverOptions(CircularService)).not.toThrow();
  });
});
