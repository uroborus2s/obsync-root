# @stratix/queue 部署和运维指南

## 🎯 部署架构

### 生产环境架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        负载均衡层                                │
├─────────────────────────────────────────────────────────────────┤
│  Nginx/HAProxy  │  Nginx/HAProxy  │  Nginx/HAProxy             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        应用服务层                                │
├─────────────────────────────────────────────────────────────────┤
│  App Instance 1 │  App Instance 2 │  App Instance 3            │
│  (Producer +    │  (Producer +    │  (Consumer)                │
│   Consumer)     │   Consumer)     │                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Redis Cluster 层                           │
├─────────────────────────────────────────────────────────────────┤
│  Redis Master 1 │  Redis Master 2 │  Redis Master 3            │
│  (Slot 0-5460)  │  (Slot 5461-    │  (Slot 10923-              │
│                 │   10922)        │   16383)                   │
│  Redis Slave 1  │  Redis Slave 2  │  Redis Slave 3             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        监控和日志层                              │
├─────────────────────────────────────────────────────────────────┤
│  Prometheus     │  Grafana        │  ELK Stack                 │
│  AlertManager   │  Redis Insight  │  Jaeger                    │
└─────────────────────────────────────────────────────────────────┘
```

## 🐳 Docker部署

### 1. 应用容器化

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runtime

# 安装运行时依赖
RUN apk add --no-cache \
    dumb-init \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

WORKDIR /app

# 复制依赖和应用代码
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# 设置环境变量
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096 --enable-source-maps"

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 使用非root用户
USER nodejs

# 优雅关闭处理
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### 2. Docker Compose部署

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 应用服务
  queue-app-1:
    build: .
    container_name: queue-app-1
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
      - REDIS_CLUSTER_NODES=redis-master-1:7001,redis-master-2:7002,redis-master-3:7003
      - APP_ROLE=producer,consumer
    volumes:
      - ./logs:/app/logs
    networks:
      - queue-network
    depends_on:
      - redis-master-1
      - redis-master-2
      - redis-master-3
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2'
        reservations:
          memory: 2G
          cpus: '1'

  queue-app-2:
    build: .
    container_name: queue-app-2
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=production
      - REDIS_CLUSTER_NODES=redis-master-1:7001,redis-master-2:7002,redis-master-3:7003
      - APP_ROLE=consumer
    volumes:
      - ./logs:/app/logs
    networks:
      - queue-network
    depends_on:
      - redis-master-1
      - redis-master-2
      - redis-master-3
    restart: unless-stopped

  # Redis集群 (参考redis-cluster-config.md)
  redis-master-1:
    image: redis:7.2-alpine
    container_name: redis-master-1
    ports:
      - "7001:7001"
      - "17001:17001"
    volumes:
      - ./redis-config/master-1.conf:/usr/local/etc/redis/redis.conf
      - redis-master-1-data:/data
    command: redis-server /usr/local/etc/redis/redis.conf
    networks:
      - queue-network
    restart: unless-stopped

  # 监控服务
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - queue-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    networks:
      - queue-network
    restart: unless-stopped

  # 负载均衡
  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    networks:
      - queue-network
    depends_on:
      - queue-app-1
      - queue-app-2
    restart: unless-stopped

volumes:
  redis-master-1-data:
  redis-master-2-data:
  redis-master-3-data:
  prometheus-data:
  grafana-data:

networks:
  queue-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## ☸️ Kubernetes部署

### 1. 命名空间和配置

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: queue-system
  labels:
    name: queue-system

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: queue-config
  namespace: queue-system
data:
  redis-nodes: "redis-0.redis:6379,redis-1.redis:6379,redis-2.redis:6379"
  log-level: "info"
  batch-size: "100"
  pool-size: "50"

---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: queue-secrets
  namespace: queue-system
type: Opaque
data:
  redis-password: <base64-encoded-password>
  app-secret: <base64-encoded-secret>
```

### 2. Redis集群部署

