#!/bin/bash

# 批量修复 DatabaseResult 的 Either 类型使用方式
# 这个脚本会在所有 Repository、Service、Executor 文件中进行替换

set -e

echo "开始修复 Either 类型使用方式..."

# 需要处理的文件列表
FILES=$(find src -name "*.ts" ! -name "*.test.ts" ! -name "*.spec.ts" -type f)

for file in $FILES; do
  echo "处理文件: $file"
  
  # 1. 添加 Either 相关导入（如果文件中使用了 DatabaseResult）
  if grep -q "DatabaseResult" "$file" && ! grep -q "from '@stratix/utils/functional'" "$file"; then
    # 在 DatabaseResult 导入后添加 Either 导入
    if grep -q "import.*DatabaseResult.*from '@stratix/database'" "$file"; then
      sed -i '' "/import.*DatabaseResult.*from '@stratix\/database'/a\\
import { isRight, isLeft, eitherMap as map, eitherRight as right, eitherLeft as left } from '@stratix/utils/functional';
" "$file"
    fi
  fi
  
  # 2. 替换常见模式
  # result.success -> isRight(result)
  sed -i '' 's/\([a-zA-Z_][a-zA-Z0-9_]*\)\.success/isRight(\1)/g' "$file"
  
  # !result.success -> isLeft(result) 或 !isRight(result)
  sed -i '' 's/!isRight(\([a-zA-Z_][a-zA-Z0-9_]*\))/isLeft(\1)/g' "$file"
  
  # result.data -> result.right
  sed -i '' 's/\([a-zA-Z_][a-zA-Z0-9_]*\)\.data/\1.right/g' "$file"
  
  # result.error -> result.left
  sed -i '' 's/\([a-zA-Z_][a-zA-Z0-9_]*\)\.error/\1.left/g' "$file"
  
  # { success: true, data: ... } -> right(...)
  # 这个模式比较复杂，需要手动处理
  
  # { success: false, error: ... } -> left(...)
  # 这个模式比较复杂，需要手动处理
done

echo "批量替换完成！请手动检查并修复复杂的情况。"
echo "特别注意："
echo "1. 返回 { success: true, data: ... } 的地方需要改为 right(...)"
echo "2. 返回 { success: false, error: ... } 的地方需要改为 left(...)"
echo "3. 检查所有导入语句是否正确"

