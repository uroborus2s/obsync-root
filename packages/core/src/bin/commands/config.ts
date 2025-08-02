/**
 * Stratix 配置管理命令
 * 提供配置加密、解密、验证等功能
 */

import type { ParsedArgs } from 'minimist';
import fs from 'node:fs';
import path from 'node:path';
import {
  decryptConfig,
  encryptConfig,
  generateSecureKey,
  loadConfigFromFile,
  saveConfigToFile,
  validateConfig,
  type ConfigValidationOptions
} from '../../utils/crypto.js';

/**
 * 显示配置命令帮助信息
 */
function showConfigHelp(): void {
  console.log(`
🔧 Stratix 配置管理工具

用法：
  stratix config <subcommand> [options]

子命令：
  encrypt <file>              加密 JSON 配置文件（仅支持 .json 格式）
  decrypt <encrypted-string>  解密配置字符串为 JSON 对象
  validate <file>             验证 JSON 配置文件结构
  generate-key               生成安全的加密密钥

选项：
  --output, -o <file>        输出文件路径
  --key, -k <key>           自定义加密密钥
  --format, -f <format>     输出格式 (json|env|hex|base64)
  --length, -l <length>     密钥长度（字节，默认32）
  --required <keys>         必需的配置键（逗号分隔）
  --strict                  严格模式验证
  --verbose                 显示详细信息
  --help, -h               显示帮助信息

示例：
  # 加密 JSON 配置文件
  stratix config encrypt config.json

  # 使用自定义密钥加密 JSON 文件
  stratix config encrypt config.json --key "my-secret-key"

  # 加密 JSON 文件并保存到环境变量文件
  stratix config encrypt config.json --output encrypted.env

  # 解密配置字符串为 JSON 对象
  stratix config decrypt "iv.tag.encrypted-data"

  # 验证 JSON 配置文件结构
  stratix config validate config.json --required "database,api,auth"

  # 生成256位密钥
  stratix config generate-key --length 32 --format hex

注意：
  - 仅支持 JSON 格式的配置文件（.json 扩展名）
  - 配置文件必须包含有效的 JSON 对象（不支持数组或基本类型）
  - 解密后的结果将验证为有效的 JSON 对象

环境变量：
  STRATIX_ENCRYPTION_KEY    默认加密密钥
  `);
}

/**
 * 加密配置文件
 */
