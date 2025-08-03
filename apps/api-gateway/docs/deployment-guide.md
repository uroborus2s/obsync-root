# API 网关部署指南

## 概述

本指南详细描述了基于 Stratix 框架构建的 API 网关的部署和运维流程。

## 环境要求

### 系统要求

- **Node.js**: >= 22.0.0
- **内存**: 最小 2GB，推荐 4GB+
- **CPU**: 最小 2 核，推荐 4 核+
- **磁盘**: 最小 10GB 可用空间

### 依赖服务

- **Redis**: >= 6.0 (用于缓存和会话存储)
- **负载均衡器**: Nginx/HAProxy (可选)
- **监控系统**: Prometheus + Grafana (可选)

## 安装和配置

### 1. 克隆项目

```bash
git clone <repository-url>
cd obsync-root/apps/api-gateway
```

### 2. 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 3. 环境配置

创建环境变量文件：

```bash
# 开发环境
cp .env.example .env

# 生产环境
cp .env.example .env.production
```

### 4. 环境变量配置

```env
# 基本配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 日志配置
LOG_LEVEL=info

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# JWT 配置
JWT_SECRET=your_jwt_secret_key

# 认证配置
AUTH_ENABLED=true
TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d

# 限流配置
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=1 minute
GLOBAL_RATE_LIMIT=10000
GLOBAL_RATE_WINDOW=1 minute

# 服务发现
USER_SERVICE_URL=http://user-service:3001
ORDER_SERVICE_URL=http://order-service:3002
PAYMENT_SERVICE_URL=http://payment-service:3003

# 监控配置
ALERTING_ENABLED=true
ALERT_WEBHOOK_URL=https://hooks.slack.com/your/webhook/url

# 性能阈值
ERROR_RATE_THRESHOLD=0.05
RESPONSE_TIME_THRESHOLD=1000
AVAILABILITY_THRESHOLD=0.99

# CORS 配置
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

### 5. 敏感配置加密

```bash
# 生成加密配置
pnpm run env

# 开发环境加密
pnpm run env:dev
```

## 构建和启动

### 开发模式

```bash
# 启动开发服务器（热重载）
pnpm run dev

# 运行测试
pnpm run test

# 代码检查
pnpm run lint

# 格式化代码
pnpm run format
```

### 生产模式

```bash
# 构建生产版本
pnpm run build

# 启动生产服务器
pnpm run start

# 或使用 PM2
pm2 start dist/index.js --name api-gateway
```

## Docker 部署

### 1. Dockerfile

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 复制包文件
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 安装依赖
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 构建应用
RUN pnpm run build

# 生产镜像
FROM node:20-alpine AS production

WORKDIR /app

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S apigateway -u 1001

# 复制构建产物
COPY --from=builder --chown=apigateway:nodejs /app/dist ./dist
COPY --from=builder --chown=apigateway:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=apigateway:nodejs /app/package.json ./

# 设置用户
USER apigateway

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动命令
CMD ["node", "dist/index.js"]
```

### 2. Docker Compose

```yaml
version: '3.8'

services:
  api-gateway:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    networks:
      - gateway-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    networks:
      - gateway-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api-gateway
    restart: unless-stopped
    networks:
      - gateway-network

volumes:
  redis_data:

networks:
  gateway-network:
    driver: bridge
```

### 3. 构建和运行

```bash
# 构建镜像
docker build -t api-gateway:latest .

# 运行容器
docker-compose up -d

# 查看日志
docker-compose logs -f api-gateway

# 停止服务
docker-compose down
```

## Kubernetes 部署

### 1. 配置文件

#### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-gateway-config
  namespace: default
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  PORT: "3000"
  HOST: "0.0.0.0"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  AUTH_ENABLED: "true"
  RATE_LIMIT_MAX: "1000"
  CORS_ORIGIN: "https://yourdomain.com"
```

#### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-gateway-secrets
  namespace: default
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  REDIS_PASSWORD: <base64-encoded-password>
  ALERT_WEBHOOK_URL: <base64-encoded-webhook-url>
```

#### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: default
  labels:
    app: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: api-gateway:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: api-gateway-config
        - secretRef:
            name: api-gateway-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
      imagePullSecrets:
      - name: registry-secret
```

#### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
  namespace: default
spec:
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  type: ClusterIP
```

#### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: api-gateway-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway-service
            port:
              number: 80
```

### 2. 部署命令

```bash
# 创建命名空间
kubectl create namespace api-gateway

# 应用配置
kubectl apply -f k8s/

# 查看状态
kubectl get pods -n api-gateway
kubectl get services -n api-gateway
kubectl get ingress -n api-gateway

# 查看日志
kubectl logs -f deployment/api-gateway -n api-gateway

# 扩缩容
kubectl scale deployment/api-gateway --replicas=5 -n api-gateway
```

## 负载均衡配置

### Nginx 配置

```nginx
upstream api_gateway {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL 配置
    ssl_certificate /etc/nginx/ssl/api.yourdomain.com.crt;
    ssl_certificate_key /etc/nginx/ssl/api.yourdomain.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # 限流配置
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # 代理配置
    location / {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时配置
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 缓存配置
        proxy_cache_bypass $http_upgrade;
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # 健康检查
    location /health {
        proxy_pass http://api_gateway/health;
        access_log off;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 监控和日志

### 1. Prometheus 监控配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### 2. Grafana 仪表板

导入以下 JSON 配置创建监控仪表板：

```json
{
  "dashboard": {
    "title": "API Gateway Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{path}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_errors_total[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      }
    ]
  }
}
```

### 3. 日志聚合

使用 ELK Stack 或类似工具收集和分析日志：

```yaml
# filebeat.yml
filebeat.inputs:
- type: container
  paths:
    - '/var/lib/docker/containers/*/*.log'
  processors:
  - add_docker_metadata:
      host: "unix:///var/run/docker.sock"

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "api-gateway-%{+yyyy.MM.dd}"

logging.level: info
```

## 安全配置

### 1. SSL/TLS 配置

```bash
# 生成自签名证书（仅用于测试）
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout api.yourdomain.com.key \
  -out api.yourdomain.com.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=api.yourdomain.com"
```

### 2. 防火墙配置

```bash
# UFW 配置示例
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 3. 系统加固

```bash
# 限制文件描述符
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# 内核参数优化
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
sysctl -p
```

## 性能优化

### 1. Node.js 优化

```bash
# 设置 Node.js 环境变量
export NODE_ENV=production
export UV_THREADPOOL_SIZE=128
export NODE_OPTIONS="--max-old-space-size=4096"
```

### 2. PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api-gateway',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/error.log',
    out_file: 'logs/access.log',
    log_file: 'logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=4096'
  }]
}
```

## 故障排除

### 常见问题

1. **内存泄漏**
   ```bash
   # 监控内存使用
   ps aux | grep node
   
   # 生成堆转储
   kill -USR2 <pid>
   ```

2. **连接问题**
   ```bash
   # 检查端口监听
   netstat -tlnp | grep 3000
   
   # 检查 Redis 连接
   redis-cli ping
   ```

3. **性能问题**
   ```bash
   # 检查 CPU 使用率
   top -p <pid>
   
   # 分析请求延迟
   curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/health"
   ```

### 日志级别调试

```bash
# 临时调整日志级别
export LOG_LEVEL=debug

# 查看详细日志
docker logs -f api-gateway
```

## 维护和更新

### 1. 滚动更新

```bash
# Kubernetes 滚动更新
kubectl set image deployment/api-gateway api-gateway=api-gateway:v2.0.0

# Docker Compose 更新
docker-compose pull
docker-compose up -d
```

### 2. 备份和恢复

```bash
# 备份配置
kubectl get configmap api-gateway-config -o yaml > config-backup.yaml

# 备份 Redis 数据
redis-cli --rdb dump.rdb
```

### 3. 健康检查

```bash
# 自动化健康检查脚本
#!/bin/bash
HEALTH_URL="http://localhost:3000/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Service is healthy"
    exit 0
else
    echo "Service is unhealthy: $RESPONSE"
    exit 1
fi
```

## 总结

本部署指南提供了 API 网关从开发到生产的完整部署流程，包括：

- 环境配置和依赖管理
- Docker 和 Kubernetes 部署
- 负载均衡和反向代理配置
- 监控和日志配置
- 安全和性能优化
- 故障排除和维护

遵循这些最佳实践可以确保 API 网关的高可用性、高性能和安全性。