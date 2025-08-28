# @wps/app-icalink 数据库设计文档

## 概述

本文档描述了基于Stratix框架的学生签到、请假管理系统的完整数据库架构设计。系统在现有的`icasync_attendance_courses`表基础上，新增了5个核心数据表来支持完整的考勤管理功能。

## 设计原则

### 1. 兼容性原则
- **MySQL 5.7+兼容**: 所有表结构和SQL语法完全兼容MySQL 5.7及以上版本
- **现有系统集成**: 充分利用现有的用户信息表(`out_xsxx`, `out_jsxx`)和课程表(`icasync_attendance_courses`)
- **数据一致性**: 通过外键关联和约束确保数据完整性

### 2. 性能优化原则
- **索引策略**: 为高频查询字段建立合适的索引
- **分区设计**: 支持按时间分区的扩展能力
- **查询优化**: 优化常用查询场景的性能

### 3. 扩展性原则
- **元数据支持**: 所有表都包含JSON类型的metadata字段
- **软删除**: 支持数据的逻辑删除和恢复
- **版本控制**: 支持数据变更的审计追踪

## 数据库表结构

### 核心表关系图

```
icasync_attendance_courses (现有)
    ↓ (1:N)
icalink_attendance_records
    ↓ (1:N)
icalink_leave_applications
    ↓ (1:N)
icalink_leave_attachments
    ↓ (1:N)
icalink_leave_approvals

out_xsxx (现有学生表) ← 关联
out_jsxx (现有教师表) ← 关联
```

### 1. 学生签到记录表 (icalink_attendance_records)

**用途**: 存储学生的具体签到记录，每个学生在每门课程中有唯一的签到记录。

**关键字段**:
- `attendance_course_id`: 关联签到课程ID
- `student_id`: 学生ID(关联out_xsxx.xh)
- `status`: 签到状态(not_started/present/absent/leave/pending_approval/leave_pending/late)
- `checkin_time`: 签到时间
- `checkin_location`: 签到位置信息
- `is_late`: 是否迟到标记

**索引策略**:
- 唯一索引: `(attendance_course_id, student_id)` - 确保每个学生在每门课程中只有一条记录
- 复合索引: `(student_id, status)` - 优化按学生查询状态
- 复合索引: `(attendance_course_id, status)` - 优化按课程查询状态

### 2. 请假申请表 (icalink_leave_applications)

**用途**: 存储学生的请假申请信息，支持多种请假类型和完整的审批流程。

**关键字段**:
- `attendance_record_id`: 关联签到记录ID
- `leave_type`: 请假类型(sick/personal/emergency/other)
- `leave_reason`: 请假原因
- `status`: 申请状态(leave_pending/leave/leave_rejected/cancelled)
- `application_time`: 申请时间
- `approval_time`: 审批时间

**业务规则**:
- 每个签到记录可以有多个请假申请(支持重新申请)
- 请假申请一旦审批通过，会自动更新对应的签到记录状态

### 3. 请假申请附件表 (icalink_leave_attachments)

**用途**: 存储请假申请相关的附件文件，支持多种文件格式。

**关键字段**:
- `leave_application_id`: 关联请假申请ID
- `file_name`: 原始文件名
- `file_size`: 文件大小
- `file_type`: MIME类型
- `file_content`: 文件内容(Base64编码)
- `file_path`: 文件存储路径(可选)

**存储策略**:
- 支持Base64内容存储和文件路径存储两种方式
- 文件大小限制通过应用层控制
- 支持图片、PDF、Word等常见格式

### 4. 请假审批记录表 (icalink_leave_approvals)

**用途**: 存储请假申请的审批流程记录，支持多级审批。

**关键字段**:
- `leave_application_id`: 关联请假申请ID
- `approver_id`: 审批人ID(教师工号)
- `approval_result`: 审批结果(pending/approved/rejected/cancelled)
- `approval_comment`: 审批意见
- `approval_order`: 审批顺序
- `is_final_approver`: 是否最终审批人

**审批流程**:
- 支持单级和多级审批流程
- 审批顺序通过`approval_order`字段控制
- 最终审批结果决定请假申请的最终状态

### 5. 系统配置表 (icalink_system_configs)

**用途**: 存储系统级配置参数，支持动态配置管理。

**关键字段**:
- `config_key`: 配置键(唯一)
- `config_value`: 配置值
- `config_type`: 配置类型(string/number/boolean/json/array)
- `config_group`: 配置分组
- `is_system`: 是否系统配置
- `is_encrypted`: 是否加密存储

**配置示例**:
```json
{
  "attendance.checkin_window_start": "-15",
  "attendance.checkin_window_end": "30", 
  "attendance.late_threshold": "10",
  "attendance.auto_absent_after": "60",
  "leave.max_attachment_size": "10485760",
  "leave.allowed_file_types": ["image/jpeg", "image/png", "application/pdf"]
}
```

## 数据关联关系

### 主要外键关系

1. **icalink_attendance_records.attendance_course_id** → icasync_attendance_courses.id
2. **icalink_attendance_records.student_id** → out_xsxx.xh
3. **icalink_leave_applications.attendance_record_id** → icalink_attendance_records.id
4. **icalink_leave_attachments.leave_application_id** → icalink_leave_applications.id
5. **icalink_leave_approvals.leave_application_id** → icalink_leave_applications.id
6. **icalink_leave_approvals.approver_id** → out_jsxx.gh

### 查询优化策略

#### 高频查询场景优化

1. **学生查询个人签到记录**:
```sql
-- 索引: idx_student_id, idx_student_status
SELECT * FROM icalink_attendance_records 
WHERE student_id = ? AND status IN ('present', 'absent', 'leave')
ORDER BY created_at DESC;
```

2. **教师查询课程考勤情况**:
```sql
-- 索引: idx_course_status
SELECT * FROM icalink_attendance_records 
WHERE attendance_course_id = ? 
ORDER BY status, student_name;
```

3. **教师查询待审批请假申请**:
```sql
-- 索引: idx_teacher_status
SELECT la.*, lapp.approval_result 
FROM icalink_leave_applications la
JOIN icalink_leave_approvals lapp ON la.id = lapp.leave_application_id
WHERE lapp.approver_id = ? AND lapp.approval_result = 'pending'
ORDER BY la.application_time ASC;
```

## 性能优化建议

### 1. 索引优化
- 定期分析慢查询日志
- 根据实际查询模式调整索引策略
- 避免过多的复合索引影响写入性能

### 2. 分区策略
- 考虑按学期对大表进行分区
- 历史数据可以归档到单独的分区

### 3. 缓存策略
- 系统配置表数据适合Redis缓存
- 课程基础信息可以缓存减少数据库查询

### 4. 数据清理
- 定期清理过期的附件文件
- 历史数据按需归档或删除

## 安全考虑

### 1. 数据加密
- 敏感配置信息支持加密存储
- 个人隐私信息遵循数据保护规范

### 2. 访问控制
- 通过应用层控制数据访问权限
- 审计日志记录关键操作

### 3. 数据备份
- 定期备份重要数据
- 支持数据恢复和回滚机制

## 迁移和部署

### 1. 初始化脚本
执行 `001_create_attendance_tables.sql` 创建所有表结构。

### 2. 数据迁移
如有现有数据需要迁移，请参考具体的迁移脚本。

### 3. 索引优化
根据实际数据量和查询模式，可能需要调整索引策略。

---

**版本**: 1.0.0  
**创建时间**: 2025-01-25  
**适用版本**: MySQL 5.7+  
**字符集**: utf8mb4  
**排序规则**: utf8mb4_unicode_ci
