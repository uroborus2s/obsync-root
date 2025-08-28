# Nginx 配置说明

## 📋 配置概览

Nginx 在 ObSync 系统中承担以下关键角色：
- **静态文件服务**：提供前端应用的静态资源
- **负载均衡器**：将 API 请求分发到多个后端实例
- **SSL 终端**：处理 HTTPS 加密和证书管理
- **安全网关**：实施访问控制和安全策略

## 🏗️ 架构设计

### 主服务器 Nginx 架构
```
Internet → Nginx (443/80) → {
  /web/* → 静态文件 (/var/www/agendaedu-web/)
  /app/* → 静态文件 (/var/www/agendaedu-app/)
  /api/* → upstream api_gateway → {
    server-1:8090 (weight=3, primary)
    server-2:8090 (weight=1, backup)
  }
}
```

### 备用服务器 Nginx 架构
```
External Network → Nginx (80/3306) → {
  /api/* → local api_gateway (localhost:8090)
  /health → 健康检查端点
  /status → 服务状态检查
  MySQL:3306 → 内网 MySQL 服务器 (stream 代理)
}
```

## 📁 配置文件结构

```
/etc/nginx/
├── nginx.conf                 # 主配置文件
├── sites-available/
│   ├── kwps.jlufe.edu.cn      # 主服务器站点配置
│   └── server-2-internal      # 备用服务器配置
├── sites-enabled/             # 启用的站点配置（软链接）
├── ssl/
│   ├── STAR_jlufe_edu_cn.pem  # SSL 证书
│   └── STAR_jlufe_edu_cn.key  # SSL 私钥
└── conf.d/
    ├── upstream.conf          # 上游服务器配置
    ├── security.conf          # 安全配置
    └── gzip.conf             # 压缩配置
```

## ⚙️ 主配置文件

### /etc/nginx/nginx.conf

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # 基础配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    
    # MIME 类型
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';
    
    # 访问日志
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # 包含其他配置
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

## 🔄 负载均衡配置

### /etc/nginx/conf.d/upstream.conf

```nginx
# API Gateway 集群 (处理所有需要认证的接口)
upstream api_gateway {
    # 主服务器 API Gateway 实例
    server localhost:8090 weight=3 max_fails=3 fail_timeout=30s;
    server localhost:8091 weight=2 max_fails=3 fail_timeout=30s;

    # 备用服务器 API Gateway 实例
    server 120.131.10.128:8090 weight=1 max_fails=3 fail_timeout=30s backup;
    server 120.131.10.128:8091 weight=1 max_fails=3 fail_timeout=30s backup;

    # 连接池配置
    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
}

# 备用服务器本地网关配置
upstream api_gateway_local {
    server localhost:8090 max_fails=3 fail_timeout=30s;
    keepalive 16;
    keepalive_requests 100;
    keepalive_timeout 60s;
}
```

### 负载均衡策略说明

1. **权重分配**：
   - 主服务器：权重 3 (75% 流量)
   - 备用服务器：权重 1 (25% 流量)

2. **故障转移**：
   - `max_fails=3`：连续失败 3 次后标记为不可用
   - `fail_timeout=30s`：30 秒后重新尝试
   - `backup`：备用服务器仅在主服务器不可用时使用

3. **连接优化**：
   - `keepalive=32`：保持 32 个长连接
   - `keepalive_requests=100`：每个连接最多处理 100 个请求
   - `keepalive_timeout=60s`：连接空闲 60 秒后关闭

## 🔒 安全配置

### /etc/nginx/conf.d/security.conf

```nginx
# 安全头配置
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# 隐藏 Nginx 版本
server_tokens off;

# 限制请求大小
client_max_body_size 20M;
client_body_timeout 60s;
client_header_timeout 60s;

# 限流配置
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=static_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=internal_api_limit:10m rate=20r/s;

# 连接限制
limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
limit_conn conn_limit_per_ip 20;
```

## 📦 压缩配置

### /etc/nginx/conf.d/gzip.conf

```nginx
# Gzip 压缩配置
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/json
    application/javascript
    application/xml+rss
    application/atom+xml
    image/svg+xml
    application/x-font-ttf
    application/vnd.ms-fontobject
    font/opentype;

# Brotli 压缩 (如果安装了 brotli 模块)
# brotli on;
# brotli_comp_level 6;
# brotli_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

## 🌐 主服务器站点配置

### /etc/nginx/sites-available/kwps.jlufe.edu.cn

详细配置请参考现有的 `scripts/deploy/nginx/server-1-nginx.conf` 文件，主要包含：

1. **HTTP 到 HTTPS 重定向**
2. **SSL 证书配置**
3. **API 网关负载均衡**
4. **静态文件服务**
5. **安全头和限流配置**

#### 关键配置示例

```nginx
server {
    listen 443 ssl http2;
    server_name kwps.jlufe.edu.cn;

    # SSL 配置...

    # 所有 API 请求都通过 API Gateway (统一认证和负载均衡)
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Load-Balancer "nginx";

        # 超时配置
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 错误处理
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 30s;
    }



    # 需要认证的接口通过 API Gateway
    location ~ ^/api/(auth|user|admin|system)/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://gateway_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Service "gateway";
        proxy_set_header X-Load-Balancer "nginx";

        # 超时配置
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 错误处理
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 30s;
    }

    # 静态文件配置...
}
```

## 🔧 备用服务器配置

### /etc/nginx/sites-available/server-2-internal

详细配置请参考现有的 `scripts/deploy/nginx/server-2-nginx.conf` 文件，主要包含：

1. **内网 API 代理**
2. **MySQL 流代理**
3. **服务状态检查**
4. **健康检查端点**
5. **监控接口**

### MySQL 流代理配置

备用服务器需要配置 Nginx Stream 模块来代理 MySQL 连接：

#### /etc/nginx/nginx.conf (添加 stream 块)

```nginx
# 在 http 块之外添加 stream 配置
stream {
    # MySQL 代理配置
    upstream mysql_backend {
        server 10.0.0.100:3306;  # 内网 MySQL 服务器地址
        # server 10.0.0.101:3306 backup;  # 备用 MySQL 服务器
    }

    # MySQL 代理服务
    server {
        listen 3306;
        proxy_pass mysql_backend;
        proxy_timeout 1s;
        proxy_responses 1;
        proxy_connect_timeout 1s;

        # 错误日志
        error_log /var/log/nginx/mysql_proxy_error.log;
        access_log /var/log/nginx/mysql_proxy_access.log;
    }
}

