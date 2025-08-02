# Redis集群配置方案

## 🎯 集群架构设计

### 集群拓扑

```
┌─────────────────────────────────────────────────────────────────┐
│                        Redis Cluster                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Master 1  │  │   Master 2  │  │   Master 3  │             │
│  │ Slot 0-5460 │  │Slot 5461-   │  │Slot 10923-  │             │
│  │             │  │   10922     │  │   16383     │             │
│  │ Port: 7001  │  │ Port: 7002  │  │ Port: 7003  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │                 │                 │                  │
│         ▼                 ▼                 ▼                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Slave 1   │  │   Slave 2   │  │   Slave 3   │             │
│  │             │  │             │  │             │             │
│  │ Port: 7004  │  │ Port: 7005  │  │ Port: 7006  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 集群特性
- **节点数量**: 6个节点 (3主3从)
- **分片策略**: 16384个Hash Slot
- **复制因子**: 1 (每个主节点1个从节点)
- **故障转移**: 自动故障检测和切换
- **数据分布**: 基于CRC16哈希算法

## ⚙️ Redis配置

### 1. 主节点配置 (redis-master.conf)

```conf
# 基础配置
port 7001
bind 0.0.0.0
protected-mode no
daemonize yes
pidfile /var/run/redis/redis-7001.pid
logfile /var/log/redis/redis-7001.log
loglevel notice

# 内存配置
maxmemory 8gb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# 持久化配置
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump-7001.rdb
dir /var/lib/redis

# AOF配置
appendonly yes
appendfilename "appendonly-7001.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble yes

# 集群配置
cluster-enabled yes
cluster-config-file nodes-7001.conf
cluster-node-timeout 15000
cluster-announce-ip 192.168.1.10
cluster-announce-port 7001
cluster-announce-bus-port 17001

# 网络配置
tcp-backlog 511
timeout 0
tcp-keepalive 300
tcp-user-timeout 0

# 客户端配置
maxclients 10000

# 安全配置
requirepass your_redis_password
masterauth your_redis_password

# 性能优化
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000
stream-node-max-bytes 4096
stream-node-max-entries 100

# 慢查询日志
slowlog-log-slower-than 10000
slowlog-max-len 128

# 延迟监控
latency-monitor-threshold 100

# 客户端输出缓冲区
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60

# 线程配置
io-threads 4
io-threads-do-reads yes
```

### 2. 从节点配置 (redis-slave.conf)

```conf
# 继承主节点配置，修改以下参数
port 7004
pidfile /var/run/redis/redis-7004.pid
logfile /var/log/redis/redis-7004.log
dbfilename dump-7004.rdb
appendfilename "appendonly-7004.aof"
cluster-config-file nodes-7004.conf
cluster-announce-port 7004
cluster-announce-bus-port 17004

# 从节点特殊配置
replica-read-only yes
replica-serve-stale-data yes
replica-priority 100
```

## 🐳 Docker部署配置

### 1. Docker Compose配置

```yaml
version: '3.8'

