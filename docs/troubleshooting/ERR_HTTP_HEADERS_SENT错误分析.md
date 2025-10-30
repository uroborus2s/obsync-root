# ERR_HTTP_HEADERS_SENT 错误分析与解决方案

## 📋 错误信息

```
Error [ERR_HTTP_HEADERS_SENT]: Cannot write headers after they are sent to the client
    at ServerResponse.writeHead (node:_http_server:351:11)
    at /app/node_modules/.pnpm/fastify@5.6.1/node_modules/fastify/lib/error-handler.js:37:19
```

**请求路径**: `GET /api/icalink/v1/courses/external/20252026150309121010120252026186pm/complete?type=student`

**响应状态**: `statusCode: null`  
**响应头**: 已设置 (`content-type: application/json; charset=utf-8`, `content-length: 138`)

---

## 🔍 问题根因分析

### 1. 错误发生的时间线

```typescript
T1: Controller返回数据
    -> return { success: true, message: '...', data: result.right }
    -> Fastify开始序列化响应

T2: Fastify发送响应头
    -> Content-Type: application/json
    -> Content-Length: 138
    -> 响应头已发送给客户端 ✅

T3: Fastify发送响应体
    -> 138字节的JSON数据
    -> 响应体开始发送 ✅

T4: 异步操作中发生错误
    -> 可能是onSend钩子中的错误
    -> 或者是流式响应中的错误
    -> 触发Fastify错误处理器

T5: 错误处理器尝试发送错误响应
    -> reply.code(500).send({ error: '...' })
    -> 但响应头已经发送! ❌
    -> 抛出 ERR_HTTP_HEADERS_SENT
```

### 2. 问题代码定位

**AttendanceController.ts (第70-117行)**:

```typescript
@Get('/api/icalink/v1/courses/external/:external_id/complete')
async getCourseCompleteData(
  request: FastifyRequest<{
    Params: { external_id: string };
    Querystring: { type?: 'student' | 'teacher' };
  }>,
  reply: FastifyReply
): Promise<ApiResponse<any>> {
  const { external_id } = request.params;
  const { type = 'teacher' } = request.query;
  const userIdentity = (request as any).userIdentity;

  // 调用服务层
  const result = await this.attendanceService.getCourseCompleteData({
    externalId: external_id,
    userInfo: userIdentity,
    type
  });

  // 处理错误
  if (isLeft(result)) {
    const error = result.left;

    // ⚠️ 问题1: 只设置状态码,没有立即返回
    if (error.code === 'RESOURCE_NOT_FOUND') {
      reply.status(404);
    } else if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
      reply.status(403);
    } else if (error.code === 'DATABASE_ERROR') {
      reply.status(500);
    } else {
      reply.status(400);
    }

    // ⚠️ 问题2: 返回对象,让Fastify自动序列化
    // 如果在序列化过程中发生错误,会导致二次发送
    return {
      success: false,
      message: error.message,
      code: error.code
    };
  }

  // ⚠️ 问题3: 同样的问题
  return {
    success: true,
    message: '获取课程完整数据成功',
    data: result.right
  };
}
```

### 3. 可能的触发场景

#### 场景A: 数据序列化错误

```typescript
// 1. Controller返回数据
return {
  success: true,
  message: '获取课程完整数据成功',
  data: result.right  // ⚠️ 如果data包含循环引用或无法序列化的对象
};

// 2. Fastify尝试序列化
JSON.stringify(responseData)  // 抛出错误

// 3. 但响应头已经发送
// 4. 错误处理器尝试发送错误响应
// 5. ERR_HTTP_HEADERS_SENT ❌
```

#### 场景B: onSend钩子错误

```typescript
// 1. Controller返回数据
// 2. Fastify发送响应头
// 3. 触发onSend钩子
fastify.addHook('onSend', async (request, reply, payload) => {
  // ⚠️ 如果这里抛出错误
  throw new Error('Something went wrong');
});

// 4. 响应头已发送,但钩子失败
// 5. 错误处理器尝试发送错误响应
// 6. ERR_HTTP_HEADERS_SENT ❌
```

