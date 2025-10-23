#!/bin/bash
# agendaedu-app 静态文件部署模块

set -e

# 加载配置
source "$SCRIPT_DIR/config/servers.conf"
source "$SCRIPT_DIR/config/deploy.conf"

# 日志函数
log() { echo -e "\033[0;36m[APP]\033[0m $1"; }
log_success() { echo -e "\033[0;32m✅ [APP]\033[0m $1"; }
log_error() { echo -e "\033[0;31m❌ [APP]\033[0m $1"; }
log_warning() { echo -e "\033[1;33m⚠️  [APP]\033[0m $1"; }

# 检测 timeout 命令
detect_timeout_command() {
    if command -v timeout >/dev/null 2>&1; then
        echo "timeout"
    elif command -v gtimeout >/dev/null 2>&1; then
        echo "gtimeout"
    else
        echo ""
    fi
}

# 获取 timeout 命令
TIMEOUT_CMD=$(detect_timeout_command)

# 获取服务器信息
get_server_info() {
    case "$DEPLOY_SERVER" in
        "main")
            SERVER_HOST="$MAIN_SERVER_HOST"
            SERVER_USER="$MAIN_SERVER_USER"
            SERVER_NAME="$MAIN_SERVER_NAME"
            ;;
        "backup")
            SERVER_HOST="$BACKUP_SERVER_HOST"
            SERVER_USER="$BACKUP_SERVER_USER"
            SERVER_NAME="$MAIN_SBACKUP_SERVER_NAMEERVER_NAME"
            # 备用服务器通常不需要静态文件
            ;;
        *)
            log_error "无效的服务器: $DEPLOY_SERVER"
            exit 1
            ;;
    esac
}

# 远程执行命令
remote_exec() {
    local command="$1"
    local description="$2"
    
    if [ "$DEPLOY_DRY_RUN" = "true" ]; then
        log "[DRY-RUN] 远程执行: $command"
        return 0
    fi
    
    if [ -n "$description" ]; then
        log "$description"
    fi
    
    if ssh $SSH_OPTIONS "$SERVER_HOST" "$command"; then
        return 0
    else
        log_error "远程命令执行失败: $command"
        return 1
    fi
}

# 检查源码目录
check_source_directory() {
    log "检查 agendaedu-app 源码目录..."
    
    if [ ! -d "$APP_SOURCE_DIR" ]; then
        log_error "源码目录不存在: $APP_SOURCE_DIR"
        return 1
    fi
    
    if [ ! -f "$APP_SOURCE_DIR/package.json" ]; then
        log_error "package.json 不存在: $APP_SOURCE_DIR/package.json"
        return 1
    fi
    
    log_success "源码目录检查通过"
    return 0
}

# 安装依赖
install_dependencies() {
    log "安装 agendaedu-app 依赖..."
    
    cd "$APP_SOURCE_DIR"
    
    # 检查 Node.js 版本
    local node_version=$(node --version)
    log "Node.js 版本: $node_version"
    
    # # 清理可能的缓存
    # if [ -d "node_modules" ]; then
    #     log "清理现有 node_modules..."
    #     rm -rf node_modules
    # fi

    if [ -f "pnpm-lock.yaml" ]; then
        log "清理 pnpm-lock.yaml..."
        rm -f pnpm-lock.yaml
    fi
    
    # 安装依赖
    log "执行: $APP_INSTALL_COMMAND"
    if [ -n "$TIMEOUT_CMD" ]; then
        # 使用 timeout 命令
        if $TIMEOUT_CMD $BUILD_TIMEOUT $APP_INSTALL_COMMAND; then
            log_success "依赖安装完成"
        else
            log_error "依赖安装失败或超时"
            return 1
        fi
    else
        # 不使用 timeout，直接执行
        log_warning "timeout 命令不可用，跳过超时控制"
        if $APP_INSTALL_COMMAND; then
            log_success "依赖安装完成"
        else
            log_error "依赖安装失败"
            return 1
        fi
    fi
}

