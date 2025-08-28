# Docker 容器部署指南

## 📋 部署架构

ObSync 系统采用 Docker 容器化部署，确保环境一致性和快速部署。每台服务器运行相同的容器组合，通过 Nginx 负载均衡实现高可用。

## 🏗️ 网络架构设计

### 安全的端口绑定策略

为了确保安全性，所有 Docker 容器都只绑定到 `localhost`，不直接暴露给外网：

```
外部请求 → Nginx (443/80) → localhost:8090 → Docker 容器
```

**设计原则**：
1. **主服务器安全**：主服务器容器只绑定到 127.0.0.1
2. **备用服务器可达**：备用服务器 API Gateway 暴露 8090 端口供主服务器访问
3. **MySQL 代理隔离**：备用服务器的 MySQL 代理通过 Nginx Stream 模块处理
4. **分层安全**：不同服务使用不同的安全策略

### 端口暴露策略

**主服务器**：
- API Gateway: `127.0.0.1:8090:8090` (仅本地访问)
- 其他服务: `127.0.0.1:port:port` (仅本地访问)

**备用服务器**：
- API Gateway: `8090:8090` (供主服务器负载均衡访问)
- 其他服务: `127.0.0.1:port:port` (仅本地访问)
- MySQL 代理: 通过 Nginx Stream 模块处理

这种设计平衡了安全性和性能：
- 主服务器完全隔离，所有访问通过 Nginx
- 备用服务器的 API Gateway 可被主服务器直接访问，减少转发层次
- MySQL 代理独立处理，不影响 API 服务

### 容器组件

| 服务名称 | 容器名称 | 端口映射 | 网络地址 | 功能描述 |
|---------|----------|----------|----------|----------|
| api-gateway | stratix-gateway-s1/s2 | 8090:8090 | 172.20.0.20 | API网关服务 |
| app-icasync | obsync-app-icasync-s1/s2 | 3001:3000 | 172.20.0.22 | 课程同步服务 |
| app-icalink | obsync-app-icalink-s1/s2 | 3002:3002 | 172.20.0.21 | 签到服务(待启用) |

## 🔧 Docker Compose 配置

### 主服务器配置 (Server-1)

基于现有的 `scripts/deploy/docker-compose.yml` 文件，主要配置包括：

#### 网络配置
```yaml
networks:
  obsync-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

#### 数据卷配置
```yaml
volumes:
  nginx_logs:
    driver: local
  app_logs:
    driver: local
```

#### API Gateway 服务 (统一认证 + 内部负载均衡)
```yaml
# API Gateway 实例 1 (主)
api-gateway-1:
  image: g-rrng9518-docker.pkg.coding.net/obsync/sync/stratix-gateway:latest
  container_name: stratix-gateway-1-s1
  restart: unless-stopped
  ports:
    - "127.0.0.1:8090:8090"
  environment:
    NODE_ENV: production
    TZ: Asia/Shanghai
    # 实例标识
    INSTANCE_ID: gateway-1
    INSTANCE_NAME: "API Gateway Instance 1"
    INSTANCE_ROLE: primary
    # 后端服务配置
    ICALINK_UPSTREAM_SERVERS: "localhost:3002,localhost:3003,localhost:3004"
    ICASYNC_UPSTREAM_SERVERS: "localhost:3001"
    # 跨服务器实例配置
    REMOTE_ICALINK_SERVERS: "120.131.10.128:3002,120.131.10.128:3003"
    REMOTE_ICASYNC_SERVERS: "120.131.10.128:3001"
    # 负载均衡策略
    ICALINK_LB_STRATEGY: weighted_round_robin
    ICASYNC_LB_STRATEGY: round_robin
    # 加密配置
    STRATIX_SENSITIVE_CONFIG: ${GATEWAY_SENSITIVE_CONFIG}
  networks:
    obsync-network:
      ipv4_address: 172.20.0.20
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8090/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
  depends_on:
    - app-icalink-1
    - app-icalink-2
    - app-icalink-3
    - app-icasync

# API Gateway 实例 2 (备) - 高可用配置
api-gateway-2:
  image: g-rrng9518-docker.pkg.coding.net/obsync/sync/stratix-gateway:latest
  container_name: stratix-gateway-2-s1
  restart: unless-stopped
  ports:
    - "127.0.0.1:8091:8090"
  environment:
    NODE_ENV: production
    TZ: Asia/Shanghai
    # 实例标识
    INSTANCE_ID: gateway-2
    INSTANCE_NAME: "API Gateway Instance 2"
    INSTANCE_ROLE: secondary
    # 后端服务配置 (与主实例相同)
    ICALINK_UPSTREAM_SERVERS: "localhost:3002,localhost:3003,localhost:3004"
    ICASYNC_UPSTREAM_SERVERS: "localhost:3001"
    # 跨服务器实例配置
    REMOTE_ICALINK_SERVERS: "120.131.10.128:3002,120.131.10.128:3003"
    REMOTE_ICASYNC_SERVERS: "120.131.10.128:3001"
    # 负载均衡策略
    ICALINK_LB_STRATEGY: weighted_round_robin
    ICASYNC_LB_STRATEGY: round_robin
    # 加密配置
    STRATIX_SENSITIVE_CONFIG: ${GATEWAY_SENSITIVE_CONFIG}
  networks:
    obsync-network:
      ipv4_address: 172.20.0.21
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8090/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
  depends_on:
    - app-icalink-1
    - app-icalink-2
    - app-icalink-3
    - app-icasync
