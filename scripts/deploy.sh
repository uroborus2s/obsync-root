#!/bin/bash

# 模块化部署脚本 - 支持多种部署模式
# 功能：Nginx配置、SSL证书、Docker配置、镜像更新的独立部署
# 版本：v2.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 服务器配置
SERVER_1_HOST="jlufe_12.6"
SERVER_1_USER="ubuntu"
SERVER_2_HOST="jlufe_10.128"
SERVER_2_USER="ubutu"  # 注意：这里使用用户修改的值

# 部署模式标志
NGINX_ONLY=false
SSL_ONLY=false
DOCKER_ONLY=false
UPDATE_IMAGES=false
DRY_RUN=false
VERBOSE=false
TARGET_SERVER=""

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

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

log_debug() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

log_dry_run() {
    echo -e "${YELLOW}[DRY-RUN]${NC} $1"
}

# 执行SSH命令（支持dry-run）
execute_ssh() {
    local host=$1
    local user=$2
    local command=$3
    local description=${4:-"执行SSH命令"}

    log_debug "SSH: $user@$host - $description"

    if [ "$DRY_RUN" = true ]; then
        log_dry_run "SSH命令: $command"
        return 0
    fi

    if [ "$VERBOSE" = true ]; then
        ssh "$user@$host" "$command"
    else
        ssh "$user@$host" "$command" 2>/dev/null
    fi
}

# 执行SCP命令（支持dry-run）
execute_scp() {
    local source=$1
    local destination=$2
    local description=${3:-"上传文件"}

    log_debug "SCP: $source -> $destination"

    if [ "$DRY_RUN" = true ]; then
        log_dry_run "SCP命令: $source -> $destination"
        return 0
    fi

    if [ "$VERBOSE" = true ]; then
        scp -r "$source" "$destination"
    else
        scp -r "$source" "$destination" 2>/dev/null
    fi
}

# 检查必要文件
check_files() {
    log_info "检查部署文件..."

    local nginx_files=(
        "configs/nginx-production.conf"
        "configs/nginx-backup-server.conf"
    )

    local ssl_files=(
        "nginx/STAR_jlufe_edu_cn.pem"
        "nginx/STAR_jlufe_edu_cn.key"
    )

    local docker_files=(
        "docker-compose.yml"
    )

    # 根据部署模式检查不同文件
    if [ "$NGINX_ONLY" = true ]; then
        for file in "${nginx_files[@]}"; do
            if [ ! -f "$SCRIPT_DIR/$file" ]; then
                log_error "Nginx配置文件不存在: $file"
                exit 1
            fi
        done
    elif [ "$SSL_ONLY" = true ]; then
        for file in "${ssl_files[@]}"; do
            if [ ! -f "$SCRIPT_DIR/$file" ]; then
                log_error "SSL证书文件不存在: $file"
                exit 1
            fi
        done
    elif [ "$DOCKER_ONLY" = true ] || [ "$UPDATE_IMAGES" = true ]; then
        for file in "${docker_files[@]}"; do
            if [ ! -f "$SCRIPT_DIR/$file" ]; then
                log_error "Docker配置文件不存在: $file"
                exit 1
            fi
        done
    else
        # 完整部署模式检查所有文件
        for file in "${nginx_files[@]}" "${ssl_files[@]}" "${docker_files[@]}"; do
            if [ ! -f "$SCRIPT_DIR/$file" ]; then
                log_warning "文件不存在: $file"
            fi
        done
    fi

    log_success "文件检查完成"
}

