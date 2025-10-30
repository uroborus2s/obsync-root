# ERR_HTTP_HEADERS_SENT 问题修复总结

## 📋 问题概述

**错误信息**:
```
Error [ERR_HTTP_HEADERS_SENT]: Cannot write headers after they are sent to the client
```

**影响接口**: `GET /api/icalink/v1/courses/external/:external_id/complete?type=student`

**发生时间**: 2025-10-25 04:56:04

---

## 🔍 根本原因

### 问题代码 (修复前)

```typescript
@Get('/api/icalink/v1/courses/external/:external_id/complete')
async getCourseCompleteData(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ApiResponse<any>> {  // ❌ 返回类型是对象
  // ...
  
  if (isLeft(result)) {
    const error = result.left;
    
    // ❌ 只设置状态码,没有立即发送
    reply.status(404);
    
    // ❌ 返回对象,让Fastify自动序列化
    return {
      success: false,
      message: error.message,
      code: error.code
    };
  }
  
  // ❌ 同样的问题
  return {
    success: true,
    message: '获取课程完整数据成功',
    data: result.right
  };
}
```

### 错误发生流程

```
1. Controller返回数据对象
   ↓
2. Fastify开始序列化响应
   ↓
3. Fastify发送响应头 (Content-Type, Content-Length)
   ↓
4. Fastify开始发送响应体
   ↓
5. 在序列化或发送过程中发生错误
   (可能是数据包含循环引用、onSend钩子错误等)
   ↓
6. Fastify错误处理器尝试发送错误响应
   ↓
7. 但响应头已经发送! ❌
   ↓
8. 抛出 ERR_HTTP_HEADERS_SENT
```

---

## ✅ 修复方案

### 修复后的代码

```typescript
@Get('/api/icalink/v1/courses/external/:external_id/complete')
async getCourseCompleteData(
  request: FastifyRequest<{
    Params: { external_id: string };
    Querystring: { type?: 'student' | 'teacher' };
  }>,
  reply: FastifyReply
): Promise<void> {  // ✅ 改为 void
  const { external_id } = request.params;
  const { type = 'teacher' } = request.query;
  const userIdentity = (request as any).userIdentity;

  try {  // ✅ 添加 try-catch
    // 调用服务层
    const result = await this.attendanceService.getCourseCompleteData({
      externalId: external_id,
      userInfo: userIdentity,
      type
    });

    // 处理错误
    if (isLeft(result)) {
      const error = result.left;

      // ✅ 根据错误类型设置状态码并立即发送响应
      if (error.code === 'RESOURCE_NOT_FOUND') {
        return reply.status(404).send({
          success: false,
          message: error.message,
          code: error.code
        });
      } else if (
        error.code === 'UNAUTHORIZED' ||
        error.code === 'FORBIDDEN'
      ) {
        return reply.status(403).send({
          success: false,
          message: error.message,
          code: error.code
        });
      } else if (error.code === 'DATABASE_ERROR') {
        return reply.status(500).send({
          success: false,
          message: error.message,
          code: error.code
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: error.message,
          code: error.code
        });
      }
    }

    // ✅ 返回成功结果
    return reply.status(200).send({
      success: true,
      message: '获取课程完整数据成功',
      data: result.right
    });
  } catch (error: any) {
    // ✅ 捕获所有未预期的错误
    this.logger.error('获取课程完整数据失败', error);

    // ✅ 检查响应是否已发送
    if (!reply.sent) {
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}
```

### 关键改进点

1. **返回类型改为 `void`**: 不再返回对象,而是使用 `reply.send()` 显式发送响应
2. **添加 `try-catch`**: 捕获所有未预期的错误
3. **使用 `reply.status().send()`**: 链式调用,确保状态码和响应体一起发送
4. **检查 `reply.sent`**: 在发送错误响应前检查响应是否已发送

---

## 🚀 部署步骤

### 1. 构建应用

```bash
cd /Users/uroborus/NodeProject/wps/obsync-root

# 构建app-icalink
pnpm run build @stratix/app-icalink
```