#### 场景C: 数据过大导致流式传输错误

```typescript
// 1. 返回的data非常大 (> 138字节只是开始)
// 2. Fastify使用流式传输
// 3. 发送响应头
// 4. 开始发送响应体
// 5. 传输过程中发生错误 (网络中断、内存不足)
// 6. 错误处理器尝试发送错误响应
// 7. ERR_HTTP_HEADERS_SENT ❌
```

---

## 🛠️ 解决方案

### 方案1: 使用 reply.send() 显式发送响应 (推荐)

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

  try {
    // 调用服务层
    const result = await this.attendanceService.getCourseCompleteData({
      externalId: external_id,
      userInfo: userIdentity,
      type
    });

    // 处理错误
    if (isLeft(result)) {
      const error = result.left;

      // ✅ 根据错误类型设置状态码并立即发送
      if (error.code === 'RESOURCE_NOT_FOUND') {
        return reply.status(404).send({
          success: false,
          message: error.message,
          code: error.code
        });
      } else if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
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

### 方案2: 添加全局错误处理

```typescript
// apps/app-icalink/src/hooks.ts

export const registerHooks = async (instance: FastifyInstance) => {
  // ✅ 添加onSend钩子错误处理
  instance.addHook('onSend', async (request, reply, payload) => {
    try {
      // 原有的onSend逻辑
      return payload;
    } catch (error: any) {
      instance.log.error('onSend hook error', error);
      
      // 如果响应已发送,不要尝试修改
      if (reply.sent) {
        throw error;
      }
      
      // 否则返回错误响应
      reply.status(500);
      return JSON.stringify({
        success: false,
        message: '响应处理失败',
        code: 'RESPONSE_PROCESSING_ERROR'
      });
    }
  });

  // ✅ 添加全局错误处理器
  instance.setErrorHandler(async (error, request, reply) => {
    instance.log.error({
      err: error,
      req: request,
      res: reply
    }, 'Unhandled error');

    // ✅ 检查响应是否已发送
    if (reply.sent) {
      instance.log.error('Response already sent, cannot send error response');
      return;
    }

    // ✅ 检查是否是ERR_HTTP_HEADERS_SENT错误
    if (error.code === 'ERR_HTTP_HEADERS_SENT') {
      instance.log.error('Headers already sent, skipping error response');
      return;
    }

    // 发送错误响应
    return reply.status(error.statusCode || 500).send({
      success: false,
      message: error.message || '服务器内部错误',
      code: error.code || 'INTERNAL_SERVER_ERROR'
    });
  });
};
```

### 方案3: 数据验证和序列化保护

```typescript
// apps/app-icalink/src/services/AttendanceService.ts

private async buildStudentView(
  course: IcasyncAttendanceCourse,
  userInfo: UserInfo
): Promise<Either<ServiceError, StudentCourseDataVO>> {
  try {
    // ... 业务逻辑 ...

    const studentData: StudentCourseDataVO = {
      id: course.id,
      course: {
        external_id: course.external_id,
        kcmc: course.course_name,
        // ... 其他字段
      },
      student: {
        xh: student.xh,
        xm: student.xm,
        // ... 其他字段
      },
      // ... 其他数据
    };

    // ✅ 验证数据可序列化
    try {
      JSON.stringify(studentData);
    } catch (serializeError) {
      this.logger.error('数据序列化失败', serializeError);
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: '数据格式错误,无法序列化'
      });
    }

    return right(studentData);
  } catch (error: any) {
    this.logger.error('构建学生视图失败', error);
    return left({
      code: String(ServiceErrorCode.INTERNAL_ERROR),
      message: error.message
    });
  }
}
```

---

## 🔧 立即修复步骤

### 步骤1: 修改Controller

```bash
# 编辑文件
vim apps/app-icalink/src/controllers/AttendanceController.ts
```

将第70-117行的代码替换为方案1中的代码。

### 步骤2: 添加全局错误处理

```bash
# 编辑hooks文件
vim apps/app-icalink/src/hooks.ts
```

添加方案2中的错误处理代码。

### 步骤3: 重新构建和部署

```bash
# 构建
pnpm run build @stratix/app-icalink

# 构建Docker镜像
docker build -t app-icalink:v1.0.3 -f apps/app-icalink/Dockerfile .

# 推送镜像
docker push g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icalink:v1.0.3

# 更新服务
docker service update --image g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icalink:v1.0.3 obsync_app-icalink
```

---

## 📊 监控和验证

### 1. 检查错误日志

```bash
# 查看app-icalink日志
docker service logs obsync_app-icalink --tail 100 | grep "ERR_HTTP_HEADERS_SENT"

# 应该看不到这个错误了
```

### 2. 测试接口

```bash
# 测试学生视图
curl -X GET "https://kwps.jlufe.edu.cn/api/icalink/v1/courses/external/20252026150309121010120252026186pm/complete?type=student" \
  -H "Cookie: wps_jwt_token=..." \
  -v

# 检查响应
# 1. 状态码应该是200或4xx/5xx
# 2. 响应体应该是完整的JSON
# 3. 不应该有ERR_HTTP_HEADERS_SENT错误
```

### 3. 压力测试

```bash
# 使用ab进行压力测试
ab -n 1000 -c 50 "https://kwps.jlufe.edu.cn/api/icalink/v1/courses/external/20252026150309121010120252026186pm/complete?type=student"

# 检查是否有错误
docker service logs obsync_app-icalink --tail 500 | grep -E "error|Error|ERROR"
```

---

## 🎯 预防措施

### 1. 代码规范

**✅ 推荐做法**:

```typescript
// 1. 使用 reply.send() 显式发送响应
async handler(request, reply) {
  return reply.send({ data: '...' });
}

// 2. 使用 try-catch 捕获错误
async handler(request, reply) {
  try {
    const result = await service.getData();
    return reply.send(result);
  } catch (error) {
    if (!reply.sent) {
      return reply.status(500).send({ error: '...' });
    }
  }
}

// 3. 检查 reply.sent 状态
async handler(request, reply) {
  if (reply.sent) {
    return;
  }
  return reply.send({ data: '...' });
}
```

**❌ 避免做法**:

```typescript
// 1. 不要在设置状态码后返回对象
async handler(request, reply) {
  reply.status(404);
  return { error: '...' };  // ❌ 可能导致问题
}

// 2. 不要多次发送响应
async handler(request, reply) {
  reply.send({ data: '...' });
  reply.send({ data: '...' });  // ❌ 错误!
}

// 3. 不要在异步操作后发送响应而不检查状态
async handler(request, reply) {
  setTimeout(() => {
    reply.send({ data: '...' });  // ❌ 可能已经超时
  }, 5000);
}
```

### 2. 添加单元测试

```typescript
// apps/app-icalink/src/controllers/__tests__/AttendanceController.test.ts

describe('AttendanceController.getCourseCompleteData', () => {
  it('should handle errors without ERR_HTTP_HEADERS_SENT', async () => {
    const mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      sent: false
    };

    const mockService = {
      getCourseCompleteData: jest.fn().mockResolvedValue(
        left({ code: 'RESOURCE_NOT_FOUND', message: 'Not found' })
      )
    };

    const controller = new AttendanceController(mockService);
    
    await controller.getCourseCompleteData(mockRequest, mockReply);

    // 验证只调用一次send
    expect(mockReply.send).toHaveBeenCalledTimes(1);
    expect(mockReply.status).toHaveBeenCalledWith(404);
  });
});
```

---

## 📚 相关文档

- [Fastify Reply文档](https://fastify.dev/docs/latest/Reference/Reply/)
- [Node.js HTTP模块文档](https://nodejs.org/api/http.html)
- [Fastify错误处理](https://fastify.dev/docs/latest/Reference/Errors/)

---

**文档版本**: v1.0  
**最后更新**: 2025-10-25  
**作者**: Stratix Team

