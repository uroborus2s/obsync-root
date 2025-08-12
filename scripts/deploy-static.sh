#!/bin/bash

# 静态文件部署脚本
# 用于将前端应用构建产物部署到服务器

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo ${SCRIPT_DIR}
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
echo ${PROJECT_ROOT}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 服务器配置
SERVER_1_HOST="jlufe_12.6"
SERVER_1_USER="ubuntu"
SERVER_1_WEB_PATH="/var/www/agendaedu-web"
SERVER_1_APP_PATH="/var/www/agendaedu-app"

# 本地构建路径
LOCAL_WEB_DIST="$PROJECT_ROOT/apps/agendaedu-web/dist"
LOCAL_APP_DIST="$PROJECT_ROOT/apps/agendaedu-app/dist"

# 备份路径
BACKUP_PATH="/var/www/backups"

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
    log_info "检查部署依赖..."
    
    # 检查 rsync
    if ! command -v rsync &> /dev/null; then
        log_error "rsync 未安装，请先安装 rsync"
        exit 1
    fi
    
    # 检查 ssh
    if ! command -v ssh &> /dev/null; then
        log_error "ssh 未安装，请先安装 ssh"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 构建Web应用
build_web_app() {
    log_info "构建 Web 管理后台..."

    cd "$PROJECT_ROOT/apps/agendaedu-web"

    if [ ! -f "package.json" ]; then
        log_error "Web 应用 package.json 不存在"
        exit 1
    fi

    if [ "$dry_run" = true ]; then
        log_info "[DRY-RUN] 将执行: pnpm install && pnpm run build"
        return 0
    fi

    if [ "$verbose" = true ]; then
        pnpm install
        pnpm run build
    else
        pnpm install > /dev/null 2>&1
        pnpm run build > /dev/null 2>&1
    fi

    if [ $? -ne 0 ] || [ ! -d dist ]; then
        log_error "Web 应用构建失败"
        exit 1
    fi

    log_success "Web 应用构建完成"
    cd "$PROJECT_ROOT"
}

# 构建移动端应用
build_mobile_app() {
    log_info "构建移动端应用..."

    cd "$PROJECT_ROOT/apps/agendaedu-app"

    if [ ! -f "package.json" ]; then
        log_error "移动端应用 package.json 不存在"
        exit 1
    fi

    if [ "$dry_run" = true ]; then
        log_info "[DRY-RUN] 将执行: pnpm install && pnpm run build"
        return 0
    fi

    if [ "$verbose" = true ]; then
        pnpm install
        pnpm run build
    else
        pnpm install > /dev/null 2>&1
        pnpm run build > /dev/null 2>&1
    fi

    if [ $? -ne 0 ] || [ ! -d dist ]; then
        log_error "移动端应用构建失败"
        exit 1
    fi

    log_success "移动端应用构建完成"
    cd "$PROJECT_ROOT"
}

# 构建前端应用（根据选择）
build_frontend() {
    log_info "开始构建前端应用..."

    if [ "$deploy_web" = true ]; then
        build_web_app
    fi

    if [ "$deploy_app" = true ]; then
        build_mobile_app
    fi

    log_success "前端应用构建完成"
}

# 验证构建产物
validate_build() {
    log_info "验证构建产物..."

    if [ "$dry_run" = true ]; then
        log_info "[DRY-RUN] 将验证构建产物"
        return 0
    fi

    # 检查 Web 应用构建产物
    if [ "$deploy_web" = true ]; then
        if [ ! -d "$LOCAL_WEB_DIST" ]; then
            log_error "Web 应用构建产物不存在: $LOCAL_WEB_DIST"
            exit 1
        fi

        if [ ! -f "$LOCAL_WEB_DIST/index.html" ]; then
            log_error "Web 应用 index.html 不存在"
            exit 1
        fi
        log_success "Web 应用构建产物验证通过"
    fi

    # 检查移动端应用构建产物
    if [ "$deploy_app" = true ]; then
        if [ ! -d "$LOCAL_APP_DIST" ]; then
            log_error "移动端应用构建产物不存在: $LOCAL_APP_DIST"
            exit 1
        fi

        if [ ! -f "$LOCAL_APP_DIST/index.html" ]; then
            log_error "移动端应用 index.html 不存在"
            exit 1
        fi
        log_success "移动端应用构建产物验证通过"
    fi

    log_success "构建产物验证完成"
}