# 仅更新Nginx配置
deploy_nginx_only() {
    local host=$1
    local user=$2
    local server_name=$3

    log_step "仅更新 $server_name Nginx配置..."

    # 确定配置文件
    local config_file
    if [ "$server_name" = "Server-1" ]; then
        config_file="$SCRIPT_DIR/deploy/nginx/server-1-nginx.conf"
    else
        config_file="$SCRIPT_DIR/deploy/nginx/server-2-nginx.conf"
    fi

    if [ ! -f "$config_file" ]; then
        log_error "Nginx配置文件不存在: $config_file"
        return 1
    fi

    # 上传配置文件
    execute_scp "$config_file" "$user@$host:/tmp/nginx.conf" "上传Nginx配置"

    # 在服务器上应用配置
    execute_ssh "$host" "$user" "
        # 备份当前配置
        sudo cp /etc/nginx/sites-available/kwps.jlufe.edu.cn /etc/nginx/sites-available/kwps.jlufe.edu.cn.backup.\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

        # 应用新配置
        sudo cp /tmp/nginx.conf /etc/nginx/sites-available/kwps.jlufe.edu.cn
        sudo ln -sf /etc/nginx/sites-available/kwps.jlufe.edu.cn /etc/nginx/sites-enabled/kwps.jlufe.edu.cn
        sudo rm -f /etc/nginx/sites-enabled/default

        # 测试配置语法
        if sudo nginx -t; then
            echo '✅ Nginx配置语法正确'
            # 重新加载配置（不重启）
            sudo systemctl reload nginx
            echo '✅ Nginx配置已重新加载'
        else
            echo '❌ Nginx配置语法错误，恢复备份'
            sudo cp /etc/nginx/sites-available/kwps.jlufe.edu.cn.backup.* /etc/nginx/sites-available/kwps.jlufe.edu.cn 2>/dev/null || true
            exit 1
        fi

        # 清理临时文件
        rm -f /tmp/nginx.conf
    " "应用Nginx配置"

    # 验证配置生效
    sleep 2
    if execute_ssh "$host" "$user" "curl -s -o /dev/null -w '%{http_code}' http://localhost/health" "验证Nginx状态" | grep -q "200"; then
        log_success "$server_name Nginx配置更新完成"
    else
        log_warning "$server_name Nginx配置可能未正确生效"
    fi
}

