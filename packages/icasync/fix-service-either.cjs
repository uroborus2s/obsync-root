#!/usr/bin/env node

/**
 * 批量修复 Service 文件中的 DatabaseResult Either 类型使用
 */

const fs = require('fs');
const path = require('path');

const serviceFiles = [
  'src/services/CalendarSync.service.ts',
  'src/services/ChangeDetection.service.ts',
  'src/services/CourseAggregation.service.ts',
  'src/services/StatusManagement.service.ts'
];

function fixFile(filePath) {
  console.log(`\n处理文件: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // 1. 确保有 Either 相关导入
  if (!content.includes("from '@stratix/utils/functional'")) {
    // 找到 ServiceError 导入的位置
    const importMatch = content.match(/(import.*ServiceError.*from '@stratix\/core';)/);
    if (importMatch) {
      const insertPos = content.indexOf(importMatch[0]) + importMatch[0].length;
      const eitherImport = "\nimport {\n  isRight,\n  isLeft,\n  eitherMap as map,\n  eitherRight as right,\n  eitherLeft as left\n} from '@stratix/utils/functional';";
      content = content.slice(0, insertPos) + eitherImport + content.slice(insertPos);
      modified = true;
      console.log('  ✓ 添加 Either 导入');
    }
  }
  
  // 2. 替换 .success 为 isRight()
  const successPattern = /(\w+)\.success/g;
  const successMatches = content.match(successPattern);
  if (successMatches) {
    content = content.replace(successPattern, 'isRight($1)');
    modified = true;
    console.log(`  ✓ 替换 ${successMatches.length} 处 .success`);
  }
  
  // 3. 替换 !isRight() 为 isLeft()
  const notRightPattern = /!isRight\((\w+)\)/g;
  const notRightMatches = content.match(notRightPattern);
  if (notRightMatches) {
    content = content.replace(notRightPattern, 'isLeft($1)');
    modified = true;
    console.log(`  ✓ 替换 ${notRightMatches.length} 处 !isRight() 为 isLeft()`);
  }
  
  // 4. 替换 .data 为 .right
  const dataPattern = /(\w+)\.data/g;
  const dataMatches = content.match(dataPattern);
  if (dataMatches) {
    content = content.replace(dataPattern, '$1.right');
    modified = true;
    console.log(`  ✓ 替换 ${dataMatches.length} 处 .data`);
  }
  
  // 5. 替换 .error 为 .left
  const errorPattern = /(\w+)\.error/g;
  const errorMatches = content.match(errorPattern);
  if (errorMatches) {
    content = content.replace(errorPattern, '$1.left');
    modified = true;
    console.log(`  ✓ 替换 ${errorMatches.length} 处 .error`);
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ 文件已更新`);
    return true;
  } else {
    console.log(`  ⏭️  无需修改`);
    return false;
  }
}

// 主程序
console.log('开始批量修复 Service 文件...\n');

let totalFixed = 0;
for (const file of serviceFiles) {
  try {
    if (fixFile(file)) {
      totalFixed++;
    }
  } catch (error) {
    console.error(`❌ 处理文件 ${file} 时出错:`, error.message);
  }
}

console.log(`\n\n完成！共修复 ${totalFixed} 个文件。`);
console.log('\n⚠️  请注意：');
console.log('1. Service 层的方法实现需要手动检查');
console.log('2. 运行 pnpm run build @stratix/icasync 检查编译错误');
console.log('3. 确保所有方法返回 Either<ServiceError, T> 类型');

