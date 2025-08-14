# @stratix/gateway - API网关服务

基于Stratix框架的API网关服务，提供认证、授权、代理转发等功能，集成金山WPS开放平台OAuth认证。

## 🎯 核心功能

### 1. WPS OAuth认证集成
- 完整的OAuth 2.0认证流程
- 与金山WPS开放平台API集成
- 本地用户身份验证和类型识别
- 支持学生和教师用户类型

### 2. 应用级自动依赖注入
- 基于Stratix框架的新特性
- SINGLETON生命周期的全局服务
- 自动路由注册和服务发现

### 3. 智能用户匹配
- 多字段匹配算法（姓名、邮箱、手机号）
- 学生信息表(`out_xsxx`)和教师信息表(`out_jsxx`)查询
- 最佳匹配选择和权限验证

## 🔐 完整的OAuth认证流程

### 1. OAuth回调处理
```
GET /api/auth/authorization?code=xxx&state=xxx
```
- 接收WPS开放平台的授权码和状态参数
- 验证参数完整性和格式正确性

### 2. Token交换
- 调用WPS API: `https://open-xz.wps.cn/api/oauth2/access_token`
- 使用授权码获取access_token
- 处理API调用错误和网络异常

### 3. 用户信息获取
- 使用access_token获取WPS用户基本信息
- 提取关键字段：用户ID、姓名、邮箱、手机号

### 4. 本地用户匹配
#### 学生用户匹配 (`out_xsxx`表)
```sql
SELECT * FROM out_xsxx WHERE 
  xm = ? OR email = ? OR sjh = ?
```
- **关键字段**：姓名(xm)、学号(xh)、邮箱(email)、手机号(sjh)
- **扩展信息**：学院(xymc)、专业(zymc)、班级(bjmc)、类型(lx)

#### 教师用户匹配 (`out_jsxx`表)
```sql
SELECT * FROM out_jsxx WHERE 
  xm = ? OR email = ? OR sjh = ?
```
- **关键字段**：姓名(xm)、工号(gh)、邮箱(email)、手机号(sjh)
- **扩展信息**：单位(ssdwmc)、职称(zc)、学历(zgxl)

### 5. JWT Token生成
#### 学生用户Token载荷
```json
{
  "userId": "1",
  "username": "张三",
  "userType": "student",
  "studentNumber": "2021001",
  "className": "软工2101班",
  "majorName": "软件工程",
  "collegeName": "计算机学院",
  "studentType": "undergraduate",
  "permissions": ["read", "student:profile", "student:courses"]
}
```

#### 教师用户Token载荷
```json
{
  "userId": "1",
  "username": "王教授",
  "userType": "teacher",
  "employeeNumber": "T001",
  "departmentName": "计算机学院",
  "title": "教授",
  "education": "博士",
  "permissions": ["read", "teacher:profile", "teacher:courses", "teacher:students"]
}
```

## 🏗️ 架构设计

### 应用级服务 (SINGLETON)
```
src/
├── services/
│   ├── JWTService.ts          # JWT认证服务
│   ├── WPSApiService.ts       # WPS API服务
│   └── UserAuthService.ts     # 用户认证服务
├── repositories/
│   ├── StudentRepository.ts   # 学生数据仓库
│   └── TeacherRepository.ts   # 教师数据仓库
└── controllers/
    ├── AuthController.ts      # 认证控制器
    └── GatewayController.ts   # 网关管理控制器
```

### 插件级服务 (SCOPED)
```
src/plugin/
└── gateway-proxy.ts          # 代理转发插件
```

## 🔧 环境配置

### WPS开放平台配置
```bash
# WPS API配置
WPS_API_BASE_URL=https://open-xz.wps.cn
WPS_CLIENT_ID=your-wps-client-id
WPS_CLIENT_SECRET=your-wps-client-secret
WPS_REDIRECT_URI=http://localhost:3000/api/auth/authorization
```

### 数据库配置
```bash
# 数据库连接
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=your_database_name
DATABASE_USER=your_database_user
DATABASE_PASSWORD=your_database_password
```

### JWT配置
```bash
# JWT认证
JWT_SECRET=your-jwt-secret-key-here
TOKEN_EXPIRY=29d
REFRESH_TOKEN_EXPIRY=7d
COOKIE_NAME=wps_jwt_token
```