```

#### ICA Sync 服务
```yaml
app-icasync:
  image: g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icasync:latest
  container_name: obsync-app-icasync-s1
  restart: unless-stopped
  ports:
    - "127.0.0.1:3001:3000"  # 只绑定到 localhost，通过 API Gateway 访问
  environment:
    NODE_ENV: production
    TZ: Asia/Shanghai
    STRATIX_SENSITIVE_CONFIG: ${ICASYNC_SENSITIVE_CONFIG}
  networks:
    obsync-network:
      ipv4_address: 172.20.0.22
```

#### ICA Link 多实例服务
```yaml
# ICA Link 实例 1
app-icalink-1:
  image: g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icalink:latest
  container_name: obsync-app-icalink-1-s1
  restart: unless-stopped
  ports:
    - "127.0.0.1:3002:3002"
  environment:
    NODE_ENV: production
    TZ: Asia/Shanghai
    PORT: 3002
    HOST: 0.0.0.0
    # 实例标识
    INSTANCE_ID: icalink-1
    INSTANCE_NAME: "ICA Link Instance 1"
    # 集群配置
    CLUSTER_MODE: enabled
    CLUSTER_INSTANCE_ID: 1
    CLUSTER_TOTAL_INSTANCES: 3
    # 加密配置
    STRATIX_SENSITIVE_CONFIG: ${ICALINK_SENSITIVE_CONFIG}
  networks:
    obsync-network:
      ipv4_address: 172.20.0.31
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3002/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 1G
      reservations:
        cpus: '0.2'
        memory: 256M

# ICA Link 实例 2
app-icalink-2:
  image: g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icalink:latest
  container_name: obsync-app-icalink-2-s1
  restart: unless-stopped
  ports:
    - "127.0.0.1:3003:3002"
  environment:
    NODE_ENV: production
    TZ: Asia/Shanghai
    PORT: 3002
    HOST: 0.0.0.0
    # 实例标识
    INSTANCE_ID: icalink-2
    INSTANCE_NAME: "ICA Link Instance 2"
    # 集群配置
    CLUSTER_MODE: enabled
    CLUSTER_INSTANCE_ID: 2
    CLUSTER_TOTAL_INSTANCES: 3
    # 加密配置
    STRATIX_SENSITIVE_CONFIG: ${ICALINK_SENSITIVE_CONFIG}
  networks:
    obsync-network:
      ipv4_address: 172.20.0.32
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3002/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 1G
      reservations:
        cpus: '0.2'
        memory: 256M

# ICA Link 实例 3
app-icalink-3:
  image: g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icalink:latest
  container_name: obsync-app-icalink-3-s1
  restart: unless-stopped
  ports:
    - "127.0.0.1:3004:3002"
  environment:
    NODE_ENV: production
    TZ: Asia/Shanghai
    PORT: 3002
    HOST: 0.0.0.0
    # 实例标识
    INSTANCE_ID: icalink-3
    INSTANCE_NAME: "ICA Link Instance 3"
    # 集群配置
    CLUSTER_MODE: enabled
    CLUSTER_INSTANCE_ID: 3
    CLUSTER_TOTAL_INSTANCES: 3
    # 加密配置
    STRATIX_SENSITIVE_CONFIG: ${ICALINK_SENSITIVE_CONFIG}
  networks:
    obsync-network:
      ipv4_address: 172.20.0.33
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3002/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 1G
      reservations:
        cpus: '0.2'
        memory: 256M
```

### 备用服务器配置 (Server-2)

需要创建 `docker-compose.server-2.yml` 文件，配置与主服务器类似，但容器名称和服务器标识不同：

```yaml
# Server-2 备用服务器 Docker Compose 配置
version: '3.8'

networks:
  obsync-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  app_logs:
    driver: local