async function encryptCommand(args: ParsedArgs): Promise<void> {
  const [, , filePath] = args._;

  if (!filePath) {
    console.error('❌ 请指定要加密的配置文件路径');
    console.log('');
    console.log('用法: stratix config encrypt <file>');
    process.exit(1);
  }

  try {
    console.log('🔐 正在加密配置文件...');
    console.log(`📂 输入文件: ${filePath}`);

    // 加载配置文件
    const config = loadConfigFromFile(filePath);
    console.log('✅ 配置文件加载成功');

    // 加密配置
    const encryptOptions = {
      ...(args.key && { key: args.key }),
      verbose: args.verbose || false
    };
    const encrypted = encryptConfig(config, encryptOptions);

    if (!args.verbose) {
      console.log('✅ 配置加密成功');
    }

    // 输出结果
    if (args.output) {
      const format = args.format || 'env';
      if (format === 'env') {
        // 生成环境变量文件
        const envContent = `# Stratix 加密配置
# 生成时间: ${new Date().toISOString()}
# 使用方法: source ${args.output}

STRATIX_SENSITIVE_CONFIG="${encrypted}"
`;

        // 确保目录存在
        const dir = path.dirname(args.output);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(args.output, envContent, 'utf8');
        console.log(`✅ 加密配置已保存到: ${args.output}`);
      } else {
        // 保存为其他格式
        saveConfigToFile(
          { STRATIX_SENSITIVE_CONFIG: encrypted },
          args.output,
          format as any
        );
        console.log(`✅ 加密配置已保存到: ${args.output}`);
      }
    } else {
      console.log('');
      console.log('🔐 加密后的配置:');
      console.log(encrypted);
      console.log('');
      console.log('💡 设置环境变量:');
      console.log(`export STRATIX_SENSITIVE_CONFIG="${encrypted}"`);
    }

    if (args.verbose) {
      console.log('');
      console.log('📊 加密信息:');
      console.log(`   算法: AES-256-GCM`);
      console.log(
        `   密钥来源: ${args.key ? '命令行参数' : '环境变量或默认密钥'}`
      );
      console.log(`   配置大小: ${JSON.stringify(config).length} 字符`);
      console.log(`   加密后大小: ${encrypted.length} 字符`);
    }
  } catch (error) {
    console.error(
      '❌ 加密失败:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

/**
 * 解密配置字符串
 */
async function decryptCommand(args: ParsedArgs): Promise<void> {
  const [, , encryptedString] = args._;

  if (!encryptedString) {
    console.error('❌ 请指定要解密的配置字符串');
    console.log('');
    console.log('用法: stratix config decrypt <encrypted-string>');
    process.exit(1);
  }

  try {
    if (!args.verbose) {
      console.log('🔓 正在解密配置...');
    }

    // 解密配置
    const decryptOptions = {
      ...(args.key && { key: args.key }),
      verbose: args.verbose || false
    };
    const config = decryptConfig(encryptedString, decryptOptions);

    if (!args.verbose) {
      console.log('✅ 配置解密成功');
    }

    // 输出结果
    if (args.output) {
      const format = args.format || 'json';
      saveConfigToFile(config, args.output, format as any);
      console.log(`✅ 解密配置已保存到: ${args.output}`);
    } else {
      console.log('');
      console.log('📋 解密后的配置:');
      console.log(JSON.stringify(config, null, 2));
    }

    if (args.verbose) {
      console.log('');
      console.log('📊 解密信息:');
      console.log(`   算法: AES-256-GCM`);
      console.log(
        `   密钥来源: ${args.key ? '命令行参数' : '环境变量或默认密钥'}`
      );
      console.log(`   配置键数量: ${Object.keys(config).length}`);
      console.log(`   配置键: ${Object.keys(config).join(', ')}`);
    }
  } catch (error) {
    console.error(
      '❌ 解密失败:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

/**
 * 验证配置文件
 */
async function validateCommand(args: ParsedArgs): Promise<void> {
  const [, , filePath] = args._;

  if (!filePath) {
    console.error('❌ 请指定要验证的配置文件路径');
    console.log('');
    console.log('用法: stratix config validate <file>');
    process.exit(1);
  }

  try {
    console.log('🔍 正在验证配置文件...');
    console.log(`📂 输入文件: ${filePath}`);

    // 加载配置文件
    const config = loadConfigFromFile(filePath);
    console.log('✅ 配置文件加载成功');

    // 准备验证选项
    const validationOptions: ConfigValidationOptions = {
      strict: args.strict
    };

    if (args.required) {
      validationOptions.requiredKeys = args.required
        .split(',')
        .map((key: string) => key.trim());
    }

    // 验证配置
    const result = validateConfig(config, validationOptions);

    // 输出验证结果
    console.log('');
    if (result.isValid) {
      console.log('✅ 配置验证通过');
    } else {
      console.log('❌ 配置验证失败');
    }

    if (result.errors.length > 0) {
      console.log('');
      console.log('🚨 错误:');
      result.errors.forEach((error) => console.log(`   - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('');
      console.log('⚠️  警告:');
      result.warnings.forEach((warning) => console.log(`   - ${warning}`));
    }

    if (args.verbose) {
      console.log('');
      console.log('📊 配置信息:');
      console.log(`   配置键数量: ${Object.keys(config).length}`);
      console.log(`   配置键: ${Object.keys(config).join(', ')}`);
      console.log(`   配置大小: ${JSON.stringify(config).length} 字符`);
    }

    // 如果验证失败，退出并返回错误码
    if (!result.isValid) {
      process.exit(1);
    }
  } catch (error) {
    console.error(
      '❌ 验证失败:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

/**
 * 生成安全密钥
 */
async function generateKeyCommand(args: ParsedArgs): Promise<void> {
  try {
    console.log('🔑 正在生成安全密钥...');

    const length = parseInt(args.length) || 32;
    const format = args.format || 'hex';

    if (length < 16 || length > 64) {
      console.error('❌ 密钥长度必须在 16-64 字节之间');
      process.exit(1);
    }

    const key = generateSecureKey(length, format as any);
    console.log('✅ 密钥生成成功');

    // 输出结果
    if (args.output) {
      const content = `# Stratix 加密密钥
# 生成时间: ${new Date().toISOString()}
# 密钥长度: ${length} 字节 (${length * 8} 位)
# 格式: ${format}

STRATIX_ENCRYPTION_KEY="${key}"
`;

      // 确保目录存在
      const dir = path.dirname(args.output);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(args.output, content, 'utf8');
      console.log(`✅ 密钥已保存到: ${args.output}`);
    } else {
      console.log('');
      console.log('🔑 生成的密钥:');
      console.log(key);
      console.log('');
      console.log('💡 设置环境变量:');
      console.log(`export STRATIX_ENCRYPTION_KEY="${key}"`);
    }

    if (args.verbose) {
      console.log('');
      console.log('📊 密钥信息:');
      console.log(`   长度: ${length} 字节 (${length * 8} 位)`);
      console.log(`   格式: ${format}`);
      console.log(
        `   强度: ${length >= 32 ? '高' : length >= 24 ? '中' : '低'}`
      );
    }

    console.log('');
    console.log('⚠️  安全提醒:');
    console.log('   - 请妥善保管此密钥');
    console.log('   - 不要在代码中硬编码密钥');
    console.log('   - 建议定期轮换密钥');
    console.log('   - 在生产环境中使用密钥管理服务');
  } catch (error) {
    console.error(
      '❌ 密钥生成失败:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

/**
 * 配置命令主处理器
 */
export async function stratixConfigCommand(
  subcommand: string,
  args: ParsedArgs
): Promise<void> {
  // 显示帮助信息
  if (args.help || !subcommand) {
    showConfigHelp();
    return;
  }

  // 路由到相应的子命令
  switch (subcommand) {
    case 'encrypt':
      await encryptCommand(args);
      break;

    case 'decrypt':
      await decryptCommand(args);
      break;

    case 'validate':
      await validateCommand(args);
      break;

    case 'generate-key':
      await generateKeyCommand(args);
      break;

    default:
      console.error(`❌ 未知的配置子命令: ${subcommand}`);
      console.log('');
      console.log('运行 "stratix config --help" 查看可用命令');
      process.exit(1);
  }
}