# 创建服务器备份
create_backup() {
    log_info "创建服务器备份..."
    
    # 备份 Web 应用
    ssh "$SERVER_1_USER@$SERVER_1_HOST" "
        if [ -d '$SERVER_1_WEB_PATH' ]; then
            sudo mkdir -p '$BACKUP_PATH'
            sudo tar -czf '$BACKUP_PATH/agendaedu-web-$TIMESTAMP.tar.gz' -C '$SERVER_1_WEB_PATH' . 2>/dev/null || true
            echo 'Web 应用备份完成'
        fi
    "
    
    # 备份移动端应用
    ssh "$SERVER_1_USER@$SERVER_1_HOST" "
        if [ -d '$SERVER_1_APP_PATH' ]; then
            sudo mkdir -p '$BACKUP_PATH'
            sudo tar -czf '$BACKUP_PATH/agendaedu-app-$TIMESTAMP.tar.gz' -C '$SERVER_1_APP_PATH' . 2>/dev/null || true
            echo '移动端应用备份完成'
        fi
    "
    
    log_success "服务器备份完成"
}

# 部署Web应用到服务器
deploy_web_to_server() {
    log_info "部署 Web 管理后台..."

    if [ "$dry_run" = true ]; then
        log_info "[DRY-RUN] 将部署Web应用到服务器"
        return 0
    fi

    # 创建目标目录
    ssh "$SERVER_1_USER@$SERVER_1_HOST" "
        sudo mkdir -p '$SERVER_1_WEB_PATH'
        sudo chown -R www-data:www-data '$SERVER_1_WEB_PATH'
    "

    # 先上传到临时目录
    TEMP_WEB_PATH="/tmp/agendaedu-web-$(date +%Y%m%d_%H%M%S)"

    if [ "$verbose" = true ]; then
        rsync -avz --delete \
            --exclude='.DS_Store' \
            --exclude='*.map' \
            "$LOCAL_WEB_DIST/" \
            "$SERVER_1_USER@$SERVER_1_HOST:$TEMP_WEB_PATH/"
    else
        rsync -az --delete \
            --exclude='.DS_Store' \
            --exclude='*.map' \
            "$LOCAL_WEB_DIST/" \
            "$SERVER_1_USER@$SERVER_1_HOST:$TEMP_WEB_PATH/" > /dev/null 2>&1
    fi

    if [ $? -ne 0 ]; then
        log_error "Web 应用文件上传失败"
        exit 1
    fi

    log_success "Web 应用文件上传完成"

    # 在服务器上移动文件并设置权限
    log_info "设置 Web 应用权限..."
    ssh "$SERVER_1_USER@$SERVER_1_HOST" "
        # 备份现有文件
        if [ -d '$SERVER_1_WEB_PATH' ]; then
            sudo cp -r '$SERVER_1_WEB_PATH' '$SERVER_1_WEB_PATH.backup.\$(date +%Y%m%d_%H%M%S)' 2>/dev/null || true
            echo '已备份现有文件'
        fi

        # 清空目标目录
        sudo rm -rf '$SERVER_1_WEB_PATH'/*

        # 移动文件到目标目录
        sudo cp -r '$TEMP_WEB_PATH'/* '$SERVER_1_WEB_PATH'/

        # 设置正确的权限
        sudo chown -R www-data:www-data '$SERVER_1_WEB_PATH'
        sudo find '$SERVER_1_WEB_PATH' -type d -exec chmod 755 {} \;
        sudo find '$SERVER_1_WEB_PATH' -type f -exec chmod 644 {} \;

        # 清理临时文件
        rm -rf '$TEMP_WEB_PATH'

        echo 'Web应用权限设置完成'
    "

    log_success "Web 应用部署完成"
}
# 部署移动端应用到服务器
deploy_app_to_server() {
    log_info "部署移动端应用..."

    if [ "$dry_run" = true ]; then
        log_info "[DRY-RUN] 将部署移动端应用到服务器"
        return 0
    fi

    # 创建目标目录
    ssh "$SERVER_1_USER@$SERVER_1_HOST" "
        sudo mkdir -p '$SERVER_1_APP_PATH'
        sudo chown -R www-data:www-data '$SERVER_1_APP_PATH'
    "

    # 先上传到临时目录
    TEMP_APP_PATH="/tmp/agendaedu-app-$(date +%Y%m%d_%H%M%S)"

    if [ "$verbose" = true ]; then
        rsync -avz --delete \
            --exclude='.DS_Store' \
            --exclude='*.map' \
            "$LOCAL_APP_DIST/" \
            "$SERVER_1_USER@$SERVER_1_HOST:$TEMP_APP_PATH/"
    else
        rsync -az --delete \
            --exclude='.DS_Store' \
            --exclude='*.map' \
            "$LOCAL_APP_DIST/" \
            "$SERVER_1_USER@$SERVER_1_HOST:$TEMP_APP_PATH/" > /dev/null 2>&1
    fi

    if [ $? -ne 0 ]; then
        log_error "移动端应用文件上传失败"
        exit 1
    fi

    log_success "移动端应用文件上传完成"

    # 在服务器上移动文件并设置权限
    log_info "设置移动端应用权限..."
    ssh "$SERVER_1_USER@$SERVER_1_HOST" "
        # 备份现有文件
        if [ -d '$SERVER_1_APP_PATH' ]; then
            sudo cp -r '$SERVER_1_APP_PATH' '$SERVER_1_APP_PATH.backup.\$(date +%Y%m%d_%H%M%S)' 2>/dev/null || true
            echo '已备份现有文件'
        fi

        # 清空目标目录
        sudo rm -rf '$SERVER_1_APP_PATH'/*

        # 移动文件到目标目录
        sudo cp -r '$TEMP_APP_PATH'/* '$SERVER_1_APP_PATH'/

        # 设置正确的权限
        sudo chown -R www-data:www-data '$SERVER_1_APP_PATH'
        sudo find '$SERVER_1_APP_PATH' -type d -exec chmod 755 {} \;
        sudo find '$SERVER_1_APP_PATH' -type f -exec chmod 644 {} \;

        # 清理临时文件
        rm -rf '$TEMP_APP_PATH'

        echo '移动端应用权限设置完成'
    "

    log_success "移动端应用部署完成"
}

# 部署到服务器（根据选择）
deploy_to_server() {
    log_info "开始部署到服务器..."

    if [ "$deploy_web" = true ]; then
        deploy_web_to_server
    fi

    if [ "$deploy_app" = true ]; then
        deploy_app_to_server
    fi

    log_success "服务器部署完成"
    
    # 设置正确的权限
    ssh "$SERVER_1_USER@$SERVER_1_HOST" "
        sudo chown -R www-data:www-data '$SERVER_1_WEB_PATH'
        sudo chown -R www-data:www-data '$SERVER_1_APP_PATH'
        sudo chmod -R 755 '$SERVER_1_WEB_PATH'
        sudo chmod -R 755 '$SERVER_1_APP_PATH'
    "
    
    log_success "权限设置完成"
}

# 验证部署
validate_deployment() {
    log_info "验证部署结果..."

    if [ "$dry_run" = true ]; then
        log_info "[DRY-RUN] 将验证部署结果"
        return 0
    fi

    # 检查 Web 应用
    if [ "$deploy_web" = true ]; then
        WEB_STATUS=$(ssh "$SERVER_1_USER@$SERVER_1_HOST" "
            if [ -f '$SERVER_1_WEB_PATH/index.html' ]; then
                echo 'OK'
            else
                echo 'FAIL'
            fi
        ")

        if [ "$WEB_STATUS" != "OK" ]; then
            log_error "Web 应用部署验证失败"
            exit 1
        fi
        log_success "✅ Web 应用部署验证通过"
    fi

    # 检查移动端应用
    if [ "$deploy_app" = true ]; then
        APP_STATUS=$(ssh "$SERVER_1_USER@$SERVER_1_HOST" "
            if [ -f '$SERVER_1_APP_PATH/index.html' ]; then
                echo 'OK'
            else
                echo 'FAIL'
            fi
        ")

        if [ "$APP_STATUS" != "OK" ]; then
            log_error "移动端应用部署验证失败"
            exit 1
        fi
        log_success "✅ 移动端应用部署验证通过"
    fi

    log_success "部署验证完成"
}

# 重载 Nginx
reload_nginx() {
    log_info "重载 Nginx 配置..."
    
    ssh "$SERVER_1_USER@$SERVER_1_HOST" "
        sudo nginx -t && sudo systemctl reload nginx
    "
    
    if [ $? -ne 0 ]; then
        log_error "Nginx 重载失败"
        exit 1
    fi
    
    log_success "Nginx 重载完成"
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理旧备份文件..."
    
    ssh "$SERVER_1_USER@$SERVER_1_HOST" "
        sudo find '$BACKUP_PATH' -name '*.tar.gz' -mtime +7 -delete 2>/dev/null || true
    "
    
    log_success "旧备份清理完成"
}

# 显示帮助信息
show_help() {
    cat << 'EOF'
静态文件部署脚本 v2.0

用法: ./deploy-static.sh [项目选择] [操作选项] [其他选项]

项目选择:
  --web-only          仅部署Web管理后台 (agendaedu-web)
  --app-only          仅部署移动端应用 (agendaedu-app)
  --all               部署两个项目 (默认)

操作选项:
  -b, --build-only    仅构建，不部署
  -d, --deploy-only   仅部署，不构建
  (无参数)            完整的构建和部署流程 (默认)

其他选项:
  -f, --force         强制部署，跳过确认
  -v, --verbose       详细输出模式
  --dry-run           预演模式，显示操作但不执行
  -h, --help          显示帮助信息

使用示例:
  ./deploy-static.sh                    # 构建并部署两个项目
  ./deploy-static.sh --web-only         # 仅构建并部署Web管理后台
  ./deploy-static.sh --app-only         # 仅构建并部署移动端应用
  ./deploy-static.sh --web-only -b      # 仅构建Web管理后台
  ./deploy-static.sh --app-only -d      # 仅部署移动端应用(跳过构建)
  ./deploy-static.sh --all --force      # 强制部署两个项目
  ./deploy-static.sh --web-only --dry-run  # 预演Web项目部署
  ./deploy-static.sh --verbose          # 详细输出模式

项目说明:
  agendaedu-web:  Web管理后台，部署到 /var/www/agendaedu-web
  agendaedu-app:  移动端应用，部署到 /var/www/agendaedu-app

服务器信息:
  主机: jlufe_10.128
  用户: ubutu
  访问: https://kwps.jlufe.edu.cn/web/ (Web管理后台)
        https://kwps.jlufe.edu.cn/app/ (移动端应用)
EOF
}

# 主函数
main() {
    local build_only=false
    local deploy_only=false
    local force=false
    local verbose=false
    local dry_run=false
    local deploy_web=true
    local deploy_app=true

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            --web-only)
                deploy_web=true
                deploy_app=false
                shift
                ;;
            --app-only)
                deploy_web=false
                deploy_app=true
                shift
                ;;
            --all)
                deploy_web=true
                deploy_app=true
                shift
                ;;
            -b|--build-only)
                build_only=true
                shift
                ;;
            -d|--deploy-only)
                deploy_only=true
                shift
                ;;
            -f|--force)
                force=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            *)
                log_error "未知参数: $1"
                echo ""
                show_help
                exit 1
                ;;
        esac
    done
    
    # 显示部署配置
    echo ""
    echo "🚀 静态文件部署配置："
    echo "   服务器: $SERVER_1_HOST"
    echo "   用户: $SERVER_1_USER"
    echo "   时间戳: $TIMESTAMP"

    # 显示部署项目
    if [ "$deploy_web" = true ] && [ "$deploy_app" = true ]; then
        echo "   部署项目: Web管理后台 + 移动端应用"
    elif [ "$deploy_web" = true ]; then
        echo "   部署项目: Web管理后台"
    elif [ "$deploy_app" = true ]; then
        echo "   部署项目: 移动端应用"
    fi

    # 显示操作模式
    if [ "$build_only" = true ]; then
        echo "   操作模式: 仅构建"
    elif [ "$deploy_only" = true ]; then
        echo "   操作模式: 仅部署"
    else
        echo "   操作模式: 构建并部署"
    fi

    # 显示其他选项
    echo "   强制模式: $force"
    echo "   详细输出: $verbose"
    echo "   预演模式: $dry_run"
    echo ""

    # 检查依赖
    check_dependencies
    
    # 构建阶段
    if [ "$deploy_only" = false ]; then
        build_frontend
        validate_build
    fi
    
    # 部署阶段
    if [ "$build_only" = false ]; then
        # 确认部署
        if [ "$force" = false ]; then
            echo ""
            log_warning "即将部署到生产服务器: $SERVER_1_HOST"
            read -p "确认继续? (y/N): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "部署已取消"
                exit 0
            fi
        fi
        
        create_backup
        deploy_to_server
        validate_deployment
        reload_nginx
        cleanup_old_backups
    fi
    
    # 显示完成信息
    echo ""
    echo "🎉 静态文件部署完成！"
    echo ""

    if [ "$build_only" = false ]; then
        # 显示访问地址
        log_info "访问地址:"
        if [ "$deploy_web" = true ]; then
            log_info "  ✅ Web 管理后台: https://kwps.jlufe.edu.cn/web/"
        fi
        if [ "$deploy_app" = true ]; then
            log_info "  ✅ 移动端应用: https://kwps.jlufe.edu.cn/app/"
        fi
        log_info "  🔍 健康检查: https://kwps.jlufe.edu.cn/health"

        # 显示部署统计
        echo ""
        log_info "部署统计:"
        if [ "$deploy_web" = true ] && [ "$deploy_app" = true ]; then
            log_info "  📦 已部署: 2个项目 (Web管理后台 + 移动端应用)"
        elif [ "$deploy_web" = true ]; then
            log_info "  📦 已部署: 1个项目 (Web管理后台)"
        elif [ "$deploy_app" = true ]; then
            log_info "  📦 已部署: 1个项目 (移动端应用)"
        fi
        log_info "  🚀 部署服务器: $SERVER_1_HOST"
        log_info "  ⏰ 完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
    else
        log_info "📦 构建完成，构建产物位于:"
        if [ "$deploy_web" = true ]; then
            log_info "  Web管理后台: $LOCAL_WEB_DIST"
        fi
        if [ "$deploy_app" = true ]; then
            log_info "  移动端应用: $LOCAL_APP_DIST"
        fi
    fi
}

# 执行主函数
main "$@"
