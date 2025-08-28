# 网络安全配置指南

## 🔒 安全架构概览

ObSync 系统采用多层安全防护策略，确保系统和数据的安全性：

```
Internet → Firewall → Nginx (SSL) → API Gateway → Backend Services
    ↓         ↓           ↓              ↓              ↓
  DDoS     Port       HTTPS         JWT Auth      Localhost
 Protection Filtering  Encryption   & Rate Limit   Binding
```

## 🛡️ 网络安全配置

### 1. 防火墙规则

#### 主服务器 (120.131.12.6) 防火墙配置

```bash
#!/bin/bash
# 主服务器防火墙配置脚本

# 清空现有规则
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X

# 设置默认策略
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# 允许本地回环
iptables -A INPUT -i lo -j ACCEPT

# 允许已建立的连接
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# 允许 SSH (限制连接频率)
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 允许 HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 允许备用服务器访问 API Gateway
iptables -A INPUT -p tcp -s 120.131.10.128 --dport 8090 -j ACCEPT

# 允许 ICMP (ping)
iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT

# 防止 SYN 洪水攻击
iptables -A INPUT -p tcp --syn -m limit --limit 1/s --limit-burst 3 -j ACCEPT
iptables -A INPUT -p tcp --syn -j DROP

# 防止端口扫描
iptables -A INPUT -m state --state NEW -p tcp --tcp-flags ALL ALL -j DROP
iptables -A INPUT -m state --state NEW -p tcp --tcp-flags ALL NONE -j DROP

# 保存规则
iptables-save > /etc/iptables/rules.v4
```

#### 备用服务器 (120.131.10.128) 防火墙配置

```bash
#!/bin/bash
# 备用服务器防火墙配置脚本

# 清空现有规则
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X

# 设置默认策略
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# 允许本地回环
iptables -A INPUT -i lo -j ACCEPT

# 允许已建立的连接
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# 允许 SSH (限制连接频率)
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 仅允许主服务器访问 API Gateway (端口 8090) - 用于负载均衡
iptables -A INPUT -p tcp -s 120.131.12.6 --dport 8090 -j ACCEPT

# 允许内网健康检查
iptables -A INPUT -p tcp -s 172.20.0.0/16 --dport 80 -j ACCEPT

# 允许外部 MySQL 连接 (端口 3306) - 根据需要限制来源 IP
iptables -A INPUT -p tcp --dport 3306 -j ACCEPT
# 或者限制特定 IP 段访问 MySQL
# iptables -A INPUT -p tcp -s 10.0.0.0/8 --dport 3306 -j ACCEPT

# 允许 ICMP (ping)
iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT

# 保存规则
iptables-save > /etc/iptables/rules.v4
```

### 2. 端口隔离策略

#### 服务端口绑定配置

确保后端服务仅绑定到 localhost，不对外暴露：

```yaml
# Docker Compose 端口配置
services:
  api-gateway:
    ports:
      - "8090:8090"  # 对外暴露，用于负载均衡
  
  app-icasync:
    ports:
      - "127.0.0.1:3001:3000"  # 仅绑定 localhost
  
  app-icalink:
    ports:
      - "127.0.0.1:3002:3002"  # 仅绑定 localhost
```

#### 网络隔离

```yaml
# Docker 网络配置
networks:
  obsync-network:
    driver: bridge
    internal: false  # API Gateway 需要外网访问
    ipam:
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1
  
  backend-network:
    driver: bridge
    internal: true   # 后端服务内网隔离
    ipam:
      config:
        - subnet: 172.21.0.0/16
```

## 🔐 SSL/TLS 配置

### 1. SSL 证书管理

#### 证书安装

```bash
# 创建证书目录
sudo mkdir -p /etc/nginx/ssl
sudo chmod 700 /etc/nginx/ssl

# 安装证书文件
sudo cp STAR_jlufe_edu_cn.pem /etc/nginx/ssl/
sudo cp STAR_jlufe_edu_cn.key /etc/nginx/ssl/

# 设置权限
sudo chmod 644 /etc/nginx/ssl/STAR_jlufe_edu_cn.pem
sudo chmod 600 /etc/nginx/ssl/STAR_jlufe_edu_cn.key
sudo chown root:root /etc/nginx/ssl/*
```

#### SSL 配置优化

```nginx
# SSL 安全配置
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/nginx/ssl/STAR_jlufe_edu_cn.pem;

# DH 参数
ssl_dhparam /etc/nginx/ssl/dhparam.pem;
```

#### 生成 DH 参数

```bash
# 生成强 DH 参数 (需要较长时间)
sudo openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048
sudo chmod 644 /etc/nginx/ssl/dhparam.pem
```

### 2. 证书自动续期

#### 创建续期脚本