```yaml
# redis-cluster.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: queue-system
spec:
  serviceName: redis
  replicas: 6
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7.2-alpine
        ports:
        - containerPort: 6379
          name: client
        - containerPort: 16379
          name: gossip
        command:
        - redis-server
        args:
        - /etc/redis/redis.conf
        - --cluster-enabled
        - "yes"
        - --cluster-config-file
        - nodes.conf
        - --cluster-node-timeout
        - "5000"
        - --appendonly
        - "yes"
        - --protected-mode
        - "no"
        volumeMounts:
        - name: data
          mountPath: /data
        - name: config
          mountPath: /etc/redis
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: redis-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
      storageClassName: fast-ssd

---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: queue-system
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
    name: client
  - port: 16379
    targetPort: 16379
    name: gossip
```

### 3. 应用部署

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queue-app
  namespace: queue-system
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: queue-app
  template:
    metadata:
      labels:
        app: queue-app
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: queue-app
        image: queue-app:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_CLUSTER_NODES
          valueFrom:
            configMapKeyRef:
              name: queue-config
              key: redis-nodes
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: queue-secrets
              key: redis-password
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: queue-config
              key: log-level
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - queue-app
              topologyKey: kubernetes.io/hostname

---
apiVersion: v1
kind: Service
metadata:
  name: queue-app-service
  namespace: queue-system
spec:
  selector:
    app: queue-app
  ports:
  - port: 80
    targetPort: 3000
    name: http
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: queue-app-ingress
  namespace: queue-system
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - queue.example.com
    secretName: queue-tls
  rules:
  - host: queue.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: queue-app-service
            port:
              number: 80
```

### 4. 水平扩缩容

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: queue-app-hpa
  namespace: queue-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: queue-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: queue_messages_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

## 📊 监控部署

### 1. Prometheus配置

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: queue-system
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
      - "/etc/prometheus/rules/*.yml"
    
    alerting:
      alertmanagers:
      - static_configs:
        - targets:
          - alertmanager:9093
    
    scrape_configs:
    - job_name: 'queue-app'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - queue-system
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
    
    - job_name: 'redis-cluster'
      static_configs:
      - targets:
        - redis-0.redis:6379
        - redis-1.redis:6379
        - redis-2.redis:6379
        - redis-3.redis:6379
        - redis-4.redis:6379
        - redis-5.redis:6379
      metrics_path: /metrics
      scrape_interval: 10s

  alert-rules.yml: |
    groups:
    - name: queue-alerts
      rules:
      - alert: HighMessageLatency
        expr: queue_message_latency_p99 > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High message latency detected"
          description: "P99 latency is {{ $value }}ms"
      
      - alert: QueueBacklog
        expr: queue_length > 10000
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Queue backlog detected"
          description: "Queue {{ $labels.queue }} has {{ $value }} messages"
      
      - alert: RedisNodeDown
        expr: up{job="redis-cluster"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis node is down"
          description: "Redis node {{ $labels.instance }} is down"
```

### 2. Grafana仪表板

```json
{
  "dashboard": {
    "title": "Queue System Dashboard",
    "panels": [
      {
        "title": "Message Throughput",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(queue_messages_sent_total[5m])",
            "legendFormat": "Messages Sent/sec"
          },
          {
            "expr": "rate(queue_messages_processed_total[5m])",
            "legendFormat": "Messages Processed/sec"
          }
        ]
      },
      {
        "title": "Message Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "queue_message_latency_p50",
            "legendFormat": "P50"
          },
          {
            "expr": "queue_message_latency_p95",
            "legendFormat": "P95"
          },
          {
            "expr": "queue_message_latency_p99",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "title": "Queue Length",
        "type": "graph",
        "targets": [
          {
            "expr": "queue_length",
            "legendFormat": "{{ queue }}"
          }
        ]
      },
      {
        "title": "Redis Cluster Status",
        "type": "table",
        "targets": [
          {
            "expr": "redis_cluster_nodes",
            "format": "table"
          }
        ]
      }
    ]
  }
}
```

## 🔧 运维操作

### 1. 部署脚本

