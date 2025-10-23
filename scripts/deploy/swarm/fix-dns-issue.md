# Docker Swarm DNS 解析问题修复指南

## 问题描述

错误信息: `getaddrinfo ENOTFOUND app-icalink`

这表示 Docker Swarm 网络无法解析 `app-icalink` 主机名,导致 API Gateway 无法连接到 app-icalink 服务。

## 快速诊断

### 1. 运行诊断脚本

```bash
cd /opt/obsync/swarm
chmod +x diagnose-service.sh
./diagnose-service.sh obsync app-icalink obsync-overlay
```

### 2. 手动检查步骤

```bash
# 检查所有服务状态
docker service ls

# 检查 app-icalink 服务
docker service ps obsync_app-icalink --no-trunc

# 查看服务日志
docker service logs obsync_app-icalink --tail 100

# 检查 secret
docker secret ls | grep icalink

# 测试 DNS 解析
docker exec $(docker ps -q -f name=obsync_api-gateway | head -n 1) nslookup app-icalink
```

## 常见原因和解决方案

### 原因 1: app-icalink 服务未启动

**症状**: `docker service ls` 显示 app-icalink 副本数为 0/3

**解决方案**:

```bash
# 查看服务失败原因
docker service ps obsync_app-icalink --no-trunc

# 查看详细日志
docker service logs obsync_app-icalink --tail 100

# 常见问题:
# - 镜像不存在: 需要先构建和推送镜像
# - Secret 缺失: 需要创建 icalink_config secret
# - 资源不足: 检查节点资源
```

### 原因 2: Secret 配置缺失

**症状**: 服务日志显示无法读取 `/run/secrets/icalink_config`

**解决方案**:

```bash
# 检查 secret 是否存在
docker secret ls | grep icalink_config

# 如果不存在,创建 secret
# 方法1: 从文件创建
docker secret create icalink_config /path/to/config.json

# 方法2: 从标准输入创建
echo '{"web":{"port":3000},...}' | docker secret create icalink_config -

# 重新部署服务
docker service update --force obsync_app-icalink
```

### 原因 3: 镜像不存在或拉取失败

**症状**: 服务日志显示 "image not found" 或 "pull access denied"

**解决方案**:

```bash
# 检查镜像是否存在
docker images | grep app-icalink

# 如果镜像不存在,需要构建和推送
cd /path/to/obsync-root
pnpm run build @wps/app-icalink

# 推送镜像到仓库
docker push g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icalink:v1.0.0

# 重新部署
docker stack deploy -c /opt/obsync/swarm/stack.yml obsync
```

### 原因 4: 网络配置问题

**症状**: 服务运行正常,但 DNS 解析失败

**解决方案**:

```bash
# 检查网络
docker network ls | grep obsync

# 检查服务是否在正确的网络中
docker network inspect obsync_obsync-overlay

# 重启 Docker 服务 (谨慎操作)
sudo systemctl restart docker

# 重新部署 stack
docker stack rm obsync
sleep 10
docker stack deploy -c /opt/obsync/swarm/stack.yml obsync
```

### 原因 5: 熔断器过早触发

**症状**: 服务正常,但 API Gateway 仍然报错 "服务暂时不可用"

**说明**: 
- 熔断器在 5 次失败后打开
- 在 Swarm 环境中,服务启动可能需要时间
- 已优化熔断器配置: threshold=15, timeout=30s, resetTimeout=30s

**解决方案**:

```bash
# 重启 API Gateway 服务,重置熔断器
docker service update --force obsync_api-gateway

# 或者等待 30 秒让熔断器自动恢复
```

## 完整修复流程

### 步骤 1: 检查服务状态

```bash
# 查看所有服务
docker service ls

# 预期输出应该包含:
# obsync_api-gateway    3/3
# obsync_app-icasync    3/3
# obsync_app-icalink    3/3  <-- 检查这个
```

### 步骤 2: 如果 app-icalink 未运行

```bash
# 查看失败原因
docker service ps obsync_app-icalink --no-trunc

# 查看日志
docker service logs obsync_app-icalink --tail 50
```

### 步骤 3: 检查并创建 Secret

```bash
# 检查 secret
docker secret ls | grep icalink_config

# 如果不存在,创建 secret (替换为实际配置)
cat > /tmp/icalink-config.json << 'EOF'
{
  "web": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "databases": {
    "default": {
      "host": "10.0.2.100",
      "port": 3306,
      "user": "admin",
      "password": "your-password",
      "database": "icasync"
    }
  },
  "redis": {
    "host": "10.0.2.212",
    "port": 6379
  }
}
EOF

docker secret create icalink_config /tmp/icalink-config.json
rm /tmp/icalink-config.json
```

### 步骤 4: 重新部署服务

```bash
# 强制更新服务
docker service update --force obsync_app-icalink

# 或者重新部署整个 stack
docker stack deploy -c /opt/obsync/swarm/stack.yml obsync
```

### 步骤 5: 验证修复

```bash
# 等待服务启动 (约 30-60 秒)
watch -n 2 'docker service ls'

# 测试 DNS 解析
docker exec $(docker ps -q -f name=obsync_api-gateway | head -n 1) nslookup app-icalink

# 测试 HTTP 连接
docker exec $(docker ps -q -f name=obsync_api-gateway | head -n 1) wget --spider http://app-icalink:3000/health

# 查看 API Gateway 日志,确认不再报错
docker service logs obsync_api-gateway --tail 20 --follow
```

## 预防措施

### 1. 确保服务启动顺序

虽然 Swarm 不支持 `depends_on`,但可以通过健康检查确保服务就绪:

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s  # 给服务 60 秒启动时间
```

### 2. 优化熔断器配置

已在代码中优化:
- threshold: 15 (更高的失败容忍度)
- timeout: 30000 (更长的超时时间)
- resetTimeout: 30000 (更长的恢复时间)

### 3. 监控服务健康

```bash
# 定期检查服务状态
docker service ls

# 设置告警 (可选)
# 使用 Prometheus + Alertmanager 监控服务状态
```

## 联系支持

如果问题仍然存在,请提供以下信息:

```bash
# 收集诊断信息
{
  echo "=== 服务列表 ==="
  docker service ls
  
  echo -e "\n=== app-icalink 服务状态 ==="
  docker service ps obsync_app-icalink --no-trunc
  
  echo -e "\n=== app-icalink 服务日志 ==="
  docker service logs obsync_app-icalink --tail 100
  
  echo -e "\n=== Secret 列表 ==="
  docker secret ls
  
  echo -e "\n=== 网络信息 ==="
  docker network ls
  docker network inspect obsync_obsync-overlay
  
  echo -e "\n=== API Gateway 日志 ==="
  docker service logs obsync_api-gateway --tail 50
} > /tmp/swarm-diagnostic.log

# 发送 /tmp/swarm-diagnostic.log 文件
```

