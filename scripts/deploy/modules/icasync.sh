#!/bin/bash
# ICA Sync 应用部署模块

set -e

# 加载配置
source "$SCRIPT_DIR/config/servers.conf"
source "$SCRIPT_DIR/config/deploy.conf"

# 日志函数
log() { echo -e "\033[0;36m[ICASYNC]\033[0m $1"; }
log_success() { echo -e "\033[0;32m✅ [ICASYNC]\033[0m $1"; }
log_error() { echo -e "\033[0;31m❌ [ICASYNC]\033[0m $1"; }
log_warning() { echo -e "\033[1;33m⚠️  [ICASYNC]\033[0m $1"; }

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

# 检查本地环境
check_local_environment() {
    log "检查 ICA Sync 本地环境..."
    
    # 检查源码目录
    if [ ! -d "$ICASYNC_SOURCE_DIR" ]; then
        log_error "ICA Sync 源码目录不存在: $ICASYNC_SOURCE_DIR"
        return 1
    fi
    
    # 检查构建脚本
    if [ ! -f "$ICASYNC_BUILD_SCRIPT" ]; then
        log_error "构建脚本不存在: $ICASYNC_BUILD_SCRIPT"
        return 1
    fi
    
    # 检查 Docker
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker 未安装"
        return 1
    fi
    
    # 检查 Docker 服务
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker 服务未运行"
        return 1
    fi
    
    log_success "ICA Sync 本地环境检查通过"
    return 0
}

# 本地构建阶段
build_and_push_image() {
    log "开始构建和推送 ICA Sync Docker 镜像..."

    # 切换到项目目录
    cd "$ICASYNC_SOURCE_DIR"

    if [ "$DEPLOY_DRY_RUN" = "true" ]; then
        # 预览模式：生成预览版本标签
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local preview_version="preview_${timestamp}"
        log "[DRY-RUN] 构建 ICA Sync Docker 镜像"
        log "[DRY-RUN] 执行构建脚本: bash $ICASYNC_BUILD_SCRIPT $ICASYNC_PROJECT_NAME --dry-run"
        echo "$preview_version" > /tmp/icasync_version_tag
        return 0
    fi

    # 执行简化的构建脚本（自动从 package.json 读取版本）
    log "执行 ICA Sync 构建脚本: $ICASYNC_BUILD_SCRIPT"
    log "构建参数: $ICASYNC_PROJECT_NAME"

    if bash "$ICASYNC_BUILD_SCRIPT" "$ICASYNC_PROJECT_NAME"; then
        log_success "ICA Sync Docker 镜像构建和推送完成"

        # 从构建脚本生成的版本文件读取实际版本
        if [ -f "$ICASYNC_SOURCE_DIR/.last_version" ]; then
            local actual_version=$(cat "$ICASYNC_SOURCE_DIR/.last_version")
            echo "$actual_version" > /tmp/icasync_version_tag
            log "构建版本: $actual_version"
        else
            log_error "未找到版本信息文件 .last_version"
            return 1
        fi

        return 0
    else
        log_error "ICA Sync Docker 镜像构建失败"
        return 1
    fi
}

# 检查 Docker Compose 配置
check_docker_compose_config() {
    log "检查服务器 Docker Compose 配置..."
    
    # 检查 Docker Compose 文件是否存在
    if ! remote_exec "test -f $DOCKER_COMPOSE_TARGET_FILE" "检查 Docker Compose 文件"; then
        log_error "服务器上不存在 Docker Compose 配置文件: $DOCKER_COMPOSE_TARGET_FILE"
        log_error "请先运行: ./deploy.sh docker-compose"
        return 1
    fi
    
    # 检查 ICA Sync 服务是否在配置中
    if ! remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose config --services | grep -q 'app-icasync'" "检查 ICA Sync 服务配置"; then
        log_error "Docker Compose 配置中未找到 ICA Sync 服务"
        return 1
    fi
    
    log_success "Docker Compose 配置检查通过"
    return 0
}

# 停止 ICA Sync 服务
stop_icasync_services() {
    log "停止 ICA Sync 服务..."
    
    # 停止 ICA Sync 相关容器
    for container_name in $ICASYNC_CONTAINER_NAMES; do
        if remote_exec "sudo docker ps -q -f name=$container_name | grep -q ." "检查容器 $container_name"; then
            remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose stop $container_name" "停止容器 $container_name"
        else
            log "容器 $container_name 未运行"
        fi
    done
    
    log_success "ICA Sync 服务已停止"
}

