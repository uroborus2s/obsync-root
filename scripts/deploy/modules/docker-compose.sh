#!/bin/bash
# Docker Compose 配置管理模块

set -e

# 加载配置
source "$SCRIPT_DIR/config/servers.conf"
source "$SCRIPT_DIR/config/deploy.conf"

# 日志函数
log() { echo -e "\033[0;34m[DOCKER-COMPOSE]\033[0m $1"; }
log_success() { echo -e "\033[0;32m✅ [DOCKER-COMPOSE]\033[0m $1"; }
log_error() { echo -e "\033[0;31m❌ [DOCKER-COMPOSE]\033[0m $1"; }
log_warning() { echo -e "\033[1;33m⚠️  [DOCKER-COMPOSE]\033[0m $1"; }

# 获取服务器信息
get_server_info() {
    case "$DEPLOY_SERVER" in
        "main")
            SERVER_HOST="$MAIN_SERVER_HOST"
            SERVER_USER="$MAIN_SERVER_USER"
            SERVER_NAME="$MAIN_SERVER_NAME"
            COMPOSE_SOURCE_FILE="$DOCKER_COMPOSE_MAIN_SERVER"
            ;;
        "backup")
            SERVER_HOST="$BACKUP_SERVER_HOST"
            SERVER_USER="$BACKUP_SERVER_USER"
            SERVER_NAME="$BACKUP_SERVER_NAME"
            COMPOSE_SOURCE_FILE="$DOCKER_COMPOSE_BACKUP_SERVER"
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

# 上传文件到系统目录
upload_file() {
    local local_file="$1"
    local remote_path="$2"
    local description="$3"

    if [ ! -f "$local_file" ]; then
        log_error "本地文件不存在: $local_file"
        return 1
    fi

    if [ "$DEPLOY_DRY_RUN" = "true" ]; then
        log "[DRY-RUN] 上传文件: $local_file -> $remote_path"
        return 0
    fi

    if [ -n "$description" ]; then
        log "$description"
    fi

    # 先上传到临时目录
    local temp_file="/tmp/$(basename "$local_file").$$"

    if scp $SSH_OPTIONS "$local_file" "$SERVER_HOST:$temp_file"; then
        # 然后用 sudo 移动到目标位置
        if remote_exec "sudo mv $temp_file $remote_path" "移动文件到目标位置"; then
            log_success "文件上传成功: $(basename "$local_file")"
            # 临时文件已经被 mv 移动，无需删除
            return 0
        else
            log_error "文件移动失败: $temp_file -> $remote_path"
            # 移动失败时清理临时文件
            remote_exec "rm -f $temp_file" "清理临时文件"
            return 1
        fi
    else
        log_error "文件上传失败: $local_file"
        return 1
    fi
}

# 检查本地配置文件
check_local_config() {
    log "检查本地 Docker Compose 配置文件..."
    
    if [ ! -f "$COMPOSE_SOURCE_FILE" ]; then
        log_error "Docker Compose 配置文件不存在: $COMPOSE_SOURCE_FILE"
        return 1
    fi
    
    # 验证 YAML 语法 (如果有 docker compose 命令)
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        if docker compose -f "$COMPOSE_SOURCE_FILE" config >/dev/null 2>&1; then
            log_success "Docker Compose 配置文件语法正确"
        else
            log_error "Docker Compose 配置文件语法错误"
            return 1
        fi
    elif command -v docker-compose >/dev/null 2>&1; then
        if docker-compose -f "$COMPOSE_SOURCE_FILE" config >/dev/null 2>&1; then
            log_success "Docker Compose 配置文件语法正确"
        else
            log_error "Docker Compose 配置文件语法错误"
            return 1
        fi
    fi
    
    log_success "本地配置文件检查通过"
    return 0
}

# 创建服务器目录
create_server_directories() {
    log "创建服务器目录..."
    
    # 创建 Docker Compose 目录
    remote_exec "sudo mkdir -p $DOCKER_COMPOSE_TARGET_DIR" "创建 Docker Compose 目录"
    remote_exec "sudo chown ubuntu:ubuntu $DOCKER_COMPOSE_TARGET_DIR" "设置 Docker Compose 目录权限"

    # 创建备份目录
    remote_exec "sudo mkdir -p $DOCKER_BACKUP_DIR" "创建 Docker 备份目录"
    remote_exec "sudo chown ubuntu:ubuntu $DOCKER_BACKUP_DIR" "设置 Docker 备份目录权限"

    # 创建日志目录
    remote_exec "sudo mkdir -p $LOG_DIR" "创建日志目录"
    remote_exec "sudo chown ubuntu:ubuntu $LOG_DIR" "设置日志目录权限"
    
    log_success "服务器目录创建完成"
}

# 备份现有配置
backup_existing_config() {
    if [ "$BACKUP_ENABLED" != "true" ]; then
        log_warning "跳过备份 (BACKUP_ENABLED=false)"
        return 0
    fi
    
    log "备份现有 Docker Compose 配置..."
    
    # 备份现有的 docker-compose.yml 文件
    remote_exec "if [ -f $DOCKER_COMPOSE_TARGET_FILE ]; then cp $DOCKER_COMPOSE_TARGET_FILE $DOCKER_BACKUP_DIR/docker-compose.yml.backup.$DEPLOY_TIMESTAMP; fi" "备份 Docker Compose 文件"
    
    # 备份现有的 .env 文件 (如果存在)
    remote_exec "if [ -f $DOCKER_COMPOSE_TARGET_DIR/.env ]; then cp $DOCKER_COMPOSE_TARGET_DIR/.env $DOCKER_BACKUP_DIR/.env.backup.$DEPLOY_TIMESTAMP; fi" "备份环境变量文件"
    
    log_success "配置备份完成"
}

