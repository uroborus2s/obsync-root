#!/usr/bin/env tsx
// 配置加密工具脚本
// 用于将 prod.env.json 转换为加密的环境变量

import { generateEncryptedConfig, EnvironmentLoader } from '../src/config/environment.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 获取项目根目录
 */
function getProjectRoot(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, '..');
}

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`
🔐 Stratix 配置加密工具

用法：
  tsx scripts/generate-encrypted-config.ts [选项]

选项：
  --help, -h          显示帮助信息
  --input, -i <file>  指定输入文件路径 (默认: prod.env.json)
  --output, -o <file> 指定输出文件路径 (可选)
  --verify, -v        验证加密配置是否正确
  --key <key>         指定加密密钥 (可选，默认使用环境变量)

示例：
  # 使用默认配置文件
  tsx scripts/generate-encrypted-config.ts

  # 指定输入文件
  tsx scripts/generate-encrypted-config.ts -i ./config/production.json

  # 生成并验证
  tsx scripts/generate-encrypted-config.ts --verify

  # 使用自定义密钥
  STRATIX_ENCRYPTION_KEY="my-secret-key" tsx scripts/generate-encrypted-config.ts

环境变量：
  STRATIX_ENCRYPTION_KEY  加密密钥 (推荐设置)
  `);
}

/**
 * 解析命令行参数
 */
function parseArgs(): {
  inputFile: string;
  outputFile?: string;
  verify: boolean;
  help: boolean;
  key?: string;
} {
  const args = process.argv.slice(2);
  const result = {
    inputFile: 'prod.env.json',
    outputFile: undefined as string | undefined,
    verify: false,
    help: false,
    key: undefined as string | undefined
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        result.help = true;
        break;
      case '--input':
      case '-i':
        result.inputFile = args[++i];
        break;
      case '--output':
      case '-o':
        result.outputFile = args[++i];
        break;
      case '--verify':
      case '-v':
        result.verify = true;
        break;
      case '--key':
        result.key = args[++i];
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`❌ 未知选项: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  return result;
}

/**
 * 验证加密配置
 */
async function verifyEncryptedConfig(encryptedConfig: string): Promise<boolean> {
  try {
    console.log('🔍 验证加密配置...');
    
    // 尝试解密
    const decrypted = EnvironmentLoader.decryptConfig(encryptedConfig);
    
    // 验证配置结构
    const isValid = EnvironmentLoader.validateConfig(decrypted);
    
    if (isValid) {
      console.log('✅ 加密配置验证成功！');
      console.log('📋 配置内容预览:');
      console.log(`   - Web端口: ${decrypted.web?.port || '未设置'}`);
      console.log(`   - 日志级别: ${decrypted.logger?.loglevle || '未设置'}`);
      console.log(`   - 数据库: ${Object.keys(decrypted.databases || {}).join(', ') || '未设置'}`);
      console.log(`   - WAS V7: ${decrypted.wasV7?.appId ? '已配置' : '未配置'}`);
      return true;
    } else {
      console.error('❌ 加密配置验证失败：配置结构不正确');
      return false;
    }
  } catch (error) {
    console.error('❌ 加密配置验证失败:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * 保存配置到文件
 */
async function saveToFile(content: string, filePath: string): Promise<void> {
  try {
    const fullPath = path.resolve(getProjectRoot(), filePath);
    const dir = path.dirname(fullPath);
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 创建环境变量文件格式
    const envContent = `# Stratix 加密配置
# 生成时间: ${new Date().toISOString()}
# 使用方法: export STRATIX_SENSITIVE_CONFIG="${content}"

STRATIX_SENSITIVE_CONFIG="${content}"
`;
    
    fs.writeFileSync(fullPath, envContent, 'utf8');
    console.log(`✅ 配置已保存到: ${fullPath}`);
    console.log('');
    console.log('💡 使用方法:');
    console.log(`   source ${filePath}`);
    console.log('   或');
    console.log(`   export STRATIX_SENSITIVE_CONFIG="${content}"`);
  } catch (error) {
    console.error('❌ 保存文件失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();
    
    if (options.help) {
      showHelp();
      return;
    }
    
    // 设置自定义密钥
    if (options.key) {
      process.env.STRATIX_ENCRYPTION_KEY = options.key;
      console.log('🔑 使用自定义加密密钥');
    }
    
    console.log('🔐 Stratix 配置加密工具');
    console.log('='.repeat(40));
    console.log('');
    
    // 检查输入文件
    const inputPath = path.resolve(getProjectRoot(), options.inputFile);
    if (!fs.existsSync(inputPath)) {
      console.error(`❌ 输入文件不存在: ${inputPath}`);
      console.log('');
      console.log('💡 请确保 prod.env.json 文件存在，或使用 -i 选项指定其他文件');
      process.exit(1);
    }
    
    console.log(`📂 输入文件: ${options.inputFile}`);
    
    // 生成加密配置
    console.log('🔧 正在生成加密配置...');
    const config = EnvironmentLoader.loadFromFile(inputPath);
    const encrypted = EnvironmentLoader.encryptConfig(config);
    
    console.log('✅ 加密配置生成成功！');
    console.log('');
    
    // 验证配置
    if (options.verify) {
      const isValid = await verifyEncryptedConfig(encrypted);
      if (!isValid) {
        process.exit(1);
      }
      console.log('');
    }
    
    // 输出结果
    if (options.outputFile) {
      await saveToFile(encrypted, options.outputFile);
    } else {
      console.log('🔐 加密后的配置:');
      console.log('');
      console.log(encrypted);
      console.log('');
      console.log('💡 设置环境变量:');
      console.log(`export STRATIX_SENSITIVE_CONFIG="${encrypted}"`);
      console.log('');
      console.log('💡 或保存到文件:');
      console.log('tsx scripts/generate-encrypted-config.ts -o .env.encrypted');
    }
    
    console.log('');
    console.log('🎉 配置加密完成！');
    
  } catch (error) {
    console.error('❌ 配置加密失败:', error);
    process.exit(1);
  }
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
