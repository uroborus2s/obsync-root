# @stratix/icasync 插件项目分析报告

## 项目概述

@stratix/icasync 是一个基于 Stratix 框架的课程表同步插件，负责将数据库中的课程数据同步到 WPS 日历系统。项目目前处于重构阶段，已完成基础架构但仍有部分功能待实现。

## 1. 代码结构分析

### ✅ 符合标准的部分

- **插件目录结构**：完全符合 Stratix 框架标准
  - `repositories/` - 数据访问层（10个仓储类）
  - `services/` - 业务逻辑层（6个服务类）
  - `controllers/` - 控制器层（目录存在但为空）
  - `executors/` - 执行器层（6个执行器）
  - `adapters/` - 适配器层（1个适配器）
  - `types/` - 类型定义（完整的数据库类型）
  - `__tests__/` - 测试文件（5个测试文件）
  - `docs/` - 文档目录

- **基础设施完善**：
  - 完整的 `BaseIcasyncRepository` 基础仓储类（392行，功能丰富）
  - 详细的数据库迁移脚本
  - 完善的 TypeScript 配置
  - 工作流定义和执行示例

- **入口文件配置**：
  - 正确使用 `withRegisterAutoDI` 包装
  - 标准的 `discovery.patterns` 配置（经验证是正确格式）
  - 完整的路由、服务、生命周期配置

### ❌ 存在的问题

1. **Controllers 目录为空**
   - 缺少 HTTP 接口实现
   - 没有 REST API 端点
   - 无法通过 HTTP 调用同步功能

2. **部分服务方法未实现**
   - `SyncWorkflowService` 中多个方法抛出 "Not implemented" 错误
   - 工作流监控和取消功能不完整

## 2. 依赖关系分析

### ✅ 正确的配置

- **依赖管理**：正确使用 workspace 依赖
- **核心依赖**：`@stratix/core`、`@stratix/database`、`@stratix/tasks`、`@stratix/was-v7` 配置正确
- **模块系统**：正确支持 ES 模块
- **与 @stratix/tasks 集成**：正确使用 `IWorkflowAdapter` 接口

### ❌ 存在的问题

1. **缺少开发依赖**
   ```json
   // 当前 devDependencies 为空，应该添加：
   {
     "vitest": "^1.0.0",
     "tsx": "^4.0.0",
     "rimraf": "^5.0.0",
     "@types/node": "^20.0.0"
   }
   ```

2. **类型定义路径可能有问题**
   ```json
   // 当前
   "types": "./dist/types/index.d.ts"

   // 需要验证构建后的实际路径
   ```

## 3. 功能完整性评估

### 已完成模块（完成度评估）

| 层级 | 完成度 | 状态说明 |
|------|--------|----------|
| **Repository 层** | 95% | 10个仓储类，功能完整，包含详细的业务方法 |
| **Service 层** | 75% | 6个服务类，核心逻辑完整，部分方法待实现 |
| **Types 定义** | 98% | 类型定义非常完整和详细，391行代码 |
| **Executor 层** | 80% | 6个执行器，基本框架完成，业务逻辑较完整 |
| **Controller 层** | 0% | 完全缺失，需要创建 HTTP 接口 |
| **Adapter 层** | 40% | 只有1个全量同步适配器，需要增量同步适配器 |

### 核心功能实现状态

**✅ 已实现功能**
- 完整的数据库映射管理（日历映射、日程映射、参与者映射）
- 课程数据聚合服务（支持全量和增量聚合）
- 日历同步服务（创建、删除、参与者管理）
- 同步任务记录管理（状态跟踪、进度管理）
- 工作流定义和基础执行框架
- 软删除机制和批量操作支持
- 函数式编程模式（使用 Either 类型）

**❌ 待实现功能**
- HTTP REST API 接口（Controller 层完全缺失）
- 工作流状态查询和取消功能
- 增量同步适配器
- 日历删除工作流实现
- 参与者同步工作流实现
- 错误恢复和重试机制
- 性能监控和指标收集
- 健康检查端点

## 4. 代码质量检查