```bash
#!/bin/bash
# deploy.sh

set -e

NAMESPACE="queue-system"
IMAGE_TAG=${1:-latest}

echo "开始部署队列系统..."

# 创建命名空间
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# 部署配置
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# 部署Redis集群
echo "部署Redis集群..."
kubectl apply -f k8s/redis-cluster.yaml

# 等待Redis集群就绪
echo "等待Redis集群启动..."
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s

# 初始化Redis集群
echo "初始化Redis集群..."
kubectl exec -n $NAMESPACE redis-0 -- redis-cli --cluster create \
  redis-0.redis:6379 redis-1.redis:6379 redis-2.redis:6379 \
  redis-3.redis:6379 redis-4.redis:6379 redis-5.redis:6379 \
  --cluster-replicas 1 --cluster-yes

# 部署应用
echo "部署应用..."
sed "s/IMAGE_TAG/$IMAGE_TAG/g" k8s/app-deployment.yaml | kubectl apply -f -

# 部署监控
echo "部署监控..."
kubectl apply -f k8s/monitoring/

# 等待应用就绪
echo "等待应用启动..."
kubectl wait --for=condition=available deployment/queue-app -n $NAMESPACE --timeout=300s

# 检查部署状态
echo "检查部署状态..."
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE

echo "部署完成！"
```

### 2. 健康检查脚本

```bash
#!/bin/bash
# health-check.sh

NAMESPACE="queue-system"

echo "=== 队列系统健康检查 ==="

# 检查Pod状态
echo "1. 检查Pod状态..."
kubectl get pods -n $NAMESPACE

# 检查Redis集群状态
echo -e "\n2. 检查Redis集群状态..."
kubectl exec -n $NAMESPACE redis-0 -- redis-cli cluster info | grep cluster_state
kubectl exec -n $NAMESPACE redis-0 -- redis-cli cluster nodes

# 检查应用健康状态
echo -e "\n3. 检查应用健康状态..."
for pod in $(kubectl get pods -n $NAMESPACE -l app=queue-app -o jsonpath='{.items[*].metadata.name}'); do
  echo "检查 $pod..."
  kubectl exec -n $NAMESPACE $pod -- curl -f http://localhost:3000/health || echo "健康检查失败"
done

# 检查服务状态
echo -e "\n4. 检查服务状态..."
kubectl get services -n $NAMESPACE

# 检查资源使用情况
echo -e "\n5. 检查资源使用情况..."
kubectl top pods -n $NAMESPACE

echo -e "\n健康检查完成！"
```

### 3. 扩容脚本

```bash
#!/bin/bash
# scale.sh

NAMESPACE="queue-system"
REPLICAS=${1:-5}

echo "扩容应用到 $REPLICAS 个副本..."

kubectl scale deployment queue-app --replicas=$REPLICAS -n $NAMESPACE

echo "等待扩容完成..."
kubectl wait --for=condition=available deployment/queue-app -n $NAMESPACE --timeout=300s

echo "当前Pod状态:"
kubectl get pods -n $NAMESPACE -l app=queue-app

echo "扩容完成！"
```

### 4. 备份脚本

```bash
#!/bin/bash
# backup.sh

NAMESPACE="queue-system"
BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"

mkdir -p $BACKUP_DIR

echo "开始备份Redis数据..."

# 备份每个Redis节点
for i in {0..5}; do
  echo "备份 redis-$i..."
  kubectl exec -n $NAMESPACE redis-$i -- redis-cli BGSAVE
  
  # 等待备份完成
  while [ "$(kubectl exec -n $NAMESPACE redis-$i -- redis-cli LASTSAVE)" = "$(kubectl exec -n $NAMESPACE redis-$i -- redis-cli LASTSAVE)" ]; do
    sleep 1
  done
  
  # 复制备份文件
  kubectl cp $NAMESPACE/redis-$i:/data/dump.rdb $BACKUP_DIR/redis-$i-dump.rdb
done

# 备份配置
kubectl get configmap -n $NAMESPACE -o yaml > $BACKUP_DIR/configmaps.yaml
kubectl get secret -n $NAMESPACE -o yaml > $BACKUP_DIR/secrets.yaml

echo "备份完成，保存在: $BACKUP_DIR"
```

## 📋 运维检查清单

### 日常检查
- [ ] 集群节点状态
- [ ] 应用Pod健康状态
- [ ] 队列长度监控
- [ ] 消息处理延迟
- [ ] 错误率统计
- [ ] 资源使用情况

### 定期维护
- [ ] 数据备份
- [ ] 日志清理
- [ ] 性能调优
- [ ] 安全更新
- [ ] 容量规划
- [ ] 故障演练

### 告警处理
- [ ] 高延迟告警
- [ ] 队列积压告警
- [ ] 节点故障告警
- [ ] 资源不足告警
- [ ] 错误率告警
- [ ] 连接数告警
