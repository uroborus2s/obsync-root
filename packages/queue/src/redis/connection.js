/**
 * Redis连接管理
 */
import { EventEmitter } from 'events';
import { Cluster, Redis } from 'ioredis';
import { createRedisError, RedisConnectionError, RedisTimeoutError } from '../errors/redis-error.js';
import { createLogger, timeout } from '../utils/index.js';
export class RedisConnectionManager extends EventEmitter {
    connections = new Map();
    connectionInfo = new Map();
    config;
    logger;
    isConnected = false;
    reconnectTimer;
    constructor(config) {
        super();
        this.config = {
            poolSize: 10,
            retryAttempts: 3,
            retryDelay: 1000,
            ...config
        };
        this.logger = createLogger({ level: 1 }); // INFO level
    }
    /**
     * 连接到Redis
     */
    async connect() {
        try {
            this.logger.info('Connecting to Redis...', { config: this.config });
            if (this.config.cluster) {
                await this.connectCluster();
            }
            else if (this.config.single) {
                await this.connectSingle();
            }
            else {
                throw new RedisConnectionError('No Redis configuration provided');
            }
            this.isConnected = true;
            this.emit('connected');
            this.logger.info('Successfully connected to Redis');
        }
        catch (error) {
            this.logger.error('Failed to connect to Redis', error instanceof Error ? error : new Error(String(error)));
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * 断开连接
     */
    async disconnect() {
        try {
            this.logger.info('Disconnecting from Redis...');
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = undefined;
            }
            Array.from(this.connections.values()).forEach((connection) => connection.disconnect());
            this.connections.clear();
            this.connectionInfo.clear();
            this.isConnected = false;
            this.emit('disconnected');
            this.logger.info('Successfully disconnected from Redis');
        }
        catch (error) {
            this.logger.error('Error during Redis disconnection', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    /**
     * 获取连接
     */
    getConnection(name = 'default') {
        const connection = this.connections.get(name);
        if (!connection) {
            throw createRedisError.connection(`Connection '${name}' not found`);
        }
        // 更新最后使用时间
        const info = this.connectionInfo.get(name);
        if (info) {
            info.lastUsed = Date.now();
        }
        return connection;
    }
    /**
     * 创建新连接
     */
    async createConnection(name, config) {
        const connectionConfig = { ...this.config, ...config };
        let connection;
        if (connectionConfig.cluster) {
            connection = await this.createClusterConnection(connectionConfig.cluster);
        }
        else if (connectionConfig.single) {
            connection = await this.createSingleConnection(connectionConfig.single);
        }
        else {
            throw new RedisConnectionError('No Redis configuration provided for new connection');
        }
        this.connections.set(name, connection);
        this.connectionInfo.set(name, {
            id: name,
            type: connectionConfig.cluster ? 'cluster' : 'single',
            status: 'connected',
            host: connectionConfig.single?.host,
            port: connectionConfig.single?.port,
            nodes: connectionConfig.cluster?.nodes,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            errorCount: 0
        });
        return connection;
    }
    /**
     * 移除连接
     */
    async removeConnection(name) {
        const connection = this.connections.get(name);
        if (connection) {
            connection.disconnect();
            this.connections.delete(name);
            this.connectionInfo.delete(name);
        }
    }
    /**
     * 检查连接健康状态
     */
    async healthCheck() {
        try {
            const connection = this.getConnection();
            await timeout(connection.ping(), 5000);
            return true;
        }
        catch (error) {
            this.logger.warn('Redis health check failed', error);
            return false;
        }
    }
    /**
     * 获取连接信息
     */
    getConnectionInfo() {
        return Array.from(this.connectionInfo.values());
    }
    /**
     * 是否已连接
     */
    isConnectionHealthy() {
        return this.isConnected && this.connections.size > 0;
    }
    /**
     * 连接到集群
     */
    async connectCluster() {
        const { nodes, options } = this.config.cluster;
        const cluster = new Cluster(nodes, {
            enableOfflineQueue: false,
            retryDelayOnFailover: 100,
            // maxRetriesPerRequest: this.config.retryAttempts, // 该选项在当前版本不支持
            ...options
        });
        await this.setupClusterEventHandlers(cluster);
        await this.waitForConnection(cluster);
        this.connections.set('default', cluster);
        this.connectionInfo.set('default', {
            id: 'default',
            type: 'cluster',
            status: 'connected',
            nodes,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            errorCount: 0
        });
    }
    /**
     * 连接到单个Redis实例
     */
    async connectSingle() {
        const { host, port, options } = this.config.single;
        const redis = new Redis({
            host,
            port,
            maxRetriesPerRequest: this.config.retryAttempts,
            ...options
        });
        await this.setupSingleEventHandlers(redis);
        await this.waitForConnection(redis);
        this.connections.set('default', redis);
        this.connectionInfo.set('default', {
            id: 'default',
            type: 'single',
            status: 'connected',
            host,
            port,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            errorCount: 0
        });
    }
    /**
     * 创建集群连接
     */
    async createClusterConnection(config) {
        const cluster = new Cluster(config.nodes, {
            enableOfflineQueue: false,
            retryDelayOnFailover: 100,
            ...config.options
        });
        await this.setupClusterEventHandlers(cluster);
        await this.waitForConnection(cluster);
        return cluster;
    }
    /**
     * 创建单个连接
     */
    async createSingleConnection(config) {
        const redis = new Redis({
            host: config.host,
            port: config.port,
            maxRetriesPerRequest: this.config.retryAttempts,
            ...config.options
        });
        await this.setupSingleEventHandlers(redis);
        await this.waitForConnection(redis);
        return redis;
    }
    /**
     * 设置集群事件处理器
     */
    async setupClusterEventHandlers(cluster) {
        cluster.on('connect', () => {
            this.logger.info('Redis cluster connected');
            this.updateConnectionStatus('default', 'connected');
        });
        cluster.on('ready', () => {
            this.logger.info('Redis cluster ready');
        });
        cluster.on('error', (error) => {
            this.logger.error('Redis cluster error', error);
            this.updateConnectionStatus('default', 'error');
            this.incrementErrorCount('default');
            this.emit('error', error);
        });
        cluster.on('close', () => {
            this.logger.warn('Redis cluster connection closed');
            this.updateConnectionStatus('default', 'disconnected');
            this.scheduleReconnect();
        });
        cluster.on('reconnecting', () => {
            this.logger.info('Redis cluster reconnecting');
            this.updateConnectionStatus('default', 'connecting');
        });
        cluster.on('end', () => {
            this.logger.warn('Redis cluster connection ended');
            this.updateConnectionStatus('default', 'disconnected');
        });
    }
    /**
     * 设置单个连接事件处理器
     */
    async setupSingleEventHandlers(redis) {
        redis.on('connect', () => {
            this.logger.info('Redis connected');
            this.updateConnectionStatus('default', 'connected');
        });
        redis.on('ready', () => {
            this.logger.info('Redis ready');
        });
        redis.on('error', (error) => {
            this.logger.error('Redis error', error);
            this.updateConnectionStatus('default', 'error');
            this.incrementErrorCount('default');
            this.emit('error', error);
        });
        redis.on('close', () => {
            this.logger.warn('Redis connection closed');
            this.updateConnectionStatus('default', 'disconnected');
            this.scheduleReconnect();
        });
        redis.on('reconnecting', () => {
            this.logger.info('Redis reconnecting');
            this.updateConnectionStatus('default', 'connecting');
        });
        redis.on('end', () => {
            this.logger.warn('Redis connection ended');
            this.updateConnectionStatus('default', 'disconnected');
        });
    }
    /**
     * 等待连接建立
     */
    async waitForConnection(connection) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new RedisTimeoutError('connect', 10000));
            }, 10000);
            connection.once('ready', () => {
                clearTimeout(timeoutId);
                resolve();
            });
            connection.once('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
    /**
     * 更新连接状态
     */
    updateConnectionStatus(name, status) {
        const info = this.connectionInfo.get(name);
        if (info) {
            info.status = status;
        }
    }
    /**
     * 增加错误计数
     */
    incrementErrorCount(name) {
        const info = this.connectionInfo.get(name);
        if (info) {
            info.errorCount++;
        }
    }
    /**
     * 调度重连
     */
    scheduleReconnect() {
        if (this.reconnectTimer)
            return;
        this.reconnectTimer = setTimeout(async () => {
            try {
                this.logger.info('Attempting to reconnect to Redis...');
                await this.connect();
                this.reconnectTimer = undefined;
            }
            catch (error) {
                this.logger.error('Reconnection failed', error instanceof Error ? error : new Error(String(error)));
                this.scheduleReconnect();
            }
        }, this.config.retryDelay || 5000);
    }
}
//# sourceMappingURL=connection.js.map