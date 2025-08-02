// 批量修复 (eb: any) => eb( 模式的脚本
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const repositoryFiles = [
  'src/repositories/JuheRenwuRepository.ts',
  'src/repositories/CourseRawRepository.ts',
  'src/repositories/ScheduleMappingRepository.ts',
  'src/repositories/CalendarParticipantsRepository.ts',
  'src/repositories/CalendarMappingRepository.ts',
  'src/repositories/SyncTaskRepository.ts'
];

function fixEbPattern(content) {
  // 修复模式：(eb: any) => eb('field', 'op', value) 
  // 改为：(qb: any) => qb.where('field', 'op', value)
  
  // 匹配各种 eb 模式
  const patterns = [
    // 基本模式：eb('field', '=', value)
    /\(eb: any\) => eb\(([^)]+)\)/g,
    // 复杂模式：eb('field', 'in', [...])
    /\(eb: any\) => eb\(([^)]+)\)/g
  ];
  
  let fixedContent = content;
  
  // 替换所有 (eb: any) => eb( 为 (qb: any) => qb.where(
  fixedContent = fixedContent.replace(
    /\(eb: any\) => eb\(/g,
    '(qb: any) => qb.where('
  );
  
  return fixedContent;
}

function processFile(filePath) {
  try {
    console.log(`处理文件: ${filePath}`);
    
    const content = readFileSync(filePath, 'utf8');
    const fixedContent = fixEbPattern(content);
    
    if (content !== fixedContent) {
      writeFileSync(filePath, fixedContent, 'utf8');
      console.log(`✅ 已修复: ${filePath}`);
      
      // 统计修复的数量
      const matches = content.match(/\(eb: any\) => eb\(/g);
      if (matches) {
        console.log(`   修复了 ${matches.length} 个 eb 模式`);
      }
    } else {
      console.log(`⏭️  无需修复: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
  }
}

function main() {
  console.log('🔧 开始批量修复 eb 模式...\n');
  
  for (const file of repositoryFiles) {
    processFile(file);
  }
  
  console.log('\n🎉 批量修复完成！');
  console.log('\n📝 修复说明:');
  console.log('• (eb: any) => eb(\'field\', \'=\', value) → (qb: any) => qb.where(\'field\', \'=\', value)');
  console.log('• eb 是 expression builder，但在 where 条件中应该使用 query builder (qb)');
  console.log('• qb.where() 是正确的 Kysely 语法');
}

main();