# 部署配置文件
deploy_config_file() {
    log "部署 Docker Compose 配置文件到 $SERVER_NAME..."
    
    # 上传 Docker Compose 文件
    upload_file "$COMPOSE_SOURCE_FILE" "$DOCKER_COMPOSE_TARGET_FILE" "上传 Docker Compose 配置文件"
    
    # 设置文件权限
    remote_exec "sudo chown ubuntu:ubuntu $DOCKER_COMPOSE_TARGET_FILE" "设置 Docker Compose 文件权限"
    remote_exec "sudo chmod 644 $DOCKER_COMPOSE_TARGET_FILE"
    
    log_success "Docker Compose 配置文件部署完成"
}

# 验证配置文件
verify_config_file() {
    if [ "$VERIFY_DEPLOYMENT" != "true" ]; then
        log_warning "跳过配置验证 (VERIFY_DEPLOYMENT=false)"
        return 0
    fi
    
    log "验证 Docker Compose 配置文件..."
    
    # 检查文件存在
    if ! remote_exec "test -f $DOCKER_COMPOSE_TARGET_FILE" "检查配置文件存在"; then
        log_error "Docker Compose 配置文件不存在"
        return 1
    fi
    
    # 验证配置语法 (尝试新版本和旧版本命令)
    if remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && (sudo docker compose config >/dev/null 2>&1 || sudo docker-compose config >/dev/null 2>&1)" "验证 Docker Compose 配置语法"; then
        log_success "Docker Compose 配置语法正确"
    else
        log_warning "Docker Compose 配置语法验证失败"
    fi

    # 显示配置信息 (尝试新版本和旧版本命令)
    if ! remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose config --services 2>/dev/null" "显示配置的服务列表"; then
        remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker-compose config --services 2>/dev/null" "显示配置的服务列表 (fallback)"
    fi
    
    log_success "配置文件验证完成"
}

# 重启 Docker Compose 服务 (可选)
restart_services() {
    if [ "$RESTART_SERVICES" != "true" ]; then
        log_warning "跳过服务重启 (RESTART_SERVICES=false)"
        return 0
    fi
    
    log "重启 Docker Compose 服务..."
    
    # 检查是否有运行的服务 (尝试新版本和旧版本命令)
    if remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && (sudo docker compose ps -q 2>/dev/null || sudo docker-compose ps -q 2>/dev/null) | grep -q ." "检查运行中的服务"; then
        log "发现运行中的服务，执行重启..."

        # 重启服务 (尝试新版本和旧版本命令)
        if ! remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose down" "停止现有服务"; then
            remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker-compose down" "停止现有服务 (fallback)"
        fi
        sleep 5
        if ! remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose up -d" "启动服务"; then
            remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker-compose up -d" "启动服务 (fallback)"
        fi

        log_success "Docker Compose 服务重启完成"
    else
        log "没有运行中的服务，跳过重启"
    fi
}

# 显示服务状态
show_services_status() {
    log "显示 Docker Compose 服务状态..."

    # 显示服务状态 (尝试新版本和旧版本命令)
    if ! remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose ps 2>/dev/null" "显示服务状态"; then
        remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker-compose ps 2>/dev/null" "显示服务状态 (fallback)"
    fi

    # 显示网络信息 (尝试新版本和旧版本命令)
    if ! remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose config --networks 2>/dev/null" "显示网络配置"; then
        remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker-compose config --networks 2>/dev/null" "显示网络配置 (fallback)"
    fi

    # 显示卷信息 (尝试新版本和旧版本命令)
    if ! remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose config --volumes 2>/dev/null" "显示卷配置"; then
        remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker-compose config --volumes 2>/dev/null" "显示卷配置 (fallback)"
    fi
}

# 主函数
main() {
    log "=== 开始部署 Docker Compose 配置 ==="
    
    # 获取服务器信息
    get_server_info
    
    log "目标服务器: $SERVER_NAME ($SERVER_HOST)"
    log "配置文件: $(basename "$COMPOSE_SOURCE_FILE")"
    
    # 检查本地配置文件
    if ! check_local_config; then
        exit 1
    fi
    
    # 执行部署步骤
    create_server_directories
    
    if [ "$BACKUP_ENABLED" = "true" ]; then
        backup_existing_config
    fi
    
    deploy_config_file
    verify_config_file
    
    # 可选：重启服务
    if [ "$DEPLOY_FORCE" = "true" ]; then
        restart_services
    else
        log_warning "使用 --force 选项可以自动重启服务"
    fi
    
    show_services_status
    
    log_success "=== Docker Compose 配置部署完成 ==="
    log "提示: 使用 'docker compose up -d' 或 'docker-compose up -d' 启动服务"
    log "提示: 使用 'docker compose down' 或 'docker-compose down' 停止服务"
}

# 执行主函数
main "$@"
