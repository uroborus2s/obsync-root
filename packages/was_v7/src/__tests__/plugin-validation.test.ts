import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ParameterValidationError } from '../plugin.js';
import type { WasV7PluginOptions } from '../plugin.js';

// 模拟 Fastify 实例
const mockFastify = {
  log: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  },
  decorate: vi.fn()
} as any;

// 由于参数处理和验证函数是内部函数，我们需要通过插件函数来测试
// 这里我们创建一个测试辅助函数来模拟插件加载过程
async function testPluginWithOptions(options: WasV7PluginOptions) {
  // 动态导入插件以获取最新的实现
  const { default: wasV7Plugin } = await import('../plugin.js');
  
  // 调用插件函数
  return wasV7Plugin(mockFastify, options);
}

describe('WPS V7 插件参数验证', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('参数处理器 (parameterProcessor)', () => {
    it('应该合并默认配置和用户配置', async () => {
      const options: WasV7PluginOptions = {
        appId: 'test_app_id',
        appSecret: 'test_app_secret'
      };

      await testPluginWithOptions(options);

      // 验证 fastify.decorate 被调用，说明配置被处理
      expect(mockFastify.decorate).toHaveBeenCalledWith('wasV7Config', expect.objectContaining({
        appId: 'test_app_id',
        appSecret: 'test_app_secret',
        baseUrl: 'https://openapi.wps.cn', // 默认值
        timeout: 60000, // 默认值
        retryTimes: 3, // 默认值
        debug: false // 默认值
      }));
    });

    it('应该允许用户覆盖默认配置', async () => {
      const options: WasV7PluginOptions = {
        appId: 'test_app_id',
        appSecret: 'test_app_secret',
        baseUrl: 'https://custom.api.com',
        timeout: 30000,
        retryTimes: 5,
        debug: true
      };

      await testPluginWithOptions(options);

      expect(mockFastify.decorate).toHaveBeenCalledWith('wasV7Config', expect.objectContaining({
        appId: 'test_app_id',
        appSecret: 'test_app_secret',
        baseUrl: 'https://custom.api.com',
        timeout: 30000,
        retryTimes: 5,
        debug: true
      }));
    });

    it('应该在缺少 appId 时抛出错误', async () => {
      const options = {
        appSecret: 'test_app_secret'
      } as WasV7PluginOptions;

      await expect(testPluginWithOptions(options)).rejects.toThrow(ParameterValidationError);
      await expect(testPluginWithOptions(options)).rejects.toThrow('appId is required');
    });

    it('应该在缺少 appSecret 时抛出错误', async () => {
      const options = {
        appId: 'test_app_id'
      } as WasV7PluginOptions;

      await expect(testPluginWithOptions(options)).rejects.toThrow(ParameterValidationError);
      await expect(testPluginWithOptions(options)).rejects.toThrow('appSecret is required');
    });
  });

  describe('参数验证器 (parameterValidator)', () => {
    const validBaseOptions: WasV7PluginOptions = {
      appId: 'test_app_id',
      appSecret: 'test_app_secret'
    };

    describe('appId 验证', () => {
      it('应该拒绝空字符串 appId', async () => {
        const options = { ...validBaseOptions, appId: '' };
        await expect(testPluginWithOptions(options)).rejects.toThrow('appId must be a non-empty string');
      });

      it('应该拒绝只包含空格的 appId', async () => {
        const options = { ...validBaseOptions, appId: '   ' };
        await expect(testPluginWithOptions(options)).rejects.toThrow('appId must be a non-empty string');
      });

      it('应该拒绝非字符串 appId', async () => {
        const options = { ...validBaseOptions, appId: 123 as any };
        await expect(testPluginWithOptions(options)).rejects.toThrow('appId must be a non-empty string');
      });
    });

    describe('appSecret 验证', () => {
      it('应该拒绝空字符串 appSecret', async () => {
        const options = { ...validBaseOptions, appSecret: '' };
        await expect(testPluginWithOptions(options)).rejects.toThrow('appSecret must be a non-empty string');
      });

      it('应该拒绝只包含空格的 appSecret', async () => {
        const options = { ...validBaseOptions, appSecret: '   ' };
        await expect(testPluginWithOptions(options)).rejects.toThrow('appSecret must be a non-empty string');
      });

      it('应该拒绝非字符串 appSecret', async () => {
        const options = { ...validBaseOptions, appSecret: 123 as any };
        await expect(testPluginWithOptions(options)).rejects.toThrow('appSecret must be a non-empty string');
      });
    });

    describe('baseUrl 验证', () => {
      it('应该接受有效的 HTTPS URL', async () => {
        const options = { ...validBaseOptions, baseUrl: 'https://api.example.com' };
        await expect(testPluginWithOptions(options)).resolves.not.toThrow();
      });

      it('应该在调试模式下接受 HTTP URL', async () => {
        const options = { ...validBaseOptions, baseUrl: 'http://localhost:3000', debug: true };
        await expect(testPluginWithOptions(options)).resolves.not.toThrow();
      });

      it('应该在生产模式下拒绝 HTTP URL', async () => {
        const options = { ...validBaseOptions, baseUrl: 'http://api.example.com', debug: false };
        await expect(testPluginWithOptions(options)).rejects.toThrow('baseUrl must use HTTPS protocol in production');
      });

      it('应该拒绝无效的 URL', async () => {
        const options = { ...validBaseOptions, baseUrl: 'invalid-url' };
        await expect(testPluginWithOptions(options)).rejects.toThrow('baseUrl must be a valid URL');
      });
    });

    describe('timeout 验证', () => {
      it('应该接受有效的 timeout 值', async () => {
        const options = { ...validBaseOptions, timeout: 30000 };
        await expect(testPluginWithOptions(options)).resolves.not.toThrow();
      });

      it('应该拒绝负数 timeout', async () => {
        const options = { ...validBaseOptions, timeout: -1000 };
        await expect(testPluginWithOptions(options)).rejects.toThrow('timeout must be a positive number between 1 and 300000');
      });

      it('应该拒绝零 timeout', async () => {
        const options = { ...validBaseOptions, timeout: 0 };
        await expect(testPluginWithOptions(options)).rejects.toThrow('timeout must be a positive number between 1 and 300000');
      });

      it('应该拒绝过大的 timeout', async () => {
        const options = { ...validBaseOptions, timeout: 400000 };
        await expect(testPluginWithOptions(options)).rejects.toThrow('timeout must be a positive number between 1 and 300000');
      });

      it('应该拒绝非数字 timeout', async () => {
        const options = { ...validBaseOptions, timeout: 'invalid' as any };
        await expect(testPluginWithOptions(options)).rejects.toThrow('timeout must be a positive number between 1 and 300000');
      });
    });

    describe('retryTimes 验证', () => {
      it('应该接受有效的 retryTimes 值', async () => {
        const options = { ...validBaseOptions, retryTimes: 5 };
        await expect(testPluginWithOptions(options)).resolves.not.toThrow();
      });

      it('应该接受零 retryTimes', async () => {
        const options = { ...validBaseOptions, retryTimes: 0 };
        await expect(testPluginWithOptions(options)).resolves.not.toThrow();
      });

      it('应该拒绝负数 retryTimes', async () => {
        const options = { ...validBaseOptions, retryTimes: -1 };
        await expect(testPluginWithOptions(options)).rejects.toThrow('retryTimes must be a number between 0 and 10');
      });

      it('应该拒绝过大的 retryTimes', async () => {
        const options = { ...validBaseOptions, retryTimes: 15 };
        await expect(testPluginWithOptions(options)).rejects.toThrow('retryTimes must be a number between 0 and 10');
      });

      it('应该拒绝非数字 retryTimes', async () => {
        const options = { ...validBaseOptions, retryTimes: 'invalid' as any };
        await expect(testPluginWithOptions(options)).rejects.toThrow('retryTimes must be a number between 0 and 10');
      });
    });

    describe('debug 验证', () => {
      it('应该接受布尔值 debug', async () => {
        const options1 = { ...validBaseOptions, debug: true };
        const options2 = { ...validBaseOptions, debug: false };
        
        await expect(testPluginWithOptions(options1)).resolves.not.toThrow();
        await expect(testPluginWithOptions(options2)).resolves.not.toThrow();
      });

      it('应该拒绝非布尔值 debug', async () => {
        const options = { ...validBaseOptions, debug: 'true' as any };
        await expect(testPluginWithOptions(options)).rejects.toThrow('debug must be a boolean value');
      });
    });
  });

  describe('错误处理', () => {
    it('应该记录参数验证错误', async () => {
      const options = { appId: 'test' } as WasV7PluginOptions;

      try {
        await testPluginWithOptions(options);
      } catch (error) {
        // 验证错误被正确记录
        expect(mockFastify.log.error).toHaveBeenCalledWith(
          expect.stringContaining('WPS V7 plugin configuration error [appSecret]: appSecret is required')
        );
      }
    });

    it('应该在调试模式下记录配置信息', async () => {
      const options: WasV7PluginOptions = {
        appId: 'test_app_id_12345',
        appSecret: 'test_app_secret',
        debug: true
      };

      await testPluginWithOptions(options);

      expect(mockFastify.log.debug).toHaveBeenCalledWith(
        'WPS V7 plugin configuration:',
        expect.objectContaining({
          appId: 'test_app***', // 敏感信息被隐藏
          appSecret: '***',
          baseUrl: 'https://openapi.wps.cn',
          timeout: 60000,
          retryTimes: 3,
          debug: true
        })
      );
    });
  });

  describe('成功场景', () => {
    it('应该成功加载有效配置', async () => {
      const options: WasV7PluginOptions = {
        appId: 'valid_app_id',
        appSecret: 'valid_app_secret',
        baseUrl: 'https://api.example.com',
        timeout: 45000,
        retryTimes: 2,
        debug: false
      };

      await expect(testPluginWithOptions(options)).resolves.not.toThrow();
      
      expect(mockFastify.log.info).toHaveBeenCalledWith('WPS V7 API plugin loading...');
      expect(mockFastify.log.info).toHaveBeenCalledWith('WPS V7 API plugin loaded successfully');
      expect(mockFastify.decorate).toHaveBeenCalledWith('wasV7Config', options);
    });
  });
});
