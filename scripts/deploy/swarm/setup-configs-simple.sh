#!/bin/bash

# 配置文件部署脚本 - 精简版
# 用途: 部署日志系统配置文件（不包含监控组件）

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

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_info "开始部署配置文件（精简版）..."

# 创建目录
log_info "创建配置目录..."
mkdir -p /opt/obsync/{loki,promtail,grafana/provisioning/datasources}

# ==================== Loki 配置 ====================
log_info "部署 Loki 配置..."
if [ -f "$SCRIPT_DIR/loki-config.yml" ]; then
    cp "$SCRIPT_DIR/loki-config.yml" /opt/obsync/loki/loki-config.yml
    log_info "✓ Loki 配置已部署"
else
    log_error "未找到 loki-config.yml"
    exit 1
fi

# ==================== Promtail 配置 ====================
log_info "部署 Promtail 配置..."
if [ -f "$SCRIPT_DIR/promtail-config.yml" ]; then
    cp "$SCRIPT_DIR/promtail-config.yml" /opt/obsync/promtail/promtail-config.yml
    log_info "✓ Promtail 配置已部署"
else
    log_error "未找到 promtail-config.yml"
    exit 1
fi

# ==================== Grafana 数据源配置 ====================
log_info "部署 Grafana 数据源配置..."
if [ -f "$SCRIPT_DIR/grafana-datasource.yml" ]; then
    cp "$SCRIPT_DIR/grafana-datasource.yml" /opt/obsync/grafana/provisioning/datasources/datasource.yml
    log_info "✓ Grafana 数据源配置已部署"
else
    log_error "未找到 grafana-datasource.yml"
    exit 1
fi

# ==================== Docker Daemon 配置 ====================
log_info "部署 Docker Daemon 配置..."
if [ -f "$SCRIPT_DIR/daemon.json" ]; then
    # 备份现有配置
    if [ -f /etc/docker/daemon.json ]; then
        cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)
        log_info "  已备份现有 daemon.json"
    fi
    
    cp "$SCRIPT_DIR/daemon.json" /etc/docker/daemon.json
    log_info "✓ Docker Daemon 配置已部署"
    log_warn "  需要重启 Docker 服务才能生效: systemctl restart docker"
else
    log_warn "未找到 daemon.json,跳过"
fi

# ==================== 设置权限 ====================
log_info "设置配置文件权限..."
chmod -R 644 /opt/obsync/*/
chmod 755 /opt/obsync/*/
log_info "✓ 权限设置完成"

log_info ""
log_info "=========================================="
log_info "配置文件部署完成（精简版）!"
log_info "=========================================="
log_info "配置文件位置:"
log_info "  Loki:        /opt/obsync/loki/loki-config.yml"
log_info "  Promtail:    /opt/obsync/promtail/promtail-config.yml"
log_info "  Grafana:     /opt/obsync/grafana/provisioning/datasources/datasource.yml"
log_info ""
log_info "下一步:"
log_info "1. 检查并修改配置文件 (如需要)"
log_info "2. 运行 ./create-secrets.sh 创建 Secrets"
log_info "3. 运行部署命令:"
log_info "   docker stack deploy -c stack-2node-simple.yml obsync"

