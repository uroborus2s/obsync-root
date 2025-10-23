# Docker Swarm 故障排查工具

## 概述

本目录包含用于诊断和修复 Docker Swarm 部署问题的工具和文档。

## 工具列表

### 1. diagnose-service.sh - 服务诊断脚本

自动化诊断脚本,用于检查服务状态、网络连接和 DNS 解析。

**使用方法**:

```bash
# 基本用法
./diagnose-service.sh [stack_name] [service_name] [network_name]

# 示例: 诊断 app-icalink 服务
./diagnose-service.sh obsync app-icalink obsync-overlay

# 使用默认参数
./diagnose-service.sh
```

**检查项目**:
- ✅ Stack 是否存在
- ✅ 服务是否存在
- ✅ 服务实例状态
- ✅ 服务副本数
- ✅ 网络配置
- ✅ Secret 配置
- ✅ DNS 解析
- ✅ 网络连接
- ✅ 服务日志

### 2. fix-dns-issue.md - DNS 问题修复指南

详细的故障排查和修复指南,包含:
- 问题诊断步骤
- 常见原因分析
- 解决方案
- 完整修复流程
- 预防措施

## 快速开始

### 当遇到 "ENOTFOUND" 错误时

```bash
# 1. 运行诊断脚本
cd /opt/obsync/swarm
chmod +x diagnose-service.sh
./diagnose-service.sh obsync app-icalink

# 2. 根据诊断结果,查看修复指南
cat fix-dns-issue.md

# 3. 执行相应的修复步骤
```

### 常见问题快速修复

#### 问题: 服务未启动 (0/3 副本)

```bash
# 查看失败原因
docker service ps obsync_app-icalink --no-trunc

# 查看日志
docker service logs obsync_app-icalink --tail 100

# 强制重启
docker service update --force obsync_app-icalink
```

#### 问题: Secret 缺失

```bash
# 检查 secret
docker secret ls | grep icalink_config

# 创建 secret (示例)
echo '{"web":{"port":3000}}' | docker secret create icalink_config -

# 重新部署
docker service update --force obsync_app-icalink
```

#### 问题: DNS 解析失败

```bash
# 测试 DNS
docker exec $(docker ps -q -f name=obsync_api-gateway | head -n 1) nslookup app-icalink

# 如果失败,检查网络
docker network inspect obsync_obsync-overlay

# 重新部署 stack
docker stack rm obsync
sleep 10
docker stack deploy -c stack.yml obsync
```

## 文件说明

```
swarm/
├── README-TROUBLESHOOTING.md    # 本文件
├── diagnose-service.sh          # 自动诊断脚本
├── fix-dns-issue.md            # DNS 问题修复指南
├── stack.yml                   # Swarm Stack 配置
├── create-secrets.sh           # Secret 创建脚本
└── setup-configs-simple.sh     # 配置部署脚本
```

## 最佳实践

### 1. 部署前检查

```bash
# 检查镜像是否存在
docker images | grep -E "app-icalink|app-icasync|stratix-gateway"

# 检查 secret 是否创建
docker secret ls

# 验证配置文件
docker stack config -c stack.yml
```

### 2. 部署后验证

```bash
# 等待服务启动
watch -n 2 'docker service ls'

# 运行诊断
./diagnose-service.sh obsync app-icalink
./diagnose-service.sh obsync app-icasync

# 检查日志
docker service logs obsync_api-gateway --tail 50
```

### 3. 监控和维护

```bash
# 定期检查服务状态
docker service ls

# 查看资源使用
docker stats --no-stream

# 清理未使用的资源
docker system prune -f
```

## 故障排查流程图

```
遇到错误
    ↓
运行 diagnose-service.sh
    ↓
检查诊断输出
    ├─ 服务不存在 → 检查部署配置 → 重新部署
    ├─ 副本数为 0 → 查看日志 → 修复配置/Secret → 重启服务
    ├─ DNS 解析失败 → 检查网络 → 重新部署 Stack
    └─ 连接失败 → 检查端口/健康检查 → 修复服务配置
```

## 获取帮助

### 收集诊断信息

```bash
# 生成完整诊断报告
{
  echo "=== 系统信息 ==="
  uname -a
  docker version
  docker info
  
  echo -e "\n=== Stack 信息 ==="
  docker stack ls
  docker stack ps obsync --no-trunc
  
  echo -e "\n=== 服务信息 ==="
  docker service ls
  
  echo -e "\n=== 网络信息 ==="
  docker network ls
  
  echo -e "\n=== Secret 信息 ==="
  docker secret ls
  
  echo -e "\n=== 诊断结果 ==="
  ./diagnose-service.sh obsync app-icalink
  
} > /tmp/swarm-full-diagnostic.log

cat /tmp/swarm-full-diagnostic.log
```

### 常用命令参考

```bash
# 查看服务
docker service ls
docker service ps <service_name>
docker service logs <service_name>
docker service inspect <service_name>

# 管理服务
docker service update <service_name>
docker service scale <service_name>=<replicas>
docker service rollback <service_name>

# 管理 Stack
docker stack ls
docker stack ps <stack_name>
docker stack services <stack_name>
docker stack rm <stack_name>

# 网络诊断
docker network ls
docker network inspect <network_name>

# Secret 管理
docker secret ls
docker secret inspect <secret_name>
docker secret create <name> <file>
docker secret rm <secret_name>
```

## 更新日志

- 2025-10-23: 创建诊断工具和修复指南
- 优化熔断器配置 (threshold: 5→15, timeout: 15s→30s)
- 增强错误日志,添加 DNS 解析失败的诊断信息

## 相关文档

- [Docker Swarm 官方文档](https://docs.docker.com/engine/swarm/)
- [Docker Service 命令参考](https://docs.docker.com/engine/reference/commandline/service/)
- [Docker Network 故障排查](https://docs.docker.com/network/troubleshoot/)

