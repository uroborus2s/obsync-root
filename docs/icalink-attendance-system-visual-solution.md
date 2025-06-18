# @stratix/icalink 智能考勤系统产品方案

## 📖 文档概览

本文档为 @stratix/icalink 智能考勤系统的完整产品方案，面向技术团队和产品团队，详细描述了系统的功能架构、业务流程、技术实现和用户界面设计。

---

## 🎯 系统概述

@stratix/icalink 是一个基于微信生态的智能考勤管理系统，专为高校课程考勤场景设计。系统整合了课表同步、实时签到、请假管理、教师审批、统计分析等核心功能，为教师和学生提供便捷、高效的考勤体验。

### 核心特性
- 🔄 **智能同步**：与WPS协作日程无缝对接，自动同步课表信息
- 📱 **移动优先**：基于微信小程序/H5，随时随地完成考勤操作
- 🎯 **精准定位**：支持GPS定位签到，确保考勤真实性
- ⚡ **实时统计**：教师端实时查看签到情况和历史数据分析
- 🔧 **灵活配置**：支持多种请假类型和审批流程定制

### 产品价值
1. **提升效率**：自动化流程减少人工干预，提高考勤管理效率
2. **数据准确**：GPS定位和多重验证确保考勤数据真实可靠  
3. **体验优化**：移动端优先设计，操作简单流畅
4. **决策支持**：丰富的统计分析为教学改进提供数据依据

---

## 📱 用户界面展示

### 1. 教师端界面

#### 1.1 请假审批界面
![教师请假审批界面](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==)

**功能说明：**
- 显示学生请假详细信息（姓名、学号、班级、专业）
- 展示课程信息（课程名称、时间、地点、教学周次）
- 请假信息展示（类型、日期、原因）
- 附件查看功能（支持在线预览）
- 批准/拒绝操作按钮

#### 1.2 本节课签到统计界面
![本节课签到统计](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==)

**功能说明：**
- 实时显示课程基本信息
- 签到概况统计（总人数35、已签到0、请假3、缺勤33）
- 学生签到状态明细列表
- 动态更新机制

#### 1.3 历史统计分析界面
![历史统计分析](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==)

**功能说明：**
- 课程历史考勤数据统计
- 按教学周展示考勤记录
- 出勤率趋势分析
- 支持数据筛选和导出

#### 1.4 个人课程统计界面
![个人课程统计](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==)

**功能说明：**
- 教师个人教学统计概览
- 学生出勤率排名
- 最近考勤记录
- 详细的个人数据分析

### 2. 学生端界面

#### 2.1 课程请假申请界面
![学生请假申请](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==)

**功能说明：**
- 课程信息自动填充
- 请假类型选择（病假、事假、紧急事假、其他）
- 请假原因详细描述（500字符限制）
- 附件上传功能（最多3个文件）

#### 2.2 学生签到界面
![学生签到界面](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==)

**功能说明：**
- 学生个人信息展示
- 课程详细信息显示
- 签到状态实时更新
- 签到/请假操作按钮
- 时间限制提示

#### 2.3 申请状态查看界面
![申请状态查看](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==)

**功能说明：**
- 请假申请状态管理（待审批、已批准、已拒绝）
- 审批记录详情
- 撤回功能
- 申请历史记录

---

## 🔄 核心业务流程

### 1. 学生签到流程

