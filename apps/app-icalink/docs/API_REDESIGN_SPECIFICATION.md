# app-icalink API接口重新设计规范

## 概述

基于app-icalink项目的现有数据库表结构和用户信息管理系统，将分散的接口进行合并和重新设计，形成10个核心API接口。设计遵循RESTful风格，支持学生和教师两种角色的不同使用场景。

## 数据库表结构

### app-icalink项目数据库表清单

#### 新增考勤系统表（5个）
1. **icalink_attendance_records** - 学生签到记录表
2. **icalink_leave_applications** - 请假申请表  
3. **icalink_leave_attachments** - 请假申请图片附件表
4. **icalink_leave_approvals** - 请假审批记录表
5. **icalink_system_configs** - 系统配置表

#### 现有系统表（4个）
6. **icasync_attendance_courses** - 考勤课程表（现有）
7. **out_xsxx** - 学生信息表（现有）
8. **out_jsxx** - 教师信息表（现有）
9. **out_jw_kcb_xs** - 学生课程关联表（现有）

## API接口设计原则

### 1. 权限控制
- 基于现有用户信息管理系统进行身份验证
- 学生和教师角色有明确的权限边界
- 支持细粒度的数据访问控制

### 2. RESTful设计
- 使用标准HTTP方法（GET、POST、PUT、DELETE）
- 资源路径清晰，语义明确
- 统一的响应格式和错误处理

### 3. 业务完整性
- 覆盖完整的考勤管理流程
- 支持实时查询和历史统计
- 图片附件的完整管理

### 4. 性能优化
- 分页查询避免大数据量问题
- 图片附件采用URL访问方式
- 支持缓存和优化策略

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    // 具体数据
  }
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE"
}
```

### 分页响应
```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "items": [],
    "pagination": {
      "total": 100,
      "page": 1,
      "page_size": 20,
      "total_pages": 5
    }
  }
}
```

## 通用错误代码

| 错误代码 | HTTP状态码 | 说明 |
|---------|-----------|------|
| `UNAUTHORIZED` | 401 | 用户未认证 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `BAD_REQUEST` | 400 | 请求参数错误 |
| `CONFLICT` | 409 | 资源冲突 |
| `UNPROCESSABLE_ENTITY` | 422 | 业务逻辑错误 |
| `PAYLOAD_TOO_LARGE` | 413 | 请求体过大 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

## 认证机制

**重要说明**: 后端服务只需要从HTTP请求头中获取用户信息，不需要额外的认证流程。所有API请求都通过HTTP请求头传递用户信息：

| Header名称 | 必需 | 说明 | 示例值 |
|-----------|------|------|--------|
| `X-User-Id` | ✅ | 用户ID | `"20210001"` |
| `X-User-Name` | ✅ | 用户姓名（URL编码） | `"%E5%BC%A0%E4%B8%89"` |
| `X-User-Type` | ✅ | 用户类型 | `"student"` 或 `"teacher"` |
| `X-User-Number` | ❌ | 用户编号 | `"20210001"` |
| `X-User-Email` | ❌ | 用户邮箱 | `"user@jlufe.edu.cn"` |

**认证流程**:
1. 前端系统负责用户登录和身份验证
2. 验证成功后，前端在每个API请求的Header中携带用户信息
3. 后端服务直接从Header中读取用户信息，无需额外验证
4. 基于Header中的用户信息进行权限控制和业务处理

## 接口列表概览

| 序号 | 接口名称 | HTTP方法 | 路径 | 权限 |
|-----|---------|----------|------|------|
| 1 | 查询请假信息接口 | GET | `/api/icalink/v1/leave-applications` | 学生/教师 |
| 2 | 学生签到接口 | POST | `/api/icalink/v1/attendance/:course_id/checkin` | 学生 |
| 3 | 学生请假申请接口 | POST | `/api/icalink/v1/leave-applications` | 学生 |
| 4 | 撤回请假申请接口 | DELETE | `/api/icalink/v1/leave-applications/:application_id` | 学生 |
| 5 | 审批请假申请接口 | PUT | `/api/icalink/v1/leave-applications/:application_id/approval` | 教师 |
| 6 | 查看请假申请附件接口 | GET | `/api/icalink/v1/leave-applications/:application_id/attachments` | 学生/教师 |
| 7 | 下载请假申请附件接口 | GET | `/api/icalink/v1/leave-attachments/:attachment_id/download` | 学生/教师 |
| 8 | 课程历史考勤数据查询接口 | GET | `/api/icalink/v1/courses/:kkh/attendance-history` | 学生/教师 |
| 9 | 本次课学生考勤信息查询接口 | GET | `/api/icalink/v1/courses/:course_id/current-attendance` | 学生/教师 |
| 10 | 本课程学生考勤记录统计接口 | GET | `/api/icalink/v1/courses/:kkh/attendance-statistics` | 学生/教师 |

---

*注：详细的接口规范请参考对应的具体文档文件。*
