#!/bin/bash

# AgendaEdu App 静态文件构建脚本
# 构建 React 应用为静态文件，用于部署到 Nginx

set -e

# ================================
# 配置变量
# ================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="agendaedu-app"
BUILD_DIR="dist"
DEPLOY_DIR="/var/www/html/app"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ================================
# 工具函数
# ================================
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

show_help() {
    cat << EOF
AgendaEdu App 静态文件构建脚本

用法:
    $0 [选项]

选项:
    -h, --help          显示此帮助信息
    --build-only        仅构建，不部署
    --deploy-only       仅部署，不构建
    --deploy-dir DIR    指定部署目录（默认: $DEPLOY_DIR）
    --clean             构建前清理
    --dry-run           仅显示命令，不实际执行

示例:
    $0                              # 构建并部署
    $0 --build-only                # 仅构建
    $0 --deploy-dir /custom/path    # 部署到自定义目录
    $0 --clean                      # 清理后构建

EOF
}

# 检查环境
check_environment() {
    log_info "检查构建环境..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    # 检查 pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装"
        exit 1
    fi
    
    # 检查项目文件
    if [[ ! -f "package.json" ]]; then
        log_error "请在 $PROJECT_NAME 项目根目录下运行此脚本"
        exit 1
    fi
    
    log_success "环境检查通过"
}

# 构建静态文件
build_static() {
    log_info "开始构建 $PROJECT_NAME 静态文件..."
    
    # 清理构建目录
    if [[ "$CLEAN" == "true" ]]; then
        log_info "清理构建目录..."
        if [[ "$DRY_RUN" == "true" ]]; then
            echo "rm -rf $BUILD_DIR"
        else
            rm -rf "$BUILD_DIR"
        fi
    fi
    
    # 安装依赖
    log_info "安装依赖..."
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "pnpm install"
    else
        pnpm install
    fi
    
    # 构建项目
    log_info "构建项目..."
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "pnpm run build"
    else
        pnpm run build
    fi
    
    # 验证构建结果
    if [[ "$DRY_RUN" != "true" && ! -d "$BUILD_DIR" ]]; then
        log_error "构建失败：$BUILD_DIR 目录不存在"
        exit 1
    fi
    
    log_success "静态文件构建完成"
}

# 部署静态文件
deploy_static() {
    local target_dir="$1"
    
    log_info "部署静态文件到: $target_dir"
    
    # 检查构建目录
    if [[ "$DRY_RUN" != "true" && ! -d "$BUILD_DIR" ]]; then
        log_error "构建目录不存在: $BUILD_DIR"
        log_info "请先运行构建命令"
        exit 1
    fi
    
    # 创建目标目录
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "sudo mkdir -p $target_dir"
    else
        sudo mkdir -p "$target_dir"
    fi
    
    # 备份现有文件（如果存在）
    if [[ "$DRY_RUN" != "true" && -d "$target_dir" && "$(ls -A $target_dir 2>/dev/null)" ]]; then
        local backup_dir="${target_dir}.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "备份现有文件到: $backup_dir"
        if [[ "$DRY_RUN" == "true" ]]; then
            echo "sudo mv $target_dir $backup_dir"
            echo "sudo mkdir -p $target_dir"
        else
            sudo mv "$target_dir" "$backup_dir"
            sudo mkdir -p "$target_dir"
        fi
    fi
    
    # 复制静态文件
    log_info "复制静态文件..."
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "sudo cp -r $BUILD_DIR/* $target_dir/"
    else
        sudo cp -r "$BUILD_DIR"/* "$target_dir/"
    fi
    
    # 设置权限
    log_info "设置文件权限..."
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "sudo chown -R nginx:nginx $target_dir"
        echo "sudo chmod -R 644 $target_dir"
        echo "sudo find $target_dir -type d -exec chmod 755 {} +"
    else
        sudo chown -R nginx:nginx "$target_dir" 2>/dev/null || sudo chown -R www-data:www-data "$target_dir" 2>/dev/null || true
        sudo chmod -R 644 "$target_dir"
        sudo find "$target_dir" -type d -exec chmod 755 {} +
    fi
    
    log_success "静态文件部署完成"
}

# ================================
# 主函数
# ================================
main() {
    local BUILD_ONLY=false
    local DEPLOY_ONLY=false
    local CLEAN=false
    local DRY_RUN=false
    local CUSTOM_DEPLOY_DIR=""
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            --build-only)
                BUILD_ONLY=true
                shift
                ;;
            --deploy-only)
                DEPLOY_ONLY=true
                shift
                ;;
            --deploy-dir)
                CUSTOM_DEPLOY_DIR="$2"
                shift 2
                ;;
            --clean)
                CLEAN=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 设置部署目录
    if [[ -n "$CUSTOM_DEPLOY_DIR" ]]; then
        DEPLOY_DIR="$CUSTOM_DEPLOY_DIR"
    fi
    
    # 检查环境
    check_environment
    
    # 切换到项目目录
    cd "$SCRIPT_DIR"
    
    log_info "$PROJECT_NAME 静态文件构建部署开始"
    log_info "项目目录: $SCRIPT_DIR"
    log_info "构建目录: $BUILD_DIR"
    log_info "部署目录: $DEPLOY_DIR"
    
    # 执行构建
    if [[ "$DEPLOY_ONLY" != "true" ]]; then
        build_static
    fi
    
    # 执行部署
    if [[ "$BUILD_ONLY" != "true" ]]; then
        deploy_static "$DEPLOY_DIR"
    fi
    
    log_success "$PROJECT_NAME 静态文件处理完成！"
    
    if [[ "$BUILD_ONLY" != "true" ]]; then
        echo ""
        log_info "访问地址: http://localhost/app/"
        log_info "文件位置: $DEPLOY_DIR"
    fi
}

# 错误处理
trap 'log_error "脚本执行失败，退出码: $?"' ERR

# 执行主函数
main "$@"
