# 签到系统功能扩展 - 数据库迁移指南

## 📋 概述

本目录包含签到系统功能扩展的所有数据库迁移脚本，按照Wave批次组织。

## 📁 迁移脚本列表

| 脚本文件 | Wave | 功能需求 | 说明 |
|---------|------|---------|------|
| `006_wave1_checkin_windows_and_absence.sql` | Wave 1 | 需求1、3、4 | 补签窗口、缺勤记录、补卡功能 |
| `007_wave2_attendance_statistics.sql` | Wave 2 | 需求2 | 统计报表功能 |
| `008_wave3_course_adjustment_and_calendar.sql` | Wave 3 | 需求5、6 | 调课和日历功能 |
| `009_rollback_wave1.sql` | - | - | Wave 1回滚脚本 |
| `010_rollback_wave2.sql` | - | - | Wave 2回滚脚本 |
| `011_rollback_wave3.sql` | - | - | Wave 3回滚脚本 |

## 🚀 执行顺序

### 正向迁移

```bash
# Wave 1: 补签/缺勤核心功能
mysql -u username -p database_name < 006_wave1_checkin_windows_and_absence.sql

# Wave 2: 统计报表功能（依赖Wave 1）
mysql -u username -p database_name < 007_wave2_attendance_statistics.sql

# Wave 3: 调课与日历功能（依赖Wave 1、2）
mysql -u username -p database_name < 008_wave3_course_adjustment_and_calendar.sql
```

### 回滚迁移

```bash
# 回滚Wave 3
mysql -u username -p database_name < 011_rollback_wave3.sql

# 回滚Wave 2
mysql -u username -p database_name < 010_rollback_wave2.sql

# 回滚Wave 1
mysql -u username -p database_name < 009_rollback_wave1.sql
```

## 📊 数据库变更总览

### Wave 1: 补签/缺勤核心功能

**新增表** (3张):
- `icalink_checkin_windows` - 签到窗口表
- `icalink_checkin_attempts` - 签到尝试审计表
- `icalink_absence_records` - 缺勤记录表

**扩展表** (1张):
- `icalink_attendance_records` - 新增6个字段

**新增配置** (3项):
- `attendance.checkin_window_duration` - 补签窗口默认持续时间
- `attendance.absence_retention_days` - 缺勤记录保留天数
- `attendance.checkin_attempts_retention_days` - 签到尝试记录保留天数

### Wave 2: 统计报表功能

**新增表** (4张):
- `icalink_course_attendance_daily` - 课程维度日报表
- `icalink_student_attendance_daily` - 学生维度日报表
- `icalink_attendance_summary` - 统计汇总表
- `icalink_stats_execution_log` - 统计任务执行日志表

**新增视图** (2个):
- `v_course_attendance_realtime` - 课程实时统计视图
- `v_student_attendance_realtime` - 学生实时统计视图

**新增配置** (4项):
- `statistics.daily_task_cron` - 每日统计任务执行时间
- `statistics.retention_days` - 统计数据保留天数
- `statistics.task_enabled` - 是否启用每日统计任务
- `statistics.batch_size` - 统计任务批量处理大小

### Wave 3: 调课与日历功能

**新增表** (5张):
- `icalink_course_adjustments` - 课程调整记录表
- `icalink_calendars` - 日历容器表
- `icalink_calendar_shares` - 日历分享表
- `icalink_calendar_access_log` - 日历访问日志表
- `icalink_calendar_events` - 日历事件表

**新增触发器** (1个):
- `trg_after_adjustment_approved` - 调课批准后自动创建日历事件

**新增配置** (5项):
- `course_adjustment.approval_required` - 调课是否需要审批
- `course_adjustment.notice_days` - 调课需提前通知的天数
- `course_adjustment.conflict_detection_enabled` - 是否启用调课冲突检测
- `calendar.share_link_expire_days` - 日历分享链接默认有效期
- `calendar.access_log_retention_days` - 日历访问日志保留天数

## ⚠️ 注意事项

### 执行前检查

