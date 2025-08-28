# 服务器环境配置指南

## 📋 服务器规格

### 主服务器 (120.131.12.6)
- **角色**：前端静态资源服务 + API网关负载均衡 + 后端服务实例
- **SSH访问**：`ssh jlufe_12.6`
- **软件要求**：Nginx + Docker
- **域名绑定**：kwps.jlufe.edu.cn

### 备用服务器 (120.131.10.128)
- **角色**：后端服务实例 + API网关实例 + MySQL代理服务
- **SSH访问**：`ssh jlufe_10.128`
- **软件要求**：Nginx + Docker
- **网络**：内网通信 + MySQL代理

## 🔧 基础环境配置

### 1. 系统更新和基础软件安装

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl wget git vim htop tree unzip

# 安装网络工具
sudo apt install -y net-tools iptables-persistent

# 创建应用目录
sudo mkdir -p /opt/obsync
sudo chown $USER:$USER /opt/obsync
```

### 2. Docker 环境配置

#### 安装 Docker Engine

```bash
# 卸载旧版本
sudo apt remove docker docker-engine docker.io containerd runc

# 安装依赖
sudo apt install -y apt-transport-https ca-certificates gnupg lsb-release

# 添加 Docker 官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加 Docker 仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动并启用 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER
```

#### 配置 Docker

```bash
# 创建 Docker 配置目录
sudo mkdir -p /etc/docker

# 配置 Docker daemon
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "10"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "userland-proxy": false,
  "experimental": false,
  "metrics-addr": "127.0.0.1:9323",
  "default-address-pools": [
    {
      "base": "172.20.0.0/16",
      "size": 24
    }
  ]
}
EOF

# 重启 Docker 服务
sudo systemctl restart docker

# 验证 Docker 安装
docker --version
docker compose version
```

### 3. Nginx 配置 (主服务器和备用服务器)

#### 安装 Nginx (两台服务器都需要)

```bash
# 安装 Nginx
sudo apt install -y nginx

# 启动并启用 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证 Nginx 状态
sudo systemctl status nginx
```

#### 创建目录结构

```bash
# 创建静态文件目录
sudo mkdir -p /var/www/agendaedu-web
sudo mkdir -p /var/www/agendaedu-app
sudo mkdir -p /var/www/error-pages

# 创建 SSL 证书目录
sudo mkdir -p /etc/nginx/ssl

# 创建日志目录
sudo mkdir -p /var/log/nginx

# 设置权限
sudo chown -R www-data:www-data /var/www
sudo chmod -R 755 /var/www
```

#### 配置 SSL 证书

```bash
# 复制 SSL 证书文件
sudo cp /path/to/STAR_jlufe_edu_cn.pem /etc/nginx/ssl/
sudo cp /path/to/STAR_jlufe_edu_cn.key /etc/nginx/ssl/

# 设置证书权限
sudo chmod 644 /etc/nginx/ssl/STAR_jlufe_edu_cn.pem
sudo chmod 600 /etc/nginx/ssl/STAR_jlufe_edu_cn.key
sudo chown root:root /etc/nginx/ssl/*
```

## 🔒 安全配置

### 1. 防火墙配置

#### 主服务器防火墙

```bash
# 重置 iptables 规则
sudo iptables -F
sudo iptables -X
sudo iptables -t nat -F
sudo iptables -t nat -X

# 设置默认策略
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT

# 允许本地回环
sudo iptables -A INPUT -i lo -j ACCEPT

# 允许已建立的连接
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# 允许 SSH (端口 22)
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 允许 HTTP (端口 80)
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# 允许 HTTPS (端口 443)
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 允许内网访问 API Gateway (端口 8090)
sudo iptables -A INPUT -p tcp -s 120.131.10.128 --dport 8090 -j ACCEPT

# 保存规则
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

#### 备用服务器防火墙

```bash
# 重置 iptables 规则
sudo iptables -F
sudo iptables -X
sudo iptables -t nat -F
sudo iptables -t nat -X

# 设置默认策略
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT

# 允许本地回环
sudo iptables -A INPUT -i lo -j ACCEPT

# 允许已建立的连接
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# 允许 SSH (端口 22)
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 允许主服务器访问 API Gateway (端口 8090)
sudo iptables -A INPUT -p tcp -s 120.131.12.6 --dport 8090 -j ACCEPT

# 保存规则
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

### 2. 系统安全加固

```bash
# 禁用不必要的服务
sudo systemctl disable bluetooth
sudo systemctl disable cups
sudo systemctl disable avahi-daemon

# 配置 SSH 安全
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
sudo tee -a /etc/ssh/sshd_config > /dev/null <<EOF

# ObSync 安全配置
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

# 重启 SSH 服务
sudo systemctl restart sshd
```

## 📁 目录结构创建

```bash
# 创建应用部署目录
mkdir -p /opt/obsync/{deploy,logs,backups,scripts}

# 创建 Docker 数据目录
mkdir -p /opt/obsync/data/{nginx,app-logs}

# 设置权限
sudo chown -R $USER:docker /opt/obsync
chmod -R 755 /opt/obsync
```

## 🔍 环境验证

### 验证 Docker 环境

```bash
# 测试 Docker 运行
docker run --rm hello-world

# 检查 Docker 网络
docker network ls

# 验证 Docker Compose
docker compose version
```

### 验证 Nginx 环境 (主服务器)

```bash
# 检查 Nginx 配置语法
sudo nginx -t

# 查看 Nginx 状态
sudo systemctl status nginx

# 测试 HTTP 访问
curl -I http://localhost
```

### 验证网络连通性

```bash
# 主服务器到备用服务器
ping -c 4 120.131.10.128

# 备用服务器到主服务器
ping -c 4 120.131.12.6

# 检查端口监听
sudo netstat -tlnp | grep -E ':(22|80|443|8090)'
```

## 📝 配置文件模板

### Docker Compose 环境变量

```bash
# 创建环境变量文件
cat > /opt/obsync/.env <<EOF
# 服务器标识
SERVER_ID=server-1  # 或 server-2
SERVER_ROLE=primary  # 或 secondary

# 网络配置
DOCKER_NETWORK_SUBNET=172.20.0.0/16
API_GATEWAY_IP=172.20.0.20
ICASYNC_IP=172.20.0.22
ICALINK_IP=172.20.0.21

# 日志配置
LOG_LEVEL=info
LOG_MAX_SIZE=100m
LOG_MAX_FILES=20

# 健康检查配置
HEALTH_CHECK_INTERVAL=300s
HEALTH_CHECK_TIMEOUT=10s
HEALTH_CHECK_RETRIES=3
EOF
```

## ⚠️ 注意事项

1. **证书管理**：定期检查 SSL 证书有效期，配置自动续期
2. **系统更新**：定期更新系统和 Docker 版本
3. **备份策略**：配置定期备份重要配置文件
4. **监控配置**：安装系统监控工具（如 htop, iotop）
5. **日志轮转**：配置系统日志轮转，防止磁盘空间不足

## 🔄 下一步

完成服务器环境配置后，请继续：
1. [Nginx 配置说明](./nginx-config.md)
2. [Docker 部署指南](./docker-deployment.md)
3. [安全配置指南](./security-config.md)