services:
  # Redis Master 节点
  redis-master-1:
    image: redis:7.2-alpine
    container_name: redis-master-1
    ports:
      - "7001:7001"
      - "17001:17001"
    volumes:
      - ./config/redis-master-1.conf:/usr/local/etc/redis/redis.conf
      - redis-master-1-data:/data
    command: redis-server /usr/local/etc/redis/redis.conf
    networks:
      - redis-cluster
    restart: unless-stopped
    
  redis-master-2:
    image: redis:7.2-alpine
    container_name: redis-master-2
    ports:
      - "7002:7002"
      - "17002:17002"
    volumes:
      - ./config/redis-master-2.conf:/usr/local/etc/redis/redis.conf
      - redis-master-2-data:/data
    command: redis-server /usr/local/etc/redis/redis.conf
    networks:
      - redis-cluster
    restart: unless-stopped
    
  redis-master-3:
    image: redis:7.2-alpine
    container_name: redis-master-3
    ports:
      - "7003:7003"
      - "17003:17003"
    volumes:
      - ./config/redis-master-3.conf:/usr/local/etc/redis/redis.conf
      - redis-master-3-data:/data
    command: redis-server /usr/local/etc/redis/redis.conf
    networks:
      - redis-cluster
    restart: unless-stopped

  # Redis Slave 节点
  redis-slave-1:
    image: redis:7.2-alpine
    container_name: redis-slave-1
    ports:
      - "7004:7004"
      - "17004:17004"
    volumes:
      - ./config/redis-slave-1.conf:/usr/local/etc/redis/redis.conf
      - redis-slave-1-data:/data
    command: redis-server /usr/local/etc/redis/redis.conf
    networks:
      - redis-cluster
    restart: unless-stopped
    depends_on:
      - redis-master-1
      
  redis-slave-2:
    image: redis:7.2-alpine
    container_name: redis-slave-2
    ports:
      - "7005:7005"
      - "17005:17005"
    volumes:
      - ./config/redis-slave-2.conf:/usr/local/etc/redis/redis.conf
      - redis-slave-2-data:/data
    command: redis-server /usr/local/etc/redis/redis.conf
    networks:
      - redis-cluster
    restart: unless-stopped
    depends_on:
      - redis-master-2
      
  redis-slave-3:
    image: redis:7.2-alpine
    container_name: redis-slave-3
    ports:
      - "7006:7006"
      - "17006:17006"
    volumes:
      - ./config/redis-slave-3.conf:/usr/local/etc/redis/redis.conf
      - redis-slave-3-data:/data
    command: redis-server /usr/local/etc/redis/redis.conf
    networks:
      - redis-cluster
    restart: unless-stopped
    depends_on:
      - redis-master-3

  # 集群初始化容器
  redis-cluster-init:
    image: redis:7.2-alpine
    container_name: redis-cluster-init
    networks:
      - redis-cluster
    depends_on:
      - redis-master-1
      - redis-master-2
      - redis-master-3
      - redis-slave-1
      - redis-slave-2
      - redis-slave-3
    command: >
      sh -c "
        sleep 10 &&
        redis-cli --cluster create 
        redis-master-1:7001 
        redis-master-2:7002 
        redis-master-3:7003 
        redis-slave-1:7004 
        redis-slave-2:7005 
        redis-slave-3:7006 
        --cluster-replicas 1 
        --cluster-yes
      "

volumes:
  redis-master-1-data:
  redis-master-2-data:
  redis-master-3-data:
  redis-slave-1-data:
  redis-slave-2-data:
  redis-slave-3-data:

networks:
  redis-cluster:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 2. Kubernetes部署配置

```yaml
# Redis Cluster StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: redis
spec:
  serviceName: redis-cluster
  replicas: 6
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
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
        volumeMounts:
        - name: conf
          mountPath: /etc/redis
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
      volumes:
      - name: conf
        configMap:
          name: redis-cluster-config
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
# Redis Cluster Service
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster
  namespace: redis
spec:
  clusterIP: None
  selector:
    app: redis-cluster
  ports:
  - port: 6379
    targetPort: 6379
    name: client
  - port: 16379
    targetPort: 16379
    name: gossip

---
# Redis Cluster ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cluster-config
  namespace: redis
data:
  redis.conf: |
    cluster-enabled yes
    cluster-config-file nodes.conf
    cluster-node-timeout 5000
    appendonly yes
    port 6379
    bind 0.0.0.0
    protected-mode no
    maxmemory 6gb
    maxmemory-policy allkeys-lru
```

## 🔧 集群管理脚本

### 1. 集群初始化脚本

```bash
#!/bin/bash
# init-cluster.sh

set -e

echo "正在初始化Redis集群..."

# 等待所有节点启动
echo "等待Redis节点启动..."
sleep 30

# 创建集群
redis-cli --cluster create \
  192.168.1.10:7001 \
  192.168.1.11:7002 \
  192.168.1.12:7003 \
  192.168.1.13:7004 \
  192.168.1.14:7005 \
  192.168.1.15:7006 \
  --cluster-replicas 1 \
  --cluster-yes

echo "Redis集群初始化完成！"

# 检查集群状态
echo "检查集群状态..."
redis-cli -c -h 192.168.1.10 -p 7001 cluster info
redis-cli -c -h 192.168.1.10 -p 7001 cluster nodes
```

### 2. 集群健康检查脚本

```bash
#!/bin/bash
# health-check.sh

NODES=(
  "192.168.1.10:7001"
  "192.168.1.11:7002"
  "192.168.1.12:7003"
  "192.168.1.13:7004"
  "192.168.1.14:7005"
  "192.168.1.15:7006"
)

echo "Redis集群健康检查..."

for node in "${NODES[@]}"; do
  IFS=':' read -r host port <<< "$node"
  
  if redis-cli -h "$host" -p "$port" ping > /dev/null 2>&1; then
    echo "✅ $node - 正常"
  else
    echo "❌ $node - 异常"
  fi
done

# 检查集群状态
echo -e "\n集群状态:"
redis-cli -c -h 192.168.1.10 -p 7001 cluster info | grep cluster_state

echo -e "\n节点信息:"
redis-cli -c -h 192.168.1.10 -p 7001 cluster nodes
```