# 编译静态文件
build_static_files() {
    log "编译 agendaedu-app 静态文件..."
    
    cd "$APP_SOURCE_DIR"
    
    # 设置环境变量
    export NODE_ENV="$NODE_ENV"
    export DEPLOY_ENV="$DEPLOY_ENV"
    
    # 清理构建目录
    if [ -d "$APP_BUILD_DIR" ]; then
        log "清理现有构建目录..."
        rm -rf "$APP_BUILD_DIR"
    fi
    
    # 执行构建
    log "执行: $APP_BUILD_COMMAND"
    if [ -n "$TIMEOUT_CMD" ]; then
        # 使用 timeout 命令
        if $TIMEOUT_CMD $BUILD_TIMEOUT $APP_BUILD_COMMAND; then
            log_success "静态文件编译完成"
        else
            log_error "静态文件编译失败或超时"
            return 1
        fi
    else
        # 不使用 timeout，直接执行
        log_warning "timeout 命令不可用，跳过超时控制"
        if $APP_BUILD_COMMAND; then
            log_success "静态文件编译完成"
        else
            log_error "静态文件编译失败"
            return 1
        fi
    fi
    
    # 检查构建结果
    if [ ! -d "$APP_BUILD_DIR" ]; then
        log_error "构建目录不存在: $APP_BUILD_DIR"
        return 1
    fi
    
    local file_count=$(find "$APP_BUILD_DIR" -type f | wc -l)
    local dir_size=$(du -sh "$APP_BUILD_DIR" | cut -f1)
    
    log_success "构建完成: $file_count 个文件, 总大小: $dir_size"
}

# 备份现有静态文件
backup_existing_files() {
    log "备份现有静态文件..."
    
    # 创建备份目录
    remote_exec "sudo mkdir -p $BACKUP_DIR/static" "创建静态文件备份目录"
    remote_exec "sudo chown ubuntu:ubuntu $BACKUP_DIR/static" "设置静态文件备份目录权限"
    
    # 备份现有文件
    remote_exec "if [ -d $STATIC_APP_DIR ]; then tar -czf $BACKUP_DIR/static/agendaedu-app.backup.$DEPLOY_TIMESTAMP.tar.gz -C $STATIC_APP_DIR . 2>/dev/null || true; fi" "备份现有 App 静态文件"
    
    log_success "静态文件备份完成"
}

# 部署静态文件
deploy_static_files() {
    log "部署 agendaedu-app 静态文件到 $SERVER_NAME..."
    
    if [ "$DEPLOY_DRY_RUN" = "true" ]; then
        log "[DRY-RUN] 部署静态文件: $APP_BUILD_DIR -> $STATIC_APP_DIR"
        return 0
    fi
    
    # 创建目标目录
    remote_exec "sudo mkdir -p $STATIC_APP_DIR" "创建静态文件目录"
    
    # 清理目标目录
    remote_exec "sudo rm -rf $STATIC_APP_DIR/*" "清理现有静态文件"
    
    # 使用 rsync 同步文件到临时目录，然后移动
    log "同步静态文件..."
    local temp_dir="/tmp/static-app-$$"

    if rsync -avz --delete "$APP_BUILD_DIR/" "$SERVER_HOST:$temp_dir/"; then
        # 移动到目标目录
        if remote_exec "sudo rm -rf $STATIC_APP_DIR/* && sudo mv $temp_dir/* $STATIC_APP_DIR/" "移动静态文件到目标目录"; then
            # 移动成功后清理临时目录
            remote_exec "rm -rf $temp_dir" "清理临时目录"
            log_success "静态文件同步完成"
        else
            log_error "静态文件移动失败"
            # 移动失败时也要清理临时目录
            remote_exec "rm -rf $temp_dir" "清理临时目录"
            return 1
        fi
    else
        log_error "静态文件同步失败"
        # rsync 失败时，临时目录可能不存在，但尝试清理以防万一
        remote_exec "rm -rf $temp_dir" "清理可能存在的临时目录"
        return 1
    fi
    
    # 设置文件权限
    remote_exec "sudo chown -R www-data:www-data $STATIC_APP_DIR" "设置文件所有者"
    remote_exec "sudo find $STATIC_APP_DIR -type f -exec chmod 644 {} \;" "设置文件权限"
    remote_exec "sudo find $STATIC_APP_DIR -type d -exec chmod 755 {} \;" "设置目录权限"
    
    log_success "静态文件部署完成"
}

