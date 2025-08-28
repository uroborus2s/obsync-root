#!/bin/bash
# 后端应用部署模块 (API Gateway + ICA Sync)

set -e

# 加载配置
source "$SCRIPT_DIR/config/servers.conf"
source "$SCRIPT_DIR/config/deploy.conf"

# 日志函数
log() { echo -e "\033[0;36m[BACKEND-APPS]\033[0m $1"; }
log_success() { echo -e "\033[0;32m✅ [BACKEND-APPS]\033[0m $1"; }
log_error() { echo -e "\033[0;31m❌ [BACKEND-APPS]\033[0m $1"; }
log_warning() { echo -e "\033[1;33m⚠️  [BACKEND-APPS]\033[0m $1"; }

# 应用配置函数
get_app_config() {
    local app_name="$1"
    case "$app_name" in
        "api-gateway")
            echo "$API_GATEWAY_SOURCE_DIR:$API_GATEWAY_BUILD_SCRIPT:$API_GATEWAY_DOCKER_COMPOSE:$API_GATEWAY_PROJECT_NAME:$API_GATEWAY_DATA_DIR:$API_GATEWAY_COMPOSE_FILE"
            ;;
        "icasync")
            echo "$ICASYNC_SOURCE_DIR:$ICASYNC_BUILD_SCRIPT:$ICASYNC_DOCKER_COMPOSE:$ICASYNC_PROJECT_NAME:$ICASYNC_DATA_DIR:$ICASYNC_COMPOSE_FILE"
            ;;
        *)
            echo ""
            ;;
    esac
}

# 应用列表
APPS_LIST="api-gateway icasync"

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
            SERVER_NAME="$BACKUP_SERVER_NAME"
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

# 上传文件
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
    
    if scp $SSH_OPTIONS "$local_file" "$SERVER_HOST:$remote_path"; then
        log_success "文件上传成功: $(basename "$local_file")"
        return 0
    else
        log_error "文件上传失败: $local_file"
        return 1
    fi
}

# 解析应用配置
parse_app_config() {
    local app_name="$1"
    local config=$(get_app_config "$app_name")

    if [ -z "$config" ]; then
        log_error "未知的应用: $app_name"
        return 1
    fi

    IFS=':' read -r SOURCE_DIR BUILD_SCRIPT DOCKER_COMPOSE PROJECT_NAME DATA_DIR COMPOSE_FILE <<< "$config"
}

# 检查应用环境
check_app_environment() {
    local app_name="$1"
    
    parse_app_config "$app_name"
    
    log "检查 $app_name 应用环境..."
    
    # 检查源码目录
    if [ ! -d "$SOURCE_DIR" ]; then
        log_error "$app_name 源码目录不存在: $SOURCE_DIR"
        return 1
    fi
    
    # 检查构建脚本
    if [ ! -f "$BUILD_SCRIPT" ]; then
        log_error "$app_name 构建脚本不存在: $BUILD_SCRIPT"
        return 1
    fi
    
    # 检查 Docker Compose 文件
    if [ ! -f "$DOCKER_COMPOSE" ]; then
        log_error "$app_name Docker Compose 文件不存在: $DOCKER_COMPOSE"
        return 1
    fi
    
    log_success "$app_name 应用环境检查通过"
    return 0
}

# 构建和推送应用镜像
build_and_push_app() {
    local app_name="$1"

    parse_app_config "$app_name"

    log "构建和推送 $app_name 应用镜像..."

    # 切换到项目目录
    cd "$SOURCE_DIR"

    if [ "$DEPLOY_DRY_RUN" = "true" ]; then
        # 预览模式：生成预览版本标签
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local preview_version="preview_${timestamp}"
        log "[DRY-RUN] 构建 $app_name Docker 镜像"
        log "[DRY-RUN] 执行构建脚本: bash $BUILD_SCRIPT $PROJECT_NAME --dry-run"
        echo "$preview_version" > "/tmp/${app_name}_version_tag"
        return 0
    fi

    # 执行简化的构建脚本（自动从 package.json 读取版本）
    log "执行 $app_name 构建脚本: $BUILD_SCRIPT"
    log "构建参数: $PROJECT_NAME"

    if bash "$BUILD_SCRIPT" "$PROJECT_NAME"; then
        log_success "$app_name Docker 镜像构建和推送完成"

        # 从构建脚本生成的版本文件读取实际版本
        if [ -f "$SOURCE_DIR/.last_version" ]; then
            local actual_version=$(cat "$SOURCE_DIR/.last_version")
            echo "$actual_version" > "/tmp/${app_name}_version_tag"
            log "构建版本: $actual_version"
        else
            log_error "未找到版本信息文件 .last_version"
            return 1
        fi

        return 0
    else
        log_error "$app_name Docker 镜像构建失败"
        return 1
    fi
}

