#!/bin/bash
# Nginx 配置部署模块

set -e

# 加载配置
source "$SCRIPT_DIR/config/servers.conf"
source "$SCRIPT_DIR/config/deploy.conf"

# 日志函数
log() { echo -e "\033[0;34m[NGINX]\033[0m $1"; }
log_success() { echo -e "\033[0;32m✅ [NGINX]\033[0m $1"; }
log_error() { echo -e "\033[0;31m❌ [NGINX]\033[0m $1"; }
log_warning() { echo -e "\033[1;33m⚠️  [NGINX]\033[0m $1"; }

# 获取服务器信息
get_server_info() {
    case "$DEPLOY_SERVER" in
        "main")
            SERVER_HOST="$MAIN_SERVER_HOST"
            SERVER_USER="$MAIN_SERVER_USER"
            SERVER_NAME="$MAIN_SERVER_NAME"
            SITE_NAME="$MAIN_SERVER_SITE_NAME"
            CONFIG_SOURCE_DIR="$NGINX_SOURCE_DIR/main-server"
            ;;
        "backup")
            SERVER_HOST="$BACKUP_SERVER_HOST"
            SERVER_USER="$BACKUP_SERVER_USER"
            SERVER_NAME="$BACKUP_SERVER_NAME"
            SITE_NAME="$BACKUP_SERVER_SITE_NAME"
            CONFIG_SOURCE_DIR="$NGINX_SOURCE_DIR/backup-server"
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

# 备份现有配置
backup_existing_config() {
    log "备份现有 Nginx 配置..."
    
    # 创建备份目录
    remote_exec "sudo mkdir -p $BACKUP_DIR/nginx" "创建备份目录"
    remote_exec "sudo chown ubuntu:ubuntu $BACKUP_DIR/nginx" "设置备份目录权限"

    # 备份站点配置
    remote_exec "if [ -f $NGINX_SITES_AVAILABLE/$SITE_NAME ]; then sudo cp $NGINX_SITES_AVAILABLE/$SITE_NAME $BACKUP_DIR/nginx/$SITE_NAME.backup.$DEPLOY_TIMESTAMP; fi" "备份站点配置"

    # 备份 proxy_params (仅主服务器)
    if [ "$DEPLOY_SERVER" = "main" ]; then
        remote_exec "if [ -f $NGINX_CONF_DIR/proxy_params ]; then sudo cp $NGINX_CONF_DIR/proxy_params $BACKUP_DIR/nginx/proxy_params.backup.$DEPLOY_TIMESTAMP; fi" "备份代理参数配置"
    fi
    
    # 备份 nginx.conf (仅备用服务器) - 已移除，服务器上的 nginx.conf 无需修改
    
    log_success "配置备份完成"
}

# 部署配置文件
deploy_config_files() {
    log "部署 Nginx 配置文件到 $SERVER_NAME..."
    
    case "$DEPLOY_SERVER" in
        "main")
            # 主服务器配置
            upload_file "$CONFIG_SOURCE_DIR/$SITE_NAME" "$NGINX_SITES_AVAILABLE/$SITE_NAME" "上传站点配置文件"
            upload_file "$CONFIG_SOURCE_DIR/proxy_params" "$NGINX_CONF_DIR/proxy_params" "上传代理参数配置"
            
            # 创建软链接
            remote_exec "sudo ln -sf $NGINX_SITES_AVAILABLE/$SITE_NAME $NGINX_SITES_ENABLED/$SITE_NAME" "创建站点配置软链接"
            ;;
            
        "backup")
            # 备用服务器配置 - 只部署站点配置，不修改 nginx.conf
            upload_file "$CONFIG_SOURCE_DIR/$SITE_NAME" "$NGINX_SITES_AVAILABLE/$SITE_NAME" "上传站点配置文件"

            # 创建软链接
            remote_exec "sudo ln -sf $NGINX_SITES_AVAILABLE/$SITE_NAME $NGINX_SITES_ENABLED/$SITE_NAME" "创建站点配置软链接"

            log_success "备用服务器站点配置部署完成 (nginx.conf 保持不变)"
            ;;
    esac
    
    # 设置文件权限
    remote_exec "sudo chown root:root $NGINX_SITES_AVAILABLE/$SITE_NAME" "设置站点配置文件权限"
    remote_exec "sudo chmod 644 $NGINX_SITES_AVAILABLE/$SITE_NAME"

    if [ "$DEPLOY_SERVER" = "main" ]; then
        remote_exec "sudo chown root:root $NGINX_CONF_DIR/proxy_params" "设置代理参数文件权限"
        remote_exec "sudo chmod 644 $NGINX_CONF_DIR/proxy_params"
    fi
    
    log_success "配置文件部署完成"
}