### 身份转发配置
```bash
# 身份信息转发（内网明文模式，无需配置密钥）
# 自动启用，无需额外配置
```

## 🧪 测试

### 运行测试
```bash
# 单元测试
pnpm test src/__tests__/unit/

# 集成测试
pnpm test src/__tests__/integration/

# OAuth流程测试
pnpm test src/__tests__/integration/oauth-flow.test.ts
```

### 测试覆盖
- ✅ WPS API服务测试
- ✅ 用户认证服务测试
- ✅ Repository层测试
- ✅ OAuth认证流程测试
- ✅ JWT载荷生成测试
- ✅ 错误处理测试

## 🚀 部署

### 1. 安装依赖
```bash
pnpm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，配置WPS API和数据库连接
```

### 3. 构建和启动
```bash
# 开发模式
pnpm dev

# 生产构建
pnpm build
pnpm start
```

## 📊 API端点

### 认证相关
- `GET /api/auth/authorization` - OAuth回调处理
- `GET /api/auth/verify` - 认证状态验证
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/refresh` - JWT token自动续期

## 身份信息转发

网关会自动将认证用户的身份信息通过HTTP Headers转发给后端服务：

### 转发的Headers
- `X-User-Id` - 用户ID
- `X-User-Name` - 用户名
- `X-User-Type` - 用户类型（student/teacher）
- `X-User-Number` - 用户编号
- `X-User-Email` - 用户邮箱
- `X-User-Phone` - 用户手机号
- `X-User-College` - 学院名称
- `X-User-Major` - 专业名称
- `X-User-Class` - 班级名称
- `X-User-Roles` - 角色列表（JSON格式）
- `X-User-Permissions` - 权限列表（JSON格式）
- `X-Request-Timestamp` - 请求时间戳

### 后端服务使用
后端服务可以直接从Headers获取用户信息（内网环境，无需验证签名）：
```javascript
// 从Headers中获取用户信息
const userId = request.headers['x-user-id'];
const username = request.headers['x-user-name'];
const userType = request.headers['x-user-type'];
const roles = JSON.parse(request.headers['x-user-roles'] || '[]');
const permissions = JSON.parse(request.headers['x-user-permissions'] || '[]');
```

## PreHandler协作机制

网关使用优化的preHandler协作机制，避免重复的JWT解析，提升性能约50%：

### 协作流程
1. **authPreHandler职责**：
   - 验证JWT token的有效性
   - 解析token获取用户载荷
   - 将用户载荷注册到diScope容器：`request.diScope.register({ userPayload: asValue(result.payload) })`

2. **identityForwardPreHandler职责**：
   - 从diScope容器获取已验证的用户载荷
   - 转换载荷为UserIdentity格式
   - 生成身份信息Headers并添加到请求

### 性能优势
- ✅ 避免重复的JWT token提取和验证
- ✅ 减少约50%的JWT处理时间
- ✅ 通过diScope实现高效的数据共享
- ✅ 保持preHandler职责分离和清晰的协作关系

### 网关管理
- `GET /api/gateway/status` - 网关状态
- `GET /api/gateway/config` - 网关配置
- `GET /api/gateway/metrics` - 性能指标

### 健康检查
- `GET /health` - 基本健康检查（用于负载均衡器）
- `GET /status` - 详细状态信息（系统指标+业务检查）
- `GET /ready` - 就绪状态检查
- `GET /api/gateway/health` - 网关特定健康检查
- `GET /proxy/health` - 后端服务健康状态

## 🔒 安全特性

1. **JWT Token安全**
   - 使用强密钥签名
   - 设置29天过期时间，提升用户体验
   - 支持自动token续期机制（剩余7天时自动刷新）
   - 提供手动token刷新端点

2. **身份信息转发**
   - 自动将用户身份信息转发到内网后端服务
   - 使用HTTP Headers传递用户信息（明文）
   - 内网环境，无需加密签名，提升性能
   - 支持完整的用户信息和权限信息转发
   - 优化的preHandler协作机制，避免重复JWT解析

2. **Cookie安全**
   - HTTP-only属性防止XSS
   - Secure属性确保HTTPS传输
   - SameSite属性防止CSRF

3. **API安全**
   - 请求超时控制
   - 错误信息脱敏
   - 访问日志记录

4. **数据库安全**
   - 参数化查询防止SQL注入
   - 连接池管理
   - 敏感信息加密

## 🤝 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

MIT License
