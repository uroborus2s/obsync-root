#!/bin/bash

# 权限修复脚本 - 修复静态文件部署的权限问题
# 使用方法：./fix-permissions.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 服务器配置
SERVER_HOST="jlufe_10.128"
SERVER_USER="ubutu"

# 目标路径
WEB_PATH="/var/www/agendaedu-web"
APP_PATH="/var/www/agendaedu-app"

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

# 修复服务器权限
fix_server_permissions() {
    log_info "修复服务器权限..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        # 创建目录
        sudo mkdir -p '$WEB_PATH'
        sudo mkdir -p '$APP_PATH'
        
        # 设置目录权限
        sudo chown -R www-data:www-data '$WEB_PATH'
        sudo chown -R www-data:www-data '$APP_PATH'
        sudo chmod -R 755 '$WEB_PATH'
        sudo chmod -R 755 '$APP_PATH'
        
        # 创建备份目录
        sudo mkdir -p /var/www/backups
        sudo chown www-data:www-data /var/www/backups
        
        echo '权限修复完成'
        
        # 显示目录状态
        echo '目录状态:'
        ls -la /var/www/ | grep -E 'agendaedu|backups'
    "
    
    log_success "服务器权限修复完成"
}

# 测试权限
test_permissions() {
    log_info "测试权限..."
    
    # 创建测试文件
    echo "test content" > /tmp/test-file.txt
    
    # 测试上传到临时目录
    if scp /tmp/test-file.txt "$SERVER_USER@$SERVER_HOST:/tmp/"; then
        log_success "✅ 临时目录上传测试通过"
    else
        log_error "❌ 临时目录上传测试失败"
        return 1
    fi
    
    # 测试移动到目标目录
    ssh "$SERVER_USER@$SERVER_HOST" "
        sudo cp /tmp/test-file.txt '$WEB_PATH/'
        if [ -f '$WEB_PATH/test-file.txt' ]; then
            echo '✅ 文件移动测试通过'
            sudo rm '$WEB_PATH/test-file.txt'
        else
            echo '❌ 文件移动测试失败'
            exit 1
        fi
        
        rm /tmp/test-file.txt
    "
    
    # 清理本地测试文件
    rm /tmp/test-file.txt
    
    log_success "权限测试完成"
}

# 显示使用说明
show_usage() {
    echo ""
    echo "🔧 权限修复完成！现在可以使用以下方式部署："
    echo ""
    echo "1. 使用修复后的部署脚本："
    echo "   ./scripts/deploy-static.sh"
    echo ""
    echo "2. 手动部署步骤："
    echo "   # 上传到临时目录"
    echo "   rsync -avz ./dist/ $SERVER_USER@$SERVER_HOST:/tmp/web-deploy/"
    echo ""
    echo "   # 在服务器上移动文件"
    echo "   ssh $SERVER_USER@$SERVER_HOST 'sudo cp -r /tmp/web-deploy/* $WEB_PATH/'"
    echo "   ssh $SERVER_USER@$SERVER_HOST 'sudo chown -R www-data:www-data $WEB_PATH'"
    echo ""
    echo "3. 验证部署："
    echo "   curl -I https://kwps.jlufe.edu.cn/web/"
    echo ""
}

# 主函数
main() {
    echo "🚀 开始修复静态文件部署权限问题..."
    echo ""
    
    log_info "目标服务器: $SERVER_HOST"
    log_info "用户: $SERVER_USER"
    echo ""
    
    # 确认执行
    read -p "确认开始修复权限? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "操作已取消"
        exit 0
    fi
    
    # 执行修复
    fix_server_permissions
    echo ""
    
    # 测试权限
    test_permissions
    echo ""
    
    # 显示使用说明
    show_usage
}

# 帮助信息
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "权限修复脚本"
    echo ""
    echo "功能："
    echo "  - 修复 /var/www/agendaedu-web 和 /var/www/agendaedu-app 目录权限"
    echo "  - 设置正确的所有者为 www-data:www-data"
    echo "  - 创建必要的备份目录"
    echo "  - 测试权限是否正确设置"
    echo ""
    echo "使用方法："
    echo "  $0              # 执行权限修复"
    echo "  $0 --help       # 显示帮助信息"
    echo ""
    exit 0
fi

# 执行主函数
main
