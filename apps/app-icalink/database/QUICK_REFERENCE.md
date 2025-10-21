# 数据库迁移快速参考

## 🚀 快速执行

### 生产环境迁移（完整流程）

```bash
# 1. 备份数据库
mysqldump -u root -p icalink_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 执行Wave 1
mysql -u root -p icalink_db < 006_wave1_checkin_windows_and_absence.sql

# 3. 验证Wave 1
mysql -u root -p icalink_db -e "SHOW TABLES LIKE 'icalink_checkin%';"

# 4. 执行Wave 2
mysql -u root -p icalink_db < 007_wave2_attendance_statistics.sql

# 5. 验证Wave 2
mysql -u root -p icalink_db -e "SHOW TABLES LIKE 'icalink_%_attendance_daily';"

# 6. 执行Wave 3
mysql -u root -p icalink_db < 008_wave3_course_adjustment_and_calendar.sql

# 7. 验证Wave 3
mysql -u root -p icalink_db -e "SHOW TABLES LIKE 'icalink_calendar%';"
```

### 测试环境迁移（快速版）

```bash
# 一键执行所有迁移
cat 006_wave1_checkin_windows_and_absence.sql \
    007_wave2_attendance_statistics.sql \
    008_wave3_course_adjustment_and_calendar.sql | \
mysql -u root -p icalink_db
```

## 🔄 快速回滚

```bash
# 回滚所有变更（逆序执行）
mysql -u root -p icalink_db < 011_rollback_wave3.sql
mysql -u root -p icalink_db < 010_rollback_wave2.sql
mysql -u root -p icalink_db < 009_rollback_wave1.sql
```

## 📊 数据库变更速查表

| Wave | 新增表 | 扩展表 | 视图 | 触发器 | 配置项 |
|------|--------|--------|------|--------|--------|
| Wave 1 | 3 | 1 | 0 | 0 | 3 |
| Wave 2 | 4 | 0 | 2 | 0 | 4 |
| Wave 3 | 5 | 0 | 0 | 1 | 5 |
| **总计** | **12** | **1** | **2** | **1** | **12** |

## 🗂️ 表名速查

### Wave 1 - 补签/缺勤
- ✅ `icalink_checkin_windows` - 签到窗口
- ✅ `icalink_checkin_attempts` - 签到尝试审计
- ✅ `icalink_absence_records` - 缺勤记录
- 🔧 `icalink_attendance_records` - 扩展6个字段

### Wave 2 - 统计报表
- ✅ `icalink_course_attendance_daily` - 课程日报
- ✅ `icalink_student_attendance_daily` - 学生日报
- ✅ `icalink_attendance_summary` - 统计汇总
- ✅ `icalink_stats_execution_log` - 执行日志
- 👁️ `v_course_attendance_realtime` - 课程实时视图
- 👁️ `v_student_attendance_realtime` - 学生实时视图

### Wave 3 - 调课/日历
- ✅ `icalink_course_adjustments` - 课程调整
- ✅ `icalink_calendars` - 日历容器
- ✅ `icalink_calendar_shares` - 日历分享
- ✅ `icalink_calendar_access_log` - 访问日志
- ✅ `icalink_calendar_events` - 日历事件

## 🔍 验证命令速查

```sql
-- 检查所有新表
SELECT TABLE_NAME, TABLE_ROWS, 
       ROUND(DATA_LENGTH/1024/1024, 2) AS 'Size(MB)'
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'icalink_db'
  AND TABLE_NAME LIKE 'icalink_%'
  AND CREATE_TIME > DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY CREATE_TIME DESC;

-- 检查所有新配置
SELECT config_key, config_value, config_group, description
FROM icalink_system_configs
WHERE config_key LIKE 'attendance.%'
   OR config_key LIKE 'statistics.%'
   OR config_key LIKE 'course_adjustment.%'
   OR config_key LIKE 'calendar.%'
ORDER BY config_group, config_key;

-- 检查所有视图
SHOW FULL TABLES WHERE Table_type = 'VIEW';

-- 检查所有触发器
SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE TRIGGER_SCHEMA = 'icalink_db';

-- 检查索引
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'icalink_db'
  AND TABLE_NAME LIKE 'icalink_%'
  AND INDEX_NAME != 'PRIMARY'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
```

## ⚡ 性能优化速查

```sql
-- 分析所有新表
ANALYZE TABLE 
  icalink_checkin_windows,
  icalink_checkin_attempts,
  icalink_absence_records,
  icalink_course_attendance_daily,
  icalink_student_attendance_daily,
  icalink_attendance_summary,
  icalink_stats_execution_log,
  icalink_course_adjustments,
  icalink_calendars,
  icalink_calendar_shares,
  icalink_calendar_access_log,
  icalink_calendar_events;

-- 优化所有新表
OPTIMIZE TABLE 
  icalink_checkin_windows,
  icalink_checkin_attempts,
  icalink_absence_records;
```

