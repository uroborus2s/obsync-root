#!/usr/bin/env node

/**
 * 修复多行 return 语句
 */

const fs = require('fs');

const fixes = [
  // AddSchedule.executor.ts
  {
    file: 'src/executors/AddSchedule.executor.ts',
    replacements: [
      {
        from: `        return left(validationResult.error,
          duration: Date.now() - startTime
        );`,
        to: `        return left({
          error: validationResult.error,
          duration: Date.now() - startTime
        });`
      },
      {
        from: `        return right(result,
          duration: result.duration
        );`,
        to: `        return right(result);`
      },
      {
        from: `      return right(result,
        duration: result.duration
      );`,
        to: `      return right(result);`
      }
    ]
  },
  // CreateOrUpdateCalendar.executor.ts
  {
    file: 'src/executors/CreateOrUpdateCalendar.executor.ts',
    replacements: [
      {
        from: `        return left(validationResult.error,
          duration: Date.now() - startTime
        );`,
        to: `        return left({
          error: validationResult.error,
          duration: Date.now() - startTime
        });`
      },
      {
        from: `        return right(result,
          duration: result.duration
        );`,
        to: `        return right(result);`
      },
      {
        from: `      return right(result,
        duration: result.duration
      );`,
        to: `      return right(result);`
      }
    ]
  },
  // FetchParticipants.executor.ts
  {
    file: 'src/executors/FetchParticipants.executor.ts',
    replacements: [
      {
        from: `        return left(validationResult.error,
          duration: Date.now() - startTime
        );`,
        to: `        return left({
          error: validationResult.error,
          duration: Date.now() - startTime
        });`
      },
      {
        from: `      return right(result,
        duration: result.duration
      );`,
        to: `      return right(result);`
      }
    ]
  },
  // FetchSchedules.executor.ts
  {
    file: 'src/executors/FetchSchedules.executor.ts',
    replacements: [
      {
        from: `        return left(validationResult.error,
          duration: Date.now() - startTime
        );`,
        to: `        return left({
          error: validationResult.error,
          duration: Date.now() - startTime
        });`
      },
      {
        from: `      return right(result,
        duration: result.duration
      );`,
        to: `      return right(result);`
      }
    ]
  }
];

console.log('开始修复多行 return 语句...\n');

let totalFixed = 0;
for (const fix of fixes) {
  console.log(`处理文件: ${fix.file}`);
  let content = fs.readFileSync(fix.file, 'utf-8');
  let fileModified = false;

  for (const replacement of fix.replacements) {
    if (content.includes(replacement.from)) {
      content = content.replace(replacement.from, replacement.to);
      fileModified = true;
      console.log(`  ✓ 修复了一处多行 return`);
    }
  }

  if (fileModified) {
    fs.writeFileSync(fix.file, content, 'utf-8');
    console.log(`  ✅ 文件已更新\n`);
    totalFixed++;
  } else {
    console.log(`  ⏭️  无需修改\n`);
  }
}

console.log(`完成！共修复 ${totalFixed} 个文件。`);

