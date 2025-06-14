#!/usr/bin/env node
/**
 * Stratix命令行工具入口
 *
 * bin命令调试方法：
 * 1. 在项目根目录运行 `pnpm run build` 构建项目
 * 2. 使用npm link创建全局链接: `cd packages/core && npm link`
 * 3. 然后可以在任何目录使用 `stratix` 命令
 * 4. 开发调试时，可以直接运行: `node --loader=ts-node/esm packages/core/src/bin/stratix.ts [命令] [参数]`
 * 5. 也可以在packages/core目录中使用: `node --loader=ts-node/esm src/bin/stratix.ts [命令] [参数]`
 *
 * @packageDocumentation
 */

import { crypto } from '@stratix/utils';
import minimist from 'minimist';
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENV_VARS } from '../config/env-config.js';

// 获取当前文件目录
const projectRootDir = path.resolve(
  typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url)),
  '../..'
);

// 主帮助文本
const mainHelpText = `
stratix - Stratix框架命令行工具

用法:
  stratix <命令> [选项]

可用命令:
  encrypt     加密配置文件 (使用: stratix encrypt ./config.json)
  decrypt     解密配置字符串 (使用: stratix decrypt <加密字符串>)
  help        显示帮助信息

选项:
  -h, --help    显示帮助信息
  -v, --version 显示版本信息

了解更多关于特定命令的信息:
  stratix <命令> --help
`;

// 加密命令帮助文本
const encryptHelpText = `
stratix encrypt - Stratix配置加密工具

用法:
  stratix encrypt [选项] <文件路径>

选项:
  -h, --help               显示帮助信息
  -o, --output <文件路径>   输出文件路径，默认为标准输出
  -e, --env                输出为环境变量格式 (${ENV_VARS.SENSITIVE_CONFIG})
  -k, --key <密钥>          自定义加密密钥，默认使用环境变量${ENV_VARS.ENCRYPTION_KEY}
  -f, --format <格式>       输出格式: env, json, bash, powershell (默认: env)
  -v, --verbose            显示详细信息
  -d, --default-key        使用内置的高强度默认密钥，而非环境变量或命令行指定的密钥

示例:
  # 加密配置文件并输出为环境变量格式
  stratix encrypt ./config.json --env

  # 加密配置文件并保存到新文件
  stratix encrypt ./config.json -o ./encrypted-config.txt

  # 使用自定义密钥加密
  stratix encrypt ./config.json -k mysecretkey

  # 使用内置的高强度默认密钥加密
  stratix encrypt ./config.json --default-key

  # 生成所有支持的shell格式
  stratix encrypt ./config.json --format all
`;

// 解密命令帮助文本
const decryptHelpText = `
stratix decrypt - Stratix配置解密工具

用法:
  stratix decrypt [选项] <加密字符串或文件路径>

选项:
  -h, --help              显示帮助信息
  -o, --output <文件路径>  输出文件路径，默认为标准输出
  -k, --key <密钥>         自定义解密密钥，默认使用环境变量${ENV_VARS.ENCRYPTION_KEY}
  -i, --input <格式>       输入格式: json, env, string (默认: string)
  -v, --verbose           显示详细信息
  -d, --default-key       使用内置的高强度默认密钥，而非环境变量或命令行指定的密钥

示例:
  # 解密环境变量值
  stratix decrypt "iv.authTag.encrypted" --input string

  # 解密文件中的加密字符串
  stratix decrypt ./encrypted-config.txt

  # 使用自定义密钥解密
  stratix decrypt "iv.authTag.encrypted" -k mysecretkey

  # 使用内置的高强度默认密钥解密
  stratix decrypt "iv.authTag.encrypted" --default-key
`;

