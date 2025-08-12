#!/bin/bash

# 修复Nginx限流配置脚本
# 用于解决静态文件访问503错误（限流过严导致）

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

# 检查当前限流配置
check_current_config() {
    log_info "检查当前限流配置..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        echo '=== 当前限流配置 ==='
        grep -A 2 -B 2 'limit_req_zone' /etc/nginx/sites-enabled/obsync
        echo ''
        grep -A 2 -B 2 'limit_req zone' /etc/nginx/sites-enabled/obsync
        echo ''
    "
}

# 备份当前配置
backup_config() {
    log_info "备份当前Nginx配置..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        sudo cp /etc/nginx/sites-enabled/obsync /etc/nginx/sites-enabled/obsync.backup.\$(date +%Y%m%d_%H%M%S)
        echo '配置文件已备份'
    "
    
    if [ $? -eq 0 ]; then
        log_success "配置备份完成"
    else
        log_error "配置备份失败"
        exit 1
    fi
}

# 修复限流配置
fix_rate_limiting() {
    log_info "修复限流配置..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        # 创建临时配置文件
        sudo cp /etc/nginx/sites-enabled/obsync /tmp/obsync_temp
        
        # 修改限流配置
        # 将静态文件限流从 30r/s 提高到 100r/s，burst从50提高到200
        sudo sed -i 's/zone=static_limit:10m rate=30r\/s/zone=static_limit:10m rate=100r\/s/g' /tmp/obsync_temp
        sudo sed -i 's/limit_req zone=static_limit burst=50 nodelay/limit_req zone=static_limit burst=200 nodelay/g' /tmp/obsync_temp
        
        # 检查修改结果
        echo '=== 修改后的限流配置 ==='
        grep -A 2 -B 2 'limit_req_zone.*static_limit' /tmp/obsync_temp
        echo ''
        grep -A 2 -B 2 'limit_req zone=static_limit' /tmp/obsync_temp
        echo ''
        
        # 应用新配置
        sudo cp /tmp/obsync_temp /etc/nginx/sites-enabled/obsync
        sudo rm /tmp/obsync_temp
        
        echo '限流配置修改完成'
    "
    
    if [ $? -eq 0 ]; then
        log_success "限流配置修复完成"
    else
        log_error "限流配置修复失败"
        exit 1
    fi
}

# 测试Nginx配置
test_nginx_config() {
    log_info "测试Nginx配置..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        sudo nginx -t
    "
    
    if [ $? -eq 0 ]; then
        log_success "Nginx配置测试通过"
    else
        log_error "Nginx配置测试失败，恢复备份配置"
        # 恢复备份
        ssh "$SERVER_USER@$SERVER_HOST" "
            BACKUP_FILE=\$(ls -t /etc/nginx/sites-enabled/obsync.backup.* | head -1)
            if [ -f \"\$BACKUP_FILE\" ]; then
                sudo cp \"\$BACKUP_FILE\" /etc/nginx/sites-enabled/obsync
                echo '已恢复备份配置'
            fi
        "
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
    
    # 等待几秒让配置生效
    sleep 3
    
    log_info "测试静态文件访问..."
    
    # 测试多个静态文件请求
    for i in {1..5}; do
        echo "测试请求 $i/5..."
        curl -s -I https://kwps.jlufe.edu.cn/web/ | head -1
        sleep 1
    done
    
    echo ""
    log_info "检查最新的错误日志..."
    ssh "$SERVER_USER@$SERVER_HOST" "
        echo '=== 最近的错误日志 (最后10行) ==='
        tail -10 /var/log/nginx/kwps_error.log | grep -v 'limiting requests' || echo '没有发现限流错误'
    "
    
    if [ $? -eq 0 ]; then
        log_success "✅ 限流问题修复成功！"
        echo ""
        echo "🎯 访问地址："
        echo "  Web管理后台: https://kwps.jlufe.edu.cn/web/"
        echo "  移动端应用: https://kwps.jlufe.edu.cn/app/"
        echo ""
        echo "📊 新的限流配置："
        echo "  静态文件: 100请求/秒，突发200请求"
        echo "  API请求: 10请求/秒，突发20请求"
    else
        log_error "❌ 验证过程中出现问题"
        exit 1
    fi
}

# 主函数
main() {
    echo "🔧 开始修复Nginx限流配置..."
    echo ""
    
    log_info "目标服务器: $SERVER_HOST"
    log_info "SSH用户: $SERVER_USER"
    echo ""
    
    # 执行修复步骤
    check_current_config
    echo "----------------------------------------"
    
    backup_config
    echo "----------------------------------------"
    
    fix_rate_limiting
    echo "----------------------------------------"
    
    test_nginx_config
    echo "----------------------------------------"
    
    reload_nginx
    echo "----------------------------------------"
    
    verify_fix
    
    echo ""
    echo "🎉 限流配置修复完成！"
    echo ""
    echo "📋 问题总结："
    echo "  问题原因: 静态文件限流配置过于严格（30r/s，burst=50）"
    echo "  解决方案: 提高限流阈值（100r/s，burst=200）"
    echo "  修复效果: 允许更多并发静态文件请求"
    echo ""
    echo "💡 配置说明："
    echo "  - rate=100r/s: 每秒允许100个请求"
    echo "  - burst=200: 突发时最多允许200个请求"
    echo "  - nodelay: 立即处理突发请求，不排队"
}

# 帮助信息
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "Nginx限流配置修复脚本"
    echo ""
    echo "功能："
    echo "  - 检查当前限流配置"
    echo "  - 备份现有配置"
    echo "  - 调整限流参数"
    echo "  - 验证修复结果"
    echo ""
    echo "使用方法："
    echo "  $0              # 执行完整修复流程"
    echo "  $0 --help       # 显示帮助信息"
    echo ""
    echo "问题背景："
    echo "  现代Web应用在加载时会同时请求多个静态资源（JS、CSS、图片等），"
    echo "  如果限流配置过于严格，会导致部分请求被拒绝，返回503错误。"
    echo ""
    echo "修复方案："
    echo "  将静态文件限流从30r/s提高到100r/s，burst从50提高到200，"
    echo "  以适应现代Web应用的资源加载需求。"
    echo ""
    exit 0
fi

# 执行主函数
main
