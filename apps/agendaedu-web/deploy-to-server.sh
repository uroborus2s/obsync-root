#!/bin/bash

# agendaedu-app 自动部署脚本
# 功能：构建项目 -> 上传到服务器 -> 设置权限 -> 重启nginx

set -e

# 配置变量 - 请根据实际情况修改
SERVER_HOST="47.116.161.190"           # 服务器IP或域名
SERVER_USER="ecs-user"                     # 服务器用户名
SERVER_PATH="/var/www/web"             # 服务器部署路径
TEMP_PATH="/tmp/agendaedu-web-deploy"  # 服务器临时目录
SSH_KEY_PATH="~/.ssh/id_rsa"          # SSH私钥路径（可选）
LOCAL_DIST_PATH="./dist"               # 本地构建目录
SSH_OPTS=""                            # SSH连接参数（全局变量）

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装"
        exit 1
    fi
    
    if ! command -v rsync &> /dev/null; then
        log_error "rsync 未安装，请安装: brew install rsync (macOS) 或 apt-get install rsync (Ubuntu)"
        exit 1
    fi
    
    if ! command -v ssh &> /dev/null; then
        log_error "ssh 未安装"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 构建项目
build_project() {
    log_info "开始构建项目..."
    
    # 清理旧的构建文件
    if [ -d "$LOCAL_DIST_PATH" ]; then
        log_info "清理旧的构建文件..."
        rm -rf "$LOCAL_DIST_PATH"
    fi
    
    # 构建项目
    pnpm run build
    
    # 检查构建结果
    if [ ! -d "$LOCAL_DIST_PATH" ] || [ ! -f "$LOCAL_DIST_PATH/index.html" ]; then
        log_error "构建失败，找不到构建文件"
        exit 1
    fi
    
    log_success "项目构建完成"
    
    # 显示构建文件信息
    log_info "构建文件列表："
    ls -la "$LOCAL_DIST_PATH"
}

# 初始化SSH配置
init_ssh_config() {
    # 构建SSH连接参数
    SSH_OPTS=""
    if [ -f "$SSH_KEY_PATH" ]; then
        SSH_OPTS="-i $SSH_KEY_PATH"
    fi
}

# 上传文件到服务器
upload_files() {
    log_info "开始上传文件到服务器..."
    
    # 测试SSH连接
    log_info "测试SSH连接..."
    if ! ssh $SSH_OPTS -o ConnectTimeout=10 "$SERVER_USER@$SERVER_HOST" "echo 'SSH连接成功'"; then
        log_error "SSH连接失败，请检查服务器配置"
        exit 1
    fi
    
    # 清理并创建临时目录
    log_info "准备服务器临时目录..."
    ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" "rm -rf '$TEMP_PATH' && mkdir -p '$TEMP_PATH'"
    
    # 上传文件到临时目录
    log_info "上传文件到临时目录..."
    rsync -avz --delete \
        -e "ssh $SSH_OPTS" \
        "$LOCAL_DIST_PATH/" \
        "$SERVER_USER@$SERVER_HOST:$TEMP_PATH/"
    
    # 在服务器上创建备份并移动文件
    log_info "备份现有文件并部署新版本..."
    ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" "
        # 备份现有文件
        if [ -d '$SERVER_PATH' ]; then
            sudo cp -r '$SERVER_PATH' '$SERVER_PATH.backup.\$(date +%Y%m%d_%H%M%S)' 2>/dev/null || true
            echo '备份完成'
        fi
        
        # 创建目标目录
        sudo mkdir -p '$SERVER_PATH'
        
        # 清空目标目录
        sudo rm -rf '$SERVER_PATH'/*
        
        # 移动文件到目标目录
        sudo cp -r '$TEMP_PATH'/* '$SERVER_PATH'/
        
        # 清理临时目录
        rm -rf '$TEMP_PATH'
        
        echo '文件部署完成'
    "
    
    log_success "文件上传完成"
}

# 设置服务器权限
set_permissions() {
    log_info "设置文件权限..."
    
    ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" "
        # 设置所有者为nginx用户
        sudo chown -R nginx:nginx '$SERVER_PATH'
        
        # 设置目录权限为755
        sudo find '$SERVER_PATH' -type d -exec chmod 755 {} \;
        
        # 设置文件权限为644
        sudo find '$SERVER_PATH' -type f -exec chmod 644 {} \;
        
        echo '权限设置完成'
    "
    
    log_success "权限设置完成"
}

# 重启nginx
restart_nginx() {
    log_info "重启nginx服务..."
    
    ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" "
        # 测试nginx配置
        if sudo nginx -t; then
            echo 'nginx配置测试通过'
            # 重新加载nginx
            sudo systemctl reload nginx
            echo 'nginx重新加载完成'
        else
            echo 'nginx配置测试失败'
            exit 1
        fi
    "
    
    log_success "nginx服务重启完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署结果..."
    
    # 检查文件是否存在
    ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" "
        if [ -f '$SERVER_PATH/index.html' ]; then
            echo '✅ index.html 存在'
        else
            echo '❌ index.html 不存在'
            exit 1
        fi
        
        if [ -d '$SERVER_PATH/assets' ]; then
            echo '✅ assets 目录存在'
            echo '📁 assets 目录内容:'
            ls -la '$SERVER_PATH/assets/'
        else
            echo '❌ assets 目录不存在'
        fi
        
        echo '📊 文件权限检查:'
        ls -la '$SERVER_PATH/'
    "
    
    log_success "部署验证完成"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "🎉 部署完成！"
    echo ""
    echo "📍 部署信息:"
    echo "   - 服务器: $SERVER_HOST"
    echo "   - 部署路径: $SERVER_PATH"
    echo "   - 访问地址: https://chat.whzhsc.cn/web/"
    echo ""
    echo "🔍 如果页面无法访问，请检查:"
    echo "   1. nginx配置是否正确"
    echo "   2. 防火墙设置"
    echo "   3. SSL证书配置"
    echo "   4. 域名解析"
    echo ""
}

# 主函数
main() {
    echo "🚀 开始部署 agendaedu-web..."
    echo ""
    
    # 初始化SSH配置
    init_ssh_config
    
    # 显示配置信息
    log_info "部署配置:"
    echo "   服务器: $SERVER_HOST"
    echo "   用户: $SERVER_USER"
    echo "   路径: $SERVER_PATH"
    echo ""
    
    # 确认部署
    read -p "确认开始部署? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "部署已取消"
        exit 0
    fi
    
    # 执行部署步骤
    check_dependencies
    build_project
    upload_files
    set_permissions
    restart_nginx
    verify_deployment
    show_deployment_info
}

# 帮助信息
show_help() {
    echo "agendaedu-app 部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -s, --server   指定服务器地址"
    echo "  -u, --user     指定服务器用户"
    echo "  -p, --path     指定部署路径"
    echo ""
    echo "示例:"
    echo "  $0 -s 192.168.1.100 -u root -p /var/www/app"
    echo ""
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -s|--server)
            SERVER_HOST="$2"
            shift 2
            ;;
        -u|--user)
            SERVER_USER="$2"
            shift 2
            ;;
        -p|--path)
            SERVER_PATH="$2"
            shift 2
            ;;
        *)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 检查必要参数
if [ -z "$SERVER_HOST" ]; then
    log_error "请指定服务器地址"
    echo "使用 -s 参数指定服务器地址，或编辑脚本中的 SERVER_HOST 变量"
    exit 1
fi

# 运行主函数
main 