http {
    # 原有的 HTTP 配置...
}
```

#### 启用 Stream 模块

```bash
# 检查 Nginx 是否编译了 stream 模块
nginx -V 2>&1 | grep -o with-stream

# 如果没有 stream 模块，需要重新安装
sudo apt remove nginx nginx-common
sudo apt install nginx-full

# 或者从源码编译安装
# ./configure --with-stream --with-stream_ssl_module
```

## 🔧 部署和管理命令

### 配置部署

```bash
# 复制配置文件
sudo cp scripts/deploy/nginx/server-1-nginx.conf /etc/nginx/sites-available/kwps.jlufe.edu.cn

# 创建软链接启用站点
sudo ln -sf /etc/nginx/sites-available/kwps.jlufe.edu.cn /etc/nginx/sites-enabled/

# 删除默认站点
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置语法
sudo nginx -t

# 重新加载配置
sudo systemctl reload nginx
```

### 日常管理

```bash
# 查看 Nginx 状态
sudo systemctl status nginx

# 重启 Nginx
sudo systemctl restart nginx

# 查看访问日志
sudo tail -f /var/log/nginx/kwps_access.log

# 查看错误日志
sudo tail -f /var/log/nginx/kwps_error.log

# 检查配置语法
sudo nginx -t

# 重新加载配置（无停机）
sudo nginx -s reload
```

## 📊 监控和调优

### 性能监控

```bash
# 查看 Nginx 状态
curl http://localhost/nginx_status

# 监控连接数
watch -n 1 'curl -s http://localhost/nginx_status'

# 分析访问日志
sudo tail -f /var/log/nginx/kwps_access.log | grep -E '(5[0-9]{2}|4[0-9]{2})'
```

### 性能调优参数

```nginx
# 工作进程优化
worker_processes auto;
worker_connections 2048;

# 缓冲区优化
client_body_buffer_size 128k;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;

# 超时优化
keepalive_timeout 30;
client_body_timeout 12;
client_header_timeout 12;
send_timeout 10;
```

## ⚠️ 故障排查

### 常见问题

1. **502 Bad Gateway**
   ```bash
   # 检查上游服务器状态
   docker ps | grep api-gateway
   curl http://172.20.0.20:8090/health
   ```

2. **SSL 证书问题**
   ```bash
   # 检查证书有效期
   openssl x509 -in /etc/nginx/ssl/STAR_jlufe_edu_cn.pem -text -noout | grep "Not After"
   
   # 测试 SSL 配置
   openssl s_client -connect kwps.jlufe.edu.cn:443
   ```

3. **配置语法错误**
   ```bash
   # 详细检查配置
   sudo nginx -t -c /etc/nginx/nginx.conf
   ```

### MySQL 代理使用说明

#### 连接方式

```bash
# 应用程序连接 MySQL 的方式
# 原来: mysql -h 10.0.0.100 -P 3306 -u username -p
# 现在: mysql -h 120.131.10.128 -P 3306 -u username -p

# 配置文件中的数据库连接字符串
# 原来: mysql://username:password@10.0.0.100:3306/database
# 现在: mysql://username:password@120.131.10.128:3306/database
```

#### 监控和日志

```bash
# 查看 MySQL 代理访问日志
sudo tail -f /var/log/nginx/mysql_proxy_access.log

# 查看 MySQL 代理错误日志
sudo tail -f /var/log/nginx/mysql_proxy_error.log

# 监控连接数
sudo netstat -an | grep :3306 | grep ESTABLISHED | wc -l
```

#### 故障排查

```bash
# 测试到内网 MySQL 的连接
nc -z 10.0.0.100 3306

# 测试 MySQL 代理
nc -z localhost 3306

# 检查 Nginx 配置
nginx -t

# 重新加载 Nginx 配置
sudo nginx -s reload
```

## 🔄 下一步

完成 Nginx 配置后，请继续：
1. [Docker 部署指南](./docker-deployment.md)
2. [安全配置指南](./security-config.md)
3. [监控配置](./monitoring.md)
