#!/bin/bash

# 快速503错误诊断脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🔍 开始快速诊断503错误..."
echo ""

# 检查SSH配置
log_info "检查SSH配置..."
if [ -f ~/.ssh/config ]; then
    echo "SSH配置文件存在，查找jlufe相关配置："
    grep -A 10 -B 2 "jlufe" ~/.ssh/config || echo "未找到jlufe相关配置"
else
    echo "SSH配置文件不存在"
fi
echo ""

# 尝试不同的服务器连接
log_info "尝试连接不同的服务器配置..."

# 尝试 jlufe_12.6
echo "尝试连接 ubuntu@jlufe_12.6..."
timeout 10 ssh -o ConnectTimeout=5 ubuntu@jlufe_12.6 "echo 'jlufe_12.6连接成功'" 2>/dev/null || echo "jlufe_12.6连接失败"

# 尝试 jlufe_10.128
echo "尝试连接 ubutu@jlufe_10.128..."
timeout 10 ssh -o ConnectTimeout=5 ubutu@jlufe_10.128 "echo 'jlufe_10.128连接成功'" 2>/dev/null || echo "jlufe_10.128连接失败"

echo ""

# 检查本地网络连接
log_info "检查网络连接..."
ping -c 2 kwps.jlufe.edu.cn 2>/dev/null && echo "kwps.jlufe.edu.cn 网络可达" || echo "kwps.jlufe.edu.cn 网络不可达"

# 检查HTTPS访问
log_info "检查HTTPS访问..."
curl -I -k --connect-timeout 10 https://kwps.jlufe.edu.cn/web/ 2>/dev/null | head -5 || echo "HTTPS访问失败"

echo ""

# 检查本地构建文件
log_info "检查本地构建文件..."
if [ -d "apps/agendaedu-web/dist" ]; then
    echo "✅ Web应用构建文件存在"
    ls -la apps/agendaedu-web/dist/ | head -5
else
    echo "❌ Web应用构建文件不存在"
fi

if [ -d "apps/agendaedu-app/dist" ]; then
    echo "✅ 移动端应用构建文件存在"
    ls -la apps/agendaedu-app/dist/ | head -5
else
    echo "❌ 移动端应用构建文件不存在"
fi

echo ""

# 生成修复建议
log_info "生成修复建议..."
echo ""
echo "🔧 基于诊断结果的修复建议："
echo ""
echo "1. 如果SSH连接失败："
echo "   - 检查SSH密钥配置"
echo "   - 确认服务器地址和用户名"
echo "   - 检查网络连接"
echo ""
echo "2. 如果静态文件访问503："
echo "   - 检查Nginx配置文件"
echo "   - 确认静态文件目录存在"
echo "   - 检查文件权限"
echo "   - 重启Nginx服务"
echo ""
echo "3. 如果本地构建文件不存在："
echo "   - 运行构建命令: pnpm run build"
echo "   - 检查构建错误日志"
echo ""
echo "4. 常用修复命令："
echo "   ./scripts/deploy-static.sh --web-only --verbose"
echo "   ./scripts/fix-permissions.sh"
echo ""

echo "🎯 快速诊断完成！"