services:
  api-gateway:
    image: g-rrng9518-docker.pkg.coding.net/obsync/sync/stratix-gateway:latest
    container_name: stratix-gateway-s2
    restart: unless-stopped
    ports:
      - "8090:8090"  # 暴露给主服务器访问，用于负载均衡
    environment:
      NODE_ENV: production
      TZ: Asia/Shanghai
      SERVER_ID: server-2
      SERVER_ROLE: secondary
      STRATIX_SENSITIVE_CONFIG: ${GATEWAY_SENSITIVE_CONFIG}
    networks:
      obsync-network:
        ipv4_address: 172.20.0.20
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8090/health"]
      interval: 300s
      timeout: 10s
      retries: 3
      start_period: 60s

  app-icasync:
    image: g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icasync:latest
    container_name: obsync-app-icasync-s2
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3000"  # 只绑定到 localhost，通过 API Gateway 访问
    environment:
      NODE_ENV: production
      TZ: Asia/Shanghai
      SERVER_ID: server-2
      STRATIX_SENSITIVE_CONFIG: ${ICASYNC_SENSITIVE_CONFIG}
    networks:
      obsync-network:
        ipv4_address: 172.20.0.22

  # ICA Link 实例 1 (备用服务器)
  app-icalink-1:
    image: g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icalink:latest
    container_name: obsync-app-icalink-1-s2
    restart: unless-stopped
    ports:
      - "127.0.0.1:3002:3002"
    environment:
      NODE_ENV: production
      TZ: Asia/Shanghai
      PORT: 3002
      HOST: 0.0.0.0
      SERVER_ID: server-2
      # 实例标识
      INSTANCE_ID: icalink-1-s2
      INSTANCE_NAME: "ICA Link Instance 1 Server 2"
      # 集群配置
      CLUSTER_MODE: enabled
      CLUSTER_INSTANCE_ID: 4  # 全局实例编号
      CLUSTER_TOTAL_INSTANCES: 5  # 总实例数 (主服务器3个 + 备用服务器2个)
      # 加密配置
      STRATIX_SENSITIVE_CONFIG: ${ICALINK_SENSITIVE_CONFIG}
    networks:
      obsync-network:
        ipv4_address: 172.20.0.31
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # ICA Link 实例 2 (备用服务器)
  app-icalink-2:
    image: g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icalink:latest
    container_name: obsync-app-icalink-2-s2
    restart: unless-stopped
    ports:
      - "127.0.0.1:3003:3002"
    environment:
      NODE_ENV: production
      TZ: Asia/Shanghai
      PORT: 3002
      HOST: 0.0.0.0
      SERVER_ID: server-2
      # 实例标识
      INSTANCE_ID: icalink-2-s2
      INSTANCE_NAME: "ICA Link Instance 2 Server 2"
      # 集群配置
      CLUSTER_MODE: enabled
      CLUSTER_INSTANCE_ID: 5  # 全局实例编号
      CLUSTER_TOTAL_INSTANCES: 5  # 总实例数
      # 加密配置
      STRATIX_SENSITIVE_CONFIG: ${ICALINK_SENSITIVE_CONFIG}
    networks:
      obsync-network:
        ipv4_address: 172.20.0.32
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

## 🔐 环境变量配置

### 敏感配置管理

系统使用加密的 `STRATIX_SENSITIVE_CONFIG` 环境变量存储敏感信息，包括：
- 数据库连接信息
- API 密钥和证书
- JWT 密钥
- 第三方服务配置

### 环境变量文件

创建 `/opt/obsync/.env` 文件：

```bash
# 服务器标识
SERVER_ID=server-1  # 或 server-2
SERVER_ROLE=primary  # 或 secondary

# Docker 镜像版本
GATEWAY_IMAGE_TAG=latest
ICASYNC_IMAGE_TAG=latest
ICALINK_IMAGE_TAG=latest

# 网络配置
DOCKER_NETWORK_SUBNET=172.20.0.0/16
API_GATEWAY_IP=172.20.0.20
ICASYNC_IP=172.20.0.22
ICALINK_IP=172.20.0.21

# 端口配置
API_GATEWAY_PORT=8090
ICASYNC_PORT=3001
ICALINK_PORT_1=3002
ICALINK_PORT_2=3003
ICALINK_PORT_3=3004

# ICA Link 多实例配置
ICALINK_INSTANCES=3
ICALINK_CLUSTER_MODE=enabled
ICALINK_LOAD_BALANCING=weighted_round_robin

# 资源限制
API_GATEWAY_CPU_LIMIT=2.0
API_GATEWAY_MEMORY_LIMIT=2G
ICASYNC_CPU_LIMIT=2.0
ICASYNC_MEMORY_LIMIT=4G

# 日志配置
LOG_LEVEL=info
LOG_MAX_SIZE=100m
LOG_MAX_FILES=20

# 健康检查配置
HEALTH_CHECK_INTERVAL=300s
HEALTH_CHECK_TIMEOUT=10s
HEALTH_CHECK_RETRIES=3

# 加密配置 (从安全存储获取)
GATEWAY_SENSITIVE_CONFIG=${GATEWAY_SENSITIVE_CONFIG}
ICASYNC_SENSITIVE_CONFIG=${ICASYNC_SENSITIVE_CONFIG}
ICALINK_SENSITIVE_CONFIG=${ICALINK_SENSITIVE_CONFIG}
```