### ✅ 优秀的实践

- **命名约定**：完全符合 Stratix 框架规范
  - 文件命名：PascalCase + 层级后缀（如 `SyncTaskRepository.ts`）
  - 类命名：PascalCase + 层级后缀（如 `class SyncTaskRepository`）
  - 接口命名：I + PascalCase + 层级后缀（如 `ISyncTaskRepository`）
  - 方法命名：camelCase + 动词开头（如 `async createUser()`）

- **类型定义完整性**：
  - 详细的数据库表类型定义（391行）
  - 完整的业务接口定义
  - 正确使用 `Generated`、`Insertable`、`Selectable`、`Updateable` 类型
  - 枚举类型定义清晰（`TaskType`、`TaskStatus`、`UserType` 等）

- **错误处理和日志记录**：
  - 统一的 `DatabaseResult<T>` 返回格式
  - 函数式错误处理（`Either<string, T>` 模式）
  - 详细的日志记录（使用结构化日志）
  - 完整的参数验证和错误边界

- **依赖注入规范**：
  - 正确的构造函数注入
  - 清晰的接口依赖声明
  - 符合 Stratix 框架的生命周期管理

### ⚠️ 需要改进的地方

1. **测试覆盖率不足**
   - 只有5个测试文件，覆盖率较低
   - 缺少集成测试和端到端测试
   - 需要增加边界条件和错误场景测试

2. **文档不完整**
   - 缺少 API 文档
   - 缺少使用示例和最佳实践指南
   - 需要补充架构设计文档

3. **性能优化空间**
   - 批量操作可以进一步优化
   - 缓存策略需要完善
   - 数据库查询优化空间

## 5. 架构设计评估

### ✅ 架构优势

- **分层架构清晰**：严格按照 Repository → Service → Controller → Executor → Adapter 分层
- **职责分离明确**：每层职责单一，耦合度低
- **可扩展性强**：基于接口编程，易于扩展和替换
- **函数式编程**：使用 `@stratix/utils/functional` 的函数式工具
- **工作流驱动**：基于 `@stratix/tasks` 的工作流管理

### ⚠️ 架构改进建议

1. **增加缓存层**：对频繁查询的数据进行缓存
2. **事件驱动架构**：引入事件总线处理异步通知
3. **监控和指标**：增加性能监控和业务指标收集
4. **配置管理**：统一的配置管理和环境变量处理

## 6. 重构完成计划

### 优先级 P0（必须完成）

1. **创建 Controller 层**（预计 2-3 天）
   - `SyncController.ts` - 同步操作接口
   - `CalendarController.ts` - 日历管理接口
   - `TaskController.ts` - 任务管理接口
   - 完整的 HTTP API 端点和 Schema 定义

2. **完善 Service 层未实现方法**（预计 1-2 天）
   - `SyncWorkflowService` 中的工作流管理方法
   - 错误恢复和重试机制
   - 工作流状态查询和取消功能

3. **修复依赖配置**（预计 0.5 天）
   - 添加缺失的 devDependencies
   - 验证和修复类型定义路径
   - 更新构建脚本

### 优先级 P1（重要功能）

4. **增加 Adapter 层**（预计 1-2 天）
   - `IncrementalSyncAdapter.ts` - 增量同步适配器
   - `CalendarManagementAdapter.ts` - 日历管理适配器
   - 统一的适配器接口和错误处理

5. **完善测试覆盖**（预计 2-3 天）
   - 单元测试覆盖率达到 80%+
   - 集成测试和端到端测试
   - 性能测试和压力测试

6. **增加监控和健康检查**（预计 1 天）
   - 健康检查端点
   - 性能指标收集
   - 错误监控和告警

### 优先级 P2（优化改进）

7. **性能优化**（预计 1-2 天）
   - 数据库查询优化
   - 批量操作优化
   - 缓存策略实现

8. **文档完善**（预计 1-2 天）
   - API 文档生成
   - 使用指南和最佳实践
   - 架构设计文档

9. **配置管理优化**（预计 0.5-1 天）
   - 统一配置管理
   - 环境变量处理
   - 配置验证机制