# 仅更新SSL证书
deploy_ssl_only() {
    local host=$1
    local user=$2
    local server_name=$3

    log_step "仅更新 $server_name SSL证书..."

    # 检查SSL证书文件
    local cert_file="$SCRIPT_DIR/nginx/STAR_jlufe_edu_cn.pem"
    local key_file="$SCRIPT_DIR/nginx/STAR_jlufe_edu_cn.key"

    if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
        log_error "SSL证书文件不存在"
        return 1
    fi

    # 上传证书文件
    execute_scp "$cert_file" "$user@$host:/tmp/ssl_cert.pem" "上传SSL证书"
    execute_scp "$key_file" "$user@$host:/tmp/ssl_key.key" "上传SSL私钥"

    # 在服务器上应用证书
    execute_ssh "$host" "$user" "
        # 创建SSL目录
        sudo mkdir -p /etc/nginx/ssl

        # 备份现有证书
        sudo cp /etc/nginx/ssl/STAR_jlufe_edu_cn.pem /etc/nginx/ssl/STAR_jlufe_edu_cn.pem.backup.\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
        sudo cp /etc/nginx/ssl/STAR_jlufe_edu_cn.key /etc/nginx/ssl/STAR_jlufe_edu_cn.key.backup.\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

        # 应用新证书
        sudo cp /tmp/ssl_cert.pem /etc/nginx/ssl/STAR_jlufe_edu_cn.pem
        sudo cp /tmp/ssl_key.key /etc/nginx/ssl/STAR_jlufe_edu_cn.key

        # 设置正确权限
        sudo chmod 644 /etc/nginx/ssl/STAR_jlufe_edu_cn.pem
        sudo chmod 600 /etc/nginx/ssl/STAR_jlufe_edu_cn.key
        sudo chown root:root /etc/nginx/ssl/STAR_jlufe_edu_cn.*

        # 验证证书有效性
        if openssl x509 -in /etc/nginx/ssl/STAR_jlufe_edu_cn.pem -text -noout > /dev/null; then
            echo '✅ SSL证书格式正确'
        else
            echo '❌ SSL证书格式错误'
            exit 1
        fi

        # 验证证书和私钥匹配
        CERT_HASH=\$(openssl x509 -noout -modulus -in /etc/nginx/ssl/STAR_jlufe_edu_cn.pem | openssl md5)
        KEY_HASH=\$(openssl rsa -noout -modulus -in /etc/nginx/ssl/STAR_jlufe_edu_cn.key | openssl md5)

        if [ \"\$CERT_HASH\" = \"\$KEY_HASH\" ]; then
            echo '✅ 证书和私钥匹配'
        else
            echo '❌ 证书和私钥不匹配'
            exit 1
        fi

        # 重新加载Nginx以应用新证书
        sudo systemctl reload nginx
        echo '✅ SSL证书已应用'

        # 清理临时文件
        rm -f /tmp/ssl_cert.pem /tmp/ssl_key.key
    " "应用SSL证书"

    log_success "$server_name SSL证书更新完成"
}

# 仅更新Docker配置
deploy_docker_only() {
    local host=$1
    local user=$2
    local server_name=$3

    log_step "仅更新 $server_name Docker配置..."

    # 检查docker-compose文件
    local compose_file="$SCRIPT_DIR/docker-compose.yml"
    if [ ! -f "$compose_file" ]; then
        log_error "Docker Compose文件不存在: $compose_file"
        return 1
    fi

    # 上传docker-compose文件
    execute_scp "$compose_file" "$user@$host:/tmp/docker-compose.yml" "上传Docker Compose配置"

    # 在服务器上应用配置
    execute_ssh "$host" "$user" "
        # 创建项目目录
        sudo mkdir -p /opt/obsync

        # 备份现有配置
        sudo cp /opt/obsync/docker-compose.yml /opt/obsync/docker-compose.yml.backup.\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

        # 应用新配置
        sudo cp /tmp/docker-compose.yml /opt/obsync/
        sudo chown root:root /opt/obsync/docker-compose.yml

        # 进入项目目录
        cd /opt/obsync

        # 验证配置文件语法
        if sudo docker-compose config > /dev/null; then
            echo '✅ Docker Compose配置语法正确'
        else
            echo '❌ Docker Compose配置语法错误'
            sudo cp /opt/obsync/docker-compose.yml.backup.* /opt/obsync/docker-compose.yml 2>/dev/null || true
            exit 1
        fi

        # 重新启动受影响的容器
        echo '🔄 重新启动Docker容器...'
        sudo docker-compose down
        sudo docker-compose up -d

        # 等待容器启动
        sleep 10

        # 验证容器状态
        if sudo docker-compose ps | grep -q 'Up'; then
            echo '✅ Docker容器启动成功'
            sudo docker-compose ps
        else
            echo '❌ Docker容器启动失败'
            sudo docker-compose logs
            exit 1
        fi

        # 清理临时文件
        rm -f /tmp/docker-compose.yml
    " "应用Docker配置"

    log_success "$server_name Docker配置更新完成"
}

# 拉取最新镜像并部署
deploy_update_images() {
    local host=$1
    local user=$2
    local server_name=$3

    log_step "更新 $server_name Docker镜像..."

    # 在服务器上更新镜像
    execute_ssh "$host" "$user" "
        cd /opt/obsync

        # 检查docker-compose文件是否存在
        if [ ! -f docker-compose.yml ]; then
            echo '❌ Docker Compose文件不存在'
            exit 1
        fi

        # 显示当前镜像信息
        echo '📋 当前镜像信息:'
        sudo docker-compose images

        # 拉取最新镜像
        echo '⬇️  拉取最新镜像...'
        sudo docker-compose pull

        # 执行滚动更新
        echo '🔄 执行滚动更新...'

        # 获取所有服务名称
        SERVICES=\$(sudo docker-compose config --services)

        for service in \$SERVICES; do
            echo \"🔄 更新服务: \$service\"

            # 创建新容器
            sudo docker-compose up -d --no-deps \$service

            # 等待服务启动
            sleep 5

            # 检查服务健康状态
            if sudo docker-compose ps \$service | grep -q 'Up'; then
                echo \"✅ 服务 \$service 更新成功\"
            else
                echo \"❌ 服务 \$service 更新失败\"
                sudo docker-compose logs \$service
                exit 1
            fi
        done

        # 清理未使用的镜像
        echo '🧹 清理未使用的镜像...'
        sudo docker image prune -f

        # 显示更新后的状态
        echo '📋 更新后的容器状态:'
        sudo docker-compose ps

        echo '📋 更新后的镜像信息:'
        sudo docker-compose images
    " "更新Docker镜像"

    log_success "$server_name Docker镜像更新完成"
}

# 验证部署结果
verify_deployment() {
    local host=$1
    local user=$2
    local server_name=$3
    local mode=${4:-"all"}

    log_step "验证 $server_name 部署结果..."

    if [ "$DRY_RUN" = true ]; then
        log_dry_run "跳过验证步骤"
        return 0
    fi

    case $mode in
        "nginx"|"ssl")
            # 验证Nginx和SSL
            log_info "验证Nginx服务状态..."
            if execute_ssh "$host" "$user" "systemctl is-active nginx" "检查Nginx状态" | grep -q "active"; then
                log_success "✅ Nginx服务运行正常"
            else
                log_error "❌ Nginx服务异常"
                return 1
            fi

            # 验证HTTP访问
            log_info "验证HTTP访问..."
            if execute_ssh "$host" "$user" "curl -s -o /dev/null -w '%{http_code}' http://localhost/health" "测试HTTP访问" | grep -q "200\|301\|302"; then
                log_success "✅ HTTP访问正常"
            else
                log_warning "⚠️  HTTP访问异常"
            fi

            # 如果是SSL模式，验证HTTPS
            if [ "$mode" = "ssl" ]; then
                log_info "验证HTTPS访问..."
                if execute_ssh "$host" "$user" "curl -k -s -o /dev/null -w '%{http_code}' https://localhost/health" "测试HTTPS访问" | grep -q "200"; then
                    log_success "✅ HTTPS访问正常"
                else
                    log_warning "⚠️  HTTPS访问异常"
                fi
            fi
            ;;

        "docker")
            # 验证Docker服务
            log_info "验证Docker容器状态..."
            execute_ssh "$host" "$user" "
                cd /opt/obsync
                if sudo docker-compose ps | grep -q 'Up'; then
                    echo '✅ Docker容器运行正常'
                    sudo docker-compose ps
                else
                    echo '❌ Docker容器异常'
                    sudo docker-compose ps
                    exit 1
                fi
            " "检查Docker状态"

            # 验证API Gateway健康检查
            log_info "验证API Gateway..."
            if execute_ssh "$host" "$user" "curl -s -o /dev/null -w '%{http_code}' http://localhost:8090/health" "测试API Gateway" | grep -q "200"; then
                log_success "✅ API Gateway运行正常"
            else
                log_warning "⚠️  API Gateway异常"
            fi
            ;;

        "all")
            # 完整验证
            verify_deployment "$host" "$user" "$server_name" "nginx"
            verify_deployment "$host" "$user" "$server_name" "docker"
            ;;
    esac

    log_success "$server_name 验证完成"
}

