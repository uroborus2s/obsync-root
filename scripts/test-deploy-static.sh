#!/bin/bash

# 测试静态文件部署脚本的新功能

echo "🧪 测试静态文件部署脚本的模块化功能..."
echo ""

# 测试帮助功能
echo "1. 测试帮助功能:"
./scripts/deploy-static.sh --help | head -10
echo ""

# 测试参数解析
echo "2. 测试参数解析:"
echo "测试 --web-only --dry-run:"
echo "y" | ./scripts/deploy-static.sh --web-only --dry-run 2>/dev/null | head -15
echo ""

echo "测试 --app-only --build-only:"
./scripts/deploy-static.sh --app-only --build-only --dry-run 2>/dev/null | head -10
echo ""

# 测试错误参数
echo "3. 测试错误参数处理:"
./scripts/deploy-static.sh --unknown-param 2>&1 | head -3
echo ""

echo "✅ 基本功能测试完成"
echo ""
echo "📋 可用的部署选项："
echo "  ./scripts/deploy-static.sh --web-only     # 仅部署Web管理后台"
echo "  ./scripts/deploy-static.sh --app-only     # 仅部署移动端应用"
echo "  ./scripts/deploy-static.sh --all          # 部署两个项目"
echo "  ./scripts/deploy-static.sh --web-only -b  # 仅构建Web项目"
echo "  ./scripts/deploy-static.sh --app-only -d  # 仅部署移动端项目"
echo "  ./scripts/deploy-static.sh --dry-run      # 预演模式"
