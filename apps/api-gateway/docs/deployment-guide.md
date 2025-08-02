# Stratix API Gateway 部署指南

## 1. 概述

本文档提供了 Stratix API Gateway 的完整部署指南，包括本地开发环境搭建、容器化部署、分布式集群部署等多种部署方式。

### 1.1 部署架构选择

| 部署方式 | 适用场景 | 复杂度 | 可用性 | 性能 |
|----------|----------|--------|--------|------|
| 本地开发 | 开发测试 | 低 | 低 | 中 |
| 单机部署 | 小型应用 | 低 | 中 | 中 |
| 容器化部署 | 中型应用 | 中 | 高 | 高 |
| 分布式集群 | 大型应用 | 高 | 很高 | 很高 |

### 1.2 系统要求

**最低要求:**
- CPU: 2 核心
- 内存: 4GB RAM
- 存储: 20GB 可用空间
- 网络: 100Mbps

**推荐配置:**
- CPU: 4+ 核心
- 内存: 8GB+ RAM
- 存储: 50GB+ SSD
- 网络: 1Gbps

**软件依赖:**
- Node.js >= 22.0.0
- pnpm >= 8.0.0
- Docker >= 24.0.0 (容器化部署)
- Docker Compose >= 2.0.0 (容器化部署)

## 2. 本地开发环境

### 2.1 环境准备

```bash
# 1. 安装 Node.js 22+
curl -fsSL https://nodejs.org/dist/v22.0.0/node-v22.0.0-linux-x64.tar.xz | tar -xJ
export PATH=$PWD/node-v22.0.0-linux-x64/bin:$PATH

# 2. 安装 pnpm
npm install -g pnpm

# 3. 验证安装
node --version  # v22.0.0+
pnpm --version  # 8.0.0+
```

### 2.2 项目初始化

```bash
# 1. 克隆项目
git clone https://github.com/your-org/stratix-gateway.git
cd stratix-gateway

# 2. 安装依赖
pnpm install

# 3. 构建项目
pnpm build

# 4. 配置环境变量
cp apps/api-gateway/.env.example apps/api-gateway/.env.local
```

### 2.3 本地配置

创建 `apps/api-gateway/stratix.config.ts`:

```typescript
import type { StratixConfig } from '@stratix/core';

export default function createConfig(): StratixConfig {
  return {
    name: 'api-gateway',
    version: '1.0.0',
    description: 'Stratix API Gateway',
    
    server: {
      host: '0.0.0.0',
      port: 3000,
      logger: {
        level: 'info',
        prettyPrint: true
      }
    },
    
    plugins: [
      // OAuth2 认证插件
      ['@stratix/oauth2-auth', {
        wps: {
          clientId: process.env.WPS_CLIENT_ID,
          clientSecret: process.env.WPS_CLIENT_SECRET,
          authorizationUrl: 'https://auth-dev.wps.com/oauth2/authorize',
          tokenUrl: 'https://auth-dev.wps.com/oauth2/token',
          userInfoUrl: 'https://auth-dev.wps.com/oauth2/userinfo',
          jwksUrl: 'https://auth-dev.wps.com/.well-known/jwks.json',
          scope: ['read', 'write', 'profile'],
          redirectUri: 'http://localhost:3000/auth/callback'
        }
      }],
      
      // HTTP 代理插件
      ['@fastify/http-proxy', {
        upstream: 'http://localhost:4000',
        prefix: '/api/v1'
      }],
      
      // 限流插件
      ['@fastify/rate-limit', {
        max: 100,
        timeWindow: '1 minute'
      }],
      
      // 熔断插件
      ['@fastify/circuit-breaker', {
        threshold: 5,
        timeout: 10000,
        resetTimeout: 30000
      }]
    ]
  };
}
```

### 2.4 启动开发服务

```bash
# 启动开发服务器
pnpm dev

# 或者使用调试模式
pnpm dev:debug

# 检查服务状态
curl http://localhost:3000/health
```

## 3. 单机部署

### 3.1 生产构建

