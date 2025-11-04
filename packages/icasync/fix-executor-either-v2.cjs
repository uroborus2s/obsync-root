#!/usr/bin/env node

/**
 * 批量修复 Executor 文件中的 DatabaseResult Either 类型使用 - 改进版
 * 更智能地处理替换，避免破坏对象字面量
 */

const fs = require('fs');
const path = require('path');

const executorFiles = [
  'src/executors/AddParticipants.executor.ts',
  'src/executors/AddSchedule.executor.ts',
  'src/executors/AddSingleCalendarPermission.executor.ts',
  'src/executors/CreateOrUpdateCalendar.executor.ts',
  'src/executors/CreateSingleSchedule.executor.ts',
  'src/executors/DataAggregation.executor.ts',
  'src/executors/DeleteSingleCalendar.executor.ts',
  'src/executors/DeleteSingleSchedule.executor.ts',
  'src/executors/FetchCalendarPermissionsToAdd.executor.ts',
  'src/executors/FetchCalendarPermissionsToRemove.executor.ts',
  'src/executors/FetchCourseData.executor.ts',
  'src/executors/FetchMarkedJuheRenwu.executor.ts',
  'src/executors/FetchOldCalendarMappings.executor.ts',
  'src/executors/FetchParticipants.executor.ts',
  'src/executors/FetchSchedules.executor.ts',
  'src/executors/FetchSyncSources.executor.ts',
  'src/executors/FetchUnprocessedJuheRenwu.executor.ts',
  'src/executors/IncrementalDataAggregation.executor.ts',
  'src/executors/MarkIncrementalData.executor.ts',
  'src/executors/RemoveSingleCalendarPermission.executor.ts',
  'src/executors/RestoreCalendarPermission.executor.ts'
];

function fixFile(filePath) {
  console.log(`\n处理文件: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let changeCount = {
    imports: 0,
    ifSuccess: 0,
    ifNotSuccess: 0,
    dotData: 0,
    returnSuccess: 0,
    returnError: 0,
    loggerError: 0
  };

  // 1. 添加 Either 相关导入
  if (
    content.includes('DatabaseResult') &&
    !content.includes("from '@stratix/utils/functional'")
  ) {
    const importMatch = content.match(
      /(import.*from '@stratix\/(core|database)';)/
    );
    if (importMatch) {
      const insertPos = content.indexOf(importMatch[0]) + importMatch[0].length;
      const eitherImport =
        "\nimport {\n  isRight,\n  isLeft,\n  eitherRight as right,\n  eitherLeft as left\n} from '@stratix/utils/functional';";
      content =
        content.slice(0, insertPos) + eitherImport + content.slice(insertPos);
      modified = true;
      changeCount.imports++;
    }
  }

  // 2. 替换 if (!result.success) 模式
  content = content.replace(
    /if\s*\(\s*!(\w+)\.success\s*\)/g,
    (match, varName) => {
      changeCount.ifNotSuccess++;
      return `if (isLeft(${varName}))`;
    }
  );

  // 3. 替换 if (result.success) 模式
  content = content.replace(/if\s*\(\s*(\w+)\.success\s*\)/g, (match, varName) => {
    changeCount.ifSuccess++;
    return `if (isRight(${varName}))`;
  });

  // 4. 替换 result.data 访问（但不在对象字面量的键位置）
  content = content.replace(/(\w+)\.data(?!\s*:)/g, (match, varName) => {
    changeCount.dotData++;
    return `${varName}.right`;
  });

  // 5. 替换 return { success: true, data: xxx } 模式（单行）
  content = content.replace(
    /return\s+\{\s*success:\s*true,\s*data:\s*([^}]+)\s*\};/g,
    (match, dataValue) => {
      changeCount.returnSuccess++;
      return `return right(${dataValue});`;
    }
  );

  // 6. 替换 return { success: false, error: xxx } 模式（单行）
  content = content.replace(
    /return\s+\{\s*success:\s*false,\s*error:\s*([^}]+)\s*\};/g,
    (match, errorValue) => {
      changeCount.returnError++;
      return `return left(${errorValue});`;
    }
  );

  // 7. 替换 this.logger.error 中的 error: xxx.error 模式
  // 这个需要更小心，只替换在 logger 调用中的情况
  content = content.replace(
    /(this\.logger\.\w+\([^)]*\{[^}]*)\berror:\s*(\w+)\.error\b/g,
    (match, prefix, varName) => {
      changeCount.loggerError++;
      return `${prefix}error: ${varName}.left`;
    }
  );

  if (modified || Object.values(changeCount).some((v) => v > 0)) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ 文件已更新:`);
    if (changeCount.imports > 0)
      console.log(`     - 添加 Either 导入: ${changeCount.imports}`);
    if (changeCount.ifSuccess > 0)
      console.log(`     - if (result.success): ${changeCount.ifSuccess}`);
    if (changeCount.ifNotSuccess > 0)
      console.log(`     - if (!result.success): ${changeCount.ifNotSuccess}`);
    if (changeCount.dotData > 0)
      console.log(`     - result.data: ${changeCount.dotData}`);
    if (changeCount.returnSuccess > 0)
      console.log(
        `     - return { success: true }: ${changeCount.returnSuccess}`
      );
    if (changeCount.returnError > 0)
      console.log(
        `     - return { success: false }: ${changeCount.returnError}`
      );
    if (changeCount.loggerError > 0)
      console.log(`     - logger error: ${changeCount.loggerError}`);
    return true;
  } else {
    console.log(`  ⏭️  无需修改`);
    return false;
  }
}

// 主程序
console.log('开始批量修复 Executor 文件（改进版）...\n');

let totalFixed = 0;
for (const file of executorFiles) {
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
console.log('1. 复杂的多行 return 语句需要手动修复');
console.log('2. 对象字面量中的 error: 键不会被替换');
console.log('3. 运行 pnpm run build @stratix/icasync 检查编译错误');

