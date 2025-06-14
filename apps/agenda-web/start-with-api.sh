#!/bin/bash

# AgendaEdu Web 启动脚本 - 连接到真实的Tasks API
# 使用方法: ./start-with-api.sh [API_BASE_URL]

set -e

# 默认API地址
DEFAULT_API_URL="http://localhost:3000/api/tasks"

# 获取API地址参数
API_URL=${1:-$DEFAULT_API_URL}

echo "🚀 启动 AgendaEdu Web 应用"
echo "📡 API地址: $API_URL"

# 创建临时环境变量文件
cat > .env.local << EOF
# AgendaEdu Web 环境配置
VITE_APP_TITLE=AgendaEdu Web
VITE_APP_VERSION=0.0.1
VITE_APP_DESCRIPTION=教育日程管理系统

# API配置 - 连接到真实的Tasks API
VITE_API_BASE_URL=$API_URL
VITE_API_TIMEOUT=10000

# 禁用Mock数据，使用真实API
VITE_USE_MOCK_API=false

# 开发配置
VITE_ENABLE_DEBUG=true
VITE_SHOW_DEV_TOOLS=true

# 主题配置
VITE_DEFAULT_THEME=light
VITE_ENABLE_DARK_MODE=true

# 分页配置
VITE_DEFAULT_PAGE_SIZE=20
VITE_MAX_PAGE_SIZE=100
EOF

echo "✅ 环境配置已创建: .env.local"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    pnpm install
fi

echo "🔧 启动开发服务器..."
echo "📝 注意: 请确保Tasks API服务器正在运行在 $API_URL"
echo ""

# 启动开发服务器
pnpm dev 