### 3. 集群扩容脚本

```bash
#!/bin/bash
# scale-cluster.sh

NEW_MASTER_HOST="192.168.1.16"
NEW_MASTER_PORT="7007"
NEW_SLAVE_HOST="192.168.1.17"
NEW_SLAVE_PORT="7008"
EXISTING_NODE="192.168.1.10:7001"

echo "开始扩容Redis集群..."

# 添加新的主节点
echo "添加新主节点 $NEW_MASTER_HOST:$NEW_MASTER_PORT"
redis-cli --cluster add-node \
  $NEW_MASTER_HOST:$NEW_MASTER_PORT \
  $EXISTING_NODE

# 重新分片
echo "重新分片集群..."
redis-cli --cluster reshard \
  $EXISTING_NODE \
  --cluster-from all \
  --cluster-to $(redis-cli -h $NEW_MASTER_HOST -p $NEW_MASTER_PORT cluster myid) \
  --cluster-slots 1365 \
  --cluster-yes

# 添加新的从节点
echo "添加新从节点 $NEW_SLAVE_HOST:$NEW_SLAVE_PORT"
redis-cli --cluster add-node \
  $NEW_SLAVE_HOST:$NEW_SLAVE_PORT \
  $EXISTING_NODE \
  --cluster-slave \
  --cluster-master-id $(redis-cli -h $NEW_MASTER_HOST -p $NEW_MASTER_PORT cluster myid)

echo "集群扩容完成！"
```

## 📊 监控配置

### 1. Prometheus配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'redis-cluster'
    static_configs:
      - targets:
        - '192.168.1.10:9121'
        - '192.168.1.11:9121'
        - '192.168.1.12:9121'
        - '192.168.1.13:9121'
        - '192.168.1.14:9121'
        - '192.168.1.15:9121'
    scrape_interval: 10s
    metrics_path: /metrics
```

### 2. Redis Exporter配置

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  redis-exporter-1:
    image: oliver006/redis_exporter:latest
    ports:
      - "9121:9121"
    environment:
      REDIS_ADDR: "redis://redis-master-1:7001"
      REDIS_PASSWORD: "your_redis_password"
    networks:
      - redis-cluster

  redis-exporter-2:
    image: oliver006/redis_exporter:latest
    ports:
      - "9122:9121"
    environment:
      REDIS_ADDR: "redis://redis-master-2:7002"
      REDIS_PASSWORD: "your_redis_password"
    networks:
      - redis-cluster

  redis-exporter-3:
    image: oliver006/redis_exporter:latest
    ports:
      - "9123:9121"
    environment:
      REDIS_ADDR: "redis://redis-master-3:7003"
      REDIS_PASSWORD: "your_redis_password"
    networks:
      - redis-cluster

networks:
  redis-cluster:
    external: true
```

## 🔒 安全配置

### 1. 网络安全

```bash
# 防火墙规则
# 只允许应用服务器访问Redis端口
iptables -A INPUT -p tcp --dport 7001:7006 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 17001:17006 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 7001:7006 -j DROP
iptables -A INPUT -p tcp --dport 17001:17006 -j DROP
```

### 2. 认证配置

```conf
# Redis ACL配置
# 创建应用用户
ACL SETUSER app-user on >app_password ~queue:* +@read +@write +@stream -@dangerous

# 创建监控用户
ACL SETUSER monitor-user on >monitor_password ~* +@read -@write -@dangerous

# 创建管理员用户
ACL SETUSER admin-user on >admin_password ~* +@all
```

## 📋 运维检查清单

### 日常检查项目
- [ ] 集群节点状态检查
- [ ] 内存使用率监控
- [ ] 网络连接数检查
- [ ] 慢查询日志分析
- [ ] 持久化文件检查
- [ ] 备份文件验证

### 性能优化项目
- [ ] 内存碎片整理
- [ ] 过期键清理
- [ ] 连接池优化
- [ ] 网络参数调优
- [ ] 磁盘I/O优化
- [ ] CPU使用率优化