# 创建应用目录
create_app_directories() {
    local app_name="$1"
    
    parse_app_config "$app_name"
    
    log "创建 $app_name 应用目录..."
    
    # 创建应用数据目录
    remote_exec "mkdir -p $DATA_DIR" "创建 $app_name 数据目录"
    
    # 创建备份目录
    remote_exec "mkdir -p $BACKEND_APPS_BACKUP_DIR/$app_name" "创建 $app_name 备份目录"
    
    log_success "$app_name 应用目录创建完成"
}

# 备份应用配置
backup_app_config() {
    local app_name="$1"
    
    if [ "$BACKUP_ENABLED" != "true" ]; then
        log_warning "跳过 $app_name 备份 (BACKUP_ENABLED=false)"
        return 0
    fi
    
    parse_app_config "$app_name"
    
    log "备份 $app_name 应用配置..."
    
    # 备份 Docker Compose 文件
    remote_exec "if [ -f $COMPOSE_FILE ]; then cp $COMPOSE_FILE $BACKEND_APPS_BACKUP_DIR/$app_name/docker-compose.yml.backup.$DEPLOY_TIMESTAMP; fi" "备份 $app_name Docker Compose 文件"
    
    log_success "$app_name 配置备份完成"
}

# 部署应用配置
deploy_app_config() {
    local app_name="$1"
    
    parse_app_config "$app_name"
    
    log "部署 $app_name 应用配置到 $SERVER_NAME..."
    
    # 上传 Docker Compose 文件
    upload_file "$DOCKER_COMPOSE" "$COMPOSE_FILE" "上传 $app_name Docker Compose 文件"
    
    # 设置文件权限
    remote_exec "sudo chown ubuntu:ubuntu $COMPOSE_FILE" "设置 $app_name Docker Compose 文件权限"
    remote_exec "sudo chmod 644 $COMPOSE_FILE"
    
    log_success "$app_name Docker Compose 文件部署完成"
}

# 停止应用服务
stop_app_services() {
    local app_name="$1"
    
    parse_app_config "$app_name"
    
    log "停止 $app_name 应用服务..."
    
    # 检查是否有运行的容器
    if remote_exec "cd $DATA_DIR && (sudo docker compose ps -q 2>/dev/null || sudo docker-compose ps -q 2>/dev/null) | grep -q ." "检查 $app_name 运行中的容器"; then
        # 停止服务
        if ! remote_exec "cd $DATA_DIR && sudo docker compose down" "停止 $app_name 现有服务"; then
            remote_exec "cd $DATA_DIR && sudo docker-compose down" "停止 $app_name 现有服务 (fallback)"
        fi
        log_success "$app_name 现有服务已停止"
    else
        log "$app_name 没有运行中的服务"
    fi
}

# 拉取应用镜像
pull_app_image() {
    local app_name="$1"

    parse_app_config "$app_name"

    log "拉取 $app_name Docker 镜像..."

    # 读取版本标签
    local version_tag
    if [ -f "/tmp/${app_name}_version_tag" ]; then
        version_tag=$(cat "/tmp/${app_name}_version_tag")
        log "使用构建版本: $version_tag"
    else
        # 尝试从项目目录读取最后构建的版本
        if [ -f "$SOURCE_DIR/.last_version" ]; then
            version_tag=$(cat "$SOURCE_DIR/.last_version")
            log "使用最后构建的版本: $version_tag"
        else
            log_error "未找到版本信息，无法确定要拉取的镜像版本"
            log_error "请确保构建脚本已成功执行并生成了版本信息"
            return 1
        fi
    fi

    local full_image_name="$DOCKER_REGISTRY/$DOCKER_NAMESPACE/$PROJECT_NAME:$version_tag"

    # 登录 Docker 仓库
    remote_exec "echo '$DOCKER_PASSWORD' | sudo docker login -u '$DOCKER_USERNAME' --password-stdin '$DOCKER_REGISTRY'" "登录 Docker 仓库"

    # 拉取具体版本的镜像
    if remote_exec "sudo docker pull $full_image_name" "拉取 $app_name Docker 镜像: $full_image_name"; then
        log_success "成功拉取版本镜像: $version_tag"
    else
        log_warning "拉取版本镜像失败，尝试拉取 latest 标签作为备选"
        local latest_image_name="$DOCKER_REGISTRY/$DOCKER_NAMESPACE/$PROJECT_NAME:latest"
        if remote_exec "sudo docker pull $latest_image_name" "拉取 $app_name Docker 镜像: $latest_image_name"; then
            full_image_name="$latest_image_name"
            version_tag="latest"
            log_warning "使用 latest 标签作为备选方案"
        else
            log_error "拉取镜像失败，无法继续部署"
            return 1
        fi
    fi

    # 更新 Docker Compose 文件中的镜像标签为具体版本
    remote_exec "sudo sed -i 's|image: .*${PROJECT_NAME}.*|image: $full_image_name|g' $COMPOSE_FILE" "更新 $app_name 镜像标签"

    # 保存当前部署的版本信息到服务器
    remote_exec "echo '$version_tag' > /opt/obsync/docker/.${app_name}_deployed_version" "保存部署版本信息"

    log_success "$app_name Docker 镜像拉取完成"
    log "当前部署版本: $version_tag"
    log "镜像地址: $full_image_name"
}