# 完整部署函数（向后兼容）
deploy_full() {
    local host=$1
    local user=$2
    local server_name=$3

    log_step "完整部署到 $server_name..."

    # 依次执行各个部署步骤
    deploy_ssl_only "$host" "$user" "$server_name"
    deploy_nginx_only "$host" "$user" "$server_name"
    deploy_docker_only "$host" "$user" "$server_name"

    # 验证部署
    verify_deployment "$host" "$user" "$server_name" "all"

    log_success "$server_name 完整部署完成"
}

# 显示帮助信息
show_help() {
    cat << 'EOF'
模块化部署脚本 v2.0

用法: ./deploy.sh [部署模式] [选项] [目标服务器]

部署模式:
  --nginx-only        仅更新Nginx配置
  --ssl-only          仅更新SSL证书
  --docker-only       仅更新Docker配置
  --update-images     拉取最新镜像并部署
  (无参数)            完整部署（默认）

选项:
  -h, --help          显示帮助信息
  --dry-run           预演模式，不实际执行
  -v, --verbose       详细输出模式
  --server1           仅操作Server-1 (jlufe_12.6)
  --server2           仅操作Server-2 (jlufe_10.128)

使用示例:
  ./deploy.sh                           # 完整部署到两台服务器
  ./deploy.sh --nginx-only              # 仅更新两台服务器的Nginx配置
  ./deploy.sh --ssl-only --server1      # 仅更新Server-1的SSL证书
  ./deploy.sh --docker-only --server2   # 仅更新Server-2的Docker配置
  ./deploy.sh --update-images           # 更新两台服务器的Docker镜像
  ./deploy.sh --dry-run                 # 预演完整部署过程
  ./deploy.sh --nginx-only --verbose    # 详细输出模式更新Nginx配置

部署模式说明:
  --nginx-only:
    • 上传并应用新的Nginx配置文件
    • 测试配置语法正确性
    • 重新加载Nginx服务（不重启）
    • 验证配置生效

  --ssl-only:
    • 上传新的SSL证书文件到服务器
    • 设置正确的文件权限（证书644，私钥600）
    • 验证证书有效性和匹配性
    • 重新加载Nginx以应用新证书

  --docker-only:
    • 上传并应用新的docker-compose.yml文件
    • 重新启动受影响的Docker容器
    • 验证容器健康状态
    • 保持数据持久化

  --update-images:
    • 拉取最新的Docker镜像
    • 使用新镜像重新部署容器
    • 执行滚动更新以减少服务中断
    • 验证新版本部署成功

服务器信息:
  Server-1: jlufe_12.6 (ubuntu用户)
  Server-2: jlufe_10.128 (ubutu用户)

注意事项:
  • 确保SSH密钥已配置
  • 确保目标服务器上已安装Docker和Nginx
  • 使用--dry-run参数可以预览操作而不实际执行
  • 使用--verbose参数可以查看详细的执行过程
EOF
}

