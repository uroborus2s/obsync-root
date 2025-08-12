#!/bin/bash

# 测试部署脚本的各种功能

echo "🧪 测试模块化部署脚本..."
echo ""

# 测试帮助功能
echo "1. 测试帮助功能:"
./scripts/deploy.sh --help | head -5
echo ""

# 测试dry-run功能
echo "2. 测试dry-run功能:"
echo "y" | ./scripts/deploy.sh --nginx-only --dry-run --server1 2>/dev/null | head -10
echo ""

# 测试参数解析
echo "3. 测试参数解析:"
./scripts/deploy.sh --unknown-param 2>&1 | head -3
echo ""

echo "✅ 基本功能测试完成"
