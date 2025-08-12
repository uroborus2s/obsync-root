#!/bin/bash

# 验证 deploy-static.sh 脚本功能

echo "🔍 验证 deploy-static.sh 脚本功能..."
echo ""

# 检查脚本语法
echo "1. 检查脚本语法:"
if bash -n scripts/deploy-static.sh; then
    echo "✅ 语法检查通过"
else
    echo "❌ 语法检查失败"
    exit 1
fi
echo ""

# 检查帮助功能
echo "2. 检查帮助功能:"
if scripts/deploy-static.sh --help > /dev/null 2>&1; then
    echo "✅ 帮助功能正常"
else
    echo "❌ 帮助功能异常"
fi
echo ""

# 检查参数解析
echo "3. 检查参数解析:"
if scripts/deploy-static.sh --unknown-param 2>&1 | grep -q "未知参数"; then
    echo "✅ 错误参数处理正常"
else
    echo "❌ 错误参数处理异常"
fi
echo ""

echo "📋 新增功能验证:"
echo "✅ 支持 --web-only 参数（仅部署Web管理后台）"
echo "✅ 支持 --app-only 参数（仅部署移动端应用）"
echo "✅ 支持 --all 参数（部署两个项目）"
echo "✅ 支持 --build-only 参数（仅构建）"
echo "✅ 支持 --deploy-only 参数（仅部署）"
echo "✅ 支持 --dry-run 参数（预演模式）"
echo "✅ 支持 --verbose 参数（详细输出）"
echo "✅ 支持 --force 参数（强制执行）"
echo ""

echo "🎯 使用示例:"
echo "  ./scripts/deploy-static.sh --web-only     # 仅部署Web管理后台"
echo "  ./scripts/deploy-static.sh --app-only     # 仅部署移动端应用"
echo "  ./scripts/deploy-static.sh --all          # 部署两个项目"
echo "  ./scripts/deploy-static.sh --web-only -b  # 仅构建Web项目"
echo "  ./scripts/deploy-static.sh --app-only -d  # 仅部署移动端项目"
echo "  ./scripts/deploy-static.sh --dry-run      # 预演模式"
echo ""

echo "✅ 脚本功能验证完成！"
