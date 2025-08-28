#!/usr/bin/env node

// 简单的环境变量优先级测试
console.log('🧪 开始环境变量优先级测试...');

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');

// 创建测试目录
const testDir = path.join(process.cwd(), 'temp-test-env');
console.log(`📁 测试目录: ${testDir}`);

// 清理并创建测试目录
if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true, force: true });
}
fs.mkdirSync(testDir, { recursive: true });

try {
  // 创建测试环境文件
  console.log('\n📝 创建测试文件...');
  
  fs.writeFileSync(path.join(testDir, '.env'), 
    'TEST_VAR1=base\nTEST_VAR2=base\nTEST_VAR3=base');
  console.log('✅ 创建 .env');
  
  fs.writeFileSync(path.join(testDir, '.env.development'), 
    'TEST_VAR2=dev\nTEST_VAR3=dev');
  console.log('✅ 创建 .env.development');
  
  fs.writeFileSync(path.join(testDir, '.env.development.local'), 
    'TEST_VAR3=dev-local');
  console.log('✅ 创建 .env.development.local');
  
  fs.writeFileSync(path.join(testDir, '.env.local'), 
    'TEST_VAR4=local');
  console.log('✅ 创建 .env.local');

  // 设置环境
  process.env.NODE_ENV = 'development';
  console.log(`\n🌍 环境: ${process.env.NODE_ENV}`);

  // 清理测试变量
  for (const key in process.env) {
    if (key.startsWith('TEST_')) {
      delete process.env[key];
    }
  }

  // 模拟新的 loadEnvironment 逻辑
  console.log('\n🔄 按优先级加载环境文件...');
  
  const env = process.env.NODE_ENV || 'development';
  const envFilesToLoad = [
    '.env',                    // 基础配置
    `.env.${env}`,            // 环境特定配置
    `.env.${env}.local`,      // 本地环境特定配置
    '.env.local'              // 本地通用配置（最高优先级）
  ].map(file => path.join(testDir, file));

  // 收集所有环境变量
  const allEnvVars = {};

  // 按优先级顺序解析文件
  for (const filePath of envFilesToLoad) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${path.basename(filePath)}`);
      continue;
    }

    console.log(`📖 解析: ${path.basename(filePath)}`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = dotenv.parse(fileContent);
    
    console.log(`   变量: ${Object.keys(parsed).join(', ')}`);
    
    // 合并到总配置中，后加载的覆盖先加载的
    Object.assign(allEnvVars, parsed);
  }

  console.log('\n📊 最终合并结果:');
  for (const [key, value] of Object.entries(allEnvVars)) {
    console.log(`   ${key}=${value}`);
  }

  // 设置到 process.env
  for (const [key, value] of Object.entries(allEnvVars)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }

  // 验证结果
  console.log('\n✅ 验证优先级覆盖:');
  console.log(`TEST_VAR1: ${process.env.TEST_VAR1} (期望: base)`);
  console.log(`TEST_VAR2: ${process.env.TEST_VAR2} (期望: dev)`);
  console.log(`TEST_VAR3: ${process.env.TEST_VAR3} (期望: dev-local)`);
  console.log(`TEST_VAR4: ${process.env.TEST_VAR4} (期望: local)`);

  // 检查结果
  const results = {
    TEST_VAR1: process.env.TEST_VAR1 === 'base',
    TEST_VAR2: process.env.TEST_VAR2 === 'dev',
    TEST_VAR3: process.env.TEST_VAR3 === 'dev-local',
    TEST_VAR4: process.env.TEST_VAR4 === 'local'
  };

  const allPassed = Object.values(results).every(Boolean);
  
  console.log('\n🧪 测试结果:');
  for (const [key, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${key}: ${passed ? '通过' : '失败'}`);
  }

  console.log(`\n${allPassed ? '🎉 所有测试通过！' : '❌ 部分测试失败！'}`);

  // 清理
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('\n🧹 清理完成');

  process.exit(allPassed ? 0 : 1);

} catch (error) {
  console.error('❌ 测试过程中出现错误:', error);
  
  // 清理
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  
  process.exit(1);
}