```bash
#!/bin/bash
# SSL 证书检查和续期脚本
# 文件位置: /opt/obsync/scripts/ssl-renewal.sh

CERT_FILE="/etc/nginx/ssl/STAR_jlufe_edu_cn.pem"
DAYS_BEFORE_EXPIRY=30

# 检查证书有效期
check_cert_expiry() {
    local cert_file=$1
    local days_before=$2
    
    if [ ! -f "$cert_file" ]; then
        echo "证书文件不存在: $cert_file"
        return 1
    fi
    
    local expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
    local expiry_timestamp=$(date -d "$expiry_date" +%s)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    echo "证书将在 $days_until_expiry 天后过期"
    
    if [ $days_until_expiry -le $days_before ]; then
        echo "警告: 证书即将过期，需要更新"
        return 0
    else
        echo "证书仍然有效"
        return 1
    fi
}

# 主函数
main() {
    echo "=== SSL 证书检查 $(date) ==="
    
    if check_cert_expiry "$CERT_FILE" "$DAYS_BEFORE_EXPIRY"; then
        echo "发送证书过期警告邮件..."
        # 这里可以添加邮件通知逻辑
        echo "证书即将过期，请手动更新" | mail -s "SSL证书过期警告" admin@example.com
    fi
}

main "$@"
```

#### 设置定时任务

```bash
# 添加到 crontab
sudo crontab -e

# 每天检查一次证书有效期
0 2 * * * /opt/obsync/scripts/ssl-renewal.sh >> /var/log/ssl-renewal.log 2>&1
```

## 🔑 访问控制

### 1. SSH 安全配置

#### SSH 配置加固

```bash
# 编辑 SSH 配置
sudo vim /etc/ssh/sshd_config

# 添加安全配置
Port 22
Protocol 2
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server

# 连接限制
MaxAuthTries 3
MaxSessions 10
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 60

# 用户限制
AllowUsers your-username
DenyUsers root
```

#### SSH 密钥管理

```bash
# 生成 SSH 密钥对
ssh-keygen -t rsa -b 4096 -C "obsync-deployment"

# 复制公钥到服务器
ssh-copy-id -i ~/.ssh/id_rsa.pub user@120.131.12.6
ssh-copy-id -i ~/.ssh/id_rsa.pub user@120.131.10.128

# 设置密钥权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
chmod 644 ~/.ssh/authorized_keys
```

### 2. 应用层安全

#### JWT 配置

```javascript
// API Gateway JWT 配置
const jwtConfig = {
  secret: process.env.JWT_SECRET, // 至少 32 字符的强密钥
  algorithm: 'HS256',
  expiresIn: '24h',
  issuer: 'obsync-api-gateway',
  audience: 'obsync-clients'
};
```

#### 限流配置

```nginx
# Nginx 限流配置
http {
    # 定义限流区域
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=static_limit:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=1r/s;
    
    # 连接限制
    limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
    limit_conn conn_limit_per_ip 20;
}

server {
    # API 接口限流
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_status 429;
    }
    
    # 登录接口特殊限流
    location /api/auth/login {
        limit_req zone=login_limit burst=5 nodelay;
        limit_req_status 429;
    }
}
```

## 🔍 安全监控

### 1. 入侵检测

#### Fail2ban 配置

```bash
# 安装 Fail2ban
sudo apt install fail2ban

# 创建配置文件
sudo vim /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 600
```

### 2. 日志监控

#### 安全日志收集

```bash
# 创建安全日志监控脚本
cat > /opt/obsync/scripts/security-monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/security-monitor.log"
ALERT_EMAIL="admin@example.com"

# 监控 SSH 登录失败
check_ssh_failures() {
    local failures=$(grep "Failed password" /var/log/auth.log | grep "$(date '+%b %d')" | wc -l)
    if [ $failures -gt 10 ]; then
        echo "$(date): 检测到 $failures 次 SSH 登录失败" >> $LOG_FILE
        echo "SSH 登录失败次数异常: $failures" | mail -s "安全警告" $ALERT_EMAIL
    fi
}

# 监控异常网络连接
check_network_connections() {
    local suspicious_connections=$(netstat -an | grep ":22 " | grep ESTABLISHED | wc -l)
    if [ $suspicious_connections -gt 5 ]; then
        echo "$(date): 检测到 $suspicious_connections 个 SSH 连接" >> $LOG_FILE
    fi
}

# 主函数
main() {
    check_ssh_failures
    check_network_connections
}

main
EOF

chmod +x /opt/obsync/scripts/security-monitor.sh

# 添加到 crontab
echo "*/5 * * * * /opt/obsync/scripts/security-monitor.sh" | sudo crontab -
```

## ⚠️ 安全检查清单

### 部署前检查

- [ ] 防火墙规则已正确配置
- [ ] SSH 密钥认证已启用，密码认证已禁用
- [ ] SSL 证书已正确安装和配置
- [ ] 后端服务端口已绑定到 localhost
- [ ] Docker 容器网络已正确隔离
- [ ] 敏感配置已加密存储

### 运行时检查

- [ ] 定期检查 SSL 证书有效期
- [ ] 监控异常登录尝试
- [ ] 检查防火墙日志
- [ ] 验证服务端口绑定状态
- [ ] 检查容器安全配置
- [ ] 更新系统安全补丁

### 应急响应

- [ ] 制定安全事件响应流程
- [ ] 准备系统备份和恢复方案
- [ ] 配置安全警报通知
- [ ] 定期进行安全演练

## 🔄 下一步

完成安全配置后，请继续：
1. [监控配置](./monitoring.md)
2. [故障恢复机制](./disaster-recovery.md)
3. [部署验证](./verification.md)
