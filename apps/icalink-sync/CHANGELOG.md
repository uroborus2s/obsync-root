# 更新日志

## [0.0.4] - 2024-12-28

### 修复问题
- 🔧 **路由冲突修复**: 解决考勤API与任务API的路由重复定义问题
  - 将考勤任务相关路由从 `/apiv2/tasks` 改为 `/apiv2/attendance-tasks`
  - 更新任务列表接口：`GET /apiv2/attendance-tasks`
  - 更新任务详情接口：`GET /apiv2/attendance-tasks/:task_id`
- 📝 更新API文档和README，使用新的路由地址

### 技术改进
- 🛠️ 避免与 `tasks.controller.ts` 的路由重复定义冲突
- 📊 保持打卡数据和统计接口路径不变

## [0.0.3] - 2024-12-28

### 变更
- 🔄 **API前缀变更**: 所有打卡数据API接口前缀从 `/api` 改为 `/apiv2`
  - `GET /apiv2/tasks` - 任务列表查询
  - `GET /apiv2/attendance-data` - 打卡数据查询
  - `GET /apiv2/tasks/:task_id` - 任务详情查询
  - `GET /apiv2/attendance-stats` - 打卡统计数据
- 📝 更新所有相关文档和示例中的接口地址

## [0.0.2] - 2024-12-28

### 新增功能
- ✨ 新增打卡数据API接口模块
- 📚 添加任务列表查询接口 (`GET /apiv2/tasks`)
- 📊 添加打卡数据查询接口 (`GET /apiv2/attendance-data`)
- 🔍 添加任务详情查询接口 (`GET /apiv2/tasks/:task_id`)
- 📈 添加打卡统计接口 (`GET /apiv2/attendance-stats`)
- 🗃️ 扩展考勤仓库方法 (`findByTaskIds`, `findAllWithConditions`)
- 🗃️ 扩展学生考勤仓库方法 (`findByAttendanceRecordId`, `findByAttendanceRecordIds`)

### 改进
- 📝 完善API文档和使用示例
- 🎯 支持多维度筛选条件（教师ID、学生ID、日期范围、状态等）
- 📄 实现分页查询支持
- 🌍 支持位置信息和经纬度记录
- 📊 提供实时课程状态判断（未开始、进行中、已结束）

### 技术改进
- 🏗️ 遵循良好的API设计原则
- 🔒 实现完善的错误处理和参数验证
- 📱 支持响应式接口设计
- 🎨 统一的响应格式和状态码

### 文档
- 📖 新增详细的API使用文档
- 🛠️ 提供完整的接口示例和测试用例
- 📝 更新项目README和功能说明

### 接口特性
- 🔍 **任务列表**: 支持按教师、学生、时间段、状态筛选
- 📊 **打卡数据**: 支持多维度查询和实时状态显示
- 📱 **任务详情**: 包含完整的学生打卡记录详情
- 📈 **统计分析**: 提供总体数据和分布统计

---

## [0.0.1] - 2024-XX-XX

### 初始版本
- 🚀 项目初始化
- 📅 日程同步基础功能
- �� 课程数据管理
- 👥 用户日历集成 