# HTTP 413 "Request body is too large" 错误解决方案

## 问题描述

```json
{
    "error": {
        "message": "Request body is too large",
        "statusCode": 413,
        "timestamp": "2025-08-30T16:29:06.743Z"
    }
}
```

这是一个HTTP 413错误，表示请求体的大小超过了服务器设置的限制。

## 问题原因

1. **文件上传过大**：学生上传请假申请附件时，图片文件过大
2. **Base64编码膨胀**：图片转换为Base64后体积增大约33%
3. **多文件同时上传**：一次性上传多个大图片
4. **服务器限制过小**：默认的请求体大小限制不足

## 解决方案

### 1. 服务器端配置修改

#### 1.1 Fastify配置优化

已在 `apps/app-icalink/src/stratix.config.ts` 中增加配置：

```typescript
server: {
  port: webConfig.port || '3001',
  host: webConfig.host || '0.0.0.0',
  // 增加请求体大小限制，支持大文件上传
  bodyLimit: 50 * 1024 * 1024, // 50MB，支持多个大图片上传
  requestTimeout: 60000, // 60秒请求超时
  keepAliveTimeout: 30000, // 30秒保持连接
  maxParamLength: 1000 // 增加参数长度限制
}
```

#### 1.2 配置说明

| 配置项 | 值 | 说明 |
|-------|---|------|
| `bodyLimit` | 50MB | 请求体大小限制，支持多个大图片 |
| `requestTimeout` | 60秒 | 请求处理超时时间 |
| `keepAliveTimeout` | 30秒 | 连接保持时间 |
| `maxParamLength` | 1000 | URL参数最大长度 |

### 2. 前端优化策略

#### 2.1 文件大小控制

前端已实现的限制：
- 单个文件最大：3MB
- 总文件大小：8MB
- 最大文件数量：3个

#### 2.2 图片压缩优化

建议在前端添加图片压缩功能：

```typescript
// 图片压缩函数示例
async function compressImage(file: File, maxSize: number = 1024 * 1024): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // 计算压缩比例
      const ratio = Math.min(800 / img.width, 600 / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      // 绘制压缩后的图片
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // 转换为Blob
      canvas.toBlob((blob) => {
        const compressedFile = new File([blob!], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        resolve(compressedFile);
      }, 'image/jpeg', 0.8); // 80%质量
    };
    
    img.src = URL.createObjectURL(file);
  });
}
```

### 3. Nginx配置（如果使用）

如果前端通过Nginx代理，需要增加Nginx配置：

```nginx
server {
    # 增加客户端请求体大小限制
    client_max_body_size 50M;
    
    # 增加缓冲区大小
    client_body_buffer_size 1M;
    
    # 增加超时时间
    client_body_timeout 60s;
    
    location /api/ {
        proxy_pass http://backend;
        
        # 代理超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 请求体大小
        proxy_request_buffering off;
    }
}
```

### 4. 数据库配置优化

#### 4.1 MySQL配置

检查MySQL的相关配置：

```sql
-- 查看当前配置
SHOW VARIABLES LIKE 'max_allowed_packet';
SHOW VARIABLES LIKE 'innodb_log_file_size';

-- 如果需要，增加配置（在my.cnf中）
-- max_allowed_packet = 50M
-- innodb_log_file_size = 256M
```

#### 4.2 连接池配置

确保数据库连接池配置合适：

```typescript
// 在数据库配置中
connections: {
  default: {
    // ... 其他配置
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    }
  }
}
```

### 5. 监控和日志

#### 5.1 添加请求大小监控

```typescript
// 在请求处理中添加日志
fastify.addHook('preHandler', async (request, reply) => {
  const contentLength = request.headers['content-length'];
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    request.log.warn({
      contentLength,
      url: request.url,
      method: request.method
    }, 'Large request body detected');
  }
});
```

#### 5.2 错误处理优化

```typescript
// 在错误处理中添加特殊处理
fastify.setErrorHandler((error, request, reply) => {
  if (error.statusCode === 413) {
    reply.status(413).send({
      success: false,
      message: '上传文件过大，请压缩后重试',
      code: 'REQUEST_TOO_LARGE',
      details: {
        maxSize: '50MB',
        suggestion: '请压缩图片或减少上传文件数量'
      }
    });
    return;
  }
  
  // 其他错误处理...
});
```

## 测试验证

### 1. 测试大文件上传

```bash
# 使用curl测试大文件上传
curl -X POST "http://localhost:3001/api/icalink/v1/leave-applications" \
  -H "Content-Type: application/json" \
  -H "Cookie: userType=student; userId=student123" \
  -d @large_request.json
```

### 2. 监控请求大小

```bash
# 查看请求日志
tail -f logs/app.log | grep "Large request"
```

## 最佳实践

1. **渐进式上传**：对于多个文件，考虑分批上传
2. **客户端压缩**：在前端进行图片压缩
3. **格式优化**：推荐使用WebP格式
4. **缓存策略**：避免重复上传相同文件
5. **进度显示**：为大文件上传提供进度条

## 故障排除

### 常见问题

1. **仍然出现413错误**：检查Nginx配置
2. **上传超时**：增加timeout配置
3. **内存不足**：检查服务器内存使用
4. **数据库错误**：检查max_allowed_packet设置

### 调试命令

```bash
# 检查当前配置
curl -I http://localhost:3001/health

# 查看服务器日志
docker logs app-icalink

# 检查内存使用
free -h
```
