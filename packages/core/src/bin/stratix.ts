#!/usr/bin/env node
/**
 * Stratix CLI 工具主入口
 * 提供配置加密、解密、验证等功能
 */

import minimist from 'minimist';
import { stratixConfigCommand } from './commands/config.js';

/**
 * CLI 版本信息
 */
const CLI_VERSION = '1.0.0';

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`
🚀 Stratix CLI Tools v${CLI_VERSION}

用法：
  stratix <command> [options]

命令：
  config          配置管理工具
    encrypt       加密配置文件
    decrypt       解密配置字符串
    validate      验证配置文件
    generate-key  生成安全密钥

全局选项：
  --help, -h      显示帮助信息
  --version, -v   显示版本信息
  --verbose       显示详细输出

示例：
  # 加密配置文件
  stratix config encrypt config.json

  # 解密配置字符串
  stratix config decrypt "encrypted-string"

  # 验证配置文件
  stratix config validate config.json

  # 生成安全密钥
  stratix config generate-key

  # 显示详细帮助
  stratix config --help

更多信息：
  文档: https://stratix.dev/docs
  GitHub: https://github.com/stratix/core
  `);
}

/**
 * 显示版本信息
 */
function showVersion(): void {
  console.log(`Stratix CLI v${CLI_VERSION}`);
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    const args = minimist(process.argv.slice(2), {
      boolean: ['help', 'version', 'verbose'],
      alias: {
        h: 'help',
        v: 'version'
      }
    });

    // 显示版本信息
    if (args.version) {
      showVersion();
      return;
    }

    // 显示帮助信息
    if (args.help || args._.length === 0) {
      showHelp();
      return;
    }

    const [command, subcommand] = args._;

    // 路由到相应的命令处理器
    switch (command) {
      case 'config':
        await stratixConfigCommand(subcommand, args);
        break;

      default:
        console.error(`❌ 未知命令: ${command}`);
        console.log('');
        console.log('运行 "stratix --help" 查看可用命令');
        process.exit(1);
    }
  } catch (error) {
    console.error(
      '❌ 执行失败:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

// 运行主函数
main();
