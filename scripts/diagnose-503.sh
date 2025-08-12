#!/bin/bash

# 503错误诊断脚本
# 功能：诊断静态文件访问503错误的原因

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 服务器配置 - 从deploy-static.sh获取实际配置
SERVER_HOST="jlufe_12.6"
SERVER_USER="ubuntu"

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

# 检查Nginx状态
check_nginx_status() {
    log_info "检查Nginx服务状态..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        echo '=== Nginx服务状态 ==='
        systemctl status nginx --no-pager -l
        echo ''
        
        echo '=== Nginx进程 ==='
        ps aux | grep nginx | grep -v grep
        echo ''
        
        echo '=== 端口监听状态 ==='
        netstat -tlnp | grep :80
        netstat -tlnp | grep :443
        echo ''
    "
}

# 检查Nginx配置
check_nginx_config() {
    log_info "检查Nginx配置..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        echo '=== Nginx配置测试 ==='
        nginx -t
        echo ''
        
        echo '=== 启用的站点配置 ==='
        ls -la /etc/nginx/sites-enabled/
        echo ''
        
        echo '=== 当前Nginx配置文件内容 ==='
        if [ -f /etc/nginx/sites-enabled/kwps.jlufe.edu.cn ]; then
            echo '--- kwps.jlufe.edu.cn 配置 ---'
            cat /etc/nginx/sites-enabled/kwps.jlufe.edu.cn | head -50
        elif [ -f /etc/nginx/sites-enabled/default ]; then
            echo '--- default 配置 ---'
            cat /etc/nginx/sites-enabled/default | head -50
        else
            echo '❌ 没有找到有效的站点配置文件'
        fi
        echo ''
    "
}

# 检查静态文件目录
check_static_files() {
    log_info "检查静态文件目录..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        echo '=== 静态文件目录状态 ==='
        
        echo '--- /var/www 目录 ---'
        ls -la /var/www/ 2>/dev/null || echo '目录不存在'
        echo ''
        
        echo '--- agendaedu-web 目录 ---'
        if [ -d /var/www/agendaedu-web ]; then
            ls -la /var/www/agendaedu-web/ | head -10
            echo '文件总数:' \$(find /var/www/agendaedu-web -type f | wc -l)
            echo 'index.html存在:' \$([ -f /var/www/agendaedu-web/index.html ] && echo '是' || echo '否')
        else
            echo '❌ /var/www/agendaedu-web 目录不存在'
        fi
        echo ''
        
        echo '--- agendaedu-app 目录 ---'
        if [ -d /var/www/agendaedu-app ]; then
            ls -la /var/www/agendaedu-app/ | head -10
            echo '文件总数:' \$(find /var/www/agendaedu-app -type f | wc -l)
            echo 'index.html存在:' \$([ -f /var/www/agendaedu-app/index.html ] && echo '是' || echo '否')
        else
            echo '❌ /var/www/agendaedu-app 目录不存在'
        fi
        echo ''
    "
}

# 检查文件权限
check_permissions() {
    log_info "检查文件权限..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        echo '=== 文件权限检查 ==='
        
        echo '--- /var/www 权限 ---'
        ls -ld /var/www/ 2>/dev/null || echo '目录不存在'
        
        echo '--- agendaedu-web 权限 ---'
        if [ -d /var/www/agendaedu-web ]; then
            ls -ld /var/www/agendaedu-web/
            ls -la /var/www/agendaedu-web/ | head -5
        fi
        
        echo '--- agendaedu-app 权限 ---'
        if [ -d /var/www/agendaedu-app ]; then
            ls -ld /var/www/agendaedu-app/
            ls -la /var/www/agendaedu-app/ | head -5
        fi
        echo ''
    "
}

# 检查Nginx错误日志
check_nginx_logs() {
    log_info "检查Nginx错误日志..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        echo '=== Nginx错误日志 (最近50行) ==='
        tail -50 /var/log/nginx/error.log 2>/dev/null || echo '错误日志文件不存在或无法访问'
        echo ''
        
        echo '=== Nginx访问日志 (最近10行) ==='
        tail -10 /var/log/nginx/access.log 2>/dev/null || echo '访问日志文件不存在或无法访问'
        echo ''
    "
}

