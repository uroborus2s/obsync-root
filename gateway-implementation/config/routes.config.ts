// 路由配置文件
// 定义网关的路由规则和上游服务映射

import type { RouteConfig } from '../src/types/routing.js';

/**
 * 路由配置列表
 * 定义了网关如何将请求转发到上游服务
 */
const routes: RouteConfig[] = [
  // 用户服务路由
  {
    id: 'user-service',
    path: '/api/users/*',
    method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    target: [
      process.env.USER_SERVICE_URL_1 || 'http://localhost:3001',
      process.env.USER_SERVICE_URL_2 || 'http://localhost:3002'
    ],
    
    // 路径重写
    rewrite: {
      '^/api/users': '/users'
    },
    
    // 负载均衡配置
    loadBalancing: {
      strategy: 'round-robin',
      healthCheck: true
    },
    
    // 认证配置
    auth: {
      required: true,
      permissions: ['user:read', 'user:write']
    },
    
    // 限流配置
    rateLimit: {
      max: 100,
      timeWindow: '1 minute'
    },
    
    // 超时配置
    timeout: 30000,
    retries: 3,
    
    // 自定义请求头
    headers: {
      'X-Service': 'user-service',
      'X-Version': 'v1'
    },
    
    // 缓存配置
    cache: {
      enabled: true,
      ttl: 300, // 5分钟
      methods: ['GET'],
      varyBy: ['authorization']
    }
  },

  // 订单服务路由
  {
    id: 'order-service',
    path: '/api/orders/*',
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    target: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    
    rewrite: {
      '^/api/orders': '/orders'
    },
    
    auth: {
      required: true,
      roles: ['user', 'admin'],
      permissions: ['order:read', 'order:write']
    },
    
    rateLimit: {
      max: 50,
      timeWindow: '1 minute'
    },
    
    timeout: 45000, // 订单处理可能需要更长时间
    retries: 2,
    
    headers: {
      'X-Service': 'order-service',
      'X-Version': 'v1'
    },
    
    // 订单服务不缓存，因为数据变化频繁
    cache: {
      enabled: false
    }
  },

  // 产品服务路由
  {
    id: 'product-service',
    path: '/api/products/*',
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    target: [
      process.env.PRODUCT_SERVICE_URL_1 || 'http://localhost:3004',
      process.env.PRODUCT_SERVICE_URL_2 || 'http://localhost:3005'
    ],
    
    rewrite: {
      '^/api/products': '/products'
    },
    
    loadBalancing: {
      strategy: 'least-connections',
      healthCheck: true
    },
    
    // 产品信息读取不需要认证，但写入需要
    auth: {
      required: false, // 在路由级别设置为可选
      conditionalAuth: {
        'GET': { required: false },
        'POST': { required: true, permissions: ['product:create'] },
        'PUT': { required: true, permissions: ['product:update'] },
        'DELETE': { required: true, permissions: ['product:delete'] }
      }
    },
    
    rateLimit: {
      max: 200,
      timeWindow: '1 minute'
    },
    
    timeout: 20000,
    retries: 3,
    
    headers: {
      'X-Service': 'product-service',
      'X-Version': 'v1'
    },
    
    // 产品信息适合缓存
    cache: {
      enabled: true,
      ttl: 600, // 10分钟
      methods: ['GET'],
      varyBy: ['accept-language']
    }
  },

  // 支付服务路由
  {
    id: 'payment-service',
    path: '/api/payments/*',
    method: ['POST', 'GET'],
    target: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
    
    rewrite: {
      '^/api/payments': '/payments'
    },
    
    // 支付服务需要严格认证
    auth: {
      required: true,
      roles: ['user', 'admin'],
      permissions: ['payment:process']
    },
    
    // 支付服务限流更严格
    rateLimit: {
      max: 20,
      timeWindow: '1 minute'
    },
    
    timeout: 60000, // 支付处理可能需要更长时间
    retries: 1, // 支付请求不应该重试太多次
    
    headers: {
      'X-Service': 'payment-service',
      'X-Version': 'v1',
      'X-Security-Level': 'high'
    },
    
    // 支付信息不缓存
    cache: {
      enabled: false
    },
    
    // 支付服务需要HTTPS
    security: {
      requireHttps: true,
      additionalHeaders: {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      }
    }
  },

  // 通知服务路由
  {
    id: 'notification-service',
    path: '/api/notifications/*',
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
    
    rewrite: {
      '^/api/notifications': '/notifications'
    },
    
    auth: {
      required: true,
      permissions: ['notification:read', 'notification:send']
    },
    
    rateLimit: {
      max: 30,
      timeWindow: '1 minute'
    },
    
    timeout: 15000,
    retries: 2,
    
    headers: {
      'X-Service': 'notification-service',
      'X-Version': 'v1'
    }
  },

  // 文件服务路由
  {
    id: 'file-service',
    path: '/api/files/*',
    method: ['GET', 'POST', 'DELETE'],
    target: process.env.FILE_SERVICE_URL || 'http://localhost:3008',
    
    rewrite: {
      '^/api/files': '/files'
    },
    
    auth: {
      required: true,
      conditionalAuth: {
        'GET': { required: false }, // 文件下载可能不需要认证
        'POST': { required: true, permissions: ['file:upload'] },
        'DELETE': { required: true, permissions: ['file:delete'] }
      }
    },
    
    // 文件上传限流
    rateLimit: {
      max: 10,
      timeWindow: '1 minute'
    },
    
    timeout: 120000, // 文件上传可能需要更长时间
    retries: 1,
    
    headers: {
      'X-Service': 'file-service',
      'X-Version': 'v1'
    },
    
    // 文件服务特殊配置
    special: {
      // 大文件上传支持
      bodyLimit: 50 * 1024 * 1024, // 50MB
      // 流式传输
      streaming: true
    }
  },

  // 静态资源路由（不需要认证）
  {
    id: 'static-service',
    path: '/public/*',
    method: 'GET',
    target: process.env.STATIC_SERVICE_URL || 'http://localhost:3009',
    
    rewrite: {
      '^/public': ''
    },
    
    auth: {
      required: false
    },
    
    rateLimit: {
      max: 500,
      timeWindow: '1 minute'
    },
    
    timeout: 10000,
    retries: 3,
    
    headers: {
      'X-Service': 'static-service',
      'Cache-Control': 'public, max-age=3600'
    },
    
    // 静态资源适合长时间缓存
    cache: {
      enabled: true,
      ttl: 3600, // 1小时
      methods: ['GET']
    }
  },

  // 管理后台路由（需要管理员权限）
  {
    id: 'admin-service',
    path: '/admin/*',
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    target: process.env.ADMIN_SERVICE_URL || 'http://localhost:3010',
    
    auth: {
      required: true,
      roles: ['admin'],
      permissions: ['admin:access']
    },
    
    // 管理后台限流更严格
    rateLimit: {
      max: 50,
      timeWindow: '1 minute'
    },
    
    timeout: 30000,
    retries: 2,
    
    headers: {
      'X-Service': 'admin-service',
      'X-Version': 'v1',
      'X-Admin-Access': 'true'
    },
    
    // 管理后台不缓存
    cache: {
      enabled: false
    },
    
    // 管理后台需要额外安全措施
    security: {
      requireHttps: true,
      ipWhitelist: process.env.ADMIN_IP_WHITELIST?.split(','),
      additionalHeaders: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  },

  // WebSocket代理示例
  {
    id: 'websocket-service',
    path: '/ws/*',
    method: 'GET',
    target: process.env.WEBSOCKET_SERVICE_URL || 'http://localhost:3011',
    
    auth: {
      required: true
    },
    
    // WebSocket特殊配置
    websocket: {
      enabled: true,
      timeout: 300000, // 5分钟
      pingInterval: 30000 // 30秒
    },
    
    headers: {
      'X-Service': 'websocket-service'
    }
  }
];

export default routes;