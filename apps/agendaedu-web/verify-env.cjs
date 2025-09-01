#!/usr/bin/env node
// 验证agendaedu-web环境变量配置脚本

const fs = require('fs');
const path = require('path');

console.log('🔍 验证 agendaedu-web 环境变量配置...\n');

// 1. 检查环境变量文件
const envFiles = [
  '.env.example',
  '.env.production', 
  '.env.development',
  '.env.local'
];

console.log('📁 环境变量文件检查:');
envFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - 存在`);
    const content = fs.readFileSync(filePath, 'utf8');
    const apiUrl = content.match(/VITE_API_BASE_URL=(.+)/);
    if (apiUrl) {
      console.log(`   📍 VITE_API_BASE_URL=${apiUrl[1]}`);
    }
  } else {
    console.log(`❌ ${file} - 不存在`);
  }
});

// 2. 检查配置文件
console.log('\n⚙️ 配置文件检查:');
const configFile = path.join(__dirname, 'src/lib/config.ts');
if (fs.existsSync(configFile)) {
  console.log('✅ src/lib/config.ts - 存在');
  const content = fs.readFileSync(configFile, 'utf8');
  
  // 检查是否正确使用环境变量
  if (content.includes('import.meta.env.VITE_API_BASE_URL')) {
    console.log('✅ 配置文件正确使用 VITE_API_BASE_URL 环境变量');
  } else {
    console.log('❌ 配置文件未使用 VITE_API_BASE_URL 环境变量');
  }
} else {
  console.log('❌ src/lib/config.ts - 不存在');
}

// 3. 检查package.json脚本
console.log('\n📦 构建脚本检查:');
const packageFile = path.join(__dirname, 'package.json');
if (fs.existsSync(packageFile)) {
  const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  const scripts = packageJson.scripts || {};
  
  console.log('✅ package.json - 存在');
  console.log('📋 可用的构建脚本:');
  Object.keys(scripts).forEach(script => {
    if (script.includes('build') || script.includes('dev')) {
      console.log(`   • ${script}: ${scripts[script]}`);
    }
  });
} else {
  console.log('❌ package.json - 不存在');
}

// 4. 环境配置建议
console.log('\n💡 使用建议:');
console.log('开发环境: pnpm run dev (自动使用 .env.development)');
console.log('生产构建: pnpm run build:prod (使用 .env.production)');
console.log('开发构建: pnpm run build:dev (使用 .env.development)');
console.log('本地环境: 创建 .env.local 文件覆盖默认配置');

console.log('\n🎯 环境变量优先级:');
console.log('1. .env.local (最高优先级，本地开发用)');
console.log('2. .env.production / .env.development (环境特定)');
console.log('3. .env.example (示例文件，不会被加载)');