# 创建必要目录
create_directories() {
    log "创建必要目录..."

    # 通用目录 (需要 sudo 权限)
    remote_exec "sudo mkdir -p $BACKUP_DIR $LOG_DIR" "创建备份和日志目录"
    remote_exec "sudo chown ubuntu:ubuntu $BACKUP_DIR $LOG_DIR" "设置目录权限"

    case "$DEPLOY_SERVER" in
        "main")
            # 主服务器目录
            remote_exec "sudo mkdir -p $STATIC_WEB_DIR $STATIC_APP_DIR /var/www/certbot $SSL_CERT_DIR" "创建静态文件和证书目录"
            remote_exec "sudo chown ubuntu:ubuntu $STATIC_WEB_DIR $STATIC_APP_DIR /var/www/certbot" "设置静态文件目录权限"
            remote_exec "sudo chown root:root $SSL_CERT_DIR" "设置 SSL 证书目录权限"
            ;;
        "backup")
            # 备用服务器目录
            remote_exec "sudo mkdir -p /var/log/nginx" "创建 Nginx 日志目录"
            ;;
    esac

    log_success "目录创建完成"
}

# 测试 Nginx 配置
test_nginx_config() {
    log "测试 Nginx 配置语法..."
    
    if remote_exec "sudo nginx -t" "验证 Nginx 配置"; then
        log_success "Nginx 配置语法正确"
        return 0
    else
        log_error "Nginx 配置语法错误"
        return 1
    fi
}

# 重新加载 Nginx
reload_nginx() {
    if [ "$RESTART_SERVICES" != "true" ]; then
        log_warning "跳过 Nginx 重新加载 (RESTART_SERVICES=false)"
        return 0
    fi
    
    log "重新加载 Nginx 配置..."
    
    if remote_exec "sudo systemctl reload nginx" "重新加载 Nginx"; then
        log_success "Nginx 配置已重新加载"
    else
        log_warning "Nginx 重新加载失败，尝试重启..."
        if remote_exec "sudo systemctl restart nginx" "重启 Nginx 服务"; then
            log_success "Nginx 服务已重启"
        else
            log_error "Nginx 服务重启失败"
            return 1
        fi
    fi
}

# 验证部署
verify_deployment() {
    if [ "$VERIFY_DEPLOYMENT" != "true" ]; then
        log_warning "跳过部署验证 (VERIFY_DEPLOYMENT=false)"
        return 0
    fi
    
    log "验证部署结果..."
    
    # 检查 Nginx 服务状态
    if remote_exec "sudo systemctl is-active nginx >/dev/null" "检查 Nginx 服务状态"; then
        log_success "Nginx 服务运行正常"
    else
        log_error "Nginx 服务未运行"
        return 1
    fi
    
    # 测试健康检查端点
    case "$DEPLOY_SERVER" in
        "main")
            if remote_exec "curl -s -f http://localhost/health >/dev/null" "测试 HTTP 健康检查"; then
                log_success "HTTP 健康检查通过"
            else
                log_warning "HTTP 健康检查失败"
            fi
            ;;
        "backup")
            if remote_exec "curl -s -f http://localhost/health >/dev/null" "测试健康检查"; then
                log_success "健康检查通过"
            else
                log_warning "健康检查失败"
            fi
            ;;
    esac
    
    # 检查端口监听
    if remote_exec "netstat -tlnp | grep ':80 ' >/dev/null" "检查 HTTP 端口监听"; then
        log_success "HTTP 端口 (80) 监听正常"
    else
        log_warning "HTTP 端口 (80) 未监听"
    fi
    
    if [ "$DEPLOY_SERVER" = "main" ]; then
        if remote_exec "netstat -tlnp | grep ':443 ' >/dev/null" "检查 HTTPS 端口监听"; then
            log_success "HTTPS 端口 (443) 监听正常"
        else
            log_warning "HTTPS 端口 (443) 未监听"
        fi
    fi
}

# 主函数
main() {
    log "=== 开始部署 Nginx 配置 ==="
    
    # 获取服务器信息
    get_server_info
    
    # 检查源配置文件
    if [ ! -d "$CONFIG_SOURCE_DIR" ]; then
        log_error "配置源目录不存在: $CONFIG_SOURCE_DIR"
        exit 1
    fi
    
    if [ ! -f "$CONFIG_SOURCE_DIR/$SITE_NAME" ]; then
        log_error "站点配置文件不存在: $CONFIG_SOURCE_DIR/$SITE_NAME"
        exit 1
    fi
    
    log "目标服务器: $SERVER_NAME ($SERVER_HOST)"
    log "站点配置: $SITE_NAME"

    if [ "$DEPLOY_SERVER" = "backup" ]; then
        log "备用服务器模式: 仅部署站点配置，保持 nginx.conf 不变"
    fi
    
    # 执行部署步骤
    create_directories
    
    if [ "$BACKUP_ENABLED" = "true" ]; then
        backup_existing_config
    fi
    
    deploy_config_files
    
    if test_nginx_config; then
        reload_nginx
        verify_deployment
        log_success "=== Nginx 配置部署完成 ==="
    else
        log_error "=== Nginx 配置部署失败 ==="
        exit 1
    fi
}

# 执行主函数
main "$@"