## 7. 实施时间表

### 第一周（P0 任务）
- Day 1-3: 创建完整的 Controller 层
- Day 4-5: 完善 Service 层未实现方法
- Day 5: 修复依赖配置问题

### 第二周（P1 任务）
- Day 1-2: 增加 Adapter 层实现
- Day 3-5: 完善测试覆盖率
- Day 5: 增加监控和健康检查

### 第三周（P2 任务）
- Day 1-2: 性能优化
- Day 3-4: 文档完善
- Day 5: 配置管理优化和最终测试

## 8. 风险评估

### 高风险
- **@stratix/tasks 集成复杂性**：工作流执行可能遇到兼容性问题
- **WPS API 依赖**：外部 API 变更可能影响功能

### 中风险
- **数据库性能**：大批量数据处理可能遇到性能瓶颈
- **并发处理**：多任务并发执行的资源竞争

### 低风险
- **类型定义**：TypeScript 类型问题相对容易解决
- **测试实现**：测试代码编写风险较低

## 9. 成功标准

### 功能完整性
- [ ] 所有 HTTP API 端点正常工作
- [ ] 全量同步和增量同步功能完整
- [ ] 工作流管理功能完整
- [ ] 错误处理和恢复机制完善

### 代码质量
- [ ] 测试覆盖率达到 80%+
- [ ] 所有 TypeScript 类型检查通过
- [ ] 代码符合 Stratix 框架规范
- [ ] 性能指标达到预期

### 运维支持
- [ ] 健康检查和监控完善
- [ ] 日志记录详细且结构化
- [ ] 配置管理统一且灵活
- [ ] 文档完整且易于理解

---

**报告生成时间**: 2025-08-03
**分析范围**: packages/icasync 完整项目
**评估标准**: Stratix 框架规范和最佳实践
- HTTP API 接口
- 增量同步逻辑
- 变更检测机制
- 用户同步功能
- 监控和健康检查
- 错误恢复机制

## 4. 代码质量检查

### ✅ 优秀的方面

1. **命名规范**：完全符合 Stratix 框架约定
2. **类型安全**：使用 Kysely 类型系统，类型定义详细
3. **错误处理**：统一的错误处理模式和结果格式
4. **日志记录**：详细的结构化日志
5. **架构设计**：清晰的分层架构和职责分离

### ❌ 需要改进的地方

1. **依赖注入不一致**
   - 部分使用构造函数注入
   - 部分使用容器解析
   - 需要统一依赖注入模式

2. **异步处理不够健壮**
   - 缺少超时处理
   - 批量操作缺少并发控制
   - 缺少断路器模式

3. **Service 层过于复杂**
   - 部分方法过长（如 `CalendarSyncService.createCourseCalendarsBatch` 100+ 行）
   - 业务逻辑与技术细节耦合

## 5. 关键问题识别

### 🔴 阻塞性问题

1. **插件入口配置错误**：影响自动发现和依赖注入
2. **缺少 HTTP 接口**：无法提供外部访问能力
3. **增量同步逻辑缺失**：核心业务功能不完整

### 🟡 重要问题

1. **测试覆盖率低**：影响代码质量和可维护性
2. **错误恢复机制不完善**：影响系统稳定性
3. **监控能力缺失**：影响运维和故障排查

### 🟢 一般问题

1. **文档不完整**：影响开发效率
2. **性能优化空间**：影响大规模使用
3. **代码重构需求**：影响长期维护

## 6. 技术债务评估

### 高优先级技术债务

1. **配置格式迁移**：需要更新到最新的 Stratix 框架配置
2. **接口层缺失**：需要实现完整的 REST API
3. **核心业务逻辑**：需要完善增量同步和变更检测

### 中优先级技术债务

1. **代码重构**：简化复杂的 Service 方法
2. **测试补充**：提高测试覆盖率
3. **错误处理**：完善异常恢复机制

### 低优先级技术债务

1. **性能优化**：批量操作和缓存机制
2. **监控增强**：指标收集和分布式追踪
3. **文档完善**：API 文档和部署指南

