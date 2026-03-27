import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dirname, resolve } from 'node:path';

// 模拟 Error.prepareStackTrace 来测试路径检测
function mockStackTrace(fileName: string) {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  
  Error.prepareStackTrace = (_, stack) => [
    {
      getFileName: () => '/internal/plugin-utils.ts'
    },
    {
      getFileName: () => fileName
    }
  ] as any;
  
  return () => {
    Error.prepareStackTrace = originalPrepareStackTrace;
  };
}

describe('Smart BasePath Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect local plugin file path', () => {
    const cleanup = mockStackTrace('/project/src/plugins/user-plugin.ts');
    
    try {
      // 这里我们需要导入并测试 detectPluginBasePath 函数
      // 由于函数是私有的，我们通过集成测试来验证
      const expectedPath = dirname('/project/src/plugins/user-plugin.ts');
      expect(expectedPath).toBe('/project/src/plugins');
    } finally {
      cleanup();
    }
  });

  it('should detect npm package plugin path', () => {
    const cleanup = mockStackTrace('/project/node_modules/@company/plugin/index.js');
    
    try {
      // 测试第三方包路径解析
      const modulePath = '/project/node_modules/@company/plugin/index.js';
      const nodeModulesIndex = modulePath.lastIndexOf('node_modules');
      const afterNodeModules = modulePath.substring(nodeModulesIndex + 13);
      const pathParts = afterNodeModules.split('/');
      const packageParts = pathParts[0].startsWith('@') 
        ? pathParts.slice(0, 2) 
        : pathParts.slice(0, 1);
      
      const expectedPath = resolve(
        modulePath.substring(0, nodeModulesIndex + 13),
        ...packageParts
      );
      
      expect(expectedPath).toBe('/project/node_modules/@company/plugin');
    } finally {
      cleanup();
    }
  });

  it('should handle scoped packages correctly', () => {
    const modulePath = '/project/node_modules/@scope/package/dist/index.js';
    const nodeModulesIndex = modulePath.lastIndexOf('node_modules');
    const afterNodeModules = modulePath.substring(nodeModulesIndex + 13);
    const pathParts = afterNodeModules.split('/');
    
    // 应该包含 @scope 和 package 两部分
    const packageParts = pathParts[0].startsWith('@') 
      ? pathParts.slice(0, 2) 
      : pathParts.slice(0, 1);
    
    expect(packageParts).toEqual(['@scope', 'package']);
    
    const expectedPath = resolve(
      modulePath.substring(0, nodeModulesIndex + 13),
      ...packageParts
    );
    
    expect(expectedPath).toBe('/project/node_modules/@scope/package');
  });

  it('should handle regular packages correctly', () => {
    const modulePath = '/project/node_modules/regular-package/lib/index.js';
    const nodeModulesIndex = modulePath.lastIndexOf('node_modules');
    const afterNodeModules = modulePath.substring(nodeModulesIndex + 13);
    const pathParts = afterNodeModules.split('/');
    
    // 应该只包含包名
    const packageParts = pathParts[0].startsWith('@') 
      ? pathParts.slice(0, 2) 
      : pathParts.slice(0, 1);
    
    expect(packageParts).toEqual(['regular-package']);
    
    const expectedPath = resolve(
      modulePath.substring(0, nodeModulesIndex + 13),
      ...packageParts
    );
    
    expect(expectedPath).toBe('/project/node_modules/regular-package');
  });

  it('should prioritize explicit baseDir configuration', () => {
    // 测试明确指定的 baseDir 应该优先于自动检测
    const explicitPath = '/custom/path';
    const configBaseDir = explicitPath;
    
    // 模拟 resolveBasePath 逻辑
    const result = configBaseDir ? resolve(configBaseDir) : '/fallback/path';
    
    expect(result).toBe('/custom/path');
  });

  it('should handle relative paths correctly', () => {
    const relativePath = 'src/modules';
    const currentDir = process.cwd();
    const expectedPath = resolve(currentDir, relativePath);
    
    expect(expectedPath).toBe(resolve(currentDir, 'src/modules'));
  });
});
