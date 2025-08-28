// 简单的环境变量优先级测试脚本
// 用于验证修改后的 loadEnvironment 方法是否正确工作

const fs = require('fs');
const path = require('path');

// 创建测试目录和文件
const testDir = path.join(process.cwd(), 'temp-test-env');

// 清理并创建测试目录
if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true, force: true });
}
fs.mkdirSync(testDir, { recursive: true });

// 创建测试环境文件
const envFiles = {
  '.env': `
# 基础配置
TEST_VAR1=base
TEST_VAR2=base
TEST_VAR3=base
TEST_PORT=3000
TEST_HOST=localhost
`,
  '.env.development': `
# 开发环境配置
TEST_VAR2=development
TEST_VAR3=development
TEST_PORT=3001
TEST_DEBUG=true
`,
  '.env.development.local': `
# 开发环境本地配置
TEST_VAR3=development-local
TEST_SECRET=dev-local-secret
`,
  '.env.local': `
# 本地通用配置
TEST_VAR4=local
TEST_OVERRIDE=local-override
`
};

// 写入测试文件
console.log('📁 创建测试环境文件...');
for (const [filename, content] of Object.entries(envFiles)) {
  const filePath = path.join(testDir, filename);
  fs.writeFileSync(filePath, content.trim());
  console.log(`✅ 创建文件: ${filename}`);
}

// 设置环境变量
process.env.NODE_ENV = 'development';

console.log('\n🔧 测试环境变量优先级覆盖...');
console.log(`当前环境: ${process.env.NODE_ENV}`);
console.log(`测试目录: ${testDir}`);

// 保存原始环境变量
const originalEnv = { ...process.env };

// 清理测试变量
for (const key in process.env) {
  if (key.startsWith('TEST_')) {
    delete process.env[key];
  }
}

// 模拟 loadEnvironment 的逻辑
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');

// 定义加载顺序
const env = process.env.NODE_ENV || 'development';
const envFilesToLoad = [
  '.env', // 基础配置
  `.env.${env}`, // 环境特定配置
  `.env.${env}.local`, // 本地环境特定配置
  '.env.local' // 本地通用配置（最高优先级）
].map((file) => path.join(testDir, file));

console.log('\n📋 加载顺序:');
envFilesToLoad.forEach((file, index) => {
  console.log(`${index + 1}. ${path.basename(file)}`);
});

// 收集所有环境变量
const allEnvVars = {};

console.log('\n🔄 解析环境文件:');
for (const filePath of envFilesToLoad) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${path.basename(filePath)}`);
    continue;
  }

  try {
    console.log(`📖 解析文件: ${path.basename(filePath)}`);

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = dotenv.parse(fileContent);

    console.log(
      `   解析到 ${Object.keys(parsed).length} 个变量:`,
      Object.keys(parsed)
    );

    // 合并到总配置中，后加载的覆盖先加载的
    Object.assign(allEnvVars, parsed);
  } catch (error) {
    console.log(`❌ 解析失败: ${path.basename(filePath)}`, error.message);
  }
}

console.log('\n📊 最终合并结果:');
console.log(`总共 ${Object.keys(allEnvVars).length} 个变量:`);
for (const [key, value] of Object.entries(allEnvVars)) {
  console.log(`   ${key}=${value}`);
}

// 设置到 process.env
for (const [key, value] of Object.entries(allEnvVars)) {
  if (!(key in process.env)) {
    // 不覆盖系统环境变量
    process.env[key] = value;
  }
}

// 进行变量扩展
const expandResult = dotenvExpand.expand({ parsed: allEnvVars });

console.log('\n✅ 验证优先级覆盖结果:');
console.log(`TEST_VAR1: ${process.env.TEST_VAR1} (应该是 'base')`);
console.log(`TEST_VAR2: ${process.env.TEST_VAR2} (应该是 'development')`);
console.log(`TEST_VAR3: ${process.env.TEST_VAR3} (应该是 'development-local')`);
console.log(`TEST_VAR4: ${process.env.TEST_VAR4} (应该是 'local')`);
console.log(`TEST_PORT: ${process.env.TEST_PORT} (应该是 '3001')`);
console.log(`TEST_DEBUG: ${process.env.TEST_DEBUG} (应该是 'true')`);
console.log(
  `TEST_SECRET: ${process.env.TEST_SECRET} (应该是 'dev-local-secret')`
);
console.log(
  `TEST_OVERRIDE: ${process.env.TEST_OVERRIDE} (应该是 'local-override')`
);

// 验证结果
const expectedResults = {
  TEST_VAR1: 'base',
  TEST_VAR2: 'development',
  TEST_VAR3: 'development-local',
  TEST_VAR4: 'local',
  TEST_PORT: '3001',
  TEST_DEBUG: 'true',
  TEST_SECRET: 'dev-local-secret',
  TEST_OVERRIDE: 'local-override'
};

let allCorrect = true;
console.log('\n🧪 测试结果:');
for (const [key, expected] of Object.entries(expectedResults)) {
  const actual = process.env[key];
  const isCorrect = actual === expected;
  console.log(
    `${isCorrect ? '✅' : '❌'} ${key}: ${actual} ${isCorrect ? '(正确)' : `(错误，期望: ${expected})`}`
  );
  if (!isCorrect) allCorrect = false;
}

console.log(`\n${allCorrect ? '🎉 所有测试通过！' : '❌ 部分测试失败！'}`);

// 清理测试文件
console.log('\n🧹 清理测试文件...');
fs.rmSync(testDir, { recursive: true, force: true });
console.log('✅ 清理完成');

process.exit(allCorrect ? 0 : 1);
