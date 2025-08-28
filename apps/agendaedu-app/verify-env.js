#!/usr/bin/env node
// 验证环境变量加载脚本

const fs = require('fs');
const path = require('path');

console.log('🔍 验证 agendaedu-app 环境变量配置...\n');

// 1. 检查环境变量文件
const envFiles = [
  '.env',
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

// 2. 检查构建文件
console.log('\n📦 构建文件检查:');
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  console.log('✅ dist 目录存在');
  
  // 检查JS文件中的API URL
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const jsFiles = fs.readdirSync(assetsPath).filter(f => f.endsWith('.js'));
    console.log(`📄 找到 ${jsFiles.length} 个 JS 文件`);
    
    jsFiles.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 检查是否包含API URL
      if (content.includes('kwps.jlufe.edu.cn')) {
        console.log(`✅ ${file} - 包含生产环境API URL`);
      } else if (content.includes('localhost:8090')) {
        console.log(`⚠️  ${file} - 包含开发环境API URL`);
      } else {
        console.log(`❓ ${file} - 未找到明确的API URL`);
      }
    });
  }
} else {
  console.log('❌ dist 目录不存在，请先运行构建');
}

console.log('\n🎯 建议的构建命令:');
console.log('npm run build:prod     # 使用 .env.production 配置');
console.log('npm run build:staging  # 使用命令行环境变量');
console.log('npm run build          # 使用默认配置');