---

**分析完成时间**：2025-08-03
**分析人员**：Augment Agent
**下一步**：参考《重构完成计划》文档执行具体的重构任务

# 原始数据表
## 1. u_jw_kcb_cur表
课程原始表

```sql
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for u_jw_kcb_cur
-- ----------------------------
DROP TABLE IF EXISTS `u_jw_kcb_cur`;
CREATE TABLE `u_jw_kcb_cur` (
  `kkh` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xnxq` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `jxz` int(11) DEFAULT NULL COMMENT '教学周（1-20）',
  `zc` int(11) DEFAULT NULL COMMENT '周次（星期1-星期日）',
  `jc` int(11) DEFAULT NULL COMMENT '节次（1-10）',
  `lq` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '楼群',
  `room` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '房间',
  `xq` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '校区',
  `ghs` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '工号组',
  `lc` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '楼层',
  `rq` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '日期',
  `st` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '开始时间',
  `ed` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '结束时间',
  `sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '来源库时间',
  `zt` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '来源库状态标识（add、update、delete）',
  `gx_sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '目标库更新时间',
  `gx_zt` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '目标库更新状态',
  `kcmc` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '课程名称',
  `xms` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '教师姓名组',
  `sfdk` varchar(2) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '是否打卡(打卡，不打卡)，有些课程仅为占位给老师提醒，学生不打卡，无学生日历',
  KEY `idx_combined` (`kkh`,`rq`,`st`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='本学期课程表';

SET FOREIGN_KEY_CHECKS = 1;
```
数据例子
```sql
INSERT INTO `<table_name>` (`kkh`, `xnxq`, `jxz`, `zc`, `jc`, `lq`, `room`, `xq`, `ghs`, `lc`, `rq`, `st`, `ed`, `sj`, `zt`, `gx_sj`, `gx_zt`, `kcmc`, `xms`, `sfdk`) VALUES ('202420252003013016705', '2024-2025-2', 1, 1, 1, '第一教学楼', '1422', '1', '101049', '4', '2025/03/03 00:00:00.000', '08:00:00.000', '08:45:00.000', '2025-07-30 21:57:06', 'add', NULL, NULL, '国际税收', '王君', '1');
INSERT INTO `<table_name>` (`kkh`, `xnxq`, `jxz`, `zc`, `jc`, `lq`, `room`, `xq`, `ghs`, `lc`, `rq`, `st`, `ed`, `sj`, `zt`, `gx_sj`, `gx_zt`, `kcmc`, `xms`, `sfdk`) VALUES ('202420252003013037101', '2024-2025-2', 1, 1, 1, '第一教学楼', '1106', '1', '101061', '1', '2025/03/03 00:00:00.000', '08:00:00.000', '08:45:00.000', '2025-07-30 21:57:06', 'add', NULL, NULL, '税务检查', '陈艺毛', '1');
```
## 2. juhe_renwu
课程聚合表，由u_jw_kcb_cur表聚合而来,合并连上的课程，每一条记录对应一条日历中的一条日程
```sql
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for juhe_renwu
-- ----------------------------
DROP TABLE IF EXISTS `juhe_renwu`;
CREATE TABLE `juhe_renwu` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kkh` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xnxq` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `jxz` int(11) DEFAULT NULL COMMENT '教学周',
  `zc` int(11) DEFAULT NULL COMMENT '周次',
  `rq` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '日期',
  `kcmc` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '课程名称',
  `sfdk` varchar(2) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '是否打卡（是否生成学生日历）',
  `jc_s` varchar(256) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '节次合并',
  `room_s` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '上课教室合并（一般都是同一教室）',
  `gh_s` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '教师组号，推送教师课表日历的依据',
  `xm_s` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '教师组姓名，推送学生课表日历直接取此',
  `lq` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '教学楼',
  `sj_f` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '开始时间',
  `sj_t` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '结束时间',
  `sjd` varchar(2) COLLATE utf8_unicode_ci NOT NULL DEFAULT '' COMMENT '时间段（1-4为am，4-10为pm）',
  `gx_sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '更新时间，给杨经理用',
  `gx_zt` varchar(2) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '更新状态，给杨经理用(0未处理，1教师日历已经推送，2学生日历已经推送，3软删除未处理，4软删除处理完毕',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=MyISAM AUTO_INCREMENT=8956 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
```
数据例子
```sql
INSERT INTO `<table_name>` (`id`, `kkh`, `xnxq`, `jxz`, `zc`, `rq`, `kcmc`, `sfdk`, `jc_s`, `room_s`, `gh_s`, `xm_s`, `lq`, `sj_f`, `sj_t`, `sjd`, `gx_sj`, `gx_zt`) VALUES (1, '202420252003035027701', '2024-2025-2', 1, 2, '2025/03/04', '财务管理', '1', '3/4', '1223/1223', '104066', '梁毕明', '第一教学楼', '09:50:00.000', '11:25:00.000', 'am', '2025-06-05T07:30:06.043Z', '1');
INSERT INTO `<table_name>` (`id`, `kkh`, `xnxq`, `jxz`, `zc`, `rq`, `kcmc`, `sfdk`, `jc_s`, `room_s`, `gh_s`, `xm_s`, `lq`, `sj_f`, `sj_t`, `sjd`, `gx_sj`, `gx_zt`) VALUES (2, '202420252003035027701', '2024-2025-2', 1, 3, '2025/03/05', '财务管理', '1', '1/2', '1223/1223', '104066', '梁毕明', '第一教学楼', '08:00:00.000', '09:35:00.000', 'am', '2025-06-05T07:30:08.098Z', '1');
```


## 3. out_jw_kcb_xs
这是学生课程关联表，通过此表可以获取教学班
```sql
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for out_jw_kcb_xs
-- ----------------------------
DROP TABLE IF EXISTS `out_jw_kcb_xs`;
CREATE TABLE `out_jw_kcb_xs` (
  `kkh` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xh` varchar(40) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '学生编号',
  `xnxq` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `kcbh` varchar(40) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '课程编号',
  `pyfadm` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '培养方案代码',
  `xsyd` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '学生异动标识',
  `xgxklbdm` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '校公选课类别代码',
  `sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zt` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  KEY `idx_out_jw_kcb_xs_kkh_xh_kcbh` (`kkh`,`xh`,`kcbh`) USING BTREE
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='u_学生课程表';

SET FOREIGN_KEY_CHECKS = 1;
```

## 4. out_xsxx
学生信息表
```sql
-- ----------------------------
-- Table structure for out_xsxx
-- ----------------------------
DROP TABLE IF EXISTS `out_xsxx`;
CREATE TABLE `out_xsxx` (
  `id` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `xm` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xh` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xydm` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xymc` varchar(90) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zydm` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zymc` varchar(90) COLLATE utf8_unicode_ci DEFAULT NULL,
  `bjdm` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `bjmc` varchar(90) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xb` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `mz` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sfzh` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sjh` varchar(11) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sznj` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `rxnf` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `email` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `lx` int(11) DEFAULT '1' COMMENT '类型 1本科生 2研究生',
  `update_time` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `ykth` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zt` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_out_xsxx_xh_bjdm` (`xh`,`bjdm`,`bjmc`) USING BTREE
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
```

## 5. out_jsxx
教师信息表
```sql
DROP TABLE IF EXISTS `out_jsxx`;
CREATE TABLE `out_jsxx` (
  `id` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `xm` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `gh` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `ssdwdm` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `ssdwmc` varchar(90) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zgxw` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zgxl` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zc` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xb` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sjh` varchar(11) COLLATE utf8_unicode_ci DEFAULT NULL,
  `email` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `update_time` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `ykth` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zt` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
```

# 同步保存数据
1. 将原始数据转化为同步数据
2. 一门课（kkh）对应一个日历数据，创建的kkh和日历id的对应表
3. 教学班（out_jw_kcb_xs表获取）+授课教师（gh_s）组成日历的参与者
4. juhe_renwu的每条数据对应一个日程，通过kkh找到日历id
5. 创建所有的用户视图out_xsxx+out_jsxx,视图包括学号/工号+用户类型（学生/教师）+ 学院+专业+班级

# 同步过程
## 全量同步
1. 根据学期信息和状态信息从u_jw_kcb_cur获取所有的课程保存到juhe_renwu表
```sql
# 聚合代码
CREATE TABLE juhe_renwu (
    id INT PRIMARY KEY AUTO_INCREMENT
) as
SELECT
	kkh,
	xnxq,
	jxz,
	zc,
	LEFT ( rq, 10 ) rq,kcmc,sfdk,
	GROUP_CONCAT( jc ORDER BY jc SEPARATOR '/' ) jc_s,
	GROUP_CONCAT( ifnull( room, '无' ) ORDER BY jc SEPARATOR '/' ) room_s,
	GROUP_CONCAT( DISTINCT ghs ) gh_s,
  GROUP_CONCAT( DISTINCT xms ) xm_s,
	SUBSTRING_INDEX( GROUP_CONCAT( lq ORDER BY st ), ',', 1 ) lq,
	SUBSTRING_INDEX( GROUP_CONCAT( st ORDER BY st ), ',', 1 ) sj_f,
	SUBSTRING_INDEX( GROUP_CONCAT( ed ORDER BY ed DESC ), ',', 1 ) sj_t,
	'am' sjd 
FROM
	u_jw_kcb_cur 
WHERE
	1 = 1 
	AND jc < 5 
GROUP BY
	kkh,
	xnxq,
	jxz,
	zc,
	rq ,kcmc,sfdk 
UNION
SELECT
	kkh,
	xnxq,
	jxz,
	zc,
	LEFT ( rq, 10 ) rq,kcmc,sfdk,
	GROUP_CONCAT( jc ORDER BY jc SEPARATOR '/' ) jc_s,
	GROUP_CONCAT( ifnull( room, '无' ) ORDER BY jc SEPARATOR '/' ) room_s,
	GROUP_CONCAT( DISTINCT ghs ) gh_s,
  GROUP_CONCAT( DISTINCT xms ) xm_s,
	SUBSTRING_INDEX( GROUP_CONCAT( lq ORDER BY st ), ',', 1 ) lq,
	SUBSTRING_INDEX( GROUP_CONCAT( st ORDER BY st ), ',', 1 ) sj_f,
	SUBSTRING_INDEX( GROUP_CONCAT( ed ORDER BY ed DESC ), ',', 1 ) sj_t,
	'pm' sjd 
FROM
	u_jw_kcb_cur 
WHERE
	1 = 1 
	AND jc > 4 
GROUP BY
	kkh,
	xnxq,
	jxz,
	zc,
	rq,kcmc,sfdk
# 以上代码是以节（1-4）为上午和（5-10）为下午两部分union而成。
```
2. 将juhe_renwu表的内容同步到日历中（按照日历和日程的数据对应结构），没完成同步一个日程则修改juhe_renwu表的gx_zt为1，还有对应u_jw_kcb_cur表的状态
3. 先同步课程日历和日历参与者
4. 在同步课程

## 增量同步课程
1. 通过u_jw_kcb_cur表的 gx_sj和gx_zt为null 来获取未处理的增量数据
```sql
select distinct kkh，rq from u_jw_kcb_cur where gx_zt is null
```
2. 将变化的课程数据（kkh，rq）将juhe_renwu表中的记录都软删除x_zt为4
3. 调用wps的接口删除日程，删除后修改juhe_renwu表的gx_zt为4
4. 根据所有未处理的数据中add和update类型的聚合并添加到juhe_renwu表中
5. （同全量同步流程）将juhe_renwu表的内容同步到日历中（按照日历和日程的数据对应结构），没完成同步一个日程则修改juhe_renwu表的gx_zt为1，还有对应u_jw_kcb_cur表的状态

## 增量同步日历参与者
1. 根据out_xsxx表的rq和zt来获取未处理的数据
2. 增量状态（新增/删除/）修改用户所属的教学班，修改日历的参与者