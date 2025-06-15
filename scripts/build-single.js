#!/usr/bin/env node

import { execSync } from 'child_process';

// 获取命令行参数
const args = process.argv.slice(2);
const packageName = args[0];

if (!packageName) {
  console.error('❌ 请指定要构建的包名');
  console.log('用法: pnpm run build:single <包名>');
  console.log('示例: pnpm run build:single @stratix/core');
  process.exit(1);
}

// 辅助函数：执行命令
function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description}完成`);
    return true;
  } catch (error) {
    console.error(`❌ ${description}失败:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log(`🔨 开始构建包: ${packageName}`);

  // 构建指定包（turbo会自动构建依赖）
  const success = runCommand(
    `turbo run build --filter="${packageName}"`,
    `构建包 ${packageName}`
  );

  if (success) {
    console.log('🎉 构建完成！');
  } else {
    console.error('❌ 构建失败');
    process.exit(1);
  }
}

main();