![学生签到流程图](https://mermaid.ink/img/pako:eNqNkk1rwzAMhv-K0bmdZP-Bk0Ipu2y7jY1BexA-KFJwlNhZZLsUk-S_zzHdYOy6wdCHKOXVo1d8dFKbDqQQOaYTGYpOarFpjNuNlU7Z2jbIhzRSXhz7XoZu1L2rkKHrpDb9Y2VVD5Xdde5QaWNGNEY_g6LZZj9NqJN7i0ygB8xIGH0IvZOvJNKVdO7QlcU-EoqYYEg_KZlIEbMFWhZWFZh97gp8cLgdnDVjIxvXQ65TiOJsZG8H4BqLggokFAjYEzjFzFPJEqKJBGUZR4lnBsOULaQBnlk7NKAyJhlEKWaGIVdJKmtVgvqWSTxL_5OwxC3JKF2INVQmZaJ8kVEGAGJMMLSMQDLzRk9M1fHGQs5CbhLMh_Xb6qpuV92hBeMoOGtcH4oF-oXYyGnIJ7RBL1HCQ9dBGF8ZZOHfIf8iJzA6GvbOgD80aTI_Z6HnpM2gLHSJG2tANOGfTk5PpB7PJ_J1f4U-k33qAWTcPkE1-J2JDhJnA5CdlUJcx2Kt0Xs5k3l4XC-XBx8)

**流程说明：**
1. 学生点击签到按钮
2. 前端应用获取GPS位置信息
3. 提交签到请求到后端API
4. 系统验证考勤记录状态和重复签到
5. 创建签到记录并返回成功状态
6. 前端显示签到成功

### 2. 请假申请审批流程

![请假申请审批流程图](https://mermaid.ink/img/pako:eNqNks1qwzAQhF_F6OzE8Au4oYS2l956aSGHYg5CO1GFvZJZya5D3r2KnUBpjxqOZvhm5mN3RmmdhhAZpo9JZGcNqFY5aVqluqnxNrLpnHJdtqHzLVSq_VupOi_7xlY9I5Cp--b-8u_7aTvpJKZPFJJNYdBJtgOySMmDyFMyUKZBV7fIUjOZhKKgRVbWYQo5BYs2NimKCZNwXE5OXKI9F5R5LlFwc4KFBOKUQNOJEBa7m2Zba2oqwmE8u_FdTXUtO5Ey6FQr-1sLPpJZf6j5GwQ)

**流程说明：**
1. 学生发起请假申请，填写请假信息
2. 可选上传证明附件
3. 提交审批，进入待审批状态
4. 教师进行审批决策（批准/拒绝）
5. 学生可在待审批阶段撤回申请
6. 审批完成后更新考勤状态

### 3. 系统初始化流程

![系统初始化流程图](https://mermaid.ink/img/pako:eNqNkMFqwzAMhV_F6OzE8As0hNJ2t966waGHYg6xFBfBbxZ5bsrb17E36E5jOxh-6X_v8Q90MjOEyDB9lEg7a6Aumkz7Vqs-V_q_nGXrOk-J8tNQ_kQ7jP6n2jQHQa_RfKp-P5Xel-lT-VK5DGXnJ9nVn7bVT1sP7v6Z1Q9R6HH3Q0Zp3L_h-vVWVj0yDN-rsDN3Y6B)

**流程说明：**
1. 系统部署和环境配置
2. 数据库初始化和表结构创建
3. 配置WPS接口和认证信息
4. 导入课表数据和同步配置
5. 创建教师账号和权限设置
6. 同步学生信息
7. 完成权限配置，系统就绪

### 4. 日常考勤流程

![日常考勤流程图](https://mermaid.ink/img/pako:eNqVkk1rwzAMhv-K0bmdZP-Bg0Ipu2y7jY1BexA-KFJwlNhZZLsUk-S_zzHdYOy6wdCHKOXVo1d8dFKbDqQQOaYTGYpOarFpjNuNlU7Z2jbIhzRSXhz7XoZu1L2rkKHrpDb9Y2VVD5Xdde5QaWNGNEY_g6LZZj9NqJN7i0ygB8xIGH0IvZOvJNKVdO7QlcU-EoqYYEg_KZlIEbMFWhZWFZh97gp8cLgdnDVjIxvXQ65TiOJsZG8H4BqLggokFAjYEzjFzFPJEqKJBGUZR4lnBsOULaQBnlk7NKAyJhlEKWaGIVdJKmtVgvqWSTxL_5OwxC3JKF2INVQmZaJ8kVEGAGJMMLSMQDLzRk9M1fHGQs5CbhLMh_Xb6qpuV92hBeMoOGtcH4oF-oXYyGnIJ7RBL1HCQ9dBGF8ZZOHfIf8iJzA6GvbOgD80aTI_Z6HnpM2gLHSJG2tANOGfTk5PpB7PJ_J1f4U-k33qAWTcPkE1-J2JDhJnA5CdlUJcx2Kt0Xs5k3l4XC-XBx8)

**流程说明：**
1. 课程开始前15分钟自动创建考勤记录
2. 推送通知给相关学生
3. 学生查看课程信息，选择签到或请假
4. 签到：GPS定位验证后记录成功
5. 请假：提交教师审批处理
6. 实时更新统计数据
7. 课程结束后自动关闭考勤

### 5. 数据同步流程

![数据同步流程图](https://mermaid.ink/img/pako:eNqVk8FqwzAMhV_F6OxN8gs0hNJ2t966wWGHYg6xFBfBbxZ5bsrb17E36E5jOxh-6X_v8Q90MjOEyDB9lEg7a6Aumkz7Vqs-V_q_nGXrOk-J8tNQ_kQ7jP6n2jQHQa_RfKp-P5Xel-lT-VK5DGXnJ9nVn7bVT1sP7v6Z1Q9R6HH3Q0Zp3L_h-vVWVj0yDN-rsDN3Y6B)

**流程说明：**
1. 定时任务触发同步服务
2. 同步服务获取教务系统课表变更
3. 接收增量数据并更新本地数据库
4. 同步数据到WPS协作日程
5. 确认同步成功并完成流程

---

## 🏗️ 技术架构设计

### 1. 整体架构图

![系统整体架构图](https://mermaid.ink/img/pako:eNqVk01rwzAMhv-K0bmdZP-Bg0Ipu2y7jY1BexA-KFJwlNhZZLsUk-S_zzHdYOy6wdCHKOXVo1d8dFKbDqQQOaYTGYpOarFpjNuNlU7Z2jbIhzRSXhz7XoZu1L2rkKHrpDb9Y2VVD5Xdde5QaWNGNEY_g6LZZj9NqJN7i0ygB8xIGH0IvZOvJNKVdO7QlcU-EoqYYEg_KZlIEbMFWhZWFZh97gp8cLgdnDVjIxvXQ65TiOJsZG8H4BqLggokFAjYEzjFzFPJEqKJBGUZR4lnBsOULaQBnlk7NKAyJhlEKWaGIVdJKmtVgvqWSTxL_5OwxC3JKF2INVQmZaJ8kVEGAGJMMLSMQDLzRk9M1fHGQs5CbhLMh_Xb6qpuV92hBeMoOGtcH4oF-oXYyGnIJ7RBL1HCQ9dBGF8ZZOHfIf8iJzA6GvbOgD80aTI_Z6HnpM2gLHSJG2tANOGfTk5PpB7PJ_J1f4U-k33qAWTcPkE1-J2JDhJnA5CdlUJcx2Kt0Xs5k3l4XC-XBx8)

**架构说明：**
- **前端层**：微信小程序/H5、教师管理端、学生移动端
- **API网关层**：Fastify API网关、身份认证、权限控制
- **业务服务层**：考勤服务、请假服务、统计服务、同步服务
- **数据存储层**：MySQL数据库、Redis缓存、文件存储
- **外部集成**：WPS协作日程、教务系统、微信API

### 2. 核心技术栈

#### 2.1 后端技术
- **框架**：Fastify + TypeScript
- **数据库**：MySQL 8.0 + Kysely ORM
- **缓存**：Redis
- **认证**：JWT + WPS OAuth
- **任务队列**：@stratix/queue
- **日志**：结构化日志记录

#### 2.2 前端技术  
- **框架**：React + TypeScript
- **构建工具**：Vite
- **状态管理**：Zustand
- **UI组件**：基于微信设计规范
- **网络请求**：基于fetch的API客户端

#### 2.3 DevOps工具
- **包管理**：pnpm + monorepo
- **构建**：Turbo
- **版本管理**：Changesets
- **代码质量**：ESLint + Prettier + TypeScript

---

## 📋 功能模块详解

### 1. 数据同步模块

#### 1.1 课表信息同步
- **数据来源**：对接学校教务系统，获取完整课表数据
- **同步范围**：课程信息、教师信息、学生信息、时间安排
- **同步机制**：
  - 全量同步：系统初始化或数据重置时执行
  - 增量同步：定期更新变更数据

#### 1.2 WPS日程集成
- **双向同步**：考勤数据与WPS协作日程保持一致
- **日程创建**：自动为课程创建对应的日程事件
- **状态更新**：考勤结果实时反馈到日程系统

#### 1.3 数据存储结构
```sql
-- 考勤记录表
icalink_attendance_records: 存储考勤基础信息
-- 学生考勤表  
icalink_student_attendance: 记录学生具体签到状态
-- 请假申请表
icalink_leave_applications: 管理请假申请流程
-- 课程表信息
icalink_course_schedules: 课程时间和地点信息
```

### 2. 学生签到模块

#### 2.1 签到功能特性
- **定位验证**：GPS坐标校验，确保在教室范围内
- **时间窗口**：支持课前N分钟到课后M分钟的签到时间
- **防作弊机制**：IP地址记录、设备指纹识别
- **离线支持**：网络异常时本地缓存，恢复后自动提交

#### 2.2 签到状态管理
- **未签到**：课程开始前的初始状态
- **已签到**：成功完成签到验证
- **迟到**：超出正常签到时间窗口
- **缺勤**：未在规定时间内完成签到

### 3. 请假管理模块

#### 3.1 请假类型
- **病假**：因病需要休息治疗
- **事假**：因个人事务需要请假
- **紧急事假**：突发事件处理
- **其他**：特殊情况说明

#### 3.2 审批流程
- **提交申请**：学生填写请假信息并提交
- **教师审批**：任课教师查看申请并做出决策
- **状态更新**：审批结果实时同步到考勤记录
- **撤回机制**：待审批状态下支持学生撤回

### 4. 统计分析模块

#### 4.1 实时统计
- **课程概况**：总人数、签到数、请假数、缺勤数
- **学生状态**：每个学生的具体考勤状态
- **动态更新**：签到状态变化实时刷新

#### 4.2 历史分析
- **出勤趋势**：按时间维度分析出勤率变化
- **学生排名**：基于出勤率的学生表现排序
- **课程对比**：不同课程间的考勤情况对比

---

## 🔌 API接口设计

### 1. 考勤相关接口

#### 1.1 获取考勤记录
```http
GET /api/attendance/:id/record?type=student|teacher
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "course": {
      "kcmc": "数据库技术及应用",
      "course_start_time": "2025-06-27T09:50:00Z",
      "course_end_time": "2025-06-27T11:25:00Z",
      "room_s": "实验楼3405教室",
      "xm_s": "孙永锐",
      "status": "not_started"
    },
    "student": {
      "xh": "030406240106",
      "xm": "秦晓恒",
      "bjmc": "数据科学2401",
      "zymc": "数据科学"
    },
    "attendance_status": {
      "is_checked_in": false,
      "status": "not_started",
      "can_checkin": true,
      "can_leave": true
    },
    "stats": {
      "total_count": 35,
      "checkin_count": 0,
      "leave_count": 3,
      "absent_count": 33
    }
  }
}
```

#### 1.2 学生签到接口
```http
POST /api/attendance/:attendance_record_id/checkin
```

**请求体：**
```json
{
  "location": "实验楼3405教室",
  "latitude": 39.9042,
  "longitude": 116.4074,
  "accuracy": 10.5,
  "remark": "正常签到"
}
```

### 2. 请假相关接口

#### 2.1 提交请假申请
```http
POST /api/attendance/leave
```

**请求体：**
```json
{
  "attendance_record_id": "record_123",
  "leave_type": "sick",
  "reason": "身体不适，需要就医",
  "attachments": ["file_id_1", "file_id_2"]
}
```

#### 2.2 教师审批请假
```http
POST /api/attendance/teacher-approve-leave
```

**请求体：**
```json
{
  "application_id": "leave_456",
  "action": "approve",
  "comment": "同意请假，注意身体健康"
}
```

### 3. 统计查询接口

#### 3.1 课程历史统计
```http
GET /api/attendance/course/:kkh/history?xnxq=2024-2025-2
```

#### 3.2 个人课程统计
```http
GET /api/attendance/course/:kkh/stats?xnxq=2024-2025-2
```

---

## 🗄️ 数据库设计

### 1. 核心表结构

```sql
-- 考勤记录主表
CREATE TABLE icalink_attendance_records (
    id VARCHAR(200) PRIMARY KEY COMMENT '唯一标识',
    kkh VARCHAR(60) NOT NULL COMMENT '开课号',
    xnxq VARCHAR(20) NOT NULL COMMENT '学年学期',
    rq DATE NOT NULL COMMENT '上课日期',
    jc_s VARCHAR(50) NOT NULL COMMENT '节次串',
    kcmc VARCHAR(200) NOT NULL COMMENT '课程名称',
    status ENUM('active','closed') DEFAULT 'active' COMMENT '状态',
    total_count INT DEFAULT 0 COMMENT '应到人数',
    checkin_count INT DEFAULT 0 COMMENT '实到人数',
    leave_count INT DEFAULT 0 COMMENT '请假人数',
    absent_count INT DEFAULT 0 COMMENT '缺勤人数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 学生考勤详情表
CREATE TABLE icalink_student_attendance (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    attendance_record_id VARCHAR(200) NOT NULL COMMENT '考勤记录ID',
    xh VARCHAR(50) NOT NULL COMMENT '学号',
    xm VARCHAR(100) NOT NULL COMMENT '姓名',
    status ENUM('present','absent','leave','late') NOT NULL COMMENT '状态',
    checkin_time TIMESTAMP NULL COMMENT '签到时间',
    location_info JSON COMMENT '位置信息',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 请假申请表
CREATE TABLE icalink_leave_applications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    attendance_record_id VARCHAR(200) NOT NULL COMMENT '关联考勤记录',
    student_xh VARCHAR(50) NOT NULL COMMENT '申请学生学号',
    leave_type ENUM('sick','personal','emergency','other') NOT NULL COMMENT '请假类型',
    reason TEXT NOT NULL COMMENT '请假原因',
    status ENUM('pending','approved','rejected','withdrawn') DEFAULT 'pending' COMMENT '审批状态',
    approver_id VARCHAR(50) COMMENT '审批人ID',
    approved_time TIMESTAMP NULL COMMENT '审批时间',
    approval_comment TEXT COMMENT '审批意见',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. 索引优化策略
```sql
-- 性能优化索引
CREATE INDEX idx_attendance_kkh_rq ON icalink_attendance_records(kkh, rq);
CREATE INDEX idx_student_attendance_record ON icalink_student_attendance(attendance_record_id);
CREATE INDEX idx_student_attendance_xh ON icalink_student_attendance(xh);
CREATE INDEX idx_leave_status ON icalink_leave_applications(status);
CREATE INDEX idx_leave_student ON icalink_leave_applications(student_xh);
```

---

## 🚀 部署与运维

### 1. 部署架构

![部署架构图](https://mermaid.ink/img/pako:eNqVk8FqwzAMhV_F6OxN8gs0hNJ2t966wWGHYg6xFBfBbxZ5bsrb17E36E5jOxh-6X_v8Q90MjOEyDB9lEg7a6Aumkz7Vqs-V_q_nGXrOk-J8tNQ_kQ7jP6n2jQHQa_RfKp-P5Xel-lT-VK5DGXnJ9nVn7bVT1sP7v6Z1Q9R6HH3Q0Zp3L_h-vVWVj0yDN-rsDN3Y6B)

**部署说明：**
- **负载均衡器**：分发请求到多个API服务器
- **API服务器集群**：多实例部署保证高可用
- **数据库主从**：读写分离提升性能
- **Redis集群**：缓存和会话管理
- **文件存储**：附件和静态资源存储
- **监控系统**：应用、数据库、日志监控

### 2. 性能优化策略

#### 2.1 数据库优化
- **读写分离**：查询请求路由到从库
- **连接池管理**：合理配置连接池大小
- **索引优化**：定期分析慢查询并优化索引
- **分表策略**：按学期分表存储历史数据

#### 2.2 缓存策略
- **Redis缓存**：热点数据缓存，减少数据库压力
- **浏览器缓存**：静态资源长期缓存
- **API缓存**：短期缓存频繁查询的接口响应

#### 2.3 并发处理
- **异步处理**：文件上传、消息推送等操作异步化
- **限流控制**：防止恶意刷接口
- **熔断机制**：服务降级保护核心功能

### 3. 安全保障

#### 3.1 数据安全
- **加密传输**：HTTPS/WSS协议
- **敏感数据加密**：个人信息加密存储
- **数据备份**：定期数据备份和恢复测试
- **访问控制**：基于角色的权限管理

#### 3.2 接口安全
- **身份认证**：JWT令牌验证
- **签名验证**：关键接口签名校验
- **防重放攻击**：时间戳和随机数验证
- **SQL注入防护**：参数化查询

---

## 📊 监控与告警

### 1. 业务监控指标
- **考勤活跃度**：每日签到人数、请假申请数量
- **系统性能**：API响应时间、数据库查询性能
- **错误监控**：接口错误率、异常日志统计
- **用户体验**：页面加载时间、操作成功率

### 2. 告警规则
- **服务可用性**：API服务宕机立即告警
- **数据库性能**：慢查询超过阈值告警
- **存储空间**：磁盘使用率超过80%告警
- **业务异常**：签到成功率低于95%告警

---

## 🎯 总结与展望

### 核心价值
1. **提升效率**：自动化流程减少人工干预，提高考勤管理效率
2. **数据准确**：GPS定位和多重验证确保考勤数据真实可靠  
3. **体验优化**：移动端优先设计，操作简单流畅
4. **决策支持**：丰富的统计分析为教学改进提供数据依据

### 未来规划
- **AI智能分析**：基于考勤数据的学习效果预测
- **多平台扩展**：支持钉钉、企业微信等更多平台
- **物联网集成**：与智能教室设备联动，实现全自动考勤
- **大数据分析**：跨学期、跨课程的宏观数据分析

通过持续的产品迭代和技术创新，@stratix/icalink 将成为智慧校园建设的重要组成部分，为高等教育数字化转型贡献力量。

---

## 📝 文档更新记录

| 版本 | 日期 | 更新内容 | 更新人 |
|------|------|----------|--------|
| v1.0 | 2025-01-07 | 初始版本，包含完整功能设计和技术架构 | 产品团队 |

---

**文档版权所有 @stratix/icalink 产品团队** 