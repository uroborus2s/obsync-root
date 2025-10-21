#!/bin/bash

# Docker Swarm Secrets 创建脚本
# 用途: 创建所有必需的 Docker Secrets

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否在 Manager 节点上运行
if ! sudo docker info 2>/dev/null | grep -q "Swarm: active"; then
    log_error "当前节点不是 Swarm 集群的一部分"
    exit 1
fi

if ! sudo docker info 2>/dev/null | grep -q "Is Manager: true"; then
    log_error "请在 Manager 节点上运行此脚本"
    exit 1
fi

log_info "开始创建 Docker Secrets..."

# ==================== Grafana 密码 Secret ====================

log_info "创建 Grafana 管理员密码 Secret..."

if sudo docker secret ls --format "{{.Name}}" | grep -q "^grafana_admin_password$"; then
    log_warn "Secret 'grafana_admin_password' 已存在,跳过"
else
    # 生成强密码
    GRAFANA_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    echo -n "$GRAFANA_PASSWORD" | sudo docker secret create grafana_admin_password -
    log_info "✓ 已创建 grafana_admin_password"
    log_info "  Grafana 管理员密码: $GRAFANA_PASSWORD"
    log_warn "  请妥善保管此密码!"
    
    # 保存到文件
    echo "Grafana Admin Password: $GRAFANA_PASSWORD" >> /opt/obsync/swarm/credentials.txt
    chmod 600 /opt/obsync/credentials.txt
    log_info "  密码已保存到: /opt/obsync/swarm/credentials.txt"
fi

# ==================== MinIO Secrets ====================

log_info "创建 MinIO 凭证 Secrets..."

if sudo docker secret ls --format "{{.Name}}" | grep -q "^minio_root_user$"; then
    log_warn "Secret 'minio_root_user' 已存在,跳过"
else
    read -p "请输入 MinIO Root User (默认: minioadmin): " MINIO_USER
    MINIO_USER=${MINIO_USER:-minioadmin}
    echo -n "$MINIO_USER" | sudo docker secret create minio_root_user -
    log_info "✓ 已创建 minio_root_user"
fi

if sudo docker secret ls --format "{{.Name}}" | grep -q "^minio_root_password$"; then
    log_warn "Secret 'minio_root_password' 已存在,跳过"
else
    # 生成强密码
    MINIO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    echo -n "$MINIO_PASSWORD" |sudo  docker secret create minio_root_password -
    log_info "✓ 已创建 minio_root_password"
    log_info "  MinIO Root Password: $MINIO_PASSWORD"
    log_warn "  请妥善保管此密码!"
    
    # 保存到文件
    echo "MinIO Root User: ${MINIO_USER:-minioadmin}" >> /opt/obsync/swarm/credentials.txt
    echo "MinIO Root Password: $MINIO_PASSWORD" >> /opt/obsync/swarm/credentials.txt
    log_info "  密码已保存到: /opt/obsync/swarm/credentials.txt"
fi

# ==================== 业务服务配置 Secrets ====================

log_info "创建业务服务配置 Secrets..."

# API Gateway 配置
if sudo docker secret ls --format "{{.Name}}" | grep -q "^api_gateway_config$"; then
    log_warn "Secret 'api_gateway_config' 已存在,跳过"
else
    read -p "请输入 API Gateway 配置 (STRATIX_SENSITIVE_CONFIG): " API_GATEWAY_CONFIG
    if [ -n "$API_GATEWAY_CONFIG" ]; then
        echo -n "$API_GATEWAY_CONFIG" | sudo docker secret create api_gateway_config -
        log_info "✓ 已创建 api_gateway_config"
    else
        log_warn "跳过 api_gateway_config (未输入)"
    fi
fi

# ICA Sync 配置
if sudo docker secret ls --format "{{.Name}}" | grep -q "^icasync_config$"; then
    log_warn "Secret 'icasync_config' 已存在,跳过"
else
    read -p "请输入 ICA Sync 配置 (STRATIX_SENSITIVE_CONFIG): " ICASYNC_CONFIG
    if [ -n "$ICASYNC_CONFIG" ]; then
        echo -n "$ICASYNC_CONFIG" | sudo docker secret create icasync_config -
        log_info "✓ 已创建 icasync_config"
    else
        log_warn "跳过 icasync_config (未输入)"
    fi
fi

# ICA Link 配置
if sudo docker secret ls --format "{{.Name}}" | grep -q "^icalink_config$"; then
    log_warn "Secret 'icalink_config' 已存在,跳过"
else
    read -p "请输入 ICA Link 配置 (STRATIX_SENSITIVE_CONFIG): " ICALINK_CONFIG
    if [ -n "$ICALINK_CONFIG" ]; then
        echo -n "$ICALINK_CONFIG" | sudo docker secret create icalink_config -
        log_info "✓ 已创建 icalink_config"
    else
        log_warn "跳过 icalink_config (未输入)"
    fi
fi
# ==================== 验证 Secrets ====================

log_info ""
log_info "=========================================="
log_info "已创建的 Secrets:"
log_info "=========================================="
sudo docker secret ls --format "table {{.Name}}\t{{.CreatedAt}}"

log_info ""
log_info "Secrets 创建完成!"
log_info "凭证信息已保存到: /opt/obsync/swarm/credentials.txt"
log_warn "请务必备份此文件到安全位置!"