### 2. 构建Docker镜像

```bash
# 构建镜像
docker build -t app-icalink:v1.0.3 -f apps/app-icalink/Dockerfile .

# 打标签
docker tag app-icalink:v1.0.3 g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icalink:v1.0.3

# 推送镜像
docker push g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icalink:v1.0.3
```

### 3. 更新Docker Swarm服务

```bash
# 更新服务
docker service update \
  --image g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icalink:v1.0.3 \
  obsync_app-icalink

# 查看更新状态
docker service ps obsync_app-icalink
```

### 4. 验证修复

```bash
# 查看日志,确认没有ERR_HTTP_HEADERS_SENT错误
docker service logs obsync_app-icalink --tail 100 | grep "ERR_HTTP_HEADERS_SENT"

# 应该没有输出

# 测试接口
curl -X GET "https://kwps.jlufe.edu.cn/api/icalink/v1/courses/external/20252026150309121010120252026186pm/complete?type=student" \
  -H "Cookie: wps_jwt_token=..." \
  -v
```

---

## 📊 影响范围

### 修改的文件

- `apps/app-icalink/src/controllers/AttendanceController.ts` (第70-144行)

### 影响的接口

- `GET /api/icalink/v1/courses/external/:external_id/complete`
  - 学生视图: `?type=student`
  - 教师视图: `?type=teacher`

### 其他需要检查的接口

建议检查所有类似的Controller方法,确保都使用了正确的响应模式:

```bash
# 搜索可能有问题的代码模式
cd apps/app-icalink/src/controllers
grep -n "reply.status" *.ts
grep -n "Promise<ApiResponse" *.ts
```

---

## 🎯 预防措施

### 1. 代码规范

**✅ 推荐做法**:

```typescript
// 方式1: 使用 reply.send() 并返回 void
async handler(request, reply): Promise<void> {
  return reply.send({ data: '...' });
}

// 方式2: 使用 reply.status().send() 链式调用
async handler(request, reply): Promise<void> {
  return reply.status(200).send({ data: '...' });
}

// 方式3: 使用 try-catch 保护
async handler(request, reply): Promise<void> {
  try {
    const result = await service.getData();
    return reply.send(result);
  } catch (error) {
    if (!reply.sent) {
      return reply.status(500).send({ error: '...' });
    }
  }
}
```

**❌ 避免做法**:

```typescript
// ❌ 不要返回对象让Fastify自动序列化
async handler(request, reply): Promise<ApiResponse> {
  reply.status(404);
  return { error: '...' };
}

// ❌ 不要多次发送响应
async handler(request, reply): Promise<void> {
  reply.send({ data: '...' });
  reply.send({ data: '...' });
}
```

### 2. ESLint规则

建议添加ESLint规则检测这类问题:

```json
{
  "rules": {
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/promise-function-async": "error"
  }
}
```

### 3. 单元测试

为所有Controller方法添加单元测试,确保:
- 只调用一次 `reply.send()`
- 正确处理错误情况
- 不会抛出 `ERR_HTTP_HEADERS_SENT`

---

## 📚 相关文档

- [ERR_HTTP_HEADERS_SENT错误分析](./ERR_HTTP_HEADERS_SENT错误分析.md)
- [CDN与Nginx超时错误分析](../architecture/CDN与Nginx超时错误分析.md)
- [雪崩效应与负载均衡详解](../architecture/雪崩效应与负载均衡详解.md)

---

## ✅ 修复确认清单

- [x] 修改Controller代码,使用 `reply.send()` 显式发送响应
- [x] 添加 `try-catch` 捕获未预期错误
- [x] 检查 `reply.sent` 状态
- [ ] 构建并推送新的Docker镜像
- [ ] 更新Docker Swarm服务
- [ ] 验证修复效果
- [ ] 检查其他类似的Controller方法
- [ ] 添加单元测试
- [ ] 更新代码规范文档

---

**修复时间**: 2025-10-25  
**修复版本**: v1.0.3  
**修复人员**: Stratix Team