1. **备份数据库**
   ```bash
   mysqldump -u username -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **检查数据库版本**
   - 要求: MySQL 5.7+ 或 MySQL 8.0+
   - JSON字段需要MySQL 5.7.8+

3. **检查磁盘空间**
   - 预估新增表空间: ~500MB (取决于数据量)
   - 确保有足够的磁盘空间

4. **检查权限**
   ```sql
   SHOW GRANTS FOR CURRENT_USER;
   ```
   需要的权限: CREATE, ALTER, DROP, INDEX, INSERT, UPDATE, DELETE, SELECT

### 执行中监控

1. **查看执行进度**
   ```sql
   SHOW PROCESSLIST;
   ```

2. **检查错误日志**
   ```bash
   tail -f /var/log/mysql/error.log
   ```

3. **监控表锁**
   ```sql
   SHOW OPEN TABLES WHERE In_use > 0;
   ```

### 执行后验证

1. **验证表结构**
   ```sql
   -- Wave 1
   SHOW TABLES LIKE 'icalink_checkin%';
   SHOW TABLES LIKE 'icalink_absence%';
   DESC icalink_attendance_records;
   
   -- Wave 2
   SHOW TABLES LIKE 'icalink_%_attendance_daily';
   SHOW TABLES LIKE 'icalink_stats%';
   
   -- Wave 3
   SHOW TABLES LIKE 'icalink_course_adjustments';
   SHOW TABLES LIKE 'icalink_calendar%';
   ```

2. **验证索引**
   ```sql
   SHOW INDEX FROM icalink_checkin_windows;
   SHOW INDEX FROM icalink_absence_records;
   SHOW INDEX FROM icalink_course_attendance_daily;
   ```

3. **验证配置**
   ```sql
   SELECT * FROM icalink_system_configs 
   WHERE config_key LIKE 'attendance.%' 
      OR config_key LIKE 'statistics.%'
      OR config_key LIKE 'course_adjustment.%'
      OR config_key LIKE 'calendar.%';
   ```

4. **验证视图**
   ```sql
   SHOW FULL TABLES WHERE Table_type = 'VIEW';
   SELECT * FROM v_course_attendance_realtime LIMIT 1;
   SELECT * FROM v_student_attendance_realtime LIMIT 1;
   ```

5. **验证触发器**
   ```sql
   SHOW TRIGGERS LIKE 'icalink_course_adjustments';
   ```

## 🔄 回滚策略

### 回滚原则

1. **按Wave逆序回滚**: Wave 3 → Wave 2 → Wave 1
2. **回滚前备份**: 即使是回滚操作也要先备份
3. **验证依赖**: 确保没有应用代码依赖要删除的表

### 回滚检查清单

- [ ] 停止应用服务
- [ ] 备份当前数据库
- [ ] 检查是否有外键依赖
- [ ] 执行回滚脚本
- [ ] 验证回滚结果
- [ ] 重启应用服务
- [ ] 功能测试

## 📈 性能优化建议

### 索引优化

1. **定期分析表**
   ```sql
   ANALYZE TABLE icalink_checkin_windows;
   ANALYZE TABLE icalink_absence_records;
   ANALYZE TABLE icalink_course_attendance_daily;
   ```

2. **检查索引使用情况**
   ```sql
   SELECT * FROM sys.schema_unused_indexes 
   WHERE object_schema = 'database_name';
   ```

### 数据清理

1. **定期清理过期数据**
   ```sql
   -- 清理过期的签到尝试记录（保留180天）
   DELETE FROM icalink_checkin_attempts 
   WHERE created_at < DATE_SUB(NOW(), INTERVAL 180 DAY);
   
   -- 清理过期的缺勤记录（保留365天）
   DELETE FROM icalink_absence_records 
   WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY) 
     AND resolved_flag = 1;
   
   -- 清理过期的统计数据（保留365天）
   DELETE FROM icalink_course_attendance_daily 
   WHERE stat_date < DATE_SUB(CURDATE(), INTERVAL 365 DAY);
   
   DELETE FROM icalink_student_attendance_daily 
   WHERE stat_date < DATE_SUB(CURDATE(), INTERVAL 365 DAY);
   
   -- 清理过期的日历访问日志（保留90天）
   DELETE FROM icalink_calendar_access_log 
   WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
   ```

2. **优化表**
   ```sql
   OPTIMIZE TABLE icalink_checkin_attempts;
   OPTIMIZE TABLE icalink_absence_records;
   OPTIMIZE TABLE icalink_course_attendance_daily;
   ```

## 🛠️ 故障排查

### 常见问题

1. **字段已存在错误**
   - 原因: 重复执行迁移脚本
   - 解决: 脚本已包含字段存在性检查，可安全重复执行

2. **外键约束错误**
   - 原因: 关联表不存在或数据不一致
   - 解决: 检查关联表是否存在，数据是否完整

3. **磁盘空间不足**
   - 原因: 新增表和索引占用空间
   - 解决: 清理临时文件，扩展磁盘空间

4. **执行超时**
   - 原因: 表数据量大，索引创建耗时
   - 解决: 增加超时时间，分批执行

### 紧急回滚

如果迁移过程中出现严重问题，立即执行以下步骤：

```bash
# 1. 停止应用
systemctl stop app-icalink

# 2. 恢复备份
mysql -u username -p database_name < backup_YYYYMMDD_HHMMSS.sql

# 3. 验证恢复
mysql -u username -p database_name -e "SHOW TABLES;"

# 4. 重启应用
systemctl start app-icalink
```

## 📞 联系方式

如遇到问题，请联系：
- DBA: [待定]
- 技术负责人: [待定]
- 运维负责人: [待定]

## 📝 变更日志

- 2024-01-XX: 创建Wave 1迁移脚本
- 2024-01-XX: 创建Wave 2迁移脚本
- 2024-01-XX: 创建Wave 3迁移脚本
- 2024-01-XX: 创建回滚脚本和迁移指南

