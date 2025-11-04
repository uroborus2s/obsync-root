#!/usr/bin/env node

/**
 * 批量修复 Repository 文件中的 DatabaseResult Either 类型使用
 */

const fs = require('fs');
const path = require('path');

const repositoryFiles = [
  'src/repositories/Student.repository.ts',
  'src/repositories/Teacher.repository.ts',
  'src/repositories/TeacherCourse.repository.ts',
  'src/repositories/PermissionStatus.repository.ts',
  'src/repositories/AttendanceCourses.repository.ts',
  'src/repositories/StudentCourse.repository.ts',
  'src/repositories/CourseRaw.repository.ts',
  'src/repositories/JuheRenwu.repository.ts',
  'src/repositories/UserInfo.repository.ts'
];

function fixFile(filePath) {
  console.log(`\n处理文件: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // 1. 添加 Either 相关导入
  if (content.includes('DatabaseResult') && !content.includes("from '@stratix/utils/functional'")) {
    // 找到 DatabaseResult 导入的位置
    const importMatch = content.match(/(import.*from '@stratix\/database';)/);
    if (importMatch) {
      const insertPos = content.indexOf(importMatch[0]) + importMatch[0].length;
      const eitherImport = "\nimport {\n  isRight,\n  isLeft,\n  eitherMap as map,\n  eitherRight as right,\n  eitherLeft as left\n} from '@stratix/utils/functional';";
      content = content.slice(0, insertPos) + eitherImport + content.slice(insertPos);
      modified = true;
      console.log('  ✓ 添加 Either 导入');
    }
  }
  
  // 2. 添加 fromOption 导入（如果需要）
  if (content.includes('BaseIcasyncRepository') && !content.includes('fromOption')) {
    content = content.replace(
      /from '\.\/base\/BaseIcasyncRepository\.js';/,
      "from './base/BaseIcasyncRepository.js';\nimport { fromOption } from './base/BaseIcasyncRepository.js';"
    );
    // 合并导入
    content = content.replace(
      /import \{ BaseIcasyncRepository \} from '\.\/base\/BaseIcasyncRepository\.js';\nimport \{ fromOption \} from '\.\/base\/BaseIcasyncRepository\.js';/,
      "import {\n  BaseIcasyncRepository,\n  fromOption\n} from './base/BaseIcasyncRepository.js';"
    );
    modified = true;
    console.log('  ✓ 添加 fromOption 导入');
  }
  
  // 3. 替换 .success 为 isRight()
  const successPattern = /(\w+)\.success/g;
  const successMatches = content.match(successPattern);
  if (successMatches) {
    content = content.replace(successPattern, 'isRight($1)');
    modified = true;
    console.log(`  ✓ 替换 ${successMatches.length} 处 .success`);
  }
  
  // 4. 替换 !isRight() 为 isLeft()
  content = content.replace(/!isRight\((\w+)\)/g, 'isLeft($1)');
  
  // 5. 替换 .data 为 .right
  const dataPattern = /(\w+)\.data/g;
  const dataMatches = content.match(dataPattern);
  if (dataMatches) {
    content = content.replace(dataPattern, '$1.right');
    modified = true;
    console.log(`  ✓ 替换 ${dataMatches.length} 处 .data`);
  }
  
  // 6. 替换 .error 为 .left
  const errorPattern = /(\w+)\.error/g;
  const errorMatches = content.match(errorPattern);
  if (errorMatches) {
    content = content.replace(errorPattern, '$1.left');
    modified = true;
    console.log(`  ✓ 替换 ${errorMatches.length} 处 .error`);
  }
  
  // 7. 替换返回对象模式 { success: true, data: ... }
  // 这个比较复杂，需要更精确的匹配
  const returnSuccessPattern = /return\s+\{\s*success:\s*true,\s*data:\s*([^}]+)\s*\};/g;
  const returnSuccessMatches = content.match(returnSuccessPattern);
  if (returnSuccessMatches) {
    content = content.replace(returnSuccessPattern, 'return right($1);');
    modified = true;
    console.log(`  ✓ 替换 ${returnSuccessMatches.length} 处 return { success: true, data: ... }`);
  }
  
  // 8. 替换返回对象模式 { success: false, error: ... }
  const returnErrorPattern = /return\s+\{\s*success:\s*false,\s*error:\s*([^}]+)\s*\};/g;
  const returnErrorMatches = content.match(returnErrorPattern);
  if (returnErrorMatches) {
    content = content.replace(returnErrorPattern, 'return left($1);');
    modified = true;
    console.log(`  ✓ 替换 ${returnErrorMatches.length} 处 return { success: false, error: ... }`);
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
console.log('开始批量修复 Repository 文件...\n');

let totalFixed = 0;
for (const file of repositoryFiles) {
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
console.log('1. 某些复杂的模式可能需要手动修复');
console.log('2. 运行 pnpm run build @stratix/icasync 检查编译错误');
console.log('3. 特别检查多行的 return 语句');