# 执行部署操作
execute_deployment() {
    local deploy_func=$1
    local mode_name=$2

    # 确定目标服务器
    local servers=()
    if [ "$TARGET_SERVER" = "server1" ]; then
        servers=("$SERVER_1_HOST:$SERVER_1_USER:Server-1")
    elif [ "$TARGET_SERVER" = "server2" ]; then
        servers=("$SERVER_2_HOST:$SERVER_2_USER:Server-2")
    else
        servers=("$SERVER_1_HOST:$SERVER_1_USER:Server-1" "$SERVER_2_HOST:$SERVER_2_USER:Server-2")
    fi

    # 执行部署
    for server_info in "${servers[@]}"; do
        IFS=':' read -r host user name <<< "$server_info"

        log_info "开始 $mode_name 到 $name ($host)..."

        if $deploy_func "$host" "$user" "$name"; then
            log_success "$name $mode_name 完成"
        else
            log_error "$name $mode_name 失败"
            exit 1
        fi

        echo ""
    done
}

# 主函数
main() {
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            --nginx-only)
                NGINX_ONLY=true
                shift
                ;;
            --ssl-only)
                SSL_ONLY=true
                shift
                ;;
            --docker-only)
                DOCKER_ONLY=true
                shift
                ;;
            --update-images)
                UPDATE_IMAGES=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            --server1)
                TARGET_SERVER="server1"
                shift
                ;;
            --server2)
                TARGET_SERVER="server2"
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

    # 显示横幅
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    模块化部署脚本 v2.0                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    # 显示配置信息
    log_info "部署配置："
    if [ "$NGINX_ONLY" = true ]; then
        echo "  模式: 仅更新Nginx配置"
    elif [ "$SSL_ONLY" = true ]; then
        echo "  模式: 仅更新SSL证书"
    elif [ "$DOCKER_ONLY" = true ]; then
        echo "  模式: 仅更新Docker配置"
    elif [ "$UPDATE_IMAGES" = true ]; then
        echo "  模式: 拉取最新镜像并部署"
    else
        echo "  模式: 完整部署"
    fi

    if [ "$TARGET_SERVER" = "server1" ]; then
        echo "  目标: Server-1 ($SERVER_1_HOST)"
    elif [ "$TARGET_SERVER" = "server2" ]; then
        echo "  目标: Server-2 ($SERVER_2_HOST)"
    else
        echo "  目标: 两台服务器"
    fi

    echo "  预演模式: $DRY_RUN"
    echo "  详细输出: $VERBOSE"
    echo ""

    # 确认执行
    if [ "$DRY_RUN" = false ]; then
        read -p "确认开始部署? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_warning "部署已取消"
            exit 0
        fi
        echo ""
    fi

    # 检查文件
    check_files
    echo ""

    # 执行相应的部署模式
    if [ "$NGINX_ONLY" = true ]; then
        execute_deployment "deploy_nginx_only" "Nginx配置更新"
    elif [ "$SSL_ONLY" = true ]; then
        execute_deployment "deploy_ssl_only" "SSL证书更新"
    elif [ "$DOCKER_ONLY" = true ]; then
        execute_deployment "deploy_docker_only" "Docker配置更新"
    elif [ "$UPDATE_IMAGES" = true ]; then
        execute_deployment "deploy_update_images" "Docker镜像更新"
    else
        execute_deployment "deploy_full" "完整部署"
    fi

    # 显示完成信息
    echo ""
    echo "🎉 部署操作完成！"
    echo ""
    log_info "访问地址："
    log_info "  主站点: https://kwps.jlufe.edu.cn/"
    log_info "  API网关: https://kwps.jlufe.edu.cn/api/"
    log_info "  健康检查: https://kwps.jlufe.edu.cn/health"
    echo ""
}

# 执行主函数
main "$@"
