# 快速部署指南

## 概述

本指南提供了ObSync生产环境的快速部署步骤，适用于首次部署和日常更新。

## 前置条件

### 1. 服务器准备
- **主服务器**: 120.131.12.6 (SSH: `ssh jlufe_12.6`)
- **备用服务器**: 120.131.10.128 (SSH: `ssh jlufe_10.128`)
- 确保SSH密钥已配置，可以无密码登录

### 2. 本地环境
```bash
# 检查必要工具
which ssh scp docker pnpm

# 检查SSH连接
ssh ubuntu@jlufe_12.6 "echo 'Server 1 OK'"
ssh ubutu@jlufe_10.128 "echo 'Server 2 OK'"
```

## 快速部署步骤

### 步骤1: 准备部署脚本
```bash
# 进入项目根目录
cd /path/to/obsync-root

# 给部署脚本执行权限
chmod +x docs/deployment-scripts/*.sh
```

### 步骤2: 首次完整部署
```bash
# 预演部署过程 (推荐)
./docs/deployment-scripts/deploy-production.sh --dry-run

# 执行完整部署
./docs/deployment-scripts/deploy-production.sh --full
```

### 步骤3: 设置监控系统
```bash
# 安装监控脚本
./docs/deployment-scripts/monitoring-setup.sh
```

### 步骤4: 验证部署
```bash
# 检查服务状态
curl -I https://kwps.jlufe.edu.cn/health
curl -I https://kwps.jlufe.edu.cn/api/health
curl -I https://kwps.jlufe.edu.cn/web/
curl -I https://kwps.jlufe.edu.cn/app/

# 查看监控仪表板
ssh ubuntu@jlufe_12.6 'sudo /usr/local/bin/monitoring-dashboard.sh'
```

## 常用部署场景

### 场景1: 仅更新前端应用
```bash
# 构建前端项目
pnpm run build:web
pnpm run build:app

# 部署静态文件
./docs/deployment-scripts/deploy-production.sh --static-only
```

### 场景2: 仅更新后端服务
```bash
# 更新Docker镜像
./docs/deployment-scripts/deploy-production.sh --update-images
```

### 场景3: 仅更新Nginx配置
```bash
# 更新Nginx配置
./docs/deployment-scripts/deploy-production.sh --nginx-only
```

### 场景4: 仅部署到主服务器
```bash
# 仅部署主服务器
./docs/deployment-scripts/deploy-production.sh --server1-only
```

## 故障排除

### 问题1: SSH连接失败
```bash
# 检查SSH配置
ssh -v ubuntu@jlufe_12.6

# 检查网络连接
ping 120.131.12.6
```

### 问题2: Docker服务启动失败
```bash
# 检查Docker状态
ssh ubuntu@jlufe_12.6 'docker compose ps'
ssh ubuntu@jlufe_12.6 'docker compose logs'

# 重启Docker服务
ssh ubuntu@jlufe_12.6 'cd ~/deploy && docker compose restart'
```

### 问题3: Nginx配置错误
```bash
# 测试Nginx配置
ssh ubuntu@jlufe_12.6 'sudo nginx -t'

# 查看Nginx错误日志
ssh ubuntu@jlufe_12.6 'sudo tail -f /var/log/nginx/error.log'
```

### 问题4: 静态文件访问失败
```bash
# 检查文件权限
ssh ubutu@jlufe_10.128 'ls -la /var/www/'

# 修复权限
ssh ubutu@jlufe_10.128 'sudo chown -R www-data:www-data /var/www/ && sudo chmod -R 755 /var/www/'
```

## 备份和恢复

### 创建备份
```bash
# 完整备份
./docs/deployment-scripts/backup-restore.sh --backup

# 仅备份配置
./docs/deployment-scripts/backup-restore.sh --backup-config

# 列出备份
./docs/deployment-scripts/backup-restore.sh --list-backups
```

