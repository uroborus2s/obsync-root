#!/usr/bin/env bash

install_docker() {
    case "$OS_TYPE" in
        "ubuntu")
            apt-get remove -y docker docker-engine docker.io containerd runc
            apt-get update
            apt-get install -y \
                ca-certificates \
                curl \
                gnupg \
                lsb-release
            mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            echo \
              "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
              $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
        "centos")
            yum remove -y docker \
                docker-client \
                docker-client-latest \
                docker-common \
                docker-latest \
                docker-latest-logrotate \
                docker-logrotate \
                docker-engine
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            systemctl start docker
            ;;
        *)
            echo "不支持的操作系统：$OS_TYPE"
            exit 1
            ;;
    esac

    # 验证安装
    if ! docker --version; then
        echo "❌ Docker安装失败"
        exit 1
    fi
}

# 执行安装
install_docker