```bash
# 1. 构建生产版本
pnpm build

# 2. 安装生产依赖
pnpm install --prod

# 3. 创建生产配置
cp apps/api-gateway/.env.example apps/api-gateway/.env.production
```

### 3.2 系统服务配置

创建 systemd 服务文件 `/etc/systemd/system/stratix-gateway.service`:

```ini
[Unit]
Description=Stratix API Gateway
After=network.target

[Service]
Type=simple
User=gateway
WorkingDirectory=/opt/stratix-gateway
ExecStart=/usr/bin/node apps/api-gateway/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

# 安全配置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/stratix-gateway/logs

[Install]
WantedBy=multi-user.target
```

### 3.3 Nginx 反向代理

创建 Nginx 配置 `/etc/nginx/sites-available/stratix-gateway`:

```nginx
upstream gateway_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name gateway.example.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name gateway.example.com;
    
    # SSL 配置
    ssl_certificate /etc/ssl/certs/gateway.example.com.crt;
    ssl_certificate_key /etc/ssl/private/gateway.example.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # 代理配置
    location / {
        proxy_pass http://gateway_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://gateway_backend/health;
        access_log off;
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3.4 启动服务

```bash
# 1. 启用并启动服务
sudo systemctl enable stratix-gateway
sudo systemctl start stratix-gateway

# 2. 启用并启动 Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 3. 检查服务状态
sudo systemctl status stratix-gateway
sudo systemctl status nginx

# 4. 查看日志
sudo journalctl -u stratix-gateway -f
```

## 4. 容器化部署

### 4.1 Dockerfile

创建 `apps/api-gateway/Dockerfile`:

```dockerfile
# 多阶段构建
FROM node:22-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api-gateway/package.json ./apps/api-gateway/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建项目
RUN pnpm build

# 生产镜像
FROM node:22-alpine AS runtime

# 安装必要的系统包
RUN apk add --no-cache dumb-init

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gateway -u 1001

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制构建产物
COPY --from=builder --chown=gateway:nodejs /app/dist ./dist
COPY --from=builder --chown=gateway:nodejs /app/package.json ./
COPY --from=builder --chown=gateway:nodejs /app/pnpm-lock.yaml ./
COPY --from=builder --chown=gateway:nodejs /app/node_modules ./node_modules

# 切换到非 root 用户
USER gateway

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api-gateway/dist/index.js"]
```

### 4.2 Docker Compose

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # API Gateway
  gateway:
    build:
      context: .
      dockerfile: apps/api-gateway/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - REDIS_URL=redis://redis:6379
      - CONSUL_URL=http://consul:8500
      - WPS_CLIENT_ID=${WPS_CLIENT_ID}
      - WPS_CLIENT_SECRET=${WPS_CLIENT_SECRET}
    depends_on:
      redis:
        condition: service_healthy
      consul:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - gateway-network
    volumes:
      - ./logs:/app/logs
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  # Redis 缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - gateway-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 3s
      retries: 5

  # Consul 服务发现
  consul:
    image: consul:1.16
    ports:
      - "8500:8500"
      - "8600:8600/udp"
    command: >
      consul agent
      -server
      -bootstrap-expect=1
      -datacenter=dc1
      -data-dir=/consul/data
      -log-level=INFO
      -node=consul-server
      -bind=0.0.0.0
      -client=0.0.0.0
      -retry-join="consul"
      -ui-config-enabled=true
    volumes:
      - consul-data:/consul/data
    restart: unless-stopped
    networks:
      - gateway-network
    healthcheck:
      test: ["CMD", "consul", "members"]
      interval: 30s
      timeout: 3s
      retries: 5

  # Nginx 负载均衡
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - gateway
    restart: unless-stopped
    networks:
      - gateway-network

  # Prometheus 监控
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    networks:
      - gateway-network

  # Grafana 可视化
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
    restart: unless-stopped
    networks:
      - gateway-network

volumes:
  redis-data:
  consul-data:
  prometheus-data:
  grafana-data:

networks:
  gateway-network:
    driver: bridge
```