# 测试本地访问
test_local_access() {
    log_info "测试服务器本地访问..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        echo '=== 本地HTTP测试 ==='
        curl -I http://localhost/ 2>/dev/null || echo '本地HTTP访问失败'
        echo ''
        
        echo '=== 本地HTTPS测试 ==='
        curl -k -I https://localhost/ 2>/dev/null || echo '本地HTTPS访问失败'
        echo ''
        
        echo '=== 测试静态文件路径 ==='
        curl -I http://localhost/web/ 2>/dev/null || echo '/web/ 路径访问失败'
        curl -I http://localhost/app/ 2>/dev/null || echo '/app/ 路径访问失败'
        echo ''
    "
}

# 检查上游服务
check_upstream_services() {
    log_info "检查上游服务状态..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        echo '=== Docker容器状态 ==='
        docker ps 2>/dev/null || echo 'Docker未运行或无权限访问'
        echo ''
        
        echo '=== API Gateway测试 ==='
        curl -I http://localhost:8090/health 2>/dev/null || echo 'API Gateway (8090) 无响应'
        echo ''
        
        echo '=== 端口占用情况 ==='
        netstat -tlnp | grep -E ':(8090|3001|3002)' || echo '后端服务端口未监听'
        echo ''
    "
}

# 生成修复建议
generate_fix_suggestions() {
    log_info "生成修复建议..."
    
    echo ""
    echo "🔧 常见503错误原因和修复方法："
    echo ""
    echo "1. 静态文件目录不存在或为空："
    echo "   解决方法: 重新部署静态文件"
    echo "   命令: ./scripts/deploy-static.sh --web-only"
    echo ""
    echo "2. 文件权限问题："
    echo "   解决方法: 修复文件权限"
    echo "   命令: ./scripts/fix-permissions.sh"
    echo ""
    echo "3. Nginx配置错误："
    echo "   解决方法: 检查并修复Nginx配置"
    echo "   命令: ./scripts/deploy.sh --nginx-only"
    echo ""
    echo "4. 上游服务不可用："
    echo "   解决方法: 重启后端服务"
    echo "   命令: ./scripts/deploy.sh --docker-only"
    echo ""
    echo "5. Nginx服务异常："
    echo "   解决方法: 重启Nginx服务"
    echo "   命令: ssh $SERVER_USER@$SERVER_HOST 'sudo systemctl restart nginx'"
    echo ""
}

# 主函数
main() {
    echo "🔍 开始诊断503错误..."
    echo ""
    
    log_info "目标服务器: $SERVER_HOST"
    log_info "SSH用户: $SERVER_USER"
    echo ""
    
    # 执行诊断步骤
    check_nginx_status
    echo "----------------------------------------"
    
    check_nginx_config
    echo "----------------------------------------"
    
    check_static_files
    echo "----------------------------------------"
    
    check_permissions
    echo "----------------------------------------"
    
    check_nginx_logs
    echo "----------------------------------------"
    
    test_local_access
    echo "----------------------------------------"
    
    check_upstream_services
    echo "----------------------------------------"
    
    generate_fix_suggestions
    
    echo ""
    echo "🎯 诊断完成！请根据上述信息分析问题原因。"
}

# 帮助信息
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "503错误诊断脚本"
    echo ""
    echo "功能："
    echo "  - 检查Nginx服务状态"
    echo "  - 检查Nginx配置"
    echo "  - 检查静态文件目录"
    echo "  - 检查文件权限"
    echo "  - 检查错误日志"
    echo "  - 测试本地访问"
    echo "  - 检查上游服务"
    echo "  - 生成修复建议"
    echo ""
    echo "使用方法："
    echo "  $0              # 执行完整诊断"
    echo "  $0 --help       # 显示帮助信息"
    echo ""
    exit 0
fi

# 执行主函数
main
