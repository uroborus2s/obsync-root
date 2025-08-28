#!/bin/bash
# SSL 证书部署模块

set -e

# 加载配置
source "$SCRIPT_DIR/config/servers.conf"
source "$SCRIPT_DIR/config/deploy.conf"

# 日志函数
log() { echo -e "\033[0;35m[SSL]\033[0m $1"; }
log_success() { echo -e "\033[0;32m✅ [SSL]\033[0m $1"; }
log_error() { echo -e "\033[0;31m❌ [SSL]\033[0m $1"; }
log_warning() { echo -e "\033[1;33m⚠️  [SSL]\033[0m $1"; }

# 获取服务器信息
get_server_info() {
    case "$DEPLOY_SERVER" in
        "main")
            SERVER_HOST="$MAIN_SERVER_HOST"
            SERVER_USER="$MAIN_SERVER_USER"
            SERVER_NAME="$MAIN_SERVER_NAME"
            ;;
        "backup")
            # 备用服务器通常不需要 SSL 证书
            log_warning "备用服务器通常不需要 SSL 证书，跳过部署"
            exit 0
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

# 检查本地证书文件
check_local_certificates() {
    log "检查本地 SSL 证书文件..."
    
    local cert_file="$SSL_SOURCE_DIR/$SSL_CERT_FILE"
    local key_file="$SSL_SOURCE_DIR/$SSL_KEY_FILE"
    
    if [ ! -f "$cert_file" ]; then
        log_error "SSL 证书文件不存在: $cert_file"
        return 1
    fi
    
    if [ ! -f "$key_file" ]; then
        log_error "SSL 私钥文件不存在: $key_file"
        return 1
    fi
    
    # 验证证书文件格式
    if ! openssl x509 -in "$cert_file" -noout -text >/dev/null 2>&1; then
        log_error "SSL 证书文件格式无效: $cert_file"
        return 1
    fi
    
    # 验证私钥文件格式
    if ! openssl rsa -in "$key_file" -check -noout >/dev/null 2>&1; then
        log_error "SSL 私钥文件格式无效: $key_file"
        return 1
    fi
    
    # 检查证书和私钥是否匹配
    local cert_modulus=$(openssl x509 -noout -modulus -in "$cert_file" | openssl md5)
    local key_modulus=$(openssl rsa -noout -modulus -in "$key_file" | openssl md5)
    
    if [ "$cert_modulus" != "$key_modulus" ]; then
        log_error "SSL 证书和私钥不匹配"
        return 1
    fi
    
    # 检查证书有效期
    local expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
    local expiry_timestamp=$(date -d "$expiry_date" +%s)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    if [ $days_until_expiry -lt 0 ]; then
        log_error "SSL 证书已过期"
        return 1
    elif [ $days_until_expiry -lt 30 ]; then
        log_warning "SSL 证书将在 $days_until_expiry 天后过期"
    else
        log_success "SSL 证书有效，剩余 $days_until_expiry 天"
    fi
    
    log_success "本地 SSL 证书文件检查通过"
    return 0
}

# 备份现有证书
backup_existing_certificates() {
    log "备份现有 SSL 证书..."
    
    # 创建备份目录
    remote_exec "sudo mkdir -p $BACKUP_DIR/ssl" "创建 SSL 备份目录"
    remote_exec "sudo chown ubuntu:ubuntu $BACKUP_DIR/ssl" "设置 SSL 备份目录权限"

    # 备份现有证书文件
    remote_exec "if [ -f $SSL_CERT_DIR/$SSL_CERT_FILE ]; then sudo cp $SSL_CERT_DIR/$SSL_CERT_FILE $BACKUP_DIR/ssl/$SSL_CERT_FILE.backup.$DEPLOY_TIMESTAMP; fi" "备份证书文件"

    remote_exec "if [ -f $SSL_CERT_DIR/$SSL_KEY_FILE ]; then sudo cp $SSL_CERT_DIR/$SSL_KEY_FILE $BACKUP_DIR/ssl/$SSL_KEY_FILE.backup.$DEPLOY_TIMESTAMP; fi" "备份私钥文件"
    
    log_success "SSL 证书备份完成"
}

# 部署证书文件
deploy_certificates() {
    log "部署 SSL 证书到 $SERVER_NAME..."
    
    # 创建 SSL 目录
    remote_exec "sudo mkdir -p $SSL_CERT_DIR" "创建 SSL 证书目录"

    # 上传证书文件
    upload_file "$SSL_SOURCE_DIR/$SSL_CERT_FILE" "$SSL_CERT_DIR/$SSL_CERT_FILE" "上传 SSL 证书文件"
    upload_file "$SSL_SOURCE_DIR/$SSL_KEY_FILE" "$SSL_CERT_DIR/$SSL_KEY_FILE" "上传 SSL 私钥文件"

    # 设置文件权限
    remote_exec "sudo chown root:root $SSL_CERT_DIR/$SSL_CERT_FILE $SSL_CERT_DIR/$SSL_KEY_FILE" "设置证书文件所有者"
    remote_exec "sudo chmod 644 $SSL_CERT_DIR/$SSL_CERT_FILE" "设置证书文件权限"
    remote_exec "sudo chmod 600 $SSL_CERT_DIR/$SSL_KEY_FILE" "设置私钥文件权限"
    
    log_success "SSL 证书部署完成"
}