# 拉取 ICA Sync 镜像
pull_latest_image() {
    log "拉取 ICA Sync Docker 镜像..."

    # 读取版本标签
    local version_tag
    if [ -f "/tmp/icasync_version_tag" ]; then
        version_tag=$(cat /tmp/icasync_version_tag)
        log "使用构建版本: $version_tag"
    else
        # 尝试从项目目录读取最后构建的版本
        if [ -f "$ICASYNC_SOURCE_DIR/.last_version" ]; then
            version_tag=$(cat "$ICASYNC_SOURCE_DIR/.last_version")
            log "使用最后构建的版本: $version_tag"
        else
            log_error "未找到版本信息，无法确定要拉取的镜像版本"
            log_error "请确保构建脚本已成功执行并生成了版本信息"
            return 1
        fi
    fi

    local full_image_name="$DOCKER_REGISTRY/$DOCKER_NAMESPACE/$ICASYNC_PROJECT_NAME:$version_tag"

    # 登录 Docker 仓库
    remote_exec "echo '$DOCKER_PASSWORD' | docker login -u '$DOCKER_USERNAME' --password-stdin '$DOCKER_REGISTRY'" "登录 Docker 仓库"

    # 拉取具体版本的镜像
    if remote_exec "docker pull $full_image_name" "拉取 ICA Sync Docker 镜像: $full_image_name"; then
        log_success "成功拉取版本镜像: $version_tag"
    else
        log_warning "拉取版本镜像失败，尝试拉取 latest 标签作为备选"
        local latest_image_name="$DOCKER_REGISTRY/$DOCKER_NAMESPACE/$ICASYNC_PROJECT_NAME:latest"
        if remote_exec "docker pull $latest_image_name" "拉取 ICA Sync Docker 镜像: $latest_image_name"; then
            full_image_name="$latest_image_name"
            version_tag="latest"
            log_warning "使用 latest 标签作为备选方案"
        else
            log_error "拉取镜像失败，无法继续部署"
            return 1
        fi
    fi

    # 更新 Docker Compose 文件中的镜像标签为具体版本
    remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sed -i 's|image: .*$ICASYNC_PROJECT_NAME.*|image: $full_image_name|g' $DOCKER_COMPOSE_TARGET_FILE" "更新 ICA Sync 镜像标签"

    # 保存当前部署的版本信息到服务器
    remote_exec "echo '$version_tag' > /opt/obsync/docker/.icasync_deployed_version" "保存部署版本信息"

    log_success "ICA Sync Docker 镜像拉取完成"
    log "当前部署版本: $version_tag"
    log "镜像地址: $full_image_name"
}

# 启动 ICA Sync 服务
start_icasync_services() {
    log "启动 ICA Sync 服务..."
    
    # 启动依赖服务 (MySQL, Redis)
    remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose up -d mysql-icasync redis-icasync" "启动 ICA Sync 依赖服务"
    
    # 等待依赖服务启动
    log "等待依赖服务启动..."
    sleep 10
    
    # 启动 ICA Sync 应用
    for container_name in $ICASYNC_CONTAINER_NAMES; do
        remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose up -d $container_name" "启动容器 $container_name"
    done
    
    # 等待服务启动
    log "等待 ICA Sync 服务启动..."
    sleep 15
    
    log_success "ICA Sync 服务启动完成"
}

# 验证 ICA Sync 部署
verify_deployment() {
    if [ "$VERIFY_DEPLOYMENT" != "true" ]; then
        log_warning "跳过部署验证 (VERIFY_DEPLOYMENT=false)"
        return 0
    fi
    
    log "验证 ICA Sync 服务状态..."
    
    # 检查容器状态
    local all_running=true
    for container_name in $ICASYNC_CONTAINER_NAMES; do
        if remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose ps $container_name | grep -q 'Up'" "检查容器 $container_name 状态"; then
            log_success "容器 $container_name 运行正常"
        else
            log_error "容器 $container_name 未正常运行"
            all_running=false
        fi
    done
    
    # 检查依赖服务状态
    local dependency_services="mysql-icasync redis-icasync"
    for service in $dependency_services; do
        if remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose ps $service | grep -q 'Up'" "检查依赖服务 $service"; then
            log_success "依赖服务 $service 运行正常"
        else
            log_warning "依赖服务 $service 可能未正常运行"
        fi
    done
    
    if [ "$all_running" = "false" ]; then
        return 1
    fi
    
    # 检查服务健康状态
    local health_check_url="http://localhost:3001/health"
    if remote_exec "curl -s -f $health_check_url >/dev/null" "检查 ICA Sync 健康状态"; then
        log_success "ICA Sync 健康检查通过"
    else
        log_warning "ICA Sync 健康检查失败"
    fi
    
    # 显示服务状态
    remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose ps" "显示所有服务状态"
    
    log_success "ICA Sync 部署验证完成"
}

# 清理临时文件
cleanup() {
    if [ -f "/tmp/icasync_version_tag" ]; then
        rm -f /tmp/icasync_version_tag
    fi
}

# 主函数
main() {
    log "=== 开始部署 ICA Sync 应用 ==="
    
    # 获取服务器信息
    get_server_info
    
    log "目标服务器: $SERVER_NAME ($SERVER_HOST)"
    log "源码目录: $ICASYNC_SOURCE_DIR"
    log "项目名称: $ICASYNC_PROJECT_NAME"
    
    # 检查本地环境
    if ! check_local_environment; then
        exit 1
    fi
    
    # 检查服务器 Docker Compose 配置
    if ! check_docker_compose_config; then
        exit 1
    fi
    
    # 执行部署步骤
    if [ "$DEPLOY_DRY_RUN" != "true" ]; then
        # 本地构建阶段
        build_and_push_image
    else
        # 预览模式也需要生成版本标签
        echo "preview_$(date +%Y%m%d_%H%M%S)" > /tmp/icasync_version_tag
    fi
    
    # 服务器部署阶段
    stop_icasync_services
    pull_latest_image
    start_icasync_services
    verify_deployment
    
    # 清理
    cleanup
    
    log_success "=== ICA Sync 应用部署完成 ==="
    log "提示: ICA Sync 服务已更新，其他服务保持不变"
}

# 执行主函数
main "$@"
