#!/bin/bash
# API Gateway 应用部署模块

set -e

# 加载配置
source "$SCRIPT_DIR/config/servers.conf"
source "$SCRIPT_DIR/config/deploy.conf"

# 日志函数
log() { echo -e "\033[0;35m[API-GATEWAY]\033[0m $1"; }
log_success() { echo -e "\033[0;32m✅ [API-GATEWAY]\033[0m $1"; }
log_error() { echo -e "\033[0;31m❌ [API-GATEWAY]\033[0m $1"; }
log_warning() { echo -e "\033[1;33m⚠️  [API-GATEWAY]\033[0m $1"; }

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
    log "检查 API Gateway 本地环境..."

    # 检查源码目录
    if [ ! -d "$API_GATEWAY_SOURCE_DIR" ]; then
        log_error "API Gateway 源码目录不存在: $API_GATEWAY_SOURCE_DIR"
        return 1
    fi

    # 检查构建脚本
    if [ ! -f "$API_GATEWAY_BUILD_SCRIPT" ]; then
        log_error "构建脚本不存在: $API_GATEWAY_BUILD_SCRIPT"
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

    log_success "API Gateway 本地环境检查通过"
    return 0
}

# 本地构建阶段
build_and_push_image() {
    log "开始构建和推送 API Gateway Docker 镜像..."

    # 切换到项目目录
    cd "$API_GATEWAY_SOURCE_DIR"

    if [ "$DEPLOY_DRY_RUN" = "true" ]; then
        # 预览模式：生成预览版本标签
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local preview_version="preview_${timestamp}"
        log "[DRY-RUN] 构建 API Gateway Docker 镜像"
        log "[DRY-RUN] 执行构建脚本: bash $API_GATEWAY_BUILD_SCRIPT $API_GATEWAY_PROJECT_NAME --dry-run"
        echo "$preview_version" > /tmp/api_gateway_version_tag
        return 0
    fi

    # 执行简化的构建脚本（自动从 package.json 读取版本）
    log "执行 API Gateway 构建脚本: $API_GATEWAY_BUILD_SCRIPT"
    log "构建参数: $API_GATEWAY_PROJECT_NAME"

    if bash "$API_GATEWAY_BUILD_SCRIPT" "$API_GATEWAY_PROJECT_NAME"; then
        log_success "API Gateway Docker 镜像构建和推送完成"

        # 从构建脚本生成的版本文件读取实际版本
        if [ -f "$API_GATEWAY_SOURCE_DIR/.last_version" ]; then
            local actual_version=$(cat "$API_GATEWAY_SOURCE_DIR/.last_version")
            echo "$actual_version" > /tmp/api_gateway_version_tag
            log "构建版本: $actual_version"
        else
            log_error "未找到版本信息文件 .last_version"
            return 1
        fi

        return 0
    else
        log_error "API Gateway Docker 镜像构建失败"
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

    # 检查 API Gateway 服务是否在配置中
    if ! remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && (sudo docker compose config --services 2>/dev/null || sudo docker compose config --services 2>/dev/null) | grep -q 'api-gateway'" "检查 API Gateway 服务配置"; then
        log_error "Docker Compose 配置中未找到 API Gateway 服务"
        return 1
    fi

    log_success "Docker Compose 配置检查通过"
    return 0
}

# 停止 API Gateway 服务
stop_api_gateway_services() {
    log "停止 API Gateway 服务..."

    # 停止 API Gateway 相关容器
    for container_name in $API_GATEWAY_CONTAINER_NAMES; do
        if remote_exec "sudo docker ps -q -f name=$container_name | grep -q ." "检查容器 $container_name"; then
            remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose stop $container_name" "停止容器 $container_name"
        else
            log "容器 $container_name 未运行"
        fi
    done

    log_success "API Gateway 服务已停止"
}