### 4.3 环境配置

创建 `.env` 文件:

```bash
# WPS OAuth2 配置
WPS_CLIENT_ID=your-wps-client-id
WPS_CLIENT_SECRET=your-wps-client-secret

# Redis 配置
REDIS_PASSWORD=your-redis-password

# Grafana 配置
GRAFANA_PASSWORD=your-grafana-password

# 其他配置
NODE_ENV=production
LOG_LEVEL=info
```

### 4.4 启动容器

```bash
# 1. 构建并启动所有服务
docker-compose up -d

# 2. 查看服务状态
docker-compose ps

# 3. 查看日志
docker-compose logs -f gateway

# 4. 扩展网关实例
docker-compose up -d --scale gateway=3

# 5. 停止服务
docker-compose down
```

## 5. 分布式集群部署

### 5.1 Kubernetes 部署

创建 `k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: stratix-gateway
```

创建 `k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gateway-config
  namespace: stratix-gateway
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  REDIS_URL: "redis://redis-service:6379"
  CONSUL_URL: "http://consul-service:8500"
```

创建 `k8s/secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gateway-secrets
  namespace: stratix-gateway
type: Opaque
data:
  WPS_CLIENT_ID: <base64-encoded-client-id>
  WPS_CLIENT_SECRET: <base64-encoded-client-secret>
  REDIS_PASSWORD: <base64-encoded-redis-password>
```

创建 `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway-deployment
  namespace: stratix-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gateway
  template:
    metadata:
      labels:
        app: gateway
    spec:
      containers:
      - name: gateway
        image: stratix/api-gateway:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: gateway-config
        - secretRef:
            name: gateway-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

创建 `k8s/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: gateway-service
  namespace: stratix-gateway
spec:
  selector:
    app: gateway
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

创建 `k8s/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gateway-ingress
  namespace: stratix-gateway
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - gateway.example.com
    secretName: gateway-tls
  rules:
  - host: gateway.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gateway-service
            port:
              number: 80
```

### 5.2 部署到 Kubernetes

```bash
# 1. 应用配置
kubectl apply -f k8s/

# 2. 查看部署状态
kubectl get pods -n stratix-gateway

# 3. 查看服务状态
kubectl get svc -n stratix-gateway

# 4. 查看日志
kubectl logs -f deployment/gateway-deployment -n stratix-gateway

# 5. 扩展副本
kubectl scale deployment gateway-deployment --replicas=5 -n stratix-gateway
```

## 6. 监控和日志

### 6.1 Prometheus 配置

创建 `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "gateway_rules.yml"

scrape_configs:
  - job_name: 'gateway'
    static_configs:
      - targets: ['gateway:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'consul'
    static_configs:
      - targets: ['consul:8500']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### 6.2 Grafana 仪表板

导入预配置的仪表板模板，监控关键指标：

- 请求量和响应时间
- 错误率和成功率
- 系统资源使用情况
- 缓存命中率
- 认证成功率

## 7. 运维管理

### 7.1 日常维护

```bash
# 查看服务状态
docker-compose ps
kubectl get pods -n stratix-gateway

# 查看日志
docker-compose logs -f gateway
kubectl logs -f deployment/gateway-deployment -n stratix-gateway

# 重启服务
docker-compose restart gateway
kubectl rollout restart deployment/gateway-deployment -n stratix-gateway

# 更新配置
docker-compose up -d
kubectl apply -f k8s/configmap.yaml
```

### 7.2 备份和恢复

```bash
# 备份 Redis 数据
docker exec redis redis-cli BGSAVE

# 备份 Consul 数据
consul snapshot save backup.snap

# 备份配置文件
tar -czf config-backup.tar.gz k8s/ docker-compose.yml .env
```

### 7.3 故障排查

常见问题和解决方案：

1. **服务启动失败**: 检查配置文件和环境变量
2. **认证失败**: 验证 OAuth2 配置和网络连接
3. **性能问题**: 检查资源使用情况和缓存配置
4. **网络问题**: 检查防火墙和负载均衡配置
