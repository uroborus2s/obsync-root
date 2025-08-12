# 服务器信息更新摘要

## 🔄 更新概述

根据实际服务器信息，已更新所有相关配置文件，确保双服务器部署方案能够在新的网络环境中正常工作。

## 📋 服务器信息变更

### 原配置 → 新配置

| 项目 | 原配置 | 新配置 |
|------|--------|--------|
| **Server-1 SSH** | `ssh jlufe_10.128@kwps.jlufe.edu.cn` | `ssh ubuntu@jlufe_10.128` |
| **Server-1 内网IP** | 未明确指定 | `10.0.0.102` |
| **Server-2 SSH** | `ssh root@10.0.2.101` | `ssh ubuntu@jlufe_12.6` |
| **Server-2 内网IP** | `10.0.2.101` | `10.0.0.164` |
| **网络段** | `10.0.2.x` | `10.0.0.x` |

## 📁 已更新的文件列表

### 1. 部署脚本
- ✅ `scripts/deploy.sh`
  - 更新服务器连接信息
  - 修改健康检查验证地址

- ✅ `scripts/deploy-static.sh`
  - 更新服务器主机名和用户名

### 2. Nginx 配置文件
- ✅ `scripts/nginx/server-1-nginx.conf`
  - 更新所有上游服务器的备份实例IP地址
  - `10.0.2.101` → `10.0.0.164`

- ✅ `scripts/nginx/server-2-nginx.conf`
  - 更新 server_name
  - `10.0.2.101` → `10.0.0.164`

### 3. Docker Compose 配置
- ✅ `scripts/docker-compose.server-2.yml`
  - 更新健康检查服务的 PRIMARY_SERVER 环境变量
  - `10.0.2.100` → `10.0.0.102`

### 4. 环境配置文件
- ✅ `scripts/.env.example`
  - 更新备份服务器IP配置

- ✅ `scripts/healthcheck.sh`
  - 更新默认主服务器IP地址

### 5. 文档文件
- ✅ `scripts/README.md`
  - 更新健康检查示例命令

- ✅ `scripts/OPERATIONS.md`
  - 更新所有SSH连接示例
  - 更新服务器IP地址

- ✅ `scripts/QUICK_REFERENCE.md`
  - 更新快速检查命令
  - 更新服务器信息表格

## 🔧 关键配置变更详情

### Nginx 负载均衡配置
```nginx
# 原配置
server 10.0.2.101:8090 weight=1 max_fails=3 fail_timeout=30s backup;

# 新配置  
server 10.0.0.164:8090 weight=1 max_fails=3 fail_timeout=30s backup;
```

### SSH 连接配置
```bash
# 原配置
SERVER_1_USER="jlufe_10.128"
SERVER_2_HOST="10.0.2.101"
SERVER_2_USER="root"

# 新配置
SERVER_1_USER="ubuntu"
SERVER_2_HOST="jlufe_12.6"
SERVER_2_USER="ubuntu"
```

### 健康检查配置
```bash
# 原配置
PRIMARY_SERVER="10.0.2.100"

# 新配置
PRIMARY_SERVER="10.0.0.102"
```

## 🚀 部署验证命令

更新后的验证命令：

```bash
# 1. 检查主服务器连接
ssh ubuntu@jlufe_10.128 "echo 'Server-1 连接正常'"

# 2. 检查备份服务器连接
ssh ubuntu@jlufe_12.6 "echo 'Server-2 连接正常'"

# 3. 验证服务状态
curl -f https://kwps.jlufe.edu.cn/health
curl -f https://kwps.jlufe.edu.cn/api/health
curl -f http://10.0.0.164/status

# 4. 测试内网连通性
ssh ubuntu@jlufe_10.128 "ping -c 3 10.0.0.164"
ssh ubuntu@jlufe_12.6 "ping -c 3 10.0.0.102"
```

## 📊 网络架构图更新

```
用户访问
    ↓
kwps.jlufe.edu.cn (公网域名)
    ↓
Server-1 (jlufe_10.128)
内网IP: 10.0.0.102
    ↓ 负载均衡
┌─────────────────┐
│   主服务实例    │ ← 权重: 3
│ 172.20.0.20:8090│
│ 172.20.0.21:3002│  
│ 172.20.0.22:3001│
└─────────────────┘
    ↓ 故障转移
┌─────────────────┐
│   备份服务实例  │ ← 权重: 1 (backup)
│ 10.0.0.164:8090 │
│ 10.0.0.164:3002 │
│ 10.0.0.164:3001 │
└─────────────────┘
Server-2 (jlufe_12.6)
内网IP: 10.0.0.164
```

## ⚠️ 重要注意事项

1. **网络连通性**: 确保两台服务器之间的内网连通性
   ```bash
   # 在 Server-1 上测试
   ping 10.0.0.164
   
   # 在 Server-2 上测试  
   ping 10.0.0.102
   ```

2. **防火墙配置**: 确保必要端口开放
   ```bash
   # Server-1 需要开放的端口
   80, 443 (公网访问)
   8090, 3001, 3002 (内网访问)
   
   # Server-2 需要开放的端口
   80, 8090, 3001, 3002 (内网访问)
   ```

3. **SSH 密钥**: 确保部署机器能够无密码SSH到两台服务器
   ```bash
   # 测试SSH连接
   ssh ubuntu@jlufe_10.128 "whoami"
   ssh ubuntu@jlufe_12.6 "whoami"
   ```

4. **Docker 网络**: 容器内部仍使用 172.20.0.x 网段，无需修改

## 🔄 部署流程

更新后的部署流程保持不变：

```bash
# 1. 配置环境变量
cp scripts/.env.example scripts/.env
# 编辑 .env 文件

# 2. 执行部署
./scripts/deploy.sh

# 3. 部署静态文件
./scripts/deploy-static.sh

# 4. 验证部署
curl -f https://kwps.jlufe.edu.cn/health
```

## 📞 技术支持

如果在部署过程中遇到问题，请检查：

1. **网络连通性**: 服务器间是否能正常通信
2. **SSH 权限**: 是否能无密码登录到两台服务器
3. **端口开放**: 防火墙是否正确配置
4. **DNS 解析**: 域名是否正确解析到 Server-1

---

*更新完成时间: 2024年8月11日*  
*更新版本: v2.0*