# 拉取最新镜像
pull_latest_image() {
    log "拉取 API Gateway Docker 镜像..."

    # 读取版本标签
    local version_tag
    if [ -f "/tmp/api_gateway_version_tag" ]; then
        version_tag=$(cat /tmp/api_gateway_version_tag)
        log "使用构建版本: $version_tag"
    else
        # 尝试从项目目录读取最后构建的版本
        if [ -f "$API_GATEWAY_SOURCE_DIR/.last_version" ]; then
            version_tag=$(cat "$API_GATEWAY_SOURCE_DIR/.last_version")
            log "使用最后构建的版本: $version_tag"
        else
            log_error "未找到版本信息，无法确定要拉取的镜像版本"
            log_error "请确保构建脚本已成功执行并生成了版本信息"
            return 1
        fi
    fi

    local full_image_name="$DOCKER_REGISTRY/$DOCKER_NAMESPACE/$API_GATEWAY_PROJECT_NAME:$version_tag"

    # 登录 Docker 仓库
    remote_exec "echo '$DOCKER_PASSWORD' | sudo docker login -u '$DOCKER_USERNAME' --password-stdin '$DOCKER_REGISTRY'" "登录 Docker 仓库"

    # 拉取具体版本的镜像
    if remote_exec "sudo docker pull $full_image_name" "拉取 API Gateway Docker 镜像: $full_image_name"; then
        log_success "成功拉取版本镜像: $version_tag"
    else
        log_warning "拉取版本镜像失败，尝试拉取 latest 标签作为备选"
        local latest_image_name="$DOCKER_REGISTRY/$DOCKER_NAMESPACE/$API_GATEWAY_PROJECT_NAME:latest"
        if remote_exec "sudo docker pull $latest_image_name" "拉取 API Gateway Docker 镜像: $latest_image_name"; then
            full_image_name="$latest_image_name"
            version_tag="latest"
            log_warning "使用 latest 标签作为备选方案"
        else
            log_error "拉取镜像失败，无法继续部署"
            return 1
        fi
    fi

    # 更新 Docker Compose 文件中的镜像标签为具体版本
    remote_exec "sudo sed -i 's|image: .*$API_GATEWAY_PROJECT_NAME.*|image: $full_image_name|g' $DOCKER_COMPOSE_TARGET_FILE" "更新 API Gateway 镜像标签"

    # 保存当前部署的版本信息到服务器
    remote_exec "echo '$version_tag' > /opt/obsync/docker/.api_gateway_deployed_version" "保存部署版本信息"

    log_success "API Gateway Docker 镜像拉取完成"
    log "当前部署版本: $version_tag"
    log "镜像地址: $full_image_name"
}

# 处理 Docker 网络冲突
handle_network_conflicts() {
    log "检查并处理 Docker 网络冲突..."

    # 检查是否存在网络冲突
    if remote_exec "sudo docker network ls | grep -q docker_obsync-network" "检查网络是否存在"; then
        log_warning "发现现有的 docker_obsync-network 网络"

        # 尝试删除冲突的网络
        if remote_exec "sudo docker network rm docker_obsync-network" "删除冲突的网络"; then
            log_success "成功删除冲突的网络"
        else
            log_warning "无法删除网络，可能有容器正在使用"
            # 尝试停止使用该网络的容器
            remote_exec "sudo docker ps -q --filter network=docker_obsync-network | xargs -r sudo docker stop" "停止使用冲突网络的容器"
            remote_exec "sudo docker network rm docker_obsync-network" "再次尝试删除网络"
        fi
    fi

    # 清理未使用的网络
    remote_exec "sudo docker network prune -f" "清理未使用的网络"
}