# 验证部署
verify_deployment() {
    if [ "$VERIFY_DEPLOYMENT" != "true" ]; then
        log_warning "跳过部署验证 (VERIFY_DEPLOYMENT=false)"
        return 0
    fi
    
    log "验证静态文件部署..."
    
    # 检查目录存在
    if ! remote_exec "test -d $STATIC_APP_DIR" "检查静态文件目录"; then
        log_error "静态文件目录不存在"
        return 1
    fi
    
    # 检查关键文件
    if ! remote_exec "test -f $STATIC_APP_DIR/index.html" "检查 index.html"; then
        log_error "index.html 文件不存在"
        return 1
    fi
    
    # 统计文件数量
    local remote_file_count=$(ssh $SSH_OPTIONS "$SERVER_HOST" "find $STATIC_APP_DIR -type f | wc -l")
    log "远程文件数量: $remote_file_count"
    
    # 测试 HTTP 访问
    if remote_exec "curl -s -f http://localhost/app/ >/dev/null" "测试 App 访问"; then
        log_success "App 静态文件访问正常"
    else
        log_warning "App 静态文件访问失败"
    fi
    
    log_success "静态文件部署验证完成"
}

# 清理构建文件
cleanup_build_files() {
    if [ "$DEPLOY_DRY_RUN" = "true" ]; then
        return 0
    fi
    
    log "清理本地构建文件..."

    cd "$APP_SOURCE_DIR"

    # 保留构建结果 (dist 目录)，不清理任何文件
    # 如果需要清理 node_modules，可以手动执行
    log "保留构建结果，跳过清理"

    log_success "构建文件清理完成"
}

# 生成部署报告
generate_deployment_report() {
    log "生成部署报告..."
    
    local report_file="$SCRIPT_DIR/deploy-app-report-$DEPLOY_TIMESTAMP.txt"
    
    cat > "$report_file" << EOF
agendaedu-app 部署报告
=====================

部署时间: $(date)
目标服务器: $SERVER_NAME ($SERVER_HOST)
部署环境: $DEPLOY_ENV
源码目录: $APP_SOURCE_DIR
构建目录: $APP_BUILD_DIR
目标目录: $STATIC_APP_DIR

构建信息:
- Node.js 版本: $(node --version)
- pnpm 版本: $(pnpm --version)
- 构建命令: $APP_BUILD_COMMAND

部署结果:
- 状态: 成功
- 文件数量: $(find "$APP_BUILD_DIR" -type f | wc -l)
- 总大小: $(du -sh "$APP_BUILD_DIR" | cut -f1)

EOF
    
    log_success "部署报告已生成: $report_file"
}

# 主函数
main() {
    log "=== 开始部署 agendaedu-app 静态文件 ==="
    
    # 获取服务器信息
    get_server_info
    
    log "目标服务器: $SERVER_NAME ($SERVER_HOST)"
    log "源码目录: $APP_SOURCE_DIR"
    log "构建目录: $APP_BUILD_DIR"
    
    # 检查源码目录
    if ! check_source_directory; then
        exit 1
    fi
    
    # # 执行部署步骤
    # if [ "$DEPLOY_DRY_RUN" != "true" ]; then
    #     install_dependencies
    #     build_static_files
    # fi
    
    # if [ "$BACKUP_ENABLED" = "true" ]; then
    #     backup_existing_files
    # fi
    
    deploy_static_files
    verify_deployment
    
    if [ "$DEPLOY_DRY_RUN" != "true" ]; then
        cleanup_build_files
        generate_deployment_report
    fi
    
    log_success "=== agendaedu-app 静态文件部署完成 ==="
}

# 执行主函数
main "$@"
