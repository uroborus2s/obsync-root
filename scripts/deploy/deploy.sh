#!/bin/bash
# ObSync 本地部署脚本
# 用途: 从本地部署各种组件到远程服务器

set -e

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULES_DIR="$SCRIPT_DIR/modules"
CONFIG_DIR="$SCRIPT_DIR/config"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# 加载配置
load_config() {
    if [ -f "$CONFIG_DIR/servers.conf" ]; then
        source "$CONFIG_DIR/servers.conf"
    else
        log_error "服务器配置文件不存在: $CONFIG_DIR/servers.conf"
        exit 1
    fi
    
    if [ -f "$CONFIG_DIR/deploy.conf" ]; then
        source "$CONFIG_DIR/deploy.conf"
    else
        log_warning "部署配置文件不存在，使用默认配置"
    fi
}

# 显示帮助信息
show_help() {
    echo "ObSync 部署脚本"
    echo ""
    echo "用法: $0 [选项] [模块...]"
    echo ""
    echo "模块:"
    echo "  nginx          - 部署 Nginx 配置文件"
    echo "  ssl            - 部署 SSL 证书文件"
    echo "  app            - 编译并部署 agendaedu-app 静态文件"
    echo "  web            - 编译并部署 agendaedu-web 静态文件"
    echo "  docker-compose - 部署统一的 Docker Compose 配置文件"
    echo "  api-gateway    - 构建并部署 API Gateway 应用"
    echo "  icasync        - 构建并部署 ICA Sync 应用"
    echo "  backend-apps   - 构建并部署所有后端应用 (API Gateway + ICA Sync)"
    echo "  all            - 部署所有模块"
    echo ""
    echo "选项:"
    echo "  -s, --server SERVER    指定目标服务器 (main|backup|all)"
    echo "  -e, --env ENV          指定环境 (dev|staging|prod)"
    echo "  -f, --force            强制部署，跳过确认"
    echo "  -d, --dry-run          预览模式，不执行实际部署"
    echo "  -v, --verbose          详细输出"
    echo "  -h, --help             显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 nginx                    # 部署 Nginx 配置到所有服务器"
    echo "  $0 -s main nginx ssl        # 仅部署 Nginx 和 SSL 到主服务器"
    echo "  $0 -s backup app web        # 部署静态文件到备用服务器"
    echo "  $0 --dry-run all            # 预览所有部署操作"
    echo "  $0 -f -e prod all           # 强制部署所有模块到生产环境"
}

# 检查依赖
check_dependencies() {
    local deps=("ssh" "scp" "rsync")
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" >/dev/null 2>&1; then
            log_error "缺少依赖: $dep"
            exit 1
        fi
    done
    
    # 检查 Node.js 和 pnpm (用于静态文件编译)
    if [[ " $MODULES " =~ " app " ]] || [[ " $MODULES " =~ " web " ]]; then
        if ! command -v node >/dev/null 2>&1; then
            log_error "缺少依赖: node (用于静态文件编译)"
            exit 1
        fi

        if ! command -v pnpm >/dev/null 2>&1; then
            log_error "缺少依赖: pnpm (用于静态文件编译)"
            log_info "请安装 pnpm: npm install -g pnpm"
            exit 1
        fi
    fi

    # 检查 Docker (用于后端应用部署)
    if [[ " $MODULES " =~ " docker-compose " ]] || [[ " $MODULES " =~ " api-gateway " ]] || [[ " $MODULES " =~ " icasync " ]] || [[ " $MODULES " =~ " backend-apps " ]]; then
        if ! command -v docker >/dev/null 2>&1; then
            log_error "缺少依赖: docker (用于后端应用部署)"
            exit 1
        fi

        if ! docker info >/dev/null 2>&1; then
            log_error "Docker 服务未运行"
            exit 1
        fi
    fi
}

# 检查服务器连接
check_server_connection() {
    local server=$1
    local host=$2

    log "检查服务器连接: $server ($host)"

    if ssh -o ConnectTimeout=10 -o BatchMode=yes "$host" "echo 'Connection OK'" >/dev/null 2>&1; then
        log_success "服务器 $server 连接正常"
        return 0
    else
        log_error "无法连接到服务器 $server ($host)"
        log_info "请检查 SSH 配置文件 ~/.ssh/config 中的别名设置"
        return 1
    fi
}