### 恢复备份
```bash
# 恢复配置文件
./docs/deployment-scripts/backup-restore.sh --restore-config --backup-file /path/to/backup.tar.gz

# 恢复数据文件
./docs/deployment-scripts/backup-restore.sh --restore-data --backup-file /path/to/backup.tar.gz
```

## 监控和维护

### 查看系统状态
```bash
# 监控仪表板
ssh ubuntu@jlufe_12.6 'sudo /usr/local/bin/monitoring-dashboard.sh'

# 健康检查
ssh ubuntu@jlufe_12.6 'sudo /usr/local/bin/health-check.sh'

# 查看日志
ssh ubuntu@jlufe_12.6 'sudo tail -f /var/log/health-check.log'
```

### 性能监控
```bash
# 系统资源使用
ssh ubuntu@jlufe_12.6 'top'
ssh ubuntu@jlufe_12.6 'df -h'
ssh ubuntu@jlufe_12.6 'free -h'

# Docker容器状态
ssh ubuntu@jlufe_12.6 'docker stats'
```

## 安全检查

### SSL证书检查
```bash
# 检查证书有效期
openssl s_client -connect kwps.jlufe.edu.cn:443 -servername kwps.jlufe.edu.cn 2>/dev/null | openssl x509 -noout -dates

# 检查证书链
curl -I https://kwps.jlufe.edu.cn/
```

### 防火墙状态
```bash
# 检查防火墙规则
ssh ubuntu@jlufe_12.6 'sudo ufw status'
ssh ubutu@jlufe_10.128 'sudo ufw status'
```

## 更新流程

### 1. 准备阶段
- [ ] 检查当前系统状态
- [ ] 创建备份
- [ ] 准备回滚方案

### 2. 部署阶段
- [ ] 使用预演模式验证
- [ ] 执行实际部署
- [ ] 验证部署结果

### 3. 验证阶段
- [ ] 功能测试
- [ ] 性能测试
- [ ] 安全检查

### 4. 完成阶段
- [ ] 更新文档
- [ ] 清理临时文件
- [ ] 通知相关人员

## 应急联系

### 技术支持
- 系统管理员: [联系方式]
- 开发团队: [联系方式]
- 网络管理: [联系方式]

### 应急响应
1. **服务中断**: 立即切换到备用服务器
2. **安全事件**: 隔离系统并联系安全团队
3. **数据丢失**: 从最近备份恢复数据

## 常用命令速查

### 服务管理
```bash
# 重启所有服务
ssh ubuntu@jlufe_12.6 'cd ~/deploy && docker compose restart'

# 查看服务日志
ssh ubuntu@jlufe_12.6 'cd ~/deploy && docker compose logs -f'

# 重新加载Nginx
ssh ubuntu@jlufe_12.6 'sudo systemctl reload nginx'
```

### 系统维护
```bash
# 清理Docker资源
ssh ubuntu@jlufe_12.6 'docker system prune -f'

# 更新系统包
ssh ubuntu@jlufe_12.6 'sudo apt update && sudo apt upgrade -y'

# 查看磁盘使用
ssh ubuntu@jlufe_12.6 'du -sh /var/log/* | sort -hr'
```

### 网络诊断
```bash
# 测试网络连接
curl -I https://kwps.jlufe.edu.cn/health
curl -w "@curl-format.txt" -o /dev/null -s https://kwps.jlufe.edu.cn/api/health

# 检查端口状态
ssh ubuntu@jlufe_12.6 'netstat -tlnp | grep -E "(80|443|8090)"'
```

## 注意事项

1. **部署前必须备份**: 每次部署前都要创建备份
2. **使用预演模式**: 重要更新前先使用 `--dry-run` 参数
3. **分步部署**: 大型更新建议分步进行，降低风险
4. **监控告警**: 部署后密切关注监控告警
5. **文档更新**: 配置变更后及时更新文档

## 版本记录

- v1.0: 初始版本
- v1.1: 添加监控系统
- v1.2: 完善备份恢复机制

---

**重要提醒**: 生产环境操作需谨慎，建议先在测试环境验证所有操作。