## 🧹 数据清理速查

```sql
-- 清理过期签到尝试（保留180天）
DELETE FROM icalink_checkin_attempts 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 180 DAY)
LIMIT 1000;

-- 清理已解除的缺勤记录（保留365天）
DELETE FROM icalink_absence_records 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY) 
  AND resolved_flag = 1
LIMIT 1000;

-- 清理过期统计数据（保留365天）
DELETE FROM icalink_course_attendance_daily 
WHERE stat_date < DATE_SUB(CURDATE(), INTERVAL 365 DAY)
LIMIT 1000;

DELETE FROM icalink_student_attendance_daily 
WHERE stat_date < DATE_SUB(CURDATE(), INTERVAL 365 DAY)
LIMIT 1000;

-- 清理过期日历访问日志（保留90天）
DELETE FROM icalink_calendar_access_log 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
LIMIT 1000;

-- 清理过期的签到窗口（保留30天）
DELETE FROM icalink_checkin_windows 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND status = 'closed'
LIMIT 1000;
```

## 📈 监控查询速查

```sql
-- 统计各表数据量
SELECT 
  'checkin_windows' AS table_name, COUNT(*) AS row_count FROM icalink_checkin_windows
UNION ALL
SELECT 'checkin_attempts', COUNT(*) FROM icalink_checkin_attempts
UNION ALL
SELECT 'absence_records', COUNT(*) FROM icalink_absence_records
UNION ALL
SELECT 'course_daily', COUNT(*) FROM icalink_course_attendance_daily
UNION ALL
SELECT 'student_daily', COUNT(*) FROM icalink_student_attendance_daily
UNION ALL
SELECT 'course_adjustments', COUNT(*) FROM icalink_course_adjustments
UNION ALL
SELECT 'calendars', COUNT(*) FROM icalink_calendars
UNION ALL
SELECT 'calendar_shares', COUNT(*) FROM icalink_calendar_shares
UNION ALL
SELECT 'calendar_events', COUNT(*) FROM icalink_calendar_events;

-- 今日新增数据量
SELECT 
  'checkin_windows' AS table_name, 
  COUNT(*) AS today_count 
FROM icalink_checkin_windows 
WHERE DATE(created_at) = CURDATE()
UNION ALL
SELECT 'checkin_attempts', COUNT(*) 
FROM icalink_checkin_attempts 
WHERE DATE(created_at) = CURDATE()
UNION ALL
SELECT 'absence_records', COUNT(*) 
FROM icalink_absence_records 
WHERE DATE(created_at) = CURDATE();

-- 检查未解除的缺勤记录
SELECT COUNT(*) AS unresolved_count
FROM icalink_absence_records
WHERE resolved_flag = 0;

-- 检查活跃的签到窗口
SELECT COUNT(*) AS active_windows
FROM icalink_checkin_windows
WHERE status = 'open'
  AND close_time > NOW();

-- 检查今日统计任务执行情况
SELECT task_name, status, duration_ms, 
       course_stats_count, student_stats_count
FROM icalink_stats_execution_log
WHERE DATE(stat_date) = CURDATE()
ORDER BY start_time DESC
LIMIT 10;
```

## 🔧 故障排查速查

```sql
-- 检查表是否存在
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'icalink_db' 
  AND TABLE_NAME IN (
    'icalink_checkin_windows',
    'icalink_checkin_attempts',
    'icalink_absence_records',
    'icalink_course_attendance_daily',
    'icalink_student_attendance_daily'
  );

-- 检查字段是否存在
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'icalink_db'
  AND TABLE_NAME = 'icalink_attendance_records'
  AND COLUMN_NAME IN (
    'last_checkin_source',
    'last_checkin_reason',
    'manual_override_by',
    'manual_override_time',
    'manual_override_reason',
    'auto_marked_at'
  );

-- 检查索引是否存在
SELECT INDEX_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'icalink_db'
  AND TABLE_NAME = 'icalink_attendance_records'
  AND INDEX_NAME IN (
    'idx_last_checkin_source',
    'idx_manual_override_by',
    'idx_auto_marked_at'
  );

-- 检查配置是否存在
SELECT config_key, config_value
FROM icalink_system_configs
WHERE config_key IN (
  'attendance.checkin_window_duration',
  'attendance.absence_retention_days',
  'statistics.daily_task_cron',
  'statistics.retention_days',
  'course_adjustment.approval_required',
  'calendar.share_link_expire_days'
);
```

## 📞 紧急联系

- **DBA**: [待定]
- **技术负责人**: [待定]
- **运维负责人**: [待定]

## 📝 注意事项

1. ⚠️ **生产环境必须先备份**
2. ⚠️ **建议在业务低峰期执行**
3. ⚠️ **执行前停止应用服务**
4. ⚠️ **执行后验证数据完整性**
5. ⚠️ **准备好回滚方案**