# 启动应用服务
start_app_services() {
    local app_name="$1"
    
    parse_app_config "$app_name"
    
    log "启动 $app_name 应用服务..."
    
    # 启动服务
    if ! remote_exec "cd $DATA_DIR && sudo docker compose up -d" "启动 $app_name 服务"; then
        remote_exec "cd $DATA_DIR && sudo docker-compose up -d" "启动 $app_name 服务 (fallback)"
    fi
    
    # 等待服务启动
    log "等待 $app_name 服务启动..."
    sleep 15
    
    log_success "$app_name 服务启动完成"
}

# 验证应用部署
verify_app_deployment() {
    local app_name="$1"
    
    if [ "$VERIFY_DEPLOYMENT" != "true" ]; then
        log_warning "跳过 $app_name 部署验证 (VERIFY_DEPLOYMENT=false)"
        return 0
    fi
    
    parse_app_config "$app_name"
    
    log "验证 $app_name 应用服务状态..."
    
    # 检查容器状态
    if remote_exec "cd $DATA_DIR && (sudo docker compose ps 2>/dev/null || sudo docker-compose ps 2>/dev/null) | grep -q 'Up'" "检查 $app_name 容器运行状态"; then
        log_success "$app_name 容器运行正常"
    else
        log_error "$app_name 容器未正常运行"
        return 1
    fi
    
    # 检查服务健康状态
    local health_check_port
    case "$app_name" in
        "api-gateway")
            health_check_port="8090"
            ;;
        "icasync")
            health_check_port="3001"
            ;;
    esac
    
    if [ -n "$health_check_port" ]; then
        local health_check_url="http://localhost:$health_check_port/health"
        if remote_exec "curl -s -f $health_check_url >/dev/null" "检查 $app_name 服务健康状态"; then
            log_success "$app_name 服务健康检查通过"
        else
            log_warning "$app_name 服务健康检查失败"
        fi
    fi
    
    # 显示服务状态
    if ! remote_exec "cd $DATA_DIR && sudo docker compose ps" "显示 $app_name 服务状态"; then
        remote_exec "cd $DATA_DIR && sudo docker-compose ps" "显示 $app_name 服务状态 (fallback)"
    fi
    
    log_success "$app_name 部署验证完成"
}

# 部署单个应用
deploy_single_app() {
    local app_name="$1"
    
    log "=== 开始部署 $app_name 应用 ==="
    
    # 检查应用环境
    if ! check_app_environment "$app_name"; then
        return 1
    fi
    
    # 本地构建阶段
    if [ "$DEPLOY_DRY_RUN" != "true" ]; then
        build_and_push_app "$app_name"
    else
        # 预览模式也需要生成版本标签
        echo "preview_$(date +%Y%m%d_%H%M%S)" > "/tmp/${app_name}_version_tag"
    fi
    
    # 服务器部署阶段
    create_app_directories "$app_name"
    
    if [ "$BACKUP_ENABLED" = "true" ]; then
        backup_app_config "$app_name"
    fi
    
    deploy_app_config "$app_name"
    stop_app_services "$app_name"
    pull_app_image "$app_name"
    start_app_services "$app_name"
    verify_app_deployment "$app_name"
    
    log_success "=== $app_name 应用部署完成 ==="
}

# 清理临时文件
cleanup() {
    for app in $APPS_LIST; do
        if [ -f "/tmp/${app}_version_tag" ]; then
            rm -f "/tmp/${app}_version_tag"
        fi
    done
}

# 主函数
main() {
    log "=== 开始部署后端应用 ==="
    
    # 获取服务器信息
    get_server_info
    
    log "目标服务器: $SERVER_NAME ($SERVER_HOST)"
    
    # 检查 Docker
    if [ "$DEPLOY_DRY_RUN" != "true" ]; then
        if ! command -v docker >/dev/null 2>&1; then
            log_error "Docker 未安装"
            exit 1
        fi
        
        if ! docker info >/dev/null 2>&1; then
            log_error "Docker 服务未运行"
            exit 1
        fi
    fi
    
    # 部署所有应用
    local deployment_failed=false

    for app_name in $APPS_LIST; do
        if ! deploy_single_app "$app_name"; then
            deployment_failed=true
            if [ "$DEPLOY_FORCE" != "true" ]; then
                break
            fi
        fi
    done
    
    # 清理临时文件
    cleanup
    
    if [ "$deployment_failed" = "true" ]; then
        log_error "=== 后端应用部署完成，但有错误发生 ==="
        exit 1
    else
        log_success "=== 后端应用部署成功完成 ==="
    fi
}

# 执行主函数
main "$@"
