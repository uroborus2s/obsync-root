# 快速参考卡片

## 🚀 快速部署

```bash
# 一键部署到双服务器
./scripts/deploy.sh

# 部署静态文件
./scripts/deploy-static.sh
```

## 🔍 快速检查

```bash
# 检查服务状态
curl -f https://kwps.jlufe.edu.cn/health
curl -f https://kwps.jlufe.edu.cn/api/health
curl -f http://10.0.0.164/status

# 检查容器状态
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml ps
```

## 🛠️ 常用命令

### 服务管理
```bash
# 重启所有服务
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml restart

# 重启特定服务
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml restart api-gateway

# 查看日志
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml logs -f api-gateway
```

### Nginx 管理
```bash
# 测试配置
sudo nginx -t

# 重载配置
sudo systemctl reload nginx

# 重启 Nginx
sudo systemctl restart nginx
```

## 📊 监控命令

```bash
# 系统资源
htop
df -h
free -h

# Docker 资源
sudo docker stats

# 网络连接
sudo netstat -tlnp
```

## 🚨 紧急处理

### 服务不可访问
```bash
# 1. 检查 Nginx
sudo systemctl status nginx
sudo nginx -t

# 2. 检查容器
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml ps

# 3. 重启服务
sudo systemctl restart nginx
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml restart
```

### 磁盘空间不足
```bash
# 清理日志
sudo find /var/log -name "*.log" -mtime +7 -delete

# 清理 Docker
sudo docker system prune -f

# 手动日志轮转
sudo logrotate -f /etc/logrotate.conf
```

### 内存不足
```bash
# 检查内存使用
free -h
sudo docker stats --no-stream

# 清理缓存
sudo sync && echo 3 | sudo tee /proc/sys/vm/drop_caches

# 重启高内存使用容器
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml restart <service>
```

## 🔧 配置文件位置

```
/opt/obsync/                          # 部署目录
├── docker-compose.server-1.yml       # Server-1 配置
├── docker-compose.server-2.yml       # Server-2 配置
└── nginx/
    ├── server-1-nginx.conf           # Server-1 Nginx 配置
    └── server-2-nginx.conf           # Server-2 Nginx 配置

/etc/nginx/
├── sites-available/obsync            # Nginx 站点配置
└── ssl/                              # SSL 证书目录

/var/www/
├── agendaedu-web/                    # Web 应用静态文件
└── agendaedu-app/                    # 移动应用静态文件
```

## 🌐 访问地址

- **主站点**: https://kwps.jlufe.edu.cn/
- **Web 管理后台**: https://kwps.jlufe.edu.cn/web/
- **移动端应用**: https://kwps.jlufe.edu.cn/app/
- **API 网关**: https://kwps.jlufe.edu.cn/api/
- **签到服务**: https://kwps.jlufe.edu.cn/api/icalink/
- **同步服务**: https://kwps.jlufe.edu.cn/api/icasync/
- **健康检查**: https://kwps.jlufe.edu.cn/health
- **Server-2 状态**: http://10.0.0.164/status

## 📱 服务端口

| 服务 | 端口 | 描述 |
|------|------|------|
| Nginx | 80/443 | Web 服务器 |
| API Gateway | 8090 | API 网关 |
| ICA Link | 3002 | 签到服务 |
| ICA Sync | 3001 | 同步服务 |

## 🔐 服务器信息

| 服务器 | 角色 | 域名/IP | SSH 用户 | 内网IP |
|--------|------|---------|----------|---------|
| Server-1 | 主服务器 | jlufe_10.128 | ubuntu | 10.0.0.102 |
| Server-2 | 备份服务器 | jlufe_12.6 | ubuntu | 10.0.0.164 |

## 📋 环境变量

```bash
# 主要环境变量
NODE_ENV=production
SERVER_ROLE=primary
CLUSTER_MODE=enabled

# 数据库配置
DB_HOST=120.46.26.206
DB_PORT=3306

# Redis 配置  
REDIS_HOST=10.0.2.212
REDIS_PORT=6379
```

## 🆘 紧急联系

- **系统管理员**: [联系方式]
- **技术支持**: [联系方式]
- **开发团队**: [联系方式]

## 📚 相关文档

- [完整部署文档](README.md)
- [运维操作手册](OPERATIONS.md)
- [生产环境检查清单](../production-deployment-checklist.md)

---

*快速参考 v1.0 | 2024年8月11日*