## 🚀 部署脚本

### 主服务器部署脚本

创建 `/opt/obsync/scripts/deploy-server-1.sh`：

```bash
#!/bin/bash

# 主服务器部署脚本
set -e

DEPLOY_DIR="/opt/obsync"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"
ENV_FILE="$DEPLOY_DIR/.env"

echo "=== ObSync 主服务器部署开始 ==="

# 检查环境
if [ ! -f "$ENV_FILE" ]; then
    echo "错误: 环境变量文件不存在: $ENV_FILE"
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "错误: Docker Compose 文件不存在: $COMPOSE_FILE"
    exit 1
fi

# 加载环境变量
source "$ENV_FILE"

# 拉取最新镜像
echo "拉取最新 Docker 镜像..."
docker compose -f "$COMPOSE_FILE" pull

# 停止现有服务
echo "停止现有服务..."
docker compose -f "$COMPOSE_FILE" down

# 清理未使用的镜像
echo "清理未使用的镜像..."
docker image prune -f

# 启动服务
echo "启动服务..."
docker compose -f "$COMPOSE_FILE" up -d

# 等待服务启动
echo "等待服务启动..."
sleep 30

# 检查服务状态
echo "检查服务状态..."
docker compose -f "$COMPOSE_FILE" ps

# 健康检查
echo "执行健康检查..."
for service in api-gateway app-icasync; do
    echo "检查 $service 服务..."
    if docker compose -f "$COMPOSE_FILE" exec -T "$service" wget --spider -q http://localhost:8090/health 2>/dev/null; then
        echo "✅ $service 服务正常"
    else
        echo "❌ $service 服务异常"
    fi
done

echo "=== 主服务器部署完成 ==="
```

### 备用服务器部署脚本

创建 `/opt/obsync/scripts/deploy-server-2.sh`：

```bash
#!/bin/bash

# 备用服务器部署脚本
set -e

DEPLOY_DIR="/opt/obsync"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.server-2.yml"
ENV_FILE="$DEPLOY_DIR/.env"

echo "=== ObSync 备用服务器部署开始 ==="

# 检查环境
if [ ! -f "$ENV_FILE" ]; then
    echo "错误: 环境变量文件不存在: $ENV_FILE"
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "错误: Docker Compose 文件不存在: $COMPOSE_FILE"
    exit 1
fi

# 加载环境变量
source "$ENV_FILE"

# 设置服务器标识
export SERVER_ID=server-2
export SERVER_ROLE=secondary

# 拉取最新镜像
echo "拉取最新 Docker 镜像..."
docker compose -f "$COMPOSE_FILE" pull

# 停止现有服务
echo "停止现有服务..."
docker compose -f "$COMPOSE_FILE" down

# 清理未使用的镜像
echo "清理未使用的镜像..."
docker image prune -f

# 启动服务
echo "启动服务..."
docker compose -f "$COMPOSE_FILE" up -d

# 等待服务启动
echo "等待服务启动..."
sleep 30

# 检查服务状态
echo "检查服务状态..."
docker compose -f "$COMPOSE_FILE" ps

echo "=== 备用服务器部署完成 ==="
```

## 📊 容器管理命令

### 日常管理

```bash
# 查看所有容器状态
docker compose ps

# 查看容器日志
docker compose logs -f api-gateway
docker compose logs -f app-icasync

# 重启特定服务
docker compose restart api-gateway

# 更新服务
docker compose pull
docker compose up -d

# 进入容器调试
docker compose exec api-gateway bash
```

### 监控命令

```bash
# 查看容器资源使用
docker stats

# 查看容器详细信息
docker inspect stratix-gateway-s1

# 查看网络信息
docker network ls
docker network inspect obsync_obsync-network
```

## 🔍 故障排查

### 常见问题

1. **容器启动失败**
   ```bash
   # 查看详细日志
   docker compose logs api-gateway
   
   # 检查配置文件
   docker compose config
   ```

2. **网络连接问题**
   ```bash
   # 测试容器间连通性
   docker compose exec api-gateway ping app-icasync
   
   # 检查端口监听
   docker compose exec api-gateway netstat -tlnp
   ```

3. **健康检查失败**
   ```bash
   # 手动执行健康检查
   docker compose exec api-gateway wget --spider http://localhost:8090/health
   
   # 查看健康检查日志
   docker inspect stratix-gateway-s1 | grep -A 10 Health
   ```

## 🔄 下一步

完成 Docker 部署后，请继续：
1. [安全配置指南](./security-config.md)
2. [监控配置](./monitoring.md)
3. [部署验证](./verification.md)