# 验证远程证书
verify_remote_certificates() {
    if [ "$VERIFY_DEPLOYMENT" != "true" ]; then
        log_warning "跳过证书验证 (VERIFY_DEPLOYMENT=false)"
        return 0
    fi
    
    log "验证远程 SSL 证书..."
    
    # 验证证书文件存在
    if ! remote_exec "test -f $SSL_CERT_DIR/$SSL_CERT_FILE" "检查证书文件存在"; then
        log_error "远程证书文件不存在"
        return 1
    fi
    
    if ! remote_exec "test -f $SSL_CERT_DIR/$SSL_KEY_FILE" "检查私钥文件存在"; then
        log_error "远程私钥文件不存在"
        return 1
    fi
    
    # 验证证书格式
    if ! remote_exec "openssl x509 -in $SSL_CERT_DIR/$SSL_CERT_FILE -noout -text >/dev/null 2>&1" "验证证书格式"; then
        log_error "远程证书文件格式无效"
        return 1
    fi
    
    # 验证私钥格式
    if ! remote_exec "openssl rsa -in $SSL_CERT_DIR/$SSL_KEY_FILE -check -noout >/dev/null 2>&1" "验证私钥格式"; then
        log_error "远程私钥文件格式无效"
        return 1
    fi
    
    # 验证证书和私钥匹配
    if ! remote_exec "[ \"\$(openssl x509 -noout -modulus -in $SSL_CERT_DIR/$SSL_CERT_FILE | openssl md5)\" = \"\$(openssl rsa -noout -modulus -in $SSL_CERT_DIR/$SSL_KEY_FILE | openssl md5)\" ]" "验证证书和私钥匹配"; then
        log_error "远程证书和私钥不匹配"
        return 1
    fi
    
    log_success "远程 SSL 证书验证通过"
}

# 测试 HTTPS 连接
test_https_connection() {
    if [ "$VERIFY_DEPLOYMENT" != "true" ]; then
        return 0
    fi
    
    log "测试 HTTPS 连接..."
    
    # 等待 Nginx 重新加载
    sleep 5
    
    # 测试本地 HTTPS 连接
    if remote_exec "curl -s -f -k https://localhost/health >/dev/null" "测试本地 HTTPS 连接"; then
        log_success "本地 HTTPS 连接测试通过"
    else
        log_warning "本地 HTTPS 连接测试失败"
    fi
    
    # 测试域名 HTTPS 连接 (如果可以解析)
    if remote_exec "curl -s -f https://kwps.jlufe.edu.cn/health >/dev/null 2>&1" "测试域名 HTTPS 连接"; then
        log_success "域名 HTTPS 连接测试通过"
    else
        log_warning "域名 HTTPS 连接测试失败 (可能是 DNS 解析问题)"
    fi
}

# 重新加载 Nginx (如果需要)
reload_nginx_if_needed() {
    if [ "$RESTART_SERVICES" != "true" ]; then
        log_warning "跳过 Nginx 重新加载 (RESTART_SERVICES=false)"
        return 0
    fi
    
    log "重新加载 Nginx 以应用新证书..."
    
    # 先测试配置
    if ! remote_exec "nginx -t" "测试 Nginx 配置"; then
        log_error "Nginx 配置测试失败，不重新加载"
        return 1
    fi
    
    # 重新加载 Nginx
    if remote_exec "systemctl reload nginx" "重新加载 Nginx"; then
        log_success "Nginx 已重新加载"
    else
        log_error "Nginx 重新加载失败"
        return 1
    fi
}

# 主函数
main() {
    log "=== 开始部署 SSL 证书 ==="
    
    # 获取服务器信息
    get_server_info
    
    log "目标服务器: $SERVER_NAME ($SERVER_HOST)"
    
    # 检查本地证书文件
    if ! check_local_certificates; then
        log_error "本地证书文件检查失败"
        exit 1
    fi
    
    # 执行部署步骤
    if [ "$BACKUP_ENABLED" = "true" ]; then
        backup_existing_certificates
    fi
    
    deploy_certificates
    verify_remote_certificates
    reload_nginx_if_needed
    test_https_connection
    
    log_success "=== SSL 证书部署完成 ==="
}

# 执行主函数
main "$@"