// 定义格式输出函数映射
const formatters = {
  env: (encrypted: string) => `${ENV_VARS.SENSITIVE_CONFIG}="${encrypted}"`,
  bash: (encrypted: string) =>
    `export ${ENV_VARS.SENSITIVE_CONFIG}="${encrypted}"`,
  powershell: (encrypted: string) =>
    `$env:${ENV_VARS.SENSITIVE_CONFIG}="${encrypted}"`,
  json: (encrypted: string) =>
    JSON.stringify({ [ENV_VARS.SENSITIVE_CONFIG]: encrypted }),
  raw: (encrypted: string) => encrypted
};

/**
 * 显示版本信息
 */
function showVersion() {
  try {
    // 尝试读取package.json获取版本号
    const packagePath = path.resolve(projectRootDir, './package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      console.log(`stratix v${packageJson.version}`);
    } else {
      console.log('stratix v0.1.0');
    }
  } catch (error) {
    console.log('stratix v0.1.0');
  }
}

/**
 * 加密配置文件
 *
 * @param filePath 文件路径
 * @param options 加密选项
 * @returns 加密后的字符串
 */
function encryptConfigFile(filePath: string, options: any): string {
  // 读取配置文件
  if (!fs.existsSync(filePath)) {
    console.error(`错误: 文件 ${filePath} 不存在`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // 如果是JSON文件，验证其有效性
  if (filePath.endsWith('.json') && options.verbose) {
    try {
      JSON.parse(fileContent);
      console.log('提示: JSON文件验证通过');
    } catch (error) {
      console.warn(
        `警告: 文件内容不是有效的JSON: ${error instanceof Error ? error.message : String(error)}`
      );
      console.warn('继续处理，假设内容是有效的格式...');
    }
  }

  // 加密配置
  try {
    return crypto.encryptConfig(fileContent, {
      key: options.key,
      useDefaultKey: options['default-key']
    });
  } catch (error) {
    console.error(
      `错误: 加密配置失败: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * 解密配置字符串
 *
 * @param encryptedString 加密的配置字符串
 * @param options 解密选项
 * @returns 解密后的配置对象
 */
function decryptConfigString(
  encryptedString: string,
  options: any
): Record<string, any> {
  try {
    // 如果输入是环境变量格式，提取加密部分
    if (options.input === 'env') {
      const match = encryptedString.match(
        new RegExp(`${ENV_VARS.SENSITIVE_CONFIG}=(.+)`)
      );
      if (match && match[1]) {
        encryptedString = match[1];
      } else {
        console.error('错误: 无法从环境变量格式中提取加密字符串');
        process.exit(1);
      }
    }

    // 去除字符串首尾可能存在的双引号
    encryptedString = encryptedString.trim();
    if (encryptedString.startsWith('"') && encryptedString.endsWith('"')) {
      encryptedString = encryptedString.slice(1, -1);
    }

    // 解密配置
    return crypto.decryptConfig(encryptedString, {
      key: options.key,
      useDefaultKey: options['default-key']
    });
  } catch (error) {
    console.error(
      `错误: 解密配置失败: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * 格式化加密后的输出
 *
 * @param encrypted 加密后的字符串
 * @param format 输出格式
 * @returns 格式化后的字符串
 */
function formatOutput(encrypted: string, format: string): string | string[] {
  if (format === 'all') {
    // 返回所有格式
    return Object.entries(formatters)
      .filter(([key]) => key !== 'raw')
      .map(([format, formatter]) => {
        return `# ${format} 格式\n${formatter(encrypted)}`;
      });
  }

  // 返回指定格式
  const formatter =
    formatters[format as keyof typeof formatters] || formatters.env;
  return formatter(encrypted);
}

/**
 * 处理加密命令
 */
function handleEncryptCommand(args: string[]) {
  const argv = minimist(args, {
    string: ['output', 'key', 'format'],
    boolean: ['help', 'env', 'verbose', 'default-key'],
    alias: {
      h: 'help',
      o: 'output',
      e: 'env',
      k: 'key',
      f: 'format',
      v: 'verbose',
      d: 'default-key'
    },
    default: {
      format: 'env'
    }
  });

  // 显示帮助信息
  if (argv.help) {
    console.log(encryptHelpText);
    process.exit(0);
  }

  const filePath = argv._[0];
  if (!filePath) {
    console.error('错误: 加密命令需要指定文件路径');
    console.log(encryptHelpText);
    process.exit(1);
  }

  // 设置环境变量格式选项
  if (argv.env) {
    argv.format = 'env';
  }

  try {
    const encrypted = encryptConfigFile(filePath, argv);
    const result = formatOutput(encrypted, argv.format);

    // 输出结果
    if (argv.output) {
      if (Array.isArray(result)) {
        fs.writeFileSync(argv.output, result.join('\n\n'));
      } else {
        fs.writeFileSync(argv.output, result);
      }
      console.log(`已保存结果到 ${argv.output}`);
    } else {
      if (Array.isArray(result)) {
        console.log(result.join('\n\n'));
      } else {
        console.log(result);
      }
    }
    process.exit(0);
  } catch (error) {
    console.error(
      `致命错误: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * 处理解密命令
 */
function handleDecryptCommand(args: string[]) {
  const argv = minimist(args, {
    string: ['output', 'key', 'input'],
    boolean: ['help', 'verbose', 'default-key'],
    alias: {
      h: 'help',
      o: 'output',
      k: 'key',
      i: 'input',
      v: 'verbose',
      d: 'default-key'
    },
    default: {
      input: 'string'
    }
  });

  // 显示帮助信息
  if (argv.help) {
    console.log(decryptHelpText);
    process.exit(0);
  }

  const encryptedInput = argv._[0];
  if (!encryptedInput) {
    console.error('错误: 解密命令需要指定加密字符串或文件路径');
    console.log(decryptHelpText);
    process.exit(1);
  }

  // 检查加密密钥
  const encryptionKey = argv.key || process.env[ENV_VARS.ENCRYPTION_KEY];

  try {
    let result: Record<string, any>;

    // 检查是否是文件路径
    if (fs.existsSync(encryptedInput)) {
      const encryptedContent = fs.readFileSync(encryptedInput, 'utf-8');
      result = decryptConfigString(encryptedContent, argv);
    } else {
      // 直接解密命令行参数
      result = decryptConfigString(encryptedInput, argv);
    }

    // 转换结果为JSON字符串
    const jsonResult = JSON.stringify(result, null, 2);

    // 输出结果
    if (argv.output) {
      fs.writeFileSync(argv.output, jsonResult);
      console.log(`已保存解密结果到 ${argv.output}`);
    } else {
      console.log(jsonResult);
    }
    process.exit(0);
  } catch (error) {
    console.error(
      `致命错误: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  // 解析命令行参数
  const argv = minimist(process.argv.slice(2), {
    boolean: ['help', 'version'],
    alias: {
      h: 'help',
      v: 'version'
    }
  });

  // 显示版本信息
  if (argv.version) {
    showVersion();
    process.exit(0);
  }

  // 显示帮助信息
  if (argv.help || argv._.length === 0) {
    console.log(mainHelpText);
    process.exit(0);
  }

  // 获取命令
  const command = argv._[0];
  const remainingArgs = process.argv.slice(3); // 跳过 'node stratix.js command'

  // 根据命令执行相应操作
  try {
    switch (command) {
      case 'encrypt':
        handleEncryptCommand(remainingArgs);
        break;

      case 'decrypt':
        handleDecryptCommand(remainingArgs);
        break;

      case 'help':
        console.log(mainHelpText);
        break;

      default:
        console.error(`错误: 未知命令 "${command}"`);
        console.log(mainHelpText);
        process.exit(1);
    }
  } catch (error) {
    console.error(
      `致命错误: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

// 执行主函数
main().catch((error) => {
  console.error(
    `致命错误: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