# 启动 API Gateway 服务
start_api_gateway_services() {
    log "启动 API Gateway 服务..."

    # 处理网络冲突
    handle_network_conflicts

    # 启动 API Gateway 相关容器
    for container_name in $API_GATEWAY_CONTAINER_NAMES; do
        if ! remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose up -d $container_name" "启动容器 $container_name"; then
            log_error "容器 $container_name 启动失败，尝试重新创建"
            # 强制重新创建容器
            remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose up -d --force-recreate $container_name" "强制重新创建容器 $container_name"
        fi
    done

    # 等待服务启动
    log "等待 API Gateway 服务启动..."
    sleep 15

    log_success "API Gateway 服务启动完成"
}

# 验证 API Gateway 部署
verify_deployment() {
    if [ "$VERIFY_DEPLOYMENT" != "true" ]; then
        log_warning "跳过部署验证 (VERIFY_DEPLOYMENT=false)"
        return 0
    fi

    log "验证 API Gateway 服务状态..."

    # 检查容器状态
    local all_running=true
    for container_name in $API_GATEWAY_CONTAINER_NAMES; do
        if remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose ps $container_name | grep -q 'Up'" "检查容器 $container_name 状态"; then
            log_success "容器 $container_name 运行正常"
        else
            log_error "容器 $container_name 未正常运行"
            all_running=false
        fi
    done

    if [ "$all_running" = "false" ]; then
        return 1
    fi

    # 检查服务健康状态
    local health_check_ports="8090 8091"
    for port in $health_check_ports; do
        # 首先检查端口是否在监听
        if remote_exec "ss -tlnp | grep -q ':$port '" "检查端口 $port 是否监听"; then
            log_success "端口 $port 正在监听"

            # 尝试健康检查
            local health_check_url="http://127.0.0.1:$port/health"
            if remote_exec "curl -s -f --connect-timeout 5 --max-time 10 $health_check_url >/dev/null" "检查端口 $port 健康状态"; then
                log_success "API Gateway 端口 $port 健康检查通过"
            else
                log_warning "API Gateway 端口 $port 健康检查失败，但端口正在监听"
                # 尝试基本连接测试
                if remote_exec "nc -z 127.0.0.1 $port" "测试端口 $port 连接"; then
                    log_info "端口 $port 可以连接，可能是健康检查端点问题"
                else
                    log_warning "端口 $port 无法连接"
                fi
            fi
        else
            log_error "端口 $port 未在监听"
        fi
    done

    # 显示服务状态
    remote_exec "cd $DOCKER_COMPOSE_TARGET_DIR && sudo docker compose ps" "显示所有服务状态"

    # 显示当前部署版本
    log "查询当前部署版本..."
    if remote_exec "test -f /opt/obsync/docker/.api_gateway_deployed_version" "检查版本文件"; then
        local deployed_version=$(remote_exec "cat /opt/obsync/docker/.api_gateway_deployed_version" "获取部署版本")
        log_success "当前部署版本: $deployed_version"

        # 显示镜像信息
        remote_exec "sudo docker images | grep '$API_GATEWAY_PROJECT_NAME' | head -3" "显示相关镜像"
    else
        log_warning "未找到版本信息文件"
    fi

    log_success "API Gateway 部署验证完成"
}

# 清理临时文件
cleanup() {
    if [ -f "/tmp/api_gateway_version_tag" ]; then
        rm -f /tmp/api_gateway_version_tag
    fi
}

# 主函数
main() {
    log "=== 开始部署 API Gateway 应用 ==="

    # 获取服务器信息
    get_server_info

    log "目标服务器: $SERVER_NAME ($SERVER_HOST)"
    log "源码目录: $API_GATEWAY_SOURCE_DIR"
    log "项目名称: $API_GATEWAY_PROJECT_NAME"

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
        echo "preview_$(date +%Y%m%d_%H%M%S)" > /tmp/api_gateway_version_tag
    fi

    # 服务器部署阶段
    stop_api_gateway_services
    pull_latest_image
    start_api_gateway_services
    verify_deployment

    # 清理
    cleanup

    log_success "=== API Gateway 应用部署完成 ==="
    log "提示: API Gateway 服务已更新，其他服务保持不变"
}

# 执行主函数
main "$@"