# 执行模块部署
deploy_module() {
    local module=$1
    local server=$2

    # 模块名称映射
    local module_script=""
    case "$module" in
        "nginx")
            module_script="$MODULES_DIR/nginx-config.sh"
            ;;
        "ssl")
            module_script="$MODULES_DIR/ssl-certs.sh"
            ;;
        "app")
            module_script="$MODULES_DIR/static-app.sh"
            ;;
        "web")
            module_script="$MODULES_DIR/static-web.sh"
            ;;
        "api-gateway")
            module_script="$MODULES_DIR/api-gateway.sh"
            ;;
        "icasync")
            module_script="$MODULES_DIR/icasync.sh"
            ;;
        "docker-compose")
            module_script="$MODULES_DIR/docker-compose.sh"
            ;;
        "backend-apps")
            module_script="$MODULES_DIR/backend-apps.sh"
            ;;
        *)
            log_error "未知的模块: $module"
            return 1
            ;;
    esac

    if [ ! -f "$module_script" ]; then
        log_error "模块脚本不存在: $module_script"
        return 1
    fi
    
    log "执行模块: $module (服务器: $server)"
    
    # 设置环境变量供模块脚本使用
    export DEPLOY_SERVER="$server"
    export DEPLOY_ENV="$ENVIRONMENT"
    export DEPLOY_DRY_RUN="$DRY_RUN"
    export DEPLOY_VERBOSE="$VERBOSE"
    export DEPLOY_FORCE="$FORCE"
    export SCRIPT_DIR="$SCRIPT_DIR"
    
    # 执行模块脚本
    if bash "$module_script"; then
        log_success "模块 $module 部署完成"
        return 0
    else
        log_error "模块 $module 部署失败"
        return 1
    fi
}

# 确认部署
confirm_deployment() {
    if [ "$FORCE" = "true" ]; then
        return 0
    fi
    
    echo ""
    log_info "部署信息:"
    echo "  目标服务器: $TARGET_SERVERS"
    echo "  部署模块: $MODULES"
    echo "  环境: $ENVIRONMENT"
    echo "  预览模式: $DRY_RUN"
    echo ""
    
    read -p "确认执行部署? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        log "部署已取消"
        exit 0
    fi
}

# 主函数
main() {
    # 默认参数
    TARGET_SERVERS="all"
    ENVIRONMENT="prod"
    MODULES=""
    DRY_RUN="false"
    VERBOSE="false"
    FORCE="false"
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--server)
                TARGET_SERVERS="$2"
                shift 2
                ;;
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -f|--force)
                FORCE="true"
                shift
                ;;
            -d|--dry-run)
                DRY_RUN="true"
                shift
                ;;
            -v|--verbose)
                VERBOSE="true"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            nginx|ssl|app|web|docker-compose|api-gateway|icasync|backend-apps|all)
                if [ -z "$MODULES" ]; then
                    MODULES="$1"
                else
                    MODULES="$MODULES $1"
                fi
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 检查必需参数
    if [ -z "$MODULES" ]; then
        log_error "请指定要部署的模块"
        show_help
        exit 1
    fi
    
    # 处理 all 模块
    if [[ " $MODULES " =~ " all " ]]; then
        MODULES="nginx ssl app web docker-compose backend-apps"
    fi
    
    # 加载配置
    load_config
    
    # 检查依赖
    check_dependencies
    
    # 确认部署
    confirm_deployment
    
    # 开始部署
    log "=== 开始 ObSync 部署 ==="
    
    # 确定目标服务器列表
    local servers=()
    case "$TARGET_SERVERS" in
        "main")
            servers=("main")
            ;;
        "backup")
            servers=("backup")
            ;;
        "all")
            servers=("main" "backup")
            ;;
        *)
            log_error "无效的服务器选项: $TARGET_SERVERS"
            exit 1
            ;;
    esac
    
    # 检查服务器连接
    local connection_failed=false
    for server in "${servers[@]}"; do
        case "$server" in
            "main")
                if ! check_server_connection "main" "$MAIN_SERVER_HOST"; then
                    connection_failed=true
                fi
                ;;
            "backup")
                if ! check_server_connection "backup" "$BACKUP_SERVER_HOST"; then
                    connection_failed=true
                fi
                ;;
        esac
    done
    
    if [ "$connection_failed" = "true" ] && [ "$DRY_RUN" = "false" ]; then
        log_error "服务器连接检查失败"
        exit 1
    fi
    
    # 执行部署
    local deployment_failed=false
    for server in "${servers[@]}"; do
        log "=== 部署到服务器: $server ==="
        
        for module in $MODULES; do
            if ! deploy_module "$module" "$server"; then
                deployment_failed=true
                if [ "$FORCE" != "true" ]; then
                    break 2
                fi
            fi
        done
    done
    
    # 部署结果
    if [ "$deployment_failed" = "true" ]; then
        log_error "=== 部署完成，但有错误发生 ==="
        exit 1
    else
        log_success "=== 部署成功完成 ==="
    fi
}

# 脚本入口
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
