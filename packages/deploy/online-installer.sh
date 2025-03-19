#!/usr/bin/env bash
set -eo pipefail

# 环境检测模块
source ./utils/os-checker.sh

# 安装日志记录
LOG_FILE="/var/log/capsulex-install.log"
exec > >(tee -a "$LOG_FILE") 2>&1

# 主安装流程
main() {
    check_root
    check_network
    install_docker
    install_compose
    deploy_capsulex
    enable_service
}

check_root() {
    if [ "$(id -u)" -ne 0 ]; then
        echo "❌ 必须使用root权限运行" >&2
        exit 1
    fi
}

check_network() {
    if ! curl -s --connect-timeout 5 https://hub.docker.com > /dev/null; then
        echo "❌ 网络连接异常，请检查网络配置"
        exit 1
    fi
}

install_docker() {
    if ! command -v docker &> /dev/null; then
        echo "🔧 开始安装Docker..."
        ./utils/docker-installer.sh
    else
        echo "ℹ️  Docker已安装：$(docker --version)"
    fi
}

install_compose() {
    if ! command -v docker-compose &> /dev/null; then
        echo "🔧 开始安装Docker Compose..."
        ./utils/compose-installer.sh
    else
        echo "ℹ️  Docker Compose已安装：$(docker-compose --version)"
    fi
}

deploy_capsulex() {
    echo "🚀 部署CapsuleX服务..."
    docker-compose -f /path/to/capsulex/docker-compose.yml up -d
}

enable_service() {
    echo "🛠️ 配置系统服务..."
    cp ./systemd/capsulex.service /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable --now capsulex
}

main