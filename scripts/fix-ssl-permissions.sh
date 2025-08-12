#!/bin/bash

# SSL证书权限修复脚本
# 用于修复Nginx SSL证书权限问题导致的503错误

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 服务器配置
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

# 检查SSL证书权限
check_ssl_permissions() {
    log_info "检查SSL证书权限..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        echo '=== SSL证书文件权限 ==='
        sudo ls -la /etc/nginx/ssl/
        echo ''
        
        echo '=== Nginx配置测试 ==='
        sudo nginx -t 2>&1 || echo 'Nginx配置测试失败'
        echo ''
    "
}

# 修复SSL证书权限
fix_ssl_permissions() {
    log_info "修复SSL证书权限..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        echo '=== 修复SSL证书权限 ==='
        sudo chmod 644 /etc/nginx/ssl/STAR_jlufe_edu_cn.key
        sudo chmod 644 /etc/nginx/ssl/STAR_jlufe_edu_cn.pem
        
        echo '=== 修复后的权限 ==='
        sudo ls -la /etc/nginx/ssl/
        echo ''
        
        echo '=== 测试Nginx配置 ==='
        sudo nginx -t
        echo ''
    "
    
    if [ $? -eq 0 ]; then
        log_success "SSL证书权限修复完成"
    else
        log_error "SSL证书权限修复失败"
        exit 1
    fi
}

# 重新加载Nginx
reload_nginx() {
    log_info "重新加载Nginx配置..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        sudo systemctl reload nginx
        echo 'Nginx配置重新加载完成'
        
        echo ''
        echo '=== Nginx服务状态 ==='
        systemctl status nginx --no-pager -l | head -10
    "
    
    if [ $? -eq 0 ]; then
        log_success "Nginx重新加载完成"
    else
        log_error "Nginx重新加载失败"
        exit 1
    fi
}

# 验证修复结果
verify_fix() {
    log_info "验证修复结果..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        echo '=== 测试本地HTTP访问 ==='
        curl -I http://localhost/web/ 2>/dev/null | head -5
        echo ''
        
        echo '=== 测试本地HTTPS访问 ==='
        curl -k -I https://localhost/web/ 2>/dev/null | head -5
        echo ''
    "
    
    log_info "测试外部HTTPS访问..."
    curl -I https://kwps.jlufe.edu.cn/web/ 2>/dev/null | head -5
    
    if [ $? -eq 0 ]; then
        log_success "✅ 静态文件访问修复成功！"
        echo ""
        echo "🎯 访问地址："
        echo "  Web管理后台: https://kwps.jlufe.edu.cn/web/"
        echo "  移动端应用: https://kwps.jlufe.edu.cn/app/"
    else
        log_error "❌ 外部访问仍有问题"
        exit 1
    fi
}

# 主函数
main() {
    echo "🔧 开始修复SSL证书权限问题..."
    echo ""
    
    log_info "目标服务器: $SERVER_HOST"
    log_info "SSH用户: $SERVER_USER"
    echo ""
    
    # 执行修复步骤
    check_ssl_permissions
    echo "----------------------------------------"
    
    fix_ssl_permissions
    echo "----------------------------------------"
    
    reload_nginx
    echo "----------------------------------------"
    
    verify_fix
    
    echo ""
    echo "🎉 SSL证书权限修复完成！"
    echo ""
    echo "📋 问题总结："
    echo "  问题原因: SSL证书文件权限设置为600，Nginx worker进程无法读取"
    echo "  解决方案: 将证书文件权限修改为644，允许所有用户读取"
    echo "  修复命令: chmod 644 /etc/nginx/ssl/STAR_jlufe_edu_cn.key"
    echo ""
    echo "💡 预防措施："
    echo "  - 定期检查SSL证书权限"
    echo "  - 使用nginx -t测试配置"
    echo "  - 监控Nginx错误日志"
}

# 帮助信息
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "SSL证书权限修复脚本"
    echo ""
    echo "功能："
    echo "  - 检查SSL证书权限"
    echo "  - 修复权限问题"
    echo "  - 重新加载Nginx配置"
    echo "  - 验证修复结果"
    echo ""
    echo "使用方法："
    echo "  $0              # 执行完整修复流程"
    echo "  $0 --help       # 显示帮助信息"
    echo ""
    echo "问题背景："
    echo "  当SSL证书文件权限设置为600时，只有root用户可以读取。"
    echo "  但Nginx的worker进程运行在www-data用户下，无法读取证书文件，"
    echo "  导致HTTPS请求失败，返回503错误。"
    echo ""
    exit 0
fi

# 执行主函数
main
